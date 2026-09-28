const CACHE = 'izla-offline-v1';
const FILES = ['/offline.html', '/offline.css', '/offline.js', '/icon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('izla-offline-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
  }
});
