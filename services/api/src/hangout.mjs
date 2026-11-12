/**
 * The hangout lifecycle, as a table of legal transitions.
 *
 * The shape matters for money. `COMMITTING -> SETTLING` is the only route to a
 * capture, and it requires every share to be held first, so there is no path on
 * which money is taken from someone who did not authorize it. There is no state
 * meaning "booked" or "reserved": this demo never reserves anything, and a state
 * name is the easiest place for that lie to creep in.
 */
export const HANGOUT_STATES = Object.freeze([
  'DRAFT',
  'PLANNING',
  'NO_PLAN',
  'PROPOSED',
  'COMMITTING',
  'SETTLING',
  'VOIDING',
  'CONFIRMED',
  'NOT_HAPPENING',
  'SETTLEMENT_FAILED',
  'COMPLETED',
]);

/** States from which nothing further happens. */
export const TERMINAL_STATES = Object.freeze([
  'COMPLETED',
  'SETTLEMENT_FAILED',
]);

/** @type {Readonly<Record<string, Readonly<Record<string, string>>>>} */
export const TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze({ startPlanning: 'PLANNING' }),
  PLANNING: Object.freeze({ winnerFound: 'PROPOSED', noneFeasible: 'NO_PLAN' }),
  NO_PLAN: Object.freeze({
    widenAndRetry: 'PLANNING',
    abandon: 'NOT_HAPPENING',
  }),
  PROPOSED: Object.freeze({
    openCommitments: 'COMMITTING',
    abandon: 'NOT_HAPPENING',
  }),
  COMMITTING: Object.freeze({
    allAuthorized: 'SETTLING',
    declined: 'VOIDING',
    deadlinePassed: 'VOIDING',
  }),
  SETTLING: Object.freeze({
    allCaptured: 'CONFIRMED',
    captureFailed: 'SETTLEMENT_FAILED',
  }),
  VOIDING: Object.freeze({ allVoided: 'NOT_HAPPENING' }),
  CONFIRMED: Object.freeze({ eventPassed: 'COMPLETED' }),
  NOT_HAPPENING: Object.freeze({ tryNextBest: 'PLANNING' }),
  SETTLEMENT_FAILED: Object.freeze({}),
  COMPLETED: Object.freeze({}),
});

/**
 * @param {string} state
 * @param {string} event
 * @returns {string} the next state
 */
export function transition(state, event) {
  const allowed = TRANSITIONS[state];
  if (!allowed) throw new RangeError(`${state} is not a hangout state`);
  const next = allowed[event];
  if (!next) {
    throw new RangeError(
      `a hangout in ${state} cannot ${event}; legal events are ${Object.keys(allowed).join(', ') || 'none'}`,
    );
  }
  return next;
}

/** @param {string} state */
export function isTerminal(state) {
  if (!HANGOUT_STATES.includes(state))
    throw new RangeError(`${state} is not a hangout state`);
  return TERMINAL_STATES.includes(state);
}
