import { getUnoMatchRealtimeUseCase } from '@/src/domain/game-matches/use-cases';
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

function getProblemStatus(code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_ERROR') {
  return code === 'NOT_FOUND' ? 404 : code === 'CONFLICT' ? 409 : 400;
}

export const GET = createApiRoute({
  action: 'games.uno.matches.events',
  featureKey: 'showcase.uno',
  async handler({ request, session }) {
    const matchId = getMatchId(request);
    const realtimeInput = {
      afterSequence: getAfterSequence(request),
      sinceUpdatedAt: getSinceUpdatedAt(request),
    };

    const result = await getUnoMatchRealtimeUseCase(
      session,
      matchId,
      realtimeInput,
    );

    if (!result.ok) {
      const status = getProblemStatus(result.error.code);
      throw new ProblemError(
        problem(
          '/problems/uno-match-events',
          'Unable to load match events',
          status,
          result.error.message,
        ),
      );
    }

    return result.data;
  },
});
