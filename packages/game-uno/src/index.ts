import type {
  GameDefinition,
  GameMove,
  MatchReplay,
  MatchReplayAnalysis,
  MatchReplayPlayerSummary,
  MatchResult,
  MatchState,
  PlayerId,
  PlayerProfile,
} from '@repo/game-contracts';
import { summarizeMatchReplay } from '@repo/game-contracts';
import { shuffleWithSeed } from '@repo/card-kit';
import {
  areMovesEquivalent,
  createSeededRandom,
  type GameAdapter,
  type TransitionResult,
} from '@repo/game-engine';
import type {
  LocalGameSessionBot,
  LocalGameSessionProjectViewInput,
  SessionParticipant,
} from '@repo/game-session';
import { reconstructMatchHistoryFromReplay } from '@repo/game-session';

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue';
export type UnoCardKind =
  | 'number'
  | 'skip'
  | 'reverse'
  | 'draw-two'
  | 'wild'
  | 'wild-draw-four';

export type UnoCard = {
  color: UnoColor | 'wild';
  id: string;
  kind: UnoCardKind;
  label: string;
  value?: number;
};

export type UnoRules = {
  drawStacking: boolean;
  jumpIn: boolean;
  requireUnoCall: boolean;
  sevenZero: boolean;
};

export type UnoSetup = {
  rules?: Partial<UnoRules>;
  seed?: number | string;
};

export type UnoState = {
  currentColor: UnoColor;
  direction: 1 | -1;
  discardPile: readonly UnoCard[];
  drawPile: readonly UnoCard[];
  drawnCardThisTurnId: string | null;
  hands: Record<PlayerId, readonly UnoCard[]>;
  lastEvent: string;
  pendingDrawAmount: number;
  pendingDrawSource: 'draw-two' | 'wild-draw-four' | null;
  rules: UnoRules;
  seed: number | string;
  winnerPlayerId: PlayerId | null;
};

export type UnoPlayCardMove = GameMove<{
  cardId: string;
  chosenColor?: UnoColor;
  sayUno?: boolean;
  targetPlayerId?: PlayerId;
}>;

export type UnoDrawCardMove = GameMove<Record<string, never>>;
export type UnoPassMove = GameMove<Record<string, never>>;
export type UnoMove = UnoPlayCardMove | UnoDrawCardMove | UnoPassMove;
export type UnoEvent =
  | {
      type: 'card-played';
      playerId: PlayerId;
      cardId: string;
      cardKind: UnoCardKind;
      cardColor: UnoCard['color'];
      resultingColor: UnoColor;
      saidUno: boolean;
      targetPlayerId?: PlayerId;
    }
  | {
      type: 'cards-drawn';
      playerId: PlayerId;
      amount: number;
      source: 'draw' | 'draw-two' | 'wild-draw-four' | 'uno-penalty';
      cardIds: readonly string[];
    }
  | {
      type: 'turn-passed';
      playerId: PlayerId;
    }
  | {
      type: 'direction-reversed';
      playerId: PlayerId;
      direction: 1 | -1;
    }
  | {
      type: 'player-skipped';
      playerId: PlayerId;
      skippedPlayerId: PlayerId;
    }
  | {
      type: 'draw-penalty-stacked';
      playerId: PlayerId;
      targetPlayerId: PlayerId;
      source: 'draw-two' | 'wild-draw-four';
      amount: number;
    }
  | {
      type: 'hands-swapped';
      playerId: PlayerId;
      targetPlayerId: PlayerId;
    }
  | {
      type: 'hands-rotated';
      playerId: PlayerId;
      direction: 1 | -1;
    }
  | {
      type: 'winner-declared';
      playerId: PlayerId;
    };

export type UnoPlayerView = {
  activeColor: UnoColor;
  activePlayerId: PlayerId;
  discardTop: UnoCard | null;
  drawPileCount: number;
  legalActions: ReadonlyArray<{
    id: string;
    label: string;
    move: UnoMove;
  }>;
  matchResultBanner: string | null;
  pendingDrawAmount: number;
  pendingHotseatPlayerId: PlayerId | null;
  selectedActorPlayerId: PlayerId | null;
  players: ReadonlyArray<{
    controller: SessionParticipant['controller'];
    displayName: string;
    handCount: number;
    isActor: boolean;
    isActive: boolean;
    isViewer: boolean;
    playerId: PlayerId;
    visibleCards: readonly UnoCard[];
  }>;
  status: string;
  viewerPlayerId: PlayerId | null;
};

export type UnoReplayPlayerSummary = MatchReplayPlayerSummary & {
  cardsDrawn: number;
  cardsPlayed: number;
  penaltiesTaken: number;
  turnsSurvived: number;
  unoCallsMade: number;
  unoCallsMissed: number;
  wildColorChoices: ReadonlyArray<{
    color: UnoColor;
    count: number;
  }>;
  wildsPlayed: number;
  won: boolean;
};

export type UnoReplayAnalysis = MatchReplayAnalysis & {
  players: readonly UnoReplayPlayerSummary[];
};

export type UnoCatalogMetadata = {
  presets: readonly UnoExamplePreset[];
  route: '/uno';
  supportsBots: true;
};

export type UnoCatalogEntry = {
  definition: GameDefinition;
  metadata: UnoCatalogMetadata;
};

export type UnoExamplePresetId = 'hotseat-duo' | 'mixed-table' | 'bot-duel';
export type UnoExamplePreset = {
  hotseat: boolean;
  id: UnoExamplePresetId;
  label: string;
  seats: readonly SessionParticipant[];
};

export const defaultUnoRules: UnoRules = {
  drawStacking: false,
  jumpIn: false,
  requireUnoCall: false,
  sevenZero: false,
};

export const UNO_GAME_VERSION = '1.0.0';
export const UNO_RULESET_VERSION = 'uno-style-v1';

export const unoDefinition: GameDefinition = {
  gameId: 'uno-style',
  name: 'UNO-style',
  minPlayers: 2,
  maxPlayers: 4,
  supportsLocal: true,
  supportsOnline: false,
  tags: ['card-game', 'family', 'local'],
};

const COLORS: readonly UnoColor[] = ['red', 'yellow', 'green', 'blue'];
const UNO_RULE_KEYS = [
  'drawStacking',
  'jumpIn',
  'requireUnoCall',
  'sevenZero',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoUnknownKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  label: string,
) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`${label} contains an unsupported field: ${key}`);
    }
  }
}

function parseUnoColor(value: unknown): UnoColor {
  if (COLORS.includes(value as UnoColor)) {
    return value as UnoColor;
  }

  throw new Error('UNO move chosenColor must be red, yellow, green, or blue.');
}

function createUnoPlayPayload(input: {
  cardId: string;
  chosenColor?: UnoColor;
  sayUno?: boolean;
  targetPlayerId?: PlayerId;
}): UnoPlayCardMove['payload'] {
  return {
    cardId: input.cardId,
    ...(input.chosenColor !== undefined
      ? { chosenColor: input.chosenColor }
      : {}),
    ...(input.sayUno !== undefined ? { sayUno: input.sayUno } : {}),
    ...(input.targetPlayerId !== undefined
      ? { targetPlayerId: input.targetPlayerId }
      : {}),
  };
}

export function parseUnoSetup(value: unknown): UnoSetup {
  if (!isRecord(value)) {
    throw new Error('UNO setup must be an object.');
  }

  assertNoUnknownKeys(value, ['rules', 'seed'], 'UNO setup');

  const setup: UnoSetup = {};

  if (value.seed !== undefined) {
    if (
      typeof value.seed !== 'string' &&
      !(typeof value.seed === 'number' && Number.isFinite(value.seed))
    ) {
      throw new Error('UNO setup seed must be a string or finite number.');
    }

    setup.seed = value.seed;
  }

  if (value.rules !== undefined) {
    if (!isRecord(value.rules)) {
      throw new Error('UNO setup rules must be an object.');
    }

    assertNoUnknownKeys(value.rules, UNO_RULE_KEYS, 'UNO setup rules');
    setup.rules = {};

    for (const key of UNO_RULE_KEYS) {
      const ruleValue = value.rules[key];

      if (ruleValue === undefined) {
        continue;
      }

      if (typeof ruleValue !== 'boolean') {
        throw new Error(`UNO setup rule ${key} must be a boolean.`);
      }

      setup.rules[key] = ruleValue;
    }
  }

  return setup;
}

export function canonicalizeUnoMove(move: UnoMove): UnoMove {
  if (move.kind === 'play-card') {
    return {
      ...move,
      payload: createUnoPlayPayload({
        cardId: move.payload.cardId,
        chosenColor: move.payload.chosenColor,
        sayUno: move.payload.sayUno,
        targetPlayerId: move.payload.targetPlayerId,
      }),
    };
  }

  return {
    ...move,
    payload: {},
  };
}

export function parseUnoMove(value: unknown): UnoMove {
  if (!isRecord(value)) {
    throw new Error('UNO move must be an object.');
  }

  assertNoUnknownKeys(
    value,
    ['playerId', 'kind', 'createdAt', 'payload'],
    'UNO move',
  );

  if (typeof value.playerId !== 'string' || value.playerId.length === 0) {
    throw new Error('UNO move playerId is required.');
  }

  if (typeof value.kind !== 'string') {
    throw new Error('UNO move kind is required.');
  }

  if (typeof value.createdAt !== 'string' || value.createdAt.length === 0) {
    throw new Error('UNO move createdAt is required.');
  }

  if (!isRecord(value.payload)) {
    throw new Error('UNO move payload must be an object.');
  }

  if (value.kind === 'draw-card' || value.kind === 'pass') {
    assertNoUnknownKeys(value.payload, [], `UNO ${value.kind} payload`);

    return {
      playerId: value.playerId,
      kind: value.kind,
      createdAt: value.createdAt,
      payload: {},
    };
  }

  if (value.kind !== 'play-card') {
    throw new Error(`Unsupported UNO move kind: ${value.kind}`);
  }

  assertNoUnknownKeys(
    value.payload,
    ['cardId', 'chosenColor', 'sayUno', 'targetPlayerId'],
    'UNO play-card payload',
  );

  if (
    typeof value.payload.cardId !== 'string' ||
    value.payload.cardId.length === 0
  ) {
    throw new Error('UNO play-card payload cardId is required.');
  }

  if (
    value.payload.sayUno !== undefined &&
    typeof value.payload.sayUno !== 'boolean'
  ) {
    throw new Error('UNO play-card payload sayUno must be a boolean.');
  }

  if (
    value.payload.targetPlayerId !== undefined &&
    typeof value.payload.targetPlayerId !== 'string'
  ) {
    throw new Error('UNO play-card payload targetPlayerId must be a string.');
  }

  const payload = createUnoPlayPayload({
    cardId: value.payload.cardId,
    ...(value.payload.chosenColor !== undefined
      ? { chosenColor: parseUnoColor(value.payload.chosenColor) }
      : {}),
    ...(value.payload.sayUno !== undefined
      ? { sayUno: value.payload.sayUno }
      : {}),
    ...(value.payload.targetPlayerId !== undefined
      ? { targetPlayerId: value.payload.targetPlayerId }
      : {}),
  });

  return {
    playerId: value.playerId,
    kind: 'play-card',
    createdAt: value.createdAt,
    payload,
  };
}

function createCard(
  color: UnoColor | 'wild',
  kind: UnoCardKind,
  occurrence: number,
  value?: number,
): UnoCard {
  const valueLabel = kind === 'number' ? `${value}` : kind;
  const label =
    color === 'wild' ? kind.replace(/-/g, ' ') : `${color} ${valueLabel}`;

  return {
    color,
    id: `${color}-${kind}-${valueLabel}-${occurrence}`,
    kind,
    label: label.replace(/\b\w/g, (character) => character.toUpperCase()),
    value,
  };
}

function createDeck(): UnoCard[] {
  const deck: UnoCard[] = [];

  for (const color of COLORS) {
    deck.push(createCard(color, 'number', 0, 0));

    for (let value = 1; value <= 9; value += 1) {
      deck.push(createCard(color, 'number', 0, value));
      deck.push(createCard(color, 'number', 1, value));
    }

    for (const kind of ['skip', 'reverse', 'draw-two'] as const) {
      deck.push(createCard(color, kind, 0));
      deck.push(createCard(color, kind, 1));
    }
  }

  for (let occurrence = 0; occurrence < 4; occurrence += 1) {
    deck.push(createCard('wild', 'wild', occurrence));
    deck.push(createCard('wild', 'wild-draw-four', occurrence));
  }

  return deck;
}

function cloneHands(
  hands: Record<PlayerId, readonly UnoCard[]>,
): Record<PlayerId, readonly UnoCard[]> {
  return Object.fromEntries(
    Object.entries(hands).map(([playerId, cards]) => [playerId, [...cards]]),
  ) as Record<PlayerId, readonly UnoCard[]>;
}

function getTopDiscard(state: UnoState): UnoCard {
  return state.discardPile[state.discardPile.length - 1]!;
}

function getPlayerIndex(
  players: readonly PlayerProfile[],
  playerId: PlayerId,
): number {
  const index = players.findIndex((player) => player.playerId === playerId);

  if (index < 0) {
    throw new Error(`Unknown UNO player ${playerId}`);
  }

  return index;
}

function nextPlayerId(
  players: readonly PlayerProfile[],
  currentPlayerId: PlayerId,
  direction: 1 | -1,
  steps = 1,
): PlayerId {
  const currentIndex = getPlayerIndex(players, currentPlayerId);
  const normalizedIndex =
    (currentIndex + direction * steps + players.length * 4) % players.length;
  return players[normalizedIndex]!.playerId;
}

function playerIdsAfter(
  players: readonly PlayerProfile[],
  currentPlayerId: PlayerId,
): PlayerId[] {
  const currentIndex = getPlayerIndex(players, currentPlayerId);
  const orderedPlayerIds: PlayerId[] = [];

  for (let offset = 1; offset < players.length; offset += 1) {
    orderedPlayerIds.push(
      players[(currentIndex + offset) % players.length]!.playerId,
    );
  }

  return orderedPlayerIds;
}

function recycleDrawPile(
  drawPile: readonly UnoCard[],
  discardPile: readonly UnoCard[],
  seed: number | string,
) {
  if (drawPile.length > 0) {
    return {
      discardPile,
      drawPile,
    };
  }

  const topDiscard = discardPile[discardPile.length - 1];
  const recyclableCards = discardPile.slice(0, -1);

  if (!topDiscard || recyclableCards.length === 0) {
    return {
      discardPile,
      drawPile,
    };
  }

  const nextSeed = `${seed}:${topDiscard.id}:${recyclableCards.length}`;

  return {
    discardPile: [topDiscard],
    drawPile: shuffleWithSeed(recyclableCards, nextSeed),
  };
}

function drawCards(
  state: UnoState,
  amount: number,
): {
  discardPile: readonly UnoCard[];
  drawPile: readonly UnoCard[];
  drawnCards: readonly UnoCard[];
} {
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  const drawnCards: UnoCard[] = [];

  while (drawnCards.length < amount) {
    if (drawPile.length === 0) {
      const recycled = recycleDrawPile(
        drawPile,
        discardPile,
        `${state.seed}:${drawnCards.length}`,
      );
      drawPile = [...recycled.drawPile];
      discardPile = [...recycled.discardPile];
    }

    const nextCard = drawPile.shift();

    if (!nextCard) {
      break;
    }

    drawnCards.push(nextCard);
  }

  return {
    discardPile,
    drawPile,
    drawnCards,
  };
}

function countsByColor(cards: readonly UnoCard[]) {
  return COLORS.map((color) => ({
    color,
    count: cards.filter((card) => card.color === color).length,
  })).sort(
    (left, right) =>
      right.count - left.count || left.color.localeCompare(right.color),
  );
}

function choosePreferredColor(cards: readonly UnoCard[]): UnoColor {
  return countsByColor(cards)[0]?.color ?? 'red';
}

function matchesCurrentDiscard(card: UnoCard, state: UnoState): boolean {
  const topDiscard = getTopDiscard(state);

  if (card.color === state.currentColor) {
    return true;
  }

  if (
    card.kind === 'number' &&
    topDiscard.kind === 'number' &&
    card.value === topDiscard.value
  ) {
    return true;
  }

  return card.kind !== 'number' && card.kind === topDiscard.kind;
}

function matchesExactFace(card: UnoCard, otherCard: UnoCard): boolean {
  return (
    card.color === otherCard.color &&
    card.kind === otherCard.kind &&
    card.value === otherCard.value
  );
}

function canPlayWildDrawFour(state: UnoState, playerId: PlayerId): boolean {
  if (state.pendingDrawAmount > 0 && state.rules.drawStacking) {
    return true;
  }

  const hand = state.hands[playerId] ?? [];
  return !hand.some((card) => card.color === state.currentColor);
}

function getPlayableCards(state: UnoState, playerId: PlayerId): UnoCard[] {
  const hand = [...(state.hands[playerId] ?? [])];

  if (state.pendingDrawAmount > 0) {
    if (!state.rules.drawStacking) {
      return [];
    }

    return hand.filter((card) => {
      if (card.kind === 'draw-two') {
        return true;
      }

      if (card.kind === 'wild-draw-four') {
        return canPlayWildDrawFour(state, playerId);
      }

      return false;
    });
  }

  return hand.filter((card) => {
    if (state.drawnCardThisTurnId && card.id !== state.drawnCardThisTurnId) {
      return false;
    }

    if (card.kind === 'wild') {
      return true;
    }

    if (card.kind === 'wild-draw-four') {
      return canPlayWildDrawFour(state, playerId);
    }

    return matchesCurrentDiscard(card, state);
  });
}

function createPlayCardMoves(
  state: UnoState,
  playerId: PlayerId,
  card: UnoCard,
  players: readonly PlayerProfile[],
): UnoPlayCardMove[] {
  const hand = state.hands[playerId] ?? [];
  const remainingCardsAfterPlay = hand.length - 1;
  const sayUnoValues =
    state.rules.requireUnoCall && remainingCardsAfterPlay === 1
      ? [false, true]
      : [true];
  const targetPlayerIds =
    state.rules.sevenZero && card.kind === 'number' && card.value === 7
      ? players
          .filter((player) => player.playerId !== playerId)
          .map((player) => player.playerId)
      : [undefined];
  const chosenColors =
    card.kind === 'wild' || card.kind === 'wild-draw-four'
      ? COLORS
      : [undefined];

  const moves: UnoPlayCardMove[] = [];

  for (const sayUno of sayUnoValues) {
    for (const targetPlayerId of targetPlayerIds) {
      for (const chosenColor of chosenColors) {
        moves.push({
          playerId,
          kind: 'play-card',
          createdAt: '2026-04-17T12:00:00.000Z',
          payload: createUnoPlayPayload({
            cardId: card.id,
            chosenColor,
            sayUno,
            targetPlayerId,
          }),
        });
      }
    }
  }

  return moves;
}

function rotateHands(
  players: readonly PlayerProfile[],
  hands: Record<PlayerId, readonly UnoCard[]>,
  direction: 1 | -1,
): Record<PlayerId, readonly UnoCard[]> {
  const rotated = cloneHands(hands);
  const previousDirection = direction === 1 ? -1 : 1;

  for (const player of players) {
    const sourcePlayerId = nextPlayerId(
      players,
      player.playerId,
      previousDirection,
    );
    rotated[player.playerId] = [...(hands[sourcePlayerId] ?? [])];
  }

  return rotated;
}

function createWinnerResult(state: MatchState<UnoState>): MatchResult | null {
  if (!state.state.winnerPlayerId) {
    return null;
  }

  return {
    matchId: state.matchId,
    gameId: state.gameId,
    winnerIds: [state.state.winnerPlayerId],
    rankings: [
      {
        playerId: state.state.winnerPlayerId,
        position: 1,
      },
    ],
    finishedAt: '2026-04-17T12:00:01.000Z',
    executionMode: state.executionMode,
  };
}

export function summarizeUnoReplay(
  replay: MatchReplay<UnoState, UnoMove>,
): UnoReplayAnalysis {
  const base = summarizeMatchReplay(replay);
  const history = reconstructMatchHistoryFromReplay({
    adapter: createUnoAdapter(),
    replay,
  });

  const metricsByPlayer = new Map<
    PlayerId,
    {
      cardsDrawn: number;
      cardsPlayed: number;
      penaltiesTaken: number;
      turnsSurvived: number;
      unoCallsMade: number;
      unoCallsMissed: number;
      wildColorChoices: Map<UnoColor, number>;
      wildsPlayed: number;
      won: boolean;
    }
  >();

  for (const player of replay.initialState.players) {
    metricsByPlayer.set(player.playerId, {
      cardsDrawn: 0,
      cardsPlayed: 0,
      penaltiesTaken: 0,
      turnsSurvived: history
        .slice(0, -1)
        .filter(
          (state) => (state.state.hands[player.playerId]?.length ?? 0) > 0,
        ).length,
      unoCallsMade: 0,
      unoCallsMissed: 0,
      wildColorChoices: new Map(),
      wildsPlayed: 0,
      won: replay.result?.winnerIds.includes(player.playerId) ?? false,
    });
  }

  for (const [index, acceptedMove] of replay.acceptedMoves.entries()) {
    const before = history[index]!;
    const after = history[index + 1]!;
    const metrics = metricsByPlayer.get(acceptedMove.move.playerId);

    if (!metrics) {
      continue;
    }

    if (acceptedMove.move.kind === 'draw-card') {
      const drawnCount =
        (after.state.hands[acceptedMove.move.playerId]?.length ?? 0) -
        (before.state.hands[acceptedMove.move.playerId]?.length ?? 0);

      if (drawnCount > 0) {
        metrics.cardsDrawn += drawnCount;

        if (before.state.pendingDrawAmount > 0 || drawnCount > 1) {
          metrics.penaltiesTaken += drawnCount;
        }
      }

      continue;
    }

    if (acceptedMove.move.kind !== 'play-card') {
      continue;
    }

    metrics.cardsPlayed += 1;

    const playedCard = (
      before.state.hands[acceptedMove.move.playerId] ?? []
    ).find((candidate) => candidate.id === acceptedMove.move.payload.cardId);

    if (
      before.state.rules.requireUnoCall &&
      (before.state.hands[acceptedMove.move.playerId]?.length ?? 0) === 2
    ) {
      if (acceptedMove.move.payload.sayUno) {
        metrics.unoCallsMade += 1;
      } else {
        metrics.unoCallsMissed += 1;
      }
    }

    if (playedCard?.kind === 'wild' || playedCard?.kind === 'wild-draw-four') {
      metrics.wildsPlayed += 1;

      if (acceptedMove.move.payload.chosenColor) {
        metrics.wildColorChoices.set(
          acceptedMove.move.payload.chosenColor,
          (metrics.wildColorChoices.get(
            acceptedMove.move.payload.chosenColor,
          ) ?? 0) + 1,
        );
      }
    }

    if (
      (playedCard?.kind === 'draw-two' ||
        playedCard?.kind === 'wild-draw-four') &&
      !before.state.rules.drawStacking
    ) {
      for (const player of before.players) {
        if (player.playerId === acceptedMove.move.playerId) {
          continue;
        }

        const drawnCount =
          (after.state.hands[player.playerId]?.length ?? 0) -
          (before.state.hands[player.playerId]?.length ?? 0);

        if (drawnCount > 0) {
          const targetMetrics = metricsByPlayer.get(player.playerId);

          if (targetMetrics) {
            targetMetrics.cardsDrawn += drawnCount;
            targetMetrics.penaltiesTaken += drawnCount;
          }
        }
      }
    }

    if (
      before.state.rules.requireUnoCall &&
      (before.state.hands[acceptedMove.move.playerId]?.length ?? 0) === 2 &&
      !acceptedMove.move.payload.sayUno
    ) {
      const penaltyDrawCount =
        (after.state.hands[acceptedMove.move.playerId]?.length ?? 0) -
        ((before.state.hands[acceptedMove.move.playerId]?.length ?? 0) - 1);

      if (penaltyDrawCount > 0) {
        metrics.cardsDrawn += penaltyDrawCount;
        metrics.penaltiesTaken += penaltyDrawCount;
      }
    }
  }

  return {
    ...base,
    players: base.players.map((player) => {
      const metrics = metricsByPlayer.get(player.playerId);

      return {
        ...player,
        cardsDrawn: metrics?.cardsDrawn ?? 0,
        cardsPlayed: metrics?.cardsPlayed ?? 0,
        penaltiesTaken: metrics?.penaltiesTaken ?? 0,
        turnsSurvived: metrics?.turnsSurvived ?? 0,
        unoCallsMade: metrics?.unoCallsMade ?? 0,
        unoCallsMissed: metrics?.unoCallsMissed ?? 0,
        wildColorChoices: [...(metrics?.wildColorChoices.entries() ?? [])]
          .sort(
            (left, right) =>
              right[1] - left[1] || left[0].localeCompare(right[0]),
          )
          .map(([color, count]) => ({
            color,
            count,
          })),
        wildsPlayed: metrics?.wildsPlayed ?? 0,
        won: metrics?.won ?? false,
      };
    }),
  };
}

export function createUnoAdapter(): GameAdapter<
  UnoSetup,
  UnoState,
  UnoMove,
  UnoEvent
> {
  return {
    definition: unoDefinition,
    metadata: {
      gameVersion: UNO_GAME_VERSION,
      rulesetVersion: UNO_RULESET_VERSION,
    },
    validateSetup: parseUnoSetup,
    validateMove: parseUnoMove,
    canonicalizeMove: canonicalizeUnoMove,
    createInitialState({
      executionMode,
      matchId,
      players,
      setup,
    }): MatchState<UnoState> {
      if (players.length < 2 || players.length > 4) {
        throw new Error('UNO-style sample supports between 2 and 4 seats.');
      }

      const seed = setup.seed ?? 'uno-style';
      const deck = shuffleWithSeed(createDeck(), seed);
      const hands: Record<PlayerId, readonly UnoCard[]> = {};
      let deckIndex = 0;

      for (const player of players) {
        hands[player.playerId] = deck.slice(deckIndex, deckIndex + 7);
        deckIndex += 7;
      }

      let openingDiscard = deck[deckIndex]!;

      while (openingDiscard.color === 'wild') {
        deckIndex += 1;
        openingDiscard = deck[deckIndex]!;
      }

      return {
        matchId,
        gameId: unoDefinition.gameId,
        players,
        activePlayerId: players[0]!.playerId,
        turn: 1,
        executionMode,
        state: {
          currentColor: openingDiscard.color,
          direction: 1,
          discardPile: [openingDiscard],
          drawPile: deck.slice(deckIndex + 1),
          drawnCardThisTurnId: null,
          hands,
          lastEvent: `Opening discard: ${openingDiscard.label}`,
          pendingDrawAmount: 0,
          pendingDrawSource: null,
          rules: {
            ...defaultUnoRules,
            ...setup.rules,
          },
          seed,
          winnerPlayerId: null,
        },
      };
    },
    listLegalMoves(state): readonly UnoMove[] {
      if (state.state.winnerPlayerId) {
        return [];
      }

      const legalMoves: UnoMove[] = [];
      const activePlayerId = state.activePlayerId;
      const activePlayableCards = getPlayableCards(state.state, activePlayerId);

      for (const card of activePlayableCards) {
        legalMoves.push(
          ...createPlayCardMoves(
            state.state,
            activePlayerId,
            card,
            state.players,
          ),
        );
      }

      if (state.state.pendingDrawAmount > 0) {
        legalMoves.push({
          playerId: activePlayerId,
          kind: 'draw-card',
          createdAt: '2026-04-17T12:00:00.000Z',
          payload: {},
        });
      } else if (state.state.drawnCardThisTurnId) {
        legalMoves.push({
          playerId: activePlayerId,
          kind: 'pass',
          createdAt: '2026-04-17T12:00:00.000Z',
          payload: {},
        });
      } else if (activePlayableCards.length === 0) {
        legalMoves.push({
          playerId: activePlayerId,
          kind: 'draw-card',
          createdAt: '2026-04-17T12:00:00.000Z',
          payload: {},
        });
      }

      if (
        state.state.rules.jumpIn &&
        state.state.pendingDrawAmount === 0 &&
        !state.state.drawnCardThisTurnId
      ) {
        const topDiscard = getTopDiscard(state.state);

        for (const player of state.players) {
          if (player.playerId === activePlayerId) {
            continue;
          }

          for (const card of state.state.hands[player.playerId] ?? []) {
            if (!matchesExactFace(card, topDiscard)) {
              continue;
            }

            legalMoves.push(
              ...createPlayCardMoves(
                state.state,
                player.playerId,
                card,
                state.players,
              ),
            );
          }
        }
      }

      return legalMoves;
    },
    selectActor({ state, legalMoves }): PlayerId | null {
      if (state.state.rules.jumpIn) {
        for (const playerId of playerIdsAfter(
          state.players,
          state.activePlayerId,
        )) {
          if (
            legalMoves.some(
              (move) => move.playerId === playerId && move.kind === 'play-card',
            )
          ) {
            return playerId;
          }
        }
      }

      return state.activePlayerId;
    },
    isLegalMove(state, move): boolean {
      return this.listLegalMoves(state).some((candidate) =>
        areMovesEquivalent(candidate, move),
      );
    },
    applyMove(state, move): TransitionResult<UnoState, UnoEvent> {
      const nextHands = cloneHands(state.state.hands);

      if (move.kind === 'draw-card') {
        const events: UnoEvent[] = [];
        const amount =
          state.state.pendingDrawAmount > 0 ? state.state.pendingDrawAmount : 1;
        const drawn = drawCards(state.state, amount);
        nextHands[move.playerId] = [
          ...(nextHands[move.playerId] ?? []),
          ...drawn.drawnCards,
        ];
        events.push({
          type: 'cards-drawn',
          playerId: move.playerId,
          amount: drawn.drawnCards.length,
          source: state.state.pendingDrawSource ?? 'draw',
          cardIds: drawn.drawnCards.map((card) => card.id),
        });

        const endsTurn = amount > 1 || state.state.pendingDrawAmount > 0;
        const drawnCard = drawn.drawnCards[0] ?? null;
        const canPlayDrawnCard =
          !endsTurn &&
          Boolean(
            drawnCard &&
            getPlayableCards(
              {
                ...state.state,
                drawPile: drawn.drawPile,
                discardPile: drawn.discardPile,
                drawnCardThisTurnId: drawnCard.id,
                hands: nextHands,
              },
              move.playerId,
            ).some((card) => card.id === drawnCard.id),
          );

        return {
          events,
          state: {
            ...state,
            turn: state.turn + 1,
            activePlayerId:
              endsTurn || !canPlayDrawnCard
                ? nextPlayerId(
                    state.players,
                    move.playerId,
                    state.state.direction,
                  )
                : move.playerId,
            state: {
              ...state.state,
              discardPile: drawn.discardPile,
              drawPile: drawn.drawPile,
              drawnCardThisTurnId:
                endsTurn || !canPlayDrawnCard ? null : drawnCard!.id,
              hands: nextHands,
              lastEvent:
                amount > 1
                  ? `${move.playerId} drew ${amount} cards`
                  : `${move.playerId} drew ${drawnCard?.label ?? 'a card'}`,
              pendingDrawAmount: 0,
              pendingDrawSource: null,
            },
          },
        };
      }

      if (move.kind === 'pass') {
        return {
          events: [
            {
              type: 'turn-passed',
              playerId: move.playerId,
            },
          ],
          state: {
            ...state,
            turn: state.turn + 1,
            activePlayerId: nextPlayerId(
              state.players,
              move.playerId,
              state.state.direction,
            ),
            state: {
              ...state.state,
              drawnCardThisTurnId: null,
              lastEvent: `${move.playerId} passed`,
            },
          },
        };
      }

      const card = (nextHands[move.playerId] ?? []).find(
        (candidate) => candidate.id === move.payload.cardId,
      );

      if (!card) {
        throw new Error(
          `Card ${move.payload.cardId} is not in hand for ${move.playerId}`,
        );
      }

      nextHands[move.playerId] = (nextHands[move.playerId] ?? []).filter(
        (candidate) => candidate.id !== card.id,
      );

      let direction = state.state.direction;
      let discardPile = [...state.state.discardPile, card];
      let drawPile = [...state.state.drawPile];
      const currentColor =
        card.color === 'wild'
          ? (move.payload.chosenColor ?? 'red')
          : card.color;
      let pendingDrawAmount = 0;
      let pendingDrawSource: UnoState['pendingDrawSource'] = null;
      let lastEvent = `${move.playerId} played ${card.label}`;
      let activePlayerId = nextPlayerId(
        state.players,
        move.playerId,
        direction,
      );
      const events: UnoEvent[] = [
        {
          type: 'card-played',
          playerId: move.playerId,
          cardId: card.id,
          cardKind: card.kind,
          cardColor: card.color,
          resultingColor:
            card.color === 'wild'
              ? (move.payload.chosenColor ?? 'red')
              : card.color,
          saidUno: Boolean(move.payload.sayUno),
          ...(move.payload.targetPlayerId
            ? { targetPlayerId: move.payload.targetPlayerId }
            : {}),
        },
      ];

      if (
        state.state.rules.sevenZero &&
        card.kind === 'number' &&
        card.value === 7 &&
        move.payload.targetPlayerId
      ) {
        const targetPlayerId = move.payload.targetPlayerId;
        const playerHand = nextHands[move.playerId] ?? [];
        nextHands[move.playerId] = [...(nextHands[targetPlayerId] ?? [])];
        nextHands[targetPlayerId] = [...playerHand];
        events.push({
          type: 'hands-swapped',
          playerId: move.playerId,
          targetPlayerId,
        });
        lastEvent = `${move.playerId} swapped hands with ${targetPlayerId}`;
      }

      if (
        state.state.rules.sevenZero &&
        card.kind === 'number' &&
        card.value === 0
      ) {
        const rotated = rotateHands(state.players, nextHands, direction);
        Object.assign(nextHands, rotated);
        events.push({
          type: 'hands-rotated',
          playerId: move.playerId,
          direction,
        });
        lastEvent = `${move.playerId} rotated every hand`;
      }

      if (card.kind === 'reverse') {
        if (state.players.length === 2) {
          events.push({
            type: 'player-skipped',
            playerId: move.playerId,
            skippedPlayerId: nextPlayerId(
              state.players,
              move.playerId,
              direction,
            ),
          });
          activePlayerId = move.playerId;
          lastEvent = `${move.playerId} reversed play and skipped the opponent`;
        } else {
          direction = state.state.direction === 1 ? -1 : 1;
          events.push({
            type: 'direction-reversed',
            playerId: move.playerId,
            direction,
          });
          activePlayerId = nextPlayerId(
            state.players,
            move.playerId,
            direction,
          );
          lastEvent = `${move.playerId} reversed the turn order`;
        }
      }

      if (card.kind === 'skip') {
        events.push({
          type: 'player-skipped',
          playerId: move.playerId,
          skippedPlayerId: nextPlayerId(
            state.players,
            move.playerId,
            direction,
          ),
        });
        activePlayerId = nextPlayerId(
          state.players,
          move.playerId,
          direction,
          2,
        );
        lastEvent = `${move.playerId} skipped the next player`;
      }

      if (card.kind === 'draw-two') {
        const targetPlayerId = nextPlayerId(
          state.players,
          move.playerId,
          direction,
        );
        if (state.state.rules.drawStacking) {
          pendingDrawAmount = state.state.pendingDrawAmount + 2;
          pendingDrawSource = 'draw-two';
          events.push({
            type: 'draw-penalty-stacked',
            playerId: move.playerId,
            targetPlayerId,
            source: 'draw-two',
            amount: pendingDrawAmount,
          });
          activePlayerId = nextPlayerId(
            state.players,
            move.playerId,
            direction,
          );
          lastEvent = `${move.playerId} stacked a draw two`;
        } else {
          const drawn = drawCards(
            {
              ...state.state,
              discardPile,
              drawPile,
              hands: nextHands,
            },
            2,
          );
          drawPile = [...drawn.drawPile];
          discardPile = [...drawn.discardPile];
          nextHands[targetPlayerId] = [
            ...(nextHands[targetPlayerId] ?? []),
            ...drawn.drawnCards,
          ];
          events.push({
            type: 'cards-drawn',
            playerId: targetPlayerId,
            amount: drawn.drawnCards.length,
            source: 'draw-two',
            cardIds: drawn.drawnCards.map((drawnCard) => drawnCard.id),
          });
          activePlayerId = nextPlayerId(
            state.players,
            targetPlayerId,
            direction,
          );
          lastEvent = `${move.playerId} forced ${targetPlayerId} to draw 2`;
        }
      }

      if (card.kind === 'wild') {
        lastEvent = `${move.playerId} changed the color to ${currentColor}`;
      }

      if (card.kind === 'wild-draw-four') {
        const targetPlayerId = nextPlayerId(
          state.players,
          move.playerId,
          direction,
        );
        if (state.state.rules.drawStacking) {
          pendingDrawAmount = state.state.pendingDrawAmount + 4;
          pendingDrawSource = 'wild-draw-four';
          events.push({
            type: 'draw-penalty-stacked',
            playerId: move.playerId,
            targetPlayerId,
            source: 'wild-draw-four',
            amount: pendingDrawAmount,
          });
          activePlayerId = nextPlayerId(
            state.players,
            move.playerId,
            direction,
          );
          lastEvent = `${move.playerId} stacked a wild draw four`;
        } else {
          const drawn = drawCards(
            {
              ...state.state,
              discardPile,
              drawPile,
              hands: nextHands,
            },
            4,
          );
          drawPile = [...drawn.drawPile];
          discardPile = [...drawn.discardPile];
          nextHands[targetPlayerId] = [
            ...(nextHands[targetPlayerId] ?? []),
            ...drawn.drawnCards,
          ];
          events.push({
            type: 'cards-drawn',
            playerId: targetPlayerId,
            amount: drawn.drawnCards.length,
            source: 'wild-draw-four',
            cardIds: drawn.drawnCards.map((drawnCard) => drawnCard.id),
          });
          activePlayerId = nextPlayerId(
            state.players,
            targetPlayerId,
            direction,
          );
          lastEvent = `${move.playerId} forced ${targetPlayerId} to draw 4`;
        }
      }

      if (
        state.state.rules.requireUnoCall &&
        (nextHands[move.playerId] ?? []).length === 1 &&
        !move.payload.sayUno
      ) {
        const penalty = drawCards(
          {
            ...state.state,
            discardPile,
            drawPile,
            hands: nextHands,
          },
          2,
        );
        drawPile = [...penalty.drawPile];
        discardPile = [...penalty.discardPile];
        nextHands[move.playerId] = [
          ...(nextHands[move.playerId] ?? []),
          ...penalty.drawnCards,
        ];
        events.push({
          type: 'cards-drawn',
          playerId: move.playerId,
          amount: penalty.drawnCards.length,
          source: 'uno-penalty',
          cardIds: penalty.drawnCards.map((drawnCard) => drawnCard.id),
        });
        lastEvent = `${move.playerId} forgot to call UNO and drew 2 cards`;
      }

      const winnerPlayerId =
        (nextHands[move.playerId] ?? []).length === 0 ? move.playerId : null;
      if (winnerPlayerId) {
        events.push({
          type: 'winner-declared',
          playerId: winnerPlayerId,
        });
      }

      return {
        events,
        state: {
          ...state,
          activePlayerId,
          turn: state.turn + 1,
          state: {
            ...state.state,
            currentColor,
            direction,
            discardPile,
            drawPile,
            drawnCardThisTurnId: null,
            hands: nextHands,
            lastEvent,
            pendingDrawAmount,
            pendingDrawSource,
            winnerPlayerId,
          },
        },
      };
    },
    isMatchComplete(state): boolean {
      return Boolean(state.state.winnerPlayerId);
    },
    getResult(state) {
      return createWinnerResult(state);
    },
  };
}

function describeMove(
  move: UnoMove,
  state: UnoState,
  players: readonly SessionParticipant[],
) {
  if (move.kind === 'draw-card') {
    return state.pendingDrawAmount > 0
      ? `Draw ${state.pendingDrawAmount} cards`
      : 'Draw a card';
  }

  if (move.kind === 'pass') {
    return 'Pass';
  }

  const card = (state.hands[move.playerId] ?? []).find(
    (candidate) => candidate.id === move.payload.cardId,
  );
  const targetPlayer = players.find(
    (player) => player.playerId === move.payload.targetPlayerId,
  );
  const fragments = [card?.label ?? move.payload.cardId];

  if (move.payload.chosenColor) {
    fragments.push(`as ${move.payload.chosenColor}`);
  }

  if (targetPlayer) {
    fragments.push(`target ${targetPlayer.displayName}`);
  }

  if (move.payload.sayUno) {
    fragments.push('call UNO');
  }

  return fragments.join(' • ');
}

export function projectUnoPlayerView(
  input: LocalGameSessionProjectViewInput<UnoState, UnoMove>,
): UnoPlayerView {
  return {
    activeColor: input.state.state.currentColor,
    activePlayerId: input.state.activePlayerId,
    discardTop:
      input.state.state.discardPile[input.state.state.discardPile.length - 1] ??
      null,
    drawPileCount: input.state.state.drawPile.length,
    legalActions: input.viewerPlayerId
      ? input.legalMoves
          .filter((move) => move.playerId === input.viewerPlayerId)
          .map((move) => ({
            id: `${move.kind}:${JSON.stringify(move.payload)}`,
            label: describeMove(move, input.state.state, input.participants),
            move,
          }))
      : [],
    matchResultBanner: input.matchResult
      ? `Winner: ${input.participants.find((player) => player.playerId === input.matchResult?.winnerIds[0])?.displayName ?? input.matchResult.winnerIds[0]}`
      : null,
    pendingDrawAmount: input.state.state.pendingDrawAmount,
    pendingHotseatPlayerId: input.pendingHotseatPlayerId,
    selectedActorPlayerId: input.selectedActorPlayerId,
    players: input.participants.map((participant) => ({
      controller: participant.controller,
      displayName: participant.displayName,
      handCount: input.state.state.hands[participant.playerId]?.length ?? 0,
      isActor: participant.playerId === input.selectedActorPlayerId,
      isActive: participant.playerId === input.state.activePlayerId,
      isViewer: participant.playerId === input.viewerPlayerId,
      playerId: participant.playerId,
      visibleCards:
        participant.playerId === input.viewerPlayerId
          ? [...(input.state.state.hands[participant.playerId] ?? [])]
          : [],
    })),
    status: input.state.state.lastEvent,
    viewerPlayerId: input.viewerPlayerId,
  };
}

function moveScore(
  move: UnoMove,
  state: UnoState,
  playerId: PlayerId,
  seed: number | string,
): number {
  if (move.kind === 'draw-card') {
    return -1000;
  }

  if (move.kind === 'pass') {
    return -1100;
  }

  const card = (state.hands[playerId] ?? []).find(
    (candidate) => candidate.id === move.payload.cardId,
  );

  if (!card) {
    return -1200;
  }

  let score = 0;
  const random = createSeededRandom(
    `${seed}:${card.id}:${move.payload.chosenColor ?? 'none'}:${move.payload.targetPlayerId ?? 'none'}`,
  );

  if (card.kind === 'wild' || card.kind === 'wild-draw-four') {
    score -= 100;
  } else {
    score += 100;
  }

  if (
    card.kind === 'skip' ||
    card.kind === 'reverse' ||
    card.kind === 'draw-two'
  ) {
    score += 50;
  }

  if (card.kind === 'wild' || card.kind === 'wild-draw-four') {
    const preferredColor = choosePreferredColor(
      (state.hands[playerId] ?? []).filter(
        (handCard) => handCard.id !== card.id,
      ),
    );
    if (move.payload.chosenColor === preferredColor) {
      score += 40;
    }
  }

  if (move.payload.sayUno) {
    score += 10;
  }

  return score + random();
}

export function createUnoBots(
  participants: readonly SessionParticipant[],
  seed: number | string = 'uno-bot',
): Partial<Record<PlayerId, LocalGameSessionBot<UnoState, UnoMove>>> {
  return Object.fromEntries(
    participants
      .filter((participant) => participant.controller === 'bot')
      .map((participant) => {
        const bot: LocalGameSessionBot<UnoState, UnoMove> = {
          chooseMove({ legalMoves, playerId, state }) {
            const ownLegalMoves = legalMoves.filter(
              (move) => move.playerId === playerId,
            );
            const playableMoves = ownLegalMoves.filter(
              (move) => move.kind === 'play-card',
            );

            if (playableMoves.length > 0) {
              return (
                [...playableMoves].sort(
                  (left, right) =>
                    moveScore(right, state.state, playerId, seed) -
                    moveScore(left, state.state, playerId, seed),
                )[0] ?? null
              );
            }

            return (
              ownLegalMoves.find((move) => move.kind === 'draw-card') ??
              ownLegalMoves.find((move) => move.kind === 'pass') ??
              null
            );
          },
        };

        return [participant.playerId, bot] as const;
      }),
  );
}

export const unoExamplePresets: readonly UnoExamplePreset[] = [
  {
    id: 'hotseat-duo',
    label: 'Hotseat duo',
    hotseat: true,
    seats: [
      {
        playerId: 'p1',
        displayName: 'Player One',
        seat: 1,
        controller: 'human',
      },
      {
        playerId: 'p2',
        displayName: 'Player Two',
        seat: 2,
        controller: 'human',
      },
    ],
  },
  {
    id: 'mixed-table',
    label: 'Mixed table',
    hotseat: true,
    seats: [
      {
        playerId: 'p1',
        displayName: 'Player One',
        seat: 1,
        controller: 'human',
      },
      { playerId: 'p2', displayName: 'House Bot', seat: 2, controller: 'bot' },
      {
        playerId: 'p3',
        displayName: 'Player Two',
        seat: 3,
        controller: 'human',
      },
      { playerId: 'p4', displayName: 'Table Bot', seat: 4, controller: 'bot' },
    ],
  },
  {
    id: 'bot-duel',
    label: 'Bot duel',
    hotseat: false,
    seats: [
      {
        playerId: 'p1',
        displayName: 'Player One',
        seat: 1,
        controller: 'human',
      },
      { playerId: 'p2', displayName: 'House Bot', seat: 2, controller: 'bot' },
    ],
  },
] as const;

export function createUnoExampleParticipants(
  presetId: UnoExamplePresetId,
): readonly SessionParticipant[] {
  return (
    unoExamplePresets.find((preset) => preset.id === presetId)?.seats ??
    unoExamplePresets[0]!.seats
  );
}

export function getUnoExamplePreset(
  presetId: UnoExamplePresetId,
): UnoExamplePreset {
  return (
    unoExamplePresets.find((preset) => preset.id === presetId) ??
    unoExamplePresets[0]!
  );
}

export const unoCatalogEntry: UnoCatalogEntry = {
  definition: unoDefinition,
  metadata: {
    presets: unoExamplePresets,
    route: '/uno',
    supportsBots: true,
  },
};
