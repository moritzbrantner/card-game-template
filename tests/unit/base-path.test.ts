import { describe, expect, it } from 'vitest';

import { normalizePublicBasePath, normalizeRouterBasePath } from '@/src/runtime/base-path';

describe('base path normalization', () => {
  it('normalizes the public base path for asset URLs', () => {
    expect(normalizePublicBasePath(undefined)).toBe('/');
    expect(normalizePublicBasePath('/')).toBe('/');
    expect(normalizePublicBasePath('next-template')).toBe('/next-template/');
    expect(normalizePublicBasePath('/next-template/')).toBe('/next-template/');
  });

  it('normalizes the router base path for route URLs', () => {
    expect(normalizeRouterBasePath(undefined)).toBe('/');
    expect(normalizeRouterBasePath('/')).toBe('/');
    expect(normalizeRouterBasePath('next-template')).toBe('/next-template');
    expect(normalizeRouterBasePath('/next-template/')).toBe('/next-template');
  });
});
