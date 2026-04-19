import {
  getUnoMatchSnapshotUseCase,
} from '@/src/domain/game-matches/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

function getMatchId(request: Request) {
  const segments = new URL(request.url).pathname.split('/');
  return segments[segments.length - 1] ?? '';
}

export const GET = createApiRoute({
  action: 'games.uno.matches.get',
  featureKey: 'showcase.uno',
  async handler({ request, session }) {
    const result = await getUnoMatchSnapshotUseCase(session, getMatchId(request));

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'CONFLICT' ? 409 : 400;
      throw new ProblemError(problem('/problems/uno-match', 'Unable to load match', status, result.error.message));
    }

    return result.data;
  },
});
