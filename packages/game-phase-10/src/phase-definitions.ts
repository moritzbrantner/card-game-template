import type {
  Phase10PhaseDefinition,
  Phase10PhaseRequirement,
  Phase10Rules,
} from './types.ts';

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

export function normalizePhaseDefinition(
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

export function createPhaseDefinitions(
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
