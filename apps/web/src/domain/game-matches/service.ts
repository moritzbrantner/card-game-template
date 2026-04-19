import {
  MATCH_REPLAY_FORMAT_VERSION,
  createMatchReplay,
  summarizeMatchReplay,
  type MatchReplay,
  type PlayerIdentityRef,
} from '@repo/game-contracts';
import {
  createUnoAdapter,
  createUnoBots,
  getUnoExamplePreset,
  projectUnoPlayerView,
  summarizeUnoReplay,
  type UnoExamplePresetId,
  type UnoMove,
  type UnoPlayerView,
  type UnoState,
} from '@repo/game-uno';
import {
  createServerGameSession,
  resumeServerGameSession,
  type SessionParticipant,
  type ServerGameSession,
} from '@repo/game-session';

import type {
  CreateUnoMatchInput,
  GameMatchAnalysisRecord,
  GameMatchParticipantRecord,
  MatchOwnerIdentity,
  PersistedUnoMatchRecord,
  PersistedUnoMatchSnapshotDto,
  PersistedUnoMatchSummaryDto,
  PersistedUnoReplayDto,
} from './contracts';

const unoAdapter = createUnoAdapter();
type UnoServerSession = ServerGameSession<UnoState, UnoMove>;

function matchesIdentity(identity: MatchOwnerIdentity, participant: GameMatchParticipantRecord) {
  if (participant.identity.kind === 'bot') {
    return false;
  }

  return identity.kind === 'account'
    ? participant.identity.kind === 'account' && participant.identity.accountId === identity.accountId
    : participant.identity.kind === 'guest' && participant.identity.guestId === identity.guestId;
}

function toSessionParticipants(participants: readonly GameMatchParticipantRecord[]): SessionParticipant[] {
  return participants.map((participant) => ({
    playerId: participant.playerId,
    displayName: participant.displayName,
    seat: participant.seat,
    controller: participant.isBot ? 'bot' : 'human',
    ...(participant.identity.kind === 'account' ? { accountId: participant.identity.accountId } : {}),
    ...(participant.identity.kind === 'guest' ? { isGuest: true } : {}),
  }));
}

function getViewerPlayerId(participants: readonly GameMatchParticipantRecord[], identity: MatchOwnerIdentity) {
  return participants.find((participant) => matchesIdentity(identity, participant))?.playerId ?? null;
}

function createAnalysisRecord(replay: MatchReplay<UnoState, UnoMove>): GameMatchAnalysisRecord {
  return {
    generic: summarizeMatchReplay(replay),
    uno: summarizeUnoReplay(replay),
  };
}

function buildView(input: {
  participants: readonly GameMatchParticipantRecord[];
  state: PersistedUnoMatchRecord['latestState'];
  matchResult: PersistedUnoMatchRecord['result'];
  legalMoves: readonly UnoMove[];
  viewerPlayerId: string | null;
}): UnoPlayerView {
  return projectUnoPlayerView({
    legalMoves: input.legalMoves,
    matchResult: input.matchResult,
    participants: toSessionParticipants(input.participants),
    pendingHotseatPlayerId: null,
    state: input.state,
    viewerPlayerId: input.viewerPlayerId,
  });
}

export function createReplayFromPersistedMatch(match: PersistedUnoMatchRecord) {
  return createMatchReplay({
    startedAt: match.startedAt,
    initialState: match.initialState,
    latestState: match.latestState,
    acceptedMoves: match.acceptedMoves,
    finishedAt: match.finishedAt,
    result: match.result,
  });
}

export function buildPersistedUnoMatchSummaryDto(match: PersistedUnoMatchRecord): PersistedUnoMatchSummaryDto {
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
      view: buildView({
        participants: match.participants,
        state: match.latestState,
        matchResult: match.result,
        legalMoves: [],
        viewerPlayerId,
      }),
    };
  }

  const session = resumeServerGameSession({
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
    view: buildView({
      participants: match.participants,
      state: snapshot.match,
      matchResult: snapshot.matchResult,
      legalMoves: snapshot.legalMoves,
      viewerPlayerId,
    }),
  };
}

export function buildPersistedUnoReplayDto(match: PersistedUnoMatchRecord): PersistedUnoReplayDto {
  const replay = createReplayFromPersistedMatch(match);
  const analysis = match.analysis ?? createAnalysisRecord(replay);

  return {
    summary: buildPersistedUnoMatchSummaryDto(match),
    replay,
    moves: replay.acceptedMoves,
    analysis: analysis.generic,
    unoAnalysis: analysis.uno,
  };
}

function buildParticipantDisplayName(input: {
  requestedDisplayName: string | null | undefined;
  fallbackDisplayName: string | null;
}) {
  const requested = input.requestedDisplayName?.trim();
  if (requested) {
    return requested;
  }

  const fallback = input.fallbackDisplayName?.trim();
  if (fallback) {
    return fallback;
  }

  throw new Error('A player display name is required.');
}

export function buildUnoParticipants(input: {
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  matchInput: CreateUnoMatchInput;
}): readonly GameMatchParticipantRecord[] {
  const preset = getUnoExamplePreset(input.matchInput.presetId);
  const ownerDisplayName = buildParticipantDisplayName({
    requestedDisplayName: input.matchInput.displayName,
    fallbackDisplayName: input.fallbackDisplayName,
  });

  return preset.seats.map((seat, index) => {
    if (index === 0) {
      return {
        playerId: seat.playerId,
        seat: seat.seat,
        displayName: ownerDisplayName,
        identity: input.identity,
        isBot: false,
      };
    }

    return {
      playerId: seat.playerId,
      seat: seat.seat,
      displayName: seat.controller === 'bot' ? seat.displayName : `${seat.displayName} Bot`,
      identity: { kind: 'bot' } satisfies PlayerIdentityRef,
      isBot: true,
    };
  });
}

export function createUnoMatchSession(input: {
  matchId: string;
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  presetId: UnoExamplePresetId;
  displayName?: string | null;
  now?: () => string;
}) {
  const participants = buildUnoParticipants({
    identity: input.identity,
    fallbackDisplayName: input.fallbackDisplayName,
    matchInput: {
      presetId: input.presetId,
      displayName: input.displayName,
    },
  });
  const sessionParticipants = toSessionParticipants(participants);
  const session = createServerGameSession({
    adapter: unoAdapter,
    matchId: input.matchId,
    participants: sessionParticipants,
    setup: {
      seed: input.matchId,
    },
    now: input.now,
  });

  processUnoBots(session, participants);

  return {
    participants,
    session,
  };
}

export function processUnoBots(
  session: UnoServerSession,
  participants: readonly GameMatchParticipantRecord[],
) {
  const sessionParticipants = toSessionParticipants(participants);
  const bots = createUnoBots(sessionParticipants, session.getSnapshot().match.matchId);

  while (!session.getSnapshot().matchResult) {
    const snapshot = session.getSnapshot();
    const activeParticipant = participants.find((participant) => participant.playerId === snapshot.match.activePlayerId);

    if (!activeParticipant?.isBot) {
      break;
    }

    const move = bots[activeParticipant.playerId]?.chooseMove({
      legalMoves: snapshot.legalMoves,
      participants: sessionParticipants,
      playerId: activeParticipant.playerId,
      state: snapshot.match,
    }) ?? snapshot.legalMoves[0] ?? null;

    if (!move) {
      break;
    }

    session.submitMove(move);
  }
}

export function buildPersistedUnoMatchRecord(input: {
  createdAt: string;
  createdBy: MatchOwnerIdentity;
  participants: readonly GameMatchParticipantRecord[];
  session: UnoServerSession;
  status?: PersistedUnoMatchRecord['status'];
  finishedAt?: string | null;
}) {
  const replay = input.session.getReplay();
  const analysis = createAnalysisRecord(replay);
  const status =
    input.status ??
    (input.session.getSnapshot().matchResult ? 'completed' : 'active');

  return {
    matchId: replay.matchId,
    gameId: 'uno-style' as const,
    status,
    executionMode: 'server-authoritative' as const,
    replayFormatVersion: MATCH_REPLAY_FORMAT_VERSION,
    startedAt: replay.startedAt,
    finishedAt: input.finishedAt ?? replay.finishedAt,
    updatedAt: input.finishedAt ?? replay.finishedAt ?? input.createdAt,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    initialState: replay.initialState,
    latestState: replay.latestState,
    result: replay.result,
    analysis,
    lastSequence: replay.acceptedMoves.length,
    participants: input.participants,
    acceptedMoves: replay.acceptedMoves,
  };
}
