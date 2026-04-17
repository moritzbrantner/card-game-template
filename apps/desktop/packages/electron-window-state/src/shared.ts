export interface StoredWindowBounds {
  height: number;
  width: number;
  x?: number;
  y?: number;
}

export interface StoredWindowState {
  bounds: StoredWindowBounds;
  isFullScreen: boolean;
  isMaximized: boolean;
}

export type StoredWindowStateMap = Record<string, StoredWindowState>;
