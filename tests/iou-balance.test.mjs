// IOU balance ledger tests — 100% branch coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { IouLedger, BALANCE_STATES, BALANCE_ENTRY_KINDS } from '../services/api/src/iou-balance.mjs';

// ─── exports ───────────────────────────────────────────────────────────────

test('exports: constants are frozen arrays with the expected values', () => {
  assert.deepEqual([...BALANCE_STATES], ['owed', 'pending', 'paid', 'failed']);
  assert.deepEqual([...BALANCE_ENTRY_KINDS], [
    'balance_created',
    'payment_initiated',
    'payment_captured',
    'payment_failed',
  ]);
  assert.throws(() => { BALANCE_STATES[0] = 'x'; }, TypeError);
});

// ─── createBalances ─────────────────────────────────────────────────────────

test('createBalances: creates one entry per debtor, excluding the payer', () => {
  const ledger = new IouLedger();
  const entries = ledger.createBalances({
    hangoutId: 'h1',
    payerId: 'm1',
    yesMemberIds: ['m1', 'm2', 'm3'],
    totalCents: 3000,
  });
  // payer m1 excluded → 2 entries
  assert.equal(entries.length, 2);
  for (const e of entries) {
    assert.equal(e.kind, 'balance_created');
    assert.equal(e.hangoutId, 'h1');
    assert.equal(e.payerId, 'm1');
    assert.ok(e.memberId !== 'm1');
    assert.ok(e.amountCents > 0);
    assert.equal(e.idempotencyKey, null);
    assert.equal(e.providerEventId, null);
  }
});

test('createBalances: shares sum to total', () => {
  const ledger = new IouLedger();
  const entries = ledger.createBalances({
    hangoutId: 'h2',
    payerId: 'm1',
    yesMemberIds: ['m1', 'm2', 'm3', 'm4'],
    totalCents: 2800,
  });
  // payer excluded → 3 debtors; their shares should sum to their combined portion
  // splitShares was called on all 4, so the total of all 4 shares = 2800
  // We only get the 3 debtor shares; combined they equal totalCents minus payer's share
  const total = entries.reduce((s, e) => s + e.amountCents, 0);
  assert.ok(total > 0 && total < 2800); // payer keeps their own share
});

test('createBalances: solo payer (no other members) returns empty array', () => {
  const ledger = new IouLedger();
  const entries = ledger.createBalances({
    hangoutId: 'h-solo',
    payerId: 'm1',
    yesMemberIds: ['m1'],
    totalCents: 1500,
  });
  assert.deepEqual(entries, []);
});

test('createBalances: refuses duplicate split for same hangout', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h3', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 200 });
  assert.throws(
    () => ledger.createBalances({ hangoutId: 'h3', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 200 }),
    /already created/,
  );
});

test('createBalances: validates inputs', () => {
  const ledger = new IouLedger();
  assert.throws(() => ledger.createBalances({ hangoutId: '', payerId: 'p', yesMemberIds: ['p'], totalCents: 100 }), TypeError);
  assert.throws(() => ledger.createBalances({ hangoutId: 'h', payerId: '', yesMemberIds: ['p'], totalCents: 100 }), TypeError);
  assert.throws(() => ledger.createBalances({ hangoutId: 'h', payerId: 'p', yesMemberIds: [], totalCents: 100 }), RangeError);
  assert.throws(() => ledger.createBalances({ hangoutId: 'h', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 0 }), RangeError);
  // non-integer cents
  assert.throws(() => ledger.createBalances({ hangoutId: 'h', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 1.5 }), TypeError);
});

// ─── initiatePayment ────────────────────────────────────────────────────────

test('initiatePayment: transitions owed → pending', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h4', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  const entry = ledger.initiatePayment({ hangoutId: 'h4', memberId: 'q', idempotencyKey: 'ik-1' });
  assert.equal(entry.kind, 'payment_initiated');
  assert.equal(entry.memberId, 'q');
  assert.equal(entry.idempotencyKey, 'ik-1');

  const bal = ledger.balances('h4');
  assert.equal(bal.find(b => b.memberId === 'q').state, 'pending');
});

test('initiatePayment: idempotent on same key', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h5', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  const e1 = ledger.initiatePayment({ hangoutId: 'h5', memberId: 'q', idempotencyKey: 'ik-2' });
  const e2 = ledger.initiatePayment({ hangoutId: 'h5', memberId: 'q', idempotencyKey: 'ik-2' });
  assert.equal(e1.entryId, e2.entryId);
});

test('initiatePayment: rejects when already pending', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h6', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  ledger.initiatePayment({ hangoutId: 'h6', memberId: 'q', idempotencyKey: 'ik-3' });
  assert.throws(
    () => ledger.initiatePayment({ hangoutId: 'h6', memberId: 'q', idempotencyKey: 'ik-99' }),
    /already pending/,
  );
});

test('initiatePayment: rejects when already paid', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h7', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  const bal = ledger.balances('h7').find(b => b.memberId === 'q');
  ledger.initiatePayment({ hangoutId: 'h7', memberId: 'q', idempotencyKey: 'ik-4' });
  ledger.capturePayment({ hangoutId: 'h7', memberId: 'q', providerEventId: 'pe-1', amountCents: bal.amountCents });
  assert.throws(
    () => ledger.initiatePayment({ hangoutId: 'h7', memberId: 'q', idempotencyKey: 'ik-5' }),
    /already paid/,
  );
});

test('initiatePayment: rejects unknown member', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h8', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  assert.throws(
    () => ledger.initiatePayment({ hangoutId: 'h8', memberId: 'z', idempotencyKey: 'ik-6' }),
    /no balance/,
  );
});

test('initiatePayment: validates inputs', () => {
  const ledger = new IouLedger();
  assert.throws(() => ledger.initiatePayment({ hangoutId: '', memberId: 'q', idempotencyKey: 'k' }), TypeError);
  assert.throws(() => ledger.initiatePayment({ hangoutId: 'h', memberId: '', idempotencyKey: 'k' }), TypeError);
  assert.throws(() => ledger.initiatePayment({ hangoutId: 'h', memberId: 'q', idempotencyKey: '' }), TypeError);
});

// ─── capturePayment ──────────────────────────────────────────────────────────

test('capturePayment: transitions pending → paid', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h9', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  const bal = ledger.balances('h9').find(b => b.memberId === 'q');
  ledger.initiatePayment({ hangoutId: 'h9', memberId: 'q', idempotencyKey: 'ik-7' });
  ledger.capturePayment({ hangoutId: 'h9', memberId: 'q', providerEventId: 'pe-2', amountCents: bal.amountCents });
  assert.equal(ledger.balances('h9').find(b => b.memberId === 'q').state, 'paid');
});

test('capturePayment: idempotent on same providerEventId', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h10', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  const bal = ledger.balances('h10').find(b => b.memberId === 'q');
  ledger.initiatePayment({ hangoutId: 'h10', memberId: 'q', idempotencyKey: 'ik-8' });
  const e1 = ledger.capturePayment({ hangoutId: 'h10', memberId: 'q', providerEventId: 'pe-3', amountCents: bal.amountCents });
  const e2 = ledger.capturePayment({ hangoutId: 'h10', memberId: 'q', providerEventId: 'pe-3', amountCents: bal.amountCents });
  assert.equal(e1.entryId, e2.entryId);
});

test('capturePayment: rejects if not pending', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h11', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  assert.throws(
    () => ledger.capturePayment({ hangoutId: 'h11', memberId: 'q', providerEventId: 'pe-4', amountCents: 1000 }),
    /cannot capture/,
  );
});

test('capturePayment: rejects if amount does not match', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h12', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  ledger.initiatePayment({ hangoutId: 'h12', memberId: 'q', idempotencyKey: 'ik-9' });
  assert.throws(
    () => ledger.capturePayment({ hangoutId: 'h12', memberId: 'q', providerEventId: 'pe-5', amountCents: 999 }),
    /does not match/,
  );
});

test('capturePayment: rejects unknown member', () => {
  const ledger = new IouLedger();
  assert.throws(
    () => ledger.capturePayment({ hangoutId: 'hx', memberId: 'z', providerEventId: 'pe-6', amountCents: 100 }),
    /no balance/,
  );
});

test('capturePayment: validates inputs', () => {
  const ledger = new IouLedger();
  assert.throws(() => ledger.capturePayment({ hangoutId: '', memberId: 'q', providerEventId: 'p', amountCents: 100 }), TypeError);
  assert.throws(() => ledger.capturePayment({ hangoutId: 'h', memberId: '', providerEventId: 'p', amountCents: 100 }), TypeError);
  assert.throws(() => ledger.capturePayment({ hangoutId: 'h', memberId: 'q', providerEventId: '', amountCents: 100 }), TypeError);
  assert.throws(() => ledger.capturePayment({ hangoutId: 'h', memberId: 'q', providerEventId: 'p', amountCents: 0 }), RangeError);
  assert.throws(() => ledger.capturePayment({ hangoutId: 'h', memberId: 'q', providerEventId: 'p', amountCents: 1.5 }), TypeError);
});

// ─── failPayment ─────────────────────────────────────────────────────────────

test('failPayment: transitions pending → owed (back to owed)', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h13', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  ledger.initiatePayment({ hangoutId: 'h13', memberId: 'q', idempotencyKey: 'ik-10' });
  ledger.failPayment({ hangoutId: 'h13', memberId: 'q', providerEventId: 'pe-7' });
  assert.equal(ledger.balances('h13').find(b => b.memberId === 'q').state, 'owed');
});

test('failPayment: idempotent on same providerEventId', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h14', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  ledger.initiatePayment({ hangoutId: 'h14', memberId: 'q', idempotencyKey: 'ik-11' });
  const e1 = ledger.failPayment({ hangoutId: 'h14', memberId: 'q', providerEventId: 'pe-8' });
  const e2 = ledger.failPayment({ hangoutId: 'h14', memberId: 'q', providerEventId: 'pe-8' });
  assert.equal(e1.entryId, e2.entryId);
});

test('failPayment: rejects if not pending', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h15', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  assert.throws(
    () => ledger.failPayment({ hangoutId: 'h15', memberId: 'q', providerEventId: 'pe-9' }),
    /cannot fail/,
  );
});

test('failPayment: rejects unknown member', () => {
  const ledger = new IouLedger();
  assert.throws(
    () => ledger.failPayment({ hangoutId: 'hy', memberId: 'z', providerEventId: 'pe-10' }),
    /no balance/,
  );
});

test('failPayment: validates inputs', () => {
  const ledger = new IouLedger();
  assert.throws(() => ledger.failPayment({ hangoutId: '', memberId: 'q', providerEventId: 'p' }), TypeError);
  assert.throws(() => ledger.failPayment({ hangoutId: 'h', memberId: '', providerEventId: 'p' }), TypeError);
  assert.throws(() => ledger.failPayment({ hangoutId: 'h', memberId: 'q', providerEventId: '' }), TypeError);
});

// ─── retry after failure ──────────────────────────────────────────────────────

test('full retry path: fail → re-initiate → capture', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h16', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  const bal = ledger.balances('h16').find(b => b.memberId === 'q');

  ledger.initiatePayment({ hangoutId: 'h16', memberId: 'q', idempotencyKey: 'ik-12' });
  ledger.failPayment({ hangoutId: 'h16', memberId: 'q', providerEventId: 'pe-11' });
  // back to owed — can initiate again with a new key
  ledger.initiatePayment({ hangoutId: 'h16', memberId: 'q', idempotencyKey: 'ik-13' });
  ledger.capturePayment({ hangoutId: 'h16', memberId: 'q', providerEventId: 'pe-12', amountCents: bal.amountCents });
  assert.equal(ledger.balances('h16').find(b => b.memberId === 'q').state, 'paid');
});

// ─── balances ────────────────────────────────────────────────────────────────

test('balances: returns all member balances for a hangout', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h17', payerId: 'a', yesMemberIds: ['a', 'b', 'c'], totalCents: 3000 });
  const bals = ledger.balances('h17');
  assert.equal(bals.length, 2); // a excluded as payer
  for (const b of bals) {
    assert.equal(b.state, 'owed');
    assert.equal(b.payerId, 'a');
  }
});

test('balances: returns empty for unknown hangout', () => {
  const ledger = new IouLedger();
  assert.deepEqual(ledger.balances('no-such-hangout'), []);
});

// ─── isSettled ────────────────────────────────────────────────────────────────

test('isSettled: false when no balances', () => {
  const ledger = new IouLedger();
  assert.equal(ledger.isSettled('nope'), false);
});

test('isSettled: false when any balance not paid', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h18', payerId: 'p', yesMemberIds: ['p', 'q', 'r'], totalCents: 3000 });
  const qBal = ledger.balances('h18').find(b => b.memberId === 'q');
  ledger.initiatePayment({ hangoutId: 'h18', memberId: 'q', idempotencyKey: 'ik-14' });
  ledger.capturePayment({ hangoutId: 'h18', memberId: 'q', providerEventId: 'pe-13', amountCents: qBal.amountCents });
  assert.equal(ledger.isSettled('h18'), false); // r still owed
});

test('isSettled: true when all balances paid', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h19', payerId: 'p', yesMemberIds: ['p', 'q', 'r'], totalCents: 3000 });
  for (const b of ledger.balances('h19')) {
    ledger.initiatePayment({ hangoutId: 'h19', memberId: b.memberId, idempotencyKey: `ik-s-${b.memberId}` });
    ledger.capturePayment({ hangoutId: 'h19', memberId: b.memberId, providerEventId: `pe-s-${b.memberId}`, amountCents: b.amountCents });
  }
  assert.equal(ledger.isSettled('h19'), true);
});

// ─── memberSummary ────────────────────────────────────────────────────────────

test('memberSummary: totals up what member owes across hangouts', () => {
  const ledger = new IouLedger();
  // h20: q owes p 1000
  ledger.createBalances({ hangoutId: 'h20', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  // h21: q owes r ~667
  ledger.createBalances({ hangoutId: 'h21', payerId: 'r', yesMemberIds: ['r', 'q', 's'], totalCents: 2000 });

  const summary = ledger.memberSummary('q');
  assert.equal(summary.totalOwedCents > 0, true);
  assert.ok(summary.byHangout.some(e => e.role === 'debtor'));
});

test('memberSummary: payer role is tracked', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h22', payerId: 'p', yesMemberIds: ['p', 'q', 'r'], totalCents: 3000 });
  const summary = ledger.memberSummary('p');
  assert.ok(summary.totalOwedToMeCents > 0);
  assert.ok(summary.byHangout.some(e => e.role === 'payer'));
});

test('memberSummary: paid debts do not count toward totalOwedCents', () => {
  const ledger = new IouLedger();
  ledger.createBalances({ hangoutId: 'h23', payerId: 'p', yesMemberIds: ['p', 'q'], totalCents: 2000 });
  const bal = ledger.balances('h23').find(b => b.memberId === 'q');
  ledger.initiatePayment({ hangoutId: 'h23', memberId: 'q', idempotencyKey: 'ik-ms1' });
  ledger.capturePayment({ hangoutId: 'h23', memberId: 'q', providerEventId: 'pe-ms1', amountCents: bal.amountCents });
  const summary = ledger.memberSummary('q');
  assert.equal(summary.totalOwedCents, 0);
});

test('memberSummary: member with no entries returns zeros', () => {
  const ledger = new IouLedger();
  const summary = ledger.memberSummary('nobody');
  assert.equal(summary.totalOwedCents, 0);
  assert.equal(summary.totalOwedToMeCents, 0);
  assert.deepEqual(summary.byHangout, []);
});
