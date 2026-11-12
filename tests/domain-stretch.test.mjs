// Wave 10 domain: private stretch asks (owner-only, lazy expiry).
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { PodError } from '../services/api/src/pods.mjs';
import {
  createStretchAsk,
  getOwnStretchAsk,
  answerOwnStretchAsk,
} from '../services/api/src/stretch.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const T0 = '2026-11-12T12:00:00.000Z';

/** Pod with U1/U2 and one hangout. */
function setup() {
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
  return db;
}

/** @param {string} code */
const fails = (code) => (/** @type {any} */ e) =>
  e instanceof PodError && e.code === code;

test('an ask is visible only to its owner and answers once', () => {
  const db = setup();
  const askId = createStretchAsk(db, {
    hangoutId: HANGOUT,
    userId: U1,
    optionTitle: 'Chef counter',
    perPersonCostCents: 9000,
    deadline: '2099-01-01T00:00:00.000Z',
    at: T0,
  });
  const ask = getOwnStretchAsk(db, { stretchAskId: askId, userId: U1 });
  assert.equal(ask.status, 'pending');
  assert.equal(ask.podName, 'Pod A');
  assert.equal(ask.appliesToThisHangoutOnly, true);
  assert.throws(
    () => getOwnStretchAsk(db, { stretchAskId: askId, userId: U2 }),
    fails('not_found'),
  );
  const accepted = answerOwnStretchAsk(db, {
    stretchAskId: askId,
    userId: U1,
    accept: true,
    at: T0,
  });
  assert.equal(accepted.status, 'accepted');
  assert.throws(
    () =>
      answerOwnStretchAsk(db, {
        stretchAskId: askId,
        userId: U1,
        accept: false,
        at: T0,
      }),
    fails('stretch_ask_closed'),
  );
});

test('an unanswered ask expires at the deadline without telling the pod', () => {
  const db = setup();
  const askId = createStretchAsk(db, {
    hangoutId: HANGOUT,
    userId: U1,
    optionTitle: 'Chef counter',
    perPersonCostCents: 9000,
    deadline: '2026-11-12T13:00:00.000Z',
    at: T0,
  });
  const ask = getOwnStretchAsk(db, {
    stretchAskId: askId,
    userId: U1,
    at: '2026-11-12T14:00:00.000Z',
  });
  assert.equal(ask.status, 'expired');
  assert.throws(
    () =>
      answerOwnStretchAsk(db, {
        stretchAskId: askId,
        userId: U1,
        accept: true,
        at: '2026-11-12T14:00:00.000Z',
      }),
    fails('stretch_ask_closed'),
  );
});
