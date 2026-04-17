const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('mobile navigation exposes settings, libraries, and profile routes', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/_layout.tsx'), 'utf8');
  const stackSource = fs.readFileSync(path.resolve(__dirname, '../app/_layout.tsx'), 'utf8');
  const iconSource = fs.readFileSync(
    path.resolve(__dirname, '../components/ui/icon-symbol.tsx'),
    'utf8',
  );

  assert.match(source, /name="communication"/);
  assert.match(source, /title: 'Communication'/);
  assert.match(source, /bubble\.left\.and\.bubble\.right\.fill/);
  assert.match(source, /name="uploads"/);
  assert.match(source, /title: 'Uploads'/);
  assert.match(source, /square\.and\.arrow\.up\.fill/);
  assert.match(source, /name="settings"/);
  assert.match(source, /title: 'Settings'/);
  assert.match(source, /gearshape\.fill/);
  assert.match(source, /name="three"/);
  assert.match(source, /title: 'Three\.js'/);
  assert.match(source, /cube\.fill/);
  assert.match(source, /name="react-hook-form"/);
  assert.match(source, /title: 'Form'/);
  assert.match(source, /list\.bullet\.clipboard\.fill/);
  assert.match(iconSource, /'bubble\.left\.and\.bubble\.right\.fill': 'forum'/);
  assert.match(iconSource, /'square\.and\.arrow\.up\.fill': 'upload'/);
  assert.match(stackSource, /name="profile\/\[profile\]"/);
  assert.match(stackSource, /title: 'Profile'/);
});
