'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

type SubmissionState =
  | {
      error: string;
      referenceId?: never;
    }
  | {
      error?: never;
      referenceId: string;
    }
  | null;

const areaOptions = [
  'bug',
  'performance',
  'account',
  'billing',
  'other',
] as const;

export function ReportProblemForm() {
  const t = useTranslations('ReportProblemPage');
  const [pending, setPending] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSubmissionState(null);

    const form = event.currentTarget;
    const response = await fetch('/api/report-problem', {
      method: 'POST',
      body: new FormData(form),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, t('errors.generic'));
      setSubmissionState({
        error: problem.message,
      });
      setPending(false);
      return;
    }

    const body = (await response.json().catch(() => null)) as {
      referenceId?: string;
    } | null;

    if (!body?.referenceId) {
      setSubmissionState({
        error: t('errors.generic'),
      });
      setPending(false);
      return;
    }

    form.reset();
    setSubmissionState({
      referenceId: body.referenceId,
    });
    setPending(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="problem-report-name">{t('fields.name.label')}</Label>
          <Input
            id="problem-report-name"
            name="name"
            autoComplete="name"
            placeholder={t('fields.name.placeholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="problem-report-email">
            {t('fields.email.label')}
          </Label>
          <Input
            id="problem-report-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('fields.email.placeholder')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="problem-report-area">{t('fields.area.label')}</Label>
          <select
            id="problem-report-area"
            name="area"
            required
            defaultValue="bug"
            className={[
              'flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:focus-visible:ring-zinc-50',
            ].join(' ')}
          >
            {areaOptions.map((option) => (
              <option key={option} value={option}>
                {t(`fields.area.options.${option}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="problem-report-url">
            {t('fields.pageUrl.label')}
          </Label>
          <Input
            id="problem-report-url"
            name="pageUrl"
            type="url"
            inputMode="url"
            placeholder={t('fields.pageUrl.placeholder')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="problem-report-subject">
          {t('fields.subject.label')}
        </Label>
        <Input
          id="problem-report-subject"
          name="subject"
          minLength={8}
          maxLength={120}
          placeholder={t('fields.subject.placeholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="problem-report-details">
          {t('fields.details.label')}
        </Label>
        <Textarea
          id="problem-report-details"
          name="details"
          rows={7}
          minLength={30}
          maxLength={4000}
          placeholder={t('fields.details.placeholder')}
          required
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {t('footnote')}
        </p>

        <Button type="submit" disabled={pending}>
          {pending ? t('actions.submitting') : t('actions.submit')}
        </Button>
      </div>

      <div role="status" aria-live="polite" className="space-y-1">
        {submissionState?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {submissionState.error}
          </p>
        ) : null}
        {submissionState?.referenceId ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {t('success.message', { referenceId: submissionState.referenceId })}
          </p>
        ) : null}
      </div>
    </form>
  );
}
