import * as z from 'zod';

import { signUpWithCredentials } from '@/src/auth/account-lifecycle';
import { signInSession } from '@/src/auth.server';
import { getDb } from '@/src/db/client';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const signupBodySchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  name: z.string().trim().optional(),
  locale: z.string().optional(),
});

export const POST = createApiRoute({
  action: 'account.signup',
  featureKey: 'account.register',
  bodySchema: signupBodySchema,
  async handler({ body }) {
    const result = await signUpWithCredentials(body);

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/account-signup',
          'Unable to create account',
          400,
          result.error,
        ),
      );
    }

    const user = await getDb().query.users.findFirst({
      where: (table, { eq }) => eq(table.id, result.userId),
    });

    if (!user?.email) {
      throw new ProblemError(
        problem(
          '/problems/session-bootstrap-failed',
          'Automatic sign-in failed',
          500,
          'Account created, but automatic sign-in failed. Try logging in manually.',
        ),
      );
    }

    await signInSession({
      id: user.id,
      email: user.email,
      tag: user.tag,
      image: user.image,
      name: user.name,
      role: user.role,
    });

    return { ok: true };
  },
});
