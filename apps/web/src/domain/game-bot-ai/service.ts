import { eq } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { siteSettings } from '@/src/db/schema';
import type { GameSiteSettingKey } from '@/src/site-config/contracts';
import { upsertSiteSetting } from '@/src/site-config/service';

import {
  getDefaultPhase10BotAiProfiles,
  getDefaultPokerBotAiProfiles,
  getDefaultUnoBotAiProfiles,
  normalizePhase10BotAiProfiles,
  normalizePokerBotAiProfiles,
  normalizeUnoBotAiProfiles,
  type Phase10BotAiProfile,
  type Phase10BotAiProfileId,
  type PokerBotAiProfile,
  type PokerBotAiProfileId,
  type UnoBotAiProfile,
  type UnoBotAiProfileId,
} from './logic';

export const UNO_BOT_AI_SITE_SETTING_KEY = 'game.uno.botAiProfiles';
export const POKER_BOT_AI_SITE_SETTING_KEY = 'game.poker.botAiProfiles';
export const PHASE10_BOT_AI_SITE_SETTING_KEY = 'game.phase10.botAiProfiles';

type UnoBotAiProfileInput = Partial<Record<keyof UnoBotAiProfile, unknown>>;
type PokerBotAiProfileInput = Partial<Record<keyof PokerBotAiProfile, unknown>>;
type Phase10BotAiProfileInput = Partial<
  Record<keyof Phase10BotAiProfile, unknown>
>;

async function loadProfiles<TProfile>(
  settingKey: GameSiteSettingKey,
  parse: (value: unknown) => readonly TProfile[],
  fallback: () => readonly TProfile[],
) {
  try {
    const [row] = await getDb()
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, settingKey))
      .limit(1);

    if (!row?.value) {
      return fallback();
    }

    return parse(JSON.parse(row.value));
  } catch {
    return fallback();
  }
}

function isKnownProfileId<TProfile extends { id: string }>(
  id: unknown,
  defaults: readonly TProfile[],
): id is TProfile['id'] {
  return (
    typeof id === 'string' && defaults.some((profile) => profile.id === id)
  );
}

async function listProfiles<TProfile>(
  settingKey: GameSiteSettingKey,
  parse: (value: unknown) => readonly TProfile[],
  fallback: () => readonly TProfile[],
) {
  return loadProfiles(settingKey, parse, fallback);
}

async function saveProfiles<TProfile extends { id: string }, TInput>(
  input: TInput & { id?: unknown },
  options: {
    defaults: () => readonly TProfile[];
    list: () => Promise<readonly TProfile[]>;
    normalize: (value: unknown) => readonly TProfile[];
    settingKey: GameSiteSettingKey;
  },
) {
  const defaults = options.defaults();

  if (!isKnownProfileId(input.id, defaults)) {
    throw new Error('Unknown bot AI profile.');
  }

  const currentProfiles = await options.list();
  const nextProfiles = options.normalize(
    currentProfiles.map((profile) =>
      profile.id === input.id ? { ...profile, ...input } : profile,
    ),
  );

  await upsertSiteSetting(options.settingKey, JSON.stringify(nextProfiles));

  return nextProfiles.find((profile) => profile.id === input.id)!;
}

export async function listUnoBotAiProfiles(): Promise<
  readonly UnoBotAiProfile[]
> {
  return listProfiles(
    UNO_BOT_AI_SITE_SETTING_KEY,
    normalizeUnoBotAiProfiles,
    getDefaultUnoBotAiProfiles,
  );
}

export async function saveUnoBotAiProfile(
  input: UnoBotAiProfileInput & { id?: UnoBotAiProfileId | unknown },
): Promise<UnoBotAiProfile> {
  return saveProfiles(input, {
    defaults: getDefaultUnoBotAiProfiles,
    list: listUnoBotAiProfiles,
    normalize: normalizeUnoBotAiProfiles,
    settingKey: UNO_BOT_AI_SITE_SETTING_KEY,
  });
}

export async function listPokerBotAiProfiles(): Promise<
  readonly PokerBotAiProfile[]
> {
  return listProfiles(
    POKER_BOT_AI_SITE_SETTING_KEY,
    normalizePokerBotAiProfiles,
    getDefaultPokerBotAiProfiles,
  );
}

export async function savePokerBotAiProfile(
  input: PokerBotAiProfileInput & { id?: PokerBotAiProfileId | unknown },
): Promise<PokerBotAiProfile> {
  return saveProfiles(input, {
    defaults: getDefaultPokerBotAiProfiles,
    list: listPokerBotAiProfiles,
    normalize: normalizePokerBotAiProfiles,
    settingKey: POKER_BOT_AI_SITE_SETTING_KEY,
  });
}

export async function listPhase10BotAiProfiles(): Promise<
  readonly Phase10BotAiProfile[]
> {
  return listProfiles(
    PHASE10_BOT_AI_SITE_SETTING_KEY,
    normalizePhase10BotAiProfiles,
    getDefaultPhase10BotAiProfiles,
  );
}

export async function savePhase10BotAiProfile(
  input: Phase10BotAiProfileInput & { id?: Phase10BotAiProfileId | unknown },
): Promise<Phase10BotAiProfile> {
  return saveProfiles(input, {
    defaults: getDefaultPhase10BotAiProfiles,
    list: listPhase10BotAiProfiles,
    normalize: normalizePhase10BotAiProfiles,
    settingKey: PHASE10_BOT_AI_SITE_SETTING_KEY,
  });
}

export {
  choosePhase10BotMove,
  choosePokerBotMove,
  chooseUnoBotMove,
  createPhase10BotsFromProfiles,
  getDefaultPhase10BotAiProfiles,
  getDefaultPokerBotAiProfiles,
  getDefaultUnoBotAiProfiles,
  normalizePhase10BotAiProfiles,
  normalizePokerBotAiProfiles,
  normalizeUnoBotAiProfiles,
  resolvePhase10BotAiProfileForParticipant,
  resolvePokerBotAiProfileForParticipant,
  resolveUnoBotAiProfileForParticipant,
} from './logic';
export type {
  Phase10BotAiProfile,
  Phase10BotAiProfileId,
  PokerBotAiProfile,
  PokerBotAiProfileId,
  UnoBotAiProfile,
  UnoBotAiProfileId,
} from './logic';
