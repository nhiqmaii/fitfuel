/**
 * FitFuel service worker.
 * Strategy: cache-first for the app shell, network-first for everything else.
 * The whole app is static, so the "shell" IS the whole app.
 * Bump CACHE_VERSION on any release to force a fresh fetch.
 */
const CACHE_VERSION = 'fitfuel-v3';
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/store.js',
  './js/ui.js',
  './js/charts.js',
  './js/nutrition.js',
  './js/workouts.js',
  './js/tracker.js',
  './js/progress.js',
  './js/sampleData.js',
  './js/insights.js',
  './js/askData.js',
  './js/privacy.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Cache-first for same-origin requests (the whole app).
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache successful responses opportunistically.
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => cached); // fallback if offline and not cached
    })
  );
});
