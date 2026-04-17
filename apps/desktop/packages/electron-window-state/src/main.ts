import type { BrowserWindow } from 'electron';

import type { JsonStore } from '@moritzbrantner/electron-json-store/main';

import type { StoredWindowBounds, StoredWindowState, StoredWindowStateMap } from './shared.ts';

const defaultWindowBounds: StoredWindowBounds = {
  height: 720,
  width: 1120,
};

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

function debounce(callback: () => void, delayInMs: number) {
  let timeout: NodeJS.Timeout | null = null;

  return () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      callback();
    }, delayInMs);
  };
}

export interface WindowStateManagerOptions {
  debounceInMs?: number;
  store: JsonStore<StoredWindowStateMap>;
}

export function createWindowStateManager(options: WindowStateManagerOptions) {
  const debounceInMs = options.debounceInMs ?? 150;

  async function getState(windowKey: string): Promise<StoredWindowState> {
    const stateMap = await options.store.load();

    return cloneValue(
      stateMap[windowKey] ?? {
        bounds: cloneValue(defaultWindowBounds),
        isFullScreen: false,
        isMaximized: false,
      },
    );
  }

  async function persist(windowKey: string, browserWindow: BrowserWindow) {
    const bounds = browserWindow.getBounds();

    await options.store.update((current) => ({
      ...current,
      [windowKey]: {
        bounds: {
          height: bounds.height,
          width: bounds.width,
          x: bounds.x,
          y: bounds.y,
        },
        isFullScreen: browserWindow.isFullScreen(),
        isMaximized: browserWindow.isMaximized(),
      },
    }));
  }

  function track(windowKey: string, browserWindow: BrowserWindow) {
    const persistSoon = debounce(() => {
      void persist(windowKey, browserWindow);
    }, debounceInMs);

    browserWindow.on('resize', persistSoon);
    browserWindow.on('move', persistSoon);
    browserWindow.on('maximize', persistSoon);
    browserWindow.on('unmaximize', persistSoon);
    browserWindow.on('enter-full-screen', persistSoon);
    browserWindow.on('leave-full-screen', persistSoon);
    browserWindow.on('close', persistSoon);
  }

  return {
    getState,
    track,
  };
}
