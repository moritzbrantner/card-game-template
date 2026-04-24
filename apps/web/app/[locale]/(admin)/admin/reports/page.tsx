import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminReportChart } from '@/components/admin/admin-report-chart';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import { getAdminReportSummaryUseCase } from '@/src/domain/admin-reports/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import { getAdminAnalyticsSettings } from '@/src/site-config/service';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

const reportCatalogKeys = [
  'securityAccess',
  'auditActivity',
  'workspaceAdoption',
  'schemaHealth',
  'navigationJourneys',
] as const;

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.reports');
  const session = await requirePermission(locale, 'admin.reports.read');
  const t = createTranslator(locale, 'AdminPage');
  const adminPages = await getAuthorizedAdminPageDefinitions(session.user.role);
  const analyticsSettings = await getAdminAnalyticsSettings();
  const summary = await getAdminReportSummaryUseCase(
    analyticsSettings.defaultAdminReportWindow,
  );

  return (
    <AdminPageShell
      title={t('reports.title')}
      description={t('reports.description')}
      adminPages={adminPages}
    >
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Live summary
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {summary.window} vs previous {summary.window}. Refreshed{' '}
              {summary.generatedAt}.
            </p>
          </div>
          <Badge
            variant="secondary"
            className={
              summary.status === 'degraded'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                : undefined
            }
          >
            {summary.status === 'degraded' ? 'Degraded data' : 'Live data'}
          </Badge>
        </div>

        {summary.status === 'degraded' ? (
          <div className="rounded-3xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {summary.message ?? 'Data unavailable.'}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary.metrics.map((metric) => (
              <Card key={metric.id} className="h-full">
                <CardHeader className="space-y-2">
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-3xl">{metric.value}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {metric.detail}
                  </p>
                  {metric.change ? (
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                      {metric.change.value} {metric.change.detail}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardDescription>Operational trend</CardDescription>
              <CardTitle className="text-xl">Admin visits</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminReportChart series={summary.series[0]} />
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.catalogTitle')}</CardTitle>
          <CardDescription>{t('reports.catalogDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.columns.report')}</TableHead>
                <TableHead>{t('reports.columns.owner')}</TableHead>
                <TableHead>{t('reports.columns.cadence')}</TableHead>
                <TableHead>{t('reports.columns.status')}</TableHead>
                <TableHead className="text-right">
                  {t('reports.columns.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportCatalogKeys.map((reportKey) => (
                <TableRow key={reportKey}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {t(`reports.catalog.${reportKey}.title`)}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {t(`reports.catalog.${reportKey}.description`)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {t(`reports.catalog.${reportKey}.owner`)}
                  </TableCell>
                  <TableCell>
                    {t(`reports.catalog.${reportKey}.cadence`)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t('reports.ready')}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <LocalizedLink
                        href={`/admin/reports/${reportKey}?window=${analyticsSettings.defaultAdminReportWindow}`}
                        locale={locale}
                        className={buttonVariants({
                          variant: 'outline',
                          size: 'sm',
                        })}
                      >
                        {t('reports.actions.open')}
                      </LocalizedLink>
                      <a
                        href={`/api/admin/reports/${reportKey}?window=${analyticsSettings.defaultAdminReportWindow}&format=csv`}
                        className={buttonVariants({
                          variant: 'ghost',
                          size: 'sm',
                        })}
                        download
                      >
                        {t('reports.actions.export')}
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
