// US-205: guards for the design-QA fixes, so the built screens keep
// following the design system and the spec's honesty rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} dir @returns {string[]} */
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const tsx = files('apps/web/src')
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => ({
    f,
    // Only what renders: drop line and block comments.
    ui: readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ''),
  }));
const app = 'apps/web/src/app';
/** @param {string} path */
const read = (path) => readFileSync(join(app, path), 'utf8');

test('design QA: the app uses the design tokens, not its own palette', () => {
  const css = read('globals.css');
  assert.match(css, /@import '\.\.\/styles\/tokens\.css';/);
  assert.match(css, /--color-accent: var\(--color-action\)/);
  for (const { f, ui } of tsx)
    for (const m of ui.matchAll(/#[0-9a-fA-F]{6}\b/g))
      assert.fail(`${f}: hard-coded colour ${m[0]}; use a token`);
});

test('design QA: PayPal blue is never a fill', () => {
  for (const { f, ui } of tsx)
    assert.doesNotMatch(ui, /bg-\[var\(--color-paypal-line\)\]/, f);
});

test('design QA: no spec notes, open-question ids or implementation notes on screen', () => {
  const leaks =
    /section 12|of (?:the )?spec|sources are open|\bQ-0\d\d\b|append-only|deterministic|policy-pending|budget-friendly|why this one|connection-strength/i;
  for (const { f, ui } of tsx) assert.doesNotMatch(ui, leaks, f);
});

test('design QA: settings has exactly the four notification switches and no YourTurn controls', () => {
  const settings = read('hub/settings/page.tsx');
  const labels = [...settings.matchAll(/<Toggle[\s\S]*?label="([^"]+)"/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(labels, [
    'Polls',
    'Reminders',
    'Private planner asks',
    'Money',
  ]);
  assert.doesNotMatch(
    settings,
    /Pause membership|View my data|connection tracking/i,
  );
  assert.match(settings, /Log out/);
  assert.match(settings, /Your planner sees[\s\S]*Your pod sees/);
});

test('design QA: settle up cannot mark a balance paid while the gate is closed', () => {
  const settle = read('money/settle/page.tsx');
  assert.match(settle, /const PAYMENT_GATE_OPEN = false;/);
  assert.match(settle, /disabled=\{!PAYMENT_GATE_OPEN\}/);
  assert.doesNotMatch(
    settle,
    /setTimeout/,
    'a timer must never fake a payment',
  );
  assert.doesNotMatch(
    settle,
    /status: 'paid' as/,
    'only a verified webhook marks paid',
  );
});

test('design QA: bookings are labelled simulated and the ready check names answers', () => {
  const chat = read('pods/[podId]/page.tsx');
  assert.match(chat, /Simulated booking/);
  assert.match(chat, /'Not answered'/);
});

test('design QA: the hub reaches all seven hub pages and the private dot is not on a pod', () => {
  const home = read('home/page.tsx');
  for (const href of [
    '/money',
    '/hub/events',
    '/hub/calendar',
    '/hub/profile',
    '/hub/settings',
    '/hub/payment-methods',
    '/hub/planner',
  ])
    assert.ok(home.includes(`href: '${href}'`), `hub is missing ${href}`);
  assert.match(home, /<dialog/);
  const bubble =
    home.split('function PodBubble')[1]?.split('function ')[0] ?? '';
  assert.doesNotMatch(bubble, /hasPrivateDot/);
});

test('design QA: private content sits on the private surface with the spec badge', () => {
  assert.match(read('hub/profile/page.tsx'), /private-surface/);
  assert.match(read('hub/planner/page.tsx'), /private-surface/);
  assert.match(read('profile/create/page.tsx'), /private-surface/);
  const ui = readFileSync('apps/web/src/components/ui.tsx', 'utf8');
  assert.match(ui, /--color-private\)/);
});

test('design QA record: every page P1–P23 is covered and every recorded deviation has an owner', () => {
  const qa = readFileSync('docs/02-design/DESIGN_QA.md', 'utf8');
  const rows = qa
    .split('## Screen by screen')[1]
    .split('\n## ')[0]
    .split('\n')
    .filter((l) => /^\| P\d/.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  const covered = new Set(
    rows.flatMap(([page]) =>
      [...page.matchAll(/P(\d+)/g)].map((m) => Number(m[1])),
    ),
  );
  for (let n = 1; n <= 23; n++) assert.ok(covered.has(n), `P${n} not covered`);
  for (const [page, , result, , owner] of rows) {
    assert.match(result, /^(Matches|Fixed|Recorded)$/, page);
    if (result === 'Recorded') assert.notEqual(owner, '—', `${page}: no owner`);
  }
});
