import { revalidateTag, unstable_cache } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';

import { defaultRolePermissionAssignments } from '@/lib/authorization';
import { getEnv } from '@/src/config/env';
import { getDb } from '@/src/db/client';
import { featureFlags, siteAnnouncements, siteSettings } from '@/src/db/schema';
import { failure, success, type ServiceResult } from '@/src/domain/shared/result';
import { getLogger } from '@/src/observability/logger';
import type { AppLocale } from '@/i18n/routing';
import type {
  AnalyticsSiteSettingKey,
  FeatureFlagKey,
  PublicSiteConfig,
  PublicSiteSettingKey,
  SiteSettingKey,
} from '@/src/site-config/contracts';
import { analyticsSiteSettingKeys, featureFlagKeys, publicSiteSettingKeys } from '@/src/site-config/contracts';
import type { AdminReportWindow } from '@/src/domain/admin-reports/use-cases';

export const siteAnnouncementStatuses = ['draft', 'scheduled', 'published', 'archived'] as const;
export type SiteAnnouncementStatus = (typeof siteAnnouncementStatuses)[number];

export type SiteAnnouncementRecord = {
  id: string;
  locale: string;
  title: string;
  body: string;
  href: string | null;
  status: SiteAnnouncementStatus;
  publishAt: string | null;
  unpublishAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SiteAnnouncementInput = {
  id?: string;
  locale: AppLocale;
  title: string;
  body: string;
  href?: string;
  status: SiteAnnouncementStatus;
  publishAt?: Date | null;
  unpublishAt?: Date | null;
};

export type SiteAnnouncementValidationErrors = Partial<Record<'title' | 'body' | 'status' | 'publishAt' | 'unpublishAt', string>>;

export type SiteAnnouncementError = {
  message: string;
  fieldErrors: SiteAnnouncementValidationErrors;
};

export type SaveAnnouncementResult = ServiceResult<{
  id: string;
  locale: AppLocale;
  status: SiteAnnouncementStatus;
  publishAt: Date | null;
  unpublishAt: Date | null;
}, SiteAnnouncementError>;

export type AdminAnalyticsSettings = {
  pageVisitRetentionDays: number;
  defaultAdminReportWindow: AdminReportWindow;
};

export type AnalyticsPruneStatus = {
  pruningPolicy: string;
  lastSuccessfulRunAt: string | null;
};

type SiteSettingsRows = Awaited<ReturnType<ReturnType<typeof getDb>['query']['siteSettings']['findMany']>>;
type FeatureFlagRows = Awaited<ReturnType<ReturnType<typeof getDb>['query']['featureFlags']['findMany']>>;
type SiteAnnouncementRows = Awaited<ReturnType<ReturnType<typeof getDb>['query']['siteAnnouncements']['findMany']>>;

const CACHE_TTL_MS = 60_000;
const SITE_CONFIG_TAG = 'site-config';
const ACTIVE_ANNOUNCEMENTS_TAG = 'site-announcements';

const siteConfigDefaults: Record<SiteSettingKey, string> = {
  'site.name': 'Next Template',
  'site.url': getEnv().site.url,
  'seo.defaultTitle': 'Next Template',
  'seo.titleSuffix': ' | Next Template',
  'seo.defaultDescription': 'Next.js application with auth, admin examples, and Drizzle/Postgres persistence.',
  'seo.defaultOgImage': '',
  'contact.supportEmail': 'support@example.com',
  'analytics.pageVisitRetentionDays': '365',
  'analytics.defaultAdminReportWindow': '7d',
  'authorization.rolePermissions': JSON.stringify(defaultRolePermissionAssignments),
  'foundation.featureOverrides': JSON.stringify({}),
};

const featureFlagDefaults: Record<FeatureFlagKey, boolean> = {
  'marketing.blog': true,
  'marketing.changelog': true,
  'marketing.announcements': true,
  'analytics.pageVisits': true,
};

let siteConfigCache:
  | {
      expiresAt: number;
      value: PublicSiteConfig;
    }
  | undefined;
let databaseReadFallbackExpiresAt = 0;
let databaseReadFallbackLoggedAt = 0;
const databaseReadFallbackErrorCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  '42P01',
]);

function normalizeBoolean(value: number) {
  return value === 1;
}

function isInvalidDate(value: Date | null | undefined) {
  return value instanceof Date && Number.isNaN(value.getTime());
}

function invalidateSiteConfigCache() {
  siteConfigCache = undefined;
}

function hasActiveDatabaseReadFallback() {
  return databaseReadFallbackExpiresAt > Date.now();
}

function getDefaultPublicSiteConfig(): PublicSiteConfig {
  return {
    siteName: siteConfigDefaults['site.name'],
    siteUrl: siteConfigDefaults['site.url'],
    seo: {
      defaultTitle: siteConfigDefaults['seo.defaultTitle'],
      titleSuffix: siteConfigDefaults['seo.titleSuffix'],
      defaultDescription: siteConfigDefaults['seo.defaultDescription'],
      defaultOgImage: siteConfigDefaults['seo.defaultOgImage'] || null,
    },
    contact: {
      supportEmail: siteConfigDefaults['contact.supportEmail'],
    },
    flags: Object.fromEntries(
      featureFlagKeys.map((key) => [key, featureFlagDefaults[key]]),
    ) as Record<FeatureFlagKey, boolean>,
  };
}

export function shouldUseDatabaseReadFallback(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current = error;

  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);

    const code = 'code' in current && typeof current.code === 'string' ? current.code : undefined;
    const message = 'message' in current && typeof current.message === 'string' ? current.message : undefined;

    if (code && databaseReadFallbackErrorCodes.has(code)) {
      return true;
    }

    if (message === 'DATABASE_URL is not set') {
      return true;
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return false;
}

function logReadFallback(error: unknown, operation: string) {
  getLogger({ subsystem: 'site-config', operation }).warn(
    { err: error },
    'Using default site configuration data because the database is unavailable',
  );
}

function activateDatabaseReadFallback(error: unknown, operation: string) {
  const now = Date.now();

  databaseReadFallbackExpiresAt = now + CACHE_TTL_MS;

  if (now - databaseReadFallbackLoggedAt >= CACHE_TTL_MS) {
    databaseReadFallbackLoggedAt = now;
    logReadFallback(error, operation);
  }
}

export async function listSiteSettings() {
  let rows: SiteSettingsRows;

  if (hasActiveDatabaseReadFallback()) {
    rows = [];
  } else {
    try {
      rows = await getDb().query.siteSettings.findMany({
        orderBy: (table, { asc }) => [asc(table.key)],
      });
    } catch (error) {
      if (!shouldUseDatabaseReadFallback(error)) {
        throw error;
      }

      activateDatabaseReadFallback(error, 'listSiteSettings');
      rows = [];
    }
  }

  return publicSiteSettingKeys.map((key) => ({
    key,
    value: rows.find((row) => row.key === key)?.value ?? siteConfigDefaults[key],
  }));
}

export async function upsertSiteSetting(key: SiteSettingKey, value: string) {
  await getDb()
    .insert(siteSettings)
    .values({
      key,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });

  invalidateSiteConfigCache();
  revalidateTag(SITE_CONFIG_TAG, 'max');
}

export async function listFeatureFlags() {
  let rows: FeatureFlagRows;

  if (hasActiveDatabaseReadFallback()) {
    rows = [];
  } else {
    try {
      rows = await getDb().query.featureFlags.findMany({
        orderBy: (table, { asc }) => [asc(table.key)],
      });
    } catch (error) {
      if (!shouldUseDatabaseReadFallback(error)) {
        throw error;
      }

      activateDatabaseReadFallback(error, 'listFeatureFlags');
      rows = [];
    }
  }

  return featureFlagKeys.map((key) => ({
    key,
    enabled: rows.find((row) => row.key === key)?.enabled === 1 ? true : featureFlagDefaults[key],
    description: rows.find((row) => row.key === key)?.description ?? null,
  }));
}

export async function upsertFeatureFlag(key: FeatureFlagKey, enabled: boolean, description?: string) {
  await getDb()
    .insert(featureFlags)
    .values({
      key,
      enabled: enabled ? 1 : 0,
      description: description?.trim() || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: {
        enabled: enabled ? 1 : 0,
        description: description?.trim() || null,
        updatedAt: new Date(),
      },
    });

  invalidateSiteConfigCache();
  revalidateTag(SITE_CONFIG_TAG, 'max');
}

async function loadPublicSiteConfig(): Promise<PublicSiteConfig> {
  if (siteConfigCache && siteConfigCache.expiresAt > Date.now()) {
    return siteConfigCache.value;
  }

  let value = getDefaultPublicSiteConfig();

  if (!hasActiveDatabaseReadFallback()) {
    try {
      const [settingRows, flagRows] = await Promise.all([
        getDb()
          .select()
          .from(siteSettings)
          .where(inArray(siteSettings.key, [...publicSiteSettingKeys])),
        getDb()
          .select()
          .from(featureFlags)
          .where(inArray(featureFlags.key, [...featureFlagKeys])),
      ]);

      const settings = Object.fromEntries(
        publicSiteSettingKeys.map((key) => [key, settingRows.find((row) => row.key === key)?.value ?? siteConfigDefaults[key]]),
      ) as Record<PublicSiteSettingKey, string>;

      const flags = Object.fromEntries(
        featureFlagKeys.map((key) => [key, normalizeBoolean(flagRows.find((row) => row.key === key)?.enabled ?? (featureFlagDefaults[key] ? 1 : 0))]),
      ) as Record<FeatureFlagKey, boolean>;

      value = {
        siteName: settings['site.name'],
        siteUrl: settings['site.url'],
        seo: {
          defaultTitle: settings['seo.defaultTitle'],
          titleSuffix: settings['seo.titleSuffix'],
          defaultDescription: settings['seo.defaultDescription'],
          defaultOgImage: settings['seo.defaultOgImage'] || null,
        },
        contact: {
          supportEmail: settings['contact.supportEmail'],
        },
        flags,
      };
    } catch (error) {
      if (!shouldUseDatabaseReadFallback(error)) {
        throw error;
      }

      activateDatabaseReadFallback(error, 'getPublicSiteConfig');
    }
  }

  siteConfigCache = {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return value;
}

const getCachedPublicSiteConfig = unstable_cache(loadPublicSiteConfig, ['public-site-config'], {
  revalidate: CACHE_TTL_MS / 1000,
  tags: [SITE_CONFIG_TAG],
});

export async function getPublicSiteConfig(): Promise<PublicSiteConfig> {
  return getCachedPublicSiteConfig();
}

function parsePositiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseAdminReportWindow(value: string): AdminReportWindow {
  return value === '24h' || value === '30d' || value === '7d' ? value : '7d';
}

async function listSiteSettingsByKeys(keys: readonly SiteSettingKey[]) {
  let rows: SiteSettingsRows;

  if (hasActiveDatabaseReadFallback()) {
    rows = [];
  } else {
    try {
      rows = await getDb().query.siteSettings.findMany({
        where: (table, { inArray: innerInArray }) => innerInArray(table.key, [...keys]),
        orderBy: (table, { asc }) => [asc(table.key)],
      });
    } catch (error) {
      if (!shouldUseDatabaseReadFallback(error)) {
        throw error;
      }

      activateDatabaseReadFallback(error, 'listSiteSettingsByKeys');
      rows = [];
    }
  }

  return keys.map((key) => ({
    key,
    value: rows.find((row) => row.key === key)?.value ?? siteConfigDefaults[key],
  }));
}

export async function listAnalyticsSettings() {
  return listSiteSettingsByKeys(analyticsSiteSettingKeys);
}

export async function getAdminAnalyticsSettings(): Promise<AdminAnalyticsSettings> {
  const settings = await listAnalyticsSettings();
  const values = Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) as Record<AnalyticsSiteSettingKey, string>;

  return {
    pageVisitRetentionDays: parsePositiveInteger(
      values['analytics.pageVisitRetentionDays'],
      parsePositiveInteger(siteConfigDefaults['analytics.pageVisitRetentionDays'], 365),
    ),
    defaultAdminReportWindow: parseAdminReportWindow(values['analytics.defaultAdminReportWindow']),
  };
}

export async function getAnalyticsPruneStatus(): Promise<AnalyticsPruneStatus> {
  const analyticsSettings = await getAdminAnalyticsSettings();

  if (hasActiveDatabaseReadFallback()) {
    return {
      pruningPolicy: `Prune page visits older than ${analyticsSettings.pageVisitRetentionDays} days.`,
      lastSuccessfulRunAt: null,
    };
  }

  try {
    const [latestRun] = await getDb().query.jobOutbox.findMany({
      where: (table, { and: innerAnd, eq: innerEq }) =>
        innerAnd(innerEq(table.jobName, 'pruneAnalytics'), innerEq(table.status, 'completed')),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      limit: 1,
      columns: {
        updatedAt: true,
      },
    });

    return {
      pruningPolicy: `Prune page visits older than ${analyticsSettings.pageVisitRetentionDays} days.`,
      lastSuccessfulRunAt: latestRun?.updatedAt.toISOString() ?? null,
    };
  } catch (error) {
    if (!shouldUseDatabaseReadFallback(error)) {
      throw error;
    }

    activateDatabaseReadFallback(error, 'getAnalyticsPruneStatus');
    return {
      pruningPolicy: `Prune page visits older than ${analyticsSettings.pageVisitRetentionDays} days.`,
      lastSuccessfulRunAt: null,
    };
  }
}

export async function listAnnouncements(locale?: AppLocale): Promise<SiteAnnouncementRecord[]> {
  let rows: SiteAnnouncementRows;

  if (hasActiveDatabaseReadFallback()) {
    rows = [];
  } else {
    try {
      rows = await getDb().query.siteAnnouncements.findMany({
        where: locale
          ? (table, { eq: equals }) => equals(table.locale, locale)
          : undefined,
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      });
    } catch (error) {
      if (!shouldUseDatabaseReadFallback(error)) {
        throw error;
      }

      activateDatabaseReadFallback(error, 'listAnnouncements');
      rows = [];
    }
  }

  return rows.map((row) => ({
    id: row.id,
    locale: row.locale,
    title: row.title,
    body: row.body,
    href: row.href,
    status: row.status,
    publishAt: row.publishAt?.toISOString() ?? null,
    unpublishAt: row.unpublishAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

async function loadActiveAnnouncements(locale: AppLocale) {
  const now = new Date();

  let rows: SiteAnnouncementRows;

  if (hasActiveDatabaseReadFallback()) {
    rows = [];
  } else {
    try {
      rows = await getDb().query.siteAnnouncements.findMany({
        where: (table, { and, eq: equals, gt, isNull, lte, or }) =>
          and(
            equals(table.locale, locale),
            equals(table.status, 'published'),
            or(isNull(table.publishAt), lte(table.publishAt, now)),
            or(isNull(table.unpublishAt), gt(table.unpublishAt, now)),
          ),
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      });
    } catch (error) {
      if (!shouldUseDatabaseReadFallback(error)) {
        throw error;
      }

      activateDatabaseReadFallback(error, 'getActiveAnnouncements');
      rows = [];
    }
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    href: row.href,
  }));
}

const getCachedActiveAnnouncements = unstable_cache(loadActiveAnnouncements, ['active-announcements'], {
  revalidate: CACHE_TTL_MS / 1000,
  tags: [ACTIVE_ANNOUNCEMENTS_TAG],
});

export async function getActiveAnnouncements(locale: AppLocale) {
  return getCachedActiveAnnouncements(locale);
}

export async function getAnnouncementById(id: string) {
  if (hasActiveDatabaseReadFallback()) {
    return null;
  }

  let row;

  try {
    row = await getDb().query.siteAnnouncements.findFirst({
      where: (table, { eq: equals }) => equals(table.id, id),
    });
  } catch (error) {
    if (!shouldUseDatabaseReadFallback(error)) {
      throw error;
    }

    activateDatabaseReadFallback(error, 'getAnnouncementById');
    return null;
  }

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    locale: row.locale,
    title: row.title,
    body: row.body,
    href: row.href,
    status: row.status,
    publishAt: row.publishAt,
    unpublishAt: row.unpublishAt,
  };
}

export function validateAnnouncementInput(input: SiteAnnouncementInput): ServiceResult<{
  title: string;
  body: string;
  href: string | null;
  status: SiteAnnouncementStatus;
  publishAt: Date | null;
  unpublishAt: Date | null;
}, SiteAnnouncementError> {
  const title = input.title.trim();
  const body = input.body.trim();
  const href = input.href?.trim() || null;
  const publishAt = input.publishAt ?? null;
  const unpublishAt = input.unpublishAt ?? null;
  const fieldErrors: SiteAnnouncementValidationErrors = {};

  if (!title) {
    fieldErrors.title = 'Title is required.';
  }

  if (!body) {
    fieldErrors.body = 'Body is required.';
  }

  if (isInvalidDate(publishAt)) {
    fieldErrors.publishAt = 'Publish time must be a valid date.';
  }

  if (isInvalidDate(unpublishAt)) {
    fieldErrors.unpublishAt = 'Unpublish time must be a valid date.';
  }

  if (input.status === 'scheduled' && !publishAt) {
    fieldErrors.publishAt = 'Scheduled announcements require a publish time.';
  }

  if (unpublishAt && !publishAt && input.status !== 'published') {
    fieldErrors.unpublishAt = 'Choose a publish time before scheduling an unpublish time.';
  }

  if (publishAt && unpublishAt && unpublishAt.getTime() <= publishAt.getTime()) {
    fieldErrors.unpublishAt = 'Unpublish time must be later than publish time.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return failure({
      message: 'Announcement details are invalid.',
      fieldErrors,
    });
  }

  return success({
    title,
    body,
    href,
    status: input.status,
    publishAt,
    unpublishAt,
  });
}

export async function saveAnnouncement(input: SiteAnnouncementInput): Promise<SaveAnnouncementResult> {
  const validated = validateAnnouncementInput(input);

  if (!validated.ok) {
    return validated;
  }

  const id = input.id ?? crypto.randomUUID();
  const now = new Date();

  await getDb()
    .insert(siteAnnouncements)
    .values({
      id,
      locale: input.locale,
      title: validated.data.title,
      body: validated.data.body,
      href: validated.data.href,
      status: validated.data.status,
      publishAt: validated.data.publishAt,
      unpublishAt: validated.data.unpublishAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteAnnouncements.id,
      set: {
        locale: input.locale,
        title: validated.data.title,
        body: validated.data.body,
        href: validated.data.href,
        status: validated.data.status,
        publishAt: validated.data.publishAt,
        unpublishAt: validated.data.unpublishAt,
        updatedAt: now,
      },
    });

  revalidateTag(ACTIVE_ANNOUNCEMENTS_TAG, 'max');
  return success({
    id,
    locale: input.locale,
    status: validated.data.status,
    publishAt: validated.data.publishAt,
    unpublishAt: validated.data.unpublishAt,
  });
}

export async function publishAnnouncementNow(id: string) {
  await getDb()
    .update(siteAnnouncements)
    .set({
      status: 'published',
      updatedAt: new Date(),
    })
    .where(eq(siteAnnouncements.id, id));

  revalidateTag(ACTIVE_ANNOUNCEMENTS_TAG, 'max');
}

export async function archiveAnnouncementNow(id: string) {
  await getDb()
    .update(siteAnnouncements)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(eq(siteAnnouncements.id, id));

  revalidateTag(ACTIVE_ANNOUNCEMENTS_TAG, 'max');
}

export async function deleteAnnouncement(id: string) {
  await getDb().delete(siteAnnouncements).where(eq(siteAnnouncements.id, id));
  revalidateTag(ACTIVE_ANNOUNCEMENTS_TAG, 'max');
}
