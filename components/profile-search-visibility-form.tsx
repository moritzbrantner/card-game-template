'use client';

import { useState } from 'react';

import { readProblemDetail } from '@/src/http/problem-client';

type ProfileSearchVisibilityFormProps = {
  initialIsSearchable: boolean;
  labels: {
    title: string;
    description: string;
    saving: string;
    successEnabled: string;
    successDisabled: string;
    error: string;
  };
};

export function ProfileSearchVisibilityForm({
  initialIsSearchable,
  labels,
}: ProfileSearchVisibilityFormProps) {
  const [isSearchable, setIsSearchable] = useState(initialIsSearchable);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckedChange(nextChecked: boolean) {
    const previousValue = isSearchable;

    setIsSearchable(nextChecked);
    setIsPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/profile/searchable', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ isSearchable: nextChecked }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, labels.error);
        setIsSearchable(previousValue);
        setError(problem.message);
        return;
      }

      setMessage(nextChecked ? labels.successEnabled : labels.successDisabled);
    } catch {
      setIsSearchable(previousValue);
      setError(labels.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start justify-between gap-4 rounded-2xl border p-4 dark:border-zinc-800">
        <div>
          <p className="font-medium">{labels.title}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{labels.description}</p>
        </div>
        <input
          type="checkbox"
          role="switch"
          aria-checked={isSearchable}
          aria-label={labels.title}
          checked={isSearchable}
          disabled={isPending}
          onChange={(event) => handleCheckedChange(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
      </label>

      {isPending ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{labels.saving}</p> : null}
      {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
