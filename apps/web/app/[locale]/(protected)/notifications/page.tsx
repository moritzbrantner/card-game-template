import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { NotificationsFeedCard } from '@/components/notifications/notifications-feed-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getNotificationsPageDataUseCase } from '@/src/domain/notifications/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import { notFoundUnlessFeatureEnabled, requireAuth, resolveLocale } from '@/src/server/page-guards';

const summaryKeys = ['unread', 'today', 'preferences'] as const;

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('notifications');
  const session = await requireAuth(locale);
  const data = await getNotificationsPageDataUseCase(session.user.id);
  const t = createTranslator(locale, 'NotificationsPage');
  const userLabel = session.user.name ?? session.user.email ?? t('fallbackUser');

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden rounded-[2rem] border-zinc-200 bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_26%),radial-gradient(circle_at_right,#dbeafe,transparent_24%),linear-gradient(145deg,#ffffff,#f4f4f5)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,#713f12,transparent_24%),radial-gradient(circle_at_right,#1d4ed8,transparent_24%),linear-gradient(145deg,#09090b,#18181b)]">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{t('badge')}</Badge>
            <Badge variant="outline">{session.user.role ?? 'USER'}</Badge>
          </div>

          <div className="space-y-3">
            <CardTitle className="text-3xl tracking-tight">{t('title')}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {t('description', { name: userLabel })}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-3">
          {summaryKeys.map((key) => (
            <div key={key} className="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-400">{t(`summary.${key}.label`)}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {key === 'unread' ? String(data.unreadCount) : key === 'today' ? String(data.todayCount) : t('summary.preferences.value')}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t(`summary.${key}.hint`)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <NotificationsFeedCard items={data.items} unreadCount={data.unreadCount} />

        <div className="space-y-6">
          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>{t('actions.title')}</CardTitle>
              <CardDescription>{t('actions.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <LocalizedLink href="/profile" locale={locale} className={buttonVariants({ variant: 'default' })}>{t('actions.profile')}</LocalizedLink>
              <LocalizedLink href="/settings" locale={locale} className={buttonVariants({ variant: 'outline' })}>{t('actions.settings')}</LocalizedLink>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>{t('preferences.title')}</CardTitle>
              <CardDescription>{t('preferences.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              <p>{t('preferences.email')}</p>
              <p>{t('preferences.push')}</p>
              <p>{t('preferences.digest')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
