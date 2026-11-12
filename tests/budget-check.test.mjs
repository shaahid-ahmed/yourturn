import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkBudget,
  checkBudgetGroup,
  isStretchAsk,
  StretchSession,
} from '../services/ai/copilot/budget-check.mjs';

// ─── checkBudget ─────────────────────────────────────────────────────────────

describe('checkBudget', () => {
  it('feasible when cost equals hard cap', () => {
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 3000 }, null);
    assert.deepEqual(r, { memberId: 'm1', feasible: true });
  });

  it('feasible when cost is below hard cap', () => {
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 1000 }, null);
    assert.deepEqual(r, { memberId: 'm1', feasible: true });
  });

  it('not feasible when cost exceeds hard cap with no stretch approval', () => {
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 3100 }, null);
    assert.deepEqual(r, { memberId: 'm1', feasible: false });
  });

  it('not feasible when cost is in stretch range but no approval', () => {
    const session = new StretchSession();
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 3300 }, session);
    assert.deepEqual(r, { memberId: 'm1', feasible: false });
  });

  it('feasible when cost is in stretch range and member has approved', () => {
    const session = new StretchSession();
    session.approve('m1', 'cand-1');
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 3300 }, session);
    assert.deepEqual(r, { memberId: 'm1', feasible: true });
  });

  it('not feasible when cost exceeds stretch ceiling even with approval', () => {
    const session = new StretchSession();
    session.approve('m1', 'cand-1');
    // 3600 > floor(3000 * 1.2) = 3600 — boundary: exactly 3600 is still within stretch
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 3601 }, session);
    assert.deepEqual(r, { memberId: 'm1', feasible: false });
  });

  it('feasible at exact stretch ceiling with approval', () => {
    const session = new StretchSession();
    session.approve('m1', 'cand-1');
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 3600 }, session);
    assert.deepEqual(r, { memberId: 'm1', feasible: true });
  });

  it('zero cost is always feasible', () => {
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 0, estCostPerPersonCents: 0 }, null);
    assert.deepEqual(r, { memberId: 'm1', feasible: true });
  });

  it('throws on missing memberId', () => {
    assert.throws(
      () => checkBudget({ memberId: '', budgetCapCents: 1000, estCostPerPersonCents: 500 }, null),
      /memberId is required/,
    );
  });

  it('throws on fractional budgetCapCents', () => {
    assert.throws(
      () => checkBudget({ memberId: 'm1', budgetCapCents: 10.5, estCostPerPersonCents: 500 }, null),
      /budgetCapCents/,
    );
  });

  it('throws on negative cost', () => {
    assert.throws(
      () => checkBudget({ memberId: 'm1', budgetCapCents: 1000, estCostPerPersonCents: -1 }, null),
      /estCostPerPersonCents/,
    );
  });

  it('result reveals only feasible boolean — no reason or score', () => {
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 1000, estCostPerPersonCents: 2000 }, null);
    assert.ok(!('reason' in r), 'must not expose reason');
    assert.ok(!('score' in r), 'must not expose score');
    assert.ok(!('cap' in r), 'must not expose cap');
    assert.ok(!('cost' in r), 'must not expose cost');
    assert.equal(Object.keys(r).sort().join(','), 'feasible,memberId');
  });
});

// ─── checkBudgetGroup ────────────────────────────────────────────────────────

describe('checkBudgetGroup', () => {
  it('all feasible when every member within cap', () => {
    const inputs = [
      { memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 2000 },
      { memberId: 'm2', budgetCapCents: 2500, estCostPerPersonCents: 2000 },
    ];
    const r = checkBudgetGroup(inputs, null);
    assert.deepEqual(r, { feasibleCount: 2, totalCount: 2, allFeasible: true });
  });

  it('not all feasible when one member over cap', () => {
    const inputs = [
      { memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 2000 },
      { memberId: 'm2', budgetCapCents: 1500, estCostPerPersonCents: 2000 },
    ];
    const r = checkBudgetGroup(inputs, null);
    assert.deepEqual(r, { feasibleCount: 1, totalCount: 2, allFeasible: false });
  });

  it('no per-member attribution in result', () => {
    const inputs = [
      { memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 2000 },
    ];
    const r = checkBudgetGroup(inputs, null);
    assert.ok(!('results' in r), 'must not expose per-member results');
    assert.ok(!('members' in r), 'must not expose members');
  });

  it('empty inputs returns zero counts', () => {
    const r = checkBudgetGroup([], null);
    assert.deepEqual(r, { feasibleCount: 0, totalCount: 0, allFeasible: true });
  });
});

// ─── isStretchAsk ────────────────────────────────────────────────────────────

describe('isStretchAsk', () => {
  it('false when cost within hard cap', () => {
    assert.equal(isStretchAsk({ budgetCapCents: 3000, estCostPerPersonCents: 3000 }), false);
  });

  it('true when cost is 1 cent above cap but within stretch ceiling', () => {
    assert.equal(isStretchAsk({ budgetCapCents: 3000, estCostPerPersonCents: 3001 }), true);
  });

  it('true at exact stretch ceiling', () => {
    assert.equal(isStretchAsk({ budgetCapCents: 3000, estCostPerPersonCents: 3600 }), true);
  });

  it('false when cost exceeds stretch ceiling', () => {
    assert.equal(isStretchAsk({ budgetCapCents: 3000, estCostPerPersonCents: 3601 }), false);
  });

  it('false when cost is zero and cap is zero', () => {
    assert.equal(isStretchAsk({ budgetCapCents: 0, estCostPerPersonCents: 0 }), false);
  });

  it('throws on fractional cap', () => {
    assert.throws(() => isStretchAsk({ budgetCapCents: 10.5, estCostPerPersonCents: 11 }), /budgetCapCents/);
  });
});

// ─── StretchSession ──────────────────────────────────────────────────────────

describe('StretchSession', () => {
  it('no approval by default', () => {
    const s = new StretchSession();
    assert.equal(s.hasApproval('m1', 'cand-1'), false);
  });

  it('approve records approval', () => {
    const s = new StretchSession();
    s.approve('m1', 'cand-1');
    assert.equal(s.hasApproval('m1', 'cand-1'), false === false && s.hasApproval('m1', 'cand-1') === true, 'unused path');
    assert.ok(s.hasApproval('m1', 'cand-1'));
  });

  it('approval is per candidate — different candidate has no approval', () => {
    const s = new StretchSession();
    s.approve('m1', 'cand-1');
    assert.equal(s.hasApproval('m1', 'cand-2'), false);
  });

  it('decline removes approval', () => {
    const s = new StretchSession();
    s.approve('m1', 'cand-1');
    s.decline('m1', 'cand-1');
    assert.equal(s.hasApproval('m1', 'cand-1'), false);
  });

  it('hasApproval without candidateId checks any approval for member', () => {
    const s = new StretchSession();
    s.approve('m1', 'cand-9');
    assert.ok(s.hasApproval('m1'));
  });

  it('hasApproval without candidateId returns false when no approvals', () => {
    const s = new StretchSession();
    assert.equal(s.hasApproval('m1'), false);
  });

  it('forgetMember clears all approvals for that member', () => {
    const s = new StretchSession();
    s.approve('m1', 'cand-1');
    s.approve('m1', 'cand-2');
    s.approve('m2', 'cand-1');
    s.forgetMember('m1');
    assert.equal(s.hasApproval('m1'), false);
    assert.ok(s.hasApproval('m2', 'cand-1'), 'm2 approval must survive');
  });

  it('size tracks approval count', () => {
    const s = new StretchSession();
    assert.equal(s.size, 0);
    s.approve('m1', 'cand-1');
    assert.equal(s.size, 1);
    s.approve('m1', 'cand-2');
    assert.equal(s.size, 2);
    s.decline('m1', 'cand-1');
    assert.equal(s.size, 1);
  });

  it('throws on approve with empty memberId', () => {
    const s = new StretchSession();
    assert.throws(() => s.approve('', 'cand-1'), /memberId is required/);
  });

  it('throws on approve with empty candidateId', () => {
    const s = new StretchSession();
    assert.throws(() => s.approve('m1', ''), /candidateId is required/);
  });

  it('two members are independent — m2 approval does not make m1 feasible', () => {
    const session = new StretchSession();
    session.approve('m2', 'cand-1');
    const r = checkBudget({ memberId: 'm1', budgetCapCents: 3000, estCostPerPersonCents: 3300 }, session);
    assert.equal(r.feasible, false, 'm1 must not benefit from m2 stretch approval');
  });
});
