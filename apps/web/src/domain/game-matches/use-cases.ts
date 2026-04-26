import { randomUUID } from 'node:crypto';

import { IllegalMoveError } from '@repo/game-engine';
import { defaultGameCatalog } from '@repo/game-catalog';
import {
  createPokerAdapter,
  type PokerMove,
  type PokerState,
} from '@repo/game-poker';
import { createUnoAdapter, type UnoMove, type UnoState } from '@repo/game-uno';
import {
  resumeServerGameSession,
  type ServerGameSession,
} from '@repo/game-session';

import type { AppSession } from '@/src/auth';
import { getDb } from '@/src/db/client';
import {
  listPokerBotAiProfiles,
  listUnoBotAiProfiles,
} from '@/src/domain/game-bot-ai/service';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';

import type {
  CreatePokerMatchInput,
  CreateUnoMatchInput,
  GameMatchRealtimeInput,
  ListPokerMatchesResult,
  ListUnoMatchesResult,
  MatchOwnerIdentity,
  PersistedGameMatchRecord,
  PersistedGameMatchRealtimeDto,
  PlayerGameHistoryDto,
  PlayerGameHistoryTotalsDto,
  PlayerGameOutcome,
  PlayerGameStatsByGameDto,
  PlayerRecentGameMatchDto,
  PersistedPokerMatchRecord,
  PersistedPokerMatchRealtimeDto,
  PersistedPokerMatchSnapshotDto,
  PersistedPokerReplayDto,
  PersistedUnoMatchRecord,
  PersistedUnoMatchRealtimeDto,
  PersistedUnoMatchSnapshotDto,
  PersistedUnoReplayDto,
  SubmitPokerMoveInput,
  SubmitUnoMoveInput,
} from './contracts';
import {
  resolveExistingMatchOwnerIdentity,
  resolveOrCreateMatchOwnerIdentity,
} from './identity';
import {
  abandonGameMatch,
  appendGameMatchProgress,
  createGameMatch,
  listAccountGameHistoryMatches,
  listOwnedGameMatches,
  loadOwnedGameMatch,
  StaleMatchProgressError,
} from './repository';
import {
  buildPersistedPokerMatchRecord,
  buildPersistedPokerMatchSnapshotDto,
  buildPersistedPokerMatchSummaryDto,
  buildPersistedPokerReplayDto,
  buildPersistedUnoMatchRecord,
  buildPersistedUnoMatchSnapshotDto,
  buildPersistedUnoMatchSummaryDto,
  buildPersistedUnoReplayDto,
  createReplayFromPersistedMatch,
  createPokerMatchSession,
  createUnoMatchSession,
  processPokerBots,
  processUnoBots,
} from './service';

type MatchUseCaseError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT';
  message: string;
};
type UnoServerSession = ServerGameSession<UnoState, UnoMove>;
type PokerServerSession = ServerGameSession<PokerState, PokerMove>;

function isoNow() {
  return new Date().toISOString();
}

function isNewerTimestamp(current: string, previous?: string | null) {
  if (!previous) {
    return true;
  }

  return new Date(current).getTime() > new Date(previous).getTime();
}

function mapMissingIdentity() {
  return failure<MatchUseCaseError>({
    code: 'NOT_FOUND',
    message: 'Match not found.',
  });
}

function splitSummaries(
  matches: readonly PersistedUnoMatchRecord[],
): ListUnoMatchesResult {
  return {
    active: matches
      .filter((match) => match.status === 'active')
      .map(buildPersistedUnoMatchSummaryDto),
    recent: matches
      .filter((match) => match.status !== 'active')
      .map(buildPersistedUnoMatchSummaryDto),
  };
}

function splitPokerSummaries(
  matches: readonly PersistedPokerMatchRecord[],
): ListPokerMatchesResult {
  return {
    active: matches
      .filter((match) => match.status === 'active')
      .map(buildPersistedPokerMatchSummaryDto),
    recent: matches
      .filter((match) => match.status !== 'active')
      .map(buildPersistedPokerMatchSummaryDto),
  };
}

function createEmptyHistoryTotals(): PlayerGameHistoryTotalsDto {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    abandoned: 0,
  };
}

function incrementHistoryTotals(
  totals: PlayerGameHistoryTotalsDto,
  outcome: PlayerGameOutcome,
) {
  totals.matches += 1;

  if (outcome === 'win') {
    totals.wins += 1;
  } else if (outcome === 'loss') {
    totals.losses += 1;
  } else if (outcome === 'draw') {
    totals.draws += 1;
  } else {
    totals.abandoned += 1;
  }
}

function resolveGameName(gameId: string) {
  return defaultGameCatalog.get(gameId)?.definition.name ?? gameId;
}

function resolveReplayHref(match: PersistedGameMatchRecord) {
  if (match.gameId === 'uno-style') {
    return `/past-games/${match.matchId}`;
  }

  if (match.gameId === 'texas-holdem') {
    return `/api/games/poker/matches/${match.matchId}/replay`;
  }

  return null;
}

function resolvePlayerOutcome(
  match: PersistedGameMatchRecord,
  playerId: string,
): PlayerGameOutcome {
  if (match.status === 'abandoned') {
    return 'abandoned';
  }

  if (!match.result || match.result.winnerIds.length === 0) {
    return 'draw';
  }

  return match.result.winnerIds.includes(playerId) ? 'win' : 'loss';
}

function buildPlayerRecentMatch(
  match: PersistedGameMatchRecord,
  accountId: string,
): PlayerRecentGameMatchDto | null {
  const participant = match.participants.find(
    (candidate) =>
      !candidate.isBot &&
      candidate.identity.kind === 'account' &&
      candidate.identity.accountId === accountId,
  );

  if (!participant || match.status === 'active') {
    return null;
  }

  const outcome = resolvePlayerOutcome(match, participant.playerId);
  const playerAnalysis = match.analysis?.generic.players.find(
    (summary) => summary.playerId === participant.playerId,
  );
  const winnerDisplayNames =
    match.result?.winnerIds.map(
      (winnerId) =>
        match.participants.find((candidate) => candidate.playerId === winnerId)
          ?.displayName ?? winnerId,
    ) ?? [];

  return {
    matchId: match.matchId,
    gameId: match.gameId,
    gameName: resolveGameName(match.gameId),
    status: match.status,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    updatedAt: match.updatedAt,
    playerId: participant.playerId,
    playerDisplayName: participant.displayName,
    outcome,
    replayHref: resolveReplayHref(match),
    acceptedMoveCount:
      match.analysis?.generic.acceptedMoveCount ?? match.lastSequence,
    turnsCompleted: match.analysis?.generic.turnsCompleted ?? 0,
    durationMs: match.analysis?.generic.durationMs ?? null,
    playerMovesAccepted: playerAnalysis?.movesAccepted ?? 0,
    winnerDisplayNames,
    participants: match.participants,
  };
}

function buildPlayerGameHistory(
  accountId: string,
  matches: readonly PersistedGameMatchRecord[],
): PlayerGameHistoryDto {
  const totals = createEmptyHistoryTotals();
  const byGame = new Map<string, PlayerGameStatsByGameDto>();
  const recent: PlayerRecentGameMatchDto[] = [];

  for (const match of matches) {
    const recentMatch = buildPlayerRecentMatch(match, accountId);

    if (!recentMatch) {
      continue;
    }

    recent.push(recentMatch);
    incrementHistoryTotals(totals, recentMatch.outcome);

    const gameTotals = byGame.get(recentMatch.gameId) ?? {
      ...createEmptyHistoryTotals(),
      gameId: recentMatch.gameId,
      gameName: recentMatch.gameName,
    };
    incrementHistoryTotals(gameTotals, recentMatch.outcome);
    byGame.set(recentMatch.gameId, gameTotals);
  }

  return {
    accountId,
    totals,
    byGame: [...byGame.values()].sort(
      (left, right) =>
        right.matches - left.matches ||
        left.gameName.localeCompare(right.gameName),
    ),
    recent: recent.slice(0, 10),
  };
}

async function resolveOwnedIdentity(
  session: AppSession | null,
  createGuest: boolean,
) {
  return createGuest
    ? resolveOrCreateMatchOwnerIdentity(session)
    : resolveExistingMatchOwnerIdentity(session);
}

function buildMoveRows(
  match: PersistedGameMatchRecord,
  previousLastSequence: number,
) {
  return match.acceptedMoves
    .slice(previousLastSequence)
    .map((acceptedMove) => ({
      matchId: match.matchId,
      sequence: acceptedMove.sequence,
      acceptedAt: new Date(acceptedMove.acceptedAt),
      playerId: acceptedMove.move.playerId,
      moveKind: acceptedMove.move.kind,
      moveJson: acceptedMove.move,
    }));
}

function buildMatchInsert(input: PersistedGameMatchRecord) {
  return {
    id: input.matchId,
    gameId: input.gameId,
    status: input.status,
    executionMode: input.executionMode,
    replayFormatVersion: input.replayFormatVersion,
    startedAt: new Date(input.startedAt),
    finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
    updatedAt: new Date(input.updatedAt),
    createdAt: new Date(input.createdAt),
    createdByKind: input.createdBy.kind,
    createdByAccountId:
      input.createdBy.kind === 'account' ? input.createdBy.accountId : null,
    createdByGuestId:
      input.createdBy.kind === 'guest' ? input.createdBy.guestId : null,
    initialStateJson: input.initialState,
    latestStateJson: input.latestState,
    resultJson: input.result,
    analysisJson: input.analysis,
    lastSequence: input.lastSequence,
  };
}

function buildParticipantRows(match: PersistedGameMatchRecord) {
  return match.participants.map((participant) => ({
    matchId: match.matchId,
    playerId: participant.playerId,
    seat: participant.seat,
    displayName: participant.displayName,
    identityKind: participant.identity.kind,
    accountId:
      participant.identity.kind === 'account'
        ? participant.identity.accountId
        : null,
    guestId:
      participant.identity.kind === 'guest'
        ? participant.identity.guestId
        : null,
    isBot: participant.isBot,
  }));
}

function buildMatchRealtimeDto<TSnapshot>(input: {
  match: PersistedGameMatchRecord;
  snapshot: TSnapshot;
  realtimeInput?: GameMatchRealtimeInput;
}): PersistedGameMatchRealtimeDto<TSnapshot> {
  const afterSequence = Math.max(input.realtimeInput?.afterSequence ?? 0, 0);
  const hasCursor =
    input.realtimeInput?.afterSequence != null ||
    input.realtimeInput?.sinceUpdatedAt != null;
  const hasSequenceChanges = input.match.lastSequence > afterSequence;
  const hasTimestampChanges =
    input.realtimeInput?.sinceUpdatedAt != null
      ? isNewerTimestamp(
          input.match.updatedAt,
          input.realtimeInput.sinceUpdatedAt,
        )
      : false;
  const hasChanges = !hasCursor || hasSequenceChanges || hasTimestampChanges;
  const moveEvents = input.match.acceptedMoves
    .filter((acceptedMove) => acceptedMove.sequence > afterSequence)
    .map((acceptedMove) => ({
      type: 'move.accepted' as const,
      matchId: input.match.matchId,
      gameId: input.match.gameId,
      occurredAt: acceptedMove.acceptedAt,
      sequence: acceptedMove.sequence,
      playerId: acceptedMove.move.playerId,
      moveKind: acceptedMove.move.kind,
    }));

  return {
    snapshot: input.snapshot,
    cursor: {
      lastSequence: input.match.lastSequence,
      updatedAt: input.match.updatedAt,
    },
    events: hasChanges
      ? [
          {
            type: 'match.updated',
            matchId: input.match.matchId,
            gameId: input.match.gameId,
            occurredAt: input.match.updatedAt,
            lastSequence: input.match.lastSequence,
          },
          ...moveEvents,
          ...(input.match.status !== 'active'
            ? [
                {
                  type: 'match.finished' as const,
                  matchId: input.match.matchId,
                  gameId: input.match.gameId,
                  occurredAt: input.match.finishedAt ?? input.match.updatedAt,
                  winnerIds: input.match.result?.winnerIds ?? [],
                },
              ]
            : []),
        ]
      : [],
    hasChanges,
  };
}

function createResumedSession(
  match: PersistedUnoMatchRecord,
  now: () => string,
) {
  return resumeServerGameSession({
    adapter: createUnoAdapter(),
    participants: match.participants.map((participant) => ({
      playerId: participant.playerId,
      displayName: participant.displayName,
      seat: participant.seat,
      controller: participant.isBot ? 'bot' : 'human',
      ...(participant.identity.kind === 'account'
        ? { accountId: participant.identity.accountId }
        : {}),
      ...(participant.identity.kind === 'guest' ? { isGuest: true } : {}),
    })),
    replay: createReplayFromPersistedMatch(match),
    now,
  });
}

function createResumedPokerSession(
  match: PersistedPokerMatchRecord,
  now: () => string,
) {
  return resumeServerGameSession({
    adapter: createPokerAdapter(),
    participants: match.participants.map((participant) => ({
      playerId: participant.playerId,
      displayName: participant.displayName,
      seat: participant.seat,
      controller: participant.isBot ? 'bot' : 'human',
      ...(participant.identity.kind === 'account'
        ? { accountId: participant.identity.accountId }
        : {}),
      ...(participant.identity.kind === 'guest' ? { isGuest: true } : {}),
    })),
    replay: createReplayFromPersistedMatch(match),
    now,
  });
}

function finalizePersistedMatch(input: {
  session: UnoServerSession;
  persistedMatch: PersistedUnoMatchRecord;
}) {
  return buildPersistedUnoMatchRecord({
    createdAt: input.persistedMatch.createdAt,
    createdBy: input.persistedMatch.createdBy,
    participants: input.persistedMatch.participants,
    session: input.session,
  });
}

function finalizePersistedPokerMatch(input: {
  session: PokerServerSession;
  persistedMatch: PersistedPokerMatchRecord;
}) {
  return buildPersistedPokerMatchRecord({
    createdAt: input.persistedMatch.createdAt,
    createdBy: input.persistedMatch.createdBy,
    participants: input.persistedMatch.participants,
    session: input.session,
  });
}

export async function listPokerMatchesUseCase(
  session: AppSession | null,
): Promise<ServiceResult<ListPokerMatchesResult, never>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, true);
  const matches = await listOwnedGameMatches<PersistedPokerMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    { gameId: 'texas-holdem' },
  );
  return success(splitPokerSummaries(matches));
}

export async function getPlayerGameHistoryUseCase(
  accountId: string,
): Promise<ServiceResult<PlayerGameHistoryDto, never>> {
  const matches = await listAccountGameHistoryMatches(getDb(), accountId);
  return success(buildPlayerGameHistory(accountId, matches));
}

export async function createPokerMatchUseCase(
  session: AppSession | null,
  input: CreatePokerMatchInput,
): Promise<ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, true);
  const botAiProfiles = await listPokerBotAiProfiles();

  try {
    const snapshot = await getDb().transaction(async (tx) => {
      const createdAt = isoNow();
      const matchId = randomUUID();
      const { participants, session: serverSession } = createPokerMatchSession({
        matchId,
        identity: resolvedIdentity.identity as MatchOwnerIdentity,
        fallbackDisplayName: resolvedIdentity.displayName,
        presetId: input.presetId,
        displayName: input.displayName,
        botAiProfiles,
      });
      const persistedMatch = buildPersistedPokerMatchRecord({
        createdAt,
        createdBy: resolvedIdentity.identity as MatchOwnerIdentity,
        participants,
        session: serverSession,
      });

      await createGameMatch(tx, {
        match: buildMatchInsert(persistedMatch),
        participants: buildParticipantRows(persistedMatch),
        moves: buildMoveRows(persistedMatch, 0),
      });

      return buildPersistedPokerMatchSnapshotDto(
        persistedMatch,
        resolvedIdentity.identity as MatchOwnerIdentity,
      );
    });

    return success(snapshot);
  } catch (error) {
    return failure({
      code: 'VALIDATION_ERROR',
      message:
        error instanceof Error ? error.message : 'Unable to create match.',
    });
  }
}

export async function getPokerMatchSnapshotUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedPokerMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId: 'texas-holdem' },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(
    buildPersistedPokerMatchSnapshotDto(
      match,
      resolvedIdentity.identity as MatchOwnerIdentity,
    ),
  );
}

export async function getPokerMatchRealtimeUseCase(
  session: AppSession | null,
  matchId: string,
  input: GameMatchRealtimeInput = {},
): Promise<ServiceResult<PersistedPokerMatchRealtimeDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedPokerMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId: 'texas-holdem' },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(
    buildMatchRealtimeDto({
      match,
      snapshot: buildPersistedPokerMatchSnapshotDto(
        match,
        resolvedIdentity.identity as MatchOwnerIdentity,
      ),
      realtimeInput: input,
    }),
  );
}

export async function submitPokerMoveUseCase(
  session: AppSession | null,
  matchId: string,
  input: SubmitPokerMoveInput,
): Promise<ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  try {
    const botAiProfiles = await listPokerBotAiProfiles();
    const snapshot = await getDb().transaction(async (tx) => {
      const persistedMatch =
        await loadOwnedGameMatch<PersistedPokerMatchRecord>(
          tx,
          resolvedIdentity.identity as MatchOwnerIdentity,
          matchId,
          { gameId: 'texas-holdem' },
        );

      if (!persistedMatch) {
        throw failure<MatchUseCaseError>({
          code: 'NOT_FOUND',
          message: 'Match not found.',
        });
      }

      if (persistedMatch.status !== 'active') {
        throw failure<MatchUseCaseError>({
          code: 'CONFLICT',
          message: 'Completed matches cannot accept more moves.',
        });
      }

      const now = () => isoNow();
      const serverSession = createResumedPokerSession(persistedMatch, now);

      serverSession.submitMove(input.move);
      processPokerBots(
        serverSession,
        persistedMatch.participants,
        botAiProfiles,
      );

      const updatedMatch = finalizePersistedPokerMatch({
        session: serverSession,
        persistedMatch,
      });

      await appendGameMatchProgress(tx, {
        matchId: updatedMatch.matchId,
        latestStateJson: updatedMatch.latestState,
        resultJson: updatedMatch.result,
        analysisJson: updatedMatch.analysis,
        status: updatedMatch.status,
        finishedAt: updatedMatch.finishedAt
          ? new Date(updatedMatch.finishedAt)
          : null,
        updatedAt: new Date(updatedMatch.updatedAt),
        lastSequence: updatedMatch.lastSequence,
        previousLastSequence: persistedMatch.lastSequence,
        moves: buildMoveRows(updatedMatch, persistedMatch.lastSequence),
      });

      return buildPersistedPokerMatchSnapshotDto(
        updatedMatch,
        resolvedIdentity.identity as MatchOwnerIdentity,
      );
    });

    return success(snapshot);
  } catch (error) {
    if (error instanceof IllegalMoveError) {
      return failure({
        code: 'CONFLICT',
        message: error.reason,
      });
    }

    if (error instanceof StaleMatchProgressError) {
      return failure({
        code: 'CONFLICT',
        message: 'Match was updated by another request. Reload and try again.',
      });
    }

    if (
      error &&
      typeof error === 'object' &&
      'ok' in error &&
      error.ok === false
    ) {
      return error as ServiceResult<never, MatchUseCaseError>;
    }

    return failure({
      code: 'VALIDATION_ERROR',
      message:
        error instanceof Error ? error.message : 'Unable to submit move.',
    });
  }
}

export async function getPokerReplayUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedPokerReplayDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedPokerMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId: 'texas-holdem' },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(buildPersistedPokerReplayDto(match));
}

export async function listUnoMatchesUseCase(
  session: AppSession | null,
): Promise<ServiceResult<ListUnoMatchesResult, never>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, true);
  const matches = await listOwnedGameMatches<PersistedUnoMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    { gameId: 'uno-style' },
  );
  return success(splitSummaries(matches));
}

export async function createUnoMatchUseCase(
  session: AppSession | null,
  input: CreateUnoMatchInput,
): Promise<ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, true);

  try {
    const botAiProfiles = await listUnoBotAiProfiles();
    const snapshot = await getDb().transaction(async (tx) => {
      const createdAt = isoNow();
      const matchId = randomUUID();
      const { participants, session: serverSession } = createUnoMatchSession({
        matchId,
        identity: resolvedIdentity.identity as MatchOwnerIdentity,
        fallbackDisplayName: resolvedIdentity.displayName,
        presetId: input.presetId,
        displayName: input.displayName,
        botAiProfiles,
      });
      const persistedMatch = buildPersistedUnoMatchRecord({
        createdAt,
        createdBy: resolvedIdentity.identity as MatchOwnerIdentity,
        participants,
        session: serverSession,
      });

      await createGameMatch(tx, {
        match: {
          id: persistedMatch.matchId,
          gameId: persistedMatch.gameId,
          status: persistedMatch.status,
          executionMode: persistedMatch.executionMode,
          replayFormatVersion: persistedMatch.replayFormatVersion,
          startedAt: new Date(persistedMatch.startedAt),
          finishedAt: persistedMatch.finishedAt
            ? new Date(persistedMatch.finishedAt)
            : null,
          updatedAt: new Date(persistedMatch.updatedAt),
          createdAt: new Date(persistedMatch.createdAt),
          createdByKind: persistedMatch.createdBy.kind,
          createdByAccountId:
            persistedMatch.createdBy.kind === 'account'
              ? persistedMatch.createdBy.accountId
              : null,
          createdByGuestId:
            persistedMatch.createdBy.kind === 'guest'
              ? persistedMatch.createdBy.guestId
              : null,
          initialStateJson: persistedMatch.initialState,
          latestStateJson: persistedMatch.latestState,
          resultJson: persistedMatch.result,
          analysisJson: persistedMatch.analysis,
          lastSequence: persistedMatch.lastSequence,
        },
        participants: persistedMatch.participants.map((participant) => ({
          matchId: persistedMatch.matchId,
          playerId: participant.playerId,
          seat: participant.seat,
          displayName: participant.displayName,
          identityKind: participant.identity.kind,
          accountId:
            participant.identity.kind === 'account'
              ? participant.identity.accountId
              : null,
          guestId:
            participant.identity.kind === 'guest'
              ? participant.identity.guestId
              : null,
          isBot: participant.isBot,
        })),
        moves: buildMoveRows(persistedMatch, 0),
      });

      return buildPersistedUnoMatchSnapshotDto(
        persistedMatch,
        resolvedIdentity.identity as MatchOwnerIdentity,
      );
    });

    return success(snapshot);
  } catch (error) {
    return failure({
      code: 'VALIDATION_ERROR',
      message:
        error instanceof Error ? error.message : 'Unable to create match.',
    });
  }
}

export async function getUnoMatchSnapshotUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedUnoMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId: 'uno-style' },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(
    buildPersistedUnoMatchSnapshotDto(
      match,
      resolvedIdentity.identity as MatchOwnerIdentity,
    ),
  );
}

export async function getUnoMatchRealtimeUseCase(
  session: AppSession | null,
  matchId: string,
  input: GameMatchRealtimeInput = {},
): Promise<ServiceResult<PersistedUnoMatchRealtimeDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedUnoMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId: 'uno-style' },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(
    buildMatchRealtimeDto({
      match,
      snapshot: buildPersistedUnoMatchSnapshotDto(
        match,
        resolvedIdentity.identity as MatchOwnerIdentity,
      ),
      realtimeInput: input,
    }),
  );
}

export async function submitUnoMoveUseCase(
  session: AppSession | null,
  matchId: string,
  input: SubmitUnoMoveInput,
): Promise<ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  try {
    const botAiProfiles = await listUnoBotAiProfiles();
    const snapshot = await getDb().transaction(async (tx) => {
      const persistedMatch = await loadOwnedGameMatch<PersistedUnoMatchRecord>(
        tx,
        resolvedIdentity.identity as MatchOwnerIdentity,
        matchId,
        { gameId: 'uno-style' },
      );

      if (!persistedMatch) {
        throw failure<MatchUseCaseError>({
          code: 'NOT_FOUND',
          message: 'Match not found.',
        });
      }

      if (persistedMatch.status !== 'active') {
        throw failure<MatchUseCaseError>({
          code: 'CONFLICT',
          message: 'Completed matches cannot accept more moves.',
        });
      }

      const now = () => isoNow();
      const serverSession = createResumedSession(persistedMatch, now);

      serverSession.submitMove(input.move);
      processUnoBots(serverSession, persistedMatch.participants, botAiProfiles);

      const updatedMatch = finalizePersistedMatch({
        session: serverSession,
        persistedMatch,
      });

      await appendGameMatchProgress(tx, {
        matchId: updatedMatch.matchId,
        latestStateJson: updatedMatch.latestState,
        resultJson: updatedMatch.result,
        analysisJson: updatedMatch.analysis,
        status: updatedMatch.status,
        finishedAt: updatedMatch.finishedAt
          ? new Date(updatedMatch.finishedAt)
          : null,
        updatedAt: new Date(updatedMatch.updatedAt),
        lastSequence: updatedMatch.lastSequence,
        previousLastSequence: persistedMatch.lastSequence,
        moves: buildMoveRows(updatedMatch, persistedMatch.lastSequence),
      });

      return buildPersistedUnoMatchSnapshotDto(
        updatedMatch,
        resolvedIdentity.identity as MatchOwnerIdentity,
      );
    });

    return success(snapshot);
  } catch (error) {
    if (error instanceof IllegalMoveError) {
      return failure({
        code: 'CONFLICT',
        message: error.reason,
      });
    }

    if (error instanceof StaleMatchProgressError) {
      return failure({
        code: 'CONFLICT',
        message: 'Match was updated by another request. Reload and try again.',
      });
    }

    if (
      error &&
      typeof error === 'object' &&
      'ok' in error &&
      error.ok === false
    ) {
      return error as ServiceResult<never, MatchUseCaseError>;
    }

    return failure({
      code: 'VALIDATION_ERROR',
      message:
        error instanceof Error ? error.message : 'Unable to submit move.',
    });
  }
}

export async function abandonUnoMatchUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const result = await getDb().transaction(async (tx) => {
    const persistedMatch = await loadOwnedGameMatch<PersistedUnoMatchRecord>(
      tx,
      resolvedIdentity.identity as MatchOwnerIdentity,
      matchId,
      { gameId: 'uno-style' },
    );

    if (!persistedMatch) {
      return failure<MatchUseCaseError>({
        code: 'NOT_FOUND',
        message: 'Match not found.',
      });
    }

    if (persistedMatch.status !== 'active') {
      return failure<MatchUseCaseError>({
        code: 'CONFLICT',
        message: 'Only active matches can be abandoned.',
      });
    }

    const finishedAt = isoNow();
    const abandonedMatch: PersistedUnoMatchRecord = {
      ...persistedMatch,
      status: 'abandoned',
      finishedAt,
      updatedAt: finishedAt,
    };

    await abandonGameMatch(tx, {
      matchId,
      updatedAt: new Date(finishedAt),
      finishedAt: new Date(finishedAt),
      analysisJson: abandonedMatch.analysis,
      resultJson: abandonedMatch.result,
    });

    return success(
      buildPersistedUnoMatchSnapshotDto(
        abandonedMatch,
        resolvedIdentity.identity as MatchOwnerIdentity,
      ),
    );
  });

  return result;
}

export async function getUnoReplayUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedUnoReplayDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedUnoMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId: 'uno-style' },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(buildPersistedUnoReplayDto(match));
}
