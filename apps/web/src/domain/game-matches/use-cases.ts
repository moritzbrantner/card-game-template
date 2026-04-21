import { randomUUID } from 'node:crypto';

import { IllegalMoveError } from '@repo/game-engine';
import { createUnoAdapter, type UnoMove, type UnoState } from '@repo/game-uno';
import { resumeServerGameSession, type ServerGameSession } from '@repo/game-session';

import type { AppSession } from '@/src/auth';
import { getDb } from '@/src/db/client';
import { listUnoBotAiProfiles } from '@/src/domain/game-bot-ai/service';
import { failure, success, type ServiceResult } from '@/src/domain/shared/result';

import type {
  CreateUnoMatchInput,
  ListUnoMatchesResult,
  MatchOwnerIdentity,
  PersistedUnoMatchRecord,
  PersistedUnoMatchSnapshotDto,
  PersistedUnoReplayDto,
  SubmitUnoMoveInput,
} from './contracts';
import { resolveExistingMatchOwnerIdentity, resolveOrCreateMatchOwnerIdentity } from './identity';
import {
  abandonUnoMatch,
  appendUnoMatchProgress,
  createUnoMatch,
  listOwnedUnoMatches,
  loadOwnedUnoMatch,
  StaleMatchProgressError,
} from './repository';
import {
  buildPersistedUnoMatchRecord,
  buildPersistedUnoMatchSnapshotDto,
  buildPersistedUnoMatchSummaryDto,
  buildPersistedUnoReplayDto,
  createReplayFromPersistedMatch,
  createUnoMatchSession,
  processUnoBots,
} from './service';

type MatchUseCaseError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT';
  message: string;
};
type UnoServerSession = ServerGameSession<UnoState, UnoMove>;

function isoNow() {
  return new Date().toISOString();
}

function mapMissingIdentity() {
  return failure<MatchUseCaseError>({
    code: 'NOT_FOUND',
    message: 'Match not found.',
  });
}

function splitSummaries(matches: readonly PersistedUnoMatchRecord[]): ListUnoMatchesResult {
  return {
    active: matches
      .filter((match) => match.status === 'active')
      .map(buildPersistedUnoMatchSummaryDto),
    recent: matches
      .filter((match) => match.status !== 'active')
      .map(buildPersistedUnoMatchSummaryDto),
  };
}

async function resolveOwnedIdentity(session: AppSession | null, createGuest: boolean) {
  return createGuest
    ? resolveOrCreateMatchOwnerIdentity(session)
    : resolveExistingMatchOwnerIdentity(session);
}

function buildMoveRows(match: PersistedUnoMatchRecord, previousLastSequence: number) {
  return match.acceptedMoves.slice(previousLastSequence).map((acceptedMove) => ({
    matchId: match.matchId,
    sequence: acceptedMove.sequence,
    acceptedAt: new Date(acceptedMove.acceptedAt),
    playerId: acceptedMove.move.playerId,
    moveKind: acceptedMove.move.kind,
    moveJson: acceptedMove.move,
  }));
}

function createResumedSession(match: PersistedUnoMatchRecord, now: () => string) {
  return resumeServerGameSession({
    adapter: createUnoAdapter(),
    participants: match.participants.map((participant) => ({
      playerId: participant.playerId,
      displayName: participant.displayName,
      seat: participant.seat,
      controller: participant.isBot ? 'bot' : 'human',
      ...(participant.identity.kind === 'account' ? { accountId: participant.identity.accountId } : {}),
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

export async function listUnoMatchesUseCase(
  session: AppSession | null,
): Promise<ServiceResult<ListUnoMatchesResult, never>> {
  const resolvedIdentity = await resolveOwnedIdentity(session, true);
  const matches = await listOwnedUnoMatches(getDb(), resolvedIdentity.identity as MatchOwnerIdentity);
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

      await createUnoMatch(tx, {
        match: {
          id: persistedMatch.matchId,
          gameId: persistedMatch.gameId,
          status: persistedMatch.status,
          executionMode: persistedMatch.executionMode,
          replayFormatVersion: persistedMatch.replayFormatVersion,
          startedAt: new Date(persistedMatch.startedAt),
          finishedAt: persistedMatch.finishedAt ? new Date(persistedMatch.finishedAt) : null,
          updatedAt: new Date(persistedMatch.updatedAt),
          createdAt: new Date(persistedMatch.createdAt),
          createdByKind: persistedMatch.createdBy.kind,
          createdByAccountId:
            persistedMatch.createdBy.kind === 'account' ? persistedMatch.createdBy.accountId : null,
          createdByGuestId:
            persistedMatch.createdBy.kind === 'guest' ? persistedMatch.createdBy.guestId : null,
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
          accountId: participant.identity.kind === 'account' ? participant.identity.accountId : null,
          guestId: participant.identity.kind === 'guest' ? participant.identity.guestId : null,
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
      message: error instanceof Error ? error.message : 'Unable to create match.',
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

  const match = await loadOwnedUnoMatch(getDb(), resolvedIdentity.identity as MatchOwnerIdentity, matchId);

  if (!match) {
    return mapMissingIdentity();
  }

  return success(buildPersistedUnoMatchSnapshotDto(match, resolvedIdentity.identity as MatchOwnerIdentity));
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
      const persistedMatch = await loadOwnedUnoMatch(tx, resolvedIdentity.identity as MatchOwnerIdentity, matchId);

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

      await appendUnoMatchProgress(tx, {
        matchId: updatedMatch.matchId,
        latestStateJson: updatedMatch.latestState,
        resultJson: updatedMatch.result,
        analysisJson: updatedMatch.analysis,
        status: updatedMatch.status,
        finishedAt: updatedMatch.finishedAt ? new Date(updatedMatch.finishedAt) : null,
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

    if (error && typeof error === 'object' && 'ok' in error && error.ok === false) {
      return error as ServiceResult<never, MatchUseCaseError>;
    }

    return failure({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unable to submit move.',
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
    const persistedMatch = await loadOwnedUnoMatch(tx, resolvedIdentity.identity as MatchOwnerIdentity, matchId);

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

    await abandonUnoMatch(tx, {
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

  const match = await loadOwnedUnoMatch(getDb(), resolvedIdentity.identity as MatchOwnerIdentity, matchId);

  if (!match) {
    return mapMissingIdentity();
  }

  return success(buildPersistedUnoReplayDto(match));
}
