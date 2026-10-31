import {
  formatPhase10RequirementLabel,
  getPhase10PhaseRequirements,
} from './phase-definitions.ts';
import type {
  Phase10Card,
  Phase10Color,
  Phase10LaidGroup,
  Phase10PhaseDefinition,
  Phase10PhaseRequirement,
} from './types.ts';

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

export function isValidRequirementGroup(
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

export function toLaidGroup(
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

export function appendToLaidGroup(
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

export function toPhaseGroupErrorLabel(requirement: Phase10PhaseRequirement) {
  if (requirement.type === 'set') {
    return `set of ${requirement.size}`;
  }

  if (requirement.type === 'color') {
    return `${requirement.size} cards of one color`;
  }

  return `street of ${requirement.size}`;
}

function canExtendGroup(
  group: readonly Phase10Card[],
  card: Phase10Card,
  requirement: Phase10PhaseRequirement,
) {
  if (card.kind !== 'number') {
    return true;
  }

  return group.every((member) => {
    if (member.kind !== 'number') {
      return true;
    }

    if (requirement.type === 'color') {
      return member.color === card.color;
    }

    if (typeof member.value !== 'number' || typeof card.value !== 'number') {
      return true;
    }

    return requirement.type === 'set'
      ? member.value === card.value
      : member.value !== card.value &&
          Math.abs(member.value - card.value) < requirement.size;
  });
}

/**
 * Yields valid groups in lexicographic card order, skipping prefixes that no
 * valid group can start with, so the first match stays the same as testing
 * every combination while most of them are never built.
 */
function* validRequirementGroups(
  cards: readonly Phase10Card[],
  requirement: Phase10PhaseRequirement,
  startIndex = 0,
  group: readonly Phase10Card[] = [],
): Generator<Phase10Card[]> {
  if (group.length >= requirement.size) {
    if (isValidRequirementGroup(group, requirement)) {
      yield [...group];
    }

    return;
  }

  const lastStartIndex = cards.length - (requirement.size - group.length);

  for (let index = startIndex; index <= lastStartIndex; index += 1) {
    const card = cards[index]!;

    if (canExtendGroup(group, card, requirement)) {
      yield* validRequirementGroups(cards, requirement, index + 1, [
        ...group,
        card,
      ]);
    }
  }
}

export function findPhaseGroups(
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
    const options = validRequirementGroups(
      usableCards.filter((card) => !usedCardIds.has(card.id)),
      requirement,
    );

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
