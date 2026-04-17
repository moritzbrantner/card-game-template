import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  exportAdminReportUseCase,
  getAdminReportDetailUseCase,
  getAdminReportSummaryUseCase,
  getAdminWorkspaceKey,
  serializeAdminReportCsv,
  stripLocalePrefix,
} from '@/src/domain/admin-reports/use-cases';

function createVisit(overrides: Partial<{
  id: string;
  userId: string | null;
  trackingVersion: number;
  visitorId: string;
  sessionId: string;
  pathname: string;
  href: string;
  canonicalPath: string;
  routeGroup: string;
  isAuthenticated: boolean;
  previousPathname: string | null;
  previousCanonicalPath: string | null;
  referrerType: string;
  referrerHost: string | null;
  visitedAt: Date;
}> = {}) {
  return {
    id: 'visit_1',
    userId: 'admin_1',
    trackingVersion: 2,
    visitorId: 'visitor_1',
    sessionId: 'session_1',
    pathname: '/en/admin/reports',
    href: '/en/admin/reports',
    canonicalPath: '/admin/reports',
    routeGroup: 'admin',
    isAuthenticated: true,
    previousPathname: null,
    previousCanonicalPath: null,
    referrerType: 'direct',
    referrerHost: null,
    visitedAt: new Date('2026-04-16T08:00:00.000Z'),
    ...overrides,
  };
}

const fakeDeps = Promise.resolve({
  listUsers: async () => [
    { id: 'admin_1', role: 'ADMIN' as const, lockoutUntil: null },
    { id: 'manager_1', role: 'MANAGER' as const, lockoutUntil: null },
  ],
  listAuditLogsSince: async () => [
    {
      id: 'audit_1',
      actorId: 'admin_1',
      action: 'admin.reports.export',
      outcome: 'allowed',
      statusCode: 200,
      metadata: {},
      timestamp: new Date('2026-04-16T08:00:00.000Z'),
    },
  ],
  listPageVisitsSince: async () => [],
  listJobsSince: async () => [],
});

afterEach(() => {
  vi.useRealTimers();
});

describe('admin report exports', () => {
  it('normalizes localized admin paths into workspace keys', () => {
    expect(stripLocalePrefix('/en/admin/reports?window=7d')).toBe('/admin/reports?window=7d');
    expect(getAdminWorkspaceKey('/en/admin/reports')).toBe('reports');
    expect(getAdminWorkspaceKey('/de/admin/users/123')).toBe('users');
    expect(getAdminWorkspaceKey('/en/admin')).toBe('overview');
  });

  it('excludes localized non-admin routes', () => {
    expect(getAdminWorkspaceKey('/en/settings')).toBeNull();
    expect(getAdminWorkspaceKey('/de/profile')).toBeNull();
  });

  it('serializes CSV rows with stable headers', async () => {
    const exported = await exportAdminReportUseCase('auditActivity', '7d', 'csv', fakeDeps);

    expect(exported.filename).toBe('auditActivity-7d.csv');
    expect(exported.body.split('\n')[0]).toBe('Timestamp,Action,Outcome,Status,Actor');
  });

  it('escapes CSV content correctly', () => {
    expect(
      serializeAdminReportCsv({
        columns: ['A', 'B'],
        rows: [['alpha', 'quote "here"']],
        emptyMessage: '',
      }),
    ).toBe('A,B\nalpha,"quote ""here"""');
  });

  it('compares summary metrics against the previous equal-length window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T12:00:00.000Z'));

    const summary = await getAdminReportSummaryUseCase(
      '7d',
      Promise.resolve({
        listUsers: async () => [{ id: 'admin_1', role: 'ADMIN' as const, lockoutUntil: null }],
        listAuditLogsSince: async () => [],
        listPageVisitsSince: async () => [
          createVisit({ id: 'visit_current_1', visitedAt: new Date('2026-04-11T08:00:00.000Z') }),
          createVisit({
            id: 'visit_current_2',
            userId: 'admin_2',
            visitorId: 'visitor_2',
            sessionId: 'session_2',
            pathname: '/de/admin/users/123',
            href: '/de/admin/users/123',
            canonicalPath: '/admin/users/[userId]',
            visitedAt: new Date('2026-04-12T09:00:00.000Z'),
          }),
          createVisit({
            id: 'visit_previous_1',
            userId: 'admin_3',
            visitorId: 'visitor_3',
            sessionId: 'session_3',
            visitedAt: new Date('2026-04-07T09:00:00.000Z'),
          }),
        ],
        listJobsSince: async () => [],
      }),
    );

    const adminVisitsMetric = summary.metrics.find((metric) => metric.id === 'adminVisits');

    expect(summary.status).toBe('live');
    expect(adminVisitsMetric?.value).toBe('2');
    expect(adminVisitsMetric?.change?.rawDelta).toBe(1);
    expect(adminVisitsMetric?.change?.detail).toContain('previous 7d');
  });

  it('returns degraded summaries without rendering zero values as truth', async () => {
    const summary = await getAdminReportSummaryUseCase(
      '7d',
      Promise.resolve({
        listUsers: async () => {
          throw new Error('database unavailable');
        },
        listAuditLogsSince: async () => [],
        listPageVisitsSince: async () => [],
        listJobsSince: async () => [],
      }),
    );

    expect(summary.status).toBe('degraded');
    expect(summary.metrics.every((metric) => metric.value === 'Data unavailable')).toBe(true);
  });

  it('aggregates navigation journeys and scopes transitions by filters', async () => {
    const detail = await getAdminReportDetailUseCase(
      'navigationJourneys',
      '7d',
      Promise.resolve({
        listUsers: async () => [],
        listAuditLogsSince: async () => [],
        listPageVisitsSince: async () => [
          createVisit({
            id: 'home',
            userId: null,
            visitorId: 'visitor_anon',
            sessionId: 'session_anon',
            pathname: '/en',
            href: '/en',
            canonicalPath: '/',
            routeGroup: 'public',
            isAuthenticated: false,
            visitedAt: new Date('2026-04-14T08:00:00.000Z'),
          }),
          createVisit({
            id: 'blog',
            userId: null,
            visitorId: 'visitor_anon',
            sessionId: 'session_anon',
            pathname: '/en/blog',
            href: '/en/blog',
            canonicalPath: '/blog',
            routeGroup: 'public',
            isAuthenticated: false,
            previousPathname: '/en',
            previousCanonicalPath: '/',
            referrerType: 'internal',
            visitedAt: new Date('2026-04-14T08:02:00.000Z'),
          }),
          createVisit({
            id: 'login',
            userId: null,
            visitorId: 'visitor_anon',
            sessionId: 'session_anon',
            pathname: '/en/login',
            href: '/en/login',
            canonicalPath: '/login',
            routeGroup: 'guest',
            isAuthenticated: false,
            previousPathname: '/en/blog',
            previousCanonicalPath: '/blog',
            referrerType: 'internal',
            visitedAt: new Date('2026-04-14T08:05:00.000Z'),
          }),
          createVisit({
            id: 'people',
            userId: 'user_1',
            visitorId: 'visitor_auth',
            sessionId: 'session_auth',
            pathname: '/en/people',
            href: '/en/people',
            canonicalPath: '/people',
            routeGroup: 'authenticated',
            isAuthenticated: true,
            previousPathname: '/en/login',
            previousCanonicalPath: '/login',
            referrerType: 'internal',
            visitedAt: new Date('2026-04-15T09:00:00.000Z'),
          }),
          createVisit({
            id: 'profile',
            userId: 'user_1',
            visitorId: 'visitor_auth',
            sessionId: 'session_auth',
            pathname: '/en/profile',
            href: '/en/profile',
            canonicalPath: '/profile',
            routeGroup: 'authenticated',
            isAuthenticated: true,
            previousPathname: '/en/people',
            previousCanonicalPath: '/people',
            referrerType: 'internal',
            visitedAt: new Date('2026-04-15T09:04:00.000Z'),
          }),
          createVisit({
            id: 'notifications',
            userId: 'user_1',
            visitorId: 'visitor_auth',
            sessionId: 'session_auth',
            pathname: '/en/notifications',
            href: '/en/notifications',
            canonicalPath: '/notifications',
            routeGroup: 'authenticated',
            isAuthenticated: true,
            previousPathname: '/en/profile',
            previousCanonicalPath: '/profile',
            referrerType: 'internal',
            visitedAt: new Date('2026-04-15T09:08:00.000Z'),
          }),
        ],
        listJobsSince: async () => [],
      }),
      {
        audience: 'anonymous',
        routeGroup: 'all',
        path: '/blog',
      },
    );

    expect(detail.cards.find((card) => card.id === 'uniqueVisitors')?.value).toBe('1');
    expect(detail.cards.find((card) => card.id === 'sessions')?.value).toBe('1');
    expect(detail.table.rows).toContainEqual(['/blog', '/login', '1', '100%', '1', '0%']);
    expect(detail.filters?.path).toBe('/blog');
  });

  it('exports filtered navigation journeys as CSV', async () => {
    const exported = await exportAdminReportUseCase(
      'navigationJourneys',
      '7d',
      'csv',
      Promise.resolve({
        listUsers: async () => [],
        listAuditLogsSince: async () => [],
        listPageVisitsSince: async () => [
          createVisit({
            id: 'visit_1',
            userId: null,
            visitorId: 'visitor_1',
            sessionId: 'session_1',
            pathname: '/en',
            href: '/en',
            canonicalPath: '/',
            routeGroup: 'public',
            isAuthenticated: false,
          }),
          createVisit({
            id: 'visit_2',
            userId: null,
            visitorId: 'visitor_1',
            sessionId: 'session_1',
            pathname: '/en/blog',
            href: '/en/blog',
            canonicalPath: '/blog',
            routeGroup: 'public',
            isAuthenticated: false,
            previousPathname: '/en',
            previousCanonicalPath: '/',
            referrerType: 'internal',
            visitedAt: new Date('2026-04-16T08:02:00.000Z'),
          }),
        ],
        listJobsSince: async () => [],
      }),
      {
        audience: 'anonymous',
        routeGroup: 'all',
        path: '/',
      },
    );

    expect(exported.body.split('\n')[0]).toBe('From,To,Transitions,Transition share,From page views,Exit rate after from');
    expect(exported.body).toContain('/,/blog,1,100%,1,0%');
  });
});
