'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readProblemDetail } from '@/src/http/problem-client';

type NewsletterSignupValues = {
  email: string;
};

type NewsletterSignupProps = {
  locale: AppLocale;
  labels: {
    eyebrow: string;
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

export function NewsletterSignup({ locale, labels }: NewsletterSignupProps) {
  const [pending, setPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<NewsletterSignupValues>({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setSuccessMessage('');

    const response = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: values.email,
        locale,
        source: 'communication-page',
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

    reset();
    setSuccessMessage(labels.success);
    setPending(false);
  });

  return (
    <Card className="rounded-3xl border-zinc-200/80 bg-linear-to-br from-white via-white to-zinc-50 shadow-xl shadow-zinc-950/5 dark:border-zinc-800/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
          {labels.eyebrow}
        </p>
        <CardTitle className="text-xl">{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="newsletter-email">{labels.email}</Label>
            <Input
              id="newsletter-email"
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
            {errors.email ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          {errors.root?.message ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.root.message}
            </p>
          ) : null}
          {successMessage ? (
            <p
              role="status"
              className="text-sm text-emerald-700 dark:text-emerald-400"
            >
              {successMessage}
            </p>
          ) : null}

          <Button type="submit" className="w-full md:w-auto" disabled={pending}>
            {pending ? labels.submitting : labels.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
