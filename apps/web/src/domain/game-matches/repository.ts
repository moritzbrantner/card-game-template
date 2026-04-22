import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { createReplayMetadata } from '@repo/game-engine';
import type { GameId, GameMove, MatchState } from '@repo/game-contracts';

import { getDb } from '@/src/db/client';
import { gameMatchMoves, gameMatchParticipants, gameMatches } from '@/src/db/schema';

import type {
  GenericGameMatchAnalysisRecord,
  GameMatchParticipantRecord,
  MatchOwnerIdentity,
  PersistedGameMatchRecord,
} from './contracts';
import { createRegisteredGameAdapter } from './registry';

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

function extractReplaySetup(initialState: MatchState<unknown>) {
  const state = initialState.state;

  if (!state || typeof state !== 'object') {
    return {};
  }

  const setup: Record<string, unknown> = {};

  if ('seed' in state) {
    setup.seed = state.seed;
  }

  if ('rules' in state) {
    setup.rules = state.rules;
  }

  return setup;
}

function deriveReplayMetadata(match: typeof gameMatches.$inferSelect): PersistedGameMatchRecord['replayMetadata'] {
  if (match.replayFormatVersion < 2) {
    return null;
  }

  const adapter = createRegisteredGameAdapter(match.gameId);

  if (!adapter) {
    return null;
  }

  const setup = extractReplaySetup(match.initialStateJson);
  const validatedSetup = adapter.validateSetup ? adapter.validateSetup(setup) : setup;

  return createReplayMetadata(adapter, validatedSetup);
}

function mapMatchRecord<TRecord extends PersistedGameMatchRecord = PersistedGameMatchRecord>(input: {
  match: typeof gameMatches.$inferSelect;
  participants: readonly typeof gameMatchParticipants.$inferSelect[];
  moves: readonly typeof gameMatchMoves.$inferSelect[];
}): TRecord {
  return {
    matchId: input.match.id,
    gameId: input.match.gameId,
    status: input.match.status as PersistedGameMatchRecord['status'],
    executionMode: 'server-authoritative',
    replayFormatVersion: input.match.replayFormatVersion as PersistedGameMatchRecord['replayFormatVersion'],
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
    analysis: input.match.analysisJson as GenericGameMatchAnalysisRecord | null,
    replayMetadata: deriveReplayMetadata(input.match),
    lastSequence: input.match.lastSequence,
    participants: [...input.participants].sort((left, right) => left.seat - right.seat).map(mapParticipantRow),
    acceptedMoves: [...input.moves]
      .sort((left, right) => left.sequence - right.sequence)
      .map((move) => ({
        sequence: move.sequence,
        acceptedAt: move.acceptedAt.toISOString(),
        move: move.moveJson as GameMove,
      })),
  } as unknown as TRecord;
}

function getOwnerParticipantFilter(identity: MatchOwnerIdentity) {
  return identity.kind === 'account'
    ? and(eq(gameMatchParticipants.accountId, identity.accountId), eq(gameMatchParticipants.isBot, false))
    : and(eq(gameMatchParticipants.guestId, identity.guestId), eq(gameMatchParticipants.isBot, false));
}

export async function listOwnedGameMatches<TRecord extends PersistedGameMatchRecord = PersistedGameMatchRecord>(
  db: DbExecutor,
  identity: MatchOwnerIdentity,
  options: {
    gameId?: GameId;
  } = {},
) {
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
      .where(options.gameId
        ? and(eq(gameMatches.gameId, options.gameId), inArray(gameMatches.id, ownedMatchIds))
        : inArray(gameMatches.id, ownedMatchIds))
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
    mapMatchRecord<TRecord>({
      match,
      participants: participantsByMatchId.get(match.id) ?? [],
      moves: [],
    }),
  );
}

export async function listAccountGameHistoryMatches<
  TRecord extends PersistedGameMatchRecord = PersistedGameMatchRecord,
>(
  db: DbExecutor,
  accountId: string,
  options: {
    gameId?: GameId;
  } = {},
) {
  const accountMatchRows = await db
    .selectDistinct({ matchId: gameMatchParticipants.matchId })
    .from(gameMatchParticipants)
    .where(and(eq(gameMatchParticipants.accountId, accountId), eq(gameMatchParticipants.isBot, false)));

  const accountMatchIds = accountMatchRows.map((row) => row.matchId);

  if (accountMatchIds.length === 0) {
    return [];
  }

  const matchFilter = options.gameId
    ? and(
        eq(gameMatches.gameId, options.gameId),
        inArray(gameMatches.id, accountMatchIds),
        ne(gameMatches.status, 'active'),
      )
    : and(inArray(gameMatches.id, accountMatchIds), ne(gameMatches.status, 'active'));

  const matches = await db
    .select()
    .from(gameMatches)
    .where(matchFilter)
    .orderBy(desc(gameMatches.updatedAt));

  const historyMatchIds = matches.map((match) => match.id);

  if (historyMatchIds.length === 0) {
    return [];
  }

  const participants = await db
    .select()
    .from(gameMatchParticipants)
    .where(inArray(gameMatchParticipants.matchId, historyMatchIds));

  const participantsByMatchId = new Map<string, typeof participants>();

  for (const participant of participants) {
    const existing = participantsByMatchId.get(participant.matchId) ?? [];
    existing.push(participant);
    participantsByMatchId.set(participant.matchId, existing);
  }

  return matches.map((match) =>
    mapMatchRecord<TRecord>({
      match,
      participants: participantsByMatchId.get(match.id) ?? [],
      moves: [],
    }),
  );
}

export async function loadOwnedGameMatch<TRecord extends PersistedGameMatchRecord = PersistedGameMatchRecord>(
  db: DbExecutor,
  identity: MatchOwnerIdentity,
  matchId: string,
  options: {
    gameId?: GameId;
  } = {},
) {
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
    .where(options.gameId
      ? and(eq(gameMatches.id, matchId), eq(gameMatches.gameId, options.gameId))
      : eq(gameMatches.id, matchId))
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

  return mapMatchRecord<TRecord>({
    match,
    participants,
    moves,
  });
}

export async function createGameMatch(
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

export async function appendGameMatchProgress(
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

export async function abandonGameMatch(
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
