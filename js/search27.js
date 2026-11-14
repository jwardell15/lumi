/* Lumi 26.4: search runs in a Web Worker (js/sworker.js). The page never builds the big index for searching, so typing and results don't freeze the UI.
   Default search covers the first two catalog tiers (index-0, index-g, index-1: ~167k products, whole foods, restaurant chains, Costco/Whole Foods);
   "Search all" adds the other ~460k products on demand (loaded in the worker, tier by tier). If Workers are unavailable or the worker fails, everything
   falls back to the old main-thread engine (still time-sliced). Loaded before app.js; app.js calls SW27.* from runQuery / the suggestion box. */
const SW27 = {
  ok: typeof Worker === 'function' && !/[?&]noworker\b/.test(location.search), w: null, n: 0, pend: new Map(), req: new Map(), loaded: new Set(), docs: new Map(), ver: 0, chainN: [], metaP: null,
  BASE: ['0', 'g', '1'],
  start() {
    if (this.w || !this.ok) return this.w;
    if (typeof home27Wrap === 'function') home27Wrap(); /* engine.byCode also resolves docs that came back from the worker (compare buttons, per-serving fixes, product keys) */
    try { this.w = new Worker('js/sworker.js'); } catch (e) { this.fail(e); return null; }
    this.w.onmessage = e => this.msg(e.data); this.w.onerror = e => { e.preventDefault && e.preventDefault(); this.fail(e.message || 'worker error'); };
    try { if (typeof didYouMean === 'function' && /engine\.post/.test(didYouMean.toString())) this.call('setDym', { src: didYouMean.toString() }).catch(() => {}); } catch {}
    return this.w;
  },
  fail(why) { console.warn('search worker unavailable, using the main-thread engine', why); this.ok = false; try { this.w && this.w.terminate(); } catch {} this.w = null; this.req.clear(); this.loaded.clear(); const err = new Error('worker failed'); this.pend.forEach(p => p.rej(err)); this.pend.clear(); },
  msg(m) {
    if (m.ev === 'chains') { (m.chains || []).forEach(([k, l]) => C.register(k, l, 'rest')); return; }
    if (m.ev === 'tier') { this.loaded.add(m.tier); if (m.chainN) this.chainN = m.chainN; if (typeof tierHook18 !== 'undefined' && tierHook18) tierHook18(); return; }
    const p = this.pend.get(m.id); if (!p) return; this.pend.delete(m.id); if (m.err) p.rej(new Error(m.err)); else p.res(m.res);
  },
  call(op, args) { if (!this.start()) return Promise.reject(new Error('no worker')); return new Promise((res, rej) => { const id = ++this.n; this.pend.set(id, { res, rej }); this.w.postMessage(Object.assign({ id, op }, args)); }); },
  /* load tiers once; later calls for the same tiers share the first call's promise */
  load(tiers) {
    const need = tiers.filter(t => !this.req.has(t)); const p = need.length ? this.call('load', { tiers: need }) : null; if (p) { need.forEach(t => this.req.set(t, p)); p.catch(() => need.forEach(t => this.req.delete(t))); }
    return Promise.all(tiers.map(t => this.req.get(t)));
  },
  base() { return this.load(this.BASE); },
  warm() { if (this.ok) this.base().catch(() => {}); },
  meta() { return this.metaP || (this.metaP = (typeof loadMeta === 'function' ? loadMeta() : Promise.resolve(null)).then(m => m || {})); },
  allTiers() { return this.meta().then(m => { const out = []; for (let i = 2; i < ((m && m.tiers) || 3); i++) out.push(String(i)); return out; }); },
  all() { return this.allTiers().then(t => this.load(t)).then(r => { this.allDone = true; return r; }); },
  world() { return this.meta().then(m => { const W = (m && m.world) || {}, out = []; for (let i = 0; i < (W.core || W.tiers || 0); i++) out.push('w' + i); return this.load(out); }); },
  world2() { return this.meta().then(m => { const W = (m && m.world) || {}, out = []; for (let i = W.core || W.tiers || 0; i < (W.tiers || 0); i++) out.push('w' + i); return this.load(out); }); },
  hydrate(o) { o.keys = (o.keys || []).map(k => C.KEYS.indexOf(k)).filter(k => k >= 0); this.docs.set(o.code, o); return o; },
  keep(list) { this.ver++; if (this.docs.size > 6000) { let n = this.docs.size - 3000; for (const k of this.docs.keys()) { if (n-- <= 0) break; this.docs.delete(k); } } this.patch(); return list; },
  patch() { if (this.patched || typeof codeMap22 !== 'function') return; this.patched = true; const o = codeMap22; self.codeMap22 = function () { const m = o.apply(this, arguments); if (SW27.docs.size && m._s27 !== SW27.ver) { for (const [c, d] of SW27.docs) if (!m.has(c)) m.set(c, d); m._s27 = SW27.ver; } return m; }; },
  /* the three passes runLocal always made, in the same order: 160 best, 30 restaurant items, 30 whole foods */
  searchSet(q) { return this.search(q, [{ limit: 160 }, { limit: 30, src: 'rest' }, { limit: 30, src: 'whole' }]).then(L => [].concat(...L)); },
  async search(q, specs) {
    if (!this.ok) { await loadIndex(); return specs.map(sp => engine.search(q, { limit: sp.limit || 80, prefix: !!sp.prefix, filter: sp.src ? (d => d.src === sp.src) : undefined })); }
    const b = this.base(); await this.req.get('0'); /* answer as soon as the first tier is in; the rest arrives and the page refreshes */
    const r = await this.call('search', { q, specs }); return r.map(l => this.keep(l.map(o => this.hydrate(o))));
  },
  /* Better choice support: the product's own doc, and the candidate pool for its kind (same leaf category, or same chain), so the page never builds the index */
  async doc(code) { if (!this.ok) return null; await this.base(); const o = await this.call('doc', { code }); return o ? this.hydrate(o) : null; },
  async pool(spec) { await this.base(); const r = await this.call('pool', spec); this.total = r.total; return r.docs.map(o => { o.keys = (o.keys || []).map(k => C.KEYS.indexOf(k)).filter(k => k >= 0); return o; }); },
  recalls(p) { return this.call('recalls', { p }); },
  dym(q) { if (!this.ok) return Promise.resolve(typeof didYouMean === 'function' ? didYouMean(q) : null); return this.call('dym', { q }).catch(() => null); },
  chainNames() { return this.ok ? this.chainN : (engine.chainN || []); },
  addRows(rows) { if (this.ok && this.w && this.req.has('0')) this.call('add', { docs: rows }).catch(() => {}); },
};
SW27.allDone = false;
