import { notFound } from 'next/navigation';

import type { AppLocale } from '@moritzbrantner/app-pack';
import { createUnoAdapter } from '@repo/game-uno';
import {
  reconstructMatchHistoryFromReplay,
  type SessionParticipant,
} from '@repo/game-session';

import { PastGameReplayPageClient } from '@/components/past-game-replay-page-client';
import { getAuthSession } from '@/src/auth.server';
import type { GameMatchParticipantRecord } from '@/src/domain/game-matches/contracts';
import {
  buildUnoReplayInspectionSteps,
  buildUnoReplayPerspectives,
} from '@/src/domain/game-matches/replay-inspection';
import { getUnoReplayUseCase } from '@/src/domain/game-matches/use-cases';

function toReplayParticipants(
  participants: readonly GameMatchParticipantRecord[],
) {
  return participants.map(
    (participant) =>
      ({
        playerId: participant.playerId,
        displayName: participant.displayName,
        seat: participant.seat,
        controller: participant.isBot ? 'bot' : 'human',
        ...(participant.identity.kind === 'account'
          ? { accountId: participant.identity.accountId }
          : {}),
        ...(participant.identity.kind === 'guest' ? { isGuest: true } : {}),
      }) satisfies SessionParticipant,
  );
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
  const history = reconstructMatchHistoryFromReplay({
    adapter,
    replay: replay.replay,
  });
  const perspectives = buildUnoReplayPerspectives(participantViews);
  const steps = buildUnoReplayInspectionSteps({
    adapter,
    history,
    participants: participantViews,
    perspectives,
    replay: replay.replay,
  });

  const timeline = replay.moves.map((move, index) => {
    const player = replay.summary.participants.find(
      (participant) => participant.playerId === move.move.playerId,
    );
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
      summaryTitle={replay.summary.participants
        .map((participant) => participant.displayName)
        .join(', ')}
      summaryDescription={`Replay ${replay.summary.status} match ${replay.summary.matchId}.`}
      perspectives={perspectives.map((perspective) => ({
        id: perspective.id,
        kind: perspective.kind,
        label: perspective.label,
      }))}
      steps={steps}
      timeline={timeline}
      analysisCards={[
        {
          label: 'Accepted moves',
          value: `${replay.analysis.acceptedMoveCount}`,
        },
        {
          label: 'Turns completed',
          value: `${replay.analysis.turnsCompleted}`,
        },
        {
          label: 'Top player',
          value: topUnoPlayer ? topUnoPlayer.displayName : 'None',
        },
        { label: 'Wilds played', value: `${topUnoPlayer?.wildsPlayed ?? 0}` },
      ]}
    />
  );
}
