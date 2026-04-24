const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('desktop renderer uses the preload-backed desktop platform APIs', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../src/renderer.ts'),
    'utf8',
  );

  assert.match(source, /@repo\/game-session/);
  assert.match(source, /createUnoScreen/);
  assert.match(source, /createPokerScreen/);
  assert.match(source, /createTcgScreen/);
  assert.match(source, /createPokerAdapter/);
  assert.match(source, /createTcgAdapter/);
  assert.match(source, /pendingHotseatPlayerId/);
  assert.match(source, /Restart match/);
  assert.match(source, /Reveal next hand/);
  assert.match(source, /window\.desktop\.preferences\.getAll\(\)/);
  assert.match(source, /window\.desktop\.documents\.getState\(\)/);
  assert.match(source, /document\.save/);
  assert.match(source, /window\.desktop\.documents\.openRecent/);
  assert.match(source, /route === 'documents'/);
  assert.match(source, /System theme/);
  assert.match(source, /Light mode/);
  assert.match(source, /Dark mode/);
  assert.match(source, /Realtime communication/);
  assert.match(source, /Websockets/);
  assert.match(source, /CRDTs/);
  assert.match(source, /window\.addEventListener\('hashchange', renderApp\)/);
  assert.match(
    source,
    /createSharedButtonLabel\(\s*\{\s*label:\s*'desktop-launch',?\s*\}\s*\)/,
  );
});

test('desktop navbar component provides app navigation links including documents', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../src/navbar.ts'),
    'utf8',
  );

  assert.match(source, /navbar__brand/);
  assert.match(source, /Desktop App/);
  assert.match(source, /Home/);
  assert.match(source, /UNO-style/);
  assert.match(source, /Hold'em/);
  assert.match(source, /Arcane Duel/);
  assert.match(source, /Settings/);
  assert.match(source, /Documents/);
  assert.match(source, /Three\.js/);
  assert.match(source, /React Hook Form/);
  assert.match(source, /Communication/);
  assert.match(source, /#\/documents/);
  assert.match(source, /#\/uno/);
  assert.match(source, /#\/poker/);
  assert.match(source, /#\/tcg/);
  assert.match(source, /#\/communication/);
  assert.match(source, /#\/react-hook-form/);
  assert.match(source, /#\/three/);
  assert.match(source, /#\/settings/);
  assert.match(source, /is-active/);
});

test('desktop exposes a typed online game client adapter', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../src/platform/online/online-game-client.ts'),
    'utf8',
  );

  assert.match(source, /createOnlineGameApiClient/);
  assert.match(source, /defineOnlineMatchApi/);
  assert.match(source, /desktopUnoMatchApi/);
  assert.match(source, /desktopPokerMatchApi/);
  assert.match(source, /kind: 'session-cookie'/);
  assert.match(source, /authenticate\(auth: DesktopOnlineAuthProvider\)/);
  assert.match(source, /submitUnoMove: \(matchId: string, move: UnoMove\)/);
  assert.match(source, /submitPokerMove: \(matchId: string, move: PokerMove\)/);
  assert.match(source, /setRoomReady/);
  assert.match(source, /startRoom/);
});
