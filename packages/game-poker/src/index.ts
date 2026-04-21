import type {
  GameDefinition,
  GameMove,
  MatchResult,
  MatchState,
  PlayerId,
  PlayerProfile,
} from '@repo/game-contracts';
import {
  areMovesEquivalent,
  createSeededRandom,
  shuffleWithSeed,
  type GameAdapter,
} from '@repo/game-engine';
import type {
  LocalGameSessionBot,
  LocalGameSessionProjectViewInput,
  SessionParticipant,
} from '@repo/game-session';

export type PokerSuit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type PokerRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type PokerPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'complete';

export type PokerCard = {
  id: string;
  label: string;
  rank: PokerRank;
  suit: PokerSuit;
};

export type PokerRules = {
  betSizes: readonly number[];
  startingStack: number;
};

export type PokerHandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-kind'
  | 'straight-flush';

export type PokerHandEvaluation = {
  description: string;
  rank: PokerHandRank;
  score: readonly number[];
};

export type PokerState = {
  actedPlayerIds: readonly PlayerId[];
  betsThisRound: Record<PlayerId, number>;
  communityCards: readonly PokerCard[];
  currentBet: number;
  deck: readonly PokerCard[];
  foldedPlayerIds: readonly PlayerId[];
  hands: Record<PlayerId, readonly PokerCard[]>;
  lastEvent: string;
  phase: PokerPhase;
  pot: number;
  rules: PokerRules;
  seed: number | string;
  stacks: Record<PlayerId, number>;
  showdown: Record<PlayerId, PokerHandEvaluation> | null;
  winnerIds: readonly PlayerId[];
};

export type PokerCheckMove = GameMove<Record<string, never>>;
export type PokerFoldMove = GameMove<Record<string, never>>;
export type PokerCallMove = GameMove<Record<string, never>>;
export type PokerBetMove = GameMove<{ amount: number }>;
export type PokerMove = PokerCheckMove | PokerFoldMove | PokerCallMove | PokerBetMove;

export type PokerPlayerView = {
  activePlayerId: PlayerId;
  communityCards: readonly PokerCard[];
  legalActions: ReadonlyArray<{
    id: string;
    label: string;
    move: PokerMove;
  }>;
  matchResultBanner: string | null;
  phase: PokerPhase;
  players: ReadonlyArray<{
    controller: SessionParticipant['controller'];
    displayName: string;
    hasFolded: boolean;
    isActive: boolean;
    isViewer: boolean;
    playerId: PlayerId;
    stack: number;
    visibleCards: readonly PokerCard[];
  }>;
  pot: number;
  status: string;
  viewerPlayerId: PlayerId | null;
};

export type PokerExamplePresetId = 'heads-up' | 'four-seat-bots';
export type PokerExamplePreset = {
  hotseat: boolean;
  id: PokerExamplePresetId;
  label: string;
  seats: readonly SessionParticipant[];
};

export type PokerCatalogMetadata = {
  presets: readonly PokerExamplePreset[];
  route: '/poker';
  supportsBots: true;
};

export type PokerCatalogEntry = {
  definition: GameDefinition;
  metadata: PokerCatalogMetadata;
};

export const defaultPokerRules: PokerRules = {
  betSizes: [10, 20, 50],
  startingStack: 100,
};

export const pokerDefinition: GameDefinition = {
  gameId: 'texas-holdem',
  name: "Texas Hold'em",
  minPlayers: 2,
  maxPlayers: 6,
  supportsLocal: true,
  supportsOnline: false,
  tags: ['card-game', 'poker', 'local'],
};

const SUITS: readonly PokerSuit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS: readonly PokerRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = new Map<PokerRank, number>(RANKS.map((rank, index) => [rank, index + 2]));
const HAND_STRENGTH: Record<PokerHandRank, number> = {
  'high-card': 1,
  pair: 2,
  'two-pair': 3,
  'three-kind': 4,
  straight: 5,
  flush: 6,
  'full-house': 7,
  'four-kind': 8,
  'straight-flush': 9,
};

function createDeck(): PokerCard[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${rank.toLowerCase()}-${suit}`,
      label: `${rank} ${suit}`,
      rank,
      suit,
    })),
  );
}

function nextPlayerId(players: readonly PlayerProfile[], currentPlayerId: PlayerId): PlayerId {
  const activePlayers = players.filter((player) => player.playerId !== currentPlayerId);
  const currentIndex = players.findIndex((player) => player.playerId === currentPlayerId);

  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate = players[(currentIndex + offset + players.length) % players.length]!;

    if (activePlayers.some((player) => player.playerId === candidate.playerId)) {
      return candidate.playerId;
    }
  }

  return currentPlayerId;
}

function nextEligiblePlayerId(
  players: readonly PlayerProfile[],
  state: PokerState,
  currentPlayerId: PlayerId,
): PlayerId {
  const currentIndex = players.findIndex((player) => player.playerId === currentPlayerId);

  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate = players[(currentIndex + offset + players.length) % players.length]!;

    if (!state.foldedPlayerIds.includes(candidate.playerId) && state.stacks[candidate.playerId] !== 0) {
      return candidate.playerId;
    }
  }

  return currentPlayerId;
}

function activePlayerIds(players: readonly PlayerProfile[], state: PokerState): PlayerId[] {
  return players
    .map((player) => player.playerId)
    .filter((playerId) => !state.foldedPlayerIds.includes(playerId));
}

function canAct(playerId: PlayerId, state: PokerState): boolean {
  return !state.foldedPlayerIds.includes(playerId) && (state.stacks[playerId] ?? 0) > 0;
}

function isBettingRoundComplete(players: readonly PlayerProfile[], state: PokerState): boolean {
  const actingPlayerIds = players
    .map((player) => player.playerId)
    .filter((playerId) => canAct(playerId, state));

  return (
    actingPlayerIds.length <= 1 ||
    actingPlayerIds.every((playerId) => state.actedPlayerIds.includes(playerId)) &&
      actingPlayerIds.every((playerId) => (state.betsThisRound[playerId] ?? 0) === state.currentBet)
  );
}

function compareScores(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);

    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function evaluateFiveCards(cards: readonly PokerCard[]): PokerHandEvaluation {
  const values = cards.map((card) => RANK_VALUES.get(card.rank) ?? 0).sort((left, right) => right - left);
  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const countGroups = [...counts.entries()].sort((left, right) => right[1] - left[1] || right[0] - left[0]);
  const isFlush = cards.every((card) => card.suit === cards[0]?.suit);
  const uniqueValues = [...new Set(values)].sort((left, right) => right - left);
  const straightHigh =
    uniqueValues.length === 5 && uniqueValues[0]! - uniqueValues[4]! === 4
      ? uniqueValues[0]!
      : uniqueValues.join(',') === '14,5,4,3,2'
        ? 5
        : null;

  if (isFlush && straightHigh) {
    return { description: 'Straight flush', rank: 'straight-flush', score: [HAND_STRENGTH['straight-flush'], straightHigh] };
  }

  if (countGroups[0]?.[1] === 4) {
    return {
      description: 'Four of a kind',
      rank: 'four-kind',
      score: [HAND_STRENGTH['four-kind'], countGroups[0][0], countGroups[1]?.[0] ?? 0],
    };
  }

  if (countGroups[0]?.[1] === 3 && countGroups[1]?.[1] === 2) {
    return {
      description: 'Full house',
      rank: 'full-house',
      score: [HAND_STRENGTH['full-house'], countGroups[0][0], countGroups[1][0]],
    };
  }

  if (isFlush) {
    return { description: 'Flush', rank: 'flush', score: [HAND_STRENGTH.flush, ...values] };
  }

  if (straightHigh) {
    return { description: 'Straight', rank: 'straight', score: [HAND_STRENGTH.straight, straightHigh] };
  }

  if (countGroups[0]?.[1] === 3) {
    const kickers = countGroups.slice(1).map(([value]) => value).sort((left, right) => right - left);
    return {
      description: 'Three of a kind',
      rank: 'three-kind',
      score: [HAND_STRENGTH['three-kind'], countGroups[0][0], ...kickers],
    };
  }

  if (countGroups[0]?.[1] === 2 && countGroups[1]?.[1] === 2) {
    const pairs = countGroups.slice(0, 2).map(([value]) => value).sort((left, right) => right - left);
    return {
      description: 'Two pair',
      rank: 'two-pair',
      score: [HAND_STRENGTH['two-pair'], ...pairs, countGroups[2]?.[0] ?? 0],
    };
  }

  if (countGroups[0]?.[1] === 2) {
    const kickers = countGroups.slice(1).map(([value]) => value).sort((left, right) => right - left);
    return {
      description: 'Pair',
      rank: 'pair',
      score: [HAND_STRENGTH.pair, countGroups[0][0], ...kickers],
    };
  }

  return { description: 'High card', rank: 'high-card', score: [HAND_STRENGTH['high-card'], ...values] };
}

export function evaluateTexasHoldemHand(cards: readonly PokerCard[]): PokerHandEvaluation {
  if (cards.length < 5) {
    throw new Error('Texas Holdem evaluation requires at least five cards.');
  }

  let best: PokerHandEvaluation | null = null;

  for (let first = 0; first < cards.length - 4; first += 1) {
    for (let second = first + 1; second < cards.length - 3; second += 1) {
      for (let third = second + 1; third < cards.length - 2; third += 1) {
        for (let fourth = third + 1; fourth < cards.length - 1; fourth += 1) {
          for (let fifth = fourth + 1; fifth < cards.length; fifth += 1) {
            const candidate = evaluateFiveCards([
              cards[first]!,
              cards[second]!,
              cards[third]!,
              cards[fourth]!,
              cards[fifth]!,
            ]);

            if (!best || compareScores(candidate.score, best.score) > 0) {
              best = candidate;
            }
          }
        }
      }
    }
  }

  return best!;
}

function revealForPhase(deck: readonly PokerCard[], phase: PokerPhase) {
  if (phase === 'preflop') {
    return {
      communityCardsToAdd: deck.slice(0, 3),
      deck: deck.slice(3),
      phase: 'flop' as const,
    };
  }

  if (phase === 'flop') {
    return {
      communityCardsToAdd: deck.slice(0, 1),
      deck: deck.slice(1),
      phase: 'turn' as const,
    };
  }

  if (phase === 'turn') {
    return {
      communityCardsToAdd: deck.slice(0, 1),
      deck: deck.slice(1),
      phase: 'river' as const,
    };
  }

  return {
    communityCardsToAdd: [],
    deck,
    phase: 'complete' as const,
  };
}

function completeByShowdown(state: MatchState<PokerState>): MatchState<PokerState> {
  const showdown = Object.fromEntries(
    activePlayerIds(state.players, state.state).map((playerId) => [
      playerId,
      evaluateTexasHoldemHand([...(state.state.hands[playerId] ?? []), ...state.state.communityCards]),
    ]),
  ) as Record<PlayerId, PokerHandEvaluation>;
  const bestScore = Object.values(showdown)
    .map((evaluation) => evaluation.score)
    .sort((left, right) => compareScores(right, left))[0] ?? [];
  const winnerIds = Object.entries(showdown)
    .filter(([, evaluation]) => compareScores(evaluation.score, bestScore) === 0)
    .map(([playerId]) => playerId);
  const winningShare = Math.floor(state.state.pot / Math.max(winnerIds.length, 1));
  const stacks = { ...state.state.stacks };

  for (const winnerId of winnerIds) {
    stacks[winnerId] = (stacks[winnerId] ?? 0) + winningShare;
  }

  return {
    ...state,
    activePlayerId: winnerIds[0] ?? state.activePlayerId,
    state: {
      ...state.state,
      betsThisRound: {},
      currentBet: 0,
      lastEvent: `Showdown: ${winnerIds.join(', ')} won ${state.state.pot}`,
      phase: 'complete',
      showdown,
      stacks,
      winnerIds,
    },
  };
}

function advanceRound(state: MatchState<PokerState>, lastActorId: PlayerId): MatchState<PokerState> {
  if (activePlayerIds(state.players, state.state).length === 1) {
    const winnerId = activePlayerIds(state.players, state.state)[0]!;
    return {
      ...state,
      activePlayerId: winnerId,
      state: {
        ...state.state,
        lastEvent: `${winnerId} won ${state.state.pot} after everyone else folded`,
        phase: 'complete',
        stacks: {
          ...state.state.stacks,
          [winnerId]: (state.state.stacks[winnerId] ?? 0) + state.state.pot,
        },
        winnerIds: [winnerId],
      },
    };
  }

  if (!isBettingRoundComplete(state.players, state.state)) {
    return {
      ...state,
      activePlayerId: nextEligiblePlayerId(state.players, state.state, lastActorId),
    };
  }

  if (state.state.phase === 'river') {
    return completeByShowdown(state);
  }

  const revealed = revealForPhase(state.state.deck, state.state.phase);

  return {
    ...state,
    activePlayerId: nextEligiblePlayerId(state.players, state.state, state.players[state.players.length - 1]?.playerId ?? lastActorId),
    state: {
      ...state.state,
      actedPlayerIds: [],
      betsThisRound: {},
      communityCards: [...state.state.communityCards, ...revealed.communityCardsToAdd],
      currentBet: 0,
      deck: revealed.deck,
      lastEvent: `Dealt the ${revealed.phase}`,
      phase: revealed.phase,
    },
  };
}

function legalMovesForPlayer(state: MatchState<PokerState>, playerId: PlayerId): PokerMove[] {
  if (state.state.phase === 'complete' || !canAct(playerId, state.state)) {
    return [];
  }

  const committed = state.state.betsThisRound[playerId] ?? 0;
  const toCall = state.state.currentBet - committed;
  const moves: PokerMove[] = [];

  if (toCall > 0) {
    moves.push({
      playerId,
      kind: 'fold',
      createdAt: '2026-04-21T12:00:00.000Z',
      payload: {},
    });
    moves.push({
      playerId,
      kind: 'call',
      createdAt: '2026-04-21T12:00:00.000Z',
      payload: {},
    });
    return moves;
  }

  moves.push({
    playerId,
    kind: 'check',
    createdAt: '2026-04-21T12:00:00.000Z',
    payload: {},
  });

  for (const amount of state.state.rules.betSizes) {
    if (amount > 0 && amount <= (state.state.stacks[playerId] ?? 0)) {
      moves.push({
        playerId,
        kind: 'bet',
        createdAt: '2026-04-21T12:00:00.000Z',
        payload: {
          amount,
        },
      });
    }
  }

  return moves;
}

export function createPokerAdapter(): GameAdapter<
  {
    rules?: Partial<PokerRules>;
    seed?: number | string;
  },
  PokerState,
  PokerMove
> {
  return {
    definition: pokerDefinition,
    createInitialState({ executionMode, matchId, players, setup }): MatchState<PokerState> {
      if (players.length < 2 || players.length > 6) {
        throw new Error("Texas Hold'em MVP supports between 2 and 6 seats.");
      }

      const rules = {
        ...defaultPokerRules,
        ...setup.rules,
      };
      const seed = setup.seed ?? 'texas-holdem';
      const deck = shuffleWithSeed(createDeck(), seed);
      const hands: Record<PlayerId, readonly PokerCard[]> = {};
      let deckIndex = 0;

      for (const player of players) {
        hands[player.playerId] = deck.slice(deckIndex, deckIndex + 2);
        deckIndex += 2;
      }

      return {
        matchId,
        gameId: pokerDefinition.gameId,
        players,
        activePlayerId: players[0]!.playerId,
        turn: 1,
        executionMode,
        state: {
          actedPlayerIds: [],
          betsThisRound: {},
          communityCards: [],
          currentBet: 0,
          deck: deck.slice(deckIndex),
          foldedPlayerIds: [],
          hands,
          lastEvent: "Texas Hold'em hand started",
          phase: 'preflop',
          pot: 0,
          rules,
          seed,
          stacks: Object.fromEntries(players.map((player) => [player.playerId, rules.startingStack])),
          showdown: null,
          winnerIds: [],
        },
      };
    },
    listLegalMoves(state): readonly PokerMove[] {
      return legalMovesForPlayer(state, state.activePlayerId);
    },
    isLegalMove(state, move): boolean {
      return this.listLegalMoves(state).some((candidate) => areMovesEquivalent(candidate, move));
    },
    applyMove(state, move): MatchState<PokerState> {
      const nextState: PokerState = {
        ...state.state,
        actedPlayerIds: [...new Set([...state.state.actedPlayerIds, move.playerId])],
        betsThisRound: { ...state.state.betsThisRound },
        foldedPlayerIds: [...state.state.foldedPlayerIds],
        stacks: { ...state.state.stacks },
      };

      if (move.kind === 'fold') {
        nextState.foldedPlayerIds = [...nextState.foldedPlayerIds, move.playerId];
        nextState.lastEvent = `${move.playerId} folded`;
      }

      if (move.kind === 'check') {
        nextState.lastEvent = `${move.playerId} checked`;
      }

      if (move.kind === 'call') {
        const toCall = Math.min(nextState.currentBet - (nextState.betsThisRound[move.playerId] ?? 0), nextState.stacks[move.playerId] ?? 0);
        nextState.betsThisRound[move.playerId] = (nextState.betsThisRound[move.playerId] ?? 0) + toCall;
        nextState.stacks[move.playerId] = (nextState.stacks[move.playerId] ?? 0) - toCall;
        nextState.pot += toCall;
        nextState.lastEvent = `${move.playerId} called ${toCall}`;
      }

      if (move.kind === 'bet') {
        nextState.currentBet = move.payload.amount;
        nextState.actedPlayerIds = [move.playerId];
        nextState.betsThisRound[move.playerId] = move.payload.amount;
        nextState.stacks[move.playerId] = (nextState.stacks[move.playerId] ?? 0) - move.payload.amount;
        nextState.pot += move.payload.amount;
        nextState.lastEvent = `${move.playerId} bet ${move.payload.amount}`;
      }

      return advanceRound(
        {
          ...state,
          turn: state.turn + 1,
          state: nextState,
        },
        move.playerId,
      );
    },
    isMatchComplete(state): boolean {
      return state.state.phase === 'complete';
    },
    getResult(state): MatchResult | null {
      if (state.state.phase !== 'complete') {
        return null;
      }

      return {
        matchId: state.matchId,
        gameId: state.gameId,
        winnerIds: state.state.winnerIds,
        rankings: state.players
          .map((player) => ({
            playerId: player.playerId,
            position: state.state.winnerIds.includes(player.playerId) ? 1 : 2,
            score: state.state.stacks[player.playerId] ?? 0,
          }))
          .sort((left, right) => left.position - right.position || (right.score ?? 0) - (left.score ?? 0)),
        finishedAt: '2026-04-21T12:00:01.000Z',
        executionMode: state.executionMode,
      };
    },
  };
}

function describeMove(move: PokerMove) {
  if (move.kind === 'bet') {
    return `Bet ${move.payload.amount}`;
  }

  return move.kind[0]!.toUpperCase() + move.kind.slice(1);
}

export function projectPokerPlayerView(
  input: LocalGameSessionProjectViewInput<PokerState, PokerMove>,
): PokerPlayerView {
  return {
    activePlayerId: input.state.activePlayerId,
    communityCards: input.state.state.communityCards,
    legalActions: input.viewerPlayerId
      ? input.legalMoves
          .filter((move) => move.playerId === input.viewerPlayerId)
          .map((move) => ({
            id: `${move.kind}:${JSON.stringify(move.payload)}`,
            label: describeMove(move),
            move,
          }))
      : [],
    matchResultBanner: input.matchResult ? `Winner: ${input.matchResult.winnerIds.join(', ')}` : null,
    phase: input.state.state.phase,
    players: input.participants.map((participant) => ({
      controller: participant.controller,
      displayName: participant.displayName,
      hasFolded: input.state.state.foldedPlayerIds.includes(participant.playerId),
      isActive: participant.playerId === input.state.activePlayerId,
      isViewer: participant.playerId === input.viewerPlayerId,
      playerId: participant.playerId,
      stack: input.state.state.stacks[participant.playerId] ?? 0,
      visibleCards: participant.playerId === input.viewerPlayerId || input.state.state.phase === 'complete'
        ? [...(input.state.state.hands[participant.playerId] ?? [])]
        : [],
    })),
    pot: input.state.state.pot,
    status: input.state.state.lastEvent,
    viewerPlayerId: input.viewerPlayerId,
  };
}

export function createPokerBots(
  participants: readonly SessionParticipant[],
  seed: number | string = 'poker-bot',
): Partial<Record<PlayerId, LocalGameSessionBot<PokerState, PokerMove>>> {
  return Object.fromEntries(
    participants
      .filter((participant) => participant.controller === 'bot')
      .map((participant) => {
        const bot: LocalGameSessionBot<PokerState, PokerMove> = {
          chooseMove({ legalMoves, playerId, state }) {
            const ownMoves = legalMoves.filter((move) => move.playerId === playerId);
            const check = ownMoves.find((move) => move.kind === 'check');
            const call = ownMoves.find((move) => move.kind === 'call');
            const bets = ownMoves.filter((move): move is PokerBetMove => move.kind === 'bet');
            const random = createSeededRandom(`${seed}:${state.turn}:${playerId}`);

            if (check && bets.length > 0 && random() > 0.72) {
              return bets[0] ?? null;
            }

            return check ?? call ?? ownMoves.find((move) => move.kind === 'fold') ?? null;
          },
        };

        return [participant.playerId, bot] as const;
      }),
  );
}

export const pokerExamplePresets: readonly PokerExamplePreset[] = [
  {
    id: 'heads-up',
    label: 'Heads-up',
    hotseat: true,
    seats: [
      { playerId: 'p1', displayName: 'Player One', seat: 1, controller: 'human' },
      { playerId: 'p2', displayName: 'Player Two', seat: 2, controller: 'human' },
    ],
  },
  {
    id: 'four-seat-bots',
    label: 'Four-seat bots',
    hotseat: true,
    seats: [
      { playerId: 'p1', displayName: 'Player One', seat: 1, controller: 'human' },
      { playerId: 'p2', displayName: 'Caller Bot', seat: 2, controller: 'bot' },
      { playerId: 'p3', displayName: 'Player Two', seat: 3, controller: 'human' },
      { playerId: 'p4', displayName: 'Check Bot', seat: 4, controller: 'bot' },
    ],
  },
] as const;

export function getPokerExamplePreset(presetId: PokerExamplePresetId): PokerExamplePreset {
  return pokerExamplePresets.find((preset) => preset.id === presetId) ?? pokerExamplePresets[0]!;
}

export const pokerCatalogEntry: PokerCatalogEntry = {
  definition: pokerDefinition,
  metadata: {
    presets: pokerExamplePresets,
    route: '/poker',
    supportsBots: true,
  },
};
