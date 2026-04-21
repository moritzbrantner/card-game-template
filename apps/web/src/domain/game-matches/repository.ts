import { and, desc, eq, inArray } from 'drizzle-orm';
import { DEFAULT_RNG_VERSION, GAME_ENGINE_VERSION } from '@repo/game-engine';
import { UNO_GAME_VERSION, UNO_RULESET_VERSION } from '@repo/game-uno';

import { getDb } from '@/src/db/client';
import { gameMatchMoves, gameMatchParticipants, gameMatches } from '@/src/db/schema';

import type {
  GameMatchAnalysisRecord,
  GameMatchParticipantRecord,
  MatchOwnerIdentity,
  PersistedUnoMatchRecord,
} from './contracts';

type DbExecutor = Pick<ReturnType<typeof getDb>, 'select' | 'selectDistinct' | 'insert' | 'update'>;

export class StaleMatchProgressError extends Error {
  constructor(matchId: string) {
    super(`Match ${matchId} was updated by another request.`);
    this.name = 'StaleMatchProgressError';
  }
}

function toIsoString(value: Date | null) {
  return value?.toISOString() ?? null;
}

function mapParticipantRow(row: typeof gameMatchParticipants.$inferSelect): GameMatchParticipantRecord {
  return {
    playerId: row.playerId,
    seat: row.seat,
    displayName: row.displayName,
    identity: row.isBot
      ? { kind: 'bot' }
      : row.identityKind === 'account' && row.accountId
        ? { kind: 'account', accountId: row.accountId }
        : { kind: 'guest', guestId: row.guestId ?? '' },
    isBot: row.isBot,
  };
}

function deriveReplayMetadata(match: typeof gameMatches.$inferSelect): PersistedUnoMatchRecord['replayMetadata'] {
  if (match.replayFormatVersion < 2) {
    return null;
  }

  return {
    engineVersion: GAME_ENGINE_VERSION,
    gameVersion: UNO_GAME_VERSION,
    rngVersion: DEFAULT_RNG_VERSION,
    rulesetVersion: UNO_RULESET_VERSION,
    setup: {
      seed: match.initialStateJson.state.seed,
      rules: match.initialStateJson.state.rules,
    },
  };
}

function mapMatchRecord(input: {
  match: typeof gameMatches.$inferSelect;
  participants: readonly typeof gameMatchParticipants.$inferSelect[];
  moves: readonly typeof gameMatchMoves.$inferSelect[];
}): PersistedUnoMatchRecord {
  return {
    matchId: input.match.id,
    gameId: 'uno-style',
    status: input.match.status as PersistedUnoMatchRecord['status'],
    executionMode: 'server-authoritative',
    replayFormatVersion: input.match.replayFormatVersion as PersistedUnoMatchRecord['replayFormatVersion'],
    startedAt: input.match.startedAt.toISOString(),
    finishedAt: toIsoString(input.match.finishedAt),
    updatedAt: input.match.updatedAt.toISOString(),
    createdAt: input.match.createdAt.toISOString(),
    createdBy: input.match.createdByKind === 'account'
      ? { kind: 'account', accountId: input.match.createdByAccountId ?? '' }
      : { kind: 'guest', guestId: input.match.createdByGuestId ?? '' },
    initialState: input.match.initialStateJson,
    latestState: input.match.latestStateJson,
    result: input.match.resultJson,
    analysis: input.match.analysisJson as GameMatchAnalysisRecord | null,
    replayMetadata: deriveReplayMetadata(input.match),
    lastSequence: input.match.lastSequence,
    participants: [...input.participants].sort((left, right) => left.seat - right.seat).map(mapParticipantRow),
    acceptedMoves: [...input.moves]
      .sort((left, right) => left.sequence - right.sequence)
      .map((move) => ({
        sequence: move.sequence,
        acceptedAt: move.acceptedAt.toISOString(),
        move: move.moveJson,
      })),
  };
}

function getOwnerParticipantFilter(identity: MatchOwnerIdentity) {
  return identity.kind === 'account'
    ? and(eq(gameMatchParticipants.accountId, identity.accountId), eq(gameMatchParticipants.isBot, false))
    : and(eq(gameMatchParticipants.guestId, identity.guestId), eq(gameMatchParticipants.isBot, false));
}

export async function listOwnedUnoMatches(db: DbExecutor, identity: MatchOwnerIdentity) {
  const ownedMatchRows = await db
    .selectDistinct({ matchId: gameMatchParticipants.matchId })
    .from(gameMatchParticipants)
    .where(getOwnerParticipantFilter(identity));

  const ownedMatchIds = ownedMatchRows.map((row) => row.matchId);

  if (ownedMatchIds.length === 0) {
    return [];
  }

  const [matches, participants] = await Promise.all([
    db
      .select()
      .from(gameMatches)
      .where(and(eq(gameMatches.gameId, 'uno-style'), inArray(gameMatches.id, ownedMatchIds)))
      .orderBy(desc(gameMatches.updatedAt)),
    db
      .select()
      .from(gameMatchParticipants)
      .where(inArray(gameMatchParticipants.matchId, ownedMatchIds)),
  ]);

  const participantsByMatchId = new Map<string, typeof participants>();

  for (const participant of participants) {
    const existing = participantsByMatchId.get(participant.matchId) ?? [];
    existing.push(participant);
    participantsByMatchId.set(participant.matchId, existing);
  }

  return matches.map((match) =>
    mapMatchRecord({
      match,
      participants: participantsByMatchId.get(match.id) ?? [],
      moves: [],
    }),
  );
}

export async function loadOwnedUnoMatch(db: DbExecutor, identity: MatchOwnerIdentity, matchId: string) {
  const [owned] = await db
    .select({ matchId: gameMatchParticipants.matchId })
    .from(gameMatchParticipants)
    .where(and(eq(gameMatchParticipants.matchId, matchId), getOwnerParticipantFilter(identity)))
    .limit(1);

  if (!owned) {
    return null;
  }

  const [match] = await db
    .select()
    .from(gameMatches)
    .where(and(eq(gameMatches.id, matchId), eq(gameMatches.gameId, 'uno-style')))
    .limit(1);

  if (!match) {
    return null;
  }

  const [participants, moves] = await Promise.all([
    db
      .select()
      .from(gameMatchParticipants)
      .where(eq(gameMatchParticipants.matchId, matchId)),
    db
      .select()
      .from(gameMatchMoves)
      .where(eq(gameMatchMoves.matchId, matchId))
      .orderBy(gameMatchMoves.sequence),
  ]);

  return mapMatchRecord({
    match,
    participants,
    moves,
  });
}

export async function createUnoMatch(
  db: DbExecutor,
  input: {
    match: typeof gameMatches.$inferInsert;
    participants: readonly typeof gameMatchParticipants.$inferInsert[];
    moves: readonly typeof gameMatchMoves.$inferInsert[];
  },
) {
  await db.insert(gameMatches).values(input.match);

  if (input.participants.length > 0) {
    await db.insert(gameMatchParticipants).values([...input.participants]);
  }

  if (input.moves.length > 0) {
    await db.insert(gameMatchMoves).values([...input.moves]);
  }
}

export async function appendUnoMatchProgress(
  db: DbExecutor,
  input: {
    matchId: string;
    latestStateJson: typeof gameMatches.$inferInsert['latestStateJson'];
    resultJson: typeof gameMatches.$inferInsert['resultJson'];
    analysisJson: typeof gameMatches.$inferInsert['analysisJson'];
    status: typeof gameMatches.$inferInsert['status'];
    finishedAt: Date | null;
    updatedAt: Date;
    lastSequence: number;
    previousLastSequence: number;
    moves: readonly typeof gameMatchMoves.$inferInsert[];
  },
) {
  const updatedRows = await db
    .update(gameMatches)
    .set({
      latestStateJson: input.latestStateJson,
      resultJson: input.resultJson,
      analysisJson: input.analysisJson,
      status: input.status,
      finishedAt: input.finishedAt,
      updatedAt: input.updatedAt,
      lastSequence: input.lastSequence,
    })
    .where(and(
      eq(gameMatches.id, input.matchId),
      eq(gameMatches.lastSequence, input.previousLastSequence),
      eq(gameMatches.status, 'active'),
    ))
    .returning({ id: gameMatches.id });

  if (updatedRows.length === 0) {
    throw new StaleMatchProgressError(input.matchId);
  }

  if (input.moves.length > 0) {
    await db.insert(gameMatchMoves).values([...input.moves]);
  }
}

export async function abandonUnoMatch(
  db: DbExecutor,
  input: {
    matchId: string;
    updatedAt: Date;
    finishedAt: Date;
    analysisJson: typeof gameMatches.$inferInsert['analysisJson'];
    resultJson: typeof gameMatches.$inferInsert['resultJson'];
  },
) {
  await db
    .update(gameMatches)
    .set({
      status: 'abandoned',
      finishedAt: input.finishedAt,
      updatedAt: input.updatedAt,
      analysisJson: input.analysisJson,
      resultJson: input.resultJson,
    })
    .where(eq(gameMatches.id, input.matchId));
}
