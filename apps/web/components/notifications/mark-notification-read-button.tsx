'use client';

import { useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { readProblemDetail } from '@/src/http/problem-client';

type ButtonVariant = 'default' | 'ghost' | 'outline';
type ButtonSize = 'default' | 'sm';

type MarkNotificationReadButtonProps = {
  notificationId: string;
  label: string;
  pendingLabel: string;
  errorLabel: string;
  onSuccess?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  errorClassName?: string;
};

export function MarkNotificationReadButton({
  notificationId,
  label,
  pendingLabel,
  errorLabel,
  onSuccess,
  variant = 'ghost',
  size = 'sm',
  className,
  errorClassName = 'text-sm text-red-600 dark:text-red-400',
}: MarkNotificationReadButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, errorLabel);
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
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? pendingLabel : label}
      </Button>
      {error ? <p className={errorClassName}>{error}</p> : null}
    </div>
  );
}
