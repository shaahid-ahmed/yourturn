// YT-026: the trust & safety assessment covers every required area, gives
// each scenario a severity and an owner, and its "verified" controls hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { openDatabase, migrate } from '../services/api/src/db/database.mjs';
import { INVITE_LINK_TTL_MS, MAX_MEMBERS } from '../services/api/src/pods.mjs';

const doc = readFileSync('docs/05-risk/TRUST_SAFETY.md', 'utf8');

test('trust & safety: every area from the role file is covered', () => {
  for (const heading of [
    'Payer misuse',
    'Exclusion',
    'Harassment',
    'Coercion to join or pay',
    'Private hardship and safe exit',
    'Retaliatory ranking',
    'Moderation boundaries',
  ])
    assert.match(doc, new RegExp(`^## ${heading}$`, 'm'), heading);
  assert.doesNotMatch(doc, /TODO \(Trust/);
});

test('trust & safety: every scenario has a severity and a requirement with an owner', () => {
  const rows = doc.split('\n').filter((l) => /^\| TS-\d{2} /.test(l));
  assert.ok(rows.length >= 15, `${rows.length} scenarios`);
  const ids = rows.map((r) => r.split('|')[1].trim());
  assert.equal(new Set(ids).size, ids.length, 'duplicate scenario id');
  for (const row of rows) {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    assert.match(cells[2], /^(\*\*High\*\*|Medium|Low)$/, cells[0]);
    assert.ok(cells[5].length > 3, `${cells[0]}: no requirement`);
  }
});

test('trust & safety: the controls the doc calls verified hold in code', () => {
  // TS-10: single-use invite links expire after 7 days; pods cap at 8.
  assert.equal(INVITE_LINK_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(MAX_MEMBERS, 8);
  // TS-05: the split counts only members still in the pod.
  assert.match(
    readFileSync('services/api/src/split.mjs', 'utf8'),
    /m\.left_at IS NULL/,
  );
  // TS-01: actual totals are append-only (history exists).
  const db = openDatabase(':memory:');
  migrate(db);
  const triggers = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'split_actual_total'",
    )
    .all()
    .map((r) => r.name);
  assert.ok(triggers.includes('split_actual_total_no_update'));
  // TS-12: the stretch ceiling is 20% above the cap.
  assert.match(
    readFileSync('services/ai/copilot/budget-check.mjs', 'utf8'),
    /STRETCH_RATIO = 1\.2;/,
  );
});
