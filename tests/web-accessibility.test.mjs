// US-204: source-level guards for the fixes the app-stage audit made, so
// CI catches a regression without a browser. The full browser audit is
// tests/a11y/app-audit.mjs (manual; see its header).
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

const app = 'apps/web/src/app';
const pages = files(app).filter((f) => f.endsWith('page.tsx'));
const source = files('apps/web/src')
  .filter((f) => /\.(tsx|ts|css)$/.test(f))
  .map((f) => ({ f, text: readFileSync(f, 'utf8') }));

test('web a11y: every screen names itself in the document title (2.4.2)', () => {
  assert.ok(pages.length >= 19, `only ${pages.length} pages`);
  for (const page of pages) {
    const text = readFileSync(page, 'utf8');
    assert.match(
      text,
      /useDocumentTitle\(|<ScreenHeader/,
      `${page} sets no title`,
    );
  }
  const layout = readFileSync(join(app, 'layout.tsx'), 'utf8');
  assert.doesNotMatch(
    layout.split('export const metadata')[1]?.split('};')[0] ?? '',
    /\btitle\b/,
    'a metadata title overwrites the per-screen title after hydration',
  );
});

test('web a11y: reduced motion and focus-not-obscured live in the global CSS', () => {
  const css = readFileSync(join(app, 'globals.css'), 'utf8');
  assert.match(
    css,
    /prefers-reduced-motion: reduce[\s\S]*animation-duration: 0\.01ms/,
  );
  assert.match(css, /scroll-behavior: auto/);
  assert.match(css, /scroll-padding-bottom/);
});

test('web a11y: no text is faded with opacity utilities (1.4.3)', () => {
  for (const { f, text } of source)
    // `disabled:` is allowed: WCAG 1.4.3 exempts inactive controls.
    for (const m of text.matchAll(
      /className=[`"'][^`"']*?(?<!disabled:)\bopacity-(\d+)/g,
    ))
      assert.fail(
        `${f}: opacity-${m[1]} on an element fades its text below contrast`,
      );
});

test('web a11y: buttons are never listbox options, and toggles say they are pressed', () => {
  for (const { f, text } of source) {
    assert.doesNotMatch(text, /role="option"/, `${f}: option role on a button`);
    assert.doesNotMatch(
      text,
      /role="listbox"/,
      `${f}: listbox without keyboard model`,
    );
  }
  const chat = readFileSync(join(app, 'pods/[podId]/page.tsx'), 'utf8');
  assert.match(chat, /aria-pressed=\{voted\}/);
  assert.match(
    chat,
    /`\$\{voted \? 'Voted' : 'Vote'\} for \$\{activity\.title\}`/,
  );
  assert.doesNotMatch(
    chat,
    /votes\.join\(/,
    'voter ids shown instead of names',
  );
});

test('web a11y: chips and badges are not live regions and keep their visible text as the name', () => {
  const ui = readFileSync('apps/web/src/components/ui.tsx', 'utf8');
  const chip =
    ui.split('export function BalanceChip')[1]?.split('export function')[0] ??
    '';
  assert.doesNotMatch(chip, /role="status"|aria-label=/);
  const badge =
    ui.split('export function LockBadge')[1]?.split('export function')[0] ?? '';
  assert.match(badge, /Only you and your planner see this/);
  assert.doesNotMatch(badge, /aria-label=/);
});

test('web a11y: in-app links point at routes that exist', () => {
  const routes = new Set(
    pages.map(
      (p) =>
        p.slice(app.length, -'/page.tsx'.length).replace(/\[[^\]]+\]/g, '*') ||
        '/',
    ),
  );
  for (const { f, text } of source)
    for (const m of text.matchAll(/href[=:]\s*['"`](\/[^'"`?#]*)['"`]/g)) {
      const path = m[1].replace(/\/pod-\d+/, '/*').replace(/\/evt-\d+/, '/*');
      assert.ok(
        routes.has(path) || path === '/',
        `${f}: link to missing route ${m[1]}`,
      );
    }
});
