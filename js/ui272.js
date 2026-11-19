/* Lumi 27.2: (1) parsed search modifiers live in the Filters sheet (one source of truth), (2) results cards, image frames and "Best matches" redesign.
   (1) q272Hook(rs, meta, again): the worker already returns only matching items; this also turns the parsed filters ON in the stored Smart filters (store 'f22' / 'filters'),
   so the sheet chips, the active-filter chips and the page filter (test22) all show and use the same state. Removing a chip (sheet or active row) adds that modifier to rs.qoff and re-runs the search.
   The query-applied values are recorded (store 'q272') and put back when you leave search or search something else, unless you changed them yourself. */
const KEY272 = { sugfree: 'sug', lowsugar: 'sug', sugn: 'sug', carbn: 'carb', lowcarb: 'carb', pro: 'pro', fib: 'fib', sat: 'sat', sodfree: 'na', sodium: 'na', nosalt: 'na', sodn: 'na', nas: 'nas', healthy: 'healthy', diab: 'good' };
const TOOL272 = { healthy: 1, good: 1 };
function q272Restore() {
  const rec = store.get('q272', null); if (!rec) return; store.set('q272', null);
  const s = store.get('f22', {}) || {}, fl = store.get('filters', {}) || {};
  for (const k in rec.f22) { if (s[k] === rec.f22[k][1]) { if (rec.f22[k][0] == null) delete s[k]; else s[k] = rec.f22[k][0]; } }
  for (const k in rec.fl) { if (fl[k] === rec.fl[k][1]) { if (rec.fl[k][0] == null) delete fl[k]; else fl[k] = rec.fl[k][0]; } }
  store.set('f22', s); store.set('filters', fl);
}
function q272Detect() { /* the user removed or changed a query-applied filter: stop applying that modifier and search again */
  const rec = store.get('q272', null); if (!rec || !rs || !rs.meta271) return false; const s = store.get('f22', {}) || {}, fl = store.get('filters', {}) || {}; const gone = [];
  for (const k in rec.f22) if (s[k] !== rec.f22[k][1]) gone.push(k); for (const k in rec.fl) if (fl[k] !== rec.fl[k][1]) gone.push(k);
  if (!gone.length) return false;
  for (const id of rs.meta271.mods || []) if (gone.includes(KEY272[id])) (rs.qoff = rs.qoff || []).includes(id) || rs.qoff.push(id);
  for (const k of gone) { delete rec.f22[k]; delete rec.fl[k]; } store.set('q272', rec); return true;
}
function q272Hook(st, m, again) {
  st.rerun272 = again;
  if (!m || !m.active || m.nomatch) { q272Restore(); return; }
  const sig = JSON.stringify(m.f) + '|' + (st.qoff || []).join(); if (st.q272sig === sig) return; st.q272sig = sig; q272Restore();
  const s = store.get('f22', {}) || {}, fl = store.get('filters', {}) || {}, rec = { f22: {}, fl: {} };
  for (const k of ['sug', 'carb', 'na']) if (m.f[k] != null) { rec.f22[k] = [s[k], m.f[k]]; s[k] = m.f[k]; }
  for (const k of ['pro', 'fib', 'sat', 'nas']) if (m.f[k]) { rec.f22[k] = [s[k], true]; s[k] = true; }
  for (const k of ['healthy', 'good']) if (m.f[k]) { rec.fl[k] = [fl[k], true]; fl[k] = true; }
  store.set('f22', s); store.set('filters', fl); store.set('q272', rec);
  try { if (typeof syncBar22 === 'function') syncBar22(); if (typeof sync269 === 'function') sync269(); } catch {}
  if (typeof renderResults === 'function') renderResults();
}
if (typeof renderResults === 'function') { const rr272 = renderResults; renderResults = function () { try { if (q272Detect() && typeof SW27 !== 'undefined') { setTimeout(() => { try { const again = rs && rs.rerun272; again && again(); } catch {} }, 0); } } catch {} return rr272.apply(this, arguments); }; }
window.addEventListener('hashchange', () => { if (!/^#\/search/.test(location.hash)) q272Restore(); });
if (!/^#\/search/.test(location.hash)) q272Restore();

/* ---------- (2) results cards: one consistent image frame, designed placeholders, one score row ---------- */
const PH272 = {
  drink: '<path d="M7 3.5h10l-1.2 16.5H8.2L7 3.5z"/><path d="M7.4 9h9.2"/>',
  dairy: '<path d="M8.5 4h7v3l1.5 2v10a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19V9l1.5-2z"/><path d="M7 12.5h10"/>',
  grain: '<path d="M5 11a4 4 0 0 1 3-6.5h8A4 4 0 0 1 19 11v7.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M9 11v4M15 11v4"/>',
  produce: '<path d="M5 19c0-8 5-13.500 14-14.500 0 9.500-5 14.500-14 14.500z"/><path d="M5 19 13.500 10.500"/>',
  protein: '<path d="M14.500 4.500c3.500-.500 6 2.500 5 5.500-.800 2.400-3.500 2.500-5.500 4.500l-3 3-4.500-4.500 3-3c2-2 2-5 5-5.500z"/><path d="m6.500 17.500-2 2"/>',
  sweet: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r=".9"/><circle cx="14.500" cy="9.500" r=".9"/><circle cx="13" cy="14.500" r=".9"/>',
  meal: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7.500c0-1.200 1.200-1.300 1.200-2.500M14 7.500c0-1.200 1.200-1.300 1.200-2.500"/>',
  can: '<path d="M7 5h10v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><path d="M7 9h10M7 15h10"/>',
  snack: '<path d="M6 8h12l1 12H5z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
};
const PHRE272 = [[/drink|beverage|soda|juice|water|tea\b|coffee|creamer|milk\b|smoothie|shake/, 'drink'], [/yog|chees|dairy|cream|butter|kefir|egg/, 'dairy'], [/bread|cereal|granola|oat|pasta|rice|tortilla|bagel|cracker|flour|grain|noodle/, 'grain'],
  [/fruit|vegetable|veg\b|salad|bean|lentil|legume|produce|tomato|potato|berry|apple|banana/, 'produce'], [/meat|chicken|beef|pork|turkey|fish|salmon|tuna|jerky|sausage|bacon|protein|shrimp/, 'protein'],
  [/cookie|candy|choc|sweet|dessert|ice cream|cake|pie\b|donut|gum\b/, 'sweet'], [/soup|bowl|burger|pizza|sandwich|burrito|meal|entree|dinner|taco|wrap\b|fries/, 'meal'], [/sauce|dressing|dip\b|salsa|condiment|ketchup|spread|jam\b|syrup|oil\b|soup/, 'can']];
function ph272(name, cat, brand) { const t = (String(cat || '') + ' ' + String(name || '')).toLowerCase(); const k = (PHRE272.find(([r]) => r.test(t)) || [0, 'snack'])[1];
  return `<span class="ph272" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${PH272[k]}</svg></span>`; }
const thumbPrev272 = thumb;
thumb = function (img, name, keys, cat, big, brand) { const h = thumbPrev272(img, name, keys, cat, big, brand);
  if (!/<span class="ic">/.test(h)) return h; return h.replace(/<span class="ic">[^<]*<\/span>/, ph272(name, cat, brand)).replace('class="thumb', 'class="thumb th272'); };

const BAND272 = s => s == null ? 'na' : s >= 75 ? 'ex' : s >= 50 ? 'gd' : s >= 25 ? 'pr' : 'bd';
const LAB272 = { ex: 'Excellent', gd: 'Good', pr: 'Poor', bd: 'Bad', na: 'Not rated' };
const r0272 = v => v == null || !isFinite(v) ? null : v < 10 && v % 1 ? Math.round(v * 10) / 10 : Math.round(v);
const scoreBlock272 = (cls, label, v) => { const b = BAND272(v); return `<span class="sc272 ${cls} c-${b}"><span class="k272">${label}</span><span class="v272"><i class="sdot sm bg-${b}"></i><b>${v == null ? '–' : v}</b><em>${LAB272[b]}</em></span></span>`; };
const T272 = document.createElement('template');
function servShort272(t) { t = String(t || '').trim(); if (!t) return ''; let m = /^per serving \(([^)]*)\)/.exec(t); if (m) return m[1] + ' serving'; m = /^per typical serving \(([^)]*)\)/.exec(t); if (m) return 'typical serving (' + m[1] + ')'; if (/per 100/.test(t)) return 'no serving size listed'; return t.replace(/^per /, ''); }
function facts272(it, sv) { let v = null; try { v = typeof val22 === 'function' ? val22(it) : null; } catch {}
  const bits = [];
  if (v && v.k != null) { if (v.s != null) bits.push(`${r0272(v.s)} g sugar`); if (v.c != null) bits.push(`${r0272(v.c)} g carbs`); bits.push(v.na != null ? `${Math.round(v.na)} mg sodium` : '<span class="na272">sodium not listed</span>'); }
  else bits.push('<span class="na272">serving size not listed</span>');
  const s = servShort272(sv); if (s && v && v.k != null) bits.push(esc(s));
  return `<div class="f272">${bits.map(x => `<span>${x}</span>`).join('<i> · </i>')}</div>`; }
const rowPrev272 = rowHTML;
rowHTML = function (it) { const h = rowPrev272(it);
  try { T272.innerHTML = h; const a = T272.content.firstElementChild; if (!a || !a.classList.contains('row') || a.classList.contains('skel') || !a.querySelector('.rtg')) return h;
    const th = (a.querySelector('.thumb') || {}).outerHTML || '', n = a.querySelector('.n'), b = a.querySelector('.b'), cmp = a.querySelector('.cb221'), sv = (a.querySelector('.sv19') || {}).textContent || '', wb = a.querySelector('.wb22');
    let bh = b ? b.innerHTML.replace(/(?:\s*·\s*)?[\d.]+\s*g carbs(?:\/100| per item)(?: g| ml)?/, '') : '';
    const attrs = [...a.attributes].map(x => `${x.name}="${esc(x.value)}"`).join(' ').replace('class="row"', '');
    return `<a class="row r272" ${attrs}>${th}<div class="t bd272"><div class="n">${n ? n.innerHTML : esc(it.name)}</div><div class="b">${bh}</div><div class="s272">${scoreBlock272('hl', 'Health', it.h)}${scoreBlock272('bs', 'Blood sugar', it.score)}</div>${facts272(it, sv)}${wb ? wb.outerHTML : ''}</div>${cmp ? cmp.outerHTML : ''}</a>`; }
  catch (e) { return h; } };

/* Best matches: compact rows, only the score that column is ranked by */
function mini272(d, k) { const v = k === 'bs' ? d.score : d.h, b = BAND272(v);
  return `<li><a class="m14 m272" href="#/product/${esc(d.code || d.id)}">${thumb(d.img, d.name, d.keys, d.cat, false, d.brand)}<span class="t14" title="${esc(d.brand || '')}"><b>${esc(d.name)}</b><span class="mv272 c-${b}"><i class="sdot sm bg-${b}"></i><b>${v ?? '–'}</b><em>${LAB272[b]}</em></span></span></a></li>`; }

/* the "Better choice" line under a card: folded into the card instead of a full-width bar that breaks the grid */
function fold272() { document.querySelectorAll('#res a.bch24').forEach(f => { const p = f.previousElementSibling;
  if (p && p.classList.contains('r272')) { if (!p.querySelector('.sw272')) { const s = document.createElement('span'); s.className = 'sw272'; s.tabIndex = 0; s.setAttribute('role', 'link'); s.dataset.href = f.getAttribute('href'); s.setAttribute('aria-label', f.getAttribute('aria-label') || ''); const w = f.querySelector('.w20'); s.innerHTML = `<b>Better:</b> ${esc((f.querySelector('b') || {}).textContent || '')}${w ? ` <em>${esc(w.textContent.replace(/\s*·\s*H .*$/, ''))}</em>` : ''}`; (p.querySelector('.bd272') || p).appendChild(s); } f.remove(); } }); }
let ft272 = 0; new MutationObserver(() => { if (ft272) return; ft272 = setTimeout(() => { ft272 = 0; fold272(); }, 60); }).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
document.addEventListener('click', e => { const s = e.target.closest && e.target.closest('.sw272'); if (s) { e.preventDefault(); e.stopPropagation(); location.hash = s.dataset.href; } }, true);
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('sw272')) location.hash = e.target.dataset.href; });
