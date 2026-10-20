/* Lumi service worker: network-first for same-origin (fresh updates), cache fallback for offline; SWR for images. */
const V = 'lumi-v6.3.4';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/score.js', 'js/cats.js', 'js/search.js', 'js/log.js', 'js/health.js', 'js/encyc.js', 'js/diet.js', 'js/v6.js', 'js/v61.js', 'js/stores.js', 'js/aisles.js', 'js/v63.js', 'js/v5.js', 'js/app.js', 'manifest.webmanifest', 'icons/mascot-128.png', 'icons/mascot-256.png', 'icons/favicon-32.png', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'data/index-0.json', 'data/index-g.json', 'data/meta.json', 'ref/additives.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'lumi-img').map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function networkFirst(req) {
  const c = await caches.open(V);
  try { const r = await fetch(req.mode === 'navigate' ? req : new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })); if (r.ok) c.put(req, r.clone()); return r; }
  catch (e) { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; if (req.mode === 'navigate') return c.match('index.html'); throw e; }
}
async function swr(req) {
  const c = await caches.open('lumi-img'); const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin === location.origin) return e.respondWith(networkFirst(e.request));
  if (u.hostname === 'images.openfoodfacts.org' || u.hostname === 'unpkg.com') return e.respondWith(swr(e.request));
});
