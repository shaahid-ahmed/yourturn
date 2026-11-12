// #101: private limits survive an API restart via private_limits_vault.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';

const U1 = '01J00000000000000000000001';
const T0 = '2026-11-12T12:00:00.000Z';
const KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);

const LIMITS = {
  budgetPerHangoutCents: 3000,
  dietaryNeeds: [],
  dislikes: [],
  maxTravelMinutes: 30,
};

function seededDb() {
  const db = openDatabase(':memory:');
  migrate(db);
  db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  ).run(U1, 'Sam', '+15550001111', T0);
  return db;
}

/**
 * @param {any} app
 * @param {string} [phone]
 */
async function signIn(app, phone = '+15550001111') {
  const challenge = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/phone-codes',
    payload: { phone },
  });
  assert.equal(challenge.statusCode, 201);
  const session = await app.inject({
    method: 'POST',
    url: '/api/v1/sessions',
    payload: { challengeId: challenge.json().challengeId, code: '000000' },
  });
  assert.equal(session.statusCode, 201);
  return {
    cookie: session.headers['set-cookie'].split(';')[0],
    'x-csrf-token': session.json().csrfToken,
  };
}

test('#101: limits set before a restart read back after it', async () => {
  const db = seededDb();
  const before = buildApp({ db, vaultKey: KEY });
  const h = await signIn(before);
  const put = await before.inject({
    method: 'PUT',
    url: '/api/v1/me/private-limits',
    headers: h,
    payload: LIMITS,
  });
  assert.equal(put.statusCode, 200);

  // Restart: a fresh app (empty in-memory vault), same database and key.
  const after = buildApp({ db, vaultKey: KEY });
  const h2 = await signIn(after);
  const got = await after.inject({
    method: 'GET',
    url: '/api/v1/me/private-limits',
    headers: { cookie: h2.cookie },
  });
  assert.equal(got.statusCode, 200);
  assert.equal(got.json().budgetPerHangoutCents, 3000);
  assert.equal(got.json().maxTravelMinutes, 30);
});

test('#101: a rotated key fails closed to defaults and drops the stale row', async () => {
  const db = seededDb();
  const before = buildApp({ db, vaultKey: KEY });
  const h = await signIn(before);
  await before.inject({
    method: 'PUT',
    url: '/api/v1/me/private-limits',
    headers: h,
    payload: LIMITS,
  });

  const rotated = buildApp({ db, vaultKey: OTHER_KEY });
  const h2 = await signIn(rotated);
  const got = await rotated.inject({
    method: 'GET',
    url: '/api/v1/me/private-limits',
    headers: { cookie: h2.cookie },
  });
  assert.equal(got.statusCode, 200);
  assert.equal(got.json().budgetPerHangoutCents, null);
  assert.equal(
    /** @type {{ n: number } | undefined} */ (
      db.prepare('SELECT COUNT(*) AS n FROM private_limits_vault').get()
    )?.n,
    0,
  );
});
