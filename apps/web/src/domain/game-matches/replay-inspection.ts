import type { MatchReplay, MatchState, PlayerId } from '@repo/game-contracts';
import {
  projectUnoPlayerView,
  type UnoMove,
  type UnoState,
} from '@repo/game-uno';
import type { SessionParticipant } from '@repo/game-session';

type UnoReplayAdapter = {
  listLegalMoves(state: MatchState<UnoState>): readonly UnoMove[];
  selectActor?(input: {
    legalMoves: readonly UnoMove[];
    state: MatchState<UnoState>;
  }): PlayerId | null;
};

export type UnoReplayPerspective = {
  id: string;
  kind: 'bird-eye' | 'player';
  label: string;
  viewerPlayerId: PlayerId | null;
};

export type UnoReplayInspectionPlayer = {
  displayName: string;
  handCount: number;
  isViewer: boolean;
  playerId: PlayerId;
  visibleCards: readonly {
    id: string;
    label: string;
  }[];
};

export type UnoReplayInspectionView = {
  matchResultBanner: string | null;
  players: readonly UnoReplayInspectionPlayer[];
  status: string;
};

export type UnoReplayInspectionStep = {
  acceptedAt: string | null;
  id: string;
  label: string;
  views: Readonly<Record<string, UnoReplayInspectionView>>;
};

export function buildUnoReplayPerspectives(
  participants: readonly SessionParticipant[],
): readonly UnoReplayPerspective[] {
  return [
    {
      id: 'bird-eye',
      kind: 'bird-eye',
      label: "Bird's eye",
      viewerPlayerId: null,
    },
    ...participants.map((participant) => ({
      id: `player:${participant.playerId}`,
      kind: 'player' as const,
      label: participant.displayName,
      viewerPlayerId: participant.playerId,
    })),
  ];
}

export function buildUnoReplayInspectionSteps(input: {
  adapter: UnoReplayAdapter;
  history: readonly MatchState<UnoState>[];
  participants: readonly SessionParticipant[];
  perspectives: readonly UnoReplayPerspective[];
  replay: MatchReplay<UnoState, UnoMove>;
}): readonly UnoReplayInspectionStep[] {
  return input.history.map((state, index) => {
    const allLegalMoves =
      index < input.replay.acceptedMoves.length &&
      index !== input.history.length - 1
        ? input.adapter.listLegalMoves(state)
        : [];
    const selectedActorPlayerId =
      allLegalMoves.length > 0
        ? input.adapter.selectActor
          ? input.adapter.selectActor({ state, legalMoves: allLegalMoves })
          : state.activePlayerId
        : null;
    const legalMoves = selectedActorPlayerId
      ? allLegalMoves.filter((move) => move.playerId === selectedActorPlayerId)
      : [];
    const views: Record<string, UnoReplayInspectionView> = {};

    for (const perspective of input.perspectives) {
      const projected = projectUnoPlayerView({
        legalMoves,
        matchResult:
          index === input.history.length - 1 ? input.replay.result : null,
        participants: input.participants,
        pendingHotseatPlayerId: null,
        selectedActorPlayerId,
        state,
        viewerPlayerId: perspective.viewerPlayerId,
      });

      views[perspective.id] = {
        status: projected.status,
        matchResultBanner: projected.matchResultBanner,
        players: projected.players.map((player) => {
          const visibleCards =
            perspective.kind === 'bird-eye'
              ? (state.state.hands[player.playerId] ?? [])
              : player.visibleCards;

          return {
            playerId: player.playerId,
            displayName: player.displayName,
            handCount: player.handCount,
            isViewer: perspective.kind === 'player' && player.isViewer,
            visibleCards: visibleCards.map((card) => ({
              id: card.id,
              label: card.label,
            })),
          };
        }),
      };
    }

    return {
      id: `${state.matchId}:${index}`,
      label: index === 0 ? 'Opening state' : `After move ${index}`,
      acceptedAt: input.replay.acceptedMoves[index - 1]?.acceptedAt ?? null,
      views,
    };
  });
}
