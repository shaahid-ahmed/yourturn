/**
 * Load the synthetic Unspoken demo fixture (US-301) into a migrated database.
 *
 * Writes people, permission status, sandbox PayPal links, sandbox
 * subscription receipts, pods and memberships. Every row is marked synthetic
 * where the schema allows it. Private limits are not written here: the app
 * keeps them in its in-memory vault, so tests set them through the API with
 * `privateLimitsFor`.
 *
 * Loading is deterministic: the same fixture and `at` give the same rows.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const FIXTURE_URL = new URL('./unspoken-demo.json', import.meta.url);

/**
 * @typedef {object} DemoPerson
 * @property {string} key
 * @property {string} userId
 * @property {string} firstName
 * @property {string} phone
 * @property {boolean} paypalLinked
 * @property {boolean} subscribed
 * @property {null | { budgetPerHangoutCents: number, dietaryNeeds: string[], dislikes: string[], maxTravelMinutes: number }} privateLimits
 */

/**
 * @typedef {object} DemoPod
 * @property {string} key
 * @property {string} podId
 * @property {string} name
 * @property {string} creator
 * @property {string[]} members
 */

/**
 * @typedef {object} DemoFixture
 * @property {true} synthetic
 * @property {string} version
 * @property {string} notice
 * @property {DemoPerson[]} people
 * @property {DemoPod[]} pods
 * @property {Record<string, string>} roles
 * @property {string} catalog
 */

/** @returns {DemoFixture} */
export function readDemoFixture() {
  return JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));
}

/**
 * @param {import('node:sqlite').DatabaseSync} db a migrated database
 * @param {{ at?: string, subscriptionExpiresAt?: string }} [options]
 * @returns {{ fixture: DemoFixture, person: (key: string) => DemoPerson, pod: (key: string) => DemoPod }}
 */
export function loadDemoFixture(db, options = {}) {
  const at = options.at ?? '2026-11-12T12:00:00.000Z';
  const expires = options.subscriptionExpiresAt ?? '2027-11-12T12:00:00.000Z';
  const fixture = readDemoFixture();
  if (fixture.synthetic !== true) throw new Error('fixture must be synthetic');
  const people = new Map(fixture.people.map((p) => [p.key, p]));

  db.exec('BEGIN IMMEDIATE;');
  try {
    const user = db.prepare(
      'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
    );
    const permission = db.prepare(
      "INSERT INTO permission_status (user_id, contacts, notifications, calendar, updated_at) VALUES (?, 'granted', 'granted', 'granted', ?)",
    );
    const paypal = db.prepare(
      "INSERT INTO paypal_link (user_id, status, environment, linked_at) VALUES (?, 'linked', 'sandbox', ?)",
    );
    const receipt = db.prepare(
      `INSERT INTO subscription_receipt (receipt_id, user_id, store, environment, receipt_digest,
         original_transaction_ref, price_cents, verified_at, expires_at)
       VALUES (?, ?, 'apple_app_store', 'sandbox', ?, ?, 1500, ?, ?)`,
    );
    for (const p of fixture.people) {
      user.run(p.userId, p.firstName, p.phone, at);
      permission.run(p.userId, at);
      if (p.paypalLinked) paypal.run(p.userId, at);
      if (p.subscribed) {
        const digest = createHash('sha256')
          .update(`demo-receipt:${p.key}`)
          .digest('hex');
        receipt.run(
          `rcpt-demo-${p.key}`,
          p.userId,
          digest,
          `demo-otx-${p.key}`,
          at,
          expires,
        );
      }
    }
    const pod = db.prepare(
      'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
    );
    const member = db.prepare(
      'INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
    );
    for (const p of fixture.pods) {
      const creator = people.get(p.creator);
      if (!creator) throw new Error(`${p.key}: unknown creator ${p.creator}`);
      pod.run(p.podId, p.name, creator.userId, at);
      for (const key of p.members) {
        const m = people.get(key);
        if (!m) throw new Error(`${p.key}: unknown member ${key}`);
        member.run(
          p.podId,
          m.userId,
          key === p.creator ? 'creator' : 'member',
          at,
        );
      }
    }
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  return {
    fixture,
    person: (key) => {
      const p = people.get(key);
      if (!p) throw new Error(`no fixture person ${key}`);
      return p;
    },
    pod: (key) => {
      const p = fixture.pods.find((x) => x.key === key);
      if (!p) throw new Error(`no fixture pod ${key}`);
      return p;
    },
  };
}

/**
 * The contract SetPrivateLimitsRequest body for a fixture person, or null.
 * @param {DemoPerson} person
 */
export function privateLimitsFor(person) {
  return person.privateLimits ? { ...person.privateLimits } : null;
}
