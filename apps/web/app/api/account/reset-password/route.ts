import * as z from 'zod';

import { resetPasswordWithToken } from '@/src/auth/account-lifecycle';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'account.resetPassword',
  featureKey: 'account.passwordRecovery',
  bodySchema: z.object({
    token: z.string().min(1),
    password: z.string().min(1),
  }),
  async handler({ body }) {
    const result = await resetPasswordWithToken(body.token, body.password);

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/password-reset',
          'Unable to reset password',
          400,
          result.error,
        ),
      );
    }

    return { ok: true };
  },
});
