/**
 * Run work in one SQLite write transaction: commit on success, roll back on
 * any error, so a failed operation leaves no partial effect.
 */

/**
 * @template T
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {() => T} work
 * @returns {T}
 */
export function inTransaction(db, work) {
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
