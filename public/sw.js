// SplitWiz Service Worker
// Cache strategy:
//   Static assets  → cache-first
//   Page navigation → network-first, cache fallback
//   API GET        → network-first, cache fallback (stale-while-revalidate)
//   AI routes      → network-only (never cache)
//   Non-GET API    → network-only

const SW_VERSION = 'v2';
const STATIC_CACHE = `splitwiz-static-${SW_VERSION}`;
const PAGE_CACHE   = `splitwiz-pages-${SW_VERSION}`;
const API_CACHE    = `splitwiz-api-${SW_VERSION}`;
const ALL_CACHES   = [STATIC_CACHE, PAGE_CACHE, API_CACHE];

const STATIC_PRECACHE = ['/manifest.json', '/icon.svg'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(STATIC_PRECACHE.map((url) => cache.add(url)))
    )
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never cache AI routes
  if (url.pathname.startsWith('/api/ai/')) return;

  // Never cache non-GET API calls
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') return;

  // Never cache auth-sensitive endpoints
  if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/profile/delete')) return;

  // API GET → network-first
  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Page navigation → network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  // Static assets (JS, CSS, fonts, images) → cache-first
  if (
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request.clone());
    if (response.ok && response.status < 400) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const dashboardCache = await cache.match('/dashboard');
      if (dashboardCache) return dashboardCache;
    }
    return new Response(
      JSON.stringify({ error: 'offline', cached: false }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(notifySync());
  }
});

async function notifySync() {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_QUEUE' });
  }
}

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = { title: 'SplitWiz', body: '', url: '/dashboard', icon: '/icon-192x192.png' };
  try { data = { ...data, ...event.data.json() }; } catch { /* raw text */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/badge-72x72.png',
      data: { url: data.url },
      actions: [
        { action: 'open', title: 'Open SplitWiz' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url ?? '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
