'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { readProblemDetail } from '@/src/http/problem-client';
import {
  buildPublicProfilePath,
  formatProfileTag,
  PROFILE_TAG_MAX_LENGTH,
  PROFILE_TAG_MIN_LENGTH,
} from '@/src/profile/tags';

type ProfileTagFormProps = {
  currentTag: string;
  labels: {
    label: string;
    placeholder: string;
    hint: string;
    save: string;
    saving: string;
    success: string;
  };
};

export function ProfileTagForm({ currentTag, labels }: ProfileTagFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [tag, setTag] = useState(currentTag);
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData();
    formData.set('tag', tag);

    const response = await fetch('/api/profile/tag', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to update your tag right now. Please try again.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    setState({ success: true });
    setPending(false);
    router.refresh();
  }

  const normalizedTag = tag.trim().replace(/^@+/, '').toLowerCase();
  const previewTag = normalizedTag || currentTag || 'your-tag';
  const previewPath = buildPublicProfilePath(previewTag);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="tag" className="text-sm font-medium">
          {labels.label}
        </label>
        <div className="flex items-center rounded-md border border-zinc-300 dark:border-zinc-700">
          <span className="px-3 text-sm text-zinc-500 dark:text-zinc-400">
            @
          </span>
          <input
            id="tag"
            name="tag"
            type="text"
            minLength={PROFILE_TAG_MIN_LENGTH}
            maxLength={PROFILE_TAG_MAX_LENGTH}
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder={labels.placeholder}
            className="block w-full rounded-r-md border-0 bg-transparent p-2 text-sm focus:outline-none"
            required
          />
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {labels.hint} <span className="font-mono">{previewPath}</span>
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatProfileTag(previewTag)}
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.save}
      </Button>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {labels.success}
        </p>
      ) : null}
    </form>
  );
}
