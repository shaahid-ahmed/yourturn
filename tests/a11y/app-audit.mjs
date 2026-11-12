// @ts-nocheck
// US-204 app-stage accessibility audit. Manual retest tool, not part of
// `npm test`: it needs a browser and a running web app.
//
// What it checks on every screen, at 390px and 320px wide, with reduced motion:
//   - axe-core rules tagged wcag2a/2aa/21a/21aa/22aa (390px)
//   - document title (2.4.2), horizontal overflow at 320px and at 200% text (1.4.10, 1.4.4)
//   - text spacing overrides clip nothing (1.4.12)
//   - every interactive element is at least 44x44px (our bar; WCAG 2.5.8 needs 24px)
//   - keyboard: Tab reaches every control and each shows a focus indicator (2.1.1, 2.4.7)
//   - the accessibility tree a screen reader receives (written to aria/<route>.txt)
//
// Run (deps go in a scratch folder so the repo lockfile is untouched):
//   mkdir -p /tmp/a11y && (cd /tmp/a11y && npm i playwright-core@1.56.1 axe-core@4.11.0)
//   (cd apps/web && npx next dev -p 3100) &
//   AUDIT_DEPS=/tmp/a11y node tests/a11y/app-audit.mjs
// Uses the system Google Chrome (channel "chrome").
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const deps = process.env.AUDIT_DEPS;
if (!deps)
  throw new Error(
    'Set AUDIT_DEPS to a folder with playwright-core and axe-core installed',
  );
const { chromium } = await import(
  join(deps, 'node_modules/playwright-core/index.mjs')
);
const axeSrc = readFileSync(
  join(deps, 'node_modules/axe-core/axe.min.js'),
  'utf8',
);
const base = process.env.BASE ?? 'http://localhost:3100';
const out = process.env.OUT ?? '.local/a11y-audit';
mkdirSync(join(out, 'aria'), { recursive: true });

const routes = [
  '/',
  '/signin',
  '/subscribe',
  '/profile/create',
  '/home',
  '/pods/create',
  '/pods/pod-1',
  '/pods/pod-1/settings',
  '/pods/pod-1/after',
  '/money',
  '/money/payer',
  '/money/settle',
  '/hub/events',
  '/hub/events/evt-001',
  '/hub/calendar',
  '/hub/profile',
  '/hub/settings',
  '/hub/payment-methods',
  '/hub/planner',
];
const interactive =
  'a[href],button,input,select,textarea,[role=button],[role=switch],[role=checkbox],[role=radio],[role=tab],[tabindex]:not([tabindex="-1"])';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
for (const width of [390, 320]) {
  const ctx = await browser.newContext({
    viewport: { width, height: 844 },
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  for (const route of routes) {
    const r = { route, width };
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    r.title = await page.title();
    r.overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    r.smallTargets = await page.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((e) => {
            const s = getComputedStyle(e);
            const b = e.getBoundingClientRect();
            return (
              s.display !== 'none' &&
              s.visibility !== 'hidden' &&
              b.width > 0 &&
              (b.width < 44 || b.height < 44)
            );
          })
          .map(
            (e) =>
              `${e.tagName.toLowerCase()} "${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)}"`,
          ),
      interactive,
    );
    if (width === 390) {
      await page.addScriptTag({ content: axeSrc });
      const axe = await page.evaluate(() =>
        window.axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
          },
        }),
      );
      r.axe = axe.violations.map(
        (v) => `${v.id} (${v.impact}) x${v.nodes.length}`,
      );
      r.overflowAt200 = await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
        const o =
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth;
        document.documentElement.style.fontSize = '';
        return o;
      });
      const seen = [];
      const noFocus = [];
      for (let i = 0; i < 80; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const e = document.activeElement;
          if (!e || e === document.body || e.tagName === 'NEXTJS-PORTAL')
            return null;
          if (e.dataset.auditSeen) return { repeat: true };
          e.dataset.auditSeen = '1';
          const s = getComputedStyle(e);
          return {
            name: `${e.tagName.toLowerCase()}:${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 25)}`,
            visible:
              (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) ||
              s.boxShadow !== 'none',
          };
        });
        if (!f || f.repeat) break;
        seen.push(f.name);
        if (!f.visible) noFocus.push(f.name);
      }
      r.tabStops = seen.length;
      r.noFocusIndicator = noFocus;
      await page.addStyleTag({
        content:
          '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
      });
      r.clippedWithTextSpacing = await page.evaluate(
        () =>
          [...document.querySelectorAll('body *')].filter((e) => {
            if (!e.textContent.trim() || e.children.length) return false;
            const s = getComputedStyle(e);
            return (
              (s.overflow === 'hidden' || s.textOverflow === 'ellipsis') &&
              (e.scrollWidth > e.clientWidth + 1 ||
                e.scrollHeight > e.clientHeight + 1)
            );
          }).length,
      );
      writeFileSync(
        join(out, 'aria', `${route.replace(/\W+/g, '_') || 'root'}.txt`),
        await page.locator('body').ariaSnapshot(),
      );
    }
    results.push(r);
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
let failures = 0;
for (const r of results) {
  const problems = [
    r.title === 'Unspoken' && 'generic title',
    r.overflow > 0 && `overflow ${r.overflow}px`,
    r.overflowAt200 > 0 && `overflow at 200% text`,
    r.smallTargets.length && `${r.smallTargets.length} targets < 44px`,
    r.axe?.length && `axe: ${r.axe.join(', ')}`,
    r.noFocusIndicator?.length &&
      `no focus indicator: ${r.noFocusIndicator.join(', ')}`,
    r.clippedWithTextSpacing &&
      `${r.clippedWithTextSpacing} clipped with text spacing`,
  ].filter(Boolean);
  failures += problems.length;
  console.log(
    `${String(r.width).padEnd(4)}${r.route.padEnd(22)}${problems.length ? problems.join('; ') : 'ok'}${r.tabStops ? `  (${r.tabStops} tab stops)` : ''}`,
  );
}
console.log(
  failures ? `${failures} problem(s)` : 'no problems found by automation',
);
process.exitCode = failures ? 1 : 0;
