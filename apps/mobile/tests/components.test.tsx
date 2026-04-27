import React, { act } from '../node_modules/react';
import { createRoot, type Root } from '../node_modules/react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeModeProvider, useThemeMode } from '@/hooks/theme-mode';
import { ThemeModeToggle } from '@/components/theme-mode-toggle';

const routerState = {
  profile: '@jules',
};

const sessionSpies = {
  confirmHotseat: vi.fn(),
  restart: vi.fn(),
  submitMove: vi.fn(),
  subscribe: vi.fn(() => () => undefined),
};

vi.mock('expo-router', () => ({
  Link: ({
    children,
    href,
    style: _style,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    style?: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocalSearchParams: () => routerState,
}));

vi.mock('@repo/game-catalog', () => ({
  defaultGameCatalog: {
    get: () => ({
      metadata: {
        route: '/games/uno',
      },
    }),
  },
}));

vi.mock('@repo/game-session', () => ({
  createLocalGameSession: ({ adapter }: { adapter?: { kind?: string } }) => {
    const shared = {
      confirmHotseat: sessionSpies.confirmHotseat,
      restart: sessionSpies.restart,
      submitMove: sessionSpies.submitMove,
      subscribe: sessionSpies.subscribe,
    };

    if (adapter?.kind === 'phase10-adapter') {
      return {
        ...shared,
        getSnapshot: () => ({
          pendingHotseatPlayerId: null,
          view: {
            discardTop: { id: 'discard-red-9', label: 'Red 9' },
            drawPileCount: 31,
            legalActions: [
              {
                id: 'draw-discard',
                label: 'Draw Red 9',
                move: {
                  kind: 'draw-card',
                  payload: { source: 'discard' },
                  playerId: 'player-1',
                },
              },
            ],
            matchResultBanner: null,
            phaseOrder: ['Phase 1: 2 sets of 3'],
            phaseLabel: 'Phase 1: 2 sets of 3',
            players: [
              {
                controller: 'human',
                displayName: 'Player 1',
                handCount: 10,
                isActive: true,
                isViewer: true,
                laidGroups: [],
                phaseComplete: false,
                phaseLabel: 'Phase 1: 2 sets of 3',
                phaseNumber: 1,
                playerId: 'player-1',
                skipped: false,
                visibleCards: [{ id: 'red-5', label: 'Red 5' }],
              },
            ],
            round: 1,
            status: 'Player 1 to draw',
          },
        }),
      };
    }

    return {
      ...shared,
      getSnapshot: () => ({
        view: {
          activeColor: 'red',
          drawPileCount: 42,
          legalActions: [
            {
              id: 'play-red-five',
              label: 'Play red 5',
              move: {
                kind: 'play-card',
                payload: { cardId: 'red-5' },
                playerId: 'player-1',
              },
            },
          ],
          matchResultBanner: null,
          pendingDrawAmount: 0,
          pendingHotseatPlayerId: null,
          players: [
            {
              controller: 'human',
              displayName: 'Player 1',
              handCount: 3,
              isActive: true,
              playerId: 'player-1',
              visibleCards: [{ id: 'red-5', label: 'Red 5' }],
            },
          ],
          status: 'Player 1 to act',
        },
      }),
    };
  },
  type: {},
}));

vi.mock('@repo/game-uno', () => ({
  createUnoAdapter: () => ({ kind: 'uno-adapter' }),
  createUnoBots: () => [],
  defaultUnoRules: {
    drawStacking: false,
    jumpIn: false,
    requireUnoCall: true,
    sevenZero: false,
  },
  getUnoExamplePreset: () => ({
    hotseat: false,
    seats: [{ displayName: 'Player 1', playerId: 'player-1' }],
  }),
  projectUnoPlayerView: () => ({}),
  unoExamplePresets: [{ id: 'mixed-table', label: 'Mixed table' }],
}));

vi.mock('@repo/game-phase-10', () => ({
  createPhase10Adapter: () => ({ kind: 'phase10-adapter' }),
  createPhase10Bots: () => [],
  defaultPhase10Phases: [
    {
      id: 'phase-1',
      label: 'Phase 1: 2 sets of 3',
      requirements: [
        { size: 3, type: 'set' },
        { size: 3, type: 'set' },
      ],
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
    requirementsOrSetCount: number | Array<{ size: number; type: string }>,
    setSizeOrPhaseNumber?: number,
    maybePhaseNumber?: number,
  ) => {
    if (Array.isArray(requirementsOrSetCount)) {
      return `Phase ${setSizeOrPhaseNumber ?? 1}: ${requirementsOrSetCount
        .map((requirement) => `${requirement.type}-${requirement.size}`)
        .join(' + ')}`;
    }

    return `Phase ${maybePhaseNumber ?? 1}: ${requirementsOrSetCount} sets of ${setSizeOrPhaseNumber}`;
  },
  formatPhase10RequirementLabel: (requirement: {
    size: number;
    type: string;
  }) =>
    requirement.type === 'set'
      ? `set of ${requirement.size}`
      : requirement.type === 'color'
        ? `${requirement.size} cards of one color`
        : `street of ${requirement.size}`,
  getPhase10ExamplePreset: () => ({
    hotseat: false,
    seats: [{ displayName: 'Player 1', playerId: 'player-1' }],
  }),
  phase10ExamplePresets: [{ id: 'mixed-table', label: 'Mixed table' }],
  projectPhase10PlayerView: () => ({}),
}));

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];

function renderIntoDom(ui: React.ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });

  act(() => {
    root.render(ui);
  });

  return container;
}

function clickElement(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop();

    if (!mounted) {
      break;
    }

    act(() => {
      mounted.root.unmount();
    });
    mounted.container.remove();
  }

  vi.clearAllMocks();
});

beforeEach(() => {
  routerState.profile = '@jules';
});

describe('mobile component behavior', () => {
  it('theme toggle updates the active theme at runtime', () => {
    function ThemeProbe() {
      const { activeTheme } = useThemeMode();
      return <div data-testid="theme-probe">{activeTheme}</div>;
    }

    const container = renderIntoDom(
      <ThemeModeProvider>
        <ThemeModeToggle />
        <ThemeProbe />
      </ThemeModeProvider>,
    );

    expect(
      container.querySelector('[data-testid="theme-probe"]')?.textContent,
    ).toBe('light');

    const darkButton = container.querySelector(
      '[data-testid="theme-dark-button"]',
    );

    expect(darkButton).toBeTruthy();
    clickElement(darkButton!);

    expect(
      container.querySelector('[data-testid="theme-probe"]')?.textContent,
    ).toBe('dark');
  });

  it('profile route resolves an @username segment into profile content', async () => {
    const { default: ProfileScreen } = await import('@/app/profile/[profile]');
    const container = renderIntoDom(
      <ThemeModeProvider>
        <ProfileScreen />
      </ThemeModeProvider>,
    );

    expect(container.textContent).toContain('Mobile profile');
    expect(container.textContent).toContain('Jules');
    expect(container.textContent).toContain('@jules');
  });

  it('uno screen mounts and routes legal actions into the local session', async () => {
    const { default: UnoScreen } = await import('@/app/(tabs)/uno');
    const container = renderIntoDom(
      <ThemeModeProvider>
        <UnoScreen />
      </ThemeModeProvider>,
    );

    const actionButton = Array.from(
      container.querySelectorAll('pressable'),
    ).find((element) => element.textContent?.includes('Play red 5'));

    expect(actionButton).toBeTruthy();
    clickElement(actionButton!);

    expect(sessionSpies.submitMove).toHaveBeenCalledWith({
      kind: 'play-card',
      payload: { cardId: 'red-5' },
      playerId: 'player-1',
    });
    expect(sessionSpies.subscribe).toHaveBeenCalledTimes(1);
  });

  it('phase 10 screen mounts and routes legal actions into the local session', async () => {
    const { default: Phase10Screen } = await import('@/app/(tabs)/phase-10');
    const container = renderIntoDom(
      <ThemeModeProvider>
        <Phase10Screen />
      </ThemeModeProvider>,
    );

    const actionButton = Array.from(
      container.querySelectorAll('pressable'),
    ).find((element) => element.textContent?.includes('Draw Red 9'));

    expect(actionButton).toBeTruthy();
    clickElement(actionButton!);

    expect(sessionSpies.submitMove).toHaveBeenCalledWith({
      kind: 'draw-card',
      payload: { source: 'discard' },
      playerId: 'player-1',
    });
    expect(sessionSpies.subscribe).toHaveBeenCalledTimes(1);
  });
});
