'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { readProblemDetail } from '@/src/http/problem-client';
import { buildPublicProfileFollowersPath } from '@/src/profile/tags';

type ProfileFollowPanelProps = {
  locale: AppLocale;
  profileUserId: string;
  profileTag: string;
  displayName: string;
  imageUrl: string | null;
  initialFollowerCount: number;
  initialIsFollowing: boolean;
  initialIsBlockedByViewer: boolean;
  isOwnProfile: boolean;
  canManageFollowState: boolean;
  canManageBlockState: boolean;
  canViewFollowersPage: boolean;
  labels: {
    followers: string;
    follow: string;
    unfollow: string;
    following: string;
    unfollowing: string;
    block: string;
    unblock: string;
    blocking: string;
    unblocking: string;
    blockedDescription: string;
    editProfile: string;
    error: string;
  };
};

export function ProfileFollowPanel({
  locale,
  profileUserId,
  profileTag,
  displayName,
  imageUrl,
  initialFollowerCount,
  initialIsFollowing,
  initialIsBlockedByViewer,
  isOwnProfile,
  canManageFollowState,
  canManageBlockState,
  canViewFollowersPage,
  labels,
}: ProfileFollowPanelProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isBlockedByViewer, setIsBlockedByViewer] = useState(initialIsBlockedByViewer);
  const [pendingAction, setPendingAction] = useState<'follow' | 'block' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFollowToggle() {
    const nextIsFollowing = !isFollowing;

    setPendingAction('follow');
    setError(null);

    try {
      const response = await fetch('/api/profile/follow', {
        method: nextIsFollowing ? 'POST' : 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profileUserId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, labels.error);
        setError(problem.message);
        return;
      }

      setIsFollowing(nextIsFollowing);
      setFollowerCount((current) => Math.max(0, current + (nextIsFollowing ? 1 : -1)));
    } catch {
      setError(labels.error);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBlockToggle() {
    const nextIsBlocked = !isBlockedByViewer;

    setPendingAction('block');
    setError(null);

    try {
      const response = await fetch('/api/profile/block', {
        method: nextIsBlocked ? 'POST' : 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profileUserId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, labels.error);
        setError(problem.message);
        return;
      }

      if (nextIsBlocked && isFollowing) {
        setIsFollowing(false);
        setFollowerCount((current) => Math.max(0, current - 1));
      }

      setIsBlockedByViewer(nextIsBlocked);
    } catch {
      setError(labels.error);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="h-28 bg-gradient-to-r from-sky-100 via-white to-emerald-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900" />

        <div className="flex flex-col gap-6 px-6 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="-mt-12 flex items-end gap-4">
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-zinc-100 text-3xl font-semibold text-zinc-700 shadow-sm dark:border-zinc-950 dark:bg-zinc-800 dark:text-zinc-100">
              {imageUrl ? (
                <Image src={imageUrl} alt={displayName} fill sizes="96px" unoptimized className="object-cover" />
              ) : (
                <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>

            <div className="space-y-2 pb-1">
              <h1 className="text-3xl font-semibold tracking-tight">{displayName}</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">/@{profileTag}</p>
              {canViewFollowersPage ? (
                <Link
                  href={buildPublicProfileFollowersPath(profileTag)}
                  locale={locale}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <span className="font-semibold">{followerCount}</span>
                  <span>{labels.followers}</span>
                </Link>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  <span className="font-semibold">{followerCount}</span>
                  <span>{labels.followers}</span>
                </div>
              )}
            </div>
          </div>

          {isOwnProfile ? (
            <Link
              href="/profile"
              locale={locale}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              {labels.editProfile}
            </Link>
          ) : null}

          {!isOwnProfile && canManageFollowState ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {!isBlockedByViewer ? (
                <Button type="button" onClick={handleFollowToggle} disabled={pendingAction !== null}>
                  {pendingAction === 'follow'
                    ? isFollowing
                      ? labels.unfollowing
                      : labels.following
                    : isFollowing
                      ? labels.unfollow
                      : labels.follow}
                </Button>
              ) : null}

              {canManageBlockState ? (
                <Button type="button" variant="outline" onClick={handleBlockToggle} disabled={pendingAction !== null}>
                  {pendingAction === 'block'
                    ? isBlockedByViewer
                      ? labels.unblocking
                      : labels.blocking
                    : isBlockedByViewer
                      ? labels.unblock
                      : labels.block}
                </Button>
              ) : null}
            </div>
          ) : null}

          {!isOwnProfile && !canManageFollowState && canManageBlockState ? (
            <Button type="button" variant="outline" onClick={handleBlockToggle} disabled={pendingAction !== null}>
              {pendingAction === 'block'
                ? isBlockedByViewer
                  ? labels.unblocking
                  : labels.blocking
                : isBlockedByViewer
                  ? labels.unblock
                  : labels.block}
            </Button>
          ) : null}
        </div>
      </div>

      {isBlockedByViewer ? <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{labels.blockedDescription}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </section>
  );
}
