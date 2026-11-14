/* Lumi service worker (26.5). Shell-only precache with content hashes, cache-first for the shell, lazy cached data.
   - install: fetch the app shell (index.html, js, css, fonts, icons: see SHELL_H below, written by tools/build_shell.py) and store each file under "<path>?h=<sha256 prefix>".
     A file whose hash is already in any earlier lumi-v* cache is reused, not downloaded again, so an update only downloads what changed. Every download is hash-checked
     against the manifest: if the CDN serves a stale or partial copy the install fails and retries later instead of caching a mixed set.
   - fetch: shell files are served from the cache without touching the network (no per-file revalidation); index.html for every navigation.
   - data (Cloudflare Pages host): cached on first use, served from the cache for 24 h, then refreshed in the background (stale-while-revalidate). Data is NOT precached
     (the old worker pre-downloaded 17 MB of catalog files on every release). Only a few small files Home needs are fetched at install.
   - photos / CDN libraries: stale-while-revalidate as before. "Save for offline" data (lumi-off) is written by the app and kept across versions. */
const V = 'lumi-v26.8';
const OFF = 'lumi-off';
const DATA_EPOCH = '27c'; /* bump when files under data/ change in place (new data release); old data caches are dropped on activate */
const DC = 'lumi-d-' + DATA_EPOCH;
const DATA = 'https://lumi-data-cky.pages.dev/';
const DATA_PRE = ['data/pick15.json', 'data/meta.json', 'data/home27/home.json']; /* small files the Home screen needs, fetched at install (best effort) */
const FRESH = 24 * 3600e3;
/*SHELL-BEGIN*/
const SHELL_H = {"index.html":"b0f9a4f9c564","manifest.webmanifest":"532bb28c6230","icons/favicon.ico":"e3075c9b4da1","icons/favicon-32.png":"94866cd60daf","icons/favicon-16.png":"03b16be75f89","icons/apple-touch-icon.png":"beffea1b6350","dist/app.73a52ce04d.css":"73a52ce04d6f","fonts/inter-var-latin.woff2":"3100e775e861","fonts/fraunces-var-latin.woff2":"7f9d191d9993","icons/mascot-128.png":"68eb9167fa07","dist/app.8fb62181e0.js":"8fb62181e005","dist/late.a58a97979d.js":"a58a97979d7e","js/sworker.js":"688f9a3cab52","js/dbase.js":"15f91170c474","js/cats.js":"31f40c740b44","js/aisles.js":"f126956ea780","js/search.js":"9ffd44698552","js/hb25core.js":"64944fb5cc7c","vendor/html5-qrcode-2.3.8.min.js":"660b12437b1d","ref/gi2008.json":"9897d38a7858","ref/additives.json":"f616b68eab59","icons/mascot-256.png":"931e7fa6d49f","icons/icon-192.png":"6771060d937a"};
/*SHELL-END*/
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
/* cors responses hide the Date header, so keep our own fetch time on the stored copy */
async function stamp(r) { const h = new Headers(r.headers); h.set('x-lumi-t', String(Date.now())); return new Response(await r.clone().blob(), { status: r.status, statusText: r.statusText, headers: h }); }
const keyOf = f => f + '?h=' + SHELL_H[f];
async function sha(r) { const b = await r.clone().arrayBuffer(); return hex(await crypto.subtle.digest('SHA-256', b)).slice(0, 12); }
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(V), olds = []; for (const n of await caches.keys()) if (/^lumi-v/.test(n) && n !== V) olds.push(await caches.open(n));
  const files = Object.keys(SHELL_H);
  await Promise.all(files.map(async f => { const k = keyOf(f); if (await c.match(k)) return;
    for (const o of olds) { const hit = await o.match(k); if (hit) { await c.put(k, hit); return; } }
    const get = mode => fetch(new Request(f === 'index.html' ? './index.html' : f, { cache: mode })); /* first try the HTTP cache (the page just loaded these files: no second download), then force the network */
    let r = await get('default'); if (!r.ok || (await sha(r)) !== SHELL_H[f]) r = await get('reload');
    if (!r.ok) throw new Error('shell ' + f + ' HTTP ' + r.status); if ((await sha(r)) !== SHELL_H[f]) throw new Error('shell ' + f + ' hash mismatch (stale CDN copy?)'); await c.put(k, r); }));
  const d = await caches.open(DC); await Promise.allSettled(DATA_PRE.map(async u => { const r = await fetch(new Request(DATA + u, { mode: 'cors', credentials: 'omit', cache: 'reload' })); if (r.ok) await d.put(DATA + u, await stamp(r)); }));
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (/^lumi-v/.test(k) && k !== V) || (/^lumi-d-/.test(k) && k !== DC) || k === 'lumi-img-old').map(k => caches.delete(k)))).then(() => self.clients.claim())));
const BASE = new URL(self.registration.scope).pathname;
function shellFile(u) { if (u.origin !== location.origin || !u.pathname.startsWith(BASE)) return null; let p = u.pathname.slice(BASE.length); if (p === '' || p === 'index.html') p = 'index.html'; return SHELL_H[p] ? p : null; }
async function shellFirst(req, f) {
  const c = await caches.open(V), hit = await c.match(keyOf(f)); if (hit) return hit;
  try { const r = await fetch(req.mode === 'navigate' ? './index.html' : req); return r; } catch (e) { if (req.mode === 'navigate') { const idx = await c.match(keyOf('index.html')); if (idx) return idx; } throw e; }
}
async function networkFirst(req) { /* same-origin files that are not in the shell (e.g. ref/ data): as before */
  const c = await caches.open('lumi-misc');
  try { const r = await fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })); if (r.ok) c.put(req, r.clone()); return r; }
  catch (e) { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; throw e; }
}
async function dataSWR(e) { const req = e.request, url = req.url;
  const big = url.includes('/data/off221/'); /* the offline pack is stored by the app in OFF, not duplicated here */
  if (big) { try { return await fetch(new Request(url, { mode: 'cors', credentials: 'omit', cache: 'no-store' })); } catch (err) { const hit = await caches.open(OFF).then(o => o.match(url, { ignoreSearch: true })); if (hit) return hit; throw err; } }
  const c = await caches.open(DC), hit = await c.match(url, { ignoreSearch: true });
  const net = () => fetch(new Request(url, { mode: 'cors', credentials: 'omit', cache: hit ? 'no-cache' : 'default' })).then(r => { if (r.ok) { const w = stamp(r).then(x => c.put(url, x)).catch(() => {}); e.waitUntil(w); } return r; });
  if (hit) { const age = Date.now() - (Number(hit.headers.get('x-lumi-t')) || 0); if (age > FRESH) e.waitUntil(net().catch(() => {})); return hit; } /* cached copy now, refresh behind it once a day */
  try { return await net(); } catch (err) { const off = await caches.open(OFF).then(o => o.match(url, { ignoreSearch: true })); if (off) return off; throw err; }
}
async function swr(req) {
  const c = await caches.open('lumi-img'); const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin === location.origin) { const f = shellFile(u); return e.respondWith(f ? shellFirst(e.request, f) : networkFirst(e.request)); }
  if (u.href.startsWith(DATA)) { if (u.pathname.startsWith('/usda/')) return; return e.respondWith(u.pathname.startsWith('/img/') ? swr(e.request) : dataSWR(e)); }
  if (u.hostname === 'images.openfoodfacts.org' || u.hostname === 'images.openbeautyfacts.org' || u.hostname === 'images.openproductsfacts.org' || u.hostname === 'images.openpetfoodfacts.org' || u.hostname === 'unpkg.com' || u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'tessdata.projectnaptha.com') return e.respondWith(swr(e.request));
});
