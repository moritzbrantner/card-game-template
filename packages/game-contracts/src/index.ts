export type PlatformSurface = 'web' | 'mobile' | 'desktop' | 'server';
export type MatchExecutionMode = 'local' | 'server-authoritative';
export type PlayerId = string;
export type AccountId = string;
export type MatchId = string;
export type GameId = string;
export type CardId = string;
export type ReplayFormatVersion = 1;
export type PersistedMatchStatus = 'active' | 'completed' | 'abandoned';

export type PlayerIdentityRef =
  | {
      kind: 'account';
      accountId: AccountId;
    }
  | {
      kind: 'guest';
      guestId: string;
    }
  | {
      kind: 'bot';
    };

export type CardDefinition = {
  id: CardId;
  label: string;
  suit?: string;
  rank?: string | number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type PlayerProfile = {
  playerId: PlayerId;
  displayName: string;
  seat: number;
  accountId?: AccountId;
  isGuest?: boolean;
};

export type GameDefinition = {
  gameId: GameId;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  supportsLocal: boolean;
  supportsOnline: boolean;
  tags: string[];
};

export type GameMove<TPayload = Record<string, unknown>> = {
  playerId: PlayerId;
  kind: string;
  createdAt: string;
  payload: TPayload;
};

export type MatchState<TState = Record<string, unknown>> = {
  matchId: MatchId;
  gameId: GameId;
  players: readonly PlayerProfile[];
  activePlayerId: PlayerId;
  turn: number;
  executionMode: MatchExecutionMode;
  state: TState;
};

export type MatchRanking = {
  playerId: PlayerId;
  position: number;
  score?: number;
};

export type MatchResult = {
  matchId: MatchId;
  gameId: GameId;
  winnerIds: readonly PlayerId[];
  rankings: readonly MatchRanking[];
  finishedAt: string;
  executionMode: MatchExecutionMode;
};

export type MatchHistoryEntry = {
  matchId: MatchId;
  gameId: GameId;
  playerId: PlayerId;
  outcome: 'win' | 'loss' | 'draw';
  finishedAt: string;
};

export type MatchReplayAcceptedMove<TMove extends GameMove = GameMove> = {
  sequence: number;
  acceptedAt: string;
  move: TMove;
};

export type MatchReplay<TState = Record<string, unknown>, TMove extends GameMove = GameMove> = {
  matchId: MatchId;
  gameId: GameId;
  executionMode: MatchExecutionMode;
  startedAt: string;
  finishedAt: string | null;
  initialState: MatchState<TState>;
  latestState: MatchState<TState>;
  acceptedMoves: readonly MatchReplayAcceptedMove<TMove>[];
  result: MatchResult | null;
};

export type MatchReplayPlayerSummary = {
  playerId: PlayerId;
  displayName: string;
  movesAccepted: number;
};

export type MatchReplayMoveKindSummary = {
  kind: string;
  count: number;
};

export type MatchReplayAnalysis = {
  matchId: MatchId;
  gameId: GameId;
  executionMode: MatchExecutionMode;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  acceptedMoveCount: number;
  turnsCompleted: number;
  winnerIds: readonly PlayerId[];
  players: readonly MatchReplayPlayerSummary[];
  moveKinds: readonly MatchReplayMoveKindSummary[];
};

export type PersistedMatchSummary = {
  matchId: MatchId;
  gameId: GameId;
  status: PersistedMatchStatus;
  executionMode: MatchExecutionMode;
  replayFormatVersion: ReplayFormatVersion;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  participants: readonly (PlayerProfile & {
    identity: PlayerIdentityRef;
    isBot: boolean;
  })[];
  result: MatchResult | null;
  analysis: MatchReplayAnalysis | null;
};

export const MATCH_REPLAY_FORMAT_VERSION: ReplayFormatVersion = 1;

export function createMatchResult(
  input: Omit<MatchResult, 'rankings'> & {
    rankings?: readonly MatchRanking[];
  },
): MatchResult {
  const rankings =
    input.rankings ??
    input.winnerIds.map((playerId, index) => ({
      playerId,
      position: index + 1,
    }));

  return {
    ...input,
    rankings,
  };
}

export function createMatchReplay<TState, TMove extends GameMove>(
  input: {
    startedAt: string;
    initialState: MatchState<TState>;
    latestState?: MatchState<TState>;
    acceptedMoves?: readonly MatchReplayAcceptedMove<TMove>[];
    finishedAt?: string | null;
    result?: MatchResult | null;
  },
): MatchReplay<TState, TMove> {
  const latestState = input.latestState ?? input.initialState;
  const result = input.result ?? null;

  return {
    matchId: input.initialState.matchId,
    gameId: input.initialState.gameId,
    executionMode: input.initialState.executionMode,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt ?? result?.finishedAt ?? null,
    initialState: input.initialState,
    latestState,
    acceptedMoves: input.acceptedMoves ?? [],
    result,
  };
}

function toTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function summarizeMatchReplay<TState, TMove extends GameMove>(
  replay: MatchReplay<TState, TMove>,
): MatchReplayAnalysis {
  const moveCountsByPlayer = new Map<PlayerId, number>();
  const moveCountsByKind = new Map<string, number>();

  for (const entry of replay.acceptedMoves) {
    moveCountsByPlayer.set(entry.move.playerId, (moveCountsByPlayer.get(entry.move.playerId) ?? 0) + 1);
    moveCountsByKind.set(entry.move.kind, (moveCountsByKind.get(entry.move.kind) ?? 0) + 1);
  }

  const startedAt = toTimestamp(replay.startedAt);
  const finishedAt = toTimestamp(replay.finishedAt);

  return {
    matchId: replay.matchId,
    gameId: replay.gameId,
    executionMode: replay.executionMode,
    startedAt: replay.startedAt,
    finishedAt: replay.finishedAt,
    durationMs: startedAt !== null && finishedAt !== null ? Math.max(finishedAt - startedAt, 0) : null,
    acceptedMoveCount: replay.acceptedMoves.length,
    turnsCompleted: Math.max(replay.latestState.turn - replay.initialState.turn, 0),
    winnerIds: replay.result?.winnerIds ?? [],
    players: [...replay.initialState.players]
      .sort(
        (left, right) =>
          (moveCountsByPlayer.get(right.playerId) ?? 0) - (moveCountsByPlayer.get(left.playerId) ?? 0) ||
          left.seat - right.seat,
      )
      .map((player) => ({
        playerId: player.playerId,
        displayName: player.displayName,
        movesAccepted: moveCountsByPlayer.get(player.playerId) ?? 0,
      })),
    moveKinds: [...moveCountsByKind.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([kind, count]) => ({
        kind,
        count,
      })),
  };
}

export function isOnlineCapable(definition: GameDefinition): boolean {
  return definition.supportsOnline && definition.maxPlayers > 1;
}
