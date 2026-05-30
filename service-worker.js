const CACHE_NAME = 'quiz-maker-v1';
const ASSETS = [
  '/QUIZ-MAKER/',
  '/QUIZ-MAKER/index.html',
  '/QUIZ-MAKER/manifest.json',
  '/QUIZ-MAKER/style.css',
  '/QUIZ-MAKER/script.js',
  '/QUIZ-MAKER/icon-192.png',
  '/QUIZ-MAKER/icon-512.png'
];

// Install - cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching quiz maker assets...');
      return cache.addAll(ASSETS).catch(err => {
        console.log('Some assets not found, caching what we can:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - serve from cache first, update from network in background
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        return cached;
      });

      return cached || fetchPromise;
    })
  );
});
