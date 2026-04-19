import { getUnoReplayUseCase } from '@/src/domain/game-matches/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

function getMatchId(request: Request) {
  const segments = new URL(request.url).pathname.split('/');
  return segments[segments.length - 2] ?? '';
}

export const GET = createApiRoute({
  action: 'games.uno.matches.replay',
  featureKey: 'showcase.uno',
  async handler({ request, session }) {
    const result = await getUnoReplayUseCase(session, getMatchId(request));

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'CONFLICT' ? 409 : 400;
      throw new ProblemError(problem('/problems/uno-match-replay', 'Unable to load replay', status, result.error.message));
    }

    return result.data;
  },
});
