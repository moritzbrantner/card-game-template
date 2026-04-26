import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameEngine } from '@repo/game-engine';

import {
  choosePhase10Move,
  createPhase10Adapter,
  defaultPhase10Phases,
  defaultPhase10Rules,
  formatPhase10PhaseLabel,
  parsePhase10Move,
  parsePhase10Setup,
  type Phase10Card,
  type Phase10PhaseDefinition,
  type Phase10Move,
  type Phase10State,
} from '../src/index.ts';
import type { MatchState, PlayerProfile } from '@repo/game-contracts';

const adapter = createPhase10Adapter();
const players: readonly PlayerProfile[] = [
  { playerId: 'p1', displayName: 'Alice', seat: 1 },
  { playerId: 'p2', displayName: 'Bob', seat: 2 },
  { playerId: 'p3', displayName: 'Casey', seat: 3 },
];

function numberCard(
  color: Exclude<Phase10Card['color'], 'wild' | 'skip'>,
  value: number,
  id: string,
): Phase10Card {
  return {
    color,
    id,
    kind: 'number',
    label: `${color}-${value}`,
    value,
  };
}

function wild(id: string): Phase10Card {
  return {
    color: 'wild',
    id,
    kind: 'wild',
    label: 'Wild',
  };
}

function skip(id: string): Phase10Card {
  return {
    color: 'skip',
    id,
    kind: 'skip',
    label: 'Skip',
  };
}

function createState(
  state: Partial<Phase10State>,
  activePlayerId = 'p1',
): MatchState<Phase10State> {
  const phaseDefinitions: readonly Phase10PhaseDefinition[] =
    state.phaseDefinitions ?? defaultPhase10Phases;

  return {
    matchId: 'match-phase-10',
    gameId: 'phase-10',
    players,
    activePlayerId,
    turn: 1,
    executionMode: 'local',
    state: {
      discardPile: [numberCard('red', 9, 'discard-red-9')],
      drawPile: [
        numberCard('yellow', 3, 'draw-yellow-3'),
        numberCard('blue', 8, 'draw-blue-8'),
        numberCard('green', 4, 'draw-green-4'),
      ],
      drawnCardThisTurn: false,
      hands: {
        p1: [
          numberCard('red', 5, 'red-5'),
          numberCard('yellow', 5, 'yellow-5'),
          wild('wild-1'),
          numberCard('red', 7, 'red-7'),
          numberCard('blue', 7, 'blue-7'),
          numberCard('green', 7, 'green-7'),
          skip('skip-1'),
        ],
        p2: [
          numberCard('green', 2, 'p2-green-2'),
          numberCard('red', 4, 'p2-red-4'),
        ],
        p3: [
          numberCard('yellow', 6, 'p3-yellow-6'),
          numberCard('blue', 6, 'p3-blue-6'),
        ],
      },
      lastEvent: `${phaseDefinitions[0]?.label ?? 'Phase 1'} started`,
      phaseDefinitions,
      phases: {
        p1: {
          label: phaseDefinitions[0]!.label,
          laidGroups: null,
          phaseIndex: 0,
          phaseNumber: 1,
        },
        p2: {
          label: phaseDefinitions[0]!.label,
          laidGroups: null,
          phaseIndex: 0,
          phaseNumber: 1,
        },
        p3: {
          label: phaseDefinitions[0]!.label,
          laidGroups: null,
          phaseIndex: 0,
          phaseNumber: 1,
        },
      },
      round: 1,
      rules: defaultPhase10Rules,
      seed: 'test-seed',
      skippedPlayerIds: [],
      winnerPlayerId: null,
      ...state,
    },
  };
}

test('Phase 10 initial state is deterministic for the same seed', () => {
  const first = adapter.createInitialState({
    matchId: 'phase-10-1',
    players: players.slice(0, 2),
    setup: { seed: 'phase-seed' },
    executionMode: 'local',
  });
  const second = adapter.createInitialState({
    matchId: 'phase-10-2',
    players: players.slice(0, 2),
    setup: { seed: 'phase-seed' },
    executionMode: 'local',
  });

  assert.deepEqual(first.state.hands.p1, second.state.hands.p1);
  assert.deepEqual(first.state.discardPile, second.state.discardPile);
});

test('Phase 10 parsers reject invalid setup and move payloads', () => {
  assert.throws(
    () => parsePhase10Setup({ rules: { allowSkipping: 'yes' } }),
    /allowSkipping must be a boolean/,
  );
  assert.throws(
    () =>
      parsePhase10Move({
        playerId: 'p1',
        kind: 'draw-card',
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: {
          source: 'middle',
        },
      }),
    /draw source/,
  );
  assert.throws(
    () =>
      parsePhase10Move({
        playerId: 'p1',
        kind: 'lay-phase',
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: {
          groups: ['red-5'],
        },
      }),
    /groups must contain card ids/,
  );
  assert.throws(
    () => parsePhase10Setup({ phases: [{ setCount: 0, setSize: 3 }] }),
    /positive integer/,
  );
});

test('Phase 10 setup accepts a custom ordered phase list', () => {
  const parsed = parsePhase10Setup({
    phases: [
      { setCount: 1, setSize: 4 },
      { label: 'Final sprint', setCount: 3, setSize: 2 },
    ],
    seed: 'custom-seed',
  });

  assert.deepEqual(parsed.phases, [
    {
      id: 'phase-1',
      label: formatPhase10PhaseLabel(1, 4, 1),
      setCount: 1,
      setSize: 4,
    },
    {
      id: 'phase-2',
      label: 'Final sprint',
      setCount: 3,
      setSize: 2,
    },
  ]);
});

test('players must draw before they can lay or discard', () => {
  const legalMoves = adapter.listLegalMoves(createState({}));

  assert.deepEqual(
    legalMoves.map((move) => move.kind),
    ['draw-card', 'draw-card'],
  );
});

test('laying phase 1 removes two sets from hand and records them on the table', () => {
  const state = createState({
    drawnCardThisTurn: true,
  });
  const layMove = adapter
    .listLegalMoves(state)
    .find(
      (move): move is Extract<Phase10Move, { kind: 'lay-phase' }> =>
        move.kind === 'lay-phase',
    );

  assert.ok(layMove);

  const nextState = adapter.applyMove(state, layMove);
  const laidGroups = nextState.state.phases.p1?.laidGroups ?? [];

  assert.equal(laidGroups.length, 2);
  assert.equal(nextState.state.hands.p1?.length, 1);
  assert.equal(
    laidGroups.every((group) => group.type === 'set'),
    true,
  );
});

test('configured phases can require a different number of sets and card counts', () => {
  const customPhases: readonly Phase10PhaseDefinition[] = [
    {
      id: 'phase-1',
      label: formatPhase10PhaseLabel(1, 4, 1),
      setCount: 1,
      setSize: 4,
    },
  ];
  const state = createState({
    drawnCardThisTurn: true,
    hands: {
      p1: [
        numberCard('red', 9, 'red-9'),
        numberCard('blue', 9, 'blue-9'),
        numberCard('green', 9, 'green-9'),
        wild('wild-9'),
        skip('skip-1'),
      ],
      p2: [numberCard('yellow', 8, 'p2-yellow-8')],
      p3: [numberCard('green', 8, 'p3-green-8')],
    },
    phaseDefinitions: customPhases,
    phases: {
      p1: {
        label: customPhases[0]!.label,
        laidGroups: null,
        phaseIndex: 0,
        phaseNumber: 1,
      },
      p2: {
        label: customPhases[0]!.label,
        laidGroups: null,
        phaseIndex: 0,
        phaseNumber: 1,
      },
      p3: {
        label: customPhases[0]!.label,
        laidGroups: null,
        phaseIndex: 0,
        phaseNumber: 1,
      },
    },
  });

  const layMove = adapter
    .listLegalMoves(state)
    .find(
      (move): move is Extract<Phase10Move, { kind: 'lay-phase' }> =>
        move.kind === 'lay-phase',
    );

  assert.ok(layMove);
  assert.deepEqual(layMove.payload.groups, [
    ['red-9', 'blue-9', 'green-9', 'wild-9'],
  ]);
});

test('hitting adds a matching card onto an existing laid set', () => {
  const state = createState({
    drawnCardThisTurn: true,
    hands: {
      p1: [numberCard('green', 4, 'green-4')],
      p2: [numberCard('yellow', 8, 'yellow-8')],
      p3: [numberCard('blue', 10, 'blue-10')],
    },
    phases: {
      p1: {
        label: defaultPhase10Phases[0]!.label,
        laidGroups: [
          {
            cards: [
              numberCard('red', 4, 'laid-red-4'),
              numberCard('blue', 4, 'laid-blue-4'),
              wild('laid-wild-4'),
            ],
            cardIds: ['laid-red-4', 'laid-blue-4', 'laid-wild-4'],
            label: 'Set of 4s + wild',
            type: 'set',
            value: 4,
          },
          {
            cards: [
              numberCard('red', 9, 'laid-red-9'),
              numberCard('yellow', 9, 'laid-yellow-9'),
              numberCard('blue', 9, 'laid-blue-9'),
            ],
            cardIds: ['laid-red-9', 'laid-yellow-9', 'laid-blue-9'],
            label: 'Set of 9s',
            type: 'set',
            value: 9,
          },
        ],
        phaseIndex: 0,
        phaseNumber: 1,
      },
      p2: {
        label: defaultPhase10Phases[0]!.label,
        laidGroups: null,
        phaseIndex: 0,
        phaseNumber: 1,
      },
      p3: {
        label: defaultPhase10Phases[0]!.label,
        laidGroups: null,
        phaseIndex: 0,
        phaseNumber: 1,
      },
    },
  });
  const hitMove = adapter
    .listLegalMoves(state)
    .find(
      (move): move is Extract<Phase10Move, { kind: 'hit-phase' }> =>
        move.kind === 'hit-phase',
    );

  assert.ok(hitMove);

  const nextState = adapter.applyMove(state, hitMove);
  const firstGroup = nextState.state.phases.p1?.laidGroups?.[0];

  assert.equal(firstGroup?.cards.length, 4);
  assert.equal(nextState.state.hands.p1?.length, 0);
});

test('discarding skip skips the targeted player on the next turn', () => {
  const afterLay = adapter.applyMove(
    createState({
      drawnCardThisTurn: true,
      hands: {
        p1: [
          numberCard('red', 5, 'red-5'),
          numberCard('yellow', 5, 'yellow-5'),
          wild('wild-1'),
          numberCard('red', 7, 'red-7'),
          numberCard('blue', 7, 'blue-7'),
          numberCard('green', 7, 'green-7'),
          skip('skip-1'),
          numberCard('red', 1, 'red-1'),
        ],
        p2: [numberCard('green', 2, 'p2-green-2')],
        p3: [numberCard('blue', 11, 'p3-blue-11')],
      },
    }),
    {
      playerId: 'p1',
      kind: 'lay-phase',
      createdAt: '2026-04-26T12:00:00.000Z',
      payload: {
        groups: [
          ['red-5', 'yellow-5', 'wild-1'],
          ['red-7', 'blue-7', 'green-7'],
        ],
      },
    },
  );

  const afterDiscard = adapter.applyMove(afterLay, {
    playerId: 'p1',
    kind: 'discard-card',
    createdAt: '2026-04-26T12:00:01.000Z',
    payload: {
      cardId: 'skip-1',
      targetPlayerId: 'p2',
    },
  });

  assert.equal(afterDiscard.activePlayerId, 'p3');
  assert.equal(afterDiscard.state.skippedPlayerIds.includes('p2'), false);
});

test('finishing after laying phase declares the winner', () => {
  const engine = createGameEngine(adapter);
  const afterLay = adapter.applyMove(
    createState({
      drawnCardThisTurn: true,
      hands: {
        p1: [
          numberCard('red', 5, 'red-5'),
          numberCard('yellow', 5, 'yellow-5'),
          wild('wild-1'),
          numberCard('red', 7, 'red-7'),
          numberCard('blue', 7, 'blue-7'),
          numberCard('green', 7, 'green-7'),
          skip('skip-1'),
        ],
        p2: [numberCard('green', 2, 'p2-green-2')],
        p3: [numberCard('blue', 11, 'p3-blue-11')],
      },
    }),
    {
      playerId: 'p1',
      kind: 'lay-phase',
      createdAt: '2026-04-26T12:00:00.000Z',
      payload: {
        groups: [
          ['red-5', 'yellow-5', 'wild-1'],
          ['red-7', 'blue-7', 'green-7'],
        ],
      },
    },
  );

  const transition = engine.submitMove(afterLay, {
    playerId: 'p1',
    kind: 'discard-card',
    createdAt: '2026-04-26T12:00:01.000Z',
    payload: {
      cardId: 'skip-1',
      targetPlayerId: 'p2',
    },
  });

  assert.equal(transition.nextState.state.winnerPlayerId, 'p1');
  assert.deepEqual(engine.finalize(transition.nextState)?.winnerIds, ['p1']);
});

test('finishing a non-final configured phase advances the round and next target', () => {
  const customPhases: readonly Phase10PhaseDefinition[] = [
    {
      id: 'phase-1',
      label: formatPhase10PhaseLabel(2, 3, 1),
      setCount: 2,
      setSize: 3,
    },
    {
      id: 'phase-2',
      label: formatPhase10PhaseLabel(1, 4, 2),
      setCount: 1,
      setSize: 4,
    },
  ];
  const state = createState({
    drawnCardThisTurn: true,
    hands: {
      p1: [skip('skip-1')],
      p2: [numberCard('green', 2, 'p2-green-2')],
      p3: [numberCard('blue', 11, 'p3-blue-11')],
    },
    phaseDefinitions: customPhases,
    phases: {
      p1: {
        label: customPhases[0]!.label,
        laidGroups: [
          {
            cards: [
              numberCard('red', 5, 'red-5'),
              numberCard('yellow', 5, 'yellow-5'),
              wild('wild-1'),
            ],
            cardIds: ['red-5', 'yellow-5', 'wild-1'],
            label: 'Set of 5s + wild',
            type: 'set',
            value: 5,
          },
          {
            cards: [
              numberCard('red', 7, 'red-7'),
              numberCard('blue', 7, 'blue-7'),
              numberCard('green', 7, 'green-7'),
            ],
            cardIds: ['red-7', 'blue-7', 'green-7'],
            label: 'Set of 7s',
            type: 'set',
            value: 7,
          },
        ],
        phaseIndex: 0,
        phaseNumber: 1,
      },
      p2: {
        label: customPhases[0]!.label,
        laidGroups: null,
        phaseIndex: 0,
        phaseNumber: 1,
      },
      p3: {
        label: customPhases[0]!.label,
        laidGroups: null,
        phaseIndex: 0,
        phaseNumber: 1,
      },
    },
  });

  const nextState = adapter.applyMove(state, {
    playerId: 'p1',
    kind: 'discard-card',
    createdAt: '2026-04-26T12:00:01.000Z',
    payload: {
      cardId: 'skip-1',
      targetPlayerId: 'p2',
    },
  });

  assert.equal(nextState.state.winnerPlayerId, null);
  assert.equal(nextState.state.round, 2);
  assert.equal(nextState.activePlayerId, 'p1');
  assert.equal(nextState.state.phases.p1?.phaseIndex, 1);
  assert.equal(nextState.state.phases.p1?.label, customPhases[1]!.label);
  assert.equal(nextState.state.phases.p2?.phaseIndex, 0);
  assert.equal(nextState.state.phases.p1?.laidGroups, null);
  assert.equal(nextState.state.hands.p1?.length, defaultPhase10Rules.handSize);
});

test('Phase 10 bots prefer laying a completed phase when it is available', () => {
  const state = createState({
    drawnCardThisTurn: true,
  });
  const legalMoves = adapter.listLegalMoves(state);
  const selectedMove = choosePhase10Move({
    legalMoves,
    playerId: 'p1',
    seed: 'bot-seed',
    state,
  });

  assert.equal(selectedMove?.kind, 'lay-phase');
});
