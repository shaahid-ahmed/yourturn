// US-202: FLOWS.md specifies every screen in the spec's page map, each with
// its loading, empty, error and refused states, and keeps the spec's rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const flows = readFileSync('docs/02-design/FLOWS.md', 'utf8');

/** @returns {Map<number, string>} screen number → its section text */
function screens() {
  /** @type {Map<number, string>} */
  const map = new Map();
  const parts = flows.split(/^### /m).slice(1);
  for (const part of parts) {
    const match = part.match(/^P(\d+) /);
    if (match) map.set(Number(match[1]), part.split(/^## /m)[0]);
  }
  return map;
}

test('flows: all 23 screens from the page map are specified exactly once', () => {
  const found = screens();
  assert.deepEqual(
    [...found.keys()].sort((a, b) => a - b),
    Array.from({ length: 23 }, (_, i) => i + 1),
  );
  const headings = [...flows.matchAll(/^### P(\d+) /gm)].map((m) => m[1]);
  assert.equal(headings.length, 23, 'a screen heading is duplicated');
});

test('flows: every screen has loading, empty, error and refused states', () => {
  for (const [n, text] of screens())
    for (const state of ['Loading', 'Empty', 'Error', 'Refused'])
      assert.match(
        text,
        new RegExp(`^\\| ${state} +\\| \\S`, 'm'),
        `P${n} is missing its ${state} state`,
      );
});

test('flows: every screen cites the spec page it implements', () => {
  for (const [n, text] of screens())
    assert.match(text.split('\n')[0], /spec p\.\d+/, `P${n} has no spec page`);
});

test('flows: global rules from the spec are stated', () => {
  assert.match(flows, /--target-min.*44px/);
  assert.match(flows, /No hover-only affordance/);
  assert.match(flows, /Simulated booking/);
  assert.match(flows, /Sandbox — no real money/);
  assert.match(flows, /Only you and your planner see this/);
  assert.match(flows, /never (?:as )?a call-out in the chat/);
});

test('flows: no screen labels an option budget-friendly or explains a pick', () => {
  // The only allowed mentions are the prohibition itself.
  for (const phrase of ['budget-friendly', 'why this one']) {
    for (const line of flows.split('\n').filter((l) => l.includes(phrase)))
      assert.match(line, /\bno\b|\bnever\b|carries/i, line);
  }
});

test('flows: private content is confined to P4, P19, P22 and P23', () => {
  const allowed = new Set([4, 19, 22, 23]);
  for (const [n, text] of screens()) {
    if (allowed.has(n)) continue;
    assert.doesNotMatch(
      text,
      /--color-private|lock badge "Only you/,
      `P${n} renders private styling`,
    );
  }
});
