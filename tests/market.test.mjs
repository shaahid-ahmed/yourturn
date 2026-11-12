// YT-027: market claims are sourced and dated, sizing is labelled as
// assumptions, and the doc never claims traction.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync('docs/07-gtm/MARKET.md', 'utf8');

/** @param {string} heading */
function rows(heading) {
  const section = doc.split(`## ${heading}\n`)[1]?.split('\n## ')[0] ?? '';
  return section
    .split('\n')
    .filter((l) => l.startsWith('| ') && !/^\| -/.test(l))
    .slice(1);
}

test('market: every evidence row cites a source with a link and a date', () => {
  const evidence = rows('The problem, with evidence');
  assert.ok(evidence.length >= 4);
  for (const row of evidence) {
    assert.match(row, /\]\(https:\/\//, row.slice(0, 60));
    assert.match(row, /20\d\d/, row.slice(0, 60));
  }
});

test('market: every competitor except the group-chat baseline links a dated source', () => {
  const competitors = rows('Competitors');
  assert.ok(competitors.length >= 6);
  for (const row of competitors.filter((r) => !r.includes('Group chats')))
    assert.match(row, /\]\(https:\/\//, row.slice(0, 40));
});

test('market: sizing is assumptions, and there is no traction claim', () => {
  assert.match(doc, /not a forecast/);
  assert.match(doc, /no users, no traction and no revenue/);
  assert.match(doc, /\*\*unknown\*\*/);
  for (const banned of [
    /\bour users\b/i,
    /\bcustomers love\b/i,
    /\bproven demand\b/i,
    /\bvalidated demand\b(?! )/i,
  ])
    assert.doesNotMatch(
      doc.replace('**Hypotheses, not validated demand.**', ''),
      banned,
    );
});

test('market: the not-permitted list covers privacy, booking and sizing claims', () => {
  const list = doc.split('## Claims not permitted without evidence')[1] ?? '';
  for (const must of [
    /cryptographically private/,
    /booking is real/,
    /market size/,
  ])
    assert.match(list, must);
});
