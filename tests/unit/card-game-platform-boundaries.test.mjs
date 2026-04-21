import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);

const sharedPackages = [
  '@repo/auth-contract',
  '@repo/game-catalog',
  '@repo/game-contracts',
  '@repo/game-engine',
  '@repo/game-session',
  '@repo/game-uno',
  '@repo/multiplayer-contract',
];

test('card-game packages expose the shared domain boundaries', () => {
  const packageDirs = [
    'packages/game-contracts/package.json',
    'packages/game-engine/package.json',
    'packages/game-catalog/package.json',
    'packages/game-session/package.json',
    'packages/game-uno/package.json',
    'packages/multiplayer-contract/package.json',
  ];

  for (const relativePath of packageDirs) {
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));

    assert.equal(typeof pkg.name, 'string');
    assert.equal(pkg.private, true);
    assert.equal(pkg.type, 'module');
    assert.match(pkg.name, /^@repo\//);
    assert.equal(pkg.exports['.'], './src/index.ts');
  }
});

test('all app manifests declare the shared card-game packages', () => {
  const manifestPaths = [
    'apps/web/app.manifest.ts',
    'apps/mobile/app.manifest.ts',
    'apps/desktop/app.manifest.ts',
  ];

  for (const relativePath of manifestPaths) {
    const source = readFileSync(resolve(repoRoot, relativePath), 'utf8');

    for (const packageName of sharedPackages) {
      assert.match(source, new RegExp(packageName.replace('/', '\\/')));
    }
  }
});

test('all client apps depend on the shared card-game packages', () => {
  const appPackagePaths = ['apps/web/package.json', 'apps/mobile/package.json', 'apps/desktop/package.json'];

  for (const relativePath of appPackagePaths) {
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));
    const dependencyKeys = new Set(Object.keys(pkg.dependencies ?? {}));

    for (const packageName of sharedPackages) {
      assert.equal(
        dependencyKeys.has(packageName),
        true,
        `${relativePath} is missing ${packageName} in dependencies`,
      );
    }
  }
});

test('roadmap status reflects the implemented card-game foundation', () => {
  const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');
  const plans = readFileSync(resolve(repoRoot, 'PLANS.md'), 'utf8');

  assert.match(plans, /\| P-001 \| completed\s+\| Shared game contracts/);
  assert.match(plans, /\| P-002 \| completed\s+\| Portable game engine/);
  assert.match(plans, /\| P-006 \| completed\s+\| Sample games/);
  assert.match(plans, /Generic persisted match service/);
  assert.match(readme, /web UNO-style server-authoritative matches with guest\/account ownership/);
  assert.doesNotMatch(readme, /match persistence remain deferred/);
});

test('integration tasks pass service bootstrap environment through turbo', () => {
  const turboConfig = JSON.parse(readFileSync(resolve(repoRoot, 'turbo.json'), 'utf8'));

  for (const taskName of ['test:integration', 'test:e2e']) {
    const passThroughEnv = new Set(turboConfig.tasks[taskName]?.passThroughEnv ?? []);

    for (const variableName of [
      'DATABASE_URL',
      'POSTGRES_PORT',
      'TEST_POSTGRES_PORT',
      'MAILPIT_BASE_URL',
      'PROFILE_IMAGE_STORAGE_ENDPOINT',
    ]) {
      assert.equal(
        passThroughEnv.has(variableName),
        true,
        `${taskName} must pass ${variableName} through to package test processes`,
      );
    }
  }
});
