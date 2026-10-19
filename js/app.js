'use strict';
const VERSION = '2.0.0';
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = v => v == null ? '—' : String(Math.round(v * 10) / 10);
const S = window.LumiScore;
const OFF_FIELDS = 'code,product_name,product_name_en,generic_name,brands,image_front_small_url,image_front_url,image_small_url,nutriments,serving_size,serving_quantity,nova_group,additives_tags,ingredients_text,ingredients_text_en,categories_tags,countries_tags,quantity';
const USDA_KEY = 'DEMO_KEY'; // api.data.gov demo key: per-IP limits (~30 req/hour, 50/day). Responses are cached locally.
const MIRRORS = ['world', 'us', 'ca', 'uk', 'fr'];
const memo = new Map(); // id -> normalized product

/* ---------------- storage ---------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('lumi.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lumi.' + k, JSON.stringify(v)); } catch {} },
};
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
let tier0 = null, tier1 = null; const tierWaiters = [];
function loadIndex() {
  if (!tier0) tier0 = fetch('data/index-0.json').then(r => r.json()).then(d => { engine.add(d); notifyTier(); });
  return tier0;
}
function loadIndexFull() {
  if (!tier1) tier1 = loadIndex().then(() => fetch('data/index-1.json')).then(r => r.json()).then(d => { engine.add(d); notifyTier(); });
  return tier1;
}
function notifyTier() { tierWaiters.forEach(f => f()); }
const shardCache = new Map();
function shard(code) { const k = code.slice(-2); if (!shardCache.has(k)) shardCache.set(k, fetch(`data/d/${k}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}))); return shardCache.get(k); }
const codeVariants = c => { c = String(c).replace(/\D/g, ''); const s = c.replace(/^0+/, ''); return [...new Set([c, s, s.padStart(12, '0'), s.padStart(13, '0'), s.padStart(8, '0')])].filter(x => x.length >= 8); };
const gtinKey = c => c ? String(c).replace(/\D/g, '').replace(/^0+/, '') : '';
async function localProduct(code) {
  for (const v of codeVariants(code)) { const sh = await shard(v); if (sh[v]) return S.fromCompact(sh[v]); }
  return null;
}

/* ---------------- remote sources ---------------- */
async function usdaSearch(q) {
  const v = await cached('usda:' + q.toLowerCase(), 864e5, () => getJSON(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(q)}&pageSize=40&dataType=Branded,Foundation,SR%20Legacy`, 12000)
    .then(j => (j.foods || []).map(f => ({ fdcId: f.fdcId, description: f.description, dataType: f.dataType, gtinUpc: f.gtinUpc, brandName: f.brandName, brandOwner: f.brandOwner, ingredients: (f.ingredients || '').slice(0, 600), servingSize: f.servingSize, servingSizeUnit: f.servingSizeUnit, householdServingFullText: f.householdServingFullText, brandedFoodCategory: f.brandedFoodCategory, foodCategory: f.foodCategory, packageWeight: f.packageWeight,
      foodNutrients: (f.foodNutrients || []).filter(n => ['205', '269', '539', '291', '203', '204', '606', '605', '307', '208', '299'].includes(String(n.nutrientNumber))).map(n => ({ nutrientNumber: n.nutrientNumber, value: n.value })) }))));
  return v.map(S.fromUSDA);
}
async function offSearch(q) {
  const enc = encodeURIComponent(q);
  const v = await cached('off:' + q.toLowerCase(), 6 * 36e5, () => Promise.any(MIRRORS.map((cc, i) => new Promise(r => setTimeout(r, i * 700)).then(() =>
    getJSON(`https://${cc}.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=30&fields=${OFF_FIELDS}`, 9000)).then(j => { if (!Array.isArray(j.products)) throw new Error('bad'); return j.products; }))));
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
function itemFromProduct(p, rel) { const s = S.score(p); memo.set(p.id, p); return { id: p.id, code: p.code, name: p.name, brand: p.brand, score: s.score, net: s.net, img: p.img, src: p.src, cat: p.cat, rel }; }
function itemFromDoc(d) { return { id: d.code, code: d.code, name: d.name, brand: d.brand, score: d.score, net: d.net, img: d.img, src: 'local', cat: d.cat, rel: d.rel }; }
function textRel(q, name, brand) {
  const qt = LumiSearch.toks(q), nt = new Set(LumiSearch.toks(name + ' ' + brand)); if (!qt.length) return 0;
  let hit = 0; for (const t of qt) if (nt.has(t) || [...nt].some(x => x.startsWith(t) || (t.length > 4 && LumiSearch.dl(t, x, 1) <= 1))) hit++;
  return (hit / qt.length) * 100 * (hit / qt.length) + (LumiSearch.norm(name).includes(LumiSearch.norm(q)) ? 25 : 0);
}

/* ---------------- UI atoms ---------------- */
const BAND = s => S.band(s);
function mini(score) { const b = BAND(score), c = 2 * Math.PI * 20, off = c * (1 - (score ?? 0) / 100);
  return `<div class="mini c-${b}"><svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="5"/><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg><b>${score ?? '?'}</b></div>`; }
function thumb(img, name) { return `<div class="thumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${img ? '' : esc((name || '?').trim()[0] || '?').toUpperCase()}</div>`; }
const SRC = { local: '', off: '<span class="tag">OFF</span>', usda: '<span class="tag">USDA</span>' };
function rowHTML(it) { return `<a class="row" href="#/product/${esc(it.id)}">${thumb(it.img, it.name)}<div class="t"><div class="n">${esc(it.name)}</div><div class="b">${SRC[it.src] || ''}${esc(it.brand || '')}${it.net != null ? ` · ${r1(it.net)}g net carbs/100` : ''}</div></div>${mini(it.score)}</a>`; }
const skel = n => `<div class="list">${Array.from({ length: n }, () => `<div class="row skel"><div class="thumb sk"></div><div class="t"><div class="sk skl" style="width:80%"></div><div class="sk skl" style="width:45%"></div></div><div class="sk" style="width:44px;height:44px;border-radius:50%"></div></div>`).join('')}</div>`;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
const go = h => { if (location.hash !== h) location.hash = h; else route(); };
const ICON_SEARCH = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

const CHIPS = [
  ['🍿', 'Snacks', /snack|chips|crisps|crackers|popcorn|pretzel|puffs/i], ['🥣', 'Cereal', /cereal|granola|muesli|oat/i], ['🥤', 'Drinks', /beverage|drink|soda|juice|water|tea|coffee|lemonade/i],
  ['🥛', 'Yogurt', /yogurt|yoghurt|skyr|kefir/i], ['🥫', 'Sauces', /sauce|dressing|condiment|ketchup|salsa|mayonnaise|syrup|spread/i], ['🍫', 'Bars', /\bbars?\b/i],
  ['🍞', 'Bread', /bread|tortilla|wrap|bagel|bun/i], ['🧀', 'Dairy', /cheese|milk|butter|cream/i], ['🍪', 'Sweets', /cookie|candy|candies|chocolate|dessert|ice cream|biscuit/i], ['🥜', 'Nuts', /nut|seed|almond|peanut/i]];

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
      sg.innerHTML = `<a href="#/search/${encodeURIComponent(v)}"><span>${ICON_SEARCH}</span><span class="k">Search “${esc(v)}”</span></a>` + res.map(d => `<a href="#/product/${esc(d.code)}"><span class="pill bg-${BAND(d.score)}">${d.score}</span><span class="k">${esc(d.name)} <small>${esc(d.brand)}</small></span></a>`).join('');
      sg.classList.toggle('on', document.activeElement === q);
    });
  };
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(show, 90); });
  q.addEventListener('focus', show); q.addEventListener('blur', () => setTimeout(close, 180));
  q.addEventListener('keydown', e => { const a = [...sg.querySelectorAll('a')]; if (!a.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + a.length) % a.length; a.forEach((x, i) => x.classList.toggle('act', i === act)); }
    else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); location.hash = a[act].getAttribute('href'); close(); } else if (e.key === 'Escape') close(); });
  clr.onclick = () => { q.value = ''; q.focus(); show(); };
  f.onsubmit = e => { e.preventDefault(); const v = q.value.trim(); if (!v) return; close(); q.blur(); if (/^\d{8,14}$/.test(v)) go('#/product/' + v); else go('#/search/' + encodeURIComponent(v)); };
}

/* ---------------- views ---------------- */
function viewHome() {
  const rec = store.get('recent', []), sv = saved();
  app.innerHTML = `<h1>What are you eating?</h1><p class="lead">Carb-first scores for 70,000+ US products, plus USDA & Open Food Facts live.</p>
  ${searchBox()}
  <div class="chips">${CHIPS.map(([e, n]) => `<a class="chip" href="#/browse/${n.toLowerCase()}">${e} ${n}</a>`).join('')}</div>
  <button class="hero-scan" id="heroScan"><div class="ic"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg></div><div><b>Scan a barcode</b><span>Instant score from the package</span></div></button>
  <form class="bc" id="bform"><input id="bc" inputmode="numeric" pattern="[0-9]*" placeholder="…or type a barcode" aria-label="Barcode"><button>Look up</button></form>
  ${rec.length ? `<div class="sec-h"><h2>Recent searches</h2><button id="clrRec">Clear</button></div><div class="chips" style="margin-top:0">${rec.map(r => `<a class="chip" href="#/search/${encodeURIComponent(r)}">🕘 ${esc(r)}</a>`).join('')}</div>` : ''}
  ${sv.length ? `<div class="sec-h"><h2>Saved</h2><a href="#/saved">See all</a></div><div class="list">${sv.slice(0, 3).map(x => rowHTML(itemFromProduct(x.p))).join('')}</div>` : ''}
  <div class="sec-h"><h2>Top-scoring picks</h2></div><div id="picks">${skel(3)}</div>
  <p class="foot">Informational only — not medical advice.</p>`;
  bindSearch();
  $('#heroScan').onclick = startScan;
  $('#bform').onsubmit = e => { e.preventDefault(); const c = $('#bc').value.replace(/\D/g, ''); if (c.length >= 8) go('#/product/' + c); else toast('Enter an 8–14 digit barcode'); };
  if ($('#clrRec')) $('#clrRec').onclick = () => { store.set('recent', []); viewHome(); };
  loadIndex().then(() => { const el = $('#picks'); if (!el) return; const p = engine.docs.slice(0, 400).filter(d => d.score >= 85 && d.img).slice(0, 5); el.innerHTML = `<div class="list">${p.map(d => rowHTML(itemFromDoc(d))).join('')}</div>`; })
    .catch(() => { const el = $('#picks'); if (el) el.innerHTML = ''; });
  setTimeout(() => loadIndexFull().catch(() => {}), 1500);
}

let rs = null; // current result state
function resultsShell(title, q) {
  app.innerHTML = `${searchBox(q)}
  <div class="tools"><div class="seg" id="sort"><button data-s="rel">Relevance</button><button data-s="score">Best score</button><button data-s="carb">Low carb</button></div>
  <button class="chip tog" id="fGood">Good+</button><button class="chip tog" id="fLow">≤10g carbs</button></div>
  <div class="status" id="status"></div><div id="res">${skel(6)}</div>`;
  bindSearch();
  const sortSel = store.get('sort', 'rel');
  document.querySelectorAll('#sort button').forEach(b => { b.classList.toggle('on', b.dataset.s === sortSel); b.onclick = () => { store.set('sort', b.dataset.s); document.querySelectorAll('#sort button').forEach(x => x.classList.toggle('on', x === b)); renderResults(); }; });
  const fl = store.get('filters', {});
  [['fGood', 'good'], ['fLow', 'low']].forEach(([id, k]) => { const b = $('#' + id); b.classList.toggle('on', !!fl[k]); b.onclick = () => { const f = store.get('filters', {}); f[k] = !f[k]; store.set('filters', f); b.classList.toggle('on', f[k]); renderResults(); }; });
}
function renderResults() {
  if (!rs) return; const el = $('#res'); if (!el) return;
  const st = rs.src, lab = { local: 'Lumi index', usda: 'USDA', off: 'Open Food Facts' };
  $('#status').innerHTML = Object.keys(st).map(k => `<i><span class="dot ${st[k]}"></span>${lab[k]}${st[k] === 'ok' ? ` ${rs.counts[k] || 0}` : ''}</i>`).join('');
  let items = [...rs.items.values()]; const f = store.get('filters', {}), sort = store.get('sort', 'rel');
  if (f.good) items = items.filter(i => i.score >= 50); if (f.low) items = items.filter(i => i.net != null && i.net <= 10);
  items = items.filter(i => i.score != null);
  if (sort === 'score') items.sort((a, b) => b.score - a.score || b.rel - a.rel);
  else if (sort === 'carb') items.sort((a, b) => (a.net ?? 999) - (b.net ?? 999) || b.score - a.score);
  else items.sort((a, b) => b.rel - a.rel);
  const pending = Object.values(st).includes('load');
  if (!items.length) {
    if (pending) { el.innerHTML = skel(4); return; }
    const anyFiltered = rs.items.size > 0;
    el.innerHTML = `<div class="empty"><b>${anyFiltered ? 'No matches with these filters' : 'Nothing found'}</b>${anyFiltered ? 'Try turning off a filter.' : 'Check the spelling, try fewer words or a brand name — or scan the barcode.'}</div>`; return;
  }
  const lim = rs.limit || 40;
  el.innerHTML = `<div class="list">${items.slice(0, lim).map(rowHTML).join('')}</div>${items.length > lim ? `<button class="more" id="more">Show more (${items.length - lim})</button>` : ''}${pending ? `<div class="small" style="text-align:center;margin-top:10px">Still checking other sources…</div>` : ''}`;
  if ($('#more')) $('#more').onclick = () => { rs.limit = lim + 40; renderResults(); };
}
function mergeItems(list) {
  for (const it of list) {
    const g = gtinKey(it.code), nk = LumiSearch.norm(it.name + '|' + it.brand);
    let dup = null; for (const x of rs.items.values()) { if ((g && gtinKey(x.code) === g) || LumiSearch.norm(x.name + '|' + x.brand) === nk) { dup = x; break; } }
    if (dup) { if (!dup.img && it.img) dup.img = it.img; continue; }
    rs.items.set(it.id, it);
  }
}
function viewSearch(q) {
  addRecent(q); document.title = `${q} — Lumi`;
  resultsShell('', q);
  const my = rs = { q, items: new Map(), src: { local: 'load', usda: 'load', off: 'load' }, counts: {} };
  const done = (k, list, err) => { if (rs !== my) return; my.src[k] = err ? 'err' : 'ok'; if (list) { my.counts[k] = list.length; mergeItems(list); } renderResults(); };
  const runLocal = () => { const r = engine.search(q, { limit: 120 }).map(itemFromDoc); for (const it of r) my.items.delete(it.id); done('local', r); };
  loadIndex().then(() => { runLocal(); return loadIndexFull(); }).then(() => runLocal()).catch(e => { if (!engine.docs.length) done('local', null, e); });
  usdaSearch(q).then(ps => done('usda', ps.map(p => itemFromProduct(p, textRel(q, p.name, p.brand) - 6)))).catch(e => done('usda', null, e));
  offSearch(q).then(ps => done('off', ps.map(p => itemFromProduct(p, textRel(q, p.name, p.brand) - 3)))).catch(e => done('off', null, e));
  renderResults();
}
function viewBrowse(name) {
  const chip = CHIPS.find(c => c[1].toLowerCase() === name); if (!chip) return viewHome();
  document.title = `${chip[1]} — Lumi`;
  resultsShell(chip[1], '');
  app.insertAdjacentHTML('afterbegin', `<h1>${chip[0]} ${chip[1]}</h1>`);
  const my = rs = { q: chip[1], items: new Map(), src: { local: 'load' }, counts: {}, limit: 40 };
  if (store.get('sort', 'rel') === 'rel') { store.set('sort', 'score'); document.querySelectorAll('#sort button').forEach(b => b.classList.toggle('on', b.dataset.s === 'score')); }
  const run = () => { if (rs !== my) return; my.items.clear(); const r = engine.browse(chip[2], 400).map(itemFromDoc); my.src.local = 'ok'; my.counts.local = r.length; mergeItems(r); renderResults(); };
  loadIndex().then(run).then(loadIndexFull).then(run).catch(() => { my.src.local = 'err'; renderResults(); });
  renderResults();
}

/* ---------------- product ---------------- */
async function resolveProduct(id) {
  if (memo.has(id)) return memo.get(id);
  const sv = saved().find(s => s.p.id === id); if (sv) return sv.p;
  if (/^fdc-\d+$/.test(id)) return usdaFood(id.slice(4));
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
async function viewProduct(id) {
  app.innerHTML = `<div class="card"><div class="p-head"><div class="p-img sk"></div><div style="flex:1"><div class="sk skl" style="height:20px;width:85%"></div><div class="sk skl" style="width:50%"></div></div></div><div class="scorecard"><div class="sk" style="width:132px;height:132px;border-radius:50%"></div><div style="flex:1"><div class="sk skl" style="width:60%;height:20px"></div><div class="sk skl" style="width:90%"></div></div></div></div>${skel(2)}`;
  let p;
  try { p = await resolveProduct(id); } catch (e) {
    app.innerHTML = `<div class="card empty"><b>Couldn't load this product</b>The food databases didn't answer (${esc(e.message)}). Check your connection and retry.<div class="actions"><button class="btn pri" onclick="route()">Retry</button><a class="btn" href="#/">Home</a></div></div>`; return;
  }
  if (location.hash.replace(/^#\/product\//, '') !== id && !location.hash.endsWith(encodeURIComponent(id))) return;
  if (!p) { app.innerHTML = `${searchBox()}<div class="card empty" style="margin-top:14px"><b>Barcode ${esc(id)} not found</b>It isn't in Lumi's index, Open Food Facts or USDA. Try searching by name, or <a style="color:var(--acc)" href="https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${esc(id)}" target="_blank" rel="noopener">add it to Open Food Facts</a>.</div>`; bindSearch(); return; }
  memo.set(p.id, p);
  const s = S.score(p), n = p.n, unit = p.liquid ? 'ml' : 'g';
  document.title = `${p.name} — ${s.score ?? '?'}/100 · Lumi`;
  const ps = p.servQ ? p.servQ / 100 : null;
  const fmt = (v, u = 'g') => v == null ? '<span class="small">—</span>' : u === 'mg' ? Math.round(v) + ' mg' : u === 'kcal' ? Math.round(v) : r1(v) + ' g';
  const row = (lab, v, u, key) => `<tr class="${key ? 'key' : ''}"><td>${lab}</td><td>${fmt(v, u)}</td>${ps ? `<td>${fmt(v == null ? null : v * ps, u)}</td>` : ''}</tr>`;
  const maxAbs = Math.max(10, ...s.items.map(i => Math.abs(i.pts)));
  const srcLink = p.src === 'usda' ? `<a style="color:var(--acc)" href="https://fdc.nal.usda.gov/food-details/${p.fdcId}/nutrients" target="_blank" rel="noopener">USDA FoodData Central</a>` : `<a style="color:var(--acc)" href="https://world.openfoodfacts.org/product/${esc(p.code)}" target="_blank" rel="noopener">Open Food Facts</a>`;
  app.innerHTML = `
  <div class="card">
    <div class="p-head">${p.img ? `<img class="p-img" id="pimg" src="${esc(p.img)}" alt="" onerror="this.style.visibility='hidden'">` : `<div class="p-img thumb" id="pimg">${esc(p.name[0] || '?')}</div>`}
      <div style="min-width:0"><h1>${esc(p.name)}</h1><div class="b">${esc(p.brand)}${p.qty ? ' · ' + esc(p.qty) : ''}</div><div class="small">${p.code ? esc(p.code) : 'USDA #' + p.fdcId}${p.cat ? ' · ' + esc(p.cat) : ''}</div></div></div>
    <div class="scorecard">${ring(s)}<div><span class="band bg-${s.band}">${s.label}</span>
      <div class="small">${s.missing ? 'No carbohydrate or sugar data — can’t score.' : 'Carb-first score'}</div>
      ${s.net != null ? `<div style="margin-top:8px;font:800 22px var(--round)">${r1(s.perServ ? s.perServ.net : s.net)} g <span class="small" style="font:600 13px var(--font)">net carbs ${s.perServ ? 'per serving' : 'per 100' + unit}</span></div>` : ''}</div></div>
    ${!s.missing && s.missingFields.length ? `<div class="note">Missing on label data: ${esc(s.missingFields.join(', '))}. The score treats unknowns as zero.</div>` : ''}
    <div class="actions"><button class="btn pri" id="share">↗ Share</button><button class="btn" id="save">${isSaved(p.id) ? '♥ Saved' : '♡ Save'}</button></div>
  </div>
  ${s.missing ? '' : `<div class="card"><h2>Key numbers</h2><div class="facts" style="margin-bottom:12px">
    <div class="fact"><small>Net carbs /100${unit}</small><b>${r1(s.net)} g</b></div><div class="fact"><small>${ps ? 'Net carbs / serving' : 'Serving size'}</small><b>${ps ? r1(s.perServ.net) + ' g' : '—'}</b></div>
    <div class="fact"><small>Sugars /100${unit}</small><b>${r1(n.sugars)} g</b></div><div class="fact"><small>Fiber /100${unit}</small><b>${r1(n.fiber)} g</b></div></div>
    <table><tr><th></th><th>per 100${unit}</th>${ps ? `<th>per serving<br>${esc(p.serv || p.servQ + unit)}</th>` : ''}</tr>
    ${row('Total carbohydrate', n.carbs, 'g', 1)}${row('Net carbs', s.net, 'g', 1)}${row('Sugars', n.sugars)}${n.added != null ? row('Added sugars', n.added) : ''}${row('Fiber', n.fiber)}${n.polyols ? row('Polyols', n.polyols) : ''}${row('Protein', n.protein)}${row('Fat', n.fat)}${row('Saturated fat', n.sat)}${n.trans != null ? row('Trans fat', n.trans) : ''}${row('Sodium', n.sodiumMg, 'mg')}${row('Energy (kcal)', n.kcal, 'kcal')}</table>
    <div class="small" style="margin-top:8px">${esc(s.netNote)}.${p.nova ? ' NOVA ' + p.nova + '.' : ''}</div></div>
  <div class="card"><h2>Why ${s.score}?</h2><ul class="bd"><li><span class="l"><b>Starting score</b></span><span class="v">100</span></li>
    ${s.items.map(i => `<li><span class="l">${esc(i.label)}${i.detail ? `<small>${esc(i.detail)}</small>` : ''}</span><span class="bar-s"><i class="${i.pts < 0 ? 'bg-bd' : 'bg-ex'}" style="width:${Math.round(Math.abs(i.pts) / maxAbs * 100)}%"></i></span><span class="v ${i.pts < 0 ? 'neg' : 'pos'}">${i.pts > 0 ? '+' : ''}${i.pts}</span></li>`).join('')}
    <li><span class="l"><b>Final</b> <small>clamped to 0–100</small></span><span class="v">${s.score}</span></li></ul>
    ${s.assumedServing ? `<div class="small" style="margin-top:6px">No serving size on file — per-serving term assumes ${p.liquid ? '240 ml' : '50 g'}.</div>` : ''}<div class="small" style="margin-top:6px"><a style="color:var(--acc)" href="#/about">How scoring works</a></div></div>`}
  <div id="swapsCard"></div>
  ${p.ing ? `<div class="card"><h2>Ingredients</h2><div class="ing">${esc(p.ing)}</div></div>` : ''}
  <p class="foot">Source: ${srcLink}. Informational only — not medical advice. Dose from the physical label.</p>`;
  requestAnimationFrame(() => setTimeout(() => { const fg = document.querySelector('.ring .fg'); if (fg) fg.style.strokeDashoffset = fg.dataset.off; }, 30));
  $('#share').onclick = () => share(p, s);
  $('#save').onclick = () => { const on = toggleSave(p); $('#save').textContent = on ? '♥ Saved' : '♡ Save'; toast(on ? 'Saved — available offline' : 'Removed'); };
  if (!p.img && p.code && p.src !== 'off') offProduct(p.code).then(o => { if (o && o.img) { p.img = o.img; const el = $('#pimg'); if (el) el.outerHTML = `<img class="p-img" id="pimg" src="${esc(o.img)}" alt="">`; } }).catch(() => {});
  if (!s.missing) renderSwaps(p, s);
}
async function renderSwaps(p, s) {
  try { await loadIndex(); } catch { return; }
  const draw = () => {
    const el = $('#swapsCard'); if (!el) return;
    const doc = engine.byCode(p.code) || { code: p.code, name: p.name, cat: p.cat, score: s.score };
    if (!doc.cat && p.cat) doc.cat = p.cat;
    const sw = engine.similar(Object.assign({}, doc, { score: s.score }));
    el.innerHTML = sw.length ? `<div class="card"><h2>Better swaps</h2><div class="swaps">${sw.map(d => `<a class="swap" href="#/product/${esc(d.code)}">${thumb(d.img, d.name)}<div class="n">${esc(d.name)}</div><div class="s"><span>${esc((d.brand || '').slice(0, 14))}</span><span class="pill bg-${BAND(d.score)}">${d.score}</span></div></a>`).join('')}</div></div>`
      : (s.score >= 75 ? '' : '');
  };
  draw(); loadIndexFull().then(draw).catch(() => {});
}
async function share(p, s) {
  const url = location.origin + location.pathname + '#/product/' + encodeURIComponent(p.id);
  const text = `${p.name}${p.brand ? ' (' + p.brand + ')' : ''} scores ${s.score ?? '?'}/100 on Lumi — ${r1(s.perServ ? s.perServ.net : s.net)}g net carbs ${s.perServ ? 'per serving' : 'per 100g'}.`;
  if (navigator.share) { try { await navigator.share({ title: 'Lumi: ' + p.name, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy this link:', url); }
}
function viewSaved() {
  const sv = saved(); document.title = 'Saved — Lumi';
  app.innerHTML = `<h1>Saved</h1><p class="lead">Stored on this device and available offline.</p>${sv.length ? `<div class="list">${sv.map(x => rowHTML(itemFromProduct(x.p))).join('')}</div>` : `<div class="card empty"><b>Nothing saved yet</b>Tap ♡ Save on any product.</div>`}`;
}
function viewAbout() {
  document.title = 'About — Lumi';
  app.innerHTML = `<h1>About Lumi</h1><p class="lead">A carb-first food score, tuned for insulin dosing decisions. v${VERSION}</p>
  <div class="card"><h2>Formula</h2><pre>score = clamp(0, 100, 100 + Σ terms)

GLYCEMIC CORE
 Net carbs /100g          −0.6 × g   (max −30)
 Net carbs /serving       −0.6 × g   (max −25; assumes 50 g or 240 ml if unknown)
                          drinks: −0.9 × g (max −30)
 Total sugars /100g       −0.4 × g   (max −15)
 Added sugars /100g       −0.5 × g   (max −12)
   undeclared but sugar/syrup listed: −0.4 × sugars (max −8)
 Liquid sugar (drinks >2.5 g/100ml)  −3 × g  (max −30)
   ≥15 g sugar per drink serving      −10
 Mostly sugar (>50% of net carbs, solids)   −5
 Glycemic proxies: each syrup/maltodextrin/dextrose −6 (max −12),
   sugar/syrup first ingredient −5, refined starch −4 each (max −8);
   combined max −18
BUFFERS
 Fiber /100g              +1 × g     (max +10)
 Fiber ≥ 20% of carbs     +3
 Protein /100g            +0.3 × g   (max +6)
SECONDARY
 Saturated fat /100g      −0.8 × g   (max −8)
 Trans fat                −8 × g (max −8) or −6 if partially hydrogenated oil
 Sodium                   −1 per 100 mg/100g (max −8)
 NOVA 4 −8 · NOVA 3 −3
 Additives of concern     −2 each (max −8)

Bands: 75+ Excellent · 50–74 Good · 25–49 Poor · &lt;25 Bad</pre>
  <h2 style="margin-top:14px">Net carbs</h2><p class="small">US labels (and all USDA data) include fiber in total carbohydrate, so net = carbs − fiber. EU-style labels already exclude fiber. Declared polyols are subtracted (only half for maltitol).</p>
  <h2>Data sources</h2><p class="small">1) Lumi's bundled index: 70k popular US products from the Open Food Facts bulk export, pre-scored and searchable offline-fast with typo tolerance. 2) USDA FoodData Central (Branded + generic foods) via the public demo key. 3) Live Open Food Facts search across country mirrors. Results are merged and de-duplicated by barcode. Product links: <code>#/product/&lt;barcode&gt;</code> or <code>#/product/fdc-&lt;USDA id&gt;</code>.</p>
  <h2>Limits</h2><p class="small">Crowd-sourced and label data can be wrong or stale. There is no measured GI/GL; ingredients are used as proxies. Fat/protein-heavy meals (delayed rises) are only reflected via saturated fat. USDA's demo key is rate-limited per device.</p>
  <div class="note"><b>Informational only — not medical advice.</b> Always dose from the physical label and your own CGM data.</div></div>
  <div class="card small">Data © Open Food Facts contributors (ODbL) and USDA FoodData Central (public domain).</div>`;
}

/* ---------------- scanner ---------------- */
let scanner = null, scanLib = null;
function loadScanLib() { if (!scanLib) scanLib = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'; s.onload = res; s.onerror = () => { scanLib = null; rej(new Error('Scanner library failed to load')); }; document.head.appendChild(s); }); return scanLib; }
async function startScan() {
  if (!window.isSecureContext || !navigator.mediaDevices) return toast('Camera needs HTTPS');
  const ov = $('#scanner'); ov.hidden = false;
  try {
    await loadScanLib();
    const F = Html5QrcodeSupportedFormats;
    scanner = new Html5Qrcode('reader', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E], useBarCodeDetectorIfSupported: true, verbose: false });
    await scanner.start({ facingMode: 'environment' }, { fps: 15, qrbox: (w, h) => ({ width: Math.floor(Math.min(320, w * 0.85)), height: Math.floor(Math.min(180, h * 0.4)) }), aspectRatio: 1.333 },
      async txt => { const c = txt.replace(/\D/g, ''); if (c.length < 8) return; if (navigator.vibrate) navigator.vibrate(50); await stopScan(); go('#/product/' + c); }, () => {});
  } catch (e) { await stopScan(); toast(/Permission|NotAllowed/i.test(e && (e.name || e.message || e)) ? 'Camera permission denied' : 'Camera unavailable'); }
}
async function stopScan() { const ov = $('#scanner'); if (scanner) { try { await scanner.stop(); } catch {} try { scanner.clear(); } catch {} scanner = null; } ov.hidden = true; $('#reader').innerHTML = ''; }
$('#fab').onclick = startScan; $('#scanClose').onclick = stopScan;

/* ---------------- theme ---------------- */
$('#theme').onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nx; store.set('theme', nx); try { localStorage.setItem('lumi.theme', nx); } catch {} };

/* ---------------- router ---------------- */
function route() {
  if (scanner) stopScan();
  rs = null; window.scrollTo(0, 0); document.title = 'Lumi — food scanner';
  const h = location.hash.replace(/^#\/?/, ''); const i = h.indexOf('/'); const view = i < 0 ? h : h.slice(0, i); const arg = i < 0 ? '' : decodeURIComponent(h.slice(i + 1));
  $('#fab').hidden = view === 'about';
  if (view === 'product' && arg) return viewProduct(/^\d+$/.test(arg.replace(/\s/g, '')) ? arg.replace(/\s/g, '') : arg);
  if (view === 'search' && arg) return viewSearch(arg);
  if (view === 'browse' && arg) return viewBrowse(arg);
  if (view === 'saved' || view === 'favorites') return viewSaved();
  if (view === 'about') return viewAbout();
  viewHome();
}
window.addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
