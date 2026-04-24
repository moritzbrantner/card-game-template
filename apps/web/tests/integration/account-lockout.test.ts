import { describe, expect, it, vi } from 'vitest';

import {
  clearCredentialFailuresForUser,
  registerCredentialFailureForUser,
} from '@/src/auth/account-lifecycle';

describe('account lockout controls', () => {
  it('increments failures and applies lockout after threshold', async () => {
    const deps = {
      findUserByEmail: vi.fn(),
      findUserByTag: vi.fn(),
      createUser: vi.fn(),
      issueToken: vi.fn(),
      findToken: vi.fn(),
      deleteToken: vi.fn(),
      deleteTokensByIdentifierPrefix: vi.fn(),
      markEmailVerified: vi.fn(),
      updatePassword: vi.fn(),
      updateFailureState: vi.fn(),
      clearFailureState: vi.fn(),
      hashPassword: vi.fn(),
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_3',
        email: 'person@example.com',
        failedSignInAttempts: 4,
        lockoutUntil: null,
      }),
    };

    await registerCredentialFailureForUser('user_3', deps);

    expect(deps.updateFailureState).toHaveBeenCalledWith(
      'user_3',
      5,
      expect.any(Date),
    );
  });

  it('clears lockout state after successful sign-in', async () => {
    const deps = {
      findUserByEmail: vi.fn(),
      findUserByTag: vi.fn(),
      createUser: vi.fn(),
      issueToken: vi.fn(),
      findToken: vi.fn(),
      deleteToken: vi.fn(),
      deleteTokensByIdentifierPrefix: vi.fn(),
      markEmailVerified: vi.fn(),
      updatePassword: vi.fn(),
      updateFailureState: vi.fn(),
      clearFailureState: vi.fn(),
      hashPassword: vi.fn(),
      findUserById: vi.fn(),
    };

    await clearCredentialFailuresForUser('user_3', deps);

    expect(deps.clearFailureState).toHaveBeenCalledWith('user_3');
  });
});
