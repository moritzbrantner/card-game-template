import type {
  GameMove,
  GameReplayMetadata,
  MatchExecutionMode,
  MatchReplay,
  MatchReplayAcceptedMove,
  MatchReplayAnalysis,
  MatchResult,
  MatchState,
  PlayerId,
  PlayerProfile,
} from '@repo/game-contracts';
import { createMatchReplay, summarizeMatchReplay } from '@repo/game-contracts';
import { canonicalizeMove, createGameEngine, createReplayMetadata, DEFAULT_RNG_VERSION, type GameAdapter } from '@repo/game-engine';

function isSerializableDeepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => isSerializableDeepEqual(value, right[index]))
    );
  }

  const leftEntries = Object.entries(left);
  const rightObject = right as Record<string, unknown>;

  if (leftEntries.length !== Object.keys(rightObject).length) {
    return false;
  }

  return leftEntries.every(
    ([key, value]) =>
      Object.prototype.hasOwnProperty.call(rightObject, key) &&
      isSerializableDeepEqual(value, rightObject[key]),
  );
}

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
  selectedActorPlayerId: PlayerId | null;
  view: TView;
  viewerPlayerId: PlayerId | null;
};

export type LocalGameSessionProjectViewInput<TState, TMove extends GameMove> = {
  legalMoves: readonly TMove[];
  matchResult: MatchResult | null;
  participants: readonly SessionParticipant[];
  pendingHotseatPlayerId: PlayerId | null;
  selectedActorPlayerId: PlayerId | null;
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
  selectedActorPlayerId: PlayerId | null;
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
  replayMetadata?: GameReplayMetadata<TSetup>;
  setup: TSetup;
};

export type ResumeServerGameSessionInput<TSetup, TState, TMove extends GameMove> = {
  adapter: GameAdapter<TSetup, TState, TMove>;
  now?: () => string;
  participants: readonly PlayerProfile[];
  persistence?: ServerGameSessionPersistence<TState, TMove>;
  replay: MatchReplay<TState, TMove>;
};

export type ReplayIntegrityCheck =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
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

function sortPlayersBySeat<TPlayer extends PlayerProfile>(players: readonly TPlayer[]): TPlayer[] {
  return [...players].sort((left, right) => left.seat - right.seat);
}

function resolveSelectedActor<TSetup, TState, TMove extends GameMove>(input: {
  adapter: GameAdapter<TSetup, TState, TMove>;
  state: MatchState<TState>;
  matchResult: MatchResult | null;
}): {
  legalMoves: readonly TMove[];
  selectedActorPlayerId: PlayerId | null;
} {
  if (input.matchResult) {
    return {
      legalMoves: [],
      selectedActorPlayerId: null,
    };
  }

  const allLegalMoves = input.adapter.listLegalMoves(input.state);
  const selectedActorPlayerId = input.adapter.selectActor
    ? input.adapter.selectActor({
        state: input.state,
        legalMoves: allLegalMoves,
      })
    : input.state.activePlayerId;

  return {
    legalMoves: selectedActorPlayerId
      ? allLegalMoves.filter((move) => move.playerId === selectedActorPlayerId)
      : [],
    selectedActorPlayerId,
  };
}

function withAcceptedFinishedAt(result: MatchResult | null, finishedAt: string): MatchResult | null {
  return result
    ? {
        ...result,
        finishedAt,
      }
    : null;
}

function canonicalizeAdapterMove<TSetup, TState, TMove extends GameMove>(
  adapter: GameAdapter<TSetup, TState, TMove>,
  move: TMove,
): TMove {
  const validatedMove = adapter.validateMove ? adapter.validateMove(move) : move;
  return canonicalizeMove(adapter.canonicalizeMove ? adapter.canonicalizeMove(validatedMove) : validatedMove);
}

function expectedReplayVersions<TSetup, TState, TMove extends GameMove>(
  adapter: GameAdapter<TSetup, TState, TMove>,
) {
  return {
    gameVersion: adapter.metadata?.gameVersion ?? adapter.definition.gameId,
    rngVersion: adapter.metadata?.rngVersion ?? DEFAULT_RNG_VERSION,
    rulesetVersion: adapter.metadata?.rulesetVersion ?? adapter.definition.gameId,
  };
}

type RebuildReplayInput<TSetup, TState, TMove extends GameMove> = {
  adapter: GameAdapter<TSetup, TState, TMove>;
  replay: MatchReplay<TState, TMove>;
};

function rebuildServerReplay<TSetup, TState, TMove extends GameMove>(
  input: RebuildReplayInput<TSetup, TState, TMove>,
) {
  const engine = createGameEngine(input.adapter);
  let currentState = cloneState(input.replay.initialState);
  let history: MatchState<TState>[] = [cloneState(currentState)];
  let matchResult = withAcceptedFinishedAt(engine.finalizeMatch(currentState), input.replay.startedAt);
  let replay = createMatchReplay<TState, TMove>({
    startedAt: input.replay.startedAt,
    initialState: cloneState(input.replay.initialState),
    latestState: cloneState(currentState),
    finishedAt: matchResult?.finishedAt ?? null,
    metadata: cloneValue(input.replay.metadata),
    result: cloneValue(matchResult),
  });

  for (const acceptedMove of input.replay.acceptedMoves) {
    const submittedMove = canonicalizeAdapterMove(input.adapter, acceptedMove.move);
    const nextState = engine.submitMove(currentState, submittedMove);

    currentState = nextState;
    history = [...history, cloneState(nextState)];
    matchResult = withAcceptedFinishedAt(engine.finalizeMatch(nextState), acceptedMove.acceptedAt);
    replay = {
      ...replay,
      latestState: cloneState(nextState),
      acceptedMoves: [
        ...replay.acceptedMoves,
        {
          sequence: acceptedMove.sequence,
          acceptedAt: acceptedMove.acceptedAt,
          move: cloneValue(submittedMove),
        },
      ],
      finishedAt: matchResult?.finishedAt ?? null,
      result: cloneValue(matchResult),
    };
  }

  return {
    history,
    replay,
    match: currentState,
    matchResult,
  };
}

export function createLocalGameSession<TSetup, TState, TMove extends GameMove, TView>(
  input: CreateLocalGameSessionInput<TSetup, TState, TMove, TView>,
): LocalGameSession<TState, TMove, TView> {
  const engine = createGameEngine(input.adapter);
  const listeners = new Set<(snapshot: LocalGameSessionSnapshot<TState, TMove, TView>) => void>();
  const orderedParticipants = sortPlayersBySeat(input.participants);
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
    const { legalMoves, selectedActorPlayerId } = resolveSelectedActor({
      adapter: input.adapter,
      state: currentState,
      matchResult,
    });

    return {
      history,
      legalMoves,
      match: currentState,
      matchResult,
      pendingHotseatPlayerId,
      participants: orderedParticipants,
      selectedActorPlayerId,
      view: input.projectView({
        legalMoves,
        matchResult,
        participants: orderedParticipants,
        pendingHotseatPlayerId,
        selectedActorPlayerId,
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

    const { selectedActorPlayerId } = resolveSelectedActor({
      adapter: input.adapter,
      state: currentState,
      matchResult,
    });
    const activeParticipant = selectedActorPlayerId ? getParticipant(selectedActorPlayerId) : null;

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
      const { legalMoves, selectedActorPlayerId } = resolveSelectedActor({
        adapter: input.adapter,
        state: currentState,
        matchResult,
      });
      const activeParticipant = selectedActorPlayerId ? getParticipant(selectedActorPlayerId) : null;

      if (!activeParticipant || activeParticipant.controller !== 'bot') {
        break;
      }

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
  return rebuildServerReplay(input).history;
}

function createServerSessionRuntime<TSetup, TState, TMove extends GameMove>(input: {
  adapter: GameAdapter<TSetup, TState, TMove>;
  now: () => string;
  participants: readonly PlayerProfile[];
  persistence?: ServerGameSessionPersistence<TState, TMove>;
  startedAt: string;
  initialState: MatchState<TState>;
  acceptedMoves?: readonly MatchReplayAcceptedMove<TMove>[];
  persistInitialSnapshot: boolean;
  replayMetadata: GameReplayMetadata | null;
}): ServerGameSession<TState, TMove> {
  const engine = createGameEngine(input.adapter);
  const listeners = new Set<(snapshot: ServerGameSessionSnapshot<TState, TMove>) => void>();
  const orderedParticipants = sortPlayersBySeat(input.participants);

  let currentState = cloneState(input.initialState);
  let history: MatchState<TState>[] = [cloneState(currentState)];
  let matchResult = withAcceptedFinishedAt(engine.finalizeMatch(currentState), input.startedAt);
  let replay = createMatchReplay<TState, TMove>({
    startedAt: input.startedAt,
    initialState: cloneState(input.initialState),
    latestState: cloneState(currentState),
    finishedAt: matchResult?.finishedAt ?? null,
    metadata: cloneValue(input.replayMetadata),
    result: cloneValue(matchResult),
  });

  function buildSnapshot(): ServerGameSessionSnapshot<TState, TMove> {
    const { legalMoves, selectedActorPlayerId } = resolveSelectedActor({
      adapter: input.adapter,
      state: currentState,
      matchResult,
    });

    return {
      analysis: summarizeMatchReplay(replay),
      history,
      legalMoves,
      match: currentState,
      matchResult,
      participants: orderedParticipants,
      replay: cloneValue(replay),
      selectedActorPlayerId,
    };
  }

  function persistSnapshot(snapshot: ServerGameSessionSnapshot<TState, TMove>) {
    void input.persistence?.save(snapshot);
  }

  function emit() {
    const snapshot = buildSnapshot();

    for (const listener of listeners) {
      listener(snapshot);
    }

    persistSnapshot(snapshot);
  }

  function appendAcceptedMove(acceptedMove: MatchReplayAcceptedMove<TMove>) {
    if (matchResult) {
      throw new Error(`Match ${currentState.matchId} is already complete`);
    }

    const submittedMove = canonicalizeAdapterMove(input.adapter, acceptedMove.move);
    const nextState = engine.submitMove(currentState, submittedMove);

    currentState = nextState;
    history = [...history, cloneState(nextState)];
    matchResult = withAcceptedFinishedAt(engine.finalizeMatch(nextState), acceptedMove.acceptedAt);
    replay = {
      ...replay,
      latestState: cloneState(nextState),
      acceptedMoves: [
        ...replay.acceptedMoves,
        {
          sequence: acceptedMove.sequence,
          acceptedAt: acceptedMove.acceptedAt,
          move: cloneValue(submittedMove),
        },
      ],
      finishedAt: matchResult?.finishedAt ?? null,
      result: cloneValue(matchResult),
    };
  }

  for (const acceptedMove of input.acceptedMoves ?? []) {
    appendAcceptedMove(acceptedMove);
  }

  if (input.persistInitialSnapshot) {
    persistSnapshot(buildSnapshot());
  }

  return {
    getAnalysis() {
      return summarizeMatchReplay(replay);
    },
    getReplay() {
      return cloneValue(replay);
    },
    getSnapshot() {
      return buildSnapshot();
    },
    submitMove(move) {
      appendAcceptedMove({
        sequence: replay.acceptedMoves.length + 1,
        acceptedAt: input.now(),
        move,
      });
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

export function verifyReplayIntegrity<TSetup, TState, TMove extends GameMove>(input: {
  adapter: GameAdapter<TSetup, TState, TMove>;
  replay: MatchReplay<TState, TMove>;
}): ReplayIntegrityCheck {
  if (input.replay.metadata) {
    const expected = expectedReplayVersions(input.adapter);

    if (input.replay.metadata.gameVersion !== expected.gameVersion) {
      return {
        ok: false,
        reason: 'replay game version does not match the adapter',
      };
    }

    if (input.replay.metadata.rulesetVersion !== expected.rulesetVersion) {
      return {
        ok: false,
        reason: 'replay ruleset version does not match the adapter',
      };
    }

    if (input.replay.metadata.rngVersion !== expected.rngVersion) {
      return {
        ok: false,
        reason: 'replay RNG version does not match the adapter',
      };
    }
  }

  for (const [index, acceptedMove] of input.replay.acceptedMoves.entries()) {
    if (acceptedMove.sequence !== index + 1) {
      return {
        ok: false,
        reason: `accepted move sequence ${acceptedMove.sequence} does not match its replay position`,
      };
    }

    if (index > 0 && input.replay.acceptedMoves[index - 1]!.acceptedAt > acceptedMove.acceptedAt) {
      return {
        ok: false,
        reason: 'accepted move timestamps are out of order',
      };
    }
  }

  let rebuilt: {
    history: MatchState<TState>[];
    replay: MatchReplay<TState, TMove>;
    match: MatchState<TState>;
    matchResult: MatchResult | null;
  };

  try {
    rebuilt = rebuildServerReplay(input);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'replay reconstruction failed',
    };
  }

  if (!isSerializableDeepEqual(rebuilt.replay.latestState, input.replay.latestState)) {
    return {
      ok: false,
      reason: 'latest state does not match the accepted move log',
    };
  }

  if (!isSerializableDeepEqual(rebuilt.replay.result, input.replay.result)) {
    return {
      ok: false,
      reason: 'result does not match the reconstructed replay outcome',
    };
  }

  if (input.replay.result && rebuilt.replay.finishedAt !== input.replay.finishedAt) {
    return {
      ok: false,
      reason: 'finished timestamp does not match the reconstructed replay outcome',
    };
  }

  return { ok: true };
}

export function createServerGameSession<TSetup, TState, TMove extends GameMove>(
  input: CreateServerGameSessionInput<TSetup, TState, TMove>,
): ServerGameSession<TState, TMove> {
  const engine = createGameEngine(input.adapter);
  const orderedParticipants = sortPlayersBySeat(input.participants);
  const now = input.now ?? (() => new Date().toISOString());
  const executionMode = input.executionMode ?? 'server-authoritative';
  const startedAt = now();
  const initialState = engine.startMatch({
    matchId: input.matchId,
    players: orderedParticipants,
    setup: input.setup,
    executionMode,
  });

  return createServerSessionRuntime({
    adapter: input.adapter,
    now,
    participants: orderedParticipants,
    persistence: input.persistence,
    startedAt,
    initialState,
    persistInitialSnapshot: true,
    replayMetadata: input.replayMetadata ?? createReplayMetadata(input.adapter, input.setup),
  });
}

export function resumeServerGameSession<TSetup, TState, TMove extends GameMove>(
  input: ResumeServerGameSessionInput<TSetup, TState, TMove>,
): ServerGameSession<TState, TMove> {
  const integrity = verifyReplayIntegrity({
    adapter: input.adapter,
    replay: input.replay,
  });

  if (!integrity.ok) {
    throw new Error(`Replay integrity check failed: ${integrity.reason}`);
  }

  return createServerSessionRuntime({
    adapter: input.adapter,
    now: input.now ?? (() => new Date().toISOString()),
    participants: input.participants,
    persistence: input.persistence,
    startedAt: input.replay.startedAt,
    initialState: input.replay.initialState,
    acceptedMoves: input.replay.acceptedMoves,
    persistInitialSnapshot: false,
    replayMetadata: input.replay.metadata,
  });
}
