'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Link, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readProblemDetail } from '@/src/http/problem-client';

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterFormProps = {
  locale: AppLocale;
  labels: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    submit: string;
    submitting: string;
    requiredEmail: string;
    invalidEmail: string;
    requiredPassword: string;
    weakPassword: string;
    requiredConfirmPassword: string;
    passwordMismatch: string;
    nameTooLong: string;
    genericError: string;
    loginPrompt: string;
    loginCta: string;
  };
};

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export function RegisterForm({ locale, labels }: RegisterFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      name: '',
      email: '',
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

    const response = await fetch('/api/account/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: values.name.trim() || undefined,
        email: values.email,
        password: values.password,
        locale,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.genericError);

      if (problem.fieldErrors.name?.[0]) {
        setError('name', {
          type: 'server',
          message: problem.fieldErrors.name[0],
        });
      }

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

      if (problem.fieldErrors.confirmPassword?.[0]) {
        setError('confirmPassword', {
          type: 'server',
          message: problem.fieldErrors.confirmPassword[0],
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

    setPending(false);
    router.push('/profile', locale);
    router.refresh();
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">{labels.name}</Label>
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={errors.name ? 'true' : 'false'}
          {...register('name', {
            maxLength: {
              value: 80,
              message: labels.nameTooLong,
            },
          })}
        />
        {errors.name ? <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p> : null}
      </div>

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
        {errors.password ? <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{labels.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          {...register('confirmPassword', {
            required: labels.requiredConfirmPassword,
            validate: (value) => value === password || labels.passwordMismatch,
          })}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      {errors.root?.message ? <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {labels.loginPrompt}{' '}
        <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50">
          {labels.loginCta}
        </Link>
      </p>
    </form>
  );
}
