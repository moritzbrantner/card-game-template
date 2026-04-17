import { describe, expect, it } from 'vitest';

import {
  __resetCredentialAttemptStoreForTests,
  buildCredentialThrottleKey,
  clearCredentialAttemptFailures,
  getClientIpFromRequest,
  isCredentialAttemptThrottled,
  registerCredentialAttemptFailure,
} from '@/src/auth/credential-security';

describe('credential security', () => {
  it('throttles login attempts after repeated failures', () => {
    const key = buildCredentialThrottleKey('User@Example.com', '127.0.0.1');
    const now = Date.now();
    __resetCredentialAttemptStoreForTests();

    for (let index = 0; index < 4; index += 1) {
      registerCredentialAttemptFailure(key, now + index * 1_000);
      expect(isCredentialAttemptThrottled(key, now + index * 1_000)).toBe(false);
    }

    registerCredentialAttemptFailure(key, now + 5_000);
    expect(isCredentialAttemptThrottled(key, now + 5_001)).toBe(true);

    clearCredentialAttemptFailures(key);
    expect(isCredentialAttemptThrottled(key, now + 5_001)).toBe(false);
  });

  it('extracts client IP from forwarded headers', () => {
    const request = {
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.4',
      },
    };

    expect(getClientIpFromRequest(request)).toBe('203.0.113.10');
  });
});
