import { ReportProblemForm } from '@/components/report-problem-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createTranslator } from '@/src/i18n/messages';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

const checklistKeys = ['summary', 'context', 'contact'] as const;

export default async function ReportProblemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('reportProblem');
  const t = createTranslator(locale, 'ReportProblemPage');

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
      <Card className="rounded-[2rem] border-zinc-200 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32%),radial-gradient(circle_at_bottom_right,#dcfce7,transparent_28%),linear-gradient(150deg,#ffffff,#f4f4f5)] shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,#1d4ed8,transparent_28%),radial-gradient(circle_at_bottom_right,#166534,transparent_26%),linear-gradient(150deg,#09090b,#18181b)]">
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit rounded-full border border-zinc-300/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
            {t('eyebrow')}
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl leading-tight">{t('title')}</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-300">
              {t('description')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ReportProblemForm />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle className="text-xl">{t('checklistTitle')}</CardTitle>
            <CardDescription>{t('checklistDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklistKeys.map((key) => (
              <article
                key={key}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{t(`checklist.${key}.title`)}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{t(`checklist.${key}.description`)}</p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle className="text-xl">{t('responseTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            <p>{t('responseBody')}</p>
            <p>{t('privacyNote')}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
