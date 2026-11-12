// US-019 wave 8: payer volunteering, booking confirmation and the provider
// webhook over HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const U3 = '01J00000000000000000000003';
const U9 = '01J00000000000000000000009';
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const T0 = '2026-11-12T12:00:00.000Z';
const HOOK_KEY = 'wave8-test-webhook-key-0001';

/**
 * Hangout in AWAITING_CONFIRMATION: U1/U2 said yes, U3 said no. Only U1 has
 * linked PayPal. The chosen option is catalog event evt-001.
 */
function bookingApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  const add = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  add.run(U1, 'Sam', '+15550001111', T0);
  add.run(U2, 'Pri', '+15550002222', T0);
  add.run(U3, 'Lee', '+15550003333', T0);
  add.run(U9, 'Out', '+15550009999', T0);
  db.prepare(
    'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(POD, 'Pod A', U1, T0);
  const member = db.prepare(
    'INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
  );
  member.run(POD, U1, 'creator', T0);
  member.run(POD, U2, 'member', T0);
  member.run(POD, U3, 'member', T0);
  db.prepare(
    "INSERT INTO paypal_link (user_id, status, environment, linked_at) VALUES (?, 'linked', 'sandbox', ?)",
  ).run(U1, T0);
  db.prepare(
    'INSERT INTO hangout (hangout_id, pod_id, state, version, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
  ).run(HANGOUT, POD, 'AWAITING_CONFIRMATION', T0, T0);
  db.prepare(
    'INSERT INTO hangout_transition (hangout_id, seq, from_state, to_state, event, actor_user_id, at) VALUES (?, 1, ?, ?, ?, NULL, ?)',
  ).run(
    HANGOUT,
    'READY_CHECK',
    'AWAITING_CONFIRMATION',
    'readyCheckClosedWithYes',
    T0,
  );
  db.prepare(
    "INSERT INTO shortlist_option (option_id, hangout_id, title, venue_or_organizer, per_person_estimate_cents, event_id, synthetic) VALUES ('01J00000000000000000000021', ?, 'Open Bowl Night', 'Brooklyn Bowl', 3500, 'evt-001', 1)",
  ).run(HANGOUT);
  db.prepare(
    "INSERT INTO time_slot (slot_id, hangout_id, starts_at, ends_at) VALUES ('01J00000000000000000000022', ?, '2026-11-21T00:00:00.000Z', '2026-11-21T03:00:00.000Z')",
  ).run(HANGOUT);
  db.prepare(
    "UPDATE hangout SET chosen_option_id = '01J00000000000000000000021', chosen_slot_id = '01J00000000000000000000022' WHERE hangout_id = ?",
  ).run(HANGOUT);
  const answer = db.prepare(
    'INSERT INTO ready_answer (hangout_id, user_id, answer, answered_at) VALUES (?, ?, ?, ?)',
  );
  answer.run(HANGOUT, U1, 'yes', T0);
  answer.run(HANGOUT, U2, 'yes', T0);
  answer.run(HANGOUT, U3, 'no', T0);
  db.prepare(
    "INSERT INTO booking (hangout_id, status, party_size, starts_at, estimated_total_cents, simulated, confirmed_by, confirmed_at) VALUES (?, 'awaiting_confirmation', 2, '2026-11-21T00:00:00.000Z', 7000, 1, NULL, NULL)",
  ).run(HANGOUT);
  return { app: buildApp({ db, webhookKey: HOOK_KEY }), db };
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

test('wave8: volunteer as payer, then the payer confirms the booking', async () => {
  const { app } = bookingApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');
  const h3 = await signIn(app, '+15550003333');

  const noLink = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/payer`,
    headers: h2,
  });
  assert.equal(noLink.statusCode, 409);
  assert.equal(noLink.json().code, 'paypal_link_required');

  const noVote = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/payer`,
    headers: h3,
  });
  assert.equal(noVote.statusCode, 403);
  assert.equal(noVote.json().code, 'not_yes_member');

  const volunteer = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/payer`,
    headers: h1,
  });
  assert.equal(volunteer.statusCode, 200);
  assert.equal(volunteer.json().payer.userId, U1);

  const stranger = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/booking-confirmation`,
    headers: h2,
    payload: { estimatedTotalCents: 7000 },
  });
  assert.equal(stranger.statusCode, 403);
  assert.equal(stranger.json().code, 'not_payer');

  const confirm = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/booking-confirmation`,
    headers: h1,
    payload: { estimatedTotalCents: 7000 },
  });
  assert.equal(confirm.statusCode, 202);
  assert.equal(confirm.json().booking.status, 'booking');
});

test('wave8: unsigned webhooks are rejected; signed ones dedupe with no effects', async () => {
  const { app } = bookingApp();
  const event = {
    id: 'evt-webhook-1',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
  };

  const unsigned = await app.inject({
    method: 'POST',
    url: '/api/v1/webhooks/paypal',
    payload: event,
  });
  assert.equal(unsigned.statusCode, 401);

  const sign = (/** @type {any} */ body) =>
    createHmac('sha256', HOOK_KEY)
      .update(JSON.stringify(body), 'utf8')
      .digest('hex');
  const first = await app.inject({
    method: 'POST',
    url: '/api/v1/webhooks/paypal',
    headers: { 'x-signature': sign(event) },
    payload: event,
  });
  assert.equal(first.statusCode, 202);
  assert.equal(first.json().signatureVerified, true);
  assert.equal(first.json().duplicate, false);
  assert.equal(first.json().effectsApplied, false);

  const replay = await app.inject({
    method: 'POST',
    url: '/api/v1/webhooks/paypal',
    headers: { 'x-signature': sign(event) },
    payload: event,
  });
  assert.equal(replay.statusCode, 202);
  assert.equal(replay.json().duplicate, true);
});
