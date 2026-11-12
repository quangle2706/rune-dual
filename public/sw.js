/*
 * Rune Duel service worker: offline play after the first online visit.
 * - Page navigations: network first (so new deploys show up), cached copy when offline.
 * - Other same-origin GETs (hashed JS/CSS, fonts, icons): cache first.
 * Bump CACHE when changing this file's strategy; old caches are deleted on activate.
 */
const CACHE = 'rune-duel-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icons/icon-192.png', './icons/icon-512.png'];
const MAX_ENTRIES = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rune-duel-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(async (res) => {
          if (res.ok) {
            const cache = await caches.open(CACHE);
            await cache.put('./index.html', res.clone());
          }
          return res;
        })
        .catch(async () => (await caches.match('./index.html')) || (await caches.match('./')) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then(async (res) => {
          if (res.ok && res.type === 'basic') {
            const cache = await caches.open(CACHE);
            await cache.put(req, res.clone());
            await trim(cache);
          }
          return res;
        }),
    ),
  );
});
