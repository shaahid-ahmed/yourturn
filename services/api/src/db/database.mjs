/**
 * Opening and migrating the Unspoken SQLite database (US-002).
 *
 * Uses Node's built-in `node:sqlite`, so there is no native dependency. Every
 * connection turns foreign keys on, because SQLite leaves them off by default
 * and a membership row pointing at a missing pod would otherwise be accepted.
 */
import { DatabaseSync } from 'node:sqlite';

import { MIGRATIONS } from './migrations.mjs';

/** @typedef {import('./migrations.mjs').Migration} Migration */

/**
 * @param {string} path a file path, or ':memory:'
 * @returns {DatabaseSync}
 */
export function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

/**
 * Apply every migration newer than the database's recorded version. Each
 * migration runs in its own transaction with its version row, so a failure
 * leaves the database exactly as it was before that migration.
 *
 * @param {DatabaseSync} db
 * @param {readonly Migration[]} [migrations]
 * @returns {number[]} the versions applied by this call
 */
export function migrate(db, migrations = MIGRATIONS) {
  assertOrdered(migrations);
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migration (
    version     INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    applied_at  TEXT NOT NULL
  ) STRICT;`);
  const current = currentVersion(db);
  const known = migrations.at(-1)?.version ?? 0;
  if (current > known) {
    throw new RangeError(
      `database is at version ${current}, newer than this code knows (${known})`,
    );
  }
  const record = db.prepare(
    'INSERT INTO schema_migration (version, name, applied_at) VALUES (?, ?, ?)',
  );
  /** @type {number[]} */
  const applied = [];
  for (const migration of migrations) {
    if (migration.version <= current) continue;
    db.exec('BEGIN IMMEDIATE;');
    try {
      db.exec(migration.sql);
      record.run(migration.version, migration.name, new Date().toISOString());
      db.exec('COMMIT;');
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
    applied.push(migration.version);
  }
  return applied;
}

/**
 * @param {DatabaseSync} db
 * @returns {number} 0 for an empty database
 */
export function currentVersion(db) {
  const exists = db
    .prepare(
      "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'schema_migration'",
    )
    .get();
  if (!exists) return 0;
  const row = /** @type {{ version: number | null }} */ (
    db.prepare('SELECT max(version) AS version FROM schema_migration').get()
  );
  return row.version ?? 0;
}

/** @param {readonly Migration[]} migrations */
function assertOrdered(migrations) {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new RangeError(
        `migration ${index} has version ${migration.version}; versions must be 1, 2, 3 ... with no gaps`,
      );
    }
  });
}
