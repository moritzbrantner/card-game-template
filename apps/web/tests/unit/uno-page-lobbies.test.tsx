// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UnoPageClient } from '@/apps/showcase/components/uno-page-client';

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
  createHint: 'Create a private lobby, invite another player, and choose bots.',
  createTitle: 'Create a lobby',
  description: 'UNO showcase.',
  emptyOpenLobbies: 'No open lobbies.',
  emptyRecentMatches: 'No recent matches.',
  exitGame: 'Abandon match',
  exitedGameStatus: 'Match abandoned.',
  finishGame: 'Finish demo match',
  hostBadge: 'Host',
  inviteDescription:
    'Someone invited you to this lobby. Enter a display name to claim a seat.',
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
  openLobbiesTitle: 'Your open lobbies',
  overviewAction: 'Back to overview',
  pastGamesCta: 'Past games',
  readyAction: 'Ready up',
  readyToStart: 'Everyone is seated. The host can start the game now.',
  recentMatchesTitle: 'Recent matches',
  reloadAction: 'Reload',
  reviewReplayAction: 'Review replay',
  reservedBotsLabel: 'Reserved bots',
  resumeAction: 'Resume',
  roomSizeLabel: 'Table size',
  shareInviteHint: 'Share this link so another player can join the lobby.',
  startGame: 'Start game',
  startedGameStatus: 'Game started.',
  title: 'UNO-style matches',
  waitingForPlayers: 'Waiting for players.',
};

describe('UnoPageClient lobby flow', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/en/uno');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a lobby with an explicit bot count', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json({ active: [], recent: [] });
      }

      if (url === '/api/games/rooms') {
        if ((init?.method ?? 'GET') === 'GET') {
          return Response.json([]);
        }

        return Response.json({
          roomId: 'room-1',
          roomName: "Alice's UNO-style room",
          gameId: 'uno-style',
          status: 'open',
          visibility: 'private',
          executionMode: 'server-authoritative',
          maxPlayers: 4,
          botCount: 2,
          hostPlayerId: 'player-1',
          activeMatchId: null,
          createdAt: '2026-04-25T09:00:00.000Z',
          updatedAt: '2026-04-25T09:00:00.000Z',
          seats: [
            {
              seat: 1,
              playerId: 'player-1',
              displayName: 'Alice',
              ready: false,
              connectionStatus: 'connected',
            },
          ],
          viewerPlayerId: 'player-1',
          viewerIsHost: true,
          canStart: false,
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/games/rooms',
        expect.objectContaining({
          method: 'GET',
          cache: 'no-store',
        }),
      );
    });

    fireEvent.change(screen.getByLabelText('Player name'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByLabelText('Bots'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/games/rooms',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            gameId: 'uno-style',
            displayName: 'Alice',
            maxPlayers: 4,
            botCount: 2,
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue(/invite=room-1/)).toBeTruthy();
    });
    expect(window.location.search).toContain('invite=room-1');
    expect(
      screen.queryByRole('heading', { name: 'Create a lobby' }),
    ).toBeNull();
  });

  it('joins an invited lobby from the invite query parameter', async () => {
    window.history.replaceState({}, '', '/en/uno?invite=room-invite-1');

    fetchMock.mockImplementation(async (input, _init) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json({ active: [], recent: [] });
      }

      if (url === '/api/games/rooms') {
        return Response.json([]);
      }

      if (url === '/api/games/rooms/room-invite-1/join') {
        return Response.json({
          roomId: 'room-invite-1',
          roomName: "Alice's UNO-style room",
          gameId: 'uno-style',
          status: 'open',
          visibility: 'private',
          executionMode: 'server-authoritative',
          maxPlayers: 4,
          botCount: 1,
          hostPlayerId: 'player-1',
          activeMatchId: null,
          createdAt: '2026-04-25T09:00:00.000Z',
          updatedAt: '2026-04-25T09:00:00.000Z',
          seats: [
            {
              seat: 1,
              playerId: 'player-1',
              displayName: 'Alice',
              ready: true,
              connectionStatus: 'connected',
            },
            {
              seat: 2,
              playerId: 'player-2',
              displayName: 'Bob',
              ready: false,
              connectionStatus: 'connected',
            },
          ],
          viewerPlayerId: 'player-2',
          viewerIsHost: false,
          canStart: false,
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(screen.getByText('Join invited lobby')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Player name'), {
      target: { value: 'Bob' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Join lobby' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/games/rooms/room-invite-1/join',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            displayName: 'Bob',
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Current lobby')).toBeTruthy();
    });
    expect(screen.getByText('Lobby joined.')).toBeTruthy();
    expect(screen.getAllByText(/Reserved bots/).length).toBeGreaterThan(0);
    expect(window.location.search).toContain('invite=room-invite-1');
  });

  it('keeps the lobby URL when the host starts a room', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json({ active: [], recent: [] });
      }

      if (url === '/api/games/rooms') {
        return Response.json([
          {
            roomId: 'room-1',
            roomName: "Alice's UNO-style room",
            gameId: 'uno-style',
            status: 'open',
            visibility: 'private',
            executionMode: 'server-authoritative',
            maxPlayers: 4,
            botCount: 2,
            hostPlayerId: 'player-1',
            activeMatchId: null,
            createdAt: '2026-04-25T09:00:00.000Z',
            updatedAt: '2026-04-25T09:00:00.000Z',
            seats: [
              {
                seat: 1,
                playerId: 'player-1',
                displayName: 'Alice',
                ready: true,
                connectionStatus: 'connected',
              },
            ],
            viewerPlayerId: 'player-1',
            viewerIsHost: true,
            canStart: true,
          },
        ]);
      }

      if (url === '/api/games/rooms/room-1/start') {
        return Response.json({
          roomId: 'room-1',
          roomName: "Alice's UNO-style room",
          gameId: 'uno-style',
          status: 'active',
          visibility: 'private',
          executionMode: 'server-authoritative',
          maxPlayers: 4,
          botCount: 2,
          hostPlayerId: 'player-1',
          activeMatchId: 'match-1',
          createdAt: '2026-04-25T09:00:00.000Z',
          updatedAt: '2026-04-25T09:01:00.000Z',
          seats: [
            {
              seat: 1,
              playerId: 'player-1',
              displayName: 'Alice',
              ready: true,
              connectionStatus: 'connected',
            },
          ],
          viewerPlayerId: 'player-1',
          viewerIsHost: true,
          canStart: false,
        });
      }

      if (url === '/api/games/rooms/room-1') {
        return Response.json({
          roomId: 'room-1',
          roomName: "Alice's UNO-style room",
          gameId: 'uno-style',
          status: 'active',
          visibility: 'private',
          executionMode: 'server-authoritative',
          maxPlayers: 4,
          botCount: 2,
          hostPlayerId: 'player-1',
          activeMatchId: 'match-1',
          createdAt: '2026-04-25T09:00:00.000Z',
          updatedAt: '2026-04-25T09:01:00.000Z',
          seats: [
            {
              seat: 1,
              playerId: 'player-1',
              displayName: 'Alice',
              ready: true,
              connectionStatus: 'connected',
            },
          ],
          viewerPlayerId: 'player-1',
          viewerIsHost: true,
          canStart: false,
        });
      }

      if (url === '/api/games/uno/matches/match-1') {
        return Response.json({
          matchId: 'match-1',
          gameId: 'uno-style',
          status: 'active',
          startedAt: '2026-04-25T09:01:00.000Z',
          finishedAt: null,
          updatedAt: '2026-04-25T09:01:00.000Z',
          participants: [],
          result: null,
          analysis: {
            generic: {
              acceptedMoveCount: 0,
              durationMs: null,
              executionMode: 'server-authoritative',
              finishedAt: null,
              gameId: 'uno-style',
              matchId: 'match-1',
              moveKinds: [],
              players: [],
              startedAt: '2026-04-25T09:01:00.000Z',
              turnsCompleted: 0,
              winnerIds: [],
            },
          },
          lastSequence: 0,
          executionMode: 'server-authoritative',
          replayFormatVersion: 'match-replay-v1',
          match: {
            activePlayerId: 'player-1',
            executionMode: 'server-authoritative',
            gameId: 'uno-style',
            matchId: 'match-1',
            players: [],
            state: {},
            turn: 1,
          },
          legalMoves: [],
          selectedActorPlayerId: 'player-1',
          view: {
            activeColor: 'red',
            activePlayerId: 'player-1',
            discardTop: null,
            drawPileCount: 42,
            legalActions: [],
            matchResultBanner: null,
            pendingDrawAmount: 0,
            pendingHotseatPlayerId: null,
            players: [],
            selectedActorPlayerId: 'player-1',
            status: 'Alice to act',
            viewerPlayerId: 'player-1',
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? 'GET'}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(screen.getByText("Alice's UNO-style room")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Active match' }),
      ).toBeTruthy();
    });
    expect(window.location.search).toContain('invite=room-1');
  });

  it('returns to overview without auto-resuming the old match on reload', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/uno/matches') {
        return Response.json({
          active: [
            {
              matchId: 'match-1',
              gameId: 'uno-style',
              status: 'active',
              startedAt: '2026-04-25T09:01:00.000Z',
              finishedAt: null,
              updatedAt: '2026-04-25T09:02:00.000Z',
              participants: [
                {
                  playerId: 'player-1',
                  seat: 0,
                  displayName: 'Alice',
                  identity: { kind: 'guest', guestId: 'guest-1' },
                  isBot: false,
                },
              ],
              result: null,
              analysis: null,
              lastSequence: 0,
            },
          ],
          recent: [],
        });
      }

      if (url === '/api/games/rooms') {
        return Response.json([]);
      }

      if (url === '/api/games/uno/matches/match-1') {
        return Response.json({
          matchId: 'match-1',
          gameId: 'uno-style',
          status: 'active',
          startedAt: '2026-04-25T09:01:00.000Z',
          finishedAt: null,
          updatedAt: '2026-04-25T09:02:00.000Z',
          participants: [],
          result: null,
          analysis: {
            generic: {
              acceptedMoveCount: 0,
              durationMs: null,
              executionMode: 'server-authoritative',
              finishedAt: null,
              gameId: 'uno-style',
              matchId: 'match-1',
              moveKinds: [],
              players: [],
              startedAt: '2026-04-25T09:01:00.000Z',
              turnsCompleted: 0,
              winnerIds: [],
            },
          },
          lastSequence: 0,
          executionMode: 'server-authoritative',
          replayFormatVersion: 'match-replay-v1',
          match: {
            activePlayerId: 'player-1',
            executionMode: 'server-authoritative',
            gameId: 'uno-style',
            matchId: 'match-1',
            players: [],
            state: {},
            turn: 1,
          },
          legalMoves: [],
          selectedActorPlayerId: 'player-1',
          view: {
            activeColor: 'red',
            activePlayerId: 'player-1',
            discardTop: null,
            drawPileCount: 42,
            legalActions: [],
            matchResultBanner: null,
            pendingDrawAmount: 0,
            pendingHotseatPlayerId: null,
            players: [],
            selectedActorPlayerId: 'player-1',
            status: 'Alice to act',
            viewerPlayerId: 'player-1',
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? 'GET'}`);
    });

    render(<UnoPageClient labels={labels} pastGamesHref="/en/past-games" />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Active match' }),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Create a lobby' }),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Reload' })[0]!);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Create a lobby' }),
      ).toBeTruthy();
    });
    expect(screen.queryByRole('heading', { name: 'Active match' })).toBeNull();
  });
});
