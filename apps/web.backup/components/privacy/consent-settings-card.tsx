'use client';

import { useState } from 'react';

import type { ConsentState } from '@/src/privacy/contracts';

async function persistConsent(state: ConsentState) {
  await fetch('/api/privacy/consent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  });
}

export function ConsentSettingsCard({
  initialConsent,
}: {
  initialConsent: ConsentState;
}) {
  const [consent, setConsent] = useState(initialConsent);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  return (
    <div className="rounded-2xl border p-4 dark:border-zinc-800">
      <div className="space-y-1">
        <p className="font-medium">Consent settings</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Necessary storage stays enabled. Analytics and marketing preferences
          can be updated any time.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {(['analytics', 'marketing'] as const).map((key) => (
          <label
            key={key}
            className="flex items-center justify-between gap-4 rounded-2xl border p-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium capitalize">{key}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {key === 'analytics'
                  ? 'Controls anonymous and signed-in page-navigation measurement with pseudonymous visitor and session ids.'
                  : 'Controls optional marketing personalization.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={consent[key]}
              onChange={(event) => {
                setConsent((current) => ({
                  ...current,
                  [key]: event.target.checked,
                }));
              }}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
          onClick={async () => {
            setStatus('saving');
            await persistConsent(consent);
            setStatus('saved');
          }}
        >
          Save consent
        </button>
        <span className="text-sm text-zinc-500">
          {status === 'saved'
            ? 'Saved.'
            : status === 'saving'
              ? 'Saving…'
              : null}
        </span>
      </div>
    </div>
  );
}
