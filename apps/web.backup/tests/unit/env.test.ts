import { afterEach, describe, expect, it } from 'vitest';

import { getEnv, resetEnvForTests } from '@/src/config/env';

const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
  resetEnvForTests();
}

describe('env parsing', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('fails fast when DATABASE_URL is missing outside gh-pages builds', () => {
    delete process.env.DATABASE_URL;
    delete process.env.NEXT_DEPLOY_TARGET;
    process.env.AUTH_SECRET = 'test-secret';

    expect(() => getEnv()).toThrowError(/DATABASE_URL is required/);
  });

  it('allows gh-pages builds without a database url', () => {
    delete process.env.DATABASE_URL;
    process.env.NEXT_DEPLOY_TARGET = 'gh-pages';
    process.env.AUTH_SECRET = 'test-secret';

    expect(getEnv().database.url).toBeNull();
  });

  it('allows production gh-pages builds without an auth secret', () => {
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    Object.assign(process.env, {
      NODE_ENV: 'production',
      NEXT_DEPLOY_TARGET: 'gh-pages',
    });

    expect(getEnv().auth.secret).toBe('local-build-secret-local-build-secret');
  });
});
