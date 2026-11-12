/**
 * Pods, invitations, single-use invite links and contact matching (US-004),
 * over the US-002 schema. Error codes are the contract's (openapi.json
 * 0.2.0-draft); HTTP routes are not part of this task.
 *
 * Rules:
 * - A pod holds 3 to 8 people including the creator. Joined members, pending
 *   invitations and active invite links together never exceed 8, so a place
 *   that has been offered cannot be given away twice. Planning needs 3 joined.
 * - An invite link is single use. Only a SHA-256 digest of its token is
 *   stored, so a database read cannot be turned into a working link.
 * - Contacts are matched by phone number; numbers that match nobody are never
 *   stored. If the member has not granted contacts permission, matching
 *   returns nothing and invitations by user id are refused: invite links are
 *   the only way to build the pod.
 * - A caller who is not a joined member of a pod gets not_found, the same as
 *   a pod that does not exist.
 */
import { createHash, randomBytes } from 'node:crypto';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */

export const MIN_MEMBERS = 3;
export const MAX_MEMBERS = 8;
export const INVITE_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PHONE = /^\+[1-9][0-9]{6,14}$/;
const MAX_MATCH_BATCH = 2000;

export class PodError extends Error {
  /**
   * @param {string} code a contract error code
   * @param {string} message
   * @param {{ field: string, problem: string }[]} [details]
   */
  constructor(code, message, details) {
    super(message);
    this.name = 'PodError';
    this.code = code;
    if (details) this.details = details;
  }
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A ULID: 48-bit millisecond time, then 80 random bits, Crockford base32. */
export function newUlid(now = Date.now()) {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i += 1) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = randomBytes(16);
  let random = '';
  for (let i = 0; i < 16; i += 1) random += CROCKFORD[bytes[i] % 32];
  return time + random;
}

/** @param {string} token */
export const tokenDigest = (token) =>
  createHash('sha256').update(token, 'utf8').digest('hex');

/**
 * @template T
 * @param {DatabaseSync} db
 * @param {() => T} work
 * @returns {T}
 */
function inTransaction(db, work) {
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

/** @param {DatabaseSync} db @param {string} userId */
function contactsGranted(db, userId) {
  const row = db
    .prepare('SELECT contacts FROM permission_status WHERE user_id = ?')
    .get(userId);
  return row?.contacts === 'granted';
}

/** @param {DatabaseSync} db @param {string} userId */
function assertActiveUser(db, userId) {
  const row = db
    .prepare(
      'SELECT 1 AS ok FROM app_user WHERE user_id = ? AND deleted_at IS NULL',
    )
    .get(userId);
  if (!row) throw new PodError('not_found', 'no such user');
}

/**
 * @param {DatabaseSync} db
 * @param {string} podId
 * @param {string} userId
 * @returns {{ role: string }}
 */
function requireMember(db, podId, userId) {
  const row = /** @type {{ role: string } | undefined} */ (
    db
      .prepare(
        'SELECT role FROM pod_membership WHERE pod_id = ? AND user_id = ? AND left_at IS NULL',
      )
      .get(podId, userId)
  );
  if (!row) throw new PodError('not_found', 'no such pod');
  return row;
}

/** @param {DatabaseSync} db @param {string} podId @param {string} userId */
function requireCreator(db, podId, userId) {
  if (requireMember(db, podId, userId).role !== 'creator')
    throw new PodError('not_creator', 'only the pod creator may do this');
}

/**
 * Places taken: joined members, pending invitations, and active links.
 * @param {DatabaseSync} db
 * @param {string} podId
 * @param {string} at ISO time used to decide which links have expired
 */
export function placesTaken(db, podId, at) {
  const row = /** @type {{ n: number }} */ (
    db
      .prepare(
        `SELECT
           (SELECT count(*) FROM pod_membership WHERE pod_id = :pod AND left_at IS NULL)
         + (SELECT count(*) FROM pod_invitation WHERE pod_id = :pod AND status = 'pending')
         + (SELECT count(*) FROM invite_link
              WHERE pod_id = :pod AND used_at IS NULL AND revoked_at IS NULL AND expires_at > :at)
           AS n`,
      )
      .get({ pod: podId, at })
  );
  return row.n;
}

/** @param {DatabaseSync} db @param {string} podId @param {string} at @param {number} adding */
function assertRoom(db, podId, at, adding) {
  if (placesTaken(db, podId, at) + adding > MAX_MEMBERS)
    throw Object.assign(
      new PodError('pod_full', `a pod holds at most ${MAX_MEMBERS} people`),
      { constraint: { minMembers: MIN_MEMBERS, maxMembers: MAX_MEMBERS } },
    );
}

/**
 * @param {DatabaseSync} db
 * @param {string} podId
 * @param {string} callerUserId
 * @param {readonly string[]} userIds
 */
function validateInvitees(db, podId, callerUserId, userIds) {
  if (userIds.length === 0) return;
  if (!contactsGranted(db, callerUserId)) {
    throw new PodError(
      'validation_failed',
      'contacts permission is not granted, so invite links are the only way to add people',
      [{ field: 'inviteUserIds', problem: 'contacts_permission_not_granted' }],
    );
  }
  if (new Set(userIds).size !== userIds.length)
    throw new PodError('validation_failed', 'duplicate invitees', [
      { field: 'inviteUserIds', problem: 'duplicate' },
    ]);
  for (const userId of userIds) {
    if (userId === callerUserId)
      throw new PodError('validation_failed', 'you cannot invite yourself', [
        { field: 'inviteUserIds', problem: 'self' },
      ]);
    assertActiveUser(db, userId);
    const member = db
      .prepare(
        'SELECT 1 AS ok FROM pod_membership WHERE pod_id = ? AND user_id = ? AND left_at IS NULL',
      )
      .get(podId, userId);
    if (member) throw new PodError('already_member', 'already a member');
  }
}

/**
 * @param {DatabaseSync} db
 * @param {string} podId
 * @param {string} invitedBy
 * @param {readonly string[]} userIds
 * @param {string} at
 * @param {() => string} newId
 */
function insertInvitations(db, podId, invitedBy, userIds, at, newId) {
  const insert = db.prepare(
    "INSERT INTO pod_invitation (invitation_id, pod_id, invitee_user_id, invited_by, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
  );
  return userIds.map((userId) => {
    const invitationId = newId();
    try {
      insert.run(invitationId, podId, userId, invitedBy, at);
    } catch (error) {
      if (/UNIQUE/.test(String(error)))
        throw new PodError(
          'invitation_resolved',
          'an invitation is already pending',
        );
      throw error;
    }
    return invitationId;
  });
}

/**
 * Find which of the caller's contacts are on the app. Nothing is stored.
 *
 * @param {DatabaseSync} db
 * @param {{ callerUserId: string, phones: readonly string[] }} input
 * @returns {{ phone: string, userId: string, firstName: string }[]}
 */
export function matchContacts(db, { callerUserId, phones }) {
  assertActiveUser(db, callerUserId);
  if (phones.length === 0 || phones.length > MAX_MATCH_BATCH)
    throw new PodError(
      'validation_failed',
      `send 1 to ${MAX_MATCH_BATCH} numbers`,
      [{ field: 'phones', problem: 'count' }],
    );
  for (const phone of phones)
    if (typeof phone !== 'string' || !PHONE.test(phone))
      throw new PodError('validation_failed', 'phone numbers must be E.164', [
        { field: 'phones', problem: 'format' },
      ]);
  if (!contactsGranted(db, callerUserId)) return [];
  const lookup = db.prepare(
    'SELECT user_id, first_name FROM app_user WHERE phone = ? AND deleted_at IS NULL AND user_id <> ?',
  );
  /** @type {{ phone: string, userId: string, firstName: string }[]} */
  const matches = [];
  for (const phone of new Set(phones)) {
    const row =
      /** @type {{ user_id: string, first_name: string } | undefined} */ (
        lookup.get(phone, callerUserId)
      );
    if (row)
      matches.push({ phone, userId: row.user_id, firstName: row.first_name });
  }
  return matches;
}

/**
 * Create a pod with the creator as its first member, and invite matched users.
 *
 * @param {DatabaseSync} db
 * @param {{ name: string, creatorUserId: string, inviteUserIds: readonly string[], at: string, newId?: () => string }} input
 * @returns {{ podId: string, invitationIds: string[] }}
 */
export function createPod(db, input) {
  const {
    name,
    creatorUserId,
    inviteUserIds,
    at,
    newId = () => newUlid(),
  } = input;
  if (typeof name !== 'string' || name.trim().length < 1 || name.length > 40)
    throw new PodError(
      'validation_failed',
      'a pod name is 1 to 40 characters',
      [{ field: 'name', problem: 'length' }],
    );
  if (inviteUserIds.length > MAX_MEMBERS - 1)
    throw Object.assign(new PodError('pod_full', 'too many invitees'), {
      constraint: { minMembers: MIN_MEMBERS, maxMembers: MAX_MEMBERS },
    });
  return inTransaction(db, () => {
    assertActiveUser(db, creatorUserId);
    const podId = newId();
    db.prepare(
      'INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
    ).run(podId, name, creatorUserId, at);
    db.prepare(
      "INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES (?, ?, 'creator', ?)",
    ).run(podId, creatorUserId, at);
    validateInvitees(db, podId, creatorUserId, inviteUserIds);
    assertRoom(db, podId, at, inviteUserIds.length);
    const invitationIds = insertInvitations(
      db,
      podId,
      creatorUserId,
      inviteUserIds,
      at,
      newId,
    );
    return { podId, invitationIds };
  });
}

/**
 * Invite more matched users. Creator only.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, callerUserId: string, userIds: readonly string[], at: string, newId?: () => string }} input
 * @returns {string[]} invitation ids
 */
export function inviteMembers(db, input) {
  const { podId, callerUserId, userIds, at, newId = () => newUlid() } = input;
  if (userIds.length < 1)
    throw new PodError('validation_failed', 'invite at least one person', [
      { field: 'userIds', problem: 'count' },
    ]);
  return inTransaction(db, () => {
    requireCreator(db, podId, callerUserId);
    validateInvitees(db, podId, callerUserId, userIds);
    assertRoom(db, podId, at, userIds.length);
    return insertInvitations(db, podId, callerUserId, userIds, at, newId);
  });
}

/**
 * @param {DatabaseSync} db
 * @param {{ invitationId: string, userId: string, at: string }} input
 * @returns {string} the pod id joined
 */
export function acceptInvitation(db, { invitationId, userId, at }) {
  return inTransaction(db, () => {
    const invitation =
      /** @type {{ pod_id: string, status: string } | undefined} */ (
        db
          .prepare(
            'SELECT pod_id, status FROM pod_invitation WHERE invitation_id = ? AND invitee_user_id = ?',
          )
          .get(invitationId, userId)
      );
    if (!invitation) throw new PodError('not_found', 'no such invitation');
    if (invitation.status !== 'pending')
      throw new PodError(
        'invitation_resolved',
        'this invitation is no longer pending',
      );
    // The pending invitation already holds a place, so no room check is needed.
    db.prepare(
      "UPDATE pod_invitation SET status = 'accepted', resolved_at = ? WHERE invitation_id = ?",
    ).run(at, invitationId);
    join(db, invitation.pod_id, userId, at);
    return invitation.pod_id;
  });
}

/**
 * @param {DatabaseSync} db
 * @param {{ invitationId: string, userId: string, at: string }} input
 */
export function declineInvitation(db, { invitationId, userId, at }) {
  const result = db
    .prepare(
      "UPDATE pod_invitation SET status = 'declined', resolved_at = ? WHERE invitation_id = ? AND invitee_user_id = ? AND status = 'pending'",
    )
    .run(at, invitationId, userId);
  if (result.changes === 0) {
    const exists = db
      .prepare(
        'SELECT 1 AS ok FROM pod_invitation WHERE invitation_id = ? AND invitee_user_id = ?',
      )
      .get(invitationId, userId);
    throw exists
      ? new PodError(
          'invitation_resolved',
          'this invitation is no longer pending',
        )
      : new PodError('not_found', 'no such invitation');
  }
}

/**
 * Create a single-use invite link. Any joined member may.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, callerUserId: string, at: string, ttlMs?: number, newId?: () => string }} input
 * @returns {{ inviteLinkId: string, token: string, expiresAt: string }} the token is returned once and never stored
 */
export function createInviteLink(db, input) {
  const {
    podId,
    callerUserId,
    at,
    ttlMs = INVITE_LINK_TTL_MS,
    newId = () => newUlid(),
  } = input;
  return inTransaction(db, () => {
    requireMember(db, podId, callerUserId);
    assertRoom(db, podId, at, 1);
    const inviteLinkId = newId();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.parse(at) + ttlMs).toISOString();
    db.prepare(
      'INSERT INTO invite_link (invite_link_id, pod_id, token_digest, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(inviteLinkId, podId, tokenDigest(token), callerUserId, at, expiresAt);
    return { inviteLinkId, token, expiresAt };
  });
}

/**
 * @param {DatabaseSync} db
 * @param {{ podId: string, inviteLinkId: string, callerUserId: string, at: string }} input
 */
export function revokeInviteLink(
  db,
  { podId, inviteLinkId, callerUserId, at },
) {
  inTransaction(db, () => {
    requireMember(db, podId, callerUserId);
    const result = db
      .prepare(
        'UPDATE invite_link SET revoked_at = ? WHERE invite_link_id = ? AND pod_id = ? AND used_at IS NULL AND revoked_at IS NULL',
      )
      .run(at, inviteLinkId, podId);
    if (result.changes === 0) throw new PodError('not_found', 'no active link');
  });
}

/**
 * Join a pod with a link token.
 *
 * @param {DatabaseSync} db
 * @param {{ token: string, userId: string, at: string }} input
 * @returns {string} the pod id joined
 */
export function acceptInviteLink(db, { token, userId, at }) {
  return inTransaction(db, () => {
    assertActiveUser(db, userId);
    const link =
      /** @type {{ invite_link_id: string, pod_id: string, used_at: string | null, revoked_at: string | null, expires_at: string } | undefined} */ (
        db
          .prepare(
            'SELECT invite_link_id, pod_id, used_at, revoked_at, expires_at FROM invite_link WHERE token_digest = ?',
          )
          .get(tokenDigest(String(token)))
      );
    // Unknown and revoked links look like a missing pod.
    if (!link || link.revoked_at)
      throw new PodError('not_found', 'no such pod');
    if (link.used_at)
      throw new PodError('invite_link_used', 'this link has already been used');
    if (link.expires_at <= at)
      throw new PodError('invite_link_expired', 'this link has expired');
    const member = db
      .prepare(
        'SELECT 1 AS ok FROM pod_membership WHERE pod_id = ? AND user_id = ? AND left_at IS NULL',
      )
      .get(link.pod_id, userId);
    if (member) throw new PodError('already_member', 'already a member');
    db.prepare(
      'UPDATE invite_link SET used_by = ?, used_at = ? WHERE invite_link_id = ?',
    ).run(userId, at, link.invite_link_id);
    // The link held a place; joining converts it, and resolves any pending
    // invitation for the same person so the place is not counted twice.
    db.prepare(
      "UPDATE pod_invitation SET status = 'accepted', resolved_at = ? WHERE pod_id = ? AND invitee_user_id = ? AND status = 'pending'",
    ).run(at, link.pod_id, userId);
    join(db, link.pod_id, userId, at);
    return link.pod_id;
  });
}

/**
 * @param {DatabaseSync} db
 * @param {string} podId
 * @param {string} userId
 * @param {string} at
 */
function join(db, podId, userId, at) {
  const previous = db
    .prepare(
      'SELECT left_at FROM pod_membership WHERE pod_id = ? AND user_id = ?',
    )
    .get(podId, userId);
  if (previous) {
    // Rejoining after leaving: the old row is history, so reuse it.
    db.prepare(
      "UPDATE pod_membership SET left_at = NULL, joined_at = ?, role = 'member' WHERE pod_id = ? AND user_id = ?",
    ).run(at, podId, userId);
    return;
  }
  db.prepare(
    "INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
  ).run(podId, userId, at);
}

/**
 * Leave a pod. Ledger entries involving the member are untouched, so a
 * balance stays until it is settled.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, userId: string, at: string }} input
 */
export function leavePod(db, { podId, userId, at }) {
  inTransaction(db, () => {
    requireMember(db, podId, userId);
    db.prepare(
      'UPDATE pod_membership SET left_at = ? WHERE pod_id = ? AND user_id = ?',
    ).run(at, podId, userId);
  });
}

/**
 * Remove a member. Creator only; the creator cannot remove themselves (they leave).
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, callerUserId: string, userId: string, at: string }} input
 */
export function removeMember(db, { podId, callerUserId, userId, at }) {
  inTransaction(db, () => {
    requireCreator(db, podId, callerUserId);
    if (userId === callerUserId)
      throw new PodError(
        'validation_failed',
        'use leave to leave your own pod',
        [{ field: 'userId', problem: 'self' }],
      );
    requireMember(db, podId, userId);
    db.prepare(
      'UPDATE pod_membership SET left_at = ? WHERE pod_id = ? AND user_id = ?',
    ).run(at, podId, userId);
  });
}

/**
 * The pod as a joined member sees it. Members are first names only.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, callerUserId: string, at: string }} input
 */
export function getPod(db, { podId, callerUserId, at }) {
  requireMember(db, podId, callerUserId);
  const pod =
    /** @type {{ name: string, creator_user_id: string, created_at: string }} */ (
      db
        .prepare(
          'SELECT name, creator_user_id, created_at FROM pod WHERE pod_id = ?',
        )
        .get(podId)
    );
  const joined = db
    .prepare(
      `SELECT m.user_id AS userId, u.first_name AS firstName, m.role AS role, 'joined' AS status
         FROM pod_membership m JOIN app_user u ON u.user_id = m.user_id
        WHERE m.pod_id = ? AND m.left_at IS NULL ORDER BY m.joined_at, m.user_id`,
    )
    .all(podId);
  const invited = db
    .prepare(
      `SELECT i.invitee_user_id AS userId, u.first_name AS firstName, 'member' AS role, 'invited' AS status
         FROM pod_invitation i JOIN app_user u ON u.user_id = i.invitee_user_id
        WHERE i.pod_id = ? AND i.status = 'pending' ORDER BY i.created_at, i.invitee_user_id`,
    )
    .all(podId);
  const members = [...joined, ...invited].map((row) => ({ ...row }));
  return {
    podId,
    name: pod.name,
    creatorUserId: pod.creator_user_id,
    createdAt: pod.created_at,
    members,
    memberCount: placesTaken(db, podId, at),
    minMembers: MIN_MEMBERS,
    maxMembers: MAX_MEMBERS,
    readyForPlanning: joined.length >= MIN_MEMBERS,
  };
}

/**
 * @param {DatabaseSync} db
 * @param {string} podId
 */
export function readyForPlanning(db, podId) {
  const row = /** @type {{ n: number }} */ (
    db
      .prepare(
        'SELECT count(*) AS n FROM pod_membership WHERE pod_id = ? AND left_at IS NULL',
      )
      .get(podId)
  );
  return row.n >= MIN_MEMBERS;
}
