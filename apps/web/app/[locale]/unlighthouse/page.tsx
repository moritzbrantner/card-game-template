import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createTranslator } from '@/src/i18n/messages';
import { resolveLocale } from '@/src/server/page-guards';
import {
  formatUnlighthouseMetric,
  formatUnlighthouseScore,
  loadUnlighthouseReport,
  summarizeUnlighthouseReport,
} from '@/src/unlighthouse/report';

export const dynamic = 'force-static';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = createTranslator(locale, 'UnlighthousePage');

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/unlighthouse`,
    },
  };
}

export default async function UnlighthousePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = createTranslator(locale, 'UnlighthousePage');
  const loadedReport = await loadUnlighthouseReport();

  if (!loadedReport) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="border-dashed">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              {t('eyebrow')}
            </Badge>
            <CardTitle>{t('emptyTitle')}</CardTitle>
            <CardDescription>{t('emptyDescription')}</CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const summary = summarizeUnlighthouseReport(loadedReport.report);
  const categoryKeys = summary.categories.map((category) => category.key);

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_30%),radial-gradient(circle_at_right,#fecaca,transparent_28%),linear-gradient(145deg,#ffffff,#f4f4f5)] p-8 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,#1d4ed8,transparent_26%),radial-gradient(circle_at_right,#991b1b,transparent_26%),linear-gradient(145deg,#09090b,#18181b)]">
        <div className="space-y-4">
          <Badge
            variant="outline"
            className="w-fit border-zinc-400/70 bg-white/60 dark:bg-zinc-950/40"
          >
            {t('eyebrow')}
          </Badge>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t('title')}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {t('description')}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label={t('summary.routes')}
          value={String(summary.routeCount)}
        />
        <SummaryCard
          label={t('summary.score')}
          value={formatUnlighthouseScore(summary.averageScore, locale)}
        />
        <SummaryCard
          label={t('summary.bestRoute')}
          value={
            summary.bestRoute
              ? formatUnlighthouseScore(summary.bestRoute.score, locale)
              : '-'
          }
          detail={summary.bestRoute?.path}
        />
        <SummaryCard
          label={t('summary.worstRoute')}
          value={
            summary.worstRoute
              ? formatUnlighthouseScore(summary.worstRoute.score, locale)
              : '-'
          }
          detail={summary.worstRoute?.path}
        />
        <SummaryCard
          label={t('summary.updatedAt')}
          value={new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(loadedReport.updatedAt)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {t('sections.categories')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {summary.categories.map((category) => (
              <article
                key={category.key}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {category.title}
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatUnlighthouseScore(category.averageScore, locale)}
                </p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('sections.metrics')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {summary.metrics.map((metric) => (
              <article
                key={metric.key}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="pr-4 text-sm text-zinc-600 dark:text-zinc-300">
                  {metric.title}
                </p>
                <p className="text-right text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatUnlighthouseMetric(
                    metric.averageNumericValue,
                    metric.numericUnit,
                    locale,
                  )}
                </p>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('sections.routes')}</CardTitle>
          <CardDescription>
            {t('sections.routesDescription', { count: summary.routeCount })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('routeTable.path')}</TableHead>
                <TableHead>{t('routeTable.overall')}</TableHead>
                {summary.categories.map((category) => (
                  <TableHead key={category.key}>{category.title}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadedReport.report.routes.map((route) => (
                <TableRow key={route.path}>
                  <TableCell className="font-mono text-xs text-zinc-700 dark:text-zinc-200">
                    {route.path}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatUnlighthouseScore(route.score, locale)}
                  </TableCell>
                  {categoryKeys.map((categoryKey) => (
                    <TableCell key={categoryKey}>
                      {formatUnlighthouseScore(
                        route.categories[categoryKey]?.score,
                        locale,
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {value}
        </p>
        {detail ? (
          <p className="mt-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {detail}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
