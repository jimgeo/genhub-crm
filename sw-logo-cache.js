/**
 * Service Worker: aggressive cache for logo.dev images.
 * Caches logo responses for 30 days to avoid redundant API calls.
 */

const CACHE_NAME = 'logo-cache-v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Only intercept logo.dev requests
  if (!url.includes('img.logo.dev')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      if (cached) {
        // Check if the cached entry is still fresh
        let cachedDate = cached.headers.get('x-cached-at');
        if (!cachedDate) {
          // Opaque responses store timestamp separately
          const tsResp = await cache.match(new Request(event.request.url + '__ts'));
          if (tsResp) cachedDate = await tsResp.text();
        }
        if (cachedDate && (Date.now() - parseInt(cachedDate)) < MAX_AGE_MS) {
          return cached;
        }
      }

      // Fetch from network
      try {
        const response = await fetch(event.request);
        if (response.ok || response.type === 'opaque') {
          if (response.type === 'opaque') {
            cache.put(event.request, response.clone());
            cache.put(new Request(event.request.url + '__ts'), new Response(String(Date.now())));
            return response;
          }
          const body = await response.blob();
          const headers = new Headers(response.headers);
          headers.set('x-cached-at', String(Date.now()));
          const timestamped = new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
          });
          cache.put(event.request, timestamped);
          return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
        return response;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })
  );
});
