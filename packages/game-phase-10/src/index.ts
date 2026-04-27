import type {
  GameDefinition,
  GameMove,
  MatchResult,
  MatchState,
  PlayerId,
} from '@repo/game-contracts';
import {
  removeCardById,
  removeCardsById,
  shuffleWithSeed,
} from '@repo/card-kit';
import {
  areMovesEquivalent,
  createSeededRandom,
  type GameAdapter,
} from '@repo/game-engine';
import type {
  LocalGameSessionBot,
  LocalGameSessionProjectViewInput,
  SessionParticipant,
} from '@repo/game-session';

export type Phase10Color = 'red' | 'yellow' | 'green' | 'blue';
export type Phase10CardKind = 'number' | 'wild' | 'skip';

export type Phase10Card = {
  color: Phase10Color | 'wild' | 'skip';
  id: string;
  kind: Phase10CardKind;
  label: string;
  value?: number;
};

export type Phase10Rules = {
  allowHitting: boolean;
  allowSkipping: boolean;
  handSize: number;
  setCount: number;
  setSize: number;
};

export type Phase10PhaseRequirement =
  | {
      size: number;
      type: 'set';
    }
  | {
      size: number;
      type: 'color';
    }
  | {
      size: number;
      type: 'run';
    };

export type Phase10PhaseDefinition = {
  id: string;
  label: string;
  requirements?: readonly Phase10PhaseRequirement[];
  setCount?: number;
  setSize?: number;
};

export type Phase10Setup = {
  phases?: readonly Phase10PhaseDefinition[];
  rules?: Partial<Phase10Rules>;
  seed?: number | string;
};

export type Phase10LaidGroup = {
  cards: readonly Phase10Card[];
  cardIds: readonly string[];
  color?: Phase10Color | null;
  label: string;
  runEnd?: number | null;
  runStart?: number | null;
  type: Phase10PhaseRequirement['type'];
  value?: number | null;
};

export type Phase10PlayerPhaseState = {
  label: string;
  laidGroups: readonly Phase10LaidGroup[] | null;
  phaseIndex: number;
  phaseNumber: number;
};

export type Phase10State = {
  discardPile: readonly Phase10Card[];
  drawPile: readonly Phase10Card[];
  drawnCardThisTurn: boolean;
  hands: Record<PlayerId, readonly Phase10Card[]>;
  lastEvent: string;
  phaseDefinitions: readonly Phase10PhaseDefinition[];
  phases: Record<PlayerId, Phase10PlayerPhaseState>;
  round: number;
  rules: Phase10Rules;
  seed: number | string;
  skippedPlayerIds: readonly PlayerId[];
  winnerPlayerId: PlayerId | null;
};

export type Phase10DrawCardMove = GameMove<{
  source: 'discard' | 'draw';
}> & {
  kind: 'draw-card';
};

export type Phase10LayPhaseMove = GameMove<{
  groups: readonly (readonly string[])[];
}> & {
  kind: 'lay-phase';
};

export type Phase10HitPhaseMove = GameMove<{
  cardId: string;
  groupIndex: number;
  targetPlayerId: PlayerId;
}> & {
  kind: 'hit-phase';
};

export type Phase10DiscardCardMove = GameMove<{
  cardId: string;
  targetPlayerId?: PlayerId;
}> & {
  kind: 'discard-card';
};

export type Phase10Move =
  | Phase10DrawCardMove
  | Phase10LayPhaseMove
  | Phase10HitPhaseMove
  | Phase10DiscardCardMove;

export type Phase10PlayerView = {
  activePlayerId: PlayerId;
  discardTop: Phase10Card | null;
  drawPileCount: number;
  legalActions: ReadonlyArray<{
    id: string;
    label: string;
    move: Phase10Move;
  }>;
  matchResultBanner: string | null;
  phaseOrder: readonly string[];
  phaseLabel: string;
  players: ReadonlyArray<{
    controller: SessionParticipant['controller'];
    displayName: string;
    handCount: number;
    isActive: boolean;
    isViewer: boolean;
    laidGroups: readonly Phase10LaidGroup[];
    phaseComplete: boolean;
    phaseLabel: string;
    phaseNumber: number;
    playerId: PlayerId;
    skipped: boolean;
    visibleCards: readonly Phase10Card[];
  }>;
  round: number;
  status: string;
  viewerPlayerId: PlayerId | null;
};

export type Phase10ExamplePresetId = 'hotseat-duo' | 'mixed-table' | 'bot-duel';

export type Phase10ExamplePreset = {
  hotseat: boolean;
  id: Phase10ExamplePresetId;
  label: string;
  seats: readonly SessionParticipant[];
};

export type Phase10CatalogMetadata = {
  presets: readonly Phase10ExamplePreset[];
  route: '/phase-10';
  supportsBots: true;
};

export type Phase10CatalogEntry = {
  definition: GameDefinition;
  metadata: Phase10CatalogMetadata;
};

export const defaultPhase10Rules: Phase10Rules = {
  allowHitting: true,
  allowSkipping: true,
  handSize: 10,
  setCount: 2,
  setSize: 3,
};

export function formatPhase10PhaseLabel(
  requirementsOrSetCount: readonly Phase10PhaseRequirement[] | number,
  setSizeOrPhaseNumber?: number,
  maybePhaseNumber?: number,
) {
  const requirements = Array.isArray(requirementsOrSetCount)
    ? requirementsOrSetCount
    : Array.from({ length: Number(requirementsOrSetCount) }, () => ({
        size: setSizeOrPhaseNumber ?? defaultPhase10Rules.setSize,
        type: 'set' as const,
      }));
  const phaseNumber = Array.isArray(requirementsOrSetCount)
    ? setSizeOrPhaseNumber
    : maybePhaseNumber;
  const uniformSetSize =
    requirements.length > 0 &&
    requirements.every(
      (requirement) =>
        requirement.type === 'set' &&
        requirement.size === requirements[0]?.size,
    )
      ? (requirements[0]?.size ?? null)
      : null;
  const phaseLabel =
    uniformSetSize !== null
      ? `${requirements.length} set${requirements.length === 1 ? '' : 's'} of ${uniformSetSize}`
      : requirements
          .map((requirement) => formatPhase10RequirementLabel(requirement))
          .join(' + ');

  return typeof phaseNumber === 'number'
    ? `Phase ${phaseNumber}: ${phaseLabel}`
    : phaseLabel;
}

export const defaultPhase10Phases: readonly Phase10PhaseDefinition[] = [
  {
    id: 'phase-1',
    label: formatPhase10PhaseLabel(
      Array.from({ length: defaultPhase10Rules.setCount }, () => ({
        size: defaultPhase10Rules.setSize,
        type: 'set' as const,
      })),
      1,
    ),
    requirements: Array.from({ length: defaultPhase10Rules.setCount }, () => ({
      size: defaultPhase10Rules.setSize,
      type: 'set' as const,
    })),
    setCount: defaultPhase10Rules.setCount,
    setSize: defaultPhase10Rules.setSize,
  },
] as const;

export const PHASE_10_GAME_VERSION = '0.1.0';
export const PHASE_10_RULESET_VERSION = 'phase-10-phase-1-v1';

export const phase10Definition: GameDefinition = {
  gameId: 'phase-10',
  name: 'Phase 10',
  minPlayers: 2,
  maxPlayers: 4,
  supportsLocal: true,
  supportsOnline: false,
  tags: ['card-game', 'rummy', 'local'],
};

const COLORS: readonly Phase10Color[] = ['red', 'yellow', 'green', 'blue'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPhase10RequirementType(
  value: unknown,
): value is Phase10PhaseRequirement['type'] {
  return value === 'set' || value === 'color' || value === 'run';
}

function createRepeatedSetRequirements(
  setCount: number,
  setSize: number,
): Phase10PhaseRequirement[] {
  return Array.from({ length: setCount }, () => ({
    size: setSize,
    type: 'set' as const,
  }));
}

function clonePhaseRequirements(
  requirements: readonly Phase10PhaseRequirement[],
): Phase10PhaseRequirement[] {
  return requirements.map((requirement) => ({ ...requirement }));
}

function deriveUniformSetConfig(
  requirements: readonly Phase10PhaseRequirement[],
) {
  if (
    requirements.length === 0 ||
    requirements.some(
      (requirement) =>
        requirement.type !== 'set' ||
        requirement.size !== requirements[0]?.size,
    )
  ) {
    return null;
  }

  return {
    setCount: requirements.length,
    setSize: requirements[0]!.size,
  };
}

export function getPhase10PhaseRequirements(
  phase: Pick<Phase10PhaseDefinition, 'requirements' | 'setCount' | 'setSize'>,
): readonly Phase10PhaseRequirement[] {
  if (phase.requirements && phase.requirements.length > 0) {
    return phase.requirements;
  }

  if (
    typeof phase.setCount === 'number' &&
    Number.isInteger(phase.setCount) &&
    phase.setCount > 0 &&
    typeof phase.setSize === 'number' &&
    Number.isInteger(phase.setSize) &&
    phase.setSize > 0
  ) {
    return createRepeatedSetRequirements(phase.setCount, phase.setSize);
  }

  throw new Error('Phase 10 phases must define at least one requirement.');
}

export function formatPhase10RequirementLabel(
  requirement: Phase10PhaseRequirement,
) {
  if (requirement.type === 'set') {
    return `set of ${requirement.size}`;
  }

  if (requirement.type === 'color') {
    return `${requirement.size} cards of one color`;
  }

  return `street of ${requirement.size}`;
}

function parseFiniteNumber(
  value: unknown,
  fallback: number,
  label: string,
): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }

  return value;
}

function parsePositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive integer.`);
  }

  return value;
}

function parseBoolean(
  value: unknown,
  fallback: boolean,
  label: string,
): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    throw new TypeError(`${label} must be a boolean.`);
  }

  return value;
}

function clonePhaseDefinitions(
  phases: readonly Phase10PhaseDefinition[],
): Phase10PhaseDefinition[] {
  return phases.map((phase) => ({
    ...phase,
    requirements: phase.requirements
      ? clonePhaseRequirements(phase.requirements)
      : undefined,
  }));
}

function clonePhases(
  phases: Record<PlayerId, Phase10PlayerPhaseState>,
): Record<PlayerId, Phase10PlayerPhaseState> {
  return Object.fromEntries(
    Object.entries(phases).map(([playerId, phase]) => [
      playerId,
      {
        ...phase,
        laidGroups: phase.laidGroups
          ? phase.laidGroups.map((group) => ({
              ...group,
              cards: [...group.cards],
              cardIds: [...group.cardIds],
            }))
          : null,
      },
    ]),
  );
}

function normalizePhaseDefinition(
  phase: Pick<
    Phase10PhaseDefinition,
    'label' | 'requirements' | 'setCount' | 'setSize'
  >,
  index: number,
): Phase10PhaseDefinition {
  const requirements = clonePhaseRequirements(
    getPhase10PhaseRequirements(phase),
  );
  const uniformSetConfig = deriveUniformSetConfig(requirements);

  return {
    id: `phase-${index + 1}`,
    label:
      phase.label.trim().length > 0
        ? phase.label.trim()
        : formatPhase10PhaseLabel(requirements, index + 1),
    requirements,
    ...(uniformSetConfig ?? {}),
  };
}

function createPhaseDefinitions(
  rules: Pick<Phase10Rules, 'setCount' | 'setSize'>,
  phases?: readonly Phase10PhaseDefinition[],
) {
  if (phases && phases.length > 0) {
    return clonePhaseDefinitions(phases);
  }

  return [
    normalizePhaseDefinition(
      {
        label: '',
        requirements: createRepeatedSetRequirements(
          rules.setCount,
          rules.setSize,
        ),
      },
      0,
    ),
  ];
}

function createDeck(): Phase10Card[] {
  const cards: Phase10Card[] = [];

  for (let copy = 0; copy < 2; copy += 1) {
    for (const color of COLORS) {
      for (let value = 1; value <= 12; value += 1) {
        cards.push({
          color,
          id: `${color}-${value}-${copy}`,
          kind: 'number',
          label: `${color[0]!.toUpperCase()}${color.slice(1)} ${value}`,
          value,
        });
      }
    }
  }

  for (let index = 0; index < 8; index += 1) {
    cards.push({
      color: 'wild',
      id: `wild-${index}`,
      kind: 'wild',
      label: 'Wild',
    });
  }

  for (let index = 0; index < 4; index += 1) {
    cards.push({
      color: 'skip',
      id: `skip-${index}`,
      kind: 'skip',
      label: 'Skip',
    });
  }

  return cards;
}

function cardMatchesSetValue(card: Phase10Card, value: number | null) {
  if (card.kind === 'wild') {
    return true;
  }

  if (card.kind === 'skip') {
    return false;
  }

  return value === null || card.value === value;
}

function resolveSetValue(cards: readonly Phase10Card[]) {
  const numericCards = cards.filter(
    (card): card is Phase10Card & { kind: 'number'; value: number } =>
      card.kind === 'number' && typeof card.value === 'number',
  );

  if (numericCards.length === 0) {
    return null;
  }

  const value = numericCards[0]!.value;
  return numericCards.every((card) => card.value === value) ? value : null;
}

function createSetLabel(cards: readonly Phase10Card[]) {
  const value = resolveSetValue(cards);
  const wildCount = cards.filter((card) => card.kind === 'wild').length;

  if (value === null) {
    return wildCount === cards.length ? 'Set of wilds' : 'Flexible set';
  }

  return wildCount > 0 ? `Set of ${value}s + wild` : `Set of ${value}s`;
}

function resolveColorValue(cards: readonly Phase10Card[]) {
  const numericCards = cards.filter(
    (card): card is Phase10Card & { color: Phase10Color; kind: 'number' } =>
      card.kind === 'number',
  );

  if (numericCards.length === 0) {
    return null;
  }

  const color = numericCards[0]!.color;
  return numericCards.every((card) => card.color === color) ? color : null;
}

function createColorLabel(cards: readonly Phase10Card[]) {
  const color = resolveColorValue(cards);
  const wildCount = cards.filter((card) => card.kind === 'wild').length;

  if (color === null) {
    return wildCount === cards.length
      ? `Color group of ${cards.length} wild${cards.length === 1 ? '' : 's'}`
      : 'Flexible color group';
  }

  return wildCount > 0
    ? `${cards.length} ${color} cards + wild`
    : `${cards.length} ${color} cards`;
}

function resolveRunRange(cards: readonly Phase10Card[], size: number) {
  if (cards.length !== size || cards.some((card) => card.kind === 'skip')) {
    return null;
  }

  const numericValues = cards
    .filter(
      (card): card is Phase10Card & { kind: 'number'; value: number } =>
        card.kind === 'number' && typeof card.value === 'number',
    )
    .map((card) => card.value)
    .sort((left, right) => left - right);
  const uniqueValues = [...new Set(numericValues)];

  if (uniqueValues.length !== numericValues.length || size > 12) {
    return null;
  }

  for (let start = 1; start <= 13 - size; start += 1) {
    const end = start + size - 1;

    if (uniqueValues.every((value) => value >= start && value <= end)) {
      return { start, end };
    }
  }

  return null;
}

function createRunLabel(cards: readonly Phase10Card[]) {
  const range = resolveRunRange(cards, cards.length);
  const wildCount = cards.filter((card) => card.kind === 'wild').length;

  if (!range) {
    return 'Invalid street';
  }

  if (wildCount === cards.length) {
    return `Flexible street of ${cards.length}`;
  }

  return wildCount > 0
    ? `Street ${range.start}-${range.end} + wild`
    : `Street ${range.start}-${range.end}`;
}

function isValidSetGroup(cards: readonly Phase10Card[], setSize: number) {
  if (cards.length !== setSize) {
    return false;
  }

  if (cards.some((card) => card.kind === 'skip')) {
    return false;
  }

  const value = resolveSetValue(cards);
  return value !== null || cards.every((card) => card.kind === 'wild');
}

function isValidColorGroup(cards: readonly Phase10Card[], size: number) {
  if (cards.length !== size || cards.some((card) => card.kind === 'skip')) {
    return false;
  }

  const color = resolveColorValue(cards);
  return color !== null || cards.every((card) => card.kind === 'wild');
}

function isValidRunGroup(cards: readonly Phase10Card[], size: number) {
  return resolveRunRange(cards, size) !== null;
}

function isValidRequirementGroup(
  cards: readonly Phase10Card[],
  requirement: Phase10PhaseRequirement,
) {
  if (requirement.type === 'set') {
    return isValidSetGroup(cards, requirement.size);
  }

  if (requirement.type === 'color') {
    return isValidColorGroup(cards, requirement.size);
  }

  return isValidRunGroup(cards, requirement.size);
}

function toLaidGroupForType(
  cards: readonly Phase10Card[],
  type: Phase10PhaseRequirement['type'],
): Phase10LaidGroup {
  if (type === 'set') {
    return {
      cards: [...cards],
      cardIds: cards.map((card) => card.id),
      label: createSetLabel(cards),
      type,
      value: resolveSetValue(cards),
    };
  }

  if (type === 'color') {
    return {
      cards: [...cards],
      cardIds: cards.map((card) => card.id),
      color: resolveColorValue(cards),
      label: createColorLabel(cards),
      type,
    };
  }

  const range = resolveRunRange(cards, cards.length);

  return {
    cards: [...cards],
    cardIds: cards.map((card) => card.id),
    label: createRunLabel(cards),
    runEnd: range?.end ?? null,
    runStart: range?.start ?? null,
    type,
  };
}

function toLaidGroup(
  cards: readonly Phase10Card[],
  requirement: Phase10PhaseRequirement,
): Phase10LaidGroup {
  if (!isValidRequirementGroup(cards, requirement)) {
    throw new Error(
      `Cannot create a laid group from ${formatPhase10RequirementLabel(requirement)}.`,
    );
  }

  return toLaidGroupForType(cards, requirement.type);
}

function cardMatchesColorValue(
  card: Phase10Card,
  color: Phase10Color | null | undefined,
) {
  if (card.kind === 'wild') {
    return true;
  }

  if (card.kind !== 'number') {
    return false;
  }

  return color === null || color === undefined || card.color === color;
}

function canAppendToRun(cards: readonly Phase10Card[], card: Phase10Card) {
  if (card.kind === 'skip') {
    return false;
  }

  return resolveRunRange([...cards, card], cards.length + 1) !== null;
}

function appendToLaidGroup(
  group: Phase10LaidGroup,
  card: Phase10Card,
): Phase10LaidGroup | null {
  if (card.kind === 'skip') {
    return null;
  }

  if (group.type === 'set') {
    if (!cardMatchesSetValue(card, group.value ?? null)) {
      return null;
    }

    return toLaidGroupForType([...group.cards, card], 'set');
  }

  if (group.type === 'color') {
    if (!cardMatchesColorValue(card, group.color)) {
      return null;
    }

    const nextGroup = [...group.cards, card];

    if (!isValidColorGroup(nextGroup, nextGroup.length)) {
      return null;
    }

    return toLaidGroupForType(nextGroup, 'color');
  }

  if (!canAppendToRun(group.cards, card)) {
    return null;
  }

  return toLaidGroupForType([...group.cards, card], 'run');
}

function cardHelpsRunRequirement(
  hand: readonly Phase10Card[],
  card: Phase10Card,
  size: number,
) {
  if (card.kind !== 'number' || typeof card.value !== 'number' || size > 12) {
    return false;
  }

  const values = new Set<number>();

  for (const candidate of hand) {
    if (candidate.kind === 'number' && typeof candidate.value === 'number') {
      values.add(candidate.value);
    }
  }

  values.add(card.value);

  const wildCount = hand.filter(
    (candidate) => candidate.kind === 'wild',
  ).length;

  for (let start = 1; start <= 13 - size; start += 1) {
    const end = start + size - 1;

    if (card.value < start || card.value > end) {
      continue;
    }

    let presentCount = 0;

    for (let value = start; value <= end; value += 1) {
      if (values.has(value)) {
        presentCount += 1;
      }
    }

    if (size - presentCount <= wildCount) {
      return true;
    }
  }

  return false;
}

function cardHelpsRequirement(
  hand: readonly Phase10Card[],
  card: Phase10Card,
  requirement: Phase10PhaseRequirement,
) {
  if (card.kind === 'wild') {
    return true;
  }

  if (card.kind !== 'number') {
    return false;
  }

  const wildCount = hand.filter(
    (candidate) => candidate.kind === 'wild',
  ).length;

  if (requirement.type === 'set') {
    return (
      hand.filter(
        (candidate) =>
          candidate.kind === 'number' && candidate.value === card.value,
      ).length +
        wildCount >=
      requirement.size
    );
  }

  if (requirement.type === 'color') {
    return (
      hand.filter(
        (candidate) =>
          candidate.kind === 'number' && candidate.color === card.color,
      ).length +
        wildCount >=
      requirement.size
    );
  }

  return cardHelpsRunRequirement(hand, card, requirement.size);
}

function cardHelpsCurrentPhase(
  card: Phase10Card | null,
  state: MatchState<Phase10State>,
  playerId: PlayerId,
) {
  if (!card) {
    return false;
  }

  const phase = state.state.phases[playerId];

  if (!phase || phase.laidGroups) {
    return false;
  }

  const hand = state.state.hands[playerId] ?? [];
  const requirements = getPhase10PhaseRequirements(
    phaseDefinitionForPlayer(state, playerId),
  );

  return requirements.some((requirement) =>
    cardHelpsRequirement(hand, card, requirement),
  );
}

function toPhaseGroupErrorLabel(requirement: Phase10PhaseRequirement) {
  if (requirement.type === 'set') {
    return `set of ${requirement.size}`;
  }

  if (requirement.type === 'color') {
    return `${requirement.size} cards of one color`;
  }

  return `street of ${requirement.size}`;
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) {
    return [[]];
  }

  if (items.length < size) {
    return [];
  }

  const result: T[][] = [];

  function visit(startIndex: number, current: T[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let index = startIndex; index < items.length; index += 1) {
      current.push(items[index]!);
      visit(index + 1, current);
      current.pop();
    }
  }

  visit(0, []);
  return result;
}

function findPhaseGroups(
  hand: readonly Phase10Card[],
  phaseDefinition: Pick<
    Phase10PhaseDefinition,
    'requirements' | 'setCount' | 'setSize'
  >,
): readonly (readonly Phase10Card[])[] | null {
  const usableCards = hand.filter((card) => card.kind !== 'skip');
  const requirements = getPhase10PhaseRequirements(phaseDefinition);
  const chosen: Phase10Card[][] = [];
  const usedCardIds = new Set<string>();

  function search(
    requirementIndex: number,
  ): readonly (readonly Phase10Card[])[] | null {
    if (requirementIndex === requirements.length) {
      return chosen.map((group) => [...group]);
    }

    const requirement = requirements[requirementIndex]!;
    const options = combinations(
      usableCards.filter((card) => !usedCardIds.has(card.id)),
      requirement.size,
    ).filter((group) => isValidRequirementGroup(group, requirement));

    for (const candidate of options) {
      if (candidate.some((card) => usedCardIds.has(card.id))) {
        continue;
      }

      candidate.forEach((card) => {
        usedCardIds.add(card.id);
      });
      chosen.push(candidate);

      const result = search(requirementIndex + 1);

      if (result) {
        return result;
      }

      chosen.pop();
      candidate.forEach((card) => {
        usedCardIds.delete(card.id);
      });
    }

    return null;
  }

  return search(0);
}

function describeMove(
  move: Phase10Move,
  state: Phase10State,
  participants: readonly SessionParticipant[],
) {
  if (move.kind === 'draw-card') {
    return move.payload.source === 'discard'
      ? `Draw ${state.discardPile[state.discardPile.length - 1]?.label ?? 'discard'}`
      : 'Draw from pile';
  }

  if (move.kind === 'lay-phase') {
    return `Lay ${state.phases[move.playerId]?.label ?? 'current phase'}`;
  }

  if (move.kind === 'hit-phase') {
    const target = participants.find(
      (participant) => participant.playerId === move.payload.targetPlayerId,
    );
    const card = state.hands[move.playerId]?.find(
      (candidate) => candidate.id === move.payload.cardId,
    );
    return `Hit ${target?.displayName ?? move.payload.targetPlayerId} with ${card?.label ?? 'card'}`;
  }

  const card = state.hands[move.playerId]?.find(
    (candidate) => candidate.id === move.payload.cardId,
  );
  const target = move.payload.targetPlayerId
    ? participants.find(
        (participant) => participant.playerId === move.payload.targetPlayerId,
      )
    : null;

  return target
    ? `Discard ${card?.label ?? 'card'} on ${target.displayName}`
    : `Discard ${card?.label ?? 'card'}`;
}

function activePhase(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10PlayerPhaseState {
  const phase = state.state.phases[playerId];

  if (!phase) {
    throw new Error(`Unknown Phase 10 player ${playerId}`);
  }

  return phase;
}

function phaseDefinitionForPlayer(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10PhaseDefinition {
  const phase = activePhase(state, playerId);
  const definition = state.state.phaseDefinitions[phase.phaseIndex];

  if (!definition) {
    throw new Error(`Unknown Phase 10 definition ${phase.phaseIndex}`);
  }

  return definition;
}

function recycleDrawPile(state: Phase10State): Phase10State {
  if (state.drawPile.length > 0 || state.discardPile.length <= 1) {
    return state;
  }

  const discardTop = state.discardPile[state.discardPile.length - 1]!;
  const recyclableCards = state.discardPile.slice(0, -1);
  const nextSeed = `${state.seed}:recycle:${recyclableCards.length}`;

  return {
    ...state,
    discardPile: [discardTop],
    drawPile: shuffleWithSeed(recyclableCards, nextSeed),
  };
}

function playerOrder<TPlayer extends { playerId: PlayerId; seat: number }>(
  players: readonly TPlayer[],
) {
  return [...players].sort((left, right) => left.seat - right.seat);
}

function dealRound(
  players: readonly { playerId: PlayerId; seat: number }[],
  handSize: number,
  seed: number | string,
) {
  const orderedPlayers = playerOrder(players);
  const deck = shuffleWithSeed(createDeck(), seed);
  const hands: Record<PlayerId, readonly Phase10Card[]> = {};
  let deckIndex = 0;

  for (const player of orderedPlayers) {
    hands[player.playerId] = deck.slice(deckIndex, deckIndex + handSize);
    deckIndex += handSize;
  }

  return {
    discardPile: [deck[deckIndex]!],
    drawPile: deck.slice(deckIndex + 1),
    hands,
  };
}

function nextActivePlayer(input: {
  activePlayerId: PlayerId;
  players: readonly { playerId: PlayerId; seat: number }[];
  skippedPlayerIds: readonly PlayerId[];
}) {
  const orderedPlayers = playerOrder(input.players);
  const activeIndex = orderedPlayers.findIndex(
    (player) => player.playerId === input.activePlayerId,
  );

  if (activeIndex < 0) {
    throw new Error(`Unknown active player ${input.activePlayerId}`);
  }

  const remainingSkips = new Set(input.skippedPlayerIds);

  for (let offset = 1; offset <= orderedPlayers.length * 2; offset += 1) {
    const player =
      orderedPlayers[(activeIndex + offset) % orderedPlayers.length]!;

    if (remainingSkips.has(player.playerId)) {
      remainingSkips.delete(player.playerId);
      continue;
    }

    return {
      activePlayerId: player.playerId,
      skippedPlayerIds: [...remainingSkips],
    };
  }

  return {
    activePlayerId: input.activePlayerId,
    skippedPlayerIds: [...remainingSkips],
  };
}

function createDiscardMoves(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10DiscardCardMove[] {
  const hand = state.state.hands[playerId] ?? [];
  const opponents = state.players.filter(
    (player) => player.playerId !== playerId,
  );

  return hand.flatMap((card) => {
    if (card.kind === 'skip' && state.state.rules.allowSkipping) {
      return opponents.map((opponent) => ({
        playerId,
        kind: 'discard-card' as const,
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: {
          cardId: card.id,
          targetPlayerId: opponent.playerId,
        },
      }));
    }

    return [
      {
        playerId,
        kind: 'discard-card' as const,
        createdAt: '2026-04-26T12:00:00.000Z',
        payload: {
          cardId: card.id,
        },
      },
    ];
  });
}

function createLayMove(
  playerId: PlayerId,
  groups: readonly (readonly Phase10Card[])[],
): Phase10LayPhaseMove {
  return {
    playerId,
    kind: 'lay-phase',
    createdAt: '2026-04-26T12:00:00.000Z',
    payload: {
      groups: groups.map((group) => group.map((card) => card.id)),
    },
  };
}

function createHitMoves(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10HitPhaseMove[] {
  if (!state.state.rules.allowHitting) {
    return [];
  }

  if (!activePhase(state, playerId).laidGroups) {
    return [];
  }

  const hand = state.state.hands[playerId] ?? [];
  const moves: Phase10HitPhaseMove[] = [];

  for (const card of hand) {
    if (card.kind === 'skip') {
      continue;
    }

    for (const player of state.players) {
      const laidGroups = state.state.phases[player.playerId]?.laidGroups ?? [];

      laidGroups.forEach((group, groupIndex) => {
        if (!appendToLaidGroup(group, card)) {
          return;
        }

        moves.push({
          playerId,
          kind: 'hit-phase',
          createdAt: '2026-04-26T12:00:00.000Z',
          payload: {
            cardId: card.id,
            groupIndex,
            targetPlayerId: player.playerId,
          },
        });
      });
    }
  }

  return moves;
}

function validatePhaseGroupsMove(
  hand: readonly Phase10Card[],
  phaseDefinition: Pick<
    Phase10PhaseDefinition,
    'label' | 'requirements' | 'setCount' | 'setSize'
  >,
  groups: readonly (readonly string[])[],
) {
  const requirements = getPhase10PhaseRequirements(phaseDefinition);

  if (groups.length !== requirements.length) {
    throw new Error(
      `${phaseDefinition.label} requires ${requirements.length} groups.`,
    );
  }

  const selectedIds = groups.flatMap((group) => group);
  const uniqueIds = new Set(selectedIds);

  if (uniqueIds.size !== selectedIds.length) {
    throw new Error('Phase cards cannot be reused across groups.');
  }

  const { removedCards } = removeCardsById(hand, selectedIds);

  if (removedCards.length !== selectedIds.length) {
    throw new Error('Phase move references cards that are not in hand.');
  }

  const cardsById = new Map(removedCards.map((card) => [card.id, card]));

  return groups.map((group, groupIndex) => {
    const requirement = requirements[groupIndex]!;
    const cards = group.map((cardId) => {
      const card = cardsById.get(cardId);

      if (!card) {
        throw new Error(`Unknown phase card ${cardId}`);
      }

      return card;
    });

    if (!isValidRequirementGroup(cards, requirement)) {
      throw new Error(
        `Group ${groupIndex + 1} of ${phaseDefinition.label.toLowerCase()} must be a valid ${toPhaseGroupErrorLabel(requirement)}.`,
      );
    }

    return cards;
  });
}

function applyDrawMove(
  state: MatchState<Phase10State>,
  move: Phase10DrawCardMove,
): MatchState<Phase10State> {
  const nextState = recycleDrawPile(state.state);

  if (move.payload.source === 'draw') {
    const drawnCard = nextState.drawPile[0];

    if (!drawnCard) {
      throw new Error('No cards remain in the draw pile.');
    }

    return {
      ...state,
      state: {
        ...nextState,
        drawPile: nextState.drawPile.slice(1),
        drawnCardThisTurn: true,
        hands: {
          ...nextState.hands,
          [move.playerId]: [
            ...(nextState.hands[move.playerId] ?? []),
            drawnCard,
          ],
        },
        lastEvent: `${move.playerId} drew from the pile`,
      },
    };
  }

  const discardTop = nextState.discardPile[nextState.discardPile.length - 1];

  if (!discardTop) {
    throw new Error('No discard card is available.');
  }

  return {
    ...state,
    state: {
      ...nextState,
      discardPile: nextState.discardPile.slice(0, -1),
      drawnCardThisTurn: true,
      hands: {
        ...nextState.hands,
        [move.playerId]: [
          ...(nextState.hands[move.playerId] ?? []),
          discardTop,
        ],
      },
      lastEvent: `${move.playerId} picked up ${discardTop.label}`,
    },
  };
}

function applyLayMove(
  state: MatchState<Phase10State>,
  move: Phase10LayPhaseMove,
): MatchState<Phase10State> {
  const hand = state.state.hands[move.playerId] ?? [];
  const phaseDefinition = phaseDefinitionForPlayer(state, move.playerId);
  const groups = validatePhaseGroupsMove(
    hand,
    phaseDefinition,
    move.payload.groups,
  );
  const selectedIds = move.payload.groups.flatMap((group) => group);
  const removed = removeCardsById(hand, selectedIds);
  const nextPhases = clonePhases(state.state.phases);

  nextPhases[move.playerId] = {
    ...nextPhases[move.playerId]!,
    laidGroups: groups.map((group, groupIndex) =>
      toLaidGroup(
        group,
        getPhase10PhaseRequirements(phaseDefinition)[groupIndex]!,
      ),
    ),
  };

  return {
    ...state,
    state: {
      ...state.state,
      hands: {
        ...state.state.hands,
        [move.playerId]: removed.cards,
      },
      lastEvent: `${move.playerId} laid ${phaseDefinition.label}`,
      phases: nextPhases,
    },
  };
}

function applyHitMove(
  state: MatchState<Phase10State>,
  move: Phase10HitPhaseMove,
): MatchState<Phase10State> {
  const hand = state.state.hands[move.playerId] ?? [];
  const removed = removeCardById(hand, move.payload.cardId);

  if (!removed.card) {
    throw new Error(`Card ${move.payload.cardId} is not in hand.`);
  }

  const nextPhases = clonePhases(state.state.phases);
  const targetPhase = nextPhases[move.payload.targetPlayerId];
  const laidGroups = targetPhase?.laidGroups;
  const targetGroup = laidGroups?.[move.payload.groupIndex];

  if (!targetPhase || !laidGroups || !targetGroup) {
    throw new Error('Cannot hit a phase group that has not been laid.');
  }

  const nextGroup = appendToLaidGroup(targetGroup, removed.card);

  if (!nextGroup) {
    throw new Error('Card does not fit the target phase group.');
  }
  nextPhases[move.payload.targetPlayerId] = {
    ...targetPhase,
    laidGroups: laidGroups.map((group, groupIndex) =>
      groupIndex === move.payload.groupIndex ? nextGroup : group,
    ),
  };

  return {
    ...state,
    state: {
      ...state.state,
      hands: {
        ...state.state.hands,
        [move.playerId]: removed.cards,
      },
      lastEvent: `${move.playerId} hit ${targetPhase.label}`,
      phases: nextPhases,
    },
  };
}

function rankedPlayers(state: MatchState<Phase10State>) {
  return [...state.players]
    .map((player) => ({
      phaseIndex: state.state.phases[player.playerId]?.phaseIndex ?? 0,
      playerId: player.playerId,
      handCount: state.state.hands[player.playerId]?.length ?? 0,
    }))
    .sort((left, right) => {
      if (left.phaseIndex !== right.phaseIndex) {
        return right.phaseIndex - left.phaseIndex;
      }

      return left.handCount - right.handCount;
    })
    .map((player, index) => ({
      playerId: player.playerId,
      position: index + 1,
    }));
}

function createNextRoundState(
  state: MatchState<Phase10State>,
  roundWinnerId: PlayerId,
): MatchState<Phase10State> {
  const nextRound = state.state.round + 1;
  const deal = dealRound(
    state.players,
    state.state.rules.handSize,
    `${state.state.seed}:round:${nextRound}`,
  );
  const phases = Object.fromEntries(
    state.players.map((player) => {
      const currentPhase = state.state.phases[player.playerId]!;
      const nextPhaseIndex = currentPhase.laidGroups
        ? Math.min(
            currentPhase.phaseIndex + 1,
            state.state.phaseDefinitions.length - 1,
          )
        : currentPhase.phaseIndex;
      const nextDefinition = state.state.phaseDefinitions[nextPhaseIndex]!;

      return [
        player.playerId,
        {
          label: nextDefinition.label,
          laidGroups: null,
          phaseIndex: nextPhaseIndex,
          phaseNumber: nextPhaseIndex + 1,
        },
      ] as const;
    }),
  );

  return {
    ...state,
    activePlayerId: roundWinnerId,
    turn: state.turn + 1,
    state: {
      ...state.state,
      discardPile: deal.discardPile,
      drawPile: deal.drawPile,
      drawnCardThisTurn: false,
      hands: deal.hands,
      lastEvent: `Round ${nextRound} started`,
      phases,
      round: nextRound,
      skippedPlayerIds: [],
      winnerPlayerId: null,
    },
  };
}

function applyDiscardMove(
  state: MatchState<Phase10State>,
  move: Phase10DiscardCardMove,
): MatchState<Phase10State> {
  const hand = state.state.hands[move.playerId] ?? [];
  const removed = removeCardById(hand, move.payload.cardId);

  if (!removed.card) {
    throw new Error(`Card ${move.payload.cardId} is not in hand.`);
  }

  if (removed.card.kind === 'skip') {
    if (!state.state.rules.allowSkipping) {
      throw new Error('Skipping is disabled for this table.');
    }

    if (
      !move.payload.targetPlayerId ||
      move.payload.targetPlayerId === move.playerId
    ) {
      throw new Error('Skip discards require a valid target player.');
    }
  }

  const laidGroups = state.state.phases[move.playerId]?.laidGroups;
  const currentPhase = state.state.phases[move.playerId];
  const completedFinalPhase = Boolean(
    removed.cards.length === 0 &&
    laidGroups &&
    currentPhase &&
    currentPhase.phaseIndex >= state.state.phaseDefinitions.length - 1,
  );
  const winnerPlayerId = completedFinalPhase ? move.playerId : null;

  if (removed.cards.length === 0 && laidGroups && !winnerPlayerId) {
    return createNextRoundState(
      {
        ...state,
        state: {
          ...state.state,
          discardPile: [...state.state.discardPile, removed.card],
          hands: {
            ...state.state.hands,
            [move.playerId]: removed.cards,
          },
        },
      },
      move.playerId,
    );
  }

  const pendingSkips = new Set(state.state.skippedPlayerIds);

  if (removed.card.kind === 'skip' && move.payload.targetPlayerId) {
    pendingSkips.add(move.payload.targetPlayerId);
  }

  const nextTurn = nextActivePlayer({
    activePlayerId: state.activePlayerId,
    players: state.players,
    skippedPlayerIds: [...pendingSkips],
  });

  return {
    ...state,
    activePlayerId: winnerPlayerId ? move.playerId : nextTurn.activePlayerId,
    turn: state.turn + 1,
    state: {
      ...state.state,
      discardPile: [...state.state.discardPile, removed.card],
      drawnCardThisTurn: false,
      hands: {
        ...state.state.hands,
        [move.playerId]: removed.cards,
      },
      lastEvent:
        removed.card.kind === 'skip' && move.payload.targetPlayerId
          ? `${move.playerId} skipped ${move.payload.targetPlayerId}`
          : `${move.playerId} discarded ${removed.card.label}`,
      skippedPlayerIds: winnerPlayerId ? [] : nextTurn.skippedPlayerIds,
      winnerPlayerId,
    },
  };
}

function countValueMatches(
  hand: readonly Phase10Card[],
  value: number | undefined,
): number {
  if (typeof value !== 'number') {
    return 0;
  }

  return hand.filter((card) => card.kind === 'number' && card.value === value)
    .length;
}

function cardUsefulness(
  card: Phase10Card,
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): number {
  if (card.kind === 'wild') {
    return 100;
  }

  if (card.kind === 'skip') {
    return 3;
  }

  const hand = state.state.hands[playerId] ?? [];
  const ownPhase = state.state.phases[playerId]?.laidGroups;

  if (ownPhase) {
    const canHit = state.players.some((player) =>
      (state.state.phases[player.playerId]?.laidGroups ?? []).some(
        (group) => appendToLaidGroup(group, card) !== null,
      ),
    );

    return canHit ? 80 : 8 + countValueMatches(hand, card.value);
  }

  return cardHelpsCurrentPhase(card, state, playerId)
    ? 48
    : countValueMatches(hand, card.value) * 12 + 10;
}

function chooseDiscardMove(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
  moves: readonly Phase10DiscardCardMove[],
) {
  return (
    [...moves].sort((left, right) => {
      const leftCard = state.state.hands[playerId]?.find(
        (card) => card.id === left.payload.cardId,
      );
      const rightCard = state.state.hands[playerId]?.find(
        (card) => card.id === right.payload.cardId,
      );
      const leftScore = leftCard
        ? cardUsefulness(leftCard, state, playerId)
        : 0;
      const rightScore = rightCard
        ? cardUsefulness(rightCard, state, playerId)
        : 0;

      return leftScore - rightScore;
    })[0] ?? null
  );
}

function isHelpfulDiscard(
  card: Phase10Card | null,
  state: MatchState<Phase10State>,
  playerId: PlayerId,
) {
  if (!card || card.kind === 'skip') {
    return false;
  }

  if (card.kind === 'wild') {
    return true;
  }

  return cardHelpsCurrentPhase(card, state, playerId);
}

export function parsePhase10Setup(value: unknown): Phase10Setup {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isRecord(value)) {
    throw new TypeError('Phase 10 setup must be an object.');
  }

  const setup: Phase10Setup = {};

  if (value.seed !== undefined) {
    if (
      typeof value.seed !== 'string' &&
      (typeof value.seed !== 'number' || !Number.isFinite(value.seed))
    ) {
      throw new TypeError(
        'Phase 10 setup seed must be a string or finite number.',
      );
    }

    setup.seed = value.seed;
  }

  if (value.rules !== undefined) {
    if (!isRecord(value.rules)) {
      throw new TypeError('Phase 10 setup rules must be an object.');
    }

    setup.rules = {
      allowHitting: parseBoolean(
        value.rules.allowHitting,
        defaultPhase10Rules.allowHitting,
        'Phase 10 allowHitting',
      ),
      allowSkipping: parseBoolean(
        value.rules.allowSkipping,
        defaultPhase10Rules.allowSkipping,
        'Phase 10 allowSkipping',
      ),
      handSize: parseFiniteNumber(
        value.rules.handSize,
        defaultPhase10Rules.handSize,
        'Phase 10 handSize',
      ),
      setCount: parseFiniteNumber(
        value.rules.setCount,
        defaultPhase10Rules.setCount,
        'Phase 10 setCount',
      ),
      setSize: parseFiniteNumber(
        value.rules.setSize,
        defaultPhase10Rules.setSize,
        'Phase 10 setSize',
      ),
    };
  }

  if (value.phases !== undefined) {
    if (!Array.isArray(value.phases) || value.phases.length === 0) {
      throw new TypeError('Phase 10 setup phases must be a non-empty array.');
    }

    setup.phases = value.phases.map((phase, index) => {
      if (!isRecord(phase)) {
        throw new TypeError('Phase 10 phases must contain objects.');
      }

      const label =
        phase.label === undefined
          ? ''
          : typeof phase.label === 'string'
            ? phase.label
            : (() => {
                throw new TypeError(
                  `Phase 10 phase ${index + 1} label must be a string.`,
                );
              })();
      const requirements =
        phase.requirements === undefined
          ? null
          : (() => {
              if (
                !Array.isArray(phase.requirements) ||
                phase.requirements.length === 0
              ) {
                throw new TypeError(
                  `Phase 10 phase ${index + 1} requirements must be a non-empty array.`,
                );
              }

              return phase.requirements.map((requirement, requirementIndex) => {
                if (!isRecord(requirement)) {
                  throw new TypeError(
                    `Phase 10 phase ${index + 1} requirements must contain objects.`,
                  );
                }

                if (!isPhase10RequirementType(requirement.type)) {
                  throw new TypeError(
                    `Phase 10 phase ${index + 1} requirement ${requirementIndex + 1} type must be "set", "color", or "run".`,
                  );
                }

                return {
                  size: parsePositiveInteger(
                    requirement.size,
                    `Phase 10 phase ${index + 1} requirement ${requirementIndex + 1} size`,
                  ),
                  type: requirement.type,
                } satisfies Phase10PhaseRequirement;
              });
            })();

      if (requirements) {
        return normalizePhaseDefinition({ label, requirements }, index);
      }

      const setCount = parsePositiveInteger(
        phase.setCount,
        `Phase 10 phase ${index + 1} setCount`,
      );
      const setSize = parsePositiveInteger(
        phase.setSize,
        `Phase 10 phase ${index + 1} setSize`,
      );

      return normalizePhaseDefinition({ label, setCount, setSize }, index);
    });
  }

  return setup;
}

export function parsePhase10Move(value: unknown): Phase10Move {
  if (!isRecord(value)) {
    throw new TypeError('Phase 10 move must be an object.');
  }

  const playerId = value.playerId;
  const kind = value.kind;
  const createdAt = value.createdAt;
  const payload = value.payload;

  if (typeof playerId !== 'string') {
    throw new TypeError('Phase 10 move playerId must be a string.');
  }

  if (typeof kind !== 'string') {
    throw new TypeError('Phase 10 move kind must be a string.');
  }

  if (typeof createdAt !== 'string') {
    throw new TypeError('Phase 10 move createdAt must be a string.');
  }

  if (!isRecord(payload)) {
    throw new TypeError('Phase 10 move payload must be an object.');
  }

  if (kind === 'draw-card') {
    if (payload.source !== 'draw' && payload.source !== 'discard') {
      throw new TypeError('Phase 10 draw source must be "draw" or "discard".');
    }

    return {
      playerId,
      kind,
      createdAt,
      payload: {
        source: payload.source,
      },
    };
  }

  if (kind === 'lay-phase') {
    if (!Array.isArray(payload.groups)) {
      throw new TypeError('Phase 10 lay-phase groups must be an array.');
    }

    const groups = payload.groups.map((group) => {
      if (
        !Array.isArray(group) ||
        group.some((cardId) => typeof cardId !== 'string')
      ) {
        throw new TypeError('Phase 10 lay-phase groups must contain card ids.');
      }

      return [...group];
    });

    return {
      playerId,
      kind,
      createdAt,
      payload: {
        groups,
      },
    };
  }

  if (kind === 'hit-phase') {
    if (typeof payload.cardId !== 'string') {
      throw new TypeError('Phase 10 hit-phase cardId must be a string.');
    }

    if (typeof payload.targetPlayerId !== 'string') {
      throw new TypeError(
        'Phase 10 hit-phase targetPlayerId must be a string.',
      );
    }

    if (
      typeof payload.groupIndex !== 'number' ||
      !Number.isInteger(payload.groupIndex)
    ) {
      throw new TypeError('Phase 10 hit-phase groupIndex must be an integer.');
    }

    return {
      playerId,
      kind,
      createdAt,
      payload: {
        cardId: payload.cardId,
        groupIndex: payload.groupIndex,
        targetPlayerId: payload.targetPlayerId,
      },
    };
  }

  if (kind === 'discard-card') {
    if (typeof payload.cardId !== 'string') {
      throw new TypeError('Phase 10 discard cardId must be a string.');
    }

    if (
      payload.targetPlayerId !== undefined &&
      typeof payload.targetPlayerId !== 'string'
    ) {
      throw new TypeError('Phase 10 discard targetPlayerId must be a string.');
    }

    return {
      playerId,
      kind,
      createdAt,
      payload: {
        cardId: payload.cardId,
        ...(payload.targetPlayerId
          ? { targetPlayerId: payload.targetPlayerId }
          : {}),
      },
    };
  }

  throw new Error(`Unsupported Phase 10 move kind: ${kind}`);
}

export function createPhase10Adapter(): GameAdapter<
  Phase10Setup,
  Phase10State,
  Phase10Move
> {
  return {
    definition: phase10Definition,
    metadata: {
      gameVersion: PHASE_10_GAME_VERSION,
      rulesetVersion: PHASE_10_RULESET_VERSION,
    },
    validateSetup: parsePhase10Setup,
    validateMove: parsePhase10Move,
    createInitialState({
      executionMode,
      matchId,
      players,
      setup,
    }): MatchState<Phase10State> {
      if (players.length < 2 || players.length > 4) {
        throw new Error('Phase 10 supports between 2 and 4 players.');
      }

      const orderedPlayers = playerOrder(players);
      const rules = {
        ...defaultPhase10Rules,
        ...setup.rules,
      };
      const seed = setup.seed ?? 'phase-10';
      const phaseDefinitions = createPhaseDefinitions(rules, setup.phases);
      const deal = dealRound(orderedPlayers, rules.handSize, `${seed}:round:1`);
      const phases: Record<PlayerId, Phase10PlayerPhaseState> = {};
      const firstPhase = phaseDefinitions[0]!;

      for (const player of orderedPlayers) {
        phases[player.playerId] = {
          label: firstPhase.label,
          laidGroups: null,
          phaseIndex: 0,
          phaseNumber: 1,
        };
      }

      return {
        matchId,
        gameId: phase10Definition.gameId,
        players: orderedPlayers,
        activePlayerId: orderedPlayers[0]!.playerId,
        turn: 1,
        executionMode,
        state: {
          discardPile: deal.discardPile,
          drawPile: deal.drawPile,
          drawnCardThisTurn: false,
          hands: deal.hands,
          lastEvent: `${firstPhase.label} started`,
          phaseDefinitions,
          phases,
          round: 1,
          rules,
          seed,
          skippedPlayerIds: [],
          winnerPlayerId: null,
        },
      };
    },
    listLegalMoves(state): readonly Phase10Move[] {
      if (state.state.winnerPlayerId) {
        return [];
      }

      const activePlayerId = state.activePlayerId;
      const hand = state.state.hands[activePlayerId] ?? [];
      const phase = activePhase(state, activePlayerId);
      const phaseDefinition = phaseDefinitionForPlayer(state, activePlayerId);

      if (!state.state.drawnCardThisTurn) {
        const legalMoves: Phase10Move[] = [];
        const recyclableState = recycleDrawPile(state.state);

        if (recyclableState.drawPile.length > 0) {
          legalMoves.push({
            playerId: activePlayerId,
            kind: 'draw-card',
            createdAt: '2026-04-26T12:00:00.000Z',
            payload: {
              source: 'draw',
            },
          });
        }

        if (state.state.discardPile.length > 0) {
          legalMoves.push({
            playerId: activePlayerId,
            kind: 'draw-card',
            createdAt: '2026-04-26T12:00:00.000Z',
            payload: {
              source: 'discard',
            },
          });
        }

        return legalMoves;
      }

      const legalMoves: Phase10Move[] = [];

      if (!phase.laidGroups) {
        const groups = findPhaseGroups(hand, phaseDefinition);

        if (groups) {
          legalMoves.push(createLayMove(activePlayerId, groups));
        }
      }

      legalMoves.push(...createHitMoves(state, activePlayerId));
      legalMoves.push(...createDiscardMoves(state, activePlayerId));
      return legalMoves;
    },
    isLegalMove(state, move): boolean {
      return this.listLegalMoves(state).some((candidate) =>
        areMovesEquivalent(candidate, move),
      );
    },
    applyMove(state, move): MatchState<Phase10State> {
      if (move.kind === 'draw-card') {
        return applyDrawMove(state, move);
      }

      if (!state.state.drawnCardThisTurn) {
        throw new Error(
          'Players must draw before laying, hitting, or discarding.',
        );
      }

      if (move.kind === 'lay-phase') {
        return applyLayMove(state, move);
      }

      if (move.kind === 'hit-phase') {
        return applyHitMove(state, move);
      }

      return applyDiscardMove(state, move);
    },
    isMatchComplete(state) {
      return Boolean(state.state.winnerPlayerId);
    },
    getResult(state): MatchResult | null {
      if (!state.state.winnerPlayerId) {
        return null;
      }

      return {
        matchId: state.matchId,
        gameId: state.gameId,
        winnerIds: [state.state.winnerPlayerId],
        rankings: rankedPlayers(state),
        finishedAt: '2026-04-26T12:00:59.000Z',
        executionMode: state.executionMode,
      };
    },
  };
}

export function projectPhase10PlayerView(
  input: LocalGameSessionProjectViewInput<Phase10State, Phase10Move>,
): Phase10PlayerView {
  const focusPlayerId = input.viewerPlayerId ?? input.state.activePlayerId;
  const focusPhase =
    input.state.state.phases[focusPlayerId] ??
    input.state.state.phases[input.state.activePlayerId];

  return {
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
      ? `Winner: ${
          input.participants.find(
            (player) => player.playerId === input.matchResult?.winnerIds[0],
          )?.displayName ?? input.matchResult.winnerIds[0]
        }`
      : null,
    phaseOrder: input.state.state.phaseDefinitions.map((phase) => phase.label),
    phaseLabel:
      focusPhase?.label ?? input.state.state.phaseDefinitions[0]?.label ?? '',
    players: input.participants.map((participant) => ({
      controller: participant.controller,
      displayName: participant.displayName,
      handCount: input.state.state.hands[participant.playerId]?.length ?? 0,
      isActive: participant.playerId === input.state.activePlayerId,
      isViewer: participant.playerId === input.viewerPlayerId,
      laidGroups:
        input.state.state.phases[participant.playerId]?.laidGroups ?? [],
      phaseComplete: Boolean(
        input.state.state.phases[participant.playerId]?.laidGroups,
      ),
      phaseLabel:
        input.state.state.phases[participant.playerId]?.label ??
        input.state.state.phaseDefinitions[0]?.label ??
        '',
      phaseNumber:
        input.state.state.phases[participant.playerId]?.phaseNumber ?? 1,
      playerId: participant.playerId,
      skipped: input.state.state.skippedPlayerIds.includes(
        participant.playerId,
      ),
      visibleCards:
        participant.playerId === input.viewerPlayerId
          ? [...(input.state.state.hands[participant.playerId] ?? [])]
          : [],
    })),
    round: input.state.state.round,
    status: input.state.state.lastEvent,
    viewerPlayerId: input.viewerPlayerId,
  };
}

export function choosePhase10Move(input: {
  legalMoves: readonly Phase10Move[];
  playerId: PlayerId;
  seed: number | string;
  state: MatchState<Phase10State>;
}): Phase10Move | null {
  const ownMoves = input.legalMoves.filter(
    (move) => move.playerId === input.playerId,
  );

  if (ownMoves.length === 0) {
    return null;
  }

  const phaseMove = ownMoves.find(
    (move): move is Phase10LayPhaseMove => move.kind === 'lay-phase',
  );

  if (phaseMove) {
    return phaseMove;
  }

  const hitMove = ownMoves.find(
    (move): move is Phase10HitPhaseMove => move.kind === 'hit-phase',
  );

  if (hitMove) {
    return hitMove;
  }

  const discardDraw = ownMoves.find(
    (move): move is Phase10DrawCardMove =>
      move.kind === 'draw-card' && move.payload.source === 'discard',
  );

  if (
    discardDraw &&
    isHelpfulDiscard(
      input.state.state.discardPile[input.state.state.discardPile.length - 1] ??
        null,
      input.state,
      input.playerId,
    )
  ) {
    return discardDraw;
  }

  const drawMove = ownMoves.find(
    (move): move is Phase10DrawCardMove =>
      move.kind === 'draw-card' && move.payload.source === 'draw',
  );

  if (drawMove) {
    return drawMove;
  }

  const discardMoves = ownMoves.filter(
    (move): move is Phase10DiscardCardMove => move.kind === 'discard-card',
  );

  if (discardMoves.length > 0) {
    return chooseDiscardMove(input.state, input.playerId, discardMoves);
  }

  const random = createSeededRandom(
    `${input.seed}:${input.playerId}:${input.state.turn}`,
  );
  return ownMoves[Math.floor(random() * ownMoves.length)] ?? null;
}

export function createPhase10Bots(
  participants: readonly SessionParticipant[],
  seed: number | string = 'phase-10-bot',
): Partial<Record<PlayerId, LocalGameSessionBot<Phase10State, Phase10Move>>> {
  return Object.fromEntries(
    participants
      .filter((participant) => participant.controller === 'bot')
      .map((participant) => {
        const bot: LocalGameSessionBot<Phase10State, Phase10Move> = {
          chooseMove({ legalMoves, playerId, state }) {
            return choosePhase10Move({
              legalMoves,
              playerId,
              seed: `${seed}:${state.matchId}`,
              state,
            });
          },
        };

        return [participant.playerId, bot] as const;
      }),
  );
}

export const phase10ExamplePresets: readonly Phase10ExamplePreset[] = [
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
      { playerId: 'p2', displayName: 'Run Bot', seat: 2, controller: 'bot' },
      {
        playerId: 'p3',
        displayName: 'Player Two',
        seat: 3,
        controller: 'human',
      },
      { playerId: 'p4', displayName: 'Set Bot', seat: 4, controller: 'bot' },
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
      { playerId: 'p2', displayName: 'Phase Bot', seat: 2, controller: 'bot' },
    ],
  },
] as const;

export function getPhase10ExamplePreset(
  presetId: Phase10ExamplePresetId,
): Phase10ExamplePreset {
  return (
    phase10ExamplePresets.find((preset) => preset.id === presetId) ??
    phase10ExamplePresets[0]!
  );
}

export const phase10CatalogEntry: Phase10CatalogEntry = {
  definition: phase10Definition,
  metadata: {
    presets: phase10ExamplePresets,
    route: '/phase-10',
    supportsBots: true,
  },
};
