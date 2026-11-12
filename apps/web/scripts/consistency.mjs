// HeyPal seed consistency check (brief part 2b). Fails when any screen
// could show a mismatched count or amount. Run with:
// node --experimental-strip-types scripts/consistency.mjs
// (Node 24 strips types without the flag; kept for older runners.)
import assert from 'node:assert/strict';
import {
  EVENTS,
  LEDGER,
  ME_ID,
  PEOPLE,
  PLANS,
  PODS,
  POLL_VOTES,
  READY_WAITING,
  READY_YES,
  moneySummary,
  personName,
  podsNeedingMe,
} from '../src/lib/heypal/seed.ts';
import {
  HOLD_HEYPAL_MS,
  SCENE_HOLD_MS,
} from '../src/features/intro/timeline.ts';

const memberIds = new Set(PEOPLE.map((p) => p.id));
for (const id of [ME_ID]) assert.ok(memberIds.has(id), `unknown person ${id}`);

// Every id referenced anywhere resolves.
for (const pod of PODS) {
  assert.ok(pod.memberIds.length >= 3, `${pod.name}: fewer than 3 members`);
  assert.equal(
    new Set(pod.memberIds).size,
    pod.memberIds.length,
    `${pod.name}: duplicate member`,
  );
  for (const id of pod.memberIds) assert.ok(memberIds.has(id), `unknown ${id}`);
}
for (const [planId, voters] of Object.entries(POLL_VOTES)) {
  const plan = PLANS.find((p) => p.id === planId);
  assert.ok(plan, `unknown plan ${planId}`);
  const pod = PODS.find((p) => p.id === plan.podId);
  for (const v of voters) {
    assert.ok(
      pod.memberIds.includes(v),
      `${v} voted but is not in ${pod.name}`,
    );
  }
}
for (const [planId, yes] of Object.entries(READY_YES)) {
  const plan = PLANS.find((p) => p.id === planId);
  const pod = PODS.find((p) => p.id === plan.podId);
  for (const v of [...yes, ...(READY_WAITING[planId] ?? [])]) {
    assert.ok(pod.memberIds.includes(v), `${v} not in ${pod.name}`);
  }
}

// Ledger shares add up to their totals.
for (const line of LEDGER) {
  assert.equal(
    line.eachCents * line.memberIds.length,
    line.totalCents,
    `${line.id}: shares do not add up`,
  );
  for (const id of [line.paidById, ...line.memberIds]) {
    assert.ok(memberIds.has(id), `${line.id}: unknown person ${id}`);
  }
  personName(line.paidById);
}

// Money screen totals equal the ledger totals.
const summary = moneySummary();
assert.equal(summary.owedToMeCents, 14000, 'owed to me must be $140.00');
assert.equal(summary.iOweCents, 3000, 'I owe must be $30.00');
assert.equal(summary.netCents, 11000, 'net must be +$110.00');
assert.equal(summary.label, "You're owed");

// Orange orbit pods match the needs-me pods.
assert.equal(podsNeedingMe().length, 3, 'exactly 3 pods need me');
assert.deepEqual(
  podsNeedingMe()
    .map((p) => p.id)
    .sort(),
  ['pod-brunch', 'pod-friday', 'pod-hikers'],
);

// No em dash or en dash in any seed string.
const strings = JSON.stringify({ PEOPLE, PODS, PLANS, LEDGER, EVENTS });
assert.doesNotMatch(
  strings,
  /[\u2014\u2013]/,
  'seed contains a forbidden dash',
);

// Intro timeline constants (brief part 0, rules 1 and 2).
assert.ok(HOLD_HEYPAL_MS >= 2400, 'HeyPal must hold at least 2400ms');
assert.ok(SCENE_HOLD_MS >= 1000, 'scenes must hold at least 1000ms');

console.log('consistency: all seed checks pass.');
