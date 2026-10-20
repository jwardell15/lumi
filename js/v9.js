/* Lumi 9.0 — per-meal carb targets, better-choice card, one-tap saved meals, tour, a11y helpers.
   Informational only. No dosing or correction math is added here. */
'use strict';
/* ---------- 1. Per-meal carb targets ---------- */
const mealT9 = () => Object.assign({ breakfast: null, lunch: null, dinner: null, snack: null }, settings().mealT || {});
const mealBasis9 = () => settings().mealBasis === 'net' ? 'net' : 'carbs';
function cue9(v, t) { // colour + words (never colour alone)
  if (!t) return null; const pct = v / t;
  if (pct <= 0.9) return { c: 'ok', w: v ? 'Within target' : 'Nothing yet', pct };
  if (pct <= 1.1) return { c: 'near', w: 'Near target', pct };
  return { c: 'over', w: `${Math.round(v - t)} g over`, pct };
}
function bar9(v, t, label) { const q = cue9(v, t); if (!q) return ''; const w = Math.min(100, Math.round(q.pct * 100));
  return `<div class="mt9 ${q.c}" role="img" aria-label="${esc(label || '')} ${Math.round(v)} of ${t} grams, ${q.w}"><div class="b"><i style="width:${w}%"></i></div><span><b>${Math.round(v)}</b> / ${t} g ${mealBasis9() === 'net' ? 'net ' : ''}carbs · ${q.w}</span></div>`; }
function mealTargetsCard9() { const t = mealT9(), b = mealBasis9();
  return `<form class="card" id="mt9f"><h2>Carb target per meal</h2><p class="small">Optional. Each meal on your log gets a bar: green within target, amber near it, red over, always with the number in words. Set what your care team suggested; leave blank to turn a meal off.</p>
  <div class="mt9g">${MEALS.map(m => `<label class="field"><span>${MEAL_L[m]} (g)</span><input name="${m}" type="number" inputmode="numeric" min="0" step="1" value="${t[m] ?? ''}" placeholder="Off"></label>`).join('')}</div>
  <div class="seg wide" id="mt9b" role="group" aria-label="Count meals by"><button type="button" data-b="carbs" class="${b === 'carbs' ? 'on' : ''}" aria-pressed="${b === 'carbs'}">Total carbs</button><button type="button" data-b="net" class="${b === 'net' ? 'on' : ''}" aria-pressed="${b === 'net'}">Net carbs</button></div>
  <div class="actions"><button class="btn pri">Save meal targets</button></div></form>`; }
function bindMealTargets9(after) { let b = mealBasis9();
  document.querySelectorAll('#mt9b button').forEach(x => x.onclick = () => { b = x.dataset.b; document.querySelectorAll('#mt9b button').forEach(y => { y.classList.toggle('on', y === x); y.setAttribute('aria-pressed', y === x); }); });
  $('#mt9f').onsubmit = e => { e.preventDefault(); const fd = new FormData(e.target), o = {}; MEALS.forEach(m => o[m] = +fd.get(m) > 0 ? +fd.get(m) : null); setSettings({ mealT: o, mealBasis: b }); toast('Meal targets saved'); after && after(); }; }
const _vs9 = viewSettings;
viewSettings = function () { _vs9(); const sf = $('#sf'); if (sf) { sf.insertAdjacentHTML('afterend', mealTargetsCard9()); bindMealTargets9(); }
  const re = $('#reOnb'); if (re) re.textContent = 'Take the tour again'; };
function decorateLog9(arg) {
  const t = mealT9(); if (!MEALS.some(m => t[m])) return; const day = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? new Date(arg + 'T12:00') : new Date();
  const es = LOG.all().filter(e => dayKey(e.ts) === dayKey(day)), k = mealBasis9();
  document.querySelectorAll('.card.meal').forEach((card, i) => { const m = MEALS[i]; if (!m || !t[m] || card.querySelector('.mt9')) return; const v = totals(es.filter(e => e.meal === m))[k] || 0; card.querySelector('.fx-h').insertAdjacentHTML('afterend', bar9(v, t[m], MEAL_L[m])); });
}
function decorateWeek9() { const t = mealT9(), k = mealBasis9(); if (k !== 'carbs' || !MEALS.some(m => t[m])) return;
  document.querySelectorAll('.wk8 tbody tr').forEach(tr => { const td = tr.querySelectorAll('td'); MEALS.forEach((m, i) => { const c = td[i]; if (!c || !t[m]) return; const v = +c.textContent; if (!v) return; const q = cue9(v, t[m]); c.classList.add('wk9-' + q.c); c.title = `${MEAL_L[m]}: ${v} of ${t[m]} g, ${q.w}`; }); });
  const tb = document.querySelector('.wk8'); if (tb && !document.getElementById('wk9k')) tb.insertAdjacentHTML('beforebegin', `<div class="small" id="wk9k">Meal cells are tinted against your per-meal targets: <span class="wk9-ok">within</span> <span class="wk9-near">near</span> <span class="wk9-over">over</span> (hover or long-press for numbers).</div>`); }
const _vl9 = viewLog;
viewLog = function (arg) { _vl9(arg); if (arg === 'week') decorateWeek9(); else if (!/^report/.test(arg || '')) { decorateLog9(arg); savedMealsStrip9(); } };
/* product page: this serving vs the meal you're likely eating now */
function servingFit9(p) { const t = mealT9(), m = mealFor(new Date()); if (!t[m] || !p || !p.n) return '';
  const perItem = p.meta && p.meta.perItem, g = perItem ? 100 : (p.servQ || null); if (!g) return '';
  const n = scale(per100(p), g), v = mealBasis9() === 'net' ? n.net : n.carbs; if (v == null) return '';
  const done = totals(LOG.all().filter(e => dayKey(e.ts) === dayKey(new Date()) && e.meal === m))[mealBasis9()] || 0;
  return `<div class="card fit9"><h2>Fits your ${MEAL_L[m].toLowerCase()} target?</h2>${bar9(done + v, t[m], MEAL_L[m])}<p class="small">1 ${perItem ? 'item' : `serving (${Math.round(g)}${p.liquid ? 'ml' : 'g'})`} = <b>${r1(v)} g</b>${done ? ` on top of ${Math.round(done)} g already logged` : ''}. Your ${MEAL_L[m].toLowerCase()} target is ${t[m]} g. <a class="lnk" href="#/settings">Change</a></p></div>`; }
/* ---------- 2. Better choice (Yuka-style, near the top of every product page) ---------- */
function betterCard9(p, s) {
  if (!p || p.src === 'cos' || s.score == null) return;
  loadIndex().then(() => { if (!document.body.contains($('#hcard') || app)) return;
    const doc = engine.byCode(p.code || p.id) || { code: p.code || p.id, name: p.name, keys: C.match(p.cats || '') };
    const sw = swapsFor(doc, { score: s.score, net: s.net, sugar: p.n.sugars }, 1)[0], old = $('#better9'); if (old) old.remove();
    const anchor = app.querySelector('.card'); if (!anchor) return;
    if (sw) anchor.insertAdjacentHTML('afterend', `<section class="card better9" id="better9" aria-labelledby="b9h"><h2 id="b9h">Better choice</h2><a class="b9row" href="#/product/${esc(sw.code)}">${thumb(sw.img, sw.name, sw.keys, sw.cat, false, sw.brand)}<div class="t"><b>${esc(sw.name)}</b><small>${esc(sw.brand || '')}</small><span class="why">${esc(sw.reason)}</span></div><span class="pills">${pills(sw)}</span></a><div class="small">Same category, lower carb impact per 100${p.liquid ? 'ml' : 'g'}. <a class="lnk" href="#swapsCard" id="b9all">More swaps ↓</a></div></section>`);
    const a = $('#b9all'); if (a) a.onclick = e => { e.preventDefault(); const t = $('#swapsCard'); if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  }).catch(() => {});
}
function zeroCarbWarn9(p, s) { if (!p.n || p.n.sugars == null || p.n.sugars < 3 || s.net == null || s.net > 0 || /\b(keto|sugar[- ]?free|zero|no sugar)\b/i.test(p.name || '')) return '';
  return `<div class="card warn9" role="note"><b>⚠ Check the label</b><p class="small">The data says 0 g net carbs but ${r1(p.n.sugars)} g sugar per 100 g, which can't both be right. Count carbs from the package before you bolus.</p></div>`; }
function bind9(p, s) {
  betterCard9(p, s);
  const head = app.querySelector('.card'); if (!head) return;
  const w = zeroCarbWarn9(p, s); if (w && !document.querySelector('.warn9')) head.insertAdjacentHTML('afterend', w);
  const f = servingFit9(p); if (f && !document.querySelector('.fit9')) { const a = document.getElementById('fx75') || document.getElementById('hcard'); if (a) a.insertAdjacentHTML('beforebegin', f); }
}
/* ---------- 3. Saved meals: one tap from Home, Log and the meal builder ---------- */
function snack9(msg, undo) { let el = $('#snack9'); if (!el) { el = document.createElement('div'); el.id = 'snack9'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button id="snack9u">Undo</button>' : ''}`; el.className = 'on'; clearTimeout(snack9.t); snack9.t = setTimeout(() => el.className = '', 6000);
  if (undo) $('#snack9u').onclick = () => { undo(); el.className = ''; }; }
function logSavedMeal9(id, meal) { const m = savedMeals().find(x => x.id === id); if (!m) return; const ts = Date.now(), mm = meal || mealFor(new Date()), ids = [];
  const l = LOG.all(); m.items.forEach((it, i) => { const nid = 'e' + (ts + i).toString(36) + Math.random().toString(36).slice(2, 5); ids.push(nid); l.push(Object.assign({}, it, { id: nid, ts, meal: mm })); }); LOG.save(l); haptic && haptic();
  m.used = (m.used || 0) + 1; m.last = ts; store.set('meals', savedMeals().map(x => x.id === id ? m : x));
  snack9(`Logged “${m.name}” to ${MEAL_L[mm]} · ${Math.round(totals(m.items).carbs)} g carbs`, () => { LOG.save(LOG.all().filter(e => !ids.includes(e.id))); toast('Removed'); route(); }); }
const mealsSorted9 = () => savedMeals().slice().sort((a, b) => (b.last || 0) - (a.last || 0) || (b.used || 0) - (a.used || 0));
function mealChips9(n) { const ms = mealsSorted9().slice(0, n); return ms.map(m => `<button class="chip ml9" data-ml9="${m.id}" aria-label="Log ${esc(m.name)}, ${Math.round(totals(m.items).carbs)} grams of carbs, now">🍽 ${esc(m.name)} <small>${Math.round(totals(m.items).carbs)}g</small></button>`).join(''); }
function bindMealChips9(root) { (root || document).querySelectorAll('[data-ml9]').forEach(b => b.onclick = () => logSavedMeal9(b.dataset.ml9)); }
function savedMealsStrip9() { /* Log page already has saved meals in Quick add; give them one-tap + undo too */
  document.querySelectorAll('[data-meal]').forEach(b => { b.onclick = () => logSavedMeal9(b.dataset.meal); }); }
const _vh9 = viewHome;
viewHome = function () { _vh9(); if (!savedMeals().length) return; const sc = app.querySelector('.sc74'); if (!sc) return;
  sc.insertAdjacentHTML('beforebegin', `<section class="meals9" aria-label="Saved meals"><div class="sec-h"><h2>Log a saved meal</h2><a href="#/meals">Manage</a></div><div class="chips">${mealChips9(6)}</div><div class="small">One tap logs it to ${MEAL_L[mealFor(new Date())]} now. You can undo.</div></section>`); bindMealChips9(app); };
const _vm9 = viewMeal;
viewMeal = function () { _vm9(); const l = plate(); if (!l.length) return; const t = mealT9(), m = mealFor(new Date()), k = mealBasis9();
  const tot = totals(l.map(x => ({ n: x.n, grams: x.grams })))[k] || 0; const pt = app.querySelector('.plate-tot'); if (pt && t[m]) pt.insertAdjacentHTML('beforeend', bar9(tot, t[m], MEAL_L[m] + ' target'));
  const lg = $('#plateLog'); if (lg && !$('#plateSave')) { lg.insertAdjacentHTML('afterend', '<button class="btn" id="plateSave">💾 Save as meal</button>'); $('#plateSave').onclick = () => {
    const name = prompt('Name this meal', 'My meal'); if (!name) return; const items = plate().map(x => ({ pid: x.id, name: x.name, brand: x.brand || '', grams: x.grams, label: x.label || `${Math.round(x.grams)} ${x.liquid ? 'ml' : 'g'}`, n: x.n, score: x.cs }));
    const ms = savedMeals(); ms.unshift({ id: 'm' + Date.now().toString(36), name: name.trim(), items }); store.set('meals', ms); toast('Saved. Log it from Home in one tap'); }; } };
function viewMeals9() { document.title = 'Saved meals — Lumi'; const ms = mealsSorted9();
  app.innerHTML = `<h1>Saved meals</h1><p class="lead">Meals you eat often. Tap <b>Log now</b> to add every item at once (you can undo).</p>
  ${ms.length ? `<div class="card"><ul class="loglist">${ms.map(m => { const t = totals(m.items); return `<li><div class="t"><b>${esc(m.name)}</b><small>${m.items.length} items · ${Math.round(t.carbs)} g carbs · ${Math.round(t.net)} g net${m.used ? ` · logged ${m.used}×` : ''}</small></div><button class="btn sm pri" data-ml9="${m.id}">Log now</button><button class="icon sm" data-ren9="${m.id}" aria-label="Rename ${esc(m.name)}">✎</button><button class="icon sm" data-del9="${m.id}" aria-label="Delete ${esc(m.name)}">✕</button></li>`; }).join('')}</ul></div>`
  : `<div class="card empty">${MASCOT(96, 'big')}<b>No saved meals yet</b>Build a plate in the meal builder or use “Save as meal” on your log.<div class="actions" style="justify-content:center"><a class="btn pri" href="#/meal">Meal builder</a><a class="btn" href="#/log">Log</a></div></div>`}`;
  bindMealChips9(app);
  app.querySelectorAll('[data-del9]').forEach(b => b.onclick = () => { if (!confirm('Delete this saved meal?')) return; store.set('meals', savedMeals().filter(x => x.id !== b.dataset.del9)); viewMeals9(); });
  app.querySelectorAll('[data-ren9]').forEach(b => b.onclick = () => { const m = savedMeals().find(x => x.id === b.dataset.ren9); const n = m && prompt('Rename meal', m.name); if (!n) return; store.set('meals', savedMeals().map(x => x.id === m.id ? Object.assign(x, { name: n.trim() }) : x)); viewMeals9(); }); }
/* ---------- 4. Accessibility helpers ---------- */
(function a11y9() {
  if (!document.querySelector('.skip9')) document.body.insertAdjacentHTML('afterbegin', '<a class="skip9" href="#app">Skip to content</a>');
  const m = document.getElementById('app'); if (m) m.setAttribute('tabindex', '-1');
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a.skip9'); if (a) { e.preventDefault(); m && m.focus(); } });
  window.addEventListener('hashchange', () => setTimeout(() => { const h = app.querySelector('h1'); if (h && !document.activeElement.closest('input,#res')) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }, 60));
  new MutationObserver(() => { const r = document.getElementById('res'); if (r && !r.hasAttribute('aria-live')) { r.setAttribute('aria-live', 'polite'); r.setAttribute('aria-busy', 'false'); } }).observe(document.getElementById('app'), { childList: true });
})();
