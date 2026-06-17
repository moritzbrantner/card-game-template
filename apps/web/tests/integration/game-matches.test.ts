import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { and, eq } from 'drizzle-orm';
import type { MatchState, PlayerProfile } from '@repo/game-contracts';
import {
  createPokerAdapter,
  type PokerMove,
  type PokerState,
} from '@repo/game-poker';
import {
  defaultUnoRules,
  type UnoCard,
  type UnoMove,
  type UnoState,
} from '@repo/game-uno';
import {
  createServerGameSession,
  resumeServerGameSession,
} from '@repo/game-session';

import { getDb } from '@/src/db/client';
import {
  gameMatchMoves,
  gameMatchParticipants,
  gameMatches,
  users,
} from '@/src/db/schema';
import type { PersistedGameMatchRecord } from '@/src/domain/game-matches/contracts';

const unoPlayers: readonly PlayerProfile[] = [
  { playerId: 'p1', displayName: 'Guest Player', seat: 1 },
  { playerId: 'p2', displayName: 'Bot Rival', seat: 2 },
] as const;

async function clearGameTables() {
  const db = getDb();
  await db.delete(gameMatchMoves);
  await db.delete(gameMatchParticipants);
  await db.delete(gameMatches);
}

function createUnoCard(
  color: UnoCard['color'],
  kind: UnoCard['kind'],
  id: string,
  value?: number,
): UnoCard {
  return {
    color,
    kind,
    id,
    value,
    label: id,
  };
}

function createNearFinishedUnoState(matchId: string): MatchState<UnoState> {
  return {
    matchId,
    gameId: 'uno-style',
    players: unoPlayers,
    activePlayerId: 'p1',
    turn: 7,
    executionMode: 'server-authoritative',
    state: {
      currentColor: 'red',
      direction: 1,
      discardPile: [createUnoCard('red', 'number', 'discard-5', 5)],
      drawPile: [
        createUnoCard('yellow', 'number', 'draw-1', 1),
        createUnoCard('green', 'number', 'draw-2', 2),
        createUnoCard('blue', 'number', 'draw-3', 3),
      ],
      drawnCardThisTurnId: null,
      hands: {
        p1: [createUnoCard('red', 'number', 'red-9', 9)],
        p2: [
          createUnoCard('blue', 'number', 'blue-1', 1),
          createUnoCard('green', 'number', 'green-2', 2),
        ],
      },
      lastEvent: 'Guest Player is about to play the final card.',
      pendingDrawAmount: 0,
      pendingDrawSource: null,
      rules: defaultUnoRules,
      seed: `${matchId}:seed`,
      winnerPlayerId: null,
    },
  };
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
  it('stores and resumes a non-UNO registered game through generic match persistence', async () => {
    const { buildPersistedGameMatchRecord, createReplayFromPersistedMatch } =
      await import('@/src/domain/game-matches/service');
    const { createGameMatch, loadOwnedGameMatch } =
      await import('@/src/domain/game-matches/repository');

    const adapter = createPokerAdapter();
    const identity = {
      kind: 'guest',
      guestId: 'guest-poker',
    } as const;
    const participants = [
      {
        playerId: 'p1',
        seat: 1,
        displayName: 'Guest Poker',
        identity,
        isBot: false,
      },
      {
        playerId: 'p2',
        seat: 2,
        displayName: 'Caller Bot',
        identity: { kind: 'bot' },
        isBot: true,
      },
    ] as const;
    const sessionParticipants = participants.map((participant) => ({
      playerId: participant.playerId,
      displayName: participant.displayName,
      seat: participant.seat,
      controller: participant.isBot ? ('bot' as const) : ('human' as const),
      ...(participant.identity.kind === 'guest' ? { isGuest: true } : {}),
    }));
    const serverSession = createServerGameSession({
      adapter,
      matchId: 'poker-match-1',
      now: () => '2026-04-22T10:00:00.000Z',
      participants: sessionParticipants,
      setup: {
        seed: 'poker-seed',
      },
    });
    const persistedMatch = buildPersistedGameMatchRecord({
      createdAt: '2026-04-22T10:00:00.000Z',
      createdBy: identity,
      participants,
      session: serverSession,
    });

    await createGameMatch(getDb(), {
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
        createdByAccountId: null,
        createdByGuestId: identity.guestId,
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
        accountId: null,
        guestId:
          participant.identity.kind === 'guest'
            ? participant.identity.guestId
            : null,
        isBot: participant.isBot,
      })),
      moves: [],
    });

    const loaded = await loadOwnedGameMatch<
      PersistedGameMatchRecord<'texas-holdem', PokerState, PokerMove>
    >(getDb(), identity, persistedMatch.matchId, {
      gameId: 'texas-holdem',
    });

    expect(loaded).toEqual(
      expect.objectContaining({
        matchId: persistedMatch.matchId,
        gameId: 'texas-holdem',
        replayMetadata: expect.objectContaining({
          gameVersion: 'texas-holdem',
          rulesetVersion: 'texas-holdem',
          setup: expect.objectContaining({
            seed: 'poker-seed',
          }),
        }),
      }),
    );

    const resumed = resumeServerGameSession({
      adapter,
      participants: sessionParticipants,
      replay: createReplayFromPersistedMatch(loaded!),
    });

    expect(resumed.getSnapshot().match.gameId).toBe('texas-holdem');
    expect(resumed.getSnapshot().match.state.seed).toBe('poker-seed');
  });

  it('creates, reloads, submits, and replays a guest-owned authoritative poker match', async () => {
    mockGuestIdentity();
    const {
      createPokerMatchUseCase,
      getPokerMatchRealtimeUseCase,
      getPokerMatchSnapshotUseCase,
      getPokerReplayUseCase,
      listPokerMatchesUseCase,
      submitPokerMoveUseCase,
    } = await import('@/src/domain/game-matches/use-cases');

    const created = await createPokerMatchUseCase(null, {
      presetId: 'heads-up',
      displayName: 'Poker Guest',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(created.data.gameId).toBe('texas-holdem');
    expect(created.data.match.gameId).toBe('texas-holdem');
    expect(created.data.view.players[0]?.visibleCards).toHaveLength(2);
    expect(created.data.view.legalActions.length).toBeGreaterThan(0);

    const reloaded = await getPokerMatchSnapshotUseCase(
      null,
      created.data.matchId,
    );

    expect(reloaded).toEqual({
      ok: true,
      data: expect.objectContaining({
        matchId: created.data.matchId,
        gameId: 'texas-holdem',
        status: 'active',
      }),
    });

    const submitted = await submitPokerMoveUseCase(null, created.data.matchId, {
      move: created.data.view.legalActions[0]!.move,
    });

    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }

    expect(submitted.data.gameId).toBe('texas-holdem');
    expect(submitted.data.lastSequence).toBeGreaterThan(
      created.data.lastSequence,
    );

    const pokerUpdates = await getPokerMatchRealtimeUseCase(
      null,
      created.data.matchId,
      {
        afterSequence: created.data.lastSequence,
        sinceUpdatedAt: created.data.updatedAt,
      },
    );

    expect(pokerUpdates).toEqual({
      ok: true,
      data: expect.objectContaining({
        hasChanges: true,
        snapshot: expect.objectContaining({
          gameId: 'texas-holdem',
          lastSequence: submitted.data.lastSequence,
        }),
        events: expect.arrayContaining([
          expect.objectContaining({
            type: 'move.accepted',
            gameId: 'texas-holdem',
            matchId: created.data.matchId,
          }),
        ]),
      }),
    });

    const db = getDb();
    const [match] = await db
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, created.data.matchId));
    const moves = await db
      .select()
      .from(gameMatchMoves)
      .where(eq(gameMatchMoves.matchId, created.data.matchId));

    expect(match?.gameId).toBe('texas-holdem');
    expect(match?.lastSequence).toBe(submitted.data.lastSequence);
    expect(moves).toHaveLength(submitted.data.lastSequence);

    const listed = await listPokerMatchesUseCase(null);

    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect([...listed.data.active, ...listed.data.recent]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            matchId: created.data.matchId,
            gameId: 'texas-holdem',
          }),
        ]),
      );
    }

    const replay = await getPokerReplayUseCase(null, created.data.matchId);

    expect(replay).toEqual({
      ok: true,
      data: expect.objectContaining({
        analysis: expect.objectContaining({
          acceptedMoveCount: submitted.data.lastSequence,
          gameId: 'texas-holdem',
        }),
        replay: expect.objectContaining({
          gameId: 'texas-holdem',
          metadata: expect.objectContaining({
            gameVersion: 'texas-holdem',
            rulesetVersion: 'texas-holdem',
            setup: expect.objectContaining({
              seed: created.data.matchId,
            }),
          }),
        }),
        summary: expect.objectContaining({
          gameId: 'texas-holdem',
        }),
      }),
    });
  });

  it('creates, updates, polls, and replays a guest-owned authoritative TCG match', async () => {
    mockGuestIdentity();
    const {
      createTcgMatchUseCase,
      getTcgMatchRealtimeUseCase,
      getTcgMatchSnapshotUseCase,
      getTcgReplayUseCase,
      submitTcgMoveUseCase,
    } = await import('@/src/domain/game-matches/use-cases');

    const created = await createTcgMatchUseCase(null, {
      presetId: 'bot-rival',
      displayName: 'TCG Guest',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(created.data.gameId).toBe('arcane-duel');
    expect(created.data.match.gameId).toBe('arcane-duel');
    expect(created.data.view.players).toHaveLength(2);
    expect(created.data.view.legalActions.length).toBeGreaterThan(0);

    const reloaded = await getTcgMatchSnapshotUseCase(
      null,
      created.data.matchId,
    );

    expect(reloaded).toEqual({
      ok: true,
      data: expect.objectContaining({
        matchId: created.data.matchId,
        gameId: 'arcane-duel',
        status: 'active',
      }),
    });

    const submitted = await submitTcgMoveUseCase(null, created.data.matchId, {
      move: created.data.view.legalActions[0]!.move,
    });

    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }

    expect(submitted.data.gameId).toBe('arcane-duel');
    expect(submitted.data.lastSequence).toBeGreaterThan(
      created.data.lastSequence,
    );

    const tcgUpdates = await getTcgMatchRealtimeUseCase(
      null,
      created.data.matchId,
      {
        afterSequence: created.data.lastSequence,
        sinceUpdatedAt: created.data.updatedAt,
      },
    );

    expect(tcgUpdates).toEqual({
      ok: true,
      data: expect.objectContaining({
        hasChanges: true,
        snapshot: expect.objectContaining({
          gameId: 'arcane-duel',
          lastSequence: submitted.data.lastSequence,
        }),
        events: expect.arrayContaining([
          expect.objectContaining({
            type: 'move.accepted',
            gameId: 'arcane-duel',
            matchId: created.data.matchId,
          }),
        ]),
      }),
    });

    const currentCursor = await getTcgMatchRealtimeUseCase(
      null,
      created.data.matchId,
      {
        afterSequence: submitted.data.lastSequence,
        sinceUpdatedAt: submitted.data.updatedAt,
      },
    );

    expect(currentCursor).toEqual({
      ok: true,
      data: expect.objectContaining({
        hasChanges: false,
        events: [],
        cursor: {
          lastSequence: submitted.data.lastSequence,
          updatedAt: submitted.data.updatedAt,
        },
      }),
    });

    const db = getDb();
    const [match] = await db
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, created.data.matchId));
    const moves = await db
      .select()
      .from(gameMatchMoves)
      .where(eq(gameMatchMoves.matchId, created.data.matchId));

    expect(match?.gameId).toBe('arcane-duel');
    expect(match?.lastSequence).toBe(submitted.data.lastSequence);
    expect(moves).toHaveLength(submitted.data.lastSequence);

    const replay = await getTcgReplayUseCase(null, created.data.matchId);

    expect(replay).toEqual({
      ok: true,
      data: expect.objectContaining({
        analysis: expect.objectContaining({
          acceptedMoveCount: submitted.data.lastSequence,
          gameId: 'arcane-duel',
        }),
        replay: expect.objectContaining({
          gameId: 'arcane-duel',
          metadata: expect.objectContaining({
            gameVersion: 'arcane-duel',
            rulesetVersion: 'arcane-duel',
            setup: expect.objectContaining({
              seed: created.data.matchId,
            }),
          }),
        }),
        summary: expect.objectContaining({
          gameId: 'arcane-duel',
        }),
      }),
    });

    const invalid = await submitTcgMoveUseCase(null, created.data.matchId, {
      move: {
        playerId: 'p1',
        kind: 'play-card',
        createdAt: '2026-04-22T12:00:00.000Z',
        payload: {},
      },
    });

    expect(invalid).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
      }),
    });

    await db
      .update(gameMatches)
      .set({ status: 'completed' })
      .where(eq(gameMatches.id, created.data.matchId));

    const completedSubmit = await submitTcgMoveUseCase(
      null,
      created.data.matchId,
      {
        move: {
          playerId: 'p1',
          kind: 'end-turn',
          createdAt: '2026-04-22T12:00:01.000Z',
          payload: {},
        },
      },
    );

    expect(completedSubmit).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Completed matches cannot accept more moves.',
      },
    });
  });

  it('creates and reloads a guest-owned authoritative match', async () => {
    mockGuestIdentity();
    const { createUnoMatchUseCase, getUnoMatchSnapshotUseCase } =
      await import('@/src/domain/game-matches/use-cases');

    const created = await createUnoMatchUseCase(null, {
      presetId: 'bot-duel',
      displayName: 'Guest Player',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const db = getDb();
    const [match] = await db
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, created.data.matchId));
    const participants = await db
      .select()
      .from(gameMatchParticipants)
      .where(eq(gameMatchParticipants.matchId, created.data.matchId));

    expect(match?.createdByKind).toBe('guest');
    expect(match?.createdByGuestId).toBe('guest-1');
    expect(participants).toHaveLength(2);
    expect(
      participants.filter((participant) => participant.isBot),
    ).toHaveLength(1);

    const reloaded = await getUnoMatchSnapshotUseCase(
      null,
      created.data.matchId,
    );

    expect(reloaded).toEqual({
      ok: true,
      data: expect.objectContaining({
        matchId: created.data.matchId,
        status: 'active',
      }),
    });
  });

  it('records a finished UNO match in the database and exposes its replay', async () => {
    mockGuestIdentity();
    const { getUnoReplayUseCase, listUnoMatchesUseCase, submitUnoMoveUseCase } =
      await import('@/src/domain/game-matches/use-cases');

    const matchId = 'uno-finish-persisted';
    const nearFinishedState = createNearFinishedUnoState(matchId);

    await getDb()
      .insert(gameMatches)
      .values({
        id: matchId,
        gameId: 'uno-style',
        status: 'active',
        executionMode: 'server-authoritative',
        replayFormatVersion: 2,
        startedAt: new Date('2026-04-22T12:00:00.000Z'),
        finishedAt: null,
        updatedAt: new Date('2026-04-22T12:00:00.000Z'),
        createdAt: new Date('2026-04-22T12:00:00.000Z'),
        createdByKind: 'guest',
        createdByAccountId: null,
        createdByGuestId: 'guest-1',
        initialStateJson: nearFinishedState,
        latestStateJson: nearFinishedState,
        resultJson: null,
        analysisJson: null,
        lastSequence: 0,
      });
    await getDb()
      .insert(gameMatchParticipants)
      .values([
        {
          matchId,
          playerId: 'p1',
          seat: 1,
          displayName: 'Guest Player',
          identityKind: 'guest',
          accountId: null,
          guestId: 'guest-1',
          isBot: false,
        },
        {
          matchId,
          playerId: 'p2',
          seat: 2,
          displayName: 'Bot Rival',
          identityKind: 'bot',
          accountId: null,
          guestId: null,
          isBot: true,
        },
      ]);

    const submitted = await submitUnoMoveUseCase(null, matchId, {
      move: {
        playerId: 'p1',
        kind: 'play-card',
        createdAt: '2026-04-22T12:00:05.000Z',
        payload: {
          cardId: 'red-9',
          sayUno: true,
        },
      } satisfies UnoMove,
    });

    expect(submitted).toEqual({
      ok: true,
      data: expect.objectContaining({
        matchId,
        status: 'completed',
        finishedAt: '2026-04-22T12:00:05.000Z',
        result: expect.objectContaining({
          winnerIds: ['p1'],
        }),
      }),
    });

    const [match] = await getDb()
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, matchId));
    const moves = await getDb()
      .select()
      .from(gameMatchMoves)
      .where(eq(gameMatchMoves.matchId, matchId));

    expect(match?.status).toBe('completed');
    expect(match?.finishedAt?.toISOString()).toBe('2026-04-22T12:00:05.000Z');
    expect(match?.resultJson).toEqual(
      expect.objectContaining({
        winnerIds: ['p1'],
      }),
    );
    expect(match?.analysisJson).toEqual(
      expect.objectContaining({
        generic: expect.objectContaining({
          acceptedMoveCount: 1,
          winnerIds: ['p1'],
        }),
        uno: expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({
              playerId: 'p1',
              won: true,
            }),
          ]),
        }),
      }),
    );
    expect(moves).toHaveLength(1);
    expect(moves[0]?.moveKind).toBe('play-card');

    const listed = await listUnoMatchesUseCase(null);

    expect(listed).toEqual({
      ok: true,
      data: expect.objectContaining({
        recent: expect.arrayContaining([
          expect.objectContaining({
            matchId,
            status: 'completed',
          }),
        ]),
      }),
    });

    const replay = await getUnoReplayUseCase(null, matchId);

    expect(replay).toEqual({
      ok: true,
      data: expect.objectContaining({
        summary: expect.objectContaining({
          matchId,
          status: 'completed',
        }),
        analysis: expect.objectContaining({
          acceptedMoveCount: 1,
          winnerIds: ['p1'],
        }),
        unoAnalysis: expect.objectContaining({
          players: expect.arrayContaining([
            expect.objectContaining({
              playerId: 'p1',
              won: true,
            }),
          ]),
        }),
      }),
    });
  });

  it('stores authenticated ownership on account-backed matches', async () => {
    const [accountUser] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, 'user@example.com'))
      .limit(1);
    mockAccountIdentity(accountUser!.id);
    const { createUnoMatchUseCase } =
      await import('@/src/domain/game-matches/use-cases');

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
    const [match] = await db
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, created.data.matchId));
    const [ownerParticipant] = await db
      .select()
      .from(gameMatchParticipants)
      .where(
        and(
          eq(gameMatchParticipants.matchId, created.data.matchId),
          eq(gameMatchParticipants.isBot, false),
        ),
      );

    expect(match?.createdByAccountId).toBe(accountUser!.id);
    expect(ownerParticipant?.accountId).toBe(accountUser!.id);
  });

  it('aggregates completed account match history by player and game with replay links', async () => {
    const [accountUser] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, 'user@example.com'))
      .limit(1);
    const accountId = accountUser!.id;
    const startedAt = new Date('2026-04-22T10:00:00.000Z');
    const finishedAt = new Date('2026-04-22T10:08:00.000Z');

    await getDb()
      .insert(gameMatches)
      .values([
        {
          id: 'history-uno-win',
          gameId: 'uno-style',
          status: 'completed',
          executionMode: 'server-authoritative',
          replayFormatVersion: 2,
          startedAt,
          finishedAt,
          updatedAt: finishedAt,
          createdAt: startedAt,
          createdByKind: 'account',
          createdByAccountId: accountId,
          createdByGuestId: null,
          initialStateJson: {
            matchId: 'history-uno-win',
            gameId: 'uno-style',
            players: [
              { playerId: 'p-account', displayName: 'Account Player', seat: 1 },
              { playerId: 'p-bot', displayName: 'Bot', seat: 2 },
            ],
            activePlayerId: 'p-account',
            turn: 1,
            executionMode: 'server-authoritative',
            state: { seed: 'history-uno-win' },
          },
          latestStateJson: {
            matchId: 'history-uno-win',
            gameId: 'uno-style',
            players: [
              { playerId: 'p-account', displayName: 'Account Player', seat: 1 },
              { playerId: 'p-bot', displayName: 'Bot', seat: 2 },
            ],
            activePlayerId: 'p-account',
            turn: 5,
            executionMode: 'server-authoritative',
            state: { seed: 'history-uno-win' },
          },
          resultJson: {
            matchId: 'history-uno-win',
            gameId: 'uno-style',
            winnerIds: ['p-account'],
            rankings: [
              { playerId: 'p-account', position: 1, score: 10 },
              { playerId: 'p-bot', position: 2, score: 0 },
            ],
            finishedAt: finishedAt.toISOString(),
            executionMode: 'server-authoritative',
          },
          analysisJson: {
            generic: {
              matchId: 'history-uno-win',
              gameId: 'uno-style',
              executionMode: 'server-authoritative',
              startedAt: startedAt.toISOString(),
              finishedAt: finishedAt.toISOString(),
              durationMs: 480000,
              acceptedMoveCount: 6,
              turnsCompleted: 4,
              winnerIds: ['p-account'],
              players: [
                {
                  playerId: 'p-account',
                  displayName: 'Account Player',
                  movesAccepted: 3,
                },
                { playerId: 'p-bot', displayName: 'Bot', movesAccepted: 3 },
              ],
              moveKinds: [{ kind: 'play-card', count: 6 }],
            },
          },
          lastSequence: 6,
        },
        {
          id: 'history-poker-loss',
          gameId: 'texas-holdem',
          status: 'completed',
          executionMode: 'server-authoritative',
          replayFormatVersion: 2,
          startedAt: new Date('2026-04-22T11:00:00.000Z'),
          finishedAt: new Date('2026-04-22T11:05:00.000Z'),
          updatedAt: new Date('2026-04-22T11:05:00.000Z'),
          createdAt: new Date('2026-04-22T11:00:00.000Z'),
          createdByKind: 'account',
          createdByAccountId: accountId,
          createdByGuestId: null,
          initialStateJson: {
            matchId: 'history-poker-loss',
            gameId: 'texas-holdem',
            players: [
              { playerId: 'p-account', displayName: 'Account Player', seat: 1 },
              { playerId: 'p-bot', displayName: 'Caller Bot', seat: 2 },
            ],
            activePlayerId: 'p-account',
            turn: 1,
            executionMode: 'server-authoritative',
            state: { seed: 'history-poker-loss' },
          },
          latestStateJson: {
            matchId: 'history-poker-loss',
            gameId: 'texas-holdem',
            players: [
              { playerId: 'p-account', displayName: 'Account Player', seat: 1 },
              { playerId: 'p-bot', displayName: 'Caller Bot', seat: 2 },
            ],
            activePlayerId: 'p-bot',
            turn: 4,
            executionMode: 'server-authoritative',
            state: { seed: 'history-poker-loss' },
          },
          resultJson: {
            matchId: 'history-poker-loss',
            gameId: 'texas-holdem',
            winnerIds: ['p-bot'],
            rankings: [
              { playerId: 'p-bot', position: 1, score: 20 },
              { playerId: 'p-account', position: 2, score: 0 },
            ],
            finishedAt: '2026-04-22T11:05:00.000Z',
            executionMode: 'server-authoritative',
          },
          analysisJson: {
            generic: {
              matchId: 'history-poker-loss',
              gameId: 'texas-holdem',
              executionMode: 'server-authoritative',
              startedAt: '2026-04-22T11:00:00.000Z',
              finishedAt: '2026-04-22T11:05:00.000Z',
              durationMs: 300000,
              acceptedMoveCount: 4,
              turnsCompleted: 3,
              winnerIds: ['p-bot'],
              players: [
                {
                  playerId: 'p-account',
                  displayName: 'Account Player',
                  movesAccepted: 2,
                },
                {
                  playerId: 'p-bot',
                  displayName: 'Caller Bot',
                  movesAccepted: 2,
                },
              ],
              moveKinds: [{ kind: 'call', count: 4 }],
            },
          },
          lastSequence: 4,
        },
        {
          id: 'history-active-excluded',
          gameId: 'uno-style',
          status: 'active',
          executionMode: 'server-authoritative',
          replayFormatVersion: 2,
          startedAt: new Date('2026-04-22T12:00:00.000Z'),
          finishedAt: null,
          updatedAt: new Date('2026-04-22T12:00:00.000Z'),
          createdAt: new Date('2026-04-22T12:00:00.000Z'),
          createdByKind: 'account',
          createdByAccountId: accountId,
          createdByGuestId: null,
          initialStateJson: {
            matchId: 'history-active-excluded',
            gameId: 'uno-style',
            players: [
              { playerId: 'p-account', displayName: 'Account Player', seat: 1 },
            ],
            activePlayerId: 'p-account',
            turn: 1,
            executionMode: 'server-authoritative',
            state: { seed: 'history-active-excluded' },
          },
          latestStateJson: {
            matchId: 'history-active-excluded',
            gameId: 'uno-style',
            players: [
              { playerId: 'p-account', displayName: 'Account Player', seat: 1 },
            ],
            activePlayerId: 'p-account',
            turn: 1,
            executionMode: 'server-authoritative',
            state: { seed: 'history-active-excluded' },
          },
          resultJson: null,
          analysisJson: null,
          lastSequence: 0,
        },
      ]);

    await getDb()
      .insert(gameMatchParticipants)
      .values([
        {
          matchId: 'history-uno-win',
          playerId: 'p-account',
          seat: 1,
          displayName: 'Account Player',
          identityKind: 'account',
          accountId,
          guestId: null,
          isBot: false,
        },
        {
          matchId: 'history-uno-win',
          playerId: 'p-bot',
          seat: 2,
          displayName: 'Bot',
          identityKind: 'bot',
          accountId: null,
          guestId: null,
          isBot: true,
        },
        {
          matchId: 'history-poker-loss',
          playerId: 'p-account',
          seat: 1,
          displayName: 'Account Player',
          identityKind: 'account',
          accountId,
          guestId: null,
          isBot: false,
        },
        {
          matchId: 'history-poker-loss',
          playerId: 'p-bot',
          seat: 2,
          displayName: 'Caller Bot',
          identityKind: 'bot',
          accountId: null,
          guestId: null,
          isBot: true,
        },
        {
          matchId: 'history-active-excluded',
          playerId: 'p-account',
          seat: 1,
          displayName: 'Account Player',
          identityKind: 'account',
          accountId,
          guestId: null,
          isBot: false,
        },
      ]);

    const { getPlayerGameHistoryUseCase } =
      await import('@/src/domain/game-matches/use-cases');

    const history = await getPlayerGameHistoryUseCase(accountId);

    expect(history).toEqual({
      ok: true,
      data: expect.objectContaining({
        accountId,
        totals: {
          matches: 2,
          wins: 1,
          losses: 1,
          draws: 0,
          abandoned: 0,
        },
        byGame: expect.arrayContaining([
          expect.objectContaining({
            gameId: 'uno-style',
            matches: 1,
            wins: 1,
            losses: 0,
          }),
          expect.objectContaining({
            gameId: 'texas-holdem',
            matches: 1,
            wins: 0,
            losses: 1,
          }),
        ]),
        recent: expect.arrayContaining([
          expect.objectContaining({
            matchId: 'history-uno-win',
            gameId: 'uno-style',
            gameName: 'UNO-style',
            outcome: 'win',
            replayHref: '/past-games/history-uno-win',
            acceptedMoveCount: 6,
            playerMovesAccepted: 3,
          }),
          expect.objectContaining({
            matchId: 'history-poker-loss',
            gameId: 'texas-holdem',
            gameName: "Texas Hold'em",
            outcome: 'loss',
            replayHref: '/api/games/poker/matches/history-poker-loss/replay',
            acceptedMoveCount: 4,
            playerMovesAccepted: 2,
          }),
        ]),
      }),
    });
  });

  it('submits a legal move, appends moves, and updates materialized state plus analysis', async () => {
    mockGuestIdentity();
    const {
      createUnoMatchUseCase,
      getUnoMatchRealtimeUseCase,
      submitUnoMoveUseCase,
    } = await import('@/src/domain/game-matches/use-cases');

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
    const [match] = await db
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, created.data.matchId));
    const moves = await db
      .select()
      .from(gameMatchMoves)
      .where(eq(gameMatchMoves.matchId, created.data.matchId));

    expect(moves.length).toBeGreaterThanOrEqual(1);
    expect(match?.lastSequence).toBe(submitted.data.lastSequence);
    expect(match?.analysisJson?.generic.acceptedMoveCount).toBe(
      submitted.data.analysis?.generic.acceptedMoveCount,
    );
    expect(match?.latestStateJson.turn).toBeGreaterThan(
      created.data.match.turn,
    );

    const updates = await getUnoMatchRealtimeUseCase(
      null,
      created.data.matchId,
      {
        afterSequence: created.data.lastSequence,
        sinceUpdatedAt: created.data.updatedAt,
      },
    );

    expect(updates).toEqual({
      ok: true,
      data: expect.objectContaining({
        cursor: {
          lastSequence: submitted.data.lastSequence,
          updatedAt: submitted.data.updatedAt,
        },
        hasChanges: true,
        snapshot: expect.objectContaining({
          lastSequence: submitted.data.lastSequence,
        }),
        events: expect.arrayContaining([
          expect.objectContaining({
            type: 'match.updated',
            matchId: created.data.matchId,
            lastSequence: submitted.data.lastSequence,
          }),
          expect.objectContaining({
            type: 'move.accepted',
            matchId: created.data.matchId,
            sequence: expect.any(Number),
          }),
        ]),
      }),
    });

    const unchanged = await getUnoMatchRealtimeUseCase(
      null,
      created.data.matchId,
      {
        afterSequence: submitted.data.lastSequence,
        sinceUpdatedAt: submitted.data.updatedAt,
      },
    );

    expect(unchanged).toEqual({
      ok: true,
      data: expect.objectContaining({
        hasChanges: false,
        events: [],
      }),
    });

    const unchangedBySequenceOnly = await getUnoMatchRealtimeUseCase(
      null,
      created.data.matchId,
      {
        afterSequence: submitted.data.lastSequence,
      },
    );

    expect(unchangedBySequenceOnly).toEqual({
      ok: true,
      data: expect.objectContaining({
        hasChanges: false,
        events: [],
      }),
    });
  });

  it('rejects stale match progress appends with an optimistic concurrency error', async () => {
    mockGuestIdentity();
    const { createUnoMatchUseCase } =
      await import('@/src/domain/game-matches/use-cases');
    const { appendGameMatchProgress, StaleMatchProgressError } =
      await import('@/src/domain/game-matches/repository');

    const created = await createUnoMatchUseCase(null, {
      presetId: 'bot-duel',
      displayName: 'Guest Player',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const db = getDb();
    const [match] = await db
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, created.data.matchId));

    expect(match).toBeDefined();
    await expect(
      appendGameMatchProgress(db, {
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
      }),
    ).rejects.toBeInstanceOf(StaleMatchProgressError);
  });

  it('rejects an illegal move without mutating persisted state', async () => {
    mockGuestIdentity();
    const { createUnoMatchUseCase, submitUnoMoveUseCase } =
      await import('@/src/domain/game-matches/use-cases');

    const created = await createUnoMatchUseCase(null, {
      presetId: 'bot-duel',
      displayName: 'Guest Player',
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const db = getDb();
    const [beforeMatch] = await db
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, created.data.matchId));
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

    const [afterMatch] = await db
      .select()
      .from(gameMatches)
      .where(eq(gameMatches.id, created.data.matchId));
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
    const {
      abandonUnoMatchUseCase,
      createUnoMatchUseCase,
      getUnoReplayUseCase,
    } = await import('@/src/domain/game-matches/use-cases');

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
