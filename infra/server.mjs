import { createServer } from 'node:http';

/** Infrastructure-only server. No product or payment routes. */
export function createBootstrapServer() {
  return createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end('Method not allowed');
      return;
    }
    if (request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({ status: 'ok', phase: 0, productReady: false }),
      );
      return;
    }
    if (request.url === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>YourTurn setup</title><main><h1>YourTurn — Phase 0 scaffold only</h1><p>No product features, PayPal integration, real funds or AI are running.</p><p>Read AGENTS.md and tasks/BOARD.md. Human approval is required before Phase 1.</p></main></html>',
      );
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found — no product routes exist in Phase 0.');
  });
}
