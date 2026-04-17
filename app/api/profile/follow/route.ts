import * as z from 'zod';

import { followUserUseCase, unfollowUserUseCase } from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const followBodySchema = z.object({
  userId: z.string().min(1),
});

function mapFollowProblem(code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FORBIDDEN' | 'CONFLICT', detail: string) {
  const status = code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : code === 'CONFLICT' ? 409 : 400;
  return new ProblemError(problem('/problems/profile-follow', 'Unable to update follow state', status, detail));
}

export const POST = createApiRoute({
  action: 'profile.follow',
  featureKey: 'profiles.follow',
  auth: true,
  permission: 'profile.follow',
  bodySchema: followBodySchema,
  async handler({ actorId, body }) {
    const result = await followUserUseCase(actorId!, body.userId);

    if (!result.ok) {
      throw mapFollowProblem(result.error.code, result.error.message);
    }

    return { ok: true, following: result.data.following };
  },
});

export const DELETE = createApiRoute({
  action: 'profile.unfollow',
  featureKey: 'profiles.follow',
  auth: true,
  permission: 'profile.follow',
  bodySchema: followBodySchema,
  async handler({ actorId, body }) {
    const result = await unfollowUserUseCase(actorId!, body.userId);

    if (!result.ok) {
      throw mapFollowProblem(result.error.code, result.error.message);
    }

    return { ok: true, following: result.data.following };
  },
});
