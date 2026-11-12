/**
 * Hangout lifecycle state machine — Unspoken UX spec (ADR-0007).
 *
 * States match the 23 screens in the experience spec.  The old
 * DRAFT/COMMITTING/SETTLING/VOIDING states are retired; the new model uses
 * IOU balances rather than hold/capture/void.
 */

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

/** States from which nothing further happens. */
export const TERMINAL_STATES = Object.freeze([
  'SETTLED',
  'NO_PLAN',
  'BOOKING_FAILED',
]);

/**
 * Legal events per state.
 *
 * Naming convention: camelCase verb phrase matching what the system or a member
 * did to cause the transition. The AI planner influences ranking only; the state
 * machine itself never calls an LLM.
 *
 * @type {Readonly<Record<string, Readonly<Record<string, string>>>>}
 */
export const TRANSITIONS = Object.freeze({
  // Pod chat: planner shortlist posted (P7). Members review activity options.
  PLANNING: Object.freeze({
    // AI shortlist produced and posted; members can now vote.
    shortlistReady: 'ACTIVITY_VOTE',
    // Budget stretch asked privately to one member (P8); re-enters planning
    // after the member responds. This is a re-entry, not a separate waiting state.
    stretchAsked: 'STRETCH_ASKS',
    // No candidate passes all hard constraints and there are no stretch options.
    noneFeasible: 'NO_PLAN',
  }),

  // A private stretch ask has been sent; waiting for the member to reply.
  STRETCH_ASKS: Object.freeze({
    // Member replied (yes or no) — go back to planning to re-evaluate candidates.
    stretchAnswered: 'PLANNING',
    // Member did not reply within timeout; treat as decline and re-evaluate.
    stretchTimedOut: 'PLANNING',
  }),

  // Pod chat: activity vote card visible (P9). Votes are attributed (name + choice).
  ACTIVITY_VOTE: Object.freeze({
    // Every yes-member has voted on activities.
    activityVoteComplete: 'TIME_VOTE',
    // No candidate survives the final tally (all blocked by some member's hard limit).
    noneFeasible: 'NO_PLAN',
  }),

  // Pod chat: time poll card visible (P10). Time-slot votes are attributed.
  TIME_VOTE: Object.freeze({
    // Every yes-member has voted; a time slot won.
    timeVoteComplete: 'READY_CHECK',
    // No time slot works for everyone.
    noTimeSlot: 'NO_PLAN',
  }),

  // Pod chat: ready-check card visible (P11). Every yes-member must confirm.
  READY_CHECK: Object.freeze({
    // Every yes-member tapped "I'm in".
    allReady: 'AWAITING_CONFIRMATION',
    // A member declined the ready-check.
    memberDeclined: 'NO_PLAN',
    // Ready-check timed out before all members replied.
    readyCheckTimedOut: 'NO_PLAN',
  }),

  // Waiting for the host (organiser) to tap "Confirm & Book" (P11 → P12).
  AWAITING_CONFIRMATION: Object.freeze({
    // Host confirmed; system will now attempt booking.
    hostConfirmed: 'BOOKING',
    // Host declined the suggested booking.
    hostDeclined: 'NO_PLAN',
  }),

  // System is calling the venue API / making the reservation.
  BOOKING: Object.freeze({
    bookingSucceeded: 'BOOKED',
    bookingFailed: 'BOOKING_FAILED',
  }),

  // Booking confirmed (P12). Payer now splits the bill (P13).
  BOOKED: Object.freeze({
    // Payer confirmed the split and IOU balances have been created.
    splitConfirmed: 'BALANCES_OPEN',
  }),

  // IOU balances open; members are settling via PayPal (P14 / P15).
  BALANCES_OPEN: Object.freeze({
    // Every debtor's balance is paid.
    allPaid: 'SETTLED',
  }),

  // Terminal: all IOUs paid.
  SETTLED: Object.freeze({}),

  // Terminal: no candidate survived planning or members declined.
  NO_PLAN: Object.freeze({}),

  // Terminal: venue booking call failed; no money was collected.
  BOOKING_FAILED: Object.freeze({}),
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
    const legal = Object.keys(allowed).join(', ') || 'none';
    throw new RangeError(
      `a hangout in ${state} cannot ${event}; legal events are: ${legal}`,
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
