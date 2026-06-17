import { getTcgMatchRealtimeUseCase } from '@/src/domain/game-matches/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

function getMatchId(request: Request) {
  const segments = new URL(request.url).pathname.split('/');
  return segments[segments.length - 2] ?? '';
}

function getAfterSequence(request: Request) {
  const value = new URL(request.url).searchParams.get('afterSequence');

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function getSinceUpdatedAt(request: Request) {
  return new URL(request.url).searchParams.get('sinceUpdatedAt');
}

export const GET = createApiRoute({
  action: 'games.tcg.matches.events',
  featureKey: 'showcase.tcg',
  async handler({ request, session }) {
    const result = await getTcgMatchRealtimeUseCase(
      session,
      getMatchId(request),
      {
        afterSequence: getAfterSequence(request),
        sinceUpdatedAt: getSinceUpdatedAt(request),
      },
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
          '/problems/tcg-match-events',
          'Unable to load match events',
          status,
          result.error.message,
        ),
      );
    }

    return result.data;
  },
});
