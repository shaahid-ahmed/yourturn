/**
 * Demo phone-code sessions (US-019) over the US-002 schema.
 *
 * Only seeded synthetic numbers can sign in, with the fixed demo code from
 * the contract (`PhoneCodeChallenge.delivery: simulated_demo`). No text
 * message is ever sent. Codes are SHA-256 digests; a database read cannot
 * be turned into a working code. Challenges are single use and expire
 * after ten minutes. Sessions resolve from the `unspoken_session` cookie;
 * mutating requests additionally present the session's CSRF token.
 */
import { createHash, randomBytes } from 'node:crypto';

import { newUlid } from '../pods.mjs';

export const DEMO_CODE = '000000';
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class SessionError extends Error {
  /**
   * @param {string} code a contract error code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

/** @param {string} value */
function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ phone: string, at?: string }} input
 */
export function requestPhoneCode(db, { phone, at }) {
  const now = at ?? new Date().toISOString();
  const row = db
    .prepare('SELECT user_id, synthetic FROM app_user WHERE phone = ? AND deleted_at IS NULL')
    .get(phone);
  if (!row || row.synthetic !== 1) {
    throw new SessionError(
      'validation_failed',
      'only seeded synthetic numbers can sign in to this demo',
    );
  }
  const challengeId = newUlid(Date.parse(now));
  const expiresAt = new Date(Date.parse(now) + CHALLENGE_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO phone_challenge (challenge_id, phone, code_digest, expires_at) VALUES (?, ?, ?, ?)',
  ).run(challengeId, phone, digest(DEMO_CODE), expiresAt);
  return { challengeId, expiresAt };
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ challengeId: string, code: string, at?: string }} input
 * @returns {{ sessionId: string, userId: string, csrfToken: string, expiresAt: string, isNewUser: boolean } | null}
 */
export function createSession(db, { challengeId, code, at }) {
  const now = at ?? new Date().toISOString();
  const row = db
    .prepare('SELECT * FROM phone_challenge WHERE challenge_id = ?')
    .get(challengeId);
  if (!row || row.consumed_at || row.expires_at <= now) return null;
  if (digest(code) !== row.code_digest) return null;
  db.prepare('UPDATE phone_challenge SET consumed_at = ? WHERE challenge_id = ?').run(
    now,
    challengeId,
  );
  let user = db
    .prepare('SELECT user_id FROM app_user WHERE phone = ? AND deleted_at IS NULL')
    .get(row.phone);
  let isNewUser = false;
  if (!user) {
    const userId = newUlid(Date.parse(now));
    db.prepare(
      "INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, 'Member', ?, 1, ?)",
    ).run(userId, row.phone, now);
    user = { user_id: userId };
    isNewUser = true;
  }
  const sessionId = newUlid(Date.parse(now));
  const csrfToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.parse(now) + SESSION_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO session (session_id, user_id, csrf_token_digest, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  ).run(sessionId, user.user_id, digest(csrfToken), now, expiresAt);
  return { sessionId, userId: user.user_id, csrfToken, expiresAt, isNewUser };
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} sessionId
 */
export function endSession(db, sessionId) {
  db.prepare('UPDATE session SET ended_at = ? WHERE session_id = ? AND ended_at IS NULL').run(
    new Date().toISOString(),
    sessionId,
  );
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string | undefined} sessionId
 * @returns {{ userId: string, csrfDigest: string } | null}
 */
export function resolveSession(db, sessionId) {
  if (!sessionId) return null;
  const row = db
    .prepare(
      'SELECT user_id, csrf_token_digest FROM session WHERE session_id = ? AND ended_at IS NULL AND expires_at > ?',
    )
    .get(sessionId, new Date().toISOString());
  if (!row) return null;
  return { userId: row.user_id, csrfDigest: row.csrf_token_digest };
}
