import * as z from 'zod';

import { signInSession } from '@/src/auth.server';
import { updateProfileTagUseCase } from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

function statusForProfileTagError(
  code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FORBIDDEN' | 'CONFLICT',
) {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'FORBIDDEN':
      return 403;
    default:
      return 400;
  }
}

export const POST = createApiRoute({
  action: 'profile.updateTag',
  auth: true,
  permission: 'profile.manageOwnTags',
  bodySchema: z.object({
    tag: z.string(),
  }),
  async handler({ body, session, actorId }) {
    const result = await updateProfileTagUseCase(actorId!, body.tag);

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/profile-tag',
          'Unable to update tag',
          statusForProfileTagError(result.error.code),
          result.error.message,
        ),
      );
    }

    await signInSession({
      ...session!.user,
      tag: result.data.tag,
    });

    return { ok: true, tag: result.data.tag };
  },
});
