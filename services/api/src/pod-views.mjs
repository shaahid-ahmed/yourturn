/**
 * Pod views US-019 needs and US-004 left out: lists, mute, rhythm and
 * group activities, over the US-002 schema. Reads are member-scoped: a
 * caller who is not a joined member gets not_found, the same as a pod
 * that does not exist.
 */
import { newUlid, requireMember } from './pods.mjs';

/** Member-scoped reads: outsiders get not_found, like a missing pod.
 * @param {import('node:sqlite').DatabaseSync} db
 */
function mustBeMember(db, podId, userId) {
  try {
    requireMember(db, podId, userId);
  } catch (err) {
    const code =
      err instanceof Error && 'code' in err && typeof err.code === 'string'
        ? err.code
        : 'not_found';
    throw new PodViewError(
      code,
      err instanceof Error ? err.message : 'no such pod',
    );
  }
}

export class PodViewError extends Error {
  /**
   * @param {string} code a contract error code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'PodViewError';
    this.code = code;
  }
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} userId
 * @returns {string[]} pod ids the user has joined and not left
 */
export function listOwnPods(db, userId) {
  return db
    .prepare(
      'SELECT pod_id AS podId FROM pod_membership WHERE user_id = ? AND left_at IS NULL ORDER BY joined_at, pod_id',
    )
    .all(userId)
    .map((/** @type {{ podId: string }} */ r) => r.podId);
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} userId
 */
export function listOwnInvitations(db, userId) {
  return db
    .prepare(
      `SELECT i.invitation_id AS invitationId, i.pod_id AS podId, p.name AS podName,
              i.invited_by AS invitedBy, u.first_name AS invitedByName,
              i.status AS status, i.created_at AS createdAt
         FROM pod_invitation i
         JOIN pod p ON p.pod_id = i.pod_id
         JOIN app_user u ON u.user_id = i.invited_by
        WHERE i.invitee_user_id = ? AND i.status = 'pending'
        ORDER BY i.created_at, i.invitation_id`,
    )
    .all(userId)
    .map((/** @type any */ r) => ({
      invitationId: r.invitationId,
      podId: r.podId,
      podName: r.podName,
      invitedBy: { userId: r.invitedBy, firstName: r.invitedByName },
      status: r.status,
      createdAt: r.createdAt,
    }));
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ podId: string, userId: string, muted: boolean, at: string }} input
 */
export function setOwnPodMute(db, { podId, userId, muted, at }) {
  const now = at ?? new Date().toISOString();
  void now;
  const row = db
    .prepare(
      'SELECT 1 AS one FROM pod_membership WHERE pod_id = ? AND user_id = ? AND left_at IS NULL',
    )
    .get(podId, userId);
  if (!row) throw new PodViewError('not_found', 'no such pod for this member');
  db.prepare(
    'UPDATE pod_membership SET muted = ? WHERE pod_id = ? AND user_id = ?',
  ).run(muted ? 1 : 0, podId, userId);
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ podId: string, userId: string, cadence: string, at: string }} input
 */
export function proposeRhythm(db, { podId, userId, cadence, at }) {
  mustBeMember(db, podId, userId);
  if (!['weekly', 'every_two_weeks', 'monthly'].includes(cadence)) {
    throw new PodViewError('validation_failed', 'unknown cadence');
  }
  const now = at ?? new Date().toISOString();
  const proposalId = newUlid(Date.parse(now));
  db.prepare(
    "INSERT INTO rhythm_proposal (proposal_id, pod_id, cadence, proposed_by, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
  ).run(proposalId, podId, cadence, userId, now);
  db.prepare(
    'INSERT INTO rhythm_acceptance (proposal_id, user_id, accepted_at) VALUES (?, ?, ?)',
  ).run(proposalId, userId, now);
  db.prepare(
    "UPDATE rhythm_proposal SET status = 'superseded' WHERE pod_id = ? AND proposal_id <> ? AND status <> 'superseded'",
  ).run(podId, proposalId);
  return { proposalId, cadence, status: 'open', createdAt: now };
}

function joinedUserIds(db, podId) {
  return db
    .prepare(
      'SELECT user_id AS userId FROM pod_membership WHERE pod_id = ? AND left_at IS NULL',
    )
    .all(podId)
    .map((/** @type {{ userId: string }} */ r) => r.userId);
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ proposalId: string, userId: string, at: string }} input
 */
export function acceptRhythmProposal(db, { proposalId, userId, at }) {
  const now = at ?? new Date().toISOString();
  const proposal = db
    .prepare(
      'SELECT pod_id AS podId, status FROM rhythm_proposal WHERE proposal_id = ?',
    )
    .get(proposalId);
  if (!proposal) throw new PodViewError('not_found', 'no such rhythm proposal');
  mustBeMember(db, proposal.podId, userId);
  if (proposal.status !== 'open')
    throw new PodViewError(
      'validation_failed',
      'only open proposals can be accepted',
    );
  db.prepare(
    'INSERT INTO rhythm_acceptance (proposal_id, user_id, accepted_at) VALUES (?, ?, ?) ON CONFLICT(proposal_id, user_id) DO NOTHING',
  ).run(proposalId, userId, now);
  const accepted = new Set(
    db
      .prepare(
        'SELECT user_id AS userId FROM rhythm_acceptance WHERE proposal_id = ?',
      )
      .all(proposalId)
      .map((/** @type {{ userId: string }} */ r) => r.userId),
  );
  if (joinedUserIds(db, proposal.podId).every((id) => accepted.has(id))) {
    db.prepare(
      "UPDATE rhythm_proposal SET status = 'agreed' WHERE proposal_id = ?",
    ).run(proposalId);
  }
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ podId: string, userId: string }} input
 */
export function listRhythmProposals(db, { podId, userId }) {
  mustBeMember(db, podId, userId);
  const proposals = db
    .prepare(
      'SELECT proposal_id AS proposalId, cadence, proposed_by AS proposedBy, status, created_at AS createdAt FROM rhythm_proposal WHERE pod_id = ? ORDER BY created_at DESC, proposal_id DESC',
    )
    .all(podId);
  const names = new Map(
    db
      .prepare(
        'SELECT user_id AS userId, first_name AS firstName FROM app_user',
      )
      .all()
      .map((/** @type {{ userId: string, firstName: string }} */ r) => [
        r.userId,
        r.firstName,
      ]),
  );
  return proposals.map((/** @type any */ p) => {
    const acceptedBy = db
      .prepare(
        'SELECT user_id AS userId FROM rhythm_acceptance WHERE proposal_id = ? ORDER BY accepted_at, user_id',
      )
      .all(p.proposalId)
      .map((/** @type {{ userId: string }} */ r) => ({
        userId: r.userId,
        firstName: names.get(r.userId) ?? '?',
      }));
    return {
      proposalId: p.proposalId,
      cadence: p.cadence,
      proposedBy: {
        userId: p.proposedBy,
        firstName: names.get(p.proposedBy) ?? '?',
      },
      acceptedBy,
      status: p.status,
      createdAt: p.createdAt,
    };
  });
}

/**
 * The latest agreed cadence, or null when the pod never agreed one.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} podId
 */
export function agreedRhythm(db, podId) {
  const row = db
    .prepare(
      "SELECT cadence, created_at AS agreedAt FROM rhythm_proposal WHERE pod_id = ? AND status = 'agreed' ORDER BY created_at DESC, proposal_id DESC LIMIT 1",
    )
    .get(podId);
  if (!row) return null;
  const days =
    row.cadence === 'weekly' ? 7 : row.cadence === 'every_two_weeks' ? 14 : 30;
  const next = new Date(Date.parse(row.agreedAt) + days * 24 * 60 * 60 * 1000);
  return {
    cadence: row.cadence,
    agreedAt: row.agreedAt,
    nextDate: next.toISOString().slice(0, 10),
  };
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ podId: string, userId: string, label: string, at: string }} input
 */
export function addGroupActivity(db, { podId, userId, label, at }) {
  mustBeMember(db, podId, userId);
  if (
    typeof label !== 'string' ||
    label.trim().length < 1 ||
    label.length > 80
  ) {
    throw new PodViewError(
      'validation_failed',
      'an activity label is 1 to 80 characters',
    );
  }
  const now = at ?? new Date().toISOString();
  const activityId = newUlid(Date.parse(now));
  db.prepare(
    'INSERT INTO group_activity (activity_id, pod_id, label, added_by, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(activityId, podId, label, userId, now);
  return { activityId, label, createdAt: now };
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ podId: string, userId: string }} input
 */
export function listGroupActivities(db, { podId, userId }) {
  mustBeMember(db, podId, userId);
  return db
    .prepare(
      `SELECT g.activity_id AS activityId, g.label AS label, g.added_by AS addedBy,
              u.first_name AS addedByName, g.created_at AS createdAt
         FROM group_activity g JOIN app_user u ON u.user_id = g.added_by
        WHERE g.pod_id = ? ORDER BY g.created_at DESC, g.activity_id DESC`,
    )
    .all(podId)
    .map((/** @type any */ r) => ({
      activityId: r.activityId,
      label: r.label,
      addedBy: { userId: r.addedBy, firstName: r.addedByName },
      createdAt: r.createdAt,
    }));
}

const STAGE_BY_STATE = {
  PLANNING: 'planning',
  STRETCH_ASKS: 'planning',
  ACTIVITY_VOTE: 'poll_open',
  TIME_VOTE: 'poll_open',
  READY_CHECK: 'poll_open',
  AWAITING_CONFIRMATION: 'booking_pending',
  BOOKING: 'booking_pending',
  BOOKED: 'payments_open',
  BALANCES_OPEN: 'payments_open',
};

/**
 * The pod's home-cue stage from its latest hangout. Never reflects a
 * single member: only the hangout state feeds it.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} podId
 */
export function podStageFor(db, podId) {
  const row = db
    .prepare(
      'SELECT state FROM hangout WHERE pod_id = ? ORDER BY created_at DESC, hangout_id DESC LIMIT 1',
    )
    .get(podId);
  if (!row) return 'none';
  return (
    STAGE_BY_STATE[/** @type {keyof typeof STAGE_BY_STATE} */ (row.state)] ??
    'none'
  );
}
