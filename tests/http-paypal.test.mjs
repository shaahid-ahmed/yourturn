// US-019 wave 4: PayPal link HTTP handler tests (getOwnPayPalLink,
// startOwnPayPalLink, unlinkOwnPayPal). The payment gate is closed for all
// mutating operations; getOwnPayPalLink is a read-only DB query.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const T0 = '2026-11-12T12:00:00.000Z';

function paypalApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  ).run(U1, 'Sam', '+15550001111', T0);
  db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  ).run(U2, 'Pri', '+15550002222', T0);
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

test('paypal: unauthenticated request returns 401', async () => {
  const { app } = paypalApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/paypal-link',
  });
  assert.equal(res.statusCode, 401);
});

test('paypal: getOwnPayPalLink returns not_linked when no row exists', async () => {
  const { app } = paypalApp();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/paypal-link',
    headers: h1,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.status, 'not_linked');
  assert.equal(body.environment, 'sandbox');
  assert.equal(body.linkedAt, null);
});

test('paypal: getOwnPayPalLink returns linked status when row exists', async () => {
  const { app, db } = paypalApp();
  db.prepare(
    "INSERT INTO paypal_link (user_id, status, environment, linked_at) VALUES (?, 'linked', 'sandbox', ?)",
  ).run(U1, T0);
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/paypal-link',
    headers: h1,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.status, 'linked');
  assert.equal(body.environment, 'sandbox');
  assert.equal(body.linkedAt, T0);
});

test('paypal: getOwnPayPalLink is scoped to the caller — different users see their own status', async () => {
  const { app, db } = paypalApp();
  // U1 linked, U2 not linked
  db.prepare(
    "INSERT INTO paypal_link (user_id, status, environment, linked_at) VALUES (?, 'linked', 'sandbox', ?)",
  ).run(U1, T0);
  const h2 = await signIn(app, '+15550002222');
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/paypal-link',
    headers: h2,
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, 'not_linked');
});

test('paypal: startOwnPayPalLink returns 409 payment_gate_blocked', async () => {
  const { app } = paypalApp();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/me/paypal-link',
    headers: h1,
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'payment_gate_blocked');
  assert.equal(res.json().gate.open, false);
});

test('paypal: unlinkOwnPayPal returns 409 payment_gate_blocked', async () => {
  const { app } = paypalApp();
  const h1 = await signIn(app);
  const res = await app.inject({
    method: 'DELETE',
    url: '/api/v1/me/paypal-link',
    headers: h1,
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'payment_gate_blocked');
  assert.equal(res.json().gate.open, false);
});
