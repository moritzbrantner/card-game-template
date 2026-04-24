import type { ReactElement, ReactNode } from 'react';

import { afterEach, describe, expect, it, vi } from 'vitest';

function createFeatureMock(disabledKeys: string[]) {
  return {
    isFeatureEnabled: (featureKey: string) =>
      !disabledKeys.includes(featureKey),
  };
}

function createApiMocks() {
  vi.doMock('@/src/api/security', () => ({
    auditAction: vi.fn().mockResolvedValue(undefined),
    enforceRateLimit: vi
      .fn()
      .mockResolvedValue({ ok: true, remaining: 10, resetAt: 0 }),
    getRateLimitKey: vi.fn().mockReturnValue('test'),
  }));
  vi.doMock('@/src/auth.server', () => ({
    getAuthSession: vi.fn().mockResolvedValue(null),
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
    createRequestContext: vi
      .fn()
      .mockReturnValue({ requestId: 'test-request' }),
    setRequestActorId: vi.fn(),
    withRequestContext: vi.fn(
      async (_context, callback: () => Promise<Response>) => callback(),
    ),
  }));
}

function findElementByType(node: ReactNode, type: string): ReactElement | null {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) {
    return element;
  }

  const children = element.props?.children;

  if (Array.isArray(children)) {
    for (const child of children) {
      const match = findElementByType(child, type);
      if (match) {
        return match;
      }
    }
  }

  return findElementByType(children, type);
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock('@/src/foundation/features/runtime');
  vi.doUnmock('@/src/api/security');
  vi.doUnmock('@/src/auth.server');
  vi.doUnmock('@/src/observability/logger');
  vi.doUnmock('@/src/observability/request-context');
  vi.doUnmock('next/navigation');
  vi.doUnmock('@/components/profile-follow-panel');
  vi.doUnmock('@/src/domain/profile/use-cases');
});

describe('feature gating', () => {
  it('returns 404 for the signup endpoint and page when registration is disabled', async () => {
    createApiMocks();
    vi.doMock('@/src/foundation/features/runtime', () =>
      createFeatureMock(['account.register']),
    );

    const { POST } = await import('@/app/api/account/signup/route');
    const response = await POST(
      new Request('http://localhost/api/account/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'person@example.com',
          password: 'VerySecure123',
        }),
      }),
    );

    expect(response.status).toBe(404);

    const notFound = vi.fn(() => {
      throw new Error('NOT_FOUND');
    });
    vi.doMock('next/navigation', () => ({
      notFound,
      redirect: vi.fn(),
    }));
    vi.doMock('@/src/auth.server', () => ({
      getAuthSession: vi.fn().mockResolvedValue(null),
    }));

    const registerPage = await import('@/app/[locale]/(guest)/register/page');
    await expect(
      registerPage.default({ params: Promise.resolve({ locale: 'en' }) }),
    ).rejects.toThrow('NOT_FOUND');
  });

  it('removes follow behavior from the public profile surface and follow API when the feature is disabled', async () => {
    createApiMocks();
    vi.doMock('@/src/foundation/features/runtime', () =>
      createFeatureMock(['profiles.follow']),
    );

    const { POST } = await import('@/app/api/profile/follow/route');
    const response = await POST(
      new Request('http://localhost/api/profile/follow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 'user_2' }),
      }),
    );

    expect(response.status).toBe(404);

    vi.doMock('@/components/profile-follow-panel', () => ({
      ProfileFollowPanel: 'mock-follow-panel',
    }));
    vi.doMock('@/src/domain/profile/use-cases', () => ({
      getProfileViewByTagUseCase: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          userId: 'user_2',
          tag: 'person',
          displayName: 'Person',
          imageUrl: null,
          followerCount: 3,
          isOwnProfile: false,
          isFollowing: true,
          isBlockedByViewer: false,
        },
      }),
    }));
    vi.doMock('@/src/auth.server', () => ({
      getAuthSession: vi.fn().mockResolvedValue({ user: { id: 'user_1' } }),
    }));

    const profilePage =
      await import('@/app/[locale]/(public)/profile/[userId]/page');
    const rendered = await profilePage.default({
      params: Promise.resolve({ locale: 'en', userId: '@person' }),
    });
    const followPanel = findElementByType(
      rendered,
      'mock-follow-panel',
    ) as ReactElement<{ canManageFollowState: boolean }> | null;

    expect(followPanel?.props.canManageFollowState).toBe(false);
  });

  it('returns 404 for disabled showcase pages and example APIs', async () => {
    vi.doMock('@/src/foundation/features/runtime', () =>
      createFeatureMock(['showcase.forms', 'showcase.employeeTable']),
    );

    const notFound = vi.fn(() => {
      throw new Error('NOT_FOUND');
    });
    vi.doMock('next/navigation', async () => {
      const actual =
        await vi.importActual<typeof import('next/navigation')>(
          'next/navigation',
        );
      return {
        ...actual,
        notFound,
      };
    });

    const publicResolver =
      await import('@/app/[locale]/(public)/[[...publicSlug]]/page');
    await expect(
      publicResolver.default({
        params: Promise.resolve({
          locale: 'en',
          publicSlug: ['examples', 'forms'],
        }),
      }),
    ).rejects.toThrow('NOT_FOUND');

    const examplesApi = await import('@/app/api/examples/[...path]/route');
    const response = await examplesApi.GET(
      new Request('http://localhost/api/examples/employees'),
      { params: Promise.resolve({ path: ['employees'] }) },
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 for disabled admin pages and APIs', async () => {
    createApiMocks();
    vi.doMock('@/src/foundation/features/runtime', () =>
      createFeatureMock(['admin.reports', 'admin.users', 'admin.dataStudio']),
    );

    const notFound = vi.fn(() => {
      throw new Error('NOT_FOUND');
    });
    vi.doMock('next/navigation', async () => {
      const actual =
        await vi.importActual<typeof import('next/navigation')>(
          'next/navigation',
        );
      return {
        ...actual,
        notFound,
      };
    });

    const reportsPage =
      await import('@/app/[locale]/(admin)/admin/reports/page');
    await expect(
      reportsPage.default({
        params: Promise.resolve({ locale: 'en' }),
      }),
    ).rejects.toThrow('NOT_FOUND');

    const notificationsRoute =
      await import('@/app/api/admin/notifications/route');
    const notificationResponse = await notificationsRoute.POST(
      new Request('http://localhost/api/admin/notifications', {
        method: 'POST',
        body: new FormData(),
      }),
    );
    expect(notificationResponse.status).toBe(404);

    const dataStudioRoute =
      await import('@/app/api/admin/data-studio/records/route');
    const dataStudioResponse = await dataStudioRoute.POST(
      new Request('http://localhost/api/admin/data-studio/records', {
        method: 'POST',
        body: new FormData(),
      }),
    );
    expect(dataStudioResponse.status).toBe(404);
  });
});
