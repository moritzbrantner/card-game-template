import { notFound } from 'next/navigation';

import { ProfileFollowPanel } from '@/components/profile-follow-panel';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { getProfileViewByTagUseCase } from '@/src/domain/profile/use-cases';
import { isFeatureEnabledForUser, isSiteFeatureEnabled } from '@/src/foundation/features/access';
import { createTranslator } from '@/src/i18n/messages';
import { buildPublicProfileBlogPath, parseProfileTagSegment } from '@/src/profile/tags';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

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
  const followEnabled = await isFeatureEnabledForUser('profiles.follow', session?.user ?? null);
  const blogEnabled = await isSiteFeatureEnabled('profiles.blog');
  const result = await getProfileViewByTagUseCase(profileTag, viewerUserId);

  if (!result.ok) {
    notFound();
  }

  const profile = result.data;

  return (
    <section className="space-y-4">
      <div className="mx-auto max-w-3xl space-y-1 px-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t('view.title')}</h1>
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

      {blogEnabled ? (
        <Card className="mx-auto max-w-3xl">
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <CardTitle>{blogT('profileCard.title')}</CardTitle>
              <CardDescription>{blogT('profileCard.description', { name: profile.displayName })}</CardDescription>
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{blogT('profileCard.caption')}</p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
