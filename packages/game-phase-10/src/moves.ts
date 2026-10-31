import type { MatchState, PlayerId } from '@repo/game-contracts';
import { removeCardById, removeCardsById } from '@repo/card-kit';

import {
  appendToLaidGroup,
  isValidRequirementGroup,
  toLaidGroup,
  toPhaseGroupErrorLabel,
} from './groups.ts';
import {
  activePhase,
  clonePhases,
  createNextRoundState,
  nextActivePlayer,
  phaseDefinitionForPlayer,
  recycleDrawPile,
} from './match-state.ts';
import { getPhase10PhaseRequirements } from './phase-definitions.ts';
import type {
  Phase10Card,
  Phase10DiscardCardMove,
  Phase10DrawCardMove,
  Phase10HitPhaseMove,
  Phase10LayPhaseMove,
  Phase10PhaseDefinition,
  Phase10State,
} from './types.ts';

export function createDiscardMoves(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10DiscardCardMove[] {
  const hand = state.state.hands[playerId] ?? [];
  const opponents = state.players.filter(
    (player) => player.playerId !== playerId,
  );

  return hand.flatMap((card) => {
    if (card.kind === 'skip' && state.state.rules.allowSkipping) {
      return opponents.map((opponent) => ({
        playerId,
        kind: 'discard-card' as const,
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: {
          cardId: card.id,
          targetPlayerId: opponent.playerId,
        },
      }));
    }

    return [
      {
        playerId,
        kind: 'discard-card' as const,
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: {
          cardId: card.id,
        },
      },
    ];
  });
}

export function createLayMove(
  playerId: PlayerId,
  groups: readonly (readonly Phase10Card[])[],
): Phase10LayPhaseMove {
  return {
    playerId,
    kind: 'lay-phase',
    createdAt: '2026-04-26T12:00:00.000Z',
    payload: {
      groups: groups.map((group) => group.map((card) => card.id)),
    },
  };
}

export function createHitMoves(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10HitPhaseMove[] {
  if (!state.state.rules.allowHitting) {
    return [];
  }

  if (!activePhase(state, playerId).laidGroups) {
    return [];
  }

  const hand = state.state.hands[playerId] ?? [];
  const moves: Phase10HitPhaseMove[] = [];

  for (const card of hand) {
    if (card.kind === 'skip') {
      continue;
    }

    for (const player of state.players) {
      const laidGroups = state.state.phases[player.playerId]?.laidGroups ?? [];

      laidGroups.forEach((group, groupIndex) => {
        if (!appendToLaidGroup(group, card)) {
          return;
        }

        moves.push({
          playerId,
          kind: 'hit-phase',
          createdAt: '2026-04-26T12:00:00.000Z',
          payload: {
            cardId: card.id,
            groupIndex,
            targetPlayerId: player.playerId,
          },
        });
      });
    }
  }

  return moves;
}

function validatePhaseGroupsMove(
  hand: readonly Phase10Card[],
  phaseDefinition: Pick<
    Phase10PhaseDefinition,
    'label' | 'requirements' | 'setCount' | 'setSize'
  >,
  groups: readonly (readonly string[])[],
) {
  const requirements = getPhase10PhaseRequirements(phaseDefinition);

  if (groups.length !== requirements.length) {
    throw new Error(
      `${phaseDefinition.label} requires ${requirements.length} groups.`,
    );
  }

  const selectedIds = groups.flatMap((group) => group);
  const uniqueIds = new Set(selectedIds);

  if (uniqueIds.size !== selectedIds.length) {
    throw new Error('Phase cards cannot be reused across groups.');
  }

  const { removedCards } = removeCardsById(hand, selectedIds);

  if (removedCards.length !== selectedIds.length) {
    throw new Error('Phase move references cards that are not in hand.');
  }

  const cardsById = new Map(removedCards.map((card) => [card.id, card]));

  return groups.map((group, groupIndex) => {
    const requirement = requirements[groupIndex]!;
    const cards = group.map((cardId) => {
      const card = cardsById.get(cardId);

      if (!card) {
        throw new Error(`Unknown phase card ${cardId}`);
      }

      return card;
    });

    if (!isValidRequirementGroup(cards, requirement)) {
      throw new Error(
        `Group ${groupIndex + 1} of ${phaseDefinition.label.toLowerCase()} must be a valid ${toPhaseGroupErrorLabel(requirement)}.`,
      );
    }

    return cards;
  });
}

export function applyDrawMove(
  state: MatchState<Phase10State>,
  move: Phase10DrawCardMove,
): MatchState<Phase10State> {
  const nextState = recycleDrawPile(state.state);

  if (move.payload.source === 'draw') {
    const drawnCard = nextState.drawPile[0];

    if (!drawnCard) {
      throw new Error('No cards remain in the draw pile.');
    }

    return {
      ...state,
      state: {
        ...nextState,
        drawPile: nextState.drawPile.slice(1),
        drawnCardThisTurn: true,
        hands: {
          ...nextState.hands,
          [move.playerId]: [
            ...(nextState.hands[move.playerId] ?? []),
            drawnCard,
          ],
        },
        lastEvent: `${move.playerId} drew from the pile`,
      },
    };
  }

  const discardTop = nextState.discardPile[nextState.discardPile.length - 1];

  if (!discardTop) {
    throw new Error('No discard card is available.');
  }

  return {
    ...state,
    state: {
      ...nextState,
      discardPile: nextState.discardPile.slice(0, -1),
      drawnCardThisTurn: true,
      hands: {
        ...nextState.hands,
        [move.playerId]: [
          ...(nextState.hands[move.playerId] ?? []),
          discardTop,
        ],
      },
      lastEvent: `${move.playerId} picked up ${discardTop.label}`,
    },
  };
}

export function applyLayMove(
  state: MatchState<Phase10State>,
  move: Phase10LayPhaseMove,
): MatchState<Phase10State> {
  const hand = state.state.hands[move.playerId] ?? [];
  const phaseDefinition = phaseDefinitionForPlayer(state, move.playerId);
  const groups = validatePhaseGroupsMove(
    hand,
    phaseDefinition,
    move.payload.groups,
  );
  const selectedIds = move.payload.groups.flatMap((group) => group);
  const removed = removeCardsById(hand, selectedIds);
  const nextPhases = clonePhases(state.state.phases);

  nextPhases[move.playerId] = {
    ...nextPhases[move.playerId]!,
    laidGroups: groups.map((group, groupIndex) =>
      toLaidGroup(
        group,
        getPhase10PhaseRequirements(phaseDefinition)[groupIndex]!,
      ),
    ),
  };

  return {
    ...state,
    state: {
      ...state.state,
      hands: {
        ...state.state.hands,
        [move.playerId]: removed.cards,
      },
      lastEvent: `${move.playerId} laid ${phaseDefinition.label}`,
      phases: nextPhases,
    },
  };
}

export function applyHitMove(
  state: MatchState<Phase10State>,
  move: Phase10HitPhaseMove,
): MatchState<Phase10State> {
  const hand = state.state.hands[move.playerId] ?? [];
  const removed = removeCardById(hand, move.payload.cardId);

  if (!removed.card) {
    throw new Error(`Card ${move.payload.cardId} is not in hand.`);
  }

  const nextPhases = clonePhases(state.state.phases);
  const targetPhase = nextPhases[move.payload.targetPlayerId];
  const laidGroups = targetPhase?.laidGroups;
  const targetGroup = laidGroups?.[move.payload.groupIndex];

  if (!targetPhase || !laidGroups || !targetGroup) {
    throw new Error('Cannot hit a phase group that has not been laid.');
  }

  const nextGroup = appendToLaidGroup(targetGroup, removed.card);

  if (!nextGroup) {
    throw new Error('Card does not fit the target phase group.');
  }
  nextPhases[move.payload.targetPlayerId] = {
    ...targetPhase,
    laidGroups: laidGroups.map((group, groupIndex) =>
      groupIndex === move.payload.groupIndex ? nextGroup : group,
    ),
  };

  return {
    ...state,
    state: {
      ...state.state,
      hands: {
        ...state.state.hands,
        [move.playerId]: removed.cards,
      },
      lastEvent: `${move.playerId} hit ${targetPhase.label}`,
      phases: nextPhases,
    },
  };
}

export function applyDiscardMove(
  state: MatchState<Phase10State>,
  move: Phase10DiscardCardMove,
): MatchState<Phase10State> {
  const hand = state.state.hands[move.playerId] ?? [];
  const removed = removeCardById(hand, move.payload.cardId);

  if (!removed.card) {
    throw new Error(`Card ${move.payload.cardId} is not in hand.`);
  }

  if (removed.card.kind === 'skip') {
    // Skip cards stay in the deck when skipping is disabled, so they must remain
    // discardable (without a target) or a hand of only skips could never discard.
    if (!state.state.rules.allowSkipping) {
      if (move.payload.targetPlayerId) {
        throw new Error('Skipping is disabled for this table.');
      }
    } else if (
      !move.payload.targetPlayerId ||
      move.payload.targetPlayerId === move.playerId
    ) {
      throw new Error('Skip discards require a valid target player.');
    }
  }

  const laidGroups = state.state.phases[move.playerId]?.laidGroups;
  const currentPhase = state.state.phases[move.playerId];
  const completedFinalPhase = Boolean(
    removed.cards.length === 0 &&
    laidGroups &&
    currentPhase &&
    currentPhase.phaseIndex >= state.state.phaseDefinitions.length - 1,
  );
  const winnerPlayerId = completedFinalPhase ? move.playerId : null;

  if (removed.cards.length === 0 && laidGroups && !winnerPlayerId) {
    return createNextRoundState(
      {
        ...state,
        state: {
          ...state.state,
          discardPile: [...state.state.discardPile, removed.card],
          hands: {
            ...state.state.hands,
            [move.playerId]: removed.cards,
          },
        },
      },
      move.playerId,
    );
  }

  const pendingSkips = new Set(state.state.skippedPlayerIds);

  if (removed.card.kind === 'skip' && move.payload.targetPlayerId) {
    pendingSkips.add(move.payload.targetPlayerId);
  }

  const nextTurn = nextActivePlayer({
    activePlayerId: state.activePlayerId,
    players: state.players,
    skippedPlayerIds: [...pendingSkips],
  });

  return {
    ...state,
    activePlayerId: winnerPlayerId ? move.playerId : nextTurn.activePlayerId,
    turn: state.turn + 1,
    state: {
      ...state.state,
      discardPile: [...state.state.discardPile, removed.card],
      drawnCardThisTurn: false,
      hands: {
        ...state.state.hands,
        [move.playerId]: removed.cards,
      },
      lastEvent:
        removed.card.kind === 'skip' && move.payload.targetPlayerId
          ? `${move.playerId} skipped ${move.payload.targetPlayerId}`
          : `${move.playerId} discarded ${removed.card.label}`,
      skippedPlayerIds: winnerPlayerId ? [] : nextTurn.skippedPlayerIds,
      winnerPlayerId,
    },
  };
}
