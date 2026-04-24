import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { isAdmin } from '@/lib/authorization';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { updateAdminUserFeatureAccessUseCase } from '@/src/domain/admin-users/use-cases';
import { getAdminUserDetailUseCase } from '@/src/domain/notifications/use-cases';
import { listUserFoundationFeatureStates } from '@/src/foundation/features/access';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

async function saveUserFeatureState(formData: FormData) {
  'use server';

  const locale = String(formData.get('locale') ?? 'en');
  const targetUserId = String(formData.get('targetUserId') ?? '');
  const featureKey = String(
    formData.get('featureKey') ?? '',
  ) as FoundationFeatureKey;
  const enabled = formData.get('enabled') === 'on';
  const session = await getAuthSession();

  if (!session?.user.id) {
    throw new Error('Authentication required.');
  }

  const result = await updateAdminUserFeatureAccessUseCase({
    actorUserId: session.user.id,
    targetUserId,
    featureKey,
    enabled,
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/${locale}/admin/users/${targetUserId}`);
  revalidatePath(`/${locale}/admin/users/${targetUserId}/functionality`);
}

export default async function AdminUserFunctionalityPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale: rawLocale, userId } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.users');
  const session = await requirePermission(locale, 'admin.users.read');
  const [adminPages, user] = await Promise.all([
    getAuthorizedAdminPageDefinitions(session.user.role),
    getAdminUserDetailUseCase(userId),
  ]);

  if (!user || isAdmin(user.role)) {
    notFound();
  }

  const featureStates = await listUserFoundationFeatureStates({
    id: user.id,
    role: user.role,
  });
  const disabledCount = featureStates.filter(
    (state) => !state.userEnabled,
  ).length;
  const effectiveCount = featureStates.filter(
    (state) => state.effectiveEnabled,
  ).length;

  return (
    <AdminPageShell
      title={`User functionality: ${user.displayName}`}
      description="Admins can disable supported functionality for individual non-admin accounts without changing that user’s role."
      adminPages={adminPages}
    >
      <LocalizedLink
        href={`/admin/users/${user.id}`}
        locale={locale}
        className={buttonVariants({
          variant: 'ghost',
          size: 'sm',
          className: 'w-fit',
        })}
      >
        Back to user inspection
      </LocalizedLink>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Role" value={user.role} />
        <MetricCard label="Effective features" value={String(effectiveCount)} />
        <MetricCard
          label="User-specific disables"
          value={String(disabledCount)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Override scope</CardTitle>
          <CardDescription>
            These controls only affect functionality that supports per-user
            overrides for signed-in members and managers. Site-wide disables
            still take precedence over any user-level setting.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {featureStates.map((state) => (
          <form
            key={state.featureKey}
            action={saveUserFeatureState}
            className="grid gap-4 rounded-[1.75rem] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70 lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="targetUserId" value={user.id} />
            <input type="hidden" name="featureKey" value={state.featureKey} />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold tracking-tight">
                  {state.label}
                </p>
                <Badge variant="outline">{state.category}</Badge>
                <Badge
                  variant={state.effectiveEnabled ? 'secondary' : 'default'}
                >
                  {state.effectiveEnabled ? 'Available now' : 'Unavailable now'}
                </Badge>
                {!state.siteEnabled ? (
                  <Badge variant="outline">site-wide disable active</Badge>
                ) : null}
                {!state.manifestEnabled ? (
                  <Badge variant="outline">missing from current build</Badge>
                ) : null}
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {state.description}
              </p>

              <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300 md:grid-cols-3">
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    Feature key:
                  </span>{' '}
                  {state.featureKey}
                </p>
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    Site-wide status:
                  </span>{' '}
                  {state.siteEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    User status:
                  </span>{' '}
                  {state.userEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={state.userEnabled ?? true}
                  disabled={!state.manifestEnabled}
                />
                Enabled for this user
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
