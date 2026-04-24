import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  GameMove,
  MatchState,
  PlayerId,
} from '../../game-contracts/src/index.ts';
import {
  areMovesEquivalent,
  type GameAdapter,
} from '../../game-engine/src/index.ts';
import {
  createLocalGameSession,
  createServerGameSession,
  reconstructMatchHistoryFromReplay,
  resumeServerGameSession,
  verifyReplayIntegrity,
} from '../src/index.ts';

type CounterState = {
  total: number;
};

type CounterMove = GameMove<{ amount: number }>;

const participants = [
  {
    playerId: 'p1',
    displayName: 'Alice',
    seat: 1,
    controller: 'human' as const,
  },
  {
    playerId: 'p2',
    displayName: 'Bot Bob',
    seat: 2,
    controller: 'bot' as const,
  },
  {
    playerId: 'p3',
    displayName: 'Casey',
    seat: 3,
    controller: 'human' as const,
  },
];

const counterAdapter = {
  definition: {
    gameId: 'session-counter',
    name: 'Session Counter',
    minPlayers: 2,
    maxPlayers: 3,
    supportsLocal: true,
    supportsOnline: false,
    tags: ['test'],
  },
  createInitialState({
    executionMode,
    matchId,
    players,
  }: {
    executionMode: 'local' | 'server-authoritative';
    matchId: string;
    players: typeof participants;
    setup: { target: number };
  }): MatchState<CounterState> {
    return {
      matchId,
      gameId: 'session-counter',
      players,
      activePlayerId: players[0]!.playerId,
      turn: 1,
      executionMode,
      state: { total: 0 },
    };
  },
  listLegalMoves(state: MatchState<CounterState>): readonly CounterMove[] {
    return [
      {
        playerId: state.activePlayerId,
        kind: 'increment',
        createdAt: '2026-04-17T12:00:00.000Z',
        payload: { amount: 1 },
      },
    ];
  },
  isLegalMove(state: MatchState<CounterState>, move: CounterMove): boolean {
    return this.listLegalMoves(state).some(
      (candidate) =>
        candidate.playerId === move.playerId &&
        candidate.kind === move.kind &&
        candidate.payload.amount === move.payload.amount,
    );
  },
  applyMove(
    state: MatchState<CounterState>,
    move: CounterMove,
  ): MatchState<CounterState> {
    const currentIndex = state.players.findIndex(
      (player) => player.playerId === move.playerId,
    );
    const nextIndex = (currentIndex + 1) % state.players.length;

    return {
      ...state,
      activePlayerId: state.players[nextIndex]!.playerId,
      turn: state.turn + 1,
      state: {
        total: state.state.total + move.payload.amount,
      },
    };
  },
  isMatchComplete(state: MatchState<CounterState>): boolean {
    return state.state.total >= 3;
  },
  getResult(state: MatchState<CounterState>) {
    if (!this.isMatchComplete(state)) {
      return null;
    }

    return {
      matchId: state.matchId,
      gameId: state.gameId,
      winnerIds: ['p1'],
      rankings: [{ playerId: 'p1', position: 1 }],
      finishedAt: '2026-04-17T12:00:01.000Z',
      executionMode: state.executionMode,
    };
  },
};

function createSelectedActorCounterAdapter(input: {
  selectActor(state: MatchState<CounterState>): PlayerId | null;
  target?: number;
}): GameAdapter<{ target: number }, CounterState, CounterMove> {
  return {
    ...counterAdapter,
    listLegalMoves(state): readonly CounterMove[] {
      return state.players.map((player) => ({
        playerId: player.playerId,
        kind: 'increment',
        createdAt: '2026-04-17T12:00:00.000Z',
        payload: { amount: 1 },
      }));
    },
    isLegalMove(state, move): boolean {
      return this.listLegalMoves(state).some((candidate) =>
        areMovesEquivalent(candidate, move),
      );
    },
    applyMove(state, move): MatchState<CounterState> {
      return {
        ...state,
        turn: state.turn + 1,
        state: {
          total: state.state.total + move.payload.amount,
        },
      };
    },
    isMatchComplete(state): boolean {
      return state.state.total >= (input.target ?? 3);
    },
    selectActor({ state }): PlayerId | null {
      return input.selectActor(state);
    },
  };
}

test('local session advances bot turns automatically and stops on a human turn', () => {
  const session = createLocalGameSession({
    adapter: counterAdapter,
    matchId: 'session-1',
    participants,
    setup: { target: 3 },
    projectView: ({ state, viewerPlayerId, pendingHotseatPlayerId }) => ({
      total: state.state.total,
      viewerPlayerId,
      pendingHotseatPlayerId,
    }),
  });

  session.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1 },
  });

  const snapshot = session.getSnapshot();
  assert.equal(snapshot.match.state.total, 2);
  assert.equal(snapshot.match.activePlayerId, 'p3');
  assert.equal(snapshot.viewerPlayerId, 'p3');
});

test('local session snapshots expose and filter to the selected actor', () => {
  const session = createLocalGameSession({
    adapter: createSelectedActorCounterAdapter({
      selectActor(state) {
        return state.state.total === 0 ? 'p2' : 'p1';
      },
    }),
    bots: {
      p2: {
        chooseMove({ legalMoves, playerId }) {
          assert.equal(playerId, 'p2');
          assert.deepEqual(
            [...new Set(legalMoves.map((move) => move.playerId))],
            ['p2'],
          );
          return legalMoves[0] ?? null;
        },
      },
    },
    matchId: 'session-selected-actor-bot',
    participants,
    setup: { target: 3 },
    projectView: ({ legalMoves, selectedActorPlayerId }) => ({
      legalMovePlayerIds: legalMoves.map((move) => move.playerId),
      selectedActorPlayerId,
    }),
  });

  const snapshot = session.getSnapshot();

  assert.equal(snapshot.match.activePlayerId, 'p1');
  assert.equal(snapshot.match.state.total, 1);
  assert.equal(snapshot.selectedActorPlayerId, 'p1');
  assert.deepEqual(
    [...new Set(snapshot.legalMoves.map((move) => move.playerId))],
    ['p1'],
  );
  assert.deepEqual(snapshot.view, {
    legalMovePlayerIds: ['p1'],
    selectedActorPlayerId: 'p1',
  });
});

test('local session hides the next hotseat hand until confirmation', () => {
  const hotseatSession = createLocalGameSession({
    adapter: counterAdapter,
    hotseat: true,
    matchId: 'session-2',
    participants: [
      {
        playerId: 'p1',
        displayName: 'Alice',
        seat: 1,
        controller: 'human' as const,
      },
      {
        playerId: 'p2',
        displayName: 'Casey',
        seat: 2,
        controller: 'human' as const,
      },
    ],
    setup: { target: 3 },
    projectView: ({ viewerPlayerId, pendingHotseatPlayerId }) => ({
      viewerPlayerId,
      pendingHotseatPlayerId,
    }),
  });

  hotseatSession.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1 },
  });

  assert.equal(hotseatSession.getSnapshot().viewerPlayerId, null);
  assert.equal(hotseatSession.getSnapshot().pendingHotseatPlayerId, 'p2');

  hotseatSession.confirmHotseat();

  assert.equal(hotseatSession.getSnapshot().viewerPlayerId, 'p2');
  assert.equal(hotseatSession.getSnapshot().pendingHotseatPlayerId, null);
});

test('local hotseat handoff follows the selected actor instead of the active player', () => {
  const hotseatSession = createLocalGameSession({
    adapter: createSelectedActorCounterAdapter({
      selectActor(state) {
        return state.state.total === 0 ? 'p1' : 'p2';
      },
    }),
    hotseat: true,
    matchId: 'session-selected-hotseat',
    participants: [
      {
        playerId: 'p1',
        displayName: 'Alice',
        seat: 1,
        controller: 'human' as const,
      },
      {
        playerId: 'p2',
        displayName: 'Casey',
        seat: 2,
        controller: 'human' as const,
      },
    ],
    setup: { target: 3 },
    projectView: ({
      selectedActorPlayerId,
      viewerPlayerId,
      pendingHotseatPlayerId,
    }) => ({
      selectedActorPlayerId,
      viewerPlayerId,
      pendingHotseatPlayerId,
    }),
  });

  hotseatSession.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.000Z',
    payload: { amount: 1 },
  });

  const pendingSnapshot = hotseatSession.getSnapshot();

  assert.equal(pendingSnapshot.match.activePlayerId, 'p1');
  assert.equal(pendingSnapshot.selectedActorPlayerId, 'p2');
  assert.equal(pendingSnapshot.viewerPlayerId, null);
  assert.equal(pendingSnapshot.pendingHotseatPlayerId, 'p2');

  hotseatSession.confirmHotseat();

  assert.equal(hotseatSession.getSnapshot().viewerPlayerId, 'p2');
  assert.equal(hotseatSession.getSnapshot().pendingHotseatPlayerId, null);
});

test('server session records accepted moves and reconstructs replay history', () => {
  const timestamps = [
    '2026-04-17T12:00:00.000Z',
    '2026-04-17T12:00:01.000Z',
    '2026-04-17T12:00:02.000Z',
    '2026-04-17T12:00:03.000Z',
  ];

  const session = createServerGameSession({
    adapter: counterAdapter,
    matchId: 'server-session-1',
    participants: participants.slice(0, 2),
    setup: { target: 2 },
    now() {
      return timestamps.shift() ?? '2026-04-17T12:00:59.000Z';
    },
  });

  const openingSnapshot = session.getSnapshot();

  assert.equal(openingSnapshot.replay.startedAt, '2026-04-17T12:00:00.000Z');
  assert.equal(openingSnapshot.selectedActorPlayerId, 'p1');
  assert.deepEqual(openingSnapshot.replay.acceptedMoves, []);

  session.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:00.500Z',
    payload: { amount: 1 },
  });
  session.submitMove({
    playerId: 'p2',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:01.500Z',
    payload: { amount: 1 },
  });
  session.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:00:02.500Z',
    payload: { amount: 1 },
  });

  const snapshot = session.getSnapshot();

  assert.equal(snapshot.selectedActorPlayerId, null);
  assert.equal(snapshot.match.state.total, 3);
  assert.equal(snapshot.matchResult?.winnerIds[0], 'p1');
  assert.deepEqual(
    snapshot.replay.acceptedMoves.map((entry) => ({
      sequence: entry.sequence,
      acceptedAt: entry.acceptedAt,
      playerId: entry.move.playerId,
    })),
    [
      { sequence: 1, acceptedAt: '2026-04-17T12:00:01.000Z', playerId: 'p1' },
      { sequence: 2, acceptedAt: '2026-04-17T12:00:02.000Z', playerId: 'p2' },
      { sequence: 3, acceptedAt: '2026-04-17T12:00:03.000Z', playerId: 'p1' },
    ],
  );
  assert.deepEqual(
    reconstructMatchHistoryFromReplay({
      adapter: counterAdapter,
      replay: snapshot.replay,
    }).map((state) => state.state.total),
    [0, 1, 2, 3],
  );
  assert.deepEqual(snapshot.analysis.players, [
    { playerId: 'p1', displayName: 'Alice', movesAccepted: 2 },
    { playerId: 'p2', displayName: 'Bot Bob', movesAccepted: 1 },
  ]);
  assert.equal(snapshot.analysis.durationMs, 3000);
  assert.deepEqual(snapshot.replay.metadata, {
    engineVersion: 1,
    gameVersion: 'session-counter',
    rngVersion: 'mulberry32-fnv1a-v1',
    rulesetVersion: 'session-counter',
    setup: { target: 2 },
  });
});

test('server session accepts explicit replay metadata and preserves it on resume', () => {
  const session = createServerGameSession({
    adapter: counterAdapter,
    matchId: 'server-session-metadata',
    participants: participants.slice(0, 2),
    setup: { target: 2 },
    replayMetadata: {
      engineVersion: 1,
      gameVersion: 'session-counter',
      rngVersion: 'mulberry32-fnv1a-v1',
      rulesetVersion: 'session-counter',
      setup: { target: 2, preset: 'explicit' },
    },
    now() {
      return '2026-04-17T12:15:00.000Z';
    },
  });

  const resumed = resumeServerGameSession({
    adapter: counterAdapter,
    participants: participants.slice(0, 2),
    replay: session.getReplay(),
  });

  assert.deepEqual(resumed.getReplay().metadata, {
    engineVersion: 1,
    gameVersion: 'session-counter',
    rngVersion: 'mulberry32-fnv1a-v1',
    rulesetVersion: 'session-counter',
    setup: { target: 2, preset: 'explicit' },
  });
});

test('server session persists the opening snapshot so progression tracking starts at match creation', () => {
  const savedSnapshots: Array<{
    acceptedMoveCount: number;
    startedAt: string;
  }> = [];

  const session = createServerGameSession({
    adapter: counterAdapter,
    matchId: 'server-session-2',
    participants: participants.slice(0, 2),
    setup: { target: 2 },
    now() {
      return '2026-04-17T12:10:00.000Z';
    },
    persistence: {
      save(snapshot) {
        savedSnapshots.push({
          acceptedMoveCount: snapshot.analysis.acceptedMoveCount,
          startedAt: snapshot.replay.startedAt,
        });
      },
    },
  });

  session.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:10:00.500Z',
    payload: { amount: 1 },
  });

  assert.deepEqual(savedSnapshots, [
    { acceptedMoveCount: 0, startedAt: '2026-04-17T12:10:00.000Z' },
    { acceptedMoveCount: 1, startedAt: '2026-04-17T12:10:00.000Z' },
  ]);
});

test('resuming a persisted replay and submitting another move matches playing the full sequence from scratch', () => {
  const initialTimestamps = [
    '2026-04-17T12:20:00.000Z',
    '2026-04-17T12:20:01.000Z',
    '2026-04-17T12:20:02.000Z',
  ];
  const initialSession = createServerGameSession({
    adapter: counterAdapter,
    matchId: 'server-session-3',
    participants: participants.slice(0, 2),
    setup: { target: 4 },
    now() {
      return initialTimestamps.shift() ?? '2026-04-17T12:20:09.000Z';
    },
  });

  initialSession.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:20:00.500Z',
    payload: { amount: 1 },
  });
  initialSession.submitMove({
    playerId: 'p2',
    kind: 'increment',
    createdAt: '2026-04-17T12:20:01.500Z',
    payload: { amount: 1 },
  });

  const resumed = resumeServerGameSession({
    adapter: counterAdapter,
    participants: participants.slice(0, 2),
    replay: initialSession.getReplay(),
    now() {
      return '2026-04-17T12:20:03.000Z';
    },
  });

  const fullRun = createServerGameSession({
    adapter: counterAdapter,
    matchId: 'server-session-3',
    participants: participants.slice(0, 2),
    setup: { target: 4 },
    now: (() => {
      const timestamps = [
        '2026-04-17T12:20:00.000Z',
        '2026-04-17T12:20:01.000Z',
        '2026-04-17T12:20:02.000Z',
        '2026-04-17T12:20:03.000Z',
      ];

      return () => timestamps.shift() ?? '2026-04-17T12:20:09.000Z';
    })(),
  });

  for (const move of initialSession
    .getReplay()
    .acceptedMoves.map((entry) => entry.move)) {
    fullRun.submitMove(move);
  }

  const finalMove: CounterMove = {
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:20:02.500Z',
    payload: { amount: 1 },
  };

  resumed.submitMove(finalMove);
  fullRun.submitMove(finalMove);

  assert.deepEqual(resumed.getReplay(), fullRun.getReplay());
  assert.deepEqual(resumed.getSnapshot().match, fullRun.getSnapshot().match);
});

test('verifyReplayIntegrity rejects tampered move order and mismatched latest state', () => {
  const timestamps = [
    '2026-04-17T12:30:00.000Z',
    '2026-04-17T12:30:01.000Z',
    '2026-04-17T12:30:02.000Z',
  ];
  const session = createServerGameSession({
    adapter: counterAdapter,
    matchId: 'server-session-4',
    participants: participants.slice(0, 2),
    setup: { target: 3 },
    now() {
      return timestamps.shift() ?? '2026-04-17T12:30:09.000Z';
    },
  });

  session.submitMove({
    playerId: 'p1',
    kind: 'increment',
    createdAt: '2026-04-17T12:30:00.500Z',
    payload: { amount: 1 },
  });
  session.submitMove({
    playerId: 'p2',
    kind: 'increment',
    createdAt: '2026-04-17T12:30:01.500Z',
    payload: { amount: 1 },
  });

  const replay = session.getReplay();
  const movedOutOfOrder = {
    ...replay,
    acceptedMoves: [
      { ...replay.acceptedMoves[1]!, sequence: 1 },
      { ...replay.acceptedMoves[0]!, sequence: 2 },
    ],
  };
  const mismatchedLatestState = {
    ...replay,
    latestState: {
      ...replay.latestState,
      state: {
        ...replay.latestState.state,
        total: 99,
      },
    },
  };

  assert.deepEqual(verifyReplayIntegrity({ adapter: counterAdapter, replay }), {
    ok: true,
  });
  assert.deepEqual(
    verifyReplayIntegrity({ adapter: counterAdapter, replay: movedOutOfOrder }),
    {
      ok: false,
      reason: 'accepted move timestamps are out of order',
    },
  );
  assert.deepEqual(
    verifyReplayIntegrity({
      adapter: counterAdapter,
      replay: mismatchedLatestState,
    }),
    {
      ok: false,
      reason: 'latest state does not match the accepted move log',
    },
  );
});

test('verifyReplayIntegrity rejects mismatched replay metadata but accepts legacy metadata', () => {
  const session = createServerGameSession({
    adapter: counterAdapter,
    matchId: 'server-session-legacy-metadata',
    participants: participants.slice(0, 2),
    setup: { target: 3 },
    now() {
      return '2026-04-17T12:40:00.000Z';
    },
  });
  const replay = session.getReplay();
  const mismatchedReplay = {
    ...replay,
    metadata: replay.metadata
      ? {
          ...replay.metadata,
          rulesetVersion: 'different-rules',
        }
      : null,
  };
  const legacyReplay = {
    ...replay,
    metadata: null,
  };

  assert.deepEqual(
    verifyReplayIntegrity({
      adapter: counterAdapter,
      replay: mismatchedReplay,
    }),
    {
      ok: false,
      reason: 'replay ruleset version does not match the adapter',
    },
  );
  assert.deepEqual(
    verifyReplayIntegrity({ adapter: counterAdapter, replay: legacyReplay }),
    {
      ok: true,
    },
  );
});
