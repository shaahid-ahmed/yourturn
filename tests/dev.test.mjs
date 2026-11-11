import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('dev command rejects invalid ports before opening a listener', () => {
  assert.ok(
    existsSync(new URL('../infra/dev.mjs', import.meta.url)),
    'dev entrypoint is not implemented',
  );
  for (const port of ['abc', '0', '65536', '3.1', '-1', '1e3', '']) {
    assert.throws(
      () =>
        execFileSync(process.execPath, ['infra/dev.mjs'], {
          env: { ...process.env, PORT: port },
          timeout: 5000,
          stdio: 'pipe',
        }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /PORT must be an integer from 1 to 65535/);
        return true;
      },
    );
  }
});
