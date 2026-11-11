import { createBootstrapServer } from './server.mjs';

const raw = process.env.PORT ?? '3000';
const port = Number(raw);
if (!/^\d+$/.test(raw) || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer from 1 to 65535');
  process.exit(1);
}
const server = createBootstrapServer();
server.on('error', (error) => {
  console.error(`Setup server failed: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`YourTurn Phase 0 scaffold only: http://127.0.0.1:${port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.closeAllConnections();
    server.close();
  });
}
