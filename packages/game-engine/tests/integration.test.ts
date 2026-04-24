import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  GameMove,
  MatchState,
  PlayerId,
  PlayerProfile,
} from '../../game-contracts/src/index.ts';
import {
  drawCardsBetweenStacks,
  moveCardsBetweenStacks,
} from '../../card-kit/src/index.ts';

import {
  areMovesEquivalent,
  createGameEngine,
  type GameAdapter,
} from '../src/index.ts';

type BattleCard = {
  id: string;
  label: string;
  rank: number;
  suit: string;
};

type BattleSetup = {
  deck: readonly BattleCard[];
  handSize: number;
  targetScore: number;
};

type BattleState = {
  deck: readonly BattleCard[];
  discard: readonly BattleCard[];
  hands: Record<PlayerId, readonly BattleCard[]>;
  scores: Record<PlayerId, number>;
  targetScore: number;
  winnerPlayerId: PlayerId | null;
};

type BattleMove = GameMove<{ cardId: string }>;

const players: readonly PlayerProfile[] = [
  { playerId: 'p1', displayName: 'Alice', seat: 1 },
  { playerId: 'p2', displayName: 'Bob', seat: 2 },
];

const fixtureDeck: readonly BattleCard[] = [
  { id: 'red-3', label: 'Red 3', rank: 3, suit: 'red' },
  { id: 'blue-4', label: 'Blue 4', rank: 4, suit: 'blue' },
  { id: 'green-2', label: 'Green 2', rank: 2, suit: 'green' },
  { id: 'yellow-1', label: 'Yellow 1', rank: 1, suit: 'yellow' },
];

function handStackId(playerId: PlayerId) {
  return `hand:${playerId}`;
}

function createStacks(
  state: BattleState,
): Record<string, readonly BattleCard[]> {
  return {
    deck: state.deck,
    discard: state.discard,
    ...Object.fromEntries(
      Object.entries(state.hands).map(([playerId, cards]) => [
        handStackId(playerId),
        cards,
      ]),
    ),
  };
}

const battleAdapter: GameAdapter<BattleSetup, BattleState, BattleMove> = {
  definition: {
    gameId: 'engine-battle',
    name: 'Engine Battle',
    minPlayers: 2,
    maxPlayers: 2,
    supportsLocal: true,
    supportsOnline: true,
    tags: ['test', 'cards'],
  },
  createInitialState({
    executionMode,
    matchId,
    players: currentPlayers,
    setup,
  }): MatchState<BattleState> {
    let stacks: Record<string, readonly BattleCard[]> = {
      deck: setup.deck,
      discard: [],
      ...Object.fromEntries(
        currentPlayers.map((player) => [handStackId(player.playerId), []]),
      ),
    };

    for (const player of currentPlayers) {
      stacks = drawCardsBetweenStacks(stacks, {
        source: 'deck',
        destination: handStackId(player.playerId),
        amount: setup.handSize,
      }).stacks;
    }

    return {
      matchId,
      gameId: 'engine-battle',
      players: currentPlayers,
      activePlayerId: currentPlayers[0]?.playerId ?? 'p1',
      turn: 1,
      executionMode,
      state: {
        deck: stacks.deck ?? [],
        discard: stacks.discard ?? [],
        hands: Object.fromEntries(
          currentPlayers.map((player) => [
            player.playerId,
            stacks[handStackId(player.playerId)] ?? [],
          ]),
        ),
        scores: Object.fromEntries(
          currentPlayers.map((player) => [player.playerId, 0]),
        ),
        targetScore: setup.targetScore,
        winnerPlayerId: null,
      },
    };
  },
  listLegalMoves(state): readonly BattleMove[] {
    if (state.state.winnerPlayerId) {
      return [];
    }

    return (state.state.hands[state.activePlayerId] ?? []).map((card) => ({
      playerId: state.activePlayerId,
      kind: 'play-card',
      createdAt: '2026-04-17T12:00:00.000Z',
      payload: {
        cardId: card.id,
      },
    }));
  },
  isLegalMove(state, move): boolean {
    return this.listLegalMoves(state).some((candidate) =>
      areMovesEquivalent(candidate, move),
    );
  },
  applyMove(state, move): MatchState<BattleState> {
    const moved = moveCardsBetweenStacks(createStacks(state.state), {
      source: handStackId(move.playerId),
      destination: 'discard',
      destinationPosition: 'end',
      cardIds: [move.payload.cardId],
    });
    const playedCard = moved.movedCards[0];

    if (!playedCard) {
      throw new Error(
        `Card ${move.payload.cardId} is not in hand for ${move.playerId}`,
      );
    }

    const nextScores = {
      ...state.state.scores,
      [move.playerId]:
        (state.state.scores[move.playerId] ?? 0) + playedCard.rank,
    };
    const nextPlayer =
      state.players[
        (state.players.findIndex(
          (player) => player.playerId === move.playerId,
        ) +
          1) %
          state.players.length
      ]?.playerId ?? move.playerId;

    return {
      ...state,
      activePlayerId:
        nextScores[move.playerId]! >= state.state.targetScore
          ? move.playerId
          : nextPlayer,
      turn: state.turn + 1,
      state: {
        ...state.state,
        deck: moved.stacks.deck ?? [],
        discard: moved.stacks.discard ?? [],
        hands: Object.fromEntries(
          state.players.map((player) => [
            player.playerId,
            moved.stacks[handStackId(player.playerId)] ?? [],
          ]),
        ),
        scores: nextScores,
        winnerPlayerId:
          nextScores[move.playerId]! >= state.state.targetScore
            ? move.playerId
            : null,
      },
    };
  },
  isMatchComplete(state): boolean {
    return Boolean(state.state.winnerPlayerId);
  },
  getResult(state) {
    if (!state.state.winnerPlayerId) {
      return null;
    }

    return {
      matchId: state.matchId,
      gameId: state.gameId,
      winnerIds: [state.state.winnerPlayerId],
      rankings: [...state.players]
        .sort(
          (left, right) =>
            (state.state.scores[right.playerId] ?? 0) -
              (state.state.scores[left.playerId] ?? 0) ||
            left.seat - right.seat,
        )
        .map((player, index) => ({
          playerId: player.playerId,
          position: index + 1,
          score: state.state.scores[player.playerId] ?? 0,
        })),
      finishedAt: '2026-04-17T12:00:03.000Z',
      executionMode: state.executionMode,
    };
  },
};

test('engine runs a complete card-game adapter lifecycle', () => {
  const engine = createGameEngine(battleAdapter);
  const initial = engine.startMatch({
    matchId: 'battle-1',
    players,
    setup: {
      deck: fixtureDeck,
      handSize: 2,
      targetScore: 6,
    },
    executionMode: 'server-authoritative',
  });

  assert.equal(initial.executionMode, 'server-authoritative');
  assert.deepEqual(
    initial.state.hands.p1.map((card) => card.id),
    ['red-3', 'blue-4'],
  );
  assert.deepEqual(
    initial.state.hands.p2.map((card) => card.id),
    ['green-2', 'yellow-1'],
  );
  assert.deepEqual(initial.state.deck, []);
  assert.equal(engine.finalize(initial), null);

  const afterP1 = engine.submitMove(initial, {
    playerId: 'p1',
    kind: 'play-card',
    createdAt: '2026-04-17T12:00:01.000Z',
    payload: { cardId: 'red-3' },
  }).nextState;
  const afterP2 = engine.submitMove(afterP1, {
    playerId: 'p2',
    kind: 'play-card',
    createdAt: '2026-04-17T12:00:02.000Z',
    payload: { cardId: 'green-2' },
  }).nextState;
  const complete = engine.submitMove(afterP2, {
    playerId: 'p1',
    kind: 'play-card',
    createdAt: '2026-04-17T12:00:03.000Z',
    payload: { cardId: 'blue-4' },
  }).nextState;

  assert.equal(initial.state.hands.p1.length, 2);
  assert.equal(complete.turn, 4);
  assert.equal(complete.activePlayerId, 'p1');
  assert.deepEqual(complete.state.scores, { p1: 7, p2: 2 });
  assert.deepEqual(
    complete.state.discard.map((card) => card.id),
    ['red-3', 'green-2', 'blue-4'],
  );
  assert.deepEqual(complete.state.hands.p1, []);
  assert.deepEqual(
    complete.state.hands.p2.map((card) => card.id),
    ['yellow-1'],
  );

  assert.deepEqual(engine.finalize(complete), {
    matchId: 'battle-1',
    gameId: 'engine-battle',
    winnerIds: ['p1'],
    rankings: [
      { playerId: 'p1', position: 1, score: 7 },
      { playerId: 'p2', position: 2, score: 2 },
    ],
    finishedAt: '2026-04-17T12:00:03.000Z',
    executionMode: 'server-authoritative',
  });
});
