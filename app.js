'use strict';
const $ = s => document.querySelector(s);
const app = $('#app');
const FIELDS = 'code,product_name,product_name_en,generic_name,brands,image_front_small_url,image_front_url,image_url,nutriments,serving_size,serving_quantity,nova_group,additives_tags,ingredients_text,ingredients_text_en,categories_tags,countries_tags,quantity,nutrition_data_per';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache = new Map();

/* ---------------- Data ---------------- */
async function getJSON(url, ms = 12000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function searchProducts(q) {
  const enc = encodeURIComponent(q);
  const tries = [
    async () => (await getJSON(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`)).products,
    async () => (await getJSON(`https://search.openfoodfacts.org/search?q=${enc}&page_size=24&fields=${FIELDS}`)).hits,
    // Optional same-origin proxy (serve.py) for when OFF endpoints lack CORS / are down
    async () => (await getJSON(`api/search?q=${enc}&fields=${FIELDS}`)).hits,
  ];
  let lastErr;
  for (const f of tries) { try { const r = await f(); if (Array.isArray(r)) { r.forEach(p => p.code && cache.set(p.code, p)); return r; } } catch (e) { lastErr = e; } }
  throw lastErr || new Error('Search failed');
}
async function getProduct(code) {
  const j = await getJSON(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (j.status !== 1 || !j.product) return null;
  j.product.code = j.product.code || code; cache.set(code, j.product); return j.product;
}

/* ---------------- Scoring ---------------- */
const SYRUPS = /(glucose[- ]?fructose|fructose[- ]?glucose|high[- ]fructose|corn syrup|glucose syrup|rice syrup|malt syrup|maltodextrin|dextrose|invert sugar|golden syrup|agave|isoglucose|sirop de glucose|glucosesirup|maltose|tapioca syrup|cane syrup|honey|molasses|brown rice syrup)/gi;
const SUGAR_WORDS = /\b(sugar|sucre|zucker|azúcar|azucar|cane sugar|sucrose)\b/i;
const STARCH = /(modified (corn |potato |tapioca )?starch|corn ?starch|potato starch|potato flakes|tapioca starch|rice flour|white rice|enriched (wheat )?flour|wheat flour|bleached flour|farine de blé|weizenmehl|cornmeal|degermed)/gi;
const WHOLE = /(whole ?grain|whole ?wheat|wholemeal|complet|vollkorn|rolled oats|oat flakes)/i;
const HYDRO = /(partially hydrogenated|hydrogenated)/i;
// Additives flagged by EFSA/IARC/consumer groups as concerning, plus sweeteners/emulsifiers with glycemic or gut-microbiome debate
const ADDITIVES = { 'e150c':'Ammonia caramel','e150d':'Sulphite ammonia caramel','e171':'Titanium dioxide','e250':'Sodium nitrite','e251':'Sodium nitrate','e252':'Potassium nitrate','e249':'Potassium nitrite','e102':'Tartrazine','e110':'Sunset yellow','e124':'Ponceau 4R','e129':'Allura red','e122':'Azorubine','e104':'Quinoline yellow','e951':'Aspartame','e950':'Acesulfame K','e955':'Sucralose','e954':'Saccharin','e320':'BHA','e321':'BHT','e319':'TBHQ','e433':'Polysorbate 80','e466':'Carboxymethylcellulose','e407':'Carrageenan','e338':'Phosphoric acid','e621':'MSG','e211':'Sodium benzoate','e220':'Sulphur dioxide','e1442':'Hydroxypropyl distarch phosphate' };

const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
const r1 = v => v == null ? '—' : (Math.round(v * 10) / 10).toString();

function nutrition(p) {
  const n = p.nutriments || {};
  const g = k => num(n[k + '_100g']);
  const countries = p.countries_tags || [];
  const naLabel = countries.length > 0 && countries.every(c => /united-states|canada|mexico/.test(c));
  const carbs = g('carbohydrates'), fiber = g('fiber'), polyols = g('polyols');
  let net = null, netNote = '';
  if (carbs != null) {
    // OFF stores label values. EU/UK labels exclude fiber from carbohydrate; US/CA labels include it.
    if (naLabel && fiber != null) { net = Math.max(0, carbs - fiber); netNote = 'US/CA label: net = carbs − fiber'; }
    else { net = carbs; netNote = naLabel ? 'US/CA label, fiber unknown: net = total carbs' : 'EU-style label: carbs already exclude fiber'; }
    if (polyols != null && polyols > 0) { net = Math.max(0, net - polyols); netNote += ' − polyols'; }
  }
  let sodium = g('sodium'); if (sodium == null && g('salt') != null) sodium = g('salt') / 2.5;
  const servQ = num(p.serving_quantity);
  const per100 = { carbs, net, sugars: g('sugars'), added: g('added-sugars'), fiber, protein: g('proteins'), fat: g('fat'), sat: g('saturated-fat'), trans: g('trans-fat'), sodiumMg: sodium != null ? sodium * 1000 : null, kcal: g('energy-kcal') ?? (g('energy') != null ? g('energy') / 4.184 : null) };
  const perServ = servQ ? Object.fromEntries(Object.entries(per100).map(([k, v]) => [k, v == null ? null : v * servQ / 100])) : null;
  const liquid = /(beverage|drink|soda|juice|milk|nectar|smoothie|boisson)/i.test((p.categories_tags || []).join(' ')) || /\bml\b|\bcl\b|\bl\b/i.test(p.serving_size || '') || /ml$/i.test(p.nutrition_data_per || '');
  return { per100, perServ, servQ, servLabel: p.serving_size, netNote, liquid };
}

function scoreProduct(p) {
  const N = nutrition(p), a = N.per100, items = [];
  if (a.carbs == null && a.sugars == null) return { score: null, band: 'NA', label: 'Insufficient data', items, N, missing: true };
  const ing = (p.ingredients_text_en || p.ingredients_text || '');
  const add = (label, pts, detail) => { if (Math.abs(pts) >= 0.5) items.push({ label, pts: Math.round(pts * 10) / 10, detail }); };
  const net = a.net ?? a.carbs ?? a.sugars;
  // 1. Net carbs density
  add('Net carbs / 100g', -Math.min(30, net * 0.6), `${r1(net)} g`);
  // 2. Net carbs per serving (bolus-relevant). If no serving size, assume 50 g/ml and flag.
  const sq = N.servQ || 50;
  const netServ = net * sq / 100;
  add(N.servQ ? 'Net carbs / serving' : 'Net carbs / assumed 50g serving', -Math.min(25, netServ * 0.6), `${r1(netServ)} g`);
  // 3. Sugars
  if (a.sugars != null) add('Total sugars / 100g', -Math.min(15, a.sugars * 0.4), `${r1(a.sugars)} g`);
  const sugarIng = SUGAR_WORDS.test(ing); const syrups = [...new Set((ing.match(SYRUPS) || []).map(s => s.toLowerCase()))];
  if (a.added != null) add('Added sugars / 100g', -Math.min(12, a.added * 0.5), `${r1(a.added)} g`);
  else if ((sugarIng || syrups.length) && a.sugars) add('Added sugar (from ingredients, est.)', -Math.min(8, a.sugars * 0.4), 'qty not declared');
  // 4. Liquid sugar = fast spike
  if (N.liquid && (a.sugars ?? 0) > 2.5) add('Liquid sugar (rapid absorption)', -Math.min(30, a.sugars * 3), `${r1(a.sugars)} g/100ml`);
  // 5. Glycemic-impact proxies from ingredients
  let gi = 0; const giHits = [];
  if (syrups.length) { gi += Math.min(12, syrups.length * 6); giHits.push(...syrups); }
  const firstIng = ing.split(/[,(]/)[0] || '';
  if (SUGAR_WORDS.test(firstIng) || new RegExp(SYRUPS.source, "i").test(firstIng)) { gi += 5; giHits.push('sugar is 1st ingredient'); }
  SYRUPS.lastIndex = 0;
  const starches = [...new Set((ing.match(STARCH) || []).map(s => s.toLowerCase()))].filter(s => !(WHOLE.test(ing) && /wheat flour/.test(s) && /whole/.test(ing.toLowerCase())));
  if (starches.length) { gi += Math.min(8, starches.length * 4); giHits.push(...starches); }
  if (gi) add('Glycemic proxies (syrups/refined starch)', -Math.min(18, gi), giHits.slice(0, 5).join(', '));
  // 6. Fiber (positive) — absolute and relative to carbs
  if (a.fiber != null) {
    add('Fiber / 100g', Math.min(10, a.fiber * 1.0), `${r1(a.fiber)} g`);
    if (a.carbs > 5 && a.fiber / a.carbs >= 0.2) add('Fiber:carb ratio ≥ 1:5', 3, `${Math.round(a.fiber / a.carbs * 100)}%`);
  }
  // 7. Protein (mild positive)
  if (a.protein != null) add('Protein / 100g', Math.min(6, a.protein * 0.3), `${r1(a.protein)} g`);
  // 8. Secondary penalties
  if (a.sat != null) add('Saturated fat / 100g', -Math.min(8, a.sat * 0.8), `${r1(a.sat)} g`);
  if ((a.trans ?? 0) > 0.05) add('Trans fat', -Math.min(8, a.trans * 8), `${r1(a.trans)} g`);
  else if (HYDRO.test(ing)) add('Hydrogenated oil in ingredients', -6, 'trans-fat source');
  if (a.sodiumMg != null) add('Sodium / 100g', -Math.min(8, a.sodiumMg / 100), `${Math.round(a.sodiumMg)} mg`);
  const nova = num(p.nova_group);
  if (nova === 4) add('Ultra-processed (NOVA 4)', -8, ''); else if (nova === 3) add('Processed (NOVA 3)', -3, '');
  const adds = (p.additives_tags || []).map(t => t.replace(/^en:/, '').split('-')[0]).filter((t, i, s) => ADDITIVES[t] && s.indexOf(t) === i);
  if (adds.length) add('Concerning additives', -Math.min(8, adds.length * 2), adds.map(t => `${t.toUpperCase()} ${ADDITIVES[t]}`).join(', '));
  const raw = 100 + items.reduce((s, i) => s + i.pts, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const band = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Poor' : 'Bad';
  items.sort((x, y) => x.pts - y.pts);
  const missing = ['fiber', 'sugars', 'sat', 'sodiumMg', 'protein'].filter(k => a[k] == null);
  return { score, band, label: band, items, N, adds, nova, missingFields: missing, assumedServing: !N.servQ };
}

/* ---------------- Favorites ---------------- */
const FKEY = 'lumi.favs';
const favs = () => { try { return JSON.parse(localStorage.getItem(FKEY)) || []; } catch { return []; } };
const isFav = c => favs().some(f => f.code === c);
function toggleFav(p, s) {
  let f = favs(); if (isFav(p.code)) f = f.filter(x => x.code !== p.code);
  else f.unshift({ code: p.code, name: pname(p), brand: p.brands || '', img: img(p), score: s.score, band: s.band });
  localStorage.setItem(FKEY, JSON.stringify(f.slice(0, 200)));
}

/* ---------------- UI helpers ---------------- */
const pname = p => p.product_name || p.product_name_en || p.generic_name || 'Unnamed product';
const img = p => p.image_front_small_url || p.image_front_url || p.image_url || '';
const thumb = u => u ? `<img class="thumb" src="${esc(u)}" alt="" loading="lazy">` : `<div class="thumb"></div>`;
const pill = s => `<span class="pill band-${s.band}">${s.score ?? '?'}</span>`;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2000); }
const go = h => { location.hash = h; };

function searchCard(q = '') {
  return `<div class="card">
  <form class="searchbar" id="sform"><input type="search" id="q" placeholder="Search product or brand…" value="${esc(q)}" autocomplete="off" enterkeyhint="search"><button>Search</button></form>
  <div class="row"><button type="button" id="scanBtn" class="sec">📷 Scan barcode</button>
  <form id="bform" class="searchbar" style="flex:1;min-width:200px"><input type="text" id="bc" inputmode="numeric" pattern="[0-9]*" placeholder="Barcode (EAN/UPC)"><button class="sec">Go</button></form></div>
  <div id="reader"></div></div>`;
}
function bindSearch() {
  $('#sform').onsubmit = e => { e.preventDefault(); const q = $('#q').value.trim(); if (!q) return; if (/^\d{8,14}$/.test(q)) go('#/product/' + q); else go('#/search/' + encodeURIComponent(q)); };
  $('#bform').onsubmit = e => { e.preventDefault(); const c = $('#bc').value.replace(/\D/g, ''); if (c.length >= 6) go('#/product/' + c); else toast('Enter a valid barcode'); };
  $('#scanBtn').onclick = startScan;
}

/* ---------------- Scanner ---------------- */
let scanner = null;
async function stopScan() { if (scanner) { try { await scanner.stop(); scanner.clear(); } catch {} scanner = null; } const r = $('#reader'); if (r) r.innerHTML = ''; }
async function startScan() {
  if (scanner) return stopScan();
  if (!window.isSecureContext) return toast('Camera needs HTTPS');
  if (!window.Html5Qrcode) return toast('Scanner library not loaded');
  const F = window.Html5QrcodeSupportedFormats;
  scanner = new Html5Qrcode('reader', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128], useBarCodeDetectorIfSupported: true, verbose: false });
  try {
    await scanner.start({ facingMode: 'environment' }, { fps: 12, qrbox: (w, h) => ({ width: Math.min(300, w * 0.85), height: 140 }) },
      async text => { const c = text.replace(/\D/g, ''); if (navigator.vibrate) navigator.vibrate(60); await stopScan(); go('#/product/' + c); }, () => {});
  } catch (e) { toast('Camera unavailable: ' + (e.message || e)); scanner = null; }
}

/* ---------------- Views ---------------- */
function viewHome() {
  const f = favs();
  app.innerHTML = searchCard() + `<div class="card"><h2>Quick picks</h2><div class="chips">
    ${['oatmeal', 'greek yogurt', 'protein bar', 'tortilla', 'granola', 'almond milk'].map(x => `<a class="chip" href="#/search/${encodeURIComponent(x)}">${x}</a>`).join('')}</div></div>
    ${f.length ? `<div class="card"><h2>Saved</h2>${listHTML(f.slice(0, 5).map(x => ({ ...x, s: { score: x.score, band: x.band } })))}</div>` : ''}`;
  bindSearch();
}
function listHTML(rows) {
  return `<ul class="list">${rows.map(r => `<li><a class="item" href="#/product/${esc(r.code)}">${thumb(r.img)}<div class="t"><div class="n">${esc(r.name)}</div><div class="b">${esc(r.brand)}${r.sub ? ' · ' + esc(r.sub) : ''}</div></div>${pill(r.s)}</a></li>`).join('')}</ul>`;
}
async function viewSearch(q) {
  app.innerHTML = searchCard(q) + `<div class="card" id="res"><div class="spin">Searching “${esc(q)}”…</div></div>`; bindSearch();
  try {
    const ps = (await searchProducts(q)).filter(p => p.code);
    const rows = ps.map(p => { const s = scoreProduct(p); const a = s.N.per100; return { code: p.code, name: pname(p), brand: (p.brands || '').toString().split(',')[0], img: img(p), s, sub: a.net != null ? `${r1(a.net)}g net carbs/100g` : 'no nutrition data' }; });
    $('#res').innerHTML = rows.length ? `<h2>${rows.length} results</h2>${listHTML(rows)}` : `<div class="spin">No products found. Try a brand + product name, or scan the barcode.</div>`;
  } catch (e) { $('#res').innerHTML = `<div class="warn">Search failed (${esc(e.message)}). Open Food Facts search is sometimes overloaded — retry, or use barcode lookup.</div><div class="row"><button onclick="route()">Retry</button></div>`; }
}
function nutRow(label, k, N, unit = 'g', key) {
  const v1 = N.per100[k], v2 = N.perServ ? N.perServ[k] : null;
  const f = v => v == null ? '<span class="mut">—</span>' : unit === 'mg' ? Math.round(v) + ' mg' : r1(v) + ' ' + unit;
  return `<tr class="${key ? 'key' : ''}"><td>${label}</td><td>${f(v1)}</td>${N.perServ ? `<td>${f(v2)}</td>` : ''}</tr>`;
}
async function viewProduct(code) {
  app.innerHTML = `<div class="card"><div class="spin">Loading ${esc(code)}…</div></div>`;
  let p;
  try { p = await getProduct(code); } catch (e) { p = cache.get(code); if (!p) { app.innerHTML = `<div class="card"><div class="warn">Couldn't reach Open Food Facts (${esc(e.message)}).</div><div class="row"><button onclick="route()">Retry</button><a class="btn sec" href="#/">Home</a></div></div>`; return; } }
  if (!p) { app.innerHTML = searchCard() + `<div class="card"><div class="warn">Barcode <b>${esc(code)}</b> isn't in Open Food Facts. You can <a href="https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${esc(code)}" target="_blank" rel="noopener">add it</a>.</div></div>`; bindSearch(); return; }
  const s = scoreProduct(p), N = s.N, name = pname(p);
  document.title = `${name} — ${s.score ?? '?'}/100 · Lumi`;
  const unit = N.liquid ? 'ml' : 'g';
  app.innerHTML = `
  <div class="card"><div class="hero">${img(p) ? `<img src="${esc(img(p))}" alt="">` : ''}<div><h1>${esc(name)}</h1><div class="b">${esc(p.brands || '')}${p.quantity ? ' · ' + esc(p.quantity) : ''}</div><div class="small">${esc(p.code)}</div></div></div>
   <div class="score"><div class="dial band-${s.band}">${s.score ?? '?'}</div><div><div class="lbl">${s.label}</div>
   <div class="sub">${s.missing ? 'No carb/sugar data — cannot score' : `T1D-weighted score / 100${N.perServ ? '' : ' · no serving size'}`}</div></div></div>
   ${N.per100.net != null ? `<div class="small" style="margin-top:8px"><b>Bolus ref:</b> ${r1(N.per100.net)} g net carbs/100${unit}${N.perServ ? ` · <b>${r1(N.perServ.net)} g</b> per serving (${esc(N.servLabel || N.servQ + unit)})` : ''}</div>` : ''}
   ${s.missing ? '' : (s.missingFields.length ? `<div class="warn">Missing: ${s.missingFields.map(m => ({ sat: 'sat fat', sodiumMg: 'sodium' }[m] || m)).join(', ')} — score may be optimistic/pessimistic.</div>` : '')}
   <div class="row"><button id="share">↗ Share</button><button class="sec" id="fav">${isFav(p.code) ? '★ Saved' : '☆ Save'}</button><a class="btn sec" href="#/">New search</a></div></div>
  <div class="card"><h2>Key numbers</h2><table><tr><th></th><th>/100${unit}</th>${N.perServ ? `<th>/serving<br><span style="text-transform:none">${esc(N.servLabel || '')}</span></th>` : ''}</tr>
   ${nutRow('Carbohydrate', 'carbs', N, 'g', 1)}${nutRow('Net carbs', 'net', N, 'g', 1)}${nutRow('Sugars', 'sugars', N)}${N.per100.added != null ? nutRow('Added sugars', 'added', N) : ''}${nutRow('Fiber', 'fiber', N)}${nutRow('Protein', 'protein', N)}${nutRow('Fat', 'fat', N)}${nutRow('Saturated fat', 'sat', N)}${N.per100.trans != null ? nutRow('Trans fat', 'trans', N) : ''}${nutRow('Sodium', 'sodiumMg', N, 'mg')}${nutRow('Energy', 'kcal', N, 'kcal')}</table>
   <div class="small" style="margin-top:6px">${esc(N.netNote)}. NOVA: ${s.nova ?? '—'}.</div></div>
  ${s.missing ? '' : `<div class="card"><h2>Why ${s.score}?</h2><ul class="bd"><li><span>Base</span><span class="v">100</span></li>${s.items.map(i => `<li><span>${esc(i.label)}${i.detail ? `<br><span class="small">${esc(i.detail)}</span>` : ''}</span><span class="v ${i.pts < 0 ? 'neg' : 'pos'}">${i.pts > 0 ? '+' : ''}${i.pts}</span></li>`).join('')}
   <li><span><b>Final (clamped 0–100)</b></span><span class="v">${s.score}</span></li></ul>${s.assumedServing ? '<div class="small">No serving size on file — per-serving penalty uses an assumed 50 g/ml.</div>' : ''}</div>`}
  ${(p.ingredients_text_en || p.ingredients_text) ? `<div class="card"><h2>Ingredients</h2><div class="small">${esc(p.ingredients_text_en || p.ingredients_text)}</div></div>` : ''}
  <div class="card small">Source: <a href="https://world.openfoodfacts.org/product/${esc(p.code)}" target="_blank" rel="noopener">Open Food Facts page</a>. Informational only, not medical advice — dose from the physical label.</div>`;
  $('#share').onclick = () => share(name, s);
  $('#fav').onclick = () => { toggleFav(p, s); $('#fav').textContent = isFav(p.code) ? '★ Saved' : '☆ Save'; toast(isFav(p.code) ? 'Saved' : 'Removed'); };
}
async function share(name, s) {
  const url = location.href, text = `${name}: ${s.score ?? '?'}/100 (${s.label}) on Lumi`;
  if (navigator.share) { try { await navigator.share({ title: name, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); }
  catch { prompt('Copy this link:', url); }
}
function viewFavs() {
  const f = favs();
  app.innerHTML = `<div class="card"><h2>Saved products</h2>${f.length ? listHTML(f.map(x => ({ ...x, s: { score: x.score, band: x.band } }))) : '<div class="spin">Nothing saved yet. Tap ☆ Save on a product.</div>'}<div class="small">Stored on this device only.</div></div>`;
}
function viewAbout() {
  app.innerHTML = `<div class="card"><h2>About Lumi</h2>
  <p class="small">Built for T1D use: the score answers “how hard is this going to be to dose for, and how fast will it hit?” first, and general nutrition second. Data comes live from Open Food Facts; nothing is stored server-side.</p>
  <h2>Formula</h2><pre>score = clamp(0, 100, 100 + Σ components)

CARB / GLYCEMIC (dominant, up to −148 before clamp)
 Net carbs /100g         −0.6 × g        (cap −30)
 Net carbs /serving      −0.6 × g        (cap −25; 50 g/ml assumed if unknown)
 Total sugars /100g      −0.4 × g        (cap −15)
 Added sugars /100g      −0.5 × g        (cap −12)
   if undeclared but sugar/syrup in ingredients: −0.4 × sugars (cap −8)
 Liquid sugar (drinks, sugars >2.5 g/100ml)  −3 × g  (cap −30)
 Glycemic proxies        syrups/maltodextrin/dextrose −6 each (cap −12)
                         sugar/syrup as 1st ingredient −5
                         refined starch/flour −4 each (cap −8)
                         combined cap −18
 Fiber /100g             +1 × g          (cap +10)
 Fiber ≥ 20% of carbs    +3
 Protein /100g           +0.3 × g        (cap +6)

SECONDARY
 Saturated fat /100g     −0.8 × g        (cap −8)
 Trans fat               −8 × g (cap −8), or −6 if hydrogenated oil listed
 Sodium /100g            −1 per 100 mg   (cap −8)
 NOVA 4 −8 · NOVA 3 −3
 Concerning additives    −2 each (cap −8): nitrites/nitrates, caramel E150c/d,
   TiO2, azo dyes, BHA/BHT/TBHQ, aspartame/ace-K/sucralose/saccharin,
   P80/CMC/carrageenan, phosphoric acid, MSG, benzoate, SO2, E1442

Bands: 75–100 Excellent · 50–74 Good · 25–49 Poor · 0–24 Bad</pre>
  <h2>Net carbs</h2><p class="small">EU/UK labels already exclude fiber from “carbohydrate”, so net = carbs. For products sold only in US/CA/MX, net = carbs − fiber. Polyols (if declared) are subtracted in both cases — adjust mentally for maltitol, which has real glycemic impact.</p>
  <h2>Limitations</h2><p class="small">Open Food Facts is crowd-sourced: values can be missing, outdated or mis-entered, and serving sizes vary by region. No true GI/GL data exists in the dataset, so ingredient keywords are used as proxies. Fat/protein-heavy foods (pizza-type delayed rises) aren't modeled beyond the sat-fat term.</p>
  <div class="warn">Informational only — not medical advice. Always dose from the physical label and your own CGM data.</div></div>`;
}

/* ---------------- Router ---------------- */
async function route() {
  await stopScan(); window.scrollTo(0, 0); document.title = 'Lumi — food scanner';
  const h = location.hash.replace(/^#\/?/, ''); const [view, ...rest] = h.split('/'); const arg = decodeURIComponent(rest.join('/'));
  if (view === 'product' && arg) return viewProduct(arg.replace(/\D/g, '') || arg);
  if (view === 'search' && arg) return viewSearch(arg);
  if (view === 'favorites') return viewFavs();
  if (view === 'about') return viewAbout();
  viewHome();
}
window.addEventListener('hashchange', route);
route();
