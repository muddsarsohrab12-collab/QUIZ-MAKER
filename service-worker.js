// UniQuiz Service Worker
// Update CACHE_VERSION to bust the cache after deploying changes
const CACHE_VERSION = 'uniquiz-v1';
const STATIC_CACHE  = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';

// Core files to cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// ── Install: precache core assets ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting(); // activate immediately
    })
  );
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) {
            return key.startsWith('uniquiz-') &&
                   key !== STATIC_CACHE &&
                   key !== DYNAMIC_CACHE;
          })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim(); // take control immediately
    })
  );
});

// ── Fetch: Network-first for HTML, Cache-first for assets ──
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests (like Google Fonts CDN)
  if (event.request.method !== 'GET') return;

  // HTML pages → Network-first (so hosted updates deploy instantly)
  if (event.request.headers.get('Accept') &&
      event.request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          var clone = response.clone();
          caches.open(STATIC_CACHE).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Same-origin static assets → Cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // External requests (fonts, CDN) → Network with dynamic cache fallback
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});
