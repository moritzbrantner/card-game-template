const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const requireMobile = createRequire(path.resolve(__dirname, '../package.json'));
const mobilePackage = requireMobile('./package.json');
const supported = requireMobile('expo/bundledNativeModules.json');

test('mobile runtime matches the installed Expo SDK compatibility contract', () => {
  for (const name of ['react', 'react-dom', 'react-native']) {
    assert.equal(mobilePackage.dependencies[name], supported[name], name);
    assert.equal(
      requireMobile(`${name}/package.json`).version,
      supported[name],
      name,
    );
  }
  assert.equal(
    mobilePackage.devDependencies['react-test-renderer'],
    supported.react,
  );
  assert.doesNotThrow(() =>
    requireMobile.resolve('react-native/rn-get-polyfills'),
  );
});

// Some Expo packages don't export ./package.json, so read it from the
// resolution paths instead of require()-ing it.
function installedVersion(name) {
  for (const dir of requireMobile.resolve.paths(name) ?? []) {
    const manifest = path.join(dir, name, 'package.json');
    if (fs.existsSync(manifest)) {
      return JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
    }
  }
  throw new Error(`${name} is not installed`);
}

test('Expo SDK packages stay on the installed Expo SDK major', () => {
  const sdkMajor = requireMobile('expo/package.json').version.split('.')[0];
  const sdkBound = Object.keys(supported).filter(
    (name) => name === 'expo' || name.startsWith('expo-'),
  );
  for (const section of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(mobilePackage[section] ?? {})) {
      if (!sdkBound.includes(name)) continue;
      const installed = installedVersion(name);
      assert.equal(installed.split('.')[0], sdkMajor, `${name}@${installed}`);
    }
  }
});
