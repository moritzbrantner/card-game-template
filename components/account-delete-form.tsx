'use client';

import { useState, type FormEvent } from 'react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readProblemDetail } from '@/src/http/problem-client';

type AccountDeleteFormProps = {
  labels: {
    currentPassword: string;
    remove: string;
    removing: string;
    redirecting: string;
    genericError: string;
  };
};

export function AccountDeleteForm({ labels }: AccountDeleteFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ error?: string; redirecting?: boolean }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/account/delete', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.genericError);
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    setState({ redirecting: true });
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account-delete-password">{labels.currentPassword}</Label>
        <Input
          id="account-delete-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-400"
      >
        {pending ? labels.removing : labels.remove}
      </Button>

      <div role="status" className="space-y-1">
        {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
        {state.redirecting ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{labels.redirecting}</p> : null}
      </div>
    </form>
  );
}
