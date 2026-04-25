import { createMatchReplay, type GameMove } from '@repo/game-contracts';
import {
  createUnoAdapter,
  projectUnoPlayerView,
  type UnoMove,
  type UnoPlayerView,
  type UnoState,
} from '@repo/game-uno';
import {
  resumeServerGameSession,
  type SessionParticipant,
  type ServerGameSession,
} from '@repo/game-session';

import type {
  GameMatchParticipantRecord,
  MatchOwnerIdentity,
  PersistedGameMatchRecord,
  PersistedUnoMatchRecord,
  PersistedUnoMatchSnapshotDto,
  PersistedUnoMatchSummaryDto,
} from './contracts';

const unoAdapter = createUnoAdapter();
type UnoServerSession = ServerGameSession<UnoState, UnoMove>;

function matchesIdentity(
  identity: MatchOwnerIdentity,
  participant: GameMatchParticipantRecord,
) {
  if (participant.identity.kind === 'bot') {
    return false;
  }

  return identity.kind === 'account'
    ? participant.identity.kind === 'account' &&
        participant.identity.accountId === identity.accountId
    : participant.identity.kind === 'guest' &&
        participant.identity.guestId === identity.guestId;
}

function toSessionParticipants(
  participants: readonly GameMatchParticipantRecord[],
): SessionParticipant[] {
  return participants.map((participant) => ({
    playerId: participant.playerId,
    displayName: participant.displayName,
    seat: participant.seat,
    controller: participant.isBot ? 'bot' : 'human',
    ...(participant.identity.kind === 'account'
      ? { accountId: participant.identity.accountId }
      : {}),
    ...(participant.identity.kind === 'guest' ? { isGuest: true } : {}),
  }));
}

function getViewerPlayerId(
  participants: readonly GameMatchParticipantRecord[],
  identity: MatchOwnerIdentity,
) {
  return (
    participants.find((participant) => matchesIdentity(identity, participant))
      ?.playerId ?? null
  );
}

function buildView(input: {
  participants: readonly GameMatchParticipantRecord[];
  state: PersistedUnoMatchRecord['latestState'];
  matchResult: PersistedUnoMatchRecord['result'];
  legalMoves: readonly UnoMove[];
  selectedActorPlayerId: string | null;
  viewerPlayerId: string | null;
}): UnoPlayerView {
  return projectUnoPlayerView({
    legalMoves: input.legalMoves,
    matchResult: input.matchResult,
    participants: toSessionParticipants(input.participants),
    pendingHotseatPlayerId: null,
    selectedActorPlayerId: input.selectedActorPlayerId,
    state: input.state,
    viewerPlayerId: input.viewerPlayerId,
  });
}

function createReplayFromPersistedMatch<
  TState,
  TMove extends GameMove,
  TSetup = unknown,
>(
  match: PersistedGameMatchRecord<
    'uno-style',
    TState,
    TMove,
    PersistedGameMatchRecord['analysis'],
    TSetup
  >,
) {
  return createMatchReplay({
    startedAt: match.startedAt,
    initialState: match.initialState,
    latestState: match.latestState,
    acceptedMoves: match.acceptedMoves,
    finishedAt: match.finishedAt,
    metadata: match.replayMetadata,
    result: match.result,
  });
}

export function buildPersistedUnoMatchSummaryDto(
  match: PersistedUnoMatchRecord,
): PersistedUnoMatchSummaryDto {
  return {
    matchId: match.matchId,
    gameId: 'uno-style',
    status: match.status,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    updatedAt: match.updatedAt,
    participants: match.participants,
    result: match.result,
    analysis: match.analysis,
    lastSequence: match.lastSequence,
  };
}

export function buildPersistedUnoMatchSnapshotDto(
  match: PersistedUnoMatchRecord,
  identity: MatchOwnerIdentity,
): PersistedUnoMatchSnapshotDto {
  const viewerPlayerId = getViewerPlayerId(match.participants, identity);

  if (match.status !== 'active') {
    return {
      ...buildPersistedUnoMatchSummaryDto(match),
      executionMode: 'server-authoritative',
      replayFormatVersion: match.replayFormatVersion,
      match: match.latestState,
      legalMoves: [],
      selectedActorPlayerId: null,
      view: buildView({
        participants: match.participants,
        state: match.latestState,
        matchResult: match.result,
        legalMoves: [],
        selectedActorPlayerId: null,
        viewerPlayerId,
      }),
    };
  }

  const session: UnoServerSession = resumeServerGameSession({
    adapter: unoAdapter,
    participants: toSessionParticipants(match.participants),
    replay: createReplayFromPersistedMatch(match),
  });
  const snapshot = session.getSnapshot();

  return {
    ...buildPersistedUnoMatchSummaryDto(match),
    executionMode: 'server-authoritative',
    replayFormatVersion: match.replayFormatVersion,
    match: snapshot.match,
    legalMoves: snapshot.legalMoves,
    selectedActorPlayerId: snapshot.selectedActorPlayerId,
    view: buildView({
      participants: match.participants,
      state: snapshot.match,
      matchResult: snapshot.matchResult,
      legalMoves: snapshot.legalMoves,
      selectedActorPlayerId: snapshot.selectedActorPlayerId,
      viewerPlayerId,
    }),
  };
}
