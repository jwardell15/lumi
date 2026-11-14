/* Lumi 26.0: restaurant meal builder (#/rmeal, #/rmeal/<chain>[/m/<code*qty~...>]) and the additive and dye watch
   (product-page card, two filter chips, #/addwatch). The meal builder uses the chains' own published nutrition already in Lumi and scores the whole meal
   the same way as saved meals (Health on the left, Blood sugar on the right). The watch list lives in js/aw26core.js with a source link on every flag.
   Nothing here calls a food "safe": a clean check says only that no watched additive was found in the ingredient list on file. */
(() => {
'use strict';
const AW = window.AW26; if (!AW) { console.warn('v26: aw26core missing'); return; }
const enc = encodeURIComponent, g1 = v => v == null || isNaN(v) ? '—' : (Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
const slug = s => String(s || '').toLowerCase().replace(/['’®™©]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const poss = c => esc(c) + (/['’]s$/i.test(c) ? '' : /s$/i.test(c) ? '’' : '’s');
const ext = (u, t) => `<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a>`;
const asofFmt = () => { const m = AW.ASOF.match(/^(\d{4})-(\d\d)-(\d\d)$/); return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); };
const shell = (cls, inner) => { app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim(); app.innerHTML = `<section class="${cls} pg13">${inner}</section>`; const h = app.querySelector('h1'); if (h) h.setAttribute('tabindex', '-1'); };

/* =====================  1. RESTAURANT MEAL BUILDER  ===================== */
const ROLES = [['all', 'All'], ['main', 'Mains'], ['side', 'Sides'], ['drink', 'Drinks'], ['dessert', 'Desserts'], ['other', 'Sauces and extras']];
const roleOf = d => { let r = 'other'; try { r = type20(d); } catch { } if (r === 'breakfast') return 'main'; return ['main', 'side', 'drink', 'dessert'].includes(r) ? r : 'other'; };
const chains = () => { const m = new Map(); for (const d of engine.docs) if (d.src === 'rest' && d.brand) m.set(d.brand, (m.get(d.brand) || 0) + 1); return [...m].filter(x => x[1] >= 6).sort((a, b) => a[0].localeCompare(b[0])); };
const chainBy = sl => { for (const [b] of chains()) if (slug(b) === sl) return b; return null; };
async function ready() { try { await loadIndex(); } catch { } try { await loadIndexFull(); } catch { } try { if (typeof ensure22 === 'function') for (let i = 0; i < 4 && await ensure22(); i++); } catch { } }
const MB = { chain: null, items: [], role: 'all', q: '', tok: 0 }; /* items: [{code, q}] */
const keyOf = it => it.code + '*' + it.q;
const hashFor = () => `#/rmeal/${slug(MB.chain)}` + (MB.items.length ? '/m/' + MB.items.map(it => enc(it.code) + '*' + it.q).join('~') : '');
function parseFixed(s) { const out = []; for (const part of String(s || '').split('~')) { if (!part) continue; const i = part.lastIndexOf('*'); const code = decodeURIComponent(i < 0 ? part : part.slice(0, i)); let q = i < 0 ? 1 : parseFloat(part.slice(i + 1)); if (!isFinite(q) || q <= 0) q = 1; q = Math.min(20, Math.round(q * 2) / 2); if (code) out.push({ code, q }); } return out.slice(0, 40); }
function persist() { try { store.set('rmeal26', { chain: MB.chain, items: MB.items }); } catch { } try { history.replaceState(null, '', hashFor()); } catch { } }
const NUTS = [['kcal', 'Calories', ''], ['carbs', 'Total carbs', ' g', 1], ['sugars', 'Sugar', ' g', 1], ['fiber', 'Fiber', ' g'], ['protein', 'Protein', ' g'], ['fat', 'Fat', ' g'], ['sat', 'Saturated fat', ' g'], ['sodiumMg', 'Sodium', ' mg']];
async function mealOf(chain) {
  const docs = MB.items.map(it => ({ it, d: engine.byCode(it.code) })).filter(x => x.d); const ps = await Promise.all(docs.map(x => resolveProduct(x.it.code).catch(() => null)));
  const loaded = docs.map((x, i) => ps[i] ? { x, p: ps[i] } : null).filter(Boolean); const failed = docs.length - loaded.length;
  const items = loaded.map(({ x, p }) => itemFrom241(p, x.it.q, 'rmeal')); const sc = items.length ? mealScore241(items, `${chain} meal`, chain + ' (meal)') : null;
  return { docs, loaded, failed, items, sc }; }
function rowHTML(d) {
  const q = perServ20(d), has = d.net != null; const on = MB.items.find(it => it.code === d.code);
  return `<li class="mi26${on ? ' on' : ''}" data-code="${esc(d.code)}"><div class="mn26"><a href="#/product/${esc(d.code)}"><b>${esc(d.name)}</b></a>
    <small>${has ? `${g1(q.s)} g sugar · ${g1(q.c)} g carbs · ${esc(q.basis)}` : '<span class="na26">No published carb data, so it can\'t be added</span>'}</small></div>
    ${has ? `<span class="ms26">${scores20(d.h, d.score)}</span>` : ''}<button type="button" class="btn sm${on ? '' : ' pri'}" data-add26="${esc(d.code)}" ${has ? '' : 'disabled'} aria-label="${on ? 'Add another ' : 'Add '}${esc(d.name)}">${on ? '+1' : 'Add'}</button></li>`; }
function menuList() {
  const t = MB.q.trim().toLowerCase(); const all = engine.docs.filter(d => d.src === 'rest' && d.brand === MB.chain);
  const cnt = {}; for (const d of all) { const r = roleOf(d); cnt[r] = (cnt[r] || 0) + 1; }
  let L = all.filter(d => (MB.role === 'all' || roleOf(d) === MB.role) && (!t || d.name.toLowerCase().includes(t)));
  L.sort((a, b) => (b.net != null) - (a.net != null) || a.name.localeCompare(b.name));
  return { all, cnt, L, shown: L.slice(0, 80) }; }
function drawMenu() { const box = $('#mm26'); if (!box) return; const { cnt, L, shown, all } = menuList();
  $('#mc26').innerHTML = ROLES.filter(([k]) => k === 'all' || cnt[k]).map(([k, l]) => `<button type="button" class="chip${MB.role === k ? ' on' : ''}" data-role="${k}" aria-pressed="${MB.role === k}">${l}${k === 'all' ? '' : ` <small>${cnt[k]}</small>`}</button>`).join('');
  box.innerHTML = shown.length ? shown.map(rowHTML).join('') : '<li class="small">No menu item matches.</li>';
  $('#mmore26').hidden = L.length <= shown.length; $('#mmore26').textContent = `Showing ${shown.length} of ${L.length}. Type to narrow the list.`; $('#mt26').textContent = `${all.length} ${all.length === 1 ? 'item' : 'items'} on ${poss(MB.chain)} menu in Lumi`; }
async function drawMeal() {
  const box = $('#ym26'); if (!box) return; const tok = ++MB.tok;
  if (!MB.items.length) { box.innerHTML = `<h2>Your meal</h2><p class="small">Pick items from the menu. Add the same item again for a second one. Totals and both scores update as you go.</p><p class="note small">Scores are for the whole meal, using ${poss(MB.chain)} published nutrition.</p>`; return; }
  box.innerHTML = `<h2>Your meal</h2><div class="skel" style="height:160px"></div>`;
  const M = await mealOf(MB.chain); if (tok !== MB.tok || !$('#ym26')) return;
  const T = M.sc ? M.sc.T : {}, miss = M.sc ? [...M.sc.miss] : [];
  const lines = M.loaded.map(({ x, p }) => { const q = perServ20(x.d); return `<li class="yi26"><div class="yn26"><b>${esc(x.d.name)}</b><small>${q ? `${g1(q.s)} g sugar · ${g1(q.c)} g carbs each` : ''}</small></div>
    <div class="qs26" role="group" aria-label="Quantity of ${esc(x.d.name)}"><button type="button" class="btn sm" data-dec26="${esc(x.d.code)}" aria-label="One fewer ${esc(x.d.name)}">−</button><output aria-live="polite">${x.it.q}×</output><button type="button" class="btn sm" data-inc26="${esc(x.d.code)}" aria-label="One more ${esc(x.d.name)}">+</button><button type="button" class="btn sm" data-rm26="${esc(x.d.code)}" aria-label="Remove ${esc(x.d.name)}">✕</button></div></li>`; }).join('');
  const grams = M.sc && M.sc.q && !M.sc.q.meta.perItem ? `${Math.round(M.sc.q.servQ)} g` : '';
  const warns = [T.carbs > 75 ? 'High carbs for one meal' : '', T.sodiumMg > 1500 ? 'Very high sodium' : '', T.sat > 10 ? 'High saturated fat' : ''].filter(Boolean);
  const miss2 = miss.filter(f => f !== 'loading').map(f => (NUTS.find(n => n[0] === f) || [f, f])[1].toLowerCase());
  box.innerHTML = `<h2>Your meal</h2><ul class="yl26">${lines}</ul>
   <div class="sc26"><div class="sck26">${M.sc ? scores20(M.sc.h, M.sc.c) : ''}</div><p class="small">Scores are for this whole meal: ${M.items.length} item${M.items.length === 1 ? '' : 's'}${M.items.reduce((a, i) => a + (i.m || 1), 0) !== M.items.length ? ` (${g1(M.items.reduce((a, i) => a + (i.m || 1), 0))} servings)` : ''}${grams ? `, ${grams} in all` : ''}, as listed by ${esc(MB.chain)}.</p></div>
   <div class="tt26" role="table" aria-label="Meal totals">${NUTS.map(([k, l, u, key]) => `<div role="row" class="${key ? 'key' : ''}"><small role="cell">${l}</small><b role="cell">${T[k] == null ? "couldn't verify" : (k === 'kcal' || k === 'sodiumMg' ? Math.round(T[k]) : g1(T[k])) + (miss.includes(k) ? '+' : '') + u}</b></div>`).join('')}</div>
   ${miss2.length ? `<p class="note small">${esc(MB.chain)} doesn't publish ${esc(miss2.join(', '))} for every item. Those totals (marked +) add up only the items that list them.</p>` : ''}
   ${M.failed ? `<p class="note small">${M.failed} item${M.failed === 1 ? '' : 's'} couldn't be loaded and ${M.failed === 1 ? 'is' : 'are'} not counted. Check your connection and try again.</p>` : ''}
   ${warns.length ? `<p class="wr26">${warns.map(w => `<i>${esc(w)}</i>`).join(' ')}</p>` : ''}
   <div class="actions"><button class="btn pri" id="log26">Log it</button><button class="btn" id="save26">Save to My meals</button><button class="btn" id="plan26">📅 Add to plan</button><button class="btn" id="card26">🖼 Score card</button><button class="btn" id="link26">🔗 Copy link</button><button class="btn" id="clr26">Clear</button></div>
   <p class="small">Numbers are ${poss(MB.chain)} published nutrition per item as served. Restaurant portions vary. Informational only, not medical advice.</p>`;
  const now = () => new Date(), ml = () => (typeof mealFor === 'function' ? mealFor(now()) : 'lunch');
  $('#log26').onclick = () => { const t = now(), m = ml(); M.items.forEach((it, i) => addEntry(M.loaded[i].p, it.grams, it.label, m, t.getTime())); toast(`Logged ${M.items.length} item${M.items.length === 1 ? '' : 's'} to ${MEAL_L[m]}`); };
  $('#save26').onclick = () => { const its = M.items.map((it, i) => ({ pid: it.pid, name: it.name, brand: it.brand || MB.chain, grams: it.grams, label: it.label, n: it.n, score: null })); const ms = savedMeals(); ms.unshift({ id: 'm' + Date.now().toString(36), name: `${MB.chain}: ${M.items.map(i => i.name).join(' + ')}`.slice(0, 90), items: its, used: 0 }); store.set('meals', ms); toast('Saved to My meals'); };
  $('#plan26').onclick = () => planSheet241({ t: `${MB.chain} meal`, src: 'order', items: M.items });
  $('#card26').onclick = () => { if (typeof shareSheet24 !== 'function') return toast("Couldn't open the card"); shareSheet24({ kind: 'meal', title: MB.chain + ' meal', sub: M.items.map(x => x.name).join(' + '), serving: 'Whole meal, as listed by ' + MB.chain, h: M.sc.h, c: M.sc.c, sugar: T.sugars, carbs: T.carbs, warn: warns, url: location.origin + location.pathname + hashFor(), file: 'lumi-' + slug(MB.chain) + '-meal.png' }); };
  $('#link26').onclick = () => { const u = location.origin + location.pathname + hashFor(); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Link copied'), () => prompt('Copy this link', u)); };
  $('#clr26').onclick = () => { MB.items = []; persist(); drawMenu(); drawMeal(); };
}
function change(code, fn) { const i = MB.items.findIndex(it => it.code === code); fn(i); persist(); drawMenu(); drawMeal(); }
async function viewMealBuilder(arg) {
  const parts = String(arg || '').split('/'), sl = parts[0], fixed = parts[1] === 'm' ? parts.slice(2).join('/') : null;
  shell('rmb26', '<h1>Restaurant meal builder</h1><div class="skel" style="height:220px"></div>'); await ready(); if (!/^#\/rmeal/.test(location.hash)) return;
  if (!sl) return hub();
  const chain = chainBy(sl); if (!chain) return hub(`Lumi has no menu for “${esc(sl)}”.`);
  document.title = `Meal builder at ${chain} — Lumi`;
  const saved = store.get('rmeal26', null);
  MB.chain = chain; MB.role = 'all'; MB.q = ''; MB.items = fixed != null ? parseFixed(fixed).filter(it => engine.byCode(it.code)) : (saved && saved.chain === chain && Array.isArray(saved.items) ? saved.items.filter(it => engine.byCode(it.code)).slice(0, 40) : []);
  shell('rmb26', `<a class="back25" href="#/rmeal">‹ All chains</a><h1>Meal builder at ${esc(chain)}</h1>
   <p class="lead">Pick as many items as you like from ${poss(chain)} own published nutrition. Lumi adds up sugar, total carbs and the other nutrients, and scores the whole meal.</p>
   <div class="rg26"><section class="card mm26c" aria-label="Menu"><div class="fx-h"><h2>Menu</h2><small id="mt26"></small></div>
     <label class="fl11"><span class="vh">Search ${esc(chain)} menu</span><input id="mq26" type="search" autocomplete="off" placeholder="Search the menu" aria-label="Search the ${esc(chain)} menu"></label>
     <div class="chips26" id="mc26" role="group" aria-label="Menu section"></div><ul class="ml26" id="mm26"></ul><p class="small" id="mmore26" hidden></p></section>
    <aside class="card ym26c" id="ym26" aria-live="polite"></aside></div>
   <p class="foot">Only ${poss(chain)} own published numbers are used. Items without a published carb number can't be added. <a class="lnk" href="#/order/${slug(chain)}">Want Lumi to propose meals under your targets instead? ›</a></p>`);
  drawMenu(); drawMeal(); persist();
  $('#mq26').oninput = e => { MB.q = e.target.value; drawMenu(); };
  $('#mc26').onclick = e => { const b = e.target.closest('[data-role]'); if (!b) return; MB.role = b.dataset.role; drawMenu(); };
  $('#mm26').onclick = e => { const b = e.target.closest('[data-add26]'); if (!b) return; const code = b.dataset.add26; change(code, i => { if (i < 0) MB.items.push({ code, q: 1 }); else MB.items[i].q = Math.min(20, MB.items[i].q + 1); }); };
  $('#ym26').onclick = e => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset; const code = d.inc26 || d.dec26 || d.rm26; if (!code) return;
    change(code, i => { if (i < 0) return; if (d.inc26) MB.items[i].q = Math.min(20, MB.items[i].q + 1); else if (d.dec26) { MB.items[i].q -= 1; if (MB.items[i].q < 1) MB.items.splice(i, 1); } else MB.items.splice(i, 1); }); }; }
function hub(msg) { document.title = 'Restaurant meal builder — Lumi'; const L = chains(), rec = store.get('rmeal26', null);
  shell('rmb26 oh24', `<h1>Restaurant meal builder</h1><p class="lead">Pick several items from a chain's menu and see the whole meal: sugar, total carbs, calories, protein and more, with Health and Blood sugar scores for the meal. Uses each chain's own published nutrition.</p>
   ${msg ? `<p class="note small" role="status">${msg}</p>` : ''}${rec && rec.chain && rec.items && rec.items.length ? `<p class="card">Pick up where you left off: <a class="lnk" href="#/rmeal/${slug(rec.chain)}">${esc(rec.chain)} · ${rec.items.length} item${rec.items.length === 1 ? '' : 's'} ›</a></p>` : ''}
   <label class="fl11"><span>Find a chain</span><input id="rh26q" type="search" autocomplete="off" placeholder="e.g. Chick-fil-A, Panera, Taco Bell"></label>
   <ul class="oh24l" id="rh26l"></ul><p class="foot small">${L.length} chains with published nutrition in Lumi. <a class="lnk" href="#/order">Meals proposed under your targets ›</a></p>`);
  const paint = q => { const t = q.trim().toLowerCase(); const S = L.filter(([b]) => !t || b.toLowerCase().includes(t)); $('#rh26l').innerHTML = S.slice(0, t ? 60 : 400).map(([b, n]) => `<li><a href="#/rmeal/${slug(b)}"><span>${esc(b)}</span><small>${n} items ›</small></a></li>`).join('') || '<li class="small">No chain matches.</li>'; };
  $('#rh26q').oninput = e => paint(e.target.value); paint(''); }
self.viewMealBuilder26 = viewMealBuilder;

/* =====================  2. ADDITIVE AND DYE WATCH  ===================== */
const TIERC = { ban: 'ban26', dye: 'dye26', watch: 'wat26' };
const TIERL = { ban: 'Banned, revoked or not authorised somewhere', dye: 'Synthetic dye', watch: 'Under FDA review' };
const srcLinks = keys => keys.map(k => AW.S[k] ? ext(AW.S[k][1], AW.S[k][0]) : '').filter(Boolean).join(' · ');
function hitHTML(h, open) { return `<details class="aw26h ${TIERC[h.tier]}"${open ? ' open' : ''}><summary><b>${esc(h.label)}</b><i class="tg26 ${TIERC[h.tier]}">${TIERL[h.tier]}</i><span class="found26">on the label as: ${esc(h.terms.join(', '))}</span></summary>
  <ul class="fc26">${h.facts.map(f => `<li><b>${esc(f[0])}:</b> ${esc(f[1])}<span class="sr26">${srcLinks(f[2])}</span></li>`).join('')}</ul></details>`; }
function watchCard(p) {
  const r = AW.analyze(p.ing || ''); const head = '<h2>Additive and dye watch</h2>';
  if (r.status === 'none') return `<div class="card aw26" id="aw26">${head}<p class="small na26"><b>Couldn't verify.</b> Lumi has no ingredient list for this item, so it couldn't check it against the additive watch list. That doesn't mean it has none.</p><p class="small"><a class="lnk" href="#/addwatch">What the watch list covers ›</a></p></div>`;
  if (r.status === 'lang') return `<div class="card aw26" id="aw26">${head}<p class="small na26"><b>Couldn't verify.</b> The ingredient list isn't in English, so Lumi can't read it reliably.</p></div>`;
  if (!r.hits.length) return `<div class="card aw26 clr26" id="aw26">${head}<p class="small"><b>None of the ${AW.W.length} watched additives found</b> in the ingredient list on file. This checks that list only, and lists can be incomplete or out of date, so read the package. <a class="lnk" href="#/addwatch">What's on the watch list ›</a></p></div>`;
  const n = r.hits.length; const order = { ban: 0, dye: 1, watch: 2 }; const hits = r.hits.slice().sort((a, b) => order[a.tier] - order[b.tier]);
  return `<div class="card aw26 hit26" id="aw26" role="region" aria-label="Additive and dye watch">${head}<p class="small awn26"><b>${n} watched additive${n === 1 ? '' : 's'} found</b> in the ingredient list on file. Each flag below says what FDA, California or the EU has done, with the official source. A flag is not a recall and not a statement that this product is unsafe.</p>
   ${hits.map((h, i) => hitHTML(h, i < 3)).join('')}
   <p class="small">Official sources read on ${esc(asofFmt())}; rules change. <a class="lnk" href="#/addwatch">Full watch list ›</a></p></div>`; }
async function prod26() { const m = location.hash.match(/^#\/product\/([^/?]+)/); if (!m || $('#aw26')) return; const foot = app.querySelector('p.foot'); if (!app.classList.contains('prodv') || !foot) return;
  const id = decodeURIComponent(m[1]); let p = memo.get(id); if (!p) { try { p = await resolveProduct(id); } catch { return; } } if (!p || $('#aw26') || location.hash.indexOf(m[1]) < 0) return;
  if ((p.src === 'custom' && !p.ing) || p.src === 'rest' || /^(r-|ms-)/.test(p.id || '')) return; /* restaurant menu items carry no ingredient list */
  const html = watchCard(p); const iw = $('#iw22'); if (iw) iw.insertAdjacentHTML('beforebegin', html); else { const ingCard = [...app.querySelectorAll('.card')].find(c => c.querySelector(':scope > .ing')); if (ingCard) ingCard.insertAdjacentHTML('beforebegin', html); else foot.insertAdjacentHTML('beforebegin', html); }
  const r = AW.analyze(p.ing || ''); const top = app.querySelector('.card .actions');
  if (top && r.status === 'ok' && r.hits.some(h => h.tier !== 'watch') && !$('#awj26')) { const n = r.hits.filter(h => h.tier !== 'watch').length; const anchor = $('#iwj22') || top;
    anchor.insertAdjacentHTML('beforebegin', `<button type="button" class="awj26" id="awj26"><i class="tg26 ban26">⚑ Additive watch</i><span>${n} flag${n === 1 ? '' : 's'}: ${esc(r.hits.filter(h => h.tier !== 'watch').slice(0, 3).map(h => h.label).join(', '))}${n > 3 ? '…' : ''} ↓</span></button>`); $('#awj26').onclick = () => $('#aw26').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
function viewAddWatch() { document.title = 'Additive and dye watch — Lumi';
  const tiers = ['ban', 'dye', 'watch'];
  shell('awp26', `<a class="back25" href="#/browse">‹ Browse</a><h1>Additive and dye watch</h1>
   <p class="lead">Lumi checks a food's ingredient list for additives and dyes that FDA, California or the EU has banned, revoked, phased out, restricted or put a warning label on. Every flag shows the rule and links to the official source.</p>
   <div class="card"><h2>How it works</h2><ul class="hw26"><li>The check reads only the <b>ingredient list on file</b>. If there is no list, Lumi says it <b>couldn't verify</b>. Lumi never gives a food a safe or unsafe verdict.</li><li>A flag means a rule or an agency action exists. It is not a recall, and it is not a finding about one product.</li><li>In Browse and search, the filter chips <b>No banned additives</b> and <b>No synthetic dyes</b> hide products that have a flag. Products with no ingredient list are hidden and counted too, so you never see an unchecked product treated as clean.</li><li>Official pages were read on <b>${esc(asofFmt())}</b>. Laws and orders change, so check the source link for the latest.</li></ul></div>
   ${tiers.map(t => `<h2 class="h2s26">${TIERL[t]}</h2><div class="awl26">${AW.W.filter(w => w.tier === t).map(w => `<div class="card aw26 ${TIERC[t]}"><h3>${esc(w.label)}</h3><ul class="fc26">${w.facts.map(f => `<li><b>${esc(f[0])}:</b> ${esc(f[1])}<span class="sr26">${srcLinks(f[2])}</span></li>`).join('')}</ul></div>`).join('')}</div>`).join('')}
   <p class="foot small">Not medical or legal advice. Only the FDA, California and EU rules above are covered; other states and countries have their own.</p>`); }
self.viewAddWatch26 = viewAddWatch;

/* ---- list filter chips: sidecar data/aw26/<tier>.json attached to the index docs like data/f22 ---- */
const A26 = { tiers: new Map(), val: new Map() };
const st26 = () => { const s = store.get('f26', {}); return { ban: !!s.ban, dye: !!s.dye }; };
function attach26(j) { const D = engine.docs; if (!j || !j.u || !j.n) return false; let st = -1;
  for (let i = 0; i < D.length; i++) if (D[i].code === j.c0 && D[i + j.n - 1] && D[i + j.n - 1].code === j.c1) { st = i; break; }
  if (st < 0) return false; const hm = new Map(); for (let i = 0; i < j.h.length; i += 2) hm.set(j.h[i], j.h[i + 1]);
  for (let i = 0; i < j.n; i++) { const d = D[st + i]; d.aw26u = j.u[i]; d.aw26m = hm.get(i) || 0; } return true; }
function ensure26() { const want = TIERS22().filter(t => !A26.tiers.has(t) || A26.tiers.get(t).ok === false); if (!want.length) return Promise.resolve(false);
  return Promise.all(want.map(t => { let e = A26.tiers.get(t); if (!e) { e = { p: getData(`data/aw26/${t}.json`).catch(() => null), ok: null }; A26.tiers.set(t, e); } return e.p.then(j => { if (e.ok) return false; e.ok = attach26(j); return e.ok; }); })).then(r => r.some(Boolean)); }
/* a list item -> {st:'clear'|'hit'|'unk', mask}; 'unk' = no ingredient list, not English, or the sidecar isn't loaded yet */
function awOf(it) { const id = it.id || it.code; const d = codeMap22().get(id);
  if (d && d.aw26u !== undefined) { const u = d.aw26u; return u === 'x' ? { st: 'hit', mask: d.aw26m } : u === '.' ? { st: 'clear', mask: 0 } : { st: 'unk', mask: 0 }; }
  const pm = typeof memo !== 'undefined' ? memo.get(id) : null; if (pm && pm.n) { const r = AW.analyze(pm.ing || ''); return r.status === 'ok' ? { st: r.mask ? 'hit' : 'clear', mask: r.mask } : { st: 'unk', mask: 0 }; }
  return { st: 'unk', mask: 0 }; }
{ const e0 = ensure22; ensure22 = function () { return Promise.resolve(e0.apply(this, arguments)).then(ch => ensure26().then(c2 => ch || c2).catch(() => ch)); }; }
/* the filter runs as an outer layer around renderResults: it removes flagged and unchecked items from rs.items, then the 22.0 filters and the list draw as usual */
function awTest(it, a) { const x = awOf(it); if (x.st === 'unk') return 'ing'; if (a.ban && (x.mask & AW.BANMASK)) return false; if (a.dye && (x.mask & AW.DYEMASK)) return false; return true; }
if (typeof renderResults === 'function') { const rr26 = renderResults; renderResults = function () {
  const a = st26(); if (!rs || !$('#res') || (!a.ban && !a.dye)) { const n = $('#f26n'); if (n) n.innerHTML = ''; return rr26.apply(this, arguments); }
  try { kick22(); } catch { }
  const all = rs.items, keep = new Map(); let flagged = 0, unk = 0; for (const [k, it] of all) { const r = awTest(it, a); if (r === true) keep.set(k, it); else if (r) unk++; else flagged++; }
  let out; rs.items = keep; try { out = rr26.apply(this, arguments); } finally { rs.items = all; }
  const n = $('#f26n'); if (n) n.innerHTML = `<b>Additive watch:</b> ${flagged.toLocaleString()} hidden with a flag${unk ? ` · ${unk.toLocaleString()} hidden: no ingredient list, couldn't verify` : ''}${Object.values(rs.src || {}).includes('load') ? ' · still loading' : ''} <button type="button" class="f22x" id="f26x">Clear additive filters</button>`;
  const x = $('#f26x'); if (x) x.onclick = () => { store.set('f26', {}); syncBar22(); renderResults(); };
  return out; }; }
const chip26 = (k, label, on, title) => `<button type="button" class="chip f22c f26c${on ? ' on' : ''}" data-k26="${k}" aria-pressed="${on}" title="${esc(title)}">${label}</button>`;
function bar26() { const row = app.querySelector('#f22 .f22r'); if (!row || row.querySelector('.f26c')) return; const s = st26();
  row.insertAdjacentHTML('beforeend', chip26('ban', 'No banned additives', s.ban, 'Hides products whose ingredient list has an additive banned, revoked or not authorised by FDA, California or the EU') + chip26('dye', 'No synthetic dyes', s.dye, 'Hides products whose ingredient list names a synthetic dye or says artificial color'));
  row.querySelectorAll('.f26c').forEach(b => b.onclick = () => { const t = st26(); t[b.dataset.k26] = !t[b.dataset.k26]; store.set('f26', t); F22.lim = 40; syncBar22(); renderResults(); });
  if (!$('#f26n')) $('#f22').insertAdjacentHTML('beforeend', '<div class="f26n" id="f26n" aria-live="polite"></div>');
  const x = $('#f22x'); if (x) x.addEventListener('click', () => { store.set('f26', {}); }, true);
  const det = app.querySelector('#f22 .f22i p'); if (det && !det.dataset.aw26) { det.dataset.aw26 = '1'; det.insertAdjacentHTML('beforeend', ' No banned additives and No synthetic dyes read the ingredient list and use the Additive and dye watch list (<a class="lnk" href="#/addwatch">see it</a>); products without an ingredient list are hidden and counted.'); } }
{ const b0 = bar22; bar22 = function () { const r = b0.apply(this, arguments); try { bar26(); } catch (e) { console.warn(e); } return r; }; }
{ const s0 = syncBar22; syncBar22 = function () { const r = s0.apply(this, arguments); try { const s = st26(); app.querySelectorAll('#f22 .f26c').forEach(b => { const on = !!s[b.dataset.k26]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); } catch { } return r; }; }

/* =====================  3. integration  ===================== */
if (typeof tab19 === 'function') { const t0 = tab19; tab19 = function (view) { if (view === 'rmeal' || view === 'addwatch') return 'browse'; return t0.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh = viewHome; viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i);
  if (v === 'rmeal') return viewMealBuilder(i < 0 ? '' : h.slice(i + 1)); if (v === 'addwatch') return viewAddWatch(); return vh.apply(this, arguments); }; }
if (typeof viewBrowseHub === 'function') { const bh = viewBrowseHub; viewBrowseHub = function () { const r = bh.apply(this, arguments); const t = app.querySelector('.tools74');
  if (t && !t.querySelector('[href="#/rmeal"]')) t.insertAdjacentHTML('afterbegin', '<a href="#/rmeal"><b>Restaurant meal builder</b><span>Pick several items at a chain and total the whole meal</span></a><a href="#/addwatch"><b>Additive and dye watch</b><span>What FDA, California and the EU have banned or restricted</span></a>'); return r; }; }
{ let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { prod26(); } catch (e) { console.warn(e); }
  const o = $('#ord24l'); if (o && !$('#rml26')) { const m = location.hash.match(/^#\/product\/([^/?]+)/), a = o.getAttribute('href').replace('#/order/', ''); if (m) o.insertAdjacentHTML('afterend', ` <a class="btn sm" id="rml26" href="#/rmeal/${a}/m/${m[1]}*1">➕ Start a meal with this item</a>`); } }); }).observe(app, { childList: true, subtree: true }); }
setTimeout(() => { try { if ($('#res') && rs) { bar22(); syncBar22(); } kick22(); prod26(); } catch (e) { console.warn(e); } }, 0);
if (/^#\/(rmeal|addwatch)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(['🍽️', 'Restaurant meal builder and additive watch (26.0)', 'Pick several items from a chain\'s own published menu nutrition and see the whole meal: sugar, total carbs, calories, protein and more, with Health and Blood sugar scores for the meal. You can log it, save it, add it to your plan or share a score card. Product pages now have an Additive and dye watch: ingredients that FDA, California or the EU has banned, revoked, phased out or restricted (like Red 3, brominated vegetable oil, potassium bromate, propylparaben and titanium dioxide) are flagged with the rule and a link to the official source. Browse and search get two filters, No banned additives and No synthetic dyes. A check reads only the ingredient list on file; when there is none, Lumi says it couldn\'t verify.']);
})();
