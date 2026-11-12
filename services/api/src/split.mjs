/**
 * Draft and confirmed splits (wave 9). The draft is derived — payer, yes
 * members and the booking estimate — and the confirm writes the split row
 * plus one `balance_created` ledger entry per debtor, then moves the hangout
 * BOOKED → BALANCES_OPEN. Per ADR 0008 the app never moves money; these rows
 * are IOUs between friends.
 */
import { PodError, requireMember, newUlid } from './pods.mjs';
import { applyHangoutEventInTransaction } from './db/hangout-store.mjs';
import { inTransaction } from './db/transaction.mjs';
import { splitShares } from './money.mjs';

const CURRENCY = 'USD';

/**
 * @param {any} db
 * @param {string} hangoutId
 */
function readHangout(db, hangoutId) {
  const row = db
    .prepare('SELECT * FROM hangout WHERE hangout_id = ?')
    .get(hangoutId);
  if (!row) throw new PodError('not_found', 'hangout not found');
  return /** @type {{ pod_id: string, state: string, version: number, payer_user_id: string | null }} */ (
    row
  );
}

/**
 * @param {any} db
 * @param {string} hangoutId
 * @returns {string[]}
 */
function yesMembers(db, hangoutId) {
  return db
    .prepare(
      `SELECT r.user_id FROM ready_answer r
         JOIN hangout h ON h.hangout_id = r.hangout_id
         JOIN pod_membership m ON m.pod_id = h.pod_id AND m.user_id = r.user_id AND m.left_at IS NULL
        WHERE r.hangout_id = ? AND r.answer = 'yes' ORDER BY r.user_id`,
    )
    .all(hangoutId)
    .map((/** @type {{ user_id: unknown }} */ r) => String(r.user_id));
}

/**
 * @param {any} db
 * @param {string} hangoutId
 */
function draftTotal(db, hangoutId) {
  const booking = db
    .prepare('SELECT estimated_total_cents FROM booking WHERE hangout_id = ?')
    .get(hangoutId);
  if (!booking)
    throw new PodError('wrong_hangout_state', 'nothing is booked yet');
  return Number(booking.estimated_total_cents);
}

/**
 * @param {any} db
 * @param {string} hangoutId
 * @param {string[]} yesIds
 * @param {number} totalCents
 */
function shareViews(db, hangoutId, yesIds, totalCents) {
  const names = new Map(
    db
      .prepare(
        `SELECT user_id, first_name FROM app_user WHERE user_id IN (${yesIds.map(() => '?').join(', ')})`,
      )
      .all(...yesIds)
      .map((/** @type {{ user_id: unknown, first_name: unknown }} */ r) => [
        String(r.user_id),
        String(r.first_name),
      ]),
  );
  return splitShares(totalCents, yesIds, hangoutId).map((s) => ({
    user: { userId: s.memberId, firstName: names.get(s.memberId) ?? '?' },
    shareCents: s.shareCents,
  }));
}

/**
 * The contract Split shape: draft derived from the booking, confirmed read
 * back from the split row. Visible to every pod member.
 *
 * @param {any} db
 * @param {{ podId: string, hangoutId: string, userId: string }} input
 */
export function getSplit(db, { podId, hangoutId, userId }) {
  requireMember(db, podId, userId);
  const hangout = readHangout(db, hangoutId);
  if (hangout.pod_id !== podId)
    throw new PodError('not_found', 'no such hangout in this pod');
  const yesIds = yesMembers(db, hangoutId);
  const stored = db
    .prepare('SELECT * FROM split WHERE hangout_id = ?')
    .get(hangoutId);
  const actual = db
    .prepare(
      'SELECT actual_total_cents FROM split_actual_total WHERE hangout_id = ? ORDER BY seq DESC LIMIT 1',
    )
    .get(hangoutId);
  const confirmed = Boolean(stored);
  const totalCents = confirmed
    ? Number(actual?.actual_total_cents ?? stored.estimate_cents)
    : draftTotal(db, hangoutId);
  const payer = db
    .prepare('SELECT first_name FROM app_user WHERE user_id = ?')
    .get(confirmed ? stored.payer_user_id : hangout.payer_user_id);
  const payerId = String(
    confirmed ? stored.payer_user_id : hangout.payer_user_id,
  );
  if (!payer) throw new PodError('wrong_hangout_state', 'no payer yet');
  return {
    hangoutId,
    payer: { userId: payerId, firstName: String(payer.first_name) },
    status: confirmed ? 'confirmed' : 'draft',
    basis: actual ? 'actual' : 'estimate',
    totalCents,
    currency: CURRENCY,
    splitType: 'equal',
    yesMemberCount: yesIds.length,
    shares: shareViews(db, hangoutId, yesIds, totalCents),
  };
}

/**
 * Payer-only. The total must match the draft; the second confirm is refused.
 *
 * @param {any} db
 * @param {{ podId: string, hangoutId: string, userId: string, totalCents: number, at: string }} input
 */
export function confirmSplit(db, { podId, hangoutId, userId, totalCents, at }) {
  requireMember(db, podId, userId);
  return inTransaction(db, () => {
    const hangout = readHangout(db, hangoutId);
    if (hangout.pod_id !== podId)
      throw new PodError('not_found', 'no such hangout in this pod');
    if (
      db.prepare('SELECT 1 AS x FROM split WHERE hangout_id = ?').get(hangoutId)
    )
      throw new PodError(
        'split_already_confirmed',
        'the split is already confirmed',
      );
    if (hangout.state !== 'BOOKED')
      throw new PodError(
        'wrong_hangout_state',
        'the booking is not booked yet',
      );
    if (hangout.payer_user_id !== userId)
      throw new PodError('not_payer', 'only the payer may confirm the split');
    const draft = draftTotal(db, hangoutId);
    if (!Number.isSafeInteger(totalCents) || totalCents !== draft)
      throw new PodError(
        'validation_failed',
        'totalCents must match the draft split',
        [{ field: 'totalCents', problem: 'mismatch' }],
      );
    const allYes = yesMembers(db, hangoutId);
    const yesIds = allYes.filter((id) => id !== userId);
    const next = applyHangoutEventInTransaction(db, {
      hangoutId,
      event: 'splitConfirmed',
      expectedVersion: hangout.version,
      actorUserId: userId,
      at,
      guards: { actorIsPayer: true },
    });
    void next;
    db.prepare(
      'INSERT INTO split (hangout_id, payer_user_id, estimate_cents, confirmed_at) VALUES (?, ?, ?, ?)',
    ).run(hangoutId, userId, draft, at);
    const seqRow = /** @type {{ n: number | null } | undefined} */ (
      db.prepare('SELECT max(seq) AS n FROM ledger_entry').get()
    );
    let seq = Number(seqRow?.n ?? 0);
    const insert = db.prepare(
      `INSERT INTO ledger_entry (entry_id, seq, hangout_id, debtor_user_id, creditor_user_id, kind, amount_cents, payment_id, provider_event_id, synthetic, created_at)
       VALUES (?, ?, ?, ?, ?, 'balance_created', ?, NULL, NULL, 0, ?)`,
    );
    for (const debtor of yesIds) {
      const share = splitShares(draft, allYes, hangoutId).find(
        (s) => s.memberId === debtor,
      );
      seq += 1;
      insert.run(
        newUlid(Date.parse(at)),
        seq,
        hangoutId,
        debtor,
        userId,
        share?.shareCents ?? 0,
        at,
      );
    }
    return getSplitOut(db, podId, hangoutId);
  });
}

/**
 * @param {any} db
 * @param {string} podId
 * @param {string} hangoutId
 */
function getSplitOut(db, podId, hangoutId) {
  const hangout = readHangout(db, hangoutId);
  const yesIds = yesMembers(db, hangoutId);
  const stored =
    /** @type {{ payer_user_id: string, estimate_cents: number }} */ (
      db.prepare('SELECT * FROM split WHERE hangout_id = ?').get(hangoutId)
    );
  const payer = /** @type {{ first_name: string }} */ (
    db
      .prepare('SELECT first_name FROM app_user WHERE user_id = ?')
      .get(stored.payer_user_id)
  );
  return {
    hangoutId,
    payer: { userId: stored.payer_user_id, firstName: payer.first_name },
    status: 'confirmed',
    basis: 'estimate',
    totalCents: Number(stored.estimate_cents),
    currency: CURRENCY,
    splitType: 'equal',
    yesMemberCount: yesIds.length,
    shares: shareViews(db, hangoutId, yesIds, Number(stored.estimate_cents)),
  };
}
