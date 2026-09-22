const CACHE_VERSION = "ecohub-v5";
const CACHE_NAME = `${CACHE_VERSION}-app-shell`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const API_CACHE = `${CACHE_VERSION}-api`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const CURRENT_CACHES = [CACHE_NAME, PAGES_CACHE, API_CACHE, DYNAMIC_CACHE];

const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/icon.svg",
  "/globe.svg",
  "/file.svg",
  "/window.svg",
  "/manifest.json",
];

// Main dashboard routes configured for Stale-While-Revalidate
const SWR_PAGE_ROUTES = [
  "/dashboard",
  "/dashboard/alunos",
  "/dashboard/turmas",
  "/dashboard/frequencia",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Suporte a Background Sync
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-mutations") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SYNC_PENDING_MUTATIONS" });
        });
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1. Static Assets (Next.js static files, images, icons, fonts): Cache-First
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico|woff|woff2|ttf|eot|css|js)$/i)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // 2. Read API Requests (/api/metrics/*, /api/*): Network-First with Cache Fallback
  if (url.pathname.startsWith("/api/") && !url.pathname.includes("/stream")) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(API_CACHE).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() =>
          caches.open(API_CACHE).then((cache) => cache.match(req))
        )
    );
    return;
  }

  // 3. Main Dashboard Pages: Stale-While-Revalidate
  const isSWRPage = SWR_PAGE_ROUTES.some(
    (route) => url.pathname === route || url.pathname === `${route}/`
  );

  if (req.mode === "navigate" && isSWRPage) {
    event.respondWith(
      caches.open(PAGES_CACHE).then((cache) => {
        return cache.match(req).then((cachedResponse) => {
          const fetchPromise = fetch(req)
            .then((networkRes) => {
              if (networkRes && networkRes.ok) {
                cache.put(req, networkRes.clone());
              }
              return networkRes;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. Other Navigation Requests (HTML pages): Network-First, fallback to Cache, then Offline Page
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() =>
          caches.match(req).then((cachedRes) => {
            if (cachedRes) return cachedRes;
            return caches.match(OFFLINE_URL);
          })
        )
    );
    return;
  }
});
