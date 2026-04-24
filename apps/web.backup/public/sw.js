const STATIC_CACHE = 'next-template-static-v1';
const BLOG_PAGE_CACHE = 'next-template-blog-page-v1';
const ACTIVE_CACHES = [STATIC_CACHE, BLOG_PAGE_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (ACTIVE_CACHES.includes(cacheName)) {
              return Promise.resolve();
            }

            return caches.delete(cacheName);
          }),
        ),
      ),
    ]),
  );
});

self.addEventListener('message', (event) => {
  if (
    !event.data ||
    event.data.type !== 'CACHE_BLOG_EDITOR_ROUTE' ||
    typeof event.data.url !== 'string'
  ) {
    return;
  }

  event.waitUntil(cacheBlogEditorRoute(event.data.url));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isStaticAssetRequest(request, requestUrl)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === 'navigate' && isBlogEditorRoute(requestUrl)) {
    event.respondWith(networkFirstBlogPage(request));
  }
});

function isStaticAssetRequest(request, url) {
  if (url.pathname.includes('/_next/static/')) {
    return true;
  }

  return ['script', 'style', 'font', 'image', 'manifest'].includes(
    request.destination,
  );
}

function isBlogEditorRoute(url) {
  const segments = url.pathname.split('/').filter(Boolean);
  return (
    segments.length === 3 && segments[1] === 'profile' && segments[2] === 'blog'
  );
}

function getBlogEditorCacheKey(input) {
  const url =
    typeof input === 'string' ? new URL(input, self.location.origin) : input;
  return `${url.origin}${url.pathname}`;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

async function cacheBlogEditorRoute(url) {
  const requestUrl = new URL(url, self.location.origin);

  if (!isBlogEditorRoute(requestUrl)) {
    return;
  }

  const response = await fetch(requestUrl.toString(), {
    cache: 'reload',
  });

  if (!response.ok) {
    return;
  }

  const cache = await caches.open(BLOG_PAGE_CACHE);
  await cache.put(getBlogEditorCacheKey(requestUrl), response.clone());
}

async function networkFirstBlogPage(request) {
  const cache = await caches.open(BLOG_PAGE_CACHE);
  const cacheKey = getBlogEditorCacheKey(request.url);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      await cache.put(cacheKey, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      'Offline. Reload this page after reconnecting once the blog editor has been loaded online.',
      {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      },
    );
  }
}
