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
import { matchContacts } from '../pods.mjs';
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
        .reduce((acc, key) => acc[key], root);
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
  app.setErrorHandler((err, req, reply) => {
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
      const status = STATUS_BY_CODE[code] ?? 422;
      const body = { code, message: err.message };
      if (code === 'payment_gate_blocked') body.gate = closedGate();
      return reply.code(status).send(body);
    }
    req.log.error(err);
    console.error(`[http] ${req.method} ${req.url}`, err);
    return reply
      .code(500)
      .send({ code: 'internal_error', message: 'unexpected error' });
  });
  app.setNotFoundHandler((req, reply) => {
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
  const interests = database
    .prepare('SELECT tag FROM user_interest WHERE user_id = ? ORDER BY tag')
    .all(userId)
    .map((r) => r.tag);
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
 * @param {{ db?: any, vaultKey?: string }} [options] vaultKey is 64 hex chars;
 * a random key is generated when omitted, so private limits do not survive
 * a restart. Production must load a persistent key.
 */
export function buildApp({ db, vaultKey } = {}) {
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
          response: okSchema ? { [okCode]: okSchema } : undefined,
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
          req.userId = session.userId;
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
              return reply
                .code(403)
                .send({
                  code: 'csrf_rejected',
                  message: 'missing or wrong CSRF token',
                });
            }
          }
        },
        handler: async (req, reply) => {
          if (!handler) {
            return reply
              .code(500)
              .send({
                code: 'internal_error',
                message: `unwired operation ${operationId}`,
              });
          }
          const result = await handler({
            db: database,
            req,
            reply,
            params: req.params,
            userId: req.userId,
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
