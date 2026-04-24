import type { IpcRenderer } from 'electron';

import type { PreferencesBridge } from './shared.ts';
import { preferencesChannels } from './shared.ts';

export function createPreferencesBridge<TPreferences extends object>(
  ipcRenderer: IpcRenderer,
): PreferencesBridge<TPreferences> {
  return {
    async get(key) {
      return ipcRenderer.invoke(preferencesChannels.getOne, key);
    },
    async getAll() {
      return ipcRenderer.invoke(preferencesChannels.getAll);
    },
    async reset() {
      return ipcRenderer.invoke(preferencesChannels.reset);
    },
    async set(key, value) {
      await ipcRenderer.invoke(preferencesChannels.setOne, key, value);
    },
    subscribe(listener) {
      const wrappedListener = (_event: unknown, preferences: TPreferences) => {
        listener(preferences);
      };

      ipcRenderer.on(preferencesChannels.updated, wrappedListener);

      return () => {
        ipcRenderer.removeListener(
          preferencesChannels.updated,
          wrappedListener,
        );
      };
    },
  };
}
