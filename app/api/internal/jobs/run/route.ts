import { getEnv } from '@/src/config/env';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';
import { runDueJobs } from '@/src/jobs/service';

export const POST = createApiRoute({
  action: 'internal.jobs.run',
  async handler({ request }) {
    const secret = getEnv().jobs.internalCronSecret;
    const providedSecret = request.headers.get('x-internal-cron-secret');

    if (!secret || providedSecret !== secret) {
      throw new ProblemError(problem('/problems/internal-cron-auth', 'Forbidden', 403, 'Invalid cron secret.'));
    }

    const result = await runDueJobs();
    return result;
  },
});
