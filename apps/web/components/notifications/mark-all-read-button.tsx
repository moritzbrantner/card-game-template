'use client';

import { useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

type MarkAllReadButtonProps = {
  disabled?: boolean;
  onSuccess?: () => void;
};

export function MarkAllReadButton({ disabled = false, onSuccess }: MarkAllReadButtonProps) {
  const t = useTranslations('NotificationsPage');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const response = await fetch('/api/notifications/read', {
      method: 'POST',
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, t('actions.markAllReadError'));
      setError(problem.message);
      setPending(false);
      return;
    }

    onSuccess?.();
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={disabled || pending} onClick={handleClick}>
        {pending ? t('actions.markingAllRead') : t('actions.markAllRead')}
      </Button>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
