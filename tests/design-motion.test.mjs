// US-203: every motion moment has a token, a text equivalent and a
// reduced-motion equivalent; ambient motion rests within 5 seconds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const motion = readFileSync('docs/02-design/MOTION.md', 'utf8');
const css = readFileSync('apps/web/src/styles/tokens.css', 'utf8');

/** @returns {Map<string, string>} moment heading → its section text */
function moments() {
  /** @type {Map<string, string>} */
  const map = new Map();
  const body = motion.split(/^## The moments$/m)[1]?.split(/^## /m)[0] ?? '';
  for (const part of body.split(/^### /m).slice(1))
    map.set(part.split('\n')[0], part);
  return map;
}

test('motion: the five required moments are specified', () => {
  const names = [...moments().keys()].join('\n');
  for (const required of [
    'Logo turn',
    'Bubble drift',
    'Card arrival',
    'Booking pop',
    'Balance thread',
  ])
    assert.match(names, new RegExp(`★ ${required}`), required);
});

test('motion: every moment has a text and a reduced-motion equivalent', () => {
  const all = moments();
  assert.ok(all.size >= 9, `only ${all.size} moments`);
  for (const [name, text] of all) {
    assert.match(text, /\*\*Reduced motion:\*\* \S/, `${name}: reduced motion`);
    assert.match(
      text,
      /\*\*Text equivalent:\*\* \S/,
      `${name}: text equivalent`,
    );
    assert.match(text, /spec p\.\d+/, `${name}: spec page`);
  }
});

test('motion: every token a moment names exists and zeroes under reduced motion', () => {
  const reducedBlock = css.split('@media (prefers-reduced-motion: reduce)')[1];
  assert.ok(reducedBlock);
  const named = new Set(
    [...motion.matchAll(/`(--duration-[a-z-]+)`/g)].map((m) => m[1]),
  );
  assert.ok(named.size >= 9);
  for (const token of named) {
    assert.match(css, new RegExp(`${token}:\\s*\\d+m?s;`), `${token} missing`);
    assert.match(
      reducedBlock,
      new RegExp(`${token}:\\s*0ms;`),
      `${token} not zeroed`,
    );
  }
});

test('motion: ambient motion rests within 5 seconds (WCAG 2.2.2)', () => {
  const limit = css.match(/--ambient-limit:\s*(\d+)s;/);
  assert.ok(limit, '--ambient-limit missing');
  assert.ok(Number(limit[1]) <= 5);
  assert.match(motion, /WCAG 2\.2\.2/);
  assert.match(motion, /Nothing flashes more than three times a second/);
});
