/**
 * The Unspoken hangout lifecycle (US-002), matching the US-001 contract
 * (openapi.json 0.2.0-draft, HangoutState) and ADR 0007.
 *
 * This is a new module beside the ADR 0006 `hangout.mjs`, which is retired and
 * left unchanged. Three rules from the spec shape the table:
 *
 * - **Any number of yeses is enough.** A ready check moves on with one yes or
 *   more; only zero yeses closes the plan. A "no" never ends the plan.
 * - **Dead ends offer a way back.** NO_PLAN and BOOKING_FAILED are resting
 *   states, not terminal ones: the planner offers to widen the window or area,
 *   or to try the next-best plan, and accepting returns to PLANNING.
 * - **Only the payer confirms.** Confirming the booking and the split need the
 *   actor to be the payer (Q-011.6 default; see the contract's x-open-decision).
 *
 * The planner (AI) never calls this. Every event is a member action or a
 * deterministic server job.
 */

/** The ADR 0007 states, in the contract's order. */
export const HANGOUT_STATES = Object.freeze([
  'PLANNING',
  'STRETCH_ASKS',
  'ACTIVITY_VOTE',
  'TIME_VOTE',
  'READY_CHECK',
  'AWAITING_CONFIRMATION',
  'BOOKING',
  'BOOKED',
  'BALANCES_OPEN',
  'SETTLED',
  'NO_PLAN',
  'BOOKING_FAILED',
]);

/** Nothing further happens. */
export const TERMINAL_STATES = Object.freeze(['SETTLED']);

/** No active plan: a new hangout may start, or a planner offer may be accepted. */
export const RESTING_STATES = Object.freeze(['NO_PLAN', 'BOOKING_FAILED']);

/** @type {Readonly<Record<string, Readonly<Record<string, string>>>>} */
export const TRANSITIONS = Object.freeze({
  PLANNING: Object.freeze({
    stretchAsksSent: 'STRETCH_ASKS',
    shortlistPosted: 'ACTIVITY_VOTE',
    noOptionFits: 'NO_PLAN',
  }),
  // Answers and expiries are private; the pod only sees planning continue.
  STRETCH_ASKS: Object.freeze({ stretchAsksResolved: 'PLANNING' }),
  ACTIVITY_VOTE: Object.freeze({
    activityChosen: 'TIME_VOTE',
    activityPollClosedWithoutVotes: 'NO_PLAN',
  }),
  TIME_VOTE: Object.freeze({
    timeChosen: 'READY_CHECK',
    timePollClosedWithoutVotes: 'NO_PLAN',
    noSlotFits: 'NO_PLAN',
  }),
  READY_CHECK: Object.freeze({
    readyCheckClosedWithYes: 'AWAITING_CONFIRMATION',
    readyCheckClosedWithNoYes: 'NO_PLAN',
  }),
  AWAITING_CONFIRMATION: Object.freeze({ bookingConfirmed: 'BOOKING' }),
  BOOKING: Object.freeze({
    bookingSucceeded: 'BOOKED',
    bookingFailed: 'BOOKING_FAILED',
  }),
  BOOKED: Object.freeze({ splitConfirmed: 'BALANCES_OPEN' }),
  BALANCES_OPEN: Object.freeze({ allBalancesPaid: 'SETTLED' }),
  SETTLED: Object.freeze({}),
  NO_PLAN: Object.freeze({ plannerOfferAccepted: 'PLANNING' }),
  BOOKING_FAILED: Object.freeze({ plannerOfferAccepted: 'PLANNING' }),
});

/** Every event name the table knows. */
export const HANGOUT_EVENTS = Object.freeze([
  ...new Set(
    Object.values(TRANSITIONS).flatMap((events) => Object.keys(events)),
  ),
]);

/** Which planner offers each resting state may accept (contract ReplanRequest). */
export const OFFERS = Object.freeze({
  NO_PLAN: Object.freeze(['widen_window', 'widen_area', 'next_best']),
  BOOKING_FAILED: Object.freeze(['next_best']),
});

/**
 * @typedef {object} Guards
 * @property {number} [yesCount] ready-check yeses, for the two ready-check events
 * @property {boolean} [payerChosen] a payer has volunteered
 * @property {boolean} [actorIsPayer] the member causing the event is the payer
 * @property {string} [offer] the accepted planner offer
 */

export class IllegalTransitionError extends RangeError {
  /**
   * @param {string} message
   * @param {string} code a contract error code
   */
  constructor(message, code) {
    super(message);
    this.name = 'IllegalTransitionError';
    this.code = code;
  }
}

/**
 * @param {string} state
 * @param {string} event
 * @param {Guards} [guards]
 * @returns {string} the next state
 */
export function transition(state, event, guards = {}) {
  const allowed = TRANSITIONS[state];
  if (!allowed) throw new RangeError(`${state} is not a hangout state`);
  const next = allowed[event];
  if (!next) {
    throw new IllegalTransitionError(
      `a hangout in ${state} cannot ${event}; legal events are ${Object.keys(allowed).join(', ') || 'none'}`,
      'wrong_hangout_state',
    );
  }
  checkGuards(state, event, guards);
  return next;
}

/**
 * @param {string} state
 * @param {string} event
 * @param {Guards} guards
 */
function checkGuards(state, event, guards) {
  if (
    event === 'readyCheckClosedWithYes' ||
    event === 'readyCheckClosedWithNoYes'
  ) {
    const { yesCount } = guards;
    if (!Number.isInteger(yesCount) || /** @type {number} */ (yesCount) < 0)
      throw new TypeError(`${event} needs a non-negative integer yesCount`);
    if (event === 'readyCheckClosedWithYes' && yesCount === 0)
      throw new IllegalTransitionError(
        'nobody said yes',
        'wrong_hangout_state',
      );
    if (
      event === 'readyCheckClosedWithNoYes' &&
      /** @type {number} */ (yesCount) > 0
    )
      throw new IllegalTransitionError(
        'at least one member said yes, so the plan goes ahead',
        'wrong_hangout_state',
      );
  }
  if (event === 'bookingConfirmed') {
    if (guards.payerChosen !== true)
      throw new IllegalTransitionError(
        'no payer has volunteered yet',
        'wrong_hangout_state',
      );
    if (guards.actorIsPayer !== true)
      throw new IllegalTransitionError(
        'only the payer may confirm the booking',
        'not_payer',
      );
  }
  if (event === 'splitConfirmed' && guards.actorIsPayer !== true)
    throw new IllegalTransitionError(
      'only the payer may confirm the split',
      'not_payer',
    );
  if (event === 'plannerOfferAccepted') {
    const offers = /** @type {Record<string, readonly string[]>} */ (OFFERS)[
      state
    ];
    if (!guards.offer || !offers.includes(guards.offer))
      throw new IllegalTransitionError(
        `${state} offers ${offers.join(', ')}, not ${guards.offer ?? 'nothing'}`,
        'wrong_hangout_state',
      );
  }
}

/** @param {string} state */
function assertState(state) {
  if (!HANGOUT_STATES.includes(state))
    throw new RangeError(`${state} is not a hangout state`);
}

/** @param {string} state */
export function isTerminal(state) {
  assertState(state);
  return TERMINAL_STATES.includes(state);
}

/**
 * True while a hangout holds the pod's plan, so a new one may not start.
 * @param {string} state
 */
export function isActive(state) {
  assertState(state);
  return !TERMINAL_STATES.includes(state) && !RESTING_STATES.includes(state);
}

/**
 * The Home bubble cue (contract PodStage). It describes the pod's hangout,
 * never a single member.
 * @param {string | null} state the current hangout's state, or null for none
 * @returns {'none' | 'planning' | 'poll_open' | 'booking_pending' | 'payments_open'}
 */
export function podStage(state) {
  if (state === null) return 'none';
  assertState(state);
  switch (state) {
    case 'PLANNING':
    case 'STRETCH_ASKS':
      return 'planning';
    case 'ACTIVITY_VOTE':
    case 'TIME_VOTE':
    case 'READY_CHECK':
      return 'poll_open';
    case 'AWAITING_CONFIRMATION':
    case 'BOOKING':
      return 'booking_pending';
    case 'BOOKED':
    case 'BALANCES_OPEN':
      return 'payments_open';
    default:
      return 'none';
  }
}
