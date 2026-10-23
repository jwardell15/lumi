/* Lumi 14.0: dual suggestions (Blood sugar | Overall health) + redesign helpers. Loaded last. */
'use strict';
const IC14 = {
  drop: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8 11h2l1-2 2 4 1-2h2"/>'
};
const ic14 = (k, s = 18) => `<svg class="i10" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC14[k]}</svg>`;
const bk14 = d => d.src === 'whole' ? 'w:' + d.code : String(d.brand || d.code || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')[0] || d.code;
/* rank a pool by one metric; ties broken by the other metric, then popularity. Max `per` items per brand. */
function rank14(pool, key, n = 3, per = 1) {
  const other = key === 'score' ? 'h' : 'score', cnt = new Map(), out = [], seen = new Set();
  const L = pool.filter(d => d && d[key] != null).sort((a, b) => b[key] - a[key] || (b[other] ?? -1) - (a[other] ?? -1) || (a.rank ?? 1e9) - (b.rank ?? 1e9));
  for (const d of L) { const b = bk14(d), k = (d.name || '').toLowerCase(); if ((cnt.get(b) || 0) >= Math.min(per, 3) || seen.has(k)) continue; cnt.set(b, (cnt.get(b) || 0) + 1); seen.add(k); out.push(d); if (out.length >= n) break; }
  return out;
}
const chip14 = (lab, v, band) => `<span class="sc14 bg-${band}"><span class="vh">${lab} score </span>${lab === 'Carb' ? 'C' : 'H'} ${v ?? '?'}</span>`;
function mini14(d, key) {
  const intl = d.src === 'world' ? '<span class="wbadge" title="International product (Open Food Facts)">🌍 Intl</span>' : '';
  const a = chip14('Health', d.h, HB(d.h)) + chip14('Carb', d.score, BAND(d.score));
  return `<li><a class="m14" href="#/product/${esc(d.code || d.id)}">${thumb(d.img, d.name, d.keys, d.cat, false, d.brand)}<span class="t14"><b>${esc(d.name)}</b><small>${esc(d.brand || (d.src === 'whole' ? 'USDA' : ''))}${intl}</small><span class="cs14">${a}${d.net != null ? `<span class="nc14">${Math.round(d.net)} g carbs</span>` : ''}</span></span></a></li>`;
}
const HOW14 = `<details class="how14"><summary>How the two columns are ranked</summary><div class="small"><p><b>Blood sugar</b> uses Lumi's carb score (0–100): sugar first (added sugar counts most), then total carbs and refined starch (white rice, white bread, pasta…), with a small fiber bonus, adjusted for how the food is usually eaten. Higher means a gentler effect on glucose.</p><p><b>Overall health</b> uses Lumi's health rating (0–100): a Nutri-Score-style balance of calories, sugar, saturated fat and salt against fiber, protein and fruit/vegetable/legume content (60%), plus additives with hazard tiers (30%) and organic status (10%). High-hazard additives cap the score. Ultra-processed foods usually score lower through additives and nutrition.</p><p>Both use only the nutrition data and ingredients on record. Where a value is missing, the item is left out of that column rather than guessed. Not medical advice.</p></div></details>`;
function dual14(A, B, o = {}) {
  const col = (k, ic, t, sub, L) => `<div class="du14c du14-${k}"><h3>${ic14(ic)} ${t}</h3><p class="xs">${sub}</p>${L.length ? `<ul class="ml14">${L.map(d => o.mini ? o.mini(d, k) : mini14(d, k === 'bs' ? 'score' : 'h')).join('')}</ul>` : `<p class="small">${o.empty || 'Nothing better found here.'}</p>`}</div>`;
  return `<section class="du14${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''} aria-label="${esc(o.label || 'Suggestions')}">${o.title ? `<div class="du14h"><h2>${o.title}</h2>${o.side || ''}</div>` : ''}<div class="du14g">${col('hl', 'heart', 'Overall health', o.subB || 'Ranked by health rating', B)}${col('bs', 'drop', 'Blood sugar', o.subA || 'Ranked by carb score', A)}</div>${o.how === false ? '' : HOW14}</section>`;
}

/* ---------- Home: Top picks as two columns ---------- */
function healthPicks14() {
  const ks = new Set(['sauces', 'drinks', 'sweets'].map(k => C.KEYS.indexOf(k)));
  const pool = engine.docs.filter(d => d.src === 'local' && d.h != null && d.h >= 70 && d.score != null && d.score >= 50 && d.net != null && d.net >= 2 && !d.fl && !d.bad && !d.zc && d.img && d.brand && d.rank < 40000
    && !isStaple(d) && !isSugaryDrink(d) && usEnglish(d) && !ALC74.test(d.name + ' ' + d.cat) && !COND74.test(d.name + ' ' + d.cat) && !d.keys.some(k => ks.has(k)) && !/\bwater\b|powder|supplement|vitamin/i.test(d.name));
  const cats = new Set(), out = []; const L = rank14(pool, 'h', 60, 1);
  for (const d of L) { const c = typeof kind74 === 'function' ? kind74(d) : d.cat; if (cats.has(c)) continue; cats.add(c); out.push(d); if (out.length >= 5) break; }
  const whole = rank14(engine.docs.filter(d => d.src === 'whole' && d.h != null && d.h >= 80 && d.score != null && d.net >= 5 && /^[^,]+(, (raw|cooked|boiled))?$/i.test(d.name)), 'h', 1);
  return out.concat(whole).slice(0, 6);
}
function home14() {
  const el = $('#picks'); if (!el) return;
  loadIndex().then(() => { const el = $('#picks'); if (!el) return;
    let A = []; try { A = homePicks().slice().sort((a, b) => b.score - a.score).slice(0, 6); } catch (e) { console.warn(e); }
    let B = []; try { B = healthPicks14(); } catch (e) { console.warn(e); }
    if (!A.length && !B.length) return;
    const put = () => { const el = $('#picks'); if (el && !el.querySelector('.du14')) el.innerHTML = html; };
    const html = dual14(A, B, { label: 'Top picks', subA: 'Highest carb score, real products', subB: 'Highest health rating, real products' });
    put(); setTimeout(put, 50); setTimeout(put, 600); const mo = new MutationObserver(put); mo.observe(el, { childList: true }); setTimeout(() => mo.disconnect(), 15000);
    const h = el.previousElementSibling; if (h && h.classList.contains('sec-h')) h.querySelector('h2').textContent = 'Top picks';
  }).catch(() => {});
}
if (typeof viewHome === 'function') { const _vh14 = viewHome; viewHome = function () { const r = _vh14.apply(this, arguments); home14(); return r; }; }

/* ---------- Product: Better choice for each goal ---------- */
function prodDual14(p, s) {
  if (!p || p.src === 'cos') return;
  loadIndex().then(() => {
    const code = p.code || p.id; if (location.hash.indexOf(encodeURIComponent(code)) < 0 && location.hash.indexOf(code) < 0) return;
    const doc = engine.byCode(code) || { code, name: p.name, keys: C.match(p.cats || '') };
    const leaf = (doc.keys || []).filter(k => !['whole', 'rest'].includes(C.KEYS[k])).slice(-1)[0];
    if (leaf == null) return;
    const curS = s && s.score != null ? s.score : doc.score, curH = doc.h != null ? doc.h : (() => { try { return LumiHealth.rate(p).score; } catch { return null; } })();
    const pool = engine.docs.filter(d => d.keys.includes(leaf) && d.code !== doc.code && !d.fl && !d.bad && !d.zc && d.score != null && (d.src !== 'local' || usEnglish(d)));
    let A = []; try { A = swapsFor(doc, { score: curS, net: s ? s.net : doc.net, sugar: p.n && p.n.sugars }, 9); } catch {}
    A = rank14(A, 'score', 3, 1);
    const B = curH == null ? [] : rank14(pool.filter(d => d.h != null && d.h >= Math.max(50, curH + 10) && d.score >= 40), 'h', 3, 1);
    if (!A.length && !B.length) return;
    const old = $('#du14p'); if (old) old.remove();
    const anchor = $('#better9') || app.querySelector('.card'); if (!anchor) return;
    anchor.insertAdjacentHTML('afterend', dual14(A, B, { id: 'du14p', cls: 'card', title: 'Better choices', label: 'Better choices', subA: `Higher carb score than ${curS ?? '?'}`, subB: `Higher health rating than ${curH ?? '?'}`, empty: 'This is already one of the best in its category.' }));
    const b9 = $('#better9'); if (b9) b9.hidden = true;
  }).catch(() => {});
}
if (typeof bind9 === 'function') { const _b9 = bind9; bind9 = function (p, s) { const r = _b9.apply(this, arguments); prodDual14(p, s); setTimeout(() => { const b9 = $('#better9'); if (b9 && $('#du14p')) b9.hidden = true; }, 1500); return r; }; }

/* ---------- Search + browse results: best of these results, both goals ---------- */
if (typeof renderResults === 'function') { const _rr14 = renderResults; renderResults = function () {
  const r = _rr14.apply(this, arguments);
  try { if (!rs) return r; const res = $('#res'); if (!res) return r;
    const all = [...rs.items.values()].filter(i => i.src !== 'cos' && i.score != null && i.h != null && !i.fl && !i.bad);
    const browse = /^#\/browse\//.test(location.hash), pool = browse ? all : all.sort((a, b) => (b.rel || 0) - (a.rel || 0)).slice(0, 40);
    let el = $('#du14s');
    if (pool.length < 4) { if (el) el.remove(); return r; }
    const A = rank14(pool, 'score', 3, 1), B = rank14(pool, 'h', 3, 1);
    const html = dual14(A, B, { id: 'du14s', title: browse ? 'Best here' : 'Best matches', label: 'Best results for each goal', subA: 'Top carb score in these results', subB: 'Top health rating in these results', how: true });
    if (el) el.outerHTML = html; else res.insertAdjacentHTML('beforebegin', html);
  } catch (e) { console.warn('du14', e); }
  return r; }; }

/* ---------- Meal ideas: rank the same ideas two ways ---------- */
function plateH14(parts) { let w = 0, t = 0, n = 0; for (const [it, m] of parts) { const d = engine.byCode && engine.byCode(it.id), g = (it.g || 100) * m; if (d && d.h != null) { w += g; t += d.h * g; n++; } } return { h: w ? Math.round(t / w) : null, n, of: parts.length }; }
function ideasDual14(el, L, meal) {
  if (!el || !L || !L.length) return;
  loadIndex().catch(() => {}).then(() => { if (!document.body.contains(el)) return;
    const X = L.map((x, i) => Object.assign({ i, c: val13(x.s) }, plateH14(x.parts)));
    const A = X.filter(x => x.h == null || x.h >= 50).sort((a, b) => a.c - b.c).slice(0, 3), B = X.filter(x => x.h != null && x.h >= 60).sort((a, b) => b.h - a.h || a.c - b.c).slice(0, 3);
    const mini = x => `<li><button type="button" class="m14 mi14" data-go14="${x.i}"><span class="t14"><b>${L[x.i].parts.map(([it]) => esc(it.nm)).join(' + ')}</b><span class="cs14"><span class="nc14">${Math.round(x.c)} ${unit13()}</span>${x.h != null ? `<span class="sc14 bg-${HB(x.h)}"><span class="vh">Health score </span>H ${x.h}</span>` : ''}${x.h != null && x.n < x.of ? `<span class="xs">health from ${x.n} of ${x.of} foods</span>` : ''}</span></span></button></li>`;
    const old = $('#du14i'); if (old) old.remove();
    el.insertAdjacentHTML('afterbegin', dual14(A.map(x => x), B, { id: 'du14i', title: 'Best of these ideas', label: 'Best meal ideas for each goal', subA: 'Fewest carbs', subB: 'Highest plate health rating (weighted by grams)', mini, empty: 'Health ratings not available for these foods.' }));
    el.querySelectorAll('[data-go14]').forEach(b => b.onclick = () => { const c = el.querySelectorAll('.id13')[+b.dataset.go14]; if (c) { c.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); c.classList.add('hl14'); setTimeout(() => c.classList.remove('hl14'), 1600); } });
  });
}

/* ---------- Sidebar active state (incl. links added after the first route) ---------- */
function side14() { const v = location.hash.replace(/^#\/?/, '').split('/')[0]; document.querySelectorAll('.tabbar a.side13').forEach(a => { const on = a.dataset.v === v; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (v === 'ideas' || v === 'plan') document.querySelectorAll('.tabbar a:not(.side13)').forEach(a => { a.classList.remove('on'); a.removeAttribute('aria-current'); }); }
addEventListener('hashchange', () => setTimeout(side14, 0)); setTimeout(side14, 0); setTimeout(side14, 600);

/* ===================== Lumi 14.1: name quality + pick quality ===================== */
const SMALL141 = new Set(['and', 'or', 'of', 'with', 'in', 'the', 'a', 'an', 'for', 'to', 'on', 'de', 'la']);
function tc141(s) { return String(s).toLowerCase().replace(/[a-z][a-z'’]*/g, (w, i) => i > 0 && SMALL141.has(w) ? w : w[0].toUpperCase() + w.slice(1)); }
function catLabel141(d) {
  for (const k of (d.keys || []).slice().reverse()) { const key = C.KEYS[k]; if (!key || /^(whole|rest)/.test(key)) continue; const top = (C.CATS[key] && C.CATS[key][4]) || key, l = C.CATS[top] && C.CATS[top][1]; if (l) return l; }
  const a = d.ai != null && d.ai >= 0 && window.LumiAisles ? LumiAisles.SUB[d.ai] : null; return a ? a[2] : '';
}
const NM141 = new Map();
/* returns { name, ok, renamed }: only words already in the record (name, brand, Lumi category/aisle label) are used */
function nameQ141(d) {
  if (!d || !d.name) return { name: d && d.name || '', ok: false };
  const key = (d.code || d.id || '') + '|' + d.name; if (NM141.has(key)) return NM141.get(key);
  let n = String(d.name).replace(/\s+/g, ' ').trim(); const letters = n.replace(/[^A-Za-z]/g, '');
  if (letters.length > 3 && (letters === letters.toUpperCase() || letters === letters.toLowerCase())) n = tc141(n);
  else { n = n.replace(/\b[A-Z]{4,}\b/g, w => /^(USDA|ELITE)$/.test(w) ? w : w[0] + w.slice(1).toLowerCase()); if (/^[a-z]/.test(n)) n = n[0].toUpperCase() + n.slice(1); }
  const words = n.toLowerCase().match(/[a-z]+/g) || [], br = String(d.brand || '').toLowerCase().trim();
  const FOODW = /yog|kefir|skyr|milk|chees|nuts?\b|almond|walnut|cashew|pecan|pistachio|peanut|egg|bread|tofu|tempeh|hummus|salsa|water|juice|soda|tea\b|coffee|chips|crackers?|cereal|granola|oat|rice|pasta|soup|jerky|popcorn|pretzel|butter|cookie|bar\b|bars\b|kombucha|seltzer|chocolate|candy|pickles?|olives?|berr|apple|banana|grape|avocado|carrot|broccoli|spinach|salad|edamame|chicken|turkey|tuna|salmon|beef|ham\b|bacon|sausage|tortilla|bagel|muffin|waffle|pancake|pizza|burrito|honey|jam|ketchup|mustard|mayo|dressing|sauce|pesto|guacamole|ratatouille|marinara|nutella/i;
  const unclear = !(words.length === 1 && FOODW.test(n) && n.toLowerCase() !== br) && d.src !== 'whole' && d.src !== 'rest' && d.src !== 'chain' && (words.length < 2 || n.length < 6 || n.toLowerCase() === br || (br && br.includes(n.toLowerCase())));
  let out = { name: n, ok: !unclear, renamed: n !== d.name };
  if (unclear) {
    const lab = catLabel141(d);
    if (lab && !/[&,/]/.test(lab) && lab.split(' ').length <= 3) {
      const lw = lab.toLowerCase().match(/[a-z]+/g) || [];
      const has = lw.every(w => words.some(x => x === w || x === w.replace(/s$/, '') || x + 's' === w));
      out = { name: has ? n : n + ' ' + lab.toLowerCase().replace(/s$/, (m, i, s) => /ies$|ss$|us$/.test(s) ? m : ''), ok: true, renamed: true, from: lab };
    }
  }
  NM141.set(key, out); return out;
}
if (typeof itemFromDoc === 'function') { const _ifd = itemFromDoc; itemFromDoc = function (d) { const it = _ifd.apply(this, arguments); try { const q = nameQ141(d); if (q.renamed) { it.name = q.name; it.rawName = d.name; } } catch {} return it; }; }

const RAWDRY141 = /\b(creatine|collagen|peptides?|pre-?workout|electrolytes?|protein powder|broth|brothe|stock|vitamins?|capsules?|gumm(y|ies)|raw|dry|dried|uncooked|flour|powder|mix|meal|starch|nori|seaweed|sheets|bouillon|yeast|extract|supplement|greens powder|supergreens)\b/i;
const FRUITVEG141 = /fruit|veg|berr|apple|carrot|cucumber|pepper|tomato|broccoli|spinach|lettuce|celery|grape|melon|orange|pear|peach|cherr/i;
/* shared quality gate for every suggestion column */
function ok141(d, o = {}) {
  if (!d || d.fl || d.bad || d.zc || d.score == null || d.h == null || d.net == null) return false;
  const min = o.min ?? 60; if (d.score < min || d.h < min) return false;
  if (d.net > (o.cap ?? 25)) return false;
  if (!nameQ141(d).ok) return false;
  if (o.img && (!d.img || BADIMG.test(d.img))) return false;
  if (o.ready) {
    if (d.src === 'whole' ? (/\b(raw|dry|dried|uncooked)\b/i.test(d.name) && !FRUITVEG141.test(d.name + ' ' + (d.keys || []).map(k => C.KEYS[k]).join(' ')) || /flour|powder|meal\b|starch/i.test(d.name)) : (RAWDRY141.test(d.name) || (typeof readyToEat === 'function' && !readyToEat(itemFromDoc(d))))) return false;
    if (typeof ALC74 !== 'undefined' && (ALC74.test(d.name) || COND74.test(d.name + ' ' + (d.cat || '')))) return false;
  }
  return true;
}
const day141 = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
/* pick n items: best per kind, rotating daily among the top few of each kind; one per brand */
function pickKinds141(pool, key, n, avoid = new Set()) {
  const kinds = new Map(); const other = key === 'score' ? 'h' : 'score';
  pool.slice().sort((a, b) => (b[key] + b[other] * 0.35) - (a[key] + a[other] * 0.35) || a.rank - b.rank).forEach(d => { const k = typeof kind74 === 'function' ? kind74(d) : d.cat; if (!kinds.has(k)) kinds.set(k, []); const L = kinds.get(k); if (L.length < 4) L.push(d); });
  const day = day141(), out = [], brands = new Set(), labs = new Map();
  const groups = [...kinds.entries()].sort((a, b) => (b[1][0][key]) - (a[1][0][key]));
  for (const [, L] of groups) { const c = L.filter(d => !avoid.has(d.code) && !brands.has(bk14(d)) && (labs.get(catLabel141(d)) || 0) < 1); if (!c.length) continue; const d = c[(day + out.length) % c.length]; out.push(d); brands.add(bk14(d)); labs.set(catLabel141(d), 1); if (out.length >= n) break; }
  return out.sort((a, b) => b[key] - a[key]);
}
function homeCols141() {
  const pool = engine.docs.filter(d => (d.src === 'local' && d.brand && d.rank < 40000 && usEnglish(d) && !isStaple(d) && !isSugaryDrink(d) && !/\bwater\b/i.test(d.name) || d.src === 'whole') && ok141(d, { min: 60, cap: 20, img: true, ready: true }) && d.net >= 2 && d.sugar != null && d.sugar <= 5 && (nameQ141(d).name.match(/[A-Za-z]+/g) || []).length >= 2);
  const NOAI = /sweet|candy|powder|supplement|creatine|vitamin|broth|soup base|spice|season|baking|condiment|sauce|oil|vinegar/i;
  const P2 = pool.filter(d => !NOAI.test(catLabel141(d)) && !NOAI.test(d.ai >= 0 && LumiAisles.SUB[d.ai] ? LumiAisles.SUB[d.ai][2] : ''));
  const capW = L => { let w = 0; return L.filter(d => d.src !== 'whole' || ++w <= 1); };
  const A = capW(pickKinds141(P2, 'score', 30)).slice(0, 6); const B = capW(pickKinds141(P2, 'h', 30, new Set(A.map(d => d.code)))).slice(0, 6);
  return [A, B];
}
/* richer mini row: labelled chips, carbs, category tag, compare button */
function mini141(d, key) {
  const q = nameQ141(d), cat = catLabel141(d), intl = d.src === 'world' ? '<span class="wbadge" title="International product (Open Food Facts)">🌍 Intl</span>' : '';
  const c = `<span class="sc14 bg-${BAND(d.score)}">Carb ${d.score}</span>`, h = `<span class="sc14 bg-${HB(d.h)}">Health ${d.h}</span>`;
  return `<li class="li141"><a class="m14" href="#/product/${esc(d.code || d.id)}">${thumb(d.img, q.name, d.keys, d.cat, false, d.brand)}<span class="t14"><b>${esc(q.name)}</b><small>${esc(d.src === 'whole' ? 'USDA whole food' : d.brand ? tc141(d.brand) : '')}${intl}</small><span class="cs14">${h + c}</span><span class="nt141"><b>${Math.round(d.net)} g</b> carbs per 100 ${d.liquid ? 'ml' : 'g'}${cat ? ` · <span class="tg141">${esc(cat)}</span>` : ''}</span></span></a><button type="button" class="cmp141" data-cmp141="${esc(d.code || d.id)}" aria-label="Compare ${esc(q.name)}" aria-pressed="${cmpIds().includes(d.code || d.id)}">${ic10cmp141()}</button></li>`;
}
const ic10cmp141 = () => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 4v16M17 4v16M3 8h8M13 16h8"/></svg>`;
function bindCmp141(root) { (root || document).querySelectorAll('[data-cmp141]').forEach(b => b.onclick = e => { e.preventDefault(); const d = engine.byCode(b.dataset.cmp141); if (!d) return; const on = toggleCompare(itemFromDoc(d)); b.setAttribute('aria-pressed', on); if (typeof toast === 'function') toast(on ? 'Added to compare' : 'Removed from compare'); }); }
const _mini14 = mini14; mini14 = mini141; // every dual column uses the upgraded row

/* re-gate the columns (v14 functions call these) */
home14 = function () {
  const el = $('#picks'); if (!el) return;
  loadIndex().then(() => { let A = [], B = []; try { [A, B] = homeCols141(); } catch (e) { console.warn(e); } if (!A.length && !B.length) return;
    const html = dual14(A, B, { label: 'Top picks', subA: 'Gentlest on glucose · ready to eat', subB: 'Best overall nutrition · still diabetes-friendly' });
    const put = () => { const el = $('#picks'); if (el && !el.querySelector('.du14')) { el.innerHTML = html; bindCmp141(el); const h = el.previousElementSibling; if (h && h.classList.contains('sec-h')) { h.classList.add('sh141'); h.querySelector('h2').innerHTML = `Top picks <small class="xs">Updated daily · both scores 60+ · 2–20 g carbs and ≤5 g sugar per 100 g</small>`; } } };
    put(); setTimeout(put, 50); setTimeout(put, 600); const mo = new MutationObserver(put); mo.observe(el, { childList: true }); setTimeout(() => mo.disconnect(), 15000);
  }).catch(() => {});
};
const _rank14 = rank14;
rank14 = function (pool, key, n = 3, per = 1) { return _rank14(pool.filter(d => ok141(d, { min: 60, cap: rank14.cap ?? 25 })), key, n, per); };
new MutationObserver(() => { document.querySelectorAll('.du14:not([data-b141])').forEach(s => { s.dataset.b141 = 1; bindCmp141(s); }); }).observe(document.getElementById('app'), { childList: true, subtree: true });
if (/^#?\/?$/.test(location.hash) && $('#picks')) home14();
