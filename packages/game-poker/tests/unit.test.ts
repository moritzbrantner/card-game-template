import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameEngine } from '../../game-engine/src/index.ts';
import {
  createPokerAdapter,
  createPokerBots,
  defaultPokerRules,
  evaluateTexasHoldemHand,
  parsePokerMove,
  parsePokerSetup,
  type PokerCard,
  type PokerState,
} from '../src/index.ts';
import type {
  MatchState,
  PlayerProfile,
} from '../../game-contracts/src/index.ts';

const adapter = createPokerAdapter();
const players: readonly PlayerProfile[] = [
  { playerId: 'p1', displayName: 'Alice', seat: 1 },
  { playerId: 'p2', displayName: 'Bob', seat: 2 },
];

function card(rank: PokerCard['rank'], suit: PokerCard['suit']): PokerCard {
  return {
    id: `${rank}-${suit}`,
    label: `${rank} ${suit}`,
    rank,
    suit,
  };
}

function createState(
  state: Partial<PokerState>,
  activePlayerId = 'p1',
): MatchState<PokerState> {
  return {
    matchId: 'match-poker',
    gameId: 'texas-holdem',
    players,
    activePlayerId,
    turn: 1,
    executionMode: 'local',
    state: {
      actedPlayerIds: [],
      betsThisRound: {},
      communityCards: [],
      currentBet: 0,
      deck: [
        card('2', 'clubs'),
        card('3', 'diamonds'),
        card('4', 'hearts'),
        card('5', 'spades'),
        card('6', 'clubs'),
      ],
      foldedPlayerIds: [],
      hands: {
        p1: [card('A', 'spades'), card('A', 'hearts')],
        p2: [card('K', 'clubs'), card('Q', 'clubs')],
      },
      lastEvent: 'Test hand',
      phase: 'preflop',
      pot: 0,
      rules: defaultPokerRules,
      seed: 'test-seed',
      stacks: {
        p1: 100,
        p2: 100,
      },
      showdown: null,
      winnerIds: [],
      ...state,
    },
  };
}

test("Texas Hold'em initial state is deterministic for the same seed", () => {
  const first = adapter.createInitialState({
    matchId: 'poker-1',
    players,
    setup: { seed: 'poker-seed' },
    executionMode: 'local',
  });
  const second = adapter.createInitialState({
    matchId: 'poker-2',
    players,
    setup: { seed: 'poker-seed' },
    executionMode: 'local',
  });

  assert.deepEqual(first.state.hands.p1, second.state.hands.p1);
  assert.deepEqual(first.state.deck.slice(0, 5), second.state.deck.slice(0, 5));
});

test('poker setup and moves parse unknown API payloads', () => {
  assert.deepEqual(
    parsePokerSetup({
      seed: 'api-seed',
      rules: {
        betSizes: [5, 10],
        startingStack: 80,
      },
    }),
    {
      seed: 'api-seed',
      rules: {
        betSizes: [5, 10],
        startingStack: 80,
      },
    },
  );

  assert.deepEqual(
    parsePokerMove({
      playerId: 'p1',
      kind: 'bet',
      createdAt: '2026-04-21T12:00:00.000Z',
      payload: {
        amount: 10,
      },
    }),
    {
      playerId: 'p1',
      kind: 'bet',
      createdAt: '2026-04-21T12:00:00.000Z',
      payload: {
        amount: 10,
      },
    },
  );

  assert.throws(
    () =>
      parsePokerMove({
        playerId: 'p1',
        kind: 'bet',
        createdAt: '2026-04-21T12:00:00.000Z',
        payload: {},
      }),
    /amount/,
  );
});

test('bet and call move the pot and reveal the flop', () => {
  const afterBet = adapter.applyMove(createState({}), {
    playerId: 'p1',
    kind: 'bet',
    createdAt: '2026-04-21T12:00:00.000Z',
    payload: {
      amount: 20,
    },
  });

  assert.equal(afterBet.activePlayerId, 'p2');
  assert.equal(afterBet.state.pot, 20);
  assert.equal(afterBet.state.currentBet, 20);
  assert.equal(afterBet.state.stacks.p1, 80);

  const afterCall = adapter.applyMove(afterBet, {
    playerId: 'p2',
    kind: 'call',
    createdAt: '2026-04-21T12:00:01.000Z',
    payload: {},
  });

  assert.equal(afterCall.state.phase, 'flop');
  assert.equal(afterCall.state.communityCards.length, 3);
  assert.equal(afterCall.state.pot, 40);
  assert.equal(afterCall.state.currentBet, 0);
});

test('check rounds reveal the community cards in deck order through the river', () => {
  let state = createState({});

  state = adapter.applyMove(state, {
    playerId: 'p1',
    kind: 'check',
    createdAt: '2026-04-21T12:00:00.000Z',
    payload: {},
  });
  state = adapter.applyMove(state, {
    playerId: 'p2',
    kind: 'check',
    createdAt: '2026-04-21T12:00:01.000Z',
    payload: {},
  });

  assert.equal(state.state.phase, 'flop');
  assert.deepEqual(
    state.state.communityCards.map((communityCard) => communityCard.id),
    ['2-clubs', '3-diamonds', '4-hearts'],
  );

  state = adapter.applyMove(state, {
    playerId: 'p1',
    kind: 'check',
    createdAt: '2026-04-21T12:00:02.000Z',
    payload: {},
  });
  state = adapter.applyMove(state, {
    playerId: 'p2',
    kind: 'check',
    createdAt: '2026-04-21T12:00:03.000Z',
    payload: {},
  });

  assert.equal(state.state.phase, 'turn');
  assert.deepEqual(
    state.state.communityCards.map((communityCard) => communityCard.id),
    ['2-clubs', '3-diamonds', '4-hearts', '5-spades'],
  );

  state = adapter.applyMove(state, {
    playerId: 'p1',
    kind: 'check',
    createdAt: '2026-04-21T12:00:04.000Z',
    payload: {},
  });
  state = adapter.applyMove(state, {
    playerId: 'p2',
    kind: 'check',
    createdAt: '2026-04-21T12:00:05.000Z',
    payload: {},
  });

  assert.equal(state.state.phase, 'river');
  assert.deepEqual(
    state.state.communityCards.map((communityCard) => communityCard.id),
    ['2-clubs', '3-diamonds', '4-hearts', '5-spades', '6-clubs'],
  );
});

test('fold completes the hand and awards the pot', () => {
  const engine = createGameEngine(adapter);
  const afterBet = adapter.applyMove(createState({}), {
    playerId: 'p1',
    kind: 'bet',
    createdAt: '2026-04-21T12:00:00.000Z',
    payload: {
      amount: 10,
    },
  });
  const afterFold = engine.submitMove(afterBet, {
    playerId: 'p2',
    kind: 'fold',
    createdAt: '2026-04-21T12:00:01.000Z',
    payload: {},
  });

  assert.equal(afterFold.nextState.state.phase, 'complete');
  assert.deepEqual(afterFold.nextState.state.winnerIds, ['p1']);
  assert.equal(afterFold.nextState.state.stacks.p1, 100);
  assert.deepEqual(engine.finalize(afterFold.nextState)?.winnerIds, ['p1']);
});

test('showdown evaluates the best seven-card hand', () => {
  const evaluation = evaluateTexasHoldemHand([
    card('A', 'spades'),
    card('A', 'hearts'),
    card('A', 'clubs'),
    card('K', 'spades'),
    card('K', 'diamonds'),
    card('2', 'clubs'),
    card('9', 'hearts'),
  ]);

  assert.equal(evaluation.rank, 'full-house');
});

test('checking through the river completes with the stronger hand winning', () => {
  let state = createState({
    communityCards: [
      card('A', 'clubs'),
      card('7', 'diamonds'),
      card('2', 'clubs'),
      card('9', 'hearts'),
      card('4', 'spades'),
    ],
    deck: [],
    hands: {
      p1: [card('A', 'spades'), card('K', 'hearts')],
      p2: [card('Q', 'clubs'), card('J', 'clubs')],
    },
    phase: 'river',
  });

  state = adapter.applyMove(state, {
    playerId: 'p1',
    kind: 'check',
    createdAt: '2026-04-21T12:00:00.000Z',
    payload: {},
  });
  state = adapter.applyMove(state, {
    playerId: 'p2',
    kind: 'check',
    createdAt: '2026-04-21T12:00:01.000Z',
    payload: {},
  });

  assert.equal(state.state.phase, 'complete');
  assert.deepEqual(state.state.winnerIds, ['p1']);
  assert.equal(state.state.showdown?.p1?.rank, 'pair');
});

test('showdown splits the pot when the board gives both players the same hand', () => {
  let state = createState({
    communityCards: [
      card('A', 'clubs'),
      card('K', 'diamonds'),
      card('Q', 'hearts'),
      card('J', 'spades'),
      card('10', 'clubs'),
    ],
    deck: [],
    hands: {
      p1: [card('2', 'clubs'), card('3', 'clubs')],
      p2: [card('4', 'diamonds'), card('5', 'diamonds')],
    },
    phase: 'river',
    pot: 20,
    stacks: {
      p1: 90,
      p2: 90,
    },
  });

  state = adapter.applyMove(state, {
    playerId: 'p1',
    kind: 'check',
    createdAt: '2026-04-21T12:00:00.000Z',
    payload: {},
  });
  state = adapter.applyMove(state, {
    playerId: 'p2',
    kind: 'check',
    createdAt: '2026-04-21T12:00:01.000Z',
    payload: {},
  });

  assert.equal(state.state.phase, 'complete');
  assert.deepEqual(state.state.winnerIds, ['p1', 'p2']);
  assert.equal(state.state.showdown?.p1?.rank, 'straight');
  assert.equal(state.state.showdown?.p2?.rank, 'straight');
  assert.equal(state.state.stacks.p1, 100);
  assert.equal(state.state.stacks.p2, 100);
});

test('poker bots prefer check/call over folding', () => {
  const bots = createPokerBots([
    { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' },
    { playerId: 'p2', displayName: 'Bot', seat: 2, controller: 'bot' },
  ]);
  const state = createState(
    {
      currentBet: 20,
      betsThisRound: {
        p1: 20,
        p2: 0,
      },
    },
    'p2',
  );
  const choice = bots.p2?.chooseMove({
    legalMoves: adapter.listLegalMoves(state),
    participants: [
      { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' },
      { playerId: 'p2', displayName: 'Bot', seat: 2, controller: 'bot' },
    ],
    playerId: 'p2',
    state,
  });

  assert.equal(choice?.kind, 'call');
});
