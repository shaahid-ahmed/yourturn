import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { once } from 'node:events';

test('bootstrap server reports setup-only status and exposes no product routes', async () => {
  assert.ok(
    existsSync(new URL('../infra/server.mjs', import.meta.url)),
    'bootstrap server is not implemented',
  );
  const { createBootstrapServer } = await import('../infra/server.mjs');
  const server = createBootstrapServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      status: 'ok',
      phase: 0,
      productReady: false,
    });
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Phase 0.*scaffold only/);
    assert.match(
      page.headers.get('content-security-policy') ?? '',
      /default-src 'none'/,
    );
    assert.equal((await fetch(`${base}/api/circles`)).status, 404);
    assert.equal(
      (await fetch(`${base}/health`, { method: 'POST' })).status,
      405,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve(undefined))),
    );
  }
});
