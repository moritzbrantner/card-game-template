import { describe, expect, it } from 'vitest';

import { canApplyUserFeatureOverrides, resolveFeatureEnabledState } from '@/src/foundation/features/access';

describe('foundation feature access', () => {
  it('never enables functionality that is disabled in the active build manifest', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: false,
        siteEnabled: true,
        userEnabled: true,
        role: 'USER',
      }),
    ).toBe(false);
  });

  it('applies site-wide disables before any user-specific override', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: true,
        siteEnabled: false,
        userEnabled: true,
        role: 'USER',
      }),
    ).toBe(false);
  });

  it('applies user-specific disables for supported member functionality', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: true,
        siteEnabled: true,
        userEnabled: false,
        role: 'USER',
      }),
    ).toBe(false);
  });

  it('ignores user-specific overrides for admins', () => {
    expect(
      resolveFeatureEnabledState({
        featureKey: 'notifications',
        manifestEnabled: true,
        siteEnabled: true,
        userEnabled: false,
        role: 'ADMIN',
      }),
    ).toBe(true);
  });

  it('ignores user-specific overrides for features that are only global', () => {
    expect(canApplyUserFeatureOverrides('content.blog', 'USER')).toBe(false);
    expect(
      resolveFeatureEnabledState({
        featureKey: 'content.blog',
        manifestEnabled: true,
        siteEnabled: true,
        userEnabled: false,
        role: 'USER',
      }),
    ).toBe(true);
  });
});
