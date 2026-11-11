import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const fixture = await readFile(
  new URL('tests/fixtures/bootstrap-circle.json', root),
  'utf8',
);
await mkdir(new URL('.local/', root), { recursive: true });
await writeFile(new URL('.local/demo-seed.json', root), fixture);
console.log(
  'Seeded .local/demo-seed.json — synthetic Phase 0 data, no payments or graph scoring.',
);
