// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnoLocalPageClient } from '@/apps/showcase/components/uno-local-page-client';

const sessionSpies = vi.hoisted(() => ({
  restart: vi.fn(),
  submitMove: vi.fn(),
  subscribe: vi.fn(() => () => undefined),
}));

const playMove = {
  createdAt: '2026-09-12T20:00:00.000Z',
  kind: 'play-card' as const,
  payload: {
    cardId: 'green-2',
    sayUno: false,
  },
  playerId: 'p1',
};

const drawMove = {
  createdAt: '2026-09-12T20:00:01.000Z',
  kind: 'draw-card' as const,
  payload: {},
  playerId: 'p1',
};

const snapshot = {
  history: [],
  legalMoves: [],
  match: {
    activePlayerId: 'p1',
    executionMode: 'local',
    gameId: 'uno-style',
    matchId: 'web-preview:uno:bot-duel',
    players: [],
    state: {},
    turn: 1,
  },
  matchResult: null,
  participants: [],
  pendingHotseatPlayerId: null,
  selectedActorPlayerId: 'p1',
  view: {
    activeColor: 'green' as const,
    activePlayerId: 'p1',
    discardTop: {
      color: 'green' as const,
      id: 'green-skip',
      kind: 'skip' as const,
      label: 'Green Skip',
    },
    drawPileCount: 42,
    legalActions: [
      {
        id: 'play-card:{"cardId":"green-2","sayUno":false}',
        label: 'Play Green 2',
        move: playMove,
      },
      {
        id: 'draw-card:{}',
        label: 'Draw a card',
        move: drawMove,
      },
    ],
    matchResultBanner: null,
    pendingDrawAmount: 0,
    pendingHotseatPlayerId: null,
    players: [
      {
        controller: 'human' as const,
        displayName: 'Player One',
        handCount: 2,
        isActor: true,
        isActive: true,
        isViewer: true,
        playerId: 'p1',
        visibleCards: [
          {
            color: 'green' as const,
            directPlay: {
              actions: [
                {
                  chosenColor: null,
                  id: 'play-card:{"cardId":"green-2","sayUno":false}',
                  label: 'Play Green 2',
                  move: playMove,
                  sayUno: false,
                  targetPlayerId: null,
                },
              ],
              defaultActionId:
                'play-card:{"cardId":"green-2","sayUno":false}',
              promptsForColorChoice: false,
            },
            id: 'green-2',
            kind: 'number' as const,
            label: 'Green 2',
            value: 2,
          },
          {
            color: 'red' as const,
            directPlay: null,
            id: 'red-8',
            kind: 'number' as const,
            label: 'Red 8',
            value: 8,
          },
        ],
      },
      {
        controller: 'bot' as const,
        displayName: 'UNO Bot',
        handCount: 5,
        isActor: false,
        isActive: false,
        isViewer: false,
        playerId: 'p2',
        visibleCards: [],
      },
    ],
    selectedActorPlayerId: 'p1',
    status: 'Player One to act',
    viewerPlayerId: 'p1',
  },
  viewerPlayerId: 'p1',
};

vi.mock('@repo/game-uno', () => ({
  createUnoAdapter: vi.fn(() => ({ kind: 'uno-adapter' })),
  createUnoBots: vi.fn(() => []),
  defaultUnoRules: {},
  getUnoExamplePreset: vi.fn(() => ({
    hotseat: false,
    id: 'bot-duel',
    label: 'Bot duel',
    seats: [],
  })),
  projectUnoPlayerView: vi.fn(),
}));

vi.mock('@repo/game-session', () => ({
  createLocalGameSession: vi.fn(() => ({
    getSnapshot: () => snapshot,
    restart: sessionSpies.restart,
    submitMove: sessionSpies.submitMove,
    subscribe: sessionSpies.subscribe,
  })),
}));

const labels = {
  activeColorLabel: 'Active color',
  activeTurnLabel: 'Active turn',
  botLabel: 'Bot',
  cardsLabel: 'cards',
  colors: {
    blue: 'Blue',
    green: 'Green',
    red: 'Red',
    yellow: 'Yellow',
  },
  completedMessage: 'Match complete',
  description: 'Play a local match against a deterministic bot.',
  discardPileLabel: 'Discard pile',
  drawPileLabel: 'Draw pile',
  handTitle: 'Your hand',
  humanLabel: 'Human',
  inProgressStatus: 'In progress',
  legalActionsTitle: 'Actions',
  localMatchLabel: 'Local bot match',
  playersTitle: 'Players',
  restartAction: 'Restart match',
  statusLabel: 'Status',
  tableLabel: 'UNO table',
  title: 'UNO-style',
  turnLabel: 'Turn',
  waitingForPlayers: 'Waiting',
  winnerLabel: 'Winner',
};

describe('UnoLocalPageClient', () => {
  beforeEach(() => {
    sessionSpies.restart.mockReset();
    sessionSpies.submitMove.mockReset();
    sessionSpies.subscribe.mockClear();
  });

  it('plays a legal card directly from the hand instead of duplicating it as a toolbar action', () => {
    render(<UnoLocalPageClient labels={labels} />);

    expect(screen.getByRole('heading', { name: 'UNO-style' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Green 2' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play Green 2' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Green 2' }));

    expect(sessionSpies.submitMove).toHaveBeenCalledWith(playMove);
  });

  it('keeps draw and restart controls connected to the local session', () => {
    render(<UnoLocalPageClient labels={labels} />);

    fireEvent.click(screen.getByRole('button', { name: 'Draw pile' }));

    expect(sessionSpies.submitMove).toHaveBeenCalledWith(drawMove);

    sessionSpies.submitMove.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Restart match' }));

    expect(sessionSpies.restart).toHaveBeenCalledOnce();
  });
});
