import {
  createEmptyUnoDemoStore,
  type UnoDemoStore,
} from '@/src/domain/uno-lobby/store';

const UNO_DEMO_STORE_KEY = 'card-game-template.uno.demo-store.v1';
const UNO_DEMO_VIEWER_KEY = 'card-game-template.uno.viewer.v1';
const UNO_DEMO_DRAFT_NAME_KEY = 'card-game-template.uno.draft-name.v1';
const UNO_DEMO_UPDATE_EVENT = 'uno-demo-store-updated';

export type UnoViewerSession = {
  playerId: string;
  displayName: string;
};

function canUseBrowserStorage() {
  return typeof window !== 'undefined';
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function createUnoDemoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readUnoDemoStore(): UnoDemoStore {
  if (!canUseBrowserStorage()) {
    return createEmptyUnoDemoStore();
  }

  const parsed = parseJson<UnoDemoStore>(window.localStorage.getItem(UNO_DEMO_STORE_KEY));
  return parsed ?? createEmptyUnoDemoStore();
}

export function writeUnoDemoStore(store: UnoDemoStore) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(UNO_DEMO_STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(UNO_DEMO_UPDATE_EVENT));
}

export function updateUnoDemoStore(updater: (store: UnoDemoStore) => UnoDemoStore) {
  const currentStore = readUnoDemoStore();
  const nextStore = updater(currentStore);
  writeUnoDemoStore(nextStore);
  return nextStore;
}

export function subscribeToUnoDemoStore(listener: () => void) {
  if (!canUseBrowserStorage()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === UNO_DEMO_STORE_KEY) {
      listener();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(UNO_DEMO_UPDATE_EVENT, listener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(UNO_DEMO_UPDATE_EVENT, listener);
  };
}

export function readUnoViewerSession() {
  if (!canUseBrowserStorage()) {
    return null;
  }

  return parseJson<UnoViewerSession>(window.sessionStorage.getItem(UNO_DEMO_VIEWER_KEY));
}

export function writeUnoViewerSession(viewer: UnoViewerSession) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.sessionStorage.setItem(UNO_DEMO_VIEWER_KEY, JSON.stringify(viewer));
}

export function readUnoDraftName() {
  if (!canUseBrowserStorage()) {
    return '';
  }

  return window.sessionStorage.getItem(UNO_DEMO_DRAFT_NAME_KEY) ?? readUnoViewerSession()?.displayName ?? '';
}

export function writeUnoDraftName(name: string) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.sessionStorage.setItem(UNO_DEMO_DRAFT_NAME_KEY, name);
}
