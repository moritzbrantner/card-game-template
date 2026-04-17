import { describe, expect, it, vi } from 'vitest';

import {
  deleteAccountUseCase,
  updateAccountEmailUseCase,
} from '@/src/domain/account/use-cases';
import {
  requestPasswordReset as requestPasswordResetLifecycle,
  resetPasswordWithToken as resetPasswordWithTokenLifecycle,
  signUpWithCredentials as signUpWithCredentialsLifecycle,
  verifyEmailByToken as verifyEmailByTokenLifecycle,
} from '@/src/auth/account-lifecycle';

function createDeps() {
  return {
    findUserByEmail: vi.fn(),
    findUserByTag: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    issueToken: vi.fn(),
    findToken: vi.fn(),
    deleteToken: vi.fn(),
    deleteTokensByIdentifierPrefix: vi.fn(),
    markEmailVerified: vi.fn(),
    updatePassword: vi.fn(),
    updateEmail: vi.fn(),
    performAccountDeletion: vi.fn(),
    deleteProfileImage: vi.fn(),
    updateFailureState: vi.fn(),
    clearFailureState: vi.fn(),
    hashPassword: vi.fn().mockResolvedValue('hashed-password'),
    verifyPassword: vi.fn(),
  };
}

describe('account lifecycle', () => {
  it('signs up users with hashed password and issues a verification token', async () => {
    const deps = createDeps();
    deps.findUserByEmail.mockResolvedValue(undefined);
    deps.findUserByTag.mockResolvedValue(undefined);

    const result = await signUpWithCredentialsLifecycle(
      {
        email: '  NewUser@example.com ',
        password: 'VerySecure123',
        name: 'New User',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.hashPassword).toHaveBeenCalledWith('VerySecure123');
    expect(deps.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newuser@example.com',
        tag: expect.any(String),
        passwordHash: 'hashed-password',
      }),
    );
    expect(deps.issueToken).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid and duplicate account creation attempts', async () => {
    const deps = createDeps();
    deps.findUserByTag.mockResolvedValue(undefined);

    await expect(
      signUpWithCredentialsLifecycle(
        {
          email: 'not-an-email',
          password: 'VerySecure123',
        },
        deps,
      ),
    ).resolves.toEqual({ ok: false, error: 'A valid email is required.' });

    await expect(
      signUpWithCredentialsLifecycle(
        {
          email: 'person@example.com',
          password: 'short',
        },
        deps,
      ),
    ).resolves.toEqual({ ok: false, error: 'Password must be at least 10 characters.' });

    await expect(
      signUpWithCredentialsLifecycle(
        {
          email: 'person@example.com',
          password: 'verysecure123',
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: false,
      error: 'Password must include uppercase, lowercase, and a number.',
    });

    await expect(
      signUpWithCredentialsLifecycle(
        {
          email: 'person@example.com',
          password: 'VerySecure123',
          name: 'x'.repeat(81),
        },
        deps,
      ),
    ).resolves.toEqual({ ok: false, error: 'Display name must be 80 characters or fewer.' });

    expect(deps.createUser).not.toHaveBeenCalled();
    expect(deps.issueToken).not.toHaveBeenCalled();

    const duplicateDeps = createDeps();
    duplicateDeps.findUserByEmail.mockResolvedValue({
      id: 'existing_user',
      email: 'person@example.com',
      failedSignInAttempts: 0,
      lockoutUntil: null,
    });

    await expect(
      signUpWithCredentialsLifecycle(
        {
          email: 'person@example.com',
          password: 'VerySecure123',
        },
        duplicateDeps,
      ),
    ).resolves.toEqual({ ok: false, error: 'An account already exists for this email.' });

    expect(duplicateDeps.createUser).not.toHaveBeenCalled();
    expect(duplicateDeps.issueToken).not.toHaveBeenCalled();
  });

  it('verifies email using token and rejects expired tokens', async () => {
    const deps = createDeps();
    deps.findToken.mockResolvedValueOnce({
      identifier: 'email-verification:user_1',
      token: 'stored-token',
      expires: new Date(Date.now() + 60_000),
    });

    const okResult = await verifyEmailByTokenLifecycle('raw-token', deps);
    expect(okResult).toEqual({ ok: true });
    expect(deps.markEmailVerified).toHaveBeenCalledWith('user_1');

    deps.findToken.mockResolvedValueOnce({
      identifier: 'email-verification:user_1',
      token: 'expired-token',
      expires: new Date(Date.now() - 1),
    });

    const expiredResult = await verifyEmailByTokenLifecycle('expired-raw-token', deps);
    expect(expiredResult).toEqual({ ok: false, error: 'Verification token has expired.' });
    expect(deps.deleteToken).toHaveBeenCalledWith('expired-token');
  });

  it('rejects invalid verification and password reset tokens', async () => {
    const deps = createDeps();
    deps.findToken.mockResolvedValue(undefined);

    await expect(verifyEmailByTokenLifecycle('missing-token', deps)).resolves.toEqual({
      ok: false,
      error: 'Invalid verification token.',
    });

    await expect(resetPasswordWithTokenLifecycle('missing-reset', 'AnotherSecure123', deps)).resolves.toEqual({
      ok: false,
      error: 'Invalid password reset token.',
    });
  });

  it('issues and consumes password reset tokens', async () => {
    const deps = createDeps();
    deps.findUserByEmail.mockResolvedValue({
      id: 'user_2',
      email: 'person@example.com',
      failedSignInAttempts: 0,
      lockoutUntil: null,
    });

    const requestResult = await requestPasswordResetLifecycle('person@example.com', deps);
    expect(requestResult.ok).toBe(true);
    expect(requestResult.token).toBeDefined();
    expect(deps.issueToken).toHaveBeenCalledTimes(1);

    deps.findToken.mockResolvedValue({
      identifier: 'password-reset:user_2',
      token: 'stored-reset-token',
      expires: new Date(Date.now() + 60_000),
    });

    const resetResult = await resetPasswordWithTokenLifecycle('raw-reset', 'AnotherSecure123', deps);
    expect(resetResult).toEqual({ ok: true });
    expect(deps.hashPassword).toHaveBeenCalledWith('AnotherSecure123');
    expect(deps.updatePassword).toHaveBeenCalledWith('user_2', 'hashed-password');
    expect(deps.deleteToken).toHaveBeenCalledWith('stored-reset-token');
  });

  it('does not issue password reset tokens for invalid or unknown emails', async () => {
    const deps = createDeps();
    deps.findUserByEmail.mockResolvedValue(undefined);

    await expect(requestPasswordResetLifecycle('not-an-email', deps)).resolves.toEqual({ ok: true });
    await expect(requestPasswordResetLifecycle('missing@example.com', deps)).resolves.toEqual({ ok: true });

    expect(deps.issueToken).not.toHaveBeenCalled();
  });

  it('updates the account email after confirming the current password', async () => {
    const deps = createDeps();
    deps.findUserById.mockResolvedValue({
      id: 'user_3',
      email: 'person@example.com',
      image: null,
      passwordHash: 'stored-hash',
    });
    deps.findUserByEmail.mockResolvedValue(undefined);
    deps.verifyPassword.mockResolvedValue(true);

    await expect(
      updateAccountEmailUseCase(
        'user_3',
        {
          email: '  NewEmail@example.com ',
          currentPassword: 'ValidPassword123',
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        email: 'newemail@example.com',
      },
    });

    expect(deps.verifyPassword).toHaveBeenCalledWith('ValidPassword123', 'stored-hash');
    expect(deps.updateEmail).toHaveBeenCalledWith('user_3', 'newemail@example.com');
  });

  it('rejects account email updates when the password is wrong or the email is already used', async () => {
    const deps = createDeps();
    deps.findUserById.mockResolvedValue({
      id: 'user_3',
      email: 'person@example.com',
      image: null,
      passwordHash: 'stored-hash',
    });
    deps.verifyPassword.mockResolvedValue(false);

    await expect(
      updateAccountEmailUseCase(
        'user_3',
        {
          email: 'next@example.com',
          currentPassword: 'WrongPassword123',
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Current password is incorrect.',
      },
    });

    const duplicateDeps = createDeps();
    duplicateDeps.findUserById.mockResolvedValue({
      id: 'user_3',
      email: 'person@example.com',
      image: null,
      passwordHash: 'stored-hash',
    });
    duplicateDeps.findUserByEmail.mockResolvedValue({
      id: 'user_4',
      email: 'next@example.com',
      image: null,
      passwordHash: 'another-hash',
    });
    duplicateDeps.verifyPassword.mockResolvedValue(true);

    await expect(
      updateAccountEmailUseCase(
        'user_3',
        {
          email: 'next@example.com',
          currentPassword: 'ValidPassword123',
        },
        duplicateDeps,
      ),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'An account already exists for this email.',
      },
    });
  });

  it('deletes the account after confirming the current password', async () => {
    const deps = createDeps();
    deps.findUserById.mockResolvedValue({
      id: 'user_5',
      email: 'person@example.com',
      image: 'local-profile-images/user_5/avatar.jpg',
      passwordHash: 'stored-hash',
    });
    deps.verifyPassword.mockResolvedValue(true);

    await expect(
      deleteAccountUseCase(
        'user_5',
        {
          currentPassword: 'ValidPassword123',
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        deleted: true,
      },
    });

    expect(deps.performAccountDeletion).toHaveBeenCalledWith('user_5');
    expect(deps.deleteProfileImage).toHaveBeenCalledWith('local-profile-images/user_5/avatar.jpg');
  });
});
