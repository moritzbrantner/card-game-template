import {
  defaultPhase10Rules,
  normalizePhaseDefinition,
} from './phase-definitions.ts';
import type {
  Phase10Move,
  Phase10PhaseRequirement,
  Phase10Setup,
} from './types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPhase10RequirementType(
  value: unknown,
): value is Phase10PhaseRequirement['type'] {
  return value === 'set' || value === 'color' || value === 'run';
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
