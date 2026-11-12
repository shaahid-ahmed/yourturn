// HeyPal copy check (brief part 1, rule 14): no em dash or en dash
// anywhere in the app source, seed data, or frontend decision docs.
// Run: node scripts/check-copy.mjs (also wired into apps/web lint).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['src', '../../FRONTEND_DECISIONS.md'];
const FORBIDDEN = /[\u2014\u2013]/;

let failures = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(path);
    } else if (/\.(tsx?|css|md|mjs|json)$/.test(name)) {
      const text = readFileSync(path, 'utf8');
      for (const [i, line] of text.split('\n').entries()) {
        if (FORBIDDEN.test(line)) {
          failures += 1;
          console.error(`${relative('.', path)}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  }
}

for (const root of ROOTS) {
  try {
    if (statSync(root).isDirectory()) walk(root);
    else {
      const text = readFileSync(root, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (FORBIDDEN.test(line)) {
          failures += 1;
          console.error(`${root}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  } catch {
    console.error(`check-copy: missing ${root}`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`check-copy: ${failures} forbidden dash(es) found.`);
  process.exit(1);
}
console.log('check-copy: no em dashes or en dashes. All clear.');
