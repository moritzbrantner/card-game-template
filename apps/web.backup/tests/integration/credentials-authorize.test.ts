import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authorizeCredentials } from '@/src/auth/credentials';
import { __resetCredentialAttemptStoreForTests } from '@/src/auth/credential-security';

describe('authorizeCredentials', () => {
  beforeEach(() => {
    __resetCredentialAttemptStoreForTests();
  });

  it('normalizes email and returns user payload on valid credentials', async () => {
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: 'user_1',
      email: 'person@example.com',
      tag: 'person',
      name: 'Person',
      image: null,
      role: 'ADMIN',
      passwordHash: 'hashed',
      lockoutUntil: null,
    });
    const verifyPassword = vi.fn().mockResolvedValue(true);

    const result = await authorizeCredentials(
      {
        email: '  PERSON@EXAMPLE.COM ',
        password: 'correct horse battery staple',
      },
      {
        findUserByEmail,
        verifyPassword,
        onAuthenticationFailure: vi.fn(),
        onAuthenticationSuccess: vi.fn(),
      },
    );

    expect(findUserByEmail).toHaveBeenCalledWith('person@example.com');
    expect(verifyPassword).toHaveBeenCalledWith(
      'correct horse battery staple',
      'hashed',
    );
    expect(result).toEqual({
      id: 'user_1',
      email: 'person@example.com',
      tag: 'person',
      name: 'Person',
      image: null,
      role: 'ADMIN',
    });
  });

  it('returns null when credentials are throttled for an email + ip pair', async () => {
    const deps = {
      findUserByEmail: vi.fn().mockResolvedValue(undefined),
      verifyPassword: vi.fn(),
      onAuthenticationFailure: vi.fn(),
      onAuthenticationSuccess: vi.fn(),
    };
    const request = {
      headers: new Headers({ 'x-forwarded-for': '192.168.1.1' }),
    };

    for (let i = 0; i < 5; i += 1) {
      await authorizeCredentials(
        { email: 'person@example.com', password: 'wrong-password' },
        deps,
        request,
      );
    }

    const throttledResult = await authorizeCredentials(
      { email: 'person@example.com', password: 'wrong-password' },
      deps,
      request,
    );

    expect(throttledResult).toBeNull();
    expect(deps.findUserByEmail).toHaveBeenCalledTimes(5);
  });

  it('returns null when account is locked', async () => {
    const result = await authorizeCredentials(
      { email: 'person@example.com', password: 'password' },
      {
        findUserByEmail: vi.fn().mockResolvedValue({
          id: 'user_2',
          email: 'person@example.com',
          tag: 'person',
          name: null,
          image: null,
          role: 'USER',
          passwordHash: 'hashed',
          lockoutUntil: new Date(Date.now() + 60_000),
        }),
        verifyPassword: vi.fn(),
        onAuthenticationFailure: vi.fn(),
        onAuthenticationSuccess: vi.fn(),
      },
    );

    expect(result).toBeNull();
  });

  it('registers auth failures when password verification fails', async () => {
    const onAuthenticationFailure = vi.fn();

    const result = await authorizeCredentials(
      { email: 'person@example.com', password: 'wrong' },
      {
        findUserByEmail: vi.fn().mockResolvedValue({
          id: 'user_3',
          email: 'person@example.com',
          tag: 'person',
          name: null,
          image: null,
          role: 'USER',
          passwordHash: 'hashed',
          lockoutUntil: null,
        }),
        verifyPassword: vi.fn().mockResolvedValue(false),
        onAuthenticationFailure,
        onAuthenticationSuccess: vi.fn(),
      },
    );

    expect(onAuthenticationFailure).toHaveBeenCalledWith('user_3');
    expect(result).toBeNull();
  });
});
