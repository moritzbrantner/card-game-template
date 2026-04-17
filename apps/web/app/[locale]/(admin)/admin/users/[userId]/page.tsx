import Image from 'next/image';
import { notFound } from 'next/navigation';

import { AdminNotificationComposer } from '@/components/admin/admin-notification-composer';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminRoleManager } from '@/components/admin/admin-role-manager';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { canManageRoles } from '@/lib/authorization';
import { getEnabledAdminPageDefinitions } from '@/src/admin/pages';
import { getAdminUserDetailUseCase } from '@/src/domain/notifications/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import { notFoundUnlessFeatureEnabled, requireAdmin, resolveLocale } from '@/src/server/page-guards';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale: rawLocale, userId } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAdmin(locale);
  notFoundUnlessFeatureEnabled('admin.users');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = getEnabledAdminPageDefinitions();
  const user = await getAdminUserDetailUseCase(userId);

  if (!user) {
    notFound();
  }

  return (
    <AdminPageShell
      title={t('users.detail.title')}
      description={t('users.detail.description', { name: user.displayName })}
      adminPages={adminPages}
    >
      <LocalizedLink href="/admin/users" locale={locale} className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-fit' })}>
        {t('users.detail.back')}
      </LocalizedLink>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label={t('users.detail.summary.role')} value={user.role} />
        <SummaryCard label={t('users.detail.summary.status')} value={t(`users.status.${user.status}`)} />
        <SummaryCard label={t('users.detail.summary.lastActivity')} value={formatDateTime(user.lastActivityAt, locale, t('users.lastActivityFallback'))} />
        <SummaryCard label={t('users.detail.summary.unread')} value={String(user.unreadNotifications)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('users.detail.profileTitle')}</CardTitle>
              <CardDescription>{t('users.detail.profileDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
              <div className="flex items-start justify-center">
                {user.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt={user.displayName}
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-full border border-zinc-200 object-cover dark:border-zinc-800"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-zinc-300 text-2xl font-semibold dark:border-zinc-700">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailField label={t('users.detail.fields.email')} value={user.email} />
                <DetailField label={t('users.detail.fields.createdAt')} value={formatDateTime(user.createdAt, locale)} />
                <DetailField label={t('users.detail.fields.verified')} value={user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt, locale) : t('users.detail.pending')} />
                <DetailField label={t('users.detail.fields.lockout')} value={user.lockoutUntil ? formatDateTime(user.lockoutUntil, locale) : t('users.detail.none')} />
                <DetailField label={t('users.detail.fields.locale')} value={user.locale ?? t('users.detail.notProvided')} />
                <DetailField label={t('users.detail.fields.timezone')} value={user.timezone ?? t('users.detail.notProvided')} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('users.detail.activityTitle')}</CardTitle>
              <CardDescription>{t('users.detail.activityDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.recentActivity.length > 0 ? user.recentActivity.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{visit.pathname}</p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{visit.href}</p>
                    </div>
                    <Badge variant="outline">{formatDateTime(visit.visitedAt, locale)}</Badge>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{t('users.detail.noActivity')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('users.detail.notificationsTitle')}</CardTitle>
              <CardDescription>{t('users.detail.notificationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.recentNotifications.length > 0 ? user.recentNotifications.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.status === 'unread' ? 'default' : 'secondary'}>{t(`users.detail.notificationStatus.${item.status}`)}</Badge>
                        <span className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">{formatDateTime(item.createdAt, locale)}</span>
                      </div>
                      <h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
                    </div>
                    {item.href ? <Badge variant="outline">{item.href}</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.body}</p>
                </article>
              )) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{t('users.detail.noNotifications')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>{t('users.detail.directNotificationTitle')}</CardTitle>
              <CardDescription>{t('users.detail.directNotificationDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminNotificationComposer
                allowedAudiences={['user']}
                initialAudience="user"
                initialTargetUserId={user.id}
                userOptions={[{ id: user.id, displayName: user.displayName, email: user.email, role: user.role }]}
              />
            </CardContent>
          </Card>

          {canManageRoles(session.user.role) ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('users.detail.roleManager.title')}</CardTitle>
                <CardDescription>{t('users.detail.roleManager.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminRoleManager
                  userId={user.id}
                  currentRole={user.role}
                  disabled={session.user.id === user.id}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t('users.detail.accountHealthTitle')}</CardTitle>
              <CardDescription>{t('users.detail.accountHealthDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <HealthLine label={t('users.detail.health.followers')} value={String(user.followerCount)} />
              <HealthLine label={t('users.detail.health.visits')} value={String(user.visitCount)} />
              <HealthLine label={t('users.detail.health.totalNotifications')} value={String(user.totalNotifications)} />
              <HealthLine label={t('users.detail.health.updatedAt')} value={formatDateTime(user.updatedAt, locale)} />
              <HealthLine label={t('users.detail.health.bio')} value={user.bio ?? t('users.detail.notProvided')} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <Card><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-xl leading-tight">{value}</CardTitle></CardHeader></Card>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border p-4 dark:border-zinc-800"><p className="text-sm text-zinc-600 dark:text-zinc-300">{label}</p><p className="mt-2 font-medium">{value}</p></div>;
}

function HealthLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 rounded-2xl border p-4 dark:border-zinc-800"><p className="text-sm text-zinc-600 dark:text-zinc-300">{label}</p><p className="text-right font-medium">{value}</p></div>;
}

function formatDateTime(value: string | null, locale: string, fallback = 'N/A') {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
