/**
 * Constraint extractor and planner coordinator.
 *
 * Takes structured profile data (not raw LLM output) and produces a validated
 * Constraints object for the evaluator in services/api/src/constraints.mjs.
 *
 * Hard rules:
 * - Input is a closed vocabulary: known interest/dietary/dislike tags only.
 *   Unknown tags are dropped with a recorded warning, never passed to the model.
 * - Budget is an integer-cent value; non-integer or out-of-range values are rejected.
 * - Availability windows use HH:MM strings; malformed strings are dropped.
 * - No email, payment data, hardship reason, or numeric tie score may appear in
 *   any prompt or model input. Only first names and plan-relevant preferences.
 * - The extractor never calls the model directly; it validates the profile shape,
 *   assembles a safe prompt context, and returns validated Constraints.
 * - LLM output passes schema validation and a bounded one-retry before falling
 *   back to the rules-only path (no suggestions; host browses fixed venues).
 *
 * This module has no network I/O and no real model calls. All validation is
 * deterministic. Evals are recorded as fixture objects in this file.
 */

// ── Closed vocabularies ──────────────────────────────────────────────────────

export const KNOWN_TAGS = Object.freeze([
  'active', 'art', 'comedy', 'cultural', 'food', 'indoor', 'nightlife', 'outdoor',
]);

export const KNOWN_DIETARY = Object.freeze([
  'gluten-free', 'halal', 'kosher', 'vegan', 'vegetarian',
]);

export const KNOWN_DISLIKES = Object.freeze([
  'active', 'art', 'comedy', 'cultural', 'food', 'indoor', 'nightlife', 'outdoor',
]);

const DOW_VALUES = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

// ── Schema validation ────────────────────────────────────────────────────────

/**
 * @typedef {object} RawProfileInput
 * @property {string}   memberId
 * @property {string}   firstName            first name only, never email/phone
 * @property {number}   budgetCapCents        integer cents; 100..200_00 (up to $200)
 * @property {string[]} interests             tags from KNOWN_TAGS
 * @property {string[]} [dietary]             tags from KNOWN_DIETARY
 * @property {string[]} [dislikes]            tags from KNOWN_DISLIKES
 * @property {number}   [maxTravelMinutes]    positive integer
 * @property {{ dow: string, from: string, to: string }[]} availability
 */

/**
 * Extracts and validates a Constraints object from a raw profile.
 * Unknown/malformed values are silently dropped; warnings are returned alongside.
 *
 * @param {RawProfileInput} profile
 * @returns {{ constraints: import('../../../services/api/src/constraints.mjs').Constraints, warnings: string[] }}
 */
export function extractConstraints(profile) {
  const warnings = [];

  if (!profile.memberId) throw new TypeError('memberId is required');
  if (!profile.firstName || typeof profile.firstName !== 'string' || profile.firstName.includes('@')) {
    throw new TypeError('firstName must be a plain first name, not an email or phone');
  }

  // Budget
  assertCents(profile.budgetCapCents, 'budgetCapCents');
  if (profile.budgetCapCents < 100 || profile.budgetCapCents > 20000) {
    throw new RangeError('budgetCapCents must be between 100 and 20000 cents ($1–$200)');
  }

  // Interests → preferenceWeights (1.0 for each known interest)
  const preferenceWeights = {};
  for (const tag of profile.interests ?? []) {
    if (KNOWN_TAGS.includes(tag)) {
      preferenceWeights[tag] = 1.0;
    } else {
      warnings.push(`unknown interest tag dropped: ${tag}`);
    }
  }

  // Dietary
  const dietary = [];
  for (const d of profile.dietary ?? []) {
    if (KNOWN_DIETARY.includes(d)) {
      dietary.push(d);
    } else {
      warnings.push(`unknown dietary tag dropped: ${d}`);
    }
  }

  // Dislikes
  const dislikes = [];
  for (const d of profile.dislikes ?? []) {
    if (KNOWN_DISLIKES.includes(d)) {
      dislikes.push(d);
    } else {
      warnings.push(`unknown dislike tag dropped: ${d}`);
    }
  }

  // Max travel
  let maxTravelMinutes;
  if (profile.maxTravelMinutes !== undefined) {
    if (!Number.isInteger(profile.maxTravelMinutes) || profile.maxTravelMinutes <= 0) {
      warnings.push('maxTravelMinutes ignored: must be a positive integer');
    } else {
      maxTravelMinutes = profile.maxTravelMinutes;
    }
  }

  // Availability
  const availability = [];
  for (const slot of profile.availability ?? []) {
    if (!DOW_VALUES.includes(slot.dow)) {
      warnings.push(`availability slot dropped: unknown dow ${slot.dow}`);
      continue;
    }
    if (!/^\d{2}:\d{2}$/.test(slot.from) || !/^\d{2}:\d{2}$/.test(slot.to)) {
      warnings.push(`availability slot dropped: malformed time (${slot.from}–${slot.to})`);
      continue;
    }
    availability.push({ dow: slot.dow, from: slot.from, to: slot.to });
  }

  if (availability.length === 0) {
    warnings.push('no valid availability windows; planner will find no feasible slots');
  }

  const constraints = {
    budgetCapCents: profile.budgetCapCents,
    availability,
    dietary: dietary.length > 0 ? dietary : undefined,
    dislikes: dislikes.length > 0 ? dislikes : undefined,
    maxTravelMinutes,
    preferenceWeights: Object.keys(preferenceWeights).length > 0 ? preferenceWeights : undefined,
  };

  return { constraints, warnings };
}

// ── Safe prompt context ──────────────────────────────────────────────────────

/**
 * Builds the minimal prompt context for the planner.
 * Never includes: emails, phone, payment data, hardship reasons, tie scores.
 * Only includes: first name, interests (as tags), dietary needs, dislike tags.
 *
 * @param {string} firstName
 * @param {import('../../../services/api/src/constraints.mjs').Constraints} constraints
 * @returns {{ firstName: string, interests: string[], dietary: string[], dislikes: string[] }}
 */
export function buildPromptContext(firstName, constraints) {
  if (!firstName || typeof firstName !== 'string' || firstName.includes('@')) {
    throw new TypeError('firstName must be a plain first name, not an email or phone');
  }
  return {
    firstName,
    interests: Object.keys(constraints.preferenceWeights ?? {}),
    dietary: constraints.dietary ?? [],
    dislikes: constraints.dislikes ?? [],
  };
}

// ── Planner output schema validation ────────────────────────────────────────

/**
 * @typedef {object} PlanSuggestion
 * @property {string} candidateId
 * @property {string} eventId
 * @property {string} title
 * @property {string} venue
 * @property {string} dow
 * @property {string} startsAt      ISO datetime
 * @property {string} endsAt        ISO datetime
 * @property {number} estCostPerPersonCents  integer cents
 * @property {string[]} tags
 * @property {string[]} dietaryOptions
 */

/**
 * Validates a planner suggestion set.
 * Must be exactly three distinct schema-valid candidates, or returns an error.
 * Called once on first attempt and once on the bounded retry.
 *
 * @param {unknown} raw
 * @returns {{ valid: true, plans: PlanSuggestion[] } | { valid: false, reason: string }}
 */
export function validateSuggestionSet(raw) {
  if (!Array.isArray(raw)) {
    return { valid: false, reason: 'suggestion set must be an array' };
  }
  if (raw.length !== 3) {
    return { valid: false, reason: `expected exactly 3 plans, got ${raw.length}` };
  }

  const ids = new Set();
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    if (typeof p !== 'object' || p === null) {
      return { valid: false, reason: `plan[${i}] is not an object` };
    }
    for (const field of ['candidateId', 'eventId', 'title', 'venue', 'dow', 'startsAt', 'endsAt']) {
      if (typeof p[field] !== 'string' || !p[field]) {
        return { valid: false, reason: `plan[${i}].${field} is missing or not a string` };
      }
    }
    if (!Number.isInteger(p.estCostPerPersonCents) || p.estCostPerPersonCents < 0) {
      return { valid: false, reason: `plan[${i}].estCostPerPersonCents must be a non-negative integer` };
    }
    if (!Array.isArray(p.tags)) {
      return { valid: false, reason: `plan[${i}].tags must be an array` };
    }
    if (!Array.isArray(p.dietaryOptions)) {
      return { valid: false, reason: `plan[${i}].dietaryOptions must be an array` };
    }
    // No invented venues: eventId must look like a known fixture id
    if (!/^evt-\d{3}$/.test(p.eventId)) {
      return { valid: false, reason: `plan[${i}].eventId does not match fixture pattern (evt-NNN)` };
    }
    if (ids.has(p.candidateId)) {
      return { valid: false, reason: `duplicate candidateId: ${p.candidateId}` };
    }
    ids.add(p.candidateId);
  }

  return { valid: true, plans: raw };
}

/**
 * Coordinator: given a raw LLM response, validates it and applies a single bounded retry.
 * On second failure, returns the "suggestions unavailable" sentinel.
 *
 * @param {() => unknown} attempt  callable that returns the LLM response
 * @returns {{ available: true, plans: PlanSuggestion[] } | { available: false }}
 */
export function coordinateSuggestions(attempt) {
  for (let i = 0; i < 2; i++) {
    const raw = attempt();
    const result = validateSuggestionSet(raw);
    if (result.valid) {
      return { available: true, plans: result.plans };
    }
  }
  // Bounded retry exhausted: honest "suggestions unavailable"
  return { available: false };
}

// ── Red-team invariant ────────────────────────────────────────────────────────

/**
 * Checks that a prompt context object contains no forbidden fields.
 * Used in test suite to verify zero-constraint-leak guarantee.
 *
 * @param {Record<string, unknown>} context
 * @returns {string[]} list of forbidden fields found (empty = clean)
 */
export function findForbiddenFields(context) {
  const FORBIDDEN = [
    'email', 'phone', 'budgetCapCents', 'budgetDollars', 'budget', 'maxTravelMinutes',
    'hardship', 'paypal', 'payment', 'score', 'tieScore', 'drift',
    'availability',
  ];
  const found = [];
  for (const key of Object.keys(context)) {
    if (FORBIDDEN.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      found.push(key);
    }
  }
  return found;
}

// ── Fixture evals ─────────────────────────────────────────────────────────────
// These are recorded fixture eval outcomes, not live model calls.

export const FIXTURE_EVALS = Object.freeze([
  {
    id: 'eval-001',
    description: 'Valid 3-plan response — passes validation',
    input: [
      { candidateId: 'c1', eventId: 'evt-001', title: 'Open Bowl Night', venue: 'Brooklyn Bowl', dow: 'fri', startsAt: '2026-11-20T19:00:00-05:00', endsAt: '2026-11-20T22:00:00-05:00', estCostPerPersonCents: 3500, tags: ['active', 'food'], dietaryOptions: ['vegetarian'] },
      { candidateId: 'c2', eventId: 'evt-007', title: 'Friday Escape Challenge', venue: 'Clue Chase', dow: 'fri', startsAt: '2026-11-20T20:00:00-05:00', endsAt: '2026-11-20T21:30:00-05:00', estCostPerPersonCents: 3000, tags: ['active', 'indoor'], dietaryOptions: [] },
      { candidateId: 'c3', eventId: 'evt-004', title: 'Friday Evening Swing Suite', venue: 'Topgolf', dow: 'fri', startsAt: '2026-11-20T18:00:00-05:00', endsAt: '2026-11-20T21:00:00-05:00', estCostPerPersonCents: 4500, tags: ['active', 'food'], dietaryOptions: ['vegetarian'] },
    ],
    expected: { valid: true },
    actual: 'PASS',
  },
  {
    id: 'eval-002',
    description: 'Only 2 plans — fails validation (must be exactly 3)',
    input: [
      { candidateId: 'c1', eventId: 'evt-001', title: 'Open Bowl Night', venue: 'Brooklyn Bowl', dow: 'fri', startsAt: '2026-11-20T19:00:00-05:00', endsAt: '2026-11-20T22:00:00-05:00', estCostPerPersonCents: 3500, tags: [], dietaryOptions: [] },
      { candidateId: 'c2', eventId: 'evt-007', title: 'Escape Challenge', venue: 'Clue Chase', dow: 'fri', startsAt: '2026-11-20T20:00:00-05:00', endsAt: '2026-11-20T21:30:00-05:00', estCostPerPersonCents: 3000, tags: [], dietaryOptions: [] },
    ],
    expected: { valid: false },
    actual: 'PASS',
  },
  {
    id: 'eval-003',
    description: 'Invented venue ID — fails validation',
    input: [
      { candidateId: 'c1', eventId: 'invented-venue-xyz', title: 'Secret bar', venue: 'Some Bar', dow: 'fri', startsAt: '2026-11-20T19:00:00-05:00', endsAt: '2026-11-20T22:00:00-05:00', estCostPerPersonCents: 2000, tags: [], dietaryOptions: [] },
      { candidateId: 'c2', eventId: 'evt-007', title: 'Escape', venue: 'Clue Chase', dow: 'fri', startsAt: '2026-11-20T20:00:00-05:00', endsAt: '2026-11-20T21:30:00-05:00', estCostPerPersonCents: 3000, tags: [], dietaryOptions: [] },
      { candidateId: 'c3', eventId: 'evt-004', title: 'Golf', venue: 'Topgolf', dow: 'fri', startsAt: '2026-11-20T18:00:00-05:00', endsAt: '2026-11-20T21:00:00-05:00', estCostPerPersonCents: 4500, tags: [], dietaryOptions: [] },
    ],
    expected: { valid: false },
    actual: 'PASS',
  },
  {
    id: 'eval-004',
    description: 'Duplicate candidateId — fails validation',
    input: [
      { candidateId: 'c1', eventId: 'evt-001', title: 'Bowl', venue: 'Brooklyn Bowl', dow: 'fri', startsAt: '2026-11-20T19:00:00-05:00', endsAt: '2026-11-20T22:00:00-05:00', estCostPerPersonCents: 3500, tags: [], dietaryOptions: [] },
      { candidateId: 'c1', eventId: 'evt-007', title: 'Escape', venue: 'Clue Chase', dow: 'fri', startsAt: '2026-11-20T20:00:00-05:00', endsAt: '2026-11-20T21:30:00-05:00', estCostPerPersonCents: 3000, tags: [], dietaryOptions: [] },
      { candidateId: 'c3', eventId: 'evt-004', title: 'Golf', venue: 'Topgolf', dow: 'fri', startsAt: '2026-11-20T18:00:00-05:00', endsAt: '2026-11-20T21:00:00-05:00', estCostPerPersonCents: 4500, tags: [], dietaryOptions: [] },
    ],
    expected: { valid: false },
    actual: 'PASS',
  },
  {
    id: 'eval-005',
    description: 'Injection attempt: fractional cents — fails validation',
    input: [
      { candidateId: 'c1', eventId: 'evt-001', title: 'Bowl', venue: 'Brooklyn Bowl', dow: 'fri', startsAt: '2026-11-20T19:00:00-05:00', endsAt: '2026-11-20T22:00:00-05:00', estCostPerPersonCents: 35.5, tags: [], dietaryOptions: [] },
      { candidateId: 'c2', eventId: 'evt-007', title: 'Escape', venue: 'Clue Chase', dow: 'fri', startsAt: '2026-11-20T20:00:00-05:00', endsAt: '2026-11-20T21:30:00-05:00', estCostPerPersonCents: 3000, tags: [], dietaryOptions: [] },
      { candidateId: 'c3', eventId: 'evt-004', title: 'Golf', venue: 'Topgolf', dow: 'fri', startsAt: '2026-11-20T18:00:00-05:00', endsAt: '2026-11-20T21:00:00-05:00', estCostPerPersonCents: 4500, tags: [], dietaryOptions: [] },
    ],
    expected: { valid: false },
    actual: 'PASS',
  },
  {
    id: 'eval-006',
    description: 'Red-team: prompt context must not contain budget or email',
    input: { firstName: 'Sam', budgetCapCents: 3000, availability: [{ dow: 'fri', from: '17:00', to: '22:00' }], interests: ['active'] },
    expected: { forbiddenFieldsFound: 0 },
    actual: 'PASS',
  },
]);

function assertCents(v, name) {
  if (!Number.isInteger(v) || v < 0) {
    throw new TypeError(`${name} must be a non-negative integer (cents); received ${v}`);
  }
}
