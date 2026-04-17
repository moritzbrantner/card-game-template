import type {
  GameMove,
  MatchReplay,
  MatchReplayAnalysis,
  MatchExecutionMode,
  MatchResult,
  MatchState,
  PlayerId,
  PlayerProfile,
} from '@repo/game-contracts';
import { createMatchReplay, summarizeMatchReplay } from '@repo/game-contracts';
import { createGameEngine, type GameAdapter } from '@repo/game-engine';

export type SessionParticipant = PlayerProfile & {
  controller: 'human' | 'bot';
};

export type LocalGameSessionSnapshot<TState, TMove extends GameMove, TView> = {
  history: readonly MatchState<TState>[];
  legalMoves: readonly TMove[];
  match: MatchState<TState>;
  matchResult: MatchResult | null;
  pendingHotseatPlayerId: PlayerId | null;
  participants: readonly SessionParticipant[];
  view: TView;
  viewerPlayerId: PlayerId | null;
};

export type LocalGameSessionProjectViewInput<TState, TMove extends GameMove> = {
  legalMoves: readonly TMove[];
  matchResult: MatchResult | null;
  participants: readonly SessionParticipant[];
  pendingHotseatPlayerId: PlayerId | null;
  state: MatchState<TState>;
  viewerPlayerId: PlayerId | null;
};

export type LocalGameSessionBot<TState, TMove extends GameMove> = {
  chooseMove(input: {
    legalMoves: readonly TMove[];
    participants: readonly SessionParticipant[];
    playerId: PlayerId;
    state: MatchState<TState>;
  }): TMove | null;
};

export type LocalGameSessionPersistence<TState, TMove extends GameMove, TView> = {
  save(snapshot: LocalGameSessionSnapshot<TState, TMove, TView>): Promise<void> | void;
};

export type CreateLocalGameSessionInput<TSetup, TState, TMove extends GameMove, TView> = {
  adapter: GameAdapter<TSetup, TState, TMove>;
  bots?: Partial<Record<PlayerId, LocalGameSessionBot<TState, TMove>>>;
  executionMode?: MatchExecutionMode;
  hotseat?: boolean;
  matchId: string;
  participants: readonly SessionParticipant[];
  persistence?: LocalGameSessionPersistence<TState, TMove, TView>;
  projectView(input: LocalGameSessionProjectViewInput<TState, TMove>): TView;
  setup: TSetup;
};

export type LocalGameSession<TState, TMove extends GameMove, TView> = {
  confirmHotseat(): void;
  getSnapshot(): LocalGameSessionSnapshot<TState, TMove, TView>;
  restart(): void;
  submitMove(move: TMove): void;
  subscribe(listener: (snapshot: LocalGameSessionSnapshot<TState, TMove, TView>) => void): () => void;
};

export type ServerGameSessionSnapshot<TState, TMove extends GameMove> = {
  analysis: MatchReplayAnalysis;
  history: readonly MatchState<TState>[];
  legalMoves: readonly TMove[];
  match: MatchState<TState>;
  matchResult: MatchResult | null;
  participants: readonly PlayerProfile[];
  replay: MatchReplay<TState, TMove>;
};

export type ServerGameSessionPersistence<TState, TMove extends GameMove> = {
  save(snapshot: ServerGameSessionSnapshot<TState, TMove>): Promise<void> | void;
};

export type CreateServerGameSessionInput<TSetup, TState, TMove extends GameMove> = {
  adapter: GameAdapter<TSetup, TState, TMove>;
  executionMode?: Extract<MatchExecutionMode, 'server-authoritative'>;
  matchId: string;
  now?: () => string;
  participants: readonly PlayerProfile[];
  persistence?: ServerGameSessionPersistence<TState, TMove>;
  setup: TSetup;
};

export type ServerGameSession<TState, TMove extends GameMove> = {
  getAnalysis(): MatchReplayAnalysis;
  getReplay(): MatchReplay<TState, TMove>;
  getSnapshot(): ServerGameSessionSnapshot<TState, TMove>;
  submitMove(move: TMove): void;
  subscribe(listener: (snapshot: ServerGameSessionSnapshot<TState, TMove>) => void): () => void;
};

function cloneState<TState>(state: MatchState<TState>): MatchState<TState> {
  return structuredClone(state);
}

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

export function createLocalGameSession<TSetup, TState, TMove extends GameMove, TView>(
  input: CreateLocalGameSessionInput<TSetup, TState, TMove, TView>,
): LocalGameSession<TState, TMove, TView> {
  const engine = createGameEngine(input.adapter);
  const listeners = new Set<(snapshot: LocalGameSessionSnapshot<TState, TMove, TView>) => void>();
  const orderedParticipants = [...input.participants].sort((left, right) => left.seat - right.seat);
  const humanParticipants = orderedParticipants.filter((participant) => participant.controller === 'human');

  let currentState = engine.startMatch({
    matchId: input.matchId,
    players: orderedParticipants,
    setup: input.setup,
    executionMode: input.executionMode,
  });
  let history: MatchState<TState>[] = [cloneState(currentState)];
  let matchResult = engine.finalizeMatch(currentState);
  let viewerPlayerId: PlayerId | null = null;
  let pendingHotseatPlayerId: PlayerId | null = null;

  function getParticipant(playerId: PlayerId) {
    return orderedParticipants.find((participant) => participant.playerId === playerId) ?? null;
  }

  function getSnapshot(): LocalGameSessionSnapshot<TState, TMove, TView> {
    const legalMoves = matchResult ? [] : input.adapter.listLegalMoves(currentState);

    return {
      history,
      legalMoves,
      match: currentState,
      matchResult,
      pendingHotseatPlayerId,
      participants: orderedParticipants,
      view: input.projectView({
        legalMoves,
        matchResult,
        participants: orderedParticipants,
        pendingHotseatPlayerId,
        state: currentState,
        viewerPlayerId,
      }),
      viewerPlayerId,
    };
  }

  function persistSnapshot() {
    void input.persistence?.save(getSnapshot());
  }

  function emit() {
    const snapshot = getSnapshot();

    for (const listener of listeners) {
      listener(snapshot);
    }

    persistSnapshot();
  }

  function alignViewer() {
    if (matchResult) {
      pendingHotseatPlayerId = null;
      const winnerPlayerId = matchResult.winnerIds[0];
      viewerPlayerId =
        currentState.players.find((player) => player.playerId === winnerPlayerId)?.playerId ?? viewerPlayerId;
      return;
    }

    const activeParticipant = getParticipant(currentState.activePlayerId);

    if (!activeParticipant || activeParticipant.controller === 'bot') {
      pendingHotseatPlayerId = null;
      viewerPlayerId = null;
      return;
    }

    if (input.hotseat && humanParticipants.length > 1 && viewerPlayerId && viewerPlayerId !== activeParticipant.playerId) {
      pendingHotseatPlayerId = activeParticipant.playerId;
      viewerPlayerId = null;
      return;
    }

    pendingHotseatPlayerId = null;
    viewerPlayerId = activeParticipant.playerId;
  }

  function pushState(nextState: MatchState<TState>) {
    currentState = nextState;
    history = [...history, cloneState(nextState)];
    matchResult = engine.finalizeMatch(nextState);
    alignViewer();
  }

  function processBots() {
    if (pendingHotseatPlayerId) {
      return;
    }

    while (!matchResult) {
      const activeParticipant = getParticipant(currentState.activePlayerId);

      if (!activeParticipant || activeParticipant.controller !== 'bot') {
        break;
      }

      const legalMoves = input.adapter.listLegalMoves(currentState);
      const bot = input.bots?.[activeParticipant.playerId];
      const chosenMove = bot?.chooseMove({
        legalMoves,
        participants: orderedParticipants,
        playerId: activeParticipant.playerId,
        state: currentState,
      }) ?? legalMoves[0] ?? null;

      if (!chosenMove) {
        break;
      }

      pushState(engine.submitMove(currentState, chosenMove));
    }
  }

  function resetState() {
    currentState = engine.startMatch({
      matchId: input.matchId,
      players: orderedParticipants,
      setup: input.setup,
      executionMode: input.executionMode,
    });
    history = [cloneState(currentState)];
    matchResult = engine.finalizeMatch(currentState);
    viewerPlayerId = null;
    pendingHotseatPlayerId = null;
    alignViewer();
    processBots();
    emit();
  }

  alignViewer();
  processBots();

  return {
    confirmHotseat() {
      if (!pendingHotseatPlayerId) {
        return;
      }

      viewerPlayerId = pendingHotseatPlayerId;
      pendingHotseatPlayerId = null;
      processBots();
      emit();
    },
    getSnapshot,
    restart() {
      resetState();
    },
    submitMove(move) {
      pushState(engine.submitMove(currentState, move));
      processBots();
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function reconstructMatchHistoryFromReplay<TSetup, TState, TMove extends GameMove>(input: {
  adapter: GameAdapter<TSetup, TState, TMove>;
  replay: MatchReplay<TState, TMove>;
}): MatchState<TState>[] {
  const engine = createGameEngine(input.adapter);
  const history = [cloneState(input.replay.initialState)];
  let currentState = cloneState(input.replay.initialState);

  for (const acceptedMove of input.replay.acceptedMoves) {
    currentState = engine.submitMove(currentState, acceptedMove.move);
    history.push(cloneState(currentState));
  }

  return history;
}

export function createServerGameSession<TSetup, TState, TMove extends GameMove>(
  input: CreateServerGameSessionInput<TSetup, TState, TMove>,
): ServerGameSession<TState, TMove> {
  const engine = createGameEngine(input.adapter);
  const listeners = new Set<(snapshot: ServerGameSessionSnapshot<TState, TMove>) => void>();
  const orderedParticipants = [...input.participants].sort((left, right) => left.seat - right.seat);
  const now = input.now ?? (() => new Date().toISOString());
  const executionMode = input.executionMode ?? 'server-authoritative';
  const startedAt = now();

  let currentState = engine.startMatch({
    matchId: input.matchId,
    players: orderedParticipants,
    setup: input.setup,
    executionMode,
  });
  let history: MatchState<TState>[] = [cloneState(currentState)];
  let matchResult = engine.finalizeMatch(currentState);

  if (matchResult) {
    matchResult = {
      ...matchResult,
      finishedAt: startedAt,
    };
  }

  let replay = createMatchReplay<TState, TMove>({
    startedAt,
    initialState: cloneState(currentState),
    latestState: cloneState(currentState),
    finishedAt: matchResult?.finishedAt ?? null,
    result: cloneValue(matchResult),
  });

  function getSnapshot(): ServerGameSessionSnapshot<TState, TMove> {
    const legalMoves = matchResult ? [] : input.adapter.listLegalMoves(currentState);

    return {
      analysis: summarizeMatchReplay(replay),
      history,
      legalMoves,
      match: currentState,
      matchResult,
      participants: orderedParticipants,
      replay: cloneValue(replay),
    };
  }

  function persistSnapshot(snapshot: ServerGameSessionSnapshot<TState, TMove>) {
    void input.persistence?.save(snapshot);
  }

  function emit() {
    const snapshot = getSnapshot();

    for (const listener of listeners) {
      listener(snapshot);
    }

    persistSnapshot(snapshot);
  }

  persistSnapshot(getSnapshot());

  return {
    getAnalysis() {
      return summarizeMatchReplay(replay);
    },
    getReplay() {
      return cloneValue(replay);
    },
    getSnapshot,
    submitMove(move) {
      if (matchResult) {
        throw new Error(`Match ${currentState.matchId} is already complete`);
      }

      const acceptedAt = now();
      const nextState = engine.submitMove(currentState, move);
      const finalizedResult = engine.finalizeMatch(nextState);

      currentState = nextState;
      history = [...history, cloneState(nextState)];
      matchResult = finalizedResult
        ? {
            ...finalizedResult,
            finishedAt: acceptedAt,
          }
        : null;
      replay = {
        ...replay,
        latestState: cloneState(nextState),
        acceptedMoves: [
          ...replay.acceptedMoves,
          {
            sequence: replay.acceptedMoves.length + 1,
            acceptedAt,
            move: cloneValue(move),
          },
        ],
        finishedAt: matchResult?.finishedAt ?? null,
        result: cloneValue(matchResult),
      };

      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
