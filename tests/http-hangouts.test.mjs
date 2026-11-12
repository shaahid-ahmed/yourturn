// US-019 wave 5: subscriptions and hangout start/read over HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';
import {
  sandboxReceiptVerifier,
  signSandboxReceipt,
} from '../services/api/src/subscription.mjs';

const KEY = 'wave5-test-receipt-key-0001';
const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const U3 = '01J00000000000000000000003';
const MONTH_LATER = '2026-12-12T12:00:00.000Z';

/** App with three seeded synthetic users and a known receipt key. */
function hangoutsApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  const add = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  add.run(U1, 'Sam', '+15550001111', '2026-11-12T12:00:00.000Z');
  add.run(U2, 'Pri', '+15550002222', '2026-11-12T12:00:00.000Z');
  add.run(U3, 'Lee', '+15550003333', '2026-11-12T12:00:00.000Z');
  const app = buildApp({
    db,
    receiptVerifier: sandboxReceiptVerifier({ key: KEY }),
  });
  return { app, db };
}

/**
 * @param {any} app
 * @param {string} [phone]
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
  return {
    cookie: session.headers['set-cookie'].split(';')[0],
    'x-csrf-token': session.json().csrfToken,
  };
}

function receipt() {
  return signSandboxReceipt({
    key: KEY,
    store: 'apple_app_store',
    originalTransactionId: 'wave5-otx-1',
    expiresAt: MONTH_LATER,
  });
}

test('wave5: subscription is none until a receipt is verified', async () => {
  const { app } = hangoutsApp();
  const h1 = await signIn(app);
  const before = await app.inject({
    method: 'GET',
    url: '/api/v1/me/subscription',
    headers: { cookie: h1.cookie },
  });
  assert.equal(before.statusCode, 200);
  assert.equal(before.json().status, 'none');
  assert.equal(before.json().plannerEnabled, false);
  const bad = await app.inject({
    method: 'POST',
    url: '/api/v1/me/subscription/receipts',
    headers: h1,
    payload: { store: 'apple_app_store', receipt: 'bogus' },
  });
  assert.equal(bad.statusCode, 422);
  assert.equal(bad.json().code, 'receipt_invalid');
  const ok = await app.inject({
    method: 'POST',
    url: '/api/v1/me/subscription/receipts',
    headers: h1,
    payload: { store: 'apple_app_store', receipt: receipt() },
  });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().status, 'active');
  assert.equal(ok.json().plannerEnabled, true);
});

test('wave5: starting a hangout needs a plan and three joined members', async () => {
  const { app } = hangoutsApp();
  const h1 = await signIn(app);
  const pod = await app.inject({
    method: 'POST',
    url: '/api/v1/pods',
    headers: h1,
    payload: { name: 'Friday crew', inviteUserIds: [] },
  });
  const podId = pod.json().podId;
  const noplan = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${podId}/hangouts`,
    headers: h1,
    payload: {},
  });
  assert.equal(noplan.statusCode, 409);
  assert.equal(noplan.json().code, 'subscription_required');
  await app.inject({
    method: 'POST',
    url: '/api/v1/me/subscription/receipts',
    headers: h1,
    payload: { store: 'apple_app_store', receipt: receipt() },
  });
  const small = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${podId}/hangouts`,
    headers: h1,
    payload: {},
  });
  assert.equal(small.statusCode, 409);
  assert.equal(small.json().code, 'pod_too_small');
});

test('wave5: a planned pod with three members opens a PLANNING hangout', async () => {
  const { app } = hangoutsApp();
  const h1 = await signIn(app);
  await app.inject({
    method: 'PUT',
    url: '/api/v1/me/permissions',
    headers: h1,
    payload: {
      contacts: 'granted',
      notifications: 'not_asked',
      calendar: 'not_asked',
    },
  });
  await app.inject({
    method: 'POST',
    url: '/api/v1/me/subscription/receipts',
    headers: h1,
    payload: { store: 'apple_app_store', receipt: receipt() },
  });
  const pod = await app.inject({
    method: 'POST',
    url: '/api/v1/pods',
    headers: h1,
    payload: { name: 'Friday crew', inviteUserIds: [] },
  });
  const podId = pod.json().podId;
  await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${podId}/members`,
    headers: h1,
    payload: { userIds: [U2, U3] },
  });
  for (const phone of ['+15550002222', '+15550003333']) {
    const h = await signIn(app, phone);
    const invites = await app.inject({
      method: 'GET',
      url: '/api/v1/me/pod-invitations',
      headers: { cookie: h.cookie },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/me/pod-invitations/${invites.json().invitations[0].invitationId}/acceptance`,
      headers: h,
    });
  }
  const started = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${podId}/hangouts`,
    headers: h1,
    payload: {},
  });
  assert.equal(started.statusCode, 201);
  assert.equal(started.json().state, 'PLANNING');
  assert.equal(started.json().activityPollId, null);
  assert.equal(started.json().payer, null);
  const fetched = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${podId}/hangouts/${started.json().hangoutId}`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(fetched.statusCode, 200);
  assert.equal(fetched.json().hangoutId, started.json().hangoutId);
  const listed = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${podId}/hangouts`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(listed.json().hangouts.length, 1);
});
