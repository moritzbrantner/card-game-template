import { cookies } from 'next/headers';

import { isGithubPagesBuild } from '@/src/runtime/build-target';
import {
  CONSENT_COOKIE_NAME,
  defaultConsentState,
  parseConsentCookie,
} from '@/src/privacy/contracts';

export const REDACTED_QUERY_VALUE = '[REDACTED]';
export const TRACKED_QUERY_ALLOWLIST = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref']);
export const ALWAYS_REDACT_QUERY_KEYS = [/token/i, /^code$/i, /^state$/i, /email/i, /invite/i, /secret/i, /password/i];

export async function getConsentState() {
  if (isGithubPagesBuild) {
    return {
      hasExplicitChoice: false,
      state: defaultConsentState,
    };
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(CONSENT_COOKIE_NAME);

  return {
    hasExplicitChoice: Boolean(cookie),
    state: parseConsentCookie(cookie?.value),
  };
}

function shouldRedactQueryKey(key: string) {
  return ALWAYS_REDACT_QUERY_KEYS.some((pattern) => pattern.test(key)) || !TRACKED_QUERY_ALLOWLIST.has(key);
}

export function sanitizeTrackedQueryParameters(searchParams: URLSearchParams) {
  return Array.from(searchParams.entries()).map(([key, value], position) => ({
    key,
    value: shouldRedactQueryKey(key) ? REDACTED_QUERY_VALUE : value,
    position,
  }));
}
