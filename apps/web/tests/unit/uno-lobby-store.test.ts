import { describe, expect, it } from 'vitest';

import {
  canStartUnoLobby,
  createEmptyUnoDemoStore,
  createUnoLobby,
  exitUnoMatch,
  findUnoLobby,
  finishUnoMatch,
  getUnoSeatFillLabel,
  joinUnoLobby,
  leaveUnoLobby,
  startUnoLobbyGame,
} from '@/src/domain/uno-lobby/store';

const timestamps = {
  created: '2026-04-17T08:00:00.000Z',
  joined: '2026-04-17T08:05:00.000Z',
  started: '2026-04-17T08:10:00.000Z',
  ended: '2026-04-17T08:15:00.000Z',
} as const;

function createIdFactory() {
  let counter = 0;

  return () => `${++counter}`;
}

describe('uno lobby store', () => {
  it('creates open lobbies that become startable after a second player joins', () => {
    const idFactory = createIdFactory();
    const created = createUnoLobby(createEmptyUnoDemoStore(), {
      playerId: 'alice',
      displayName: 'Alice',
      now: timestamps.created,
      idFactory,
    });

    const beforeJoin = findUnoLobby(created.store, created.roomId);
    expect(beforeJoin).not.toBeNull();
    expect(canStartUnoLobby(beforeJoin!)).toBe(false);

    const joinedStore = joinUnoLobby(created.store, {
      roomId: created.roomId,
      playerId: 'bob',
      displayName: 'Bob',
      now: timestamps.joined,
    });

    const lobby = findUnoLobby(joinedStore, created.roomId);
    expect(lobby?.players.map((player) => player.displayName)).toEqual(['Alice', 'Bob']);
    expect(getUnoSeatFillLabel(lobby!)).toBe('2 / 4 seats filled');
    expect(canStartUnoLobby(lobby!)).toBe(true);
  });

  it('reassigns the host when the original host leaves before the match starts', () => {
    const idFactory = createIdFactory();
    const created = createUnoLobby(createEmptyUnoDemoStore(), {
      playerId: 'alice',
      displayName: 'Alice',
      now: timestamps.created,
      idFactory,
    });

    const joinedStore = joinUnoLobby(created.store, {
      roomId: created.roomId,
      playerId: 'bob',
      displayName: 'Bob',
      now: timestamps.joined,
    });

    const afterLeave = leaveUnoLobby(joinedStore, {
      roomId: created.roomId,
      playerId: 'alice',
      now: timestamps.started,
      idFactory,
    });

    const lobby = findUnoLobby(afterLeave, created.roomId);
    expect(lobby?.hostPlayerId).toBe('bob');
    expect(lobby?.players.map((player) => player.displayName)).toEqual(['Bob']);
  });

  it('archives abandoned matches when a participant exits an active game', () => {
    const idFactory = createIdFactory();
    const created = createUnoLobby(createEmptyUnoDemoStore(), {
      playerId: 'alice',
      displayName: 'Alice',
      now: timestamps.created,
      idFactory,
    });

    const joinedStore = joinUnoLobby(created.store, {
      roomId: created.roomId,
      playerId: 'bob',
      displayName: 'Bob',
      now: timestamps.joined,
    });

    const startedStore = startUnoLobbyGame(joinedStore, {
      roomId: created.roomId,
      now: timestamps.started,
      idFactory,
    });

    const afterExit = exitUnoMatch(startedStore, {
      roomId: created.roomId,
      playerId: 'bob',
      now: timestamps.ended,
      idFactory,
    });

    expect(findUnoLobby(afterExit, created.roomId)).toBeNull();
    expect(afterExit.archivedMatches).toHaveLength(1);
    expect(afterExit.archivedMatches[0]).toMatchObject({
      roomName: 'Alice table',
      status: 'abandoned',
      note: 'Bob exited the match',
    });
  });

  it('archives completed demo matches with a winner', () => {
    const idFactory = createIdFactory();
    const created = createUnoLobby(createEmptyUnoDemoStore(), {
      playerId: 'alice',
      displayName: 'Alice',
      now: timestamps.created,
      idFactory,
    });

    const joinedStore = joinUnoLobby(created.store, {
      roomId: created.roomId,
      playerId: 'bob',
      displayName: 'Bob',
      now: timestamps.joined,
    });

    const startedStore = startUnoLobbyGame(joinedStore, {
      roomId: created.roomId,
      now: timestamps.started,
      idFactory,
    });

    const finishedStore = finishUnoMatch(startedStore, {
      roomId: created.roomId,
      winnerIds: ['alice'],
      now: timestamps.ended,
      idFactory,
    });

    expect(findUnoLobby(finishedStore, created.roomId)).toBeNull();
    expect(finishedStore.archivedMatches[0]?.status).toBe('completed');
    expect(finishedStore.archivedMatches[0]?.result?.winnerIds).toEqual(['alice']);
  });
});
