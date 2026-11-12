/**
 * HTTP routes for the Unspoken contract (US-019).
 *
 * Every `operationId` in `docs/03-architecture/openapi.json` is served under
 * `/api/v1`. Request and 2xx response shapes are validated against the
 * contract. Errors use the contract `Error` / `PaymentGateError` shapes.
 * The payment gate stays closed: settlement payments answer 409.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
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
} from '../pods.mjs';
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
 * @param {{ db?: any, vaultKey?: string, publicOrigin?: string }} [options] vaultKey is 64 hex chars;
 * a random key is generated when omitted, so private limits do not survive
 * a restart. Production must load a persistent key. publicOrigin is the
 * public HTTPS origin (US-014, e.g. a tunnel URL) used for invite links and
 * documented return/cancel URLs; when omitted the request host is used.
 */
export function buildApp({ db, vaultKey, publicOrigin } = {}) {
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
    masterKey: vaultKey ?? randomBytes(32).toString('hex'),
  });
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
      vault.put(userId, stored);
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
