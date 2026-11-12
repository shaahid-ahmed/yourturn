// #99: fixture event ids never leak to the contract boundary.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { createHangout } from '../services/api/src/db/hangout-store.mjs';
import { buildApp, contractEventId } from '../services/api/src/http/app.mjs';
import { openActivityPoll } from '../services/api/src/polls.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const U3 = '01J00000000000000000000003';
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const T0 = '2026-11-12T12:00:00.000Z';
const EXPECTED = contractEventId('evt-001');

function eventApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  const add = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  add.run(U1, 'Sam', '+15550001111', T0);
  add.run(U2, 'Pri', '+15550002222', T0);
  add.run(U3, 'Lee', '+15550003333', T0);
  db.prepare(
    'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(POD, 'Pod A', U1, T0);
  const member = db.prepare(
    'INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
  );
  member.run(POD, U1, 'creator', T0);
  member.run(POD, U2, 'member', T0);
  member.run(POD, U3, 'member', T0);
  createHangout(db, {
    hangoutId: HANGOUT,
    podId: POD,
    actorUserId: U1,
    at: T0,
  });
  const pollId = openActivityPoll(db, {
    hangoutId: HANGOUT,
    options: [
      {
        title: 'Open Bowl Night',
        venueOrOrganizer: 'Brooklyn Bowl',
        startsAt: '2026-11-21T00:00:00.000Z',
        perPersonEstimateCents: 3500,
        eventId: 'evt-001',
      },
    ],
    closesAt: '2099-01-01T00:00:00.000Z',
    at: T0,
  });
  const optionRow = /** @type {{ option_id: string } | undefined} */ (
    db
      .prepare('SELECT option_id FROM shortlist_option WHERE hangout_id = ?')
      .get(HANGOUT)
  );
  const optionId = String(optionRow?.option_id);
  return { app: buildApp({ db }), db, pollId, optionId };
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

test('#99: poll options and chosen activity carry contract event ids', async () => {
  const { app, db, pollId, optionId } = eventApp();
  const h1 = await signIn(app);

  const poll = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/polls/${pollId}`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(poll.statusCode, 200);
  assert.equal(poll.json().options[0].activity.eventId, EXPECTED);

  db.prepare(
    'UPDATE hangout SET chosen_option_id = ? WHERE hangout_id = ?',
  ).run(String(optionId), HANGOUT);
  const hangout = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}`,
    headers: { cookie: h1.cookie },
  });
  assert.equal(hangout.statusCode, 200);
  assert.equal(hangout.json().chosenActivity.eventId, EXPECTED);
});
