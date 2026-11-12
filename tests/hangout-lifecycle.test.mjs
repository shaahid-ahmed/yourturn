// US-002: the hangout lifecycle matches the US-001 contract exactly. Every
// state x event pair is checked: the allowed ones succeed, all others refuse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  HANGOUT_STATES,
  HANGOUT_EVENTS,
  TRANSITIONS,
  TERMINAL_STATES,
  RESTING_STATES,
  OFFERS,
  IllegalTransitionError,
  transition,
  isTerminal,
  isActive,
  podStage,
} from '../services/api/src/hangout-lifecycle.mjs';
import { HANGOUT_STATES as SCHEMA_STATES } from '../services/api/src/db/migrations.mjs';
import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import {
  createHangout,
  applyHangoutEvent,
  StaleHangoutError,
} from '../services/api/src/db/hangout-store.mjs';

const contract = JSON.parse(
  readFileSync(
    new URL('../docs/03-architecture/openapi.json', import.meta.url),
    'utf8',
  ),
);

/** The full allowed table, written out so a change to it is a visible diff. */
const EXPECTED = {
  PLANNING: {
    stretchAsksSent: 'STRETCH_ASKS',
    shortlistPosted: 'ACTIVITY_VOTE',
    noOptionFits: 'NO_PLAN',
  },
  STRETCH_ASKS: { stretchAsksResolved: 'PLANNING' },
  ACTIVITY_VOTE: {
    activityChosen: 'TIME_VOTE',
    activityPollClosedWithoutVotes: 'NO_PLAN',
  },
  TIME_VOTE: {
    timeChosen: 'READY_CHECK',
    timePollClosedWithoutVotes: 'NO_PLAN',
    noSlotFits: 'NO_PLAN',
  },
  READY_CHECK: {
    readyCheckClosedWithYes: 'AWAITING_CONFIRMATION',
    readyCheckClosedWithNoYes: 'NO_PLAN',
  },
  AWAITING_CONFIRMATION: { bookingConfirmed: 'BOOKING' },
  BOOKING: { bookingSucceeded: 'BOOKED', bookingFailed: 'BOOKING_FAILED' },
  BOOKED: { splitConfirmed: 'BALANCES_OPEN' },
  BALANCES_OPEN: { allBalancesPaid: 'SETTLED' },
  SETTLED: {},
  NO_PLAN: { plannerOfferAccepted: 'PLANNING' },
  BOOKING_FAILED: { plannerOfferAccepted: 'PLANNING' },
};

/** Guards that satisfy each event, so the table test isolates the table. */
const PASSING_GUARDS = {
  readyCheckClosedWithYes: { yesCount: 2 },
  readyCheckClosedWithNoYes: { yesCount: 0 },
  bookingConfirmed: { payerChosen: true, actorIsPayer: true },
  splitConfirmed: { actorIsPayer: true },
  plannerOfferAccepted: { offer: 'next_best' },
};

/** @param {string} event */
const guardsFor = (event) =>
  /** @type {Record<string, any>} */ (PASSING_GUARDS)[event] ?? {};

test('states are exactly the contract and schema list', () => {
  assert.deepEqual(
    HANGOUT_STATES,
    contract.components.schemas.HangoutState.enum,
  );
  assert.deepEqual(SCHEMA_STATES, HANGOUT_STATES);
  assert.deepEqual(Object.keys(TRANSITIONS), HANGOUT_STATES);
  for (const retired of [
    'DRAFT',
    'PROPOSED',
    'COMMITTING',
    'SETTLING',
    'VOIDING',
    'CONFIRMED',
    'NOT_HAPPENING',
    'SETTLEMENT_FAILED',
    'COMPLETED',
  ])
    assert.ok(!HANGOUT_STATES.includes(retired), retired);
});

test('the transition table is exactly the expected one', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(TRANSITIONS)), EXPECTED);
  for (const target of Object.values(TRANSITIONS).flatMap(Object.values))
    assert.ok(HANGOUT_STATES.includes(target), target);
});

test('every allowed transition succeeds, and every other state x event pair is refused', () => {
  let allowed = 0;
  let refused = 0;
  for (const state of HANGOUT_STATES) {
    for (const event of HANGOUT_EVENTS) {
      const expected = /** @type {Record<string, Record<string, string>>} */ (
        EXPECTED
      )[state][event];
      if (expected) {
        assert.equal(
          transition(state, event, guardsFor(event)),
          expected,
          `${state} --${event}`,
        );
        allowed += 1;
      } else {
        assert.throws(
          () => transition(state, event, guardsFor(event)),
          (/** @type {any} */ error) =>
            error instanceof IllegalTransitionError &&
            error.code === 'wrong_hangout_state',
          `${state} --${event} must be refused`,
        );
        refused += 1;
      }
    }
  }
  assert.equal(allowed, 18);
  assert.equal(refused, HANGOUT_STATES.length * HANGOUT_EVENTS.length - 18);
  assert.throws(
    () => transition('COMMITTING', 'shortlistPosted'),
    /not a hangout state/,
  );
  assert.throws(
    () => transition('PLANNING', 'captureAll'),
    IllegalTransitionError,
  );
});

test('any number of yeses is enough; only zero yeses closes the plan', () => {
  assert.equal(
    transition('READY_CHECK', 'readyCheckClosedWithYes', { yesCount: 1 }),
    'AWAITING_CONFIRMATION',
  );
  assert.equal(
    transition('READY_CHECK', 'readyCheckClosedWithYes', { yesCount: 8 }),
    'AWAITING_CONFIRMATION',
  );
  assert.throws(
    () => transition('READY_CHECK', 'readyCheckClosedWithYes', { yesCount: 0 }),
    /nobody said yes/,
  );
  assert.equal(
    transition('READY_CHECK', 'readyCheckClosedWithNoYes', { yesCount: 0 }),
    'NO_PLAN',
  );
  assert.throws(
    () =>
      transition('READY_CHECK', 'readyCheckClosedWithNoYes', { yesCount: 3 }),
    /goes ahead/,
  );
  for (const bad of [{}, { yesCount: -1 }, { yesCount: 1.5 }])
    assert.throws(
      () => transition('READY_CHECK', 'readyCheckClosedWithYes', bad),
      TypeError,
    );
  // A "no" is not an event at all: there is no transition for a single decline.
  assert.ok(!HANGOUT_EVENTS.some((event) => /declin/i.test(event)));
});

test('only the payer confirms the booking and the split (Q-011.6 default)', () => {
  assert.equal(
    transition('AWAITING_CONFIRMATION', 'bookingConfirmed', {
      payerChosen: true,
      actorIsPayer: true,
    }),
    'BOOKING',
  );
  assert.throws(
    () =>
      transition('AWAITING_CONFIRMATION', 'bookingConfirmed', {
        payerChosen: true,
        actorIsPayer: false,
      }),
    (/** @type {any} */ e) => e.code === 'not_payer',
  );
  assert.throws(
    () =>
      transition('AWAITING_CONFIRMATION', 'bookingConfirmed', {
        payerChosen: false,
        actorIsPayer: true,
      }),
    /no payer has volunteered/,
  );
  assert.throws(
    () => transition('AWAITING_CONFIRMATION', 'bookingConfirmed'),
    /no payer/,
  );
  assert.equal(
    transition('BOOKED', 'splitConfirmed', { actorIsPayer: true }),
    'BALANCES_OPEN',
  );
  assert.throws(
    () => transition('BOOKED', 'splitConfirmed', { actorIsPayer: false }),
    (/** @type {any} */ e) => e.code === 'not_payer',
  );
  // There is no host role anywhere in the lifecycle.
  assert.ok(!HANGOUT_EVENTS.some((event) => /host/i.test(event)));
});

test('dead ends offer a way back with the contract planner offers', () => {
  assert.deepEqual(TERMINAL_STATES, ['SETTLED']);
  assert.deepEqual(RESTING_STATES, ['NO_PLAN', 'BOOKING_FAILED']);
  const replan = contract.components.schemas.ReplanRequest.properties.kind.enum;
  for (const offer of replan)
    assert.equal(
      transition('NO_PLAN', 'plannerOfferAccepted', { offer }),
      'PLANNING',
    );
  assert.deepEqual(OFFERS.NO_PLAN, replan);
  assert.equal(
    transition('BOOKING_FAILED', 'plannerOfferAccepted', {
      offer: 'next_best',
    }),
    'PLANNING',
  );
  for (const offer of [
    'widen_window',
    'widen_area',
    'retry_booking',
    undefined,
  ])
    assert.throws(
      () => transition('BOOKING_FAILED', 'plannerOfferAccepted', { offer }),
      IllegalTransitionError,
    );
});

test('terminal, active and pod stage are derived from the state alone', () => {
  for (const state of HANGOUT_STATES) {
    assert.equal(isTerminal(state), state === 'SETTLED', state);
    assert.equal(
      isActive(state),
      !['SETTLED', 'NO_PLAN', 'BOOKING_FAILED'].includes(state),
      state,
    );
  }
  assert.throws(() => isTerminal('VOIDING'), /not a hangout state/);
  assert.throws(() => isActive('VOIDING'), /not a hangout state/);
  const stages = contract.components.schemas.PodStage.enum;
  const expected = {
    PLANNING: 'planning',
    STRETCH_ASKS: 'planning',
    ACTIVITY_VOTE: 'poll_open',
    TIME_VOTE: 'poll_open',
    READY_CHECK: 'poll_open',
    AWAITING_CONFIRMATION: 'booking_pending',
    BOOKING: 'booking_pending',
    BOOKED: 'payments_open',
    BALANCES_OPEN: 'payments_open',
    SETTLED: 'none',
    NO_PLAN: 'none',
    BOOKING_FAILED: 'none',
  };
  for (const state of HANGOUT_STATES) {
    const stage = podStage(state);
    assert.equal(
      stage,
      /** @type {Record<string, string>} */ (expected)[state],
      state,
    );
    assert.ok(stages.includes(stage));
  }
  assert.equal(podStage(null), 'none');
  assert.throws(() => podStage('VOIDING'), /not a hangout state/);
});

/** A migrated in-memory database with one synthetic pod. */
function store() {
  const db = openDatabase(':memory:');
  migrate(db);
  const at = '2026-11-12T12:00:00.000Z';
  db.prepare(
    "INSERT INTO app_user (user_id, first_name, phone, synthetic, created_at) VALUES ('u-ada', 'Ada', '+15550000001', 1, ?)",
  ).run(at);
  db.prepare(
    "INSERT INTO pod (pod_id, name, creator_user_id, created_at) VALUES ('p-1', 'Synthetic Pod', 'u-ada', ?)",
  ).run(at);
  createHangout(db, {
    hangoutId: 'h-1',
    podId: 'p-1',
    actorUserId: 'u-ada',
    at,
  });
  return { db, at };
}

/** @param {import('node:sqlite').DatabaseSync} db */
const history = (db) =>
  db
    .prepare(
      "SELECT seq, from_state, to_state, event FROM hangout_transition WHERE hangout_id = 'h-1' ORDER BY seq",
    )
    .all()
    .map((row) => ({ ...row }));

test('a durable hangout walks the happy path and records every step', () => {
  const { db, at } = store();
  const path = [
    ['shortlistPosted'],
    ['activityChosen'],
    ['timeChosen'],
    ['readyCheckClosedWithYes', { yesCount: 3 }],
    ['bookingConfirmed', { payerChosen: true, actorIsPayer: true }],
    ['bookingSucceeded'],
    ['splitConfirmed', { actorIsPayer: true }],
    ['allBalancesPaid'],
  ];
  let version = 1;
  for (const [event, guards] of path) {
    const result = applyHangoutEvent(db, {
      hangoutId: 'h-1',
      event: /** @type {string} */ (event),
      expectedVersion: version,
      actorUserId: 'u-ada',
      at,
      guards: /** @type {any} */ (guards),
    });
    version += 1;
    assert.equal(result.version, version);
  }
  assert.deepEqual(
    {
      ...db
        .prepare("SELECT state, version FROM hangout WHERE hangout_id = 'h-1'")
        .get(),
    },
    { state: 'SETTLED', version: 9 },
  );
  const steps = history(db);
  assert.equal(steps.length, 9);
  assert.deepEqual(steps[0], {
    seq: 1,
    from_state: null,
    to_state: 'PLANNING',
    event: 'started',
  });
  assert.deepEqual(steps.at(-1), {
    seq: 9,
    from_state: 'BALANCES_OPEN',
    to_state: 'SETTLED',
    event: 'allBalancesPaid',
  });
  db.close();
});

test('a refused or stale event changes nothing', () => {
  const { db, at } = store();
  const before = history(db);
  assert.throws(
    () =>
      applyHangoutEvent(db, {
        hangoutId: 'h-1',
        event: 'bookingConfirmed',
        expectedVersion: 1,
        actorUserId: 'u-ada',
        at,
      }),
    IllegalTransitionError,
  );
  applyHangoutEvent(db, {
    hangoutId: 'h-1',
    event: 'shortlistPosted',
    expectedVersion: 1,
    actorUserId: 'u-ada',
    at,
  });
  // A second writer still holding version 1 loses.
  assert.throws(
    () =>
      applyHangoutEvent(db, {
        hangoutId: 'h-1',
        event: 'activityPollClosedWithoutVotes',
        expectedVersion: 1,
        actorUserId: 'u-ada',
        at,
      }),
    StaleHangoutError,
  );
  assert.equal(history(db).length, before.length + 1);
  assert.equal(
    db.prepare("SELECT state FROM hangout WHERE hangout_id = 'h-1'").get()
      ?.state,
    'ACTIVITY_VOTE',
  );
  assert.throws(
    () =>
      applyHangoutEvent(db, {
        hangoutId: 'nope',
        event: 'shortlistPosted',
        expectedVersion: 1,
        actorUserId: null,
        at,
      }),
    /no hangout/,
  );
  db.close();
});
