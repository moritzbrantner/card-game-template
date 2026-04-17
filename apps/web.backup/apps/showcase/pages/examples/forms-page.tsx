import type { AppLocale } from '@/i18n/routing';

import { EmployeeProfileForm } from '@/apps/showcase/components/forms/employee-profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createTranslator } from '@/src/i18n/messages';

const overviewKeys = ['useForm', 'register', 'controller', 'reset'] as const;
const interactionKeys = ['initialRender', 'validInput', 'invalidClear', 'resetWithValues'] as const;

export default async function FormsPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'FormsPage');

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-4xl rounded-3xl">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {overviewKeys.map((key) => (
              <article key={key} className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
                <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">{key}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t(`overview.${key}`)}</p>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl rounded-3xl">
        <CardHeader>
          <CardTitle>{t('interactionsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {interactionKeys.map((key) => (
              <article key={key} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">{t(`interactions.${key}.title`)}</h3>
                <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  <p><strong>Required:</strong> {t(`interactions.${key}.required`)}</p>
                  <p><strong>Dirty:</strong> {t(`interactions.${key}.dirty`)}</p>
                  <p><strong>Validity:</strong> {t(`interactions.${key}.validity`)}</p>
                  <p><strong>Reset:</strong> {t(`interactions.${key}.reset`)}</p>
                </div>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl rounded-3xl">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>This page demonstrates react-hook-form with ten fields and built-in validation.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeProfileForm />
        </CardContent>
      </Card>
    </div>
  );
}
