import * as z from 'zod';

import {
  createPrivateGameRoomUseCase,
  listGameRoomsUseCase,
} from '@/src/domain/game-rooms/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const createRoomBodySchema = z.object({
  gameId: z.string().trim().min(1),
  displayName: z.string().trim().min(1).max(60).optional(),
  maxPlayers: z.number().int().min(2).max(12).optional(),
});

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
  return new ProblemError(problem('/problems/game-room', title, status, detail));
}

export const GET = createApiRoute({
  action: 'games.rooms.list',
  featureKey: 'showcase.uno',
  async handler({ session }) {
    const result = await listGameRoomsUseCase(session);
    return result.ok ? result.data : [];
  },
});

export const POST = createApiRoute({
  action: 'games.rooms.create',
  featureKey: 'showcase.uno',
  bodySchema: createRoomBodySchema,
  async handler({ body, session }) {
    const result = await createPrivateGameRoomUseCase(session, body);

    if (!result.ok) {
      throw mapRoomProblem('Unable to create room', result.error.code, result.error.message);
    }

    return result.data;
  },
});
