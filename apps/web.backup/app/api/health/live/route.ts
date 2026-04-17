import { createApiRoute } from '@/src/http/route';
import { getLivenessChecks, runHealthChecks } from '@/src/observability/health';

export const GET = createApiRoute({
  action: 'health.live',
  async handler() {
    const result = await runHealthChecks(getLivenessChecks());
    return Response.json(result, {
      status: result.ok ? 200 : 503,
    });
  },
});
