import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('workspace package cleanliness', () => {
  it('does not track stale vendored package artifacts', () => {
    const trackedFiles = execFileSync('git', ['ls-files', 'packages'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);

    const forbiddenTrackedFiles = trackedFiles.filter((filePath) => {
      return filePath.endsWith('.tgz') || filePath.includes('/dist/') || filePath.includes('/.turbo/');
    });

    expect(forbiddenTrackedFiles).toEqual([]);
  });
});
