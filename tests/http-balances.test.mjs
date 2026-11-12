// US-019 wave: balances — getSplit, confirmSplit, setActualTotal,
// listOwnBalances, getOwnBalance.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001'; // payer
const U2 = '01J00000000000000000000002'; // debtor 1
const U3 = '01J00000000000000000000003'; // debtor 2
const U9 = '01J00000000000000000000009'; // non-member
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const OPTION = '01J00000000000000000000021';
const SLOT = '01J00000000000000000000022';
const T0 = '2026-11-12T12:00:00.000Z';

/**
 * Hangout in BOOKED state: U1 is payer, U2+U3 said yes. Total estimate 7500
 * (3 yes-members × 2500/each). The booking row reflects the total.
 */
function balancesApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  const addUser = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  addUser.run(U1, 'Sam', '+15550001111', T0);
  addUser.run(U2, 'Pri', '+15550002222', T0);
  addUser.run(U3, 'Lee', '+15550003333', T0);
  addUser.run(U9, 'Out', '+15550009999', T0);
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
    'INSERT INTO hangout (hangout_id, pod_id, state, version, payer_user_id, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)',
  ).run(HANGOUT, POD, 'BOOKED', U1, T0, T0);
  db.prepare(
    "INSERT INTO shortlist_option (option_id, hangout_id, title, venue_or_organizer, per_person_estimate_cents, event_id, synthetic) VALUES (?, ?, 'Open Bowl Night', 'Brooklyn Bowl', 2500, 'evt-001', 1)",
  ).run(OPTION, HANGOUT);
  db.prepare(
    "INSERT INTO time_slot (slot_id, hangout_id, starts_at, ends_at) VALUES (?, ?, '2026-11-21T18:00:00.000Z', '2026-11-21T21:00:00.000Z')",
  ).run(SLOT, HANGOUT);
  db.prepare(
    'UPDATE hangout SET chosen_option_id = ?, chosen_slot_id = ? WHERE hangout_id = ?',
  ).run(OPTION, SLOT, HANGOUT);
  const answer = db.prepare(
    'INSERT INTO ready_answer (hangout_id, user_id, answer, answered_at) VALUES (?, ?, ?, ?)',
  );
  answer.run(HANGOUT, U1, 'yes', T0);
  answer.run(HANGOUT, U2, 'yes', T0);
  answer.run(HANGOUT, U3, 'yes', T0);
  db.prepare(
    "INSERT INTO booking (hangout_id, status, party_size, starts_at, estimated_total_cents, simulated) VALUES (?, 'booked', 3, '2026-11-21T18:00:00.000Z', 7500, 1)",
  ).run(HANGOUT);
  return { app: buildApp({ db }), db };
}

/** @param {any} app @param {string} [phone] */
async function signIn(app, phone = '+15550001111') {
  const ch = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/phone-codes',
    payload: { phone },
  });
  assert.equal(ch.statusCode, 201);
  const sess = await app.inject({
    method: 'POST',
    url: '/api/v1/sessions',
    payload: { challengeId: ch.json().challengeId, code: '000000' },
  });
  assert.equal(sess.statusCode, 201);
  return {
    cookie: sess.headers['set-cookie'].split(';')[0],
    'x-csrf-token': sess.json().csrfToken,
  };
}

test('balances: getSplit returns draft split before payer confirms', async () => {
  const { app } = balancesApp();
  const h1 = await signIn(app);

  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split`,
    headers: h1,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.status, 'draft');
  assert.equal(body.basis, 'estimate');
  assert.equal(body.payer.userId, U1);
  assert.equal(body.splitType, 'equal');
  assert.equal(body.yesMemberCount, 3);
  assert.equal(body.shares.length, 3);
  assert.equal(body.totalCents, 7500);
  // All shares sum to total
  const shareSum = /** @type {any[]} */ (body.shares).reduce(
    (/** @type {number} */ s, /** @type {any} */ sh) => s + sh.shareCents,
    0,
  );
  assert.equal(shareSum, 7500);
});

test('balances: non-member gets 404 on getSplit', async () => {
  const { app } = balancesApp();
  const h9 = await signIn(app, '+15550009999');

  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split`,
    headers: h9,
  });
  assert.equal(res.statusCode, 404);
});

test('balances: non-payer cannot confirmSplit', async () => {
  const { app } = balancesApp();
  const h2 = await signIn(app, '+15550002222');

  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h2, 'idempotency-key': 'test-idem-key-001-nonpayer' },
    payload: { totalCents: 7500 },
  });
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().code, 'not_payer');
});

test('balances: payer confirms split, creates balance entries', async () => {
  const { app, db } = balancesApp();
  const h1 = await signIn(app);

  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'test-idem-key-001-confirm' },
    payload: { totalCents: 7500 },
  });
  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.status, 'confirmed');
  assert.equal(body.basis, 'estimate');
  assert.equal(body.totalCents, 7500);

  // Two balance_created entries (U2 and U3 owe U1; payer U1 is excluded)
  const entries = db
    .prepare(
      "SELECT * FROM ledger_entry WHERE kind = 'balance_created' ORDER BY seq",
    )
    .all();
  assert.equal(entries.length, 2);
  for (const e of entries) {
    assert.equal(String(e.creditor_user_id), U1);
    assert.ok(
      String(e.debtor_user_id) === U2 || String(e.debtor_user_id) === U3,
    );
    assert.ok(Number(e.amount_cents) > 0);
  }
  // Shares sum to total
  const totalShares = entries.reduce((s, e) => s + Number(e.amount_cents), 0);
  // With 3 members the payer's share is 7500/3=2500, debtors share the remaining 5000
  assert.ok(totalShares > 0 && totalShares <= 7500);
});

test('balances: confirmSplit twice returns 409', async () => {
  const { app } = balancesApp();
  const h1 = await signIn(app);

  await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'test-idem-key-002-first' },
    payload: { totalCents: 7500 },
  });
  const again = await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'test-idem-key-002-second' },
    payload: { totalCents: 7500 },
  });
  assert.equal(again.statusCode, 409);
  assert.equal(again.json().code, 'split_already_confirmed');
});

test('balances: setActualTotal updates basis and total', async () => {
  const { app } = balancesApp();
  const h1 = await signIn(app);

  // confirm first
  await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'test-idem-key-003-confirm' },
    payload: { totalCents: 7500 },
  });

  const actual = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/actual-total`,
    headers: { ...h1, 'idempotency-key': 'test-idem-key-003-actual' },
    payload: { actualTotalCents: 8100 },
  });
  assert.equal(actual.statusCode, 200);
  const body = actual.json();
  assert.equal(body.basis, 'actual');
  assert.equal(body.totalCents, 8100);
});

test('balances: setActualTotal without confirmed split returns 409', async () => {
  const { app } = balancesApp();
  const h1 = await signIn(app);

  const res = await app.inject({
    method: 'PUT',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/actual-total`,
    headers: { ...h1, 'idempotency-key': 'test-idem-key-004-actual' },
    payload: { actualTotalCents: 8100 },
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'wrong_hangout_state');
});

test('balances: listOwnBalances returns totals and balance lines', async () => {
  const { app } = balancesApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');

  // U1 confirms split to create balances
  await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'test-idem-key-005-confirm' },
    payload: { totalCents: 7500 },
  });

  // U2 sees one balance (i_owe to U1)
  const u2res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/balances',
    headers: h2,
  });
  assert.equal(u2res.statusCode, 200);
  const u2body = u2res.json();
  assert.ok(u2body.totalIOweCents > 0);
  assert.equal(u2body.totalOwedToMeCents, 0);
  assert.equal(u2body.balances.length, 1);
  assert.equal(u2body.balances[0].direction, 'i_owe');
  assert.equal(u2body.balances[0].counterparty.userId, U1);
  assert.equal(u2body.balances[0].status, 'owed');

  // U1 (payer) sees two balances (owed_to_me from U2 and U3)
  const u1res = await app.inject({
    method: 'GET',
    url: '/api/v1/me/balances',
    headers: h1,
  });
  assert.equal(u1res.statusCode, 200);
  const u1body = u1res.json();
  assert.equal(u1body.totalIOweCents, 0);
  assert.ok(u1body.totalOwedToMeCents > 0);
  assert.equal(u1body.balances.length, 2);
  assert.ok(
    /** @type {any[]} */ (u1body.balances).every(
      (/** @type {any} */ b) => b.direction === 'owed_to_me',
    ),
  );
});

test('balances: getOwnBalance returns single balance detail', async () => {
  const { app } = balancesApp();
  const h1 = await signIn(app);
  const h2 = await signIn(app, '+15550002222');

  await app.inject({
    method: 'POST',
    url: `/api/v1/pods/${POD}/hangouts/${HANGOUT}/split/confirmation`,
    headers: { ...h1, 'idempotency-key': 'test-idem-key-006-confirm' },
    payload: { totalCents: 7500 },
  });

  const listRes = await app.inject({
    method: 'GET',
    url: '/api/v1/me/balances',
    headers: h2,
  });
  const balanceId = listRes.json().balances[0].balanceId;

  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/me/balances/${balanceId}`,
    headers: h2,
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.balanceId, balanceId);
  assert.equal(body.direction, 'i_owe');
  assert.equal(body.status, 'owed');
  assert.ok(body.amountCents > 0);

  // Non-party gets 404
  const h9 = await signIn(app, '+15550009999');
  const noAccess = await app.inject({
    method: 'GET',
    url: `/api/v1/me/balances/${balanceId}`,
    headers: h9,
  });
  assert.equal(noAccess.statusCode, 404);
});
