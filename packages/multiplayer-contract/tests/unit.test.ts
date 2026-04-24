import assert from 'node:assert/strict';
import test from 'node:test';

import type { RealtimeMatchEvent, RealtimeRoomEvent } from '../src/index.ts';
import {
  canStartRoom,
  createOnlineGameApiClient,
  createRoomSummary,
  defineOnlineMatchApi,
  OnlineGameApiError,
} from '../src/index.ts';

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
      seats: [
        { seat: 1, playerId: 'p1', ready: true, connectionStatus: 'connected' },
      ],
    }),
    false,
  );
});

test('realtime events carry room and authoritative match cursors', () => {
  const roomEvent: RealtimeRoomEvent = {
    type: 'room.updated',
    roomId: 'room-1',
    occurredAt: '2026-04-22T10:00:00.000Z',
  };
  const moveEvent: RealtimeMatchEvent = {
    type: 'move.accepted',
    matchId: 'match-1',
    gameId: 'uno',
    occurredAt: '2026-04-22T10:00:01.000Z',
    sequence: 3,
    playerId: 'p1',
    moveKind: 'play-card',
  };

  assert.equal(roomEvent.roomId, 'room-1');
  assert.equal(moveEvent.matchId, 'match-1');
  assert.equal(moveEvent.sequence, 3);
});

test('online game API client sends authenticated match requests through typed descriptors', async () => {
  const requests = [];
  const unoApi = defineOnlineMatchApi({
    gameId: 'uno-style',
    routeSegment: 'uno',
  });
  const client = createOnlineGameApiClient({
    baseUrl: 'https://games.example.test/app/',
    auth: {
      kind: 'cookie',
      value: 'app-session=session-1; game-guest-id=guest-1',
    },
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : null,
        cookie: new Headers(init?.headers).get('cookie'),
        credentials: init?.credentials,
      });

      return Response.json({ ok: true, requestCount: requests.length });
    },
  });

  await client.createMatch(unoApi, {
    presetId: 'hotseat-duo',
    displayName: 'Ada',
  });
  await client.submitMove(unoApi, 'match 1', {
    playerId: 'p1',
    kind: 'draw-card',
    createdAt: '2026-04-22T10:00:00.000Z',
    payload: {},
  });
  await client.getMatchEvents(unoApi, 'match 1', {
    afterSequence: 2,
    sinceUpdatedAt: '2026-04-22T10:00:01.000Z',
  });

  assert.deepEqual(requests, [
    {
      url: 'https://games.example.test/app/api/games/uno/matches',
      method: 'POST',
      body: {
        presetId: 'hotseat-duo',
        displayName: 'Ada',
      },
      cookie: 'app-session=session-1; game-guest-id=guest-1',
      credentials: 'include',
    },
    {
      url: 'https://games.example.test/app/api/games/uno/matches/match%201/moves',
      method: 'POST',
      body: {
        move: {
          playerId: 'p1',
          kind: 'draw-card',
          createdAt: '2026-04-22T10:00:00.000Z',
          payload: {},
        },
      },
      cookie: 'app-session=session-1; game-guest-id=guest-1',
      credentials: 'include',
    },
    {
      url: 'https://games.example.test/app/api/games/uno/matches/match%201/events?afterSequence=2&sinceUpdatedAt=2026-04-22T10%3A00%3A01.000Z',
      method: 'GET',
      body: null,
      cookie: 'app-session=session-1; game-guest-id=guest-1',
      credentials: 'include',
    },
  ]);
});

test('online game API client can rotate auth and call room endpoints', async () => {
  const requests = [];
  const client = createOnlineGameApiClient({
    baseUrl: 'https://games.example.test',
    auth: {
      kind: 'bearer',
      token: 'token-a',
    },
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : null,
        authorization: new Headers(init?.headers).get('authorization'),
      });

      return Response.json({ ok: true });
    },
  });

  await client.createRoom({
    gameId: 'uno-style',
    displayName: 'Ada',
    maxPlayers: 4,
  });
  client.setAuth({
    kind: 'bearer',
    token: 'token-b',
  });
  await client.setRoomReady('room 1', { ready: true });
  await client.startRoom('room 1');

  assert.deepEqual(requests, [
    {
      url: 'https://games.example.test/api/games/rooms',
      method: 'POST',
      body: {
        gameId: 'uno-style',
        displayName: 'Ada',
        maxPlayers: 4,
      },
      authorization: 'Bearer token-a',
    },
    {
      url: 'https://games.example.test/api/games/rooms/room%201/ready',
      method: 'POST',
      body: {
        ready: true,
      },
      authorization: 'Bearer token-b',
    },
    {
      url: 'https://games.example.test/api/games/rooms/room%201/start',
      method: 'POST',
      body: null,
      authorization: 'Bearer token-b',
    },
  ]);
});

test('online game API client throws problem details for failed requests', async () => {
  const client = createOnlineGameApiClient({
    baseUrl: 'https://games.example.test',
    fetch: async () =>
      Response.json(
        {
          type: '/problems/uno-match-move',
          title: 'Unable to submit move',
          status: 409,
          detail: 'Expected sequence is stale.',
        },
        {
          status: 409,
        },
      ),
  });
  const unoApi = defineOnlineMatchApi({
    gameId: 'uno-style',
    routeSegment: 'uno',
  });

  await assert.rejects(
    () =>
      client.submitMove(unoApi, 'match-1', {
        playerId: 'p1',
        kind: 'draw-card',
        createdAt: '2026-04-22T10:00:00.000Z',
        payload: {},
      }),
    (error) => {
      assert.ok(error instanceof OnlineGameApiError);
      assert.equal(error.status, 409);
      assert.equal(error.message, 'Expected sequence is stale.');
      assert.equal(error.problem?.type, '/problems/uno-match-move');
      return true;
    },
  );
});
