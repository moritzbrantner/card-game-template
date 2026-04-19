import * as z from 'zod';

import type { SubmitUnoMoveInput } from '@/src/domain/game-matches/contracts';
import { submitUnoMoveUseCase } from '@/src/domain/game-matches/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const movePayloadSchema = z.record(z.string(), z.unknown());
const submitMoveBodySchema = z.object({
  move: z.object({
    playerId: z.string(),
    kind: z.string(),
    createdAt: z.string(),
    payload: movePayloadSchema,
  }),
});

function getMatchId(request: Request) {
  const segments = new URL(request.url).pathname.split('/');
  return segments[segments.length - 2] ?? '';
}

export const POST = createApiRoute({
  action: 'games.uno.matches.submitMove',
  featureKey: 'showcase.uno',
  bodySchema: submitMoveBodySchema,
  async handler({ body, request, session }) {
    const result = await submitUnoMoveUseCase(session, getMatchId(request), body as SubmitUnoMoveInput);

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'CONFLICT' ? 409 : 400;
      throw new ProblemError(problem('/problems/uno-match-move', 'Unable to submit move', status, result.error.message));
    }

    return result.data;
  },
});
