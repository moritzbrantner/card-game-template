import assert from 'node:assert/strict';
import test from 'node:test';

import type { MatchState, PlayerProfile } from '@repo/game-contracts';

import {
  createPhase10Adapter,
  type Phase10Card,
  type Phase10LayPhaseMove,
  type Phase10PhaseRequirement,
  type Phase10State,
} from '../src/index.ts';

const players: PlayerProfile[] = [
  { playerId: 'p1', displayName: 'One', seat: 1 },
  { playerId: 'p2', displayName: 'Two', seat: 2 },
];

function* combinations(
  cards: readonly Phase10Card[],
  size: number,
  start = 0,
  group: readonly Phase10Card[] = [],
): Generator<readonly Phase10Card[]> {
  if (group.length === size) {
    yield group;
    return;
  }

  for (let index = start; index < cards.length; index += 1) {
    yield* combinations(cards, size, index + 1, [...group, cards[index]!]);
  }
}

function firstAcceptedGroup(
  adapter: ReturnType<typeof createPhase10Adapter>,
  state: MatchState<Phase10State>,
  hand: readonly Phase10Card[],
  size: number,
) {
  for (const group of combinations(
    hand.filter((card) => card.kind !== 'skip'),
    size,
  )) {
    const groups = [group.map((card) => card.id)];

    try {
      adapter.applyMove(state, {
        playerId: 'p1',
        kind: 'lay-phase',
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: { groups },
      });
      return groups;
    } catch {
      // Not a valid group for this requirement; keep looking.
    }
  }

  return null;
}

test('the offered lay move is the first valid group in hand order', () => {
  const adapter = createPhase10Adapter();
  const requirements: Phase10PhaseRequirement[] = [
    { type: 'set', size: 2 },
    { type: 'set', size: 3 },
    { type: 'color', size: 4 },
    { type: 'color', size: 5 },
    { type: 'run', size: 3 },
    { type: 'run', size: 5 },
  ];
  let matched = 0;

  for (const requirement of requirements) {
    for (let seed = 0; seed < 100; seed += 1) {
      const initial = adapter.createInitialState({
        executionMode: 'local',
        matchId: `search-${seed}`,
        players,
        setup: {
          rules: { handSize: 11 },
          seed,
          phases: [
            { id: 'phase-1', label: 'Search', requirements: [requirement] },
          ],
        },
      });
      const state = {
        ...initial,
        state: { ...initial.state, drawnCardThisTurn: true },
      };
      const hand = state.state.hands.p1!;
      const expected = firstAcceptedGroup(
        adapter,
        state,
        hand,
        requirement.size,
      );
      const layMove = adapter
        .listLegalMoves(state)
        .find((move): move is Phase10LayPhaseMove => move.kind === 'lay-phase');

      assert.deepEqual(layMove?.payload.groups ?? null, expected);
      matched += expected ? 1 : 0;
    }
  }

  assert.ok(matched > 0, 'expected some hands to contain a valid group');
});
