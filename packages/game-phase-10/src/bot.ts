import type { MatchState, PlayerId } from '@repo/game-contracts';
import { createSeededRandom } from '@repo/game-engine';
import type {
  LocalGameSessionBot,
  SessionParticipant,
} from '@repo/game-session';

import { appendToLaidGroup } from './groups.ts';
import { phaseDefinitionForPlayer } from './match-state.ts';
import { getPhase10PhaseRequirements } from './phase-definitions.ts';
import type {
  Phase10Card,
  Phase10DiscardCardMove,
  Phase10DrawCardMove,
  Phase10HitPhaseMove,
  Phase10LayPhaseMove,
  Phase10Move,
  Phase10PhaseRequirement,
  Phase10State,
} from './types.ts';

function cardHelpsRunRequirement(
  hand: readonly Phase10Card[],
  card: Phase10Card,
  size: number,
) {
  if (card.kind !== 'number' || typeof card.value !== 'number' || size > 12) {
    return false;
  }

  const values = new Set<number>();

  for (const candidate of hand) {
    if (candidate.kind === 'number' && typeof candidate.value === 'number') {
      values.add(candidate.value);
    }
  }

  values.add(card.value);

  const wildCount = hand.filter(
    (candidate) => candidate.kind === 'wild',
  ).length;

  for (let start = 1; start <= 13 - size; start += 1) {
    const end = start + size - 1;

    if (card.value < start || card.value > end) {
      continue;
    }

    let presentCount = 0;

    for (let value = start; value <= end; value += 1) {
      if (values.has(value)) {
        presentCount += 1;
      }
    }

    if (size - presentCount <= wildCount) {
      return true;
    }
  }

  return false;
}

function cardHelpsRequirement(
  hand: readonly Phase10Card[],
  card: Phase10Card,
  requirement: Phase10PhaseRequirement,
) {
  if (card.kind === 'wild') {
    return true;
  }

  if (card.kind !== 'number') {
    return false;
  }

  const wildCount = hand.filter(
    (candidate) => candidate.kind === 'wild',
  ).length;

  if (requirement.type === 'set') {
    return (
      hand.filter(
        (candidate) =>
          candidate.kind === 'number' && candidate.value === card.value,
      ).length +
        wildCount >=
      requirement.size
    );
  }

  if (requirement.type === 'color') {
    return (
      hand.filter(
        (candidate) =>
          candidate.kind === 'number' && candidate.color === card.color,
      ).length +
        wildCount >=
      requirement.size
    );
  }

  return cardHelpsRunRequirement(hand, card, requirement.size);
}

function cardHelpsCurrentPhase(
  card: Phase10Card | null,
  state: MatchState<Phase10State>,
  playerId: PlayerId,
) {
  if (!card) {
    return false;
  }

  const phase = state.state.phases[playerId];

  if (!phase || phase.laidGroups) {
    return false;
  }

  const hand = state.state.hands[playerId] ?? [];
  const requirements = getPhase10PhaseRequirements(
    phaseDefinitionForPlayer(state, playerId),
  );

  return requirements.some((requirement) =>
    cardHelpsRequirement(hand, card, requirement),
  );
}

function countValueMatches(
  hand: readonly Phase10Card[],
  value: number | undefined,
): number {
  if (typeof value !== 'number') {
    return 0;
  }

  return hand.filter((card) => card.kind === 'number' && card.value === value)
    .length;
}

function cardUsefulness(
  card: Phase10Card,
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): number {
  if (card.kind === 'wild') {
    return 100;
  }

  if (card.kind === 'skip') {
    return 3;
  }

  const hand = state.state.hands[playerId] ?? [];
  const ownPhase = state.state.phases[playerId]?.laidGroups;

  if (ownPhase) {
    const canHit = state.players.some((player) =>
      (state.state.phases[player.playerId]?.laidGroups ?? []).some(
        (group) => appendToLaidGroup(group, card) !== null,
      ),
    );

    return canHit ? 80 : 8 + countValueMatches(hand, card.value);
  }

  return cardHelpsCurrentPhase(card, state, playerId)
    ? 48
    : countValueMatches(hand, card.value) * 12 + 10;
}

function chooseDiscardMove(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
  moves: readonly Phase10DiscardCardMove[],
) {
  const hand = state.state.hands[playerId];
  let bestMove: Phase10DiscardCardMove | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const move of moves) {
    const card = hand?.find(
      (candidate) => candidate.id === move.payload.cardId,
    );
    const score = card ? cardUsefulness(card, state, playerId) : 0;

    if (score < bestScore) {
      bestMove = move;
      bestScore = score;
    }
  }

  return bestMove;
}

function isHelpfulDiscard(
  card: Phase10Card | null,
  state: MatchState<Phase10State>,
  playerId: PlayerId,
) {
  if (!card || card.kind === 'skip') {
    return false;
  }

  if (card.kind === 'wild') {
    return true;
  }

  return cardHelpsCurrentPhase(card, state, playerId);
}

export function choosePhase10Move(input: {
  legalMoves: readonly Phase10Move[];
  playerId: PlayerId;
  seed: number | string;
  state: MatchState<Phase10State>;
}): Phase10Move | null {
  const ownMoves = input.legalMoves.filter(
    (move) => move.playerId === input.playerId,
  );

  if (ownMoves.length === 0) {
    return null;
  }

  const phaseMove = ownMoves.find(
    (move): move is Phase10LayPhaseMove => move.kind === 'lay-phase',
  );

  if (phaseMove) {
    return phaseMove;
  }

  const hitMove = ownMoves.find(
    (move): move is Phase10HitPhaseMove => move.kind === 'hit-phase',
  );

  if (hitMove) {
    return hitMove;
  }

  const discardDraw = ownMoves.find(
    (move): move is Phase10DrawCardMove =>
      move.kind === 'draw-card' && move.payload.source === 'discard',
  );

  if (
    discardDraw &&
    isHelpfulDiscard(
      input.state.state.discardPile[input.state.state.discardPile.length - 1] ??
        null,
      input.state,
      input.playerId,
    )
  ) {
    return discardDraw;
  }

  const drawMove = ownMoves.find(
    (move): move is Phase10DrawCardMove =>
      move.kind === 'draw-card' && move.payload.source === 'draw',
  );

  if (drawMove) {
    return drawMove;
  }

  const discardMoves = ownMoves.filter(
    (move): move is Phase10DiscardCardMove => move.kind === 'discard-card',
  );

  if (discardMoves.length > 0) {
    return chooseDiscardMove(input.state, input.playerId, discardMoves);
  }

  const random = createSeededRandom(
    `${input.seed}:${input.playerId}:${input.state.turn}`,
  );
  return ownMoves[Math.floor(random() * ownMoves.length)] ?? null;
}

export function createPhase10Bots(
  participants: readonly SessionParticipant[],
  seed: number | string = 'phase-10-bot',
): Partial<Record<PlayerId, LocalGameSessionBot<Phase10State, Phase10Move>>> {
  return Object.fromEntries(
    participants
      .filter((participant) => participant.controller === 'bot')
      .map((participant) => {
        const bot: LocalGameSessionBot<Phase10State, Phase10Move> = {
          chooseMove({ legalMoves, playerId, state }) {
            return choosePhase10Move({
              legalMoves,
              playerId,
              seed: `${seed}:${state.matchId}`,
              state,
            });
          },
        };

        return [participant.playerId, bot] as const;
      }),
  );
}
