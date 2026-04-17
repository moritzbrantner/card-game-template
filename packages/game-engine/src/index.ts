import {
  createMatchResult,
  type GameDefinition,
  type GameMove,
  type MatchExecutionMode,
  type MatchResult,
  type MatchState,
  type PlayerProfile,
} from '../../game-contracts/src/index.ts';

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
  applyMove(state: MatchState<TState>, move: TMove): MatchState<TState>;
  isMatchComplete(state: MatchState<TState>): boolean;
  getResult?(state: MatchState<TState>): MatchResult | null;
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
      const isLegalMove = adapter
        .listLegalMoves(state)
        .some((candidate) => candidate.kind === move.kind && candidate.playerId === move.playerId);

      if (!isLegalMove) {
        throw new Error(`Illegal move submitted for ${adapter.definition.gameId}: ${move.kind}`);
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
