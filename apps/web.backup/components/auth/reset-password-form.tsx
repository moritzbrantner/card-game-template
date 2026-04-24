'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readProblemDetail } from '@/src/http/problem-client';

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

type ResetPasswordFormProps = {
  locale: AppLocale;
  token: string;
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

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export function ResetPasswordForm({
  locale,
  token,
  labels,
}: ResetPasswordFormProps) {
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = useWatch({
    control,
    name: 'password',
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setSuccess(false);

    const response = await fetch('/api/account/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password: values.password,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.genericError);

      if (problem.fieldErrors.password?.[0]) {
        setError('password', {
          type: 'server',
          message: problem.fieldErrors.password[0],
        });
      }

      if (problem.fieldErrors.confirmPassword?.[0]) {
        setError('confirmPassword', {
          type: 'server',
          message: problem.fieldErrors.confirmPassword[0],
        });
      }

      if (
        problem.formMessage ||
        Object.keys(problem.fieldErrors).length === 0
      ) {
        setError('root', {
          type: 'server',
          message: problem.formMessage ?? problem.message,
        });
      }

      setPending(false);
      return;
    }

    setSuccess(true);
    setPending(false);
  });

  if (success) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="text-sm text-emerald-700 dark:text-emerald-400"
        >
          {labels.success}
        </p>
        <Link
          href="/login"
          locale={locale}
          className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {labels.loginCta}
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="reset-password">{labels.password}</Label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          {...register('password', {
            required: labels.requiredPassword,
            pattern: {
              value: passwordPattern,
              message: labels.weakPassword,
            },
          })}
        />
        {errors.password ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-password-confirm">{labels.confirmPassword}</Label>
        <Input
          id="reset-password-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          {...register('confirmPassword', {
            required: labels.requiredConfirmPassword,
            validate: (value) => value === password || labels.passwordMismatch,
          })}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {errors.root?.message ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
