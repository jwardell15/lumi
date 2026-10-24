'use strict';
const VERSION = '20.6';
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = v => v == null ? '—' : String(Math.round(v * 10) / 10);
const S = window.LumiScore;
const OFF_FIELDS = 'code,product_name,product_name_en,generic_name,brands,image_front_small_url,image_front_url,image_small_url,nutriments,serving_size,serving_quantity,nova_group,additives_tags,allergens_tags,traces_tags,ingredients_analysis_tags,labels_tags,ingredients_text,ingredients_text_en,categories_tags,countries_tags,quantity';
const USDA_KEY = 'DEMO_KEY'; // api.data.gov demo key: per-IP limits (~30 req/hour, 50/day). Responses are cached locally.
const MIRRORS = ['world', 'us', 'ca', 'uk', 'fr'];
const memo = new Map(); // id -> normalized product

/* ---------------- storage ---------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('lumi.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lumi.' + k, JSON.stringify(v)); } catch {} },
};
/* v16 migration: the Dexcom login was removed. Clear any stored Dexcom session id / backend settings and any Dexcom API (sandbox) readings. Clarity CSV and labeled sample data stay. */
(() => { try { const s = store.get('settings', null); if (s && Object.keys(s).some(k => /^dx/.test(k))) { Object.keys(s).filter(k => /^dx/.test(k)).forEach(k => delete s[k]); store.set('settings', s); }
  const c = store.get('cgm', null); if (c && /^api/.test(c.src || '')) store.set('cgm', null);
  const q = new URLSearchParams(location.search); if (q.has('sid') || q.has('error')) history.replaceState(null, '', location.pathname + (location.hash || '')); } catch {} })();
/* v16.1 migration: Lumi no longer uses carbs. Stored items keep a 'net' field for compatibility, now always equal to total carbs; carb-basis settings reset to total. */
(() => { try { if (store.get('mig161', 0)) return; const fix = o => { if (Array.isArray(o)) o.forEach(fix); else if (o && typeof o === 'object') { if ('net' in o && 'carbs' in o) o.net = o.carbs; Object.values(o).forEach(fix); } };
  ['log', 'meals', 'custom', 'recipes', 'plate', 'plan13', 'saved', 'foods', 'recent', 'lists', 'groc13', 'ideas13', 'compare', 'fav15', 'scans', 'watch'].forEach(k => { const v = store.get(k, null); if (v != null) { fix(v); store.set(k, v); } });
  const s = store.get('settings', null); if (s) { s.icrBasis = 'total'; s.mealBasis = 'carbs'; store.set('settings', s); } store.set('mig161', 1); } catch {} })();
/* v17.0: Overall health leads by default (Settings › Primary rating can switch back). */
(() => { try { if (store.get('mig17', 0)) return; const s = store.get('settings', null); if (s) { s.primary = 'health'; store.set('settings', s); } store.set('mig17', 1); } catch {} })();
const saved = () => store.get('saved', []);
const isSaved = id => saved().some(s => s.p.id === id);
function toggleSave(p) { let s = saved(); if (isSaved(p.id)) s = s.filter(x => x.p.id !== p.id); else s.unshift({ p, t: Date.now() }); store.set('saved', s.slice(0, 300)); return isSaved(p.id); }
function addRecent(q) { q = q.trim(); if (!q) return; const r = store.get('recent', []).filter(x => x.toLowerCase() !== q.toLowerCase()); r.unshift(q); store.set('recent', r.slice(0, 8)); }

/* ---------------- net ---------------- */
async function getJSON(url, ms = 10000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
function cached(key, ttl, fn) {
  const c = store.get('c.' + key); if (c && Date.now() - c.t < ttl) return Promise.resolve(c.v);
  return fn().then(v => { store.set('c.' + key, { t: Date.now(), v }); pruneCache(); return v; });
}
function pruneCache() { try { const ks = Object.keys(localStorage).filter(k => k.startsWith('lumi.c.')); if (ks.length > 60) ks.slice(0, ks.length - 60).forEach(k => localStorage.removeItem(k)); } catch {} }

/* ---------------- local index ---------------- */
const engine = new LumiSearch.Engine();
let tier0 = null, tier1 = null, tier2 = null; const tierWaiters = [];
const getData = u => fetch(u).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
function loadIndex() {
  if (!tier0) tier0 = Promise.all([getData('data/index-g.json').catch(() => null), getData('data/index-0.json')]).then(([g, d]) => {
    if (g) { (g.chains || []).forEach(([k, l]) => C.register(k, l, 'rest')); engine.add(g); }
    engine.add(d); notifyTier(); });
  return tier0;
}
function loadIndexFull() {
  if (!tier1) tier1 = loadIndex().then(() => getData('data/index-1.json')).then(d => { engine.add(d); notifyTier(); });
  return tier1;
}
function loadIndexAll() {
  if (!tier2) tier2 = loadIndexFull().then(() => getData('data/index-2.json')).then(d => { engine.add(d); notifyTier(); });
  return tier2;
}
let tierX = null;
function loadIndexX() { // USDA Branded extras (tiers 3+), only fetched when the user searches
  if (!tierX) tierX = Promise.all([loadIndexAll(), loadMeta()]).then(async ([, m]) => { for (let i = 3; i < ((m && m.tiers) || 3); i++) { engine.add(await getData(`data/index-${i}.json`)); notifyTier(); } });
  return tierX;
}
let tierW = null; // v12.1: international OFF layer (index-w-*), loaded only on demand (setting, few US hits, or "include international")
const wantWorld = () => { try { return localStorage.getItem('lumi_world') === '1'; } catch { return false; } };
function loadIndexW() { if (!tierW) tierW = Promise.all([loadIndexX(), loadMeta()]).then(async ([, m]) => { const W = (m && m.world) || {}; for (let i = 0; i < (W.core || W.tiers || 0); i++) { engine.add(await getData(`data/index-w-${i}.json`)); notifyTier(); } }); return tierW; }
let tierW2 = null; /* v18: extended international tiers (beyond the core set), only when a search still has few hits */
function loadIndexW2() { if (!tierW2) tierW2 = Promise.all([loadIndexW(), loadMeta()]).then(async ([, m]) => { const W = (m && m.world) || {}; for (let i = W.core || W.tiers || 0; i < (W.tiers || 0); i++) { engine.add(await getData(`data/index-w-${i}.json`)); notifyTier(); } }); return tierW2; }
const ghash = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 40; };
const gshardCache = new Map();
async function genericProduct(id) { const k = ghash(id); if (!gshardCache.has(k)) gshardCache.set(k, getData(`data/g/${k}.json`).catch(() => ({}))); const sh = await gshardCache.get(k); return sh[id] ? S.fromCompact(sh[id]) : null; }
let tierHook18 = null;
function notifyTier() { tierWaiters.forEach(f => f()); if (tierHook18) tierHook18(); }
const shardCache = new Map();
const wshardCache = new Map();
function wshard(code) { const k = code.slice(-3); if (!wshardCache.has(k)) wshardCache.set(k, fetch(`data/w/${k}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}))); return wshardCache.get(k); }
function shard(code) { const k = code.slice(-3); if (!shardCache.has(k)) shardCache.set(k, fetch(`data/d/${k}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}))); return shardCache.get(k); }
const codeVariants = c => { c = String(c).replace(/\D/g, ''); const s = c.replace(/^0+/, ''); return [...new Set([c, s, s.padStart(12, '0'), s.padStart(13, '0'), s.padStart(8, '0')])].filter(x => x.length >= 8); };
const gtinKey = c => c ? String(c).replace(/\D/g, '').replace(/^0+/, '') : '';
async function localProduct(code) {
  for (const v of codeVariants(code)) { const sh = await shard(v); if (sh[v]) return S.fromCompact(sh[v]); }
  for (const v of codeVariants(code)) { const sh = await wshard(v); if (sh[v]) return S.fromCompact(sh[v]); } // v12.1: international layer
  return null;
}

/* ---------------- remote sources ---------------- */
async function usdaSearch(q) {
  const v = await cached('usda:' + q.toLowerCase(), 864e5, () => getJSON(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(q)}&pageSize=40&dataType=Branded,Foundation,SR%20Legacy`, 12000)
    .then(j => (j.foods || []).map(f => ({ fdcId: f.fdcId, description: f.description, dataType: f.dataType, gtinUpc: f.gtinUpc, brandName: f.brandName, brandOwner: f.brandOwner, ingredients: (f.ingredients || '').slice(0, 600), servingSize: f.servingSize, servingSizeUnit: f.servingSizeUnit, householdServingFullText: f.householdServingFullText, brandedFoodCategory: f.brandedFoodCategory, foodCategory: f.foodCategory, packageWeight: f.packageWeight,
      foodNutrients: (f.foodNutrients || []).filter(n => ['205', '269', '539', '291', '203', '204', '606', '605', '307', '208', '299'].includes(String(n.nutrientNumber))).map(n => ({ nutrientNumber: n.nutrientNumber, value: n.value })) }))));
  return v.map(S.fromUSDA);
}
let offDownUntil = +(sessionStorage.getItem('lumi.offDown') || 0); // v9: after a failed OFF search, skip live OFF for 10 min (fewer blocked requests, less console noise)
async function offSearch(q) {
  const enc = encodeURIComponent(q);
  const v = await cached('off:' + q.toLowerCase(), 6 * 36e5, async () => {
    if (Date.now() < offDownUntil) throw new Error('Open Food Facts paused');
    const pref = store.get('offMirror', 'world'), order = [pref].concat(['world', 'us'].filter(m => m !== pref));
    for (const cc of order) {
      try { const j = await getJSON(`https://${cc}.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=30&fields=${OFF_FIELDS}`, 9000); if (Array.isArray(j.products)) { store.set('offMirror', cc); return j.products; } } catch (e) { /* try next mirror */ }
    }
    offDownUntil = Date.now() + 6e5; try { sessionStorage.setItem('lumi.offDown', offDownUntil); } catch {} throw new Error('Open Food Facts unavailable');
  });
  return v.filter(p => p.code).map(S.fromOFF);
}
async function offProduct(code) {
  for (const host of ['world', 'us']) {
    try { const j = await getJSON(`https://${host}.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, 8000); if (j.status === 1 && j.product) { j.product.code = j.product.code || code; return S.fromOFF(j.product); } if (j.status === 0) return null; } catch {}
  }
  throw new Error('OFF unreachable');
}
async function usdaFood(fdcId) { const f = await cached('fdc:' + fdcId, 7 * 864e5, () => getJSON(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${USDA_KEY}`, 12000)); return S.fromUSDA(f); }
async function usdaByGtin(code) { const r = await usdaSearch(gtinKey(code)); return r.find(p => gtinKey(p.code) === gtinKey(code)) || null; }

/* ---------------- result items ---------------- */
function itemFromProduct(p, rel) { const s = S.score(p); memo.set(p.id, p); const hr = HR(p); const wh = typeof watchHits === 'function' ? watchHits(p) : null; return { wa: wh && wh.length ? wh.map(h => h.label).join(', ') : '', m: p.src === 'cos' ? null : dietM(p), h: hr.score, hn: hr.basis === 'nutrition', id: p.id, code: p.code, name: p.name, brand: LumiSearch.fixBrand(p.brand, p.name), score: s.score, net: s.score == null ? null : s.net, img: p.img, src: p.src, cat: p.cat, rel, sg: Math.round(s.servG || 0), sb: ({ label: 0, custom: 0, item: 1, default: 2, per100: 3 }[s.servKind] ?? -1) | (p.liquid ? 4 : 0) }; }
function itemFromDoc(d) { return { sg: d.sg, sb: d.sb, zc: d.zc, wa: d.wf && typeof watchFlags === 'function' ? watchFlags(d.wf) : '', ai: d.ai, bad: d.bad, sizes: d.sizes, fl: d.fl, al: d.al, df: d.df, h: d.h, hn: d.hn, id: d.code, code: d.code, name: d.name, brand: d.brand, score: d.score, net: d.score == null ? null : d.net, img: d.img, src: d.src || 'local', cat: d.cat, keys: d.keys, rel: d.rel }; }
function textRel(q, name, brand) {
  const qt = LumiSearch.toks(q), nt = new Set(LumiSearch.toks(name + ' ' + brand)); if (!qt.length) return 0;
  let hit = 0; for (const t of qt) if (nt.has(t) || [...nt].some(x => x.startsWith(t) || (t.length > 4 && LumiSearch.dl(t, x, 1) <= 1))) hit++;
  return (hit / qt.length) * 100 * (hit / qt.length) + (LumiSearch.norm(name).includes(LumiSearch.norm(q)) ? 25 : 0);
}

/* ---------------- UI atoms ---------------- */
const BAND = s => S.band(s);
function mini(x) {
  const it = typeof x === 'object' && x ? x : { score: x, h: undefined }; const ph = PRIM() === 'health';
  const sv = typeof servTxt19 === 'function' ? servTxt19(it) : ''; const A = ph ? { v: it.h, b: HB(it.h) } : { v: it.score, b: BAND(it.score) }, B = ph ? { v: it.score, b: BAND(it.score), n: 'Carb' } : { v: it.h, b: HB(it.h), n: 'Health' };
  return `<div class="rtg"><div class="rt1"><i class="sdot sm bg-${A.b}"></i><b>${A.v ?? '?'}</b><small>/100</small></div><div class="rt-l c-${A.b}">${A.v == null ? 'No data' : HL(A.v)}</div>${B.v === undefined ? '' : `<span class="b2" title="${B.n === 'Carb' ? 'Carb score' : 'Health rating'}"><i class="bg-${B.b}"></i>${B.n} ${B.v ?? '?'}</span>`}${sv ? `<small class="sv19">${sv}</small>` : ''}</div>`;
}
function pills(d) { return alertIcon(d) + pills0(d); }
function pills0(d) { const ph = PRIM() === 'health'; const a = ph ? d.h : d.score, b = ph ? d.score : d.h;
  return `<span class="pill bg-${ph ? HB(a) : BAND(a)}">${a ?? '?'}</span>${b === undefined ? '' : `<span class="b2 xs"><i class="bg-${ph ? BAND(b) : HB(b)}"></i>${ph ? 'C' : 'H'} ${b ?? '?'}</span>`}`; }
const C = window.LumiCats;
function catIcon(keys, cat) {
  for (const i of keys || []) { const k = C.KEYS[i]; const top = C.CATS[k][4] || k; if (C.CATS[top][0]) return C.CATS[top][0]; }
  const t = String(cat || '').toLowerCase();
  const m = [[/cereal|granola|oat/, '🥣'], [/chip|crisp|snack|cracker|popcorn/, '🍿'], [/drink|beverage|soda|juice|water/, '🥤'], [/yog/, '🥛'], [/sauce|dressing|dip|salsa|condiment/, '🥫'], [/bar\b/, '🍫'], [/bread|tortilla|bagel/, '🍞'], [/chees|milk|dairy/, '🧀'], [/cookie|candy|choc|sweet|dessert|ice/, '🍪'], [/nut|peanut|almond/, '🥜']].find(([r]) => r.test(t));
  return m ? m[1] : '🛒';
}
function thumb(img, name, keys, cat, big, brand) {
  let src = img ? S.imgSize(img, big ? 400 : 200) : ''; if (BADIMG.test(src)) src = '';
  const bg = !src && brand && isRestKeys(keys) ? chainPH(brand) : `<span class="ic">${catIcon(keys, cat)}</span>`;
  return `<div class="thumb${big ? ' big' : ''}">${bg}${src ? `<img src="${esc(src)}" alt="" ${big ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onload="LumiImg.ok(this)" onerror="LumiImg.err(this)">` : ''}</div>`;
}
const SRC = { local: '', off: '<span class="tag">OFF</span>', usda: '<span class="tag">USDA</span>', whole: '<span class="tag t-whole">Whole food</span>', rest: '<span class="tag t-rest">Restaurant</span>', chain: '<span class="tag t-rest">Restaurant</span>', custom: '<span class="tag">My food</span>' };
function rowHTML(it) { return `<a class="row" href="#/product/${esc(it.id)}">${thumb(it.img, it.name, it.keys, it.cat, false, it.brand)}<div class="t"><div class="n">${alertIcon(it)}${esc(it.name)}${it.src === 'world' ? '<span class="wbadge" title="International product (Open Food Facts)">🌍 Intl</span>' : ''}</div><div class="b">${/^usda\b/i.test(it.brand || '') && it.src === 'usda' ? '' : SRC[it.src] || ''}${it.src === 'whole' ? esc(/^usda/i.test(it.brand || '') ? 'USDA' : /^cnf|canad/i.test(it.brand || '') ? 'CNF' : String(it.brand || '').split(' ')[0]) : esc(LumiSearch.fixBrand ? LumiSearch.fixBrand(it.brand, it.name) : it.brand || '')}${it.sizes > 1 ? ` · ${it.sizes} sizes` : ''}${it.wa ? ` · <span class="wa8" title="Watchlist: ${esc(it.wa)}">⚠ ${esc(it.wa)}</span>` : ''}${it.zc && !it.bad ? ' · <span class="c-pr badchip" title="The label lists sugar but 0 g carbs, which cannot both be right">⚠ 0 g carbs listed with sugar, check label</span>' : it.bad ? ' · <span class="c-bd badchip" title="Calories don\'t add up from carbs, protein and fat (4/4/9), so this label data is probably wrong">⚠ data looks wrong</span>' : it.score == null ? ' · <span class="c-pr">data incomplete</span>' : it.net != null ? ` · ${r1(it.net)}g carbs${(it.sb & 3) === 1 ? ' per item' : '/100'}` : ''}</div></div>${mini(it)}</a>`; }
const skel = n => `<div class="list">${Array.from({ length: n }, () => `<div class="row skel"><div class="thumb sk"></div><div class="t"><div class="sk skl" style="width:80%"></div><div class="sk skl" style="width:45%"></div></div><div class="sk" style="width:44px;height:44px;border-radius:50%"></div></div>`).join('')}</div>`;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
const go = h => { if (location.hash !== h) location.hash = h; else route(); };
const ICON_SEARCH = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';


/* ---------------- search box w/ suggestions ---------------- */
function searchBox(q = '') {
  return `<form class="sbox" id="sform" autocomplete="off" role="search"><div class="sfield">${ICON_SEARCH}<input id="q" type="search" enterkeyhint="search" placeholder="Search foods or brands" value="${esc(q)}" aria-label="Search"><button type="button" class="clear" id="qclear" ${q ? '' : 'hidden'} aria-label="Clear">✕</button><button class="sbtn">Go</button></div><div class="sugg" id="sugg" role="listbox"></div></form>`;
}
function bindSearch() {
  const f = $('#sform'), q = $('#q'), sg = $('#sugg'), clr = $('#qclear'); let act = -1, timer;
  const close = () => { sg.classList.remove('on'); act = -1; };
  const show = () => {
    const v = q.value.trim(); clr.hidden = !v;
    if (!v) { const rec = store.get('recent', []); sg.innerHTML = rec.map(r => `<a href="#/search/${encodeURIComponent(r)}"><span>🕘</span><span class="k">${esc(r)}</span></a>`).join(''); sg.classList.toggle('on', rec.length > 0 && document.activeElement === q); return; }
    loadIndex().then(() => {
      if (q.value.trim() !== v) return;
      const res = engine.search(v, { limit: 6, prefix: true });
      sg.innerHTML = `<a href="#/search/${encodeURIComponent(v)}"><span>${ICON_SEARCH}</span><span class="k">Search “${esc(v)}”</span></a>` + res.map(d => `<a href="#/product/${esc(d.code)}"><span class="pills">${pills(d)}</span><span class="k">${esc(d.name)} <small>${esc(d.brand)}</small></span></a>`).join('');
      sg.classList.toggle('on', document.activeElement === q);
    });
  };
  q.addEventListener('input', () => { clearTimeout(timer);
    if (rs && rs.live) { const v = q.value.trim(); clr.hidden = !v; timer = setTimeout(() => { if (v.length >= 2) { history.replaceState(null, '', '#/search/' + encodeURIComponent(v)); runQuery(v, true); } }, 140); return; }
    timer = setTimeout(show, 90); });
  q.addEventListener('focus', () => { if (!(rs && rs.live)) show(); }); q.addEventListener('blur', () => setTimeout(close, 180));
  q.addEventListener('keydown', e => { const a = [...sg.querySelectorAll('a')]; if (!a.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + a.length) % a.length; a.forEach((x, i) => x.classList.toggle('act', i === act)); }
    else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); location.hash = a[act].getAttribute('href'); close(); } else if (e.key === 'Escape') close(); });
  clr.onclick = () => { q.value = ''; q.focus(); show(); };
  f.onsubmit = e => { e.preventDefault(); const v = q.value.trim(); if (!v) return; close(); q.blur(); if (rs && rs.live && !/^\d{8,14}$/.test(v)) { history.replaceState(null, '', '#/search/' + encodeURIComponent(v)); addRecent(v); return runQuery(v, false); } if (/^\d{8,14}$/.test(v)) go('#/product/' + v); else go('#/search/' + encodeURIComponent(v)); };
}

/* ---------------- views ---------------- */
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function todayCard() {
  const st = settings(), es = LOG.all().filter(e => dayKey(e.ts) === dayKey(new Date())), t = totals(es);
  const pct = st.target ? Math.min(1, t.carbs / st.target) : null, R = 26, c = 2 * Math.PI * R;
  return `<a class="today-mini" href="#/log">
    <svg viewBox="0 0 64 64" width="64" height="64" class="tm-ring"><circle cx="32" cy="32" r="${R}" class="trk"/>${pct != null ? `<circle cx="32" cy="32" r="${R}" class="val ${t.carbs > st.target ? 'over' : ''}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 32 32)"/>` : ''}<text x="32" y="37" text-anchor="middle">${Math.round(t.carbs)}</text></svg>
    <div><b>${es.length ? `${Math.round(t.carbs)} g carbs today` : 'Nothing logged today'}</b><span>${es.length ? `${es.length} item${es.length > 1 ? 's' : ''} · ${Math.round(t.kcal)} Cal${st.target ? ` · ${Math.max(0, Math.round(st.target - t.carbs))} g left` : ''}` : 'Tap to open your log'}</span></div><span class="chev">›</span></a>`;
}
function viewHomeOld() {
  const rec = store.get('recent', []), viewed = histItems('viewed').slice(0, 4), pl = plate(), nc = cmpIds().length;
  app.innerHTML = `<section class="hello">${MASCOT(72, 'wave')}<div><h1>${greeting()}!</h1><p class="lead" id="lead">${leadText(META)}</p></div></section>
  ${whatsNewCard()}
  ${todayCard()}
  ${searchBox()}
  <div class="chips">${C.TOP.map(k => `<a class="chip" href="#/browse/${k}">${C.CATS[k][0]} ${C.CATS[k][1]}</a>`).join('')}</div>
  <div class="quick">
    <button class="hero-scan" id="heroScan"><div class="ic"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg></div><div><b>Scan a barcode</b><span>Score + add to log in seconds</span></div></button>
    <a class="qa-tile" href="#/meal"><span class="qi">🍽</span><b>Meal builder</b><span>${pl.length ? `${pl.length} on plate · ${Math.round(totals(pl).carbs)} g` : 'Build a plate'}</span></a>
    <a class="qa-tile" href="#/lists"><span class="qi">☰</span><b>Lists</b><span>${listsSummary()}</span></a>
    <a class="qa-tile" href="#/compare"><span class="qi">⇆</span><b>Compare</b><span>${nc ? `${nc} selected` : 'Side by side'}</span></a>
    <a class="qa-tile" href="#/cosmetics"><span class="qi">🧴</span><b>Cosmetics</b><span>Shampoo, sunscreen…</span></a>
    <a class="qa-tile" href="#/overview"><span class="qi">📊</span><b>Overview</b><span>Your stats</span></a>
    <a class="qa-tile" href="#/additives"><span class="qi">🧪</span><b>Additives</b><span>What's in it</span></a>
  </div>
  ${storeChips()}
  ${aisleTiles()}
  <form class="bc" id="bform"><input id="bc" inputmode="numeric" pattern="[0-9]*" placeholder="…or type a barcode" aria-label="Barcode"><button>Look up</button></form>
  ${viewed.length ? `<div class="sec-h"><h2>Recently viewed</h2><a href="#/saved">History</a></div><div class="list">${viewed.map(rowHTML).join('')}</div>` : ''}
  ${rec.length ? `<div class="sec-h"><h2>Recent searches</h2><button id="clrRec">Clear</button></div><div class="chips" style="margin-top:0">${rec.map(r => `<a class="chip" href="#/search/${encodeURIComponent(r)}">🕘 ${esc(r)}</a>`).join('')}</div>` : ''}
  <div id="foryou"></div>
  <div class="sec-h"><h2>Top-scoring picks</h2></div><div id="picks">${skel(4)}</div>
  <div class="sec-h"><h2>Best at restaurants</h2><a href="#/browse/rest">All chains</a></div><div id="restBest"><div class="swaps">${'<div class="swap skel"></div>'.repeat(4)}</div></div>
  <p class="foot">Lumi ${VERSION} · <a class="lnk" href="#/whatsnew">What's new</a> · Informational only — not medical advice.</p>`;
  bindSearch();
  $('#heroScan').onclick = startScan;
  $('#bform').onsubmit = e => { e.preventDefault(); const c = $('#bc').value.replace(/\D/g, ''); if (c.length >= 8) { sessionStorage.setItem('lumi.scanned', c); go('#/product/' + c); } else toast('Enter an 8–14 digit barcode'); };
  if ($('#clrRec')) $('#clrRec').onclick = () => { store.set('recent', []); viewHome(); };
  loadIndex().then(loadIndexFull).then(renderForYou).catch(() => {});
  loadMeta().then(m => { const el = $('#lead'); if (el && m) el.textContent = leadText(m); });
  const drawPicks = () => {
    const el = $('#picks'); if (!el) return;
    let p = []; try { p = topPicks(); } catch (e) { console.warn('picks', e); }
    const items = p.length >= 4 ? p.filter(d => !prefs().hide || !conflicts(d)).map(itemFromDoc) : FALLBACK_PICKS.map(x => ({ id: x[0], code: x[0], name: x[1], brand: x[2], score: x[3], net: x[4], img: '', src: x[5] || 'local', keys: [], cat: '' }));
    el.innerHTML = `<div class="list">${items.map(rowHTML).join('')}</div>`;
    const rb = $('#restBest'); if (rb) { let r = []; try { r = bestAtRestaurants(); } catch {} rb.innerHTML = r.length ? `<div class="swaps">${r.map(d => `<a class="swap" href="#/product/${esc(d.code)}">${thumb(d.img, d.name, d.keys, d.cat, false, d.brand)}<div class="b chain">${esc(d.brand)}</div><div class="n">${esc(d.name)}</div><div class="s"><span>${d.net}g carbs</span><span class="pills">${pills(d)}</span></div></a>`).join('')}</div>` : `<div class="empty sm">${MASCOT(48)}<span>Restaurant data is loading or unavailable offline.</span></div>`; }
  };
  const fb = setTimeout(drawPicks, 6000); // never leave the section empty
  loadIndex().then(() => { clearTimeout(fb); drawPicks(); return loadIndexFull(); }).then(drawPicks).catch(() => { clearTimeout(fb); drawPicks(); });
  setTimeout(() => loadIndexFull().catch(() => {}), 1500);
}

const NONEN = /\b(le|la|les|du|des|de|et|au|aux|avec|sans|nature|fromage|lait|sucre|chocolat|yaourt|leche|con|sin|del|azucar|queso|und|mit|vanille|fraise|eau|pain|beurre|creme|natur|saveur|parfum|sabor|blanc|petit|recette|aceite|agua|bebida|dulce|avena|himbeer|erdbeer|erdbeere|fruchtsirup|sirup|rafra[iî]chisseur|haleine|schokolade|k[aä]se|milch|saft|wasser|kekse|brot|nudeln|zucker|ohne|confiture|fragola|cioccolato|biscotti al|galletas|zumo|jugo|refresco|chocolate con|bonbon au|gâteau|gateau)\b/i;
const usEnglish = d => /^[\x20-\x7e]+$/.test(d.name + d.brand) && !NONEN.test(d.name) && ((d.code.length === 12) || (d.code.length === 13 && /^[01]/.test(d.code)));
// Picks: varied, US/English packaged foods (one per category/brand) + whole foods + official restaurant items.
function topPicks() {
  const off = [], whole = [], rest = [];
  for (const d of engine.docs) {
    if (d.score == null || d.net == null || d.fl) continue;
    if (d.src === 'whole') { if (d.score >= 70 && d.net >= 5) whole.push(d); continue; }
    if (d.src === 'rest') { if (d.score >= 65 && d.net >= 8 && /^r-/.test(d.code) && !NOTMEAL.test(d.name)) rest.push(d); continue; }
    if (d.rank < 40000 && d.score >= 72 && d.net >= 2 && d.brand && !isStaple(d) && !isSugaryDrink(d) && usEnglish(d) && !/\bwater\b/i.test(d.name)) off.push(d);
  }
  const out = [], brands = new Set(), cats = new Set();
  const bkey = d => d.src === 'whole' ? d.code : (d.brand || '').toLowerCase().split(/[\s,]/)[0];
  const take = (pool, pred) => { const d = pool.find(x => pred(x) && !brands.has(bkey(x)) && !out.includes(x)); if (d) { out.push(d); brands.add(bkey(d)); } return d; };
  const order = ['yogurt', 'cereal', 'snacks', 'bars', 'dairy', 'nuts', 'bread', 'sauces', 'drinks', 'sweets'];
  const withImg = off.filter(d => d.img); const pool = withImg.length >= 20 ? withImg : off;
  for (const name of order) { const ki = C.KEYS.indexOf(name); const d = take(pool, x => x.keys.includes(ki) && !cats.has(x.cat)); if (d) cats.add(d.cat); if (out.length >= 8) break; }
  const wsub = ['whole-fruit', 'whole-veg', 'whole-legumes', 'whole-grains'].map(k => C.KEYS.indexOf(k));
  whole.sort((a, b) => a.name.length - b.name.length); // simple, recognizable names first
  let w = 0; for (const ki of wsub) { if (w >= 2) break; if (take(whole, x => x.keys.includes(ki) && /raw|cooked|boiled|^[^,]+,?[^,]*$/i.test(x.name))) w++; }
  rest.sort((a, b) => (MAIN.test(b.name) - MAIN.test(a.name)) || b.score - a.score); take(rest, () => true); take(rest, () => true);
  return (typeof diversify === 'function' ? diversify(out) : out).slice(0, 12);
}
const NOTMEAL = /sauce|syrup|dressing|dip\b|onion|lemon|lime\b|crouton|nut blend|applesauce|slice\b|packet|add-?in|topping|pickle|ketchup|mayo|mustard|lettuce|tomato|jalape|pepper|seasoning|creamer|sweetener|sugar|\bzero\b|diet|water|\btea\b|coffee|espresso|americano|\bbun\b|tortilla|patty|bacon\b|cheese$|butter\b|jelly|jam\b|honey|salsa|guac|sour cream|ice\b|lid|extra\b|xtra|side of|substitute|\boz\.?\)$|sprinkle|shot\b|flavor|mints?\b|relish|shell|^add\b/i;
const MAIN = /sandwich|burger|wrap|bowl|salad|tender|nugget|chicken|taco|burrito|quesadilla|pizza|\bsub\b|melt|club|grilled|egg|omelet|platter|wings?\b|steak|turkey|ham\b|italian|slice of|unwich|chili|soup/i;
function bestAtRestaurants() {
  const best = new Map();
  for (const d of engine.docs) {
    if (d.src !== 'rest' || d.score == null || d.net == null || d.net < 8 || NOTMEAL.test(d.name)) continue;
    const k = d.keys.find(x => C.KEYS[x] && C.KEYS[x].startsWith('rest-') && C.KEYS[x] !== 'rest-other'); if (k == null) continue;
    const b = best.get(k); const mv = x => MAIN.test(x.name) ? 1 : 0; if (!b || mv(d) > mv(b) || (mv(d) === mv(b) && d.score > b.score)) best.set(k, d);
  }
  return [...best.values()].sort((a, b) => (/^r-/.test(b.code) - /^r-/.test(a.code)) || b.score - a.score).slice(0, 24);
}
const FALLBACK_PICKS = [["0096619483556", "organic GREEK YOGURT plain", "KIRKLAND Signature", 96, 4, "local"], ["0850017468993", "Catalina Crunch Cinnamon Toast Protein Cereal", "Catalina Crunch", 74, 25, "local"], ["0071146002456", "HARVEST SNAPS Lightly Salted Crispy Baked Veggie Snacks", "Calbee", 73, 57, "local"], ["0888849000012", "Chocolate Chip Cookie Dough", "Quest", 73, 27, "local"], ["0051500255650", "PEANUT BUTTER SPREAD", "Jif", 75, 24, "local"], ["0013764027282", "Powerseed Organic Bread", "Dave's Killer Bread", 77, 31, "local"], ["0747479000413", "Marinara", "Rao's Homemade", 86, 5, "local"], ["fdc-2709240", "Lychee", "USDA (FNDDS)", 80, 15, "whole"], ["fdc-2709935", "Leeks", "USDA (FNDDS)", 84, 13, "whole"], ["r-arbys-chicken-tenders-2", "Chicken Tenders (2)", "Arby's", 90, 9, "rest"]]; // shown if the index can't load
let META = null;
function loadMeta() { return META ? Promise.resolve(META) : getData('data/meta.json').then(m => (META = m)).catch(() => null); }
const fmtK = n => n >= 1000 ? (Math.floor(n / 1000)).toLocaleString() + ',000+' : String(n);
function leadText(m) { return m && m.products ? `Carb-first scores for ${fmtK(m.products)} US products, ${fmtK(m.whole)} whole foods and ${m.chains} restaurant chains, plus USDA & Open Food Facts live.` : 'Carb-first scores for US packaged foods, whole foods and restaurant meals, plus USDA & Open Food Facts live.'; }
function renderForYou() {
  const el = $('#foryou'); if (!el) return;
  const since = Date.now() - 30 * 864e5, cnt = {};
  LOG.all().filter(e => e.ts > since).forEach(e => { cnt[e.pid] = cnt[e.pid] || { n: 0, e }; cnt[e.pid].n++; });
  const top = Object.values(cnt).sort((a, b) => b.n - a.n).slice(0, 8); const rows = [];
  for (const { e, n } of top) {
    const doc = engine.byCode(e.pid); if (!doc || doc.score == null || doc.score >= 80) continue;
    const sw = swapsFor(doc, { score: doc.score, net: doc.net, sugar: doc.sugar }, 1)[0]; if (!sw) continue;
    rows.push(`<a class="row fy" href="#/product/${esc(sw.code)}">${thumb(sw.img, sw.name, sw.keys, sw.cat)}<div class="t"><div class="b">Instead of ${esc(doc.name)} <span class="small">(logged ${n}×)</span></div><div class="n">${esc(sw.name)}</div><div class="b why">${esc(sw.reason)}</div></div>${mini(sw)}</a>`);
    if (rows.length >= 3) break;
  }
  el.innerHTML = rows.length ? `<div class="sec-h"><h2>For you</h2><a href="#/log">Your log</a></div><div class="list">${rows.join('')}</div>` : '';
}
let rs = null; // current result state
function resultsShell(title, q) {
  app.innerHTML = `${searchBox(q)}
  <div class="tools"><div class="seg" id="sort"><button data-s="rel">Relevance</button><button data-s="health">Health</button><button data-s="score">Carb score</button><button data-s="carb">Low carb</button></div>
  <button class="chip tog" id="fGood">Good+ carb</button><button class="chip tog" id="fHealthy">Healthy 50+</button><button class="chip tog" id="fLow">≤10g carbs</button><button class="chip tog" id="fHide">Hide conflicts</button><button class="chip tog" id="fReady">📦 Ready-to-eat</button><button class="chip tog" id="fPhoto">📷 Has photo</button><button class="chip tog" id="fBad">Hide bad data</button></div>
  <div class="chips grp" id="grp"></div><div id="dym"></div><div id="cosHint"></div>
  <div class="status" id="status"></div><div id="res">${skel(6)}</div>`;
  bindSearch();
  const sortSel = store.get('sort', 'rel');
  document.querySelectorAll('#sort button').forEach(b => { b.classList.toggle('on', b.dataset.s === sortSel); b.onclick = () => { store.set('sort', b.dataset.s); document.querySelectorAll('#sort button').forEach(x => x.classList.toggle('on', x === b)); renderResults(); }; });
  const fl = store.get('filters', {});
  [['fGood', 'good'], ['fHealthy', 'healthy'], ['fLow', 'low'], ['fHide', 'hide'], ['fReady', 'ready'], ['fPhoto', 'photo'], ['fBad', 'nobad']].forEach(([id, k]) => { const b = $('#' + id); b.classList.toggle('on', !!fl[k]); b.onclick = () => { const f = store.get('filters', {}); f[k] = !f[k]; store.set('filters', f); b.classList.toggle('on', f[k]); renderResults(); }; });
}
function renderResults() {
  if (!rs) return; const el = $('#res'); if (!el) return;
  const st = rs.src, lab = { local: 'Lumi index', usda: 'USDA', off: 'Open Food Facts' };
  $('#status').innerHTML = Object.keys(st).map(k => `<i><span class="dot ${st[k]}"></span>${lab[k]}${st[k] === 'ok' ? ` · ${rs.counts[k] || 0}` : st[k] === 'err' ? ' · unavailable' : ''}</i>`).join('');
  let items = [...rs.items.values()]; const f = store.get('filters', {}), sort = store.get('sort', 'rel');
  const grpOf = i => i.src === 'rest' || i.src === 'chain' ? 'rest' : i.src === 'whole' ? 'whole' : 'prod';
  if (rs.live) {
    const cnt = { prod: 0, rest: 0, whole: 0 }; items.forEach(i => { if (i[sortKey(sort)] != null || sort === 'rel') cnt[grpOf(i)]++; });
    const G = [['all', 'All'], ['prod', 'Products'], ['rest', 'Restaurants'], ['whole', 'Whole foods']], cur = rs.group || 'all';
    $('#grp').innerHTML = G.map(([k, l]) => `<button class="chip${cur === k ? ' on' : ''}" data-g="${k}">${l}${k === 'all' ? '' : ` <small>${cnt[k]}</small>`}</button>`).join('');
    document.querySelectorAll('#grp button').forEach(b => b.onclick = () => { rs.group = b.dataset.g; rs.limit = 40; renderResults(); });
    if (cur !== 'all') items = items.filter(i => grpOf(i) === cur);
  }
  if (f.good) items = items.filter(i => i.score >= 50); if (f.healthy) items = items.filter(i => i.h >= 50); if (f.low) items = items.filter(i => i.net != null && i.net <= 10); if (f.hide || prefs().hide) items = items.filter(i => !conflicts(i)); if (f.ready) items = items.filter(readyToEat); if (f.photo) items = items.filter(i => !!i.img); if (f.nobad) items = items.filter(i => !i.bad);
  const sk = sortKey(sort); const unknown = sort === 'rel' && !f.good && !f.low && !f.healthy ? items.filter(i => i[sk] == null) : [];
  items = items.filter(i => i[sk] != null);
  if (sort === 'score') items.sort((a, b) => b.score - a.score || b.rel - a.rel);
  else if (sort === 'health') items.sort((a, b) => b.h - a.h || b.rel - a.rel);
  else if (sort === 'carb') items.sort((a, b) => (a.net ?? 999) - (b.net ?? 999) || b.score - a.score);
  else items.sort((a, b) => b.rel - a.rel);
  if (sort === 'rel') { const top = [], rest = [], cnt = new Map(); for (const x of items) { const b = String(x.brand || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')[0] || x.id; const n = cnt.get(b) || 0; if (top.length < 30 && (n < 3 || x.src === 'whole' || x.src === 'rest')) { top.push(x); cnt.set(b, n + 1); } else rest.push(x); } items = top.concat(rest); } // v8.0: max 3 per brand in top results
  items = items.concat(unknown);
  const pending = Object.values(st).includes('load');
  if (!items.length) {
    if (pending) { el.innerHTML = skel(4); return; }
    const anyFiltered = rs.items.size > 0;
    el.innerHTML = `<div class="empty">${MASCOT(96, 'big sad')}<b>${anyFiltered ? 'No matches with these filters' : 'Nothing found'}</b>${anyFiltered ? 'Try turning off a filter.' : 'Check the spelling, try fewer words or a brand name — or scan the barcode.'}</div>`; return;
  }
  const lim = rs.limit || 40;
  if (rs.live && (rs.group || 'all') === 'all' && sort === 'rel' && !f.good && !f.low && !f.healthy) {
    const by = { prod: [], rest: [], whole: [] }; items.forEach(i => by[grpOf(i)].push(i));
    const top = items[0] ? grpOf(items[0]) : 'prod';
    const mx = k => Math.max(-1e9, ...by[k].map(i => i.rel || 0)); if (top !== 'rest' && by.rest.length && mx('rest') < mx('prod') - 15) by.rest = []; // v9: restaurant rows only when they are actually relevant
    const order = [top].concat(['prod', 'rest', 'whole'].filter(k => k !== top)), L = { prod: 'Products', rest: 'Restaurants', whole: 'Whole foods' };
    el.innerHTML = order.filter(k => by[k].length).map(k => { const n = k === top ? 8 : 4; return `<div class="sec-h grp-h"><h2>${L[k]}</h2>${by[k].length > n ? `<button data-sg="${k}">See all ${by[k].length} ›</button>` : ''}</div><div class="list">${by[k].slice(0, n).map(rowHTML).join('')}</div>`; }).join('') + (pending ? `<div class="small" style="text-align:center;margin-top:10px">Still checking other sources…</div>` : '');
    document.querySelectorAll('[data-sg]').forEach(b => b.onclick = () => { rs.group = b.dataset.sg; renderResults(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    return;
  }
  el.innerHTML = `<div class="list">${items.slice(0, lim).map(rowHTML).join('')}</div>${items.length > lim ? `<button class="more" id="more">Show more (${items.length - lim})</button>` : ''}${pending ? `<div class="small" style="text-align:center;margin-top:10px">Still checking other sources…</div>` : ''}`;
  if ($('#more')) $('#more').onclick = () => { rs.limit = lim + 40; renderResults(); };
}
function mergeItems(list) {
  if (!rs.keyIdx) { rs.keyIdx = new Map(); for (const x of rs.items.values()) { const g = gtinKey(x.code); if (g) rs.keyIdx.set('g' + g, x); rs.keyIdx.set('n' + LumiSearch.groupKey(x.name, x.brand), x); } }
  for (const it of list) {
    const g = gtinKey(it.code), nk = 'n' + LumiSearch.groupKey(it.name, it.brand);
    const dup = (g && rs.keyIdx.get('g' + g)) || rs.keyIdx.get(nk);
    if (dup && dup.id !== it.id) { if (!dup.img && it.img) dup.img = it.img; dup.sizes = (dup.sizes || 1) + 1; continue; }
    rs.items.set(it.id, it); if (g) rs.keyIdx.set('g' + g, it); rs.keyIdx.set(nk, it);
  }
}
function viewSearch(q) {
  addRecent(q); resultsShell('', q); runQuery(q, false);
}
function runQuery(q, typing) {
  document.title = `${q} — Lumi`;
  const prev = rs; const my = rs = { q, live: true, group: prev && prev.live ? prev.group : 'all', items: new Map(), src: { local: 'load', usda: 'load', off: 'load' }, counts: {} };
  loadCos().then(I => { if (rs !== my) return; const el = $('#cosHint'); if (!el) return; const qq = LumiSearch.norm(q).split(' ').filter(t => t.length > 1); const L = qq.length ? I.docs.filter(d => qq.every(t => d.key.includes(t))) : [];
    el.innerHTML = L.length ? `<a class="cos-hint" href="#/cosmetics/all/${encodeURIComponent(q)}">🧴 <b>${L.length}</b> cosmetic${L.length > 1 ? 's' : ''} match "${esc(q)}" ›</a>` : ''; }).catch(() => {});
  const done = (k, list, err) => { if (rs !== my) return; my.src[k] = err ? 'err' : 'ok'; if (list) { my.counts[k] = list.length; mergeItems(list); } renderResults(); };
  const runLocal = () => { if (rs !== my) return; const seen = new Set(), r = [];
    for (const d of engine.search(q, { limit: 160 }).concat(engine.search(q, { limit: 30, filter: d => d.src === 'rest' }), engine.search(q, { limit: 30, filter: d => d.src === 'whole' }))) if (!seen.has(d.code)) { seen.add(d.code); r.push(itemFromDoc(d)); } for (const id of (my.lids || [])) my.items.delete(id); for (const it of r) my.items.delete(it.id); my.lids = r.map(it => it.id); my.keyIdx = null; done('local', r); /* v18: drop the previous local pass's rows so a later shard's better representative can't be blocked as a duplicate */
    const d = $('#dym'); if (d) { const sug = didYouMean(q); d.innerHTML = (sug ? `<div class="dym">Did you mean <a href="#/search/${encodeURIComponent(sug)}">${esc(sug)}</a>?</div>` : '') + (my.worldOn ? `<div class="dym">🌍 Including international products (Open Food Facts, country shown).</div>` : `<div class="dym"><button class="linkbtn" id="worldBtn">🌍 Also search 2 million+ international products</button></div>`); const wb = $('#worldBtn'); if (wb) wb.onclick = () => { my.worldOn = true; wb.textContent = 'Loading international products…'; loadIndexW().then(runLocal).catch(runLocal); }; } };
  tierHook18 = () => { if (rs !== my) { tierHook18 = null; return; } clearTimeout(my.tt); my.tt = setTimeout(runLocal, 250); }; /* v18: refresh results as each shard arrives */
  loadIndex().then(() => { runLocal(); return loadIndexFull(); }).then(() => { runLocal(); return loadIndexAll(); }).then(() => { runLocal(); return loadIndexX(); }).then(() => { runLocal(); if (rs === my && (wantWorld() || my.worldOn || (my.counts.local || 0) < 12)) { my.worldOn = true; return loadIndexW().then(() => { runLocal(); if (rs === my && (my.counts.local || 0) < 12) return loadIndexW2().then(() => runLocal()); }); } }).catch(e => { if (!engine.docs.length) done('local', null, e); else runLocal(); });
  const cf = customFoods().filter(c => textRel(q, c.name, c.brand) >= 50).map(c => itemFromProduct(c, textRel(q, c.name, c.brand) + 30)); if (cf.length) mergeItems(cf);
  // remote sources: wait until typing pauses
  clearTimeout(runQuery.t); runQuery.t = setTimeout(() => { if (rs !== my) return;
    usdaSearch(q).then(ps => done('usda', ps.map(p => itemFromProduct(p, textRel(q, p.name, p.brand) - 6 + LumiSearch.relAdj(q, p) - (/^usda\b/i.test(p.brand || '') && /\b(soda|yogurt|cereal|bread|chips|cheese|milk|crackers?|cookies?|bars?)\b/.test(q) ? 20 : 0))))).catch(e => done('usda', null, e));
    // v12: skip the live Open Food Facts search when the local index already answers well (many hits, or a restaurant chain query): fewer blocked/rate-limited requests and less console noise
    loadIndex().catch(() => {}).then(() => { if (rs !== my) return; const nq12 = ' ' + LumiSearch.norm(q) + ' ', chainQ = (engine.chainN || []).some(c => nq12.includes(' ' + c.n + ' '));
      if (chainQ || (my.counts.local || 0) >= 60) { done('off', []); return; }
      offSearch(q).then(ps => done('off', ps.map(p => itemFromProduct(p, textRel(q, p.name, p.brand) - 3 + LumiSearch.relAdj(q, p))))).catch(e => done('off', null, e)); }); }, typing ? 700 : 0);
  renderResults();
}
let browseWait = false;
function viewBrowse(key) {
  if (!browseWait && (!C.CATS[key] || key === 'rest' || /^rest-/.test(key)) && C.subs('rest').length < 10) { browseWait = true; return loadIndex().catch(() => {}).then(() => { browseWait = false; if (location.hash.replace(/^#\/browse\//, '') === key) viewBrowse(key); }); } // v9.1.1: chains register from index-g; wait so the chain list is complete
  if (!C.CATS[key]) return viewHome();
  const [emo, label, , , parent] = C.CATS[key]; const top = parent || key; const ki = C.KEYS.indexOf(key);
  document.title = `${label} — Lumi`;
  resultsShell(label, '');
  app.insertAdjacentHTML('afterbegin', `<h1>${C.CATS[top][0]} ${esc(parent ? C.CATS[top][1] + ' · ' + label : label)}</h1><div class="chips subchips"><a class="chip${key === top ? ' on' : ''}" href="#/browse/${top}">All</a>${C.subs(top).map(k => `<a class="chip${k === key ? ' on' : ''}" href="#/browse/${k}">${esc(C.CATS[k][1])}</a>`).join('')}</div>`);
  const my = rs = { q: label, items: new Map(), src: { local: 'load' }, counts: {}, limit: 40, f18: '' };
  { const h1 = app.querySelector('.subchips'); if (h1) h1.insertAdjacentHTML('afterend', `<div class="bf18" role="search"><label for="bf18" class="sr-only">Search in ${esc(label)}</label><input id="bf18" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search in ${esc(label)}…"><span class="small" id="bf18n" aria-live="polite"></span></div>`); }
  const chain13 = /^rest-/.test(key); // v13: chain pages list mains before condiments/sodas (same ranking as a chain-name search)
  if (chain13 && store.get('sort', 'rel') !== 'rel') { store.set('sort', 'rel'); document.querySelectorAll('#sort button').forEach(b => b.classList.toggle('on', b.dataset.s === 'rel')); }
  else if (!chain13 && store.get('sort', 'rel') === 'rel') { store.set('sort', 'score'); document.querySelectorAll('#sort button').forEach(b => b.classList.toggle('on', b.dataset.s === 'score')); }
  const run = () => { if (rs !== my) return; my.items.clear(); const ds = engine.browse(ki); let lo = Infinity, hi = -Infinity; if (chain13) ds.forEach(d => { lo = Math.min(lo, d.rank); hi = Math.max(hi, d.rank); });
    const ft = LumiSearch.norm(my.f18 || '').split(' ').filter(Boolean); const ds2 = ft.length ? ds.filter(d => { const t = ' ' + LumiSearch.norm((d.name || '') + ' ' + (d.brand || '')) + ' '; return ft.every(w => t.includes(' ' + w) || t.includes(w)); }) : ds; const bn = $('#bf18n'); if (bn) bn.textContent = ft.length ? `${ds2.length} match${ds2.length === 1 ? '' : 'es'}` : '';
    const r = ds2.map(d => { const it = itemFromDoc(d); if (chain13) it.rel = 100 + LumiSearch.restRole(d, '') + 12 * (1 - (d.rank - lo) / Math.max(1, hi - lo)) + (d.net != null ? Math.min(6, d.net / 8) : 0); return it; }); my.src.local = 'ok'; my.counts.local = r.length; mergeItems(r); renderResults(); };
  { const bi = $('#bf18'); if (bi) { let t; bi.oninput = () => { clearTimeout(t); t = setTimeout(() => { my.f18 = bi.value; my.limit = 40; run(); }, 150); }; } }
  loadIndex().then(run).then(loadIndexFull).then(run).catch(() => { my.src.local = 'err'; renderResults(); });
  renderResults();
  if ((key === 'rest' || chain13) && typeof restPicks13 === 'function') restPicks13(key); // v13 restaurant meal picks
}

/* ---------------- product ---------------- */
async function resolveProduct(id) { const mem8 = () => store.get('foods', {})[id] || null; if (!navigator.onLine && mem8()) return mem8(); let p; try { p = await resolveProduct0(id); } catch (e) { const m = mem8(); if (m) return m; throw e; } if (!p) p = mem8(); if (p && p.name) p.name = LumiSearch.fixName(p.name); if (p && p.brand && window.LumiStores) { const a = LumiStores.alias(p.brand); if (a) p.brand = a; } return p; }
async function resolveProduct0(id) {
  if (/^(fdc-|r-|ms-|cnf-|wfm-)/.test(id)) { const g = await genericProduct(id); if (g) return g; }
  if (memo.has(id)) return memo.get(id);
  const sv = saved().find(s => s.p.id === id); if (sv) return sv.p;
  if (/^c-/.test(id)) { const c = customFoods().find(x => x.id === id); if (c) return c; }
  const mem = store.get('foods', {})[id];
  if (/^(fdc-|r-|ms-|cnf-|wfm-)/.test(id)) { const g = await genericProduct(id); if (g) return g; if (mem) return mem; if (/^fdc-\d+$/.test(id)) return usdaFood(id.slice(4)); return null; }
  if (mem && !/^\d+$/.test(id)) return mem;
  const loc = await localProduct(id);
  if (loc) return loc;
  let off = null, offErr = null;
  try { off = await offProduct(id); } catch (e) { offErr = e; }
  if (off && (off.n.carbs != null || off.n.sugars != null)) return off;
  try { const u = await usdaByGtin(id); if (u) return u; } catch {}
  if (off) return off; if (offErr) throw offErr; return null;
}
function ring(s) { const R = 56, c = 2 * Math.PI * R, off = c * (1 - (s.score ?? 0) / 100); const b = s.band;
  return `<div class="ring c-${b}"><svg viewBox="0 0 132 132" width="132" height="132"><circle cx="66" cy="66" r="${R}" fill="none" stroke="currentColor" stroke-opacity=".14" stroke-width="12"/><circle class="fg" cx="66" cy="66" r="${R}" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${off}"/></svg><div class="v"><div><b>${s.score ?? '?'}</b><small>/ 100</small></div></div></div>`; }
const IC = {
  carbs: '<path d="M12 21V8M12 8c-2-1-3-3-3-5 2 0 3 1.5 3 3M12 8c2-1 3-3 3-5-2 0-3 1.5-3 3M12 13c-2-1-3.5-2.5-3.5-4.5 2 0 3.5 1.5 3.5 3M12 13c2-1 3.5-2.5 3.5-4.5-2 0-3.5 1.5-3.5 3M12 18c-2-1-3.5-2.5-3.5-4.5 2 0 3.5 1.5 3.5 3M12 18c2-1 3.5-2.5 3.5-4.5-2 0-3.5 1.5-3.5 3"/>',
  sugar: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5 12 12l8-4.5M12 12v9"/>',
  fast: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
  fat: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  salt: '<path d="M8 9h8l-1 12H9L8 9zM9 9V6a3 3 0 0 1 6 0v3M11 4.5h.01M13 5.5h.01M12 14h.01M10.5 17h.01M13.5 17h.01"/>',
  kcal: '<path d="M12 22c4 0 7-2.5 7-7 0-3-2-5.5-3.5-7-.5 2-1.5 3-3 3.5C13 8 12 5 9 2c0 4-4 6.5-4 13 0 4.5 3 7 7 7z"/>',
  additives: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9"/>',
  processed: '<path d="M3 21V10l5 3V10l5 3V10l5 3V4h3v17H3zM7 17h2M12 17h2M17 17h2"/>',
  fiber: '<path d="M5 21c0-9 6-15 15-16-1 9-7 15-16 16zM5 21l8-8"/>',
  protein: '<path d="M3 12c3-4 7-5 10-5 3 0 6 2 8 5-2 3-5 5-8 5-3 0-7-1-10-5zM3 12l-1-3M3 12l-1 3M16 11h.01"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const LV = ['ex', 'gd', 'pr', 'bd'];
function lvl(v, t) { return v <= t[0] ? 0 : v <= t[1] ? 1 : v <= t[2] ? 2 : 3; }
function factRows(p, s) {
  const n = p.n, liq = p.liquid, out = [], u = liq ? 'ml' : 'g';
  const push = (key, ic, title, l, desc, val) => out.push({ key, ic, title, l, desc: desc[l], val });
  if (s.net != null) push('net', 'carbs', 'Carbs', lvl(s.net, liq ? [2, 5, 8] : [5, 15, 30]), ['Low carbs', 'Moderate carbs', 'High carbs', 'Very high carbs'], `${r1(s.net)}g${s.perServ ? ` <small>· ${r1(s.perServ.net)}g/serv</small>` : ''}`);
  if (n.sugars != null) push('sugar', 'sugar', 'Sugar', lvl(n.sugars, liq ? [1, 2.5, 6] : [1, 5, 12.5]), ['No sugar', 'Low sugar', 'Too much sugar', 'Way too much sugar'], `${r1(n.sugars)}g`);
  const gi = s.items.find(i => i.key === 'gi');
  if (gi) out.push({ key: 'gi', ic: 'fast', title: 'Fast-acting carbs', l: gi.pts <= -10 ? 3 : 2, desc: 'Syrups or refined starch', val: '' });
  if (n.sat != null) push('sat', 'fat', 'Saturated fat', lvl(n.sat, [1, 2, 5]), ['Low saturated fat', 'Some saturated fat', 'Too much saturated fat', 'Way too much saturated fat'], `${r1(n.sat)}g`);
  if (n.sodiumMg != null) push('sodium', 'salt', 'Sodium', lvl(n.sodiumMg, [120, 400, 800]), ['Low sodium', 'Some sodium', 'Too salty', 'Way too salty'], `${Math.round(n.sodiumMg)}mg`);
  if (n.kcal != null) push('kcal', 'kcal', 'Calories', lvl(n.kcal, liq ? [14, 35, 70] : [160, 360, 560]), ['Low calorie', 'Moderate calories', 'A bit too caloric', 'Too caloric'], `${Math.round(n.kcal)} Cal`);
  const ad = (p.additives || []).filter(a => S.ADDITIVES[a]);
  if (ad.length) out.push({ key: 'add', ic: 'additives', title: 'Additives', l: 3, desc: 'Contains additives to avoid', val: String(ad.length) });
  else if (p.src !== 'usda' && p.ing) out.push({ key: 'add', ic: 'additives', title: 'Additives', l: 0, desc: 'No risky additives', val: '0' });
  if (p.nova === 4) out.push({ key: 'nova', ic: 'processed', title: 'Ultra-processed', l: 2, desc: 'NOVA group 4', val: '' });
  if (n.fiber != null && !s.netNote.includes('implausible')) { const l = n.fiber >= 6 ? 0 : n.fiber >= 3 ? 1 : null; if (l != null) push('fiber', 'fiber', 'Fiber', l, ['High fiber', 'Some fiber'], `${r1(n.fiber)}g`); }
  if (n.protein != null) { const l = n.protein >= 8 ? 0 : n.protein >= 4 ? 1 : null; if (l != null) push('protein', 'protein', 'Protein', l, ['Excellent amount of protein', 'Some protein'], `${r1(n.protein)}g`); }
  return { neg: out.filter(r => r.l >= 2), pos: out.filter(r => r.l <= 1), unit: u };
}
const factLi = r => `<li class="fx"><span class="fx-i">${icon(r.ic)}</span><span class="fx-t"><b>${esc(r.title)}</b><small>${esc(r.desc)}</small></span><span class="fx-v">${r.val}</span><span class="fx-d bg-${LV[r.l]}"></span></li>`;
function ratingLines(s, hr, hp) {
  const C1 = { v: s.score, b: s.band, l: s.label, n: 'Carb score' }, H1 = { v: hr.score, b: HB(hr.score), l: hr.score == null ? 'Not rated' : HL(hr.score), n: 'Health rating' };
  const [a, b] = hp ? [H1, C1] : [C1, H1];
  return `<div class="sline"><span class="sdot bg-${a.b}"></span><div><b>${a.v ?? '?'}<span>/100</span></b><div class="slab">${esc(a.l)} <small>· ${a.n}</small></div></div></div>
    <div class="sline2"><span class="b2 lg"><i class="bg-${b.b}"></i>${b.n} <b>${b.v ?? '?'}</b>/100 · ${esc(b.l)}</span></div>
    ${hr.score != null && hr.basis === 'nutrition' ? '<div class="hnote">Health rating based on nutrition only</div>' : ''}`;
}
const HIC = { kcal: 'kcal', sug: 'sugar', sat: 'fat', salt: 'salt', fib: 'fiber', pro: 'protein', fvl: 'fiber', add: 'additives', org: 'fiber' };
function healthCard(hr, unit) {
  if (hr.score == null) return `<div class="card fxcard" id="hcard"><div class="fx-h"><h2>Health rating <span class="pill bg-na">?</span></h2></div><div class="small">${esc(hr.reason || 'Not enough data')}.</div></div>`;
  const li = r => `<li class="fx"><span class="fx-i">${icon(HIC[r.k] || 'fiber')}</span><span class="fx-t"><b>${esc(r.title)}</b><small>${esc(r.desc)}</small>${r.list ? `<span class="alist">${r.list.map(a => `<a class="ai" href="#/additive/${esc(a.e)}"><i class="adot bg-${['ex', 'gd', 'pr', 'bd'][a.tier]}"></i>${esc(a.name)} <small>· ${esc(a.risk)} ›</small></a>`).join('')}</span>` : ''}</span><span class="fx-v">${esc(r.val)}</span><span class="fx-d bg-${LV[r.l]}"></span></li>`;
  const basis = hr.basis === 'nutrition' ? 'Based on nutrition only — ingredients/additives not available.' : `Nutrition ${hr.nutrition}/100 (60%) · additives ${hr.additiveScore}/100 (30%) · organic ${hr.organic ? 'yes' : 'no'} (10%)${hr.adds.some(a => a.tier === 3) ? ' · capped at 49 by a high-risk additive' : ''}.`;
  return `<div class="card fxcard" id="hcard"><div class="fx-h"><h2>Health rating <span class="pill bg-${HB(hr.score)}">${hr.score}</span> <small class="c-${HB(hr.score)}">${HL(hr.score)}</small></h2><span class="small">${hr.servLabel && hr.servKind !== 'per100' ? (hr.servKind === 'item' ? esc(hr.servLabel === '1 item' ? 'per item' : 'per ' + hr.servLabel) : 'per serving (' + esc(hr.servLabel) + ')') : 'per 100' + unit}</span></div>
    <div class="small" style="margin:-4px 0 6px">${esc(basis)} Nutri-Score ${hr.grade}${hr.variant !== 'general' ? ' (' + hr.variant + ')' : ''}.${hr.est.length ? ' Estimated: ' + esc(hr.est.join(', ')) + '.' : ''}</div>
    ${(() => { const ng = hr.neg.filter(r => r.k !== 'add'), ps = hr.pos.filter(r => r.k !== 'add'); return (ng.length ? `<div class="fx-h"><h2>Negatives</h2></div><ul class="fxl">${ng.map(li).join('')}</ul>` : '') + (ps.length ? `<div class="fx-h"><h2>Positives</h2></div><ul class="fxl">${ps.map(li).join('')}</ul>` : ''); })()}</div>`;
}
async function viewProduct(id) {
  app.innerHTML = `<div class="loading-dog">${MASCOT(56, 'bounce')}<span>Sniffing out the label…</span></div><div class="card"><div class="ph"><div class="thumb big sk"></div><div style="flex:1"><div class="sk skl" style="height:22px;width:85%"></div><div class="sk skl" style="width:50%"></div><div class="sk skl" style="width:40%;height:26px;margin-top:14px"></div></div></div></div><div class="card">${'<div class="sk skl" style="height:40px;margin:10px 0"></div>'.repeat(4)}</div>`;
  let p;
  try { p = await resolveProduct(id); } catch (e) {
    if (/^\d{8,14}$/.test(id)) { const cp = await cosProduct(id).catch(() => null); if (cp) { const sc = sessionStorage.getItem('lumi.scanned') === id; if (sc) sessionStorage.removeItem('lumi.scanned'); return viewCosProduct(id, cp, sc); } }
    app.innerHTML = `<div class="card empty"><b>Couldn't load this product</b>The food databases didn't answer (${esc(e.message)}). Check your connection and retry.<div class="actions"><button class="btn pri" onclick="route()">Retry</button><a class="btn" href="#/">Home</a></div></div>`; return;
  }
  if (location.hash.replace(/^#\/product\//, '') !== id && !location.hash.endsWith(encodeURIComponent(id))) return;
  if (!p && /^\d{8,14}$/.test(id)) { const cp = await cosProduct(id).catch(() => null); if (cp) { const sc = sessionStorage.getItem('lumi.scanned') === id; if (sc) sessionStorage.removeItem('lumi.scanned'); return viewCosProduct(id, cp, sc); } }
  if (!p) { app.innerHTML = `${searchBox()}<div class="card empty" style="margin-top:14px"><b>Barcode ${esc(id)} not found</b>It isn't in Lumi's index, Open Food Facts, USDA or Open Beauty Facts. Try searching by name, or <a style="color:var(--acc)" href="https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${esc(id)}" target="_blank" rel="noopener">add it to Open Food Facts</a>.<div class="actions"><a class="btn pri" href="#/label/${esc(id)}">📷 Scan its Nutrition Facts label</a></div></div>`; bindSearch(); return; }
  memo.set(p.id, p); pushHist('viewed', p);
  const scanned = sessionStorage.getItem('lumi.scanned') === id; if (scanned) { sessionStorage.removeItem('lumi.scanned'); pushHist('scans', p, 50); }
  const s = S.score(p), n = p.n, unit = p.liquid ? 'ml' : 'g'; const hr = HR(p), hp = PRIM() === 'health';
  const doc = p.code ? engine.byCode(p.code) : null; const keys = doc ? doc.keys : C.match(p.cats || '');
  document.title = `${p.name} — ${s.score ?? '?'}/100 · Lumi`;
  const ps = p.servQ ? p.servQ / 100 : null;
  const fmt = (v, u = 'g') => v == null ? '<span class="small">—</span>' : u === 'mg' ? Math.round(v) + ' mg' : u === 'kcal' ? Math.round(v) : r1(v) + ' g';
  const row = (lab, v, u, key) => `<tr class="${key ? 'key' : ''}"><td>${lab}</td><td>${fmt(v, u)}</td>${ps ? `<td>${fmt(v == null ? null : v * ps, u)}</td>` : ''}</tr>`;
  const maxAbs = Math.max(10, ...s.items.map(i => Math.abs(i.pts)));
  const srcLink = p.meta && p.meta.url ? `<a style="color:var(--acc)" href="${esc(p.meta.url)}" target="_blank" rel="noopener">${esc(p.meta.src)}</a>${p.meta.date ? ', ' + esc(p.meta.date) : ''}` : p.src === 'custom' ? 'your custom food' : p.src === 'usda' ? `<a style="color:var(--acc)" href="https://fdc.nal.usda.gov/food-details/${p.fdcId}/nutrients" target="_blank" rel="noopener">USDA FoodData Central</a>` : `<a style="color:var(--acc)" href="https://world.openfoodfacts.org/product/${esc(p.code)}" target="_blank" rel="noopener">Open Food Facts</a>`;
  const F = s.missing ? null : factRows75(p, s, hr);
  const issues = s.quality && s.quality.issues.length ? s.quality.issues : null;
  app.classList.add('prodv');
  app.innerHTML = `
  <div class="card">
    <div class="ph">${thumb(p.img, p.name, keys, p.cat, true, p.brand)}
      <div class="ph-t"><h1>${esc(p.name)}</h1><div class="b">${esc(p.brand)}${p.qty ? ' · ' + esc(p.qty) : ''}</div>${p.hx && Array.isArray(p.hx.w) ? `<div class="srcline">🌍 International product · listed in ${esc(p.hx.w.join(', ') || 'another country')} on Open Food Facts. The label where you buy it may differ, check the package.</div>` : ''}${p.hx && p.hx.s ? '' : p.meta ? `<div class="srcline">Source: ${esc(p.meta.src)}${p.meta.date ? ', ' + esc(p.meta.date) : ''}</div>` : ''}
        ${ratingLines(s, hr, hp)}</div></div>
    ${sourceLine(p)}
    ${alertBanner(p, s.net)}
    ${mascotReact(hp ? hr.score : s.score)}
    ${issues ? `<div class="note"><b>⚠ Data looks wrong — not scored:</b> ${esc(issues.join('; '))}. The label data in the database doesn't add up, so Lumi won't give it a score. Check the package.</div>` : s.missing ? `<div class="note">No carbohydrate data — Lumi won't guess. Check the package.</div>` : (s.missingFields.length ? `<div class="note">Missing: ${esc(s.missingFields.join(', '))} (treated as zero).</div>` : '')}
    ${s.netNote && s.netNote.includes('implausible') ? `<div class="note">${esc(s.netNote)}.</div>` : ''}
    ${scanned && n.carbs != null ? `<div class="scanned"><span>✓ Scanned</span><button class="btn pri" id="quickLog">＋ Add to log</button></div>` : ''}
    <div class="actions"><button class="btn pri" id="share">↗ Share</button><button class="btn" id="save">${isSaved(p.id) ? '♥ Saved' : '♡ Save'}</button><button class="btn" id="cmp">${cmpIds().includes(p.id) ? '✓ Comparing' : '⇆ Compare'}</button><button class="btn" id="addList">☰ Add to list</button><button class="btn" id="copyLink" title="Copy a link to this product">🔗 Copy link</button></div>
  </div>
  <div id="better"></div>
  ${hp ? healthCard(hr, unit) : ''}
  ${F ? factCard75(p, F, hp) : ''}
  ${hp ? '' : healthCard(hr, unit)}
  ${n.carbs != null && !s.bad ? portionCard(p) : ''}
  <div id="swapsCard"></div>
  ${n.carbs != null ? `<div class="card"><h2>Nutrition</h2><table><tr><th></th><th>per 100${unit}</th>${ps ? `<th>per serving<br>${esc(p.serv || p.servQ + unit)}</th>` : ''}</tr>
    ${row('Total carbohydrate', n.carbs, 'g', 1)}${row(n.added === 0 && n.sugars > 0 ? 'Total sugars (all natural)' : 'Total sugars', n.sugars)}${n.added != null ? row('Added sugars', n.added) : `<tr><td>Added sugars</td><td colspan="2" class="small">not declared${p.ing && /\b(sugar|syrup|honey|dextrose|cane)\b/i.test(p.ing) ? ' (ingredients list a sugar)' : ''}</td></tr>`}${row('Fiber', n.fiber)}${n.polyols ? row('Polyols', n.polyols) : ''}${row('Protein', n.protein)}${row('Fat', n.fat)}${row('Saturated fat', n.sat)}${n.trans != null ? row('Trans fat', n.trans) : ''}${row('Sodium', n.sodiumMg, 'mg')}${row('Energy (kcal)', n.kcal, 'kcal')}</table>
    <div class="small" style="margin-top:8px">${esc(s.netNote)}.${p.nova ? ' NOVA ' + p.nova + '.' : ''}</div></div>` : ''}
  ${s.missing ? '' : `<details class="card"><summary><h2 style="display:inline">How the ${s.score} is calculated</h2></summary><ul class="bd" style="margin-top:8px"><li><span class="l"><b>Starting score</b></span><span class="v">100</span></li>
    ${s.items.map(i => `<li><span class="l">${esc(i.label)}${i.detail ? `<small>${esc(i.detail)}</small>` : ''}</span><span class="bar-s"><i class="${i.pts < 0 ? 'bg-bd' : 'bg-ex'}" style="width:${Math.round(Math.abs(i.pts) / maxAbs * 100)}%"></i></span><span class="v ${i.pts < 0 ? 'neg' : 'pos'}">${i.pts > 0 ? '+' : ''}${i.pts}</span></li>`).join('')}
    <li><span class="l"><b>Final</b> <small>clamped to 0–100</small></span><span class="v">${s.score}</span></li></ul>
    ${s.assumedServing ? `<div class="small" style="margin-top:6px">No serving size on file — per-serving term assumes ${p.liquid ? '240 ml' : '50 g'}.</div>` : ''}</details>`}
  ${n.carbs != null ? dataCheckCard(p, s) : ''}
  ${altCard(p)}
  ${p.ing ? `<div class="card"><h2>Ingredients</h2><div class="ing">${esc(p.ing)}</div></div>` : ''}
  <p class="foot">${p.hx && p.hx.s ? '' : 'Source: ' + srcLink + '. '} Informational only — not medical advice. Dose from the physical label.</p>`;
  fillCredits();
  $('#share').onclick = () => share(p, s);
  $('#save').onclick = () => { const on = toggleSave(p); $('#save').textContent = on ? '♥ Saved' : '♡ Save'; toast(on ? 'Saved — available offline' : 'Removed'); };
  if (p.code && p.src !== 'off') offProduct(p.code).then(o => { if (o && o.img && (!p.img || !/\.400\.jpg$/.test(p.img))) { p.img = o.img; const el = document.querySelector('.ph .thumb'); if (el) el.outerHTML = thumb(o.img, p.name, keys, p.cat, true); } }).catch(() => {});
  if (n.carbs != null && !s.bad) bindPortion(p);
  $('#cmp').onclick = () => { const on = toggleCompare(p); $('#cmp').textContent = on ? '✓ Comparing' : '⇆ Compare'; toast(on ? (cmpIds().length >= 2 ? 'Added — tap Compare at the bottom' : 'Added — pick one more to compare') : 'Removed from compare'); };
  if ($('#quickLog')) $('#quickLog').onclick = () => $('#addLog').click();
  if (!s.missing) renderSwaps(p, s);
  drawBetter(p, s, hr);
  bindProduct7(p); bind75(p, s, hr, hp); bind8(p, s); bind9(p, s);
}
function orTryWater(doc, limit = 4) {
  if (doc.ai !== LumiAisles.BYID['bv-soda']) return [];
  const WW = [LumiAisles.BYID['bv-water'], LumiAisles.BYID['bv-sparkling']], sp = /\b(sparkling|seltzer|bubly|la ?croix|spindrift|pellegrino|perrier|topo chico|polar)\b/i;
  return LumiSearch.dedupe(engine.docs.filter(d => WW.includes(d.ai) && d.score != null && sp.test(d.name + ' ' + d.brand)).sort((a, b) => (b.img ? 1 : 0) - (a.img ? 1 : 0) || a.rank - b.rank), x => x, limit);
}
function swapsFor(doc, cur, limit = 6) {
  const leaf = (doc.keys || []).slice(-1)[0]; if (leaf == null || cur.score == null || ['whole', 'rest'].includes(C.KEYS[leaf])) return [];
  const out = [];
  const SODA = LumiAisles.BYID['bv-soda'], soda = doc.ai === SODA;
  for (const d of engine.docs) {
    if (!d.keys.includes(leaf) || d.code === doc.code || d.score == null || d.net == null || d.fl || d.bad || d.zc) continue;
    if (soda && d.ai !== SODA) continue; // a soda's swaps are sodas; sparkling water is offered separately
    const gain = d.score - cur.score, red = (cur.net ?? d.net) - d.net;
    if (gain < 5 || red < -2 || (cur.net >= 10 && d.net < cur.net * 0.35)) continue;
    out.push({ d, gain, red, sug: cur.sugar != null && d.sugar != null ? cur.sugar - d.sugar : 0, rank: gain + 0.6 * red - Math.min(d.rank, engine.docs.length) / engine.docs.length * 5 });
  }
  out.sort((a, b) => Math.abs(a.d.score - b.d.score) <= 5 ? (a.d.net - b.d.net) || b.rank - a.rank : b.rank - a.rank); // within ~5 points, fewer carbs wins
  return LumiSearch.dedupe(out, x => x.d, limit)
    .map(x => Object.assign({}, x.d, { reason: [x.red >= 1 ? `−${Math.round(x.red)}g carbs` : '', x.sug >= 3 ? 'less sugar' : '', `+${x.gain} pts`].filter(Boolean).join(', ') }));
}
async function renderSwaps(p, s) {
  try { await loadIndex(); } catch { return; }
  const draw = () => {
    const el = $('#swapsCard'); if (!el) return;
    const doc = engine.byCode(p.code || p.id) || { code: p.code || p.id, name: p.name, keys: C.match(p.cats || '') };
    const sw = swapsFor(doc, { score: s.score, net: s.net, sugar: p.n.sugars });
    const leaf = (doc.keys || []).slice(-1)[0];
    el.innerHTML = sw.length ? `<div class="card"><h2>Better swaps</h2><div class="small" style="margin:-6px 0 8px">Same category${leaf != null ? ': ' + esc(C.CATS[C.KEYS[leaf]][1]) : ''} · per 100${p.liquid ? 'ml' : 'g'}</div><div class="swaps">${sw.map(d => `<a class="swap" href="#/product/${esc(d.code)}">${thumb(d.img, d.name, d.keys, d.cat, false, d.brand)}<div class="n">${esc(d.name)}</div><div class="s"><span>${esc((d.brand || '').slice(0, 14))}</span><span class="pills">${pills(d)}</span></div><div class="why">${esc(d.reason)}</div></a>`).join('')}</div>${orTry(doc)}</div>` : orTry(doc) ? `<div class="card">${orTry(doc)}</div>` : '';
  };
  const orTry = doc => { const w = orTryWater(doc); return w.length ? `<h3 class="ortry">Or try sparkling water</h3><div class="swaps" id="orTry">${w.map(d => `<a class="swap" href="#/product/${esc(d.code)}">${thumb(d.img, d.name, d.keys, d.cat, false, d.brand)}<div class="n">${esc(d.name)}</div><div class="s"><span>${esc((d.brand || '').slice(0, 14))}</span><span class="pills">${pills(d)}</span></div><div class="why">0 g sugar, no sweetener needed</div></a>`).join('')}</div>` : ''; };
  draw(); loadIndexFull().then(draw).catch(() => {});
}
async function share(p, s) {
  const url = location.origin + location.pathname + '#/product/' + encodeURIComponent(p.id);
  const text = `${p.name}${p.brand ? ' (' + p.brand + ')' : ''} scores ${s.score ?? '?'}/100 on Lumi — ${r1(s.perServ ? s.perServ.net : s.net)}g carbs ${s.perServ ? 'per serving' : 'per 100g'}.`;
  if (navigator.share) { try { await navigator.share({ title: 'Lumi: ' + p.name, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy this link:', url); }
}
function viewSaved() {
  const sv = saved(); document.title = 'Saved — Lumi';
  const sc = histItems('scans'), vw = histItems('viewed');
  app.innerHTML = `<h1>Saved</h1><p class="lead">Stored on this device and available offline. <a class="lnk" href="#/lists">☰ Shopping lists ›</a> <a class="lnk" href="#/overview">📊 Overview ›</a></p>
  <div class="seg wide" id="svTab"><button data-t="saved" class="on">♥ Saved</button><button data-t="scans">Scans</button><button data-t="viewed">Viewed</button></div><div id="svList"></div>`;
  const draw = t => { const L = t === 'saved' ? sv.map(x => itemFromProduct(x.p)) : t === 'scans' ? sc : vw;
    $('#svList').innerHTML = L.length ? `<div class="list">${L.map(rowHTML).join('')}</div>${t !== 'saved' ? `<button class="more" id="hClr">Clear ${t === 'scans' ? 'scan' : 'view'} history</button>` : ''}` : `<div class="card empty">${MASCOT(96, 'big')}<b>${t === 'saved' ? 'Nothing saved yet' : t === 'scans' ? 'No scans yet' : 'Nothing viewed yet'}</b>${t === 'saved' ? 'Tap ♡ Save on any product.' : t === 'scans' ? 'Tap Scan below, point at a barcode, then add it to your log in one tap.' : 'Products you open show up here.'}</div>`;
    if ($('#hClr')) $('#hClr').onclick = () => { store.set(t, []); viewSaved(); }; };
  document.querySelectorAll('#svTab button').forEach(b => b.onclick = () => { document.querySelectorAll('#svTab button').forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.t); });
  draw('saved');
}
function viewAbout() {
  document.title = 'About — Lumi';
  app.innerHTML = `<div class="about-hero">${MASCOT(120, 'big')}<div><h1>About Lumi</h1><p class="small">Lumi is named after, and drawn from, Joe's white husky.</p></div></div><p class="lead">A carb-first food score, tuned for insulin dosing decisions. v${VERSION}</p>
  <div class="card" id="howRated"><h2>How this is rated</h2><p>Every item gets <b>two ratings</b>. Choose which one is primary in Settings.</p><ul class="bul"><li><b>Carb score (0–100)</b>: Lumi's diabetes score. Sugar is the main driver (added sugar counts more than natural sugar), then total carbs, refined starch and fast-acting carbs. Fiber is only a small bonus and is never subtracted from carbs (formula below).</li><li><b>Health rating (0–100)</b>: a general rating modelled on Yuka's published method. About <b>60% nutrition</b> (the Nutri-Score 2023 algorithm, using energy, sugars, saturated fat, salt, fiber, protein and fruit/vegetable/legume share; beverages, fats/nuts and cheese use their own variants). About <b>30% additives</b> (curated risk tiers; any high-risk additive caps the rating at 49). About <b>10% organic</b>. When ingredients aren't known, as with most restaurant items and whole foods, the rating uses nutrition only and is marked that way.</li><li>Bands: <span class="c-ex">Excellent 75–100</span> · <span class="c-gd">Good 50–74</span> · <span class="c-pr">Poor 25–49</span> · <span class="c-bd">Bad 0–24</span>. Missing values are estimated and flagged. You see <b>?</b> only when the numbers can't be used.</li></ul><p class="small">Lumi isn't affiliated with Yuka. Informational only, not medical advice.</p></div>
  <div class="card"><h2>Formula</h2><pre>score = clamp(0, 100, 100 + Σ terms)

SUGAR (primary driver)
 Added sugars /100g       −1.0 × g   (max −36)
 Natural sugars /100g     −0.55 × g  (max −22; e.g. fruit, lactose)
   added vs natural unknown: total sugars −0.7 × g (max −26),
   or −0.9 × g (max −34) if the ingredients list a sugar/syrup
 Sugar /serving           −0.6 × g   (max −14)
 Liquid sugar (drinks)    extra penalty for sugary drinks
TOTAL CARBS (secondary)
 Total carbs /100g        −0.4 × g   (max −22)
 Total carbs /serving     −0.4 × g   (max −16; assumes 50 g or 240 ml if unknown)
 Fast carbs (syrups, maltodextrin, refined starch)  max −14
 Refined starch (white rice/bread, pasta, crackers, fries;
   starch = carbs − sugar − fiber, ≥10 g/100)  −0.4 × g (max −20)
   plus per serving −0.2 × g (max −8)
SMALL BONUSES
 Fiber /100g              +0.4 × g   (max +4; never subtracted from carbs)
 Protein                  small bonus (max +5, limited by the carb penalty)
SECONDARY
 Saturated fat /100g      −0.8 × g   (max −8)
 Trans fat                −8 × g (max −8) or −6 if partially hydrogenated oil
 Sodium                   −1 per 100 mg/100g (max −8)
 NOVA 4 −8 · NOVA 3 −3
 Additives of concern     −2 each (max −8)

Bands: 75+ Excellent · 50–74 Good · 25–49 Poor · &lt;25 Bad</pre>
  <h2 style="margin-top:14px">Carbs</h2><p class="small">Lumi always uses <b>total carbohydrate</b> as labeled. It does not use “carbs”: fiber and sugar alcohols are not subtracted. Fiber only earns a small bonus in the score.</p>
  <h2>Data sources</h2><p class="small"><a class="lnk" href="#/credits">All sources, licenses and image credits ›</a></p><p class="small">1) Lumi's bundled index: 633k US products (255k from Open Food Facts plus 378k from USDA Branded Foods, April 2026 release; lazy-loaded in tiers) from the Open Food Facts bulk export, pre-scored and searchable offline-fast with typo tolerance. 2) USDA FoodData Central (Branded + generic foods) via the public demo key. 3) Live Open Food Facts search across country mirrors. Results are merged and de-duplicated by barcode. 4) Whole foods: USDA Foundation, SR Legacy and FNDDS. 5) Restaurants: official nutrition published by Chick-fil-A, Subway, Arby's, Dunkin', Five Guys, Culver's, Shake Shack, Sonic, Jack in the Box, Qdoba, Whataburger, Jimmy John's, Little Caesars, Carl's Jr., Tropical Smoothie Cafe, Buffalo Wild Wings, The Cheesecake Factory, Waffle House, Portillo's, Dutch Bros, Taco John's, Cheddar's Scratch Kitchen, Pollo Tropical and Cinnabon (fetched once, cached, robots.txt respected; preferred over USDA), plus USDA SR Legacy restaurant items for other chains. 6) USDA Branded Foods: about 378k extra US barcoded products (photos where Open Food Facts has one). Chains that block automated access were skipped. A free FatSecret or Nutritionix key could add many more chains and branded restaurant items, but Lumi does not use one. Product links: <code>#/product/&lt;barcode&gt;</code> or <code>#/product/fdc-&lt;USDA id&gt;</code>.</p>
  <h2>Limits</h2><p class="small">Crowd-sourced and label data can be wrong or stale. There is no measured GI/GL; ingredients are used as proxies. Fat/protein-heavy meals (delayed rises) are only reflected via saturated fat. USDA's demo key is rate-limited per device.</p>
  <div class="note"><b>Informational only — not medical advice.</b> Always dose from the physical label and your own CGM data.</div></div>
  <div class="card small">Data © Open Food Facts contributors (ODbL) and USDA FoodData Central (public domain).</div>`;
}

/* ---------------- scanner ---------------- */
let scanner = null, scanLib = null;
function loadScanLib() { if (!scanLib) scanLib = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'; s.onload = res; s.onerror = () => { scanLib = null; rej(new Error('Scanner library failed to load')); }; document.head.appendChild(s); }); return scanLib; }
async function startScan() {
  if (!window.isSecureContext || !navigator.mediaDevices) return typeBarcode('The camera needs a secure (HTTPS) page.');
  const ov = $('#scanner'); ov.hidden = false;
  try {
    await loadScanLib();
    const F = Html5QrcodeSupportedFormats;
    scanner = new Html5Qrcode('reader', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E], useBarCodeDetectorIfSupported: true, verbose: false });
    await scanner.start({ facingMode: 'environment' }, { fps: 15, qrbox: (w, h) => ({ width: Math.floor(Math.min(320, w * 0.85)), height: Math.floor(Math.min(180, h * 0.4)) }), aspectRatio: 1.333 },
      async txt => { const c = txt.replace(/\D/g, ''); if (c.length < 8) return; if (navigator.vibrate) navigator.vibrate(50); await stopScan(); sessionStorage.setItem('lumi.scanned', c); go('#/product/' + c); }, () => {});
  } catch (e) { await stopScan(); typeBarcode(/Permission|NotAllowed/i.test(e && (e.name || e.message || e)) ? 'Camera permission was denied. You can allow it in your browser settings, or type the number under the barcode.' : 'No camera is available here. Type the number under the barcode instead.'); }
}
async function stopScan() { const ov = $('#scanner'); if (scanner) { try { await scanner.stop(); } catch {} try { scanner.clear(); } catch {} scanner = null; } ov.hidden = true; $('#reader').innerHTML = ''; }
document.querySelectorAll('[data-scan]').forEach(b => b.onclick = startScan); $('#scanClose').onclick = stopScan;

/* ---------------- theme ---------------- */
$('#theme').onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nx; store.set('theme', nx); try { localStorage.setItem('lumi.theme', nx); } catch {} };

/* ---------------- router ---------------- */
function route() {
  if (scanner) stopScan();
  rs = null; window.scrollTo(0, 0); document.title = 'Lumi — food scanner';
  if (typeof closeSheet === 'function' && !document.querySelector('.onb')) closeSheet(); app.classList.remove('enter', 'prodv'); void app.offsetWidth; app.classList.add('enter'); setTimeout(drawCmpTray, 0);
  const h = location.hash.replace(/^#\/?/, ''); const i = h.indexOf('/'); const view = i < 0 ? h : h.slice(0, i); const arg = i < 0 ? '' : decodeURIComponent(h.slice(i + 1));
  { const tv = (typeof tab19 === 'function') ? tab19(view, arg) : view; document.querySelectorAll('.tabbar a').forEach(a => { const on = a.dataset.v === tv; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  if (view === 'product' && /^recipe(:|%3A)/i.test(arg || '')) return viewRecipe12(decodeURIComponent(arg).slice(7));
  if (view === 'product' && arg) return viewProduct(/^\d+$/.test(arg.replace(/\s/g, '')) ? arg.replace(/\s/g, '') : arg);
  if (view === 'search' && arg) return viewSearch(arg);
  if (view === 'browse' && arg) return viewBrowse(arg);
  if (view === 'browse') return viewBrowseHub();
  if (view === 'saved' || view === 'favorites') return viewSaved();
  if (view === 'about') return viewAbout();
  if (view === 'credits') return viewCredits();
  if (view === 'store' && arg) return viewStore(arg);
  if (view === 'aisle' && arg) return viewAisle(arg);
  if (view === 'log') return viewLog(arg);
  if (view === 'settings') return viewSettings();
  if (view === 'custom') return viewCustom(arg ? decodeURIComponent(arg) : null);
  if (view === 'compare') return viewCompare();
  if (view === 'meal') return viewMeal();
  if (view === 'additive' && arg) return viewAdditive(arg);
  if (view === 'ingredient' && arg) return viewIngredient(arg);
  if (view === 'additives') return viewAdditives(arg);
  if (view === 'cosmetics') return viewCosmetics(arg);
  if (view === 'cos' && arg) return viewCosProduct(arg);
  if (view === 'overview') return viewOverview(arg);
  if (view === 'lists') return viewLists();
  if (view === 'list' && arg) return viewList(arg);
  if (view === 'whatsnew') return viewWhatsNew();
  if (view === 'label') return viewLabel(arg);
  if (view === 'alerts') return viewAlerts();
  if (view === 'meals') return viewMeals9();
  if (view === 'history') return viewHistory11();
  if (view === 'applehealth') return viewHealth11();
  if (view === 'glucose') return viewGlucose11(arg);
  if (view === 'share') return viewShare11(h.slice(i + 1 || h.length));
  if (view === 'report') return viewReport(arg);
  if (view === 'ideas') return viewIdeas13(arg);
  if (view === 'plan') return arg === 'grocery' ? viewGrocery13() : viewPlan13();
  if (view === 'recipes') return viewRecipes12();
  if (view === 'recipe' && arg) return viewRecipe12(arg);
  if (view === 'dexcom') { history.replaceState(null, '', '#/glucose'); return viewGlucose11(); } // v16: Dexcom login removed
  const V15 = { quick: 'viewQuick15', fresh: 'viewFresh15', review: 'viewReview15', prices: 'viewPrices15', today: 'viewToday16', insights: 'viewToday16', myfoods: 'viewMyFoods17', patterns: 'viewPatterns18', search: 'viewSearch19' }; // v15 (js/v15.js loads after this file)
  if (V15[view]) { if (typeof window[V15[view]] === 'function') return window[V15[view]](arg); app.innerHTML = skel(3); return; }
  viewHome();
}
window.addEventListener('hashchange', route);
route();
setTimeout(() => onboarding(false), 400);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // first install: nothing stale to replace
    if (sessionStorage.getItem('lumi.reloaded') === VERSION) return; // loop guard
    sessionStorage.setItem('lumi.reloaded', VERSION); location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
}
