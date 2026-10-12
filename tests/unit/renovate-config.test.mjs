import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const renovate = JSON.parse(
  readFileSync(new URL('../../renovate.json', import.meta.url), 'utf8'),
);

const ruleFor = (packageName, fileName) =>
  renovate.packageRules.find(
    (rule) =>
      rule.matchPackageNames?.includes(packageName) &&
      (!fileName || rule.matchFileNames?.includes(fileName)),
  );

test('Renovate is the only configured routine dependency updater', () => {
  assert.deepEqual(renovate.extends, [
    'github>moritzbrantner/coding-agent-conventions',
  ]);
  assert.equal(
    existsSync(new URL('../../.github/dependabot.yml', import.meta.url)),
    false,
  );
  assert.equal(
    existsSync(new URL('../../.github/dependabot.yaml', import.meta.url)),
    false,
  );
});

test('Expo SDK 55 compatibility restrictions survive updater migration', () => {
  assert.equal(
    ruleFor('react-native', 'apps/mobile/package.json')?.allowedVersions,
    '0.83.10',
  );
  const react = ruleFor('react', 'apps/mobile/package.json');
  assert.equal(react?.allowedVersions, '19.2.0');
  assert.equal(react?.groupName, 'Expo SDK 55 React runtime');
  assert.deepEqual(react?.matchPackageNames, [
    'react',
    'react-dom',
    'react-test-renderer',
  ]);
  assert.equal(
    ruleFor('expo', 'apps/mobile/package.json')?.allowedVersions,
    '<56',
  );
});

test('Electron Forge packages remain grouped for coordinated updates', () => {
  assert.equal(ruleFor('@electron-forge/**')?.groupName, 'Electron Forge');
});

test('Renovate PRs against develop run the existing validation workflow', () => {
  const workflow = readFileSync(
    new URL('../../.github/workflows/develop.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\[develop\]/);
});
