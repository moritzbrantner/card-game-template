import * as z from 'zod';

import {
  createPokerMatchUseCase,
  listPokerMatchesUseCase,
} from '@/src/domain/game-matches/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const createMatchBodySchema = z.object({
  presetId: z.enum(['heads-up', 'four-seat-bots']),
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
    problem('/problems/poker-match', title, status, detail),
  );
}

export const GET = createApiRoute({
  action: 'games.poker.matches.list',
  featureKey: 'showcase.uno',
  async handler({ session }) {
    const result = await listPokerMatchesUseCase(session);
    return result.ok ? result.data : { active: [], recent: [] };
  },
});

export const POST = createApiRoute({
  action: 'games.poker.matches.create',
  featureKey: 'showcase.uno',
  bodySchema: createMatchBodySchema,
  async handler({ body, session }) {
    const result = await createPokerMatchUseCase(session, body);

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
