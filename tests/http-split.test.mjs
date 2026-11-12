// US-019 wave 9: draft and confirmed splits over HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const U3 = '01J00000000000000000000003';
const U9 = '01J00000000000000000000009';
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const T0 = '2026-11-12T12:00:00.000Z';

/** BOOKED hangout, payer U1, yes U1/U2, estimate 7000. */
function splitApp() {
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
    'INSERT INTO hangout (hangout_id, pod_id, state, version, payer_user_id, chosen_option_id, created_at, updated_at) VALUES (?, ?, ?, 2, ?, ?, ?, ?)',
  ).run(HANGOUT, POD, 'BOOKED', U1, '01J00000000000000000000021', T0, T0);
  db.prepare(
    "INSERT INTO booking (hangout_id, status, party_size, starts_at, estimated_total_cents, simulated, confirmed_by, confirmed_at) VALUES (?, 'booked', 2, '2026-11-21T00:00:00.000Z', 7000, 1, ?, ?)",
  ).run(HANGOUT, U1, T0);
  const answer = db.prepare(
    'INSERT INTO ready_answer (hangout_id, user_id, answer, answered_at) VALUES (?, ?, ?, ?)',
  );
  answer.run(HANGOUT, U1, 'yes', T0);
  answer.run(HANGOUT, U2, 'yes', T0);
  answer.run(HANGOUT, U3, 'no', T0);
  return { app: buildApp({ db }), db };
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

test('wave9: draft split is visible, only the payer confirms once', async () => {
  const { app } = splitApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');
  const out = await signIn(app, '+15550009999');

  const draft = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split`,
    headers: { cookie: h2.cookie },
  });
  assert.equal(draft.statusCode, 200);
  assert.equal(draft.json().status, 'draft');
  assert.equal(draft.json().yesMemberCount, 2);
  assert.equal(
    draft
      .json()
      .shares.reduce(
        (/** @type {number} */ n, /** @type {{ shareCents: number }} */ s) =>
          n + s.shareCents,
        0,
      ),
    7000,
  );

  const hidden = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split`,
    headers: { cookie: out.cookie },
  });
  assert.equal(hidden.statusCode, 404);

  const stranger = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h2, 'idempotency-key': 'split-key-0001' },
    payload: { totalCents: 7000 },
  });
  assert.equal(stranger.statusCode, 403);

  const mismatch = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'split-key-0002' },
    payload: { totalCents: 7001 },
  });
  assert.equal(mismatch.statusCode, 422);

  const confirm = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'split-key-0003' },
    payload: { totalCents: 7000 },
  });
  assert.equal(confirm.statusCode, 201);
  assert.equal(confirm.json().status, 'confirmed');

  const again = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'split-key-0004' },
    payload: { totalCents: 7000 },
  });
  assert.equal(again.statusCode, 409);

  const replay = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'split-key-0003' },
    payload: { totalCents: 7000 },
  });
  assert.equal(replay.statusCode, 201);
  assert.equal(replay.json().status, 'confirmed');

  const conflict = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'split-key-0003' },
    payload: { totalCents: 6999 },
  });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().code, 'idempotency_key_conflict');
});
