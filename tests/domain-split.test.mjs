// Wave 9 domain: draft and confirmed splits backed by SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { PodError } from '../services/api/src/pods.mjs';
import { getSplit, confirmSplit } from '../services/api/src/split.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const U3 = '01J00000000000000000000003';
const U9 = '01J00000000000000000000009';
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const T0 = '2026-11-12T12:00:00.000Z';

/** BOOKED hangout, payer U1, yes U1/U2, estimate 7000. */
function setup() {
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
  return db;
}

/** @param {string} code */
const fails = (code) => (/** @type {any} */ e) =>
  e instanceof PodError && e.code === code;

test('draft split is derived from the estimate and the yes-members', () => {
  const db = setup();
  const split = getSplit(db, { podId: POD, hangoutId: HANGOUT, userId: U2 });
  assert.equal(split.status, 'draft');
  assert.equal(split.basis, 'estimate');
  assert.equal(split.totalCents, 7000);
  assert.equal(split.payer.userId, U1);
  assert.equal(split.yesMemberCount, 2);
  assert.equal(
    split.shares.reduce(
      (n, /** @type {{ shareCents: number }} */ s) => n + s.shareCents,
      0,
    ),
    7000,
  );
  assert.throws(
    () => getSplit(db, { podId: POD, hangoutId: HANGOUT, userId: U9 }),
    fails('not_found'),
  );
});

test('only the payer confirms, the total must match, and it happens once', () => {
  const db = setup();
  assert.throws(
    () =>
      confirmSplit(db, {
        podId: POD,
        hangoutId: HANGOUT,
        userId: U2,
        totalCents: 7000,
        at: T0,
      }),
    fails('not_payer'),
  );
  assert.throws(
    () =>
      confirmSplit(db, {
        podId: POD,
        hangoutId: HANGOUT,
        userId: U1,
        totalCents: 7001,
        at: T0,
      }),
    fails('validation_failed'),
  );
  const confirmed = confirmSplit(db, {
    podId: POD,
    hangoutId: HANGOUT,
    userId: U1,
    totalCents: 7000,
    at: T0,
  });
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(
    db.prepare('SELECT state FROM hangout WHERE hangout_id = ?').get(HANGOUT)
      ?.state,
    'BALANCES_OPEN',
  );
  const entries = db
    .prepare(
      'SELECT debtor_user_id, creditor_user_id, kind, amount_cents FROM ledger_entry WHERE hangout_id = ?',
    )
    .all(HANGOUT);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].debtor_user_id, U2);
  assert.equal(entries[0].creditor_user_id, U1);
  assert.equal(entries[0].kind, 'balance_created');
  assert.throws(
    () =>
      confirmSplit(db, {
        podId: POD,
        hangoutId: HANGOUT,
        userId: U1,
        totalCents: 7000,
        at: T0,
      }),
    fails('split_already_confirmed'),
  );
  assert.equal(
    getSplit(db, { podId: POD, hangoutId: HANGOUT, userId: U1 }).status,
    'confirmed',
  );
});
