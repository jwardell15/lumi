/* Lumi 25.0: Home & Body. Personal-care products (Open Beauty Facts) checked against official lists: EPA PFAS, California Prop 65,
   California Safe Cosmetics reports, EU fragrance allergens, formaldehyde releasers. Routes: #/hb[/<cat>[/<query>]], #/cos/<barcode> (product),
   #/hb-check (ingredient checker), #/pfas, #/prop65, #/hb-about. Lumi's Home & Body score is its own arithmetic over cited flags, never a safety rating. */
(() => {
'use strict';
const HB = window.HB25; if (!HB) { console.warn('hb25core missing'); return; }
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const norm = HB.norm, enc = encodeURIComponent;
const BASE = 'data/hb25/';
const ext = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
const NF = n => Number(n).toLocaleString('en-US');
const BANDC = { ex: 'bg-ex', gd: 'bg-gd', pr: 'bg-pr', bd: 'bg-bd', na: 'bg-na' };
const CAT_ICON = { sun: '☀️', oral: '🪥', deo: '🧼', hair: '💇', makeup: '💄', baby: '🍼', face: '🧖', body: '🛁', other: '🧴', laundry: '🧺', dish: '🍽️', surface: '🧽', air: '🌬️', otherc: '🧹' };
const FLBIT = [[1, 'PFAS'], [2, 'Prop 65'], [4, 'Formaldehyde releaser'], [8, 'Fragrance allergen'], [16, 'Undisclosed fragrance'], [32, 'Reported to California'], [64, 'PFAS reported (MN)']];
const CAT_NAME = { sun: 'Sun care', oral: 'Oral care', deo: 'Deodorant', hair: 'Hair care', makeup: 'Makeup & nails', baby: 'Baby', face: 'Face care', body: 'Body & bath', other: 'Other personal care', laundry: 'Laundry', dish: 'Dish soap', surface: 'Surface cleaners', air: 'Air & odor', otherc: 'Other cleaning' };
const TOX = { C: 'cancer', R: 'reproductive harm', CR: 'cancer and reproductive harm' };

/* ---------- data ---------- */
const cache = {};
const load = (k, url, ms) => cache[k] || (cache[k] = getJSON(url, ms || 30000).catch(e => { delete cache[k]; throw e; }));
let DOCS = null, DOCSP = null;
function hbIndex() { if (DOCS) return Promise.resolve(DOCS); if (DOCSP) return DOCSP;
  DOCSP = Promise.all([load('idx', BASE + 'index.json'), window.HB25UI.withClean ? load('idxc', BASE + 'index-c.json') : null]).then(([j, jc]) => { const cats = j.cats.map(c => ({ id: c[0], name: c[1] }));
    const mk = d => ({ code: d[0], name: d[1], brand: d[2], score: d[3] < 0 ? null : d[3], cat: cats[d[4]].id, img: d[5], bits: d[6], kind: d[7], key: norm(d[1] + ' ' + d[2]) }), tier = d => (d.bits & 512 ? 2 : 0) + (d.bits & 256 ? 1 : 0);
    let docs = j.docs.map(mk); if (jc) docs = docs.concat(jc.docs.map(mk)).sort((x, y) => tier(y) - tier(x));
    DOCS = { cats, cov: j.cov, built: j.built, docs };
    return DOCS; }).catch(e => { DOCSP = null; throw e; }); return DOCSP; }
const hbRef = () => load('ref', BASE + 'ref.json', 60000);
const hbMN = () => load('mn', BASE + 'pfasmn.json', 60000);
async function hbRec(code) {
  code = String(code); const keys = [code]; if (/^\d+$/.test(code)) { keys.push(code.padStart(13, '0'), code.padStart(12, '0'), code.replace(/^0+/, '')); }
  for (const k of new Set(keys)) { try { const sh = await load('sh' + k.slice(-2), BASE + 'd/' + k.slice(-2) + '.json', 15000); if (sh[k]) return sh[k]; } catch (e) { if (k === code) throw e; } }
  return null;
}
const imgU = (path, kind) => path ? `https://images.open${kind === 'b' ? 'beauty' : 'products'}facts.org/images/products/${path}.400.jpg` : '';
const srcName = k => k === 'b' ? 'Open Beauty Facts' : k === 'p' ? 'Open Products Facts' : 'EPA Safer Choice';
const pageURL = (code, k) => k === 'b' ? `https://world.openbeautyfacts.org/product/${code}` : k === 'p' ? `https://world.openproductsfacts.org/product/${code}` : 'https://www.epa.gov/saferchoice/products';

/* ---------- small pieces ---------- */
function pill(score, band, big) { return `<span class="hbp25${big ? ' big' : ''} ${BANDC[band] || 'bg-na'}" aria-label="${score == null ? "Home and Body score: couldn't verify" : 'Home and Body score ' + score + ' out of 100'}">${score == null ? '?' : score}</span>`; }
const bandOf = s => s == null ? 'na' : s >= 100 ? 'ex' : s >= 80 ? 'gd' : s >= 55 ? 'pr' : 'bd';
function bitsTags(bits) { const t = FLBIT.filter(f => bits & f[0]).map(f => f[1]); if (bits & 128) t.push('Safer Choice'); return t; }
function rowHB(d) { const tags = bitsTags(d.bits).slice(0, 3);
  return `<a class="row hbr25" href="#/cos/${esc(d.code)}"><div class="thumb">${d.img ? `<img src="${esc(imgU(d.img, d.kind))}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}<span class="ic">${CAT_ICON[d.cat] || '🧴'}</span></div>
  <div class="t"><div class="n">${esc(d.name)}</div><div class="b">${esc(d.brand || '')}${d.brand ? ' · ' : ''}${esc(srcName(d.kind))}</div>${tags.length ? `<div class="tg25">${tags.map(x => `<span class="tg25i${x === 'Safer Choice' ? ' sc' : ''}">${esc(x)}</span>`).join('')}</div>` : ''}</div>${pill(d.score, bandOf(d.score))}</a>`; }
function attrib() { return `<p class="foot small hba25">Product data: ${ext('https://world.openbeautyfacts.org/', 'Open Beauty Facts')} and ${ext('https://world.openproductsfacts.org/', 'Open Products Facts')} (volunteers; ODbL license, photos CC BY-SA). Ingredient lists can be old or mistyped, so always check the package. Lumi's Home &amp; Body score is not a safety rating. <a href="#/hb-about">How it works and sources</a>.</p>`; }

/* ---------- product page ---------- */
const scoreCtx = rec => ({ hasIng: !!rec.ing, cscp: (rec.cs || []).map(c => (Array.isArray(c) ? { c: c[0], d: c[1] } : c)), saferChoice: !!rec.sc });
const flagsOf = rec => (rec.f || []).map(a => ({ t: a[0], n: a[1], cas: a[2], via: a[3], src: a[4], tox: a[5], date: a[6] }));
function flagList(items) { const seen = new Set(); return items.map(it => { const first = !seen.has(it.f.t); seen.add(it.f.t); return flagCard(it, first); }).join(''); }
function flagCard(it, first = true) { const f = it.f, S = HB.SRC[f.src] || HB.SRC[f.t] || {}, why = HB.WHY[f.t] || '';
  const tox = f.tox ? ` Listed for ${TOX[f.tox] || f.tox}${f.date ? ' on ' + esc(f.date) : ''}.` : '';
  const via = f.via && norm(f.via) !== norm(f.n) ? ` · matched “${esc(f.via)}”` : '';
  return `<li class="fl25 k-${esc(f.t)}"><div class="fh25"><b>${esc(f.n)}</b><span class="pt25">${it.pts ? it.pts : (f.t === 'p65q' ? 'info' : 'capped')}</span></div>
   <div class="fk25">${esc(HB.KIND_LABEL[f.t] || f.t)}${f.cas ? ' · CAS ' + esc(f.cas) : ''}${via}${f.t === 'cscp' ? ' · possible match by brand and product name' : ''}</div>
   ${first || f.tox || f.t === 'cscp' ? `<p>${esc(why)}${esc(tox)}</p>${S.url ? `<p class="small">Source: ${ext(S.url, S.name)}</p>` : ''}` : (S.url ? `<p class="small">Same explanation and source as above.</p>` : '')}</li>`; }
function markIng(ing, flags) { /* highlight flagged ingredient names inside the label text */
  let h = esc(ing); const names = new Set(); flags.forEach(f => { [f.via, f.n].forEach(x => { if (x && x.length > 3) names.add(x); }); }); if (/parfum|fragrance/i.test(ing)) names.add('fragrance').add('parfum');
  for (const n of [...names].sort((a, b) => b.length - a.length)) { const re = new RegExp('(^|[^a-z0-9])(' + esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s\\-]+') + ')(?![a-z0-9])', 'gi'); h = h.replace(re, (m, a, b) => `${a}<mark class="mk25">${b}</mark>`); }
  return h; }
async function mnBrand(brand) { if (!brand) return null; try { const m = await hbMN(); const n = norm(brand); if (n.length < 3) return null; return m.brands.find(b => b[0].includes(n)) || null; } catch { return null; } }
const EXTRAS = []; /* later releases add cards: EXTRAS.push(async (rec, r) => html) */
async function viewHBProduct(code, scanned) {
  document.title = 'Home & Body — Lumi';
  app.innerHTML = `<div class="loading-dog">${MASCOT(56, 'bounce')}<span>Checking the label…</span></div>${skel(2)}`;
  let rec = null; try { rec = await hbRec(code); } catch (e) { app.innerHTML = `<div class="card empty"><b>Couldn't load Home & Body data</b>${esc(e.message)}. Check your connection and retry.<div class="actions"><button class="btn pri" onclick="route()">Retry</button><a class="btn" href="#/hb">Home &amp; Body</a></div></div>`; return; }
  if (location.hash.indexOf(code) < 0) return;
  if (!rec) { app.innerHTML = `<div class="card empty hbnf25"><b>${esc(code)} isn't in Lumi's Home &amp; Body data</b>It isn't a food Lumi knows, and it isn't in Open Beauty Facts, Open Products Facts or the EPA Safer Choice list. Try the name, or check an ingredient list yourself.<div class="actions"><a class="btn pri" href="#/hb-check">Check an ingredient list</a><a class="btn" href="#/hb">Search Home &amp; Body</a>${ext('https://world.openbeautyfacts.org/cgi/product.pl?type=add&code=' + enc(code), 'Add it to Open Beauty Facts')}</div></div>`; return; }
  const flags = flagsOf(rec), ctx = scoreCtx(rec), r = HB.score(flags, ctx), kindName = srcName(rec.k);
  const mn = rec.k === 'b' ? await mnBrand(rec.b) : null; if (location.hash.indexOf(code) < 0) return;
  const catName = CAT_NAME[rec.g] || '';
  const img = imgU(rec.i, rec.k);
  const pts = r.items.filter(i => i.pts < 0), info = r.items.filter(i => i.pts === 0);
  let extras = ''; for (const f of EXTRAS) { try { extras += await f(rec, r) || ''; } catch (e) { console.warn('hb extra', e); } }
  const noIng = !rec.ing;
  app.innerHTML = `<section class="hbpg25 pg13"><a class="back25" href="#/hb">‹ Home &amp; Body</a>
  <div class="card hbh25"><div class="thumb big">${img ? `<img src="${esc(img)}" alt="" fetchpriority="high" decoding="async" onerror="this.remove()">` : ''}<span class="ic">${CAT_ICON[rec.g] || '🧴'}</span></div>
   <div class="hbt25"><h1>${esc(rec.n)}</h1><p class="small">${esc(rec.b || 'Brand not listed')}${rec.q ? ' · ' + esc(rec.q) : ''}${catName ? ' · ' + esc(catName) : ''}</p>
   <div class="hbs25"><div class="hbk25"><small>Home &amp; Body score</small>${pill(r.score, r.band, true)}</div><div class="hbl25"><b>${esc(r.label)}</b>${r.score != null && r.score === 100 ? '<span>This is not a safety rating. Lumi only checks the lists on the sources page.</span>' : ''}${r.score != null && r.score < 100 ? `<span>${pts.length} flag${pts.length === 1 ? '' : 's'} counted. Each is explained below with its source.</span>` : ''}${noIng ? '<span>This product has no ingredient list in the open database, so Lumi can\'t check it. Read the package, or paste the list into the checker.</span>' : ''}</div></div>
   ${rec.sc ? `<p class="scb25">✓ Listed by EPA Safer Choice <small>(a positive label, not a guarantee)</small></p>` : ''}</div></div>
  ${noIng && !pts.length ? `<div class="card cv25"><h2>Couldn't verify</h2><p>No ingredient list is on file for this product. <a href="#/hb-check">Paste the ingredients from the package</a> to check them against the same lists.</p></div>` : ''}
  ${pts.length ? `<div class="card"><h2>Why this score</h2><p class="small">Starts at 100. Each flag below takes points off (more for PFAS and Prop 65, fewer for fragrance allergens).</p><ul class="fls25">${flagList(pts)}</ul></div>` : (rec.ing ? `<div class="card ok25"><h2>No flagged ingredients found in available data</h2><p class="small">Lumi checked this list against EPA's PFAS list, California Prop 65, the EU fragrance allergens and formaldehyde releasers. That is not the same as safe: lists are incomplete and the ingredient text may be wrong.</p></div>` : '')}
  ${info.length ? `<div class="card"><h2>Also found</h2><p class="small">These don't lower the score further: either the points for that kind already reached their cap, or the listing only applies to a specific form.</p><ul class="fls25">${flagList(info)}</ul></div>` : ''}
  ${mn ? `<div class="card mn25"><h2>PFAS reported by this brand (Minnesota)</h2><p>${esc(mn[1])} reported <b>${NF(mn[3])}</b> product${mn[3] === 1 ? '' : 's'} with intentionally added PFAS to Minnesota${mn[7] && mn[7].length ? ', mostly for: ' + esc(mn[7].slice(0, 3).join(', ')) : ''}. <b>This doesn't mean this particular product has PFAS.</b> It's brand-level information and does not change the score.</p><p class="small">Source: ${ext(HB.SRC.mn.url, HB.SRC.mn.name)}. <a href="#/pfas">About PFAS</a></p></div>` : ''}
  ${extras}
  ${rec.ing ? `<div class="card"><h2>Ingredients</h2><p class="ing25">${markIng(rec.ing, flags)}</p><p class="small">As listed in ${esc(kindName)}. <mark class="mk25">Highlighted</mark> words matched a flag above. ${ext(pageURL(rec.c, rec.k), 'See or fix this entry on ' + kindName)}</p></div>` : ''}
  <div class="actions hbact25"><a class="btn" href="#/hb/${esc(rec.g)}">More ${esc((catName || 'products').toLowerCase())}</a><a class="btn" href="#/hb-check">Check another ingredient list</a></div>
  ${attrib()}</section>`;
  app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim();
  pushHistHB(rec); const bt = document.querySelector('.hbpg25 h1'); if (bt) bt.setAttribute('tabindex', '-1');
}
function pushHistHB(rec) { try { const k = 'hbviewed25', L = store.get(k, []).filter(x => x.c !== rec.c); L.unshift({ c: rec.c, n: rec.n, b: rec.b, t: Date.now() }); store.set(k, L.slice(0, 20)); } catch {} }

/* ---------- hub ---------- */
const FILT = { clean: ['Flag-free', d => d.score === 100], nopfas: ['No PFAS flag', d => !(d.bits & 1) && d.score != null], nop65: ['No Prop 65 flag', d => !(d.bits & 2) && d.score != null], nofrag: ['No fragrance', d => !(d.bits & (8 | 16)) && d.score != null], us: ['US listing', d => d.bits & 512], img: ['Has photo', d => d.img] };
const CATSET = { pc: ['sun', 'oral', 'deo', 'hair', 'makeup', 'baby', 'face', 'body', 'other'] };
async function viewHBHub(arg) {
  document.title = 'Home & Body — Lumi';
  const parts = String(arg || '').split('/'); let cat = parts[0] && parts[0] !== 'all' ? parts[0] : 'all'; let q = decodeURIComponent(parts.slice(1).join('/') || '');
  if (cat !== 'all' && !CATSET.pc.includes(cat) && !(window.HB25UI.cats || []).includes(cat)) { q = decodeURIComponent(parts.join('/')); cat = 'all'; }
  app.innerHTML = `<section class="hbhub25 pg13"><h1>Home &amp; Body</h1><p class="lead">Personal care and household products checked against official lists. Scan a barcode or search.</p>${skel(3)}</section>`;
  let I; try { I = await hbIndex(); } catch (e) { app.innerHTML = `<div class="card empty"><b>Couldn't load Home & Body data</b>${esc(e.message)}.<div class="actions"><button class="btn pri" onclick="route()">Retry</button></div></div>`; return; }
  if (!/^#\/(hb|cosmetics)/.test(location.hash)) return;
  const st = { cat, q, f: new Set(store.get('hbf25', [])), sort: store.get('hbs25', 'pop'), n: 40 };
  const cats = I.cats.filter(c => CATSET.pc.includes(c.id) || (window.HB25UI.cats || []).includes(c.id));
  const cov = I.cov || {};
  app.innerHTML = `<section class="hbhub25 pg13"><h1>Home &amp; Body</h1>
   <p class="lead">Shampoo, sunscreen, toothpaste${window.HB25UI.cats && window.HB25UI.cats.length ? ', laundry detergent and cleaners' : ''}: checked against EPA's PFAS list, California Prop 65 and other official lists. Lumi never calls a product “safe”: it shows what it found, or says it couldn't verify.</p>
   <div class="hbt25b"><a href="#/hb-check"><b>Check an ingredient list</b><span>Paste one from a package</span></a><a href="#/pfas"><b>PFAS in products</b><span>What EPA and Minnesota publish</span></a><a href="#/prop65"><b>Prop 65 ingredients</b><span>Look up a chemical</span></a><a href="#/hb-about"><b>How scoring works</b><span>Sources and licenses</span></a>${(window.HB25UI.tools || []).join('')}</div>
   <form class="hbq25" role="search" onsubmit="return false"><input id="hbq25" type="search" autocomplete="off" placeholder="Search Home &amp; Body: product or brand" aria-label="Search Home and Body products" value="${esc(q)}"></form>
   <div class="chips hbc25" role="group" aria-label="Category"><a class="chip${cat === 'all' ? ' on' : ''}" data-c="all" href="#/hb">All</a>${cats.map(c => `<a class="chip${cat === c.id ? ' on' : ''}" data-c="${c.id}" href="#/hb/${c.id}">${CAT_ICON[c.id] || ''} ${esc(c.name)}</a>`).join('')}</div>
   <div class="hbf25" role="group" aria-label="Filters">${Object.entries(FILT).map(([k, v]) => `<button type="button" class="chip fb25${st.f.has(k) ? ' on' : ''}" data-f="${k}" aria-pressed="${st.f.has(k)}">${v[0]}</button>`).join('')}<label class="srt25">Sort <select id="hbsort25"><option value="pop"${st.sort === 'pop' ? ' selected' : ''}>Most complete</option><option value="best"${st.sort === 'best' ? ' selected' : ''}>Highest score</option><option value="az"${st.sort === 'az' ? ' selected' : ''}>A to Z</option></select></label></div>
   <p class="small hbn25" id="hbn25" aria-live="polite"></p><div class="list" id="hbl25"></div><div class="actions"><button class="btn" id="hbm25" hidden>Show more</button></div>
   <p class="small hbcov25">${cov.indexed ? NF(I.docs.length) + (window.HB25UI.withClean ? ' personal-care, laundry and cleaning products' : ' personal-care products') : ''}${cov.scored ? ', ' + NF(cov.scored) + ' with an ingredient list Lumi could check' : ''}. Data built ${esc(I.built)}.</p>${attrib()}</section>`;
  const pool = () => I.docs.filter(d => (d.kind === 'b' || (window.HB25UI.cats || []).includes(d.cat)) && (cat === 'all' ? (d.kind === 'b' || (window.HB25UI.cats || []).length) : d.cat === cat));
  const ps = () => { const t = norm(st.q).split(' ').filter(Boolean); let L = pool().filter(d => t.every(x => d.key.includes(x))); for (const k of st.f) if (FILT[k]) L = L.filter(FILT[k][1]);
    if (st.sort === 'best') L = L.slice().sort((a, b) => (b.score ?? -1) - (a.score ?? -1)); else if (st.sort === 'az') L = L.slice().sort((a, b) => a.name.localeCompare(b.name));
    else if (t.length) L = L.slice().sort((a, b) => (norm(b.name).startsWith(t[0]) ? 1 : 0) - (norm(a.name).startsWith(t[0]) ? 1 : 0));
    return L; };
  const paint = () => { const L = ps(); $('#hbn25').textContent = `${NF(L.length)} product${L.length === 1 ? '' : 's'}`; $('#hbl25').innerHTML = L.slice(0, st.n).map(rowHB).join('') || '<div class="card empty"><b>No products match</b>Try fewer filters, or <a href="#/hb-check">check an ingredient list</a> yourself.</div>'; $('#hbm25').hidden = L.length <= st.n; };
  $('#hbq25').oninput = e => { st.q = e.target.value; st.n = 40; paint(); };
  $('#hbm25').onclick = () => { st.n += 60; paint(); };
  $('#hbsort25').onchange = e => { st.sort = e.target.value; store.set('hbs25', st.sort); paint(); };
  $$('.fb25').forEach(b => b.onclick = () => { const k = b.dataset.f; st.f.has(k) ? st.f.delete(k) : st.f.add(k); b.classList.toggle('on'); b.setAttribute('aria-pressed', st.f.has(k)); store.set('hbf25', [...st.f]); st.n = 40; paint(); });
  paint();
}

/* ---------- ingredient checker ---------- */
function resultHTML(text, ref) { const flags = HB.evaluate(text, ref), r = HB.score(flags, { hasIng: true }), pts = r.items.filter(i => i.pts < 0), info = r.items.filter(i => i.pts === 0);
  return `<div class="card"><div class="hbs25"><div class="hbk25"><small>Home &amp; Body score</small>${pill(r.score, r.band, true)}</div><div class="hbl25"><b>${esc(r.label)}</b><span>${pts.length ? pts.length + ' flag' + (pts.length === 1 ? '' : 's') + ' counted. Not a safety rating.' : 'Not the same as safe: Lumi only checks the lists on the sources page, and your text may differ from the package.'}</span></div></div></div>
  ${pts.length ? `<div class="card"><h2>Why this score</h2><ul class="fls25">${flagList(pts)}</ul></div>` : ''}${info.length ? `<div class="card"><h2>Also found</h2><p class="small">These don't lower the score further: either the points for that kind already reached their cap, or the listing only applies to a specific form.</p><ul class="fls25">${flagList(info)}</ul></div>` : ''}
  <div class="card"><h2>Your list, highlighted</h2><p class="ing25">${markIng(text, flags)}</p></div>`; }
async function viewHBCheck() {
  document.title = 'Check an ingredient list — Lumi';
  app.innerHTML = `<section class="hbck25 pg13"><a class="back25" href="#/hb">‹ Home &amp; Body</a><h1>Check an ingredient list</h1><p class="lead">Paste the ingredients from a package (INCI names, separated by commas). Lumi checks them on your device; nothing is sent or saved.</p>
  <div class="card"><label class="fl11"><span>Ingredients</span><textarea id="hbck25" rows="6" placeholder="Aqua, Sodium Laureth Sulfate, Parfum, DMDM Hydantoin, Limonene…"></textarea></label><div class="actions"><button class="btn pri" id="hbgo25">Check</button><button class="btn" id="hbex25" type="button">Try an example</button></div></div><div id="hbres25" aria-live="polite"></div>${attrib()}</section>`;
  const go = async () => { const t = $('#hbck25').value.trim(), out = $('#hbres25'); if (norm(t).length < 3) { out.innerHTML = '<div class="card empty"><b>Paste an ingredient list first</b></div>'; return; }
    out.innerHTML = '<div class="small" style="padding:10px 2px">Checking…</div>'; try { const ref = await hbRef(); out.innerHTML = resultHTML(t, ref); out.scrollIntoView({ block: 'nearest' }); } catch (e) { out.innerHTML = `<div class="card empty"><b>Couldn't load the lists</b>${esc(e.message)}</div>`; } };
  $('#hbgo25').onclick = go; $('#hbex25').onclick = () => { $('#hbck25').value = 'Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Parfum, Limonene, Linalool, DMDM Hydantoin, Polytetrafluoroethylene, Titanium Dioxide, Citric Acid'; go(); };
}

/* ---------- PFAS page ---------- */
async function viewPFAS(arg) {
  document.title = 'PFAS in products — Lumi';
  app.innerHTML = `<section class="pfas25 pg13"><a class="back25" href="#/hb">‹ Home &amp; Body</a><h1>PFAS in products</h1>
  <p class="lead">PFAS are a large family of man-made chemicals (“forever chemicals”). They are in some cosmetics, cookware, packaging and textiles. Lumi flags them in two ways, and links to independent testing it does not copy.</p>
  <div class="g231 hbg25"><section class="card"><h2>1. In an ingredient list</h2><p>Lumi matches each ingredient against the ${ext(HB.SRC.pfas.url, 'EPA CompTox PFAS structure list')} (about 8,000 substances; names and synonyms from EPA's DSSTox) and against PFAS name patterns (for example <i>perfluoro…</i>, <i>PTFE</i>). It's exact per ingredient, so a look-alike name isn't flagged. Fluoride salts with no carbon-fluorine bond (like sodium fluoride) are not counted. EPA's list is broad: some entries are PFAS only under broad definitions.</p></section>
  <section class="card"><h2>2. Reported by a brand (Minnesota)</h2><p>Since 2025 Minnesota companies have to report products with intentionally added PFAS (${ext(HB.SRC.mn.url, 'MPCA')}). Lumi shows the brand-level fact below. <b>It doesn't mean a particular product has PFAS</b>, and it doesn't change a score.</p></section>
  <section class="card"><h2>Independent testing (links only)</h2><p>Lab testing of finished products is done by groups like ${ext('https://toxicfreefuture.org/', 'Toxic-Free Future')} and ${ext('https://www.consumerreports.org/', 'Consumer Reports')}. Maine also tracks PFAS in products: ${ext('https://www.maine.gov/dep/spills/topics/pfas/PFAS-products/', 'Maine DEP')}. Lumi doesn't copy their results.</p></section></div>
  <div class="card"><h2>Look up a brand reported to Minnesota</h2><label class="fl11"><span>Brand or company</span><input id="pfq25" type="search" autocomplete="off" placeholder="e.g. Cummins, Revlon, Procter" value="${esc(decodeURIComponent(arg || ''))}"></label><div id="pfl25" class="small">Loading Minnesota's list…</div></div>
  <div class="card"><h2>Look up an ingredient (EPA PFAS list)</h2><label class="fl11"><span>Ingredient name or CAS number</span><input id="pfi25" type="search" autocomplete="off" placeholder="e.g. PTFE, perfluorohexane, 335-67-1"></label><div id="pfr25" class="small">Type at least 3 letters.</div></div>${attrib()}</section>`;
  hbMN().then(m => { const el = $('#pfl25'); if (!el || !$('#pfq25')) return; const paint = () => { const t = norm($('#pfq25').value); if (t.length < 2) { el.innerHTML = `${NF(m.brands.length)} brands from ${NF(m.companies)} companies in ${NF(m.rows)} reports (as of ${esc(m.asof)}). Search above.`; return; }
      const L = m.brands.filter(b => b[0].some(n => n.includes(t))).sort((a, b) => b[3] - a[3]).slice(0, 12);
      el.innerHTML = L.length ? `<ul class="mnl25">${L.map(b => `<li><b>${esc(b[1])}</b> <span>${NF(b[3])} product report${b[3] === 1 ? '' : 's'}${b[5] && b[5].length ? ' · ' + esc(b[5].slice(0, 2).join(', ')) : ''}${b[6] && b[6].length ? ' · e.g. ' + esc(b[6].slice(0, 3).join(', ').toLowerCase()) : ''}</span></li>`).join('')}</ul><p class="small">Brand-level reports to Minnesota. This doesn't mean a particular product you own has PFAS.</p>` : 'No brand with that name in the Minnesota reports. That doesn\'t mean anything about its products.'; };
    $('#pfq25').oninput = paint; paint(); }).catch(e => { const el = $('#pfl25'); if (el) el.textContent = "Couldn't load the Minnesota list: " + e.message; });
  hbRef().then(ref => { const el = $('#pfr25'), inp = $('#pfi25'); if (!el || !inp) return; inp.oninput = () => { const t = norm(inp.value); if (t.length < 3) { el.textContent = 'Type at least 3 letters.'; return; }
      const cas = inp.value.trim().match(/^\d{2,7}-\d\d-\d$/), hits = cas ? ref.pfas.e.filter(e => e[1] === cas[0]) : (ref.pfas.m[t] != null ? [ref.pfas.e[ref.pfas.m[t]]] : ref.pfas.e.filter(e => norm(e[0]).startsWith(t)).slice(0, 8));
      el.innerHTML = hits.length ? `<ul class="mnl25">${hits.map(e => `<li><b>${esc(e[0])}</b> <span>CAS ${esc(e[1] || 'n/a')} · on EPA's PFAS structure list</span></li>`).join('')}</ul>` : 'Not on the EPA PFAS list in Lumi\'s copy (exact names only). That doesn\'t say anything else about it.'; }; }).catch(() => {});
}

/* ---------- Prop 65 page ---------- */
async function viewProp65() {
  document.title = 'Prop 65 ingredients — Lumi';
  app.innerHTML = `<section class="p65pg25 pg13"><a class="back25" href="#/hb">‹ Home &amp; Body</a><h1>California Prop 65</h1>
  <p class="lead">Proposition 65 requires California to publish a list of chemicals known to cause cancer, birth defects or other reproductive harm. Lumi flags ingredients that are on it.</p>
  <div class="card"><p>A listing is about the <b>chemical</b>. It doesn't mean a product is over any limit, or that using it is unsafe. Some listings only apply to a specific form (dust, fibers, ingested). Lumi shows those for information and doesn't take points off. Source: ${ext(HB.SRC.p65.url, HB.SRC.p65.name)}.</p></div>
  <div class="card"><h2>Look up a chemical</h2><label class="fl11"><span>Name or CAS number</span><input id="p65q25" type="search" autocomplete="off" placeholder="e.g. formaldehyde, titanium dioxide, 50-00-0"></label><div id="p65r25" class="small">Loading the list…</div></div>${attrib()}</section>`;
  hbRef().then(ref => { const el = $('#p65r25'), inp = $('#p65q25'); if (!el || !inp) return; const E = ref.p65.e; el.textContent = `${NF(E.length)} listed chemicals (list dated July 31, 2026). Type to search.`;
    inp.oninput = () => { const t = norm(inp.value), cas = inp.value.trim().match(/^\d{2,7}-\d\d-\d$/); if (t.length < 3 && !cas) { el.textContent = 'Type at least 3 letters.'; return; }
      const L = (cas ? E.filter(e => e[1] === cas[0]) : E.filter(e => norm(e[0]).includes(t))).slice(0, 15);
      el.innerHTML = L.length ? `<ul class="mnl25">${L.map(e => `<li><b>${esc(e[0])}</b> <span>CAS ${esc(e[1] || 'n/a')} · ${esc(TOX[e[2]] || e[2])} · listed ${esc(e[3])}${e[4] ? ' · specific form only' : ''}</span></li>`).join('')}</ul>` : 'Not on the Prop 65 list under that name. That doesn\'t say anything else about it.'; }; })
    .catch(e => { const el = $('#p65r25'); if (el) el.textContent = "Couldn't load the list: " + e.message; });
}

/* ---------- about / methodology ---------- */
function viewHBAbout() {
  document.title = 'Home & Body: how it works — Lumi';
  const P = HB.PTS, row = (k, label) => `<tr><td>${esc(label)}</td><td>−${P[k][0]}</td><td>−${P[k][1]}</td><td>−${P[k][2]}</td></tr>`;
  app.innerHTML = `<section class="hbab25 pg13"><a class="back25" href="#/hb">‹ Home &amp; Body</a><h1>Home &amp; Body: how it works</h1>
  <p class="lead">Lumi's Home &amp; Body score is its own simple arithmetic over flags from official lists. It starts at 100 and subtracts points. It is <b>not</b> a safety rating, a medical opinion or a regulator's finding.</p>
  <div class="card"><h2>Points</h2><table class="pt25t"><thead><tr><th>Flag</th><th>First</th><th>Each more</th><th>Cap</th></tr></thead><tbody>${row('pfas', 'PFAS (EPA list)')}${row('p65', 'California Prop 65 listed chemical')}${row('frel', 'Formaldehyde-releasing preservative')}${row('fa', 'EU fragrance allergen')}${row('parfum', 'Undisclosed “fragrance”')}${row('cscp', 'Reported to California Safe Cosmetics (possible match)')}</tbody></table>
  <p class="small">Bands: 100 = no flagged ingredients found in available data; 80 to 99 = a few flags; 55 to 79 = some flags; under 55 = several or serious flags. If there's no ingredient list Lumi says <b>couldn't verify</b> and shows no score. Prop 65 listings that only apply to a specific form are shown for information and cost nothing. Minnesota brand reports and EPA Safer Choice never change the score.</p></div>
  <div class="card"><h2>Sources and licenses</h2><ul class="src25">
   <li><b>Open Beauty Facts</b> and <b>Open Products Facts</b>: product names, photos and ingredient lists from volunteers. ODbL database license; photos CC BY-SA. Lumi uses the official bulk files, not the live API. ${ext('https://world.openbeautyfacts.org/', 'openbeautyfacts.org')}</li>
   <li><b>EPA CompTox PFAS structure list</b> (public domain). ${ext(HB.SRC.pfas.url, 'comptox.epa.gov')}</li>
   <li><b>California Prop 65 list</b> (OEHHA, July 31, 2026). ${ext(HB.SRC.p65.url, 'oehha.ca.gov')}</li>
   <li><b>California Safe Cosmetics Program</b>: chemicals companies reported in cosmetics, matched by brand and product name only, so shown as “possible match”. ${ext(HB.SRC.cscp.url, 'data.chhs.ca.gov')}</li>
   <li><b>EU Cosmetics Regulation Annex III</b> (26 fragrance allergens). ${ext(HB.SRC.fa.url, 'eur-lex.europa.eu')}</li>
   <li><b>Formaldehyde releasers</b>, per the National Cancer Institute. ${ext(HB.SRC.frel.url, 'cancer.gov')}</li>
   <li><b>Minnesota PFAS in products</b> (MPCA, via the IC2 PRISM database): brand-level information. ${ext(HB.SRC.mn.url, 'pca.state.mn.us')}</li>
   <li><b>Maine DEP</b> and independent labs (Toxic-Free Future, Consumer Reports): linked, not copied.</li></ul></div>
  <div class="card"><h2>What this can't tell you</h2><ul class="ul231"><li>Ingredient lists come from volunteers and may be old, partial or mistyped. Check the package.</li><li>Fragrance blends aren't itemized, so Lumi can't see inside them.</li><li>PFAS can be in a product without being an ingredient (for example from manufacturing or packaging).</li><li>A match is about a chemical, not about the amount in the product.</li><li>With a health concern, ask your doctor or pharmacist. See <a href="#/disclaimer">Not medical advice</a>.</li></ul></div>${attrib()}</section>`;
}

/* ---------- integration ---------- */
window.HB25UI = Object.assign(window.HB25UI || {}, { FILT, EXTRAS, cats: [], tools: [], hbIndex, hbRec, hbRef, hbMN, rowHB, pill, attrib, flagCard, flagsOf, scoreCtx, markIng, imgU, srcName, bandOf, viewHBProduct, load, ext, NF, CAT_ICON });
self.viewCosProduct = function (id, pre, scanned) { return viewHBProduct(String(id), scanned); };
self.viewCosmetics = function (arg) { return viewHBHub(arg); };
self.cosProduct = async function (code) { code = String(code).replace(/\D/g, ''); if (code.length < 8) return null; const r = await hbRec(code).catch(() => null); return r ? { id: r.c, code: r.c, src: 'hb25', name: r.n, brand: r.b, hb: 1 } : null; };
self.loadCos = function () { return hbIndex().then(I => ({ docs: I.docs.filter(d => d.kind === 'b' || window.HB25UI.withClean), cats: I.cats })); };
if (typeof tab19 === 'function') { const t0 = tab19; self.tab19 = function (view) { if (/^(hb|hb-check|hb-about|pfas|prop65)$/.test(view)) return 'browse'; return t0.apply(this, arguments); }; }
const RT = { hb: viewHBHub, 'hb-check': viewHBCheck, 'hb-about': viewHBAbout, pfas: viewPFAS, prop65: viewProp65 };
if (typeof viewHome === 'function') { const vh = viewHome; self.viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i);
  if (RT[v]) { app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim(); return RT[v](i < 0 ? '' : h.slice(i + 1)); } return vh.apply(this, arguments); }; }
if (typeof viewBrowseHub === 'function') { const bh = viewBrowseHub; self.viewBrowseHub = function () { const r = bh.apply(this, arguments);
  const sec = `<div class="sec-h"><h2>Home &amp; Body</h2></div><div class="tools74 hbbr25"><a href="#/hb"><b>Personal care${(window.HB25UI.cats || []).length ? ' &amp; cleaning' : ''}</b><span>Shampoo, sunscreen, toothpaste, checked against official lists</span></a><a href="#/pfas"><b>PFAS in products</b><span>EPA and Minnesota data</span></a>${(window.HB25UI.browse || []).join('')}</div>`;
  const toolsH = app.querySelector('.browse74 .tools74'); if (toolsH && !app.querySelector('.hbbr25')) toolsH.previousElementSibling.insertAdjacentHTML('beforebegin', sec); return r; }; }
if (/^#\/(hb|hb-check|hb-about|pfas|prop65|cos\/|cosmetics|browse$)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(['🧴', 'Home & Body (25.0)', 'Personal-care products, scored on official lists: EPA PFAS, California Prop 65, EU fragrance allergens and formaldehyde releasers, plus California Safe Cosmetics reports. Scan a barcode, search, or paste an ingredient list. It never says "safe": it shows what it found, or that it couldn\'t verify. See Browse → Home & Body.']);
})();
