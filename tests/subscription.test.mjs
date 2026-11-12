// US-003: the $15 plan — sandbox receipt verification, derived plan status,
// restore, and the plan check that gates the planner.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import {
  GRACE_MS,
  PLAN_PRICE_CENTS,
  sandboxReceiptVerifier,
  signSandboxReceipt,
  deriveState,
  getOwnSubscription,
  submitSubscriptionReceipt,
  restoreSubscription,
  requirePlannerEnabled,
  startHangout,
} from '../services/api/src/subscription.mjs';

const KEY = 'synthetic-sandbox-receipt-key-for-tests';
const verifier = sandboxReceiptVerifier({ key: KEY });
const AT = '2026-11-12T12:00:00.000Z';
const MONTH_LATER = '2026-12-12T12:00:00.000Z';
const STORE = 'apple_app_store';

/** @param {Partial<Parameters<typeof signSandboxReceipt>[0]>} [over] */
const receipt = (over = {}) =>
  signSandboxReceipt({
    key: KEY,
    store: STORE,
    originalTransactionId: 'otx-1',
    expiresAt: MONTH_LATER,
    ...over,
  });

function setup() {
  const db = openDatabase(':memory:');
  migrate(db);
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  for (const i of [1, 2, 3, 4])
    user.run(`u-${i}`, `Synth${i}`, `+155507000${i}`, AT);
  db.prepare(
    "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('p-a', 'Synthetic pod', 'u-1', ?)",
  ).run(AT);
  db.prepare(
    "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('p-small', 'Two people', 'u-1', ?)",
  ).run(AT);
  const member = db.prepare(
    'INSERT INTO pod_membership (pod_id, user_id, role, muted, joined_at) VALUES (?, ?, ?, 0, ?)',
  );
  for (const i of [1, 2, 3])
    member.run('p-a', `u-${i}`, i === 1 ? 'creator' : 'member', AT);
  member.run('p-small', 'u-1', 'creator', AT);
  member.run('p-small', 'u-2', 'member', AT);
  return db;
}

/** @param {import('node:sqlite').DatabaseSync} db */
const receiptCount = (db) =>
  Number(
    /** @type {{ n: number }} */ (
      db.prepare('SELECT count(*) AS n FROM subscription_receipt').get()
    ).n,
  );

/** @param {() => unknown} fn @param {string} code */
function rejectsWith(fn, code) {
  assert.throws(
    fn,
    (/** @type {any} */ e) => e.code === code,
    `expected ${code}`,
  );
}

test('no receipt: no plan, and the planner is off', () => {
  const db = setup();
  assert.deepEqual(getOwnSubscription(db, { userId: 'u-1', at: AT }), {
    status: 'none',
    priceCents: 1500,
    currency: 'USD',
    period: 'month',
    store: null,
    environment: 'sandbox',
    expiresAt: null,
    plannerEnabled: false,
  });
});

test('a valid sandbox receipt starts the $15 plan', () => {
  const db = setup();
  const state = submitSubscriptionReceipt(db, {
    userId: 'u-1',
    store: STORE,
    receipt: receipt(),
    at: AT,
    verifier,
  });
  assert.equal(state.status, 'active');
  assert.equal(state.plannerEnabled, true);
  assert.equal(state.store, STORE);
  assert.equal(state.expiresAt, MONTH_LATER);
  assert.equal(state.priceCents, PLAN_PRICE_CENTS);
  // Plan money never touches hangout money.
  const ledger = /** @type {{ n: number }} */ (
    db.prepare('SELECT count(*) AS n FROM ledger_entry').get()
  );
  assert.equal(Number(ledger.n), 0);
});

test('status is derived at read time: active, then grace, then expired', () => {
  const newest = { store: STORE, expires_at: MONTH_LATER };
  const expires = Date.parse(MONTH_LATER);
  const iso = (/** @type {number} */ ms) => new Date(ms).toISOString();
  assert.equal(deriveState(newest, iso(expires - 1)).status, 'active');
  const grace = deriveState(newest, iso(expires));
  assert.equal(grace.status, 'in_grace');
  assert.equal(grace.plannerEnabled, true);
  const ended = deriveState(newest, iso(expires + GRACE_MS));
  assert.equal(ended.status, 'expired');
  assert.equal(ended.plannerEnabled, false);
});

test('anything but a sandbox receipt for the $15 monthly plan is refused and changes nothing', () => {
  const db = setup();
  const cases = [
    receipt({ environment: 'production' }),
    receipt({ productId: 'app.unspoken.plan.yearly' }),
    receipt({ priceCents: 999 }),
    receipt({ currency: 'EUR' }),
    receipt({ store: 'google_play' }), // submitted as apple_app_store below
    receipt({ originalTransactionId: '' }),
    receipt({ expiresAt: 'not-a-date' }),
    signSandboxReceipt({
      key: 'a-different-key-that-is-long-enough',
      store: STORE,
      originalTransactionId: 'otx-1',
      expiresAt: MONTH_LATER,
    }),
    'not-a-receipt',
    `${receipt().split('.')[0]}.AAAA`,
    `${Buffer.from('{bad json').toString('base64url')}.x`,
  ];
  for (const bad of cases)
    rejectsWith(
      () =>
        submitSubscriptionReceipt(db, {
          userId: 'u-1',
          store: STORE,
          receipt: bad,
          at: AT,
          verifier,
        }),
      'receipt_invalid',
    );
  rejectsWith(
    () =>
      submitSubscriptionReceipt(db, {
        userId: 'u-1',
        store: 'amazon',
        receipt: receipt(),
        at: AT,
        verifier,
      }),
    'receipt_invalid',
  );
  rejectsWith(
    () =>
      submitSubscriptionReceipt(db, {
        userId: 'u-1',
        store: STORE,
        receipt: '',
        at: AT,
        verifier,
      }),
    'validation_failed',
  );
  assert.equal(receiptCount(db), 0);
  assert.equal(
    getOwnSubscription(db, { userId: 'u-1', at: AT }).status,
    'none',
  );
});

test('the same receipt twice is a retry: one row, the same answer', () => {
  const db = setup();
  const input = {
    userId: 'u-1',
    store: STORE,
    receipt: receipt(),
    at: AT,
    verifier,
  };
  const first = submitSubscriptionReceipt(db, input);
  const second = submitSubscriptionReceipt(db, input);
  assert.deepEqual(second, first);
  assert.equal(receiptCount(db), 1);
});

test('one purchase cannot unlock two accounts', () => {
  const db = setup();
  submitSubscriptionReceipt(db, {
    userId: 'u-1',
    store: STORE,
    receipt: receipt(),
    at: AT,
    verifier,
  });
  // The same receipt string from another account.
  rejectsWith(
    () =>
      submitSubscriptionReceipt(db, {
        userId: 'u-2',
        store: STORE,
        receipt: receipt(),
        at: AT,
        verifier,
      }),
    'receipt_invalid',
  );
  // A renewal of the same store subscription, restored into another account.
  rejectsWith(
    () =>
      restoreSubscription(db, {
        userId: 'u-2',
        store: STORE,
        receipt: receipt({ expiresAt: '2027-01-12T12:00:00.000Z' }),
        at: AT,
        verifier,
      }),
    'receipt_invalid',
  );
  assert.equal(receiptCount(db), 1);
  assert.equal(
    getOwnSubscription(db, { userId: 'u-2', at: AT }).status,
    'none',
  );
});

test('restore on a new device brings the plan back; a renewal extends it', () => {
  const db = setup();
  submitSubscriptionReceipt(db, {
    userId: 'u-1',
    store: STORE,
    receipt: receipt(),
    at: AT,
    verifier,
  });
  const renewed = '2027-01-12T12:00:00.000Z';
  const later = '2026-12-20T12:00:00.000Z';
  const state = restoreSubscription(db, {
    userId: 'u-1',
    store: STORE,
    receipt: receipt({ expiresAt: renewed }),
    at: later,
    verifier,
  });
  assert.equal(state.status, 'active');
  assert.equal(state.expiresAt, renewed);
  assert.equal(receiptCount(db), 2);
});

test('restore with only a lapsed purchase reports it ended, without unlocking the planner', () => {
  const db = setup();
  const state = restoreSubscription(db, {
    userId: 'u-1',
    store: STORE,
    receipt: receipt({ expiresAt: '2026-10-01T00:00:00.000Z' }),
    at: AT,
    verifier,
  });
  assert.equal(state.status, 'expired');
  assert.equal(state.plannerEnabled, false);
});

test('the plan check gates the planner: no plan, no hangout', () => {
  const db = setup();
  let n = 0;
  const newId = () => `h-${++n}`;
  rejectsWith(
    () => startHangout(db, { podId: 'p-a', userId: 'u-1', at: AT, newId }),
    'subscription_required',
  );
  const hangouts = () =>
    Number(
      /** @type {{ n: number }} */ (
        db.prepare('SELECT count(*) AS n FROM hangout').get()
      ).n,
    );
  assert.equal(hangouts(), 0);

  submitSubscriptionReceipt(db, {
    userId: 'u-1',
    store: STORE,
    receipt: receipt(),
    at: AT,
    verifier,
  });
  assert.deepEqual(
    startHangout(db, { podId: 'p-a', userId: 'u-1', at: AT, newId }),
    { hangoutId: 'h-1', state: 'PLANNING' },
  );
  assert.equal(hangouts(), 1);

  // Each member holds their own plan (Q-011.1 default): u-2 has none.
  rejectsWith(
    () => startHangout(db, { podId: 'p-a', userId: 'u-2', at: AT, newId }),
    'subscription_required',
  );
  // A non-member learns nothing, plan or not.
  rejectsWith(
    () => startHangout(db, { podId: 'p-a', userId: 'u-4', at: AT, newId }),
    'not_found',
  );
  // Planning needs three joined members.
  rejectsWith(
    () => startHangout(db, { podId: 'p-small', userId: 'u-1', at: AT, newId }),
    'pod_too_small',
  );
  // After the plan and its grace end, planning stops.
  const ended = new Date(Date.parse(MONTH_LATER) + GRACE_MS).toISOString();
  rejectsWith(
    () => requirePlannerEnabled(db, { userId: 'u-1', at: ended }),
    'subscription_required',
  );
  assert.equal(hangouts(), 1);
});

test('the sandbox verifier refuses a short key', () => {
  assert.throws(() => sandboxReceiptVerifier({ key: 'short' }), RangeError);
});
