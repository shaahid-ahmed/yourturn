// US-019 wave 3: notification settings and push token HTTP handler tests.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001';
const T0 = '2026-11-12T12:00:00.000Z';

function notifApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  ).run(U1, 'Sam', '+15550001111', T0);
  return { app: buildApp({ db }), db };
}

/** @param {any} app @param {string} [phone] */
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
  return {
    cookie: session.headers['set-cookie'].split(';')[0],
    'x-csrf-token': session.json().csrfToken,
  };
}

test('notifications: unauthenticated request returns 401', async () => {
  const { app } = notifApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/notification-settings',
  });
  assert.equal(res.statusCode, 401);
});

test('notifications: getOwnNotificationSettings returns defaults when never set', async () => {
  const { app } = notifApp();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/notification-settings',
    headers: h1,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.polls, true);
  assert.equal(body.reminders, true);
  assert.equal(body.privateAsks, true);
  assert.equal(body.money, true);
});

test('notifications: setOwnNotificationSettings persists all four switches', async () => {
  const { app } = notifApp();
  const h1 = await signIn(app);
  const put = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/notification-settings',
    headers: h1,
    payload: { polls: false, reminders: true, privateAsks: false, money: true },
  });
  assert.equal(put.statusCode, 200);
  const saved = put.json();
  assert.equal(saved.polls, false);
  assert.equal(saved.reminders, true);
  assert.equal(saved.privateAsks, false);
  assert.equal(saved.money, true);

  // GET confirms it's persisted
  const get = await app.inject({
    method: 'GET',
    url: '/api/v1/me/notification-settings',
    headers: h1,
  });
  assert.equal(get.statusCode, 200);
  assert.deepEqual(get.json(), saved);
});

test('notifications: setOwnNotificationSettings idempotent — second write overwrites first', async () => {
  const { app } = notifApp();
  const h1 = await signIn(app);
  const all = { polls: true, reminders: true, privateAsks: true, money: true };
  const none = {
    polls: false,
    reminders: false,
    privateAsks: false,
    money: false,
  };
  await app.inject({
    method: 'PUT',
    url: '/api/v1/me/notification-settings',
    headers: h1,
    payload: all,
  });
  const res = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/notification-settings',
    headers: h1,
    payload: none,
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), none);
});

test('notifications: registerPushToken returns token id, platform and createdAt', async () => {
  const { app } = notifApp();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/me/push-tokens',
    headers: h1,
    payload: { platform: 'ios', token: 'device-token-abc123' },
  });
  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.ok(
    typeof body.pushTokenId === 'string' && body.pushTokenId.length > 0,
  );
  assert.equal(body.platform, 'ios');
  assert.ok(typeof body.createdAt === 'string');
});

test('notifications: registerPushToken moves token from another user to caller', async () => {
  const { app, db } = notifApp();
  // Seed a second user and register the token for them first
  db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  ).run('01J00000000000000000000002', 'Pri', '+15550002222', T0);

  const h2 = await signIn(app, '+15550002222');
  await app.inject({
    method: 'POST',
    url: '/api/v1/me/push-tokens',
    headers: h2,
    payload: { platform: 'android', token: 'shared-device-token' },
  });

  // U1 registers the same token — it should move to U1
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/me/push-tokens',
    headers: h1,
    payload: { platform: 'android', token: 'shared-device-token' },
  });
  assert.equal(res.statusCode, 201);
  const row = db
    .prepare('SELECT user_id FROM push_token WHERE token = ?')
    .get('shared-device-token');
  assert.equal(row?.user_id, U1);
});
