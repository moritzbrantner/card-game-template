export type PlatformSurface = 'web' | 'mobile' | 'desktop' | 'server';
export type MatchExecutionMode = 'local' | 'server-authoritative';
export type PlayerId = string;
export type AccountId = string;
export type MatchId = string;
export type GameId = string;
export type CardId = string;

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

export function isOnlineCapable(definition: GameDefinition): boolean {
  return definition.supportsOnline && definition.maxPlayers > 1;
}
