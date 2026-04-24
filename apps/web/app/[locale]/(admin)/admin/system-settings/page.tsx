import { revalidatePath } from 'next/cache';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AppRole } from '@/lib/authorization';
import { isSuperAdmin } from '@/lib/authorization';
import { appPermissionKeys, appPermissionMetadata } from '@/lib/authorization';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import {
  adminReportWindows,
  isAdminReportWindow,
} from '@/src/domain/admin-reports/use-cases';
import {
  getRolePermissionAssignments,
  hasPermissionForRole,
  saveRolePermissionAssignments,
} from '@/src/domain/authorization/service';
import { createTranslator } from '@/src/i18n/messages';
import type {
  FeatureFlagKey,
  SiteSettingKey,
} from '@/src/site-config/contracts';
import {
  getAnalyticsPruneStatus,
  getAdminAnalyticsSettings,
  listFeatureFlags,
  listSiteSettings,
  upsertFeatureFlag,
  upsertSiteSetting,
} from '@/src/site-config/service';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

const roleOrder = [
  'SUPERADMIN',
  'ADMIN',
  'MANAGER',
  'USER',
] as const satisfies readonly AppRole[];

async function forbidUnlessAllowed(
  permission: 'admin.systemSettings.edit' | 'admin.systemSettings.read',
) {
  const session = await getAuthSession();

  if (!(await hasPermissionForRole(session?.user.role, permission))) {
    throw new Error('Forbidden');
  }
}

async function saveSetting(formData: FormData) {
  'use server';

  await forbidUnlessAllowed('admin.systemSettings.edit');

  const key = String(formData.get('key')) as SiteSettingKey;
  const value = String(formData.get('value') ?? '');
  const locale = String(formData.get('locale') ?? 'en');

  await upsertSiteSetting(key, value);
  revalidatePath(`/${locale}/admin/system-settings`);
}

async function saveFlag(formData: FormData) {
  'use server';

  await forbidUnlessAllowed('admin.systemSettings.edit');

  const key = String(formData.get('key')) as FeatureFlagKey;
  const enabled = formData.get('enabled') === 'on';
  const description = String(formData.get('description') ?? '');
  const locale = String(formData.get('locale') ?? 'en');

  await upsertFeatureFlag(key, enabled, description);
  revalidatePath(`/${locale}/admin/system-settings`);
}

async function saveAnalyticsSettings(formData: FormData) {
  'use server';

  await forbidUnlessAllowed('admin.systemSettings.edit');

  const locale = String(formData.get('locale') ?? 'en');
  const retentionDaysRaw = String(formData.get('retentionDays') ?? '');
  const defaultWindowRaw = String(formData.get('defaultWindow') ?? '');
  const retentionDays = Number.parseInt(retentionDaysRaw, 10);
  const defaultWindow = isAdminReportWindow(defaultWindowRaw)
    ? defaultWindowRaw
    : '7d';

  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error('Retention days must be a positive integer.');
  }

  await Promise.all([
    upsertSiteSetting(
      'analytics.pageVisitRetentionDays',
      String(retentionDays),
    ),
    upsertSiteSetting('analytics.defaultAdminReportWindow', defaultWindow),
  ]);
  revalidatePath(`/${locale}/admin/system-settings`);
}

async function saveRolePermissions(formData: FormData) {
  'use server';

  await forbidUnlessAllowed('admin.systemSettings.edit');

  const locale = String(formData.get('locale') ?? 'en');
  const role = String(formData.get('role') ?? '') as AppRole;
  const permissions = formData
    .getAll('permission')
    .filter((value): value is string => typeof value === 'string');
  const currentAssignments = await getRolePermissionAssignments();

  await saveRolePermissionAssignments({
    ...currentAssignments,
    [role]: permissions,
  });

  revalidatePath(`/${locale}/admin/system-settings`);
}

export default async function SystemSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.systemSettings');
  const session = await requirePermission(locale, 'admin.systemSettings.read');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const canEditAuthorization = await hasPermissionForRole(
    session.user.role,
    'admin.systemSettings.edit',
  );
  const [
    settings,
    flags,
    analyticsSettings,
    analyticsPruneStatus,
    rolePermissions,
  ] = await Promise.all([
    listSiteSettings(),
    listFeatureFlags(),
    getAdminAnalyticsSettings(),
    getAnalyticsPruneStatus(),
    getRolePermissionAssignments(),
  ]);

  return (
    <AdminPageShell
      title={t('systemSettings.title')}
      description={t('systemSettings.description')}
      adminPages={adminPages}
    >
      {isSuperAdmin(session.user.role) ? (
        <LocalizedLink
          href="/admin/system-settings/functionality"
          locale={locale}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'w-fit',
          })}
        >
          Open functionality controls
        </LocalizedLink>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Analytics settings</CardTitle>
          <CardDescription>
            Control how long analytics data is retained and which report window
            loads by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={saveAnalyticsSettings}
            className="grid gap-4 rounded-2xl border p-4 dark:border-zinc-800 md:grid-cols-2"
          >
            <input type="hidden" name="locale" value={locale} />

            <label className="space-y-2">
              <span className="block text-sm font-medium">
                Page visit retention days
              </span>
              <input
                type="number"
                name="retentionDays"
                min={1}
                defaultValue={analyticsSettings.pageVisitRetentionDays}
                disabled={!canEditAuthorization}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium">
                Default admin report window
              </span>
              <select
                name="defaultWindow"
                defaultValue={analyticsSettings.defaultAdminReportWindow}
                disabled={!canEditAuthorization}
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
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {analyticsPruneStatus.pruningPolicy}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Last successful analytics prune run:{' '}
                {analyticsPruneStatus.lastSuccessfulRunAt ??
                  'No successful run recorded yet.'}
              </p>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={!canEditAuthorization}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
              >
                Save analytics settings
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site settings</CardTitle>
          <CardDescription>
            These values drive metadata, branding, and support contact surfaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.map((setting) => (
            <form
              key={setting.key}
              action={saveSetting}
              className="grid gap-3 rounded-2xl border p-4 dark:border-zinc-800 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]"
            >
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
                disabled={!canEditAuthorization}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                disabled={!canEditAuthorization}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
              >
                Save
              </button>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <CardDescription>
            Flags gate public product surfaces without changing canonical MDX
            content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flags.map((flag) => (
            <form
              key={flag.key}
              action={saveFlag}
              className="grid gap-3 rounded-2xl border p-4 dark:border-zinc-800 md:grid-cols-[minmax(0,220px)_auto_minmax(0,1fr)_auto]"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="key" value={flag.key} />
              <div>
                <p className="font-medium">{flag.key}</p>
                <Badge variant="outline">feature flag</Badge>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={flag.enabled}
                  disabled={!canEditAuthorization}
                />
                Enabled
              </label>
              <input
                type="text"
                name="description"
                defaultValue={flag.description ?? ''}
                placeholder="Optional operator note"
                disabled={!canEditAuthorization}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                disabled={!canEditAuthorization}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
              >
                Save
              </button>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role permissions</CardTitle>
          <CardDescription>
            Every protected action is mapped to an explicit permission, and each
            role is assigned the permissions it should inherit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            <p>
              Admins can review and update the effective role-permission matrix
              here.
            </p>
            <p className="mt-2">
              Changes take effect across protected pages, routes, and admin
              tools after save.
            </p>
          </div>

          {roleOrder.map((role) => (
            <form
              key={role}
              action={saveRolePermissions}
              className="space-y-4 rounded-2xl border p-4 dark:border-zinc-800"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="role" value={role} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {t(`users.notifications.roles.${role}`)}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {rolePermissions[role].length} assigned permissions
                  </p>
                </div>
                <Badge variant="outline">{role}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {appPermissionKeys.map((permission) => (
                  <label
                    key={`${role}-${permission}`}
                    className="rounded-2xl border p-3 text-sm dark:border-zinc-800"
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="permission"
                        value={permission}
                        defaultChecked={rolePermissions[role].includes(
                          permission,
                        )}
                        disabled={!canEditAuthorization}
                      />
                      <span className="space-y-1">
                        <span className="block font-medium">
                          {appPermissionMetadata[permission].label}
                        </span>
                        <span className="block text-zinc-600 dark:text-zinc-300">
                          {appPermissionMetadata[permission].description}
                        </span>
                        <span className="block font-mono text-xs text-zinc-500">
                          {permission}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!canEditAuthorization}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
                >
                  Save role permissions
                </button>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
