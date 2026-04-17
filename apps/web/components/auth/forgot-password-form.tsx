'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readProblemDetail } from '@/src/http/problem-client';

type ForgotPasswordFormValues = {
  email: string;
};

type ForgotPasswordFormProps = {
  locale: AppLocale;
  labels: {
    title: string;
    description: string;
    email: string;
    submit: string;
    submitting: string;
    requiredEmail: string;
    invalidEmail: string;
    success: string;
    genericError: string;
  };
};

export function ForgotPasswordForm({ locale, labels }: ForgotPasswordFormProps) {
  const [pending, setPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setSuccessMessage('');

    const response = await fetch('/api/account/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: values.email,
        locale,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.genericError);

      if (problem.fieldErrors.email?.[0]) {
        setError('email', {
          type: 'server',
          message: problem.fieldErrors.email[0],
        });
      }

      if (problem.formMessage || Object.keys(problem.fieldErrors).length === 0) {
        setError('root', {
          type: 'server',
          message: problem.formMessage ?? problem.message,
        });
      }

      setPending(false);
      return;
    }

    setSuccessMessage(labels.success);
    setPending(false);
  });

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-5 dark:border-zinc-800/80 dark:bg-zinc-950/60">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{labels.title}</h3>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{labels.description}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="forgot-password-email">{labels.email}</Label>
          <Input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? 'true' : 'false'}
            {...register('email', {
              required: labels.requiredEmail,
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: labels.invalidEmail,
              },
            })}
          />
          {errors.email ? <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p> : null}
        </div>

        {errors.root?.message ? <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p> : null}
        {successMessage ? (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {successMessage}
          </p>
        ) : null}

        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          {pending ? labels.submitting : labels.submit}
        </Button>
      </form>
    </section>
  );
}
