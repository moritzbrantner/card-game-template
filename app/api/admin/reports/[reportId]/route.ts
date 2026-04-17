import {
  exportAdminReportUseCase,
  isAdminReportId,
  isAdminReportWindow,
  normalizeNavigationReportFilters,
  type AdminReportFormat,
} from '@/src/domain/admin-reports/use-cases';
import { isSiteFeatureEnabled } from '@/src/foundation/features/access';
import { createProblemResponse, invalidQueryProblem, notFoundProblem } from '@/src/http/errors';
import { getAdminAnalyticsSettings } from '@/src/site-config/service';
import { secureRoute } from '@/src/api/route-security';

function resolveFormat(value: string | null): AdminReportFormat {
  return value === 'json' ? 'json' : 'csv';
}

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  if (!await isSiteFeatureEnabled('admin.reports')) {
    return createProblemResponse(notFoundProblem());
  }

  const { reportId } = await context.params;

  if (!isAdminReportId(reportId)) {
    return createProblemResponse(notFoundProblem());
  }

  const guard = await secureRoute({
    request,
    action: 'admin.reports.export',
    requiredPermission: 'admin.reports.export',
    metadata: { reportId },
  });

  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const requestedWindow = url.searchParams.get('window');
  const analyticsSettings = await getAdminAnalyticsSettings();
  const window = requestedWindow ?? analyticsSettings.defaultAdminReportWindow;
  const format = resolveFormat(url.searchParams.get('format'));
  const filters = normalizeNavigationReportFilters({
    audience: url.searchParams.get('audience'),
    routeGroup: url.searchParams.get('routeGroup'),
    path: url.searchParams.get('path'),
  });

  if (!isAdminReportWindow(window)) {
    return createProblemResponse(invalidQueryProblem('Unsupported report window.', { window: ['Expected one of 24h, 7d, 30d.'] }));
  }

  const exported = await exportAdminReportUseCase(reportId, window, format, undefined, filters).catch(() => ({
    filename: `${reportId}-${window}.${format}`,
    contentType: format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
    body: format === 'json'
      ? JSON.stringify({ reportId, error: 'Report data is temporarily unavailable.' }, null, 2)
      : 'Message\nReport data is temporarily unavailable.',
  }));

  return guard.respond(exported.body, {
    headers: {
      'content-type': exported.contentType,
      'content-disposition': `attachment; filename="${exported.filename}"`,
    },
    metadata: { reportId, format, window },
  });
}
