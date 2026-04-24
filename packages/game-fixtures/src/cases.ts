import type {
  GameMove,
  MatchState,
  PlayerId,
  PlayerProfile,
} from '@repo/game-contracts';
import type { GameAdapter } from '@repo/game-engine';
import {
  createPokerAdapter,
  defaultPokerRules,
  type PokerCard,
  type PokerHandRank,
  type PokerMove,
  type PokerState,
} from '@repo/game-poker';
import {
  createTicTacToeAdapter,
  type TicTacToeMove,
  type TicTacToeSetup,
  type TicTacToeState,
} from '@repo/game-tic-tac-toe';
import {
  createTcgAdapter,
  defaultTcgRules,
  type TcgCard,
  type TcgMove,
  type TcgState,
  type TcgUnit,
} from '@repo/game-tcg';
import {
  createUnoAdapter,
  defaultUnoRules,
  type UnoCard,
  type UnoMove,
  type UnoSetup,
  type UnoState,
} from '@repo/game-uno';

import {
  standardTwoPlayerProfiles,
  type EngineFixtureCase,
} from './harness.ts';

type PokerSetup = {
  rules?: Partial<typeof defaultPokerRules>;
  seed?: number | string;
};

type TcgSetup = {
  rules?: Partial<typeof defaultTcgRules>;
  seed?: number | string;
};

type CardGameFixtureCase =
  | EngineFixtureCase<UnoSetup, UnoState, UnoMove>
  | EngineFixtureCase<PokerSetup, PokerState, PokerMove>
  | EngineFixtureCase<TicTacToeSetup, TicTacToeState, TicTacToeMove>
  | EngineFixtureCase<TcgSetup, TcgState, TcgMove>;

function defineUnoFixture(
  fixture: EngineFixtureCase<UnoSetup, UnoState, UnoMove>,
): EngineFixtureCase<UnoSetup, UnoState, UnoMove> {
  return fixture;
}

function definePokerFixture(
  fixture: EngineFixtureCase<PokerSetup, PokerState, PokerMove>,
): EngineFixtureCase<PokerSetup, PokerState, PokerMove> {
  return fixture;
}

function defineTcgFixture(
  fixture: EngineFixtureCase<TcgSetup, TcgState, TcgMove>,
): EngineFixtureCase<TcgSetup, TcgState, TcgMove> {
  return fixture;
}

function defineTicTacToeFixture(
  fixture: EngineFixtureCase<TicTacToeSetup, TicTacToeState, TicTacToeMove>,
): EngineFixtureCase<TicTacToeSetup, TicTacToeState, TicTacToeMove> {
  return fixture;
}

function uniqueKinds(moves: readonly GameMove[]): readonly string[] {
  return [...new Set(moves.map((move) => move.kind))].sort();
}

function countsByPlayer<TValue>(
  players: readonly PlayerProfile[],
  values: Record<PlayerId, readonly TValue[]>,
): Record<PlayerId, number> {
  return Object.fromEntries(
    players.map((player) => [
      player.playerId,
      values[player.playerId]?.length ?? 0,
    ]),
  );
}

function cardIdsByPlayer<TValue extends { id: string }>(
  players: readonly PlayerProfile[],
  values: Record<PlayerId, readonly TValue[]>,
): Record<PlayerId, readonly string[]> {
  return Object.fromEntries(
    players.map((player) => [
      player.playerId,
      values[player.playerId]?.map((value) => value.id) ?? [],
    ]),
  );
}

function unoCard(
  color: UnoCard['color'],
  kind: UnoCard['kind'],
  id: string,
  value?: number,
): UnoCard {
  return {
    color,
    id,
    kind,
    label: id,
    ...(value !== undefined ? { value } : {}),
  };
}

function pokerCard(
  rank: PokerCard['rank'],
  suit: PokerCard['suit'],
): PokerCard {
  return {
    id: `${rank.toLowerCase()}-${suit}`,
    label: `${rank} ${suit}`,
    rank,
    suit,
  };
}

const ember: TcgCard = {
  id: 'ember',
  kind: 'creature',
  label: 'Ember Adept',
  cost: 1,
  attack: 2,
  health: 1,
};
const warden: TcgCard = {
  id: 'warden',
  kind: 'creature',
  label: 'Ancient Warden',
  cost: 4,
  attack: 4,
  health: 5,
};
const spark: TcgCard = {
  id: 'spark',
  kind: 'spell',
  label: 'Spark',
  cost: 1,
  effect: 'deal-2',
};

function tcgUnit(
  card: TcgCard,
  ownerPlayerId: PlayerId,
  id = `${ownerPlayerId}:${card.id}:fixture`,
): TcgUnit {
  return {
    card,
    damage: 0,
    id,
    ownerPlayerId,
  };
}

function withUnoInitialState(
  override: (state: MatchState<UnoState>) => MatchState<UnoState>,
): GameAdapter<UnoSetup, UnoState, UnoMove> {
  const adapter = createUnoAdapter();

  return {
    ...adapter,
    createInitialState(input) {
      return override(adapter.createInitialState(input));
    },
  };
}

function withTcgInitialState(
  override: (state: MatchState<TcgState>) => MatchState<TcgState>,
): GameAdapter<TcgSetup, TcgState, TcgMove> {
  const adapter = createTcgAdapter();

  return {
    ...adapter,
    createInitialState(input) {
      return override(adapter.createInitialState(input));
    },
  };
}

function digestUno(
  adapter: GameAdapter<UnoSetup, UnoState, UnoMove>,
  state: MatchState<UnoState>,
) {
  return {
    activePlayerId: state.activePlayerId,
    currentColor: state.state.currentColor,
    discardTopId:
      state.state.discardPile[state.state.discardPile.length - 1]?.id ?? null,
    drawPileCount: state.state.drawPile.length,
    drawnCardThisTurnId: state.state.drawnCardThisTurnId,
    handCounts: countsByPlayer(state.players, state.state.hands),
    legalMoveKinds: uniqueKinds(adapter.listLegalMoves(state)),
    pendingDrawAmount: state.state.pendingDrawAmount,
    turn: state.turn,
    winnerPlayerId: state.state.winnerPlayerId,
  };
}

function digestPoker(
  adapter: GameAdapter<PokerSetup, PokerState, PokerMove>,
  state: MatchState<PokerState>,
) {
  return {
    activePlayerId: state.activePlayerId,
    communityCount: state.state.communityCards.length,
    currentBet: state.state.currentBet,
    deckCount: state.state.deck.length,
    foldedPlayerIds: state.state.foldedPlayerIds,
    handCounts: countsByPlayer(state.players, state.state.hands),
    legalMoveKinds: uniqueKinds(adapter.listLegalMoves(state)),
    phase: state.state.phase,
    pot: state.state.pot,
    stacks: state.state.stacks,
    turn: state.turn,
    winnerIds: state.state.winnerIds,
  };
}

function digestTcg(
  adapter: GameAdapter<TcgSetup, TcgState, TcgMove>,
  state: MatchState<TcgState>,
) {
  return {
    activePlayerId: state.activePlayerId,
    battlefieldCounts: countsByPlayer(state.players, state.state.battlefield),
    deckCounts: countsByPlayer(state.players, state.state.decks),
    exhaustedUnitIds: state.state.exhaustedUnitIds,
    graveyardIds: cardIdsByPlayer(state.players, state.state.graveyards),
    handCounts: countsByPlayer(state.players, state.state.hands),
    legalMoveKinds: uniqueKinds(adapter.listLegalMoves(state)),
    life: state.state.life,
    mana: state.state.mana,
    maxMana: state.state.maxMana,
    turn: state.turn,
    winnerPlayerId: state.state.winnerPlayerId,
  };
}

function digestTicTacToe(
  adapter: GameAdapter<TicTacToeSetup, TicTacToeState, TicTacToeMove>,
  state: MatchState<TicTacToeState>,
) {
  return {
    activePlayerId: state.activePlayerId,
    board: state.state.board,
    legalMoveKinds: uniqueKinds(adapter.listLegalMoves(state)),
    turn: state.turn,
    winnerPlayerId: state.state.winnerPlayerId,
    winningLine: state.state.winningLine,
  };
}

const unoInitialAdapter = createUnoAdapter();
const unoCompleteAdapter = withUnoInitialState((state) => ({
  ...state,
  activePlayerId: 'p1',
  state: {
    ...state.state,
    currentColor: 'red',
    discardPile: [unoCard('red', 'number', 'discard-red-5', 5)],
    drawPile: [
      unoCard('green', 'number', 'draw-green-1', 1),
      unoCard('blue', 'number', 'draw-blue-2', 2),
    ],
    drawnCardThisTurnId: null,
    hands: {
      p1: [unoCard('red', 'number', 'red-win', 9)],
      p2: [unoCard('blue', 'number', 'blue-7', 7)],
    },
    lastEvent: 'Fixture: ready to win',
    pendingDrawAmount: 0,
    pendingDrawSource: null,
    rules: defaultUnoRules,
    winnerPlayerId: null,
  },
}));
const unoDrawPassAdapter = withUnoInitialState((state) => ({
  ...state,
  activePlayerId: 'p1',
  state: {
    ...state.state,
    currentColor: 'red',
    discardPile: [unoCard('red', 'number', 'discard-red-5', 5)],
    drawPile: [
      unoCard('red', 'number', 'draw-red-9', 9),
      unoCard('green', 'number', 'draw-green-2', 2),
    ],
    drawnCardThisTurnId: null,
    hands: {
      p1: [unoCard('blue', 'number', 'blue-1', 1)],
      p2: [unoCard('blue', 'number', 'blue-7', 7)],
    },
    lastEvent: 'Fixture: draw then pass',
    pendingDrawAmount: 0,
    pendingDrawSource: null,
    rules: defaultUnoRules,
    winnerPlayerId: null,
  },
}));
const unoReplayAdapter = withUnoInitialState((state) => ({
  ...state,
  activePlayerId: 'p1',
  state: {
    ...state.state,
    currentColor: 'green',
    discardPile: [unoCard('green', 'number', 'discard-green-3', 3)],
    drawPile: [unoCard('yellow', 'number', 'draw-yellow-1', 1)],
    drawnCardThisTurnId: null,
    hands: {
      p1: [unoCard('green', 'number', 'green-replay-win', 8)],
      p2: [unoCard('red', 'number', 'red-2', 2)],
    },
    lastEvent: 'Fixture: replay win',
    pendingDrawAmount: 0,
    pendingDrawSource: null,
    rules: defaultUnoRules,
    winnerPlayerId: null,
  },
}));

const pokerInitialAdapter = createPokerAdapter();
const pokerBetCallAdapter = createPokerAdapter();
const pokerFoldAdapter = createPokerAdapter();
const ticTacToeOpeningAdapter = createTicTacToeAdapter();

const tcgInitialAdapter = createTcgAdapter();
const tcgPlayCreatureAdapter = withTcgInitialState((state) => ({
  ...state,
  activePlayerId: 'p1',
  state: {
    ...state.state,
    battlefield: { p1: [], p2: [] },
    decks: { p1: [spark], p2: [spark] },
    exhaustedUnitIds: [],
    graveyards: { p1: [], p2: [] },
    hands: { p1: [ember], p2: [] },
    life: { p1: 20, p2: 20 },
    mana: { p1: 1, p2: 0 },
    maxMana: { p1: 1, p2: 0 },
    rules: defaultTcgRules,
    winnerPlayerId: null,
  },
}));
const tcgEndTurnAttackAdapter = withTcgInitialState((state) => ({
  ...state,
  activePlayerId: 'p1',
  state: {
    ...state.state,
    battlefield: { p1: [], p2: [] },
    decks: { p1: [spark], p2: [spark] },
    exhaustedUnitIds: [],
    graveyards: { p1: [], p2: [] },
    hands: { p1: [ember], p2: [] },
    life: { p1: 20, p2: 20 },
    mana: { p1: 1, p2: 0 },
    maxMana: { p1: 1, p2: 0 },
    rules: defaultTcgRules,
    winnerPlayerId: null,
  },
}));
const tcgSpellDestroyAdapter = withTcgInitialState((state) => ({
  ...state,
  activePlayerId: 'p1',
  state: {
    ...state.state,
    battlefield: { p1: [], p2: [tcgUnit(ember, 'p2', 'target-ember')] },
    decks: { p1: [], p2: [] },
    exhaustedUnitIds: [],
    graveyards: { p1: [], p2: [] },
    hands: { p1: [spark], p2: [] },
    life: { p1: 20, p2: 20 },
    mana: { p1: 1, p2: 0 },
    maxMana: { p1: 1, p2: 0 },
    rules: defaultTcgRules,
    winnerPlayerId: null,
  },
}));
const tcgLethalAdapter = withTcgInitialState((state) => ({
  ...state,
  activePlayerId: 'p1',
  state: {
    ...state.state,
    battlefield: { p1: [tcgUnit(warden, 'p1', 'lethal-warden')], p2: [] },
    decks: { p1: [], p2: [] },
    exhaustedUnitIds: [],
    graveyards: { p1: [], p2: [] },
    hands: { p1: [], p2: [] },
    life: { p1: 20, p2: 4 },
    mana: { p1: 4, p2: 0 },
    maxMana: { p1: 4, p2: 0 },
    rules: defaultTcgRules,
    winnerPlayerId: null,
  },
}));

export const engineFixtureCases: readonly CardGameFixtureCase[] = [
  defineTicTacToeFixture({
    id: 'tic-tac-toe/opening-win',
    gameId: 'tic-tac-toe',
    adapter: ticTacToeOpeningAdapter,
    players: standardTwoPlayerProfiles,
    setup: {},
    steps: [
      {
        label: 'p1 opens top-left',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.payload.cellIndex === 0)!,
      },
      {
        label: 'p2 answers middle-left',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.payload.cellIndex === 3)!,
      },
      {
        label: 'p1 takes top-middle',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.payload.cellIndex === 1)!,
      },
      {
        label: 'p2 answers center',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.payload.cellIndex === 4)!,
      },
      {
        label: 'p1 completes the top row',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.payload.cellIndex === 2)!,
      },
    ],
    digestState: (state) => digestTicTacToe(ticTacToeOpeningAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        board: [null, null, null, null, null, null, null, null, null],
        legalMoveKinds: ['place-mark'],
        turn: 1,
        winnerPlayerId: null,
        winningLine: null,
      },
      finalDigest: {
        activePlayerId: 'p1',
        board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
        legalMoveKinds: [],
        turn: 6,
        winnerPlayerId: 'p1',
        winningLine: [0, 1, 2],
      },
      result: {
        gameId: 'tic-tac-toe',
        winnerIds: ['p1'],
        rankings: [
          { playerId: 'p1', position: 1 },
          { playerId: 'p2', position: 2 },
        ],
      },
      replay: {
        acceptedMoveCount: 5,
        moveKinds: [
          'place-mark',
          'place-mark',
          'place-mark',
          'place-mark',
          'place-mark',
        ],
        winnerIds: ['p1'],
      },
    },
  }),
  defineUnoFixture({
    id: 'uno/initial-seed',
    gameId: 'uno-style',
    adapter: unoInitialAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:uno:initial' },
    steps: [],
    digestState: (state) => digestUno(unoInitialAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        currentColor: 'green',
        discardTopId: 'green-number-8-1',
        drawPileCount: 93,
        drawnCardThisTurnId: null,
        handCounts: { p1: 7, p2: 7 },
        legalMoveKinds: ['play-card'],
        pendingDrawAmount: 0,
        turn: 1,
        winnerPlayerId: null,
      },
    },
  }),
  defineUnoFixture({
    id: 'uno/complete-single-play',
    gameId: 'uno-style',
    adapter: unoCompleteAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:uno:complete-single-play' },
    steps: [
      {
        label: 'p1 plays the final red card',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'play-card')!,
      },
    ],
    digestState: (state) => digestUno(unoCompleteAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        currentColor: 'red',
        discardTopId: 'discard-red-5',
        drawPileCount: 2,
        drawnCardThisTurnId: null,
        handCounts: { p1: 1, p2: 1 },
        legalMoveKinds: ['play-card'],
        pendingDrawAmount: 0,
        turn: 1,
        winnerPlayerId: null,
      },
      finalDigest: {
        activePlayerId: 'p2',
        currentColor: 'red',
        discardTopId: 'red-win',
        drawPileCount: 2,
        drawnCardThisTurnId: null,
        handCounts: { p1: 0, p2: 1 },
        legalMoveKinds: [],
        pendingDrawAmount: 0,
        turn: 2,
        winnerPlayerId: 'p1',
      },
      result: {
        gameId: 'uno-style',
        winnerIds: ['p1'],
        rankings: [{ playerId: 'p1', position: 1 }],
      },
      replay: {
        acceptedMoveCount: 1,
        moveKinds: ['play-card'],
        winnerIds: ['p1'],
      },
    },
  }),
  defineUnoFixture({
    id: 'uno/draw-then-pass',
    gameId: 'uno-style',
    adapter: unoDrawPassAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:uno:draw-then-pass' },
    steps: [
      {
        label: 'p1 draws a playable card',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'draw-card')!,
      },
      {
        label: 'p1 passes instead of playing the drawn card',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'pass')!,
      },
    ],
    digestState: (state) => digestUno(unoDrawPassAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        currentColor: 'red',
        discardTopId: 'discard-red-5',
        drawPileCount: 2,
        drawnCardThisTurnId: null,
        handCounts: { p1: 1, p2: 1 },
        legalMoveKinds: ['draw-card'],
        pendingDrawAmount: 0,
        turn: 1,
        winnerPlayerId: null,
      },
      finalDigest: {
        activePlayerId: 'p2',
        currentColor: 'red',
        discardTopId: 'discard-red-5',
        drawPileCount: 1,
        drawnCardThisTurnId: null,
        handCounts: { p1: 2, p2: 1 },
        legalMoveKinds: ['draw-card'],
        pendingDrawAmount: 0,
        turn: 3,
        winnerPlayerId: null,
      },
    },
  }),
  defineUnoFixture({
    id: 'uno/replay-summary',
    gameId: 'uno-style',
    adapter: unoReplayAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:uno:replay-summary' },
    steps: [
      {
        label: 'p1 completes a replayable hand',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'play-card')!,
      },
    ],
    digestState: (state) => digestUno(unoReplayAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        currentColor: 'green',
        discardTopId: 'discard-green-3',
        drawPileCount: 1,
        drawnCardThisTurnId: null,
        handCounts: { p1: 1, p2: 1 },
        legalMoveKinds: ['play-card'],
        pendingDrawAmount: 0,
        turn: 1,
        winnerPlayerId: null,
      },
      finalDigest: {
        activePlayerId: 'p2',
        currentColor: 'green',
        discardTopId: 'green-replay-win',
        drawPileCount: 1,
        drawnCardThisTurnId: null,
        handCounts: { p1: 0, p2: 1 },
        legalMoveKinds: [],
        pendingDrawAmount: 0,
        turn: 2,
        winnerPlayerId: 'p1',
      },
      result: {
        gameId: 'uno-style',
        winnerIds: ['p1'],
        rankings: [{ playerId: 'p1', position: 1 }],
      },
      replay: {
        acceptedMoveCount: 1,
        moveKinds: ['play-card'],
        winnerIds: ['p1'],
      },
    },
  }),
  definePokerFixture({
    id: 'poker/initial-seed',
    gameId: 'texas-holdem',
    adapter: pokerInitialAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:poker:initial' },
    steps: [],
    digestState: (state) => digestPoker(pokerInitialAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        communityCount: 0,
        currentBet: 0,
        deckCount: 48,
        foldedPlayerIds: [],
        handCounts: { p1: 2, p2: 2 },
        legalMoveKinds: ['bet', 'check'],
        phase: 'preflop',
        pot: 0,
        stacks: { p1: 100, p2: 100 },
        turn: 1,
        winnerIds: [],
      },
    },
  }),
  definePokerFixture({
    id: 'poker/bet-call-flop',
    gameId: 'texas-holdem',
    adapter: pokerBetCallAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:poker:bet-call-flop' },
    steps: [
      {
        label: 'p1 bets 20',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find(
            (move) => move.kind === 'bet' && move.payload.amount === 20,
          )!,
      },
      {
        label: 'p2 calls',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'call')!,
      },
    ],
    digestState: (state) => digestPoker(pokerBetCallAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        communityCount: 0,
        currentBet: 0,
        deckCount: 48,
        foldedPlayerIds: [],
        handCounts: { p1: 2, p2: 2 },
        legalMoveKinds: ['bet', 'check'],
        phase: 'preflop',
        pot: 0,
        stacks: { p1: 100, p2: 100 },
        turn: 1,
        winnerIds: [],
      },
      finalDigest: {
        activePlayerId: 'p1',
        communityCount: 3,
        currentBet: 0,
        deckCount: 45,
        foldedPlayerIds: [],
        handCounts: { p1: 2, p2: 2 },
        legalMoveKinds: ['bet', 'check'],
        phase: 'flop',
        pot: 40,
        stacks: { p1: 80, p2: 80 },
        turn: 3,
        winnerIds: [],
      },
    },
  }),
  definePokerFixture({
    id: 'poker/fold-complete',
    gameId: 'texas-holdem',
    adapter: pokerFoldAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:poker:fold-complete' },
    steps: [
      {
        label: 'p1 bets 10',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find(
            (move) => move.kind === 'bet' && move.payload.amount === 10,
          )!,
      },
      {
        label: 'p2 folds',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'fold')!,
      },
    ],
    digestState: (state) => digestPoker(pokerFoldAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        communityCount: 0,
        currentBet: 0,
        deckCount: 48,
        foldedPlayerIds: [],
        handCounts: { p1: 2, p2: 2 },
        legalMoveKinds: ['bet', 'check'],
        phase: 'preflop',
        pot: 0,
        stacks: { p1: 100, p2: 100 },
        turn: 1,
        winnerIds: [],
      },
      finalDigest: {
        activePlayerId: 'p1',
        communityCount: 0,
        currentBet: 10,
        deckCount: 48,
        foldedPlayerIds: ['p2'],
        handCounts: { p1: 2, p2: 2 },
        legalMoveKinds: [],
        phase: 'complete',
        pot: 10,
        stacks: { p1: 100, p2: 100 },
        turn: 3,
        winnerIds: ['p1'],
      },
      result: {
        gameId: 'texas-holdem',
        winnerIds: ['p1'],
        rankings: [
          { playerId: 'p1', position: 1, score: 100 },
          { playerId: 'p2', position: 2, score: 100 },
        ],
      },
      replay: {
        acceptedMoveCount: 2,
        moveKinds: ['bet', 'fold'],
        winnerIds: ['p1'],
      },
    },
  }),
  defineTcgFixture({
    id: 'tcg/initial-seed',
    gameId: 'arcane-duel',
    adapter: tcgInitialAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:tcg:initial' },
    steps: [],
    digestState: (state) => digestTcg(tcgInitialAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 0, p2: 0 },
        deckCounts: { p1: 56, p2: 56 },
        exhaustedUnitIds: [],
        graveyardIds: { p1: [], p2: [] },
        handCounts: { p1: 4, p2: 4 },
        legalMoveKinds: ['end-turn', 'play-card'],
        life: { p1: 20, p2: 20 },
        mana: { p1: 1, p2: 0 },
        maxMana: { p1: 1, p2: 0 },
        turn: 1,
        winnerPlayerId: null,
      },
    },
  }),
  defineTcgFixture({
    id: 'tcg/play-creature',
    gameId: 'arcane-duel',
    adapter: tcgPlayCreatureAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:tcg:play-creature' },
    steps: [
      {
        label: 'p1 plays ember',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'play-card')!,
      },
    ],
    digestState: (state) => digestTcg(tcgPlayCreatureAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 0, p2: 0 },
        deckCounts: { p1: 1, p2: 1 },
        exhaustedUnitIds: [],
        graveyardIds: { p1: [], p2: [] },
        handCounts: { p1: 1, p2: 0 },
        legalMoveKinds: ['end-turn', 'play-card'],
        life: { p1: 20, p2: 20 },
        mana: { p1: 1, p2: 0 },
        maxMana: { p1: 1, p2: 0 },
        turn: 1,
        winnerPlayerId: null,
      },
      finalDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 1, p2: 0 },
        deckCounts: { p1: 1, p2: 1 },
        exhaustedUnitIds: ['p1:ember:1'],
        graveyardIds: { p1: [], p2: [] },
        handCounts: { p1: 0, p2: 0 },
        legalMoveKinds: ['end-turn'],
        life: { p1: 20, p2: 20 },
        mana: { p1: 0, p2: 0 },
        maxMana: { p1: 1, p2: 0 },
        turn: 2,
        winnerPlayerId: null,
      },
    },
  }),
  defineTcgFixture({
    id: 'tcg/end-turn-attack',
    gameId: 'arcane-duel',
    adapter: tcgEndTurnAttackAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:tcg:end-turn-attack' },
    steps: [
      {
        label: 'p1 plays ember',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'play-card')!,
      },
      {
        label: 'p1 ends turn',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'end-turn')!,
      },
      {
        label: 'p2 ends turn',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find((move) => move.kind === 'end-turn')!,
      },
      {
        label: 'p1 attacks p2',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find(
            (move) =>
              move.kind === 'attack' && move.payload.targetPlayerId === 'p2',
          )!,
      },
    ],
    digestState: (state) => digestTcg(tcgEndTurnAttackAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 0, p2: 0 },
        deckCounts: { p1: 1, p2: 1 },
        exhaustedUnitIds: [],
        graveyardIds: { p1: [], p2: [] },
        handCounts: { p1: 1, p2: 0 },
        legalMoveKinds: ['end-turn', 'play-card'],
        life: { p1: 20, p2: 20 },
        mana: { p1: 1, p2: 0 },
        maxMana: { p1: 1, p2: 0 },
        turn: 1,
        winnerPlayerId: null,
      },
      finalDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 1, p2: 0 },
        deckCounts: { p1: 0, p2: 0 },
        exhaustedUnitIds: ['p1:ember:1'],
        graveyardIds: { p1: [], p2: [] },
        handCounts: { p1: 1, p2: 1 },
        legalMoveKinds: ['end-turn', 'play-card'],
        life: { p1: 20, p2: 18 },
        mana: { p1: 2, p2: 1 },
        maxMana: { p1: 2, p2: 1 },
        turn: 5,
        winnerPlayerId: null,
      },
    },
  }),
  defineTcgFixture({
    id: 'tcg/spell-destroy',
    gameId: 'arcane-duel',
    adapter: tcgSpellDestroyAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:tcg:spell-destroy' },
    steps: [
      {
        label: 'p1 destroys target ember',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find(
            (move) =>
              move.kind === 'play-card' &&
              move.payload.targetUnitId === 'target-ember',
          )!,
      },
    ],
    digestState: (state) => digestTcg(tcgSpellDestroyAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 0, p2: 1 },
        deckCounts: { p1: 0, p2: 0 },
        exhaustedUnitIds: [],
        graveyardIds: { p1: [], p2: [] },
        handCounts: { p1: 1, p2: 0 },
        legalMoveKinds: ['end-turn', 'play-card'],
        life: { p1: 20, p2: 20 },
        mana: { p1: 1, p2: 0 },
        maxMana: { p1: 1, p2: 0 },
        turn: 1,
        winnerPlayerId: null,
      },
      finalDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 0, p2: 0 },
        deckCounts: { p1: 0, p2: 0 },
        exhaustedUnitIds: [],
        graveyardIds: { p1: ['spark'], p2: ['ember'] },
        handCounts: { p1: 0, p2: 0 },
        legalMoveKinds: ['end-turn'],
        life: { p1: 20, p2: 20 },
        mana: { p1: 0, p2: 0 },
        maxMana: { p1: 1, p2: 0 },
        turn: 2,
        winnerPlayerId: null,
      },
    },
  }),
  defineTcgFixture({
    id: 'tcg/lethal-complete',
    gameId: 'arcane-duel',
    adapter: tcgLethalAdapter,
    players: standardTwoPlayerProfiles,
    setup: { seed: 'fixture:tcg:lethal' },
    steps: [
      {
        label: 'p1 attacks for lethal',
        chooseMove: ({ legalMoves }) =>
          legalMoves.find(
            (move) =>
              move.kind === 'attack' && move.payload.targetPlayerId === 'p2',
          )!,
      },
    ],
    digestState: (state) => digestTcg(tcgLethalAdapter, state),
    expected: {
      initialDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 1, p2: 0 },
        deckCounts: { p1: 0, p2: 0 },
        exhaustedUnitIds: [],
        graveyardIds: { p1: [], p2: [] },
        handCounts: { p1: 0, p2: 0 },
        legalMoveKinds: ['attack', 'end-turn'],
        life: { p1: 20, p2: 4 },
        mana: { p1: 4, p2: 0 },
        maxMana: { p1: 4, p2: 0 },
        turn: 1,
        winnerPlayerId: null,
      },
      finalDigest: {
        activePlayerId: 'p1',
        battlefieldCounts: { p1: 1, p2: 0 },
        deckCounts: { p1: 0, p2: 0 },
        exhaustedUnitIds: ['lethal-warden'],
        graveyardIds: { p1: [], p2: [] },
        handCounts: { p1: 0, p2: 0 },
        legalMoveKinds: [],
        life: { p1: 20, p2: 0 },
        mana: { p1: 4, p2: 0 },
        maxMana: { p1: 4, p2: 0 },
        turn: 2,
        winnerPlayerId: 'p1',
      },
      result: {
        gameId: 'arcane-duel',
        winnerIds: ['p1'],
        rankings: [
          { playerId: 'p1', position: 1, score: 20 },
          { playerId: 'p2', position: 2, score: 0 },
        ],
      },
      replay: {
        acceptedMoveCount: 1,
        moveKinds: ['attack'],
        winnerIds: ['p1'],
      },
    },
  }),
];

export const pokerShowdownRankCases: readonly {
  cards: readonly PokerCard[];
  expectedRank: PokerHandRank;
  id: string;
}[] = [
  {
    id: 'high card',
    expectedRank: 'high-card',
    cards: [
      pokerCard('A', 'spades'),
      pokerCard('K', 'hearts'),
      pokerCard('9', 'clubs'),
      pokerCard('7', 'diamonds'),
      pokerCard('4', 'spades'),
      pokerCard('3', 'hearts'),
      pokerCard('2', 'clubs'),
    ],
  },
  {
    id: 'pair',
    expectedRank: 'pair',
    cards: [
      pokerCard('A', 'spades'),
      pokerCard('A', 'hearts'),
      pokerCard('9', 'clubs'),
      pokerCard('7', 'diamonds'),
      pokerCard('4', 'spades'),
      pokerCard('3', 'hearts'),
      pokerCard('2', 'clubs'),
    ],
  },
  {
    id: 'two pair',
    expectedRank: 'two-pair',
    cards: [
      pokerCard('A', 'spades'),
      pokerCard('A', 'hearts'),
      pokerCard('9', 'clubs'),
      pokerCard('9', 'diamonds'),
      pokerCard('4', 'spades'),
      pokerCard('3', 'hearts'),
      pokerCard('2', 'clubs'),
    ],
  },
  {
    id: 'three kind',
    expectedRank: 'three-kind',
    cards: [
      pokerCard('A', 'spades'),
      pokerCard('A', 'hearts'),
      pokerCard('A', 'clubs'),
      pokerCard('9', 'diamonds'),
      pokerCard('4', 'spades'),
      pokerCard('3', 'hearts'),
      pokerCard('2', 'clubs'),
    ],
  },
  {
    id: 'wheel straight',
    expectedRank: 'straight',
    cards: [
      pokerCard('A', 'spades'),
      pokerCard('5', 'hearts'),
      pokerCard('4', 'clubs'),
      pokerCard('3', 'diamonds'),
      pokerCard('2', 'spades'),
      pokerCard('9', 'hearts'),
      pokerCard('K', 'clubs'),
    ],
  },
  {
    id: 'flush',
    expectedRank: 'flush',
    cards: [
      pokerCard('A', 'spades'),
      pokerCard('J', 'spades'),
      pokerCard('8', 'spades'),
      pokerCard('6', 'spades'),
      pokerCard('2', 'spades'),
      pokerCard('9', 'hearts'),
      pokerCard('K', 'clubs'),
    ],
  },
  {
    id: 'full house',
    expectedRank: 'full-house',
    cards: [
      pokerCard('A', 'spades'),
      pokerCard('A', 'hearts'),
      pokerCard('A', 'clubs'),
      pokerCard('K', 'diamonds'),
      pokerCard('K', 'spades'),
      pokerCard('3', 'hearts'),
      pokerCard('2', 'clubs'),
    ],
  },
  {
    id: 'four kind',
    expectedRank: 'four-kind',
    cards: [
      pokerCard('A', 'spades'),
      pokerCard('A', 'hearts'),
      pokerCard('A', 'clubs'),
      pokerCard('A', 'diamonds'),
      pokerCard('K', 'spades'),
      pokerCard('3', 'hearts'),
      pokerCard('2', 'clubs'),
    ],
  },
  {
    id: 'straight flush',
    expectedRank: 'straight-flush',
    cards: [
      pokerCard('9', 'spades'),
      pokerCard('8', 'spades'),
      pokerCard('7', 'spades'),
      pokerCard('6', 'spades'),
      pokerCard('5', 'spades'),
      pokerCard('A', 'hearts'),
      pokerCard('2', 'clubs'),
    ],
  },
];
