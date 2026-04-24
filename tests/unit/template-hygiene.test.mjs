import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);

test('template README documents the supported creation helper flow', () => {
  const readmeSource = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');

  assert.match(
    readmeSource,
    /python3 scripts\/create_from_template\.py my-app --with-main/,
  );
  assert.match(
    readmeSource,
    /bash scripts\/setup-promotion-branches\.sh --with-main/,
  );
  assert.match(readmeSource, /intentionally avoids `--include-all-branches`/i);
  assert.match(readmeSource, /generated repositories do not inherit secrets/i);
  assert.match(readmeSource, /bun run setup:subtree-remotes/);
});

test('README referenced root docs exist', () => {
  for (const path of [
    'PLANS.md',
    'INFRASTRUCTURE.md',
    'AGENT_WORKFLOW.md',
    'ARCHITECTURE.md',
    'OPERATIONS.md',
    'DECISIONS.md',
  ]) {
    assert.equal(
      existsSync(resolve(repoRoot, path)),
      true,
      `${path} should exist`,
    );
  }
});

test('template does not track generated artifacts or nested lockfiles', () => {
  const trackedFiles = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean);

  const disallowedFiles = trackedFiles.filter((path) => {
    if (path === 'bun.lock') {
      return false;
    }

    if (!existsSync(resolve(repoRoot, path))) {
      return false;
    }

    return /(^|\/)(dist|\.next|\.expo|\.turbo|playwright-report|test-results|coverage)(\/|$)|(^|\/)(bun\.lock|bun\.lockb)$/.test(
      path,
    );
  });

  assert.deepEqual(disallowedFiles, []);
});
