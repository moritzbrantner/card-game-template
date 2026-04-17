import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMatchResult,
  isOnlineCapable,
  type GameDefinition,
} from '../src/index.ts';

test('createMatchResult derives rankings from winner order when omitted', () => {
  const result = createMatchResult({
    matchId: 'match-1',
    gameId: 'crazy-eights',
    winnerIds: ['p1', 'p2'],
    finishedAt: '2026-04-17T12:00:00.000Z',
    executionMode: 'server-authoritative',
  });

  assert.deepEqual(result.rankings, [
    { playerId: 'p1', position: 1 },
    { playerId: 'p2', position: 2 },
  ]);
});

test('isOnlineCapable requires multiplayer and explicit online support', () => {
  const onlineGame: GameDefinition = {
    gameId: 'uno',
    name: 'UNO',
    minPlayers: 2,
    maxPlayers: 10,
    supportsLocal: true,
    supportsOnline: true,
    tags: ['family'],
  };

  const soloOnlyGame: GameDefinition = {
    ...onlineGame,
    gameId: 'solitaire',
    name: 'Solitaire',
    maxPlayers: 1,
    supportsOnline: false,
  };

  assert.equal(isOnlineCapable(onlineGame), true);
  assert.equal(isOnlineCapable(soloOnlyGame), false);
});
