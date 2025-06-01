// client/public/service-worker.js

// IMPORTANT: Increment this version string every time you deploy a new build!
const CACHE_VERSION = "v1.3.0"; // Updated version for smart caching
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

// Fetch event: How to respond to network requests.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https requests.
  if (!request.url.startsWith("http")) {
    return;
  }

  // For API calls, always go to the network first.
  // If network fails, return a generic error (or nothing, depending on desired offline UX for API).
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Network error: API unavailable offline." }),
          {
            status: 503, // Service Unavailable
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );
    return;
  }

  // For navigation requests (e.g., loading the main page or a route):
  // Try network first to get the freshest index.html.
  // If network fails, serve the cached index.html from the app shell.
  // This ensures that if the user has an updated SW, they get the new app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If fetched successfully, clone and cache it for the app shell
          // This is important if index.html itself is not fingerprinted
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname === "/" || url.pathname.endsWith("/index.html"))
          ) {
            const responseToCache = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails, serve the main index.html from cache.
          return caches.match("/index.html") || caches.match("/");
        }),
    );
    return;
  }

  // For other static assets (JS, CSS, images, fonts):
  // Cache-First strategy: Serve from cache if available, otherwise fetch from network and cache.
  // This is good for fingerprinted assets (like index-XYZ.js) because if the URL changes,
  // it's a cache miss, and the new version is fetched and cached.
  event.respondWith(
    caches
      .match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Serve from cache.
        }

        // Not in cache, fetch from network.
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // Cache the new asset if it's from the same origin and not an opaque response (e.g. no-cors).
            if (
              url.origin === self.location.origin &&
              networkResponse.type !== "opaque"
            ) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
          }
          return networkResponse;
        });
      })
      .catch((error) => {
        console.warn(
          `[Service Worker] Fetch failed for ${request.url}; error:`,
          error,
        );
        // Optionally, return a placeholder for images or a generic offline response.
        // For JS/CSS, if it's not cached and network fails, the app might break, which is expected.
      }),
  );
});
