// US-019: HTTP routes for the contract (vertical tracer).
// Every openapi.json operation is served under /api/v1; errors match the
// contract Error / PaymentGateError shapes; settlement stays gated (409).
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';

import { buildApp } from '../services/api/src/http/app.mjs';

/** An app whose database holds one seeded synthetic user. */
function signedApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  db.prepare(
    "INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES ('u-1', 'Sam', ?, 1, '2026-11-12T12:00:00.000Z')",
  ).run('+15550001111');
  return { app: buildApp({ db }), db };
}

/** Run the contract phone-code flow and return cookie + CSRF headers.
 * @param {any} app
 */
async function signIn(app, phone = '+15550001111') {
  const challenge = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/phone-codes',
    payload: { phone },
  });
  assert.equal(challenge.statusCode, 201);
  const session = await app.inject({
    method: 'POST',
    url: '/api/v1/sessions',
    payload: { challengeId: challenge.json().challengeId, code: '000000' },
  });
  assert.equal(session.statusCode, 201);
  const cookie = session.headers['set-cookie'].split(';')[0];
  return {
    cookie,
    'x-csrf-token': session.json().csrfToken,
  };
}

test('tracer: public catalog lists seeded synthetic events', async () => {
  const app = buildApp();
  const res = await app.inject({ method: 'GET', url: '/api/v1/events' });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.ok(Array.isArray(body.events) && body.events.length > 0);
  assert.equal(body.events[0].synthetic, true);
  assert.equal(body.nextCursor, null);
});

const BALANCE_ID = `01J${'0'.repeat(23)}`;
const IDEMPOTENCY_KEY = `01J${'1'.repeat(23)}`;

test('tracer: settlement payments stay gated closed', async () => {
  const { app } = signedApp();
  const headers = await signIn(app);
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/me/balances/${BALANCE_ID}/settlement-payments`,
    headers: { ...headers, 'idempotency-key': IDEMPOTENCY_KEY },
    payload: {},
  });
  assert.equal(res.statusCode, 409);
  const body = res.json();
  assert.equal(body.code, 'payment_gate_blocked');
  assert.equal(body.gate.open, false);
});

test('tracer: unknown routes return the contract Error shape', async () => {
  const app = buildApp();
  const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().code, 'not_found');
});

test('tracer: authenticated routes refuse anonymous callers', async () => {
  const app = buildApp();
  const res = await app.inject({ method: 'GET', url: '/api/v1/me' });
  assert.equal(res.statusCode, 401);
  assert.equal(res.json().code, 'unauthenticated');
});

test('wave2: the signed-in user reads and updates their profile', async () => {
  const { app, db } = signedApp();
  const headers = await signIn(app);
  const me = await app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: { cookie: headers.cookie },
  });
  assert.equal(me.statusCode, 200);
  const body = me.json();
  assert.equal(body.userId, 'u-1');
  assert.equal(body.phone, '+15550001111');
  assert.equal(body.paypalLinked, false);
  const updated = await app.inject({
    method: 'PATCH',
    url: '/api/v1/me',
    headers,
    payload: {
      firstName: 'Sam',
      bio: 'Bowling enjoyer',
      interests: ['active', 'food'],
    },
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().bio, 'Bowling enjoyer');
  assert.deepEqual(updated.json().interests, ['active', 'food']);
});

test('wave2: private limits round-trip and stay owner-only', async () => {
  const { app } = signedApp();
  const headers = await signIn(app);
  const before = await app.inject({
    method: 'GET',
    url: '/api/v1/me/private-limits',
    headers: { cookie: headers.cookie },
  });
  assert.equal(before.statusCode, 200);
  assert.deepEqual(before.json().dietaryNeeds, []);
  const saved = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/private-limits',
    headers,
    payload: {
      budgetPerHangoutCents: 2500,
      dietaryNeeds: ['vegetarian'],
      dislikes: ['nightlife'],
      maxTravelMinutes: 45,
    },
  });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().budgetPerHangoutCents, 2500);
  const after = await app.inject({
    method: 'GET',
    url: '/api/v1/me/private-limits',
    headers: { cookie: headers.cookie },
  });
  assert.equal(after.json().maxTravelMinutes, 45);
});

test('wave2: permissions and interests', async () => {
  const { app } = signedApp();
  const headers = await signIn(app);
  const perms = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/permissions',
    headers,
    payload: {
      contacts: 'granted',
      notifications: 'denied',
      calendar: 'not_asked',
    },
  });
  assert.equal(perms.statusCode, 200);
  assert.equal(perms.json().contacts, 'granted');
  const interests = await app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: { cookie: headers.cookie },
  });
  assert.equal(interests.json().permissions.notifications, 'denied');
  const tags = await app.inject({
    method: 'GET',
    url: '/api/v1/interests',
    headers: { cookie: headers.cookie },
  });
  assert.equal(tags.statusCode, 200);
  assert.ok(tags.json().interests.length > 5);
});

test('wave2: contact matching finds only granted, seeded members', async () => {
  const { app, db } = signedApp();
  db.prepare(
    "INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES ('u-2', 'Pri', ?, 1, '2026-11-12T12:00:00.000Z')",
  ).run('+15550002222');
  const headers = await signIn(app);
  const ungranted = await app.inject({
    method: 'POST',
    url: '/api/v1/contacts/matches',
    headers,
    payload: { phones: ['+15550002222'] },
  });
  assert.equal(ungranted.statusCode, 200);
  assert.deepEqual(ungranted.json().matches, []);
  await app.inject({
    method: 'PUT',
    url: '/api/v1/me/permissions',
    headers,
    payload: {
      contacts: 'granted',
      notifications: 'not_asked',
      calendar: 'not_asked',
    },
  });
  const matched = await app.inject({
    method: 'POST',
    url: '/api/v1/contacts/matches',
    headers,
    payload: { phones: ['+15550002222', '+19998887777'] },
  });
  assert.equal(matched.statusCode, 200);
  assert.deepEqual(matched.json().matches, [
    { phone: '+15550002222', userId: 'u-2', firstName: 'Pri' },
  ]);
});

test('wave2: deleting the account ends the session', async () => {
  const { app } = signedApp();
  const headers = await signIn(app);
  const del = await app.inject({
    method: 'DELETE',
    url: '/api/v1/me',
    headers,
  });
  assert.equal(del.statusCode, 204);
  const me = await app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: { cookie: headers.cookie },
  });
  assert.equal(me.statusCode, 401);
});
