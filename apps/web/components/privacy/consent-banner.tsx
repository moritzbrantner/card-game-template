'use client';

import { useState, useSyncExternalStore } from 'react';

import { CONSENT_COOKIE_NAME, defaultConsentState, type ConsentState } from '@/src/privacy/contracts';

const CONSENT_CHANGE_EVENT = 'consentchange';

async function saveConsent(state: ConsentState) {
  await fetch('/api/privacy/consent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  });

  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

function hasStoredConsent() {
  return document.cookie.split('; ').some((cookie) => cookie.startsWith(`${CONSENT_COOKIE_NAME}=`));
}

function subscribeToConsent(onStoreChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onStoreChange);
  };
}

export function ConsentBanner() {
  const hasConsent = useSyncExternalStore(subscribeToConsent, hasStoredConsent, () => true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (hasConsent || isDismissed) {
    return null;
  }

  return (
    <section className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl rounded-[1.5rem] border border-zinc-200 bg-white/95 p-4 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.45)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Privacy controls</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Analytics stays off until you opt in. If enabled, page navigation is measured with pseudonymous visitor and session ids, external referrers are reduced to hostnames, and sensitive query params stay redacted.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSaving}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            onClick={async () => {
              setIsSaving(true);
              await saveConsent({ necessary: true, analytics: false, marketing: false });
              setIsSaving(false);
              setIsDismissed(true);
            }}
          >
            Necessary only
          </button>
          <button
            type="button"
            disabled={isSaving}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
            onClick={async () => {
              setIsSaving(true);
              await saveConsent({ ...defaultConsentState, necessary: true, analytics: true, marketing: true });
              setIsSaving(false);
              setIsDismissed(true);
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </section>
  );
}
