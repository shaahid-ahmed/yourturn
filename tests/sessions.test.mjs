// US-019 sessions domain: phone-code sign-in for seeded synthetic numbers.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import {
  requestPhoneCode,
  createSession,
  endSession,
  resolveSession,
  DEMO_CODE,
  SessionError,
} from '../services/api/src/http/sessions.mjs';

const PHONE = '+15550001111';

function setup() {
  const db = openDatabase(':memory:');
  migrate(db);
  db.prepare(
    "INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES ('u-1', 'Sam', ?, 1, '2026-11-12T12:00:00.000Z')",
  ).run(PHONE);
  return db;
}

test('a seeded synthetic number gets a challenge, a stranger does not', () => {
  const db = setup();
  const c = requestPhoneCode(db, { phone: PHONE });
  assert.match(c.challengeId, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  let err = /** @type {unknown} */ (null);
  try {
    requestPhoneCode(db, { phone: '+19998887777' });
  } catch (e) {
    err = e;
  }
  assert.ok(err instanceof SessionError);
  assert.equal(err.code, 'validation_failed');
});

test('the fixed demo code opens a session, a wrong code does not', () => {
  const db = setup();
  const { challengeId } = requestPhoneCode(db, { phone: PHONE });
  const s = createSession(db, { challengeId, code: '000001' });
  assert.equal(s, null);
  const ok = createSession(db, { challengeId, code: DEMO_CODE });
  assert.equal(ok.userId, 'u-1');
  assert.equal(ok.isNewUser, false);
  assert.ok(ok.csrfToken.length >= 20);
});

test('a challenge is single use and expires', () => {
  const db = setup();
  const { challengeId } = requestPhoneCode(db, { phone: PHONE });
  createSession(db, { challengeId, code: DEMO_CODE });
  assert.equal(createSession(db, { challengeId, code: DEMO_CODE }), null);
});

test('ending a session stops resolution', () => {
  const db = setup();
  const { challengeId } = requestPhoneCode(db, { phone: PHONE });
  const s = createSession(db, { challengeId, code: DEMO_CODE });
  assert.equal(resolveSession(db, s.sessionId).userId, 'u-1');
  endSession(db, s.sessionId);
  assert.equal(resolveSession(db, s.sessionId), null);
});
