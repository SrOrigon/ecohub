const CACHE_NAME = "ecohub-v4-app-shell";
const API_CACHE = "ecohub-v4-api";
const DYNAMIC_CACHE = "ecohub-v4-dynamic";

const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/icon.svg",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== API_CACHE && k !== DYNAMIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1. Navigation requests (HTML pages): Network First, fallback to Offline Page
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL).then(offlineRes => offlineRes || caches.match(req)))
    );
    return;
  }

  // 2. Static Assets (Next.js static files, fonts, images): Cache First, fallback to Network
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|woff2|css|js)$/)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 3. API GET Requests (Data fetching): Stale-While-Revalidate
  if (url.pathname.startsWith("/api/") && !url.pathname.includes("/stream")) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(req).then((cached) => {
          const fetchPromise = fetch(req).then((networkRes) => {
            if (networkRes.ok) {
              cache.put(req, networkRes.clone());
            }
            return networkRes;
          }).catch(() => {
             // If network fails and we have no cache, just throw
             if (!cached) throw new Error("Offline and no cache");
          });

          return cached || fetchPromise;
        });
      })
    );
    return;
  }
});
