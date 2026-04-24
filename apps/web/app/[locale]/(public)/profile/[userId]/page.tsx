import { notFound } from 'next/navigation';

import { ProfileFollowPanel } from '@/components/profile-follow-panel';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { getPlayerGameHistoryUseCase } from '@/src/domain/game-matches/use-cases';
import { getProfileViewByTagUseCase } from '@/src/domain/profile/use-cases';
import {
  isFeatureEnabledForUser,
  isSiteFeatureEnabled,
} from '@/src/foundation/features/access';
import { createTranslator } from '@/src/i18n/messages';
import {
  buildPublicProfileBlogPath,
  parseProfileTagSegment,
} from '@/src/profile/tags';
import {
  notFoundUnlessFeatureEnabled,
  resolveLocale,
} from '@/src/server/page-guards';

function resolveReplayHref(replayHref: string | null, locale: string) {
  if (!replayHref) {
    return null;
  }

  return replayHref.startsWith('/api') ? replayHref : `/${locale}${replayHref}`;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale: rawLocale, userId: rawTagSegment } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('profiles.public');
  const profileTag = parseProfileTagSegment(rawTagSegment);

  if (!profileTag) {
    notFound();
  }

  const t = createTranslator(locale, 'ProfilePage');
  const blogT = createTranslator(locale, 'BlogPage');
  const session = await getAuthSession();
  const viewerUserId = session?.user.id ?? null;
  const followEnabled = await isFeatureEnabledForUser(
    'profiles.follow',
    session?.user ?? null,
  );
  const blogEnabled = await isSiteFeatureEnabled('profiles.blog');
  const result = await getProfileViewByTagUseCase(profileTag, viewerUserId);

  if (!result.ok) {
    notFound();
  }

  const profile = result.data;
  const gameHistoryResult = await getPlayerGameHistoryUseCase(profile.userId);
  const gameHistory = gameHistoryResult.ok ? gameHistoryResult.data : null;
  const totalMatches = gameHistory?.totals.matches ?? 0;
  const winRate =
    totalMatches > 0
      ? Math.round(((gameHistory?.totals.wins ?? 0) / totalMatches) * 100)
      : 0;

  return (
    <section className="space-y-4">
      <div className="mx-auto max-w-3xl space-y-1 px-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t('view.title')}
        </h1>
        <CardDescription>{t('view.description')}</CardDescription>
      </div>

      <ProfileFollowPanel
        locale={locale}
        profileUserId={profile.userId}
        profileTag={profile.tag}
        displayName={profile.displayName}
        imageUrl={profile.imageUrl}
        initialFollowerCount={profile.followerCount}
        initialIsFollowing={profile.isFollowing}
        initialIsBlockedByViewer={profile.isBlockedByViewer}
        isOwnProfile={profile.isOwnProfile}
        canManageFollowState={Boolean(viewerUserId) && followEnabled}
        canManageBlockState={Boolean(viewerUserId)}
        canViewFollowersPage={followEnabled}
        labels={{
          followers: t('view.followers'),
          follow: t('view.follow'),
          unfollow: t('view.unfollow'),
          following: t('view.following'),
          unfollowing: t('view.unfollowing'),
          block: t('view.block'),
          unblock: t('view.unblock'),
          blocking: t('view.blocking'),
          unblocking: t('view.unblocking'),
          blockedDescription: t('view.blockedDescription'),
          editProfile: t('view.editProfile'),
          error: t('view.error'),
        }}
      />

      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>{t('gameHistory.title')}</CardTitle>
          <CardDescription>{t('gameHistory.description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <dl className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t('gameHistory.matches')}
              </dt>
              <dd className="mt-1 text-2xl font-semibold">{totalMatches}</dd>
            </div>
            <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t('gameHistory.record')}
              </dt>
              <dd className="mt-1 text-2xl font-semibold">
                {t('gameHistory.recordValue', {
                  wins: gameHistory?.totals.wins ?? 0,
                  losses: gameHistory?.totals.losses ?? 0,
                })}
              </dd>
            </div>
            <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t('gameHistory.draws')}
              </dt>
              <dd className="mt-1 text-2xl font-semibold">
                {gameHistory?.totals.draws ?? 0}
              </dd>
            </div>
            <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t('gameHistory.winRate')}
              </dt>
              <dd className="mt-1 text-2xl font-semibold">
                {t('gameHistory.winRateValue', { value: winRate })}
              </dd>
            </div>
          </dl>

          {gameHistory && gameHistory.byGame.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">
                {t('gameHistory.byGame')}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {gameHistory.byGame.map((game) => (
                  <div
                    key={game.gameId}
                    className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{game.gameName}</span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {game.matches}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {t('gameHistory.gameRecord', {
                        wins: game.wins,
                        losses: game.losses,
                        draws: game.draws,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <h2 className="text-base font-semibold">
              {t('gameHistory.recent')}
            </h2>
            {gameHistory && gameHistory.recent.length > 0 ? (
              <div className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {gameHistory.recent.map((match) => {
                  const replayHref = resolveReplayHref(
                    match.replayHref,
                    locale,
                  );

                  return (
                    <div
                      key={match.matchId}
                      className="flex flex-wrap items-center justify-between gap-3 p-3"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{match.gameName}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {t(`gameHistory.outcomes.${match.outcome}`)} &middot;{' '}
                          {match.participants
                            .map((participant) => participant.displayName)
                            .join(', ')}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">
                          {t('gameHistory.matchNote', {
                            moves: match.acceptedMoveCount,
                            turns: match.turnsCompleted,
                          })}
                        </p>
                      </div>

                      {replayHref ? (
                        <a
                          href={replayHref}
                          className={buttonVariants({ variant: 'outline' })}
                        >
                          {t('gameHistory.replay')}
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                {t('gameHistory.empty')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {blogEnabled ? (
        <Card className="mx-auto max-w-3xl">
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <CardTitle>{blogT('profileCard.title')}</CardTitle>
              <CardDescription>
                {blogT('profileCard.description', {
                  name: profile.displayName,
                })}
              </CardDescription>
            </div>

            <LocalizedLink
              href={buildPublicProfileBlogPath(profile.tag)}
              locale={locale}
              className={buttonVariants({ variant: 'default' })}
            >
              {blogT('profileCard.open')}
            </LocalizedLink>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {blogT('profileCard.caption')}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
