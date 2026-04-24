import { createApiRoute } from '@/src/http/route';
import {
  getReadinessChecks,
  runHealthChecks,
} from '@/src/observability/health';

export const GET = createApiRoute({
  action: 'health.ready',
  async handler() {
    const result = await runHealthChecks(getReadinessChecks());
    return Response.json(result, {
      status: result.ok ? 200 : 503,
    });
  },
});
