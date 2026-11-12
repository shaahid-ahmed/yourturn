/**
 * HTTP routes for the Unspoken contract (US-019).
 *
 * Every `operationId` in `docs/03-architecture/openapi.json` is served under
 * `/api/v1`. Request and 2xx response shapes are validated against the
 * contract. Errors use the contract `Error` / `PaymentGateError` shapes.
 * The payment gate stays closed: settlement payments answer 409.
 */
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';

import { openDatabase, migrate } from '../db/database.mjs';
import { searchEvents, getEventDetail, listTags } from '../catalog.mjs';
import {
  createPod,
  inviteMembers,
  acceptInvitation,
  declineInvitation,
  createInviteLink,
  revokeInviteLink,
  acceptInviteLink,
  leavePod,
  removeMember,
  getPod,
  matchContacts,
  requireMember,
} from '../pods.mjs';
import {
  getOwnSubscription,
  submitSubscriptionReceipt,
  restoreSubscription,
  startHangout,
  sandboxReceiptVerifier,
} from '../subscription.mjs';
import {
  getPoll,
  castOwnVote,
  getReadyCheck,
  setOwnReadyAnswer,
} from '../polls.mjs';
import {
  listPodMessages,
  sendPodMessage,
  listOwnPlannerChat,
  sendOwnPlannerChatMessage,
} from '../chat.mjs';
import { getBooking } from '../booking.mjs';
import { volunteerAsPayer, confirmBooking } from '../booking.mjs';
import { getSplit, confirmSplit } from '../split.mjs';
import { getOwnStretchAsk, answerOwnStretchAsk } from '../stretch.mjs';
import { canonicalize } from '../idempotency.mjs';
import {
  listOwnPods,
  listOwnInvitations,
  setOwnPodMute,
  proposeRhythm,
  acceptRhythmProposal,
  listRhythmProposals,
  addGroupActivity,
  listGroupActivities,
  podStageFor,
  agreedRhythm,
} from '../pod-views.mjs';
import { ConstraintVault } from '../vault.mjs';
import {
  requestPhoneCode,
  createSession,
  endSession,
  resolveSession,
  SessionError,
} from './sessions.mjs';
import {
  listOwnCalendarAccounts as calListAccounts,
  startCalendarConnect as calStartConnect,
  disconnectCalendarAccount as calDisconnect,
  setPlannerCalendarAccess as calSetPlannerAccess,
  getOwnCalendar as calGetOwn,
  addEventToOwnCalendar as calAddEvent,
  NO_PROVIDER,
} from '../calendar.mjs';
import {
  getOwnNotificationSettings as notifGetSettings,
  setOwnNotificationSettings as notifSetSettings,
  registerPushToken as notifRegisterToken,
} from '../notifications.mjs';

const SPEC_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/03-architecture/openapi.json',
);
const SESSION_COOKIE = 'unspoken_session';

/** Operations that do not need a session cookie. */
const PUBLIC_OPS = new Set([
  'requestPhoneCode',
  'createSession',
  'searchEvents',
  'getEvent',
]);

/** Contract error code -> HTTP status. Unlisted domain codes answer 422. */
const STATUS_BY_CODE = {
  unauthenticated: 401,
  csrf_rejected: 403,
  not_found: 404,
  payment_gate_blocked: 409,
  idempotency_key_conflict: 409,
  invite_link_used: 409,
  invite_link_expired: 409,
  invitation_resolved: 409,
  pod_full: 409,
  pod_too_small: 409,
  open_balances: 409,
  split_already_confirmed: 409,
  subscription_required: 409,
  poll_closed: 409,
  wrong_hangout_state: 409,
  payer_already_chosen: 409,
  paypal_link_required: 409,
  stretch_ask_closed: 409,
  not_yes_member: 403,
  not_payer: 403,
  option_unknown: 404,
  rate_limited: 429,
};

/** The gate is closed: no human money-flow approval has been recorded. */
export function closedGate() {
  return {
    open: false,
    blockingTasks: ['US-006'],
    blockingQuestions: ['Q-010'],
    humanApprovalRecorded: false,
  };
}

/**
 * @param {any} node JSON-schema node with local $refs
 * @param {any} root the full spec for $ref resolution
 * @param {any[]} [seen]
 * @returns {any}
 */
function deref(node, root, seen = []) {
  if (Array.isArray(node)) return node.map((v) => deref(v, root, seen));
  if (node && typeof node === 'object') {
    if (typeof node.$ref === 'string') {
      if (!node.$ref.startsWith('#/'))
        throw new Error(`only local refs are supported: ${node.$ref}`);
      if (seen.includes(node.$ref)) return {};
      const target = node.$ref
        .slice(2)
        .split('/')
        .reduce(
          (/** @type {Record<string, any>} */ acc, /** @type {string} */ key) =>
            acc[key],
          root,
        );
      return deref(target, root, [...seen, node.$ref]);
    }
    return Object.fromEntries(
      Object.entries(node)
        .filter(([k]) => !k.startsWith('x-'))
        .map(([k, v]) => [k, deref(v, root, seen)]),
    );
  }
  return node;
}

let cachedSpec = /** @type {any} */ (null);
function loadSpec() {
  if (!cachedSpec)
    cachedSpec = deref(
      JSON.parse(readFileSync(SPEC_PATH, 'utf8')),
      JSON.parse(readFileSync(SPEC_PATH, 'utf8')),
    );
  return cachedSpec;
}

/**
 * @param {any} app
 * @param {any} db
 */
function errorHandler(app, db) {
  void db;
  app.setErrorHandler(
    (
      /** @type {any} */ err,
      /** @type {any} */ req,
      /** @type {any} */ reply,
    ) => {
      if (err.validation) {
        const op = req.routeOptions?.config?.operation;
        const responses = op ? op.responses : {};
        const status = responses && responses['422'] ? 422 : 400;
        console.error(
          `[http] ${req.method} ${req.url} validation`,
          err.validation,
        );
        return reply.code(status).send();
      }
      const code = typeof err.code === 'string' ? err.code : null;
      if (code) {
        const status =
          STATUS_BY_CODE[/** @type {keyof typeof STATUS_BY_CODE} */ (code)] ??
          422;
        const body = /** @type {any} */ ({ code, message: err.message });
        if (code === 'payment_gate_blocked') body.gate = closedGate();
        return reply.code(status).send(body);
      }
      req.log.error(err);
      console.error(`[http] ${req.method} ${req.url}`, err);
      return reply
        .code(500)
        .send({ code: 'internal_error', message: 'unexpected error' });
    },
  );
  app.setNotFoundHandler((/** @type {any} */ req, /** @type {any} */ reply) => {
    reply.code(404).send({ code: 'not_found', message: 'no such route' });
  });
}

/**
 * The contract requires ULIDs at the boundary; the seeded catalog uses
 * fixture ids (`evt-001`) that the planner validates. Map deterministically:
 * '01' plus 24 hex characters of a hash. Stable across restarts, opaque,
 * reversible through `fixtureEventId`.
 * @param {string} fixtureId
 */
export function contractEventId(fixtureId) {
  const hex = createHash('sha256')
    .update(`unspoken:event:${fixtureId}`, 'utf8')
    .digest('hex')
    .toUpperCase();
  return `01${hex.slice(0, 24)}`;
}

/** @type {Map<string, string> | null} */
let eventIdReverse = null;
/**
 * @param {string} contractId
 * @returns {string | null} the fixture id, or null when unknown
 */
export function fixtureEventId(contractId) {
  if (!eventIdReverse) {
    eventIdReverse = new Map();
    for (const evt of loadFixtureEvents()) {
      eventIdReverse.set(contractEventId(evt.eventId), evt.eventId);
    }
  }
  return eventIdReverse.get(contractId) ?? null;
}

function loadFixtureEvents() {
  return searchEvents({});
}

/**
 * Normalize a stored event id to the contract form.
 * The database stores fixture ids (`evt-001`, what the planner validates);
 * the contract requires ULIDs. A stored contract id passes through, anything
 * else is mapped forward. Never maps backwards: emitting a fixture id would
 * fail response validation (#99).
 * @param {string | null | undefined} stored
 */
export function toContractEventId(stored) {
  if (!stored) return null;
  if (fixtureEventId(stored)) return stored;
  if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(stored)) return stored;
  return contractEventId(stored);
}

/**
 * Map a domain event (with embedded venue) to the contract Event shape.
 * @param {any} evt
 */
function toContractEvent(evt) {
  const venue = evt.venue ?? {};
  return {
    eventId: contractEventId(evt.eventId),
    title: evt.title,
    venueOrOrganizer: venue.name ?? evt.venueId,
    startsAt: evt.startsAt,
    endsAt: evt.endsAt,
    priceFromCents: evt.estCostPerPersonCents,
    priceToCents: evt.estCostPerPersonCents,
    category: evt.tags?.[0] ?? 'food',
    neighborhood: venue.neighborhood ?? venue.borough ?? 'New York',
    description: evt.description ?? '',
    location: { lat: venue.lat, lng: venue.lng },
    tags: evt.tags ?? [],
    synthetic: true,
  };
}

/**
 * Map stored fixture event ids to the contract form in a domain Poll view.
 * The domain stores what the planner validates; the boundary speaks ULIDs.
 * @param {any} poll
 */
function toContractPoll(poll) {
  return {
    ...poll,
    options: poll.options.map((/** @type {any} */ o) =>
      o.activity?.eventId
        ? {
            ...o,
            activity: {
              ...o.activity,
              eventId: toContractEventId(o.activity.eventId),
            },
          }
        : o,
    ),
  };
}
/**
 * Assemble the contract Hangout for a joined member. Polls, choice, readiness,
 * payer and booking are each null until that stage exists; nothing here names
 * a member's limits, and share amounts never appear.
 * @param {any} database
 * @param {string} hangoutId
 * @param {string} podId
 * @param {string} userId
 * @param {string} [at]
 */
function toContractHangout(database, hangoutId, podId, userId, at) {
  const now = at ?? new Date().toISOString();
  requireMember(database, podId, userId);
  const h =
    /** @type {{ hangout_id: string, pod_id: string, state: string, created_at: string, chosen_option_id: string | null, chosen_slot_id: string | null, payer_user_id: string | null } | undefined} */ (
      database
        .prepare('SELECT * FROM hangout WHERE hangout_id = ? AND pod_id = ?')
        .get(hangoutId, podId)
    );
  if (!h) {
    const err = /** @type {any} */ (new Error('no such hangout in this pod'));
    err.code = 'not_found';
    throw err;
  }
  const pollId = (/** @type {string} */ kind) =>
    /** @type {{ poll_id: string } | undefined} */ (
      database
        .prepare('SELECT poll_id FROM poll WHERE hangout_id = ? AND kind = ?')
        .get(hangoutId, kind)
    )?.poll_id ?? null;
  let chosenActivity = null;
  if (h.chosen_option_id) {
    const o =
      /** @type {{ option_id: string, title: string, venue_or_organizer: string, starts_at: string | null, per_person_estimate_cents: number, event_id: string | null } | undefined} */ (
        database
          .prepare('SELECT * FROM shortlist_option WHERE option_id = ?')
          .get(h.chosen_option_id)
      );
    if (o) {
      const fixtureId = o.event_id
        ? (fixtureEventId(o.event_id) ?? o.event_id)
        : null;
      const fixture = fixtureId ? getEventDetail(fixtureId) : null;
      const eventId = toContractEventId(o.event_id);
      chosenActivity = {
        optionId: o.option_id,
        title: o.title,
        venueOrOrganizer: o.venue_or_organizer,
        startsAt: o.starts_at,
        perPersonEstimateCents: o.per_person_estimate_cents,
        tags: fixture ? fixture.tags : [],
        eventId,
        synthetic: true,
      };
    }
  }
  let chosenSlot = null;
  if (h.chosen_slot_id) {
    const s =
      /** @type {{ slot_id: string, starts_at: string, ends_at: string } | undefined} */ (
        database
          .prepare('SELECT * FROM time_slot WHERE slot_id = ?')
          .get(h.chosen_slot_id)
      );
    if (s)
      chosenSlot = {
        slotId: s.slot_id,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
      };
  }
  const readyOpen = database
    .prepare('SELECT 1 AS one FROM ready_check WHERE hangout_id = ?')
    .get(hangoutId);
  const readyCheck = readyOpen
    ? getReadyCheck(database, { podId, hangoutId, userId })
    : null;
  let payer = null;
  if (h.payer_user_id) {
    const p = /** @type {{ first_name: string } | undefined} */ (
      database
        .prepare('SELECT first_name FROM app_user WHERE user_id = ?')
        .get(h.payer_user_id)
    );
    payer = { userId: h.payer_user_id, firstName: p ? p.first_name : '?' };
  }
  return {
    hangoutId: h.hangout_id,
    podId: h.pod_id,
    state: h.state,
    createdAt: h.created_at,
    activityPollId: pollId('activity'),
    timePollId: pollId('time'),
    chosenActivity,
    chosenSlot,
    readyCheck,
    payer,
    booking: getBooking(database, { podId, hangoutId, userId }),
  };
}

/**
 * Assemble the contract Pod for a joined member.
 * @param {any} database
 * @param {string} podId
 * @param {string} userId
 * @param {string} [at]
 */
function toContractPod(database, podId, userId, at) {
  const now = at ?? new Date().toISOString();
  const base = getPod(database, { podId, callerUserId: userId, at: now });
  const muteRow = /** @type {{ muted: number } | undefined} */ (
    database
      .prepare(
        'SELECT muted FROM pod_membership WHERE pod_id = ? AND user_id = ? AND left_at IS NULL',
      )
      .get(podId, userId)
  );
  return {
    podId: base.podId,
    name: base.name,
    createdAt: base.createdAt,
    creatorUserId: base.creatorUserId,
    members: base.members,
    memberCount: base.memberCount,
    minMembers: base.minMembers,
    maxMembers: base.maxMembers,
    readyForPlanning: base.readyForPlanning,
    rhythm: agreedRhythm(database, podId),
    stage: podStageFor(database, podId),
    muted: Boolean(muteRow?.muted),
  };
}

/**
 * @param {any} database
 * @param {string} podId
 * @param {string} userId
 */
function toPodSummary(database, podId, userId) {
  const pod = toContractPod(database, podId, userId);
  return {
    podId: pod.podId,
    name: pod.name,
    memberCount: pod.memberCount,
    stage: pod.stage,
    muted: pod.muted,
  };
}

/**
 * @param {any} database
 * @param {string[]} invitationIds
 */
function invitationObjects(database, invitationIds) {
  if (!invitationIds.length) return [];
  const rows = /** @type {Array<any>} */ (
    database
      .prepare(
        `SELECT i.invitation_id AS invitationId, i.pod_id AS podId, p.name AS podName,
                i.invited_by AS invitedBy, u.first_name AS invitedByName,
                i.status AS status, i.created_at AS createdAt
           FROM pod_invitation i
           JOIN pod p ON p.pod_id = i.pod_id
           JOIN app_user u ON u.user_id = i.invited_by
          WHERE i.invitation_id IN (${invitationIds.map(() => '?').join(', ')})`,
      )
      .all(...invitationIds)
  );
  return rows.map((r) => ({
    invitationId: r.invitationId,
    podId: r.podId,
    podName: r.podName,
    invitedBy: { userId: r.invitedBy, firstName: r.invitedByName },
    status: r.status,
    createdAt: r.createdAt,
  }));
}

/**
 * Assemble the contract CurrentUser for an active user.
 * @param {any} database
 * @param {any} vault
 * @param {string} userId
 */
function currentUser(database, vault, userId) {
  const user = database
    .prepare('SELECT * FROM app_user WHERE user_id = ? AND deleted_at IS NULL')
    .get(userId);
  if (!user) {
    const err = /** @type {any} */ (new Error('no such user'));
    err.code = 'not_found';
    throw err;
  }
  const interestRows = /** @type {Array<{ tag: string }>} */ (
    database
      .prepare('SELECT tag FROM user_interest WHERE user_id = ? ORDER BY tag')
      .all(userId)
  );
  const interests = interestRows.map((r) => r.tag);
  const perms = database
    .prepare(
      'SELECT contacts, notifications, calendar FROM permission_status WHERE user_id = ?',
    )
    .get(userId) ?? {
    contacts: 'not_asked',
    notifications: 'not_asked',
    calendar: 'not_asked',
  };
  let hasLimits = false;
  try {
    vault.readAs(userId, userId);
    hasLimits = true;
  } catch {
    hasLimits = false;
  }
  const calendar = database
    .prepare(
      "SELECT 1 AS one FROM calendar_account WHERE user_id = ? AND status = 'connected'",
    )
    .get(userId);
  const paypal = database
    .prepare(
      "SELECT 1 AS one FROM paypal_link WHERE user_id = ? AND status = 'linked'",
    )
    .get(userId);
  return {
    userId: user.user_id,
    firstName: user.first_name,
    photoUrl: user.photo_url,
    bio: user.bio,
    phone: user.phone,
    interests,
    onboarding: {
      basics: user.first_name !== 'Member',
      interests: interests.length > 0,
      privateLimits: hasLimits,
      calendar: Boolean(calendar),
      paypal: Boolean(paypal),
      permissions: Boolean(
        database
          .prepare('SELECT 1 AS one FROM permission_status WHERE user_id = ?')
          .get(userId),
      ),
    },
    permissions: {
      contacts: perms.contacts,
      notifications: perms.notifications,
      calendar: perms.calendar,
    },
    paypalLinked: Boolean(paypal),
  };
}

/**
 * Derive the current balance state for a debtor in a hangout from the
 * append-only ledger_entry rows. Returns null if no balance_created entry
 * exists for this pair.
 *
 * @param {any} db
 * @param {string} hangoutId
 * @param {string} debtorUserId
 */
function deriveBalance(db, hangoutId, debtorUserId) {
  const entries = /** @type {any[]} */ (
    db
      .prepare(
        'SELECT entry_id, kind, amount_cents, created_at FROM ledger_entry WHERE hangout_id = ? AND debtor_user_id = ? ORDER BY seq ASC',
      )
      .all(hangoutId, debtorUserId)
  );
  if (entries.length === 0) return null;
  let amountCents = 0;
  let status = /** @type {'owed'|'pending'|'paid'|'failed'} */ ('owed');
  let entryId = '';
  let updatedAt = '';
  for (const e of entries) {
    updatedAt = String(e.created_at);
    if (e.kind === 'balance_created') {
      entryId = String(e.entry_id);
      amountCents = Number(e.amount_cents);
      status = 'owed';
    } else if (e.kind === 'adjustment') {
      amountCents += Number(e.amount_cents);
    } else if (e.kind === 'payment_initiated') {
      status = 'pending';
    } else if (e.kind === 'payment_captured') {
      status = 'paid';
    } else if (e.kind === 'payment_failed') {
      status = 'failed';
    }
  }
  return { entryId, amountCents, status, updatedAt };
}

/**
 * @param {{ db?: any, vaultKey?: string, publicOrigin?: string, receiptVerifier?: any, webhookKey?: string, calendarProvider?: any, calendarStateKey?: string | Buffer }} [options] vaultKey is 64 hex chars;
 * a random key is generated when omitted, so private limits do not survive
 * a restart. Production must load a persistent key. publicOrigin is the
 * public HTTPS origin (US-014, e.g. a tunnel URL) used for invite links and
 * documented return/cancel URLs; when omitted the request host is used.
 * receiptVerifier checks sandbox receipts (US-003); it defaults to the local
 * HMAC verifier keyed by UNSPOKEN_SANDBOX_RECEIPT_KEY or a random key.
 * webhookKey verifies provider webhook signatures (HMAC-SHA256 hex over the
 * canonical JSON body, presented in the x-signature header); it defaults to
 * UNSPOKEN_SANDBOX_WEBHOOK_KEY or a random key. Verified events are recorded
 * in provider_event and deduplicated by id; per ADR 0008 no event applies
 * money effects, so effectsApplied is always false.
 */
export function buildApp({
  db,
  vaultKey,
  publicOrigin,
  receiptVerifier,
  webhookKey,
  calendarProvider,
  calendarStateKey,
} = {}) {
  const database =
    db ??
    (() => {
      const fresh = openDatabase(':memory:');
      migrate(fresh);
      return fresh;
    })();
  const app = Fastify({ logger: false });
  app.register(fastifyCookie);
  const vault = new ConstraintVault({
    masterKey:
      vaultKey ??
      process.env.UNSPOKEN_VAULT_KEY ??
      randomBytes(32).toString('hex'),
  });
  const verifier =
    receiptVerifier ??
    sandboxReceiptVerifier({
      key:
        process.env.UNSPOKEN_SANDBOX_RECEIPT_KEY ||
        randomBytes(32).toString('hex'),
    });
  const hookKey =
    webhookKey ??
    (process.env.UNSPOKEN_SANDBOX_WEBHOOK_KEY ||
      randomBytes(32).toString('hex'));
  const calProvider = calendarProvider ?? NO_PROVIDER;
  const calKey =
    calendarStateKey ??
    (process.env.UNSPOKEN_CALENDAR_STATE_KEY || randomBytes(32));
  errorHandler(app, database);

  const spec = loadSpec();

  /** @type {Record<string, (ctx: any) => Promise<any>>} */
  const handlers = {
    searchEvents: async ({ req }) => {
      const q = req.query ?? {};
      const events = searchEvents({
        tags: q.category ? [q.category] : undefined,
        maxCents: q.maxPriceCents,
        borough: q.neighborhood,
      }).filter((e) => {
        if (
          q.q &&
          !`${e.title} ${e.description}`
            .toLowerCase()
            .includes(String(q.q).toLowerCase())
        )
          return false;
        if (q.from && e.startsAt < q.from) return false;
        if (q.to && e.startsAt > q.to) return false;
        return true;
      });
      return {
        events: events.slice(0, 50).map(toContractEvent),
        nextCursor: null,
      };
    },
    getEvent: async ({ params }) => {
      const evt = getEventDetail(params.eventId);
      if (!evt) {
        const err = /** @type {any} */ (new Error('no such event'));
        err.code = 'not_found';
        throw err;
      }
      return toContractEvent(evt);
    },
    requestPhoneCode: async ({ req }) => {
      const { challengeId, expiresAt } = requestPhoneCode(database, {
        phone: req.body.phone,
      });
      return { challengeId, expiresAt, delivery: 'simulated_demo' };
    },
    createSession: async ({ req, reply }) => {
      const session = createSession(database, {
        challengeId: req.body.challengeId,
        code: req.body.code,
      });
      if (!session) {
        const err = /** @type {any} */ (
          new Error('the code is wrong or the challenge expired')
        );
        err.code = 'phone_code_invalid';
        throw err;
      }
      reply.setCookie(SESSION_COOKIE, session.sessionId, {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
      });
      return {
        userId: session.userId,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
        isNewUser: session.isNewUser,
      };
    },
    endSession: async ({ req, reply }) => {
      endSession(database, req.cookies[SESSION_COOKIE]);
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      reply.code(204);
      return;
    },
    createSettlementPayment: async () => {
      const err = /** @type {any} */ (
        new Error(
          'the payment gate is closed: no human money-flow approval recorded',
        )
      );
      err.code = 'payment_gate_blocked';
      throw err;
    },
    getCurrentUser: async ({ userId }) => currentUser(database, vault, userId),
    updateOwnProfile: async ({ req, userId }) => {
      const patch = req.body ?? {};
      const sets = [];
      const vals = [];
      if (patch.firstName !== undefined) {
        sets.push('first_name = ?');
        vals.push(patch.firstName);
      }
      if (patch.bio !== undefined) {
        sets.push('bio = ?');
        vals.push(patch.bio);
      }
      if (patch.photoUrl !== undefined) {
        sets.push('photo_url = ?');
        vals.push(patch.photoUrl);
      }
      if (sets.length) {
        database
          .prepare(`UPDATE app_user SET ${sets.join(', ')} WHERE user_id = ?`)
          .run(...vals, userId);
      }
      if (patch.interests !== undefined) {
        database
          .prepare('DELETE FROM user_interest WHERE user_id = ?')
          .run(userId);
        const add = database.prepare(
          'INSERT INTO user_interest (user_id, tag) VALUES (?, ?)',
        );
        for (const tag of patch.interests) add.run(userId, tag);
      }
      return currentUser(database, vault, userId);
    },
    deleteOwnAccount: async ({ reply, userId }) => {
      const owed = database
        .prepare(
          'SELECT COALESCE(SUM(amount_cents), 0) AS t FROM ledger_entry WHERE debtor_user_id = ?',
        )
        .get(userId).t;
      const owedTo = database
        .prepare(
          'SELECT COALESCE(SUM(amount_cents), 0) AS t FROM ledger_entry WHERE creditor_user_id = ?',
        )
        .get(userId).t;
      if (owed - owedTo !== 0) {
        const err = /** @type {any} */ (
          new Error('balances are still open; settle them first')
        );
        err.code = 'open_balances';
        throw err;
      }
      const now = new Date().toISOString();
      database
        .prepare('UPDATE app_user SET deleted_at = ? WHERE user_id = ?')
        .run(now, userId);
      database
        .prepare(
          'UPDATE session SET ended_at = ? WHERE user_id = ? AND ended_at IS NULL',
        )
        .run(now, userId);
      vault.forget(userId);
      database
        .prepare('DELETE FROM private_limits_vault WHERE user_id = ?')
        .run(userId);
      reply.code(204);
      return;
    },
    getOwnPrivateLimits: async ({ userId }) => {
      let stored = null;
      try {
        stored = vault.readAs(userId, userId);
      } catch {
        stored = null;
      }
      if (!stored) {
        // Restart wiped this process's vault: restore the sealed record.
        const row = /** @type {{ sealed: Uint8Array } | undefined} */ (
          database
            .prepare(
              'SELECT sealed FROM private_limits_vault WHERE user_id = ?',
            )
            .get(userId)
        );
        if (row) {
          try {
            vault.load(
              userId,
              JSON.parse(Buffer.from(row.sealed).toString('utf8')),
            );
            stored = vault.readAs(userId, userId);
          } catch {
            // Wrong key (rotation) or tampering: fail closed, drop the stale row.
            database
              .prepare('DELETE FROM private_limits_vault WHERE user_id = ?')
              .run(userId);
            stored = null;
          }
        }
      }
      if (!stored) {
        const user = database
          .prepare('SELECT created_at FROM app_user WHERE user_id = ?')
          .get(userId);
        return {
          budgetPerHangoutCents: null,
          dietaryNeeds: [],
          dislikes: [],
          maxTravelMinutes: null,
          updatedAt: user.created_at,
        };
      }
      return stored;
    },
    setOwnPrivateLimits: async ({ req, userId }) => {
      const stored = { ...req.body, updatedAt: new Date().toISOString() };
      const sealed = vault.put(userId, stored);
      database
        .prepare(
          `INSERT INTO private_limits_vault (user_id, sealed, key_version, updated_at)
           VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET
           sealed = excluded.sealed, key_version = 1, updated_at = excluded.updated_at`,
        )
        .run(
          userId,
          Buffer.from(JSON.stringify(sealed), 'utf8'),
          stored.updatedAt,
        );
      return stored;
    },
    setOwnPermissionStatus: async ({ req, userId }) => {
      const perms = req.body;
      database
        .prepare(
          `INSERT INTO permission_status (user_id, contacts, notifications, calendar, updated_at)
           VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET
           contacts = excluded.contacts, notifications = excluded.notifications,
           calendar = excluded.calendar, updated_at = excluded.updated_at`,
        )
        .run(
          userId,
          perms.contacts,
          perms.notifications,
          perms.calendar,
          new Date().toISOString(),
        );
      return currentUser(database, vault, userId).permissions;
    },
    listInterests: async () => ({
      listVersion: 'demo-v1',
      interests: listTags().map((tag) => ({
        tag,
        label: tag.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
        category:
          tag === 'food'
            ? 'cuisine'
            : ['art', 'comedy', 'cultural'].includes(tag)
              ? 'event'
              : 'activity',
      })),
    }),
    matchContacts: async ({ req, userId }) => ({
      matches: matchContacts(database, {
        callerUserId: userId,
        phones: req.body.phones,
      }),
    }),
    listOwnPods: async ({ userId }) => ({
      pods: listOwnPods(database, userId).map((podId) =>
        toPodSummary(database, podId, userId),
      ),
    }),
    createPod: async ({ req, userId }) => {
      const now = new Date().toISOString();
      const created = createPod(database, {
        name: req.body.name,
        creatorUserId: userId,
        inviteUserIds: req.body.inviteUserIds,
        at: now,
      });
      return toContractPod(database, created.podId, userId, now);
    },
    getPod: async ({ params, userId }) =>
      toContractPod(database, params.podId, userId),
    inviteMembers: async ({ req, params, userId }) => {
      const now = new Date().toISOString();
      const ids = inviteMembers(database, {
        podId: params.podId,
        callerUserId: userId,
        userIds: req.body.userIds,
        at: now,
      });
      return { invitations: invitationObjects(database, ids) };
    },
    acceptPodInvitation: async ({ params, userId }) => {
      const now = new Date().toISOString();
      const podId = acceptInvitation(database, {
        invitationId: params.invitationId,
        userId,
        at: now,
      });
      return toContractPod(database, podId, userId, now);
    },
    declinePodInvitation: async ({ params, reply, userId }) => {
      declineInvitation(database, {
        invitationId: params.invitationId,
        userId,
        at: new Date().toISOString(),
      });
      reply.code(204);
      return;
    },
    createInviteLink: async ({ req, params, userId }) => {
      const now = new Date().toISOString();
      const link = createInviteLink(database, {
        podId: params.podId,
        callerUserId: userId,
        at: now,
      });
      const origin = publicOrigin ?? `${req.protocol}://${req.host}`;
      return {
        inviteLinkId: link.inviteLinkId,
        url: `${origin}/i/${link.token}`,
        singleUse: true,
        status: 'active',
        expiresAt: link.expiresAt,
      };
    },
    revokeInviteLink: async ({ params, reply, userId }) => {
      revokeInviteLink(database, {
        podId: params.podId,
        inviteLinkId: params.inviteLinkId,
        callerUserId: userId,
        at: new Date().toISOString(),
      });
      reply.code(204);
      return;
    },
    acceptInviteLink: async ({ params, userId }) => {
      const now = new Date().toISOString();
      const podId = acceptInviteLink(database, {
        token: params.token,
        userId,
        at: now,
      });
      return toContractPod(database, podId, userId, now);
    },
    leavePod: async ({ params, reply, userId }) => {
      leavePod(database, {
        podId: params.podId,
        userId,
        at: new Date().toISOString(),
      });
      reply.code(204);
      return;
    },
    removeMember: async ({ params, reply, userId }) => {
      removeMember(database, {
        podId: params.podId,
        callerUserId: userId,
        userId: params.userId,
        at: new Date().toISOString(),
      });
      reply.code(204);
      return;
    },
    setOwnPodMute: async ({ req, params, userId }) => {
      setOwnPodMute(database, {
        podId: params.podId,
        userId,
        muted: req.body.muted,
        at: new Date().toISOString(),
      });
      return { muted: req.body.muted };
    },
    listOwnPodInvitations: async ({ userId }) => ({
      invitations: listOwnInvitations(database, userId),
    }),
    listRhythmProposals: async ({ params, userId }) => ({
      proposals: listRhythmProposals(database, { podId: params.podId, userId }),
    }),
    proposeRhythm: async ({ req, params, userId }) => {
      const created = proposeRhythm(database, {
        podId: params.podId,
        userId,
        cadence: req.body.cadence,
        at: new Date().toISOString(),
      });
      return /** @type {any} */ (
        listRhythmProposals(database, { podId: params.podId, userId }).find(
          (/** @type {{ proposalId: string }} */ p) =>
            p.proposalId === created.proposalId,
        )
      );
    },
    acceptRhythmProposal: async ({ params, userId }) => {
      acceptRhythmProposal(database, {
        proposalId: params.proposalId,
        userId,
        at: new Date().toISOString(),
      });
      return /** @type {any} */ (
        listRhythmProposals(database, { podId: params.podId, userId }).find(
          (/** @type {{ proposalId: string }} */ p) =>
            p.proposalId === params.proposalId,
        )
      );
    },
    listGroupActivities: async ({ params, userId }) => ({
      activities: listGroupActivities(database, {
        podId: params.podId,
        userId,
      }),
    }),
    addGroupActivity: async ({ req, params, userId }) => {
      const now = new Date().toISOString();
      const created = addGroupActivity(database, {
        podId: params.podId,
        userId,
        label: req.body.label,
        at: now,
      });
      const me = /** @type {{ first_name: string }} */ (
        database
          .prepare('SELECT first_name FROM app_user WHERE user_id = ?')
          .get(userId)
      );
      return {
        activityId: created.activityId,
        label: created.label,
        addedBy: { userId, firstName: me.first_name },
        createdAt: created.createdAt,
      };
    },
    getOwnSubscription: async ({ userId }) => {
      const now = new Date().toISOString();
      const state = getOwnSubscription(database, { userId, at: now });
      return {
        status: state.status,
        priceCents: state.priceCents,
        currency: state.currency,
        period: state.period,
        store: state.store,
        environment: state.environment,
        expiresAt: state.expiresAt,
        plannerEnabled: state.plannerEnabled,
      };
    },
    submitSubscriptionReceipt: async ({ req, userId }) => {
      const now = new Date().toISOString();
      return submitSubscriptionReceipt(database, {
        userId,
        store: req.body.store,
        receipt: req.body.receipt,
        at: now,
        verifier,
      });
    },
    restoreSubscription: async ({ req, userId }) => {
      const now = new Date().toISOString();
      return restoreSubscription(database, {
        userId,
        store: req.body.store,
        receipt: req.body.receipt,
        at: now,
        verifier,
      });
    },
    listHangouts: async ({ params, userId }) => {
      requireMember(database, params.podId, userId);
      const rows = /** @type {Array<{ hangout_id: string }>} */ (
        database
          .prepare(
            'SELECT hangout_id FROM hangout WHERE pod_id = ? ORDER BY created_at, hangout_id',
          )
          .all(params.podId)
      );
      return {
        hangouts: rows.map((r) =>
          toContractHangout(database, r.hangout_id, params.podId, userId),
        ),
      };
    },
    startHangout: async ({ params, userId }) => {
      const now = new Date().toISOString();
      const created = startHangout(database, {
        podId: params.podId,
        userId,
        at: now,
      });
      return toContractHangout(
        database,
        created.hangoutId,
        params.podId,
        userId,
        now,
      );
    },
    getHangout: async ({ params, userId }) =>
      toContractHangout(database, params.hangoutId, params.podId, userId),
    getPoll: async ({ params, userId }) =>
      toContractPoll(
        getPoll(database, {
          podId: params.podId,
          hangoutId: params.hangoutId,
          pollId: params.pollId,
          userId,
        }),
      ),
    castOwnVote: async ({ req, params, userId }) => {
      const now = new Date().toISOString();
      return toContractPoll(
        castOwnVote(database, {
          podId: params.podId,
          hangoutId: params.hangoutId,
          pollId: params.pollId,
          userId,
          optionId: req.body.optionId,
          at: now,
        }),
      );
    },
    setOwnReadyAnswer: async ({ req, params, userId }) => {
      const now = new Date().toISOString();
      return setOwnReadyAnswer(database, {
        podId: params.podId,
        hangoutId: params.hangoutId,
        userId,
        answer: req.body.answer,
        at: now,
      });
    },
    listPodMessages: async ({ req, params, userId }) =>
      listPodMessages(database, {
        podId: params.podId,
        userId,
        cursor: req.query?.cursor ?? null,
      }),
    sendPodMessage: async ({ req, params, userId }) => {
      const now = new Date().toISOString();
      return sendPodMessage(database, {
        podId: params.podId,
        userId,
        clientMessageId: req.body.clientMessageId,
        text: req.body.text,
        at: now,
      });
    },
    listOwnPlannerChat: async ({ req, userId }) =>
      listOwnPlannerChat(database, {
        userId,
        cursor: req.query?.cursor ?? null,
      }),
    sendOwnPlannerChatMessage: async ({ req, userId }) => {
      const now = new Date().toISOString();
      return sendOwnPlannerChatMessage(database, {
        userId,
        clientMessageId: req.body.clientMessageId,
        text: req.body.text,
        at: now,
      });
    },
    getOwnStretchAsk: async ({ params, userId }) =>
      getOwnStretchAsk(database, {
        stretchAskId: params.stretchAskId,
        userId,
      }),
    answerOwnStretchAsk: async ({ req, params, userId }) =>
      answerOwnStretchAsk(database, {
        stretchAskId: params.stretchAskId,
        userId,
        accept: req.body.accept,
      }),
    volunteerAsPayer: async ({ params, userId }) => {
      const now = new Date().toISOString();
      volunteerAsPayer(database, {
        podId: params.podId,
        hangoutId: params.hangoutId,
        userId,
        at: now,
      });
      return toContractHangout(
        database,
        params.hangoutId,
        params.podId,
        userId,
        now,
      );
    },
    confirmBooking: async ({ req, params, userId }) => {
      const now = new Date().toISOString();
      confirmBooking(database, {
        podId: params.podId,
        hangoutId: params.hangoutId,
        userId,
        estimatedTotalCents: req.body.estimatedTotalCents,
        at: now,
      });
      return toContractHangout(
        database,
        params.hangoutId,
        params.podId,
        userId,
        now,
      );
    },
    getSplit: async ({ params, userId }) =>
      getSplit(database, {
        podId: params.podId,
        hangoutId: params.hangoutId,
        userId,
      }),
    confirmSplit: async ({ req, params, userId }) => {
      const key = /** @type {string} */ (req.headers['idempotency-key']);
      const target = String(params.hangoutId);
      const bodyDigest = canonicalize(req.body);
      const prior =
        /** @type {{ target: string, body_digest: string, status_code: number, response_json: string } | undefined} */ (
          database
            .prepare(
              'SELECT target, body_digest, status_code, response_json FROM idempotency_record WHERE actor_user_id = ? AND operation = ? AND key = ?',
            )
            .get(userId, 'confirmSplit', key)
        );
      if (prior) {
        if (prior.target !== target || prior.body_digest !== bodyDigest) {
          const err = /** @type {any} */ (
            new Error('idempotency key was used for a different request')
          );
          err.code = 'idempotency_key_conflict';
          throw err;
        }
        return JSON.parse(prior.response_json);
      }
      const split = confirmSplit(database, {
        podId: params.podId,
        hangoutId: params.hangoutId,
        userId,
        totalCents: req.body.totalCents,
        at: new Date().toISOString(),
      });
      database
        .prepare(
          `INSERT INTO idempotency_record (actor_user_id, operation, key, target, body_digest, status_code, response_json, created_at)
           VALUES (?, 'confirmSplit', ?, ?, ?, 201, ?, ?)`,
        )
        .run(
          userId,
          key,
          target,
          bodyDigest,
          JSON.stringify(split),
          new Date().toISOString(),
        );
      return split;
    },
    receiveProviderWebhook: async ({ req }) => {
      const presented =
        typeof req.headers['x-signature'] === 'string'
          ? Buffer.from(req.headers['x-signature'], 'hex')
          : null;
      const expected = createHmac('sha256', hookKey)
        .update(JSON.stringify(req.body ?? {}), 'utf8')
        .digest();
      if (
        !presented ||
        presented.length !== expected.length ||
        !timingSafeEqual(presented, expected)
      ) {
        const err = /** @type {any} */ (new Error('bad webhook signature'));
        err.code = 'unauthenticated';
        throw err;
      }
      const event = /** @type {{ id: string, event_type: string }} */ (
        req.body
      );
      const row = database
        .prepare(
          `INSERT INTO provider_event (provider_event_id, event_type, signature_verified, received_at)
           VALUES (?, ?, 1, ?) ON CONFLICT (provider_event_id) DO NOTHING RETURNING provider_event_id`,
        )
        .get(event.id, event.event_type, new Date().toISOString());
      return {
        signatureVerified: true,
        duplicate: !row,
        effectsApplied: false,
      };
    },

    // ---- wave: calendar (US-019) -----------------------------------------

    listOwnCalendarAccounts: async ({ userId }) =>
      calListAccounts(database, { userId }),

    startCalendarConnect: async ({ req, userId }) => {
      const now = new Date().toISOString();
      return calStartConnect({
        userId,
        at: now,
        provider: calProvider,
        stateKey: calKey,
      });
    },

    disconnectCalendarAccount: async ({ params, reply, userId }) => {
      calDisconnect(database, {
        userId,
        calendarAccountId: params.calendarAccountId,
        provider: calProvider,
      });
      reply.code(204);
      return;
    },

    setPlannerCalendarAccess: async ({ req, params, userId }) => {
      const account = calSetPlannerAccess(database, {
        userId,
        calendarAccountId: params.calendarAccountId,
        calendarId: params.calendarId,
        plannerMayRead: req.body.plannerMayRead,
      });
      const cal = account.calendars.find(
        (c) => c.calendarId === params.calendarId,
      );
      if (!cal) {
        const err = /** @type {any} */ (new Error('calendar not found'));
        err.code = 'not_found';
        throw err;
      }
      return cal;
    },

    getOwnCalendar: async ({ req, userId }) => {
      const q = req.query ?? {};
      return calGetOwn(database, {
        userId,
        from: String(q.from),
        to: String(q.to),
        provider: calProvider,
      });
    },

    addEventToOwnCalendar: async ({ req, reply, userId }) => {
      calAddEvent(database, {
        userId,
        eventId: req.body.eventId,
        provider: calProvider,
      });
      reply.code(204);
      return;
    },

    setActualTotal: async ({ req, params, userId }) => {
      requireMember(database, params.podId, userId);
      const splitRow = /** @type {any} */ (
        database
          .prepare('SELECT payer_user_id FROM split WHERE hangout_id = ?')
          .get(params.hangoutId)
      );
      if (!splitRow) {
        const err = /** @type {any} */ (new Error('split not confirmed yet'));
        err.code = 'wrong_hangout_state';
        throw err;
      }
      if (splitRow.payer_user_id !== userId) {
        const err = /** @type {any} */ (
          new Error('only the payer can set the actual total')
        );
        err.code = 'not_payer';
        throw err;
      }
      const nextSeq = /** @type {any} */ (
        database
          .prepare(
            'SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM split_actual_total WHERE hangout_id = ?',
          )
          .get(params.hangoutId)
      ).next_seq;
      database
        .prepare(
          'INSERT INTO split_actual_total (hangout_id, seq, actual_total_cents, entered_at) VALUES (?, ?, ?, ?)',
        )
        .run(
          params.hangoutId,
          nextSeq,
          req.body.actualTotalCents,
          new Date().toISOString(),
        );
      return getSplit(database, {
        podId: params.podId,
        hangoutId: params.hangoutId,
        userId,
      });
    },

    listOwnBalances: async ({ userId }) => {
      const asDebtor = /** @type {any[]} */ (
        database
          .prepare(
            `SELECT e.entry_id, e.hangout_id, e.creditor_user_id, h.pod_id
               FROM ledger_entry e JOIN hangout h ON h.hangout_id = e.hangout_id
              WHERE e.debtor_user_id = ? AND e.kind = 'balance_created'
              ORDER BY e.seq DESC`,
          )
          .all(userId)
      );
      const asCreditor = /** @type {any[]} */ (
        database
          .prepare(
            `SELECT e.entry_id, e.hangout_id, e.debtor_user_id, h.pod_id
               FROM ledger_entry e JOIN hangout h ON h.hangout_id = e.hangout_id
              WHERE e.creditor_user_id = ? AND e.kind = 'balance_created' AND e.debtor_user_id != ?
              ORDER BY e.seq DESC`,
          )
          .all(userId, userId)
      );
      let totalIOweCents = 0;
      let totalOwedToMeCents = 0;
      const balances = [];
      for (const row of asDebtor) {
        const bal = deriveBalance(database, String(row.hangout_id), userId);
        if (!bal) continue;
        const pod = /** @type {any} */ (
          database
            .prepare('SELECT name FROM pod WHERE pod_id = ?')
            .get(String(row.pod_id))
        );
        const hInfo = /** @type {any} */ (
          database
            .prepare(
              `SELECT o.title FROM hangout h LEFT JOIN shortlist_option o ON o.option_id = h.chosen_option_id WHERE h.hangout_id = ?`,
            )
            .get(String(row.hangout_id))
        );
        const cp = /** @type {any} */ (
          database
            .prepare(
              'SELECT user_id, first_name FROM app_user WHERE user_id = ?',
            )
            .get(String(row.creditor_user_id))
        );
        if (bal.status === 'owed' || bal.status === 'pending') {
          totalIOweCents += bal.amountCents;
        }
        balances.push({
          balanceId: bal.entryId,
          podId: String(row.pod_id),
          podName: pod ? String(pod.name) : 'Pod',
          hangoutId: String(row.hangout_id),
          hangoutTitle: hInfo?.title ? String(hInfo.title) : 'Hangout',
          direction: 'i_owe',
          counterparty: cp
            ? { userId: String(cp.user_id), firstName: String(cp.first_name) }
            : { userId: String(row.creditor_user_id), firstName: 'Member' },
          amountCents: bal.amountCents,
          currency: 'USD',
          status: bal.status,
          updatedAt: bal.updatedAt,
        });
      }
      for (const row of asCreditor) {
        const debtorId = String(row.debtor_user_id);
        const bal = deriveBalance(database, String(row.hangout_id), debtorId);
        if (!bal) continue;
        const pod = /** @type {any} */ (
          database
            .prepare('SELECT name FROM pod WHERE pod_id = ?')
            .get(String(row.pod_id))
        );
        const hInfo = /** @type {any} */ (
          database
            .prepare(
              `SELECT o.title FROM hangout h LEFT JOIN shortlist_option o ON o.option_id = h.chosen_option_id WHERE h.hangout_id = ?`,
            )
            .get(String(row.hangout_id))
        );
        const cp = /** @type {any} */ (
          database
            .prepare(
              'SELECT user_id, first_name FROM app_user WHERE user_id = ?',
            )
            .get(debtorId)
        );
        if (bal.status === 'owed' || bal.status === 'pending') {
          totalOwedToMeCents += bal.amountCents;
        }
        balances.push({
          balanceId: bal.entryId,
          podId: String(row.pod_id),
          podName: pod ? String(pod.name) : 'Pod',
          hangoutId: String(row.hangout_id),
          hangoutTitle: hInfo?.title ? String(hInfo.title) : 'Hangout',
          direction: 'owed_to_me',
          counterparty: cp
            ? { userId: String(cp.user_id), firstName: String(cp.first_name) }
            : { userId: debtorId, firstName: 'Member' },
          amountCents: bal.amountCents,
          currency: 'USD',
          status: bal.status,
          updatedAt: bal.updatedAt,
        });
      }
      return {
        totalIOweCents,
        totalOwedToMeCents,
        currency: 'USD',
        balances,
        nextCursor: null,
      };
    },

    getOwnBalance: async ({ params, userId }) => {
      const entry = /** @type {any} */ (
        database
          .prepare(
            `SELECT e.entry_id, e.hangout_id, e.debtor_user_id, e.creditor_user_id, h.pod_id
               FROM ledger_entry e JOIN hangout h ON h.hangout_id = e.hangout_id
              WHERE e.entry_id = ? AND e.kind = 'balance_created'`,
          )
          .get(params.balanceId)
      );
      if (!entry) {
        const err = /** @type {any} */ (new Error('balance not found'));
        err.code = 'not_found';
        throw err;
      }
      const hangoutId = String(entry.hangout_id);
      const isDebtor = String(entry.debtor_user_id) === userId;
      const isCreditor = String(entry.creditor_user_id) === userId;
      if (!isDebtor && !isCreditor) {
        const err = /** @type {any} */ (new Error('balance not found'));
        err.code = 'not_found';
        throw err;
      }
      const debtorId = String(entry.debtor_user_id);
      const bal = deriveBalance(database, hangoutId, debtorId);
      if (!bal) {
        const err = /** @type {any} */ (new Error('balance not found'));
        err.code = 'not_found';
        throw err;
      }
      const pod = /** @type {any} */ (
        database
          .prepare('SELECT name FROM pod WHERE pod_id = ?')
          .get(String(entry.pod_id))
      );
      const hInfo = /** @type {any} */ (
        database
          .prepare(
            `SELECT o.title FROM hangout h LEFT JOIN shortlist_option o ON o.option_id = h.chosen_option_id WHERE h.hangout_id = ?`,
          )
          .get(hangoutId)
      );
      const cpId = isDebtor ? String(entry.creditor_user_id) : debtorId;
      const cp = /** @type {any} */ (
        database
          .prepare('SELECT user_id, first_name FROM app_user WHERE user_id = ?')
          .get(cpId)
      );
      return {
        balanceId: bal.entryId,
        podId: String(entry.pod_id),
        podName: pod ? String(pod.name) : 'Pod',
        hangoutId,
        hangoutTitle: hInfo?.title ? String(hInfo.title) : 'Hangout',
        direction: isDebtor ? 'i_owe' : 'owed_to_me',
        counterparty: cp
          ? { userId: String(cp.user_id), firstName: String(cp.first_name) }
          : { userId: cpId, firstName: 'Member' },
        amountCents: bal.amountCents,
        currency: 'USD',
        status: bal.status,
        updatedAt: bal.updatedAt,
      };
    },

    // ---- wave: paypal (US-019) -------------------------------------------

    getOwnPayPalLink: async ({ userId }) => {
      const row = /** @type {any} */ (
        database
          .prepare(
            'SELECT status, environment, linked_at FROM paypal_link WHERE user_id = ?',
          )
          .get(userId)
      );
      if (!row)
        return { status: 'not_linked', environment: 'sandbox', linkedAt: null };
      return {
        status: String(row.status),
        environment: 'sandbox',
        linkedAt: row.linked_at ? String(row.linked_at) : null,
      };
    },

    startOwnPayPalLink: async () => {
      const err = /** @type {any} */ (
        new Error(
          'the payment gate is closed: no human money-flow approval recorded',
        )
      );
      err.code = 'payment_gate_blocked';
      throw err;
    },

    unlinkOwnPayPal: async () => {
      const err = /** @type {any} */ (
        new Error(
          'the payment gate is closed: no human money-flow approval recorded',
        )
      );
      err.code = 'payment_gate_blocked';
      throw err;
    },

    // ---- wave: notifications (US-019) ------------------------------------

    getOwnNotificationSettings: async ({ userId }) =>
      notifGetSettings(database, userId),

    setOwnNotificationSettings: async ({ req, userId }) => {
      const now = new Date().toISOString();
      return notifSetSettings(database, {
        userId,
        settings: req.body,
        at: now,
      });
    },

    registerPushToken: async ({ req, userId }) => {
      const now = new Date().toISOString();
      return notifRegisterToken(database, {
        userId,
        platform: req.body.platform,
        token: req.body.token,
        at: now,
      });
    },
  };

  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(/** @type {any} */ (ops))) {
      const operationId = /** @type {any} */ (op).operationId;
      const url = '/api/v1' + path.replaceAll(/\{([^}]+)\}/g, ':$1');
      const responses = /** @type {any} */ (op).responses ?? {};
      const okCode = Object.keys(responses).find((c) => c.startsWith('2'));
      const okSchema = okCode
        ? responses[okCode]?.content?.['application/json']?.schema
        : undefined;
      const handler = handlers[operationId];
      app.route({
        method: method.toUpperCase(),
        url,
        config: { operation: op },
        schema: {
          body: /** @type {any} */ (op).requestBody?.content?.[
            'application/json'
          ]?.schema,
          querystring: /** @type {any} */ (op).parameters
            ? {
                type: 'object',
                properties: Object.fromEntries(
                  /** @type {any[]} */ (
                    /** @type {any} */ (op).parameters ?? []
                  )
                    .filter((p) => p.in === 'query')
                    .map((p) => [p.name, p.schema ?? {}]),
                ),
              }
            : undefined,
          headers: /** @type {any} */ (op).parameters
            ? {
                type: 'object',
                properties: Object.fromEntries(
                  /** @type {any[]} */ (
                    /** @type {any} */ (op).parameters ?? []
                  )
                    .filter((p) => p.in === 'header')
                    .map((p) => [p.name.toLowerCase(), p.schema ?? {}]),
                ),
                required: /** @type {any[]} */ (
                  /** @type {any} */ (op).parameters ?? []
                )
                  .filter((p) => p.in === 'header' && p.required)
                  .map((p) => p.name.toLowerCase()),
              }
            : undefined,
          params: /** @type {any} */ (op).parameters
            ? {
                type: 'object',
                properties: Object.fromEntries(
                  /** @type {any[]} */ (
                    /** @type {any} */ (op).parameters ?? []
                  )
                    .filter((p) => p.in === 'path')
                    .map((p) => [p.name, p.schema ?? {}]),
                ),
              }
            : undefined,
          response: okSchema
            ? { [/** @type {string} */ (okCode)]: okSchema }
            : undefined,
        },
        preHandler: async (req, reply) => {
          if (PUBLIC_OPS.has(operationId)) return;
          if (operationId === 'receiveProviderWebhook') return;
          const session = resolveSession(database, req.cookies[SESSION_COOKIE]);
          if (!session) {
            return reply
              .code(401)
              .send({ code: 'unauthenticated', message: 'sign in first' });
          }
          /** @type {any} */ (req).userId = session.userId;
          if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            const presented = req.headers['x-csrf-token'];
            const expected = Buffer.from(session.csrfDigest, 'hex');
            const actual =
              typeof presented === 'string'
                ? createHash('sha256').update(presented, 'utf8').digest()
                : null;
            if (
              !actual ||
              actual.length !== expected.length ||
              !timingSafeEqual(actual, expected)
            ) {
              return reply.code(403).send({
                code: 'csrf_rejected',
                message: 'missing or wrong CSRF token',
              });
            }
          }
        },
        handler: async (req, reply) => {
          if (!handler) {
            return reply.code(500).send({
              code: 'internal_error',
              message: `unwired operation ${operationId}`,
            });
          }
          const result = await handler({
            db: database,
            req,
            reply,
            params: req.params,
            userId: /** @type {any} */ (req).userId,
          });
          if (
            !reply.sent &&
            reply.statusCode === 200 &&
            okCode &&
            okCode !== '200'
          ) {
            reply.code(Number(okCode));
          }
          return reply.send(result);
        },
      });
    }
  }
  void SessionError;
  return app;
}
