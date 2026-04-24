import type { IpcMain, WebContents } from 'electron';

import type { JsonStore } from '@moritzbrantner/electron-json-store/main';

import { preferencesChannels } from './shared.ts';

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

export interface PreferencesServiceOptions<TPreferences extends object> {
  defaultValue: TPreferences;
  getBroadcastTargets: () => WebContents[];
  store: JsonStore<TPreferences>;
  validate: (value: unknown) => value is TPreferences;
}

export function createPreferencesService<TPreferences extends object>(
  options: PreferencesServiceOptions<TPreferences>,
) {
  async function broadcast() {
    const snapshot = await options.store.load();

    options.getBroadcastTargets().forEach((target) => {
      if (!target.isDestroyed()) {
        target.send(preferencesChannels.updated, cloneValue(snapshot));
      }
    });
  }

  async function getAll() {
    return options.store.load();
  }

  async function get<KKey extends keyof TPreferences>(key: KKey) {
    const snapshot = await options.store.load();
    return cloneValue(snapshot[key]);
  }

  async function reset() {
    const nextValue = await options.store.reset();
    await broadcast();
    return nextValue;
  }

  async function set<KKey extends keyof TPreferences>(
    key: KKey,
    value: TPreferences[KKey],
  ) {
    const current = await options.store.load();
    const nextValue = {
      ...current,
      [key]: cloneValue(value),
    };

    if (!options.validate(nextValue)) {
      throw new Error(`Invalid preferences update for key "${String(key)}"`);
    }

    await options.store.save(nextValue);
    await broadcast();
  }

  function installIpc(ipcMain: IpcMain) {
    ipcMain.handle(preferencesChannels.getAll, async () => getAll());
    ipcMain.handle(
      preferencesChannels.getOne,
      async (_event, key: keyof TPreferences) => get(key),
    );
    ipcMain.handle(
      preferencesChannels.setOne,
      async (
        _event,
        key: keyof TPreferences,
        value: TPreferences[keyof TPreferences],
      ) => {
        await set(key, value);
      },
    );
    ipcMain.handle(preferencesChannels.reset, async () => reset());

    return () => {
      ipcMain.removeHandler(preferencesChannels.getAll);
      ipcMain.removeHandler(preferencesChannels.getOne);
      ipcMain.removeHandler(preferencesChannels.setOne);
      ipcMain.removeHandler(preferencesChannels.reset);
    };
  }

  function subscribe(listener: (preferences: TPreferences) => void) {
    const unsubscribe = options.store.subscribe(listener);
    return unsubscribe;
  }

  return {
    get,
    getAll,
    installIpc,
    reset,
    set,
    subscribe,
  };
}
