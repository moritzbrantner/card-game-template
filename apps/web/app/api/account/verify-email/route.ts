import * as z from 'zod';

import { verifyEmailByToken } from '@/src/auth/account-lifecycle';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const GET = createApiRoute({
  action: 'account.verifyEmail',
  featureKey: 'account.register',
  querySchema: z.object({
    token: z.string().min(1),
  }),
  async handler({ query }) {
    const result = await verifyEmailByToken(query.token);

    if (!result.ok) {
      throw new ProblemError(problem('/problems/email-verification', 'Unable to verify email', 400, result.error));
    }

    return { ok: true };
  },
});
