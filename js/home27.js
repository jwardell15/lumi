/* Lumi 26.3 "Fast launch": Home draws from a small prebuilt pool (data/home27/home.json, ~45 KB gz, built by tools/home27/build_home.py from the real catalog)
   instead of downloading and indexing 3+ MB of catalog tiers on the main thread at every launch. The full search engine now starts only when something needs
   it (typing in search, opening a product, builders). If home.json can't load, Home falls back to the old path (full index).
   Loaded before app.js (the first route() runs inside app.js), so everything here resolves later pieces (pickers, engine) lazily. */
const HOME27 = { p: null, docs: null, codes: null, wrapped: false };
const HOME27_PICKERS = ['homePicks', 'healthPicks14', 'homeCols141', 'restPicks74', 'topPicks', 'bestAtRestaurants'];
function home27Wrap() { /* idempotent: wrap every picker defined so far (later scripts define more), and let byCode see home docs */
  HOME27_PICKERS.forEach(n => { const f = self[n]; if (typeof f !== 'function' || f.h27) return; const w = function () { return withHome27(f, this, arguments); }; w.h27 = 1; self[n] = w; });
  if (!HOME27.wrapped && typeof engine !== 'undefined') { HOME27.wrapped = true; const bc = engine.byCode.bind(engine); engine.byCode = code => bc(code) || (HOME27.codes && HOME27.codes.get(code)) || undefined; }
}
function homeLite() {
  if (HOME27.docs) { home27Wrap(); return Promise.resolve(HOME27.docs); }
  return HOME27.p || (HOME27.p = getData('data/home27/home.json').then(j => {
    (j.chains || []).forEach(([k, l]) => C.register(k, l, 'rest'));
    const docs = j.docs.map(d => { d.keys = (d.keys || []).map(k => C.KEYS.indexOf(k)).filter(k => k >= 0); d.nn = LumiSearch.norm(d.name + ' ' + d.brand); return d; });
    HOME27.codes = new Map(docs.map(d => [d.code, d])); HOME27.docs = docs; home27Wrap(); return docs;
  }).catch(e => { HOME27.p = null; console.warn('home.json failed, using the full index', e); return loadIndex(); }));
}
/* run a picker over the prebuilt pool: the pickers read engine.docs / engine.byCode synchronously, so swap them in for the duration of the call */
function withHome27(fn, self, args) {
  if (!HOME27.docs) return fn.apply(self, args);
  const d0 = engine.docs, c0 = engine._codes; engine.docs = HOME27.docs; engine._codes = HOME27.codes;
  try { return fn.apply(self, args); } finally { engine.docs = d0; engine._codes = c0; }
}
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(['⚡', 'Faster launch (26.3)', 'Home no longer builds the whole food catalog on your phone at every launch: the top picks come from a small prebuilt file, and the full search engine starts only when you search or open a product.']);
