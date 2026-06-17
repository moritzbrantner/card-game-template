import { randomUUID } from 'node:crypto';

import { defaultGameCatalog } from '@repo/game-catalog';
import type { GameId } from '@repo/game-contracts';
import { IllegalMoveError } from '@repo/game-engine';

import type { AppSession } from '@/src/auth';
import { getDb } from '@/src/db/client';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';

import type {
  CreatePokerMatchInput,
  CreateTcgMatchInput,
  CreateUnoMatchInput,
  GameMatchRealtimeInput,
  ListPokerMatchesResult,
  ListTcgMatchesResult,
  ListUnoMatchesResult,
  MatchOwnerIdentity,
  PersistedGameMatchRecord,
  PersistedGameMatchRealtimeDto,
  PersistedPokerMatchRealtimeDto,
  PersistedPokerMatchSnapshotDto,
  PersistedPokerReplayDto,
  PersistedTcgMatchRealtimeDto,
  PersistedTcgMatchSnapshotDto,
  PersistedTcgReplayDto,
  PersistedUnoMatchRecord,
  PersistedUnoMatchRealtimeDto,
  PersistedUnoMatchSnapshotDto,
  PersistedUnoReplayDto,
  PlayerGameHistoryDto,
  PlayerGameHistoryTotalsDto,
  PlayerGameOutcome,
  PlayerGameStatsByGameDto,
  PlayerRecentGameMatchDto,
  SubmitPokerMoveInput,
  SubmitTcgMoveInput,
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
  createRegisteredRuntimeSession,
  getRegisteredGameRuntime,
  resumeRegisteredRuntimeSession,
} from './runtime';
import { buildPersistedUnoMatchSnapshotDto } from './service';

type MatchUseCaseError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT';
  message: string;
};

type ListGameMatchesResult = {
  active: readonly unknown[];
  recent: readonly unknown[];
};

function isoNow() {
  return new Date().toISOString();
}

function createAcceptedAtClock(initialTimestamp: string) {
  const parsedInitialTimestamp = Date.parse(initialTimestamp);
  let nextAcceptedAt = Number.isNaN(parsedInitialTimestamp)
    ? Date.now()
    : parsedInitialTimestamp;

  return () => {
    const acceptedAt = new Date(nextAcceptedAt).toISOString();
    nextAcceptedAt += 1;
    return acceptedAt;
  };
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

function mapMissingRuntime() {
  return failure<MatchUseCaseError>({
    code: 'NOT_FOUND',
    message: 'Match not found.',
  });
}

async function resolveOwnedIdentity(
  session: AppSession | null,
  createGuest: boolean,
) {
  return createGuest
    ? resolveOrCreateMatchOwnerIdentity(session)
    : resolveExistingMatchOwnerIdentity(session);
}

function splitSummaries(
  matches: readonly PersistedGameMatchRecord[],
  buildSummaryDto: (match: PersistedGameMatchRecord) => unknown,
): ListGameMatchesResult {
  return {
    active: matches
      .filter((match) => match.status === 'active')
      .map(buildSummaryDto),
    recent: matches
      .filter((match) => match.status !== 'active')
      .map(buildSummaryDto),
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

  if (match.gameId === 'arcane-duel') {
    return `/api/games/tcg/matches/${match.matchId}/replay`;
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

export async function listGameMatchesUseCase(
  session: AppSession | null,
  gameId: GameId,
): Promise<ServiceResult<ListGameMatchesResult, MatchUseCaseError>> {
  const runtime = getRegisteredGameRuntime(gameId);

  if (!runtime) {
    return mapMissingRuntime();
  }

  const resolvedIdentity = await resolveOwnedIdentity(session, true);
  const matches = await listOwnedGameMatches<PersistedGameMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    { gameId },
  );

  return success(splitSummaries(matches, runtime.buildSummaryDto));
}

export async function createGameMatchUseCase(
  session: AppSession | null,
  gameId: GameId,
  input: unknown,
): Promise<ServiceResult<unknown, MatchUseCaseError>> {
  const runtime = getRegisteredGameRuntime(gameId);

  if (!runtime) {
    return mapMissingRuntime();
  }

  const resolvedIdentity = await resolveOwnedIdentity(session, true);

  try {
    const botContext = await runtime.loadBotContext();
    const snapshot = await getDb().transaction(async (tx) => {
      const createdAt = isoNow();
      const matchId = randomUUID();
      const identity = resolvedIdentity.identity as MatchOwnerIdentity;
      const participants = runtime.buildParticipants({
        identity,
        fallbackDisplayName: resolvedIdentity.displayName,
        input,
      });
      const serverSession = createRegisteredRuntimeSession({
        runtime,
        matchId,
        participants,
        createInput: input,
      });

      runtime.processBots(serverSession, participants, botContext);

      const persistedMatch = runtime.buildPersistedRecord({
        createdAt,
        createdBy: identity,
        participants,
        session: serverSession,
      });

      await createGameMatch(tx, {
        match: buildMatchInsert(persistedMatch),
        participants: buildParticipantRows(persistedMatch),
        moves: buildMoveRows(persistedMatch, 0),
      });

      return runtime.buildSnapshotDto(persistedMatch, identity);
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

export async function getGameMatchSnapshotUseCase(
  session: AppSession | null,
  gameId: GameId,
  matchId: string,
): Promise<ServiceResult<unknown, MatchUseCaseError>> {
  const runtime = getRegisteredGameRuntime(gameId);

  if (!runtime) {
    return mapMissingRuntime();
  }

  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedGameMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(
    runtime.buildSnapshotDto(
      match,
      resolvedIdentity.identity as MatchOwnerIdentity,
    ),
  );
}

export async function getGameMatchRealtimeUseCase(
  session: AppSession | null,
  gameId: GameId,
  matchId: string,
  input: GameMatchRealtimeInput = {},
): Promise<
  ServiceResult<PersistedGameMatchRealtimeDto<unknown>, MatchUseCaseError>
> {
  const runtime = getRegisteredGameRuntime(gameId);

  if (!runtime) {
    return mapMissingRuntime();
  }

  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedGameMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(
    buildMatchRealtimeDto({
      match,
      snapshot: runtime.buildSnapshotDto(
        match,
        resolvedIdentity.identity as MatchOwnerIdentity,
      ),
      realtimeInput: input,
    }),
  );
}

export async function submitGameMoveUseCase(
  session: AppSession | null,
  gameId: GameId,
  matchId: string,
  input: { move: unknown },
): Promise<ServiceResult<unknown, MatchUseCaseError>> {
  const runtime = getRegisteredGameRuntime(gameId);

  if (!runtime) {
    return mapMissingRuntime();
  }

  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  try {
    const move = runtime.parseMove(input.move);
    const botContext = await runtime.loadBotContext();
    const snapshot = await getDb().transaction(async (tx) => {
      const identity = resolvedIdentity.identity as MatchOwnerIdentity;
      const persistedMatch = await loadOwnedGameMatch<PersistedGameMatchRecord>(
        tx,
        identity,
        matchId,
        { gameId },
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

      const serverSession = resumeRegisteredRuntimeSession({
        runtime,
        match: persistedMatch,
        now: createAcceptedAtClock(move.createdAt),
      });

      serverSession.submitMove(move);
      runtime.processBots(
        serverSession,
        persistedMatch.participants,
        botContext,
      );

      const updatedMatch = runtime.buildPersistedRecord({
        createdAt: persistedMatch.createdAt,
        createdBy: persistedMatch.createdBy,
        participants: persistedMatch.participants,
        session: serverSession,
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

      return runtime.buildSnapshotDto(updatedMatch, identity);
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

export async function getGameReplayUseCase(
  session: AppSession | null,
  gameId: GameId,
  matchId: string,
): Promise<ServiceResult<unknown, MatchUseCaseError>> {
  const runtime = getRegisteredGameRuntime(gameId);

  if (!runtime) {
    return mapMissingRuntime();
  }

  const resolvedIdentity = await resolveOwnedIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const match = await loadOwnedGameMatch<PersistedGameMatchRecord>(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    matchId,
    { gameId },
  );

  if (!match) {
    return mapMissingIdentity();
  }

  return success(runtime.buildReplayDto(match));
}

export async function getPlayerGameHistoryUseCase(
  accountId: string,
): Promise<ServiceResult<PlayerGameHistoryDto, never>> {
  const matches = await listAccountGameHistoryMatches(getDb(), accountId);
  return success(buildPlayerGameHistory(accountId, matches));
}

export async function listPokerMatchesUseCase(
  session: AppSession | null,
): Promise<ServiceResult<ListPokerMatchesResult, never>> {
  return (await listGameMatchesUseCase(
    session,
    'texas-holdem',
  )) as ServiceResult<ListPokerMatchesResult, never>;
}

export async function createPokerMatchUseCase(
  session: AppSession | null,
  input: CreatePokerMatchInput,
): Promise<ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>> {
  return (await createGameMatchUseCase(
    session,
    'texas-holdem',
    input,
  )) as ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>;
}

export async function getPokerMatchSnapshotUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>> {
  return (await getGameMatchSnapshotUseCase(
    session,
    'texas-holdem',
    matchId,
  )) as ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>;
}

export async function getPokerMatchRealtimeUseCase(
  session: AppSession | null,
  matchId: string,
  input: GameMatchRealtimeInput = {},
): Promise<ServiceResult<PersistedPokerMatchRealtimeDto, MatchUseCaseError>> {
  return (await getGameMatchRealtimeUseCase(
    session,
    'texas-holdem',
    matchId,
    input,
  )) as ServiceResult<PersistedPokerMatchRealtimeDto, MatchUseCaseError>;
}

export async function submitPokerMoveUseCase(
  session: AppSession | null,
  matchId: string,
  input: SubmitPokerMoveInput | { move: unknown },
): Promise<ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>> {
  return (await submitGameMoveUseCase(
    session,
    'texas-holdem',
    matchId,
    input,
  )) as ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>;
}

export async function getPokerReplayUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedPokerReplayDto, MatchUseCaseError>> {
  return (await getGameReplayUseCase(
    session,
    'texas-holdem',
    matchId,
  )) as ServiceResult<PersistedPokerReplayDto, MatchUseCaseError>;
}

export async function listUnoMatchesUseCase(
  session: AppSession | null,
): Promise<ServiceResult<ListUnoMatchesResult, never>> {
  return (await listGameMatchesUseCase(session, 'uno-style')) as ServiceResult<
    ListUnoMatchesResult,
    never
  >;
}

export async function createUnoMatchUseCase(
  session: AppSession | null,
  input: CreateUnoMatchInput,
): Promise<ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>> {
  return (await createGameMatchUseCase(
    session,
    'uno-style',
    input,
  )) as ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>;
}

export async function getUnoMatchSnapshotUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>> {
  return (await getGameMatchSnapshotUseCase(
    session,
    'uno-style',
    matchId,
  )) as ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>;
}

export async function getUnoMatchRealtimeUseCase(
  session: AppSession | null,
  matchId: string,
  input: GameMatchRealtimeInput = {},
): Promise<ServiceResult<PersistedUnoMatchRealtimeDto, MatchUseCaseError>> {
  return (await getGameMatchRealtimeUseCase(
    session,
    'uno-style',
    matchId,
    input,
  )) as ServiceResult<PersistedUnoMatchRealtimeDto, MatchUseCaseError>;
}

export async function submitUnoMoveUseCase(
  session: AppSession | null,
  matchId: string,
  input: SubmitUnoMoveInput | { move: unknown },
): Promise<ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>> {
  return (await submitGameMoveUseCase(
    session,
    'uno-style',
    matchId,
    input,
  )) as ServiceResult<PersistedUnoMatchSnapshotDto, MatchUseCaseError>;
}

export async function getUnoReplayUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedUnoReplayDto, MatchUseCaseError>> {
  return (await getGameReplayUseCase(
    session,
    'uno-style',
    matchId,
  )) as ServiceResult<PersistedUnoReplayDto, MatchUseCaseError>;
}

export async function listTcgMatchesUseCase(
  session: AppSession | null,
): Promise<ServiceResult<ListTcgMatchesResult, never>> {
  return (await listGameMatchesUseCase(
    session,
    'arcane-duel',
  )) as ServiceResult<ListTcgMatchesResult, never>;
}

export async function createTcgMatchUseCase(
  session: AppSession | null,
  input: CreateTcgMatchInput,
): Promise<ServiceResult<PersistedTcgMatchSnapshotDto, MatchUseCaseError>> {
  return (await createGameMatchUseCase(
    session,
    'arcane-duel',
    input,
  )) as ServiceResult<PersistedTcgMatchSnapshotDto, MatchUseCaseError>;
}

export async function getTcgMatchSnapshotUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedTcgMatchSnapshotDto, MatchUseCaseError>> {
  return (await getGameMatchSnapshotUseCase(
    session,
    'arcane-duel',
    matchId,
  )) as ServiceResult<PersistedTcgMatchSnapshotDto, MatchUseCaseError>;
}

export async function getTcgMatchRealtimeUseCase(
  session: AppSession | null,
  matchId: string,
  input: GameMatchRealtimeInput = {},
): Promise<ServiceResult<PersistedTcgMatchRealtimeDto, MatchUseCaseError>> {
  return (await getGameMatchRealtimeUseCase(
    session,
    'arcane-duel',
    matchId,
    input,
  )) as ServiceResult<PersistedTcgMatchRealtimeDto, MatchUseCaseError>;
}

export async function submitTcgMoveUseCase(
  session: AppSession | null,
  matchId: string,
  input: SubmitTcgMoveInput | { move: unknown },
): Promise<ServiceResult<PersistedTcgMatchSnapshotDto, MatchUseCaseError>> {
  return (await submitGameMoveUseCase(
    session,
    'arcane-duel',
    matchId,
    input,
  )) as ServiceResult<PersistedTcgMatchSnapshotDto, MatchUseCaseError>;
}

export async function getTcgReplayUseCase(
  session: AppSession | null,
  matchId: string,
): Promise<ServiceResult<PersistedTcgReplayDto, MatchUseCaseError>> {
  return (await getGameReplayUseCase(
    session,
    'arcane-duel',
    matchId,
  )) as ServiceResult<PersistedTcgReplayDto, MatchUseCaseError>;
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
