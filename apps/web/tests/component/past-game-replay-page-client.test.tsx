// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PastGameReplayPageClient } from '@/components/past-game-replay-page-client';

afterEach(() => {
  cleanup();
});

describe('PastGameReplayPageClient', () => {
  it('switches replay card visibility between bird-eye and player perspectives', () => {
    render(
      <PastGameReplayPageClient
        analysisCards={[]}
        backHref="/en/past-games"
        perspectives={[
          { id: 'bird-eye', kind: 'bird-eye', label: "Bird's eye" },
          { id: 'player:p1', kind: 'player', label: 'Alice' },
          { id: 'player:p2', kind: 'player', label: 'Bob' },
        ]}
        steps={[
          {
            id: 'match-uno:0',
            label: 'Opening state',
            acceptedAt: null,
            views: {
              'bird-eye': {
                status: 'Ready',
                matchResultBanner: null,
                players: [
                  {
                    playerId: 'p1',
                    displayName: 'Alice',
                    handCount: 1,
                    isViewer: false,
                    visibleCards: [{ id: 'red-4', label: 'red-4' }],
                  },
                  {
                    playerId: 'p2',
                    displayName: 'Bob',
                    handCount: 1,
                    isViewer: false,
                    visibleCards: [{ id: 'blue-1', label: 'blue-1' }],
                  },
                ],
              },
              'player:p1': {
                status: 'Ready',
                matchResultBanner: null,
                players: [
                  {
                    playerId: 'p1',
                    displayName: 'Alice',
                    handCount: 1,
                    isViewer: true,
                    visibleCards: [{ id: 'red-4', label: 'red-4' }],
                  },
                  {
                    playerId: 'p2',
                    displayName: 'Bob',
                    handCount: 1,
                    isViewer: false,
                    visibleCards: [],
                  },
                ],
              },
              'player:p2': {
                status: 'Ready',
                matchResultBanner: null,
                players: [
                  {
                    playerId: 'p1',
                    displayName: 'Alice',
                    handCount: 1,
                    isViewer: false,
                    visibleCards: [],
                  },
                  {
                    playerId: 'p2',
                    displayName: 'Bob',
                    handCount: 1,
                    isViewer: true,
                    visibleCards: [{ id: 'blue-1', label: 'blue-1' }],
                  },
                ],
              },
            },
          },
        ]}
        summaryDescription="Replay completed match."
        summaryTitle="Alice, Bob"
        timeline={[]}
      />,
    );

    expect(screen.getByText('red-4')).toBeTruthy();
    expect(screen.getByText('blue-1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Alice' }));

    expect(screen.getByText('red-4')).toBeTruthy();
    expect(screen.queryByText('blue-1')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));

    expect(screen.queryByText('red-4')).toBeNull();
    expect(screen.getByText('blue-1')).toBeTruthy();
  });
});
