import { randomUUID } from 'node:crypto';

import { IllegalMoveError } from '@repo/game-engine';
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
import { listUnoBotAiProfiles } from '@/src/domain/game-bot-ai/service';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';

import type {
  CreatePokerMatchInput,
  CreateUnoMatchInput,
  ListPokerMatchesResult,
  ListUnoMatchesResult,
  MatchOwnerIdentity,
  PersistedGameMatchRecord,
  PersistedPokerMatchRecord,
  PersistedPokerMatchSnapshotDto,
  PersistedPokerReplayDto,
  PersistedUnoMatchRecord,
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

export async function createPokerMatchUseCase(
  session: AppSession | null,
  input: CreatePokerMatchInput,
): Promise<ServiceResult<PersistedPokerMatchSnapshotDto, MatchUseCaseError>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, true);

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
      processPokerBots(serverSession, persistedMatch.participants);

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
