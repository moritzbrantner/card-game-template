// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PokerPageClient } from '@/apps/showcase/components/poker-page-client';

const labels = {
  activeMatchDescription: 'Server authoritative poker match.',
  activeMatchTitle: 'Active table',
  activeMatchesTitle: 'Your active tables',
  analysisTitle: 'Analysis',
  communityCardsLabel: 'Board',
  createAction: 'Create match',
  createHint: 'Choose a preset and seat name before the server deals the hand.',
  createTitle: 'Start a poker table',
  createdMatchStatus: 'Match created.',
  description: 'Texas Hold’em showcase.',
  emptyBoard: 'No community cards revealed yet.',
  emptyRecentMatches: 'No recent poker matches.',
  holeCardsHidden: 'Hole cards stay hidden until showdown.',
  lastWinnerLabel: 'Last winner',
  legalActionsTitle: 'Legal actions',
  nameLabel: 'Player name',
  noActiveMatch: 'Create or resume a poker table.',
  phaseLabel: 'Phase',
  playersTitle: 'Seats',
  potLabel: 'Pot',
  presetLabel: 'Preset',
  recentMatchesTitle: 'Recent matches',
  reloadAction: 'Reload',
  resumeAction: 'Resume',
  statusLabel: 'Table status',
  subtitle: 'Persisted Texas Hold’em with bots and legal-action controls.',
  title: 'Texas Hold’em matches',
  waitingForPlayers: 'No legal action is available right now.',
};

function createSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    matchId: 'match-poker-1',
    gameId: 'texas-holdem',
    status: 'active',
    startedAt: '2026-04-25T09:00:00.000Z',
    finishedAt: null,
    updatedAt: '2026-04-25T09:00:00.000Z',
    executionMode: 'server-authoritative',
    replayFormatVersion: 1,
    lastSequence: 0,
    participants: [
      {
        playerId: 'p1',
        seat: 1,
        displayName: 'Alice',
        identity: { kind: 'guest', guestId: 'guest-1' },
        isBot: false,
      },
      {
        playerId: 'p2',
        seat: 2,
        displayName: 'Caller Bot',
        identity: { kind: 'bot' },
        isBot: true,
      },
    ],
    result: null,
    analysis: {
      generic: {
        acceptedMoveCount: 0,
        turnsCompleted: 0,
      },
    },
    match: {
      matchId: 'match-poker-1',
      gameId: 'texas-holdem',
      activePlayerId: 'p1',
      executionMode: 'server-authoritative',
      turn: 1,
      players: [
        { playerId: 'p1', displayName: 'Alice' },
        { playerId: 'p2', displayName: 'Caller Bot' },
      ],
      state: {
        actedPlayerIds: [],
        betsThisRound: {},
        communityCards: [],
        currentBet: 0,
        deck: [],
        foldedPlayerIds: [],
        hands: {
          p1: [
            {
              id: 'as',
              label: 'A spades',
              rank: 'A',
              suit: 'spades',
            },
            {
              id: 'kh',
              label: 'K hearts',
              rank: 'K',
              suit: 'hearts',
            },
          ],
          p2: [],
        },
        lastEvent: "Texas Hold'em hand started",
        phase: 'preflop',
        pot: 0,
        rules: {
          betSizes: [10, 20, 50],
          startingStack: 100,
        },
        seed: 'match-poker-1',
        showdown: null,
        stacks: {
          p1: 100,
          p2: 100,
        },
        winnerIds: [],
      },
    },
    legalMoves: [{ kind: 'check', playerId: 'p1', payload: {} }],
    selectedActorPlayerId: 'p1',
    view: {
      activePlayerId: 'p1',
      communityCards: [],
      legalActions: [
        {
          id: 'check:{}',
          label: 'Check',
          move: { kind: 'check', playerId: 'p1', payload: {} },
        },
      ],
      matchResultBanner: null,
      phase: 'preflop',
      players: [
        {
          controller: 'human',
          displayName: 'Alice',
          hasFolded: false,
          isActive: true,
          isViewer: true,
          playerId: 'p1',
          stack: 100,
          visibleCards: [
            {
              id: 'as',
              label: 'A spades',
              rank: 'A',
              suit: 'spades',
            },
            {
              id: 'kh',
              label: 'K hearts',
              rank: 'K',
              suit: 'hearts',
            },
          ],
        },
        {
          controller: 'bot',
          displayName: 'Caller Bot',
          hasFolded: false,
          isActive: false,
          isViewer: false,
          playerId: 'p2',
          stack: 100,
          visibleCards: [],
        },
      ],
      pot: 0,
      status: "Texas Hold'em hand started",
      viewerPlayerId: 'p1',
    },
    ...overrides,
  };
}

describe('PokerPageClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/en/poker');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates and plays a persisted poker match', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/poker/matches') {
        if ((init?.method ?? 'GET') === 'GET') {
          return Response.json({ active: [], recent: [] });
        }

        return Response.json(createSnapshot());
      }

      if (url === '/api/games/poker/matches/match-poker-1') {
        return Response.json(createSnapshot());
      }

      if (url === '/api/games/poker/matches/match-poker-1/moves') {
        return Response.json(
          createSnapshot({
            updatedAt: '2026-04-25T09:01:00.000Z',
            lastSequence: 1,
            analysis: {
              generic: {
                acceptedMoveCount: 1,
                turnsCompleted: 1,
              },
            },
            view: {
              activePlayerId: 'p1',
              communityCards: [
                {
                  id: '2c',
                  label: '2 clubs',
                  rank: '2',
                  suit: 'clubs',
                },
                {
                  id: '7d',
                  label: '7 diamonds',
                  rank: '7',
                  suit: 'diamonds',
                },
                {
                  id: 'jh',
                  label: 'J hearts',
                  rank: 'J',
                  suit: 'hearts',
                },
              ],
              legalActions: [],
              matchResultBanner: null,
              phase: 'flop',
              players: [
                {
                  controller: 'human',
                  displayName: 'Alice',
                  hasFolded: false,
                  isActive: false,
                  isViewer: true,
                  playerId: 'p1',
                  stack: 100,
                  visibleCards: [
                    {
                      id: 'as',
                      label: 'A spades',
                      rank: 'A',
                      suit: 'spades',
                    },
                    {
                      id: 'kh',
                      label: 'K hearts',
                      rank: 'K',
                      suit: 'hearts',
                    },
                  ],
                },
                {
                  controller: 'bot',
                  displayName: 'Caller Bot',
                  hasFolded: false,
                  isActive: true,
                  isViewer: false,
                  playerId: 'p2',
                  stack: 100,
                  visibleCards: [],
                },
              ],
              pot: 0,
              status: 'p1 checked',
              viewerPlayerId: 'p1',
            },
          }),
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<PokerPageClient labels={labels} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/games/poker/matches',
        expect.objectContaining({
          method: 'GET',
          cache: 'no-store',
        }),
      );
    });

    fireEvent.change(screen.getByLabelText('Player name'), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByLabelText('Preset'), {
      target: { value: 'four-seat-bots' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create match' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/games/poker/matches',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            presetId: 'four-seat-bots',
            displayName: 'Alice',
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Active table' }),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/games/poker/matches/match-poker-1/moves',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            move: {
              kind: 'check',
              playerId: 'p1',
              payload: {},
            },
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('p1 checked').length).toBeGreaterThan(0);
    });
  });
});
