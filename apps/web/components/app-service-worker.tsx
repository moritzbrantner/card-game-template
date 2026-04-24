'use client';

import { usePathname as useNextPathname } from 'next/navigation';
import { useEffect, useEffectEvent } from 'react';

function isBlogEditorPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return (
    segments.length === 3 && segments[1] === 'profile' && segments[2] === 'blog'
  );
}

async function waitForServiceWorkerController() {
  if (navigator.serviceWorker.controller) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
      resolve();
    }, 3_000);

    function handleControllerChange() {
      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
      resolve();
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
  });
}

export function AppServiceWorker() {
  const pathname = useNextPathname();

  const warmOfflineBlogEditorRoute = useEffectEvent(async () => {
    if (!isBlogEditorPath(window.location.pathname)) {
      return;
    }

    await navigator.serviceWorker.ready;
    await waitForServiceWorkerController();

    const serviceWorker =
      navigator.serviceWorker.controller ??
      navigator.serviceWorker.ready.then((registration) => registration.active);
    const controller =
      serviceWorker instanceof Promise ? await serviceWorker : serviceWorker;

    controller?.postMessage({
      type: 'CACHE_BLOG_EDITOR_ROUTE',
      url: window.location.href,
    });
  });

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let cancelled = false;

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async () => {
        await navigator.serviceWorker.ready;

        if (cancelled) {
          return;
        }

        document.documentElement.dataset.serviceWorker = 'ready';
        await warmOfflineBlogEditorRoute();
      })
      .catch((error) => {
        console.error('Service worker registration failed.', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    if (!isBlogEditorPath(pathname)) {
      return;
    }

    if (document.documentElement.dataset.serviceWorker !== 'ready') {
      return;
    }

    void warmOfflineBlogEditorRoute();
  }, [pathname]);

  return null;
}
