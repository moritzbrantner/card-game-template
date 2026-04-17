import assert from 'node:assert/strict';
import test from 'node:test';

import { canStartRoom, createRoomSummary } from '../src/index.ts';

test('createRoomSummary builds connected ready seats from players', () => {
  const room = createRoomSummary({
    roomId: 'room-1',
    gameId: 'uno',
    hostPlayerId: 'p1',
    visibility: 'private',
    maxPlayers: 4,
    players: [
      { playerId: 'p1', displayName: 'Alice', seat: 1 },
      { playerId: 'p2', displayName: 'Bob', seat: 2 },
    ],
  });

  assert.equal(room.executionMode, 'server-authoritative');
  assert.deepEqual(room.seats, [
    { seat: 1, playerId: 'p1', ready: true, connectionStatus: 'connected' },
    { seat: 2, playerId: 'p2', ready: true, connectionStatus: 'connected' },
  ]);
  assert.equal(canStartRoom(room), true);
});

test('canStartRoom rejects rooms that do not have enough ready players', () => {
  assert.equal(
    canStartRoom({
      roomId: 'room-2',
      gameId: 'uno',
      hostPlayerId: 'p1',
      visibility: 'private',
      executionMode: 'server-authoritative',
      maxPlayers: 4,
      seats: [{ seat: 1, playerId: 'p1', ready: true, connectionStatus: 'connected' }],
    }),
    false,
  );
});
