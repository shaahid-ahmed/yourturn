/**
 * Private stretch asks (wave 10). Sent only to the one member whose budget
 * the option exceeds; the group never sees the ask or the answer. An
 * unanswered ask expires lazily at the deadline — reads and answers past the
 * deadline observe `expired` and refuse the answer.
 */
import { PodError, newUlid } from './pods.mjs';
import { inTransaction } from './db/transaction.mjs';

/**
 * @param {any} db
 * @param {string} stretchAskId
 */
function readAsk(db, stretchAskId) {
  const row = /** @type {any} */ (
    db
      .prepare('SELECT * FROM stretch_ask WHERE stretch_ask_id = ?')
      .get(stretchAskId)
  );
  if (!row) throw new PodError('not_found', 'no such stretch ask');
  return row;
}

/**
 * Mark a pending ask expired when its deadline has passed. No pod-visible
 * side effect: expiry is silent by contract.
 *
 * @param {any} db
 * @param {any} row
 * @param {string} at
 */
function expireIfDue(db, row, at) {
  if (row.status === 'pending' && row.deadline <= at) {
    db.prepare(
      "UPDATE stretch_ask SET status = 'expired' WHERE stretch_ask_id = ? AND status = 'pending'",
    ).run(row.stretch_ask_id);
    row.status = 'expired';
  }
  return row;
}

/**
 * @param {any} db
 * @param {any} row
 */
function askView(db, row) {
  const pod = /** @type {{ name: string } | undefined} */ (
    db
      .prepare(
        `SELECT p.name FROM pod p JOIN hangout h ON h.pod_id = p.pod_id WHERE h.hangout_id = ?`,
      )
      .get(row.hangout_id)
  );
  return {
    stretchAskId: String(row.stretch_ask_id),
    hangoutId: String(row.hangout_id),
    podName: pod ? String(pod.name) : '',
    optionTitle: String(row.option_title),
    perPersonCostCents: Number(row.per_person_cost_cents),
    deadline: String(row.deadline),
    status: row.status,
    appliesToThisHangoutOnly: true,
  };
}

/**
 * The planner's internal entrypoint (and the tests'): file an ask for one
 * member. There is no member-facing create route.
 *
 * @param {any} db
 * @param {{ hangoutId: string, userId: string, optionTitle: string, perPersonCostCents: number, deadline: string, at: string }} input
 */
export function createStretchAsk(
  db,
  { hangoutId, userId, optionTitle, perPersonCostCents, deadline, at },
) {
  return inTransaction(db, () => {
    const hangout = /** @type {{ pod_id: string } | undefined} */ (
      db
        .prepare('SELECT pod_id FROM hangout WHERE hangout_id = ?')
        .get(hangoutId)
    );
    if (!hangout) throw new PodError('not_found', 'hangout not found');
    const member = db
      .prepare(
        'SELECT 1 AS ok FROM pod_membership WHERE pod_id = ? AND user_id = ? AND left_at IS NULL',
      )
      .get(hangout.pod_id, userId);
    if (!member) throw new PodError('not_found', 'no such member');
    if (!Number.isSafeInteger(perPersonCostCents) || perPersonCostCents < 0)
      throw new PodError(
        'validation_failed',
        'per-person cost must be whole cents',
        [{ field: 'perPersonCostCents', problem: 'integer' }],
      );
    const stretchAskId = newUlid(Date.parse(at));
    db.prepare(
      `INSERT INTO stretch_ask (stretch_ask_id, hangout_id, user_id, option_title, per_person_cost_cents, deadline, status, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL)`,
    ).run(
      stretchAskId,
      hangoutId,
      userId,
      optionTitle,
      perPersonCostCents,
      deadline,
    );
    return stretchAskId;
  });
}

/**
 * Owner-only read. Anyone else gets not_found so the ask stays invisible.
 *
 * @param {any} db
 * @param {{ stretchAskId: string, userId: string, at?: string }} input
 */
export function getOwnStretchAsk(db, { stretchAskId, userId, at }) {
  const now = at ?? new Date().toISOString();
  return inTransaction(db, () => {
    const row = readAsk(db, stretchAskId);
    if (String(row.user_id) !== userId)
      throw new PodError('not_found', 'no such stretch ask');
    return askView(db, expireIfDue(db, row, now));
  });
}

/**
 * Accept or decline a pending ask. Closed asks refuse with 409.
 *
 * @param {any} db
 * @param {{ stretchAskId: string, userId: string, accept: boolean, at?: string }} input
 */
export function answerOwnStretchAsk(db, { stretchAskId, userId, accept, at }) {
  const now = at ?? new Date().toISOString();
  return inTransaction(db, () => {
    const row = readAsk(db, stretchAskId);
    if (String(row.user_id) !== userId)
      throw new PodError('not_found', 'no such stretch ask');
    expireIfDue(db, row, now);
    if (row.status !== 'pending')
      throw new PodError('stretch_ask_closed', 'this ask is already closed');
    const status = accept ? 'accepted' : 'declined';
    db.prepare(
      'UPDATE stretch_ask SET status = ?, answered_at = ? WHERE stretch_ask_id = ?',
    ).run(status, now, stretchAskId);
    row.status = status;
    return askView(db, row);
  });
}
