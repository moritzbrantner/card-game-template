'use client';

import { useEffect } from 'react';

export function AppHydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.appHydrated = 'true';
  }, []);

  return null;
}
