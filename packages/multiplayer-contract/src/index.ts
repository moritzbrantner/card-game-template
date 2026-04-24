import type {
  GameId,
  GameMove,
  MatchReplay,
  MatchReplayAcceptedMove,
  MatchReplayAnalysis,
  MatchExecutionMode,
  MatchResult,
  MatchState,
  PersistedMatchStatus,
  PlayerIdentityRef,
  PlayerId,
  PlayerProfile,
} from '../../game-contracts/src/index.ts';

export type RoomId = string;
export type RoomVisibility = 'private' | 'friends' | 'public';
export type PlayerConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export type RoomSeat = {
  seat: number;
  playerId?: PlayerId;
  displayName?: string;
  ready: boolean;
  connectionStatus: PlayerConnectionStatus;
};

export type RoomSummary = {
  roomId: RoomId;
  gameId: GameId;
  hostPlayerId: PlayerId;
  maxPlayers: number;
  visibility: RoomVisibility;
  executionMode: MatchExecutionMode;
  seats: readonly RoomSeat[];
};

export type RealtimeRoomEvent = {
  type: 'room.joined' | 'room.updated';
  roomId: RoomId;
  occurredAt: string;
};

export type RealtimeMatchEvent =
  | {
      type: 'match.updated';
      matchId: string;
      gameId: GameId;
      occurredAt: string;
      lastSequence: number;
    }
  | {
      type: 'move.accepted';
      matchId: string;
      gameId: GameId;
      occurredAt: string;
      sequence: number;
      playerId: PlayerId;
      moveKind: string;
    }
  | {
      type: 'match.finished';
      matchId: string;
      gameId: GameId;
      occurredAt: string;
      winnerIds: readonly PlayerId[];
    };

export type RealtimeGameEvent = RealtimeRoomEvent | RealtimeMatchEvent;

export type OnlineMatchParticipant = {
  playerId: PlayerId;
  seat: number;
  displayName: string;
  identity: PlayerIdentityRef;
  isBot: boolean;
};

export type OnlineMatchSummary<
  TGameId extends GameId = GameId,
  TAnalysis = unknown,
> = {
  matchId: string;
  gameId: TGameId;
  status: PersistedMatchStatus;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  participants: readonly OnlineMatchParticipant[];
  result: MatchResult | null;
  analysis: TAnalysis | null;
  lastSequence: number;
};

export type OnlineMatchSnapshot<
  TGameId extends GameId = GameId,
  TState = unknown,
  TMove extends GameMove = GameMove,
  TView = unknown,
  TAnalysis = unknown,
> = OnlineMatchSummary<TGameId, TAnalysis> & {
  executionMode: Extract<MatchExecutionMode, 'server-authoritative'>;
  replayFormatVersion: 2;
  match: MatchState<TState>;
  legalMoves: readonly TMove[];
  selectedActorPlayerId: PlayerId | null;
  view: TView;
};

export type OnlineMatchList<TSummary> = {
  active: readonly TSummary[];
  recent: readonly TSummary[];
};

export type OnlineMatchRealtimeCursor = {
  lastSequence: number;
  updatedAt: string;
};

export type OnlineMatchRealtimeInput = {
  afterSequence?: number | null;
  sinceUpdatedAt?: string | null;
};

export type OnlineMatchRealtime<TSnapshot> = {
  snapshot: TSnapshot;
  cursor: OnlineMatchRealtimeCursor;
  events: readonly RealtimeMatchEvent[];
  hasChanges: boolean;
};

export type OnlineMatchReplay<
  TState = unknown,
  TMove extends GameMove = GameMove,
  TSetup = unknown,
  TAnalysis = MatchReplayAnalysis,
  TGameAnalysis = unknown,
> = {
  summary: OnlineMatchSummary<GameId, TGameAnalysis>;
  replay: MatchReplay<TState, TMove, TSetup>;
  moves: readonly MatchReplayAcceptedMove<TMove>[];
  analysis: TAnalysis;
};

export type OnlineRoomStatus = 'open' | 'active' | 'closed';

export type OnlineRoomSeat = {
  seat: number;
  playerId?: PlayerId;
  displayName?: string;
  ready: boolean;
  connectionStatus: PlayerConnectionStatus;
};

export type OnlineRoom = {
  roomId: RoomId;
  roomName: string;
  gameId: GameId;
  status: OnlineRoomStatus;
  visibility: RoomVisibility;
  executionMode: Extract<MatchExecutionMode, 'server-authoritative'>;
  maxPlayers: number;
  hostPlayerId: PlayerId;
  activeMatchId: string | null;
  createdAt: string;
  updatedAt: string;
  seats: readonly OnlineRoomSeat[];
  viewerPlayerId: PlayerId;
  viewerIsHost: boolean;
  canStart: boolean;
};

export type OnlineRoomRealtimeInput = {
  sinceUpdatedAt?: string | null;
};

export type OnlineRoomRealtime = {
  room: OnlineRoom;
  cursor: {
    updatedAt: string;
  };
  events: readonly RealtimeRoomEvent[];
  hasChanges: boolean;
};

export type OnlineCreateRoomInput = {
  gameId: GameId;
  displayName?: string | null;
  maxPlayers?: number | null;
};

export type OnlineJoinRoomInput = {
  displayName?: string | null;
};

export type OnlineSetRoomReadyInput = {
  ready: boolean;
};

export type OnlineMatchApiDescriptor<
  TCreateInput,
  TMove extends GameMove,
  TSnapshot,
  TList,
  TRealtime,
  TReplay,
> = {
  gameId: GameId;
  routeSegment: string;
  readonly __types?: {
    createInput: TCreateInput;
    move: TMove;
    snapshot: TSnapshot;
    list: TList;
    realtime: TRealtime;
    replay: TReplay;
  };
};

export type OnlineGameApiAuth =
  | {
      kind: 'cookie';
      value: string;
    }
  | {
      kind: 'bearer';
      token: string;
    }
  | {
      kind: 'headers';
      headers: HeadersInit;
    }
  | null
  | undefined;

export type OnlineGameApiAuthProvider =
  | OnlineGameApiAuth
  | (() => Promise<OnlineGameApiAuth> | OnlineGameApiAuth);

export type OnlineGameApiClientInput = {
  baseUrl: string;
  fetch?: typeof fetch;
  auth?: OnlineGameApiAuthProvider;
  credentials?: RequestCredentials;
};

export type OnlineGameProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  [key: string]: unknown;
};

export class OnlineGameApiError extends Error {
  readonly status: number;
  readonly problem: OnlineGameProblemDetails | null;

  constructor(input: {
    status: number;
    message: string;
    problem?: OnlineGameProblemDetails | null;
  }) {
    super(input.message);
    this.name = 'OnlineGameApiError';
    this.status = input.status;
    this.problem = input.problem ?? null;
  }
}

export type OnlineGameApiClient = {
  setAuth(auth: OnlineGameApiAuthProvider): void;
  listMatches<
    TCreateInput,
    TMove extends GameMove,
    TSnapshot,
    TList,
    TRealtime,
    TReplay,
  >(
    descriptor: OnlineMatchApiDescriptor<
      TCreateInput,
      TMove,
      TSnapshot,
      TList,
      TRealtime,
      TReplay
    >,
  ): Promise<TList>;
  createMatch<
    TCreateInput,
    TMove extends GameMove,
    TSnapshot,
    TList,
    TRealtime,
    TReplay,
  >(
    descriptor: OnlineMatchApiDescriptor<
      TCreateInput,
      TMove,
      TSnapshot,
      TList,
      TRealtime,
      TReplay
    >,
    input: TCreateInput,
  ): Promise<TSnapshot>;
  getMatchSnapshot<
    TCreateInput,
    TMove extends GameMove,
    TSnapshot,
    TList,
    TRealtime,
    TReplay,
  >(
    descriptor: OnlineMatchApiDescriptor<
      TCreateInput,
      TMove,
      TSnapshot,
      TList,
      TRealtime,
      TReplay
    >,
    matchId: string,
  ): Promise<TSnapshot>;
  getMatchEvents<
    TCreateInput,
    TMove extends GameMove,
    TSnapshot,
    TList,
    TRealtime,
    TReplay,
  >(
    descriptor: OnlineMatchApiDescriptor<
      TCreateInput,
      TMove,
      TSnapshot,
      TList,
      TRealtime,
      TReplay
    >,
    matchId: string,
    input?: OnlineMatchRealtimeInput,
  ): Promise<TRealtime>;
  submitMove<
    TCreateInput,
    TMove extends GameMove,
    TSnapshot,
    TList,
    TRealtime,
    TReplay,
  >(
    descriptor: OnlineMatchApiDescriptor<
      TCreateInput,
      TMove,
      TSnapshot,
      TList,
      TRealtime,
      TReplay
    >,
    matchId: string,
    move: TMove,
  ): Promise<TSnapshot>;
  getReplay<
    TCreateInput,
    TMove extends GameMove,
    TSnapshot,
    TList,
    TRealtime,
    TReplay,
  >(
    descriptor: OnlineMatchApiDescriptor<
      TCreateInput,
      TMove,
      TSnapshot,
      TList,
      TRealtime,
      TReplay
    >,
    matchId: string,
  ): Promise<TReplay>;
  listRooms(): Promise<readonly OnlineRoom[]>;
  createRoom(input: OnlineCreateRoomInput): Promise<OnlineRoom>;
  getRoom(roomId: RoomId): Promise<OnlineRoom>;
  getRoomEvents(
    roomId: RoomId,
    input?: OnlineRoomRealtimeInput,
  ): Promise<OnlineRoomRealtime>;
  joinRoom(roomId: RoomId, input?: OnlineJoinRoomInput): Promise<OnlineRoom>;
  setRoomReady(
    roomId: RoomId,
    input: OnlineSetRoomReadyInput,
  ): Promise<OnlineRoom>;
  startRoom(roomId: RoomId): Promise<OnlineRoom>;
  closeRoom(roomId: RoomId): Promise<OnlineRoom>;
};

type RequestInput = {
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function buildApiUrl(
  baseUrl: string,
  path: string,
  query?: RequestInput['query'],
) {
  const url = new URL(path.replace(/^\/+/, ''), normalizeBaseUrl(baseUrl));

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function applyHeaders(target: Headers, source: HeadersInit) {
  new Headers(source).forEach((value, key) => {
    target.set(key, value);
  });
}

async function resolveAuthHeaders(auth: OnlineGameApiAuthProvider | undefined) {
  const resolvedAuth = typeof auth === 'function' ? await auth() : auth;
  const headers = new Headers();

  if (!resolvedAuth) {
    return headers;
  }

  if (resolvedAuth.kind === 'cookie') {
    headers.set('cookie', resolvedAuth.value);
    return headers;
  }

  if (resolvedAuth.kind === 'bearer') {
    headers.set('authorization', `Bearer ${resolvedAuth.token}`);
    return headers;
  }

  applyHeaders(headers, resolvedAuth.headers);
  return headers;
}

async function readJsonBody(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function problemMessage(status: number, body: unknown) {
  if (body && typeof body === 'object') {
    const detail = 'detail' in body ? body.detail : undefined;
    const title = 'title' in body ? body.title : undefined;

    if (typeof detail === 'string' && detail.length > 0) {
      return detail;
    }

    if (typeof title === 'string' && title.length > 0) {
      return title;
    }
  }

  return `Online game API request failed with status ${status}.`;
}

function isProblemDetails(body: unknown): body is OnlineGameProblemDetails {
  return body !== null && typeof body === 'object' && !Array.isArray(body);
}

async function requestJson<TResult>(input: {
  baseUrl: string;
  fetchImplementation: typeof fetch;
  auth?: OnlineGameApiAuthProvider;
  credentials: RequestCredentials;
  request: RequestInput;
}): Promise<TResult> {
  const headers = await resolveAuthHeaders(input.auth);
  headers.set('accept', 'application/json');

  const init: RequestInit = {
    method: input.request.method ?? 'GET',
    credentials: input.credentials,
    headers,
  };

  if (input.request.body !== undefined) {
    headers.set('content-type', 'application/json');
    init.body = JSON.stringify(input.request.body);
  }

  const response = await input.fetchImplementation(
    buildApiUrl(input.baseUrl, input.request.path, input.request.query),
    init,
  );
  const body = await readJsonBody(response);

  if (!response.ok) {
    throw new OnlineGameApiError({
      status: response.status,
      message: problemMessage(response.status, body),
      problem: isProblemDetails(body) ? body : null,
    });
  }

  return body as TResult;
}

export function defineOnlineMatchApi<
  TCreateInput,
  TMove extends GameMove,
  TSnapshot,
  TList,
  TRealtime = OnlineMatchRealtime<TSnapshot>,
  TReplay = unknown,
>(
  descriptor: Omit<
    OnlineMatchApiDescriptor<
      TCreateInput,
      TMove,
      TSnapshot,
      TList,
      TRealtime,
      TReplay
    >,
    '__types'
  >,
): OnlineMatchApiDescriptor<
  TCreateInput,
  TMove,
  TSnapshot,
  TList,
  TRealtime,
  TReplay
> {
  return descriptor;
}

export function createOnlineGameApiClient(
  input: OnlineGameApiClientInput,
): OnlineGameApiClient {
  const fetchImplementation = input.fetch ?? fetch;
  const credentials = input.credentials ?? 'include';
  let auth = input.auth;

  const request = <TResult>(requestInput: RequestInput) =>
    requestJson<TResult>({
      baseUrl: input.baseUrl,
      fetchImplementation,
      auth,
      credentials,
      request: requestInput,
    });

  const matchPath = (
    descriptor: Pick<
      OnlineMatchApiDescriptor<never, GameMove, never, never, never, never>,
      'routeSegment'
    >,
    suffix = '',
  ) => `/api/games/${descriptor.routeSegment}/matches${suffix}`;

  return {
    setAuth(nextAuth) {
      auth = nextAuth;
    },
    listMatches(descriptor) {
      return request({
        path: matchPath(descriptor),
      });
    },
    createMatch(descriptor, matchInput) {
      return request({
        path: matchPath(descriptor),
        method: 'POST',
        body: matchInput,
      });
    },
    getMatchSnapshot(descriptor, matchId) {
      return request({
        path: matchPath(descriptor, `/${encodeURIComponent(matchId)}`),
      });
    },
    getMatchEvents(descriptor, matchId, realtimeInput = {}) {
      return request({
        path: matchPath(descriptor, `/${encodeURIComponent(matchId)}/events`),
        query: {
          afterSequence: realtimeInput.afterSequence,
          sinceUpdatedAt: realtimeInput.sinceUpdatedAt,
        },
      });
    },
    submitMove(descriptor, matchId, move) {
      return request({
        path: matchPath(descriptor, `/${encodeURIComponent(matchId)}/moves`),
        method: 'POST',
        body: {
          move,
        },
      });
    },
    getReplay(descriptor, matchId) {
      return request({
        path: matchPath(descriptor, `/${encodeURIComponent(matchId)}/replay`),
      });
    },
    listRooms() {
      return request({
        path: '/api/games/rooms',
      });
    },
    createRoom(roomInput) {
      return request({
        path: '/api/games/rooms',
        method: 'POST',
        body: roomInput,
      });
    },
    getRoom(roomId) {
      return request({
        path: `/api/games/rooms/${encodeURIComponent(roomId)}`,
      });
    },
    getRoomEvents(roomId, realtimeInput = {}) {
      return request({
        path: `/api/games/rooms/${encodeURIComponent(roomId)}/events`,
        query: {
          sinceUpdatedAt: realtimeInput.sinceUpdatedAt,
        },
      });
    },
    joinRoom(roomId, roomInput = {}) {
      return request({
        path: `/api/games/rooms/${encodeURIComponent(roomId)}/join`,
        method: 'POST',
        body: roomInput,
      });
    },
    setRoomReady(roomId, readyInput) {
      return request({
        path: `/api/games/rooms/${encodeURIComponent(roomId)}/ready`,
        method: 'POST',
        body: readyInput,
      });
    },
    startRoom(roomId) {
      return request({
        path: `/api/games/rooms/${encodeURIComponent(roomId)}/start`,
        method: 'POST',
      });
    },
    closeRoom(roomId) {
      return request({
        path: `/api/games/rooms/${encodeURIComponent(roomId)}/close`,
        method: 'POST',
      });
    },
  };
}

export function createRoomSummary(input: {
  roomId: RoomId;
  gameId: GameId;
  hostPlayerId: PlayerId;
  visibility: RoomVisibility;
  executionMode?: MatchExecutionMode;
  maxPlayers: number;
  players: readonly PlayerProfile[];
}): RoomSummary {
  return {
    roomId: input.roomId,
    gameId: input.gameId,
    hostPlayerId: input.hostPlayerId,
    visibility: input.visibility,
    executionMode: input.executionMode ?? 'server-authoritative',
    maxPlayers: input.maxPlayers,
    seats: input.players.map((player) => ({
      seat: player.seat,
      playerId: player.playerId,
      ready: true,
      connectionStatus: 'connected',
    })),
  };
}

export function canStartRoom(room: RoomSummary): boolean {
  const occupiedSeats = room.seats.filter((seat) => seat.playerId);

  return (
    occupiedSeats.length >= 2 &&
    occupiedSeats.length <= room.maxPlayers &&
    occupiedSeats.every((seat) => seat.ready)
  );
}
