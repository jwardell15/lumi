/* Lumi service worker: precache app shell; stale-while-revalidate for index data & images; network for APIs. */
const V = 'lumi-v2.0.2';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/score.js', 'js/search.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'data/index-0.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== V + '-data' && k !== 'lumi-img').map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function swr(cacheName, req) {
  const c = await caches.open(cacheName); const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET') return;
  if (u.origin === location.origin) {
    if (u.pathname.includes('/data/')) return e.respondWith(swr(u.pathname.includes('/data/index-0') ? V : V + '-data', e.request));
    return e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => { const net = fetch(e.request).then(r => { if (r.ok) caches.open(V).then(c => c.put(e.request, r.clone())); return r; }); return hit ? (net.catch(() => hit), hit) : net.catch(() => caches.match('index.html')); }));
  }
  if (u.hostname === 'images.openfoodfacts.org' || u.hostname === 'unpkg.com') return e.respondWith(swr('lumi-img', e.request));
});
