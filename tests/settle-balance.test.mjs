// US-006: sandbox settlement against ledger balances. Fake payout client;
// the gate stays closed in production until a human opens it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { PaymentGate } from '../services/api/src/payments/gate.mjs';
import {
  settleBalance,
  checkPayout,
} from '../services/api/src/payments/settle-balance.mjs';

const U1 = '01J00000000000000000000001';
const U2 = '01J00000000000000000000002';
const POD = '01J00000000000000000000010';
const HANGOUT = '01J00000000000000000000011';
const T0 = '2026-11-12T12:00:00.000Z';

/** Ledger with one owed balance: U2 owes U1 3500 for HANGOUT. Returns { db, entryId }. */
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
  db.prepare(
    "INSERT INTO hangout (hangout_id, pod_id, state, version, created_at, updated_at) VALUES (?, ?, 'BALANCES_OPEN', 1, ?, ?)",
  ).run(HANGOUT, POD, T0, T0);
  db.prepare(
    `INSERT INTO ledger_entry (entry_id, seq, hangout_id, debtor_user_id, creditor_user_id, kind, amount_cents, payment_id, provider_event_id, synthetic, created_at)
     VALUES ('01J00000000000000000000021', 1, ?, ?, ?, 'balance_created', 3500, NULL, NULL, 0, ?)`,
  ).run(HANGOUT, U2, U1, T0);
  return db;
}

/** @param {{ failCreate?: boolean, batchStatus?: string, itemStatus?: string }} [options] */
function fakePayouts(options = {}) {
  /** @type {any[]} */
  const calls = [];
  return {
    calls,
    async createPayout(/** @type {any} */ input) {
      calls.push(input);
      if (options.failCreate) {
        const err = new Error('paypal create failed: 400');
        err.name = 'PayPalError';
        throw err;
      }
      return { batchId: 'B-1', status: options.batchStatus ?? 'PENDING' };
    },
    async getPayoutBatch() {
      return {
        batchId: 'B-1',
        status: options.batchStatus ?? 'PENDING',
        items: [
          {
            payoutItemId: 'I-1',
            senderItemId: 'k',
            status: options.itemStatus ?? 'PENDING',
          },
        ],
      };
    },
  };
}

const openGate = () =>
  new PaymentGate({
    open: true,
    blockingQuestions: [],
    humanApprovalRecorded: true,
    approvalReference: 'human:2026-11-12',
  });

test('closed gate refuses before touching anything', async () => {
  const db = setup();
  const gate = new PaymentGate({});
  await assert.rejects(
    settleBalance(db, {
      balanceId: '01J00000000000000000000021',
      debtorUserId: U2,
      recipientEmail: 'sam@example.com',
      idempotencyKey: 'key-0001',
      provider: fakePayouts(),
      gate,
      at: T0,
    }),
    /payment gate is closed/,
  );
});

test('settle initiates once, replays on the same key, fails clean on provider error', async () => {
  const db = setup();
  const provider = fakePayouts();
  const first = await settleBalance(db, {
    balanceId: '01J00000000000000000000021',
    debtorUserId: U2,
    recipientEmail: 'sam@example.com',
    idempotencyKey: 'key-0001',
    provider,
    gate: openGate(),
    at: T0,
  });
  assert.equal(first.status, 'initiated');
  assert.equal(provider.calls.length, 1);
  assert.ok(!provider.calls[0].items[0].senderItemId.includes(U2));
  assert.ok(!provider.calls[0].items[0].senderItemId.includes(HANGOUT));

  const replay = await settleBalance(db, {
    balanceId: '01J00000000000000000000021',
    debtorUserId: U2,
    recipientEmail: 'sam@example.com',
    idempotencyKey: 'key-0001',
    provider,
    gate: openGate(),
    at: T0,
  });
  assert.equal(replay.paymentId, first.paymentId);
  assert.equal(provider.calls.length, 1);

  const other = fakePayouts({ failCreate: true });
  await assert.rejects(
    settleBalance(db, {
      balanceId: '01J00000000000000000000021',
      debtorUserId: U2,
      recipientEmail: 'sam@example.com',
      idempotencyKey: 'key-0002',
      provider: other,
      gate: openGate(),
      at: T0,
    }),
    /paypal create failed/,
  );
  const rows = /** @type {{ n: number } | undefined} */ (
    db
      .prepare(
        'SELECT COUNT(*) AS n FROM settlement_payment WHERE idempotency_key = ?',
      )
      .get('key-0002')
  );
  assert.equal(rows?.n, 0);
});

test('a stranger cannot settle someone elses balance', async () => {
  const db = setup();
  await assert.rejects(
    settleBalance(db, {
      balanceId: '01J00000000000000000000021',
      debtorUserId: U1,
      recipientEmail: 'x@example.com',
      idempotencyKey: 'key-0009',
      provider: fakePayouts(),
      gate: openGate(),
      at: T0,
    }),
    /only the debtor/,
  );
});

test('readback: PENDING is reported, never recorded as success', async () => {
  const db = setup();
  const provider = fakePayouts({ itemStatus: 'PENDING' });
  const { paymentId } = await settleBalance(db, {
    balanceId: '01J00000000000000000000021',
    debtorUserId: U2,
    recipientEmail: 'sam@example.com',
    idempotencyKey: 'key-0003',
    provider,
    gate: openGate(),
    at: T0,
  });
  const pending = await checkPayout(db, { paymentId, provider });
  assert.equal(pending.status, 'PENDING');
  const captured = /** @type {{ n: number } | undefined} */ (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM ledger_entry WHERE kind = 'payment_captured'",
      )
      .get()
  )?.n;
  assert.equal(captured, 0);
});

test('readback: SUCCESS marks the payment captured exactly once', async () => {
  const db = setup();
  const provider = fakePayouts({ itemStatus: 'SUCCESS' });
  const { paymentId } = await settleBalance(db, {
    balanceId: '01J00000000000000000000021',
    debtorUserId: U2,
    recipientEmail: 'sam@example.com',
    idempotencyKey: 'key-0004',
    provider,
    gate: openGate(),
    at: T0,
  });
  const done = await checkPayout(db, { paymentId, provider });
  assert.equal(done.status, 'SUCCESS');
  const again = await checkPayout(db, { paymentId, provider });
  assert.equal(again.status, 'SUCCESS');
  const captured = /** @type {{ n: number } | undefined} */ (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM ledger_entry WHERE kind = 'payment_captured'",
      )
      .get()
  )?.n;
  assert.equal(captured, 1);
});
