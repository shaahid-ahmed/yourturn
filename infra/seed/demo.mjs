import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const [circleFixture, catalogFixture] = await Promise.all([
  readFile(new URL('tests/fixtures/bootstrap-circle.json', root), 'utf8'),
  readFile(new URL('tests/fixtures/nyc-catalog.json', root), 'utf8'),
]);
await mkdir(new URL('.local/', root), { recursive: true });
await Promise.all([
  writeFile(new URL('.local/demo-seed.json', root), circleFixture),
  writeFile(new URL('.local/demo-catalog.json', root), catalogFixture),
]);
console.log(
  'Seeded .local/demo-seed.json and .local/demo-catalog.json — synthetic Phase 0 data, no payments or graph scoring.',
);
