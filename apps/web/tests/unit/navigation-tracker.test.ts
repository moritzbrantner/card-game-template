import { describe, expect, it } from 'vitest';

import {
  NAVIGATION_SESSION_COOKIE_NAME,
  NAVIGATION_VISITOR_COOKIE_NAME,
  NAVIGATION_SESSION_TIMEOUT_MS,
  resolveNavigationTrackerState,
} from '@/src/analytics/navigation-tracker';

describe('navigation tracker state', () => {
  it('creates visitor and session ids when no cookies exist', () => {
    const state = resolveNavigationTrackerState({
      cookieString: '',
      currentHref: '/en',
      now: Date.UTC(2026, 3, 16, 10, 0, 0),
      createId: (() => {
        let index = 0;
        return () => `id_${++index}`;
      })(),
    });

    expect(state).toEqual({
      visitorId: 'id_1',
      sessionId: 'id_2',
      previousHref: null,
      shouldTrack: true,
      isNewSession: true,
    });
  });

  it('keeps the active session and previous href inside the inactivity window', () => {
    const now = Date.UTC(2026, 3, 16, 10, 30, 0);
    const state = resolveNavigationTrackerState({
      cookieString: `${NAVIGATION_VISITOR_COOKIE_NAME}=visitor_1; ${NAVIGATION_SESSION_COOKIE_NAME}=session_1`,
      currentHref: '/en/blog',
      lastTrackedHref: '/en',
      lastTrackedAt: String(now - 5 * 60_000),
      now,
      createId: () => 'unused',
    });

    expect(state).toEqual({
      visitorId: 'visitor_1',
      sessionId: 'session_1',
      previousHref: '/en',
      shouldTrack: true,
      isNewSession: false,
    });
  });

  it('rotates the session after 30 minutes of inactivity', () => {
    const now = Date.UTC(2026, 3, 16, 11, 0, 0);
    const state = resolveNavigationTrackerState({
      cookieString: `${NAVIGATION_VISITOR_COOKIE_NAME}=visitor_1; ${NAVIGATION_SESSION_COOKIE_NAME}=session_1`,
      currentHref: '/en/people',
      lastTrackedHref: '/en/profile',
      lastTrackedAt: String(now - NAVIGATION_SESSION_TIMEOUT_MS - 1),
      now,
      createId: () => 'session_2',
    });

    expect(state).toEqual({
      visitorId: 'visitor_1',
      sessionId: 'session_2',
      previousHref: null,
      shouldTrack: true,
      isNewSession: true,
    });
  });

  it('suppresses duplicate tracking for the same href', () => {
    const state = resolveNavigationTrackerState({
      cookieString: `${NAVIGATION_VISITOR_COOKIE_NAME}=visitor_1; ${NAVIGATION_SESSION_COOKIE_NAME}=session_1`,
      currentHref: '/en/about',
      lastTrackedHref: '/en/about',
      lastTrackedAt: String(Date.UTC(2026, 3, 16, 10, 0, 0)),
      now: Date.UTC(2026, 3, 16, 10, 1, 0),
      createId: () => 'unused',
    });

    expect(state.shouldTrack).toBe(false);
    expect(state.previousHref).toBe(null);
  });
});
