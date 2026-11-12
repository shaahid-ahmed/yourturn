// US-019 wave 6: polls, votes and ready-check answers over HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { createHangout } from '../services/api/src/db/hangout-store.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';
import { openActivityPoll } from '../services/api/src/polls.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const U3 = '01J00000000000000000000003';
const U9 = '01J00000000000000000000009';
const T0 = '2026-11-12T12:00:00.000Z';

const SHORTLIST = [
  {
    title: 'Synthetic Lanes',
    venueOrOrganizer: 'Synthetic Bowl Co',
    startsAt: '2026-11-20T23:00:00.000Z',
    perPersonEstimateCents: 3000,
  },
  {
    title: 'Synthetic Noodles',
    venueOrOrganizer: 'Synthetic Kitchen',
    startsAt: '2026-11-20T22:00:00.000Z',
    perPersonEstimateCents: 2500,
  },
];

/** App with a 3-member pod, one hangout and one open activity poll. */
function pollsApp() {
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
    "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('01J00000000000000000000010', 'Pod A', ?, ?)",
  ).run(U1, T0);
  const member = db.prepare(
    "INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES ('01J00000000000000000000010', ?, 'member', ?)",
  );
  member.run(U1, T0);
  member.run(U2, T0);
  member.run(U3, T0);
  createHangout(db, {
    hangoutId: '01J00000000000000000000011',
    podId: '01J00000000000000000000010',
    actorUserId: U1,
    at: T0,
  });
  const pollId = openActivityPoll(db, {
    hangoutId: '01J00000000000000000000011',
    options: SHORTLIST,
    closesAt: '2099-01-01T00:00:00.000Z',
    at: T0,
  });
  db.prepare(
    "UPDATE hangout SET state = 'READY_CHECK' WHERE hangout_id = ?",
  ).run('01J00000000000000000000011');
  db.prepare(
    "INSERT INTO paypal_link (user_id, status, environment, linked_at) VALUES (?, 'linked', 'sandbox', ?)",
  ).run(U1, T0);
  const options = db
    .prepare(
      'SELECT poll_option_id FROM poll_option WHERE poll_id = ? ORDER BY rowid',
    )
    .all(pollId)
    .map((r) => String(r.poll_option_id));
  return { app: buildApp({ db }), db, pollId, options };
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

test('wave6: read a poll, vote, change the vote; outsiders see nothing', async () => {
  const { app, pollId, options } = pollsApp();
  const h1 = await signIn(app);
  const out = await signIn(app, '+15550009999');

  const poll = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/01J00000000000000000000010/hangouts/01J00000000000000000000011/polls/${pollId}`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(poll.statusCode, 200);
  assert.equal(poll.json().options.length, 2);
  assert.equal(poll.json().winnerOptionId, null);

  const hidden = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/01J00000000000000000000010/hangouts/01J00000000000000000000011/polls/${pollId}`,
    headers: { cookie: out.cookie },
  });
  assert.equal(hidden.statusCode, 404);

  const vote = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/01J00000000000000000000010/hangouts/01J00000000000000000000011/polls/${pollId}/votes/me`,
    headers: h1,
    payload: { optionId: options[0] },
  });
  assert.equal(vote.statusCode, 200);
  assert.equal(vote.json().options[0].votes.length, 1);

  const change = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/01J00000000000000000000010/hangouts/01J00000000000000000000011/polls/${pollId}/votes/me`,
    headers: h1,
    payload: { optionId: options[1] },
  });
  assert.equal(change.statusCode, 200);
  assert.equal(change.json().options[0].votes.length, 0);
  assert.equal(change.json().options[1].votes.length, 1);

  const unknown = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/01J00000000000000000000010/hangouts/01J00000000000000000000011/polls/${pollId}/votes/me`,
    headers: h1,
    payload: { optionId: '01J00000000000000000000009' },
  });
  assert.equal(unknown.statusCode, 404);
});

test('wave6: ready answers are counted and visible by name', async () => {
  const { app, db } = pollsApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');
  db.prepare(
    "INSERT INTO ready_check (hangout_id, status, opened_at, closes_at) VALUES ('01J00000000000000000000011', 'open', ?, '2099-01-01T00:00:00.000Z')",
  ).run(T0);

  const yes = await app.inject({
    method: 'PUT',
    url: '/api/v1/pods/01J00000000000000000000010/hangouts/01J00000000000000000000011/ready-check/me',
    headers: h1,
    payload: { answer: 'yes' },
  });
  assert.equal(yes.statusCode, 200);
  assert.equal(yes.json().yesCount, 1);

  const no = await app.inject({
    method: 'PUT',
    url: '/api/v1/pods/01J00000000000000000000010/hangouts/01J00000000000000000000011/ready-check/me',
    headers: h2,
    payload: { answer: 'no' },
  });
  assert.equal(no.statusCode, 200);
  assert.equal(no.json().yesCount, 1);
  /** @type {Array<{ firstName: string, answer: string }>} */
  const answers = no.json().answers;
  const names = Object.fromEntries(answers.map((a) => [a.firstName, a.answer]));
  assert.equal(names.Sam, 'yes');
  assert.equal(names.Pri, 'no');
  assert.equal(names.Lee, 'no_answer');

  const read = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/01J00000000000000000000010/hangouts/01J00000000000000000000011/ready-check/me`,
    headers: h1,
    payload: { answer: 'yes' },
  });
  assert.equal(read.statusCode, 200);
  assert.equal(read.json().yesCount, 1);
});
