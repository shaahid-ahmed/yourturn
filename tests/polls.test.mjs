// US-008: activity shortlist, time poll, ready check, closing and reminder jobs.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { createHangout } from '../services/api/src/db/hangout-store.mjs';
import { PodError } from '../services/api/src/pods.mjs';
import {
  PodEventBus,
  listPodMessages,
  listOwnPlannerChat,
} from '../services/api/src/chat.mjs';
import {
  pickWinner,
  openActivityPoll,
  openTimePoll,
  getPoll,
  castOwnVote,
  getReadyCheck,
  setOwnReadyAnswer,
  runPollJobs,
  sendDueReminders,
} from '../services/api/src/polls.mjs';

const T0 = '2026-11-12T12:00:00.000Z';
/** @param {number} minutes */
const t = (minutes) =>
  new Date(Date.parse(T0) + minutes * 60_000).toISOString();
const HOUR = 60 * 60_000;
const JOBS = { extendByMs: HOUR, readyCheckWindowMs: HOUR };

/** @param {string} code */
const fails = (code) => (/** @type {any} */ error) =>
  error instanceof PodError && error.code === code;

/** Pod p-a with u-1..u-4 joined (u-4 has no PayPal link); u-9 is outside. */
function setup() {
  const db = openDatabase(':memory:');
  migrate(db);
  const user = db.prepare(
    'INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES (?, ?, ?, 1, ?)',
  );
  for (const i of [1, 2, 3, 4, 9])
    user.run(`u-${i}`, `Synth${i}`, `+155503000${i}`, T0);
  db.prepare(
    "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('p-a', 'Pod A', 'u-1', ?)",
  ).run(T0);
  const member = db.prepare(
    "INSERT INTO pod_membership (pod_id, user_id, role, joined_at) VALUES ('p-a', ?, ?, ?)",
  );
  for (const i of [1, 2, 3, 4])
    member.run(`u-${i}`, i === 1 ? 'creator' : 'member', T0);
  const link = db.prepare(
    "INSERT INTO paypal_link (user_id, status, environment, linked_at) VALUES (?, 'linked', 'sandbox', ?)",
  );
  for (const i of [1, 2, 3]) link.run(`u-${i}`, T0);
  createHangout(db, {
    hangoutId: 'h-1',
    podId: 'p-a',
    actorUserId: 'u-1',
    at: T0,
  });
  /** @type {any[]} */
  const pushes = [];
  return {
    db,
    bus: new PodEventBus(db),
    push: { enqueue: (/** @type {any} */ i) => pushes.push(i) },
    pushes,
  };
}

const SHORTLIST = [
  {
    title: 'Synthetic Lanes',
    venueOrOrganizer: 'Synthetic Bowl Co',
    startsAt: '2026-11-20T23:00:00.000Z',
    perPersonEstimateCents: 3000,
  },
  {
    title: 'Synthetic Noodles',
    venueOrOrganizer: 'Synthetic Kitchen',
    startsAt: '2026-11-20T22:00:00.000Z',
    perPersonEstimateCents: 2500,
  },
  {
    title: 'Synthetic Gallery',
    venueOrOrganizer: 'Synthetic Museum',
    startsAt: null,
    perPersonEstimateCents: 2500,
  },
];

/** @param {import('node:sqlite').DatabaseSync} db */
const state = (db) =>
  db.prepare("SELECT state FROM hangout WHERE hangout_id = 'h-1'").get()?.state;

/** Open the activity poll and return its option ids in order. */
function openShortlist(/** @type {ReturnType<typeof setup>} */ s) {
  const pollId = openActivityPoll(s.db, {
    hangoutId: 'h-1',
    options: SHORTLIST,
    closesAt: t(60),
    at: T0,
    bus: s.bus,
    push: s.push,
  });
  const options = getPoll(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-1',
  }).options.map((o) => o.optionId);
  return { pollId, options };
}

test('tie-break: most votes, then lower cost, then earlier start, then listing order', () => {
  /** @param {string} id @param {number} votes @param {number | null} cost @param {string | null} start */
  const c = (id, votes, cost, start) => ({
    pollOptionId: id,
    votes,
    costCents: cost,
    startsAt: start,
  });
  assert.equal(pickWinner([c('a', 1, 100, null), c('b', 2, 900, null)]), 'b');
  assert.equal(
    pickWinner([
      c('a', 2, 3000, '2026-11-20T20:00Z'),
      c('b', 2, 2500, '2026-11-20T23:00Z'),
    ]),
    'b',
  );
  assert.equal(
    pickWinner([
      c('a', 2, 2500, '2026-11-20T23:00Z'),
      c('b', 2, 2500, '2026-11-20T20:00Z'),
    ]),
    'b',
  );
  assert.equal(
    pickWinner([c('a', 2, 2500, null), c('b', 2, 2500, '2026-11-20T20:00Z')]),
    'b',
    'a dated option beats an undated one',
  );
  assert.equal(
    pickWinner([
      c('a', 2, 2500, '2026-11-20T20:00Z'),
      c('b', 2, 2500, '2026-11-20T20:00Z'),
    ]),
    'a',
  );
  assert.equal(pickWinner([c('a', 0, 100, null), c('b', 0, 50, null)]), null);
  assert.equal(
    pickWinner([
      c('a', 1, null, '2026-11-21T20:00Z'),
      c('b', 1, null, '2026-11-20T20:00Z'),
    ]),
    'b',
    'time polls: earlier start',
  );
});

test('the shortlist opens as a poll with a planner card and moves the hangout to ACTIVITY_VOTE', () => {
  const s = setup();
  const { pollId, options } = openShortlist(s);
  assert.equal(state(s.db), 'ACTIVITY_VOTE');
  assert.equal(options.length, 3);
  const [card] = listPodMessages(s.db, {
    podId: 'p-a',
    userId: 'u-2',
  }).messages;
  assert.deepEqual(card.author, { kind: 'planner' });
  assert.deepEqual(card.card, {
    cardType: 'activity_shortlist',
    hangoutId: 'h-1',
    pollId,
  });
  const poll = getPoll(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-2',
  });
  for (const option of poll.options) {
    assert.equal(/** @type {any} */ (option.activity).synthetic, true);
    for (const key of Object.keys(/** @type {any} */ (option.activity)))
      assert.doesNotMatch(
        key,
        /reason|why|fit|budget|label/i,
        'no card explains itself',
      );
  }
  assert.throws(
    () =>
      openActivityPoll(s.db, {
        hangoutId: 'h-1',
        options: SHORTLIST,
        closesAt: t(60),
        at: T0,
      }),
    (/** @type {any} */ e) => e.code === 'wrong_hangout_state',
  );
  const fresh = setup();
  assert.throws(
    () =>
      openActivityPoll(fresh.db, {
        hangoutId: 'h-1',
        options: [],
        closesAt: t(60),
        at: T0,
      }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      openActivityPoll(fresh.db, {
        hangoutId: 'h-1',
        options: SHORTLIST,
        closesAt: T0,
        at: T0,
      }),
    fails('validation_failed'),
  );
  assert.throws(
    () =>
      openActivityPoll(fresh.db, {
        hangoutId: 'h-1',
        options: [{ ...SHORTLIST[0], perPersonEstimateCents: 25.5 }],
        closesAt: t(60),
        at: T0,
      }),
    fails('validation_failed'),
  );
  assert.equal(state(fresh.db), 'PLANNING', 'a refused poll changes nothing');
});

test('votes are visible with names, single choice, and changeable until close', () => {
  const s = setup();
  const { pollId, options } = openShortlist(s);
  const vote = (
    /** @type {string} */ userId,
    /** @type {number} */ i,
    at = t(1),
  ) =>
    castOwnVote(s.db, {
      podId: 'p-a',
      hangoutId: 'h-1',
      pollId,
      userId,
      optionId: options[i],
      at,
      bus: s.bus,
    });
  vote('u-1', 0);
  vote('u-2', 0);
  let poll = vote('u-2', 1, t(2));
  assert.deepEqual(
    poll.options[0].votes.map((v) => [v.userId, v.firstName]),
    [['u-1', 'Synth1']],
  );
  assert.deepEqual(
    poll.options[1].votes.map((v) => [v.userId, v.firstName]),
    [['u-2', 'Synth2']],
  );
  assert.equal(
    poll.options.flatMap((o) => o.votes).length,
    2,
    'one vote per member',
  );
  assert.throws(() => vote('u-9', 0), fails('not_found'));
  assert.throws(
    () =>
      castOwnVote(s.db, {
        podId: 'p-a',
        hangoutId: 'h-1',
        pollId,
        userId: 'u-1',
        optionId: 'not-an-option',
        at: t(3),
      }),
    fails('option_unknown'),
  );
  assert.throws(() => vote('u-3', 0, t(60)), fails('poll_closed'));
  assert.throws(
    () =>
      getPoll(s.db, { podId: 'p-a', hangoutId: 'h-1', pollId, userId: 'u-9' }),
    fails('not_found'),
  );
  assert.throws(
    () =>
      getPoll(s.db, {
        podId: 'p-a',
        hangoutId: 'h-1',
        pollId: 'nope',
        userId: 'u-1',
      }),
    fails('not_found'),
  );
});

test('closing the activity poll picks the winner with the tie-break and moves to TIME_VOTE', () => {
  const s = setup();
  const { pollId, options } = openShortlist(s);
  // One vote each for Lanes ($30) and Noodles ($25): Noodles wins on cost.
  castOwnVote(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-1',
    optionId: options[0],
    at: t(1),
  });
  castOwnVote(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-2',
    optionId: options[1],
    at: t(1),
  });
  assert.deepEqual(
    runPollJobs(s.db, { at: t(59), ...JOBS }),
    { extended: [], closed: [], readyChecksClosed: [] },
    'not due yet',
  );
  const summary = runPollJobs(s.db, { at: t(60), ...JOBS });
  assert.deepEqual(summary.closed, [pollId]);
  const poll = getPoll(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-1',
  });
  assert.equal(poll.status, 'closed');
  assert.equal(poll.winnerOptionId, options[1]);
  assert.equal(state(s.db), 'TIME_VOTE');
  assert.equal(
    s.db
      .prepare(
        "SELECT o.title FROM hangout h JOIN shortlist_option o ON o.option_id = h.chosen_option_id WHERE h.hangout_id = 'h-1'",
      )
      .get()?.title,
    'Synthetic Noodles',
  );
  assert.deepEqual(
    runPollJobs(s.db, { at: t(61), ...JOBS }).closed,
    [],
    'a closed poll is not closed twice',
  );
});

test('nobody votes: extend once, then close into NO_PLAN with a planner offer', () => {
  const s = setup();
  const { pollId } = openShortlist(s);
  assert.deepEqual(runPollJobs(s.db, { at: t(60), ...JOBS }).extended, [
    pollId,
  ]);
  const extended = getPoll(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-1',
  });
  assert.equal(extended.status, 'open');
  assert.equal(extended.extendedOnce, true);
  assert.equal(extended.closesAt, t(120));
  assert.deepEqual(runPollJobs(s.db, { at: t(120), ...JOBS }).closed, [pollId]);
  assert.equal(state(s.db), 'NO_PLAN');
  const [offer] = listPodMessages(s.db, {
    podId: 'p-a',
    userId: 'u-1',
  }).messages;
  assert.deepEqual(offer.card, {
    cardType: 'planner_offer',
    hangoutId: 'h-1',
    offer: 'next_best',
  });
  const all = JSON.stringify(
    listPodMessages(s.db, { podId: 'p-a', userId: 'u-1' }),
  );
  assert.doesNotMatch(
    all,
    /u-[0-9]+"[^}]*did not|Synth[0-9]/,
    'no call-out of who did not vote',
  );
});

/** Walk to READY_CHECK: activity chosen, time poll opened and closed. */
function toReadyCheck() {
  const s = setup();
  const { pollId, options } = openShortlist(s);
  castOwnVote(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-1',
    optionId: options[0],
    at: t(1),
  });
  runPollJobs(s.db, { at: t(60), ...JOBS });
  assert.throws(
    () =>
      openTimePoll(s.db, {
        hangoutId: 'h-1',
        slots: [{ startsAt: t(200), endsAt: t(100) }],
        closesAt: t(120),
        at: t(60),
      }),
    fails('validation_failed'),
  );
  const timePoll = openTimePoll(s.db, {
    hangoutId: 'h-1',
    closesAt: t(120),
    at: t(60),
    bus: s.bus,
    push: s.push,
    slots: [
      {
        startsAt: '2026-11-21T00:00:00.000Z',
        endsAt: '2026-11-21T02:00:00.000Z',
      },
      {
        startsAt: '2026-11-20T23:00:00.000Z',
        endsAt: '2026-11-21T01:00:00.000Z',
      },
    ],
  });
  const slots = getPoll(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId: timePoll,
    userId: 'u-1',
  }).options.map((o) => o.optionId);
  castOwnVote(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId: timePoll,
    userId: 'u-1',
    optionId: slots[0],
    at: t(61),
  });
  castOwnVote(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId: timePoll,
    userId: 'u-2',
    optionId: slots[1],
    at: t(61),
  });
  runPollJobs(s.db, { at: t(120), ...JOBS, bus: s.bus, push: s.push });
  return { ...s, timePoll, slots };
}

test('the time poll breaks a tie on the earlier start and opens the ready check', () => {
  const s = toReadyCheck();
  assert.equal(
    getPoll(s.db, {
      podId: 'p-a',
      hangoutId: 'h-1',
      pollId: s.timePoll,
      userId: 'u-1',
    }).winnerOptionId,
    s.slots[1],
  );
  assert.equal(state(s.db), 'READY_CHECK');
  const check = getReadyCheck(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-2',
  });
  assert.equal(check.status, 'open');
  assert.equal(check.closesAt, t(180));
  assert.deepEqual(
    check.answers.map((a) => a.answer),
    ['no_answer', 'no_answer', 'no_answer', 'no_answer'],
  );
  assert.equal(
    listPodMessages(s.db, { podId: 'p-a', userId: 'u-1' }).messages[0].card
      ?.cardType,
    'ready_check',
  );
});

test('ready check: answers are named, yes needs PayPal, one yes is enough', () => {
  const s = toReadyCheck();
  const answer = (
    /** @type {string} */ userId,
    /** @type {'yes' | 'no'} */ value,
    at = t(130),
  ) =>
    setOwnReadyAnswer(s.db, {
      podId: 'p-a',
      hangoutId: 'h-1',
      userId,
      answer: value,
      at,
      bus: s.bus,
    });
  assert.throws(() => answer('u-4', 'yes'), fails('paypal_link_required'));
  answer('u-4', 'no');
  answer('u-2', 'no');
  answer('u-3', 'no');
  let check = answer('u-1', 'yes');
  assert.deepEqual(
    check.answers.map((a) => [a.userId, a.firstName, a.answer]),
    [
      ['u-1', 'Synth1', 'yes'],
      ['u-2', 'Synth2', 'no'],
      ['u-3', 'Synth3', 'no'],
      ['u-4', 'Synth4', 'no'],
    ],
  );
  assert.equal(check.yesCount, 1);
  check = answer('u-2', 'yes', t(131));
  assert.equal(check.yesCount, 2, 'an answer can change until close');
  assert.throws(() => answer('u-9', 'yes'), fails('not_found'));
  assert.throws(
    () =>
      setOwnReadyAnswer(s.db, {
        podId: 'p-a',
        hangoutId: 'h-1',
        userId: 'u-1',
        answer: /** @type {any} */ ('maybe'),
        at: t(130),
      }),
    fails('validation_failed'),
  );
  assert.throws(
    () => answer('u-3', 'yes', t(180)),
    fails('wrong_hangout_state'),
    'closed at its closing time',
  );
  assert.deepEqual(
    runPollJobs(s.db, { at: t(180), ...JOBS }).readyChecksClosed,
    ['h-1'],
  );
  assert.equal(
    state(s.db),
    'AWAITING_CONFIRMATION',
    'three noes do not stop the plan',
  );
  assert.throws(
    () => answer('u-3', 'yes', t(181)),
    fails('wrong_hangout_state'),
  );
});

test('nobody says yes: the plan closes and the planner offers the next-best option', () => {
  const s = toReadyCheck();
  setOwnReadyAnswer(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-1',
    answer: 'no',
    at: t(130),
  });
  runPollJobs(s.db, { at: t(180), ...JOBS });
  assert.equal(state(s.db), 'NO_PLAN');
  assert.deepEqual(
    listPodMessages(s.db, { podId: 'p-a', userId: 'u-1' }).messages[0].card,
    { cardType: 'planner_offer', hangoutId: 'h-1', offer: 'next_best' },
  );
});

test('reminders go privately, once, only to members who have not voted or answered', () => {
  const s = setup();
  const { pollId, options } = openShortlist(s);
  castOwnVote(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-1',
    optionId: options[0],
    at: t(1),
  });
  const podBefore = JSON.stringify(
    listPodMessages(s.db, { podId: 'p-a', userId: 'u-1' }),
  );
  assert.deepEqual(
    sendDueReminders(s.db, { at: t(10), windowMs: 30 * 60_000, push: s.push }),
    [],
    'not closing soon yet',
  );
  const sent = sendDueReminders(s.db, {
    at: t(40),
    windowMs: 30 * 60_000,
    push: s.push,
  });
  assert.deepEqual(
    sent.map((r) => r.userId),
    ['u-2', 'u-3', 'u-4'],
  );
  assert.ok(
    sent.every((r) => r.reminderKey === 'poll_closing' && r.refId === pollId),
  );
  assert.deepEqual(
    sendDueReminders(s.db, { at: t(41), windowMs: 30 * 60_000, push: s.push }),
    [],
    'never twice',
  );
  assert.equal(
    JSON.stringify(listPodMessages(s.db, { podId: 'p-a', userId: 'u-1' })),
    podBefore,
    'nothing in pod chat',
  );
  assert.deepEqual(
    listOwnPlannerChat(s.db, { userId: 'u-2' }).messages.map(
      (m) => m.reminderKey,
    ),
    ['poll_closing'],
  );
  assert.deepEqual(
    listOwnPlannerChat(s.db, { userId: 'u-1' }).messages,
    [],
    'the voter gets nothing',
  );
  const reminders = s.pushes.filter((p) => p.kind === 'private_reminder');
  assert.equal(reminders.length, 3);
  for (const r of reminders)
    assert.deepEqual(Object.keys(r).sort(), [
      'kind',
      'refId',
      'reminderKey',
      'userId',
    ]);

  const r = toReadyCheck();
  setOwnReadyAnswer(r.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    userId: 'u-1',
    answer: 'yes',
    at: t(121),
  });
  const ready = sendDueReminders(r.db, {
    at: t(125),
    windowMs: 30 * 60_000,
    push: r.push,
  });
  assert.deepEqual(
    ready
      .filter((x) => x.reminderKey === 'ready_check_open')
      .map((x) => x.userId),
    ['u-2', 'u-3', 'u-4'],
  );
});

test('a refused job step changes nothing and the stream carries pointers only', () => {
  const s = setup();
  /** @type {any[]} */ const events = [];
  s.bus.subscribe({ podId: 'p-a', userId: 'u-2' }, (e) => events.push(e));
  const { pollId, options } = openShortlist(s);
  castOwnVote(s.db, {
    podId: 'p-a',
    hangoutId: 'h-1',
    pollId,
    userId: 'u-1',
    optionId: options[0],
    at: t(1),
    bus: s.bus,
  });
  assert.deepEqual(
    events.map((e) => e.type),
    ['message.created', 'poll.updated'],
  );
  for (const e of events)
    assert.ok(
      !JSON.stringify(e).includes('Synthetic'),
      'no option content in events',
    );
});
