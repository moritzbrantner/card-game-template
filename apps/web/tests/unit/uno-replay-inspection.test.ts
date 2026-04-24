import { describe, expect, it } from 'vitest';

import { createMatchReplay, type MatchState } from '@repo/game-contracts';
import {
  createUnoAdapter,
  defaultUnoRules,
  type UnoCard,
  type UnoMove,
  type UnoState,
} from '@repo/game-uno';
import type { SessionParticipant } from '@repo/game-session';

import {
  buildUnoReplayInspectionSteps,
  buildUnoReplayPerspectives,
} from '@/src/domain/game-matches/replay-inspection';

const participants: readonly SessionParticipant[] = [
  { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' },
  { playerId: 'p2', displayName: 'Bob', seat: 2, controller: 'bot' },
];

function createCard(
  color: UnoCard['color'],
  kind: UnoCard['kind'],
  id: string,
  value?: number,
): UnoCard {
  return {
    color,
    kind,
    id,
    label: id,
    value,
  };
}

function createState(): MatchState<UnoState> {
  return {
    matchId: 'match-uno',
    gameId: 'uno-style',
    players: participants,
    activePlayerId: 'p1',
    turn: 1,
    executionMode: 'server-authoritative',
    state: {
      currentColor: 'red',
      direction: 1,
      discardPile: [createCard('red', 'number', 'discard-5', 5)],
      drawPile: [createCard('yellow', 'number', 'draw-1', 1)],
      drawnCardThisTurnId: null,
      hands: {
        p1: [createCard('red', 'number', 'red-4', 4)],
        p2: [createCard('blue', 'number', 'blue-1', 1)],
      },
      lastEvent: 'Ready',
      pendingDrawAmount: 0,
      pendingDrawSource: null,
      rules: defaultUnoRules,
      seed: 'test-seed',
      winnerPlayerId: null,
    },
  };
}

describe('UNO replay inspection', () => {
  it('builds bird-eye and per-player card visibility for replay steps', () => {
    const initialState = createState();
    const replay = createMatchReplay<UnoState, UnoMove>({
      startedAt: '2026-04-17T12:00:00.000Z',
      initialState,
      latestState: initialState,
      acceptedMoves: [],
      finishedAt: null,
      result: null,
    });
    const perspectives = buildUnoReplayPerspectives(participants);
    const steps = buildUnoReplayInspectionSteps({
      adapter: createUnoAdapter(),
      history: [initialState],
      participants,
      perspectives,
      replay,
    });

    expect(perspectives.map((perspective) => perspective.id)).toEqual([
      'bird-eye',
      'player:p1',
      'player:p2',
    ]);
    expect(
      steps[0]?.views['bird-eye']?.players.map((player) =>
        player.visibleCards.map((card) => card.id),
      ),
    ).toEqual([['red-4'], ['blue-1']]);
    expect(
      steps[0]?.views['player:p1']?.players.map((player) =>
        player.visibleCards.map((card) => card.id),
      ),
    ).toEqual([['red-4'], []]);
    expect(
      steps[0]?.views['player:p2']?.players.map((player) =>
        player.visibleCards.map((card) => card.id),
      ),
    ).toEqual([[], ['blue-1']]);
  });
});
