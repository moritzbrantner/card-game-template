import {
  createMatchResult,
  type CardId,
  type GameDefinition,
  type GameId,
  type GameReplayMetadata,
  type GameMove,
  type MatchId,
  type MatchExecutionMode,
  type MatchResult,
  type MatchState,
  type PlayerId,
  type PlayerProfile,
} from '@repo/game-contracts';

export const GAME_ENGINE_VERSION = 1;
export const DEFAULT_RNG_VERSION = 'mulberry32-fnv1a-v1';

export type StartMatchInput<TSetup> = {
  matchId: string;
  players: readonly PlayerProfile[];
  setup: TSetup;
  executionMode?: MatchExecutionMode;
};

export type CardLike = {
  id: CardId;
};

export type CardVisibility = 'face-up' | 'face-down';

export type CardWithVisibility<TCard> = Omit<TCard, 'visibility'> & {
  visibility: CardVisibility;
};

export type CardStackPosition = 'start' | 'end' | number;

export type CardStackDrawPosition = 'top' | 'bottom';

export type AddCardsOptions = {
  position?: CardStackPosition;
};

export type MoveCardOptions = {
  position?: CardStackPosition;
};

export type DrawCardsBetweenStacksInput<TStackId extends string> = {
  amount: number;
  destination: TStackId;
  destinationPosition?: CardStackPosition;
  source: TStackId;
  sourcePosition?: CardStackDrawPosition;
};

export type MoveCardsBetweenStacksInput<TStackId extends string> = {
  cardIds: readonly CardId[];
  destination: TStackId;
  destinationPosition?: CardStackPosition;
  source: TStackId;
};

export type DrawCardsFromSourcesInput<TStackId extends string> = {
  amount: number;
  destination: TStackId;
  destinationPosition?: CardStackPosition;
  sources: readonly {
    amount?: number;
    position?: CardStackDrawPosition;
    source: TStackId;
  }[];
};

export type ShuffleCardsOptions = {
  seed?: number | string;
  nextRandom?: () => number;
};

export type SortDirection = 'ascending' | 'descending';

export type SortCardsByRankAndSuitOptions = {
  direction?: SortDirection;
  ranks?: readonly (number | string)[];
  suits?: readonly string[];
};

export type GameAdapterMetadata = {
  gameVersion: string;
  rulesetVersion: string;
  rngVersion?: string;
};

export interface GameAdapter<TSetup, TState, TMove extends GameMove = GameMove> {
  definition: GameDefinition;
  metadata?: GameAdapterMetadata;
  canonicalizeMove?(move: TMove): TMove;
  createInitialState(input: StartMatchInput<TSetup> & { executionMode: MatchExecutionMode }): MatchState<TState>;
  validateSetup?(setup: unknown): TSetup;
  validateMove?(move: unknown): TMove;
  listLegalMoves(state: MatchState<TState>): readonly TMove[];
  selectActor?(input: {
    state: MatchState<TState>;
    legalMoves: readonly TMove[];
  }): PlayerId | null;
  isLegalMove(state: MatchState<TState>, move: TMove): boolean;
  applyMove(state: MatchState<TState>, move: TMove): MatchState<TState>;
  isMatchComplete(state: MatchState<TState>): boolean;
  getResult?(state: MatchState<TState>): MatchResult | null;
}

export class IllegalMoveError extends Error {
  readonly gameId: GameId;
  readonly matchId: MatchId;
  readonly playerId: PlayerId;
  readonly moveKind: string;
  readonly reason: string;

  constructor(input: {
    gameId: GameId;
    matchId: MatchId;
    playerId: PlayerId;
    moveKind: string;
    reason: string;
  }) {
    super(
      `Illegal move submitted for ${input.gameId} in ${input.matchId}: ${input.playerId} cannot perform ${input.moveKind} (${input.reason})`,
    );
    this.name = 'IllegalMoveError';
    this.gameId = input.gameId;
    this.matchId = input.matchId;
    this.playerId = input.playerId;
    this.moveKind = input.moveKind;
    this.reason = input.reason;
  }
}

function assertSerializableNumber(value: number, path: string): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${path} must be a finite number`);
  }

  return value;
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalizeSerializableValueAtPath(value: unknown, path: string): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return assertSerializableNumber(value, path);
  }

  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
    throw new TypeError(`${path} must be JSON-serializable`);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const canonicalItem = canonicalizeSerializableValueAtPath(item, `${path}[${index}]`);

      if (canonicalItem === undefined) {
        throw new TypeError(`${path}[${index}] must be JSON-serializable`);
      }

      return canonicalItem;
    });
  }

  if (!isPlainObject(value)) {
    throw new TypeError(`${path} must be a plain JSON-serializable object`);
  }

  const canonical: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) {
      continue;
    }

    const canonicalItem = canonicalizeSerializableValueAtPath(item, `${path}.${key}`);

    if (canonicalItem !== undefined) {
      canonical[key] = canonicalItem;
    }
  }

  return canonical;
}

export function canonicalizeSerializableValue<T>(value: T): T {
  return canonicalizeSerializableValueAtPath(value, 'value') as T;
}

export function canonicalizeMove<TMove extends GameMove>(move: TMove): TMove {
  return canonicalizeSerializableValue(move);
}

function canonicalizeAdapterMove<TSetup, TState, TMove extends GameMove>(
  adapter: GameAdapter<TSetup, TState, TMove>,
  move: TMove,
): TMove {
  return canonicalizeMove(adapter.canonicalizeMove ? adapter.canonicalizeMove(move) : move);
}

export function createReplayMetadata<TSetup>(
  adapter: Pick<GameAdapter<TSetup, unknown, GameMove>, 'definition' | 'metadata'>,
  setup: TSetup,
): GameReplayMetadata<TSetup> {
  return {
    engineVersion: GAME_ENGINE_VERSION,
    gameVersion: adapter.metadata?.gameVersion ?? adapter.definition.gameId,
    rngVersion: adapter.metadata?.rngVersion ?? DEFAULT_RNG_VERSION,
    rulesetVersion: adapter.metadata?.rulesetVersion ?? adapter.definition.gameId,
    setup: canonicalizeSerializableValue(setup),
  };
}

function hashSeed(seed: number | string): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }

  const text = `${seed}`;
  let hash = 2166136261;

  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRandom(seed: number | string) {
  let state = hashSeed(seed) || 0x9e3779b9;

  return function nextRandom() {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithRandom<T>(items: readonly T[], nextRandom: () => number): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return shuffled;
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number | string): T[] {
  return shuffleWithRandom(items, createSeededRandom(seed));
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function resolveCardStackIndex(
  length: number,
  position: CardStackPosition = 'end',
): number {
  if (position === 'start') {
    return 0;
  }

  if (position === 'end') {
    return length;
  }

  if (!Number.isInteger(position)) {
    throw new RangeError(
      'position must be "start", "end", or an integer index',
    );
  }

  return Math.min(Math.max(position, 0), length);
}

export function addCards<TCard>(
  cards: readonly TCard[],
  cardsToAdd: readonly TCard[],
  options: AddCardsOptions = {},
): TCard[] {
  const insertAt = resolveCardStackIndex(cards.length, options.position);

  return [...cards.slice(0, insertAt), ...cardsToAdd, ...cards.slice(insertAt)];
}

export function removeCardById<TCard extends CardLike>(
  cards: readonly TCard[],
  cardId: CardId,
): { cards: TCard[]; card: TCard | null } {
  const cardIndex = cards.findIndex((card) => card.id === cardId);

  if (cardIndex < 0) {
    return {
      cards: [...cards],
      card: null,
    };
  }

  return {
    cards: [...cards.slice(0, cardIndex), ...cards.slice(cardIndex + 1)],
    card: cards[cardIndex]!,
  };
}

export function removeCardsById<TCard extends CardLike>(
  cards: readonly TCard[],
  cardIds: readonly CardId[],
): { cards: TCard[]; removedCards: TCard[] } {
  const idsToRemove = new Set(cardIds);
  const remainingCards: TCard[] = [];
  const removedCards: TCard[] = [];

  for (const card of cards) {
    if (idsToRemove.has(card.id)) {
      removedCards.push(card);
    } else {
      remainingCards.push(card);
    }
  }

  return {
    cards: remainingCards,
    removedCards,
  };
}

export function drawCardsFromTop<TCard>(
  cards: readonly TCard[],
  amount: number,
): { cards: TCard[]; drawnCards: TCard[] } {
  assertNonNegativeInteger(amount, 'amount');

  return {
    cards: cards.slice(amount),
    drawnCards: cards.slice(0, amount),
  };
}

export function drawCardsFromBottom<TCard>(
  cards: readonly TCard[],
  amount: number,
): { cards: TCard[]; drawnCards: TCard[] } {
  assertNonNegativeInteger(amount, 'amount');

  if (amount === 0) {
    return {
      cards: [...cards],
      drawnCards: [],
    };
  }

  return {
    cards: cards.slice(0, -amount),
    drawnCards: cards.slice(-amount),
  };
}

function drawCardsFromPosition<TCard>(
  cards: readonly TCard[],
  amount: number,
  position: CardStackDrawPosition = 'top',
): { cards: TCard[]; drawnCards: TCard[] } {
  return position === 'bottom'
    ? drawCardsFromBottom(cards, amount)
    : drawCardsFromTop(cards, amount);
}

function cloneCardStacks<TCard, TStackId extends string>(
  stacks: Record<TStackId, readonly TCard[]>,
): Record<TStackId, TCard[]> {
  const cloned = {} as Record<TStackId, TCard[]>;

  for (const stackId of Object.keys(stacks) as TStackId[]) {
    cloned[stackId] = [...(stacks[stackId] ?? [])];
  }

  return cloned;
}

function getCardStack<TCard, TStackId extends string>(
  stacks: Record<TStackId, readonly TCard[]>,
  stackId: TStackId,
): readonly TCard[] {
  const cards = stacks[stackId];

  if (!cards) {
    throw new Error(`Unknown card stack ${stackId}`);
  }

  return cards;
}

export function moveCardById<TCard extends CardLike>(
  cards: readonly TCard[],
  cardId: CardId,
  options: MoveCardOptions = {},
): { cards: TCard[]; card: TCard | null } {
  const removed = removeCardById(cards, cardId);

  if (!removed.card) {
    return removed;
  }

  return {
    cards: addCards(removed.cards, [removed.card], options),
    card: removed.card,
  };
}

export function drawCardsBetweenStacks<TCard, TStackId extends string>(
  stacks: Record<TStackId, readonly TCard[]>,
  input: DrawCardsBetweenStacksInput<TStackId>,
): { drawnCards: TCard[]; stacks: Record<TStackId, TCard[]> } {
  assertNonNegativeInteger(input.amount, 'amount');
  const sourceCards = getCardStack(stacks, input.source);
  getCardStack(stacks, input.destination);

  const drawn = drawCardsFromPosition(
    sourceCards,
    input.amount,
    input.sourcePosition,
  );
  const nextStacks = cloneCardStacks(stacks);

  nextStacks[input.source] = drawn.cards;
  nextStacks[input.destination] = addCards(
    input.source === input.destination
      ? drawn.cards
      : nextStacks[input.destination]!,
    drawn.drawnCards,
    { position: input.destinationPosition },
  );

  return {
    drawnCards: drawn.drawnCards,
    stacks: nextStacks,
  };
}

export function moveCardsBetweenStacks<
  TCard extends CardLike,
  TStackId extends string,
>(
  stacks: Record<TStackId, readonly TCard[]>,
  input: MoveCardsBetweenStacksInput<TStackId>,
): { movedCards: TCard[]; stacks: Record<TStackId, TCard[]> } {
  const sourceCards = getCardStack(stacks, input.source);
  getCardStack(stacks, input.destination);
  const removed = removeCardsById(sourceCards, input.cardIds);
  const nextStacks = cloneCardStacks(stacks);

  nextStacks[input.source] = removed.cards;
  nextStacks[input.destination] = addCards(
    input.source === input.destination
      ? removed.cards
      : nextStacks[input.destination]!,
    removed.removedCards,
    { position: input.destinationPosition },
  );

  return {
    movedCards: removed.removedCards,
    stacks: nextStacks,
  };
}

export function drawCardsFromSources<TCard, TStackId extends string>(
  stacks: Record<TStackId, readonly TCard[]>,
  input: DrawCardsFromSourcesInput<TStackId>,
): {
  drawnCards: TCard[];
  remainingAmount: number;
  sourceResults: Array<{ drawnCards: TCard[]; source: TStackId }>;
  stacks: Record<TStackId, TCard[]>;
} {
  assertNonNegativeInteger(input.amount, 'amount');
  getCardStack(stacks, input.destination);

  const nextStacks = cloneCardStacks(stacks);
  const drawnCards: TCard[] = [];
  const sourceResults: Array<{ drawnCards: TCard[]; source: TStackId }> = [];

  for (const source of input.sources) {
    if (drawnCards.length >= input.amount) {
      break;
    }

    const sourceCap = source.amount ?? input.amount - drawnCards.length;
    assertNonNegativeInteger(sourceCap, 'source amount');

    if (sourceCap === 0) {
      sourceResults.push({
        drawnCards: [],
        source: source.source,
      });
      continue;
    }

    const sourceCards = getCardStack(nextStacks, source.source);
    const drawn = drawCardsFromPosition(
      sourceCards,
      Math.min(sourceCap, input.amount - drawnCards.length),
      source.position,
    );

    nextStacks[source.source] = drawn.cards;
    drawnCards.push(...drawn.drawnCards);
    sourceResults.push({
      drawnCards: drawn.drawnCards,
      source: source.source,
    });
  }

  nextStacks[input.destination] = addCards(
    nextStacks[input.destination]!,
    drawnCards,
    { position: input.destinationPosition },
  );

  return {
    drawnCards,
    remainingAmount: input.amount - drawnCards.length,
    sourceResults,
    stacks: nextStacks,
  };
}

export function revealCard<TCard>(card: TCard): CardWithVisibility<TCard> {
  return {
    ...card,
    visibility: 'face-up',
  } as CardWithVisibility<TCard>;
}

export function hideCard<TCard>(card: TCard): CardWithVisibility<TCard> {
  return {
    ...card,
    visibility: 'face-down',
  } as CardWithVisibility<TCard>;
}

export function revealCardById<TCard extends CardLike>(
  cards: readonly TCard[],
  cardId: CardId,
): Array<TCard | CardWithVisibility<TCard>> {
  return cards.map((card) => (card.id === cardId ? revealCard(card) : card));
}

export function hideCardById<TCard extends CardLike>(
  cards: readonly TCard[],
  cardId: CardId,
): Array<TCard | CardWithVisibility<TCard>> {
  return cards.map((card) => (card.id === cardId ? hideCard(card) : card));
}

export function revealAllCards<TCard>(
  cards: readonly TCard[],
): Array<CardWithVisibility<TCard>> {
  return cards.map((card) => revealCard(card));
}

export function hideAllCards<TCard>(
  cards: readonly TCard[],
): Array<CardWithVisibility<TCard>> {
  return cards.map((card) => hideCard(card));
}

export function shuffleCards<TCard>(
  cards: readonly TCard[],
  options: ShuffleCardsOptions = {},
): TCard[] {
  if (options.seed !== undefined && options.nextRandom) {
    throw new Error(
      'shuffleCards accepts either a seed or nextRandom, not both',
    );
  }

  if (options.nextRandom) {
    return shuffleWithRandom(cards, options.nextRandom);
  }

  if (options.seed !== undefined) {
    return shuffleWithSeed(cards, options.seed);
  }

  // Replayable games should pass a seed or injected RNG; this fallback is only
  // for non-persisted helper usage.
  return shuffleWithRandom(cards, Math.random);
}

export function sortCards<TCard>(
  cards: readonly TCard[],
  compareCards: (left: TCard, right: TCard) => number,
): TCard[] {
  return [...cards].sort(compareCards);
}

const DEFAULT_SUIT_ORDER: readonly string[] = [
  'clubs',
  'diamonds',
  'hearts',
  'spades',
];
const DEFAULT_RANK_ORDER: readonly (number | string)[] = [
  'A',
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  'J',
  'Q',
  'K',
];

function normalizeSortValue(
  value: number | string | undefined,
): string | number | undefined {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

function compareUnknownSortValues(
  left: number | string | undefined,
  right: number | string | undefined,
): number {
  if (left === undefined && right === undefined) {
    return 0;
  }

  if (left === undefined) {
    return 1;
  }

  if (right === undefined) {
    return -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return `${left}`.localeCompare(`${right}`);
}

function compareOrderedValue(
  left: number | string | undefined,
  right: number | string | undefined,
  order: readonly (number | string)[],
): number {
  const normalizedOrder = order.map((item) => normalizeSortValue(item));
  const leftNormalized = normalizeSortValue(left);
  const rightNormalized = normalizeSortValue(right);
  const leftIndex = normalizedOrder.findIndex((item) =>
    Object.is(item, leftNormalized),
  );
  const rightIndex = normalizedOrder.findIndex((item) =>
    Object.is(item, rightNormalized),
  );

  if (leftIndex >= 0 && rightIndex >= 0) {
    return leftIndex - rightIndex;
  }

  if (leftIndex >= 0) {
    return -1;
  }

  if (rightIndex >= 0) {
    return 1;
  }

  return compareUnknownSortValues(leftNormalized, rightNormalized);
}

export function sortCardsByRankAndSuit<
  TCard extends { rank?: number | string; suit?: string },
>(
  cards: readonly TCard[],
  options: SortCardsByRankAndSuitOptions = {},
): TCard[] {
  const directionMultiplier = options.direction === 'descending' ? -1 : 1;
  const suits = options.suits ?? DEFAULT_SUIT_ORDER;
  const ranks = options.ranks ?? DEFAULT_RANK_ORDER;

  return cards
    .map((card, index) => ({ card, index }))
    .sort((left, right) => {
      const suitComparison = compareOrderedValue(
        left.card.suit,
        right.card.suit,
        suits,
      );

      if (suitComparison !== 0) {
        return suitComparison * directionMultiplier;
      }

      const rankComparison = compareOrderedValue(
        left.card.rank,
        right.card.rank,
        ranks,
      );

      if (rankComparison !== 0) {
        return rankComparison * directionMultiplier;
      }

      return left.index - right.index;
    })
    .map(({ card }) => card);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]));
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => rightKeys.includes(key) && deepEqual(left[key], right[key]))
    );
  }

  return false;
}

export function areMovesEquivalent<TMove extends GameMove>(left: TMove, right: TMove): boolean {
  const canonicalLeft = canonicalizeMove(left);
  const canonicalRight = canonicalizeMove(right);

  return (
    canonicalLeft.playerId === canonicalRight.playerId &&
    canonicalLeft.kind === canonicalRight.kind &&
    deepEqual(canonicalLeft.payload, canonicalRight.payload)
  );
}

function resolveSelectedActor<TSetup, TState, TMove extends GameMove>(
  adapter: GameAdapter<TSetup, TState, TMove>,
  state: MatchState<TState>,
  legalMoves: readonly TMove[],
): PlayerId | null {
  if (!adapter.selectActor) {
    return state.activePlayerId;
  }

  return adapter.selectActor({
    state,
    legalMoves,
  });
}

export function createGameEngine<TSetup, TState, TMove extends GameMove = GameMove>(
  adapter: GameAdapter<TSetup, TState, TMove>,
) {
  return {
    definition: adapter.definition,
    startMatch(input: StartMatchInput<TSetup>): MatchState<TState> {
      const executionMode = input.executionMode ?? 'local';
      const setup = adapter.validateSetup ? adapter.validateSetup(input.setup) : input.setup;

      return adapter.createInitialState({
        ...input,
        setup,
        executionMode,
      });
    },
    submitMove(state: MatchState<TState>, move: TMove): MatchState<TState> {
      const submittedMove = canonicalizeAdapterMove(
        adapter,
        adapter.validateMove ? adapter.validateMove(move) : move,
      );
      const allLegalMoves = adapter.listLegalMoves(state).map((legalMove) =>
        canonicalizeAdapterMove(adapter, legalMove),
      );
      const selectedActorPlayerId = resolveSelectedActor(adapter, state, allLegalMoves);

      if (!selectedActorPlayerId || submittedMove.playerId !== selectedActorPlayerId) {
        throw new IllegalMoveError({
          gameId: adapter.definition.gameId,
          matchId: state.matchId,
          playerId: submittedMove.playerId,
          moveKind: submittedMove.kind,
          reason: selectedActorPlayerId
            ? 'player is not the selected actor in the current match state'
            : 'no actor is selected in the current match state',
        });
      }

      if (!adapter.isLegalMove(state, submittedMove)) {
        throw new IllegalMoveError({
          gameId: adapter.definition.gameId,
          matchId: state.matchId,
          playerId: submittedMove.playerId,
          moveKind: submittedMove.kind,
          reason: 'move is not legal in the current match state',
        });
      }

      return adapter.applyMove(state, submittedMove);
    },
    finalizeMatch(state: MatchState<TState>): MatchResult | null {
      if (!adapter.isMatchComplete(state)) {
        return null;
      }

      return (
        adapter.getResult?.(state) ??
        createMatchResult({
          matchId: state.matchId,
          gameId: state.gameId,
          winnerIds: [],
          rankings: [],
          finishedAt: new Date().toISOString(),
          executionMode: state.executionMode,
        })
      );
    },
  };
}
