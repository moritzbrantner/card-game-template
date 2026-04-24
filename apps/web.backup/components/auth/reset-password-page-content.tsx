'use client';

import { useSearchParams } from 'next/navigation';

import type { AppLocale } from '@/i18n/routing';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

type ResetPasswordPageContentProps = {
  locale: AppLocale;
  missingTokenLabel: string;
  labels: {
    password: string;
    confirmPassword: string;
    submit: string;
    submitting: string;
    requiredPassword: string;
    weakPassword: string;
    requiredConfirmPassword: string;
    passwordMismatch: string;
    genericError: string;
    success: string;
    loginCta: string;
  };
};

export function ResetPasswordPageContent({
  locale,
  missingTokenLabel,
  labels,
}: ResetPasswordPageContentProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  if (!token) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {missingTokenLabel}
      </p>
    );
  }

  return <ResetPasswordForm locale={locale} token={token} labels={labels} />;
}
