import * as z from 'zod';

import { requestPasswordReset } from '@/src/auth/account-lifecycle';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'account.forgotPassword',
  featureKey: 'account.passwordRecovery',
  bodySchema: z.object({
    email: z.string().min(1),
    locale: z.string().optional(),
  }),
  async handler({ body }) {
    await requestPasswordReset(body.email, { locale: body.locale });
    return { ok: true };
  },
});
