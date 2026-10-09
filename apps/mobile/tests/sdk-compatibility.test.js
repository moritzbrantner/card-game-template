const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
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
