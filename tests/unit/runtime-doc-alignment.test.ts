import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const docs = [
  'README.md',
  'ARCHITECTURE.md',
  'PRODUCT_BRIEF.md',
  'DECISIONS.md',
  'PLANS.md',
  'MIGRATION_NOTES.md',
];

describe('runtime and docs alignment', () => {
  it('keeps canonical docs aligned on Next.js App Router and out of TanStack-era wording', () => {
    const contents = docs.map((filePath) => readFileSync(path.join(process.cwd(), filePath), 'utf8'));

    expect(contents.every((content) => content.includes('Next.js'))).toBe(true);
    expect(contents.some((content) => content.includes('TanStack Start'))).toBe(false);
    expect(contents.some((content) => content.includes('src/routes/**'))).toBe(false);
  });
});
