import { secureRoute } from '@/src/api/route-security';
import { getAdminActionPermissions } from '@/src/domain/authorization/use-cases';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';

export async function GET(request: Request) {
  if (!isFeatureEnabled('admin.reports')) {
    return new Response('Not found', { status: 404 });
  }

  const guard = await secureRoute({
    request,
    action: 'admin.reports.authorization',
    allowedRoles: ['ADMIN', 'SUPERADMIN'],
  });

  if (!guard.ok) {
    return guard.response;
  }

  const [reportsPermission] = getAdminActionPermissions(guard.session!.user.role).filter(
    (permission) => permission.key === 'viewReports',
  );

  return guard.json({
    action: 'viewReports',
    allowed: reportsPermission?.allowed ?? false,
  });
}
