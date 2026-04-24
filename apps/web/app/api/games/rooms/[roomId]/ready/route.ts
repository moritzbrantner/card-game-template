import * as z from 'zod';

import { setGameRoomReadyUseCase } from '@/src/domain/game-rooms/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const readyBodySchema = z.object({
  ready: z.boolean(),
});

function getRoomId(request: Request) {
  const segments = new URL(request.url).pathname.split('/');
  return segments[segments.length - 2] ?? '';
}

function mapRoomProblem(
  title: string,
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN',
  detail: string,
) {
  const status =
    code === 'VALIDATION_ERROR'
      ? 400
      : code === 'NOT_FOUND'
        ? 404
        : code === 'FORBIDDEN'
          ? 403
          : 409;
  return new ProblemError(
    problem('/problems/game-room', title, status, detail),
  );
}

export const POST = createApiRoute({
  action: 'games.rooms.ready',
  featureKey: 'showcase.uno',
  bodySchema: readyBodySchema,
  async handler({ body, request, session }) {
    const result = await setGameRoomReadyUseCase(
      session,
      getRoomId(request),
      body,
    );

    if (!result.ok) {
      throw mapRoomProblem(
        'Unable to update ready state',
        result.error.code,
        result.error.message,
      );
    }

    return result.data;
  },
});
