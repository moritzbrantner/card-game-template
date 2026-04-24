import { describe, expect, it } from 'vitest';

import type { UnoMove, UnoState } from '@repo/game-uno';

import {
  chooseUnoBotMove,
  getDefaultUnoBotAiProfiles,
  normalizeUnoBotAiProfiles,
  resolveUnoBotAiProfileForParticipant,
} from '@/src/domain/game-bot-ai/service';

function createState(hand: UnoState['hands'][string]): UnoState {
  return {
    currentColor: 'red',
    direction: 1,
    discardPile: [],
    drawPile: [],
    drawnCardThisTurnId: null,
    hands: {
      p2: hand,
    },
    lastEvent: 'p2 to act',
    pendingDrawAmount: 0,
    pendingDrawSource: null,
    rules: {
      drawStacking: false,
      jumpIn: false,
      requireUnoCall: true,
      sevenZero: false,
    },
    seed: 'test',
    winnerPlayerId: null,
  };
}

describe('game bot AI service', () => {
  it('normalizes editable UNO bot AI profiles into safe values', () => {
    const profiles = normalizeUnoBotAiProfiles([
      {
        id: 'house-bot',
        displayName: 'Custom House',
        strategy: 'invalid',
        enabled: false,
        aggression: 150,
        actionCardBias: -500,
        wildCardBias: 500,
        drawBias: 12.7,
        unoCallBias: -12,
        notes: 'x'.repeat(1000),
      },
    ]);

    expect(profiles.find((profile) => profile.id === 'house-bot')).toEqual(
      expect.objectContaining({
        displayName: 'Custom House',
        strategy: 'balanced',
        enabled: false,
        aggression: 100,
        actionCardBias: -200,
        wildCardBias: 200,
        drawBias: 13,
        unoCallBias: 0,
        notes: 'x'.repeat(280),
      }),
    );
    expect(profiles.map((profile) => profile.id)).toEqual(
      getDefaultUnoBotAiProfiles().map((profile) => profile.id),
    );
  });

  it('resolves configured profiles from bot participant names', () => {
    const profiles = getDefaultUnoBotAiProfiles();

    expect(
      resolveUnoBotAiProfileForParticipant(
        { displayName: 'House Bot' },
        profiles,
      ).id,
    ).toBe('house-bot');
    expect(
      resolveUnoBotAiProfileForParticipant(
        { displayName: 'Table Bot' },
        profiles,
      ).id,
    ).toBe('table-bot');
    expect(
      resolveUnoBotAiProfileForParticipant(
        { displayName: 'Unknown Bot' },
        profiles,
      ).id,
    ).toBe('fallback-bot');
  });

  it('uses the active AI profile to choose between legal UNO bot moves', () => {
    const state = createState([
      {
        color: 'red',
        id: 'red-5',
        kind: 'number',
        label: 'Red 5',
        value: 5,
      },
      {
        color: 'wild',
        id: 'wild-draw-four',
        kind: 'wild-draw-four',
        label: 'Wild Draw Four',
      },
    ]);
    const moves = [
      {
        playerId: 'p2',
        kind: 'play-card',
        createdAt: '2026-04-21T00:00:00.000Z',
        payload: { cardId: 'red-5', sayUno: true },
      },
      {
        playerId: 'p2',
        kind: 'play-card',
        createdAt: '2026-04-21T00:00:00.000Z',
        payload: {
          cardId: 'wild-draw-four',
          chosenColor: 'blue',
          sayUno: true,
        },
      },
    ] satisfies UnoMove[];

    const conservative = normalizeUnoBotAiProfiles([
      {
        ...getDefaultUnoBotAiProfiles()[0]!,
        wildCardBias: -200,
      },
    ])[0]!;
    const wildHappy = normalizeUnoBotAiProfiles([
      {
        ...getDefaultUnoBotAiProfiles()[0]!,
        wildCardBias: 200,
      },
    ])[0]!;

    expect(
      chooseUnoBotMove({
        legalMoves: moves,
        playerId: 'p2',
        profile: conservative,
        seed: 's',
        state,
      }),
    ).toEqual(moves[0]);
    expect(
      chooseUnoBotMove({
        legalMoves: moves,
        playerId: 'p2',
        profile: wildHappy,
        seed: 's',
        state,
      }),
    ).toEqual(moves[1]);
  });
});
