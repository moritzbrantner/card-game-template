import assert from 'node:assert/strict';
import test from 'node:test';

import type { GameMove, MatchState, PlayerProfile } from '../../game-contracts/src/index.ts';

import {
  areMovesEquivalent,
  createGameEngine,
  createSeededRandom,
  IllegalMoveError,
  shuffleWithSeed,
} from '../src/index.ts';

type CounterState = {
  total: number;
};

type CounterMove = GameMove<{ amount: number }>;

const players: readonly PlayerProfile[] = [
  { playerId: 'p1', displayName: 'Alice', seat: 1 },
  { playerId: 'p2', displayName: 'Bob', seat: 2 },
];

const counterAdapter = {
  definition: {
    gameId: 'counter',
    name: 'Counter',
    minPlayers: 2,
    maxPlayers: 2,
    supportsLocal: true,
    supportsOnline: true,
    tags: ['test'],
  },
  createInitialState({
    matchId,
    executionMode,
    players: currentPlayers,
  }: {
    matchId: string;
    executionMode: 'local' | 'server-authoritative';
    players: readonly PlayerProfile[];
    setup: { target: number };
  }): MatchState<CounterState> {
    return {
      matchId,
      gameId: 'counter',
      players: currentPlayers,
      activePlayerId: currentPlayers[0]?.playerId ?? 'p1',
      turn: 1,
      executionMode,
      state: {
        total: 0,
      },
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
    return counterAdapter.listLegalMoves(state).some((candidate) => areMovesEquivalent(candidate, move));
  },
  applyMove(state: MatchState<CounterState>, move: CounterMove): MatchState<CounterState> {
    return {
      ...state,
      turn: state.turn + 1,
      activePlayerId: state.players.find((player) => player.playerId !== move.playerId)?.playerId ?? move.playerId,
      state: {
        total: state.state.total + move.payload.amount,
      },
    };
  },
  isMatchComplete(state: MatchState<CounterState>): boolean {
    return state.state.total >= 1;
  },
  getResult(state: MatchState<CounterState>) {
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

test('createGameEngine starts matches and applies legal moves', () => {
  const engine = createGameEngine(counterAdapter);
  const initial = engine.startMatch({
    matchId: 'match-1',
    players,
    setup: { target: 1 },
    executionMode: 'server-authoritative',
  });

  const next = engine.submitMove(initial, {
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1 },
  });

  assert.equal(initial.executionMode, 'server-authoritative');
  assert.equal(next.state.total, 1);
  assert.equal(next.activePlayerId, 'p2');
  assert.deepEqual(engine.finalizeMatch(next), {
    matchId: 'match-1',
    gameId: 'counter',
    winnerIds: ['p1'],
    rankings: [{ playerId: 'p1', position: 1 }],
    finishedAt: '2026-04-17T12:00:01.000Z',
    executionMode: 'server-authoritative',
  });
});

test('createGameEngine rejects illegal moves', () => {
  const engine = createGameEngine(counterAdapter);
  const initial = engine.startMatch({
    matchId: 'match-2',
    players,
    setup: { target: 1 },
  });

  assert.throws(() => {
    engine.submitMove(initial, {
      playerId: 'p2',
      kind: 'skip',
      createdAt: '2026-04-17T12:00:00.000Z',
      payload: { amount: 0 },
    });
  }, (error) => {
    assert.equal(error instanceof IllegalMoveError, true);
    assert.equal(error.gameId, 'counter');
    assert.equal(error.matchId, 'match-2');
    assert.equal(error.playerId, 'p2');
    assert.equal(error.moveKind, 'skip');
    assert.equal(error.reason, 'move is not legal in the current match state');
    return true;
  });
});

test('areMovesEquivalent compares payloads instead of only kind and player', () => {
  const left: CounterMove = {
    playerId: 'p1',
    kind: 'play-card',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1, cardId: 'red-1' },
  };
  const right: CounterMove = {
    playerId: 'p1',
    kind: 'play-card',
    createdAt: '2026-04-17T12:01:00.000Z',
    payload: { amount: 1, cardId: 'red-2' },
  };

  assert.equal(areMovesEquivalent(left, right), false);
});

test('shuffleWithSeed is deterministic for the same seed', () => {
  const deck = ['a', 'b', 'c', 'd', 'e'];

  assert.deepEqual(shuffleWithSeed(deck, 'uno-seed'), shuffleWithSeed(deck, 'uno-seed'));
  assert.notDeepEqual(shuffleWithSeed(deck, 'uno-seed'), shuffleWithSeed(deck, 'other-seed'));
});

test('createSeededRandom produces a stable sequence', () => {
  const first = createSeededRandom(42);
  const second = createSeededRandom(42);

  assert.deepEqual(
    [first(), first(), first()],
    [second(), second(), second()],
  );
});
