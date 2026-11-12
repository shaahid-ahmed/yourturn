/**
 * Activity shortlist, time poll and ready check (US-008), over the US-002
 * schema, the hangout lifecycle and the US-001 contract shapes.
 *
 * Rules:
 * - **Votes and answers are visible to the pod with names** (Q-013): a poll
 *   view lists each voter's first name; the ready check lists every joined
 *   member's answer.
 * - **Single choice, changeable until close.** A new vote replaces the old one.
 * - **Tie-break:** most votes wins; on a tie, the lower per-person estimate
 *   wins, then the earlier start; time polls use the earlier start. A final
 *   tie goes to the option listed first, so the result is deterministic.
 * - **Closing:** if nobody has voted at the close, the poll is extended once,
 *   then closed. A closed poll with no votes ends in NO_PLAN with a planner
 *   offer card, never a message about who did not vote.
 * - **Ready check:** any number of yeses is enough. Saying yes needs a linked
 *   PayPal account. Zero yeses closes the plan and the planner offers the
 *   next-best option.
 * - **Reminders are private.** A reminder goes to the one member who has not
 *   voted or answered, in their private planner chat and as a push intent. It
 *   never appears in pod chat, and each reminder is sent at most once.
 *
 * Every write runs in one transaction; cards and pushes are delivered after
 * the commit. Jobs take the current time as an argument, so they are
 * deterministic and testable; scheduling them is the server's job.
 */
import { inTransaction } from './db/transaction.mjs';
import { applyHangoutEventInTransaction } from './db/hangout-store.mjs';
import { PodError, requireMember, newUlid } from './pods.mjs';
import {
  NO_PUSH,
  insertPlannerCard,
  deliverPodMessage,
  postPlannerPrivateMessage,
} from './chat.mjs';

/** @typedef {import('node:sqlite').DatabaseSync} DatabaseSync */
/** @typedef {import('./chat.mjs').PodEventBus} PodEventBus */
/** @typedef {import('./chat.mjs').PushPort} PushPort */

export const MAX_OPTIONS = 8;

/**
 * @typedef {object} Candidate
 * @property {string} pollOptionId
 * @property {number} votes
 * @property {number | null} costCents per-person estimate; null for a time slot
 * @property {string | null} startsAt
 */

/**
 * Pick the winner. Pure, so the tie-break is tested on its own.
 *
 * @param {readonly Candidate[]} candidates in the order they were listed
 * @returns {string | null} the winning poll option id, or null if nobody voted
 */
export function pickWinner(candidates) {
  const voted = candidates.filter((c) => c.votes > 0);
  if (voted.length === 0) return null;
  const ranked = voted
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => {
      const x = a.candidate;
      const y = b.candidate;
      if (x.votes !== y.votes) return y.votes - x.votes;
      const cost = (x.costCents ?? 0) - (y.costCents ?? 0);
      if (cost !== 0) return cost;
      // Earlier start first; an option with no start sorts after one with a start.
      if (x.startsAt !== y.startsAt) {
        if (x.startsAt === null) return 1;
        if (y.startsAt === null) return -1;
        return x.startsAt < y.startsAt ? -1 : 1;
      }
      return a.index - b.index;
    });
  return ranked[0].candidate.pollOptionId;
}

/** @param {DatabaseSync} db @param {string} hangoutId */
function readHangout(db, hangoutId) {
  const row =
    /** @type {{ pod_id: string, state: string, version: number } | undefined} */ (
      db
        .prepare(
          'SELECT pod_id, state, version FROM hangout WHERE hangout_id = ?',
        )
        .get(hangoutId)
    );
  if (!row) throw new PodError('not_found', 'no such hangout');
  return row;
}

/** @param {DatabaseSync} db @param {string} podId @param {string} hangoutId */
function requirePodHangout(db, podId, hangoutId) {
  const hangout = readHangout(db, hangoutId);
  if (hangout.pod_id !== podId)
    throw new PodError('not_found', 'no such hangout');
  return hangout;
}

/** @param {string} closesAt @param {string} at */
function assertCloses(closesAt, at) {
  if (typeof closesAt !== 'string' || !(closesAt > at))
    throw new PodError('validation_failed', 'a poll must close in the future', [
      { field: 'closesAt', problem: 'past' },
    ]);
}

/** @param {number} count */
function assertOptionCount(count) {
  if (count < 1 || count > MAX_OPTIONS)
    throw new PodError(
      'validation_failed',
      `a poll has 1 to ${MAX_OPTIONS} options`,
      [{ field: 'options', problem: 'count' }],
    );
}

/**
 * @param {DatabaseSync} db
 * @param {{ podId: string, messageId: string, at: string, bus?: PodEventBus, push?: PushPort }} delivery
 */
function afterCommit(db, { podId, messageId, at, bus, push }) {
  deliverPodMessage(db, {
    podId,
    messageId,
    authorUserId: null,
    at,
    bus,
    push,
  });
}

/**
 * The planner posts the activity shortlist as a poll. PLANNING → ACTIVITY_VOTE.
 *
 * @param {DatabaseSync} db
 * @param {{ hangoutId: string, closesAt: string, at: string,
 *           options: { title: string, venueOrOrganizer: string, startsAt: string | null, perPersonEstimateCents: number, eventId?: string | null }[],
 *           bus?: PodEventBus, push?: PushPort, newId?: () => string }} input
 * @returns {string} the poll id
 */
export function openActivityPoll(db, input) {
  const {
    hangoutId,
    options,
    closesAt,
    at,
    bus,
    push = NO_PUSH,
    newId = () => newUlid(),
  } = input;
  assertOptionCount(options.length);
  assertCloses(closesAt, at);
  for (const option of options)
    if (
      !Number.isInteger(option.perPersonEstimateCents) ||
      option.perPersonEstimateCents < 0
    )
      throw new PodError('validation_failed', 'estimates are integer cents', [
        { field: 'perPersonEstimateCents', problem: 'integer' },
      ]);
  const { pollId, podId, messageId } = inTransaction(db, () => {
    const hangout = readHangout(db, hangoutId);
    applyHangoutEventInTransaction(db, {
      hangoutId,
      event: 'shortlistPosted',
      expectedVersion: hangout.version,
      actorUserId: null,
      at,
    });
    const id = newId();
    db.prepare(
      "INSERT INTO poll (poll_id, hangout_id, kind, status, closes_at) VALUES (?, ?, 'activity', 'open', ?)",
    ).run(id, hangoutId, closesAt);
    const insertOption = db.prepare(
      `INSERT INTO shortlist_option (option_id, hangout_id, title, venue_or_organizer, starts_at, per_person_estimate_cents, event_id, synthetic)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    );
    const insertPollOption = db.prepare(
      'INSERT INTO poll_option (poll_option_id, poll_id, shortlist_option_id) VALUES (?, ?, ?)',
    );
    for (const option of options) {
      const optionId = newId();
      insertOption.run(
        optionId,
        hangoutId,
        option.title,
        option.venueOrOrganizer,
        option.startsAt,
        option.perPersonEstimateCents,
        option.eventId ?? null,
      );
      insertPollOption.run(newId(), id, optionId);
    }
    const message = insertPlannerCard(db, {
      podId: hangout.pod_id,
      card: { cardType: 'activity_shortlist', hangoutId, pollId: id },
      at,
      newId,
    });
    return { pollId: id, podId: hangout.pod_id, messageId: message };
  });
  afterCommit(db, { podId, messageId, at, bus, push });
  return pollId;
}

/**
 * The planner posts the time poll. The hangout must be in TIME_VOTE.
 *
 * @param {DatabaseSync} db
 * @param {{ hangoutId: string, closesAt: string, at: string, slots: { startsAt: string, endsAt: string }[],
 *           bus?: PodEventBus, push?: PushPort, newId?: () => string }} input
 * @returns {string} the poll id
 */
export function openTimePoll(db, input) {
  const {
    hangoutId,
    slots,
    closesAt,
    at,
    bus,
    push = NO_PUSH,
    newId = () => newUlid(),
  } = input;
  assertOptionCount(slots.length);
  assertCloses(closesAt, at);
  const { pollId, podId, messageId } = inTransaction(db, () => {
    const hangout = readHangout(db, hangoutId);
    if (hangout.state !== 'TIME_VOTE')
      throw new PodError(
        'wrong_hangout_state',
        'the activity has not been chosen',
      );
    const id = newId();
    db.prepare(
      "INSERT INTO poll (poll_id, hangout_id, kind, status, closes_at) VALUES (?, ?, 'time', 'open', ?)",
    ).run(id, hangoutId, closesAt);
    const insertSlot = db.prepare(
      'INSERT INTO time_slot (slot_id, hangout_id, starts_at, ends_at) VALUES (?, ?, ?, ?)',
    );
    const insertPollOption = db.prepare(
      'INSERT INTO poll_option (poll_option_id, poll_id, slot_id) VALUES (?, ?, ?)',
    );
    for (const slot of slots) {
      const slotId = newId();
      try {
        insertSlot.run(slotId, hangoutId, slot.startsAt, slot.endsAt);
      } catch {
        throw new PodError('validation_failed', 'a slot ends after it starts', [
          { field: 'slots', problem: 'order' },
        ]);
      }
      insertPollOption.run(newId(), id, slotId);
    }
    const message = insertPlannerCard(db, {
      podId: hangout.pod_id,
      card: { cardType: 'time_poll', hangoutId, pollId: id },
      at,
      newId,
    });
    return { pollId: id, podId: hangout.pod_id, messageId: message };
  });
  afterCommit(db, { podId, messageId, at, bus, push });
  return pollId;
}

/**
 * @typedef {object} PollView the contract Poll shape
 * @property {string} pollId
 * @property {string} hangoutId
 * @property {'activity' | 'time'} kind
 * @property {'open' | 'closed'} status
 * @property {string} closesAt
 * @property {boolean} extendedOnce
 * @property {{ optionId: string, activity?: object, slot?: object, votes: { userId: string, firstName: string, votedAt: string }[] }[]} options
 * @property {string | null} winnerOptionId
 */

/**
 * @param {DatabaseSync} db
 * @param {string} pollId
 * @returns {PollView}
 */
function pollView(db, pollId) {
  const poll = /** @type {any} */ (
    db.prepare('SELECT * FROM poll WHERE poll_id = ?').get(pollId)
  );
  const options = db
    .prepare(
      `SELECT po.poll_option_id, s.option_id, s.title, s.venue_or_organizer, s.starts_at AS s_starts,
              s.per_person_estimate_cents, s.event_id, t.slot_id, t.starts_at AS t_starts, t.ends_at
         FROM poll_option po
         LEFT JOIN shortlist_option s ON s.option_id = po.shortlist_option_id
         LEFT JOIN time_slot t ON t.slot_id = po.slot_id
        WHERE po.poll_id = ? ORDER BY po.rowid`,
    )
    .all(pollId);
  const votes = db.prepare(
    `SELECT v.user_id, u.first_name, v.voted_at FROM poll_vote v JOIN app_user u ON u.user_id = v.user_id
      WHERE v.poll_id = ? AND v.poll_option_id = ? ORDER BY v.voted_at, v.user_id`,
  );
  return {
    pollId,
    hangoutId: poll.hangout_id,
    kind: poll.kind,
    status: poll.status,
    closesAt: poll.closes_at,
    extendedOnce: poll.extended_once === 1,
    options: options.map((o) => ({
      optionId: String(o.poll_option_id),
      ...(o.option_id
        ? {
            activity: {
              optionId: o.option_id,
              title: o.title,
              venueOrOrganizer: o.venue_or_organizer,
              startsAt: o.s_starts,
              perPersonEstimateCents: o.per_person_estimate_cents,
              tags: [],
              eventId: o.event_id,
              synthetic: true,
            },
          }
        : {
            slot: {
              slotId: o.slot_id,
              startsAt: o.t_starts,
              endsAt: o.ends_at,
            },
          }),
      votes: votes.all(pollId, o.poll_option_id).map((v) => ({
        userId: String(v.user_id),
        firstName: String(v.first_name),
        votedAt: String(v.voted_at),
      })),
    })),
    winnerOptionId: poll.winner_option_id,
  };
}

/** @param {DatabaseSync} db @param {string} podId @param {string} hangoutId @param {string} pollId */
function requirePodPoll(db, podId, hangoutId, pollId) {
  requirePodHangout(db, podId, hangoutId);
  const poll =
    /** @type {{ hangout_id: string, status: string, closes_at: string, kind: string } | undefined} */ (
      db
        .prepare(
          'SELECT hangout_id, status, closes_at, kind FROM poll WHERE poll_id = ?',
        )
        .get(pollId)
    );
  if (!poll || poll.hangout_id !== hangoutId)
    throw new PodError('not_found', 'no such poll');
  return poll;
}

/**
 * @param {DatabaseSync} db
 * @param {{ podId: string, hangoutId: string, pollId: string, userId: string }} input
 */
export function getPoll(db, { podId, hangoutId, pollId, userId }) {
  requireMember(db, podId, userId);
  requirePodPoll(db, podId, hangoutId, pollId);
  return pollView(db, pollId);
}

/**
 * Vote, or change a vote, before the poll closes.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, hangoutId: string, pollId: string, userId: string, optionId: string, at: string, bus?: PodEventBus }} input
 */
export function castOwnVote(
  db,
  { podId, hangoutId, pollId, userId, optionId, at, bus },
) {
  inTransaction(db, () => {
    requireMember(db, podId, userId);
    const poll = requirePodPoll(db, podId, hangoutId, pollId);
    if (poll.status !== 'open' || poll.closes_at <= at)
      throw new PodError('poll_closed', 'this poll is closed');
    const option = db
      .prepare(
        'SELECT 1 AS ok FROM poll_option WHERE poll_option_id = ? AND poll_id = ?',
      )
      .get(optionId, pollId);
    if (!option)
      throw new PodError('option_unknown', 'that option is not in this poll');
    db.prepare(
      `INSERT INTO poll_vote (poll_id, user_id, poll_option_id, voted_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET poll_option_id = excluded.poll_option_id, voted_at = excluded.voted_at`,
    ).run(pollId, userId, optionId, at);
  });
  bus?.publish(podId, { type: 'poll.updated', hangoutId, pollId, at });
  return pollView(db, pollId);
}

/**
 * @typedef {object} ReadyCheckView the contract ReadyCheck shape
 * @property {'open' | 'closed'} status
 * @property {string} closesAt
 * @property {{ userId: string, firstName: string, answer: 'yes' | 'no' | 'no_answer' }[]} answers
 * @property {number} yesCount
 */

/** @param {DatabaseSync} db @param {string} hangoutId @param {string} podId @returns {ReadyCheckView} */
function readyCheckView(db, hangoutId, podId) {
  const check = /** @type {any} */ (
    db.prepare('SELECT * FROM ready_check WHERE hangout_id = ?').get(hangoutId)
  );
  if (!check)
    throw new PodError('wrong_hangout_state', 'no ready check is open');
  const answers = db
    .prepare(
      `SELECT m.user_id, u.first_name, coalesce(r.answer, 'no_answer') AS answer
         FROM pod_membership m
         JOIN app_user u ON u.user_id = m.user_id
         LEFT JOIN ready_answer r ON r.hangout_id = ? AND r.user_id = m.user_id
        WHERE m.pod_id = ? AND m.left_at IS NULL
        UNION
       SELECT r.user_id, u.first_name, r.answer
         FROM ready_answer r JOIN app_user u ON u.user_id = r.user_id
        WHERE r.hangout_id = ?
        ORDER BY 1`,
    )
    .all(hangoutId, podId, hangoutId)
    .map((r) => ({
      userId: String(r.user_id),
      firstName: String(r.first_name),
      answer: /** @type {'yes' | 'no' | 'no_answer'} */ (r.answer),
    }));
  return {
    status: check.status,
    closesAt: check.closes_at,
    answers,
    yesCount: answers.filter((a) => a.answer === 'yes').length,
  };
}

/**
 * @param {DatabaseSync} db
 * @param {{ podId: string, hangoutId: string, userId: string }} input
 */
export function getReadyCheck(db, { podId, hangoutId, userId }) {
  requireMember(db, podId, userId);
  requirePodHangout(db, podId, hangoutId);
  return readyCheckView(db, hangoutId, podId);
}

/**
 * Say yes or no. Yes needs a linked PayPal account. A member may change
 * their answer until the ready check closes.
 *
 * @param {DatabaseSync} db
 * @param {{ podId: string, hangoutId: string, userId: string, answer: 'yes' | 'no', at: string, bus?: PodEventBus }} input
 */
export function setOwnReadyAnswer(
  db,
  { podId, hangoutId, userId, answer, at, bus },
) {
  if (answer !== 'yes' && answer !== 'no')
    throw new PodError('validation_failed', 'answer is yes or no', [
      { field: 'answer', problem: 'enum' },
    ]);
  inTransaction(db, () => {
    requireMember(db, podId, userId);
    const hangout = requirePodHangout(db, podId, hangoutId);
    const check =
      /** @type {{ status: string, closes_at: string } | undefined} */ (
        db
          .prepare(
            'SELECT status, closes_at FROM ready_check WHERE hangout_id = ?',
          )
          .get(hangoutId)
      );
    if (
      hangout.state !== 'READY_CHECK' ||
      !check ||
      check.status !== 'open' ||
      check.closes_at <= at
    )
      throw new PodError('wrong_hangout_state', 'the ready check is not open');
    if (answer === 'yes') {
      const link = db
        .prepare(
          "SELECT 1 AS ok FROM paypal_link WHERE user_id = ? AND status = 'linked'",
        )
        .get(userId);
      if (!link)
        throw new PodError(
          'paypal_link_required',
          'link PayPal before saying yes',
        );
    }
    db.prepare(
      `INSERT INTO ready_answer (hangout_id, user_id, answer, answered_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (hangout_id, user_id) DO UPDATE SET answer = excluded.answer, answered_at = excluded.answered_at`,
    ).run(hangoutId, userId, answer, at);
  });
  bus?.publish(podId, { type: 'hangout.updated', hangoutId, at });
  return readyCheckView(db, hangoutId, podId);
}

/**
 * Close every poll and ready check that is due. Run on a schedule.
 *
 * @param {DatabaseSync} db
 * @param {{ at: string, extendByMs: number, readyCheckWindowMs: number, bus?: PodEventBus, push?: PushPort, newId?: () => string }} input
 * @returns {{ extended: string[], closed: string[], readyChecksClosed: string[] }}
 */
export function runPollJobs(db, input) {
  const {
    at,
    extendByMs,
    readyCheckWindowMs,
    bus,
    push = NO_PUSH,
    newId = () => newUlid(),
  } = input;
  /** @type {{ extended: string[], closed: string[], readyChecksClosed: string[] }} */
  const summary = { extended: [], closed: [], readyChecksClosed: [] };
  /** @type {{ podId: string, messageId: string }[]} */
  const cards = [];
  const plus = (/** @type {number} */ ms) =>
    new Date(Date.parse(at) + ms).toISOString();

  const due = db
    .prepare(
      "SELECT poll_id, hangout_id, kind, extended_once FROM poll WHERE status = 'open' AND closes_at <= ? ORDER BY closes_at, poll_id",
    )
    .all(at);
  for (const poll of due) {
    inTransaction(db, () => {
      const pollId = String(poll.poll_id);
      const hangoutId = String(poll.hangout_id);
      const voteCount = Number(
        db
          .prepare('SELECT count(*) AS n FROM poll_vote WHERE poll_id = ?')
          .get(pollId)?.n,
      );
      if (voteCount === 0 && poll.extended_once === 0) {
        db.prepare(
          'UPDATE poll SET closes_at = ?, extended_once = 1 WHERE poll_id = ?',
        ).run(plus(extendByMs), pollId);
        summary.extended.push(pollId);
        return;
      }
      const view = pollView(db, pollId);
      const winner = pickWinner(
        view.options.map((o) => ({
          pollOptionId: o.optionId,
          votes: o.votes.length,
          costCents: o.activity
            ? /** @type {any} */ (o.activity).perPersonEstimateCents
            : null,
          startsAt: o.activity
            ? /** @type {any} */ (o.activity).startsAt
            : /** @type {any} */ (o.slot).startsAt,
        })),
      );
      db.prepare(
        "UPDATE poll SET status = 'closed', winner_option_id = ? WHERE poll_id = ?",
      ).run(winner, pollId);
      const hangout = readHangout(db, hangoutId);
      const isActivity = poll.kind === 'activity';
      const event = winner
        ? isActivity
          ? 'activityChosen'
          : 'timeChosen'
        : isActivity
          ? 'activityPollClosedWithoutVotes'
          : 'timePollClosedWithoutVotes';
      applyHangoutEventInTransaction(db, {
        hangoutId,
        event,
        expectedVersion: hangout.version,
        actorUserId: null,
        at,
      });
      if (winner) {
        const option = /** @type {any} */ (
          db
            .prepare(
              'SELECT shortlist_option_id, slot_id FROM poll_option WHERE poll_option_id = ?',
            )
            .get(winner)
        );
        if (isActivity)
          db.prepare(
            'UPDATE hangout SET chosen_option_id = ? WHERE hangout_id = ?',
          ).run(option.shortlist_option_id, hangoutId);
        else {
          db.prepare(
            'UPDATE hangout SET chosen_slot_id = ? WHERE hangout_id = ?',
          ).run(option.slot_id, hangoutId);
          db.prepare(
            "INSERT INTO ready_check (hangout_id, status, opened_at, closes_at) VALUES (?, 'open', ?, ?)",
          ).run(hangoutId, at, plus(readyCheckWindowMs));
          cards.push({
            podId: hangout.pod_id,
            messageId: insertPlannerCard(db, {
              podId: hangout.pod_id,
              card: { cardType: 'ready_check', hangoutId },
              at,
              newId,
            }),
          });
        }
      } else {
        const offer = isActivity ? 'next_best' : 'widen_window';
        cards.push({
          podId: hangout.pod_id,
          messageId: insertPlannerCard(db, {
            podId: hangout.pod_id,
            card: { cardType: 'planner_offer', hangoutId, offer },
            at,
            newId,
          }),
        });
      }
      summary.closed.push(pollId);
    });
  }

  const checks = db
    .prepare(
      "SELECT r.hangout_id, h.pod_id FROM ready_check r JOIN hangout h ON h.hangout_id = r.hangout_id WHERE r.status = 'open' AND r.closes_at <= ? ORDER BY r.closes_at",
    )
    .all(at);
  for (const check of checks) {
    inTransaction(db, () => {
      const hangoutId = String(check.hangout_id);
      const podId = String(check.pod_id);
      const yesCount = Number(
        db
          .prepare(
            "SELECT count(*) AS n FROM ready_answer WHERE hangout_id = ? AND answer = 'yes'",
          )
          .get(hangoutId)?.n,
      );
      db.prepare(
        "UPDATE ready_check SET status = 'closed' WHERE hangout_id = ?",
      ).run(hangoutId);
      const hangout = readHangout(db, hangoutId);
      const event =
        yesCount > 0 ? 'readyCheckClosedWithYes' : 'readyCheckClosedWithNoYes';
      applyHangoutEventInTransaction(db, {
        hangoutId,
        event,
        expectedVersion: hangout.version,
        actorUserId: null,
        at,
        guards: { yesCount },
      });
      if (yesCount === 0)
        cards.push({
          podId,
          messageId: insertPlannerCard(db, {
            podId,
            card: { cardType: 'planner_offer', hangoutId, offer: 'next_best' },
            at,
            newId,
          }),
        });
      summary.readyChecksClosed.push(hangoutId);
    });
  }
  for (const card of cards) afterCommit(db, { ...card, at, bus, push });
  return summary;
}

/**
 * Send private reminders: to members who have not voted in a poll closing
 * within the window, and to members who have not answered an open ready
 * check. Each reminder is sent once, privately, never in pod chat.
 *
 * @param {DatabaseSync} db
 * @param {{ at: string, windowMs: number, push?: PushPort, newId?: () => string }} input
 * @returns {{ userId: string, reminderKey: string, refId: string }[]} the reminders sent
 */
export function sendDueReminders(
  db,
  { at, windowMs, push = NO_PUSH, newId = () => newUlid() },
) {
  const until = new Date(Date.parse(at) + windowMs).toISOString();
  /** @type {{ userId: string, reminderKey: string, refId: string, kind: string }[]} */
  const due = [];
  for (const row of db
    .prepare(
      `SELECT p.poll_id AS ref, m.user_id FROM poll p
         JOIN hangout h ON h.hangout_id = p.hangout_id
         JOIN pod_membership m ON m.pod_id = h.pod_id AND m.left_at IS NULL
        WHERE p.status = 'open' AND p.closes_at > ? AND p.closes_at <= ?
          AND NOT EXISTS (SELECT 1 FROM poll_vote v WHERE v.poll_id = p.poll_id AND v.user_id = m.user_id)
        ORDER BY p.poll_id, m.user_id`,
    )
    .all(at, until))
    due.push({
      userId: String(row.user_id),
      reminderKey: 'poll_closing',
      refId: String(row.ref),
      kind: 'poll_closing',
    });
  for (const row of db
    .prepare(
      `SELECT r.hangout_id AS ref, m.user_id FROM ready_check r
         JOIN hangout h ON h.hangout_id = r.hangout_id
         JOIN pod_membership m ON m.pod_id = h.pod_id AND m.left_at IS NULL
        WHERE r.status = 'open' AND r.closes_at > ?
          AND NOT EXISTS (SELECT 1 FROM ready_answer a WHERE a.hangout_id = r.hangout_id AND a.user_id = m.user_id)
        ORDER BY r.hangout_id, m.user_id`,
    )
    .all(at))
    due.push({
      userId: String(row.user_id),
      reminderKey: 'ready_check_open',
      refId: String(row.ref),
      kind: 'ready_check_open',
    });

  /** @type {{ userId: string, reminderKey: string, refId: string }[]} */
  const sent = [];
  for (const reminder of due) {
    const fresh = inTransaction(db, () => {
      const inserted = db
        .prepare(
          'INSERT INTO reminder_sent (kind, ref_id, user_id, sent_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
        )
        .run(reminder.kind, reminder.refId, reminder.userId, at);
      if (inserted.changes === 0) return false;
      postPlannerPrivateMessage(db, {
        userId: reminder.userId,
        kind: 'reminder',
        reminderKey: reminder.reminderKey,
        at,
        newId,
      });
      return true;
    });
    if (!fresh) continue;
    const { userId, reminderKey, refId } = reminder;
    push.enqueue({ kind: 'private_reminder', userId, reminderKey, refId });
    sent.push({ userId, reminderKey, refId });
  }
  return sent;
}
