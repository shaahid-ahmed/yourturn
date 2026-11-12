// UN-009: the claims in PRIVACY.md "Private budget answers" hold in code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { checkBudget } from '../services/ai/copilot/budget-check.mjs';
import { openDatabase, migrate } from '../services/api/src/db/database.mjs';

test('a feasibility check returns only the member and a yes/no', () => {
  for (const cost of [1000, 9000]) {
    const result = checkBudget(
      { memberId: 'u-1', budgetCapCents: 4000, estCostPerPersonCents: cost },
      null,
    );
    assert.deepEqual(Object.keys(result).sort(), ['feasible', 'memberId']);
  }
});

test('no table can persist a per-member feasibility answer', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  const columns = db
    .prepare(
      "SELECT m.name AS t, p.name AS c FROM sqlite_master m, pragma_table_info(m.name) p WHERE m.type = 'table'",
    )
    .all()
    .map((r) => `${r.t}.${r.c}`);
  for (const col of columns)
    assert.doesNotMatch(
      col,
      /feasib|fits?_|_fit\b|works_for|budget_cap|limit_cents/i,
      col,
    );
  // The stretch ask is stored on purpose, but it can never be addressed to a pod.
  assert.ok(columns.includes('stretch_ask.user_id'));
  assert.ok(!columns.some((c) => c.startsWith('stretch_ask.pod')));
});

test('the HTTP layer does not log requests', () => {
  const app = readFileSync('services/api/src/http/app.mjs', 'utf8');
  assert.match(app, /Fastify\(\{ logger: false \}\)/);
});

test('PRIVACY.md states the boundary is not cryptographic and lists the open leaks', () => {
  const doc = readFileSync('docs/05-risk/PRIVACY.md', 'utf8');
  assert.match(doc, /architectural and policy-based, not cryptographic/);
  assert.match(doc, /inference over rounds/i);
  for (const id of ['PV-08', 'PV-09', 'PV-10'])
    assert.match(doc, new RegExp(`\\| ${id} `));
});
