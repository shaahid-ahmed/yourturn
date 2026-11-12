/**
 * Sandbox member-to-member settlement (US-006, ADR 0009).
 *
 * Augments the ledger, never edits it: initiating a payout appends
 * `payment_initiated`; a verified readback appends `payment_captured`. The
 * `owed` balance rows are never touched — balances are sums, and a failure
 * anywhere leaves them exactly as they were.
 *
 * Boundary rules:
 * - The gate decides. `gate.assertOpen` runs first; while closed nothing is
 *   created, called, or recorded (the HTTP route stays 409).
 * - `PENDING` is reported, never recorded as success. Only an explicit
 *   SUCCESS readback appends `payment_captured`, exactly once.
 * - Idempotency binds actor + key + target + body: a replay returns the
 *   original payment; any reuse with a different target or amount conflicts.
 * - The provider sees only an opaque sender_item_id (HMAC of the bound key)
 *   and the recipient email. Member ids, hangout ids and balances never leave.
 */
import { createHash } from 'node:crypto';
import { newUlid } from '../pods.mjs';
import { inTransaction } from '../db/transaction.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} idempotencyKey
 * @param {string} hangoutId
 * @param {string} debtorUserId
 */
function senderItemId(idempotencyKey, hangoutId, debtorUserId) {
  return createHash('sha256')
    .update(
      `unspoken-settlement:${idempotencyKey}:${hangoutId}:${debtorUserId}`,
      'utf8',
    )
    .digest('hex');
}

/**
 * Initiate a sandbox payout for one owed balance. Records `payment_initiated`;
 * success is only ever established later by `checkPayout`.
 *
 * @param {any} db
 * @param {{ balanceId: string, debtorUserId: string, recipientEmail: string, idempotencyKey: string, provider: { createPayout: Function }, gate: { assertOpen: Function }, at: string }} input
 */
export async function settleBalance(
  db,
  {
    balanceId,
    debtorUserId,
    recipientEmail,
    idempotencyKey,
    provider,
    gate,
    at,
  },
) {
  gate.assertOpen({ action: 'initiate settlement payout' });
  if (!EMAIL_RE.test(recipientEmail ?? ''))
    throw new RangeError('recipientEmail must be an email address');
  if (!idempotencyKey || idempotencyKey.length < 8)
    throw new RangeError(
      'an idempotency key of at least 8 characters is required',
    );
  return (async () => {
    const entry = /** @type {any} */ (
      db
        .prepare(
          `SELECT hangout_id, debtor_user_id, creditor_user_id, kind, amount_cents FROM ledger_entry WHERE entry_id = ?`,
        )
        .get(balanceId)
    );
    if (!entry || entry.kind !== 'balance_created')
      throw new RangeError('no such owed balance');
    if (String(entry.debtor_user_id) !== debtorUserId)
      throw new RangeError('only the debtor may settle their own balance');
    const hangoutId = String(entry.hangout_id);
    const creditorUserId = String(entry.creditor_user_id);
    const amountCents = Number(entry.amount_cents);
    const prior = /** @type {any} */ (
      db
        .prepare(
          'SELECT payment_id, hangout_id, amount_cents FROM settlement_payment WHERE debtor_user_id = ? AND idempotency_key = ?',
        )
        .get(debtorUserId, idempotencyKey)
    );
    if (prior) {
      if (
        String(prior.hangout_id) !== hangoutId ||
        Number(prior.amount_cents) !== amountCents
      )
        throw new RangeError(
          'idempotency key was used for a different settlement',
        );
      return {
        paymentId: String(prior.payment_id),
        status: 'initiated',
        replay: true,
      };
    }
    // Network call outside the transaction (inTransaction is sync): a throw
    // means nothing was recorded, so the balance stays exactly as owed.
    // Crash-after-send is recoverable: the batch is listable by sender id.
    const itemId = senderItemId(idempotencyKey, hangoutId, debtorUserId);
    const payout = await provider.createPayout({
      senderBatchId: `unspoken-${itemId.slice(0, 32)}`,
      items: [
        { senderItemId: itemId, recipientEmail, amountCents, currency: 'USD' },
      ],
    });
    const paymentId = newUlid(Date.parse(at));
    try {
      inTransaction(db, () => {
        db.prepare(
          `INSERT INTO settlement_payment (payment_id, hangout_id, debtor_user_id, creditor_user_id, amount_cents, environment, provider_order_ref, idempotency_key, created_at)
           VALUES (?, ?, ?, ?, ?, 'sandbox', ?, ?, ?)`,
        ).run(
          paymentId,
          hangoutId,
          debtorUserId,
          creditorUserId,
          amountCents,
          payout.batchId,
          idempotencyKey,
          at,
        );
        const seq = /** @type {{ n: number | null } | undefined} */ (
          db.prepare('SELECT max(seq) AS n FROM ledger_entry').get()
        );
        db.prepare(
          `INSERT INTO ledger_entry (entry_id, seq, hangout_id, debtor_user_id, creditor_user_id, kind, amount_cents, payment_id, provider_event_id, synthetic, created_at)
           VALUES (?, ?, ?, ?, ?, 'payment_initiated', ?, ?, NULL, 0, ?)`,
        ).run(
          newUlid(Date.parse(at)),
          Number(seq?.n ?? 0) + 1,
          hangoutId,
          debtorUserId,
          creditorUserId,
          amountCents,
          paymentId,
          at,
        );
      });
    } catch (error) {
      // Lost race on the idempotency key: return the winner's payment.
      const winner = /** @type {any} */ (
        db
          .prepare(
            'SELECT payment_id FROM settlement_payment WHERE debtor_user_id = ? AND idempotency_key = ?',
          )
          .get(debtorUserId, idempotencyKey)
      );
      if (
        winner &&
        /UNIQUE|unique|constraint/i.test(
          String(/** @type {any} */ (error).message),
        )
      ) {
        return {
          paymentId: String(winner.payment_id),
          status: 'initiated',
          replay: true,
        };
      }
      throw error;
    }
    return { paymentId, status: 'initiated', batchId: payout.batchId };
  })();
}

/**
 * Read back one initiated payment. SUCCESS appends `payment_captured` once;
 * anything else is reported without recording.
 *
 * @param {any} db
 * @param {{ paymentId: string, provider: { getPayoutBatch: Function } }} input
 */
export async function checkPayout(db, { paymentId, provider }) {
  const payment = /** @type {any} */ (
    db
      .prepare(
        'SELECT hangout_id, debtor_user_id, creditor_user_id, amount_cents, provider_order_ref FROM settlement_payment WHERE payment_id = ?',
      )
      .get(paymentId)
  );
  if (!payment) throw new RangeError('no such settlement payment');
  const batch = await provider.getPayoutBatch(
    String(payment.provider_order_ref),
  );
  const item = (batch.items ?? []).find(
    (/** @type {any} */ i) =>
      i.status !== 'PENDING' && i.status !== 'UNCLAIMED',
  );
  if (!item || item.status !== 'SUCCESS') {
    const pending = (batch.items ?? []).some(
      (/** @type {any} */ i) =>
        i.status === 'PENDING' || i.status === 'UNCLAIMED',
    );
    return { status: pending ? 'PENDING' : 'FAILED' };
  }
  return inTransaction(db, () => {
    const done = /** @type {any} */ (
      db
        .prepare(
          "SELECT 1 AS x FROM ledger_entry WHERE payment_id = ? AND kind = 'payment_captured'",
        )
        .get(paymentId)
    );
    if (!done) {
      const seq = /** @type {{ n: number | null } | undefined} */ (
        db.prepare('SELECT max(seq) AS n FROM ledger_entry').get()
      );
      db.prepare(
        `INSERT INTO ledger_entry (entry_id, seq, hangout_id, debtor_user_id, creditor_user_id, kind, amount_cents, payment_id, provider_event_id, synthetic, created_at)
         VALUES (?, ?, ?, ?, ?, 'payment_captured', ?, ?, NULL, 1, ?)`,
      ).run(
        `${paymentId}-captured`,
        Number(seq?.n ?? 0) + 1,
        String(payment.hangout_id),
        String(payment.debtor_user_id),
        String(payment.creditor_user_id),
        Number(payment.amount_cents),
        paymentId,
        new Date().toISOString(),
      );
    }
    return { status: 'SUCCESS' };
  });
}
