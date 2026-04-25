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
  pastGamesCta: 'Past games',
  readyAction: 'Ready up',
  readyToStart: 'Everyone is seated. The host can start the game now.',
  recentMatchesTitle: 'Recent matches',
  reloadAction: 'Reload',
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
  });
});
