/**
 * Seed the product API's database with the synthetic Unspoken demo (#78).
 *
 * Loads the US-301 fixture (people, pods, sandbox PayPal links and sandbox
 * subscription receipts) into the SQLite file that `npm run dev:api` uses,
 * so the web app can sign in as a demo person. Every row is synthetic: names
 * end in "(demo)" and phone numbers are in the 555-01xx fiction range.
 *
 * Idempotent: if the demo people are already there, nothing is written.
 * Private limits are not seeded: the API keeps them in its own vault, so set
 * them in the app (P4 step 3 or P19).
 *
 *   node infra/seed/api-demo.mjs            # .local/unspoken.sqlite
 *   UNSPOKEN_DB=path node infra/seed/api-demo.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { openDatabase, migrate } from '../../services/api/src/db/database.mjs';
import { DEMO_CODE } from '../../services/api/src/http/sessions.mjs';
import {
  readDemoFixture,
  loadDemoFixture,
} from '../../tests/fixtures/load-unspoken-demo.mjs';

/**
 * @param {{ dbPath: string, now?: Date }} options
 * @returns {{ seeded: boolean, people: { firstName: string, phone: string }[], pods: string[] }}
 */
export function seedApiDemo({ dbPath, now = new Date() }) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = openDatabase(dbPath);
  db.exec('PRAGMA busy_timeout = 3000;');
  try {
    migrate(db);
    const fixture = readDemoFixture();
    const already = db
      .prepare('SELECT 1 AS x FROM app_user WHERE phone = ?')
      .get(fixture.people[0].phone);
    if (!already)
      loadDemoFixture(db, {
        at: now.toISOString(),
        subscriptionExpiresAt: new Date(
          now.getTime() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    return {
      seeded: !already,
      people: fixture.people.map((p) => ({
        firstName: p.firstName,
        phone: p.phone,
      })),
      pods: fixture.pods.map((p) => p.name),
    };
  } finally {
    db.close();
  }
}

const invokedAsScript = process.argv[1]?.endsWith('api-demo.mjs');
if (invokedAsScript) {
  const dbPath = process.env.UNSPOKEN_DB ?? '.local/unspoken.sqlite';
  const result = seedApiDemo({ dbPath });
  console.log(
    result.seeded
      ? `Seeded the synthetic demo into ${dbPath}.`
      : `Demo already present in ${dbPath}; nothing written.`,
  );
  console.log(`Pods: ${result.pods.join(', ')}`);
  console.log(
    `Sign in with any of these synthetic numbers and the demo code ${DEMO_CODE}:`,
  );
  for (const p of result.people.slice(0, 4))
    console.log(`  ${p.firstName.padEnd(12)} ${p.phone}`);
}
