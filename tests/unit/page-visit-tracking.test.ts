import { describe, expect, it } from 'vitest';

import { isTrackablePageVisitPathname, normalizeTrackedPageVisit, resolveTrackedPageVisitReferrer } from '@/src/analytics/page-visits';

describe('page visit tracking', () => {
  it('splits the pathname and query parameters for aggregation', () => {
    expect(normalizeTrackedPageVisit('/en/profile?utm_source=launch&filter=active&token=secret')).toEqual({
      href: '/en/profile?utm_source=launch&filter=active&token=secret',
      pathname: '/en/profile',
      queryParameters: [
        { key: 'utm_source', value: 'launch', position: 0 },
        { key: 'filter', value: '[REDACTED]', position: 1 },
        { key: 'token', value: '[REDACTED]', position: 2 },
      ],
    });
  });

  it('normalizes absolute URLs into relative app hrefs', () => {
    expect(normalizeTrackedPageVisit('https://example.com/en/about?ref=nav#team')).toEqual({
      href: '/en/about?ref=nav#team',
      pathname: '/en/about',
      queryParameters: [{ key: 'ref', value: 'nav', position: 0 }],
    });
  });

  it('rejects empty href values', () => {
    expect(() => normalizeTrackedPageVisit('')).toThrowError('Page visit href is required.');
  });

  it('derives internal referrers from previous tracked hrefs', () => {
    expect(
      resolveTrackedPageVisitReferrer({
        href: '/en/blog/post-one',
        previousHref: '/en',
        requestUrl: 'https://app.example.com/api/analytics/page-visits',
      }),
    ).toEqual({
      previousPathname: '/en',
      previousCanonicalPath: '/',
      referrerType: 'internal',
      referrerHost: null,
    });
  });

  it('reduces external referrers to their host', () => {
    expect(
      resolveTrackedPageVisitReferrer({
        href: '/en/about',
        documentReferrer: 'https://news.example.net/story?id=42',
        requestUrl: 'https://app.example.com/api/analytics/page-visits',
      }),
    ).toEqual({
      previousPathname: null,
      previousCanonicalPath: null,
      referrerType: 'external',
      referrerHost: 'news.example.net',
    });
  });

  it('skips non-page urls', () => {
    expect(isTrackablePageVisitPathname('/en/about')).toBe(true);
    expect(isTrackablePageVisitPathname('/api/analytics/page-visits')).toBe(false);
    expect(isTrackablePageVisitPathname('/_serverFn/abc123')).toBe(false);
  });
});
