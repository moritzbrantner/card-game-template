import { notFound } from 'next/navigation';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminReportChart } from '@/components/admin/admin-report-chart';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LocalizedLink } from '@/i18n/server-link';
import { getEnabledAdminPageDefinitions } from '@/src/admin/pages';
import {
  adminReportWindows,
  getAdminReportDetailUseCase,
  isAdminReportId,
  isAdminReportWindow,
  normalizeNavigationReportFilters,
} from '@/src/domain/admin-reports/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import { getAdminAnalyticsSettings } from '@/src/site-config/service';
import { notFoundUnlessFeatureEnabled, resolveLocale } from '@/src/server/page-guards';

function buildReportSearchParams(input: {
  window: string;
  audience?: string | null;
  routeGroup?: string | null;
  path?: string | null;
}) {
  const searchParams = new URLSearchParams({ window: input.window });

  if (input.audience && input.audience !== 'all') {
    searchParams.set('audience', input.audience);
  }

  if (input.routeGroup && input.routeGroup !== 'all') {
    searchParams.set('routeGroup', input.routeGroup);
  }

  if (input.path) {
    searchParams.set('path', input.path);
  }

  return searchParams.toString();
}

export default async function AdminReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reportId: string }>;
  searchParams: Promise<{ window?: string; audience?: string; routeGroup?: string; path?: string }>;
}) {
  const [{ locale: rawLocale, reportId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('admin.reports');

  if (!isAdminReportId(reportId)) {
    notFound();
  }

  const analyticsSettings = await getAdminAnalyticsSettings();
  const requestedWindow = rawSearchParams.window ?? '';
  const window = isAdminReportWindow(requestedWindow) ? requestedWindow : analyticsSettings.defaultAdminReportWindow;
  const navigationFilters = normalizeNavigationReportFilters({
    audience: rawSearchParams.audience,
    routeGroup: rawSearchParams.routeGroup,
    path: rawSearchParams.path,
  });
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = getEnabledAdminPageDefinitions();
  const detail = await getAdminReportDetailUseCase(reportId, window, undefined, navigationFilters);
  const currentQuery = buildReportSearchParams({
    window,
    audience: detail.filters?.audience ?? navigationFilters.audience,
    routeGroup: detail.filters?.routeGroup ?? navigationFilters.routeGroup,
    path: detail.filters?.path ?? navigationFilters.path,
  });

  return (
    <AdminPageShell
      title={t(`reports.catalog.${reportId}.title`)}
      description={t(`reports.catalog.${reportId}.description`)}
      adminPages={adminPages}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocalizedLink href="/admin/reports" locale={locale} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Back to reports
        </LocalizedLink>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{detail.status === 'degraded' ? 'Degraded data' : 'Live data'}</Badge>
          {adminReportWindows.map((candidateWindow) => (
            <LocalizedLink
              key={candidateWindow}
              href={`/admin/reports/${reportId}?${buildReportSearchParams({
                window: candidateWindow,
                audience: detail.filters?.audience,
                routeGroup: detail.filters?.routeGroup,
                path: detail.filters?.path,
              })}`}
              locale={locale}
              className={buttonVariants({
                variant: candidateWindow === window ? 'default' : 'outline',
                size: 'sm',
              })}
            >
              {candidateWindow}
            </LocalizedLink>
          ))}
          <a
            href={`/api/admin/reports/${reportId}?${currentQuery}&format=csv`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            download
          >
            Export CSV
          </a>
        </div>
      </div>

      {detail.filters ? (
        <form method="GET" className="grid gap-3 rounded-3xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 md:grid-cols-4">
          <input type="hidden" name="window" value={window} />
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Audience</span>
            <select
              name="audience"
              defaultValue={detail.filters.audience}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="all">All visitors</option>
              <option value="anonymous">Anonymous</option>
              <option value="authenticated">Authenticated</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Route group</span>
            <select
              name="routeGroup"
              defaultValue={detail.filters.routeGroup}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="all">All groups</option>
              <option value="public">Public</option>
              <option value="guest">Guest</option>
              <option value="authenticated">Authenticated</option>
              <option value="workspace">Workspace</option>
              <option value="admin">Admin</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Page drill-down</span>
            <input
              name="path"
              list="navigation-report-paths"
              defaultValue={detail.filters.path ?? ''}
              placeholder="/blog/[slug]"
              className="w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <datalist id="navigation-report-paths">
              {detail.filters.pathOptions.map((path) => (
                <option key={path} value={path} />
              ))}
            </datalist>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className={buttonVariants({ variant: 'default', size: 'sm' })}>Apply filters</button>
            <LocalizedLink
              href={`/admin/reports/${reportId}?window=${window}`}
              locale={locale}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Reset
            </LocalizedLink>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-200 bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Generated {detail.generatedAt} for the {detail.window} window.
        </p>
        {detail.message ? (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{detail.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {detail.cards.map((card) => (
          <Card key={card.id}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
            {card.detail ? (
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{card.detail}</p>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>

      {detail.series.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {detail.series.map((series) => (
            <Card key={series.id}>
              <CardHeader>
                <CardTitle>{series.title}</CardTitle>
                <CardDescription>{series.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminReportChart series={series} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {detail.breakdowns.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {detail.breakdowns.map((breakdown) => (
            <Card key={breakdown.id}>
              <CardHeader>
                <CardTitle>{breakdown.title}</CardTitle>
                <CardDescription>{breakdown.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {breakdown.rows.length > 0 ? (
                  <div className="space-y-3">
                    {breakdown.rows.map((row) => (
                      <div
                        key={`${breakdown.id}-${row.label}`}
                        className="flex items-start justify-between gap-4 rounded-2xl border p-3 dark:border-zinc-800"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{row.label}</p>
                          {row.detail ? (
                            <p className="text-sm text-zinc-600 dark:text-zinc-300">{row.detail}</p>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{row.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{breakdown.emptyMessage}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{detail.tableTitle ?? 'Recent events'}</CardTitle>
          <CardDescription>{detail.tableDescription ?? 'Live operational output for the selected time window.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.table.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {detail.table.columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.table.rows.map((row, rowIndex) => (
                  <TableRow key={`${rowIndex}-${row.join('|')}`}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={`${rowIndex}-${cellIndex}`}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{detail.table.emptyMessage}</p>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
