import * as z from 'zod';

import { authorizeCredentials } from '@/src/auth/credentials';
import { signInSession } from '@/src/auth.server';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const loginBodySchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const POST = createApiRoute({
  action: 'auth.login',
  bodySchema: loginBodySchema,
  async handler({ request, body }) {
    const user = await authorizeCredentials(
      {
        email: body.email,
        password: body.password,
      },
      undefined,
      request,
    );

    if (!user?.email) {
      throw new ProblemError(
        problem(
          '/problems/invalid-credentials',
          'Invalid credentials',
          401,
          'Email or password is incorrect.',
        ),
      );
    }

    await signInSession({
      id: user.id,
      email: user.email,
      tag: user.tag,
      image: user.image ?? null,
      name: user.name ?? null,
      role: user.role,
    });

    return { ok: true };
  },
});
