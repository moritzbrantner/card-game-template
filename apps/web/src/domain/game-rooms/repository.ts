import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { gameRooms, gameRoomSeats } from '@/src/db/schema';
import type { MatchOwnerIdentity } from '@/src/domain/game-matches/contracts';

import type {
  GameRoomParticipantRecord,
  PersistedGameRoomRecord,
} from './contracts';

type DbExecutor = Pick<
  ReturnType<typeof getDb>,
  'select' | 'selectDistinct' | 'insert' | 'update'
>;

export class StaleGameRoomError extends Error {
  constructor(roomId: string) {
    super(`Room ${roomId} was updated by another request.`);
    this.name = 'StaleGameRoomError';
  }
}

function toIsoString(value: Date) {
  return value.toISOString();
}

function latestDate(dates: readonly Date[]) {
  return dates.reduce((latest, candidate) =>
    candidate.getTime() > latest.getTime() ? candidate : latest,
  );
}

function mapSeatRow(
  row: typeof gameRoomSeats.$inferSelect,
): GameRoomParticipantRecord {
  return {
    roomId: row.roomId,
    playerId: row.playerId,
    seat: row.seat,
    displayName: row.displayName,
    identity:
      row.identityKind === 'account' && row.accountId
        ? { kind: 'account', accountId: row.accountId }
        : { kind: 'guest', guestId: row.guestId ?? '' },
    ready: row.ready,
    connectionStatus:
      row.connectionStatus as GameRoomParticipantRecord['connectionStatus'],
    joinedAt: toIsoString(row.joinedAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mapRoomRecord(input: {
  room: typeof gameRooms.$inferSelect;
  seats: readonly (typeof gameRoomSeats.$inferSelect)[];
}): PersistedGameRoomRecord {
  const updatedAt = latestDate([
    input.room.updatedAt,
    ...input.seats.map((seat) => seat.updatedAt),
  ]);

  return {
    roomId: input.room.id,
    roomName: input.room.roomName,
    gameId: input.room.gameId,
    status: input.room.status as PersistedGameRoomRecord['status'],
    visibility: input.room.visibility as PersistedGameRoomRecord['visibility'],
    executionMode: input.room
      .executionMode as PersistedGameRoomRecord['executionMode'],
    maxPlayers: input.room.maxPlayers,
    botCount: input.room.botCount,
    hostPlayerId: input.room.hostPlayerId,
    activeMatchId: input.room.activeMatchId,
    createdAt: toIsoString(input.room.createdAt),
    updatedAt: toIsoString(updatedAt),
    createdBy:
      input.room.createdByKind === 'account'
        ? {
            kind: 'account',
            accountId: input.room.createdByAccountId ?? '',
          }
        : {
            kind: 'guest',
            guestId: input.room.createdByGuestId ?? '',
          },
    participants: [...input.seats]
      .sort((left, right) => left.seat - right.seat)
      .map(mapSeatRow),
  };
}

function getSeatIdentityFilter(identity: MatchOwnerIdentity) {
  return identity.kind === 'account'
    ? eq(gameRoomSeats.accountId, identity.accountId)
    : eq(gameRoomSeats.guestId, identity.guestId);
}

export function findRoomParticipantByIdentity(
  room: PersistedGameRoomRecord,
  identity: MatchOwnerIdentity,
) {
  return (
    room.participants.find((participant) =>
      identity.kind === 'account'
        ? participant.identity.kind === 'account' &&
          participant.identity.accountId === identity.accountId
        : participant.identity.kind === 'guest' &&
          participant.identity.guestId === identity.guestId,
    ) ?? null
  );
}

export async function listParticipatingGameRooms(
  db: DbExecutor,
  identity: MatchOwnerIdentity,
) {
  const participatingRows = await db
    .selectDistinct({ roomId: gameRoomSeats.roomId })
    .from(gameRoomSeats)
    .where(getSeatIdentityFilter(identity));

  const roomIds = participatingRows.map((row) => row.roomId);

  if (roomIds.length === 0) {
    return [];
  }

  const [rooms, seats] = await Promise.all([
    db
      .select()
      .from(gameRooms)
      .where(inArray(gameRooms.id, roomIds))
      .orderBy(desc(gameRooms.updatedAt)),
    db
      .select()
      .from(gameRoomSeats)
      .where(inArray(gameRoomSeats.roomId, roomIds)),
  ]);
  const seatsByRoomId = new Map<string, typeof seats>();

  for (const seat of seats) {
    const existing = seatsByRoomId.get(seat.roomId) ?? [];
    existing.push(seat);
    seatsByRoomId.set(seat.roomId, existing);
  }

  return rooms.map((room) =>
    mapRoomRecord({
      room,
      seats: seatsByRoomId.get(room.id) ?? [],
    }),
  );
}

export async function loadGameRoom(db: DbExecutor, roomId: string) {
  const [room] = await db
    .select()
    .from(gameRooms)
    .where(eq(gameRooms.id, roomId))
    .limit(1);

  if (!room) {
    return null;
  }

  const seats = await db
    .select()
    .from(gameRoomSeats)
    .where(eq(gameRoomSeats.roomId, roomId));

  return mapRoomRecord({ room, seats });
}

export async function loadParticipatingGameRoom(
  db: DbExecutor,
  identity: MatchOwnerIdentity,
  roomId: string,
) {
  const [owned] = await db
    .select({ roomId: gameRoomSeats.roomId })
    .from(gameRoomSeats)
    .where(
      and(eq(gameRoomSeats.roomId, roomId), getSeatIdentityFilter(identity)),
    )
    .limit(1);

  if (!owned) {
    return null;
  }

  return loadGameRoom(db, roomId);
}

export async function createGameRoom(
  db: DbExecutor,
  input: {
    room: typeof gameRooms.$inferInsert;
    seats: readonly (typeof gameRoomSeats.$inferInsert)[];
  },
) {
  await db.insert(gameRooms).values(input.room);

  if (input.seats.length > 0) {
    await db.insert(gameRoomSeats).values([...input.seats]);
  }
}

export async function addGameRoomSeat(
  db: DbExecutor,
  input: typeof gameRoomSeats.$inferInsert,
) {
  await db.insert(gameRoomSeats).values(input);
  await db
    .update(gameRooms)
    .set({ updatedAt: input.updatedAt })
    .where(eq(gameRooms.id, input.roomId));
}

export async function updateGameRoomSeatReady(
  db: DbExecutor,
  input: {
    roomId: string;
    playerId: string;
    ready: boolean;
    updatedAt: Date;
  },
) {
  await db
    .update(gameRoomSeats)
    .set({
      ready: input.ready,
      connectionStatus: 'connected',
      updatedAt: input.updatedAt,
    })
    .where(
      and(
        eq(gameRoomSeats.roomId, input.roomId),
        eq(gameRoomSeats.playerId, input.playerId),
      ),
    );
  await db
    .update(gameRooms)
    .set({ updatedAt: input.updatedAt })
    .where(eq(gameRooms.id, input.roomId));
}

export async function startPersistedGameRoom(
  db: DbExecutor,
  input: {
    roomId: string;
    activeMatchId: string;
    updatedAt: Date;
  },
) {
  const updatedRows = await db
    .update(gameRooms)
    .set({
      status: 'active',
      activeMatchId: input.activeMatchId,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(gameRooms.id, input.roomId), eq(gameRooms.status, 'open')))
    .returning({ id: gameRooms.id });

  if (updatedRows.length === 0) {
    throw new StaleGameRoomError(input.roomId);
  }
}

export async function closePersistedGameRoom(
  db: DbExecutor,
  input: {
    roomId: string;
    updatedAt: Date;
  },
) {
  await db
    .update(gameRooms)
    .set({
      status: 'closed',
      updatedAt: input.updatedAt,
    })
    .where(eq(gameRooms.id, input.roomId));
}
