import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const requiredPaths = [
  'AGENTS.md',
  'CLAUDE.md',
  '.cursorrules',
  '.github',
  '.github/copilot-instructions.md',
  '.github/CODEOWNERS',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/workflows/ci.yml',
  'agents',
  'agents/RULES.md',
  'agents/HANDOFF.md',
  'agents/ROSTER.md',
  'agents/roles',
  'agents/roles/orchestrator.md',
  'agents/roles/product-manager.md',
  'agents/roles/behavioral-scientist.md',
  'agents/roles/ux-researcher.md',
  'agents/roles/product-designer.md',
  'agents/roles/content-designer.md',
  'agents/roles/accessibility.md',
  'agents/roles/architect.md',
  'agents/roles/backend.md',
  'agents/roles/payments.md',
  'agents/roles/frontend.md',
  'agents/roles/ml-engineer.md',
  'agents/roles/llm-engineer.md',
  'agents/roles/data-analytics.md',
  'agents/roles/qa.md',
  'agents/roles/sre-devops.md',
  'agents/roles/security.md',
  'agents/roles/privacy.md',
  'agents/roles/legal-compliance.md',
  'agents/roles/trust-safety.md',
  'agents/roles/growth-market.md',
  'agents/roles/demo-pitch.md',
  'agents/roles/tech-writer.md',
  'agents/roles/reviewer.md',
  'tasks',
  'tasks/BOARD.md',
  'tasks/STATUS.md',
  'docs',
  'docs/00-context',
  'docs/00-context/PRODUCT.md',
  'docs/00-context/GLOSSARY.md',
  'docs/00-context/CONSTRAINTS.md',
  'docs/01-product',
  'docs/01-product/PRD.md',
  'docs/01-product/USER_STORIES.md',
  'docs/01-product/METRICS.md',
  'docs/02-design',
  'docs/02-design/DESIGN_SYSTEM.md',
  'docs/02-design/FLOWS.md',
  'docs/02-design/VOICE_AND_TONE.md',
  'docs/03-architecture',
  'docs/03-architecture/ARCHITECTURE.md',
  'docs/03-architecture/DATA_MODEL.md',
  'docs/03-architecture/API.md',
  'docs/03-architecture/PAYMENTS.md',
  'docs/03-architecture/AI.md',
  'docs/04-behavioral',
  'docs/04-behavioral/PRINCIPLES.md',
  'docs/04-behavioral/ETHICS_CHECKLIST.md',
  'docs/04-behavioral/RESEARCH_NOTES.md',
  'docs/05-risk',
  'docs/05-risk/THREAT_MODEL.md',
  'docs/05-risk/PRIVACY.md',
  'docs/05-risk/COMPLIANCE.md',
  'docs/05-risk/TRUST_SAFETY.md',
  'docs/06-ops',
  'docs/06-ops/RUNBOOK.md',
  'docs/06-ops/ENVIRONMENTS.md',
  'docs/07-gtm',
  'docs/07-gtm/MARKET.md',
  'docs/07-gtm/PITCH.md',
  'docs/07-gtm/DEMO_SCRIPT.md',
  'docs/decisions',
  'docs/decisions/TEMPLATE.md',
  'docs/decisions/0001-record-architecture-decisions.md',
  'apps',
  'apps/web',
  'services',
  'services/api',
  'services/ai',
  'packages',
  'packages/shared',
  'infra',
  'tests',
  'tests/e2e',
  'tests/fixtures',
  '.env.example',
  'README.md',
];
const rolePaths = [
  'agents/roles/orchestrator.md',
  'agents/roles/product-manager.md',
  'agents/roles/behavioral-scientist.md',
  'agents/roles/ux-researcher.md',
  'agents/roles/product-designer.md',
  'agents/roles/content-designer.md',
  'agents/roles/accessibility.md',
  'agents/roles/architect.md',
  'agents/roles/backend.md',
  'agents/roles/payments.md',
  'agents/roles/frontend.md',
  'agents/roles/ml-engineer.md',
  'agents/roles/llm-engineer.md',
  'agents/roles/data-analytics.md',
  'agents/roles/qa.md',
  'agents/roles/sre-devops.md',
  'agents/roles/security.md',
  'agents/roles/privacy.md',
  'agents/roles/legal-compliance.md',
  'agents/roles/trust-safety.md',
  'agents/roles/growth-market.md',
  'agents/roles/demo-pitch.md',
  'agents/roles/tech-writer.md',
  'agents/roles/reviewer.md',
];
const headings = [
  'Mission',
  'Owns (write access)',
  'Reads',
  'Inputs',
  'Outputs',
  'Must never',
  'Definition of done',
  'Hands off to',
];

test('all original requested paths plus stack ADR and status exist', () => {
  for (const path of [...requiredPaths, 'docs/decisions/0002-stack.md']) {
    assert.ok(existsSync(path), `Missing required path: ${path}`);
    if (statSync(path).isFile())
      assert.ok(readFileSync(path, 'utf8').trim(), `Empty file: ${path}`);
  }
});

test('all 24 exact roles have the eight required sections and roster entries', () => {
  const actual = readdirSync('agents/roles')
    .filter((file) => file.endsWith('.md'))
    .sort();
  assert.deepEqual(
    actual,
    rolePaths.map((path) => path.split('/').at(-1)).sort(),
  );
  assert.equal(actual.length, 24);
  const roster = readFileSync('agents/ROSTER.md', 'utf8');
  for (const path of rolePaths) {
    const text = readFileSync(path, 'utf8');
    const actualHeadings = [...text.matchAll(/^## (.+)$/gm)].map(
      (match) => match[1],
    );
    assert.deepEqual(actualHeadings, headings, path);
    assert.ok(roster.includes(`roles/${path.split('/').at(-1)}`), path);
    assert.doesNotMatch(text, /\bTODO\b|<your-role>|<Role name>/, path);
  }
});

test('agent pointers are exact and all 24 rules are retained', () => {
  for (const path of [
    'CLAUDE.md',
    '.cursorrules',
    '.github/copilot-instructions.md',
  ]) {
    assert.equal(
      readFileSync(path, 'utf8'),
      'Read AGENTS.md first. All rules there apply.\n',
    );
  }
  const rules = readFileSync('agents/RULES.md', 'utf8');
  const numbers = [...rules.matchAll(/^(\d+)\. /gm)].map((match) =>
    Number(match[1]),
  );
  assert.deepEqual(
    numbers,
    Array.from({ length: 24 }, (_, i) => i + 1),
  );
  assert.match(rules, /money logic at 100% branch coverage/);
  assert.match(rules, /Human approval gates/);
});

test('board has six state tables, 42 unique tasks, valid dependencies and no dependency cycles', () => {
  const board = readFileSync('tasks/BOARD.md', 'utf8');
  for (const state of [
    'TODO',
    'IN PROGRESS',
    'IN REVIEW',
    'DONE',
    'BLOCKED',
    'LATER',
  ]) {
    const section = board.split(`## ${state}\n`)[1]?.split('\n## ')[0];
    assert.ok(section, `Missing section ${state}`);
    assert.match(
      section,
      /\| ID +\| Title +\| Role +\| Depends on +\| Acceptance criteria +\| Claimed by +\| Branch\/PR +\|/,
    );
  }
  // YourTurn rows are history (ADR 0006 pivoted the product); Unspoken rows are live.
  // Both must satisfy the same structural rules, so a pivot cannot smuggle in a malformed row.
  const rows = board
    .split('\n')
    .filter((line) => /^\| (?:YT|UN)-\d{3}\s*\|/.test(line));
  const legacy = rows.filter((line) => line.startsWith('| YT-'));
  const current = rows.filter((line) => line.startsWith('| UN-'));
  assert.equal(
    legacy.length,
    42,
    'the 42 YourTurn rows are history and must not be deleted',
  );
  assert.ok(current.length > 0, 'Unspoken tasks must exist after ADR 0006');
  const parsed = rows.map((line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()),
  );
  const ids = parsed.map((cells) => cells[0]);
  assert.equal(
    new Set(ids).size,
    ids.length,
    'task ids must be unique across both series',
  );
  /** @type {Map<string, string[]>} */
  const deps = new Map();
  for (const cells of parsed) {
    assert.equal(cells.length, 7);
    for (const cell of cells) assert.ok(cell);
    const needed = cells[3].match(/(?:YT|UN)-\d{3}/g) ?? [];
    for (const dependency of needed)
      assert.ok(ids.includes(dependency), `${cells[0]}: missing ${dependency}`);
    deps.set(cells[0], needed);
  }
  /** @param {string} id @param {Set<string>} ancestors */
  function visit(id, ancestors) {
    assert.ok(!ancestors.has(id), `Dependency cycle: ${id}`);
    const next = new Set([...ancestors, id]);
    for (const dep of deps.get(id) ?? []) visit(dep, next);
  }
  for (const id of ids) visit(id, new Set());

  // Every task names exactly one human owner, or both for a declared touchpoint.
  const humans = ['Shaahid', 'Alan'];
  /** @type {Record<string, number>} */
  const perHuman = { Shaahid: 0, Alan: 0, joint: 0 };
  for (const cells of parsed) {
    const claimed = cells[5];
    assert.match(claimed, /^Human: /, `${cells[0]}: no human owner recorded`);
    const named = humans.filter((human) => claimed.includes(human));
    assert.ok(
      named.length >= 1,
      `${cells[0]}: unknown human owner "${claimed}"`,
    );
    if (named.length === 2) perHuman.joint += 1;
    else perHuman[named[0]] += 1;
  }
  assert.ok(
    perHuman.Shaahid > 0 && perHuman.Alan > 0,
    'both humans must own work',
  );
  assert.ok(
    Math.abs(perHuman.Shaahid - perHuman.Alan) <= 4,
    `lanes are unbalanced: ${JSON.stringify(perHuman)}`,
  );
  assert.match(board, /## Two-person split: Shaahid and Alan/);
  assert.match(board, /Lane S — Shaahid/);
  assert.match(board, /Lane A — Alan/);
  assert.match(board, /## Open questions/);
  assert.match(board, /Phase 1 documentation authorized/);
  assert.match(board, /final contract freeze are NOT authorized/);
});

test('required complete governance/context/behavior documents have no TODO placeholders', () => {
  const paths = [
    'AGENTS.md',
    'agents/RULES.md',
    'agents/HANDOFF.md',
    'agents/ROSTER.md',
    ...requiredPaths.filter((path) =>
      /docs\/(00-context|04-behavioral)\/.+\.md$/.test(path),
    ),
  ];
  for (const path of paths) {
    // The board column name TODO is a legitimate protocol label, not a stub.
    const text = readFileSync(path, 'utf8');
    assert.doesNotMatch(text, /TODO[:(]|TODO \(|TBD[:.]|TODO:|<insert/i, path);
  }
});

test('local markdown links in requested documents resolve', () => {
  for (const path of requiredPaths.filter((path) => path.endsWith('.md'))) {
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      assert.ok(
        existsSync(resolve(dirname(path), target)),
        `${path}: broken link ${target}`,
      );
    }
  }
});
