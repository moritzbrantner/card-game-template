import { describe, expect, it } from 'vitest';

import { createRouteSecurity } from '@/src/api/route-security';
import type { AppSession } from '@/src/auth';
import type { AuditRecord, RateLimitResult } from '@/src/api/security';

function createDependencies(input?: {
  session?: AppSession | null;
  rateLimitResult?: RateLimitResult;
  audit?: AuditRecord[];
  hasPermission?: (
    role: AppSession['user']['role'] | null | undefined,
    permission: string,
  ) => Promise<boolean>;
}) {
  const audit = input?.audit ?? [];

  return {
    audit,
    secure: createRouteSecurity({
      getSession: async () => input?.session ?? null,
      getRateLimitKey: (_request, actorId) =>
        actorId ? `user:${actorId}` : 'ip:test',
      enforceRateLimit: async () =>
        input?.rateLimitResult ?? {
          ok: true,
          remaining: 4,
          resetAt: 1_700_000_000_000,
        },
      auditAction: async (record) => {
        audit.push(record);
      },
      hasPermission: async (role, permission) =>
        input?.hasPermission
          ? input.hasPermission(role, permission)
          : permission.startsWith('admin.')
            ? role === 'ADMIN' || role === 'SUPERADMIN'
            : Boolean(role),
    }),
  };
}

describe('route security helper', () => {
  it('returns 429 and audits rate-limited requests', async () => {
    const { secure, audit } = createDependencies({
      rateLimitResult: {
        ok: false,
        retryAfterSeconds: 42,
        resetAt: 1_700_000_000_000,
      },
    });

    const result = await secure({
      request: new Request('https://example.com/api/auth/login', {
        method: 'POST',
      }),
      action: 'auth.login',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected rate-limited result');
    }

    expect(result.response.status).toBe(429);
    expect(result.response.headers.get('retry-after')).toBe('42');
    expect(audit).toContainEqual(
      expect.objectContaining({
        action: 'auth.login',
        outcome: 'rate_limited',
        statusCode: 429,
      }),
    );
  });

  it('returns 401 for auth-required routes without a session', async () => {
    const { secure, audit } = createDependencies();

    const result = await secure({
      request: new Request('https://example.com/api/profile/display-name', {
        method: 'POST',
      }),
      action: 'profile.updateDisplayName',
      requireAuth: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected unauthorized result');
    }

    expect(result.response.status).toBe(401);
    expect(audit).toContainEqual(
      expect.objectContaining({
        action: 'profile.updateDisplayName',
        outcome: 'denied',
        statusCode: 401,
      }),
    );
  });

  it('returns 403 for role-restricted routes when the role does not match', async () => {
    const { secure, audit } = createDependencies({
      session: {
        user: {
          id: 'user_1',
          email: 'user@example.com',
          tag: 'user',
          name: 'User',
          image: null,
          role: 'USER',
        },
      },
    });

    const result = await secure({
      request: new Request(
        'https://example.com/api/admin/reports/authorization',
      ),
      action: 'admin.reports.authorization',
      allowedRoles: ['ADMIN'],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected forbidden result');
    }

    expect(result.response.status).toBe(403);
    expect(audit).toContainEqual(
      expect.objectContaining({
        actorId: 'user_1',
        action: 'admin.reports.authorization',
        outcome: 'denied',
        statusCode: 403,
      }),
    );
  });

  it('returns 403 for permission-restricted routes when the permission is missing', async () => {
    const { secure, audit } = createDependencies({
      session: {
        user: {
          id: 'admin_1',
          email: 'admin@example.com',
          tag: 'admin',
          name: 'Admin',
          image: null,
          role: 'ADMIN',
        },
      },
      hasPermission: async (_role, permission) =>
        permission !== 'admin.roles.edit',
    });

    const result = await secure({
      request: new Request('https://example.com/api/admin/users/user_1/role', {
        method: 'PATCH',
      }),
      action: 'admin.users.updateRole',
      requiredPermission: 'admin.roles.edit',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected forbidden result');
    }

    expect(result.response.status).toBe(403);
    expect(audit).toContainEqual(
      expect.objectContaining({
        actorId: 'admin_1',
        action: 'admin.users.updateRole',
        outcome: 'denied',
        statusCode: 403,
      }),
    );
  });

  it('returns a responder that audits successful responses and merges rate-limit headers', async () => {
    const audit: AuditRecord[] = [];
    const { secure } = createDependencies({
      session: {
        user: {
          id: 'admin_1',
          email: 'admin@example.com',
          tag: 'admin',
          name: 'Admin',
          image: null,
          role: 'ADMIN',
        },
      },
      audit,
    });

    const result = await secure({
      request: new Request(
        'https://example.com/api/admin/reports/authorization',
      ),
      action: 'admin.reports.authorization',
      allowedRoles: ['ADMIN'],
      metadata: { surface: 'admin' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected authorized result');
    }

    const response = await result.json(
      { ok: true },
      {
        metadata: { report: 'authorization' },
        headers: { 'x-extra': 'value' },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-ratelimit-remaining')).toBe('4');
    expect(response.headers.get('x-extra')).toBe('value');
    expect(audit).toContainEqual(
      expect.objectContaining({
        actorId: 'admin_1',
        action: 'admin.reports.authorization',
        outcome: 'allowed',
        statusCode: 200,
        metadata: {
          surface: 'admin',
          report: 'authorization',
        },
      }),
    );
  });
});
