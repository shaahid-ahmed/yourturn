/**
 * The $15 monthly plan (US-003), over the US-002 schema and the US-001
 * contract (`SubscriptionState`, `submitSubscriptionReceipt`,
 * `restoreSubscription`, `getOwnSubscription`, and the `startHangout` plan
 * check).
 *
 * Rules:
 * - **Sandbox only.** A receipt is accepted only if it is a sandbox receipt
 *   for the Unspoken monthly product at 1500 cents USD. Anything else is
 *   `receipt_invalid` and changes nothing. No live store is called.
 * - **Plan money is separate from hangout money.** Nothing here touches the
 *   ledger, PayPal, or any pod.
 * - **Receipts are append-only; status is derived.** The newest receipt
 *   decides the status at the moment of the read. Nothing stores "active".
 * - **One plan per person** (Q-011.1 contract default). A receipt, or a
 *   store subscription (`original_transaction_ref`), already held by another
 *   account is refused, so one purchase cannot unlock several accounts. No
 *   trial state exists (Q-011.2 default).
 * - **The plan check gates the planner.** `startHangout` refuses with
 *   `subscription_required` unless the caller's plan is active or in grace.
 *   When a plan ends, pods and history stay readable; only planning stops.
 *
 * Receipt verification is a port. The default `sandboxReceiptVerifier`
 * checks an HMAC-signed sandbox receipt with a key from local configuration,
 * standing in for Apple's signed transaction or Google's purchase token until
 * a real store sandbox is wired. It never accepts a production receipt.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { inTransaction } from './db/transaction.mjs';
import { createHangout } from './db/hangout-store.mjs';
import { PodError, requireMember, readyForPlanning, newUlid } from './pods.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */

export const PLAN_PRICE_CENTS = 1500;
export const PLAN_CURRENCY = 'USD';
export const PLAN_PRODUCT_ID = 'app.unspoken.plan.monthly';
export const STORES = Object.freeze(['apple_app_store', 'google_play']);

/**
 * How long a lapsed plan keeps the planner on while the store retries
 * billing. A proposal: Apple's billing grace period is configurable at 3, 16
 * or 28 days, Google's at up to 30. Confirm with the human before launch.
 */
export const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * @typedef {object} VerifiedReceipt
 * @property {'sandbox'} environment
 * @property {'apple_app_store' | 'google_play'} store
 * @property {string} originalTransactionRef
 * @property {string} expiresAt ISO timestamp
 */

/**
 * @typedef {object} ReceiptVerifier
 * @property {(input: { store: string, receipt: string }) => VerifiedReceipt} verify
 *   returns the verified fields, or throws `receipt_invalid`
 */

/**
 * @typedef {object} SubscriptionState
 * @property {'none' | 'active' | 'in_grace' | 'expired' | 'revoked'} status
 * @property {1500} priceCents
 * @property {'USD'} currency
 * @property {'month'} period
 * @property {'apple_app_store' | 'google_play' | null} store
 * @property {'sandbox'} environment
 * @property {string | null} expiresAt
 * @property {boolean} plannerEnabled
 */

/** @param {string} message */
const invalid = (message) => new PodError('receipt_invalid', message);

/**
 * The sandbox verifier. A sandbox receipt is `<payload>.<signature>`: the
 * payload is base64url JSON, the signature is base64url HMAC-SHA256 of the
 * payload with the sandbox key. The key lives only in ignored local
 * configuration (UNSPOKEN_SANDBOX_RECEIPT_KEY), never in git.
 *
 * @param {{ key: string | Buffer }} options
 * @returns {ReceiptVerifier}
 */
export function sandboxReceiptVerifier({ key }) {
  if (!key || key.length < 16)
    throw new RangeError('the sandbox receipt key must be at least 16 bytes');
  return {
    verify({ store, receipt }) {
      if (!STORES.includes(store)) throw invalid('unknown store');
      const parts = receipt.split('.');
      if (parts.length !== 2) throw invalid('malformed receipt');
      const [payload, signature] = parts;
      const expected = createHmac('sha256', key).update(payload).digest();
      const given = Buffer.from(signature, 'base64url');
      if (given.length !== expected.length || !timingSafeEqual(given, expected))
        throw invalid('signature does not verify');
      /** @type {any} */
      let fields;
      try {
        fields = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      } catch {
        throw invalid('malformed receipt');
      }
      if (fields?.environment !== 'sandbox')
        throw invalid('not a sandbox receipt');
      if (fields.store !== store) throw invalid('receipt is for another store');
      if (fields.productId !== PLAN_PRODUCT_ID)
        throw invalid('receipt is for another product');
      if (
        fields.priceCents !== PLAN_PRICE_CENTS ||
        fields.currency !== PLAN_CURRENCY
      )
        throw invalid('receipt is not the $15 monthly plan');
      if (
        typeof fields.originalTransactionId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(fields.originalTransactionId)
      )
        throw invalid('receipt has no transaction id');
      const expires = Date.parse(fields.expiresAt);
      if (!Number.isFinite(expires)) throw invalid('receipt has no expiry');
      return {
        environment: 'sandbox',
        store: /** @type {'apple_app_store' | 'google_play'} */ (store),
        originalTransactionRef: fields.originalTransactionId,
        expiresAt: new Date(expires).toISOString(),
      };
    },
  };
}

/**
 * Build a signed sandbox receipt. For tests and the seeded demo only; a real
 * receipt comes from the phone's store.
 *
 * @param {{ key: string | Buffer, store: string, originalTransactionId: string, expiresAt: string,
 *   environment?: string, productId?: string, priceCents?: number, currency?: string }} input
 */
export function signSandboxReceipt({
  key,
  store,
  originalTransactionId,
  expiresAt,
  environment = 'sandbox',
  productId = PLAN_PRODUCT_ID,
  priceCents = PLAN_PRICE_CENTS,
  currency = PLAN_CURRENCY,
}) {
  const payload = Buffer.from(
    JSON.stringify({
      environment,
      store,
      productId,
      priceCents,
      currency,
      originalTransactionId,
      expiresAt,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', key)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Derive plan status at `at` from the newest receipt. Pure over the rows.
 *
 * @param {{ store: string, expires_at: string } | undefined} newest
 * @param {string} at
 * @returns {SubscriptionState}
 */
export function deriveState(newest, at) {
  const base = /** @type {const} */ ({
    priceCents: PLAN_PRICE_CENTS,
    currency: PLAN_CURRENCY,
    period: 'month',
    environment: 'sandbox',
  });
  if (!newest)
    return {
      ...base,
      status: 'none',
      store: null,
      expiresAt: null,
      plannerEnabled: false,
    };
  const now = Date.parse(at);
  const expires = Date.parse(newest.expires_at);
  const status =
    now < expires
      ? 'active'
      : now < expires + GRACE_MS
        ? 'in_grace'
        : 'expired';
  return {
    ...base,
    status,
    store: /** @type {'apple_app_store' | 'google_play'} */ (newest.store),
    expiresAt: newest.expires_at,
    plannerEnabled: status !== 'expired',
  };
}

/**
 * @param {DatabaseSync} db
 * @param {{ userId: string, at: string }} input
 * @returns {SubscriptionState}
 */
export function getOwnSubscription(db, { userId, at }) {
  const newest =
    /** @type {{ store: string, expires_at: string } | undefined} */ (
      db
        .prepare(
          'SELECT store, expires_at FROM subscription_receipt WHERE user_id = ? ORDER BY expires_at DESC, verified_at DESC LIMIT 1',
        )
        .get(userId)
    );
  return deriveState(newest, at);
}

/**
 * Verify a receipt and record it. Shared by submit and restore.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, store: string, receipt: string, at: string, verifier: ReceiptVerifier, newId?: () => string }} input
 * @returns {SubscriptionState}
 */
function recordReceipt(
  db,
  { userId, store, receipt, at, verifier, newId = () => newUlid() },
) {
  if (
    typeof receipt !== 'string' ||
    receipt.length < 1 ||
    receipt.length > 20000
  )
    throw new PodError(
      'validation_failed',
      'receipt must be 1–20000 characters',
      [{ field: 'receipt', problem: 'length' }],
    );
  const verified = verifier.verify({ store, receipt });
  const digest = createHash('sha256').update(receipt).digest('hex');
  inTransaction(db, () => {
    const byDigest = /** @type {{ user_id: string } | undefined} */ (
      db
        .prepare(
          'SELECT user_id FROM subscription_receipt WHERE receipt_digest = ?',
        )
        .get(digest)
    );
    if (byDigest) {
      // The same receipt twice is a retry: no new row, same answer.
      if (byDigest.user_id === userId) return;
      throw invalid('receipt belongs to another account');
    }
    const otherOwner = db
      .prepare(
        'SELECT 1 AS taken FROM subscription_receipt WHERE original_transaction_ref = ? AND user_id <> ? LIMIT 1',
      )
      .get(verified.originalTransactionRef, userId);
    if (otherOwner) throw invalid('this purchase belongs to another account');
    db.prepare(
      `INSERT INTO subscription_receipt (receipt_id, user_id, store, environment, receipt_digest,
         original_transaction_ref, price_cents, verified_at, expires_at)
       VALUES (?, ?, ?, 'sandbox', ?, ?, ?, ?, ?)`,
    ).run(
      newId(),
      userId,
      verified.store,
      digest,
      verified.originalTransactionRef,
      PLAN_PRICE_CENTS,
      at,
      verified.expiresAt,
    );
  });
  return getOwnSubscription(db, { userId, at });
}

/**
 * P3 "Start plan": verify the sandbox receipt from the store purchase.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, store: string, receipt: string, at: string, verifier: ReceiptVerifier, newId?: () => string }} input
 */
export function submitSubscriptionReceipt(db, input) {
  return recordReceipt(db, input);
}

/**
 * P3 "Restore purchase": the store hands back the latest receipt for this
 * store account. It must verify like any receipt; a purchase that belongs to
 * another Unspoken account is refused rather than moved.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, store: string, receipt: string, at: string, verifier: ReceiptVerifier, newId?: () => string }} input
 */
export function restoreSubscription(db, input) {
  return recordReceipt(db, input);
}

/**
 * The plan check. Throws `subscription_required` unless the caller's plan is
 * active or in its grace period.
 *
 * @param {DatabaseSync} db
 * @param {{ userId: string, at: string }} input
 */
export function requirePlannerEnabled(db, { userId, at }) {
  const state = getOwnSubscription(db, { userId, at });
  if (!state.plannerEnabled)
    throw new PodError(
      'subscription_required',
      state.status === 'none'
        ? 'start the $15 plan to use the planner'
        : 'your plan has ended; pods and history stay readable',
    );
  return state;
}

/**
 * `startHangout`: a member asks the planner to plan. Gated by the caller's
 * plan (US-003), then by pod size (3 joined members), then creates the
 * hangout in PLANNING.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, userId: string, at: string, newId?: () => string }} input
 * @returns {{ hangoutId: string, state: 'PLANNING' }}
 */
export function startHangout(
  db,
  { podId, userId, at, newId = () => newUlid() },
) {
  requireMember(db, podId, userId);
  requirePlannerEnabled(db, { userId, at });
  if (!readyForPlanning(db, podId))
    throw new PodError(
      'pod_too_small',
      'planning needs at least 3 joined members',
    );
  const hangoutId = newId();
  createHangout(db, { hangoutId, podId, actorUserId: userId, at });
  return { hangoutId, state: 'PLANNING' };
}
