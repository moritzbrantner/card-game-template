import { afterEach, describe, expect, it, vi } from 'vitest';

function createApiMocks(input: {
  session: { user?: { id: string } } | null;
  analyticsConsent: boolean;
  analyticsEnabled: boolean;
  recordPageVisitImpl?: ReturnType<typeof vi.fn>;
}) {
  const recordPageVisit = input.recordPageVisitImpl ?? vi.fn().mockResolvedValue({ id: 'visit_1' });

  vi.doMock('@/src/api/security', () => ({
    auditAction: vi.fn().mockResolvedValue(undefined),
    enforceRateLimit: vi.fn().mockResolvedValue({ ok: true, remaining: 10, resetAt: 0 }),
    getRateLimitKey: vi.fn().mockReturnValue('test'),
  }));
  vi.doMock('@/src/auth.server', () => ({
    getAuthSession: vi.fn().mockResolvedValue(input.session),
  }));
  vi.doMock('@/src/observability/logger', () => ({
    errorReporter: vi.fn(),
    getLogger: vi.fn().mockReturnValue({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    }),
  }));
  vi.doMock('@/src/observability/request-context', () => ({
    createRequestContext: vi.fn().mockReturnValue({ requestId: 'test-request' }),
    setRequestActorId: vi.fn(),
    withRequestContext: vi.fn(async (_context, callback: () => Promise<Response>) => callback()),
  }));
  vi.doMock('@/src/privacy/consent', () => ({
    getConsentState: vi.fn().mockResolvedValue({
      hasExplicitChoice: true,
      state: {
        necessary: true,
        analytics: input.analyticsConsent,
        marketing: false,
      },
    }),
  }));
  vi.doMock('@/src/site-config/service', () => ({
    getPublicSiteConfig: vi.fn().mockResolvedValue({
      siteName: 'Test App',
      siteUrl: 'https://app.example.com',
      seo: {
        defaultTitle: 'Test',
        titleSuffix: '',
        defaultDescription: 'Test',
        defaultOgImage: null,
      },
      contact: {
        supportEmail: 'support@example.com',
      },
      flags: {
        'marketing.blog': true,
        'marketing.changelog': true,
        'marketing.announcements': true,
        'analytics.pageVisits': input.analyticsEnabled,
      },
    }),
  }));
  vi.doMock('@/src/analytics/page-visits', () => ({
    recordPageVisit,
  }));

  return {
    recordPageVisit,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock('@/src/api/security');
  vi.doUnmock('@/src/auth.server');
  vi.doUnmock('@/src/observability/logger');
  vi.doUnmock('@/src/observability/request-context');
  vi.doUnmock('@/src/privacy/consent');
  vi.doUnmock('@/src/site-config/service');
  vi.doUnmock('@/src/analytics/page-visits');
});

describe('page visit analytics route', () => {
  it('tracks an anonymous consented visitor', async () => {
    const { recordPageVisit } = createApiMocks({
      session: null,
      analyticsConsent: true,
      analyticsEnabled: true,
    });

    const route = await import('@/app/api/analytics/page-visits/route');
    const response = await route.POST(
      new Request('https://app.example.com/api/analytics/page-visits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          href: '/en',
          visitorId: 'visitor_1',
          sessionId: 'session_1',
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(recordPageVisit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: undefined,
        href: '/en',
        visitorId: 'visitor_1',
        sessionId: 'session_1',
      }),
    );
  });

  it('tracks an authenticated visitor and forwards referrer context', async () => {
    const { recordPageVisit } = createApiMocks({
      session: { user: { id: 'user_1' } },
      analyticsConsent: true,
      analyticsEnabled: true,
    });

    const route = await import('@/app/api/analytics/page-visits/route');
    const response = await route.POST(
      new Request('https://app.example.com/api/analytics/page-visits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          href: '/en/profile',
          visitorId: 'visitor_1',
          sessionId: 'session_1',
          previousHref: '/en/people',
          documentReferrer: 'https://search.example.net/results',
          occurredAt: '2026-04-16T09:00:00.000Z',
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(recordPageVisit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        previousHref: '/en/people',
        documentReferrer: 'https://search.example.net/results',
      }),
    );
  });

  it('returns tracked false when analytics consent is disabled', async () => {
    const { recordPageVisit } = createApiMocks({
      session: null,
      analyticsConsent: false,
      analyticsEnabled: true,
    });

    const route = await import('@/app/api/analytics/page-visits/route');
    const response = await route.POST(
      new Request('https://app.example.com/api/analytics/page-visits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          href: '/en',
          visitorId: 'visitor_1',
          sessionId: 'session_1',
        }),
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ tracked: false });
    expect(recordPageVisit).not.toHaveBeenCalled();
  });

  it('returns tracked false when the analytics feature flag is disabled', async () => {
    const { recordPageVisit } = createApiMocks({
      session: null,
      analyticsConsent: true,
      analyticsEnabled: false,
    });

    const route = await import('@/app/api/analytics/page-visits/route');
    const response = await route.POST(
      new Request('https://app.example.com/api/analytics/page-visits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          href: '/en',
          visitorId: 'visitor_1',
          sessionId: 'session_1',
        }),
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ tracked: false });
    expect(recordPageVisit).not.toHaveBeenCalled();
  });
});
