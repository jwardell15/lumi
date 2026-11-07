/* Lumi 24.2: Costco and Whole Foods aisle mode (#/store/<costco|wholefoods>/aisles[/<aisle>[/<section>]]) built only from products
   already in Lumi's index (store brands + products tagged as sold there), and a clearer daily log (#/log, #/today) that totals
   sugar first and total carbs second, scores each meal (Health first, Blood sugar second), shows where entries came from
   (plan, bowl, chain meal) and lets you log today's planned meals. Logging stays optional; no glucose data is used. */
(function () {
'use strict';
const g1 = v => v == null || isNaN(v) ? '—' : (Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
const AM = ['costco', 'wholefoods'];
const AIS = () => window.LumiAisles, STS = () => window.LumiStores;
const sIdx = id => STS().STORES.findIndex(s => s[0] === id);
const SNAME = { costco: 'Costco', wholefoods: 'Whole Foods' }, SBR = { costco: 'Kirkland Signature', wholefoods: '365 / Whole Foods' }, SIC = { costco: '🛒', wholefoods: '🥬' };

/* ---------- aisle mode ---------- */
const aiCache = new Map();
function aisleId242(d) { if (d.ai != null && d.ai >= 0 && AIS().SUB[d.ai]) return AIS().SUB[d.ai][1];
  if (aiCache.has(d.code)) return aiCache.get(d.code); let a = 'other';
  try { const i = AIS().classify({ name: d.name || '', cats: '', ucat: d.cat || '', brand: d.brand || '' }); if (i >= 0 && AIS().SUB[i]) a = AIS().SUB[i][1]; } catch {}
  aiCache.set(d.code, a); return a; }
function subId242(d) { return d.ai != null && d.ai >= 0 && AIS().SUB[d.ai] ? AIS().SUB[d.ai][0] : ''; }
/* every product Lumi has for the store: own brand, or (scope 'all') also tagged as sold there; never invented, never bad data */
function storeDocs242(id, scope) { const i = sIdx(id); if (i < 0 || !engine || !engine.docs) return [];
  const S = STS(); return engine.docs.filter(d => !d.bad && d.src !== 'rest' && d.src !== 'world' && (S.has(d.sm, i) || (scope === 'all' && S.has(d.sm, S.SOLD + i)))); }
self.storeDocs242 = storeDocs242;
const SORT242 = [['health', 'Health'], ['bs', 'Blood sugar'], ['sugar', 'Least sugar']];
function sortA242(L, how) { const ps = d => perServ20(d) || {};
  const tie = (a, b) => (b.img ? 1 : 0) - (a.img ? 1 : 0) || a.rank - b.rank;
  if (how === 'sugar') return L.sort((a, b) => ((ps(a).s ?? 999) - (ps(b).s ?? 999)) || ((ps(a).c ?? 999) - (ps(b).c ?? 999)) || ((b.h ?? -1) - (a.h ?? -1)) || tie(a, b));
  if (how === 'bs') return L.sort((a, b) => ((b.score ?? -1) - (a.score ?? -1)) || ((b.h ?? -1) - (a.h ?? -1)) || tie(a, b));
  return L.sort((a, b) => ((b.h ?? -1) - (a.h ?? -1)) || ((b.score ?? -1) - (a.score ?? -1)) || tie(a, b)); }
function row242(d, id) { const q = perServ20(d) || {}, on = typeof onG21 === 'function' && onG21(d.code), i = sIdx(id), own = STS().has(d.sm, i);
  return `<li class="ar242"><a class="aa242" href="#/product/${esc(d.code)}">${typeof thumb === 'function' ? thumb(d.img, d.name, d.keys, d.cat, false, d.brand) : ''}<span class="at242"><b>${esc(d.name)}</b><small>${esc(d.brand || '')}${own ? '' : ` · tagged at ${esc(SNAME[id])}`}</small>
    <small class="an242"><b>${g1(q.s)} g</b> sugar · <b>${g1(q.c)} g</b> total carbs <span>${esc(q.basis || '')}</span></small></span></a>
    <span class="as242">${scores20(d.h, d.score)}</span>
    <span class="ab242"><button type="button" class="btn sm" data-ag242="${esc(d.code)}"${on ? ' aria-pressed="true" disabled' : ''} aria-label="${on ? 'On your grocery list' : 'Add ' + esc(d.name) + ' to your grocery list'}">${on ? '✓ On list' : '🛒 List'}</button><button type="button" class="btn sm" data-ap242="${esc(d.code)}" aria-label="Add ${esc(d.name)} to your meal plan">📅 Plan</button></span></li>`; }
function bindRows242(root) {
  root.querySelectorAll('[data-ag242]').forEach(b => b.onclick = () => { const d = engine.byCode(b.dataset.ag242); if (!d) return; const it = fromDoc21(d, 'aisle'); if (addG21(it)) { b.textContent = '✓ On list'; b.disabled = true; b.setAttribute('aria-pressed', 'true'); toast('Added to grocery list'); } });
  root.querySelectorAll('[data-ap242]').forEach(b => b.onclick = async () => { b.disabled = true; try { const p = await resolveProduct(b.dataset.ap242); if (!p) throw 0; remember(p); planSheet241({ t: p.name, src: 'food', items: [itemFrom241(p, 1)] }); } catch { toast("Couldn't load that food"); } b.disabled = false; }); }
async function viewAisleMode242(id, aid, sid) {
  const nm = SNAME[id]; document.title = `${nm} aisle mode — Lumi`;
  app.innerHTML = `<section class="pg13 am242"><h1>${SIC[id]} ${esc(nm)} aisle by aisle</h1>${skel(4)}</section>`;
  try { await loadIndex(); } catch {} try { await loadIndexX(); } catch {}
  if (!location.hash.startsWith(`#/store/${id}/aisles`)) return;
  const scope = store.get('amScope242', 'all'), how = store.get('amSort242', 'health'), A = [...AIS().AISLES, ['other', 'Other', '🛒']];
  const seen = new Set(), D = storeDocs242(id, scope).filter(d => !d.fl || aid).filter(d => { const k = (d.name + '|' + (d.brand || '')).toLowerCase().replace(/[^a-z0-9|]+/g, ' ').trim(); if (seen.has(k)) return false; seen.add(k); return true; }), by = {}; D.forEach(d => (by[aisleId242(d)] = by[aisleId242(d)] || []).push(d));
  const nOwn = storeDocs242(id, 'own').length, nAll = storeDocs242(id, 'all').length;
  const base = `#/store/${id}/aisles`, a = aid ? A.find(x => x[0] === aid) : null;
  const tabs = `<nav class="chips at242n" aria-label="${esc(nm)} aisles"><a class="chip${!a ? ' on' : ''}" href="${base}"${!a ? ' aria-current="page"' : ''}>All aisles</a>${A.filter(x => (by[x[0]] || []).length).map(x => `<a class="chip${a && a[0] === x[0] ? ' on' : ''}" href="${base}/${x[0]}"${a && a[0] === x[0] ? ' aria-current="page"' : ''}><span aria-hidden="true">${x[2]}</span> ${esc(x[1])} <small>${by[x[0]].length.toLocaleString()}</small></a>`).join('')}</nav>`;
  const scopeC = `<div class="chips" role="group" aria-label="Which products"><button type="button" class="chip${scope === 'own' ? ' on' : ''}" aria-pressed="${scope === 'own'}" data-sc242="own">${esc(SBR[id])} only (${nOwn.toLocaleString()})</button><button type="button" class="chip${scope === 'all' ? ' on' : ''}" aria-pressed="${scope === 'all'}" data-sc242="all">Everything tagged at ${esc(nm)} (${nAll.toLocaleString()})</button></div>`;
  const sortC = `<div class="chips sortchips" role="group" aria-label="Sort"><span class="small">Sort:</span>${SORT242.map(([k, l]) => `<button type="button" class="chip${k === how ? ' on' : ''}" aria-pressed="${k === how}" data-so242="${k}">${l}</button>`).join('')}</div>`;
  const listCard = listCard242(id, by);
  let body;
  if (!a) body = A.filter(x => (by[x[0]] || []).length).map(x => { const L = sortA242(by[x[0]].slice(), how).slice(0, 6);
    return `<section class="card ax242" aria-labelledby="ah242-${x[0]}"><div class="fx-h"><h2 id="ah242-${x[0]}"><span aria-hidden="true">${x[2]}</span> ${esc(x[1])}</h2><a class="lnk" href="${base}/${x[0]}">See all ${by[x[0]].length.toLocaleString()} ›</a></div><ul class="al242">${L.map(d => row242(d, id)).join('')}</ul></section>`; }).join('');
  else { const L0 = by[a[0]] || [], subs = AIS().SUB.filter(s => s[1] === a[0]).map(s => [s, L0.filter(d => subId242(d) === s[0]).length]).filter(x => x[1]);
    const L = sortA242((sid ? L0.filter(d => subId242(d) === sid) : L0).slice(), how);
    body = `<section class="card ax242"><div class="fx-h"><h2><span aria-hidden="true">${a[2]}</span> ${esc(a[1])}${sid ? ' · ' + esc((AIS().SUB.find(s => s[0] === sid) || [])[2] || '') : ''}</h2><span class="small">${L.length.toLocaleString()} products</span></div>
      ${subs.length > 1 ? `<div class="chips subchips"><a class="chip${!sid ? ' on' : ''}" href="${base}/${a[0]}">All</a>${subs.map(([s, n]) => `<a class="chip${sid === s[0] ? ' on' : ''}" href="${base}/${a[0]}/${s[0]}">${esc(s[2])} <small>${n}</small></a>`).join('')}</div>` : ''}
      <label class="fl11 aq242"><span>Search this aisle</span><input id="aq242" class="in11" type="search" autocomplete="off" placeholder="Search in ${esc(a[1])}…"></label>
      <ul class="al242" id="al242"></ul><button type="button" class="btn wide" id="am242" hidden>Show more</button></section>`;
    setTimeout(() => { let lim = 40, q = ''; const draw = () => { const el = $('#al242'); if (!el) return; const R = q ? L.filter(d => (d.name + ' ' + (d.brand || '')).toLowerCase().includes(q)) : L;
      el.innerHTML = R.slice(0, lim).map(d => row242(d, id)).join('') || '<li class="small">No products match.</li>'; bindRows242(el); const m = $('#am242'); m.hidden = R.length <= lim; m.onclick = () => { lim += 40; draw(); }; };
      const i = $('#aq242'); if (i) { let t; i.oninput = () => { clearTimeout(t); t = setTimeout(() => { q = i.value.trim().toLowerCase(); lim = 40; draw(); }, 150); }; } draw(); }); }
  app.innerHTML = `<section class="pg13 am242"><header><a class="lnk back13" href="#/store/${id}">‹ ${esc(nm)}</a><h1>${SIC[id]} ${esc(nm)} aisle by aisle</h1>
     <p class="lead">Walk ${esc(nm)} section by section. Every product here is already in Lumi (${esc(SBR[id])} store brands${scope === 'all' ? `, plus products shoppers tagged as sold at ${esc(nm)}` : ''}), scored per serving: Health first, then Blood sugar, with sugar before total carbs.</p></header>
   ${listCard}
   <div class="card ac242">${scopeC}${sortC}${id === 'costco' ? '<p class="small"><a class="lnk" href="#/browse/rest-costco-food-court">🍕 Costco Food Court menu (official nutrition) ›</a></p>' : ''}</div>
   ${tabs}${body || `<div class="card"><p>No products found for ${esc(nm)} yet.</p></div>`}
   <p class="foot">Sections follow Lumi's grocery aisles, not your store's floor plan. Products and availability vary by location; "tagged at" comes from Open Food Facts shoppers. No tag means no data, not that the store doesn't carry it. Informational only.</p></section>`;
  app.querySelectorAll('[data-sc242]').forEach(b => b.onclick = () => { store.set('amScope242', b.dataset.sc242); viewAisleMode242(id, aid, sid); });
  app.querySelectorAll('[data-so242]').forEach(b => b.onclick = () => { store.set('amSort242', b.dataset.so242); const y = scrollY; viewAisleMode242(id, aid, sid).then(() => scrollTo(0, y)); });
  app.querySelectorAll('[data-ck242]').forEach(b => b.onchange = () => { const g = G21(), x = g.items.find(y => y.id === b.dataset.ck242); if (x) x.ck = b.checked; saveG21(g); b.closest('li').classList.toggle('ck', b.checked); const s = $('#gl242s'); if (s) s.textContent = left242(); });
  bindRows242(app);
}
const left242 = () => { const g = G21(); return `${g.items.filter(x => !x.ck).length} of ${g.items.length} left`; };
/* your grocery list in aisle order, check things off while you walk the store */
function listCard242(id, by) { const g = G21(); if (!g.items.length) return `<div class="card gl242"><h2>Your grocery list</h2><p class="small">Empty. Tap 🛒 List on anything below to add it, or build one from your <a class="lnk" href="#/plan">meal plan</a>.</p></div>`;
  const i = sIdx(id), S = STS(), A = [...AIS().AISLES, ['other', 'Other', '🛒']];
  const grp = A.map(a => [a, g.items.filter(x => (A.some(b => b[0] === x.ai) ? x.ai : 'other') === a[0])]).filter(x => x[1].length);
  return `<details class="card gl242" open><summary><h2>Your grocery list, in aisle order</h2><span class="small" id="gl242s" role="status">${left242()}</span></summary>
    ${grp.map(([a, L]) => `<h3 class="h242"><span aria-hidden="true">${a[2]}</span> ${esc(a[1])}</h3><ul class="gl21">${L.map(x => { const t = S.has(x.sm, i) ? `${esc(SBR[id])} store brand` : S.has(x.sm, S.SOLD + i) ? `Tagged at ${esc(SNAME[id])}` : '';
      return `<li class="gi242${x.ck ? ' ck' : ''}"><label class="gc21"><input type="checkbox" data-ck242="${esc(x.id)}"${x.ck ? ' checked' : ''}><span class="sr-only">Got it: ${esc(x.name)}</span></label><a href="#/product/${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.brand || '')}${t ? ' · ' + t : ''}</small></a></li>`; }).join('')}</ul>`).join('')}
    <div class="actions"><a class="btn" href="#/grocery">Open full grocery list</a></div></details>`; }
self.viewAisleMode242 = viewAisleMode242;
if (typeof viewStore === 'function') { const vs0 = viewStore; viewStore = async function (arg) { const p = String(arg || '').split('/');
  if (AM.includes(p[0]) && p[1] === 'aisles') return viewAisleMode242(p[0], p[2] || '', p[3] || '');
  const r = await vs0.apply(this, arguments);
  try { if (AM.includes(p[0]) && location.hash.startsWith('#/store/' + p[0]) && !$('#amk242')) { const h = app.querySelector('h1'); if (h) h.insertAdjacentHTML('afterend', `<p id="amk242"><a class="btn pri" href="#/store/${p[0]}/aisles">🧭 Aisle mode: shop ${esc(SNAME[p[0]])} section by section</a></p>`); } } catch (e) { console.warn(e); }
  return r; }; }
/* Browse: Costco and Whole Foods (pinned at the top) get an Aisle mode link */
if (typeof card181 === 'function') { const c0 = card181; card181 = function (s, pinned, feat) { const h = c0.apply(this, arguments);
  return feat && AM.includes(s.id) ? h.replace(/<\/div>$/, `<a class="sub181 am242l" href="#/store/${s.id}/aisles">🧭 Aisle mode <span>Shop ${esc(SNAME[s.id])} section by section</span></a></div>`) : h; }; }

/* ---------- daily log ---------- */
const SRC242 = { plan: 'From plan', bowl: 'Bowl', order: 'Chain meal' };
const dayEntries = dk => LOG.all().filter(e => dayKey(e.ts) === dk).sort((a, b) => a.ts - b.ts);
function dayCard242(dk, where) { const E = dayEntries(dk), st = settings(), all = mealScore241(E, 'Day'), T = all.T, today = dayKey(new Date());
  const M = MEALS.map(m => { const es = E.filter(e => e.meal === m); return [m, es, es.length ? mealScore241(es, MEAL_L[m]) : null]; });
  const tile = (l, v, u, key) => `<div class="${key ? 'key ' : ''}dt242"><small>${l}</small><b>${v == null ? '—' : u === 'Cal' ? Math.round(v) : g1(v)}${u && v != null && u !== 'Cal' ? ' ' + u : ''}</b></div>`;
  const tgt = st.target ? `<p class="small tg242">${T.carbs > st.target ? `${Math.round(T.carbs - st.target)} g total carbs over your ${st.target} g day target` : `${Math.round(st.target - (T.carbs || 0))} g total carbs left of your ${st.target} g day target`}</p><div class="br242" role="img" aria-label="${Math.round(T.carbs || 0)} of ${st.target} g total carbs"><span style="width:${Math.min(100, Math.round((T.carbs || 0) / st.target * 100))}%"></span></div>` : `<p class="small"><a class="lnk" href="#/settings">Set a daily total-carb target</a> (optional)</p>`;
  const P = typeof planned241 === 'function' ? MEALS.map(m => [m, planned241(dk, m)]).filter(x => x[1].length) : [];
  const loggedFromPlan = m => E.some(e => e.meal === m && e.src24 === 'plan');
  return `<section class="card dl242" id="dl242" aria-labelledby="dl242h"><div class="fx-h"><h2 id="dl242h">${where === 'today' ? 'Daily log' : dk === today ? "Today's totals" : 'Day totals'}</h2><span class="small">${E.length} item${E.length === 1 ? '' : 's'} logged</span></div>
    <div class="dg242">${tile('Sugar', T.sugars, 'g', 1)}${tile('Total carbs', T.carbs, 'g', 1)}${tile('Fiber', T.fiber, 'g')}${tile('Protein', T.protein, 'g')}${tile('Fat', T.fat, 'g')}${tile('Calories', T.kcal, 'Cal')}${T.sodiumMg != null ? tile('Sodium', T.sodiumMg, 'mg') : ''}</div>${tgt}
    <ul class="mm242">${M.map(([m, es, s]) => `<li><b>${MEAL_L[m]}</b>${s ? `<span class="ms242">${scores20(s.h, s.c)}</span>${sumLine241(s.T)}` : '<span class="small">Nothing logged</span>'}</li>`).join('')}</ul>
    ${P.length ? `<div class="pt242"><h3>On your meal plan ${dk === today ? 'today' : 'this day'}</h3><ul>${P.map(([m, G]) => `<li><span><b>${MEAL_L[m]}</b> <small>${G.map(x => esc(x.t)).join(' + ')}</small></span>${loggedFromPlan(m) ? '<span class="ok242">✓ Logged</span>' : `<button type="button" class="btn sm" data-lp242="${m}">Log ${MEAL_L[m].toLowerCase()}</button>`}</li>`).join('')}</ul></div>` : ''}
    <div class="actions dq242"><a class="btn sm" href="#/plan">📅 Meal plan</a><a class="btn sm" href="#/bowl">🥗 Build a bowl</a><a class="btn sm" href="#/order">🍔 Order builder</a><a class="btn sm" href="#/search">🔎 Find a food</a>${where === 'today' ? `<a class="btn sm" href="#/log${dk === today ? '' : '/' + dk}">Open log</a>` : ''}</div>
    <p class="small">Logging is optional. Meal scores are Lumi's per-meal scores for what you logged (Health first, then Blood sugar); sugar comes first, then total carbs. Nothing here leaves this device.</p></section>`; }
self.dayCard242 = dayCard242;
function bindDay242(dk, again) { app.querySelectorAll('[data-lp242]').forEach(b => b.onclick = () => { logGroups241(planned241(dk, b.dataset.lp242), b.dataset.lp242, dk); setTimeout(again, 50); }); }
function decorateLog242(arg) { const dk = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : dayKey(new Date()); if (arg && !/^\d{4}-\d{2}-\d{2}$/.test(arg)) return;
  const hd = app.querySelector('.dayhead'); if (!hd || $('#dl242')) return; app.classList.add('dl242p');
  hd.insertAdjacentHTML('afterend', dayCard242(dk, 'log')); const E = dayEntries(dk);
  /* meal headers + rows: sugar first, then total carbs; source tags */
  app.querySelectorAll('.card.meal').forEach((c, i) => { const m = MEALS[i], es = E.filter(e => e.meal === m), sp = c.querySelector('.fx-h > .small'); if (!es.length || !sp) return; const s = mealScore241(es); sp.innerHTML = `${g1(s.T.sugars)} g sugar · ${g1(s.T.carbs)} g total carbs${s.T.kcal != null ? ' · ' + Math.round(s.T.kcal) + ' Cal' : ''}`; });
  app.querySelectorAll('.loglist li [data-del]').forEach(b => { const e = E.find(x => x.id === b.dataset.del); if (!e) return; const li = b.closest('li'), v = li.querySelector('.v'), k = (+e.grams || 0) / 100, n = e.n || {};
    if (v) { v.innerHTML = `<span>${g1(n.sugars == null ? null : n.sugars * k)} g sugar</span><span>${g1(n.carbs == null ? null : n.carbs * k)} g carbs</span>`; v.classList.add('v242'); }
    if (e.src24 && SRC242[e.src24]) { const sm = li.querySelector('.t small'); if (sm && !sm.querySelector('.tag241')) sm.insertAdjacentHTML('beforeend', ` <span class="tag241">${SRC242[e.src24]}</span>`); } });
  bindDay242(dk, () => viewLog(arg)); }
if (typeof viewLog === 'function') { const vl = viewLog; viewLog = function (arg) { const r = vl.apply(this, arguments); try { decorateLog242(arg); } catch (e) { console.warn('v242 log', e); } return r; }; }
if (typeof viewToday16 === 'function') { const t0 = viewToday16; viewToday16 = function (a) { const r = t0.apply(this, arguments);
  try { const today = dayKey(new Date()), k = /^\d{4}-\d{2}-\d{2}$/.test(a || '') ? a : today, tt = app.querySelector('.tt16'), card = tt && tt.closest('.card');
    if (card && !$('#dl242')) { card.insertAdjacentHTML('beforebegin', dayCard242(k, 'today')); card.classList.add('old242'); app.classList.add('dl242p'); bindDay242(k, () => viewToday16(a)); }
    const E = dayEntries(k); app.querySelectorAll('.ml16 > li').forEach(li => { /* meal list: sugar first, then total carbs */ const m = MEALS.find(x => li.textContent.trim().startsWith(MEAL_L[x])); if (!m) return; const es = E.filter(e => e.meal === m); if (!es.length) return; const s = mealScore241(es);
      const w = document.createTreeWalker(li, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (/^\s*[\d.]+ g carbs\s*$/.test(n.textContent)) { n.textContent = `${g1(s.T.sugars)} g sugar · ${g1(s.T.carbs)} g total carbs`; break; } }); } catch (e) { console.warn('v242 today', e); } return r; }; self.viewToday16 = viewToday16; }
/* chain order builder: tag what it logs so the daily log can show "Chain meal" */
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-log24]'); if (!b) return; const t0 = Date.now() - 5;
  setTimeout(() => { const L = LOG.all(); let n = 0; L.forEach(x => { if (x.ts >= t0 && !x.src24 && /^(r-|ms-)/.test(x.pid || '')) { x.src24 = 'order'; n++; } }); if (n) LOG.save(L); }, 0); }, true);
/* the log nav called the planner "Weekly plan" */
new MutationObserver(() => { app.querySelectorAll('a[href="#/plan"]').forEach(a => { if (/Weekly plan/.test(a.textContent)) a.childNodes.forEach(n => { if (n.nodeType === 3 && /Weekly plan/.test(n.textContent)) n.textContent = n.textContent.replace('Weekly plan', 'Meal plan'); }); }); }).observe(app, { childList: true, subtree: true });
if (/^#\/(log|today|store\/(costco|wholefoods)\/aisles|browse)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
})();

if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift( /* 24.2 */
  ['🧭', 'Costco and Whole Foods aisle mode', 'Shop Costco or Whole Foods section by section: every aisle lists the Kirkland, 365 and tagged products already in Lumi, ranked by Health first, then Blood sugar (or least sugar), per serving. Your grocery list shows in aisle order so you can check items off as you walk the store. Find it under Browse on the pinned Costco and Whole Foods cards.'],
  ['📒', 'A clearer daily log', 'The log now leads with sugar, then total carbs, and scores every meal with Health and Blood sugar. Entries show whether they came from your meal plan, a bowl or a chain meal, and you can log what you planned for today in one tap. Logging stays optional and stays on your device.']);
