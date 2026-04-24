import {
  createMatchResult,
  type GameDefinition,
  type GameId,
  type GameReplayMetadata,
  type GameMove,
  type MatchExecutionMode,
  type MatchId,
  type MatchInspection,
  type MatchResult,
  type MatchState,
  type PlayerId,
  type PlayerProfile,
} from '@repo/game-contracts';

export const GAME_ENGINE_VERSION = 1;
export const DEFAULT_RNG_VERSION = 'mulberry32-fnv1a-v1';

export type StartMatchInput<TSetup> = {
  matchId: string;
  players: readonly PlayerProfile[];
  setup: TSetup;
  executionMode?: MatchExecutionMode;
};

export type GameAdapterMetadata = {
  gameVersion: string;
  rulesetVersion: string;
  rngVersion?: string;
};

export type TransitionResult<TState, TEvent = never> = {
  state: MatchState<TState>;
  events?: readonly TEvent[];
};

export type EngineTransition<
  TState,
  TMove extends GameMove = GameMove,
  TEvent = never,
> = {
  previousState: MatchState<TState>;
  nextState: MatchState<TState>;
  move: TMove;
  actorPlayerId: PlayerId | null;
  legalMovesBefore: readonly TMove[];
  legalMovesAfter: readonly TMove[];
  result: MatchResult | null;
  events: readonly TEvent[];
};

export interface GameAdapter<
  TSetup,
  TState,
  TMove extends GameMove = GameMove,
  TEvent = never,
> {
  definition: GameDefinition;
  metadata?: GameAdapterMetadata;
  canonicalizeMove?(move: TMove): TMove;
  createInitialState(
    input: StartMatchInput<TSetup> & { executionMode: MatchExecutionMode },
  ): MatchState<TState>;
  validateSetup?(setup: unknown): TSetup;
  validateMove?(move: unknown): TMove;
  validateState?(state: MatchState<TState>): void;
  listLegalMoves(state: MatchState<TState>): readonly TMove[];
  selectActor?(input: {
    state: MatchState<TState>;
    legalMoves: readonly TMove[];
  }): PlayerId | null;
  isLegalMove(state: MatchState<TState>, move: TMove): boolean;
  applyMove(
    state: MatchState<TState>,
    move: TMove,
  ): MatchState<TState> | TransitionResult<TState, TEvent>;
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

function assertSerializableNumber(value: number, path: string): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${path} must be a finite number`);
  }

  return value;
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalizeSerializableValueAtPath(
  value: unknown,
  path: string,
): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    return assertSerializableNumber(value, path);
  }

  if (
    typeof value === 'bigint' ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    throw new TypeError(`${path} must be JSON-serializable`);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const canonicalItem = canonicalizeSerializableValueAtPath(
        item,
        `${path}[${index}]`,
      );

      if (canonicalItem === undefined) {
        throw new TypeError(`${path}[${index}] must be JSON-serializable`);
      }

      return canonicalItem;
    });
  }

  if (!isPlainObject(value)) {
    throw new TypeError(`${path} must be a plain JSON-serializable object`);
  }

  const canonical: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) {
      continue;
    }

    const canonicalItem = canonicalizeSerializableValueAtPath(
      item,
      `${path}.${key}`,
    );

    if (canonicalItem !== undefined) {
      canonical[key] = canonicalItem;
    }
  }

  return canonical;
}

export function canonicalizeSerializableValue<T>(value: T): T {
  return canonicalizeSerializableValueAtPath(value, 'value') as T;
}

export function canonicalizeMove<TMove extends GameMove>(move: TMove): TMove {
  return canonicalizeSerializableValue(move);
}

function canonicalizeAdapterMove<
  TSetup,
  TState,
  TMove extends GameMove,
  TEvent,
>(adapter: GameAdapter<TSetup, TState, TMove, TEvent>, move: TMove): TMove {
  return canonicalizeMove(
    adapter.canonicalizeMove ? adapter.canonicalizeMove(move) : move,
  );
}

export function createReplayMetadata<TSetup>(
  adapter: Pick<
    GameAdapter<TSetup, unknown, GameMove, never>,
    'definition' | 'metadata'
  >,
  setup: TSetup,
): GameReplayMetadata<TSetup> {
  return {
    engineVersion: GAME_ENGINE_VERSION,
    gameVersion: adapter.metadata?.gameVersion ?? adapter.definition.gameId,
    rngVersion: adapter.metadata?.rngVersion ?? DEFAULT_RNG_VERSION,
    rulesetVersion:
      adapter.metadata?.rulesetVersion ?? adapter.definition.gameId,
    setup: canonicalizeSerializableValue(setup),
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => deepEqual(item, right[index]))
    );
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => rightKeys.includes(key) && deepEqual(left[key], right[key]),
      )
    );
  }

  return false;
}

export function areMovesEquivalent<TMove extends GameMove>(
  left: TMove,
  right: TMove,
): boolean {
  const canonicalLeft = canonicalizeMove(left);
  const canonicalRight = canonicalizeMove(right);

  return (
    canonicalLeft.playerId === canonicalRight.playerId &&
    canonicalLeft.kind === canonicalRight.kind &&
    deepEqual(canonicalLeft.payload, canonicalRight.payload)
  );
}

function validateState<TSetup, TState, TMove extends GameMove, TEvent>(
  adapter: GameAdapter<TSetup, TState, TMove, TEvent>,
  state: MatchState<TState>,
) {
  adapter.validateState?.(state);
}

function finalizeState<TSetup, TState, TMove extends GameMove, TEvent>(
  adapter: GameAdapter<TSetup, TState, TMove, TEvent>,
  state: MatchState<TState>,
): MatchResult | null {
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
}

function inspectState<TSetup, TState, TMove extends GameMove, TEvent>(
  adapter: GameAdapter<TSetup, TState, TMove, TEvent>,
  state: MatchState<TState>,
): MatchInspection<TMove> {
  const status = adapter.isMatchComplete(state) ? 'completed' : 'in_progress';

  if (status === 'completed') {
    return {
      actorPlayerId: null,
      legalMoves: [],
      status,
    };
  }

  const legalMoves = adapter
    .listLegalMoves(state)
    .map((legalMove) => canonicalizeAdapterMove(adapter, legalMove));
  const actorPlayerId = adapter.selectActor
    ? adapter.selectActor({
        state,
        legalMoves,
      })
    : state.activePlayerId;

  return {
    actorPlayerId,
    legalMoves: actorPlayerId
      ? legalMoves.filter((move) => move.playerId === actorPlayerId)
      : [],
    status,
  };
}

function normalizeTransitionResult<TState, TEvent>(
  value: MatchState<TState> | TransitionResult<TState, TEvent>,
) {
  if (
    isRecord(value) &&
    'matchId' in value &&
    'gameId' in value &&
    'activePlayerId' in value
  ) {
    return {
      state: value as MatchState<TState>,
      events: [] as readonly TEvent[],
    };
  }

  if (isRecord(value) && 'state' in value) {
    return {
      state: value.state as MatchState<TState>,
      events: (value.events as readonly TEvent[] | undefined) ?? [],
    };
  }

  throw new TypeError(
    'adapter applyMove must return a match state or transition result',
  );
}

export function createGameEngine<
  TSetup,
  TState,
  TMove extends GameMove = GameMove,
  TEvent = never,
>(adapter: GameAdapter<TSetup, TState, TMove, TEvent>) {
  return {
    definition: adapter.definition,
    startMatch(input: StartMatchInput<TSetup>): MatchState<TState> {
      const executionMode = input.executionMode ?? 'local';
      const setup = adapter.validateSetup
        ? adapter.validateSetup(input.setup)
        : input.setup;
      const state = adapter.createInitialState({
        ...input,
        setup,
        executionMode,
      });

      validateState(adapter, state);
      return state;
    },
    inspect(state: MatchState<TState>): MatchInspection<TMove> {
      return inspectState(adapter, state);
    },
    submitMove(
      state: MatchState<TState>,
      move: TMove,
    ): EngineTransition<TState, TMove, TEvent> {
      const submittedMove = canonicalizeAdapterMove(
        adapter,
        adapter.validateMove ? adapter.validateMove(move) : move,
      );
      const inspectionBefore = inspectState(adapter, state);

      if (
        !inspectionBefore.actorPlayerId ||
        submittedMove.playerId !== inspectionBefore.actorPlayerId
      ) {
        throw new IllegalMoveError({
          gameId: adapter.definition.gameId,
          matchId: state.matchId,
          playerId: submittedMove.playerId,
          moveKind: submittedMove.kind,
          reason: inspectionBefore.actorPlayerId
            ? 'player is not the selected actor in the current match state'
            : 'no actor is selected in the current match state',
        });
      }

      if (!adapter.isLegalMove(state, submittedMove)) {
        throw new IllegalMoveError({
          gameId: adapter.definition.gameId,
          matchId: state.matchId,
          playerId: submittedMove.playerId,
          moveKind: submittedMove.kind,
          reason: 'move is not legal in the current match state',
        });
      }

      const applied = normalizeTransitionResult(
        adapter.applyMove(state, submittedMove),
      );
      validateState(adapter, applied.state);
      const inspectionAfter = inspectState(adapter, applied.state);
      const result = finalizeState(adapter, applied.state);

      return {
        previousState: state,
        nextState: applied.state,
        move: submittedMove,
        actorPlayerId: inspectionBefore.actorPlayerId,
        legalMovesBefore: inspectionBefore.legalMoves,
        legalMovesAfter: inspectionAfter.legalMoves,
        result,
        events: applied.events,
      };
    },
    finalize(state: MatchState<TState>): MatchResult | null {
      return finalizeState(adapter, state);
    },
  };
}
