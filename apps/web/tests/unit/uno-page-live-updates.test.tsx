// @vitest-environment jsdom

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UnoPageClient } from '@/apps/showcase/components/uno-page-client';
import { MATCH_REPLAY_FORMAT_VERSION } from '@repo/game-contracts';
import type { UnoColor } from '@repo/game-uno';
import type {
  ListUnoMatchesResult,
  PersistedUnoMatchSnapshotDto,
} from '@/src/domain/game-matches/contracts';

const labels = {
  activeMatchDescription: 'Server authoritative match.',
  activeMatchTitle: 'Active match',
  activeMatchesTitle: 'Your active matches',
  analysisTitle: 'Analysis',
  botAmountHint: 'Reserved bot seats fill automatically when the lobby starts.',
  botAmountLabel: 'Bots',
  completedMatchStatus: 'Match finished and saved to past games.',
  copyInviteAction: 'Copy invite link',
  copyInviteStatus: 'Invite link copied.',
  createAction: 'Create lobby',
  createHint: 'Create a lobby.',
  createTitle: 'Create a lobby',
  description: 'UNO showcase.',
  emptyOpenLobbies: 'No lobbies.',
  emptyRecentMatches: 'No recent matches.',
  exitGame: 'Abandon match',
  exitedGameStatus: 'Match abandoned.',
  finishGame: 'Finish demo match',
  hostBadge: 'Host',
  inviteDescription: 'Join the invited lobby.',
  inviteLinkLabel: 'Invite link',
  inviteTitle: 'Join invited lobby',
  joinAction: 'Join lobby',
  joinedLobbyStatus: 'Lobby joined.',
  leaveLobby: 'Leave lobby',
  leftLobbyStatus: 'You left the lobby.',
  legalActionsTitle: 'Legal actions',
  lobbyReadyTitle: 'Current lobby',
  nameLabel: 'Player name',
  noActiveMatch: 'Create or resume a match.',
  openLobbiesTitle: 'Recent matches',
  overviewAction: 'Back to overview',
  pastGamesCta: 'Past games',
  readyAction: 'Ready up',
  readyToStart: 'Ready to start.',
  recentMatchesTitle: 'Recent matches',
  reloadAction: 'Reload',
  reviewReplayAction: 'Review replay',
  reservedBotsLabel: 'Reserved bots',
  resumeAction: 'Resume',
  roomSizeLabel: 'Table size',
  shareInviteHint: 'Share the invite link.',
  startGame: 'Start game',
  startedGameStatus: 'Game started.',
  title: 'UNO-style matches',
  waitingForPlayers: 'Waiting for players.',
  wildChoiceCancel: 'Cancel',
  wildChoiceDescription: 'Pick the color this wild card should set.',
  wildChoiceTitle: 'Choose wild color',
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
          visibleCards: [
            {
              color: 'red',
              id: 'red-5',
              kind: 'number',
              label: 'red-5',
              value: 5,
            },
          ],
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

function createListResult(activeSnapshot: PersistedUnoMatchSnapshotDto) {
  return {
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
  } satisfies ListUnoMatchesResult;
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
    const listResult = createListResult(activeSnapshot);

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json(listResult);
      }

      if (url === '/api/games/rooms') {
        return Response.json([]);
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
    expect(screen.getByLabelText('red-5')).toBeTruthy();
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
          players: [
            {
              ...activeSnapshot.view.players[0]!,
              handCount: 6,
              isActive: false,
              visibleCards: [
                {
                  color: 'green',
                  id: 'green-7',
                  kind: 'number',
                  label: 'green-7',
                  value: 7,
                },
              ],
            },
            {
              ...activeSnapshot.view.players[1]!,
              isActive: true,
            },
          ],
          status: 'Bot Bravo to act',
        },
      }),
    });

    await waitFor(() => {
      expect(screen.getByText('Bot Bravo to act')).toBeTruthy();
      expect(screen.getByText('1 accepted moves')).toBeTruthy();
    });
    expect(screen.getByLabelText('green-7')).toBeTruthy();
    expect(screen.queryByLabelText('red-5')).toBeNull();

    unmount();
    expect(MockWebSocket.instances[0]?.closed).toBe(true);
  });

  it('renders opponents above the center piles and the viewer hand below', async () => {
    const activeSnapshot = createSnapshot();
    const listResult = createListResult(activeSnapshot);

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json(listResult);
      }

      if (url === '/api/games/rooms') {
        return Response.json([]);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}`) {
        return Response.json(activeSnapshot);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(screen.getByText('Alice to act')).toBeTruthy();
    });

    const opponents = screen.getByTestId('uno-opponents');
    const centerPiles = screen.getByTestId('uno-center-piles');
    const viewerSeat = screen.getByTestId('uno-viewer-seat');

    expect(
      opponents.compareDocumentPosition(centerPiles) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      centerPiles.compareDocumentPosition(viewerSeat) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(within(opponents).getByText('Bot Bravo')).toBeTruthy();
    expect(within(opponents).queryByText('You')).toBeNull();
    expect(
      within(centerPiles).getByLabelText('Draw pile: 42 hidden cards'),
    ).toBeTruthy();
    expect(within(centerPiles).getByText('Discard pile')).toBeTruthy();
    expect(within(viewerSeat).getByText('Alice')).toBeTruthy();
    expect(within(viewerSeat).getByText('You')).toBeTruthy();
    expect(within(viewerSeat).getByLabelText('red-5')).toBeTruthy();
  });

  it('plays a visible card when the viewer clicks it', async () => {
    const activeSnapshot = createSnapshot({
      view: {
        ...createSnapshot().view,
        legalActions: [
          {
            id: 'play-red-five-safe',
            label: 'red-5',
            move: {
              kind: 'play-card',
              createdAt: '2026-04-25T09:00:01.000Z',
              playerId: 'p1',
              payload: {
                cardId: 'red-5',
                sayUno: false,
              },
            },
          },
          {
            id: 'play-red-five-uno',
            label: 'red-5 call UNO',
            move: {
              kind: 'play-card',
              createdAt: '2026-04-25T09:00:02.000Z',
              playerId: 'p1',
              payload: {
                cardId: 'red-5',
                sayUno: true,
              },
            },
          },
        ],
      },
    });
    const listResult = createListResult(activeSnapshot);
    const submittedSnapshot = createSnapshot({
      updatedAt: '2026-04-25T09:00:03.000Z',
      view: {
        ...activeSnapshot.view,
        players: [
          {
            ...activeSnapshot.view.players[0]!,
            handCount: 6,
            isActive: false,
            visibleCards: [],
          },
          {
            ...activeSnapshot.view.players[1]!,
            isActive: true,
          },
        ],
        status: 'Bot Bravo to act',
      },
    });

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json(listResult);
      }

      if (url === '/api/games/rooms') {
        return Response.json([]);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}`) {
        if ((init?.method ?? 'GET') === 'POST') {
          expect(init?.body).toBe(
            JSON.stringify({
              move: activeSnapshot.view.legalActions[1]!.move,
            }),
          );
          return Response.json(submittedSnapshot);
        }

        return Response.json(activeSnapshot);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}/moves`) {
        expect(init?.body).toBe(
          JSON.stringify({
            move: activeSnapshot.view.legalActions[1]!.move,
          }),
        );
        return Response.json(submittedSnapshot);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(screen.getByText('Alice to act')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('red-5'));

    await waitFor(() => {
      expect(screen.getByText('Bot Bravo to act')).toBeTruthy();
    });
  });

  it('asks for a wild color before submitting a direct wild card play', async () => {
    const baseSnapshot = createSnapshot();
    const wildCard = {
      color: 'wild',
      id: 'wild-1',
      kind: 'wild',
      label: 'wild',
    } as const;
    const wildActionInputs = [
      {
        color: 'red',
        id: 'play-wild-red',
        label: 'Wild red',
      },
      {
        color: 'blue',
        id: 'play-wild-blue',
        label: 'Wild blue',
      },
      {
        color: 'green',
        id: 'play-wild-green',
        label: 'Wild green',
      },
      {
        color: 'yellow',
        id: 'play-wild-yellow',
        label: 'Wild yellow',
      },
    ] as const satisfies ReadonlyArray<{
      color: UnoColor;
      id: string;
      label: string;
    }>;
    const wildActions = wildActionInputs.map(({ color, id, label }) => ({
      id,
      label,
      move: {
        kind: 'play-card' as const,
        createdAt: '2026-04-25T09:00:01.000Z',
        playerId: 'p1',
        payload: {
          cardId: wildCard.id,
          chosenColor: color,
          sayUno: true,
        },
      },
    }));
    const activeSnapshot = createSnapshot({
      view: {
        ...baseSnapshot.view,
        legalActions: wildActions,
        players: [
          {
            ...baseSnapshot.view.players[0]!,
            visibleCards: [wildCard],
          },
          baseSnapshot.view.players[1]!,
        ],
      },
    });
    const listResult = createListResult(activeSnapshot);
    const submittedSnapshot = createSnapshot({
      updatedAt: '2026-04-25T09:00:03.000Z',
      view: {
        ...activeSnapshot.view,
        activeColor: 'blue',
        players: [
          {
            ...activeSnapshot.view.players[0]!,
            handCount: 6,
            isActive: false,
            visibleCards: [],
          },
          {
            ...activeSnapshot.view.players[1]!,
            isActive: true,
          },
        ],
        status: 'Bot Bravo to act',
      },
    });
    let moveSubmissions = 0;

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json(listResult);
      }

      if (url === '/api/games/rooms') {
        return Response.json([]);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}`) {
        return Response.json(activeSnapshot);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}/moves`) {
        moveSubmissions += 1;
        expect(init?.body).toBe(
          JSON.stringify({
            move: wildActions[1]!.move,
          }),
        );
        return Response.json(submittedSnapshot);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(screen.getByText('Alice to act')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('wild'));

    expect(
      await screen.findByRole('dialog', { name: 'Choose wild color' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Red' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Blue' })).toBeTruthy();
    expect(moveSubmissions).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(moveSubmissions).toBe(0);

    const card = screen.getByLabelText('wild');
    const dropZone = screen.getByTestId('uno-discard-drop-zone');
    const dataTransfer = {
      data: new Map<string, string>(),
      dropEffect: '',
      effectAllowed: '',
      getData(type: string) {
        return this.data.get(type) ?? '';
      },
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
    };

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(dropZone, { dataTransfer });
    fireEvent.drop(dropZone, { dataTransfer });
    fireEvent.click(await screen.findByRole('button', { name: 'Blue' }));

    await waitFor(() => {
      expect(screen.getByText('Bot Bravo to act')).toBeTruthy();
    });
    expect(moveSubmissions).toBe(1);
  });

  it('plays a visible card when the viewer drops it on the discard pile', async () => {
    const activeSnapshot = createSnapshot({
      view: {
        ...createSnapshot().view,
        legalActions: [
          {
            id: 'play-red-five',
            label: 'red-5',
            move: {
              kind: 'play-card',
              createdAt: '2026-04-25T09:00:01.000Z',
              playerId: 'p1',
              payload: {
                cardId: 'red-5',
                sayUno: true,
              },
            },
          },
        ],
      },
    });
    const listResult = createListResult(activeSnapshot);
    const submittedSnapshot = createSnapshot({
      updatedAt: '2026-04-25T09:00:04.000Z',
      view: {
        ...activeSnapshot.view,
        players: [
          {
            ...activeSnapshot.view.players[0]!,
            handCount: 6,
            isActive: false,
            visibleCards: [],
          },
          {
            ...activeSnapshot.view.players[1]!,
            isActive: true,
          },
        ],
        status: 'Bot Bravo to act',
      },
    });

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json(listResult);
      }

      if (url === '/api/games/rooms') {
        return Response.json([]);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}`) {
        return Response.json(activeSnapshot);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}/moves`) {
        expect(init?.body).toBe(
          JSON.stringify({
            move: activeSnapshot.view.legalActions[0]!.move,
          }),
        );
        return Response.json(submittedSnapshot);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(screen.getByText('Alice to act')).toBeTruthy();
    });

    const card = screen.getByLabelText('red-5');
    const dropZone = screen.getByTestId('uno-discard-drop-zone');
    const dataTransfer = {
      data: new Map<string, string>(),
      dropEffect: '',
      effectAllowed: '',
      getData(type: string) {
        return this.data.get(type) ?? '';
      },
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
    };

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(dropZone, { dataTransfer });
    fireEvent.drop(dropZone, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByText('Bot Bravo to act')).toBeTruthy();
    });
  });

  it('announces completed matches and links directly to the replay', async () => {
    const activeSnapshot = createSnapshot({
      view: {
        ...createSnapshot().view,
        legalActions: [
          {
            id: 'play-red-five',
            label: 'Play red-5',
            move: {
              kind: 'play-card',
              createdAt: '2026-04-25T09:00:01.000Z',
              playerId: 'p1',
              payload: {
                cardId: 'red-5',
                sayUno: true,
              },
            },
          },
        ],
      },
    });
    const completedSnapshot = createSnapshot({
      status: 'completed',
      finishedAt: '2026-04-25T09:00:02.000Z',
      updatedAt: '2026-04-25T09:00:02.000Z',
      result: {
        matchId: activeSnapshot.matchId,
        gameId: activeSnapshot.gameId,
        executionMode: 'server-authoritative',
        finishedAt: '2026-04-25T09:00:02.000Z',
        rankings: [
          { playerId: 'p1', position: 1, score: 0 },
          { playerId: 'p2', position: 2, score: 0 },
        ],
        winnerIds: ['p1'],
      },
      analysis: createAnalysis(1, 1),
      lastSequence: 1,
      view: {
        ...activeSnapshot.view,
        legalActions: [],
        matchResultBanner: 'Winner: Alice',
        players: [
          {
            ...activeSnapshot.view.players[0]!,
            handCount: 0,
            isActive: false,
            visibleCards: [],
          },
          {
            ...activeSnapshot.view.players[1]!,
            isActive: false,
          },
        ],
        status: 'Match complete',
      },
    });

    let matchListCalls = 0;
    let snapshotCalls = 0;

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        matchListCalls += 1;

        if (matchListCalls === 1) {
          return Response.json(createListResult(activeSnapshot));
        }

        return Response.json({
          active: [],
          recent: [
            {
              analysis: completedSnapshot.analysis,
              finishedAt: completedSnapshot.finishedAt,
              gameId: completedSnapshot.gameId,
              lastSequence: completedSnapshot.lastSequence,
              matchId: completedSnapshot.matchId,
              participants: completedSnapshot.participants,
              result: completedSnapshot.result,
              startedAt: completedSnapshot.startedAt,
              status: completedSnapshot.status,
              updatedAt: completedSnapshot.updatedAt,
            },
          ],
        } satisfies ListUnoMatchesResult);
      }

      if (url === '/api/games/rooms') {
        return Response.json([]);
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}`) {
        snapshotCalls += 1;
        return Response.json(
          snapshotCalls === 1 ? activeSnapshot : completedSnapshot,
        );
      }

      if (url === `/api/games/uno/matches/${activeSnapshot.matchId}/moves`) {
        expect(init?.body).toBe(
          JSON.stringify({
            move: activeSnapshot.view.legalActions[0]!.move,
          }),
        );
        return Response.json(completedSnapshot);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(screen.getByText('Alice to act')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Play red-5' }));

    await waitFor(() => {
      const replayLink = screen
        .getAllByRole('link')
        .find(
          (candidate) =>
            candidate.getAttribute('href') === '/en/past-games/match-uno-1',
        );

      expect(
        screen.getByText('Match finished and saved to past games.'),
      ).toBeTruthy();
      expect(replayLink).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Review replay' })).toBeNull();
    });
  });
});
