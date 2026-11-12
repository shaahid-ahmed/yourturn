// US-204 (design stage): colour is never the only signal, the WCAG 2.2
// additions are addressed, the audit's fixes stay in place, and the doc
// never claims conformance for screens that have not been tested.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const a11y = readFileSync('docs/02-design/ACCESSIBILITY.md', 'utf8');
const css = readFileSync('apps/web/src/styles/tokens.css', 'utf8');
const flows = readFileSync('docs/02-design/FLOWS.md', 'utf8');

/** @param {string} heading @returns {string[][]} table rows under a heading */
function table(heading) {
  const section = a11y.split(`## ${heading}\n`)[1]?.split('\n## ')[0];
  assert.ok(section, `missing section ${heading}`);
  return section
    .split('\n')
    .filter((line) => line.startsWith('| ') && !/^\| -/.test(line))
    .slice(1)
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

test('accessibility: every colour meaning has a non-colour cue', () => {
  const rows = table('Colour is never the only signal');
  assert.ok(rows.length >= 12, `only ${rows.length} rows`);
  for (const [where, meaning, cue] of rows) {
    assert.ok(where && meaning, 'incomplete row');
    assert.ok(cue && cue.length > 10, `${meaning}: no non-colour cue`);
  }
  // The balance statuses are the highest-risk colour use; all four are covered.
  const meanings = rows.map((row) => row[1]).join('\n');
  for (const status of ['owed', 'pending', 'paid', 'failed'])
    assert.match(meanings, new RegExp(`Balance ${status}`));
});

test('accessibility: the WCAG 2.2 additions at A/AA are each addressed', () => {
  const criteria = table('Criterion map (WCAG 2.2 AA)').map((row) => row[0]);
  for (const id of ['2.4.11', '2.5.7', '2.5.8', '3.2.6', '3.3.7', '3.3.8'])
    assert.ok(
      criteria.some((c) => c.startsWith(`${id} `)),
      `criterion ${id} missing`,
    );
  for (const row of table('Criterion map (WCAG 2.2 AA)'))
    assert.match(row[1], /^(Designed|Fixed here|Verified|Open|App)$/, row[0]);
});

test('accessibility: fixes found by the audit stay in the design', () => {
  assert.match(css, /--layout-floor:\s*320px;/); // A-03, 1.4.10
  assert.match(css, /--scroll-padding-bottom:/); // A-06, 2.4.11
  assert.match(flows, /one-time-code/); // A-09, 3.3.8
  assert.match(flows, /accepts paste/);
});

test('accessibility: findings have an owner and a status', () => {
  const findings = table('Findings');
  assert.ok(findings.length >= 5);
  for (const [id, severity, finding, owner, status] of findings) {
    assert.match(id, /^A-\d{2}$/);
    assert.match(severity, /^(High|Medium|Low)$/, id);
    assert.ok(finding && owner && status, `${id} incomplete`);
  }
});

test('accessibility: no conformance claim before an app audit', () => {
  assert.match(a11y, /device screen-reader pass not yet done/i);
  assert.match(a11y, /No conformance claim/);
  assert.doesNotMatch(
    a11y,
    /\b(conforms to|is WCAG[ -]compliant|fully accessible)\b/i,
  );
});
