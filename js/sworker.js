/* Lumi 26.4 search worker: the search engine (parse + index of the catalog tiers) lives here, off the main thread.
   Protocol: main -> {id, op, ...}; worker -> {id, res} | {id, err} and events {ev:'tier', ...}.
   ops: doc {code}, pool {leaf, rest, brand, minScore} (candidates for Better choice), recalls {p} (CPSC/FDA recall matching), load {tiers:[...]} (sequential; emits a 'tier' event after each), search {q, specs:[{limit, prefix, src}]}, dym {q}, add {docs} (extra rows), info.
   Docs are sent back with category keys by NAME (indices differ between this registry and the page's). Ingredient/additive sidecars (data/f22, data/aw26)
   are attached here exactly like v22/v26 do on the page, so rows from the worker carry the same fields as rows from the old main-thread engine. */
'use strict';
importScripts('dbase.js', 'cats.js', 'aisles.js', 'search.js', 'hb25core.js', 'stores.js', 'q271.js');
const engine = new LumiSearch.Engine(), C = self.LumiCats;
const loaded = new Set(); let META = null;
const getData = u => fetch(u).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
/* --- sidecars (same attach rules as v22.js attach22 + v221 t22 + v26.js attach26) --- */
const find = j => { const D = engine.docs; if (!j || !j.n) return -1; for (let i = 0; i < D.length; i++) if (D[i].code === j.c0 && D[i + j.n - 1] && D[i + j.n - 1].code === j.c1) return i; return -1; };
function attach22(j) { if (!j || !j.a || !j.n) return; const st = find(j); if (st < 0) return; const D = engine.docs, a = j.a, q = v => v < 0 ? null : v / 10;
  for (let i = 0; i < j.n; i++) { const d = D[st + i]; d.p22 = q(a[i * 4]); d.f22 = q(a[i * 4 + 1]); d.s22 = q(a[i * 4 + 2]); d.w22 = a[i * 4 + 3]; }
  if (j.t && j.t.length) for (let k = 0; k < j.t.length; k += 2) { const d = D[st + j.t[k]]; if (d) d.t22 = j.t[k + 1] >>> 0; } }
function attach26(j) { if (!j || !j.u || !j.n) return; const st = find(j); if (st < 0) return; const D = engine.docs, hm = new Map(); for (let i = 0; i < j.h.length; i += 2) hm.set(j.h[i], j.h[i + 1]);
  for (let i = 0; i < j.n; i++) { const d = D[st + i]; d.aw26u = j.u[i]; d.aw26m = hm.get(i) || 0; } }
async function sidecars(t, preFetch) { const [a, b] = await Promise.all([preFetch ? preFetch[0] : getData(`data/f22/${t}.json`).catch(() => null), preFetch ? preFetch[1] : getData(`data/aw26/${t}.json`).catch(() => null)]); attach22(a); attach26(b); }
const urlFor = t => /^w\d+$/.test(t) ? `data/index-w-${t.slice(1)}.json` : `data/index-${t}.json`;
const sideFor = t => /^w/.test(t) ? null : t; /* the international layer has no sidecars */
let chain = Promise.resolve();
async function loadTier(t) {
  if (loaded.has(t)) return; const g = t === 'g';
  /* start the sidecar downloads together with the tier so they overlap */
  const side = sideFor(t) ? [getData(`data/f22/${t}.json`).catch(() => null), getData(`data/aw26/${t}.json`).catch(() => null)] : null;
  const d = await getData(urlFor(t));
  if (g) { postMessage({ ev: 'chains', chains: d.chains || [] }); (d.chains || []).forEach(([k, l]) => C.register(k, l, 'rest')); }
  await engine.addAsync(d, 15); loaded.add(t); if (side) await sidecars(t, side);
  postMessage({ ev: 'tier', tier: t, docs: engine.docs.length, chainN: g ? engine.chainN : undefined });
}

/* --- recalls (same matching as v251.js recallsFor: UPC match = strong; brand words + 2 distinctive product words = possible) --- */
const RBASE = 'data/recalls25/', norm25 = s => self.HB25.norm(s); let RALL = null, RUPC = null;
const STOP = new Set('original classic fresh natural organic flavor flavored flavour style with free light lite large small medium size pack count ounce ounces whole mild sweet salted unsalted plain regular family value brand product this that from made food foods each case bottle container'.split(' '));
const recAll = () => RALL || (RALL = getData(RBASE + 'r.json').then(j => { j.items.forEach(a => { a._k = ' ' + norm25(a[4] + ' ' + a[5]) + ' '; a._t = new Set(norm25(a[4]).split(' ').filter(w => w.length >= 4)); }); return j; }).catch(e => { RALL = null; throw e; }));
const recUPC = () => RUPC || (RUPC = getData(RBASE + 'u.json').then(j => { const m = new Map(); for (const [k, v] of Object.entries(j.u)) m.set(/^N/.test(k) ? k : k.replace(/^0+/, ''), v); return { asof: j.asof, m }; }).catch(e => { RUPC = null; throw e; }));
const nameTokens = (name, brand) => { const b = new Set(norm25(brand).split(' ')); return [...new Set(norm25(name).split(' ').filter(w => w.length >= 4 && !STOP.has(w) && !b.has(w) && !/^\d+$/.test(w)))]; };
async function recallsFor(p) { const out = { strong: [], possible: [], asof: '' }; const code = String(p.code || '').replace(/\D/g, '').replace(/^0+/, '');
  try { const U = await recUPC(); out.asof = U.asof; if (code.length >= 8 && U.m.has(code)) { const R = await recAll(); out.strong = U.m.get(code).map(i => R.items[i]).filter(Boolean); } } catch { return out; }
  const bn = norm25(p.brand || ''), tk = nameTokens(p.name || '', p.brand || '');
  if (bn.length >= 3 && tk.length >= 2) { try { const R = await recAll(), seen = new Set(out.strong.map(a => a[0])), bw = ' ' + bn + ' ';
      for (const a of R.items) { if (seen.has(a[0]) || !a._k.includes(bw)) continue; const hit = tk.filter(t => a._t.has(t)).length; if (hit >= 2) { out.possible.push(a); if (out.possible.length >= 12) break; } } } catch { } }
  return out; }
const toWire = d => { const o = Object.assign({}, d); o.keys = (d.keys || []).map(k => C.KEYS[k]); return o; };
let dymFn = null;
function dym(q) { return dymFn ? dymFn(q) : null; }
const ops = {
  async load({ tiers }) { for (const t of tiers) await loadTier(String(t)); return { docs: engine.docs.length, loaded: [...loaded] }; },
  async meta() { return META || (META = await getData('data/meta.json').catch(() => ({}))); },
  search271({ q, specs, off }) { const r = Q271.searchAll(engine, q, specs, { off }); return { lists: r.lists.map(l => l.map(toWire)), meta: r.meta }; },
  search({ q, specs }) { return specs.map(sp => { const f = sp.src ? (d => d.src === sp.src) : undefined; return engine.search(q, { limit: sp.limit || 80, prefix: !!sp.prefix, filter: f }).map(toWire); }); },
  dym({ q }) { return dym(q); },
  setDym({ src }) { dymFn = new Function('engine', 'LumiSearch', `return (${src})`)(engine, self.LumiSearch); return true; },
  add({ docs }) { engine.add({ docs }); return engine.docs.length; },
  doc({ code }) { const d = engine.byCode(code); return d ? toWire(d) : null; },
  pool({ leaf, rest, brand, minScore }) { const ki = leaf ? C.KEYS.indexOf(leaf) : -1, out = [];
    for (const d of engine.docs) { if (d.score == null || d.net == null || d.sugar == null || d.bad || d.zc || d.src === 'world' || d.score < minScore) continue;
      if (rest) { if (d.src !== 'rest' || d.brand !== brand) continue; } else if (d.src === 'rest' || ki < 0 || !d.keys.includes(ki)) continue; out.push(toWire(d)); }
    return { docs: out, total: engine.docs.length }; },
  recalls({ p }) { return recallsFor(p); },
  info() { return { docs: engine.docs.length, loaded: [...loaded] }; },
};
onmessage = e => { const m = e.data; const run = () => Promise.resolve().then(() => ops[m.op](m)).then(res => postMessage({ id: m.id, res }), err => postMessage({ id: m.id, err: String(err && err.message || err) }));
  if (m.op === 'load') chain = chain.then(run, run); else run(); }; /* loads are serialized; searches run while a later tier is still downloading */
