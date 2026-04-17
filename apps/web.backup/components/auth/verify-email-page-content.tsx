'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

type VerifyEmailPageContentProps = {
  locale: AppLocale;
  labels: {
    verifying: string;
    success: string;
    error: string;
    loginCta: string;
    registerCta: string;
  };
};

export function VerifyEmailPageContent({ locale, labels }: VerifyEmailPageContentProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const response = await fetch(`/api/account/verify-email?token=${encodeURIComponent(token)}`);
        if (cancelled) {
          return;
        }

        setStatus(response.ok ? 'success' : 'error');
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="space-y-4">
      {status === 'loading' ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{labels.verifying}</p> : null}
      {status === 'success' ? (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {labels.success}
        </p>
      ) : null}
      {status === 'error' ? <p className="text-sm text-red-600 dark:text-red-400">{labels.error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          locale={locale}
          className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {labels.loginCta}
        </Link>
        <Link
          href="/register"
          locale={locale}
          className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
        >
          {labels.registerCta}
        </Link>
      </div>
    </div>
  );
}
