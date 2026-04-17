import { describe, expect, it } from 'vitest';

import { parseUpdateProfileInput } from '@/lib/validation/profile';

describe('profile validation', () => {
  it('normalizes profile edits for page actions', () => {
    const parsed = parseUpdateProfileInput({
      displayName: '  Jane Doe  ',
      bio: '  Building with Next.js  ',
    });

    expect(parsed).toEqual({
      displayName: 'Jane Doe',
      bio: 'Building with Next.js',
    });
  });

  it('rejects invalid display names', () => {
    expect(() => parseUpdateProfileInput({ displayName: 'x' })).toThrow(
      'displayName must be at least 2 characters',
    );
  });
});
