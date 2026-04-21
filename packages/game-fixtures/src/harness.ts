import type {
  GameId,
  GameMove,
  MatchResult,
  MatchState,
  PlayerId,
  PlayerProfile,
} from '@repo/game-contracts';
import {
  areMovesEquivalent,
  createGameEngine,
  IllegalMoveError,
  type GameAdapter,
} from '@repo/game-engine';
import type { SessionParticipant } from '@repo/game-session';

export type EngineFixtureStep<TState, TMove extends GameMove> = {
  label: string;
  chooseMove(input: {
    state: MatchState<TState>;
    legalMoves: readonly TMove[];
  }): TMove;
};

export type EngineFixtureCase<TSetup, TState, TMove extends GameMove> = {
  id: string;
  gameId: GameId;
  adapter: GameAdapter<TSetup, TState, TMove>;
  players: readonly PlayerProfile[];
  setup: TSetup;
  steps: readonly EngineFixtureStep<TState, TMove>[];
  digestState(state: MatchState<TState>): Record<string, unknown>;
  expected: {
    initialDigest: Record<string, unknown>;
    finalDigest?: Record<string, unknown>;
    result?: Pick<MatchResult, 'gameId' | 'winnerIds' | 'rankings'>;
    replay?: {
      acceptedMoveCount: number;
      moveKinds: readonly string[];
      winnerIds: readonly PlayerId[];
    };
  };
};

export type EngineFixtureRunResult<TState, TMove extends GameMove> = {
  finalState: MatchState<TState>;
  initialState: MatchState<TState>;
  result: MatchResult | null;
  states: readonly MatchState<TState>[];
  submittedMoves: readonly TMove[];
};

export const standardTwoPlayerProfiles: readonly PlayerProfile[] = [
  { playerId: 'p1', displayName: 'Alice', seat: 1 },
  { playerId: 'p2', displayName: 'Bob', seat: 2 },
] as const;

export const standardFourPlayerProfiles: readonly PlayerProfile[] = [
  { playerId: 'p1', displayName: 'Alice', seat: 1 },
  { playerId: 'p2', displayName: 'Bob', seat: 2 },
  { playerId: 'p3', displayName: 'Casey', seat: 3 },
  { playerId: 'p4', displayName: 'Dana', seat: 4 },
] as const;

export const standardParticipants: readonly SessionParticipant[] = standardFourPlayerProfiles.map((player, index) => ({
  ...player,
  controller: index % 2 === 0 ? 'human' : 'bot',
}));

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return item;
    }

    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)));
  });
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new Error(`${message}\nExpected: ${stableStringify(expected)}\nActual: ${stableStringify(actual)}`);
  }
}

function normalizeMatchId<TState>(state: MatchState<TState>): MatchState<TState> {
  return {
    ...state,
    matchId: '<match-id>',
  };
}

function assertMovesAreSerializable<TMove extends GameMove>(fixtureId: string, moves: readonly TMove[]) {
  for (const move of moves) {
    const roundTripped = JSON.parse(JSON.stringify(move)) as TMove;
    assertDeepEqual(roundTripped, move, `${fixtureId} legal move must be JSON-serializable`);
  }
}

function assertRejectsWrongActor<TSetup, TState, TMove extends GameMove>(
  fixture: EngineFixtureCase<TSetup, TState, TMove>,
  state: MatchState<TState>,
  move: TMove,
) {
  const engine = createGameEngine(fixture.adapter);
  const wrongPlayer = fixture.players.find((player) => player.playerId !== move.playerId);

  if (!wrongPlayer) {
    return;
  }

  try {
    engine.submitMove(state, {
      ...move,
      playerId: wrongPlayer.playerId,
    });
  } catch (error) {
    if (error instanceof IllegalMoveError) {
      return;
    }

    throw error;
  }

  throw new Error(`${fixture.id} accepted a move submitted by the wrong actor`);
}

export function runEngineFixtureCase<TSetup, TState, TMove extends GameMove>(
  fixture: EngineFixtureCase<TSetup, TState, TMove>,
): EngineFixtureRunResult<TState, TMove> {
  const engine = createGameEngine(fixture.adapter);
  const firstInitialState = engine.startMatch({
    matchId: `${fixture.id}:first`,
    players: fixture.players,
    setup: fixture.setup,
    executionMode: 'server-authoritative',
  });
  const secondInitialState = engine.startMatch({
    matchId: `${fixture.id}:second`,
    players: fixture.players,
    setup: fixture.setup,
    executionMode: 'server-authoritative',
  });

  assertDeepEqual(
    normalizeMatchId(firstInitialState),
    normalizeMatchId(secondInitialState),
    `${fixture.id} initial state must be deterministic after normalizing matchId`,
  );
  assertDeepEqual(
    fixture.digestState(firstInitialState),
    fixture.expected.initialDigest,
    `${fixture.id} initial digest mismatch`,
  );

  let currentState = firstInitialState;
  const states: MatchState<TState>[] = [structuredClone(currentState)];
  const submittedMoves: TMove[] = [];

  for (const step of fixture.steps) {
    const legalMoves = fixture.adapter.listLegalMoves(currentState);
    assertMovesAreSerializable(fixture.id, legalMoves);

    const chosenMove = step.chooseMove({
      state: currentState,
      legalMoves,
    });

    if (!legalMoves.some((candidate) => areMovesEquivalent(candidate, chosenMove))) {
      throw new Error(`${fixture.id} step "${step.label}" chose a move that was not listed as legal`);
    }

    const roundTrippedMove = JSON.parse(JSON.stringify(chosenMove)) as TMove;

    if (!fixture.adapter.isLegalMove(currentState, roundTrippedMove)) {
      throw new Error(`${fixture.id} step "${step.label}" round-tripped move is not legal`);
    }

    assertRejectsWrongActor(fixture, currentState, roundTrippedMove);

    const previousState = structuredClone(currentState);
    currentState = engine.submitMove(currentState, roundTrippedMove);
    assertDeepEqual(currentState === previousState, false, `${fixture.id} must return a new state object`);
    assertDeepEqual(states[states.length - 1], previousState, `${fixture.id} mutated the previous state`);

    states.push(structuredClone(currentState));
    submittedMoves.push(roundTrippedMove);
  }

  if (fixture.expected.finalDigest) {
    assertDeepEqual(
      fixture.digestState(currentState),
      fixture.expected.finalDigest,
      `${fixture.id} final digest mismatch`,
    );
  }

  const result = engine.finalizeMatch(currentState);

  if (fixture.expected.result) {
    if (!result) {
      throw new Error(`${fixture.id} expected a completed match result`);
    }

    assertDeepEqual(
      {
        gameId: result.gameId,
        rankings: result.rankings,
        winnerIds: result.winnerIds,
      },
      fixture.expected.result,
      `${fixture.id} result mismatch`,
    );
  }

  return {
    finalState: currentState,
    initialState: firstInitialState,
    result,
    states,
    submittedMoves,
  };
}
