'use client';

import Image from 'next/image';
import { useDeferredValue, useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ProfileDirectoryEntry } from '@/src/domain/profile/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

type PeopleDirectoryProps = {
  initialFollowing: ProfileDirectoryEntry[];
};

export function PeopleDirectory({ initialFollowing }: PeopleDirectoryProps) {
  const t = useTranslations('PeoplePage');
  const searchErrorMessage = t('search.error');
  const followErrorMessage = t('actions.error');
  const blockErrorMessage = t('actions.blockError');
  const [followingProfiles, setFollowingProfiles] = useState(initialFollowing);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [searchResults, setSearchResults] = useState<ProfileDirectoryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();

    if (!normalizedQuery) {
      setIsSearching(false);
      setSearchError(null);
      setSearchResults([]);
      return;
    }

    const abortController = new AbortController();

    async function loadSearchResults() {
      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await fetch(`/api/profile/search?query=${encodeURIComponent(normalizedQuery)}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          const problem = await readProblemDetail(response, searchErrorMessage);
          setSearchError(problem.message);
          setSearchResults([]);
          return;
        }

        const payload = (await response.json()) as { profiles?: ProfileDirectoryEntry[] };
        setSearchResults(payload.profiles ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setSearchError(searchErrorMessage);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    void loadSearchResults();

    return () => {
      abortController.abort();
    };
  }, [deferredQuery, refreshKey, searchErrorMessage]);

  function markPendingUser(userId: string, isPending: boolean) {
    setPendingUserIds((current) => {
      if (isPending) {
        return current.includes(userId) ? current : [...current, userId];
      }

      return current.filter((currentUserId) => currentUserId !== userId);
    });
  }

  async function updateFollowState(profile: ProfileDirectoryEntry, shouldFollow: boolean) {
    markPendingUser(profile.userId, true);
    setActionError(null);

    try {
      const response = await fetch('/api/profile/follow', {
        method: shouldFollow ? 'POST' : 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profile.userId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, followErrorMessage);
        setActionError(problem.message);
        return;
      }

      if (shouldFollow) {
        setFollowingProfiles((current) =>
          current.some((currentProfile) => currentProfile.userId === profile.userId) ? current : [profile, ...current],
        );
      } else {
        setFollowingProfiles((current) => current.filter((currentProfile) => currentProfile.userId !== profile.userId));
      }

      setRefreshKey((current) => current + 1);
    } catch {
      setActionError(followErrorMessage);
    } finally {
      markPendingUser(profile.userId, false);
    }
  }

  async function blockProfile(profile: ProfileDirectoryEntry) {
    markPendingUser(profile.userId, true);
    setActionError(null);

    try {
      const response = await fetch('/api/profile/block', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profile.userId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, blockErrorMessage);
        setActionError(problem.message);
        return;
      }

      setFollowingProfiles((current) => current.filter((currentProfile) => currentProfile.userId !== profile.userId));
      setSearchResults((current) => current.filter((currentProfile) => currentProfile.userId !== profile.userId));
      setRefreshKey((current) => current + 1);
    } catch {
      setActionError(blockErrorMessage);
    } finally {
      markPendingUser(profile.userId, false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-zinc-200 bg-gradient-to-r from-amber-50 via-white to-sky-50 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
          <CardTitle>{t('search.title')}</CardTitle>
          <CardDescription>{t('search.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
          />

          {isSearching ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{t('search.loading')}</p> : null}
          {searchError ? <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p> : null}
          {actionError ? <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p> : null}

          {!deferredQuery.trim() ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {t('search.idle')}
            </div>
          ) : null}

          {deferredQuery.trim() && !isSearching && !searchError && searchResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {t('search.empty')}
            </div>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((profile) => (
                <ProfileRow
                  key={profile.userId}
                  profile={profile}
                  actionLabel={t('actions.follow')}
                  pendingLabel={t('actions.following')}
                  actionVariant="default"
                  isPending={pendingUserIds.includes(profile.userId)}
                  onAction={() => updateFollowState(profile, true)}
                  secondaryActionLabel={t('actions.block')}
                  secondaryPendingLabel={t('actions.blocking')}
                  onSecondaryAction={() => blockProfile(profile)}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('following.title')}</CardTitle>
          <CardDescription>
            {followingProfiles.length > 0
              ? t('following.description', { count: followingProfiles.length })
              : t('following.empty')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {followingProfiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {t('following.empty')}
            </div>
          ) : null}

          {followingProfiles.map((profile) => (
            <ProfileRow
              key={profile.userId}
              profile={profile}
              actionLabel={t('actions.unfollow')}
              pendingLabel={t('actions.unfollowing')}
              actionVariant="outline"
              isPending={pendingUserIds.includes(profile.userId)}
              onAction={() => updateFollowState(profile, false)}
              secondaryActionLabel={t('actions.block')}
              secondaryPendingLabel={t('actions.blocking')}
              onSecondaryAction={() => blockProfile(profile)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileRow({
  profile,
  actionLabel,
  pendingLabel,
  actionVariant,
  isPending,
  onAction,
  secondaryActionLabel,
  secondaryPendingLabel,
  onSecondaryAction,
}: {
  profile: ProfileDirectoryEntry;
  actionLabel: string;
  pendingLabel: string;
  actionVariant: 'default' | 'outline';
  isPending: boolean;
  onAction: () => void;
  secondaryActionLabel?: string;
  secondaryPendingLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border p-3 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar imageUrl={profile.imageUrl} displayName={profile.displayName} />
        <div className="min-w-0">
          <Link href={`/profile/@${profile.tag}`} className="block truncate font-medium hover:underline">
            {profile.displayName}
          </Link>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">/@{profile.tag}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {secondaryActionLabel && onSecondaryAction ? (
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={onSecondaryAction}>
            {isPending ? secondaryPendingLabel : secondaryActionLabel}
          </Button>
        ) : null}

        <Button type="button" variant={actionVariant} size="sm" disabled={isPending} onClick={onAction}>
          {isPending ? pendingLabel : actionLabel}
        </Button>
      </div>
    </div>
  );
}

function Avatar({ imageUrl, displayName }: { imageUrl: string | null; displayName: string }) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
      {imageUrl ? (
        <Image src={imageUrl} alt={displayName} fill sizes="48px" unoptimized className="object-cover" />
      ) : (
        <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
      )}
    </div>
  );
}
