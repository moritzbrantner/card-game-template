import { and, eq } from 'drizzle-orm';

import type { AppRole } from '@/lib/authorization';
import { foundationFeatureKeys, type FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import type { AppManifest } from '@/src/app-config/contracts';
import { getDb } from '@/src/db/client';
import { siteSettings, userFeatureOverrides } from '@/src/db/schema';
import { shouldUseDatabaseReadFallback, upsertSiteSetting } from '@/src/site-config/service';

import {
  foundationFeatureMetadata,
  type FoundationFeatureCategory,
  userConfigurableFoundationFeatureKeys,
} from './catalog';
import { isFeatureEnabled } from './runtime';

const FOUNDATION_FEATURE_OVERRIDE_SETTING_KEY = 'foundation.featureOverrides';
export type FeatureRuntimeUser = {
  id: string;
  role: AppRole;
};

export type FoundationFeatureAccessState = {
  featureKey: FoundationFeatureKey;
  label: string;
  description: string;
  category: FoundationFeatureCategory;
  supportsUserOverrides: boolean;
  manifestEnabled: boolean;
  siteEnabled: boolean;
  userEnabled: boolean | null;
  effectiveEnabled: boolean;
};

type FoundationFeatureOverrideMap = Partial<Record<FoundationFeatureKey, boolean>>;

function isFoundationFeatureOverrideMap(value: unknown): value is FoundationFeatureOverrideMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([key, enabled]) => foundationFeatureKeys.includes(key as FoundationFeatureKey) && typeof enabled === 'boolean',
  );
}

function parseSiteWideFeatureOverrideMap(value: string | null | undefined): FoundationFeatureOverrideMap {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isFoundationFeatureOverrideMap(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function canApplyUserFeatureOverrides(featureKey: FoundationFeatureKey, role: AppRole | null | undefined) {
  return foundationFeatureMetadata[featureKey].supportsUserOverrides && role !== 'ADMIN' && role !== 'SUPERADMIN';
}

export function resolveFeatureEnabledState(input: {
  featureKey: FoundationFeatureKey;
  manifestEnabled: boolean;
  siteEnabled?: boolean;
  userEnabled?: boolean | null;
  role?: AppRole | null;
}) {
  if (!input.manifestEnabled) {
    return false;
  }

  if (input.siteEnabled === false) {
    return false;
  }

  if (canApplyUserFeatureOverrides(input.featureKey, input.role) && input.userEnabled === false) {
    return false;
  }

  return true;
}

async function loadSiteWideFeatureOverrideMap() {
  try {
    const row = await getDb().query.siteSettings.findFirst({
      where: (table, { eq: innerEq }) => innerEq(table.key, FOUNDATION_FEATURE_OVERRIDE_SETTING_KEY),
      columns: {
        value: true,
      },
    });

    return parseSiteWideFeatureOverrideMap(row?.value);
  } catch (error) {
    if (!shouldUseDatabaseReadFallback(error)) {
      throw error;
    }

    return {};
  }
}

export async function getSiteWideFeatureOverrideMap() {
  return loadSiteWideFeatureOverrideMap();
}

export async function saveSiteWideFeatureOverride(featureKey: FoundationFeatureKey, enabled: boolean) {
  const currentOverrides = await loadSiteWideFeatureOverrideMap();

  await upsertSiteSetting(
    FOUNDATION_FEATURE_OVERRIDE_SETTING_KEY,
    JSON.stringify({
      ...currentOverrides,
      [featureKey]: enabled,
    } satisfies FoundationFeatureOverrideMap),
  );
}

export async function getUserFeatureOverrideMap(userId: string) {
  try {
    const rows = await getDb().query.userFeatureOverrides.findMany({
      where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
      columns: {
        featureKey: true,
        enabled: true,
      },
    });

    return rows.reduce<FoundationFeatureOverrideMap>((accumulator, row) => {
      if (!foundationFeatureKeys.includes(row.featureKey as FoundationFeatureKey)) {
        return accumulator;
      }

      accumulator[row.featureKey as FoundationFeatureKey] = row.enabled;
      return accumulator;
    }, {});
  } catch (error) {
    if (!shouldUseDatabaseReadFallback(error)) {
      throw error;
    }

    return {};
  }
}

export async function saveUserFeatureOverride(input: {
  userId: string;
  featureKey: FoundationFeatureKey;
  enabled: boolean;
}) {
  if (input.enabled) {
    await getDb()
      .delete(userFeatureOverrides)
      .where(and(eq(userFeatureOverrides.userId, input.userId), eq(userFeatureOverrides.featureKey, input.featureKey)));
    return;
  }

  await getDb()
    .insert(userFeatureOverrides)
    .values({
      userId: input.userId,
      featureKey: input.featureKey,
      enabled: false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userFeatureOverrides.userId, userFeatureOverrides.featureKey],
      set: {
        enabled: false,
        updatedAt: new Date(),
      },
    });
}

export async function isSiteFeatureEnabled(
  featureKey: FoundationFeatureKey,
  manifest: AppManifest = loadActiveApp(),
) {
  const siteWideOverrides = await getSiteWideFeatureOverrideMap();

  return resolveFeatureEnabledState({
    featureKey,
    manifestEnabled: isFeatureEnabled(featureKey, manifest),
    siteEnabled: siteWideOverrides[featureKey] ?? true,
  });
}

export async function isFeatureEnabledForUser(
  featureKey: FoundationFeatureKey,
  user: FeatureRuntimeUser | null | undefined,
  manifest: AppManifest = loadActiveApp(),
) {
  const siteWideOverrides = await getSiteWideFeatureOverrideMap();
  const userOverrides = user?.id ? await getUserFeatureOverrideMap(user.id) : {};

  return resolveFeatureEnabledState({
    featureKey,
    manifestEnabled: isFeatureEnabled(featureKey, manifest),
    siteEnabled: siteWideOverrides[featureKey] ?? true,
    userEnabled: user?.id ? userOverrides[featureKey] ?? null : null,
    role: user?.role,
  });
}

export async function getFoundationFeatureAvailabilityMap(
  user: FeatureRuntimeUser | null | undefined,
  manifest: AppManifest = loadActiveApp(),
) {
  const [siteWideOverrides, userOverrides] = await Promise.all([
    getSiteWideFeatureOverrideMap(),
    user?.id ? getUserFeatureOverrideMap(user.id) : Promise.resolve({} as FoundationFeatureOverrideMap),
  ]);

  return Object.fromEntries(
    foundationFeatureKeys.map((featureKey) => [
      featureKey,
      resolveFeatureEnabledState({
        featureKey,
        manifestEnabled: isFeatureEnabled(featureKey, manifest),
        siteEnabled: siteWideOverrides[featureKey] ?? true,
        userEnabled: user?.id ? userOverrides[featureKey] ?? null : null,
        role: user?.role,
      }),
    ]),
  ) as Record<FoundationFeatureKey, boolean>;
}

export async function listSiteWideFoundationFeatureStates(manifest: AppManifest = loadActiveApp()) {
  const siteWideOverrides = await getSiteWideFeatureOverrideMap();

  return foundationFeatureKeys.map<FoundationFeatureAccessState>((featureKey) => {
    const metadata = foundationFeatureMetadata[featureKey];
    const manifestEnabled = isFeatureEnabled(featureKey, manifest);
    const siteEnabled = siteWideOverrides[featureKey] ?? true;

    return {
      featureKey,
      label: metadata.label,
      description: metadata.description,
      category: metadata.category,
      supportsUserOverrides: metadata.supportsUserOverrides,
      manifestEnabled,
      siteEnabled,
      userEnabled: null,
      effectiveEnabled: resolveFeatureEnabledState({
        featureKey,
        manifestEnabled,
        siteEnabled,
      }),
    };
  });
}

export async function listUserFoundationFeatureStates(
  user: FeatureRuntimeUser,
  manifest: AppManifest = loadActiveApp(),
) {
  const [siteWideOverrides, userOverrides] = await Promise.all([
    getSiteWideFeatureOverrideMap(),
    getUserFeatureOverrideMap(user.id),
  ]);

  return userConfigurableFoundationFeatureKeys.map<FoundationFeatureAccessState>((featureKey) => {
    const metadata = foundationFeatureMetadata[featureKey];
    const manifestEnabled = isFeatureEnabled(featureKey, manifest);
    const siteEnabled = siteWideOverrides[featureKey] ?? true;
    const userEnabled = userOverrides[featureKey] ?? true;

    return {
      featureKey,
      label: metadata.label,
      description: metadata.description,
      category: metadata.category,
      supportsUserOverrides: true,
      manifestEnabled,
      siteEnabled,
      userEnabled,
      effectiveEnabled: resolveFeatureEnabledState({
        featureKey,
        manifestEnabled,
        siteEnabled,
        userEnabled,
        role: user.role,
      }),
    };
  });
}
