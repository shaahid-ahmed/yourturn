/**
 * Evaluating a candidate against one member's private constraints.
 *
 * Hard rules are plain code and run first. A soft preference score only orders
 * the candidates that already passed, and cannot turn a reject into an accept —
 * otherwise a model's opinion could spend somebody's money.
 *
 * The result is deliberately three fields. A reason, a failed-rule name or a
 * score on a rejected candidate would each leak the member's limits upward.
 */

/** @param {string} time `HH:MM` */
function minutesOfDay(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new TypeError(`expected HH:MM, received ${time}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** @param {string} iso */
function localMinutes(iso) {
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  if (!match) throw new TypeError(`expected an ISO timestamp, received ${iso}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * @typedef {object} Constraints
 * @property {number} budgetCapCents
 * @property {{ dow: string, from: string, to: string }[]} availability
 * @property {string[]} [dietary]
 * @property {string[]} [dislikes]
 * @property {number} [maxTravelMinutes]
 * @property {Record<string, number>} [preferenceWeights]
 */

/**
 * @typedef {object} Candidate
 * @property {string} candidateId
 * @property {string} startsAt
 * @property {string} endsAt
 * @property {string} dow
 * @property {number} estCostPerPersonCents
 * @property {number} [travelMinutes]
 * @property {string[]} [dietaryOptions]
 * @property {string[]} [tags]
 */

/**
 * @param {Constraints} constraints
 * @param {Candidate} candidate
 * @returns {boolean}
 */
function passesHardRules(constraints, candidate) {
  if (candidate.estCostPerPersonCents > constraints.budgetCapCents)
    return false;

  const window = constraints.availability.find(
    (slot) => slot.dow === candidate.dow,
  );
  if (!window) return false;
  const start = localMinutes(candidate.startsAt);
  const end = localMinutes(candidate.endsAt);
  if (start < minutesOfDay(window.from) || end > minutesOfDay(window.to))
    return false;

  const dietary = constraints.dietary ?? [];
  if (dietary.length > 0) {
    const options = candidate.dietaryOptions ?? [];
    if (!dietary.every((need) => options.includes(need))) return false;
  }

  if (typeof constraints.maxTravelMinutes === 'number') {
    if ((candidate.travelMinutes ?? 0) > constraints.maxTravelMinutes)
      return false;
  }

  const dislikes = constraints.dislikes ?? [];
  if ((candidate.tags ?? []).some((tag) => dislikes.includes(tag)))
    return false;

  return true;
}

/**
 * @param {Constraints} constraints
 * @param {Candidate} candidate
 * @param {{ softBoost?: number }} [soft] an optional model-derived nudge to the ranking
 * @returns {{ candidateId: string, feasible: boolean, score: number }}
 */
export function evaluateCandidate(constraints, candidate, soft = {}) {
  const feasible = passesHardRules(constraints, candidate);
  if (!feasible) {
    // No score on a rejected candidate: a score would still describe the member's taste.
    return { candidateId: candidate.candidateId, feasible: false, score: 0 };
  }
  const weights = constraints.preferenceWeights ?? {};
  const tags = candidate.tags ?? [];
  const base = tags.reduce((sum, tag) => sum + (weights[tag] ?? 0), 0);
  const boost = Number.isFinite(soft.softBoost) ? Number(soft.softBoost) : 0;
  // Bounded, so a soft nudge can reorder but never dominate.
  const score = Math.max(
    0,
    Math.min(
      1,
      (base + Math.max(-1, Math.min(1, boost))) / Math.max(1, tags.length),
    ),
  );
  return { candidateId: candidate.candidateId, feasible: true, score };
}
