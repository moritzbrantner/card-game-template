import { describe, expect, it } from 'vitest';

import { parseProfileTagSegment } from '@/src/profile/tags';

describe('profile tags', () => {
  it('parses direct tag segments', () => {
    expect(parseProfileTagSegment('@alice')).toBe('alice');
  });

  it('parses URL-encoded tag segments', () => {
    expect(parseProfileTagSegment('%40alice')).toBe('alice');
  });

  it('rejects malformed tag segments', () => {
    expect(parseProfileTagSegment('alice')).toBeNull();
    expect(parseProfileTagSegment('%E0%A4%A')).toBeNull();
  });
});
