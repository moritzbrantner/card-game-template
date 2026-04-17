import * as z from 'zod';

import { searchUsersToFollowUseCase } from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const searchQuerySchema = z.object({
  query: z.string().max(80).optional(),
});

function mapSearchProblem(code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FORBIDDEN' | 'CONFLICT', detail: string) {
  const status = code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : code === 'CONFLICT' ? 409 : 400;
  return new ProblemError(problem('/problems/profile-search', 'Unable to search profiles', status, detail));
}

export const GET = createApiRoute({
  action: 'profile.search',
  auth: true,
  querySchema: searchQuerySchema,
  async handler({ actorId, query }) {
    const result = await searchUsersToFollowUseCase(actorId!, query.query ?? '');

    if (!result.ok) {
      throw mapSearchProblem(result.error.code, result.error.message);
    }

    return {
      ok: true,
      profiles: result.data.profiles,
    };
  },
});
