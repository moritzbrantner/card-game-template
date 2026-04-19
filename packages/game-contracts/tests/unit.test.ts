import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MATCH_REPLAY_FORMAT_VERSION,
  createMatchReplay,
  createMatchResult,
  isOnlineCapable,
  summarizeMatchReplay,
  type GameDefinition,
} from '../src/index.ts';

test('match replay format version stays pinned for persisted payload compatibility', () => {
  assert.equal(MATCH_REPLAY_FORMAT_VERSION, 1);
});

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

test('summarizeMatchReplay groups accepted moves by player and kind', () => {
  const replay = createMatchReplay({
    startedAt: '2026-04-17T12:00:00.000Z',
    initialState: {
      matchId: 'match-2',
      gameId: 'crazy-eights',
      players: [
        { playerId: 'p1', displayName: 'Alice', seat: 1 },
        { playerId: 'p2', displayName: 'Bob', seat: 2 },
      ],
      activePlayerId: 'p1',
      turn: 1,
      executionMode: 'server-authoritative',
      state: {
        total: 0,
      },
    },
    latestState: {
      matchId: 'match-2',
      gameId: 'crazy-eights',
      players: [
        { playerId: 'p1', displayName: 'Alice', seat: 1 },
        { playerId: 'p2', displayName: 'Bob', seat: 2 },
      ],
      activePlayerId: 'p1',
      turn: 4,
      executionMode: 'server-authoritative',
      state: {
        total: 3,
      },
    },
    acceptedMoves: [
      {
        sequence: 1,
        acceptedAt: '2026-04-17T12:00:01.000Z',
        move: {
          playerId: 'p1',
          kind: 'draw',
          createdAt: '2026-04-17T12:00:00.500Z',
          payload: {},
        },
      },
      {
        sequence: 2,
        acceptedAt: '2026-04-17T12:00:02.000Z',
        move: {
          playerId: 'p2',
          kind: 'play-card',
          createdAt: '2026-04-17T12:00:01.500Z',
          payload: { cardId: 'red-3' },
        },
      },
      {
        sequence: 3,
        acceptedAt: '2026-04-17T12:00:03.000Z',
        move: {
          playerId: 'p1',
          kind: 'play-card',
          createdAt: '2026-04-17T12:00:02.500Z',
          payload: { cardId: 'blue-7' },
        },
      },
    ],
    finishedAt: '2026-04-17T12:00:03.000Z',
    result: {
      matchId: 'match-2',
      gameId: 'crazy-eights',
      winnerIds: ['p1'],
      rankings: [{ playerId: 'p1', position: 1 }],
      finishedAt: '2026-04-17T12:00:03.000Z',
      executionMode: 'server-authoritative',
    },
  });

  assert.deepEqual(summarizeMatchReplay(replay), {
    matchId: 'match-2',
    gameId: 'crazy-eights',
    executionMode: 'server-authoritative',
    startedAt: '2026-04-17T12:00:00.000Z',
    finishedAt: '2026-04-17T12:00:03.000Z',
    durationMs: 3000,
    acceptedMoveCount: 3,
    turnsCompleted: 3,
    winnerIds: ['p1'],
    players: [
      { playerId: 'p1', displayName: 'Alice', movesAccepted: 2 },
      { playerId: 'p2', displayName: 'Bob', movesAccepted: 1 },
    ],
    moveKinds: [
      { kind: 'play-card', count: 2 },
      { kind: 'draw', count: 1 },
    ],
  });
});
