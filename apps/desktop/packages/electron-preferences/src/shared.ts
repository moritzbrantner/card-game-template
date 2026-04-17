export const preferencesChannels = {
  getAll: 'moritzbrantner:preferences:get-all',
  getOne: 'moritzbrantner:preferences:get-one',
  reset: 'moritzbrantner:preferences:reset',
  setOne: 'moritzbrantner:preferences:set-one',
  updated: 'moritzbrantner:preferences:updated',
} as const;

export interface PreferencesBridge<TPreferences extends Record<string, unknown>> {
  get<KKey extends keyof TPreferences>(key: KKey): Promise<TPreferences[KKey]>;
  getAll(): Promise<TPreferences>;
  reset(): Promise<TPreferences>;
  set<KKey extends keyof TPreferences>(key: KKey, value: TPreferences[KKey]): Promise<void>;
  subscribe(listener: (preferences: TPreferences) => void): () => void;
}
