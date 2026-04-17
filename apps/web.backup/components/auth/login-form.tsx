'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Link, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readProblemDetail } from '@/src/http/problem-client';

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormProps = {
  locale: AppLocale;
  labels: {
    email: string;
    password: string;
    submit: string;
    submitting: string;
    invalidCredentials: string;
    requiredEmail: string;
    invalidEmail: string;
    requiredPassword: string;
    registerPrompt: string;
    registerCta: string;
  };
};

export function LoginForm({ locale, labels }: LoginFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.invalidCredentials);

      if (problem.fieldErrors.email?.[0]) {
        setError('email', {
          type: 'server',
          message: problem.fieldErrors.email[0],
        });
      }

      if (problem.fieldErrors.password?.[0]) {
        setError('password', {
          type: 'server',
          message: problem.fieldErrors.password[0],
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

    router.push('/profile', locale);
    router.refresh();
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">{labels.email}</Label>
        <Input
          id="email"
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

      <div className="space-y-2">
        <Label htmlFor="password">{labels.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          {...register('password', {
            required: labels.requiredPassword,
          })}
        />
        {errors.password ? <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p> : null}
      </div>

      {errors.root?.message ? <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {labels.registerPrompt}{' '}
        <Link href="/register" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50">
          {labels.registerCta}
        </Link>
      </p>
    </form>
  );
}
