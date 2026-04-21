import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { and, eq } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { gameMatchMoves, gameMatchParticipants, gameMatches, users } from '@/src/db/schema';

async function clearGameTables() {
  const db = getDb();
  await db.delete(gameMatchMoves);
  await db.delete(gameMatchParticipants);
  await db.delete(gameMatches);
}

function mockGuestIdentity() {
  vi.doMock('@/src/domain/game-matches/identity', () => ({
    resolveOrCreateMatchOwnerIdentity: vi.fn().mockResolvedValue({
      identity: {
        kind: 'guest',
        guestId: 'guest-1',
      },
      displayName: null,
    }),
    resolveExistingMatchOwnerIdentity: vi.fn().mockResolvedValue({
      identity: {
        kind: 'guest',
        guestId: 'guest-1',
      },
      displayName: null,
    }),
  }));
}

function mockAccountIdentity(accountId: string) {
  vi.doMock('@/src/domain/game-matches/identity', () => ({
    resolveOrCreateMatchOwnerIdentity: vi.fn().mockResolvedValue({
      identity: {
        kind: 'account',
        accountId,
      },
      displayName: 'Account Player',
    }),
    resolveExistingMatchOwnerIdentity: vi.fn().mockResolvedValue({
      identity: {
        kind: 'account',
        accountId,
      },
      displayName: 'Account Player',
    }),
  }));
}

beforeEach(async () => {
  await clearGameTables();
});

afterEach(async () => {
  await clearGameTables();
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock('@/src/domain/game-matches/identity');
});

describe('game matches', () => {
  it('creates and reloads a guest-owned authoritative match', async () => {
    mockGuestIdentity();
    const { createUnoMatchUseCase, getUnoMatchSnapshotUseCase } = await import('@/src/domain/game-matches/use-cases');

    const created = await createUnoMatchUseCase(null, {
      presetId: 'bot-duel',
      displayName: 'Guest Player',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const db = getDb();
    const [match] = await db.select().from(gameMatches).where(eq(gameMatches.id, created.data.matchId));
    const participants = await db
      .select()
      .from(gameMatchParticipants)
      .where(eq(gameMatchParticipants.matchId, created.data.matchId));

    expect(match?.createdByKind).toBe('guest');
    expect(match?.createdByGuestId).toBe('guest-1');
    expect(participants).toHaveLength(2);
    expect(participants.filter((participant) => participant.isBot)).toHaveLength(1);

    const reloaded = await getUnoMatchSnapshotUseCase(null, created.data.matchId);

    expect(reloaded).toEqual({
      ok: true,
      data: expect.objectContaining({
        matchId: created.data.matchId,
        status: 'active',
      }),
    });
  });

  it('stores authenticated ownership on account-backed matches', async () => {
    const [accountUser] = await getDb().select().from(users).where(eq(users.email, 'user@example.com')).limit(1);
    mockAccountIdentity(accountUser!.id);
    const { createUnoMatchUseCase } = await import('@/src/domain/game-matches/use-cases');

    const created = await createUnoMatchUseCase(
      {
        user: {
          id: accountUser!.id,
          email: accountUser!.email ?? 'user@example.com',
          tag: accountUser!.tag,
          name: accountUser!.name,
          image: accountUser!.image,
          role: accountUser!.role,
        },
      },
      {
        presetId: 'bot-duel',
      },
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const db = getDb();
    const [match] = await db.select().from(gameMatches).where(eq(gameMatches.id, created.data.matchId));
    const [ownerParticipant] = await db
      .select()
      .from(gameMatchParticipants)
      .where(and(eq(gameMatchParticipants.matchId, created.data.matchId), eq(gameMatchParticipants.isBot, false)));

    expect(match?.createdByAccountId).toBe(accountUser!.id);
    expect(ownerParticipant?.accountId).toBe(accountUser!.id);
  });

  it('submits a legal move, appends moves, and updates materialized state plus analysis', async () => {
    mockGuestIdentity();
    const { createUnoMatchUseCase, submitUnoMoveUseCase } = await import('@/src/domain/game-matches/use-cases');

    const created = await createUnoMatchUseCase(null, {
      presetId: 'bot-duel',
      displayName: 'Guest Player',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const action = created.data.view.legalActions[0];
    expect(action).toBeDefined();

    const submitted = await submitUnoMoveUseCase(null, created.data.matchId, {
      move: action!.move,
    });

    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }

    const db = getDb();
    const [match] = await db.select().from(gameMatches).where(eq(gameMatches.id, created.data.matchId));
    const moves = await db
      .select()
      .from(gameMatchMoves)
      .where(eq(gameMatchMoves.matchId, created.data.matchId));

    expect(moves.length).toBeGreaterThanOrEqual(1);
    expect(match?.lastSequence).toBe(submitted.data.lastSequence);
    expect(match?.analysisJson?.generic.acceptedMoveCount).toBe(submitted.data.analysis?.generic.acceptedMoveCount);
    expect(match?.latestStateJson.turn).toBeGreaterThan(created.data.match.turn);
  });

  it('rejects stale match progress appends with an optimistic concurrency error', async () => {
    mockGuestIdentity();
    const { createUnoMatchUseCase } = await import('@/src/domain/game-matches/use-cases');
    const { appendUnoMatchProgress, StaleMatchProgressError } = await import('@/src/domain/game-matches/repository');

    const created = await createUnoMatchUseCase(null, {
      presetId: 'bot-duel',
      displayName: 'Guest Player',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const db = getDb();
    const [match] = await db.select().from(gameMatches).where(eq(gameMatches.id, created.data.matchId));

    expect(match).toBeDefined();
    await expect(appendUnoMatchProgress(db, {
      matchId: created.data.matchId,
      latestStateJson: match!.latestStateJson,
      resultJson: match!.resultJson,
      analysisJson: match!.analysisJson,
      status: match!.status,
      finishedAt: match!.finishedAt,
      updatedAt: match!.updatedAt,
      lastSequence: match!.lastSequence,
      previousLastSequence: match!.lastSequence + 1,
      moves: [],
    })).rejects.toBeInstanceOf(StaleMatchProgressError);
  });

  it('rejects an illegal move without mutating persisted state', async () => {
    mockGuestIdentity();
    const { createUnoMatchUseCase, submitUnoMoveUseCase } = await import('@/src/domain/game-matches/use-cases');

    const created = await createUnoMatchUseCase(null, {
      presetId: 'bot-duel',
      displayName: 'Guest Player',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const db = getDb();
    const [beforeMatch] = await db.select().from(gameMatches).where(eq(gameMatches.id, created.data.matchId));
    const beforeMoves = await db
      .select()
      .from(gameMatchMoves)
      .where(eq(gameMatchMoves.matchId, created.data.matchId));

    const result = await submitUnoMoveUseCase(null, created.data.matchId, {
      move: {
        playerId: 'not-the-active-player',
        kind: 'play-card',
        createdAt: new Date().toISOString(),
        payload: {
          cardId: 'missing-card',
        },
      } as never,
    });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'CONFLICT',
      }),
    });

    const [afterMatch] = await db.select().from(gameMatches).where(eq(gameMatches.id, created.data.matchId));
    const afterMoves = await db
      .select()
      .from(gameMatchMoves)
      .where(eq(gameMatchMoves.matchId, created.data.matchId));

    expect(afterMatch?.lastSequence).toBe(beforeMatch?.lastSequence);
    expect(afterMatch?.latestStateJson).toEqual(beforeMatch?.latestStateJson);
    expect(afterMoves).toHaveLength(beforeMoves.length);
  });

  it('marks active matches abandoned and keeps replay analysis available', async () => {
    mockGuestIdentity();
    const { abandonUnoMatchUseCase, createUnoMatchUseCase, getUnoReplayUseCase } = await import('@/src/domain/game-matches/use-cases');

    const created = await createUnoMatchUseCase(null, {
      presetId: 'bot-duel',
      displayName: 'Guest Player',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const abandoned = await abandonUnoMatchUseCase(null, created.data.matchId);
    expect(abandoned).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: 'abandoned',
      }),
    });

    const replay = await getUnoReplayUseCase(null, created.data.matchId);
    expect(replay).toEqual({
      ok: true,
      data: expect.objectContaining({
        replay: expect.objectContaining({
          metadata: expect.objectContaining({
            gameVersion: '1.0.0',
            rulesetVersion: 'uno-style-v1',
            setup: expect.objectContaining({
              seed: created.data.matchId,
            }),
          }),
        }),
        summary: expect.objectContaining({
          status: 'abandoned',
        }),
      }),
    });
  });
});
