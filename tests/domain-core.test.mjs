// Domain core, batch 2: groups, the hangout state machine, constraint evaluation,
// the tally, the vault, and the payment gate. Written before the implementations.
import test from 'node:test';
import assert from 'node:assert/strict';

import { Group } from '../services/api/src/group.mjs';
import {
  HANGOUT_STATES,
  transition,
  isTerminal,
} from '../services/api/src/hangout.mjs';
import { evaluateCandidate } from '../services/api/src/constraints.mjs';
import { tally } from '../services/api/src/tally.mjs';
import { ConstraintVault } from '../services/api/src/vault.mjs';
import {
  PaymentGate,
  GateClosedError,
} from '../services/api/src/payments/gate.mjs';

const CONSTRAINTS = Object.freeze({
  budgetCapCents: 3500,
  availability: [{ dow: 'thu', from: '18:00', to: '23:00' }],
  dietary: ['vegetarian'],
  dislikes: ['loud_bar'],
  maxTravelMinutes: 30,
  preferenceWeights: { active: 0.8, food: 0.6, nightlife: 0.2 },
});

/** @param {Partial<Record<string, unknown>>} [overrides] */
const candidate = (overrides = {}) => ({
  candidateId: 'c-07',
  venueId: 'v-lucky-strike',
  startsAt: '2026-11-19T19:00:00-05:00',
  dow: 'thu',
  endsAt: '2026-11-19T21:00:00-05:00',
  estCostPerPersonCents: 2800,
  travelMinutes: 20,
  dietaryOptions: ['vegetarian', 'vegan'],
  tags: ['active', 'food'],
  ...overrides,
});

test('group: size is enforced at both ends', () => {
  const group = new Group({ groupId: 'g1', minSize: 3, maxSize: 8 });
  group.add('m1');
  group.add('m2');
  assert.equal(
    group.readyToPlan(),
    false,
    'two people cannot hide a single refusal',
  );
  group.add('m3');
  assert.equal(group.readyToPlan(), true);
  for (const id of ['m4', 'm5', 'm6', 'm7', 'm8']) group.add(id);
  assert.throws(() => group.add('m9'), /at most 8/);
  assert.throws(() => group.add('m3'), /already a member/);
  group.remove('m8');
  assert.equal(group.size, 7);
  assert.throws(() => group.remove('nobody'), /not a member/);
});

test('hangout: only declared transitions are legal (UX spec / ADR-0007)', () => {
  // Planning phase
  assert.equal(transition('PLANNING', 'shortlistReady'), 'ACTIVITY_VOTE');
  assert.equal(transition('PLANNING', 'stretchAsked'), 'STRETCH_ASKS');
  assert.equal(transition('PLANNING', 'noneFeasible'), 'NO_PLAN');
  assert.equal(transition('STRETCH_ASKS', 'stretchAnswered'), 'PLANNING');
  assert.equal(transition('STRETCH_ASKS', 'stretchTimedOut'), 'PLANNING');

  // Voting phase
  assert.equal(
    transition('ACTIVITY_VOTE', 'activityVoteComplete'),
    'TIME_VOTE',
  );
  assert.equal(transition('ACTIVITY_VOTE', 'noneFeasible'), 'NO_PLAN');
  assert.equal(transition('TIME_VOTE', 'timeVoteComplete'), 'READY_CHECK');
  assert.equal(transition('TIME_VOTE', 'noTimeSlot'), 'NO_PLAN');

  // Confirmation phase
  assert.equal(transition('READY_CHECK', 'allReady'), 'AWAITING_CONFIRMATION');
  assert.equal(transition('READY_CHECK', 'memberDeclined'), 'NO_PLAN');
  assert.equal(transition('READY_CHECK', 'readyCheckTimedOut'), 'NO_PLAN');
  assert.equal(transition('AWAITING_CONFIRMATION', 'hostConfirmed'), 'BOOKING');
  assert.equal(transition('AWAITING_CONFIRMATION', 'hostDeclined'), 'NO_PLAN');

  // Booking and balances phase
  assert.equal(transition('BOOKING', 'bookingSucceeded'), 'BOOKED');
  assert.equal(transition('BOOKING', 'bookingFailed'), 'BOOKING_FAILED');
  assert.equal(transition('BOOKED', 'splitConfirmed'), 'BALANCES_OPEN');
  assert.equal(transition('BALANCES_OPEN', 'allPaid'), 'SETTLED');

  // Illegal transitions
  assert.throws(() => transition('PLANNING', 'allPaid'), /cannot/);
  assert.throws(() => transition('SETTLED', 'shortlistReady'), /cannot/);

  // Terminal states
  assert.ok(isTerminal('SETTLED'));
  assert.ok(isTerminal('NO_PLAN'));
  assert.ok(isTerminal('BOOKING_FAILED'));
  assert.ok(!isTerminal('BALANCES_OPEN'));

  // Old hold/capture/void states must not exist
  assert.ok(!HANGOUT_STATES.includes('DRAFT'));
  assert.ok(!HANGOUT_STATES.includes('COMMITTING'));
  assert.ok(!HANGOUT_STATES.includes('SETTLING'));
  assert.ok(!HANGOUT_STATES.includes('VOIDING'));
  assert.ok(!HANGOUT_STATES.includes('CONFIRMED'));
  assert.ok(!HANGOUT_STATES.includes('PAID'));
});

test('constraints: a hard rule failure is a reject, with no reason attached', () => {
  const ok = evaluateCandidate(CONSTRAINTS, candidate());
  assert.equal(ok.feasible, true);
  assert.ok(ok.score > 0);
  assert.deepEqual(Object.keys(ok).sort(), [
    'candidateId',
    'feasible',
    'score',
  ]);

  // Over budget by one cent is still over budget.
  assert.equal(
    evaluateCandidate(CONSTRAINTS, candidate({ estCostPerPersonCents: 3501 }))
      .feasible,
    false,
  );
  // Wrong day.
  assert.equal(
    evaluateCandidate(CONSTRAINTS, candidate({ dow: 'mon' })).feasible,
    false,
  );
  // Ends after the window closes.
  assert.equal(
    evaluateCandidate(
      CONSTRAINTS,
      candidate({ endsAt: '2026-11-19T23:30:00-05:00' }),
    ).feasible,
    false,
  );
  // No dietary option they can eat.
  assert.equal(
    evaluateCandidate(CONSTRAINTS, candidate({ dietaryOptions: ['meat'] }))
      .feasible,
    false,
  );
  // Too far.
  assert.equal(
    evaluateCandidate(CONSTRAINTS, candidate({ travelMinutes: 45 })).feasible,
    false,
  );
  // A disliked tag is a hard reject when stated as a dislike.
  assert.equal(
    evaluateCandidate(CONSTRAINTS, candidate({ tags: ['loud_bar', 'food'] }))
      .feasible,
    false,
  );
});

test('constraints: a soft score can never rescue a rejected candidate', () => {
  const loved = candidate({
    estCostPerPersonCents: 9900,
    tags: ['active', 'food'],
  });
  const result = evaluateCandidate(
    { ...CONSTRAINTS, preferenceWeights: { active: 1, food: 1 } },
    loved,
    { softBoost: 10 },
  );
  assert.equal(
    result.feasible,
    false,
    'preference must not override a budget cap',
  );
  assert.equal(
    result.score,
    0,
    'a rejected candidate carries no score to leak a preference',
  );
});

test('tally: reveals a winner and nothing else', () => {
  const answers = [
    {
      memberId: 'm1',
      answers: [
        { candidateId: 'c1', feasible: true, score: 0.4 },
        { candidateId: 'c2', feasible: true, score: 0.9 },
      ],
    },
    {
      memberId: 'm2',
      answers: [
        { candidateId: 'c1', feasible: true, score: 0.5 },
        { candidateId: 'c2', feasible: false, score: 0 },
      ],
    },
    {
      memberId: 'm3',
      answers: [
        { candidateId: 'c1', feasible: true, score: 0.1 },
        { candidateId: 'c2', feasible: true, score: 0.9 },
      ],
    },
  ];
  const candidates = [
    candidate({ candidateId: 'c1', estCostPerPersonCents: 2800 }),
    candidate({ candidateId: 'c2', estCostPerPersonCents: 1500 }),
  ];
  const result = tally({ hangoutId: 'h1', candidates, memberAnswers: answers });
  assert.equal(result.outcome, 'winner');
  assert.equal(
    result.winnerCandidateId,
    'c1',
    'c2 is cheaper and better liked, but one member cannot do it',
  );
  // The result must not say who rejected anything, or how many did.
  const serialized = JSON.stringify(result);
  for (const leak of ['m1', 'm2', 'm3', 'score', 'reject', 'count']) {
    assert.ok(!serialized.includes(leak), `tally result leaks ${leak}`);
  }
  assert.deepEqual(Object.keys(result).sort(), [
    'hangoutId',
    'outcome',
    'winnerCandidateId',
  ]);
  // There is no audit log on the result at all: nothing per-person survives the tally.
  assert.ok(!('auditLog' in result));
});

test('tally: no feasible candidate is an explicit outcome, not an empty winner', () => {
  const answers = [
    {
      memberId: 'm1',
      answers: [{ candidateId: 'c1', feasible: false, score: 0 }],
    },
    {
      memberId: 'm2',
      answers: [{ candidateId: 'c1', feasible: true, score: 0.5 }],
    },
    {
      memberId: 'm3',
      answers: [{ candidateId: 'c1', feasible: true, score: 0.5 }],
    },
  ];
  const result = tally({
    hangoutId: 'h1',
    candidates: [candidate({ candidateId: 'c1' })],
    memberAnswers: answers,
  });
  assert.equal(result.outcome, 'no_plan');
  assert.equal(result.winnerCandidateId, null);
  assert.ok(
    !('unavailableReason' in result),
    'a reason would point at somebody',
  );
});

test('tally: ties break on cost then start, never on who answered', () => {
  const mk = (/** @type {string} */ id, /** @type {number} */ score) => ({
    memberId: id,
    answers: [
      { candidateId: 'cheap-late', feasible: true, score },
      { candidateId: 'cheap-early', feasible: true, score },
      { candidateId: 'dear', feasible: true, score },
    ],
  });
  const result = tally({
    hangoutId: 'h1',
    candidates: [
      candidate({
        candidateId: 'dear',
        estCostPerPersonCents: 3000,
        startsAt: '2026-11-19T18:00:00-05:00',
      }),
      candidate({
        candidateId: 'cheap-late',
        estCostPerPersonCents: 1500,
        startsAt: '2026-11-19T21:00:00-05:00',
      }),
      candidate({
        candidateId: 'cheap-early',
        estCostPerPersonCents: 1500,
        startsAt: '2026-11-19T19:00:00-05:00',
      }),
    ],
    memberAnswers: [mk('m1', 0.5), mk('m2', 0.5), mk('m3', 0.5)],
  });
  assert.equal(result.winnerCandidateId, 'cheap-early');
});

test('tally: every member must have answered every candidate', () => {
  assert.throws(
    () =>
      tally({
        hangoutId: 'h1',
        candidates: [
          candidate({ candidateId: 'c1' }),
          candidate({ candidateId: 'c2' }),
        ],
        memberAnswers: [
          {
            memberId: 'm1',
            answers: [{ candidateId: 'c1', feasible: true, score: 0.5 }],
          },
          {
            memberId: 'm2',
            answers: [{ candidateId: 'c1', feasible: true, score: 0.5 }],
          },
          {
            memberId: 'm3',
            answers: [{ candidateId: 'c1', feasible: true, score: 0.5 }],
          },
        ],
      }),
    /every member must answer every candidate/,
    'a missing answer must never be read as consent',
  );
  assert.throws(
    () =>
      tally({ hangoutId: 'h1', candidates: [candidate()], memberAnswers: [] }),
    /at least three members/,
  );
});

test('vault: only the owning member can read their constraints', () => {
  const vault = new ConstraintVault({ masterKey: 'a'.repeat(64) });
  const stored = vault.put('m1', CONSTRAINTS);
  assert.ok(stored.ciphertext.length > 0);
  assert.ok(
    !stored.ciphertext.includes('3500'),
    'the cap must not be readable in the record',
  );
  assert.deepEqual(vault.get('m1'), CONSTRAINTS);
  assert.throws(() => vault.get('m2'), /no constraints/);

  // A second member's key must not open the first member's record.
  vault.put('m2', { ...CONSTRAINTS, budgetCapCents: 1000 });
  assert.equal(vault.get('m2').budgetCapCents, 1000);
  assert.equal(vault.get('m1').budgetCapCents, 3500);
  assert.throws(() => vault.readAs('m2', 'm1'), /only the owner/);

  // Tampering must fail loudly rather than return plausible data.
  const tampered = {
    ...stored,
    ciphertext: stored.ciphertext.replace(/.$/, '0'),
  };
  assert.throws(
    () => vault.decryptRecord('m1', tampered),
    /could not be decrypted/,
  );
});

test('vault: forgetting a member destroys their constraints', () => {
  const vault = new ConstraintVault({ masterKey: 'b'.repeat(64) });
  vault.put('m1', CONSTRAINTS);
  vault.forget('m1');
  assert.throws(() => vault.get('m1'), /no constraints/);
});

test('payment gate: closed means refused, with no simulated success', () => {
  const gate = new PaymentGate({
    open: false,
    blockingQuestions: ['Q-008'],
    humanApprovalRecorded: false,
  });
  assert.equal(gate.isOpen(), false);
  assert.throws(() => gate.assertOpen('capture'), GateClosedError);
  try {
    gate.assertOpen('capture');
  } catch (error) {
    const payload = /** @type {GateClosedError} */ (error).toPayload();
    assert.equal(payload.code, 'payment_gate_blocked');
    assert.deepEqual(payload.gate.blockingQuestions, ['Q-008']);
    assert.equal(payload.gate.humanApprovalRecorded, false);
    assert.ok(!('simulated' in payload), 'there is no simulated-success path');
  }
  // The gate cannot be opened without a recorded human approval.
  assert.throws(
    () => new PaymentGate({ open: true, humanApprovalRecorded: false }),
    /human approval/,
  );
  const approved = new PaymentGate({
    open: true,
    humanApprovalRecorded: true,
    approvalReference: 'board RV-012',
  });
  assert.equal(approved.isOpen(), true);
  assert.equal(approved.assertOpen('capture'), true);
});
