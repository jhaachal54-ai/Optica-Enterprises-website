/* ══════════════════════════════════════════════════════════════
   Optica Enterprises — Service Worker
   Caches key pages and assets for offline access.
   Cache-first for static assets, network-first for HTML pages.
══════════════════════════════════════════════════════════════ */

const CACHE_NAME   = 'optica-v2';
const STATIC_CACHE = 'optica-static-v2';

/* Pages to cache on install (shell) */
const PAGES = [
  '/home.html',
  '/products.html',
  '/contact.html',
  '/faq.html',
  '/demo-request.html',
  '/quote.html',
  '/service-request.html',
  '/about.html',
  '/brands.html',
  '/catalogue.html',
  '/blog.html',
  '/testimonials.html',
  '/service.html',
  '/reagents.html',
  '/compare.html',
  '/privacy.html',
  '/404.html',
];

/* Static assets to cache */
const ASSETS = [
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/Optica%20Enterprises%20Logo.png',
];

/* ── Install: pre-cache shell ─────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll([...PAGES, ...ASSETS]))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: clean old caches ───────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch strategy ───────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Only handle same-origin GET requests */
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  /* HTML pages: network-first (fresh content), fallback to cache */
  if (request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/404.html')))
    );
    return;
  }

  /* CSS / JS / images: cache-first (fast), background refresh */
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});
