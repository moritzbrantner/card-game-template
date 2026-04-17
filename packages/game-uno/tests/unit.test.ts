import assert from 'node:assert/strict';
import test from 'node:test';

import type { MatchState, PlayerProfile } from '../../game-contracts/src/index.ts';
import { createUnoAdapter, createUnoBots, defaultUnoRules, type UnoCard, type UnoState } from '../src/index.ts';

const adapter = createUnoAdapter();
const players: readonly PlayerProfile[] = [
  { playerId: 'p1', displayName: 'Alice', seat: 1 },
  { playerId: 'p2', displayName: 'Bob', seat: 2 },
];

function createCard(color: UnoCard['color'], kind: UnoCard['kind'], id: string, value?: number): UnoCard {
  return {
    color,
    kind,
    id,
    value,
    label: id,
  };
}

function createState(state: Partial<UnoState>, activePlayerId = 'p1'): MatchState<UnoState> {
  return {
    matchId: 'match-uno',
    gameId: 'uno-style',
    players,
    activePlayerId,
    turn: 1,
    executionMode: 'local',
    state: {
      currentColor: 'red',
      direction: 1,
      discardPile: [createCard('red', 'number', 'discard-5', 5)],
      drawPile: [
        createCard('yellow', 'number', 'draw-1', 1),
        createCard('green', 'number', 'draw-2', 2),
        createCard('blue', 'number', 'draw-3', 3),
        createCard('red', 'number', 'draw-4', 4),
      ],
      drawnCardThisTurnId: null,
      hands: {
        p1: [createCard('red', 'number', 'red-4', 4)],
        p2: [createCard('blue', 'number', 'blue-1', 1)],
      },
      lastEvent: 'Ready',
      pendingDrawAmount: 0,
      pendingDrawSource: null,
      rules: defaultUnoRules,
      seed: 'test-seed',
      winnerPlayerId: null,
      ...state,
    },
  };
}

test('UNO-style initial state is deterministic for the same seed', () => {
  const first = adapter.createInitialState({
    matchId: 'uno-1',
    players,
    setup: { seed: 'uno-seed' },
    executionMode: 'local',
  });
  const second = adapter.createInitialState({
    matchId: 'uno-2',
    players,
    setup: { seed: 'uno-seed' },
    executionMode: 'local',
  });

  assert.deepEqual(first.state.discardPile, second.state.discardPile);
  assert.deepEqual(first.state.hands.p1, second.state.hands.p1);
});

test('wild draw four is illegal when the player holds the active color', () => {
  const state = createState({
    hands: {
      p1: [
        createCard('wild', 'wild-draw-four', 'wdf'),
        createCard('red', 'number', 'red-9', 9),
      ],
      p2: [createCard('blue', 'number', 'blue-1', 1)],
    },
  });

  assert.equal(
    adapter.isLegalMove(state, {
      playerId: 'p1',
      kind: 'play-card',
      createdAt: '2026-04-17T12:00:00.000Z',
      payload: {
        cardId: 'wdf',
        chosenColor: 'blue',
        sayUno: true,
      },
    }),
    false,
  );
});

test('reverse acts like skip in a two-player match', () => {
  const state = createState({
    hands: {
      p1: [createCard('red', 'reverse', 'reverse-card')],
      p2: [createCard('blue', 'number', 'blue-1', 1)],
    },
  });

  const next = adapter.applyMove(state, {
    playerId: 'p1',
    kind: 'play-card',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: {
      cardId: 'reverse-card',
      sayUno: true,
    },
  });

  assert.equal(next.activePlayerId, 'p1');
});

test('draw penalties respect the stacking rule toggle', () => {
  const noStacking = createState({
    pendingDrawAmount: 2,
    pendingDrawSource: 'draw-two',
    hands: {
      p1: [
        createCard('red', 'draw-two', 'draw-two'),
        createCard('red', 'number', 'red-7', 7),
      ],
      p2: [createCard('blue', 'number', 'blue-1', 1)],
    },
  });
  const withStacking = createState({
    pendingDrawAmount: 2,
    pendingDrawSource: 'draw-two',
    rules: {
      ...defaultUnoRules,
      drawStacking: true,
    },
    hands: {
      p1: [
        createCard('red', 'draw-two', 'draw-two'),
        createCard('red', 'number', 'red-7', 7),
      ],
      p2: [createCard('blue', 'number', 'blue-1', 1)],
    },
  });

  assert.deepEqual(adapter.listLegalMoves(noStacking).map((move) => move.kind), ['draw-card']);
  assert.equal(
    adapter.listLegalMoves(withStacking).some((move) => move.kind === 'play-card'),
    true,
  );
});

test('jump-in exposes out-of-turn play for the matching face', () => {
  const jumpInState = createState({
    rules: {
      ...defaultUnoRules,
      jumpIn: true,
    },
    hands: {
      p1: [createCard('red', 'number', 'red-4', 4)],
      p2: [createCard('red', 'number', 'matching-face', 5)],
    },
  });

  const legalMoves = adapter.listLegalMoves(jumpInState);

  assert.equal(legalMoves.some((move) => move.playerId === 'p2' && move.kind === 'play-card'), true);
});

test('seven-zero rotates hands when zero is played', () => {
  const zeroState = createState({
    rules: {
      ...defaultUnoRules,
      sevenZero: true,
    },
    hands: {
      p1: [createCard('red', 'number', 'zero-card', 0)],
      p2: [createCard('blue', 'number', 'blue-9', 9), createCard('yellow', 'number', 'yellow-1', 1)],
    },
  });

  const next = adapter.applyMove(zeroState, {
    playerId: 'p1',
    kind: 'play-card',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: {
      cardId: 'zero-card',
      sayUno: true,
    },
  });

  assert.equal(next.state.hands.p1.length, 2);
});

test('match completes when a player empties their hand', () => {
  const winningState = createState({
    hands: {
      p1: [createCard('red', 'number', 'winning-card', 5)],
      p2: [createCard('blue', 'number', 'blue-1', 1)],
    },
  });

  const next = adapter.applyMove(winningState, {
    playerId: 'p1',
    kind: 'play-card',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: {
      cardId: 'winning-card',
      sayUno: true,
    },
  });

  assert.equal(adapter.isMatchComplete(next), true);
  assert.deepEqual(adapter.getResult?.(next)?.winnerIds, ['p1']);
});

test('bot selection prefers the majority color when choosing a wild', () => {
  const bots = createUnoBots([
    { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' },
    { playerId: 'p2', displayName: 'Bot', seat: 2, controller: 'bot' },
  ]);
  const botState = createState(
    {
      currentColor: 'red',
      hands: {
        p1: [createCard('blue', 'number', 'blue-1', 1)],
        p2: [
          createCard('wild', 'wild', 'wild-card'),
          createCard('green', 'number', 'green-1', 1),
          createCard('green', 'number', 'green-7', 7),
        ],
      },
    },
    'p2',
  );

  const choice = bots.p2?.chooseMove({
    legalMoves: adapter.listLegalMoves(botState),
    participants: [
      { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' },
      { playerId: 'p2', displayName: 'Bot', seat: 2, controller: 'bot' },
    ],
    playerId: 'p2',
    state: botState,
  });

  assert.equal(choice?.kind, 'play-card');
  assert.equal(choice?.payload.chosenColor, 'green');
});
