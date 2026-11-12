import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractConstraints,
  buildPromptContext,
  validateSuggestionSet,
  coordinateSuggestions,
  findForbiddenFields,
  KNOWN_TAGS,
  KNOWN_DIETARY,
  FIXTURE_EVALS,
} from '../services/ai/copilot/constraint-extractor.mjs';

const VALID_PROFILE = {
  memberId: 'm1',
  firstName: 'Sam',
  budgetCapCents: 3000,
  interests: ['active', 'food'],
  dietary: ['vegetarian'],
  dislikes: ['nightlife'],
  maxTravelMinutes: 45,
  availability: [{ dow: 'fri', from: '17:00', to: '22:00' }],
};

const VALID_PLANS = [
  { candidateId: 'c1', eventId: 'evt-001', title: 'Bowl', venue: 'Brooklyn Bowl', dow: 'fri', startsAt: '2026-11-20T19:00:00-05:00', endsAt: '2026-11-20T22:00:00-05:00', estCostPerPersonCents: 3500, tags: ['active'], dietaryOptions: ['vegetarian'] },
  { candidateId: 'c2', eventId: 'evt-007', title: 'Escape', venue: 'Clue Chase', dow: 'fri', startsAt: '2026-11-20T20:00:00-05:00', endsAt: '2026-11-20T21:30:00-05:00', estCostPerPersonCents: 3000, tags: ['active'], dietaryOptions: [] },
  { candidateId: 'c3', eventId: 'evt-004', title: 'Golf', venue: 'Topgolf', dow: 'fri', startsAt: '2026-11-20T18:00:00-05:00', endsAt: '2026-11-20T21:00:00-05:00', estCostPerPersonCents: 4500, tags: ['active', 'food'], dietaryOptions: ['vegetarian'] },
];

// ── extractConstraints ────────────────────────────────────────────────────────

describe('extractConstraints', () => {
  it('extracts valid profile to constraints', () => {
    const { constraints, warnings } = extractConstraints(VALID_PROFILE);
    assert.equal(constraints.budgetCapCents, 3000);
    assert.deepEqual(constraints.dietary, ['vegetarian']);
    assert.deepEqual(constraints.dislikes, ['nightlife']);
    assert.equal(constraints.maxTravelMinutes, 45);
    assert.ok(constraints.preferenceWeights?.['active']);
    assert.ok(constraints.preferenceWeights?.['food']);
    assert.equal(warnings.length, 0);
  });

  it('drops unknown interest tags with a warning', () => {
    const { constraints, warnings } = extractConstraints({
      ...VALID_PROFILE,
      interests: ['active', 'unknown-tag-xyz'],
    });
    assert.ok(constraints.preferenceWeights?.['active']);
    assert.ok(!constraints.preferenceWeights?.['unknown-tag-xyz']);
    assert.ok(warnings.some(w => w.includes('unknown-tag-xyz')));
  });

  it('drops unknown dietary tags with a warning', () => {
    const { warnings } = extractConstraints({
      ...VALID_PROFILE,
      dietary: ['vegetarian', 'breatharian'],
    });
    assert.ok(warnings.some(w => w.includes('breatharian')));
  });

  it('drops malformed availability windows with a warning', () => {
    const { constraints, warnings } = extractConstraints({
      ...VALID_PROFILE,
      availability: [
        { dow: 'fri', from: '17:00', to: '22:00' },
        { dow: 'xyz', from: '10:00', to: '20:00' },
        { dow: 'sat', from: 'bad', to: '20:00' },
      ],
    });
    assert.equal(constraints.availability.length, 1);
    assert.equal(constraints.availability[0].dow, 'fri');
    assert.ok(warnings.some(w => w.includes('xyz')));
    assert.ok(warnings.some(w => w.includes('bad')));
  });

  it('warns when no valid availability windows', () => {
    const { warnings } = extractConstraints({
      ...VALID_PROFILE,
      availability: [{ dow: 'invalid', from: '10:00', to: '20:00' }],
    });
    assert.ok(warnings.some(w => w.includes('no valid availability')));
  });

  it('throws when memberId is missing', () => {
    assert.throws(
      () => extractConstraints({ ...VALID_PROFILE, memberId: '' }),
      /memberId is required/,
    );
  });

  it('throws when firstName looks like an email', () => {
    assert.throws(
      () => extractConstraints({ ...VALID_PROFILE, firstName: 'sam@example.com' }),
      /plain first name/,
    );
  });

  it('throws on fractional budgetCapCents', () => {
    assert.throws(
      () => extractConstraints({ ...VALID_PROFILE, budgetCapCents: 29.99 }),
      /budgetCapCents/,
    );
  });

  it('throws when budget out of range', () => {
    assert.throws(
      () => extractConstraints({ ...VALID_PROFILE, budgetCapCents: 50 }),
      /between 100 and 20000/,
    );
  });

  it('drops invalid maxTravelMinutes with a warning', () => {
    const { constraints, warnings } = extractConstraints({
      ...VALID_PROFILE,
      maxTravelMinutes: -5,
    });
    assert.equal(constraints.maxTravelMinutes, undefined);
    assert.ok(warnings.some(w => w.includes('maxTravelMinutes')));
  });

  it('profile with empty interests produces no preferenceWeights', () => {
    const { constraints } = extractConstraints({ ...VALID_PROFILE, interests: [] });
    assert.equal(constraints.preferenceWeights, undefined);
  });
});

// ── buildPromptContext ────────────────────────────────────────────────────────

describe('buildPromptContext', () => {
  it('returns only firstName, interests, dietary, dislikes', () => {
    const { constraints } = extractConstraints(VALID_PROFILE);
    const ctx = buildPromptContext('Sam', constraints);
    assert.equal(ctx.firstName, 'Sam');
    assert.ok(Array.isArray(ctx.interests));
    assert.ok(Array.isArray(ctx.dietary));
    assert.ok(Array.isArray(ctx.dislikes));
    assert.equal(Object.keys(ctx).sort().join(','), 'dietary,dislikes,firstName,interests');
  });

  it('throws when firstName contains @', () => {
    const { constraints } = extractConstraints(VALID_PROFILE);
    assert.throws(
      () => buildPromptContext('sam@example.com', constraints),
      /plain first name/,
    );
  });
});

// ── findForbiddenFields (red-team) ────────────────────────────────────────────

describe('findForbiddenFields', () => {
  it('finds no forbidden fields in a clean prompt context', () => {
    const { constraints } = extractConstraints(VALID_PROFILE);
    const ctx = buildPromptContext('Sam', constraints);
    const found = findForbiddenFields(ctx);
    assert.deepEqual(found, [], `forbidden fields found: ${found.join(', ')}`);
  });

  it('detects budget field', () => {
    const found = findForbiddenFields({ firstName: 'Sam', budgetCapCents: 3000 });
    assert.ok(found.length > 0, 'budget field must be flagged');
  });

  it('detects email field', () => {
    const found = findForbiddenFields({ firstName: 'Sam', email: 'sam@example.com' });
    assert.ok(found.length > 0, 'email field must be flagged');
  });

  it('detects payment field', () => {
    const found = findForbiddenFields({ firstName: 'Sam', paypalAccount: 'x' });
    assert.ok(found.length > 0, 'payment field must be flagged');
  });

  it('detects score/drift field', () => {
    const found = findForbiddenFields({ firstName: 'Sam', tieScore: 0.9 });
    assert.ok(found.length > 0, 'score field must be flagged');
  });
});

// ── validateSuggestionSet ─────────────────────────────────────────────────────

describe('validateSuggestionSet', () => {
  it('passes a valid 3-plan set', () => {
    const r = validateSuggestionSet(VALID_PLANS);
    assert.equal(r.valid, true);
    assert.equal(r.plans?.length, 3);
  });

  it('fails when not an array', () => {
    const r = validateSuggestionSet('not an array');
    assert.equal(r.valid, false);
  });

  it('fails when fewer than 3 plans', () => {
    const r = validateSuggestionSet(VALID_PLANS.slice(0, 2));
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes('3'));
  });

  it('fails when more than 3 plans', () => {
    const r = validateSuggestionSet([...VALID_PLANS, { ...VALID_PLANS[0], candidateId: 'c4', eventId: 'evt-002' }]);
    assert.equal(r.valid, false);
  });

  it('fails on invented venue ID', () => {
    const bad = VALID_PLANS.map((p, i) => i === 0 ? { ...p, eventId: 'invented-xyz' } : p);
    const r = validateSuggestionSet(bad);
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes('eventId'));
  });

  it('fails on duplicate candidateId', () => {
    const bad = VALID_PLANS.map((p, i) => i === 1 ? { ...p, candidateId: 'c1' } : p);
    const r = validateSuggestionSet(bad);
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes('duplicate'));
  });

  it('fails on fractional cents', () => {
    const bad = VALID_PLANS.map((p, i) => i === 0 ? { ...p, estCostPerPersonCents: 35.5 } : p);
    const r = validateSuggestionSet(bad);
    assert.equal(r.valid, false);
  });

  it('fails on missing required string field', () => {
    const bad = VALID_PLANS.map((p, i) => i === 0 ? { ...p, title: '' } : p);
    const r = validateSuggestionSet(bad);
    assert.equal(r.valid, false);
  });
});

// ── coordinateSuggestions ─────────────────────────────────────────────────────

describe('coordinateSuggestions', () => {
  it('returns plans when first attempt is valid', () => {
    let calls = 0;
    const r = coordinateSuggestions(() => { calls++; return VALID_PLANS; });
    assert.equal(r.available, true);
    assert.equal(r.plans?.length, 3);
    assert.equal(calls, 1);
  });

  it('retries once on first failure', () => {
    let calls = 0;
    const r = coordinateSuggestions(() => {
      calls++;
      return calls === 1 ? [] : VALID_PLANS;
    });
    assert.equal(r.available, true);
    assert.equal(calls, 2);
  });

  it('returns unavailable after two failures', () => {
    let calls = 0;
    const r = coordinateSuggestions(() => { calls++; return []; });
    assert.equal(r.available, false);
    assert.equal(calls, 2);
  });

  it('never makes more than 2 attempts', () => {
    let calls = 0;
    coordinateSuggestions(() => { calls++; return 'invalid'; });
    assert.equal(calls, 2);
  });
});

// ── FIXTURE_EVALS ─────────────────────────────────────────────────────────────

describe('fixture evals', () => {
  it('all recorded evals have PASS status', () => {
    for (const ev of FIXTURE_EVALS) {
      assert.equal(ev.actual, 'PASS', `eval ${ev.id} (${ev.description}) not marked PASS`);
    }
  });

  it('evals are consistent with live validation', () => {
    for (const ev of FIXTURE_EVALS) {
      if (ev.id === 'eval-006') continue; // red-team prompt eval, different shape
      const r = validateSuggestionSet(ev.input);
      if (ev.expected.valid) {
        assert.equal(r.valid, true, `eval ${ev.id} should be valid`);
      } else {
        assert.equal(r.valid, false, `eval ${ev.id} should be invalid`);
      }
    }
  });

  it('eval-006 red-team: buildPromptContext produces zero forbidden fields', () => {
    const ev = FIXTURE_EVALS.find(e => e.id === 'eval-006');
    assert.ok(ev);
    const { constraints } = extractConstraints({
      memberId: 'm-eval',
      firstName: ev.input.firstName,
      budgetCapCents: ev.input.budgetCapCents,
      availability: ev.input.availability,
      interests: ev.input.interests,
    });
    const ctx = buildPromptContext(ev.input.firstName, constraints);
    const found = findForbiddenFields(ctx);
    assert.equal(found.length, 0, `forbidden fields in prompt context: ${found.join(', ')}`);
  });
});

// ── Closed vocabulary exports ─────────────────────────────────────────────────

describe('closed vocabularies', () => {
  it('KNOWN_TAGS is a frozen array of strings', () => {
    assert.ok(Array.isArray(KNOWN_TAGS));
    assert.ok(Object.isFrozen(KNOWN_TAGS));
    for (const t of KNOWN_TAGS) assert.equal(typeof t, 'string');
  });

  it('KNOWN_DIETARY is a frozen array of strings', () => {
    assert.ok(Array.isArray(KNOWN_DIETARY));
    assert.ok(Object.isFrozen(KNOWN_DIETARY));
    for (const d of KNOWN_DIETARY) assert.equal(typeof d, 'string');
  });
});
