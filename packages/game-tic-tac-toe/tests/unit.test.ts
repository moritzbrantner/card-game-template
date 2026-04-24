import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameEngine } from '@repo/game-engine';
import {
  createLocalGameSession,
  createServerGameSession,
} from '@repo/game-session';

import {
  createTicTacToeAdapter,
  createTicTacToeBots,
  getTicTacToeExamplePreset,
  projectTicTacToePlayerView,
} from '../src/index.ts';

const adapter = createTicTacToeAdapter();
const players = [
  { playerId: 'p1', displayName: 'Alice', seat: 1 },
  { playerId: 'p2', displayName: 'Bob', seat: 2 },
] as const;

test('tic-tac-toe adapter completes a winning line', () => {
  const engine = createGameEngine(adapter);
  let state = engine.startMatch({
    matchId: 'tic-tac-toe:engine',
    players,
    setup: {},
    executionMode: 'server-authoritative',
  });

  for (const [playerId, cellIndex] of [
    ['p1', 0],
    ['p2', 3],
    ['p1', 1],
    ['p2', 4],
    ['p1', 2],
  ] as const) {
    state = engine.submitMove(state, {
      playerId,
      kind: 'place-mark',
      createdAt: '2026-04-24T12:00:00.000Z',
      payload: { cellIndex },
    }).nextState;
  }

  assert.deepEqual(state.state.board.slice(0, 3), ['X', 'X', 'X']);
  assert.equal(state.state.winnerPlayerId, 'p1');
  assert.deepEqual(engine.finalize(state)?.winnerIds, ['p1']);
});

test('tic-tac-toe sessions support local bots and server replays', () => {
  const preset = getTicTacToeExamplePreset('bot-duel');
  const local = createLocalGameSession({
    adapter,
    bots: createTicTacToeBots(preset.seats),
    hotseat: preset.hotseat,
    matchId: 'tic-tac-toe:local',
    participants: preset.seats,
    projectView: projectTicTacToePlayerView,
    setup: {},
  });

  const localSnapshot = local.getSnapshot();
  assert.equal(localSnapshot.selectedActorPlayerId, 'p1');

  local.submitMove(
    localSnapshot.legalMoves.find((move) => move.payload.cellIndex === 0)!,
  );
  assert.equal(local.getSnapshot().history.length >= 2, true);

  let tick = 0;
  const server = createServerGameSession({
    adapter,
    matchId: 'tic-tac-toe:server',
    now: () => new Date(Date.UTC(2026, 3, 24, 12, 0, tick++)).toISOString(),
    participants: players,
    setup: {},
  });

  for (const [playerId, cellIndex] of [
    ['p1', 0],
    ['p2', 3],
    ['p1', 1],
    ['p2', 4],
    ['p1', 2],
  ] as const) {
    server.submitMove({
      playerId,
      kind: 'place-mark',
      createdAt: '2026-04-24T12:00:00.000Z',
      payload: { cellIndex },
    });
  }

  assert.equal(server.getReplay().acceptedMoves.length, 5);
  assert.deepEqual(server.getSnapshot().matchResult?.winnerIds, ['p1']);
});
