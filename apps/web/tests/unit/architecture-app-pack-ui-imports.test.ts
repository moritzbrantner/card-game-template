import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function walk(currentPath: string, files: string[]) {
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      walk(entryPath, files);
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(path.relative(process.cwd(), entryPath));
    }
  }
}

describe('architecture: app-pack ui imports', () => {
  it('prevents app packs from importing local UI primitives', () => {
    const files: string[] = [];
    walk(path.resolve('apps'), files);

    const violations = files.flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return source.includes("@/components/ui/") || source.includes('@/components/ui/')
        ? [filePath]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
