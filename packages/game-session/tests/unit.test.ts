import assert from 'node:assert/strict';
import test from 'node:test';

import type { GameMove, MatchState } from '../../game-contracts/src/index.ts';
import { createLocalGameSession } from '../src/index.ts';

type CounterState = {
  total: number;
};

type CounterMove = GameMove<{ amount: number }>;

const participants = [
  { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' as const },
  { playerId: 'p2', displayName: 'Bot Bob', seat: 2, controller: 'bot' as const },
  { playerId: 'p3', displayName: 'Casey', seat: 3, controller: 'human' as const },
];

const counterAdapter = {
  definition: {
    gameId: 'session-counter',
    name: 'Session Counter',
    minPlayers: 2,
    maxPlayers: 3,
    supportsLocal: true,
    supportsOnline: false,
    tags: ['test'],
  },
  createInitialState({
    executionMode,
    matchId,
    players,
  }: {
    executionMode: 'local' | 'server-authoritative';
    matchId: string;
    players: typeof participants;
    setup: { target: number };
  }): MatchState<CounterState> {
    return {
      matchId,
      gameId: 'session-counter',
      players,
      activePlayerId: players[0]!.playerId,
      turn: 1,
      executionMode,
      state: { total: 0 },
    };
  },
  listLegalMoves(state: MatchState<CounterState>): readonly CounterMove[] {
    return [
      {
        playerId: state.activePlayerId,
        kind: 'increment',
        createdAt: '2026-04-17T12:00:00.000Z',
        payload: { amount: 1 },
      },
    ];
  },
  isLegalMove(state: MatchState<CounterState>, move: CounterMove): boolean {
    return this.listLegalMoves(state).some(
      (candidate) =>
        candidate.playerId === move.playerId &&
        candidate.kind === move.kind &&
        candidate.payload.amount === move.payload.amount,
    );
  },
  applyMove(state: MatchState<CounterState>, move: CounterMove): MatchState<CounterState> {
    const currentIndex = state.players.findIndex((player) => player.playerId === move.playerId);
    const nextIndex = (currentIndex + 1) % state.players.length;

    return {
      ...state,
      activePlayerId: state.players[nextIndex]!.playerId,
      turn: state.turn + 1,
      state: {
        total: state.state.total + move.payload.amount,
      },
    };
  },
  isMatchComplete(state: MatchState<CounterState>): boolean {
    return state.state.total >= 3;
  },
  getResult(state: MatchState<CounterState>) {
    if (!this.isMatchComplete(state)) {
      return null;
    }

    return {
      matchId: state.matchId,
      gameId: state.gameId,
      winnerIds: ['p1'],
      rankings: [{ playerId: 'p1', position: 1 }],
      finishedAt: '2026-04-17T12:00:01.000Z',
      executionMode: state.executionMode,
    };
  },
};

test('local session advances bot turns automatically and stops on a human turn', () => {
  const session = createLocalGameSession({
    adapter: counterAdapter,
    matchId: 'session-1',
    participants,
    setup: { target: 3 },
    projectView: ({ state, viewerPlayerId, pendingHotseatPlayerId }) => ({
      total: state.state.total,
      viewerPlayerId,
      pendingHotseatPlayerId,
    }),
  });

  session.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1 },
  });

  const snapshot = session.getSnapshot();
  assert.equal(snapshot.match.state.total, 2);
  assert.equal(snapshot.match.activePlayerId, 'p3');
  assert.equal(snapshot.viewerPlayerId, 'p3');
});

test('local session hides the next hotseat hand until confirmation', () => {
  const hotseatSession = createLocalGameSession({
    adapter: counterAdapter,
    hotseat: true,
    matchId: 'session-2',
    participants: [
      { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' as const },
      { playerId: 'p2', displayName: 'Casey', seat: 2, controller: 'human' as const },
    ],
    setup: { target: 3 },
    projectView: ({ viewerPlayerId, pendingHotseatPlayerId }) => ({
      viewerPlayerId,
      pendingHotseatPlayerId,
    }),
  });

  hotseatSession.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1 },
  });

  assert.equal(hotseatSession.getSnapshot().viewerPlayerId, null);
  assert.equal(hotseatSession.getSnapshot().pendingHotseatPlayerId, 'p2');

  hotseatSession.confirmHotseat();

  assert.equal(hotseatSession.getSnapshot().viewerPlayerId, 'p2');
  assert.equal(hotseatSession.getSnapshot().pendingHotseatPlayerId, null);
});
