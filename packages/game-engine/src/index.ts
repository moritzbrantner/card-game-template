import {
  createMatchResult,
  type GameDefinition,
  type GameId,
  type GameMove,
  type MatchId,
  type MatchExecutionMode,
  type MatchResult,
  type MatchState,
  type PlayerId,
  type PlayerProfile,
} from '@repo/game-contracts';

export type StartMatchInput<TSetup> = {
  matchId: string;
  players: readonly PlayerProfile[];
  setup: TSetup;
  executionMode?: MatchExecutionMode;
};

export interface GameAdapter<TSetup, TState, TMove extends GameMove = GameMove> {
  definition: GameDefinition;
  createInitialState(input: StartMatchInput<TSetup> & { executionMode: MatchExecutionMode }): MatchState<TState>;
  listLegalMoves(state: MatchState<TState>): readonly TMove[];
  isLegalMove(state: MatchState<TState>, move: TMove): boolean;
  applyMove(state: MatchState<TState>, move: TMove): MatchState<TState>;
  isMatchComplete(state: MatchState<TState>): boolean;
  getResult?(state: MatchState<TState>): MatchResult | null;
}

export class IllegalMoveError extends Error {
  readonly gameId: GameId;
  readonly matchId: MatchId;
  readonly playerId: PlayerId;
  readonly moveKind: string;
  readonly reason: string;

  constructor(input: {
    gameId: GameId;
    matchId: MatchId;
    playerId: PlayerId;
    moveKind: string;
    reason: string;
  }) {
    super(
      `Illegal move submitted for ${input.gameId} in ${input.matchId}: ${input.playerId} cannot perform ${input.moveKind} (${input.reason})`,
    );
    this.name = 'IllegalMoveError';
    this.gameId = input.gameId;
    this.matchId = input.matchId;
    this.playerId = input.playerId;
    this.moveKind = input.moveKind;
    this.reason = input.reason;
  }
}

function hashSeed(seed: number | string): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }

  const text = `${seed}`;
  let hash = 2166136261;

  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRandom(seed: number | string) {
  let state = hashSeed(seed) || 0x9e3779b9;

  return function nextRandom() {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithRandom<T>(items: readonly T[], nextRandom: () => number): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return shuffled;
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number | string): T[] {
  return shuffleWithRandom(items, createSeededRandom(seed));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]));
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => rightKeys.includes(key) && deepEqual(left[key], right[key]))
    );
  }

  return false;
}

export function areMovesEquivalent<TMove extends GameMove>(left: TMove, right: TMove): boolean {
  return left.playerId === right.playerId && left.kind === right.kind && deepEqual(left.payload, right.payload);
}

export function createGameEngine<TSetup, TState, TMove extends GameMove = GameMove>(
  adapter: GameAdapter<TSetup, TState, TMove>,
) {
  return {
    definition: adapter.definition,
    startMatch(input: StartMatchInput<TSetup>): MatchState<TState> {
      const executionMode = input.executionMode ?? 'local';

      return adapter.createInitialState({
        ...input,
        executionMode,
      });
    },
    submitMove(state: MatchState<TState>, move: TMove): MatchState<TState> {
      if (!adapter.isLegalMove(state, move)) {
        throw new IllegalMoveError({
          gameId: adapter.definition.gameId,
          matchId: state.matchId,
          playerId: move.playerId,
          moveKind: move.kind,
          reason: 'move is not legal in the current match state',
        });
      }

      return adapter.applyMove(state, move);
    },
    finalizeMatch(state: MatchState<TState>): MatchResult | null {
      if (!adapter.isMatchComplete(state)) {
        return null;
      }

      return (
        adapter.getResult?.(state) ??
        createMatchResult({
          matchId: state.matchId,
          gameId: state.gameId,
          winnerIds: [],
          rankings: [],
          finishedAt: new Date().toISOString(),
          executionMode: state.executionMode,
        })
      );
    },
  };
}
