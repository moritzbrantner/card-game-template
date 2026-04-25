import * as z from 'zod';
import { parseUnoMove } from '@repo/game-uno';

import type { SubmitUnoMoveInput } from '@/src/domain/game-matches/contracts';
import { publishUnoMatchSnapshot } from '@/src/domain/game-matches/realtime';
import { submitUnoMoveUseCase } from '@/src/domain/game-matches/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const submitMoveBodySchema = z.object({
  move: z.unknown(),
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
    let input: SubmitUnoMoveInput;

    try {
      input = {
        move: parseUnoMove(body.move),
      };
    } catch (error) {
      throw new ProblemError(
        problem(
          '/problems/uno-match-move',
          'Unable to submit move',
          400,
          error instanceof Error ? error.message : 'Invalid UNO move.',
        ),
      );
    }

    const result = await submitUnoMoveUseCase(
      session,
      getMatchId(request),
      input,
    );

    if (!result.ok) {
      const status =
        result.error.code === 'NOT_FOUND'
          ? 404
          : result.error.code === 'CONFLICT'
            ? 409
            : 400;
      throw new ProblemError(
        problem(
          '/problems/uno-match-move',
          'Unable to submit move',
          status,
          result.error.message,
        ),
      );
    }

    publishUnoMatchSnapshot(result.data);
    return result.data;
  },
});
