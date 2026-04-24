'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import type { ProfileDirectoryEntry } from '@/src/domain/profile/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';

type ProfileBlockedUsersFormProps = {
  initialProfiles: ProfileDirectoryEntry[];
  labels: {
    empty: string;
    unblock: string;
    unblocking: string;
    error: string;
    success: string;
  };
};

export function ProfileBlockedUsersForm({
  initialProfiles,
  labels,
}: ProfileBlockedUsersFormProps) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUnblock(profile: ProfileDirectoryEntry) {
    setPendingUserId(profile.userId);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch('/api/profile/block', {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userId: profile.userId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, labels.error);
        setError(problem.message);
        return;
      }

      setProfiles((current) =>
        current.filter(
          (currentProfile) => currentProfile.userId !== profile.userId,
        ),
      );
      setFeedback(labels.success);
    } catch {
      setError(labels.error);
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {labels.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.userId}
              className="flex items-center justify-between gap-3 rounded-2xl border p-3 dark:border-zinc-800"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  imageUrl={profile.imageUrl}
                  displayName={profile.displayName}
                />
                <div className="min-w-0">
                  <Link
                    href={`/profile/@${profile.tag}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {profile.displayName}
                  </Link>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    /@{profile.tag}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingUserId === profile.userId}
                onClick={() => handleUnblock(profile)}
              >
                {pendingUserId === profile.userId
                  ? labels.unblocking
                  : labels.unblock}
              </Button>
            </div>
          ))}
        </div>
      )}

      {feedback ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}

function Avatar({
  imageUrl,
  displayName,
}: {
  imageUrl: string | null;
  displayName: string;
}) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="48px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
      )}
    </div>
  );
}
