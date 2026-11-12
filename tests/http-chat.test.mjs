// US-019 wave 7: pod chat and private planner chat over HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const U3 = '01J00000000000000000000003';
const U9 = '01J00000000000000000000009';
const POD = '01J00000000000000000000010';
const T0 = '2026-11-12T12:00:00.000Z';

/** App with a 3-member pod; U9 is outside. */
function chatApp() {
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

test('wave7: send and list pod messages; resend deduplicates; outsiders see nothing', async () => {
  const { app } = chatApp();
  const h1 = await signIn(app);
  const out = await signIn(app, '+15550009999');

  const sent = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/messages`,
    headers: h1,
    payload: { clientMessageId: U1, text: 'Lanes on Friday?' },
  });
  assert.equal(sent.statusCode, 201);
  assert.equal(sent.json().text, 'Lanes on Friday?');
  assert.equal(sent.json().author.kind, 'member');

  const resend = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/messages`,
    headers: h1,
    payload: { clientMessageId: U1, text: 'Lanes on Friday?' },
  });
  assert.equal(resend.statusCode, 201);
  assert.equal(resend.json().messageId, sent.json().messageId);

  const list = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/messages`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().messages.length, 1);
  assert.equal(list.json().nextCursor, null);

  const hidden = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/messages`,
    headers: { cookie: out.cookie },
  });
  assert.equal(hidden.statusCode, 404);
});

test('wave7: private planner chat is per-member and never in the pod', async () => {
  const { app } = chatApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');

  const sent = await app.inject({
    method: 'POST',
    url: '/api/v1/me/planner-chat/messages',
    headers: h1,
    payload: { clientMessageId: U2, text: 'Keep it under fifty' },
  });
  assert.equal(sent.statusCode, 201);

  const mine = await app.inject({
    method: 'GET',
    url: '/api/v1/me/planner-chat/messages',
    headers: { cookie: h1.cookie },
  });
  assert.equal(mine.statusCode, 200);
  assert.equal(mine.json().messages.length, 1);

  const other = await app.inject({
    method: 'GET',
    url: '/api/v1/me/planner-chat/messages',
    headers: { cookie: h2.cookie },
  });
  assert.equal(other.statusCode, 200);
  assert.equal(other.json().messages.length, 0);

  const pod = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/messages`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(pod.json().messages.length, 0);
});
