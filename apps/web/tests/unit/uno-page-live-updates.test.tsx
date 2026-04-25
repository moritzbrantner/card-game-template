// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UnoPageClient } from '@/apps/showcase/components/uno-page-client';
import { MATCH_REPLAY_FORMAT_VERSION } from '@repo/game-contracts';
import type {
  ListUnoMatchesResult,
  PersistedUnoMatchSnapshotDto,
} from '@/src/domain/game-matches/contracts';

const labels = {
  activeMatchDescription: 'Server authoritative match.',
  activeMatchTitle: 'Active match',
  activeMatchesTitle: 'Your active matches',
  analysisTitle: 'Analysis',
  createAction: 'Create match',
  createHint: 'Create a match.',
  createTitle: 'Create a match',
  description: 'UNO showcase.',
  emptyOpenLobbies: 'No lobbies.',
  emptyRecentMatches: 'No recent matches.',
  exitGame: 'Abandon match',
  exitedGameStatus: 'Match abandoned.',
  finishGame: 'Finish demo match',
  hostBadge: 'Host',
  joinAction: 'Join lobby',
  joinedLobbyStatus: 'Match created.',
  leaveLobby: 'Leave lobby',
  leftLobbyStatus: 'You left the lobby.',
  legalActionsTitle: 'Legal actions',
  lobbyReadyTitle: 'No active match',
  nameLabel: 'Player name',
  noActiveMatch: 'Create or resume a match.',
  openLobbiesTitle: 'Recent matches',
  pastGamesCta: 'Past games',
  presetLabel: 'Preset',
  readyToStart: 'Ready to start.',
  recentMatchesTitle: 'Recent matches',
  reloadAction: 'Reload',
  resumeAction: 'Resume',
  startGame: 'Start game',
  startedGameStatus: 'Game started.',
  title: 'UNO-style matches',
  waitingForPlayers: 'Waiting for players.',
};

function createAnalysis(acceptedMoveCount: number, turnsCompleted: number) {
  const baseAnalysis = {
    acceptedMoveCount,
    durationMs: null,
    executionMode: 'server-authoritative' as const,
    finishedAt: null,
    gameId: 'uno-style' as const,
    matchId: 'match-uno-1',
    moveKinds: [],
    players: [],
    startedAt: '2026-04-25T09:00:00.000Z',
    turnsCompleted,
    winnerIds: [],
  };

  return {
    generic: baseAnalysis,
    uno: {
      ...baseAnalysis,
      players: [],
    },
  };
}

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly listeners = new Map<string, Set<EventListener>>();
  closed = false;
  readyState = 1;

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }

  dispatch(type: string, payload: unknown) {
    const event = new MessageEvent(type, {
      data: JSON.stringify(payload),
    });

    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function createSnapshot(
  input: Partial<PersistedUnoMatchSnapshotDto> = {},
): PersistedUnoMatchSnapshotDto {
  return {
    matchId: 'match-uno-1',
    gameId: 'uno-style',
    status: 'active',
    startedAt: '2026-04-25T09:00:00.000Z',
    finishedAt: null,
    updatedAt: '2026-04-25T09:00:00.000Z',
    participants: [
      {
        displayName: 'Alice',
        identity: { kind: 'guest', guestId: 'guest-1' },
        isBot: false,
        playerId: 'p1',
        seat: 0,
      },
      {
        displayName: 'Bot Bravo',
        identity: { kind: 'guest', guestId: 'guest-bot' },
        isBot: true,
        playerId: 'p2',
        seat: 1,
      },
    ],
    result: null,
    analysis: createAnalysis(0, 0),
    lastSequence: 0,
    executionMode: 'server-authoritative',
    replayFormatVersion: MATCH_REPLAY_FORMAT_VERSION,
    match: {
      activePlayerId: 'p1',
      executionMode: 'server-authoritative',
      gameId: 'uno-style',
      matchId: 'match-uno-1',
      players: [
        { displayName: 'Alice', playerId: 'p1', seat: 0 },
        { displayName: 'Bot Bravo', playerId: 'p2', seat: 1 },
      ],
      state: {} as PersistedUnoMatchSnapshotDto['match']['state'],
      turn: 1,
    },
    legalMoves: [],
    selectedActorPlayerId: 'p1',
    view: {
      activeColor: 'red',
      activePlayerId: 'p1',
      discardTop: null,
      drawPileCount: 42,
      legalActions: [],
      matchResultBanner: null,
      pendingDrawAmount: 0,
      pendingHotseatPlayerId: null,
      players: [
        {
          controller: 'human',
          displayName: 'Alice',
          handCount: 7,
          isActive: true,
          isActor: true,
          isViewer: true,
          playerId: 'p1',
          visibleCards: [],
        },
        {
          controller: 'bot',
          displayName: 'Bot Bravo',
          handCount: 7,
          isActive: false,
          isActor: false,
          isViewer: false,
          playerId: 'p2',
          visibleCards: [],
        },
      ],
      selectedActorPlayerId: 'p1',
      status: 'Alice to act',
      viewerPlayerId: 'p1',
    },
    ...input,
  };
}

describe('UnoPageClient live updates', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    MockWebSocket.instances = [];
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
    window.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a websocket for active matches and applies pushed snapshots', async () => {
    const activeSnapshot = createSnapshot();
    const listResult: ListUnoMatchesResult = {
      active: [
        {
          analysis: activeSnapshot.analysis,
          finishedAt: activeSnapshot.finishedAt,
          gameId: activeSnapshot.gameId,
          lastSequence: activeSnapshot.lastSequence,
          matchId: activeSnapshot.matchId,
          participants: activeSnapshot.participants,
          result: activeSnapshot.result,
          startedAt: activeSnapshot.startedAt,
          status: activeSnapshot.status,
          updatedAt: activeSnapshot.updatedAt,
        },
      ],
      recent: [],
    };

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json(listResult);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}`) {
        return Response.json(activeSnapshot);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const { unmount } = render(
      <UnoPageClient labels={labels} pastGamesHref="/en/past-games" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Alice to act')).toBeTruthy();
    });

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    expect(MockWebSocket.instances[0]?.url).toContain(
      `/ws/games/uno/matches/${activeSnapshot.matchId}`,
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/events')),
    ).toBe(false);

    MockWebSocket.instances[0]?.dispatch('message', {
      type: 'uno.match.snapshot',
      snapshot: createSnapshot({
        analysis: createAnalysis(1, 1),
        lastSequence: 1,
        updatedAt: '2026-04-25T09:00:05.000Z',
        view: {
          ...activeSnapshot.view,
          status: 'Bot Bravo to act',
        },
      }),
    });

    await waitFor(() => {
      expect(screen.getByText('Bot Bravo to act')).toBeTruthy();
      expect(screen.getByText('1 accepted moves')).toBeTruthy();
    });

    unmount();
    expect(MockWebSocket.instances[0]?.closed).toBe(true);
  });
});
