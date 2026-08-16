// Dhruva service worker — caches the app shell so the calculator works offline
// once it's been opened at least once. Bump CACHE_NAME any time you ship a new
// version of index.html so old clients pick up the update instead of being
// stuck on a stale cached copy.
const CACHE_NAME = 'dhruva-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache the third-party geolocation lookup (ipapi.co) used for the
  // "current city" tag — always go to the network for that, and just fail
  // quietly offline (calcAstro already wraps it in try/catch).
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => new Response(null, { status: 504 })));
    return;
  }

  // App shell: cache-first, falling back to network, and re-populating the
  // cache with whatever the network returns so future loads stay fresh.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Offline and not cached: for navigations, fall back to the shell page.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response(null, { status: 504 });
      });
    })
  );
});
