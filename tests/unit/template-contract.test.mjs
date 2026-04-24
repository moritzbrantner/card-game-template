import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifestPaths = [
  '../../apps/web/app.manifest.ts',
  '../../apps/mobile/app.manifest.ts',
  '../../apps/desktop/app.manifest.ts',
];

test('architecture doc defines the thin-template boundary and app manifest contract', () => {
  const source = readFileSync(
    new URL('../../ARCHITECTURE.md', import.meta.url),
    'utf8',
  );

  assert.match(source, /starter template/);
  assert.match(source, /`apps\/\*`/);
  assert.match(source, /`packages\/\*`/);
  assert.match(source, /`templates\/platform-packages\/\*`/);
  assert.match(
    source,
    /Every deployable app should expose an `app\.manifest\.ts` file/,
  );
  assert.match(source, /Active apps/);
  assert.match(source, /Reference apps/);
  assert.match(source, /App-private modules/);
});

test('platform packages guide documents private GitHub publishing and consumer auth', () => {
  const source = readFileSync(
    new URL('../../PLATFORM_PACKAGES.md', import.meta.url),
    'utf8',
  );

  assert.match(source, /private repository/);
  assert.match(source, /GitHub Packages/);
  assert.match(source, /changesets/);
  assert.match(
    source,
    /@YOUR_GITHUB_USERNAME:registry=https:\/\/npm\.pkg\.github\.com/,
  );
});

test('every app workspace exposes a manifest with the agreed contract keys', () => {
  for (const manifestPath of manifestPaths) {
    const source = readFileSync(new URL(manifestPath, import.meta.url), 'utf8');

    assert.match(source, /appId:/);
    assert.match(source, /slug:/);
    assert.match(source, /displayName:/);
    assert.match(source, /platform:/);
    assert.match(source, /packageName:/);
    assert.match(source, /entryWorkspace:/);
    assert.match(source, /releaseCadence:/);
    assert.match(source, /sharedPackages:/);
    assert.match(source, /featureFlags:/);
    assert.match(source, /deployment:/);
  }
});

test('the template includes a scaffold for a separate private packages repository', () => {
  const readme = readFileSync(
    new URL('../../templates/platform-packages/README.md', import.meta.url),
    'utf8',
  );
  const workflow = readFileSync(
    new URL(
      '../../templates/platform-packages/.github/workflows/publish-packages.yml',
      import.meta.url,
    ),
    'utf8',
  );
  const changesets = readFileSync(
    new URL(
      '../../templates/platform-packages/.changeset/config.json',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(readme, /dedicated private repository/);
  assert.match(workflow, /changesets\/action@v1/);
  assert.match(workflow, /https:\/\/npm\.pkg\.github\.com/);
  assert.match(changesets, /"access": "restricted"/);
});
