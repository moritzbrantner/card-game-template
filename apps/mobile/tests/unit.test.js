const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('mobile settings screen has explicit light and dark theme controls', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/settings.tsx'),
    'utf8',
  );

  assert.match(source, /ThemeModeToggle/);
  assert.match(source, /useThemeColor/);
  assert.match(source, /lightColor=\{Colors\.light\.surface\}/);
  assert.match(source, /Settings/);
  assert.match(source, /applied immediately/);
});

test('mobile theme colors follow the app theme mode context', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../hooks/use-theme-color.ts'),
    'utf8',
  );

  assert.match(source, /useThemeMode/);
  assert.match(source, /activeTheme/);
});

test('mobile has a dedicated Three.js screen', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/three.tsx'),
    'utf8',
  );

  assert.match(source, /Three\.js/);
  assert.match(source, /dedicated mobile destination/);
  assert.match(source, /navigation menu/);
});

test('mobile has a dedicated React Hook Form overview screen', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/react-hook-form.tsx'),
    'utf8',
  );

  assert.match(source, /React Hook Form/);
  assert.match(source, /required validation/);
  assert.match(source, /dirty state/);
  assert.match(source, /reset\(newValues\)/);
});

test('mobile has a dedicated communication screen with Websockets and CRDTs sections', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/communication.tsx'),
    'utf8',
  );

  assert.match(source, /Communication/);
  assert.match(source, /Websockets/);
  assert.match(source, /CRDTs/);
  assert.match(source, /Communication topic/);
});

test('mobile has a dedicated UNO-style screen with hotseat handoff and local session state', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/uno.tsx'),
    'utf8',
  );

  assert.match(source, /UNO-style/);
  assert.match(source, /createLocalGameSession/);
  assert.match(source, /pendingHotseatPlayerId/);
  assert.match(source, /Reveal next hand/);
  assert.match(source, /House rule toggles/);
});

test('mobile has dedicated poker and TCG screens with local session state', () => {
  const pokerSource = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/poker.tsx'),
    'utf8',
  );
  const tcgSource = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/tcg.tsx'),
    'utf8',
  );
  const tabsSource = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/_layout.tsx'),
    'utf8',
  );

  assert.match(pokerSource, /Texas Hold/);
  assert.match(pokerSource, /createPokerAdapter/);
  assert.match(pokerSource, /createLocalGameSession/);
  assert.match(pokerSource, /Restart hand/);
  assert.match(tcgSource, /Arcane Duel/);
  assert.match(tcgSource, /createTcgAdapter/);
  assert.match(tcgSource, /createLocalGameSession/);
  assert.match(tcgSource, /Restart duel/);
  assert.match(tabsSource, /name="poker"/);
  assert.match(tabsSource, /name="tcg"/);
});

test('mobile exposes a typed online game client adapter', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../lib/online-game-client.ts'),
    'utf8',
  );

  assert.match(source, /createOnlineGameApiClient/);
  assert.match(source, /defineOnlineMatchApi/);
  assert.match(source, /mobileUnoMatchApi/);
  assert.match(source, /mobilePokerMatchApi/);
  assert.match(source, /kind: 'session-cookie'/);
  assert.match(source, /authenticate\(auth: MobileOnlineAuthProvider\)/);
  assert.match(source, /submitUnoMove: \(matchId: string, move: UnoMove\)/);
  assert.match(source, /submitPokerMove: \(matchId: string, move: PokerMove\)/);
  assert.match(source, /setRoomReady/);
  assert.match(source, /startRoom/);
});

test('mobile home links to own and dummy profile pages', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/index.tsx'),
    'utf8',
  );

  assert.match(source, /Open my profile/);
  assert.match(source, /getProfileByUsername\('jules'\)/);
  assert.match(source, /href=\{`\/profile\/@\$\{currentUser\.username\}`\}/);
  assert.match(
    source,
    /href=\{`\/profile\/@\$\{teammateProfile\.username\}`\}/,
  );
});

test('mobile has a dedicated profile screen for @username routes', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/profile/[profile].tsx'),
    'utf8',
  );

  assert.match(source, /getProfileFromSegment/);
  assert.match(source, /@\/data\/profiles/);
  assert.match(source, /Profile not found/);
  assert.match(source, /Mobile profile/);
  assert.match(source, /\/profile\/@username/);
});
