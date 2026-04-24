import { describe, expect, it } from 'vitest';

import { shouldUseDatabaseReadFallback } from '@/src/site-config/service';

describe('site-config database fallback', () => {
  it('treats missing relations as a fallback condition for read-only config', () => {
    expect(
      shouldUseDatabaseReadFallback({
        cause: {
          code: '42P01',
          message: 'relation "FeatureFlag" does not exist',
        },
      }),
    ).toBe(true);
  });

  it('still treats missing DATABASE_URL as a fallback condition', () => {
    expect(
      shouldUseDatabaseReadFallback(new Error('DATABASE_URL is not set')),
    ).toBe(true);
  });

  it('does not swallow unrelated database errors', () => {
    expect(
      shouldUseDatabaseReadFallback({
        cause: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      }),
    ).toBe(false);
  });
});
