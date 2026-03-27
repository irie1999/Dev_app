const CACHE_NAME = "yumeiro-v1";

// App shell - cache on install
const STATIC_ASSETS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first, fall back to cache for navigation requests
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and cross-origin (YouTube iframes etc.)
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  // YouTube embed URLs: always network
  if (request.url.includes("youtube.com")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
