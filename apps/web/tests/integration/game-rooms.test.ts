import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { and, eq } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import {
  gameRoomSeats,
  gameRooms,
} from '@/src/db/schema';

async function clearRoomTables() {
  const db = getDb();
  await db.delete(gameRoomSeats);
  await db.delete(gameRooms);
}

function mockGuestIdentity(guestId: string, displayName: string | null = null) {
  vi.doMock('@/src/domain/game-matches/identity', () => ({
    resolveOrCreateMatchOwnerIdentity: vi.fn().mockResolvedValue({
      identity: {
        kind: 'guest',
        guestId,
      },
      displayName,
    }),
    resolveExistingMatchOwnerIdentity: vi.fn().mockResolvedValue({
      identity: {
        kind: 'guest',
        guestId,
      },
      displayName,
    }),
  }));
}

beforeEach(async () => {
  await clearRoomTables();
});

afterEach(async () => {
  await clearRoomTables();
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock('@/src/domain/game-matches/identity');
});

describe('game rooms', () => {
  it('lets two guest humans join a private room, ready up, and be started by the host', async () => {
    mockGuestIdentity('guest-host', 'Host Player');
    const { createPrivateGameRoomUseCase } = await import(
      '@/src/domain/game-rooms/use-cases'
    );

    const created = await createPrivateGameRoomUseCase(null, {
      gameId: 'uno-style',
      displayName: 'Alice',
      maxPlayers: 4,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(created.data).toEqual(
      expect.objectContaining({
        gameId: 'uno-style',
        status: 'open',
        visibility: 'private',
        maxPlayers: 4,
        activeMatchId: null,
      }),
    );
    expect(created.data.seats).toEqual([
      expect.objectContaining({
        seat: 1,
        displayName: 'Alice',
        ready: false,
      }),
    ]);

    vi.resetModules();
    mockGuestIdentity('guest-joiner', 'Joiner Player');
    const { joinPrivateGameRoomUseCase } = await import(
      '@/src/domain/game-rooms/use-cases'
    );

    const joined = await joinPrivateGameRoomUseCase(null, created.data.roomId, {
      displayName: 'Bob',
    });

    expect(joined.ok).toBe(true);
    if (!joined.ok) {
      return;
    }

    expect(joined.data.seats.map((seat) => seat.displayName)).toEqual([
      'Alice',
      'Bob',
    ]);
    expect(joined.data.canStart).toBe(false);

    vi.resetModules();
    mockGuestIdentity('guest-host', 'Host Player');
    const { setGameRoomReadyUseCase: setHostReady } = await import(
      '@/src/domain/game-rooms/use-cases'
    );
    const hostReady = await setHostReady(null, created.data.roomId, {
      ready: true,
    });

    expect(hostReady.ok).toBe(true);

    vi.resetModules();
    mockGuestIdentity('guest-joiner', 'Joiner Player');
    const { setGameRoomReadyUseCase: setJoinerReady } = await import(
      '@/src/domain/game-rooms/use-cases'
    );
    const joinerReady = await setJoinerReady(null, created.data.roomId, {
      ready: true,
    });

    expect(joinerReady.ok).toBe(true);
    if (!joinerReady.ok) {
      return;
    }
    expect(joinerReady.data.canStart).toBe(true);

    vi.resetModules();
    mockGuestIdentity('guest-host', 'Host Player');
    const { getGameRoomRealtimeUseCase } = await import(
      '@/src/domain/game-rooms/use-cases'
    );
    const roomUpdates = await getGameRoomRealtimeUseCase(
      null,
      created.data.roomId,
      {
        sinceUpdatedAt: '2000-01-01T00:00:00.000Z',
      },
    );

    expect(roomUpdates).toEqual({
      ok: true,
      data: expect.objectContaining({
        hasChanges: true,
        events: [
          expect.objectContaining({
            type: 'room.updated',
            roomId: created.data.roomId,
          }),
        ],
        room: expect.objectContaining({
          canStart: true,
          seats: expect.arrayContaining([
            expect.objectContaining({
              displayName: 'Bob',
              ready: true,
            }),
          ]),
        }),
      }),
    });

    if (roomUpdates.ok) {
      const unchanged = await getGameRoomRealtimeUseCase(
        null,
        created.data.roomId,
        {
          sinceUpdatedAt: roomUpdates.data.cursor.updatedAt,
        },
      );

      expect(unchanged).toEqual({
        ok: true,
        data: expect.objectContaining({
          hasChanges: false,
          events: [],
        }),
      });
    }

    vi.resetModules();
    mockGuestIdentity('guest-host', 'Host Player');
    const { startGameRoomUseCase: startAsHost } = await import(
      '@/src/domain/game-rooms/use-cases'
    );
    const started = await startAsHost(null, created.data.roomId);

    expect(started).toEqual({
      ok: true,
      data: expect.objectContaining({
        roomId: created.data.roomId,
        status: 'active',
        activeMatchId: expect.any(String),
        canStart: false,
      }),
    });

    const db = getDb();
    const [room] = await db
      .select()
      .from(gameRooms)
      .where(eq(gameRooms.id, created.data.roomId));
    const seats = await db
      .select()
      .from(gameRoomSeats)
      .where(eq(gameRoomSeats.roomId, created.data.roomId));

    expect(room?.status).toBe('active');
    expect(room?.activeMatchId).toBeTruthy();
    expect(seats).toHaveLength(2);
    expect(seats.every((seat) => seat.ready)).toBe(true);
  });

  it('rejects non-host start attempts and start attempts before every player is ready', async () => {
    mockGuestIdentity('guest-host', 'Host Player');
    const { createPrivateGameRoomUseCase } = await import(
      '@/src/domain/game-rooms/use-cases'
    );
    const created = await createPrivateGameRoomUseCase(null, {
      gameId: 'texas-holdem',
      displayName: 'Host',
      maxPlayers: 2,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    vi.resetModules();
    mockGuestIdentity('guest-joiner', 'Joiner Player');
    const {
      joinPrivateGameRoomUseCase,
      startGameRoomUseCase,
    } = await import('@/src/domain/game-rooms/use-cases');

    const joined = await joinPrivateGameRoomUseCase(null, created.data.roomId, {
      displayName: 'Joiner',
    });
    expect(joined.ok).toBe(true);

    const nonHostStart = await startGameRoomUseCase(null, created.data.roomId);
    expect(nonHostStart).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'FORBIDDEN',
      }),
    });

    vi.resetModules();
    mockGuestIdentity('guest-host', 'Host Player');
    const { startGameRoomUseCase: startAsHost } = await import(
      '@/src/domain/game-rooms/use-cases'
    );
    const notReadyStart = await startAsHost(null, created.data.roomId);

    expect(notReadyStart).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'CONFLICT',
        message: 'Every occupied seat must be ready before the room can start.',
      }),
    });

    const [room] = await getDb()
      .select()
      .from(gameRooms)
      .where(
        and(
          eq(gameRooms.id, created.data.roomId),
          eq(gameRooms.status, 'open'),
        ),
      );

    expect(room).toBeDefined();
  });
});
