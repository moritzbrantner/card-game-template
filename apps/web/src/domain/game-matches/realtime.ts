import type { PersistedUnoMatchSnapshotDto } from './contracts';

type UnoMatchSocketLike = {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
};

type UnoMatchEvent = {
  type: 'uno.match.snapshot';
  snapshot: PersistedUnoMatchSnapshotDto;
};

type RealtimeState = {
  unoMatchSubscribers: Map<string, Set<UnoMatchSocketLike>>;
};

function getRealtimeState(): RealtimeState {
  const globalForRealtime = globalThis as typeof globalThis & {
    __gameMatchRealtimeState__?: RealtimeState;
  };

  if (globalForRealtime.__gameMatchRealtimeState__) {
    return globalForRealtime.__gameMatchRealtimeState__;
  }

  const state: RealtimeState = {
    unoMatchSubscribers: new Map(),
  };

  globalForRealtime.__gameMatchRealtimeState__ = state;
  return state;
}

function encodeEvent(event: UnoMatchEvent) {
  return JSON.stringify(event);
}

export function subscribeToUnoMatch(
  matchId: string,
  socket: UnoMatchSocketLike,
) {
  const state = getRealtimeState();
  const subscribers = state.unoMatchSubscribers.get(matchId) ?? new Set();
  subscribers.add(socket);
  state.unoMatchSubscribers.set(matchId, subscribers);

  return () => {
    const currentSubscribers = state.unoMatchSubscribers.get(matchId);

    if (!currentSubscribers) {
      return;
    }

    currentSubscribers.delete(socket);

    if (currentSubscribers.size === 0) {
      state.unoMatchSubscribers.delete(matchId);
    }
  };
}

export function publishUnoMatchSnapshot(
  snapshot: PersistedUnoMatchSnapshotDto,
) {
  const subscribers = getRealtimeState().unoMatchSubscribers.get(
    snapshot.matchId,
  );

  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const payload = encodeEvent({
    type: 'uno.match.snapshot',
    snapshot,
  });

  for (const socket of subscribers) {
    if (socket.readyState !== 1) {
      subscribers.delete(socket);
      continue;
    }

    socket.send(payload);
  }

  if (subscribers.size === 0) {
    getRealtimeState().unoMatchSubscribers.delete(snapshot.matchId);
  }
}
