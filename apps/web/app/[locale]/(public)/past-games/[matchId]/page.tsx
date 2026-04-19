import { notFound } from 'next/navigation';

import type { AppLocale } from '@moritzbrantner/app-pack';
import { createUnoAdapter, projectUnoPlayerView } from '@repo/game-uno';
import { reconstructMatchHistoryFromReplay, type SessionParticipant } from '@repo/game-session';

import { PastGameReplayPageClient } from '@/components/past-game-replay-page-client';
import { getAuthSession } from '@/src/auth.server';
import type { GameMatchParticipantRecord } from '@/src/domain/game-matches/contracts';
import { getUnoReplayUseCase } from '@/src/domain/game-matches/use-cases';

function toReplayParticipants(participants: readonly GameMatchParticipantRecord[]) {
  return participants.map((participant) => ({
    playerId: participant.playerId,
    displayName: participant.displayName,
    seat: participant.seat,
    controller: participant.isBot ? 'bot' : 'human',
    ...(participant.identity.kind === 'account' ? { accountId: participant.identity.accountId } : {}),
    ...(participant.identity.kind === 'guest' ? { isGuest: true } : {}),
  }) satisfies SessionParticipant);
}

export default async function PastGameReplayPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; matchId: string }>;
}) {
  const { locale, matchId } = await params;
  const session = await getAuthSession();
  const replayResult = await getUnoReplayUseCase(session, matchId);

  if (!replayResult.ok) {
    notFound();
  }

  const replay = replayResult.data;
  const adapter = createUnoAdapter();
  const participantViews = toReplayParticipants(replay.summary.participants);
  const viewerPlayerId = replay.summary.participants.find((participant) => !participant.isBot)?.playerId ?? null;
  const history = reconstructMatchHistoryFromReplay({
    adapter,
    replay: replay.replay,
  });

  const steps = history.map((state, index) => {
    const allLegalMoves =
      index < replay.replay.acceptedMoves.length && index !== history.length - 1
        ? adapter.listLegalMoves(state)
        : [];
    const selectedActorPlayerId = allLegalMoves.length > 0
      ? adapter.selectActor
        ? adapter.selectActor({ state, legalMoves: allLegalMoves })
        : state.activePlayerId
      : null;
    const legalMoves = selectedActorPlayerId
      ? allLegalMoves.filter((move) => move.playerId === selectedActorPlayerId)
      : [];
    const projected = projectUnoPlayerView({
      legalMoves,
      matchResult: index === history.length - 1 ? replay.replay.result : null,
      participants: participantViews,
      pendingHotseatPlayerId: null,
      selectedActorPlayerId,
      state,
      viewerPlayerId,
    });

    return {
      id: `${state.matchId}:${index}`,
      label: index === 0 ? 'Opening state' : `After move ${index}`,
      acceptedAt: replay.moves[index - 1]?.acceptedAt ?? null,
      status: projected.status,
      matchResultBanner: projected.matchResultBanner,
      players: projected.players.map((player) => ({
        displayName: player.displayName,
        handCount: player.handCount,
        visibleCards: player.visibleCards.map((card) => ({
          id: card.id,
          label: card.label,
        })),
      })),
    };
  });

  const timeline = replay.moves.map((move, index) => {
    const player = replay.summary.participants.find((participant) => participant.playerId === move.move.playerId);
    return {
      id: `${move.sequence}`,
      acceptedAt: move.acceptedAt,
      label: `${player?.displayName ?? move.move.playerId} played ${move.move.kind}`,
      stepIndex: index + 1,
    };
  });

  const topUnoPlayer = replay.unoAnalysis.players[0];

  return (
    <PastGameReplayPageClient
      backHref={`/${locale}/past-games`}
      summaryTitle={replay.summary.participants.map((participant) => participant.displayName).join(', ')}
      summaryDescription={`Replay ${replay.summary.status} match ${replay.summary.matchId}.`}
      steps={steps}
      timeline={timeline}
      analysisCards={[
        { label: 'Accepted moves', value: `${replay.analysis.acceptedMoveCount}` },
        { label: 'Turns completed', value: `${replay.analysis.turnsCompleted}` },
        { label: 'Top player', value: topUnoPlayer ? topUnoPlayer.displayName : 'None' },
        { label: 'Wilds played', value: `${topUnoPlayer?.wildsPlayed ?? 0}` },
      ]}
    />
  );
}
