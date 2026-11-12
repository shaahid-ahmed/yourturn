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

test('board has six state tables, 42 unique legacy tasks, valid dependencies and no dependency cycles', () => {
  const board = readFileSync('tasks/BOARD.md', 'utf8');
  /** @type {Array<[string, string]>} */
  const rows = [];
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
    // Only the six state tables are the task ledger. The plan tables further down
    // repeat US ids with fewer columns and are descriptive, not task rows.
    for (const line of section.split('\n'))
      if (/^\| (?:YT|UN|US)-\d{3}\s*\|/.test(line)) rows.push([state, line]);
  }
  const parsed = rows.map(([state, line]) => ({
    state,
    cells: line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()),
  }));
  const ids = parsed.map(({ cells }) => cells[0]);
  assert.equal(
    ids.filter((id) => id.startsWith('YT-')).length,
    42,
    'the 42 YourTurn rows are history and must not be deleted',
  );
  assert.ok(
    ids.some((id) => id.startsWith('UN-')),
    'Unspoken tasks must exist after ADR 0006',
  );
  assert.ok(
    ids.filter((id) => id.startsWith('US-')).length >= 30,
    'the four-person plan must have real tasks',
  );
  assert.equal(
    new Set(ids).size,
    ids.length,
    'task ids must be unique across all series',
  );
  /** @type {Map<string, string[]>} */
  const deps = new Map();
  for (const { cells } of parsed) {
    assert.equal(cells.length, 7);
    for (const cell of cells) assert.ok(cell);
    const needed = cells[3].match(/(?:YT|UN|US)-\d{3}/g) ?? [];
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

  // Every live task names a human owner. Superseded YT/UN rows may be archived instead.
  // Shaahid took Rohan's HTTP/E2E batch (US-019, US-301–US-305) by human decision,
  // so he holds live tasks. Balance is measured endgame: Alan and Rohan are each
  // down to one task blocked on a human/external answer (Q-010, US-006).
  const humans = ['Shaahid', 'Alan', 'Vid', 'Rohan'];
  /** @type {Record<string, number>} */
  const perHuman = { Shaahid: 0, Alan: 0, Vid: 0, Rohan: 0 };
  for (const { state, cells } of parsed) {
    const claimed = cells[5];
    if (claimed.startsWith('ARCHIVED')) {
      assert.match(
        cells[0],
        /^(?:YT|UN)-/,
        `${cells[0]}: only superseded rows may be archived`,
      );
      continue;
    }
    assert.match(claimed, /^Human: /, `${cells[0]}: no human owner recorded`);
    const named = humans.filter((human) => claimed.includes(human));
    assert.ok(
      named.length >= 1,
      `${cells[0]}: unknown human owner "${claimed}"`,
    );
    if (!cells[0].startsWith('US-') || state === 'DONE') continue;
    if (named.length === 1) perHuman[named[0]] += 1;
  }
  // Endgame (Nov 12 + ADR 0008): Alan holds one task blocked on Q-010, Vid holds
  // the device-pass remainder of US-204, Shaahid holds the remaining unblocked
  // work by human decision, and Rohan's lane is complete (US-001/002/004/007/008/013
  // DONE, US-015 DONE as moot). Fairness is verified by ownership: every live
  // task names exactly one human owner, and every collaborator either owns live
  // work or has their whole lane DONE.
  const doneClaimed = /** @type {Record<string, number>} */ ({
    Shaahid: 0,
    Alan: 0,
    Vid: 0,
    Rohan: 0,
  });
  for (const { state, cells } of parsed) {
    if (state !== 'DONE') continue;
    for (const human of humans) {
      if (cells[5].includes(`Human: ${human}`)) doneClaimed[human] += 1;
    }
  }
  for (const human of humans) {
    assert.ok(
      perHuman[human] > 0 || doneClaimed[human] > 0,
      `${human} owns no live work and has nothing DONE`,
    );
  }
  assert.match(board, /## CURRENT PLAN: four collaborators/);
  assert.match(board, /Lane S — reassigned/);
  assert.match(board, /Lane A — Alan/);
  assert.match(board, /Lane V — Vid/);
  assert.match(board, /Lane R — Rohan/);
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
      const target = decodeURIComponent(match[1].split('#')[0]);
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      assert.ok(
        existsSync(resolve(dirname(path), target)),
        `${path}: broken link ${target}`,
      );
    }
  }
});
