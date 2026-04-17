'use client';

import { useState, type FormEvent } from 'react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { readProblemDetail } from '@/src/http/problem-client';

type ProfileDisplayNameFormProps = {
  currentDisplayName: string;
  labels: {
    label: string;
    placeholder: string;
    save: string;
    saving: string;
    success: string;
  };
};

export function ProfileDisplayNameForm({ currentDisplayName, labels }: ProfileDisplayNameFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/profile/display-name', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, 'Unable to update your display name right now. Please try again.');
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    setState({ success: true });
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="displayName" className="text-sm font-medium">
          {labels.label}
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          minLength={2}
          maxLength={60}
          defaultValue={currentDisplayName}
          placeholder={labels.placeholder}
          className="block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700"
          required
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.save}
      </Button>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{labels.success}</p> : null}
    </form>
  );
}
