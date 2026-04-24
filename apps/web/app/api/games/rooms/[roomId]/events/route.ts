import { getGameRoomRealtimeUseCase } from '@/src/domain/game-rooms/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

function getRoomId(request: Request) {
  const segments = new URL(request.url).pathname.split('/');
  return segments[segments.length - 2] ?? '';
}

function getSinceUpdatedAt(request: Request) {
  return new URL(request.url).searchParams.get('sinceUpdatedAt');
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

export const GET = createApiRoute({
  action: 'games.rooms.events',
  featureKey: 'showcase.uno',
  async handler({ request, session }) {
    const result = await getGameRoomRealtimeUseCase(
      session,
      getRoomId(request),
      {
        sinceUpdatedAt: getSinceUpdatedAt(request),
      },
    );

    if (!result.ok) {
      throw mapRoomProblem(
        'Unable to load room events',
        result.error.code,
        result.error.message,
      );
    }

    return result.data;
  },
});
