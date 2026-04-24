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
  '@repo/game-poker',
  '@repo/game-session',
  '@repo/game-tcg',
  '@repo/game-uno',
  '@repo/multiplayer-contract',
];

test('turn-based packages expose the shared domain boundaries', () => {
  const packageDirs = [
    'packages/card-kit/package.json',
    'packages/game-contracts/package.json',
    'packages/game-engine/package.json',
    'packages/game-catalog/package.json',
    'packages/game-session/package.json',
    'packages/game-poker/package.json',
    'packages/game-tcg/package.json',
    'packages/game-tic-tac-toe/package.json',
    'packages/game-uno/package.json',
    'packages/multiplayer-contract/package.json',
  ];

  for (const relativePath of packageDirs) {
    const pkg = JSON.parse(
      readFileSync(resolve(repoRoot, relativePath), 'utf8'),
    );

    assert.equal(typeof pkg.name, 'string');
    assert.equal(pkg.private, true);
    assert.equal(pkg.type, 'module');
    assert.match(pkg.name, /^@repo\//);
    assert.equal(pkg.exports['.'], './src/index.ts');
    if (relativePath === 'packages/card-kit/package.json') {
      assert.equal(pkg.name, '@repo/card-kit');
    }
  }
});

test('generic engine and contracts stay free of card-specific exports', () => {
  const engineSource = readFileSync(
    resolve(repoRoot, 'packages/game-engine/src/index.ts'),
    'utf8',
  );
  const contractsSource = readFileSync(
    resolve(repoRoot, 'packages/game-contracts/src/index.ts'),
    'utf8',
  );
  const cardKitSource = readFileSync(
    resolve(repoRoot, 'packages/card-kit/src/index.ts'),
    'utf8',
  );

  assert.doesNotMatch(engineSource, /export type Card(Id|Like|Visibility)/);
  assert.doesNotMatch(engineSource, /export function drawCardsBetweenStacks/);
  assert.doesNotMatch(contractsSource, /export type CardId/);
  assert.doesNotMatch(contractsSource, /export type CardDefinition/);
  assert.match(cardKitSource, /export type CardId = string;/);
  assert.match(cardKitSource, /export function drawCardsBetweenStacks/);
});

test('all app manifests declare the shared turn-based packages they consume', () => {
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

test('all client apps depend on the shared turn-based packages they consume', () => {
  const appPackagePaths = [
    'apps/web/package.json',
    'apps/mobile/package.json',
    'apps/desktop/package.json',
  ];

  for (const relativePath of appPackagePaths) {
    const pkg = JSON.parse(
      readFileSync(resolve(repoRoot, relativePath), 'utf8'),
    );
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

test('roadmap status reflects the implemented turn-based foundation', () => {
  const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');
  const plans = readFileSync(resolve(repoRoot, 'PLANS.md'), 'utf8');

  assert.match(plans, /\| P-001 \| completed\s+\| Shared game contracts/);
  assert.match(plans, /\| P-002 \| completed\s+\| Portable game engine/);
  assert.match(plans, /\| P-006 \| completed\s+\| Sample games/);
  assert.match(plans, /Generic persisted match service/);
  assert.match(plans, /packages\/card-kit/);
  assert.match(plans, /packages\/game-tic-tac-toe/);
  assert.match(
    readme,
    /web UNO-style server-authoritative matches with guest\/account ownership/,
  );
  assert.match(readme, /deterministic turn-based games/);
  assert.doesNotMatch(readme, /match persistence remain deferred/);
});

test('integration tasks pass service bootstrap environment through turbo', () => {
  const turboConfig = JSON.parse(
    readFileSync(resolve(repoRoot, 'turbo.json'), 'utf8'),
  );

  for (const taskName of ['test:integration', 'test:e2e']) {
    const passThroughEnv = new Set(
      turboConfig.tasks[taskName]?.passThroughEnv ?? [],
    );

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
