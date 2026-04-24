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
  createLocalGameSession: () => ({
    confirmHotseat: sessionSpies.confirmHotseat,
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
    restart: sessionSpies.restart,
    submitMove: sessionSpies.submitMove,
    subscribe: sessionSpies.subscribe,
  }),
  type: {},
}));

vi.mock('@repo/game-uno', () => ({
  createUnoAdapter: () => ({ kind: 'adapter' }),
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
});
