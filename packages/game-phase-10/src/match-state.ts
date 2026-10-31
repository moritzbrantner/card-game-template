import type { MatchState, PlayerId } from '@repo/game-contracts';
import { shuffleWithSeed } from '@repo/card-kit';

import type {
  Phase10Card,
  Phase10Color,
  Phase10PhaseDefinition,
  Phase10PlayerPhaseState,
  Phase10State,
} from './types.ts';

const COLORS: readonly Phase10Color[] = ['red', 'yellow', 'green', 'blue'];

function createDeck(): Phase10Card[] {
  const cards: Phase10Card[] = [];

  for (let copy = 0; copy < 2; copy += 1) {
    for (const color of COLORS) {
      for (let value = 1; value <= 12; value += 1) {
        cards.push({
          color,
          id: `${color}-${value}-${copy}`,
          kind: 'number',
          label: `${color[0]!.toUpperCase()}${color.slice(1)} ${value}`,
          value,
        });
      }
    }
  }

  for (let index = 0; index < 8; index += 1) {
    cards.push({
      color: 'wild',
      id: `wild-${index}`,
      kind: 'wild',
      label: 'Wild',
    });
  }

  for (let index = 0; index < 4; index += 1) {
    cards.push({
      color: 'skip',
      id: `skip-${index}`,
      kind: 'skip',
      label: 'Skip',
    });
  }

  return cards;
}

export function clonePhases(
  phases: Record<PlayerId, Phase10PlayerPhaseState>,
): Record<PlayerId, Phase10PlayerPhaseState> {
  return Object.fromEntries(
    Object.entries(phases).map(([playerId, phase]) => [
      playerId,
      {
        ...phase,
        laidGroups: phase.laidGroups
          ? phase.laidGroups.map((group) => ({
              ...group,
              cards: [...group.cards],
              cardIds: [...group.cardIds],
            }))
          : null,
      },
    ]),
  );
}

export function activePhase(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10PlayerPhaseState {
  const phase = state.state.phases[playerId];

  if (!phase) {
    throw new Error(`Unknown Phase 10 player ${playerId}`);
  }

  return phase;
}

export function phaseDefinitionForPlayer(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10PhaseDefinition {
  const phase = activePhase(state, playerId);
  const definition = state.state.phaseDefinitions[phase.phaseIndex];

  if (!definition) {
    throw new Error(`Unknown Phase 10 definition ${phase.phaseIndex}`);
  }

  return definition;
}

export function recycleDrawPile(state: Phase10State): Phase10State {
  if (state.drawPile.length > 0 || state.discardPile.length <= 1) {
    return state;
  }

  const discardTop = state.discardPile[state.discardPile.length - 1]!;
  const recyclableCards = state.discardPile.slice(0, -1);
  const nextSeed = `${state.seed}:recycle:${recyclableCards.length}`;

  return {
    ...state,
    discardPile: [discardTop],
    drawPile: shuffleWithSeed(recyclableCards, nextSeed),
  };
}

export function playerOrder<
  TPlayer extends { playerId: PlayerId; seat: number },
>(players: readonly TPlayer[]) {
  return [...players].sort((left, right) => left.seat - right.seat);
}

export function dealRound(
  players: readonly { playerId: PlayerId; seat: number }[],
  handSize: number,
  seed: number | string,
) {
  const orderedPlayers = playerOrder(players);
  const deck = shuffleWithSeed(createDeck(), seed);
  const hands: Record<PlayerId, readonly Phase10Card[]> = {};
  let deckIndex = 0;

  for (const player of orderedPlayers) {
    hands[player.playerId] = deck.slice(deckIndex, deckIndex + handSize);
    deckIndex += handSize;
  }

  return {
    discardPile: [deck[deckIndex]!],
    drawPile: deck.slice(deckIndex + 1),
    hands,
  };
}

export function nextActivePlayer(input: {
  activePlayerId: PlayerId;
  players: readonly { playerId: PlayerId; seat: number }[];
  skippedPlayerIds: readonly PlayerId[];
}) {
  const orderedPlayers = playerOrder(input.players);
  const activeIndex = orderedPlayers.findIndex(
    (player) => player.playerId === input.activePlayerId,
  );

  if (activeIndex < 0) {
    throw new Error(`Unknown active player ${input.activePlayerId}`);
  }

  const remainingSkips = new Set(input.skippedPlayerIds);

  for (let offset = 1; offset <= orderedPlayers.length * 2; offset += 1) {
    const player =
      orderedPlayers[(activeIndex + offset) % orderedPlayers.length]!;

    if (remainingSkips.has(player.playerId)) {
      remainingSkips.delete(player.playerId);
      continue;
    }

    return {
      activePlayerId: player.playerId,
      skippedPlayerIds: [...remainingSkips],
    };
  }

  return {
    activePlayerId: input.activePlayerId,
    skippedPlayerIds: [...remainingSkips],
  };
}

export function rankedPlayers(state: MatchState<Phase10State>) {
  return [...state.players]
    .map((player) => ({
      phaseIndex: state.state.phases[player.playerId]?.phaseIndex ?? 0,
      playerId: player.playerId,
      handCount: state.state.hands[player.playerId]?.length ?? 0,
    }))
    .sort((left, right) => {
      if (left.phaseIndex !== right.phaseIndex) {
        return right.phaseIndex - left.phaseIndex;
      }

      return left.handCount - right.handCount;
    })
    .map((player, index) => ({
      playerId: player.playerId,
      position: index + 1,
    }));
}

export function createNextRoundState(
  state: MatchState<Phase10State>,
  roundWinnerId: PlayerId,
): MatchState<Phase10State> {
  const nextRound = state.state.round + 1;
  const deal = dealRound(
    state.players,
    state.state.rules.handSize,
    `${state.state.seed}:round:${nextRound}`,
  );
  const phases = Object.fromEntries(
    state.players.map((player) => {
      const currentPhase = state.state.phases[player.playerId]!;
      const nextPhaseIndex = currentPhase.laidGroups
        ? Math.min(
            currentPhase.phaseIndex + 1,
            state.state.phaseDefinitions.length - 1,
          )
        : currentPhase.phaseIndex;
      const nextDefinition = state.state.phaseDefinitions[nextPhaseIndex]!;

      return [
        player.playerId,
        {
          label: nextDefinition.label,
          laidGroups: null,
          phaseIndex: nextPhaseIndex,
          phaseNumber: nextPhaseIndex + 1,
        },
      ] as const;
    }),
  );

  return {
    ...state,
    activePlayerId: roundWinnerId,
    turn: state.turn + 1,
    state: {
      ...state.state,
      discardPile: deal.discardPile,
      drawPile: deal.drawPile,
      drawnCardThisTurn: false,
      hands: deal.hands,
      lastEvent: `Round ${nextRound} started`,
      phases,
      round: nextRound,
      skippedPlayerIds: [],
      winnerPlayerId: null,
    },
  };
}
