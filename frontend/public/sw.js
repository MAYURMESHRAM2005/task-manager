const CACHE_NAME = 'taskflow-v2';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/tasks',
  '/calendar',
  '/analytics',
  '/projects',
  '/teams',
  '/notifications',
  '/profile',
  '/settings',
  '/admin',
  '/css/style.css',
  '/manifest.json',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests (backend on another host).
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Cache first for static assets (Vite emits hashed files under /assets)
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network first for HTML pages with cache fallback (SPA shell)
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => cached || caches.match('/'));
      })
  );
});
