import * as z from 'zod';

import { recordPageVisit } from '@/src/analytics/page-visits';
import { getAuthSession } from '@/src/auth.server';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';
import { getConsentState } from '@/src/privacy/consent';
import { getPublicSiteConfig } from '@/src/site-config/service';

export const POST = createApiRoute({
  action: 'analytics.pageVisits',
  bodySchema: z.object({
    href: z.string().min(1),
    visitorId: z.string().min(1),
    sessionId: z.string().min(1),
    previousHref: z.string().min(1).optional(),
    occurredAt: z.string().min(1).optional(),
    documentReferrer: z.string().min(1).optional(),
  }),
  async handler({ body, request }) {
    const session = await getAuthSession();
    const userId = session?.user.id;
    const siteConfig = await getPublicSiteConfig();
    const consent = await getConsentState();

    if (!siteConfig.flags['analytics.pageVisits'] || !consent.state.analytics) {
      return Response.json({ tracked: false }, { status: 202 });
    }

    try {
      const occurredAt = body.occurredAt
        ? new Date(body.occurredAt)
        : undefined;

      if (occurredAt && Number.isNaN(occurredAt.getTime())) {
        throw new Error('Invalid page visit timestamp.');
      }

      const visit = await recordPageVisit({
        userId,
        href: body.href,
        visitorId: body.visitorId,
        sessionId: body.sessionId,
        previousHref: body.previousHref,
        occurredAt,
        documentReferrer: body.documentReferrer,
        requestUrl: request.url,
      });
      return Response.json(
        { tracked: true, visitId: visit.id },
        { status: 201 },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'Page visit href is required.' ||
          error.message === 'Invalid page visit href.' ||
          error.message === 'Invalid page visit timestamp.')
      ) {
        throw new ProblemError(
          problem(
            '/problems/page-visit',
            'Invalid page visit',
            400,
            error.message,
          ),
        );
      }

      return Response.json({ tracked: false }, { status: 202 });
    }
  },
});
