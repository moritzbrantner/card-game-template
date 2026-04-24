import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));
}

test('root workspace graph keeps only active apps in default commands', () => {
  const pkg = readJson('package.json');

  assert.deepEqual(pkg.workspaces, [
    'apps/web',
    'apps/mobile',
    'apps/desktop',
    'apps/web/packages/*',
    'packages/*',
  ]);
  assert.equal(pkg.workspaces.includes('apps/web.backup'), false);
  assert.equal(typeof pkg.scripts['backup:build'], 'string');
  assert.equal(typeof pkg.scripts['backup:check-types'], 'string');
  assert.equal(typeof pkg.scripts['backup:test:unit'], 'string');
});

test('active apps expose the standardized validation script contract', () => {
  for (const relativePath of [
    'apps/web/package.json',
    'apps/mobile/package.json',
    'apps/desktop/package.json',
  ]) {
    const pkg = readJson(relativePath);

    for (const scriptName of [
      'lint',
      'check-types',
      'test:unit',
      'test:integration',
      'test:e2e',
    ]) {
      assert.equal(
        typeof pkg.scripts?.[scriptName],
        'string',
        `${relativePath} must define ${scriptName}`,
      );
    }
  }
});

test('internal web packages are private workspaces with standardized package scripts', () => {
  for (const relativePath of [
    'apps/web/packages/app-pack/package.json',
    'apps/web/packages/app-pack-react/package.json',
    'apps/web/packages/storytelling/package.json',
    'apps/web/packages/ui/package.json',
  ]) {
    const pkg = readJson(relativePath);

    assert.equal(pkg.private, true, `${relativePath} must stay private`);
    assert.equal('publishConfig' in pkg, false);

    for (const scriptName of ['lint', 'check-types', 'test:unit']) {
      assert.equal(
        typeof pkg.scripts?.[scriptName],
        'string',
        `${relativePath} must define ${scriptName}`,
      );
    }
  }
});

test('root validation commands cover active workspaces without relying on backup app scripts', () => {
  const pkg = readJson('package.json');

  assert.match(pkg.scripts.lint, /turbo run lint/);
  assert.match(pkg.scripts['check-types'], /turbo run check-types/);
  assert.match(pkg.scripts['test:unit'], /turbo run test:unit/);
  assert.doesNotMatch(pkg.scripts.lint, /web\.backup/);
  assert.doesNotMatch(pkg.scripts['check-types'], /web\.backup/);
  assert.doesNotMatch(pkg.scripts['test:unit'], /web\.backup/);
});
