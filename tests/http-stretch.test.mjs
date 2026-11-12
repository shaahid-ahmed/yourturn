// US-019 wave 10: private stretch asks over HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';
import { createStretchAsk } from '../services/api/src/stretch.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const T0 = '2026-11-12T12:00:00.000Z';

/** Pod U1/U2, one hangout, one pending ask owned by U1. */
function stretchApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  const add = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  add.run(U1, 'Sam', '+15550001111', T0);
  add.run(U2, 'Pri', '+15550002222', T0);
  db.prepare(
    'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(POD, 'Pod A', U1, T0);
  const member = db.prepare(
    'INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
  );
  member.run(POD, U1, 'creator', T0);
  member.run(POD, U2, 'member', T0);
  db.prepare(
    'INSERT INTO hangout (hangout_id, pod_id, state, version, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
  ).run(HANGOUT, POD, 'PLANNING', T0, T0);
  const askId = createStretchAsk(db, {
    hangoutId: HANGOUT,
    userId: U1,
    optionTitle: 'Chef counter',
    perPersonCostCents: 9000,
    deadline: '2099-01-01T00:00:00.000Z',
    at: T0,
  });
  return { app: buildApp({ db }), askId };
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

test('wave10: the owner reads and answers once; anyone else sees nothing', async () => {
  const { app, askId } = stretchApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');

  const read = await app.inject({
    method: 'GET',
    url: `/api/v1/me/stretch-asks/${askId}`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(read.statusCode, 200);
  assert.equal(read.json().status, 'pending');
  assert.equal(read.json().appliesToThisHangoutOnly, true);

  const hidden = await app.inject({
    method: 'GET',
    url: `/api/v1/me/stretch-asks/${askId}`,
    headers: { cookie: h2.cookie },
  });
  assert.equal(hidden.statusCode, 404);

  const answer = await app.inject({
    method: 'POST',
    url: `/api/v1/me/stretch-asks/${askId}/answer`,
    headers: h1,
    payload: { accept: false },
  });
  assert.equal(answer.statusCode, 200);
  assert.equal(answer.json().status, 'declined');

  const again = await app.inject({
    method: 'POST',
    url: `/api/v1/me/stretch-asks/${askId}/answer`,
    headers: h1,
    payload: { accept: true },
  });
  assert.equal(again.statusCode, 409);
});
