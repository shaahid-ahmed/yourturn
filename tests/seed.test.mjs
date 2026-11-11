import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('seed command writes deterministic visibly synthetic bootstrap data', () => {
  assert.ok(
    existsSync(new URL('../infra/seed/demo.mjs', import.meta.url)),
    'seed command is not implemented',
  );
  execFileSync(process.execPath, ['infra/seed/demo.mjs']);
  const first = readFileSync('.local/demo-seed.json', 'utf8');
  execFileSync(process.execPath, ['infra/seed/demo.mjs']);
  assert.equal(readFileSync('.local/demo-seed.json', 'utf8'), first);
  /** @type {{synthetic: boolean, phase: number, paymentEvidence: string, members: {id: string, firstName: string}[], events: unknown[]}} */
  const fixture = JSON.parse(first);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.phase, 0);
  assert.equal(fixture.paymentEvidence, 'none');
  assert.equal(fixture.members.length, 4);
  assert.deepEqual(
    fixture.members.map((member) => member.firstName),
    ['Sam', 'Priya', 'Alex', 'Jo'],
  );
  assert.equal(
    fixture.members.every((member) => member.id.startsWith('synthetic-')),
    true,
  );
  assert.deepEqual(fixture.events, []);
});
