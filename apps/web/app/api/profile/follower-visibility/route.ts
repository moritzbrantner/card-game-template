import * as z from 'zod';

import { updateProfileFollowerVisibilityUseCase } from '@/src/domain/profile/use-cases';
import { followerVisibilityRoles } from '@/src/profile/follower-visibility';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const followerVisibilityBodySchema = z.object({
  followerVisibility: z.enum(followerVisibilityRoles),
});

function mapFollowerVisibilityProblem(
  code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FORBIDDEN' | 'CONFLICT',
  detail: string,
) {
  const status = code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : code === 'CONFLICT' ? 409 : 400;
  return new ProblemError(
    problem('/problems/profile-follower-visibility', 'Unable to update follower visibility', status, detail),
  );
}

export const PATCH = createApiRoute({
  action: 'profile.updateFollowerVisibility',
  auth: true,
  bodySchema: followerVisibilityBodySchema,
  async handler({ actorId, body }) {
    const result = await updateProfileFollowerVisibilityUseCase(actorId!, body.followerVisibility);

    if (!result.ok) {
      throw mapFollowerVisibilityProblem(result.error.code, result.error.message);
    }

    return {
      ok: true,
      followerVisibility: result.data.followerVisibility,
    };
  },
});
