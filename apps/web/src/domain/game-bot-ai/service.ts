import { eq } from 'drizzle-orm';

import {
  chooseRandomUnoLegalMove,
  type UnoMove,
  type UnoState,
} from '@repo/game-uno';

import { getDb } from '@/src/db/client';
import { siteSettings } from '@/src/db/schema';
import { upsertSiteSetting } from '@/src/site-config/service';

export const UNO_BOT_AI_SITE_SETTING_KEY = 'game.uno.botAiProfiles';

export const unoBotAiStrategies = [
  'balanced',
  'aggressive',
  'conservative',
  'random',
] as const;
export type UnoBotAiStrategy = (typeof unoBotAiStrategies)[number];

export type UnoBotAiProfileId =
  | 'house-bot'
  | 'table-bot'
  | 'player-two-bot'
  | 'fallback-bot';

export type UnoBotAiProfile = {
  id: UnoBotAiProfileId;
  displayName: string;
  description: string;
  enabled: boolean;
  strategy: UnoBotAiStrategy;
  aggression: number;
  actionCardBias: number;
  wildCardBias: number;
  drawBias: number;
  unoCallBias: number;
  notes: string;
};

type UnoBotAiProfileInput = {
  id?: unknown;
  displayName?: unknown;
  enabled?: unknown;
  strategy?: unknown;
  aggression?: unknown;
  actionCardBias?: unknown;
  wildCardBias?: unknown;
  drawBias?: unknown;
  unoCallBias?: unknown;
  notes?: unknown;
};

type ChooseUnoBotMoveInput = {
  legalMoves: readonly UnoMove[];
  playerId: string;
  profile: UnoBotAiProfile;
  seed: number | string;
  state: UnoState;
};

type BotParticipantLike = {
  displayName: string;
};

const defaultProfiles: readonly UnoBotAiProfile[] = [
  {
    id: 'house-bot',
    displayName: 'House Bot',
    description:
      'Default duel opponent. Keeps wilds for later unless they are clearly best.',
    enabled: true,
    strategy: 'balanced',
    aggression: 50,
    actionCardBias: 50,
    wildCardBias: -100,
    drawBias: 0,
    unoCallBias: 90,
    notes: '',
  },
  {
    id: 'table-bot',
    displayName: 'Table Bot',
    description:
      'Pressure-oriented table opponent that spends action cards early.',
    enabled: true,
    strategy: 'aggressive',
    aggression: 80,
    actionCardBias: 95,
    wildCardBias: -30,
    drawBias: -60,
    unoCallBias: 95,
    notes: '',
  },
  {
    id: 'player-two-bot',
    displayName: 'Player Two Bot',
    description:
      'Conservative converted hotseat player used in solo mixed-table matches.',
    enabled: true,
    strategy: 'conservative',
    aggression: 35,
    actionCardBias: 5,
    wildCardBias: -160,
    drawBias: 35,
    unoCallBias: 80,
    notes: '',
  },
  {
    id: 'fallback-bot',
    displayName: 'Fallback Bot',
    description: 'Shared AI for bot seats without a named profile.',
    enabled: true,
    strategy: 'balanced',
    aggression: 50,
    actionCardBias: 40,
    wildCardBias: -100,
    drawBias: 0,
    unoCallBias: 90,
    notes: '',
  },
];

function isUnoBotAiProfileId(value: unknown): value is UnoBotAiProfileId {
  return (
    typeof value === 'string' &&
    defaultProfiles.some((profile) => profile.id === value)
  );
}

function isUnoBotAiStrategy(value: unknown): value is UnoBotAiStrategy {
  return (
    typeof value === 'string' &&
    (unoBotAiStrategies as readonly string[]).includes(value)
  );
}

function clampInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function trimText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.slice(0, maxLength);
}

function normalizeProfile(
  input: UnoBotAiProfileInput,
  fallback: UnoBotAiProfile,
): UnoBotAiProfile {
  return {
    id: fallback.id,
    displayName:
      trimText(input.displayName, fallback.displayName, 80) ||
      fallback.displayName,
    description: fallback.description,
    enabled:
      typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    strategy: isUnoBotAiStrategy(input.strategy)
      ? input.strategy
      : fallback.strategy,
    aggression: clampInteger(input.aggression, fallback.aggression, 0, 100),
    actionCardBias: clampInteger(
      input.actionCardBias,
      fallback.actionCardBias,
      -200,
      200,
    ),
    wildCardBias: clampInteger(
      input.wildCardBias,
      fallback.wildCardBias,
      -200,
      200,
    ),
    drawBias: clampInteger(input.drawBias, fallback.drawBias, -200, 200),
    unoCallBias: clampInteger(input.unoCallBias, fallback.unoCallBias, 0, 100),
    notes: trimText(input.notes, fallback.notes, 280),
  };
}

export function getDefaultUnoBotAiProfiles(): readonly UnoBotAiProfile[] {
  return defaultProfiles.map((profile) => ({ ...profile }));
}

export function normalizeUnoBotAiProfiles(
  input: unknown,
): readonly UnoBotAiProfile[] {
  const rawProfiles = Array.isArray(input) ? input : [];

  return defaultProfiles.map((fallback) => {
    const rawProfile = rawProfiles.find(
      (candidate): candidate is UnoBotAiProfileInput => {
        return (
          typeof candidate === 'object' &&
          candidate !== null &&
          isUnoBotAiProfileId((candidate as { id?: unknown }).id) &&
          (candidate as { id: unknown }).id === fallback.id
        );
      },
    );

    return normalizeProfile(rawProfile ?? {}, fallback);
  });
}

function parseProfiles(value: string | null | undefined) {
  if (!value) {
    return getDefaultUnoBotAiProfiles();
  }

  try {
    return normalizeUnoBotAiProfiles(JSON.parse(value));
  } catch {
    return getDefaultUnoBotAiProfiles();
  }
}

async function loadUnoBotAiProfiles(): Promise<readonly UnoBotAiProfile[]> {
  try {
    const [row] = await getDb()
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, UNO_BOT_AI_SITE_SETTING_KEY))
      .limit(1);

    return parseProfiles(row?.value);
  } catch {
    return getDefaultUnoBotAiProfiles();
  }
}

export async function listUnoBotAiProfiles(): Promise<
  readonly UnoBotAiProfile[]
> {
  return loadUnoBotAiProfiles();
}

export async function saveUnoBotAiProfile(
  input: UnoBotAiProfileInput,
): Promise<UnoBotAiProfile> {
  if (!isUnoBotAiProfileId(input.id)) {
    throw new Error('Unknown bot AI profile.');
  }

  const currentProfiles = await loadUnoBotAiProfiles();
  const fallback = defaultProfiles.find((profile) => profile.id === input.id)!;
  const nextProfile = normalizeProfile(input, fallback);
  const nextProfiles = normalizeUnoBotAiProfiles(
    currentProfiles.map((profile) =>
      profile.id === nextProfile.id ? nextProfile : profile,
    ),
  );

  await upsertSiteSetting(
    UNO_BOT_AI_SITE_SETTING_KEY,
    JSON.stringify(nextProfiles),
  );

  return nextProfile;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveUnoBotAiProfileForParticipant(
  participant: BotParticipantLike,
  profiles: readonly UnoBotAiProfile[],
): UnoBotAiProfile {
  const normalizedName = normalizeName(participant.displayName);
  const profileId = normalizedName.includes('house')
    ? 'house-bot'
    : normalizedName.includes('table')
      ? 'table-bot'
      : normalizedName.includes('player-two')
        ? 'player-two-bot'
        : 'fallback-bot';

  return (
    profiles.find((profile) => profile.id === profileId) ??
    profiles.find((profile) => profile.id === 'fallback-bot') ??
    defaultProfiles[3]!
  );
}

export function chooseUnoBotMove(input: ChooseUnoBotMoveInput): UnoMove | null {
  if (!input.profile.enabled) {
    return null;
  }

  return chooseRandomUnoLegalMove({
    legalMoves: input.legalMoves,
    playerId: input.playerId,
    seed: `${input.seed}:${input.state.lastEvent}`,
  });
}
