import { describe, expect, it, vi } from 'vitest';

import { updateAdminUserFeatureAccessUseCase } from '@/src/domain/admin-users/use-cases';

describe('admin user feature access', () => {
  it('allows admins to disable supported functionality for non-admin users', async () => {
    const saveUserFeatureOverride = vi.fn().mockResolvedValue(undefined);

    const result = await updateAdminUserFeatureAccessUseCase(
      {
        actorUserId: 'admin_1',
        targetUserId: 'user_1',
        featureKey: 'notifications',
        enabled: false,
      },
      Promise.resolve({
        findUserById: vi.fn(async (userId: string) => {
          if (userId === 'admin_1') {
            return { id: 'admin_1', role: 'ADMIN' as const };
          }

          if (userId === 'user_1') {
            return { id: 'user_1', role: 'USER' as const };
          }

          return undefined;
        }),
        saveUserFeatureOverride,
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        enabled: false,
      },
    });
    expect(saveUserFeatureOverride).toHaveBeenCalledWith({
      userId: 'user_1',
      featureKey: 'notifications',
      enabled: false,
    });
  });

  it('rejects attempts to manage admin accounts through per-user functionality controls', async () => {
    const result = await updateAdminUserFeatureAccessUseCase(
      {
        actorUserId: 'admin_1',
        targetUserId: 'admin_2',
        featureKey: 'notifications',
        enabled: false,
      },
      Promise.resolve({
        findUserById: vi.fn(async (userId: string) => {
          if (userId === 'admin_1') {
            return { id: 'admin_1', role: 'ADMIN' as const };
          }

          if (userId === 'admin_2') {
            return { id: 'admin_2', role: 'ADMIN' as const };
          }

          return undefined;
        }),
        saveUserFeatureOverride: vi.fn(),
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Per-user functionality controls are only available for non-admin accounts.',
      },
    });
  });

  it('rejects features that do not support per-user overrides', async () => {
    const result = await updateAdminUserFeatureAccessUseCase(
      {
        actorUserId: 'admin_1',
        targetUserId: 'user_1',
        featureKey: 'content.blog',
        enabled: false,
      },
      Promise.resolve({
        findUserById: vi.fn(async (userId: string) => {
          if (userId === 'admin_1') {
            return { id: 'admin_1', role: 'ADMIN' as const };
          }

          if (userId === 'user_1') {
            return { id: 'user_1', role: 'USER' as const };
          }

          return undefined;
        }),
        saveUserFeatureOverride: vi.fn(),
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'This functionality cannot be overridden for individual users.',
      },
    });
  });
});
