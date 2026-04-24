import { describe, expect, it } from 'vitest';

import type { AppSession } from '@/src/auth';
import {
  getAdminActionPermissions,
  getAdminAuthorization,
} from '@/src/domain/authorization/use-cases';

function createSession(
  role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'USER',
): AppSession {
  return {
    user: {
      id:
        role === 'SUPERADMIN'
          ? 'superadmin_1'
          : role === 'ADMIN'
            ? 'admin_1'
            : role === 'MANAGER'
              ? 'manager_1'
              : 'user_1',
      email: `${role.toLowerCase()}@example.com`,
      tag:
        role === 'SUPERADMIN'
          ? 'superadmin'
          : role === 'ADMIN'
            ? 'admin'
            : role === 'MANAGER'
              ? 'manager'
              : 'user',
      image: null,
      name: null,
      role,
    },
  };
}

describe('authorization domain use-cases', () => {
  it('returns authentication error for missing session', () => {
    const result = getAdminAuthorization(null);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      },
    });
  });

  it('returns forbidden error for non-admin session', () => {
    const result = getAdminAuthorization(createSession('USER'));

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access admin actions.',
      },
    });
  });

  it('returns forbidden error for manager session', () => {
    const result = getAdminAuthorization(createSession('MANAGER'));

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access admin actions.',
      },
    });
  });

  it('returns allowed actions for admin', () => {
    const result = getAdminAuthorization(createSession('ADMIN'));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.data.actions).toEqual([
      { key: 'viewReports', allowed: true },
      { key: 'manageUsers', allowed: true },
      { key: 'manageRoles', allowed: false },
      { key: 'manageSystemSettings', allowed: true },
    ]);
  });

  it('returns elevated actions for superadmin', () => {
    const result = getAdminAuthorization(createSession('SUPERADMIN'));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.data.actions).toEqual([
      { key: 'viewReports', allowed: true },
      { key: 'manageUsers', allowed: true },
      { key: 'manageRoles', allowed: true },
      { key: 'manageSystemSettings', allowed: true },
    ]);
  });

  it('computes admin action permissions from role', () => {
    expect(getAdminActionPermissions('USER')).toEqual([
      { key: 'viewReports', allowed: false },
      { key: 'manageUsers', allowed: false },
      { key: 'manageRoles', allowed: false },
      { key: 'manageSystemSettings', allowed: false },
    ]);

    expect(getAdminActionPermissions('MANAGER')).toEqual([
      { key: 'viewReports', allowed: false },
      { key: 'manageUsers', allowed: false },
      { key: 'manageRoles', allowed: false },
      { key: 'manageSystemSettings', allowed: false },
    ]);
  });
});
