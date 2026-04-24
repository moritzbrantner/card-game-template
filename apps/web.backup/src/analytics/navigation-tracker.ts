export const NAVIGATION_VISITOR_COOKIE_NAME = 'nv_vid';
export const NAVIGATION_SESSION_COOKIE_NAME = 'nv_sid';
export const NAVIGATION_LAST_HREF_STORAGE_KEY =
  'navigation-analytics:last-href';
export const NAVIGATION_LAST_TRACKED_AT_STORAGE_KEY =
  'navigation-analytics:last-tracked-at';
export const NAVIGATION_VISITOR_TTL_SECONDS = 180 * 24 * 60 * 60;
export const NAVIGATION_SESSION_TTL_SECONDS = 30 * 60;
export const NAVIGATION_SESSION_TIMEOUT_MS =
  NAVIGATION_SESSION_TTL_SECONDS * 1000;

type ResolveNavigationTrackerStateInput = {
  cookieString: string;
  currentHref: string;
  lastTrackedHref?: string | null;
  lastTrackedAt?: string | null;
  now: number;
  createId: () => string;
};

export type NavigationTrackerState = {
  visitorId: string;
  sessionId: string;
  previousHref: string | null;
  shouldTrack: boolean;
  isNewSession: boolean;
};

function parseCookieValue(cookieString: string, cookieName: string) {
  for (const chunk of cookieString.split(';')) {
    const trimmed = chunk.trim();

    if (trimmed.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(trimmed.slice(cookieName.length + 1));
    }
  }

  return null;
}

function parseTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveNavigationTrackerState(
  input: ResolveNavigationTrackerStateInput,
): NavigationTrackerState {
  const visitorId =
    parseCookieValue(
      input.cookieString,
      NAVIGATION_VISITOR_COOKIE_NAME,
    )?.trim() || input.createId();
  const existingSessionId =
    parseCookieValue(
      input.cookieString,
      NAVIGATION_SESSION_COOKIE_NAME,
    )?.trim() || null;
  const lastTrackedAt = parseTimestamp(input.lastTrackedAt);
  const sessionExpired =
    lastTrackedAt !== null &&
    input.now - lastTrackedAt > NAVIGATION_SESSION_TIMEOUT_MS;
  const sessionId =
    existingSessionId && !sessionExpired ? existingSessionId : input.createId();
  const shouldTrack =
    input.currentHref.trim().length > 0 &&
    input.currentHref !== (input.lastTrackedHref ?? null);
  const isNewSession = sessionId !== existingSessionId;

  return {
    visitorId,
    sessionId,
    previousHref:
      !isNewSession &&
      input.lastTrackedHref &&
      input.lastTrackedHref !== input.currentHref
        ? input.lastTrackedHref
        : null,
    shouldTrack,
    isNewSession,
  };
}

export function buildAnalyticsCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}
