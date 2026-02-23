/* Simple Service Worker for offline support */
const CACHE_NAME = 'stoper-app-v1';

self.addEventListener('install', (event) => {
  // Determine base URL from registration scope so SW works when app is served
  // from a subpath (e.g. GitHub Pages /owner/repo/).
  const base = (self.registration && self.registration.scope) ? self.registration.scope : '/';
  const OFFLINE_URLS = [base, base + 'index.html'];

  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((networkResponse) => {
          // Put a copy in cache for future
          return caches.open(CACHE_NAME).then((cache) => {
            try {
              // Some responses (e.g., opaque cross-origin) may fail to be cached
              cache.put(event.request, networkResponse.clone());
            } catch (e) {}
            return networkResponse;
          });
        })
        .catch(() => {
          // If request fails (offline), fallback to cached document or index.html
          if (event.request.mode === 'navigate' || (event.request.destination === 'document')) {
            const base = (self.registration && self.registration.scope) ? self.registration.scope : '/';
            return caches.match(base + 'index.html');
          }
          return caches.match(event.request);
        });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
