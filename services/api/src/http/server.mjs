/**
 * One-command product API runner (US-017): listen, health, reset, backup.
 *
 * The SQLite file persists between restarts and `migrate()` is idempotent,
 * so a plain restart recovers everything. `--reset` starts from an empty
 * database; `--backup` copies the database to a timestamped file first.
 */
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { buildApp } from './app.mjs';
import { openDatabase, migrate } from '../db/database.mjs';

/**
 * @param {{ dbPath: string, port?: number, host?: string, reset?: boolean, backup?: boolean, backupDir?: string, publicOrigin?: string }} options
 * @returns {Promise<{ port: number, dbPath: string, stop: () => Promise<void> }>}
 */
export async function startServer({
  dbPath,
  port = 3001,
  host = '127.0.0.1',
  reset = false,
  backup = false,
  backupDir,
  publicOrigin,
}) {
  if (reset && existsSync(dbPath)) rmSync(dbPath);
  mkdirSync(dirname(dbPath), { recursive: true });
  if (backup && existsSync(dbPath)) {
    const dir = backupDir ?? join(dirname(dbPath), 'backups');
    mkdirSync(dir, { recursive: true });
    copyFileSync(
      dbPath,
      join(
        dir,
        `unspoken-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`,
      ),
    );
  }
  const db = openDatabase(dbPath);
  migrate(db);
  const app = buildApp({ db, publicOrigin });
  app.get('/health', async () => ({ status: 'ok' }));
  await app.listen({ port, host });
  const address = app.server.address();
  return {
    port: typeof address === 'object' && address !== null ? address.port : port,
    dbPath,
    stop: () => app.close(),
  };
}

const invokedAsScript =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('/server.mjs') ||
    process.argv[1].endsWith('\\server.mjs'));
if (invokedAsScript) {
  const args = new Set(process.argv.slice(2));
  const port = Number(process.env.PORT ?? '3001');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer from 1 to 65535');
    process.exit(1);
  }
  const server = await startServer({
    dbPath: process.env.UNSPOKEN_DB ?? '.local/unspoken.sqlite',
    port,
    host: process.env.HOST ?? '127.0.0.1',
    reset: args.has('--reset'),
    backup: args.has('--backup'),
    publicOrigin: process.env.UNSPOKEN_PUBLIC_ORIGIN || undefined,
  });
  console.log(
    `Unspoken API on http://127.0.0.1:${server.port} (db ${server.dbPath})`,
  );
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      void server.stop().finally(() => process.exit(0));
    });
  }
}
