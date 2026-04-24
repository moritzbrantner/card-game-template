'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const ConsentBanner = dynamic(
  () =>
    import('@/components/privacy/consent-banner').then(
      (mod) => mod.ConsentBanner,
    ),
  { ssr: false },
);

export function DeferredConsentBanner() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return isReady ? <ConsentBanner /> : null;
}
