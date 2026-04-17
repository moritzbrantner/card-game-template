import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('placeholder package smoke test', () => {
  const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');

  assert.match(source, /createSharedButtonLabel/);
  assert.match(source, /shared:\$\{label\}/);
});
