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
  const a = key === 'score' ? chip14('Carb', d.score, BAND(d.score)) + chip14('Health', d.h, HB(d.h)) : chip14('Health', d.h, HB(d.h)) + chip14('Carb', d.score, BAND(d.score));
  return `<li><a class="m14" href="#/product/${esc(d.code || d.id)}">${thumb(d.img, d.name, d.keys, d.cat, false, d.brand)}<span class="t14"><b>${esc(d.name)}</b><small>${esc(d.brand || (d.src === 'whole' ? 'USDA' : ''))}${intl}</small><span class="cs14">${a}${d.net != null ? `<span class="nc14">${Math.round(d.net)} g net</span>` : ''}</span></span></a></li>`;
}
const HOW14 = `<details class="how14"><summary>How the two columns are ranked</summary><div class="small"><p><b>Blood sugar</b> uses Lumi's carb score (0–100): net carbs, sugar and fiber per 100 g, adjusted for how the food is usually eaten. Higher means a gentler effect on glucose.</p><p><b>Overall health</b> uses Lumi's health rating (0–100): a Nutri-Score-style balance of calories, sugar, saturated fat and salt against fiber, protein and fruit/vegetable/legume content (60%), plus additives with hazard tiers (30%) and organic status (10%). High-hazard additives cap the score. Ultra-processed foods usually score lower through additives and nutrition.</p><p>Both use only the nutrition data and ingredients on record. Where a value is missing, the item is left out of that column rather than guessed. Not medical advice.</p></div></details>`;
function dual14(A, B, o = {}) {
  const col = (k, ic, t, sub, L) => `<div class="du14c du14-${k}"><h3>${ic14(ic)} ${t}</h3><p class="xs">${sub}</p>${L.length ? `<ul class="ml14">${L.map(d => o.mini ? o.mini(d, k) : mini14(d, k === 'bs' ? 'score' : 'h')).join('')}</ul>` : `<p class="small">${o.empty || 'Nothing better found here.'}</p>`}</div>`;
  return `<section class="du14${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''} aria-label="${esc(o.label || 'Suggestions')}">${o.title ? `<div class="du14h"><h2>${o.title}</h2>${o.side || ''}</div>` : ''}<div class="du14g">${col('bs', 'drop', 'Blood sugar', o.subA || 'Ranked by carb score', A)}${col('hl', 'heart', 'Overall health', o.subB || 'Ranked by health rating', B)}</div>${o.how === false ? '' : HOW14}</section>`;
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
    const A = X.slice().sort((a, b) => a.c - b.c).slice(0, 3), B = X.filter(x => x.h != null).sort((a, b) => b.h - a.h || a.c - b.c).slice(0, 3);
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
/* the first route runs before this file loads: apply to the current screen too */
if (/^#?\/?$/.test(location.hash) && $('#picks')) home14();
