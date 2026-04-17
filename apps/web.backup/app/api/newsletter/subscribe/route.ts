import * as z from 'zod';

import { subscribeToNewsletter } from '@/src/domain/newsletter/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'newsletter.subscribe',
  featureKey: 'newsletter',
  bodySchema: z.object({
    email: z.string().min(1),
    locale: z.string().optional(),
    source: z.string().optional(),
  }),
  async handler({ body }) {
    const result = await subscribeToNewsletter(body);

    if (!result.ok) {
      throw new ProblemError(problem('/problems/newsletter-subscription', 'Unable to subscribe', 400, result.error));
    }

    return { ok: true };
  },
});
