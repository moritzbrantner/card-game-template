export const CONSENT_COOKIE_NAME = 'site-consent';

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export const defaultConsentState: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function serializeConsentState(state: ConsentState) {
  return encodeURIComponent(JSON.stringify(state));
}

export function parseConsentCookie(value?: string | null): ConsentState {
  if (!value) {
    return defaultConsentState;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<ConsentState>;

    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
    };
  } catch {
    return defaultConsentState;
  }
}
