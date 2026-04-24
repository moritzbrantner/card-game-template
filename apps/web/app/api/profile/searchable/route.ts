import * as z from 'zod';

import { updateProfileSearchVisibilityUseCase } from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const searchableBodySchema = z.object({
  isSearchable: z.boolean(),
});

function mapSearchableProblem(
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
      '/problems/profile-searchable',
      'Unable to update search visibility',
      status,
      detail,
    ),
  );
}

export const PATCH = createApiRoute({
  action: 'profile.updateSearchVisibility',
  auth: true,
  permission: 'profile.manageOwnSearchVisibility',
  bodySchema: searchableBodySchema,
  async handler({ actorId, body }) {
    const result = await updateProfileSearchVisibilityUseCase(
      actorId!,
      body.isSearchable,
    );

    if (!result.ok) {
      throw mapSearchableProblem(result.error.code, result.error.message);
    }

    return {
      ok: true,
      isSearchable: result.data.isSearchable,
    };
  },
});
