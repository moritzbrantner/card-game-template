import { AdminNotificationComposer } from '@/components/admin/admin-notification-composer';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LocalizedLink } from '@/i18n/server-link';
import { getEnabledAdminPageDefinitions } from '@/src/admin/pages';
import { getAdminUsersPageDataUseCase } from '@/src/domain/notifications/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

const userMetricKeys = ['privileged', 'operational', 'member'] as const;
const workflowKeys = ['inspect', 'broadcast', 'suspend'] as const;

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('admin.users');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = getEnabledAdminPageDefinitions();
  const data = await getAdminUsersPageDataUseCase();

  return (
    <AdminPageShell title={t('users.title')} description={t('users.description')} adminPages={adminPages}>
      <div className="grid gap-4 md:grid-cols-3">
        {userMetricKeys.map((metricKey) => (
          <Card key={metricKey}>
            <CardHeader>
              <CardDescription>{t(`users.metrics.${metricKey}.label`)}</CardDescription>
              <CardTitle className="text-2xl">{String(data.metrics[metricKey])}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{t(`users.metrics.${metricKey}.detail`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('users.tableTitle')}</CardTitle>
            <CardDescription>{t('users.tableDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.columns.user')}</TableHead>
                  <TableHead>{t('users.columns.role')}</TableHead>
                  <TableHead>{t('users.columns.status')}</TableHead>
                  <TableHead>{t('users.columns.lastSeen')}</TableHead>
                  <TableHead>{t('users.columns.notifications')}</TableHead>
                  <TableHead className="text-right">{t('users.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={user.role === 'ADMIN' || user.role === 'SUPERADMIN' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell><Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>{t(`users.status.${user.status}`)}</Badge></TableCell>
                    <TableCell>{formatDateTime(user.lastActivityAt, locale, t('users.lastActivityFallback'))}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>{t('users.notifications.total', { count: user.totalNotifications })}</p>
                        <p className="text-zinc-600 dark:text-zinc-300">{t('users.notifications.unread', { count: user.unreadNotifications })}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <LocalizedLink href={`/admin/users/${user.id}`} locale={locale} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                          {t('users.actions.inspect')}
                        </LocalizedLink>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>{t('users.notifications.title')}</CardTitle>
            <CardDescription>{t('users.notifications.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminNotificationComposer userOptions={data.users.map((user) => ({ id: user.id, displayName: user.displayName, email: user.email, role: user.role }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('users.workflowTitle')}</CardTitle>
          <CardDescription>{t('users.workflowDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {workflowKeys.map((workflowKey) => (
            <div key={workflowKey} className="rounded-2xl border p-4 dark:border-zinc-800">
              <p className="font-medium">{t(`users.workflows.${workflowKey}.title`)}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{t(`users.workflows.${workflowKey}.description`)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}

function formatDateTime(value: string | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
