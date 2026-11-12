// US-301: the synthetic Unspoken demo fixture is visibly synthetic, carries no
// real personal data, loads deterministically, and works against the API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { buildApp } from '../services/api/src/http/app.mjs';
import {
  readDemoFixture,
  loadDemoFixture,
  privateLimitsFor,
} from './fixtures/load-unspoken-demo.mjs';

const RAW = readFileSync(
  new URL('./fixtures/unspoken-demo.json', import.meta.url),
  'utf8',
);
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
// NANP 555-0100 to 555-0199 is reserved for fictional use.
const FICTIONAL_PHONE = /^\+1[2-9]\d{2}5550[1]\d{2}$/;

function loaded() {
  const db = openDatabase(':memory:');
  migrate(db);
  return { db, ...loadDemoFixture(db) };
}

/** @param {import('node:sqlite').DatabaseSync} db */
function dump(db) {
  const tables = [
    'app_user',
    'permission_status',
    'paypal_link',
    'subscription_receipt',
    'pod',
    'pod_membership',
  ];
  return Object.fromEntries(
    tables.map((t) => [
      t,
      db
        .prepare(`SELECT * FROM ${t} ORDER BY 1, 2`)
        .all()
        .map((r) => ({ ...r })),
    ]),
  );
}

test('every person is visibly synthetic with a fictional phone number', () => {
  const fixture = readDemoFixture();
  assert.equal(fixture.synthetic, true);
  assert.match(fixture.notice, /synthetic/i);
  const phones = new Set();
  const ids = new Set();
  for (const p of fixture.people) {
    assert.match(
      p.firstName,
      / \(demo\)$/,
      `${p.key}: name must be labelled (demo)`,
    );
    assert.ok(
      p.firstName.length <= 40,
      `${p.key}: first name fits the contract`,
    );
    assert.match(
      p.phone,
      FICTIONAL_PHONE,
      `${p.key}: phone must be in 555-0100..0199`,
    );
    assert.match(p.userId, ULID, `${p.key}: userId must be a ULID`);
    phones.add(p.phone);
    ids.add(p.userId);
    if (p.privateLimits) {
      assert.ok(Number.isInteger(p.privateLimits.budgetPerHangoutCents));
      assert.equal(
        p.privateLimits.budgetPerHangoutCents % 100,
        0,
        'budgets are whole dollars',
      );
    }
  }
  assert.equal(phones.size, fixture.people.length, 'phones are unique');
  assert.equal(ids.size, fixture.people.length, 'ids are unique');
});

test('the fixture contains no email, card, bank or other real-looking personal data', () => {
  assert.doesNotMatch(
    RAW,
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
    'no email address',
  );
  assert.doesNotMatch(RAW, /\b\d{13,19}\b/, 'no card-length number');
  assert.doesNotMatch(
    RAW,
    /\b(iban|routing|account[_ ]?number|ssn|cvv|password)\b/i,
  );
  // Every phone-shaped value is one of the fictional numbers, and any long
  // standalone digit run would be suspicious (ULIDs mix in letters).
  assert.doesNotMatch(RAW, /"\d{7,}"/, 'no bare digit strings');
  for (const match of RAW.matchAll(/\+\d{10,14}/g))
    assert.match(match[0], FICTIONAL_PHONE, `unexpected number ${match[0]}`);
});

test('pods hold 3 to 8 fixture people and every reference resolves', () => {
  const fixture = readDemoFixture();
  const keys = new Set(fixture.people.map((p) => p.key));
  for (const pod of fixture.pods) {
    assert.match(pod.podId, ULID);
    assert.match(pod.name, / \(demo\)$/);
    assert.ok(
      pod.members.length >= 3 && pod.members.length <= 8,
      `${pod.key}: 3 to 8 members`,
    );
    assert.ok(
      pod.members.includes(pod.creator),
      `${pod.key}: creator is a member`,
    );
    for (const m of pod.members)
      assert.ok(keys.has(m), `${pod.key}: unknown ${m}`);
  }
  const inAnyPod = new Set(fixture.pods.flatMap((p) => p.members));
  assert.ok(!inAnyPod.has(fixture.roles.outsider), 'the outsider is in no pod');
  assert.ok(
    !inAnyPod.has(fixture.roles.inviteTarget),
    'the invite target is in no pod',
  );
  const noPaypal = fixture.people.find((p) => p.key === fixture.roles.noPaypal);
  assert.equal(noPaypal?.paypalLinked, false);
  assert.equal(
    readFileSync(
      new URL(`./fixtures/${fixture.catalog}`, import.meta.url),
      'utf8',
    ).includes('"synthetic": true'),
    true,
  );
});

test('loading is deterministic, synthetic-only and passes integrity checks', () => {
  const a = loaded();
  const b = loaded();
  assert.deepEqual(dump(a.db), dump(b.db));
  assert.equal(
    a.db
      .prepare('SELECT count(*) AS n FROM app_user WHERE synthetic <> 1')
      .get()?.n,
    0,
  );
  assert.equal(
    a.db
      .prepare(
        "SELECT count(*) AS n FROM paypal_link WHERE environment <> 'sandbox'",
      )
      .get()?.n,
    0,
  );
  assert.equal(
    a.db
      .prepare(
        "SELECT count(*) AS n FROM subscription_receipt WHERE environment <> 'sandbox'",
      )
      .get()?.n,
    0,
  );
  assert.equal(
    a.db.prepare('PRAGMA integrity_check').get()?.integrity_check,
    'ok',
  );
  assert.deepEqual(a.db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(
    a.db.prepare('SELECT count(*) AS n FROM app_user').get()?.n,
    a.fixture.people.length,
  );
  assert.equal(
    a.db.prepare('SELECT count(*) AS n FROM pod_membership').get()?.n,
    7,
  );
  assert.equal(
    a.db.prepare('SELECT count(*) AS n FROM ledger_entry').get()?.n,
    0,
    'no money is seeded',
  );
});

test('a fixture person signs in over HTTP and sets their private limits', async () => {
  const { db, person } = loaded();
  const app = buildApp({ db });
  const ava = person('ava');
  const challenge = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/phone-codes',
    payload: { phone: ava.phone },
  });
  assert.equal(challenge.statusCode, 201);
  const session = await app.inject({
    method: 'POST',
    url: '/api/v1/sessions',
    payload: { challengeId: challenge.json().challengeId, code: '000000' },
  });
  assert.equal(session.statusCode, 201);
  const headers = {
    cookie: String(session.headers['set-cookie']).split(';')[0],
    'x-csrf-token': session.json().csrfToken,
  };
  const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().firstName, 'Ava (demo)');
  const body = privateLimitsFor(ava);
  assert.ok(body, 'Ava has private limits');
  const limits = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/private-limits',
    headers,
    payload: body,
  });
  assert.equal(limits.statusCode, 200);
  assert.equal(limits.json().budgetPerHangoutCents, 6000);
  // A number outside the fixture cannot sign in.
  const stranger = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/phone-codes',
    payload: { phone: '+12125550199' },
  });
  assert.notEqual(stranger.statusCode, 201);
  await app.close();
});
