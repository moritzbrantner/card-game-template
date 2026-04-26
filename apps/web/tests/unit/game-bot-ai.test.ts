import { describe, expect, it } from 'vitest';

import type { MatchState } from '@repo/game-contracts';
import type { Phase10State } from '@repo/game-phase-10';
import type { PokerState } from '@repo/game-poker';
import type { UnoMove, UnoState } from '@repo/game-uno';

import {
  choosePhase10BotMove,
  choosePokerBotMove,
  chooseUnoBotMove,
  getDefaultPhase10BotAiProfiles,
  getDefaultPokerBotAiProfiles,
  getDefaultUnoBotAiProfiles,
  normalizePhase10BotAiProfiles,
  normalizePokerBotAiProfiles,
  normalizeUnoBotAiProfiles,
  resolvePhase10BotAiProfileForParticipant,
  resolvePokerBotAiProfileForParticipant,
  resolveUnoBotAiProfileForParticipant,
} from '@/src/domain/game-bot-ai/logic';

function createUnoState(hand: UnoState['hands'][string]): UnoState {
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

function createPokerState(overrides: Partial<PokerState> = {}): PokerState {
  return {
    actedPlayerIds: [],
    betsThisRound: { p2: 0 },
    communityCards: [],
    currentBet: 0,
    deck: [],
    foldedPlayerIds: [],
    hands: {
      p2: [
        { id: 'ah', label: 'Ace of hearts', rank: 'A', suit: 'hearts' },
        { id: 'ad', label: 'Ace of diamonds', rank: 'A', suit: 'diamonds' },
      ],
    },
    lastEvent: 'p2 to act',
    phase: 'preflop',
    pot: 0,
    rules: {
      betSizes: [10, 20, 50],
      startingStack: 100,
    },
    seed: 'poker-test',
    showdown: null,
    stacks: { p2: 100 },
    winnerIds: [],
    ...overrides,
  };
}

function createPhase10MatchState(
  overrides: Partial<Phase10State> = {},
): MatchState<Phase10State> {
  return {
    matchId: 'phase-10-test',
    gameId: 'phase-10',
    executionMode: 'local',
    turn: 1,
    activePlayerId: 'p2',
    players: [{ playerId: 'p2', displayName: 'Phase Bot', seat: 1 }],
    state: {
      discardPile: [
        {
          color: 'red',
          id: 'discard-red-5',
          kind: 'number',
          label: 'Red 5',
          value: 5,
        },
      ],
      drawPile: [],
      drawnCardThisTurn: false,
      hands: {
        p2: [
          {
            color: 'blue',
            id: 'blue-5',
            kind: 'number',
            label: 'Blue 5',
            value: 5,
          },
          {
            color: 'green',
            id: 'green-5',
            kind: 'number',
            label: 'Green 5',
            value: 5,
          },
          {
            color: 'wild',
            id: 'wild-1',
            kind: 'wild',
            label: 'Wild',
          },
        ],
      },
      lastEvent: 'p2 to act',
      phaseDefinitions: [
        {
          id: 'phase-1',
          label: 'Phase 1: 1 set of 3',
          setCount: 1,
          setSize: 3,
        },
      ],
      phases: {
        p2: {
          label: 'Phase 1: 1 set of 3',
          laidGroups: null,
          phaseIndex: 0,
          phaseNumber: 1,
        },
      },
      round: 1,
      rules: {
        allowHitting: true,
        allowSkipping: true,
        handSize: 10,
        setCount: 1,
        setSize: 3,
      },
      seed: 'phase-10-test',
      skippedPlayerIds: [],
      winnerPlayerId: null,
      ...overrides,
    },
  };
}

describe('game bot AI logic', () => {
  it('normalizes editable UNO bot AI profiles into safe values', () => {
    const profiles = normalizeUnoBotAiProfiles([
      {
        id: 'house-bot',
        displayName: 'Custom House',
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

  it('resolves configured profiles from bot participant names across the three card games', () => {
    expect(
      resolveUnoBotAiProfileForParticipant(
        { displayName: 'House Bot' },
        getDefaultUnoBotAiProfiles(),
      ).id,
    ).toBe('house-bot');
    expect(
      resolvePokerBotAiProfileForParticipant(
        { displayName: 'Check Bot' },
        getDefaultPokerBotAiProfiles(),
      ).id,
    ).toBe('check-bot');
    expect(
      resolvePhase10BotAiProfileForParticipant(
        { displayName: 'Run Bot' },
        getDefaultPhase10BotAiProfiles(),
      ).id,
    ).toBe('run-bot');
  });

  it('uses UNO rule weights to decide whether to spend a wild card', () => {
    const state = createUnoState([
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
        id: 'house-bot',
        wildCardBias: -200,
      },
    ])[0]!;
    const wildHeavy = normalizeUnoBotAiProfiles([
      {
        id: 'house-bot',
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
    ).toMatchObject({
      kind: 'play-card',
      payload: { cardId: 'red-5', sayUno: true },
    });
    expect(
      chooseUnoBotMove({
        legalMoves: moves,
        playerId: 'p2',
        profile: wildHeavy,
        seed: 's',
        state,
      }),
    ).toMatchObject({
      kind: 'play-card',
      payload: {
        cardId: 'wild-draw-four',
        chosenColor: 'blue',
        sayUno: true,
      },
    });
  });

  it('uses poker rule weights to separate aggressive betting from pot control', () => {
    const state = createPokerState();
    const moves = [
      {
        playerId: 'p2',
        kind: 'check',
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: {},
      },
      {
        playerId: 'p2',
        kind: 'bet',
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: { amount: 50 },
      },
    ] as const;

    const aggressive = normalizePokerBotAiProfiles([
      {
        id: 'caller-bot',
        betBias: 200,
        bigBetBias: 200,
        stackPreservationBias: -100,
      },
    ])[0]!;
    const conservative = normalizePokerBotAiProfiles([
      {
        id: 'caller-bot',
        betBias: -200,
        callBias: -100,
        stackPreservationBias: 200,
      },
    ])[0]!;

    expect(
      choosePokerBotMove({
        legalMoves: moves,
        playerId: 'p2',
        profile: aggressive,
        seed: 'poker-seed',
        state,
      }),
    ).toMatchObject({
      kind: 'bet',
      payload: { amount: 50 },
    });
    expect(
      choosePokerBotMove({
        legalMoves: moves,
        playerId: 'p2',
        profile: conservative,
        seed: 'poker-seed',
        state,
      }),
    ).toMatchObject({
      kind: 'check',
      payload: {},
    });
  });

  it('uses phase 10 discard-pickup rules to choose between the discard pile and the deck', () => {
    const state = createPhase10MatchState();
    const moves = [
      {
        playerId: 'p2',
        kind: 'draw-card',
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: { source: 'discard' },
      },
      {
        playerId: 'p2',
        kind: 'draw-card',
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: { source: 'draw' },
      },
    ] as const;

    const pickupProfile = normalizePhase10BotAiProfiles([
      {
        id: 'run-bot',
        discardPickupBias: 200,
      },
    ])[0]!;
    const deckProfile = normalizePhase10BotAiProfiles([
      {
        id: 'run-bot',
        discardPickupBias: -200,
      },
    ])[0]!;

    expect(
      choosePhase10BotMove({
        legalMoves: moves,
        playerId: 'p2',
        profile: pickupProfile,
        seed: 'phase-seed',
        state,
      }),
    ).toMatchObject({
      kind: 'draw-card',
      payload: { source: 'discard' },
    });
    expect(
      choosePhase10BotMove({
        legalMoves: moves,
        playerId: 'p2',
        profile: deckProfile,
        seed: 'phase-seed',
        state,
      }),
    ).toMatchObject({
      kind: 'draw-card',
      payload: { source: 'draw' },
    });
  });
});
