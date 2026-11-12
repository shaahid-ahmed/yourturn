/**
 * Private budget feasibility checker.
 *
 * Returns only feasible: true/false for a single member against a candidate.
 * No reason, score, or breakdown is returned — returning those would leak the
 * member's private budget ceiling to callers that aggregate results.
 *
 * "Stretch ask" path: when a candidate exceeds the member's hard budget cap but
 * falls within the stretch ceiling, the checker asks the member privately and
 * holds the answer in an in-memory session. That answer never surfaces to the
 * group: the group sees only the aggregate feasible/not-feasible count
 * (which must follow PHASE1_REVIEW B-03: in a 3-member circle show only
 * "not yet answered" rather than a count).
 *
 * This module has no network I/O and no LLM calls. The LLM never touches
 * payment decisions (ADR-0007 hard constraint). All logic is deterministic.
 */

/** @type {number} Soft stretch ceiling — 20% above hard cap */
const STRETCH_RATIO = 1.2;

/**
 * @typedef {object} BudgetCheckInput
 * @property {string} memberId
 * @property {number} budgetCapCents       hard ceiling, integer cents
 * @property {number} estCostPerPersonCents integer cents
 */

/**
 * @typedef {object} BudgetCheckResult
 * @property {string}  memberId
 * @property {boolean} feasible    true only when cost <= hard cap (or stretch-approved)
 */

/**
 * Checks feasibility of a single candidate cost for one member.
 *
 * Does NOT throw on infeasibility — returning feasible:false is the documented
 * success path. Only throws for bad inputs that would produce garbage output.
 *
 * @param {BudgetCheckInput} input
 * @param {StretchSession}   session  in-memory session for stretch approvals
 * @returns {BudgetCheckResult}
 */
export function checkBudget(input, session) {
  const { memberId, budgetCapCents, estCostPerPersonCents } = input;

  if (!memberId) throw new TypeError('memberId is required');
  assertCents(budgetCapCents, 'budgetCapCents');
  assertCents(estCostPerPersonCents, 'estCostPerPersonCents');

  if (estCostPerPersonCents <= budgetCapCents) {
    return { memberId, feasible: true };
  }

  const stretchCeiling = Math.floor(budgetCapCents * STRETCH_RATIO);
  if (estCostPerPersonCents <= stretchCeiling && session?.hasApproval(memberId)) {
    return { memberId, feasible: true };
  }

  return { memberId, feasible: false };
}

/**
 * Checks all members and returns aggregate feasibility counts.
 * Caller must NOT expose per-member attribution to the group.
 *
 * @param {BudgetCheckInput[]} inputs
 * @param {StretchSession}     session
 * @returns {{ feasibleCount: number, totalCount: number, allFeasible: boolean }}
 */
export function checkBudgetGroup(inputs, session) {
  const results = inputs.map(i => checkBudget(i, session));
  const feasibleCount = results.filter(r => r.feasible).length;
  return {
    feasibleCount,
    totalCount: results.length,
    allFeasible: feasibleCount === results.length,
  };
}

/**
 * Determines whether a cost is a "stretch ask" for a member — above their hard
 * cap but within the soft stretch ceiling. If so, the member should be asked
 * privately before the result is surfaced.
 *
 * @param {{ budgetCapCents: number, estCostPerPersonCents: number }} input
 * @returns {boolean}
 */
export function isStretchAsk(input) {
  const { budgetCapCents, estCostPerPersonCents } = input;
  assertCents(budgetCapCents, 'budgetCapCents');
  assertCents(estCostPerPersonCents, 'estCostPerPersonCents');

  const stretchCeiling = Math.floor(budgetCapCents * STRETCH_RATIO);
  return (
    estCostPerPersonCents > budgetCapCents &&
    estCostPerPersonCents <= stretchCeiling
  );
}

/**
 * In-memory session for private stretch approvals.
 *
 * Approvals are keyed by (memberId, candidateId) so a "yes" for one event
 * does not carry over to another. Session is not persisted — a process restart
 * or new session object loses all approvals, which is correct: a stretch ask
 * must be explicitly re-answered.
 *
 * The group-facing summary never surfaces which members approved or declined.
 */
export class StretchSession {
  /** @type {Set<string>} */
  #approvals = new Set();

  /** @param {string} memberId @param {string} candidateId */
  #key(memberId, candidateId) {
    return `${memberId}:${candidateId}`;
  }

  /**
   * Records a private stretch approval from one member.
   * @param {string} memberId
   * @param {string} candidateId
   */
  approve(memberId, candidateId) {
    if (!memberId) throw new TypeError('memberId is required');
    if (!candidateId) throw new TypeError('candidateId is required');
    this.#approvals.add(this.#key(memberId, candidateId));
  }

  /**
   * Records a private stretch decline from one member.
   * @param {string} memberId
   * @param {string} candidateId
   */
  decline(memberId, candidateId) {
    if (!memberId) throw new TypeError('memberId is required');
    if (!candidateId) throw new TypeError('candidateId is required');
    this.#approvals.delete(this.#key(memberId, candidateId));
  }

  /**
   * @param {string} memberId
   * @param {string} [candidateId]  when omitted, checks any approval for the member
   * @returns {boolean}
   */
  hasApproval(memberId, candidateId) {
    if (candidateId) {
      return this.#approvals.has(this.#key(memberId, candidateId));
    }
    for (const key of this.#approvals) {
      if (key.startsWith(`${memberId}:`)) return true;
    }
    return false;
  }

  /**
   * Clears all approvals for a member (e.g. when they leave or the session ends).
   * @param {string} memberId
   */
  forgetMember(memberId) {
    for (const key of [...this.#approvals]) {
      if (key.startsWith(`${memberId}:`)) this.#approvals.delete(key);
    }
  }

  /** Number of active approvals (for testing only — never expose to group). */
  get size() {
    return this.#approvals.size;
  }
}

/** @param {unknown} v @param {string} name */
function assertCents(v, name) {
  if (!Number.isInteger(v) || v < 0) {
    throw new TypeError(`${name} must be a non-negative integer (cents); received ${v}`);
  }
}
