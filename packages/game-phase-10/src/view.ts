import type {
  LocalGameSessionProjectViewInput,
  SessionParticipant,
} from '@repo/game-session';

import type { Phase10Move, Phase10PlayerView, Phase10State } from './types.ts';

function describeMove(
  move: Phase10Move,
  state: Phase10State,
  participants: readonly SessionParticipant[],
) {
  if (move.kind === 'draw-card') {
    return move.payload.source === 'discard'
      ? `Draw ${state.discardPile[state.discardPile.length - 1]?.label ?? 'discard'}`
      : 'Draw from pile';
  }

  if (move.kind === 'lay-phase') {
    return `Lay ${state.phases[move.playerId]?.label ?? 'current phase'}`;
  }

  if (move.kind === 'hit-phase') {
    const target = participants.find(
      (participant) => participant.playerId === move.payload.targetPlayerId,
    );
    const card = state.hands[move.playerId]?.find(
      (candidate) => candidate.id === move.payload.cardId,
    );
    return `Hit ${target?.displayName ?? move.payload.targetPlayerId} with ${card?.label ?? 'card'}`;
  }

  const card = state.hands[move.playerId]?.find(
    (candidate) => candidate.id === move.payload.cardId,
  );
  const target = move.payload.targetPlayerId
    ? participants.find(
        (participant) => participant.playerId === move.payload.targetPlayerId,
      )
    : null;

  return target
    ? `Discard ${card?.label ?? 'card'} on ${target.displayName}`
    : `Discard ${card?.label ?? 'card'}`;
}

export function projectPhase10PlayerView(
  input: LocalGameSessionProjectViewInput<Phase10State, Phase10Move>,
): Phase10PlayerView {
  const focusPlayerId = input.viewerPlayerId ?? input.state.activePlayerId;
  const focusPhase =
    input.state.state.phases[focusPlayerId] ??
    input.state.state.phases[input.state.activePlayerId];

  return {
    activePlayerId: input.state.activePlayerId,
    discardTop:
      input.state.state.discardPile[input.state.state.discardPile.length - 1] ??
      null,
    drawPileCount: input.state.state.drawPile.length,
    legalActions: input.viewerPlayerId
      ? input.legalMoves
          .filter((move) => move.playerId === input.viewerPlayerId)
          .map((move) => ({
            id: `${move.kind}:${JSON.stringify(move.payload)}`,
            label: describeMove(move, input.state.state, input.participants),
            move,
          }))
      : [],
    matchResultBanner: input.matchResult
      ? `Winner: ${
          input.participants.find(
            (player) => player.playerId === input.matchResult?.winnerIds[0],
          )?.displayName ?? input.matchResult.winnerIds[0]
        }`
      : null,
    phaseOrder: input.state.state.phaseDefinitions.map((phase) => phase.label),
    phaseLabel:
      focusPhase?.label ?? input.state.state.phaseDefinitions[0]?.label ?? '',
    players: input.participants.map((participant) => ({
      controller: participant.controller,
      displayName: participant.displayName,
      handCount: input.state.state.hands[participant.playerId]?.length ?? 0,
      isActive: participant.playerId === input.state.activePlayerId,
      isViewer: participant.playerId === input.viewerPlayerId,
      laidGroups:
        input.state.state.phases[participant.playerId]?.laidGroups ?? [],
      phaseComplete: Boolean(
        input.state.state.phases[participant.playerId]?.laidGroups,
      ),
      phaseLabel:
        input.state.state.phases[participant.playerId]?.label ??
        input.state.state.phaseDefinitions[0]?.label ??
        '',
      phaseNumber:
        input.state.state.phases[participant.playerId]?.phaseNumber ?? 1,
      playerId: participant.playerId,
      skipped: input.state.state.skippedPlayerIds.includes(
        participant.playerId,
      ),
      visibleCards:
        participant.playerId === input.viewerPlayerId
          ? [...(input.state.state.hands[participant.playerId] ?? [])]
          : [],
    })),
    round: input.state.state.round,
    status: input.state.state.lastEvent,
    viewerPlayerId: input.viewerPlayerId,
  };
}
