import * as z from 'zod';

import {
  blockUserUseCase,
  unblockUserUseCase,
} from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const blockBodySchema = z.object({
  userId: z.string().min(1),
});

function mapBlockProblem(
  code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FORBIDDEN' | 'CONFLICT',
  detail: string,
) {
  const status =
    code === 'NOT_FOUND'
      ? 404
      : code === 'FORBIDDEN'
        ? 403
        : code === 'CONFLICT'
          ? 409
          : 400;
  return new ProblemError(
    problem(
      '/problems/profile-block',
      'Unable to update block state',
      status,
      detail,
    ),
  );
}

export const POST = createApiRoute({
  action: 'profile.block',
  auth: true,
  permission: 'profile.block',
  bodySchema: blockBodySchema,
  async handler({ actorId, body }) {
    const result = await blockUserUseCase(actorId!, body.userId);

    if (!result.ok) {
      throw mapBlockProblem(result.error.code, result.error.message);
    }

    return { ok: true, blocked: result.data.blocked };
  },
});

export const DELETE = createApiRoute({
  action: 'profile.unblock',
  auth: true,
  permission: 'profile.block',
  bodySchema: blockBodySchema,
  async handler({ actorId, body }) {
    const result = await unblockUserUseCase(actorId!, body.userId);

    if (!result.ok) {
      throw mapBlockProblem(result.error.code, result.error.message);
    }

    return { ok: true, blocked: result.data.blocked };
  },
});
