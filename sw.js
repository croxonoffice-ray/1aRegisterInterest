const CACHE_NAME = '1a-travel-collection-v20';
// Kept across app updates (not tied to the version above):
const RUNTIME_CACHE = '1a-runtime';   // the database library and fonts, so the app opens offline
const PHOTO_CACHE = '1a-photos';      // your photos, so journals show them offline
// Absolute paths: the app is also served at /travel, where relative
// paths would point somewhere else.
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-1a-traveller-256.png',
  '/logo-1a-traveller-print-v2.png'
];
const KEEP = [CACHE_NAME, RUNTIME_CACHE, PHOTO_CACHE];

self.addEventListener('install', (event) => {
  // One file at a time, so a single missing file never stops the app working offline
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(ASSETS.map((a) => cache.add(a).catch(() => null))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for page navigations (index.html): always try to fetch the
// latest version first, so a new deploy shows up immediately. Falls back to
// the cached copy only when there's no network (offline).
// Cache-first for static assets (icons, manifest): these rarely change, so
// serving from cache instantly is fine and faster.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Photos: shown through temporary links (?token=...) that change every
  // time, but the file behind each link never changes. Keep each file under
  // its address without the token, and serve the kept copy first.
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/sign/')) {
    const key = url.origin + url.pathname;
    event.respondWith(
      caches.open(PHOTO_CACHE).then((cache) => cache.match(key).then((hit) => hit ||
        fetch(req.url, { mode: 'cors', credentials: 'omit' }).then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
      ))
    );
    return;
  }

  // The database library and fonts: use the kept copy, refresh it in the background
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => cache.match(req).then((hit) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || fresh;
      }))
    );
    return;
  }

  // Anything else on another site (the database itself, maps): straight to the network
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return response;
        })
        // Offline: the cached copy of this address, or else the app itself
        // (every address, e.g. /travel, is the same single page).
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
