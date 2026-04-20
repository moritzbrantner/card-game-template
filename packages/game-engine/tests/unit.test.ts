import assert from 'node:assert/strict';
import test from 'node:test';

import type { GameMove, MatchState, PlayerProfile } from '../../game-contracts/src/index.ts';

import {
  addCards,
  areMovesEquivalent,
  createGameEngine,
  createSeededRandom,
  drawCardsBetweenStacks,
  drawCardsFromSources,
  drawCardsFromBottom,
  drawCardsFromTop,
  type GameAdapter,
  hideAllCards,
  hideCardById,
  IllegalMoveError,
  moveCardById,
  moveCardsBetweenStacks,
  removeCardById,
  removeCardsById,
  revealAllCards,
  revealCardById,
  shuffleCards,
  shuffleWithSeed,
  sortCards,
  sortCardsByRankAndSuit,
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

function createSelectableCounterAdapter(
  selectActor?: GameAdapter<{ target: number }, CounterState, CounterMove>['selectActor'],
): GameAdapter<{ target: number }, CounterState, CounterMove> {
  return {
    ...counterAdapter,
    listLegalMoves(): readonly CounterMove[] {
      return players.map((player) => ({
        playerId: player.playerId,
        kind: 'increment',
        createdAt: '2026-04-17T12:00:00.000Z',
        payload: { amount: 1 },
      }));
    },
    isLegalMove(state: MatchState<CounterState>, move: CounterMove): boolean {
      return this.listLegalMoves(state).some((candidate) => areMovesEquivalent(candidate, move));
    },
    ...(selectActor ? { selectActor } : {}),
  };
}

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
      playerId: 'p1',
      kind: 'skip',
      createdAt: '2026-04-17T12:00:00.000Z',
      payload: { amount: 0 },
    });
  }, (error) => {
    assert.equal(error instanceof IllegalMoveError, true);
    assert.equal(error.gameId, 'counter');
    assert.equal(error.matchId, 'match-2');
    assert.equal(error.playerId, 'p1');
    assert.equal(error.moveKind, 'skip');
    assert.equal(error.reason, 'move is not legal in the current match state');
    return true;
  });
});

test('createGameEngine defaults selected actor to the active player', () => {
  const engine = createGameEngine(createSelectableCounterAdapter());
  const initial = engine.startMatch({
    matchId: 'match-selected-default',
    players,
    setup: { target: 1 },
  });

  assert.throws(() => {
    engine.submitMove(initial, {
      playerId: 'p2',
      kind: 'increment',
      createdAt: '2026-04-17T12:00:00.000Z',
      payload: { amount: 1 },
    });
  }, (error) => {
    assert.equal(error instanceof IllegalMoveError, true);
    assert.equal(error.reason, 'player is not the selected actor in the current match state');
    return true;
  });
});

test('createGameEngine allows a custom non-active selected actor', () => {
  const engine = createGameEngine(createSelectableCounterAdapter(() => 'p2'));
  const initial = engine.startMatch({
    matchId: 'match-selected-custom',
    players,
    setup: { target: 1 },
  });

  const next = engine.submitMove(initial, {
    playerId: 'p2',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1 },
  });

  assert.equal(initial.activePlayerId, 'p1');
  assert.equal(next.state.total, 1);
});

test('createGameEngine rejects legal moves from non-selected actors', () => {
  const engine = createGameEngine(createSelectableCounterAdapter(() => 'p2'));
  const initial = engine.startMatch({
    matchId: 'match-selected-reject',
    players,
    setup: { target: 1 },
  });

  assert.equal(counterAdapter.isLegalMove(initial, {
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1 },
  }), true);
  assert.throws(() => {
    engine.submitMove(initial, {
      playerId: 'p1',
      kind: 'increment',
      createdAt: '2026-04-17T12:00:00.000Z',
      payload: { amount: 1 },
    });
  }, (error) => {
    assert.equal(error instanceof IllegalMoveError, true);
    assert.equal(error.reason, 'player is not the selected actor in the current match state');
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

test('card stack helpers add, remove, draw, and move cards immutably', () => {
  const stack = [
    { id: 'c1', label: 'One' },
    { id: 'c2', label: 'Two' },
    { id: 'c3', label: 'Three' },
  ];

  assert.deepEqual(
    addCards(stack, [{ id: 'c0', label: 'Zero' }], { position: 'start' }),
    [{ id: 'c0', label: 'Zero' }, ...stack],
  );
  assert.deepEqual(
    addCards(stack, [{ id: 'c4', label: 'Four' }], { position: 'end' }),
    [...stack, { id: 'c4', label: 'Four' }],
  );
  assert.deepEqual(
    addCards(stack, [{ id: 'inserted', label: 'Inserted' }], {
      position: 2,
    }).map((card) => card.id),
    ['c1', 'c2', 'inserted', 'c3'],
  );

  const removed = removeCardById(stack, 'c2');
  assert.deepEqual(removed.card, { id: 'c2', label: 'Two' });
  assert.deepEqual(
    removed.cards.map((card) => card.id),
    ['c1', 'c3'],
  );
  assert.deepEqual(removeCardById(stack, 'missing'), {
    cards: stack,
    card: null,
  });

  const removedMany = removeCardsById(stack, ['c1', 'c3']);
  assert.deepEqual(
    removedMany.cards.map((card) => card.id),
    ['c2'],
  );
  assert.deepEqual(
    removedMany.removedCards.map((card) => card.id),
    ['c1', 'c3'],
  );

  const drawn = drawCardsFromTop(stack, 2);
  assert.deepEqual(
    drawn.cards.map((card) => card.id),
    ['c3'],
  );
  assert.deepEqual(
    drawn.drawnCards.map((card) => card.id),
    ['c1', 'c2'],
  );

  const bottomDrawn = drawCardsFromBottom(stack, 2);
  assert.deepEqual(
    bottomDrawn.cards.map((card) => card.id),
    ['c1'],
  );
  assert.deepEqual(
    bottomDrawn.drawnCards.map((card) => card.id),
    ['c2', 'c3'],
  );

  const moved = moveCardById(stack, 'c1', { position: 'end' });
  assert.deepEqual(
    moved.cards.map((card) => card.id),
    ['c2', 'c3', 'c1'],
  );
  assert.deepEqual(
    stack.map((card) => card.id),
    ['c1', 'c2', 'c3'],
  );
});

test('card stack helpers draw and move cards between named sources', () => {
  type StackId = 'draw-pile' | 'discard-pile' | 'hand:p1' | 'hand:p2';
  const stacks: Record<StackId, readonly { id: string; label: string }[]> = {
    'draw-pile': [
      { id: 'draw-1', label: 'Draw One' },
      { id: 'draw-2', label: 'Draw Two' },
    ],
    'discard-pile': [
      { id: 'discard-1', label: 'Discard One' },
      { id: 'discard-2', label: 'Discard Two' },
    ],
    'hand:p1': [{ id: 'p1-card', label: 'Player One Card' }],
    'hand:p2': [
      { id: 'p2-left', label: 'Player Two Left' },
      { id: 'p2-right', label: 'Player Two Right' },
    ],
  };

  const stolen = drawCardsBetweenStacks(stacks, {
    source: 'hand:p2',
    destination: 'hand:p1',
    amount: 1,
    sourcePosition: 'bottom',
  });

  assert.deepEqual(
    stolen.drawnCards.map((card) => card.id),
    ['p2-right'],
  );
  assert.deepEqual(
    stolen.stacks['hand:p1'].map((card) => card.id),
    ['p1-card', 'p2-right'],
  );
  assert.deepEqual(
    stolen.stacks['hand:p2'].map((card) => card.id),
    ['p2-left'],
  );

  const moved = moveCardsBetweenStacks(stacks, {
    source: 'hand:p2',
    destination: 'discard-pile',
    cardIds: ['p2-left'],
    destinationPosition: 'start',
  });

  assert.deepEqual(
    moved.movedCards.map((card) => card.id),
    ['p2-left'],
  );
  assert.deepEqual(
    moved.stacks['discard-pile'].map((card) => card.id),
    ['p2-left', 'discard-1', 'discard-2'],
  );
  assert.deepEqual(
    stacks['hand:p2'].map((card) => card.id),
    ['p2-left', 'p2-right'],
  );
});

test('card stack helpers can draw from ordered fallback sources', () => {
  type StackId = 'primary' | 'secondary' | 'hand:p1';
  const stacks: Record<StackId, readonly { id: string; label: string }[]> = {
    primary: [{ id: 'primary-1', label: 'Primary One' }],
    secondary: [
      { id: 'secondary-1', label: 'Secondary One' },
      { id: 'secondary-2', label: 'Secondary Two' },
    ],
    'hand:p1': [],
  };

  const drawn = drawCardsFromSources(stacks, {
    sources: [
      { source: 'primary', position: 'top' },
      { source: 'secondary', position: 'bottom' },
    ],
    destination: 'hand:p1',
    amount: 3,
  });

  assert.deepEqual(
    drawn.drawnCards.map((card) => card.id),
    ['primary-1', 'secondary-1', 'secondary-2'],
  );
  assert.deepEqual(
    drawn.sourceResults.map((result) => ({
      source: result.source,
      cardIds: result.drawnCards.map((card) => card.id),
    })),
    [
      { source: 'primary', cardIds: ['primary-1'] },
      { source: 'secondary', cardIds: ['secondary-1', 'secondary-2'] },
    ],
  );
  assert.deepEqual(
    drawn.stacks['hand:p1'].map((card) => card.id),
    ['primary-1', 'secondary-1', 'secondary-2'],
  );
  assert.deepEqual(drawn.stacks.primary, []);
  assert.deepEqual(drawn.stacks.secondary, []);
  assert.equal(drawn.remainingAmount, 0);
});

test('card stack helpers reveal and hide cards immutably', () => {
  const hand = [
    { id: 'visible', label: 'Visible', visibility: 'face-up' as const },
    { id: 'hidden', label: 'Hidden', visibility: 'face-down' as const },
  ];

  assert.deepEqual(revealCardById(hand, 'hidden'), [
    { id: 'visible', label: 'Visible', visibility: 'face-up' },
    { id: 'hidden', label: 'Hidden', visibility: 'face-up' },
  ]);
  assert.deepEqual(hideCardById(hand, 'visible'), [
    { id: 'visible', label: 'Visible', visibility: 'face-down' },
    { id: 'hidden', label: 'Hidden', visibility: 'face-down' },
  ]);
  assert.deepEqual(
    revealAllCards(hand).map((card) => card.visibility),
    ['face-up', 'face-up'],
  );
  assert.deepEqual(
    hideAllCards(hand).map((card) => card.visibility),
    ['face-down', 'face-down'],
  );
});

test('card stack helpers sort and shuffle without mutating the source deck', () => {
  const deck = [
    { id: 'hearts-10', suit: 'hearts', rank: 10 },
    { id: 'clubs-a', suit: 'clubs', rank: 'A' },
    { id: 'spades-2', suit: 'spades', rank: 2 },
    { id: 'hearts-3', suit: 'hearts', rank: 3 },
  ];

  assert.deepEqual(
    sortCards(deck, (left, right) => left.id.localeCompare(right.id)).map(
      (card) => card.id,
    ),
    ['clubs-a', 'hearts-10', 'hearts-3', 'spades-2'],
  );

  assert.deepEqual(
    sortCardsByRankAndSuit(deck).map((card) => card.id),
    ['clubs-a', 'hearts-3', 'hearts-10', 'spades-2'],
  );

  const firstShuffle = shuffleCards(deck, { seed: 'cards' });
  const secondShuffle = shuffleCards(deck, { seed: 'cards' });
  assert.deepEqual(firstShuffle, secondShuffle);
  assert.notDeepEqual(
    firstShuffle.map((card) => card.id),
    deck.map((card) => card.id),
  );
  assert.deepEqual(
    deck.map((card) => card.id),
    ['hearts-10', 'clubs-a', 'spades-2', 'hearts-3'],
  );
});

test('createSeededRandom produces a stable sequence', () => {
  const first = createSeededRandom(42);
  const second = createSeededRandom(42);

  assert.deepEqual(
    [first(), first(), first()],
    [second(), second(), second()],
  );
});
