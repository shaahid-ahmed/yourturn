/**
 * Durable hangout transitions (US-002).
 *
 * Applying an event is one transaction: read the hangout, check the expected
 * version, compute the next state with the lifecycle table, update the row and
 * append a `hangout_transition`. A stale version is a conflict, so two members
 * confirming at once cannot both win, and a failure changes nothing.
 */
import { transition } from '../hangout-lifecycle.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */
/** @typedef {import('../hangout-lifecycle.mjs').Guards} Guards */

export class StaleHangoutError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'StaleHangoutError';
    this.code = 'wrong_hangout_state';
  }
}

/**
 * Create a hangout in PLANNING and record its first transition.
 *
 * @param {DatabaseSync} db
 * @param {{ hangoutId: string, podId: string, actorUserId: string | null, at: string }} input
 */
export function createHangout(db, { hangoutId, podId, actorUserId, at }) {
  inTransaction(db, () => {
    db.prepare(
      "INSERT INTO hangout (hangout_id, pod_id, state, version, created_at, updated_at) VALUES (?, ?, 'PLANNING', 1, ?, ?)",
    ).run(hangoutId, podId, at, at);
    db.prepare(
      "INSERT INTO hangout_transition (hangout_id, seq, from_state, to_state, event, actor_user_id, at) VALUES (?, 1, NULL, 'PLANNING', 'started', ?, ?)",
    ).run(hangoutId, actorUserId, at);
  });
}

/**
 * @param {DatabaseSync} db
 * @param {{
 *   hangoutId: string,
 *   event: string,
 *   expectedVersion: number,
 *   actorUserId: string | null,
 *   at: string,
 *   guards?: Guards,
 * }} input
 * @returns {{ state: string, version: number }}
 */
export function applyHangoutEvent(db, input) {
  return inTransaction(db, () => applyHangoutEventInTransaction(db, input));
}

/**
 * The same as applyHangoutEvent, for a caller that already holds a write
 * transaction, so the state change commits together with its other writes.
 *
 * @param {DatabaseSync} db
 * @param {Parameters<typeof applyHangoutEvent>[1]} input
 * @returns {{ state: string, version: number }}
 */
export function applyHangoutEventInTransaction(db, input) {
  const { hangoutId, event, expectedVersion, actorUserId, at, guards } = input;
  {
    const row = /** @type {{ state: string, version: number } | undefined} */ (
      db
        .prepare('SELECT state, version FROM hangout WHERE hangout_id = ?')
        .get(hangoutId)
    );
    if (!row) throw new RangeError(`no hangout ${hangoutId}`);
    if (row.version !== expectedVersion) {
      throw new StaleHangoutError(
        `hangout ${hangoutId} is at version ${row.version}, not ${expectedVersion}`,
      );
    }
    const next = transition(row.state, event, guards);
    const version = row.version + 1;
    db.prepare(
      'UPDATE hangout SET state = ?, version = ?, updated_at = ? WHERE hangout_id = ? AND version = ?',
    ).run(next, version, at, hangoutId, row.version);
    const seq = /** @type {{ seq: number }} */ (
      db
        .prepare(
          'SELECT coalesce(max(seq), 0) + 1 AS seq FROM hangout_transition WHERE hangout_id = ?',
        )
        .get(hangoutId)
    ).seq;
    db.prepare(
      'INSERT INTO hangout_transition (hangout_id, seq, from_state, to_state, event, actor_user_id, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(hangoutId, seq, row.state, next, event, actorUserId, at);
    return { state: next, version };
  }
}

/**
 * @template T
 * @param {DatabaseSync} db
 * @param {() => T} work
 * @returns {T}
 */
function inTransaction(db, work) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = work();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}
