import { describe, expect, it } from 'vitest';

import { classifyNavigationPathname } from '@/src/analytics/navigation-classification';

describe('navigation classification', () => {
  it('strips locales and classifies explicit app routes', () => {
    expect(classifyNavigationPathname('/de/admin/reports/navigationJourneys')).toEqual({
      canonicalPath: '/admin/reports/[reportId]',
      routeGroup: 'admin',
      displayLabel: 'Admin report',
    });
    expect(classifyNavigationPathname('/en/blog/launch-post')).toEqual({
      canonicalPath: '/blog/[slug]',
      routeGroup: 'public',
      displayLabel: 'Blog post',
    });
  });

  it('classifies profile routes and repo-managed public pages', () => {
    expect(classifyNavigationPathname('/en/profile/@alice/followers')).toEqual({
      canonicalPath: '/profile/[userId]/followers',
      routeGroup: 'public',
      displayLabel: 'Profile followers',
    });
    expect(classifyNavigationPathname('/en/forms')).toEqual({
      canonicalPath: '/[publicSlug*]',
      routeGroup: 'public',
      displayLabel: 'Public page',
    });
  });
});
