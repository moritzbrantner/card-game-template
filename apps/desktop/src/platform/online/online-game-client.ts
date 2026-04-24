import type { MatchReplayAnalysis } from '@repo/game-contracts';
import type {
  PokerExamplePresetId,
  PokerMove,
  PokerPlayerView,
  PokerSetup,
  PokerState,
} from '@repo/game-poker';
import type {
  OnlineGameApiAuth,
  OnlineGameApiAuthProvider,
  OnlineMatchList,
  OnlineMatchRealtime,
  OnlineMatchReplay,
  OnlineMatchSnapshot,
  OnlineMatchSummary,
} from '@repo/multiplayer-contract';
import {
  createOnlineGameApiClient,
  defineOnlineMatchApi,
} from '@repo/multiplayer-contract';
import type {
  UnoExamplePresetId,
  UnoMove,
  UnoPlayerView,
  UnoReplayAnalysis,
  UnoSetup,
  UnoState,
} from '@repo/game-uno';

type OnlineGenericAnalysis = {
  generic: MatchReplayAnalysis;
  [gameAnalysisKey: string]: unknown;
};

type SharedOnlineAuth = Exclude<OnlineGameApiAuth, undefined>;

export type DesktopOnlineAuth =
  | SharedOnlineAuth
  | {
      kind: 'session-cookie';
      cookie: string;
    };

export type DesktopOnlineAuthProvider =
  | DesktopOnlineAuth
  | (() => Promise<DesktopOnlineAuth> | DesktopOnlineAuth);

export type DesktopCreateUnoMatchInput = {
  presetId: UnoExamplePresetId;
  displayName?: string | null;
};

export type DesktopCreatePokerMatchInput = {
  presetId: PokerExamplePresetId;
  displayName?: string | null;
};

export type DesktopUnoAnalysis = OnlineGenericAnalysis & {
  uno: UnoReplayAnalysis;
};

export type DesktopPokerAnalysis = OnlineGenericAnalysis;

export type DesktopUnoMatchSummary = OnlineMatchSummary<
  'uno-style',
  DesktopUnoAnalysis
>;
export type DesktopPokerMatchSummary = OnlineMatchSummary<
  'texas-holdem',
  DesktopPokerAnalysis
>;

export type DesktopUnoMatchSnapshot = OnlineMatchSnapshot<
  'uno-style',
  UnoState,
  UnoMove,
  UnoPlayerView,
  DesktopUnoAnalysis
>;
export type DesktopPokerMatchSnapshot = OnlineMatchSnapshot<
  'texas-holdem',
  PokerState,
  PokerMove,
  PokerPlayerView,
  DesktopPokerAnalysis
>;

export type DesktopUnoMatchList = OnlineMatchList<DesktopUnoMatchSummary>;
export type DesktopPokerMatchList = OnlineMatchList<DesktopPokerMatchSummary>;
export type DesktopUnoMatchRealtime =
  OnlineMatchRealtime<DesktopUnoMatchSnapshot>;
export type DesktopPokerMatchRealtime =
  OnlineMatchRealtime<DesktopPokerMatchSnapshot>;
export type DesktopUnoReplay = OnlineMatchReplay<
  UnoState,
  UnoMove,
  UnoSetup,
  MatchReplayAnalysis,
  DesktopUnoAnalysis
> & {
  unoAnalysis: UnoReplayAnalysis;
};
export type DesktopPokerReplay = OnlineMatchReplay<
  PokerState,
  PokerMove,
  PokerSetup,
  MatchReplayAnalysis,
  DesktopPokerAnalysis
>;

export const desktopUnoMatchApi = defineOnlineMatchApi<
  DesktopCreateUnoMatchInput,
  UnoMove,
  DesktopUnoMatchSnapshot,
  DesktopUnoMatchList,
  DesktopUnoMatchRealtime,
  DesktopUnoReplay
>({
  gameId: 'uno-style',
  routeSegment: 'uno',
});

export const desktopPokerMatchApi = defineOnlineMatchApi<
  DesktopCreatePokerMatchInput,
  PokerMove,
  DesktopPokerMatchSnapshot,
  DesktopPokerMatchList,
  DesktopPokerMatchRealtime,
  DesktopPokerReplay
>({
  gameId: 'texas-holdem',
  routeSegment: 'poker',
});

export type CreateDesktopOnlineGameClientInput = {
  baseUrl: string;
  auth?: DesktopOnlineAuthProvider;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
};

function toSharedAuth(auth: DesktopOnlineAuth): OnlineGameApiAuth {
  if (!auth) {
    return null;
  }

  if (auth.kind === 'session-cookie') {
    return {
      kind: 'cookie',
      value: auth.cookie,
    };
  }

  return auth;
}

export function createDesktopOnlineGameClient(
  input: CreateDesktopOnlineGameClientInput,
) {
  let currentAuth = input.auth ?? null;
  const resolveAuth = async () =>
    toSharedAuth(
      typeof currentAuth === 'function' ? await currentAuth() : currentAuth,
    );
  const apiClient = createOnlineGameApiClient({
    baseUrl: input.baseUrl,
    fetch: input.fetch,
    auth: resolveAuth,
    credentials: input.credentials,
  });

  return {
    apiClient,
    authenticate(auth: DesktopOnlineAuthProvider) {
      currentAuth = auth;
      apiClient.setAuth(resolveAuth as OnlineGameApiAuthProvider);
    },
    listUnoMatches: () => apiClient.listMatches(desktopUnoMatchApi),
    createUnoMatch: (match: DesktopCreateUnoMatchInput) =>
      apiClient.createMatch(desktopUnoMatchApi, match),
    getUnoMatchSnapshot: (matchId: string) =>
      apiClient.getMatchSnapshot(desktopUnoMatchApi, matchId),
    getUnoMatchEvents: (
      matchId: string,
      cursor?: {
        afterSequence?: number | null;
        sinceUpdatedAt?: string | null;
      },
    ) => apiClient.getMatchEvents(desktopUnoMatchApi, matchId, cursor),
    submitUnoMove: (matchId: string, move: UnoMove) =>
      apiClient.submitMove(desktopUnoMatchApi, matchId, move),
    getUnoReplay: (matchId: string) =>
      apiClient.getReplay(desktopUnoMatchApi, matchId),
    listPokerMatches: () => apiClient.listMatches(desktopPokerMatchApi),
    createPokerMatch: (match: DesktopCreatePokerMatchInput) =>
      apiClient.createMatch(desktopPokerMatchApi, match),
    getPokerMatchSnapshot: (matchId: string) =>
      apiClient.getMatchSnapshot(desktopPokerMatchApi, matchId),
    getPokerMatchEvents: (
      matchId: string,
      cursor?: {
        afterSequence?: number | null;
        sinceUpdatedAt?: string | null;
      },
    ) => apiClient.getMatchEvents(desktopPokerMatchApi, matchId, cursor),
    submitPokerMove: (matchId: string, move: PokerMove) =>
      apiClient.submitMove(desktopPokerMatchApi, matchId, move),
    getPokerReplay: (matchId: string) =>
      apiClient.getReplay(desktopPokerMatchApi, matchId),
    listRooms: () => apiClient.listRooms(),
    createRoom: apiClient.createRoom,
    getRoom: apiClient.getRoom,
    getRoomEvents: apiClient.getRoomEvents,
    joinRoom: apiClient.joinRoom,
    setRoomReady: apiClient.setRoomReady,
    startRoom: apiClient.startRoom,
    closeRoom: apiClient.closeRoom,
  };
}
