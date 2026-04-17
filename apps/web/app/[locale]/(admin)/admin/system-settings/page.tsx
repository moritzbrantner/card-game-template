import { revalidatePath } from 'next/cache';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEnabledAdminPageDefinitions } from '@/src/admin/pages';
import { adminReportWindows, isAdminReportWindow } from '@/src/domain/admin-reports/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import type { FeatureFlagKey, SiteSettingKey } from '@/src/site-config/contracts';
import {
  getAnalyticsPruneStatus,
  getAdminAnalyticsSettings,
  listFeatureFlags,
  listSiteSettings,
  upsertFeatureFlag,
  upsertSiteSetting,
} from '@/src/site-config/service';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

async function saveSetting(formData: FormData) {
  'use server';

  const key = String(formData.get('key')) as SiteSettingKey;
  const value = String(formData.get('value') ?? '');
  const locale = String(formData.get('locale') ?? 'en');

  await upsertSiteSetting(key, value);
  revalidatePath(`/${locale}/admin/system-settings`);
}

async function saveFlag(formData: FormData) {
  'use server';

  const key = String(formData.get('key')) as FeatureFlagKey;
  const enabled = formData.get('enabled') === 'on';
  const description = String(formData.get('description') ?? '');
  const locale = String(formData.get('locale') ?? 'en');

  await upsertFeatureFlag(key, enabled, description);
  revalidatePath(`/${locale}/admin/system-settings`);
}

async function saveAnalyticsSettings(formData: FormData) {
  'use server';

  const locale = String(formData.get('locale') ?? 'en');
  const retentionDaysRaw = String(formData.get('retentionDays') ?? '');
  const defaultWindowRaw = String(formData.get('defaultWindow') ?? '');
  const retentionDays = Number.parseInt(retentionDaysRaw, 10);
  const defaultWindow = isAdminReportWindow(defaultWindowRaw) ? defaultWindowRaw : '7d';

  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error('Retention days must be a positive integer.');
  }

  await Promise.all([
    upsertSiteSetting('analytics.pageVisitRetentionDays', String(retentionDays)),
    upsertSiteSetting('analytics.defaultAdminReportWindow', defaultWindow),
  ]);
  revalidatePath(`/${locale}/admin/system-settings`);
}

export default async function SystemSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('admin.systemSettings');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = getEnabledAdminPageDefinitions();
  const [settings, flags, analyticsSettings, analyticsPruneStatus] = await Promise.all([
    listSiteSettings(),
    listFeatureFlags(),
    getAdminAnalyticsSettings(),
    getAnalyticsPruneStatus(),
  ]);

  return (
    <AdminPageShell title={t('systemSettings.title')} description={t('systemSettings.description')} adminPages={adminPages}>
      <Card>
        <CardHeader>
          <CardTitle>Analytics settings</CardTitle>
          <CardDescription>Control how long analytics data is retained and which report window loads by default.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={saveAnalyticsSettings} className="grid gap-4 rounded-2xl border p-4 dark:border-zinc-800 md:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />

            <label className="space-y-2">
              <span className="block text-sm font-medium">Page visit retention days</span>
              <input
                type="number"
                name="retentionDays"
                min={1}
                defaultValue={analyticsSettings.pageVisitRetentionDays}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium">Default admin report window</span>
              <select
                name="defaultWindow"
                defaultValue={analyticsSettings.defaultAdminReportWindow}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {adminReportWindows.map((window) => (
                  <option key={window} value={window}>
                    {window}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2 rounded-2xl border p-4 dark:border-zinc-800 md:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">Current pruning policy</p>
                <Badge variant="outline">operator only</Badge>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{analyticsPruneStatus.pruningPolicy}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Last successful analytics prune run: {analyticsPruneStatus.lastSuccessfulRunAt ?? 'No successful run recorded yet.'}
              </p>
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
                Save analytics settings
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site settings</CardTitle>
          <CardDescription>These values drive metadata, branding, and support contact surfaces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.map((setting) => (
            <form key={setting.key} action={saveSetting} className="grid gap-3 rounded-2xl border p-4 dark:border-zinc-800 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="key" value={setting.key} />
              <div>
                <p className="font-medium">{setting.key}</p>
                <Badge variant="outline">site setting</Badge>
              </div>
              <input
                type="text"
                name="value"
                defaultValue={setting.value}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
                Save
              </button>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <CardDescription>Flags gate public product surfaces without changing canonical MDX content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flags.map((flag) => (
            <form key={flag.key} action={saveFlag} className="grid gap-3 rounded-2xl border p-4 dark:border-zinc-800 md:grid-cols-[minmax(0,220px)_auto_minmax(0,1fr)_auto]">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="key" value={flag.key} />
              <div>
                <p className="font-medium">{flag.key}</p>
                <Badge variant="outline">feature flag</Badge>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="enabled" defaultChecked={flag.enabled} />
                Enabled
              </label>
              <input
                type="text"
                name="description"
                defaultValue={flag.description ?? ''}
                placeholder="Optional operator note"
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
                Save
              </button>
            </form>
          ))}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
