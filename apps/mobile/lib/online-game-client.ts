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

export type MobileOnlineAuth =
  | SharedOnlineAuth
  | {
      kind: 'session-cookie';
      cookie: string;
    };

export type MobileOnlineAuthProvider =
  | MobileOnlineAuth
  | (() => Promise<MobileOnlineAuth> | MobileOnlineAuth);

export type MobileCreateUnoMatchInput = {
  presetId: UnoExamplePresetId;
  displayName?: string | null;
};

export type MobileCreatePokerMatchInput = {
  presetId: PokerExamplePresetId;
  displayName?: string | null;
};

export type MobileUnoAnalysis = OnlineGenericAnalysis & {
  uno: UnoReplayAnalysis;
};

export type MobilePokerAnalysis = OnlineGenericAnalysis;

export type MobileUnoMatchSummary = OnlineMatchSummary<
  'uno-style',
  MobileUnoAnalysis
>;
export type MobilePokerMatchSummary = OnlineMatchSummary<
  'texas-holdem',
  MobilePokerAnalysis
>;

export type MobileUnoMatchSnapshot = OnlineMatchSnapshot<
  'uno-style',
  UnoState,
  UnoMove,
  UnoPlayerView,
  MobileUnoAnalysis
>;
export type MobilePokerMatchSnapshot = OnlineMatchSnapshot<
  'texas-holdem',
  PokerState,
  PokerMove,
  PokerPlayerView,
  MobilePokerAnalysis
>;

export type MobileUnoMatchList = OnlineMatchList<MobileUnoMatchSummary>;
export type MobilePokerMatchList = OnlineMatchList<MobilePokerMatchSummary>;
export type MobileUnoMatchRealtime =
  OnlineMatchRealtime<MobileUnoMatchSnapshot>;
export type MobilePokerMatchRealtime =
  OnlineMatchRealtime<MobilePokerMatchSnapshot>;
export type MobileUnoReplay = OnlineMatchReplay<
  UnoState,
  UnoMove,
  UnoSetup,
  MatchReplayAnalysis,
  MobileUnoAnalysis
> & {
  unoAnalysis: UnoReplayAnalysis;
};
export type MobilePokerReplay = OnlineMatchReplay<
  PokerState,
  PokerMove,
  PokerSetup,
  MatchReplayAnalysis,
  MobilePokerAnalysis
>;

export const mobileUnoMatchApi = defineOnlineMatchApi<
  MobileCreateUnoMatchInput,
  UnoMove,
  MobileUnoMatchSnapshot,
  MobileUnoMatchList,
  MobileUnoMatchRealtime,
  MobileUnoReplay
>({
  gameId: 'uno-style',
  routeSegment: 'uno',
});

export const mobilePokerMatchApi = defineOnlineMatchApi<
  MobileCreatePokerMatchInput,
  PokerMove,
  MobilePokerMatchSnapshot,
  MobilePokerMatchList,
  MobilePokerMatchRealtime,
  MobilePokerReplay
>({
  gameId: 'texas-holdem',
  routeSegment: 'poker',
});

export type CreateMobileOnlineGameClientInput = {
  baseUrl: string;
  auth?: MobileOnlineAuthProvider;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
};

function toSharedAuth(auth: MobileOnlineAuth): OnlineGameApiAuth {
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

export function createMobileOnlineGameClient(
  input: CreateMobileOnlineGameClientInput,
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
    authenticate(auth: MobileOnlineAuthProvider) {
      currentAuth = auth;
      apiClient.setAuth(resolveAuth as OnlineGameApiAuthProvider);
    },
    listUnoMatches: () => apiClient.listMatches(mobileUnoMatchApi),
    createUnoMatch: (match: MobileCreateUnoMatchInput) =>
      apiClient.createMatch(mobileUnoMatchApi, match),
    getUnoMatchSnapshot: (matchId: string) =>
      apiClient.getMatchSnapshot(mobileUnoMatchApi, matchId),
    getUnoMatchEvents: (
      matchId: string,
      cursor?: { afterSequence?: number | null; sinceUpdatedAt?: string | null },
    ) => apiClient.getMatchEvents(mobileUnoMatchApi, matchId, cursor),
    submitUnoMove: (matchId: string, move: UnoMove) =>
      apiClient.submitMove(mobileUnoMatchApi, matchId, move),
    getUnoReplay: (matchId: string) =>
      apiClient.getReplay(mobileUnoMatchApi, matchId),
    listPokerMatches: () => apiClient.listMatches(mobilePokerMatchApi),
    createPokerMatch: (match: MobileCreatePokerMatchInput) =>
      apiClient.createMatch(mobilePokerMatchApi, match),
    getPokerMatchSnapshot: (matchId: string) =>
      apiClient.getMatchSnapshot(mobilePokerMatchApi, matchId),
    getPokerMatchEvents: (
      matchId: string,
      cursor?: { afterSequence?: number | null; sinceUpdatedAt?: string | null },
    ) => apiClient.getMatchEvents(mobilePokerMatchApi, matchId, cursor),
    submitPokerMove: (matchId: string, move: PokerMove) =>
      apiClient.submitMove(mobilePokerMatchApi, matchId, move),
    getPokerReplay: (matchId: string) =>
      apiClient.getReplay(mobilePokerMatchApi, matchId),
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
