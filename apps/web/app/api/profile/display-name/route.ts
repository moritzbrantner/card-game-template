import * as z from 'zod';

import { signInSession } from '@/src/auth.server';
import { updateDisplayNameUseCase } from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'profile.updateDisplayName',
  auth: true,
  permission: 'profile.editOwn',
  bodySchema: z.object({
    displayName: z.string(),
  }),
  async handler({ body, session, actorId }) {
    const result = await updateDisplayNameUseCase(actorId!, body.displayName);

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/profile-display-name',
          'Unable to update display name',
          400,
          result.error.message,
        ),
      );
    }

    await signInSession({
      ...session!.user,
      name: result.data.displayName,
    });

    return { ok: true };
  },
});
