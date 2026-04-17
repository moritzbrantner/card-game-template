import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const CANONICAL_NAMESPACE_ROOT = 'src/domain';

const REMOVED_NAMESPACE_ROOTS = [
  'features',
  'stores',
  path.join('lib', 'services'),
];

describe('architecture: use-case namespace roots', () => {
  it('keeps profile use-cases in the canonical src/domain root', () => {
    expect(existsSync(path.resolve(path.join(CANONICAL_NAMESPACE_ROOT, 'profile', 'use-cases.ts')))).toBe(true);
  });

  it('removes deprecated namespace roots from the template', () => {
    expect(REMOVED_NAMESPACE_ROOTS.every((relativePath) => !existsSync(path.resolve(relativePath)))).toBe(true);
  });
});
