// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TcgPageClient } from '@/apps/showcase/components/tcg-page-client';

const labels = {
  activeMatchDescription: 'Server authoritative Arcane Duel match.',
  activeMatchTitle: 'Active duel',
  activeMatchesTitle: 'Your active duels',
  analysisTitle: 'Analysis',
  battlefieldLabel: 'Battlefield',
  createAction: 'Create match',
  createHint: 'Choose a preset and seat name before the duel starts.',
  createTitle: 'Start a duel',
  createdMatchStatus: 'Duel created.',
  deckLabel: 'Deck',
  description: 'Arcane Duel showcase.',
  emptyBattlefield: 'No units in play.',
  emptyRecentMatches: 'No recent duels.',
  handLabel: 'Hand',
  lastWinnerLabel: 'Last winner',
  legalActionsTitle: 'Legal actions',
  lifeLabel: 'Life',
  manaLabel: 'Mana',
  nameLabel: 'Player name',
  noActiveMatch: 'Create or resume a duel.',
  playersTitle: 'Duelists',
  presetLabel: 'Preset',
  recentMatchesTitle: 'Recent matches',
  reloadAction: 'Reload',
  resumeAction: 'Resume',
  statusLabel: 'Duel status',
  subtitle: 'Persisted Arcane Duel with bots and legal-action controls.',
  title: 'Arcane Duel matches',
  waitingForPlayers: 'No legal action is available right now.',
};

function createSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    matchId: 'match-tcg-1',
    gameId: 'arcane-duel',
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
        displayName: 'Rune Bot',
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
      matchId: 'match-tcg-1',
      gameId: 'arcane-duel',
      activePlayerId: 'p1',
      executionMode: 'server-authoritative',
      turn: 1,
      players: [
        { playerId: 'p1', displayName: 'Alice' },
        { playerId: 'p2', displayName: 'Rune Bot' },
      ],
      state: {},
    },
    legalMoves: [{ kind: 'end-turn', playerId: 'p1', payload: {} }],
    selectedActorPlayerId: 'p1',
    view: {
      activePlayerId: 'p1',
      legalActions: [
        {
          id: 'end-turn:{}',
          label: 'End turn',
          move: { kind: 'end-turn', playerId: 'p1', payload: {} },
        },
      ],
      matchResultBanner: null,
      players: [
        {
          battlefield: [],
          controller: 'human',
          deckCount: 20,
          displayName: 'Alice',
          handCount: 1,
          isActive: true,
          isViewer: true,
          life: 20,
          mana: 1,
          maxMana: 1,
          playerId: 'p1',
          visibleHand: [],
        },
        {
          battlefield: [],
          controller: 'bot',
          deckCount: 20,
          displayName: 'Rune Bot',
          handCount: 3,
          isActive: false,
          isViewer: false,
          life: 20,
          mana: 0,
          maxMana: 0,
          playerId: 'p2',
          visibleHand: [],
        },
      ],
      status: 'Alice to act',
      viewerPlayerId: 'p1',
    },
    ...overrides,
  };
}

describe('TcgPageClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates and plays a persisted Arcane Duel match', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === '/api/games/tcg/matches') {
        if ((init?.method ?? 'GET') === 'GET') {
          return Response.json({ active: [], recent: [] });
        }

        return Response.json(createSnapshot());
      }

      if (url === '/api/games/tcg/matches/match-tcg-1') {
        return Response.json(createSnapshot());
      }

      if (url === '/api/games/tcg/matches/match-tcg-1/moves') {
        expect(init?.body).toBe(
          JSON.stringify({
            move: {
              kind: 'end-turn',
              playerId: 'p1',
              payload: {},
            },
          }),
        );
        return Response.json(
          createSnapshot({
            view: {
              ...createSnapshot().view,
              status: 'Rune Bot to act',
              legalActions: [],
            },
          }),
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<TcgPageClient labels={labels} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/games/tcg/matches',
        expect.objectContaining({
          cache: 'no-store',
          method: 'GET',
        }),
      );
    });

    await waitFor(() => {
      const createButton = screen.getByRole('button', {
        name: 'Create match',
      }) as HTMLButtonElement;
      expect(createButton.disabled).toBe(false);
    });
    const createButton = screen.getByRole('button', { name: 'Create match' });

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Active duel' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'End turn' }));

    await waitFor(() => {
      expect(screen.getByText('Rune Bot to act')).toBeTruthy();
    });
  });
});
