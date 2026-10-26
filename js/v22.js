'use strict';
/* Lumi 22.0: smart filters (Browse, search results, chain menus; Near you / menu scan rows get warning badges) and
   ingredient warnings (product pages, list-card badges, Compare). Loaded after v212.js; the matcher is js/ingwarn22.js.
   Thresholds are per serving. Items missing a nutrient a filter needs are hidden and counted, never treated as zero.
   Warnings are display-only: no score formula changes (hydrogenated oils were already in the Health score). */

/* ---------- 0. data: per-tier sidecar (protein, fiber, sat fat per 100 g + warning mask) ---------- */
const F22 = { tiers: new Map(), byCode: new Map(), seen: 0, val: new Map() };
const TIERS22 = () => { const t = []; try { if (tier0) t.push('g', '0'); if (tier1) t.push('1'); if (tier2) t.push('2'); if (tierX) for (let i = 3; i < ((META && META.tiers) || 11); i++) t.push(String(i)); } catch {} return t; };
function codeMap22() { const D = engine.docs; for (let i = F22.seen; i < D.length; i++) if (!F22.byCode.has(D[i].code)) F22.byCode.set(D[i].code, D[i]); F22.seen = D.length; return F22.byCode; }
function attach22(t, j) { const D = engine.docs; if (!j || !j.a || !j.n) return false; let st = -1;
  for (let i = 0; i < D.length; i++) if (D[i].code === j.c0 && D[i + j.n - 1] && D[i + j.n - 1].code === j.c1) { st = i; break; }
  if (st < 0) return false; const a = j.a, q = v => v < 0 ? null : v / 10;
  for (let i = 0; i < j.n; i++) { const d = D[st + i]; d.p22 = q(a[i * 4]); d.f22 = q(a[i * 4 + 1]); d.s22 = q(a[i * 4 + 2]); d.w22 = a[i * 4 + 3]; }
  return true; }
let ensure22p = null;
function ensure22() { /* fetch sidecars for loaded tiers, attach to docs; resolves when nothing new */
  const want = TIERS22().filter(t => !F22.tiers.has(t) || F22.tiers.get(t).ok === false);
  if (!want.length) return Promise.resolve(false);
  return Promise.all(want.map(t => { let e = F22.tiers.get(t); if (!e) { e = { p: getData(`data/f22/${t}.json`).catch(() => null), ok: null }; F22.tiers.set(t, e); }
    return e.p.then(j => { if (e.ok) return false; e.ok = attach22(t, j); return e.ok; }); })).then(r => r.some(Boolean));
}
function kick22() { if (ensure22p) return; ensure22p = ensure22().then(ch => { ensure22p = null; if (ch) { if (active22(st22()) && rs && $('#res')) renderResults(); badges22(true); } }).catch(() => { ensure22p = null; }); }
if (typeof notifyTier === 'function') { const nt22 = notifyTier; notifyTier = function () { const r = nt22.apply(this, arguments); setTimeout(kick22, 0); return r; }; }

/* per-serving numbers for a list item: {k (serving factor), basis, s, c, p, f, sat, w, meal}. null fields = not on the label */
function val22(it) {
  const id = it.id || it.code; if (F22.val.has(id)) return F22.val.get(id);
  let d = codeMap22().get(id), o = null; const pm = typeof memo !== 'undefined' ? memo.get(id) : null;
  if (d && (d.p22 !== undefined || !pm)) { const q = perServ20(d); const ok = !!q && q.basis !== 'per 100 g';
    o = { k: ok ? q.k : null, basis: ok ? q.basis : null, s: ok ? q.s : null, c: ok ? q.c : null, p: ok && d.p22 != null ? d.p22 * q.k : null, f: ok && d.f22 != null ? d.f22 * q.k : null,
      sat: ok && d.s22 != null ? d.s22 * q.k : null, s100: d.s22, w: d.w22 === undefined ? null : d.w22, meal: d.src === 'rest' && ['main', 'breakfast'].includes(type20(d)), known: d.p22 !== undefined };
  } else if (pm && pm.n) { const sb = it.sb == null ? -1 : it.sb, k = it.sg > 0 && sb >= 0 && (sb & 3) !== 3 ? it.sg / 100 : null, n = pm.n, m = v => k == null || v == null ? null : v * k;
    o = { k, basis: k == null ? null : (sb & 3) === 1 ? 'per item' : `per serving (${Math.round(it.sg)} ${(sb & 4) ? 'ml' : 'g'})`, s: m(n.sugars), c: m(n.carbs), p: m(n.protein), f: m(n.fiber), sat: m(n.sat), s100: n.sat,
      w: LumiWarn.analyze(pm.ing || '').mask, meal: false, known: true };
  }
  if (o && o.known) F22.val.set(id, o); return o;
}

/* ---------- 1. smart filters ---------- */
const TH22 = { sug: [5, 10], carb: [15, 30, 45], pro: 15, proMeal: 20, fib: 5, sat: 1 };
const SORT22 = [['', 'Default'], ['bs', 'Best Blood sugar'], ['h', 'Best Health'], ['sug', 'Lowest sugar'], ['carb', 'Lowest carbs'], ['pro', 'Highest protein']];
const st22 = () => { const s = store.get('f22', {}); return { sug: +s.sug || 0, carb: +s.carb || 0, pro: !!s.pro, fib: !!s.fib, sat: !!s.sat, clean: !!s.clean, sort: s.sort || '' }; };
const active22 = F => !!(F.sug || F.carb || F.pro || F.fib || F.sat || F.clean || F.sort);
const nf22 = F => (F.sug ? 1 : 0) + (F.carb ? 1 : 0) + F.pro + F.fib + F.sat + F.clean;
const MISS22 = { serving: 'missing serving size', sugar: 'missing sugar data', carbs: 'missing carb data', protein: 'missing protein data', fiber: 'missing fiber data', sat: 'missing saturated fat data', ing: 'no ingredient list', data: 'no nutrition data' };
/* true = passes; false = fails a threshold; string = hidden because data needed for an active filter is missing */
function test22(it, F) {
  if (!nf22(F)) return true; const v = val22(it); if (!v) return 'data';
  const need = [];
  if (F.sug || F.carb || F.pro || F.fib || F.sat) { if (v.k == null) return F.clean && v.w != null && v.w >= 0 && !LumiWarn.clean(v.w) ? false : 'serving'; }
  if (F.sug) { if (v.s == null) need.push('sugar'); else if (!(v.s < F.sug)) return false; }
  if (F.carb) { if (v.c == null) need.push('carbs'); else if (!(v.c < F.carb)) return false; }
  if (F.pro) { if (v.p == null) need.push('protein'); else if (!(v.p >= (v.meal ? TH22.proMeal : TH22.pro))) return false; }
  if (F.fib) { if (v.f == null) need.push('fiber'); else if (!(v.f >= TH22.fib)) return false; }
  if (F.sat) { if (v.meal ? v.s100 == null : v.sat == null) need.push('sat'); else if (!(v.meal ? v.s100 <= TH22.sat : v.sat <= TH22.sat)) return false; }
  if (F.clean) { if (v.w == null || v.w < 0) need.push('ing'); else if (!LumiWarn.clean(v.w)) return false; }
  return need.length ? need[0] : true;
}
/* the existing toolbar filters (same rules as renderResults), so counts and the sorted list match what's shown */
function base22(items) { const f = store.get('filters', {}); const grpOf = i => i.src === 'rest' || i.src === 'chain' ? 'rest' : i.src === 'whole' ? 'whole' : 'prod';
  if (rs && rs.live && (rs.group || 'all') !== 'all') items = items.filter(i => grpOf(i) === rs.group);
  if (f.good) items = items.filter(i => i.score >= 50); if (f.healthy) items = items.filter(i => i.h >= 50); if (f.low) items = items.filter(i => i.net != null && i.net <= 10);
  try { if (f.hide || prefs().hide) items = items.filter(i => !conflicts(i)); } catch {} if (f.ready && typeof readyToEat === 'function') items = items.filter(readyToEat); if (f.photo) items = items.filter(i => !!i.img); if (f.nobad) items = items.filter(i => !i.bad);
  return items; }
function sortVal22(it, k) { if (k === 'bs') return it.score; if (k === 'h') return it.h; const v = val22(it); if (!v || v.k == null) return null; return k === 'sug' ? v.s : k === 'carb' ? v.c : k === 'pro' ? v.p : null; }
function sort22(items, k) { const lo = k === 'sug' || k === 'carb'; const a = [], miss = [];
  for (const it of items) { const v = sortVal22(it, k); if (v == null) miss.push(it); else a.push([v, it]); }
  a.sort((x, y) => (lo ? x[0] - y[0] : y[0] - x[0]) || ((y[1].score ?? -1) - (x[1].score ?? -1)) || ((y[1].rel || 0) - (x[1].rel || 0)));
  return { list: a.map(x => x[1]), miss }; }
const chip22 = (k, v, label, on, title) => `<button type="button" class="chip f22c${on ? ' on' : ''}" data-k="${k}" data-v="${v}" aria-pressed="${on}"${title ? ` title="${esc(title)}"` : ''}>${label}</button>`;
function barHTML22() { const F = st22();
  return `<section class="f22" id="f22" aria-label="Smart filters"><div class="f22h"><b>${ICF22}Smart filters</b><span class="f22per">per serving</span><span class="f22sp"></span>
    <label class="f22s"><span>Sort</span><select id="f22sort" aria-label="Sort results">${SORT22.map(([v, l]) => `<option value="${v}"${F.sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
  <div class="f22r" role="group" aria-label="Filters">
    ${TH22.sug.map(x => chip22('sug', x, `Sugar &lt;${x} g`, F.sug === x, `Under ${x} g sugar per serving`)).join('')}
    ${TH22.carb.map(x => chip22('carb', x, `Carbs &lt;${x} g`, F.carb === x, `Under ${x} g total carbs per serving`)).join('')}
    ${chip22('pro', 1, 'High protein', F.pro, '15 g or more per serving (20 g for restaurant meals)')}${chip22('fib', 1, 'High fiber', F.fib, '5 g or more per serving')}
    ${chip22('sat', 1, 'Low sat fat', F.sat, '1 g or less per serving (restaurant meals: 1 g or less per 100 g)')}${chip22('clean', 1, 'No warnings', F.clean, 'Ingredient list checked, no added sugar and no caution or avoid flags')}</div>
  <div class="f22n" aria-live="polite"><span id="f22n"></span><button type="button" class="f22x" id="f22x"${active22(F) ? '' : ' hidden'}>Clear filters</button></div>
  <details class="f22i"><summary>How these filters work</summary><p class="small">All amounts are per serving, from the label or the chain's own nutrition data. Sugar &lt;5 / &lt;10 g and carbs &lt;15 / &lt;30 / &lt;45 g mean less than that amount. High protein: 15 g or more (20 g for restaurant meals). High fiber: 5 g or more (the FDA's "high fiber" level). Low sat fat: 1 g or less (the FDA's "low saturated fat" level; for restaurant meals, 1 g or less per 100 g). No warnings: the ingredient list was checked and has no added sugar and nothing flagged caution or avoid (info notes like MSG or erythritol don't count). Filters combine. Items missing a number a filter needs are hidden and counted, never treated as zero.</p></details></section>`; }
const ICF22 = '<svg class="i22" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
function bar22() { if ($('#f22') || !$('#res')) return; const t = app.querySelector('.tools'); if (!t) return; t.insertAdjacentHTML('afterend', barHTML22());
  const set = (fn) => { const s = store.get('f22', {}); fn(s); store.set('f22', s); F22.lim = 40; syncBar22(); renderResults(); };
  app.querySelectorAll('#f22 .f22c').forEach(b => b.onclick = () => set(s => { const k = b.dataset.k, v = +b.dataset.v; if (k === 'sug' || k === 'carb') s[k] = (+s[k] === v ? 0 : v); else s[k] = !s[k]; }));
  $('#f22sort').onchange = e => set(s => { s.sort = e.target.value; });
  $('#f22x').onclick = () => { store.set('f22', {}); F22.lim = 40; syncBar22(); renderResults(); };
  document.querySelectorAll('#sort button').forEach(b => b.addEventListener('click', () => { const s = store.get('f22', {}); if (s.sort) { s.sort = ''; store.set('f22', s); syncBar22(); renderResults(); } }));
}
function syncBar22() { const F = st22(); app.querySelectorAll('#f22 .f22c').forEach(b => { const k = b.dataset.k, v = +b.dataset.v, on = k === 'sug' || k === 'carb' ? F[k] === v : !!F[k]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  const s = $('#f22sort'); if (s) s.value = F.sort; const x = $('#f22x'); if (x) x.hidden = !active22(F);
  if (F.sort) document.querySelectorAll('#sort button').forEach(b => b.classList.remove('on')); else { const cur = store.get('sort', 'rel'); document.querySelectorAll('#sort button').forEach(b => b.classList.toggle('on', b.dataset.s === cur)); } }
if (typeof renderResults === 'function') { const rr22 = renderResults; renderResults = function () {
  if (!rs || !$('#res')) return rr22.apply(this, arguments);
  try { bar22(); kick22(); } catch (e) { console.warn(e); }
  const F = st22(); if (!active22(F)) { const n = $('#f22n'); if (n) n.textContent = ''; return rr22.apply(this, arguments); }
  const all = rs.items, keep = new Map(), miss = {}; let fail = 0;
  for (const [k, it] of all) { const r = test22(it, F); if (r === true) keep.set(k, it); else if (r) miss[r] = (miss[r] || 0) + 1; else fail++; }
  let out; rs.items = keep; try { out = rr22.apply(this, arguments); } finally { rs.items = all; }
  const pending = Object.values(rs.src || {}).includes('load');
  if (!keep.size && all.size && !pending) $('#res').innerHTML = `<div class="empty">${MASCOT(96, 'big sad')}<b>No matches with these filters</b>Try turning off a filter or tap Clear filters.</div>`;
  const shown = base22([...keep.values()]); let tail = '';
  if (F.sort && shown.length) { const { list, miss: sm } = sort22(shown, F.sort), lim = F22.lim || 40, L = list.concat(sm);
    const sl = SORT22.find(x => x[0] === F.sort)[1].toLowerCase();
    $('#res').innerHTML = `<div class="list">${L.slice(0, lim).map(rowHTML).join('')}</div>${L.length > lim ? `<button class="more" id="more">Show more (${L.length - lim})</button>` : ''}${pending ? '<div class="small" style="text-align:center;margin-top:10px">Still checking other sources…</div>' : ''}`;
    if ($('#more')) $('#more').onclick = () => { F22.lim = lim + 40; renderResults(); };
    if (sm.length) tail = ` · ${sm.length} without ${F.sort === 'pro' ? 'protein' : F.sort === 'sug' ? 'sugar' : F.sort === 'carb' ? 'carb' : 'a score'} data listed last`;
    try { if (typeof searchSwaps20 === 'function') searchSwaps20(); } catch {} }
  const n = $('#f22n'), hid = Object.entries(miss).sort((a, b) => b[1] - a[1]);
  if (n) n.innerHTML = nf22(F) ? `<b>${shown.length.toLocaleString()} match${shown.length === 1 ? '' : 'es'}</b>${hid.length ? ' · ' + hid.slice(0, 3).map(([r, c]) => `${c.toLocaleString()} hidden: ${MISS22[r]}`).join(' · ') : ''}${tail}${pending ? ' · still loading' : ''}`
    : `Sorted by ${SORT22.find(x => x[0] === F.sort)[1].toLowerCase()}${tail}`;
  setTimeout(() => badges22(), 0);
  return out; }; }
{ const rsh22 = resultsShell; resultsShell = function () { F22.lim = 40; const r = rsh22.apply(this, arguments); try { bar22(); syncBar22(); } catch (e) { console.warn(e); } return r; }; }

/* ---------- 2. ingredient warnings: badges on list cards ---------- */
const SEVC22 = ['inf', 'cau', 'avo'];
function badgeHTML22(mask, max = 2) { const b = LumiWarn.badges(mask); if (!b.length) return '';
  return `<span class="wb22" title="Ingredient warnings: ${esc(b.map(x => x.label).join(', '))}">${b.slice(0, max).map(x => `<i class="w22 ${SEVC22[x.lv]}">${x.lv === 2 ? '⛔' : '⚠'} ${esc(x.label)}</i>`).join('')}${b.length > max ? `<i class="w22 more">+${b.length - max}</i>` : ''}</span>`; }
function badges22() { try { const rows = app.querySelectorAll('a.row[href^="#/product/"], li.mr211'); if (!rows.length) return;
  for (const r of rows) { if (r.dataset.w22 === 'x' || r.querySelector('.wb22')) continue; const a = r.matches('a') ? r : r.querySelector('a[href^="#/product/"]'); if (!a) continue; const id = decodeURIComponent(a.getAttribute('href').slice(10));
    const v = val22({ id }); if (!v || v.w == null) continue; const h = badgeHTML22(v.w); if (!h) { r.dataset.w22 = 'x'; continue; }
    const t = r.querySelector('.t') || r.querySelector('.mt211'); if (t) t.insertAdjacentHTML('beforeend', h); } } catch (e) { console.warn(e); } }

/* ---------- 3. product page: warnings card next to the ingredients ---------- */
function warnCard22(p) { const r = LumiWarn.analyze(p.ing || '');
  if (r.status === 'none') return `<div class="card iw22" id="iw22"><h2>Ingredient warnings</h2><p class="small na22">Ingredients not available. Lumi has no ingredient list for this item, so it couldn't check for added sugars, oils or additives. That doesn't mean there are none.</p></div>`;
  if (r.status === 'lang') return `<div class="card iw22" id="iw22"><h2>Ingredient warnings</h2><p class="small na22">Couldn't check: the ingredient list isn't in English, so Lumi can't read it reliably.</p></div>`;
  const L = r.list, nC = L.filter(w => w.lv > 0).length;
  const head = nC ? `${nC} warning${nC === 1 ? '' : 's'}${L.length > nC ? ` and ${L.length - nC} note${L.length - nC === 1 ? '' : 's'}` : ''}` : L.length ? `No warnings, ${L.length} note${L.length === 1 ? '' : 's'}` : 'No warnings';
  const lab = { info: 'Note', caution: 'Caution', avoid: 'Avoid' };
  return `<div class="card iw22" id="iw22"><div class="fx-h"><h2>Ingredient warnings</h2><span class="iwn22">${head}</span></div>
    ${L.length ? `<ul class="iwl22">${L.map(w => `<li class="${SEVC22[w.lv]}"><span class="sv22">${lab[w.sev]}</span><div><b>${esc(w.label)}</b>${w.id === 'sugar' || w.terms.every(t => w.label.toLowerCase().includes(t.toLowerCase())) ? '' : ` <small>(${esc(w.terms.slice(0, 5).join(', '))})</small>`}<p>${esc(w.note)}</p></div></li>`).join('')}</ul>`
      : '<p class="small">No added sugars, seed or hydrogenated oils, or flagged additives found in the ingredient list.</p>'}
    <p class="small iwf22">Read from the ingredient list on file; lists can be incomplete or out of date, so check the package. Display only: these don't change the scores.</p></div>`; }
async function prod22() { const m = location.hash.match(/^#\/product\/([^/?]+)/); if (!m || $('#iw22')) return; const foot = app.querySelector('p.foot'); if (!app.classList.contains('prodv') || !foot) return;
  const id = decodeURIComponent(m[1]); let p = memo.get(id); if (!p) { try { p = await resolveProduct(id); } catch { return; } } if (!p || $('#iw22') || location.hash.indexOf(m[1]) < 0) return;
  if (p.src === 'custom' && !p.ing) return;
  const ingCard = [...app.querySelectorAll('.card')].find(c => c.querySelector(':scope > .ing'));
  const html = warnCard22(p); if (ingCard) ingCard.insertAdjacentHTML('beforebegin', html); else foot.insertAdjacentHTML('beforebegin', html);
  const r = LumiWarn.analyze(p.ing || ''); const top = app.querySelector('.card .actions'); const b = r.status === 'ok' ? LumiWarn.badges(r.mask) : [];
  if (top && b.length && !$('#iwj22')) { top.insertAdjacentHTML('beforebegin', `<button type="button" class="iwj22" id="iwj22">${badgeHTML22(r.mask, 3)}<span>See ingredient warnings ↓</span></button>`); $('#iwj22').onclick = () => $('#iw22').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }

/* ---------- 4. Compare: warnings row ---------- */
async function cmp22() { const t = app.querySelector('.cmpt'); if (!t || t.querySelector('.cw22')) return; const ids = [...t.querySelectorAll('tr:first-child th a[href^="#/product/"]')].map(a => decodeURIComponent(a.getAttribute('href').slice(10)));
  if (!ids.length) return; const ps = await Promise.all(ids.map(id => memo.get(id) || resolveProduct(id).catch(() => null)));
  if (t.querySelector('.cw22')) return; const add = [...t.querySelectorAll('tr')].find(r => /^Additives/.test(r.firstElementChild && r.firstElementChild.textContent || '')) || t.querySelector('tr');
  add.insertAdjacentHTML('afterend', `<tr class="cw22"><td>Ingredient warnings</td>${ps.map(p => { if (!p) return '<td>—</td>'; const r = LumiWarn.analyze(p.ing || ''); if (r.status !== 'ok') return `<td><small>${r.status === 'lang' ? "couldn't read" : 'ingredients not available'}</small></td>`; const b = LumiWarn.badges(r.mask); return `<td>${b.length ? b.map(x => `<i class="w22 ${SEVC22[x.lv]}">${esc(x.label)}</i>`).join(' ') : '<small>none found</small>'}</td>`; }).join('')}</tr>`); }

{ let q22 = 0; new MutationObserver(() => { if (!q22) q22 = requestAnimationFrame(() => { q22 = 0; badges22(); prod22(); if (/^#\/compare/.test(location.hash)) cmp22(); }); }).observe(app, { childList: true, subtree: true }); }

/* ---------- 5. version notes ---------- */
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(
  ['⚠️', 'Ingredient warnings', 'Product pages now read the ingredient list and flag added and hidden sugars (with a count, like "3 kinds of added sugar", and a note when maltodextrin or dextrose will hit faster than table sugar), seed oils, partially hydrogenated oils (trans fat), maltitol, artificial colors, nitrites and other notable additives, each with a one-line note and a level: note, caution or avoid. Cards show small badges. No ingredient list means "Ingredients not available", never "no warnings". Display only: scores are unchanged.'],
  ['🎚️', 'Smart filters', 'Browse, search and chain menus have filter chips: sugar under 5 or 10 g, carbs under 15, 30 or 45 g, high protein, high fiber, low sat fat and No warnings, all per serving and combinable, with a match count and one-tap clear. Sort by best Blood sugar, best Health, lowest sugar, lowest carbs or highest protein. Items missing the number a filter needs are hidden and counted, not treated as zero. Your last filters are remembered on this device.']);
setTimeout(() => { try { if ($('#res') && rs) { bar22(); syncBar22(); renderResults(); } kick22(); badges22(); prod22(); } catch (e) { console.warn(e); } }, 0);
