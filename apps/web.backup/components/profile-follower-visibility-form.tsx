'use client';

import { useState } from 'react';

import { readProblemDetail } from '@/src/http/problem-client';
import {
  type FollowerVisibilityRole,
  followerVisibilityRoles,
} from '@/src/profile/follower-visibility';

type ProfileFollowerVisibilityFormProps = {
  initialFollowerVisibility: FollowerVisibilityRole;
  labels: {
    saving: string;
    success: string;
    error: string;
    options: Record<
      FollowerVisibilityRole,
      { title: string; description: string }
    >;
  };
};

export function ProfileFollowerVisibilityForm({
  initialFollowerVisibility,
  labels,
}: ProfileFollowerVisibilityFormProps) {
  const [followerVisibility, setFollowerVisibility] = useState(
    initialFollowerVisibility,
  );
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVisibilityChange(
    nextVisibility: FollowerVisibilityRole,
  ) {
    if (nextVisibility === followerVisibility) {
      return;
    }

    const previousValue = followerVisibility;

    setFollowerVisibility(nextVisibility);
    setIsPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/profile/follower-visibility', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ followerVisibility: nextVisibility }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, labels.error);
        setFollowerVisibility(previousValue);
        setError(problem.message);
        return;
      }

      setMessage(labels.success);
    } catch {
      setFollowerVisibility(previousValue);
      setError(labels.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        {followerVisibilityRoles.map((visibilityRole) => {
          const option = labels.options[visibilityRole];
          const isSelected = followerVisibility === visibilityRole;

          return (
            <button
              key={visibilityRole}
              type="button"
              aria-pressed={isSelected}
              disabled={isPending}
              onClick={() => handleVisibilityChange(visibilityRole)}
              className={[
                'rounded-2xl border p-4 text-left transition-colors',
                isSelected
                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                  : 'border-zinc-200 bg-white/70 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-600',
              ].join(' ')}
            >
              <p className="font-medium">{option.title}</p>
              <p className="mt-2 text-sm opacity-80">{option.description}</p>
            </button>
          );
        })}
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {labels.saving}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
