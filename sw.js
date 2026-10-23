/* Lumi service worker: network-first for same-origin (fresh updates), cache fallback for offline; SWR for images. */
const V = 'lumi-v18.1';
const DATA = 'https://lumi-data-cky.pages.dev/'; /* 17.4: food data host (Cloudflare Pages) */
const SHELL = ['./', 'index.html', 'css/app.css', 'css/v10.css', 'js/v10.js', 'css/v11.css', 'js/v11.js', 'js/v12.js', 'css/v12.css', 'js/v13.js', 'css/v13.css', 'css/v14.css', 'js/v14.js', 'css/v15.css', 'css/v16.css', 'js/v16.js', 'js/v17.js', 'js/v18.js', 'js/v181.js', 'css/v18.css', 'js/v15.js', DATA + 'data/pick15.json', 'js/score.js', 'js/cats.js', 'js/search.js', 'js/log.js', 'js/health.js', 'js/encyc.js', 'js/diet.js', 'js/v6.js', 'js/dbase.js', 'js/v61.js', 'js/stores.js', 'js/aisles.js', 'js/v63.js', 'js/v5.js', 'js/v7.js', 'js/v74.js', 'js/v75.js', 'js/watch8.js','js/v8.js', 'js/v9.js', 'ref/gi2008.json', 'js/app.js', 'manifest.webmanifest', 'icons/mascot-128.png', 'icons/mascot-256.png', 'icons/favicon-32.png', 'icons/icon-192.png', 'icons/apple-touch-icon.png', DATA + 'data/index-0.json', DATA + 'data/index-g.json', DATA + 'data/meta.json', 'ref/additives.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, u.startsWith(DATA) ? { cache: 'reload', mode: 'cors', credentials: 'omit' } : { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'lumi-img').map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function networkFirst(req) {
  const c = await caches.open(V);
  try { const r = await fetch(req.mode === 'navigate' ? req : new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })); if (r.ok) c.put(req, r.clone()); return r; }
  catch (e) { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; if (req.mode === 'navigate') return c.match('index.html'); throw e; }
}
async function dataFirst(req) { /* cross-origin data: network-first (data changes per release), cached copy offline */
  const c = await caches.open(V);
  try { const r = await fetch(new Request(req.url, { mode: 'cors', credentials: 'omit', cache: 'no-cache' })); if (r.ok) c.put(req.url, r.clone()); return r; }
  catch (e) { const hit = await c.match(req.url, { ignoreSearch: true }); if (hit) return hit; throw e; }
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
  if (u.href.startsWith(DATA)) return e.respondWith(u.pathname.startsWith('/img/') ? swr(e.request) : dataFirst(e.request));
  if (u.hostname === 'images.openfoodfacts.org' || u.hostname === 'unpkg.com' || u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'tessdata.projectnaptha.com') return e.respondWith(swr(e.request));
});
