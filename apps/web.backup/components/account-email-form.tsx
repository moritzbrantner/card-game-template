'use client';

import { useState, type FormEvent } from 'react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readProblemDetail } from '@/src/http/problem-client';

type AccountEmailFormProps = {
  currentEmail: string;
  labels: {
    currentEmail: string;
    newEmail: string;
    currentPassword: string;
    save: string;
    saving: string;
    success: string;
    genericError: string;
  };
};

export function AccountEmailForm({ currentEmail, labels }: AccountEmailFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [displayEmail, setDisplayEmail] = useState(currentEmail);
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData(event.currentTarget);
    const submittedEmail = formData.get('email');
    const response = await fetch('/api/account/email', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.genericError);
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    if (typeof submittedEmail === 'string') {
      setDisplayEmail(submittedEmail.trim().toLowerCase());
    }

    event.currentTarget.reset();
    setState({ success: true });
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-account-email">{labels.currentEmail}</Label>
        <Input id="current-account-email" type="email" value={displayEmail} readOnly className="bg-zinc-50 dark:bg-zinc-900" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="next-account-email">{labels.newEmail}</Label>
        <Input
          id="next-account-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-email-password">{labels.currentPassword}</Label>
        <Input
          id="account-email-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.save}
      </Button>

      <div role="status" className="space-y-1">
        {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{labels.success}</p> : null}
      </div>
    </form>
  );
}
