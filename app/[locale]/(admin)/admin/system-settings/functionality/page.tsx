import { revalidatePath } from 'next/cache';

import { isSuperAdmin } from '@/lib/authorization';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { listSiteWideFoundationFeatureStates, saveSiteWideFeatureOverride } from '@/src/foundation/features/access';
import { notFoundUnlessFeatureEnabled, redirectToLocaleHome, requirePermission, resolveLocale } from '@/src/server/page-guards';

async function requireSuperadminOrRedirect(locale: string) {
  const session = await getAuthSession();

  if (!isSuperAdmin(session?.user.role)) {
    redirectToLocaleHome(resolveLocale(locale));
  }
}

async function saveFeatureState(formData: FormData) {
  'use server';

  const locale = String(formData.get('locale') ?? 'en');
  const featureKey = String(formData.get('featureKey') ?? '') as FoundationFeatureKey;
  const enabled = formData.get('enabled') === 'on';

  await requireSuperadminOrRedirect(locale);
  await saveSiteWideFeatureOverride(featureKey, enabled);
  revalidatePath(`/${locale}/admin/system-settings`);
  revalidatePath(`/${locale}/admin/system-settings/functionality`);
}

export default async function SystemFunctionalityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.systemSettings');
  const session = await requirePermission(locale, 'admin.systemSettings.read');

  if (!isSuperAdmin(session.user.role)) {
    redirectToLocaleHome(locale);
  }

  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const featureStates = await listSiteWideFoundationFeatureStates();
  const disabledCount = featureStates.filter((state) => !state.siteEnabled).length;
  const effectiveCount = featureStates.filter((state) => state.effectiveEnabled).length;

  return (
    <AdminPageShell
      title="Functionality controls"
      description="Superadmins can switch product surfaces on or off site wide without changing the active build manifest."
      adminPages={adminPages}
    >
      <LocalizedLink
        href="/admin/system-settings"
        locale={locale}
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-fit' })}
      >
        Back to system settings
      </LocalizedLink>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Configured features" value={String(featureStates.length)} />
        <MetricCard label="Effective features" value={String(effectiveCount)} />
        <MetricCard label="Site-wide disables" value={String(disabledCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>
            Build-time manifest flags are still the hard ceiling. These controls can disable supported functionality site wide,
            but they cannot force-enable functionality that is absent from the current build.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {featureStates.map((state) => (
          <form
            key={state.featureKey}
            action={saveFeatureState}
            className="grid gap-4 rounded-[1.75rem] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70 lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="featureKey" value={state.featureKey} />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold tracking-tight">{state.label}</p>
                <Badge variant="outline">{state.category}</Badge>
                <Badge variant={state.effectiveEnabled ? 'secondary' : 'default'}>
                  {state.effectiveEnabled ? 'Live' : 'Disabled'}
                </Badge>
                {state.supportsUserOverrides ? <Badge variant="outline">user overrides available</Badge> : null}
                {!state.manifestEnabled ? <Badge variant="outline">missing from current build</Badge> : null}
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300">{state.description}</p>

              <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300 md:grid-cols-3">
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">Feature key:</span> {state.featureKey}
                </p>
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">Build status:</span>{' '}
                  {state.manifestEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">Site-wide status:</span>{' '}
                  {state.siteEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={state.siteEnabled}
                  disabled={!state.manifestEnabled}
                />
                Enabled site wide
              </label>

              <button
                type="submit"
                disabled={!state.manifestEnabled}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950"
              >
                Save
              </button>
            </div>
          </form>
        ))}
      </div>
    </AdminPageShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
