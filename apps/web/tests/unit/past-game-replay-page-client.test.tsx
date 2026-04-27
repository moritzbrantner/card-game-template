// @vitest-environment jsdom

import type { ReactNode } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PastGameReplayPageClient } from '@/components/past-game-replay-page-client';

vi.mock('@moritzbrantner/ui', async () => {
  const actual =
    await vi.importActual<typeof import('@moritzbrantner/ui')>(
      '@moritzbrantner/ui',
    );

  return {
    ...actual,
    ChartContainer: ({ children: _children }: { children?: ReactNode }) => (
      <div data-testid="hand-size-chart" />
    ),
    ChartTooltip: () => null,
    ChartTooltipContent: () => null,
  };
});

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
                    visibleCards: [
                      {
                        id: 'red-4',
                        color: 'red',
                        kind: 'number',
                        label: 'red-4',
                        value: 4,
                      },
                    ],
                  },
                  {
                    playerId: 'p2',
                    displayName: 'Bob',
                    handCount: 1,
                    isViewer: false,
                    visibleCards: [
                      {
                        id: 'blue-1',
                        color: 'blue',
                        kind: 'number',
                        label: 'blue-1',
                        value: 1,
                      },
                    ],
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
                    visibleCards: [
                      {
                        id: 'red-4',
                        color: 'red',
                        kind: 'number',
                        label: 'red-4',
                        value: 4,
                      },
                    ],
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
                    visibleCards: [
                      {
                        id: 'blue-1',
                        color: 'blue',
                        kind: 'number',
                        label: 'blue-1',
                        value: 1,
                      },
                    ],
                  },
                ],
              },
            },
          },
        ]}
        summaryDescription="Replay completed match."
        summaryTitle="Alice, Bob"
        timeline={[
          {
            id: 'opening',
            label: 'Opening state',
            acceptedAt: null,
            stepIndex: 0,
          },
        ]}
      />,
    );

    expect(screen.getByLabelText('red-4')).toBeTruthy();
    expect(screen.getByLabelText('blue-1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Alice' }));

    expect(screen.getByLabelText('red-4')).toBeTruthy();
    expect(screen.queryByLabelText('blue-1')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));

    expect(screen.queryByLabelText('red-4')).toBeNull();
    expect(screen.getByLabelText('blue-1')).toBeTruthy();
  });

  it('supports stepping through moves and minimizing the timeline rail', () => {
    render(
      <PastGameReplayPageClient
        analysisCards={[]}
        backHref="/en/past-games"
        perspectives={[
          { id: 'bird-eye', kind: 'bird-eye', label: "Bird's eye" },
          { id: 'player:p1', kind: 'player', label: 'Alice' },
        ]}
        steps={[
          {
            id: 'match-uno:0',
            label: 'Opening state',
            acceptedAt: null,
            views: {
              'bird-eye': {
                status: 'Alice to act',
                matchResultBanner: null,
                players: [
                  {
                    playerId: 'p1',
                    displayName: 'Alice',
                    handCount: 7,
                    isViewer: false,
                    visibleCards: [],
                  },
                  {
                    playerId: 'p2',
                    displayName: 'Bob',
                    handCount: 7,
                    isViewer: false,
                    visibleCards: [],
                  },
                ],
              },
              'player:p1': {
                status: 'Alice to act',
                matchResultBanner: null,
                players: [
                  {
                    playerId: 'p1',
                    displayName: 'Alice',
                    handCount: 7,
                    isViewer: true,
                    visibleCards: [],
                  },
                  {
                    playerId: 'p2',
                    displayName: 'Bob',
                    handCount: 7,
                    isViewer: false,
                    visibleCards: [],
                  },
                ],
              },
            },
          },
          {
            id: 'match-uno:1',
            label: 'After move 1',
            acceptedAt: '2026-04-27T10:00:00.000Z',
            views: {
              'bird-eye': {
                status: 'Bob to act',
                matchResultBanner: null,
                players: [
                  {
                    playerId: 'p1',
                    displayName: 'Alice',
                    handCount: 6,
                    isViewer: false,
                    visibleCards: [],
                  },
                  {
                    playerId: 'p2',
                    displayName: 'Bob',
                    handCount: 7,
                    isViewer: false,
                    visibleCards: [],
                  },
                ],
              },
              'player:p1': {
                status: 'Bob to act',
                matchResultBanner: null,
                players: [
                  {
                    playerId: 'p1',
                    displayName: 'Alice',
                    handCount: 6,
                    isViewer: true,
                    visibleCards: [],
                  },
                  {
                    playerId: 'p2',
                    displayName: 'Bob',
                    handCount: 7,
                    isViewer: false,
                    visibleCards: [],
                  },
                ],
              },
            },
          },
        ]}
        summaryDescription="Replay completed match."
        summaryTitle="Alice, Bob"
        timeline={[
          {
            id: 'opening',
            label: 'Opening state',
            acceptedAt: null,
            stepIndex: 0,
          },
          {
            id: 'move-1',
            label: 'Alice played play-card',
            acceptedAt: '2026-04-27T10:00:00.000Z',
            stepIndex: 1,
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'After move 1' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(screen.getByRole('heading', { name: 'Opening state' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Minimize timeline' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Go to Alice played play-card' }),
    );

    expect(screen.getByRole('heading', { name: 'After move 1' })).toBeTruthy();
  });
});
