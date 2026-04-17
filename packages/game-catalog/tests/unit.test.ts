import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameCatalog, defaultGameCatalog } from '../src/index.ts';

test('createGameCatalog lists entries in a stable name order', () => {
  const catalog = createGameCatalog([
    {
      definition: {
        gameId: 'zebra',
        name: 'Zebra',
        minPlayers: 2,
        maxPlayers: 4,
        supportsLocal: true,
        supportsOnline: true,
        tags: ['custom'],
      },
    },
    {
      definition: {
        gameId: 'alpha',
        name: 'Alpha',
        minPlayers: 1,
        maxPlayers: 1,
        supportsLocal: true,
        supportsOnline: false,
        tags: ['solo'],
      },
    },
  ]);

  assert.deepEqual(
    catalog.list().map((entry) => entry.definition.gameId),
    ['alpha', 'zebra'],
  );
  assert.deepEqual(
    catalog.listPlayable(2, 'server-authoritative').map((entry) => entry.definition.gameId),
    ['zebra'],
  );
});

test('createGameCatalog rejects duplicate registrations', () => {
  const catalog = createGameCatalog();

  catalog.register({
    definition: {
      gameId: 'uno',
      name: 'UNO',
      minPlayers: 2,
      maxPlayers: 10,
      supportsLocal: true,
      supportsOnline: true,
      tags: ['family'],
    },
  });

  assert.throws(
    () =>
      catalog.register({
        definition: {
          gameId: 'uno',
          name: 'UNO Duplicate',
          minPlayers: 2,
          maxPlayers: 4,
          supportsLocal: true,
          supportsOnline: true,
          tags: ['family'],
        },
      }),
    /Duplicate game registration/,
  );
});

test('defaultGameCatalog registers the UNO-style sample', () => {
  const unoEntry = defaultGameCatalog.get('uno-style');

  assert.equal(unoEntry?.definition.name, 'UNO-style');
  assert.equal(unoEntry?.metadata?.route, '/uno');
});
