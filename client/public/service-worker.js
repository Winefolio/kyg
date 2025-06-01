// client/public/service-worker.js

// IMPORTANT: Increment this version string every time you deploy a new build!
const CACHE_VERSION = "v1.4.0"; // Chrome compatibility update
const CACHE_PREFIX = "knowyourgrape-shell-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// Only cache essential files - no aggressive caching
const ESSENTIAL_FILES = [
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install event: Only cache essential files, not the full app shell
self.addEventListener("install", (event) => {
  console.log(
    `[Service Worker] Installing version: ${CACHE_VERSION}`,
  );
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log(
          `[Service Worker] Caching essential files for ${CACHE_NAME}:`,
          ESSENTIAL_FILES,
        );
        return cache.addAll(ESSENTIAL_FILES);
      })
      .catch((error) => {
        console.error(
          `[Service Worker] Failed to cache essential files for ${CACHE_NAME}:`,
          error,
        );
      }),
  );
  self.skipWaiting();
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event: Clean up ALL old caches and reset storage
self.addEventListener("activate", (event) => {
  console.log(`[Service Worker] Activating version: ${CACHE_VERSION}`);
  event.waitUntil(
    Promise.all([
      // Delete ALL old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
              console.log("[Service Worker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      }),
      // Clear IndexedDB for fresh start on new deployments
      new Promise((resolve) => {
        const deleteReq = indexedDB.deleteDatabase('KnowYourGrapeDB');
        deleteReq.onsuccess = () => {
          console.log("[Service Worker] Cleared IndexedDB for fresh start");
          resolve();
        };
        deleteReq.onerror = () => {
          console.log("[Service Worker] Could not clear IndexedDB");
          resolve();
        };
      })
    ]).then(() => {
      console.log("[Service Worker] Claiming clients.");
      return self.clients.claim();
    }),
  );
});

// Fetch event: Network-first approach with minimal caching
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https requests
  if (!request.url.startsWith("http")) {
    return;
  }

  // For API calls, always go to network - no caching
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // For navigation requests: Always fetch fresh content
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  // For static assets: Only cache essential files that we pre-cached
  if (ESSENTIAL_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
    );
    return;
  }

  // For all other assets: Always fetch fresh, no caching
  event.respondWith(fetch(request));
});
