import * as z from 'zod';

import {
  createUnoMatchUseCase,
  listUnoMatchesUseCase,
} from '@/src/domain/game-matches/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const createMatchBodySchema = z.object({
  presetId: z.enum(['hotseat-duo', 'mixed-table', 'bot-duel']),
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
    problem('/problems/uno-match', title, status, detail),
  );
}

export const GET = createApiRoute({
  action: 'games.uno.matches.list',
  featureKey: 'showcase.uno',
  async handler({ session }) {
    const result = await listUnoMatchesUseCase(session);
    return result.ok ? result.data : { active: [], recent: [] };
  },
});

export const POST = createApiRoute({
  action: 'games.uno.matches.create',
  featureKey: 'showcase.uno',
  bodySchema: createMatchBodySchema,
  async handler({ body, session }) {
    const result = await createUnoMatchUseCase(session, body);

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
