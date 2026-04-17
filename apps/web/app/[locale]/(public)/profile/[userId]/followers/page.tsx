import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { listProfileFollowersByTagUseCase } from '@/src/domain/profile/use-cases';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';
import { createTranslator } from '@/src/i18n/messages';
import { buildPublicProfilePath, parseProfileTagSegment } from '@/src/profile/tags';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

export default async function PublicProfileFollowersPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale: rawLocale, userId: rawTagSegment } = await params;
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('profiles.public');

  if (!isFeatureEnabled('profiles.follow')) {
    notFound();
  }

  const profileTag = parseProfileTagSegment(rawTagSegment);

  if (!profileTag) {
    notFound();
  }

  const t = createTranslator(locale, 'ProfilePage');
  const session = await getAuthSession();
  const viewerUserId = session?.user.id ?? null;
  const result = await listProfileFollowersByTagUseCase(profileTag, viewerUserId);

  if (!result.ok) {
    notFound();
  }

  const { profile, followers, totalFollowerCount, hiddenFollowerCount } = result.data;

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('followersPage.title')}</CardTitle>
            <CardDescription>
              {t('followersPage.description', {
                name: profile.displayName,
                count: totalFollowerCount,
              })}
            </CardDescription>
          </div>

          <LocalizedLink
            href={buildPublicProfilePath(profile.tag)}
            locale={locale}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            {t('followersPage.backToProfile')}
          </LocalizedLink>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t('followersPage.summary', {
              visibleCount: followers.length,
              totalCount: totalFollowerCount,
            })}
          </p>

          {hiddenFollowerCount > 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t('followersPage.hiddenSummary', { count: hiddenFollowerCount })}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {followers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {totalFollowerCount === 0 ? t('followersPage.empty') : t('followersPage.hiddenEmpty')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {followers.map((follower) => (
            <Card key={follower.userId}>
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <div className="min-w-0">
                  <LocalizedLink
                    href={buildPublicProfilePath(follower.tag)}
                    locale={locale}
                    className="block truncate font-medium hover:underline"
                  >
                    {follower.displayName}
                  </LocalizedLink>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">/@{follower.tag}</p>
                </div>

                <Badge variant="secondary">{t(`followersPage.roles.${follower.visibilityRole}`)}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
