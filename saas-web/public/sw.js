// GymFlow Service Worker
// Strategy: network-first for HTML with cached dashboard shell fallback, and
// stale-while-revalidate for static assets needed by the offline app shell.

const CACHE_NAME = "gymflow-shell-v3";
const OFFLINE_URL = "/offline.html";
const DASHBOARD_FALLBACK_URL = "/dashboard";

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

// Pre-cache the offline fallback page on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API calls: pass through — app code handles offline via IndexedDB
  if (url.pathname.startsWith("/api/")) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      cacheFirst(request).catch(() => caches.match(request))
    );
    return;
  }

  // Fonts/icons only: stale-while-revalidate
  if (
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/vendor/")
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetched = fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // HTML navigations: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok && url.origin === self.location.origin) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const exact = await cache.match(request);
          if (exact) return exact;
          if (url.pathname.startsWith("/dashboard")) {
            const dashboard = await cache.match(DASHBOARD_FALLBACK_URL);
            if (dashboard) return dashboard;
          }
          return (await cache.match(OFFLINE_URL)) || Response.error();
        })
    );
    return;
  }
});
