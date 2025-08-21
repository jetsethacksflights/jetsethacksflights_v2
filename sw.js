/* Jetset Hacks v4 — Service Worker */
const CACHE_VERSION = 'v4.0.0';
const CACHE_NAME = `jetsethacks-${CACHE_VERSION}`;

const PRECACHE = [
  '/',               // root (Netlify serves index.html)
  '/index.html',
  '/styles.css',
  '/app.js',
  '/assets/logo-medallion.svg'
];

/* Install: pre-cache core assets */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

/* Activate: clean old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

/* Fetch: stale‑while‑revalidate for GET requests */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin, GET requests
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Bypass cache for busting or SW control
  if (url.searchParams.has('nosw')) return;
  if (url.searchParams.has('bust')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          // put a clone into cache for future
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return resp;
        })
        .catch(() => cached || caches.match('/index.html')); // offline fallback

      // serve cached immediately if available, update in background
      return cached || network;
    })
  );
});
