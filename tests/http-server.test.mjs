// US-017: one-command run, health, reset, restart recovery, backup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { startServer } from '../services/api/src/http/server.mjs';

/** @param {any} db */
function seedUser(db) {
  db.prepare(
    "INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES ('01J00000000000000000000001', 'Sam', '+15550001111', 1, '2026-11-12T12:00:00.000Z')",
  ).run();
}

test('run: boots on an ephemeral port with health and contract routes live', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'unspoken-'));
  const server = await startServer({ dbPath: join(dir, 'a.sqlite'), port: 0 });
  const health = await fetch(`http://127.0.0.1:${server.port}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const events = await fetch(`http://127.0.0.1:${server.port}/api/v1/events`);
  assert.equal(events.status, 200);
  assert.ok((await events.json()).events.length > 0);
  await server.stop();
});

test('reset: --reset starts from an empty database', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'unspoken-'));
  const dbPath = join(dir, 'b.sqlite');
  const db = openDatabase(dbPath);
  migrate(db);
  seedUser(db);
  db.close();
  const server = await startServer({ dbPath, port: 0, reset: true });
  const reopened = openDatabase(dbPath);
  assert.equal(
    /** @type {{ n: number }} */ (
      reopened.prepare('SELECT COUNT(*) AS n FROM app_user').get()
    ).n,
    0,
  );
  reopened.close();
  await server.stop();
});

test('restart recovery: a plain restart keeps every row', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'unspoken-'));
  const dbPath = join(dir, 'c.sqlite');
  const db = openDatabase(dbPath);
  migrate(db);
  seedUser(db);
  db.close();
  const server = await startServer({ dbPath, port: 0 });
  await server.stop();
  const reopened = openDatabase(dbPath);
  assert.equal(
    /** @type {{ first_name: string }} */ (
      reopened
        .prepare('SELECT first_name FROM app_user WHERE user_id = ?')
        .get('01J00000000000000000000001')
    ).first_name,
    'Sam',
  );
  reopened.close();
});

test('backup: --backup copies the database to a timestamped file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'unspoken-'));
  const dbPath = join(dir, 'd.sqlite');
  const db = openDatabase(dbPath);
  migrate(db);
  seedUser(db);
  db.close();
  const out = await startServer({
    dbPath,
    port: 0,
    backup: true,
    backupDir: dir,
  });
  const copies = readdirSync(dir).filter((f) => f !== 'd.sqlite');
  assert.equal(copies.length, 1);
  assert.ok(existsSync(join(dir, copies[0])));
  await out.stop();
});
