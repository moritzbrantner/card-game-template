const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop main window hides the default menu bar', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf8');

  assert.match(source, /autoHideMenuBar:\s*true/);
});

test('desktop main process composes the reusable platform layer', () => {
  const mainSource = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf8');
  const platformSource = fs.readFileSync(
    path.resolve(__dirname, '../src/platform/main/create-desktop-platform.ts'),
    'utf8',
  );

  assert.match(mainSource, /createDesktopPlatform/);
  assert.match(mainSource, /platform\.windowState\.getState\('main'\)/);
  assert.match(mainSource, /platform\.documents\.confirmBeforeClose/);
  assert.match(platformSource, /createJsonStore/);
  assert.match(platformSource, /createPreferencesService/);
  assert.match(platformSource, /createDocumentsService/);
  assert.match(platformSource, /createCommandsService/);
  assert.match(platformSource, /createWindowStateManager/);
  assert.match(platformSource, /CmdOrCtrl\+,/);
  assert.match(platformSource, /CmdOrCtrl\+S/);
  assert.match(platformSource, /Project link not configured yet/);
});
