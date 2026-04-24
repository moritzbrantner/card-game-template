import { getDb } from '@/src/db/client';
import { pageVisitQueryParameters, pageVisits } from '@/src/db/schema';
import {
  classifyNavigationPathname,
  type NavigationRouteGroup,
} from '@/src/analytics/navigation-classification';
import { sanitizeTrackedQueryParameters } from '@/src/privacy/consent';

const TRACKED_PAGE_BASE_URL = 'https://page-visit.local';
const NON_TRACKABLE_PAGE_PATH_PREFIXES = [
  '/api',
  '/_build',
  '/_serverFn',
] as const;

export type NormalizedPageVisit = {
  href: string;
  pathname: string;
  queryParameters: Array<{
    key: string;
    value: string;
    position: number;
  }>;
};

export type PageVisitReferrerType = 'direct' | 'internal' | 'external';

export function isTrackablePageVisitPathname(pathname: string): boolean {
  return !NON_TRACKABLE_PAGE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function normalizeTrackedPageVisit(href: string): NormalizedPageVisit {
  if (typeof href !== 'string' || href.trim().length === 0) {
    throw new Error('Page visit href is required.');
  }

  let url: URL;

  try {
    url = new URL(href.trim(), TRACKED_PAGE_BASE_URL);
  } catch {
    throw new Error('Invalid page visit href.');
  }

  if (!url.pathname.startsWith('/')) {
    throw new Error('Invalid page visit href.');
  }

  const normalizedHref = `${url.pathname}${url.search}${url.hash}`;

  return {
    href: normalizedHref,
    pathname: url.pathname,
    queryParameters: sanitizeTrackedQueryParameters(url.searchParams),
  };
}

function tryNormalizeTrackedPageVisit(href?: string | null) {
  if (!href) {
    return null;
  }

  try {
    return normalizeTrackedPageVisit(href);
  } catch {
    return null;
  }
}

export function resolveTrackedPageVisitReferrer(input: {
  href: string;
  requestUrl?: string | URL;
  previousHref?: string | null;
  documentReferrer?: string | null;
}) {
  const currentVisit = normalizeTrackedPageVisit(input.href);
  const currentUrl = new URL(
    currentVisit.href,
    input.requestUrl ?? TRACKED_PAGE_BASE_URL,
  );
  const previousVisit = tryNormalizeTrackedPageVisit(input.previousHref);

  if (previousVisit && isTrackablePageVisitPathname(previousVisit.pathname)) {
    return {
      previousPathname: previousVisit.pathname,
      previousCanonicalPath: classifyNavigationPathname(previousVisit.pathname)
        .canonicalPath,
      referrerType: 'internal' as const,
      referrerHost: null,
    };
  }

  if (!input.documentReferrer) {
    return {
      previousPathname: null,
      previousCanonicalPath: null,
      referrerType: 'direct' as const,
      referrerHost: null,
    };
  }

  try {
    const referrerUrl = new URL(
      input.documentReferrer,
      input.requestUrl ?? TRACKED_PAGE_BASE_URL,
    );

    if (
      referrerUrl.origin === currentUrl.origin &&
      isTrackablePageVisitPathname(referrerUrl.pathname)
    ) {
      return {
        previousPathname: referrerUrl.pathname,
        previousCanonicalPath: classifyNavigationPathname(referrerUrl.pathname)
          .canonicalPath,
        referrerType: 'internal' as const,
        referrerHost: null,
      };
    }

    if (referrerUrl.origin !== currentUrl.origin) {
      return {
        previousPathname: null,
        previousCanonicalPath: null,
        referrerType: 'external' as const,
        referrerHost: referrerUrl.host || null,
      };
    }
  } catch {
    return {
      previousPathname: null,
      previousCanonicalPath: null,
      referrerType: 'direct' as const,
      referrerHost: null,
    };
  }

  return {
    previousPathname: null,
    previousCanonicalPath: null,
    referrerType: 'direct' as const,
    referrerHost: null,
  };
}

export async function recordPageVisit(input: {
  userId?: string | null;
  href: string;
  visitorId: string;
  sessionId: string;
  previousHref?: string | null;
  occurredAt?: Date;
  documentReferrer?: string | null;
  requestUrl?: string | URL;
}) {
  const visitId = crypto.randomUUID();
  const visitedAt = input.occurredAt ?? new Date();
  const normalizedVisit = normalizeTrackedPageVisit(input.href);
  const classification = classifyNavigationPathname(normalizedVisit.pathname);
  const referrer = resolveTrackedPageVisitReferrer({
    href: normalizedVisit.href,
    previousHref: input.previousHref,
    documentReferrer: input.documentReferrer,
    requestUrl: input.requestUrl,
  });
  const db = getDb();

  if (!isTrackablePageVisitPathname(normalizedVisit.pathname)) {
    throw new Error('Invalid page visit href.');
  }

  await db.transaction(async (tx) => {
    await tx.insert(pageVisits).values({
      id: visitId,
      userId: input.userId ?? null,
      trackingVersion: 2,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      href: normalizedVisit.href,
      pathname: normalizedVisit.pathname,
      canonicalPath: classification.canonicalPath,
      routeGroup: classification.routeGroup,
      isAuthenticated: Boolean(input.userId),
      previousPathname: referrer.previousPathname,
      previousCanonicalPath: referrer.previousCanonicalPath,
      referrerType: referrer.referrerType,
      referrerHost: referrer.referrerHost,
      visitedAt,
    });

    if (normalizedVisit.queryParameters.length === 0) {
      return;
    }

    await tx.insert(pageVisitQueryParameters).values(
      normalizedVisit.queryParameters.map((parameter) => ({
        id: crypto.randomUUID(),
        pageVisitId: visitId,
        key: parameter.key,
        value: parameter.value,
        position: parameter.position,
      })),
    );
  });

  return {
    id: visitId,
    userId: input.userId ?? null,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    visitedAt,
    canonicalPath: classification.canonicalPath,
    routeGroup: classification.routeGroup as NavigationRouteGroup,
    isAuthenticated: Boolean(input.userId),
    previousPathname: referrer.previousPathname,
    previousCanonicalPath: referrer.previousCanonicalPath,
    referrerType: referrer.referrerType as PageVisitReferrerType,
    referrerHost: referrer.referrerHost,
    ...normalizedVisit,
  };
}
