import * as z from 'zod';

import {
  createTcgMatchUseCase,
  listTcgMatchesUseCase,
} from '@/src/domain/game-matches/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const createMatchBodySchema = z.object({
  presetId: z.enum(['duel', 'bot-rival']),
  displayName: z.string().trim().min(1).max(60).optional(),
});

function mapMatchProblem(
  title: string,
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT',
  detail: string,
) {
  const status =
    code === 'VALIDATION_ERROR' ? 400 : code === 'NOT_FOUND' ? 404 : 409;
  return new ProblemError(
    problem('/problems/tcg-match', title, status, detail),
  );
}

export const GET = createApiRoute({
  action: 'games.tcg.matches.list',
  featureKey: 'showcase.tcg',
  async handler({ session }) {
    const result = await listTcgMatchesUseCase(session);
    return result.ok ? result.data : { active: [], recent: [] };
  },
});

export const POST = createApiRoute({
  action: 'games.tcg.matches.create',
  featureKey: 'showcase.tcg',
  bodySchema: createMatchBodySchema,
  async handler({ body, session }) {
    const result = await createTcgMatchUseCase(session, body);

    if (!result.ok) {
      throw mapMatchProblem(
        'Unable to create match',
        result.error.code,
        result.error.message,
      );
    }

    return result.data;
  },
});
