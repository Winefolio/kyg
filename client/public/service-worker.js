const CACHE_NAME = 'knowyourgrape-shell-v1';

// URLs to cache for the app shell
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event: Cache the app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache app shell:', error);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of uncontrolled clients
  return self.clients.claim();
});

// Fetch event: Serve cached assets with cache-first strategy for shell resources
self.addEventListener('fetch', (event) => {
  // Only handle http/https requests to avoid chrome-extension and other schemes
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  const requestUrl = new URL(event.request.url);
  
  // Only handle GET requests from same origin
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }
  
  // For API requests, use network-first strategy
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails for API requests, we don't have a cache fallback
          return new Response('{"error": "Network unavailable"}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // For app shell assets, use cache-first strategy
  if (urlsToCache.includes(requestUrl.pathname) || requestUrl.pathname === '/') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response; // Serve from cache
          }
          // If not in cache, fetch from network
          return fetch(event.request);
        })
        .catch(() => {
          // If both cache and network fail, return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
    );
    return;
  }
  
  // For other assets (CSS, JS, images), use network-first strategy
  // Don't cache JS modules that could have MIME type issues
  if (requestUrl.pathname.endsWith('.js') && requestUrl.searchParams.has('t')) {
    // This is likely a Vite HMR JS module, always fetch fresh
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses with correct content types
        if (response.status === 200 && response.headers.get('content-type')) {
          const contentType = response.headers.get('content-type');
          // Only cache if we have a proper content type and it's not an HTML error page
          if (!contentType.includes('text/html') && 
              (contentType.includes('text/css') || 
               contentType.includes('image/') || 
               contentType.includes('font/') ||
               (contentType.includes('javascript') && !requestUrl.pathname.includes('index-')))) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
        }
        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache only for non-JS assets
        if (!requestUrl.pathname.endsWith('.js')) {
          return caches.match(event.request);
        }
        // For JS assets, let them fail rather than serve wrong content
        throw new Error('JS asset unavailable');
      })
  );
});