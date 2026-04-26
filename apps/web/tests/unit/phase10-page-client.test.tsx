// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Phase10PageClient } from '@/apps/showcase/components/phase-10-page-client';

const sessionSpies = vi.hoisted(() => ({
  confirmHotseat: vi.fn(),
  restart: vi.fn(),
  submitMove: vi.fn(),
  subscribe: vi.fn(() => () => undefined),
}));

const snapshotState = vi.hoisted(() => ({
  current: {
    history: [],
    legalMoves: [],
    match: {
      activePlayerId: 'p1',
      executionMode: 'local',
      gameId: 'phase-10',
      matchId: 'phase10-demo',
      players: [],
      state: {},
      turn: 1,
    },
    matchResult: null,
    participants: [],
    pendingHotseatPlayerId: null as string | null,
    selectedActorPlayerId: 'p1',
    view: {
      activePlayerId: 'p1',
      discardTop: {
        color: 'red',
        id: 'discard-red-9',
        kind: 'number',
        label: 'Red 9',
        value: 9,
      },
      drawPileCount: 47,
      legalActions: [
        {
          id: 'draw-card',
          label: 'Draw Red 9',
          move: {
            createdAt: '2026-04-26T12:00:00.000Z',
            kind: 'draw-card',
            payload: { source: 'discard' },
            playerId: 'p1',
          },
        },
      ],
      matchResultBanner: null,
      phaseOrder: ['Phase 1: 2 sets of 3'],
      phaseLabel: 'Phase 1: 2 sets of 3',
      players: [
        {
          controller: 'human',
          displayName: 'Player One',
          handCount: 7,
          isActive: true,
          isViewer: true,
          laidGroups: [
            {
              cards: [
                {
                  color: 'red',
                  id: 'laid-red-5',
                  kind: 'number',
                  label: 'Red 5',
                  value: 5,
                },
                {
                  color: 'blue',
                  id: 'laid-blue-5',
                  kind: 'number',
                  label: 'Blue 5',
                  value: 5,
                },
              ],
              cardIds: ['laid-red-5', 'laid-blue-5'],
              label: 'Set of 5s',
              type: 'set',
              value: 5,
            },
          ],
          phaseComplete: true,
          phaseLabel: 'Phase 1: 2 sets of 3',
          phaseNumber: 1,
          playerId: 'p1',
          skipped: false,
          visibleCards: [
            {
              color: 'red',
              id: 'red-5',
              kind: 'number',
              label: 'Red 5',
              value: 5,
            },
          ],
        },
        {
          controller: 'bot',
          displayName: 'Phase Bot',
          handCount: 8,
          isActive: false,
          isViewer: false,
          laidGroups: [],
          phaseComplete: false,
          phaseLabel: 'Phase 1: 2 sets of 3',
          phaseNumber: 1,
          playerId: 'p2',
          skipped: false,
          visibleCards: [],
        },
      ],
      round: 1,
      status: 'Player One to act',
      viewerPlayerId: 'p1',
    },
    viewerPlayerId: 'p1',
  },
}));

vi.mock('@repo/game-catalog', () => ({
  defaultGameCatalog: {
    get: vi.fn(() => ({
      metadata: {
        route: '/phase-10',
      },
    })),
  },
}));

vi.mock('@repo/game-phase-10', () => ({
  createPhase10Adapter: () => ({ kind: 'phase10-adapter' }),
  createPhase10Bots: () => [],
  defaultPhase10Phases: [
    {
      id: 'phase-1',
      label: 'Phase 1: 2 sets of 3',
      setCount: 2,
      setSize: 3,
    },
  ],
  defaultPhase10Rules: {
    allowHitting: true,
    allowSkipping: true,
    handSize: 10,
    setCount: 2,
    setSize: 3,
  },
  formatPhase10PhaseLabel: (
    setCount: number,
    setSize: number,
    phaseNumber?: number,
  ) => `Phase ${phaseNumber ?? 1}: ${setCount} sets of ${setSize}`,
  getPhase10ExamplePreset: (presetId: string) => ({
    hotseat: presetId !== 'bot-duel',
    seats: [{ displayName: 'Player One', playerId: 'p1' }],
  }),
  phase10ExamplePresets: [
    { id: 'mixed-table', label: 'Mixed table' },
    { id: 'bot-duel', label: 'Bot duel' },
  ],
  projectPhase10PlayerView: () => snapshotState.current.view,
}));

vi.mock('@repo/game-session', () => ({
  createLocalGameSession: vi.fn(() => ({
    confirmHotseat: sessionSpies.confirmHotseat,
    getSnapshot: () => snapshotState.current,
    restart: sessionSpies.restart,
    submitMove: sessionSpies.submitMove,
    subscribe: sessionSpies.subscribe,
  })),
}));

const labels = {
  addPhaseAction: 'Add phase',
  catalogRouteLabel: 'Catalog route',
  decreaseSetCountAction: 'Sets -',
  decreaseSetSizeAction: 'Size -',
  description: 'Local Phase 10 showcase.',
  drawPileLabel: 'Draw pile',
  handTitle: 'Viewer hand',
  hotseatDescription:
    'The next turn belongs to {playerId}. Confirm the handoff before revealing that hand on this device.',
  hotseatTitle: 'Hotseat handoff',
  increaseSetCountAction: 'Sets +',
  increaseSetSizeAction: 'Size +',
  legalActionsTitle: 'Legal actions',
  localModeBadge: 'Local session',
  movePhaseEarlierAction: 'Earlier',
  movePhaseLaterAction: 'Later',
  phaseLabel: 'Round target',
  phaseConfiguratorDescription: 'Adjust the configured phase order.',
  phaseConfiguratorTitle: 'Phase configurator',
  phaseOrderTitle: 'Phase order',
  playersTitle: 'Table seats',
  presetsTitle: 'Table presets',
  removePhaseAction: 'Remove',
  restartAction: 'Restart round',
  roundLabel: 'Round',
  revealHandAction: 'Reveal next hand',
  startConfiguredRoundAction: 'Start configured round',
  statusTitle: 'Round status',
  subtitle: 'Configurable phases.',
  tableDiscardLabel: 'Discard stack',
  tableDrawLabel: 'Draw stack',
  title: 'Phase 10 local showcase',
  waitingForPlayers: 'No legal action is available for the current view.',
};

describe('Phase10PageClient', () => {
  beforeEach(() => {
    sessionSpies.confirmHotseat.mockReset();
    sessionSpies.restart.mockReset();
    sessionSpies.submitMove.mockReset();
    sessionSpies.subscribe.mockClear();
    snapshotState.current.pendingHotseatPlayerId = null;
    snapshotState.current.view.legalActions = [
      {
        id: 'draw-card',
        label: 'Draw Red 9',
        move: {
          createdAt: '2026-04-26T12:00:00.000Z',
          kind: 'draw-card',
          payload: { source: 'discard' },
          playerId: 'p1',
        },
      },
    ];
  });

  it('renders the local showcase and routes legal actions into the session', () => {
    render(<Phase10PageClient labels={labels} />);

    expect(
      screen.getByRole('heading', { name: 'Phase 10 local showcase' }),
    ).toBeTruthy();
    expect(screen.getByText('/phase-10')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Draw Red 9' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restart round' }));

    expect(sessionSpies.submitMove).toHaveBeenCalledWith({
      createdAt: '2026-04-26T12:00:00.000Z',
      kind: 'draw-card',
      payload: { source: 'discard' },
      playerId: 'p1',
    });
    expect(sessionSpies.restart).toHaveBeenCalledTimes(1);
    expect(sessionSpies.subscribe).toHaveBeenCalledTimes(1);
  });

  it('shows the hotseat takeover flow when the next human player must confirm', () => {
    snapshotState.current.pendingHotseatPlayerId = 'p2';
    snapshotState.current.view.legalActions = [];

    render(<Phase10PageClient labels={labels} />);

    expect(screen.getByText(/The next turn belongs to p2\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal next hand' }));

    expect(sessionSpies.confirmHotseat).toHaveBeenCalledTimes(1);
  });
});
