// US-201: the design tokens keep the promises DESIGN_SYSTEM.md makes.
// Contrast is computed here from the token file, not trusted from the doc.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('apps/web/src/styles/tokens.css', 'utf8');
const doc = readFileSync('docs/02-design/DESIGN_SYSTEM.md', 'utf8');

/** @param {string} block @returns {Map<string, string>} */
function declarations(block) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g))
    map.set(match[1], match[2].replace(/\s+/g, ' ').trim());
  return map;
}

const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const reducedStart = withoutComments.indexOf('@media (prefers-reduced-motion');
assert.ok(reducedStart > 0, 'tokens.css needs a reduced-motion block');
const root = declarations(withoutComments.slice(0, reducedStart));
const reduced = declarations(withoutComments.slice(reducedStart));

/** @param {string} name */
function token(name) {
  const value = root.get(name);
  assert.ok(value, `missing token ${name}`);
  return value;
}

/** @param {string} hex */
function luminance(hex) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** @param {string} a @param {string} b */
function contrast(a, b) {
  const [hi, lo] = [luminance(token(a)), luminance(token(b))].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum]. 4.5 = WCAG 1.4.3 text, 3 = 1.4.11 non-text.
/** @type {Array<[string, string, number]>} */
const pairs = [
  ['--color-ink', '--color-paper', 4.5],
  ['--color-ink', '--color-surface', 4.5],
  ['--color-ink', '--color-surface-sunken', 4.5],
  ['--color-ink-muted', '--color-paper', 4.5],
  ['--color-ink-muted', '--color-surface', 4.5],
  ['--color-ink-muted', '--color-surface-sunken', 4.5],
  ['--color-ink-muted', '--color-private-surface', 4.5],
  ['--color-on-action', '--color-action', 4.5],
  ['--color-on-action', '--color-action-pressed', 4.5],
  ['--color-on-action-disabled', '--color-action-disabled', 4.5],
  ['--color-border', '--color-paper', 3],
  ['--color-border', '--color-surface', 3],
  ['--color-focus', '--color-paper', 3],
  ['--color-focus', '--color-surface', 3],
  ['--color-paypal-line', '--color-paper', 3],
  ['--color-paypal-line', '--color-surface', 3],
  ['--color-private', '--color-private-surface', 4.5],
  ['--color-private', '--color-surface', 4.5],
  ['--color-status-owed', '--color-status-owed-surface', 4.5],
  ['--color-status-pending', '--color-status-pending-surface', 4.5],
  ['--color-status-paid', '--color-status-paid-surface', 4.5],
  ['--color-status-failed', '--color-status-failed-surface', 4.5],
  ['--color-status-owed', '--color-surface', 4.5],
  ['--color-status-paid', '--color-surface', 4.5],
  ['--color-status-failed', '--color-surface', 4.5],
  ['--color-notice', '--color-notice-surface', 4.5],
  ...[1, 2, 3, 4, 5, 6].flatMap(
    (n) =>
      /** @type {Array<[string, string, number]>} */ ([
        ['--color-ink', `--color-bubble-${n}`, 4.5],
        ['--color-ink-muted', `--color-bubble-${n}`, 4.5],
      ]),
  ),
];

test('design tokens: every listed colour pair meets its WCAG 2.2 AA minimum', () => {
  for (const [fg, bg, min] of pairs) {
    const ratio = contrast(fg, bg);
    assert.ok(
      ratio >= min,
      `${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`,
    );
  }
});

test('design tokens: phone-first width and 44px touch targets', () => {
  assert.equal(token('--layout-min'), '360px');
  assert.equal(token('--layout-max'), '430px');
  assert.ok(parseInt(token('--target-min'), 10) >= 44);
  assert.ok(
    parseInt(token('--target-comfortable'), 10) >=
      parseInt(token('--target-min'), 10),
  );
  // rem-based type so the phone's text-size setting scales it.
  for (const name of [...root.keys()].filter((n) => n.startsWith('--text-')))
    assert.match(token(name), /^\d*\.?\d+rem$/, name);
  assert.ok(
    parseFloat(token('--text-caption')) * 16 >= 12,
    'no text under 12px',
  );
});

test('design tokens: PayPal blue is line art only, never a fill or a button', () => {
  const blue = token('--color-paypal-line').toLowerCase();
  for (const [name, value] of root) {
    const usesBlue =
      value.toLowerCase().includes(blue) || value.includes('--color-paypal');
    if (!usesBlue || name === '--color-paypal-line') continue;
    assert.fail(
      `${name} reuses PayPal blue; only --color-paypal-line may hold it`,
    );
  }
  // No other token may be a near-duplicate that sneaks the blue back in as a fill.
  for (const [name, value] of root) {
    if (!/^#[0-9a-f]{6}$/i.test(value) || name === '--color-paypal-line')
      continue;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
    const saturatedBlue = b > 150 && b - r > 80 && b - g > 40;
    assert.ok(!saturatedBlue, `${name} (${value}) is a saturated blue`);
  }
  assert.match(doc, /PayPal blue[^.]*line art only/i);
  assert.match(doc, /never (?:a |for )?fills?/i);
});

test('design tokens: reduced motion zeroes every duration', () => {
  const durations = [...root.keys()].filter((n) => n.startsWith('--duration-'));
  assert.ok(durations.length >= 4);
  for (const name of durations)
    assert.equal(reduced.get(name), '0ms', `${name} under reduced motion`);
});

test('design system doc lists every colour token it defines', () => {
  for (const name of [...root.keys()].filter((n) => n.startsWith('--color-')))
    assert.ok(doc.includes(`\`${name}\``), `DESIGN_SYSTEM.md omits ${name}`);
});
