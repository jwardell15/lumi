/* Lumi 24.1: an editable weekly meal planner (#/plan) that scores every meal (Health first, Blood sugar second, per meal as planned),
   takes foods, saved meals, chain meals, bowls and meal ideas, and turns the week into a grocery list; bowls get portions
   (light / regular / extra / double) and can be saved as a meal, added to the plan or shared as a score card.
   Only real nutrition already in Lumi is used. Portions other than the chain's standard one are scaled from that portion. */
(function () {
'use strict';
const g1 = v => v == null || isNaN(v) ? '—' : (Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const NF = ['kcal', 'carbs', 'sugars', 'fiber', 'protein', 'fat', 'sat', 'sodiumMg'];
const isPI = it => it.pi != null ? !!it.pi : /^(r-|ms-)/.test(it.pid || '') && /item/i.test(it.label || '') && it.grams % 100 === 0;

/* ---------- shared: totals and both scores for a set of planned / logged items {pid,name,brand,grams,label,n(per 100 g or per item),pi} ---------- */
function mealScore241(items, name, brand) {
  const T = Object.fromEntries(NF.map(k => [k, 0])), miss = new Set(); let gsum = 0, pi = false, added = 0, addedOk = true;
  for (const it of items) { const k = (+it.grams || 0) / 100, n = it.n || {}; if (isPI(it)) pi = true; else gsum += +it.grams || 0;
    for (const f of NF) { const v = n[f]; if (v == null) miss.add(f); else T[f] += v * k; } if (n.added != null) added += n.added * k; else addedOk = false; }
  const tot = Object.fromEntries(NF.map(k => [k, miss.has(k) && T[k] === 0 ? null : T[k]]));
  if (!items.length) return { T: tot, miss, h: null, c: null };
  const div = !pi && gsum ? gsum / 100 : 1, n = {}; for (const k of NF) n[k] = tot[k] == null ? null : tot[k] / div; if (addedOk) n.added = added / div;
  const q = { id: 'pl241-' + items.map(x => x.pid).join('~').slice(0, 80), code: '', src: 'custom', name: name || items.map(x => x.name).join(' + '), brand: brand || '', qty: '', img: '', servQ: !pi && gsum ? Math.round(gsum) : 100,
    serv: !pi && gsum ? `1 meal (${Math.round(gsum)} g)` : '1 meal', nova: null, additives: [], ing: '', cat: 'Meal', cats: '', naLabel: true, liquid: false, portions: [], meta: { src: 'Lumi totals of the items listed', perItem: pi || !gsum }, n };
  let c = null, h = null; if (tot.carbs != null) { try { c = LumiScore.score(q).score; } catch {} try { h = LumiHealth.rate(q, { whole: false, group: '' }).score; } catch {} }
  return { T: tot, miss, h, c, q };
}
self.mealScore241 = mealScore241;
/* a product + multiplier -> planned item (same shape as a log entry / saved-meal item) */
function itemFrom241(p, m = 1, src = 'food') { const pi = !!(p.meta && p.meta.perItem), base = pi ? 100 : (+p.servQ || 100), u = p.liquid ? 'ml' : 'g';
  const lab = pi ? (m === 1 ? '1 item' : g1(m) + ' items') : `${m !== 1 ? g1(m) + ' × ' : ''}${p.servQ ? (p.serv && !/^\d+(\.\d+)?\s*(g|ml)$/i.test(String(p.serv).trim()) ? p.serv : Math.round(p.servQ) + ' ' + u) : '100 ' + u}`;
  return { k: uid(), pid: p.id, name: p.name, brand: p.brand || '', grams: Math.round(base * m * 10) / 10, label: lab, n: per100(p), pi, m, src }; }
self.itemFrom241 = itemFrom241;
const sumLine = (T, cls = '') => `<span class="ln241 ${cls}"><b>${g1(T.sugars)} g</b> sugar · <b>${g1(T.carbs)} g</b> total carbs${T.protein != null ? ` · ${g1(T.protein)} g protein` : ''}${T.kcal != null ? ` · ${Math.round(T.kcal)} Cal` : ''}</span>`;
self.sumLine241 = sumLine;

/* ---------- planner store: plan24 = { weeks: { '<monday>': [ {breakfast:[grp], lunch:[], dinner:[], snack:[]} ×7 ] } }, grp = {k,t,src,items:[...]} ---------- */
const monday = d => { const x = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00') : new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dayKey(x); };
const addDays = (k, n) => { const x = new Date(k + 'T12:00'); x.setDate(x.getDate() + n); return dayKey(x); };
const P = () => { const p = store.get('plan24', null); return p && p.weeks ? p : { weeks: {} }; };
const saveP = p => { const ks = Object.keys(p.weeks).sort(); while (ks.length > 26) delete p.weeks[ks.shift()]; store.set('plan24', p); };
const week = (p, wk) => p.weeks[wk] || (p.weeks[wk] = Array.from({ length: 7 }, () => ({})));
const slot = (p, dk, m) => { const w = week(p, monday(dk)), i = Math.round((new Date(dk + 'T12:00') - new Date(monday(dk) + 'T12:00')) / 864e5); const d = w[i]; return d[m] || (d[m] = []); };
function addPlan241(dk, meal, grp) { const p = P(); slot(p, dk, meal).push(Object.assign({ k: uid() }, grp)); saveP(p); }
const planned241 = (dk, meal) => { const w = P().weeks[monday(dk)]; if (!w) return []; const i = Math.round((new Date(dk + 'T12:00') - new Date(monday(dk) + 'T12:00')) / 864e5); return (w[i] && w[i][meal]) || []; };
self.addPlan241 = addPlan241; self.planned241 = planned241; self.monday241 = monday;
const SRC = { food: '', meal: 'Saved meal', bowl: 'Bowl', order: 'Chain meal', idea: 'Meal idea', recent: '' };

/* ---------- "Add to plan" sheet (used from product pages, chain meals, bowls, saved meals) ---------- */
function planSheet241(grp, after) {
  const today = dayKey(new Date()), days = Array.from({ length: 14 }, (_, i) => addDays(today, i)); let dk = today, ml = mealFor(new Date());
  const lab = k => { const d = new Date(k + 'T12:00'); return (k === today ? 'Today · ' : k === addDays(today, 1) ? 'Tomorrow · ' : '') + d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
  const el = sheet(`<h2 id="ps241h">Add to meal plan</h2><p class="small"><b>${esc(grp.t)}</b>${grp.items.length > 1 ? ` · ${grp.items.length} items` : ''}</p>
   <label class="fl11"><span>Day</span><select id="ps241d" class="in11">${days.map(k => `<option value="${k}">${esc(lab(k))}</option>`).join('')}</select></label>
   <div class="seg wide" id="ps241m" role="group" aria-label="Meal">${MEALS.map(m => `<button type="button" data-m="${m}" class="${m === ml ? 'on' : ''}" aria-pressed="${m === ml}">${MEAL_L[m]}</button>`).join('')}</div>
   <div class="actions"><button class="btn" data-close>Cancel</button><button class="btn pri" id="ps241ok">Add to plan</button></div>`);
  el.querySelector('.sheet-card').setAttribute('aria-labelledby', 'ps241h');
  $('#ps241d').onchange = e => dk = e.target.value;
  el.querySelectorAll('#ps241m button').forEach(b => b.onclick = () => { ml = b.dataset.m; el.querySelectorAll('#ps241m button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); });
  $('#ps241ok').onclick = () => { addPlan241(dk, ml, grp); closeSheet(); snack9(`Added to ${MEAL_L[ml]}, ${lab(dk)}`, null); if (typeof after === 'function') after(dk, ml); };
  setTimeout(() => { const s = $('#ps241d'); if (s) s.focus(); }, 30);
}
self.planSheet241 = planSheet241;

/* ---------- the planner ---------- */
const tgts = () => (typeof mealT9 === 'function' ? mealT9() : {});
function grpHTML(gp, dk, m) { const s = mealScore241(gp.items, gp.t);
  return `<li class="gp241" data-gk="${gp.k}"><div class="gh241"><span class="gt241"><b>${esc(gp.t)}</b>${SRC[gp.src] ? `<small class="tag241">${SRC[gp.src]}</small>` : ''}</span>
    ${gp.items.length === 1 ? `<label class="pm241"><span class="vh">Portion of ${esc(gp.t)}</span><select data-pm241="${dk}|${m}|${gp.k}" aria-label="Portion of ${esc(gp.t)}">${[0.5, 1, 1.5, 2, 3].map(v => `<option value="${v}"${(gp.items[0].m || 1) === v ? ' selected' : ''}>${v === 1 ? '1 portion' : g1(v) + ' ×'}</option>`).join('')}</select></label>` : ''}
    <button type="button" class="icon sm" data-rm241="${dk}|${m}|${gp.k}" aria-label="Remove ${esc(gp.t)}">✕</button></div>
    <small class="it241">${gp.items.map(it => `${esc(it.name)} <span>${esc(it.label || '')}</span>`).join(' + ')}</small>
    <div class="gs241">${scores20(s.h, s.c)}${sumLine(s.T)}</div></li>`; }
function viewPlan241(arg) {
  document.title = 'Meal plan — Lumi'; app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim();
  const a = String(arg || ''), wk = /^w\/\d{4}-\d{2}-\d{2}$/.test(a) ? monday(a.slice(2)) : monday(new Date()), p = P(), W = week(p, wk), today = dayKey(new Date()), T = tgts();
  const wEnd = addDays(wk, 6), fmt = k => new Date(k + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const all = W.flatMap(d => MEALS.flatMap(m => (d[m] || []).flatMap(gp => gp.items))), wkS = mealScore241(all, 'This week');
  const filled = W.reduce((n, d) => n + MEALS.filter(m => (d[m] || []).length).length, 0);
  const legacy = !filled && store.get('plan13', null);
  app.innerHTML = `<section class="pg13 pl241"><header class="pl241h"><div><h1>Meal plan</h1><p class="lead">Plan your week with real foods, chain meals, bowls and saved meals. Every meal shows its Health and Blood sugar scores for the whole meal as planned, sugar first.</p></div>
    <nav class="wn241" aria-label="Week"><a class="btn sm" href="#/plan/w/${addDays(wk, -7)}" aria-label="Previous week">‹</a><b>${fmt(wk)} – ${fmt(wEnd)}</b><a class="btn sm" href="#/plan/w/${addDays(wk, 7)}" aria-label="Next week">›</a>${wk !== monday(new Date()) ? `<a class="btn sm" href="#/plan">This week</a>` : ''}</nav></header>
   <div class="card ws241"><div><h2>This week's plan</h2><p class="small">${filled} of 28 meals planned${filled ? ' · totals for everything planned' : ''}.</p></div>${filled ? sumLine(wkS.T) : ''}
    <div class="actions"><button class="btn pri" id="pl241g">🛒 Grocery list for this week</button><button class="btn" id="pl241i">💡 Fill empty meals with ideas</button>${filled ? '<button class="btn" id="pl241c">Copy to next week</button><button class="btn" id="pl241x">Clear week</button>' : ''}</div>
    ${legacy ? '<p class="small">You have an auto plan from an older Lumi. <button class="btn sm" id="pl241l">Bring it into this week</button></p>' : ''}</div>
   <div class="dg241">${W.map((d, i) => { const dk = addDays(wk, i), dayItems = MEALS.flatMap(m => (d[m] || []).flatMap(gp => gp.items)), ds = mealScore241(dayItems, 'Day');
     return `<section class="card day241${dk === today ? ' tdy241' : ''}" aria-labelledby="dh241-${i}"><div class="dh241"><h2 id="dh241-${i}">${new Date(dk + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}${dk === today ? ' <small class="tag241">Today</small>' : ''}</h2>${dayItems.length ? sumLine(ds.T, 'dt241') : ''}</div>
      <ul class="ms241">${MEALS.map(m => { const G = d[m] || [], its = G.flatMap(gp => gp.items), ms = mealScore241(its, MEAL_L[m]);
        return `<li class="m241"><div class="mh241"><b>${MEAL_L[m]}</b>${its.length && G.length > 1 ? `<span class="mt241">${scores20(ms.h, ms.c)}</span>` : ''}</div>
         ${its.length && T[m] ? bar9(ms.T.carbs || 0, T[m], MEAL_L[m]) : ''}
         ${G.length ? `<ul class="gl241">${G.map(gp => grpHTML(gp, dk, m)).join('')}</ul>` : ''}
         <div class="mb241"><button type="button" class="chip" data-add241="${dk}|${m}" aria-label="Add to ${MEAL_L[m]}, ${new Date(dk + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' })}">＋ Add</button>${its.length ? `<button type="button" class="chip" data-log241="${dk}|${m}">Log ${MEAL_L[m].toLowerCase()}</button><button type="button" class="chip" data-card241="${dk}|${m}">🖼 Card</button>` : ''}</div></li>`; }).join('')}</ul></section>`; }).join('')}</div>
   <p class="foot">Scores are Lumi's per-meal scores for the amounts planned. Restaurant items use the chain's published nutrition per item. Ideas, not medical advice; check labels and confirm doses on your pump.</p></section>`;
  const at = s => { const [dk, m, k] = s.split('|'); return { dk, m, k }; };
  const redraw = () => { const y = scrollY; viewPlan241(arg); scrollTo(0, y); };
  app.querySelectorAll('[data-add241]').forEach(b => b.onclick = () => { const { dk, m } = at(b.dataset.add241); addSheet241(dk, m, redraw); });
  app.querySelectorAll('[data-rm241]').forEach(b => b.onclick = () => { const { dk, m, k } = at(b.dataset.rm241); const q = P(), s = slot(q, dk, m), i = s.findIndex(x => x.k === k); if (i < 0) return; const [gone] = s.splice(i, 1); saveP(q); redraw();
    snack9('Removed ' + gone.t, () => { const r = P(); slot(r, dk, m).splice(i, 0, gone); saveP(r); redraw(); }); });
  app.querySelectorAll('[data-pm241]').forEach(s => s.onchange = () => { const { dk, m, k } = at(s.dataset.pm241); const q = P(), gp = slot(q, dk, m).find(x => x.k === k); if (!gp) return; const it = gp.items[0], v = +s.value, f = v / (it.m || 1);
    it.grams = Math.round(it.grams * f * 10) / 10; it.m = v; it.label = it.label.replace(/^[\d.]+ × /, '').replace(/^[\d.]+ items$/, '1 item'); if (v !== 1) it.label = isPI(it) ? g1(v) + ' items' : g1(v) + ' × ' + it.label; saveP(q); redraw(); const n = document.querySelector(`[data-pm241="${s.dataset.pm241}"]`); if (n) n.focus(); });
  app.querySelectorAll('[data-log241]').forEach(b => b.onclick = () => { const { dk, m } = at(b.dataset.log241); logGroups241(planned241(dk, m), m, dk); });
  app.querySelectorAll('[data-card241]').forEach(b => b.onclick = () => { const { dk, m } = at(b.dataset.card241); const G = planned241(dk, m), its = G.flatMap(x => x.items), s = mealScore241(its);
    shareSheet24({ kind: 'meal', title: `${MEAL_L[m]} · ${new Date(dk + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`, sub: its.map(x => x.name).join(' + '), serving: 'Whole meal as planned' + (its.some(isPI) ? ' (restaurant items per item)' : s.q ? `, ${Math.round(s.q.servQ)} g` : ''), h: s.h, c: s.c, sugar: s.T.sugars, carbs: s.T.carbs, warn: [s.T.carbs > 75 ? 'High carbs for one meal' : '', s.T.sodiumMg > 1500 ? 'Very high sodium' : ''].filter(Boolean), url: '', file: 'lumi-plan-' + dk + '-' + m + '.png' }); });
  $('#pl241g').onclick = () => { location.hash = '#/plan/grocery/' + wk; };
  $('#pl241i').onclick = () => fillIdeas241(wk).then(n => { redraw(); toast(n ? `Added ${n} meal ideas to empty meals` : 'No empty meals, or no ideas fit your targets'); });
  if ($('#pl241c')) $('#pl241c').onclick = () => { const q = P(), nx = addDays(wk, 7), src = week(q, wk), dst = week(q, nx); let n = 0;
    src.forEach((d, i) => MEALS.forEach(m => (d[m] || []).forEach(gp => { (dst[i][m] = dst[i][m] || []).push(JSON.parse(JSON.stringify(Object.assign({}, gp, { k: uid() })))); n++; }))); saveP(q); toast(`Copied ${n} to next week`); location.hash = '#/plan/w/' + nx; };
  if ($('#pl241x')) $('#pl241x').onclick = () => { if (!confirm('Clear every meal planned this week?')) return; const q = P(); const old = q.weeks[wk]; delete q.weeks[wk]; saveP(q); redraw(); snack9('Week cleared', () => { const r = P(); r.weeks[wk] = old; saveP(r); redraw(); }); };
  if ($('#pl241l')) $('#pl241l').onclick = () => importLegacy241(wk).then(n => { redraw(); toast(n ? `Brought in ${n} meals` : 'Nothing to bring in'); });
}
function logGroups241(G, m, dk) { const its = G.flatMap(x => x.items); if (!its.length) return; const today = dayKey(new Date()), ts = dk === today ? Date.now() : new Date(dk + 'T' + ({ breakfast: '08:00', lunch: '12:30', dinner: '18:30', snack: '15:30' }[m])).getTime();
  const L = LOG.all(), ids = []; its.forEach((it, i) => { const id = 'e' + (ts + i).toString(36) + Math.random().toString(36).slice(2, 5); ids.push(id); L.push({ id, ts, meal: m, pid: it.pid, name: it.name, brand: it.brand, grams: it.grams, label: it.label, n: it.n, score: null, src24: 'plan' }); });
  LOG.save(L); snack9(`Logged ${its.length} item${its.length > 1 ? 's' : ''} to ${MEAL_L[m]}${dk === today ? '' : ', ' + new Date(dk + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`, () => { LOG.save(LOG.all().filter(e => !ids.includes(e.id))); toast('Removed'); }); }
self.logGroups241 = logGroups241;
/* meal ideas (v13 data: USDA staples, packaged items, official restaurant items) -> plan groups; sugar comes from the same index row */
const ideaGrp = x => ({ t: x.parts.map(([it]) => it.nm).join(' + '), src: 'idea', items: x.parts.map(([it, q]) => { const e = ent13(it, q), d = typeof engine !== 'undefined' && engine.byCode ? engine.byCode(it.id) : null; if (d && d.sugar != null && e.n.sugars == null) e.n.sugars = d.sugar; return { k: uid(), pid: e.id, name: e.name, brand: e.brand, grams: e.grams, label: e.label, n: e.n, pi: !!e.perItem, m: q, src: 'idea' }; }) });
async function fillIdeas241(wk) { let d; try { d = await M13(); } catch { return 0; } try { await loadIndex(); } catch {} const q = P(), W = week(q, wk); let n = 0;
  MEALS.forEach(m => { const used = new Set(W.flatMap(x => (x[m] || []).flatMap(gp => gp.items.map(i => i.pid)))), opts = pick13(d, m, 14, (Date.now() / 864e5 | 0) + m.length * 13, used); let k = 0;
    W.forEach(day => { if ((day[m] || []).length || !opts.length) return; day[m] = [Object.assign({ k: uid() }, ideaGrp(opts[k++ % opts.length]))]; n++; }); });
  saveP(q); return n; }
async function importLegacy241(wk) { const old = store.get('plan13', null); if (!old || !old.days) return 0; let d; try { d = await M13(); } catch { return 0; } try { await loadIndex(); } catch {} const q = P(), W = week(q, wk); let n = 0;
  old.days.slice(0, 7).forEach((day, i) => MEALS.forEach(m => { const ps = slot13(d, day[m]); if (!ps.length || (W[i][m] || []).length) return; W[i][m] = [Object.assign({ k: uid() }, ideaGrp({ parts: ps }))]; n++; })); saveP(q); return n; }

/* ---------- add sheet: search, saved meals, my foods & bowls, recent, ideas ---------- */
function addSheet241(dk, m, done) {
  const dl = new Date(dk + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }); let tab = store.get('addTab241', 'search');
  const el = sheet(`<h2 id="as241h">Add to ${MEAL_L[m]} · ${esc(dl)}</h2><div class="sg12 as241t" role="tablist" aria-label="Add from">${[['search', 'Search'], ['meals', 'My meals'], ['mine', 'My foods & bowls'], ['recent', 'Recent'], ['ideas', 'Ideas']].map(([k, l]) => `<a href="#" role="tab" data-at241="${k}" aria-selected="${k === tab}"${k === tab ? ' class="on"' : ''}>${l}</a>`).join('')}</div><div id="as241b" class="as241b"></div><div class="actions"><button class="btn" data-close>Done</button></div>`);
  el.querySelector('.sheet-card').setAttribute('aria-labelledby', 'as241h'); el.querySelector('.sheet-card').classList.add('as241');
  const put = (grp, b) => { addPlan241(dk, m, grp); if (b) { b.textContent = '✓ Added'; b.disabled = true; } toast(`Added to ${MEAL_L[m]}`); added = true; };
  let added = false; el.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', () => { if (added && done) done(); }));
  const rowB = (id, title, sub, extra) => `<li><div class="ar241"><span><b>${esc(title)}</b><small>${sub}</small></span>${extra || ''}<button type="button" class="btn sm" data-pick241="${esc(id)}">＋ Add</button></div></li>`;
  const body = $('#as241b');
  const paint = async () => { el.querySelectorAll('[data-at241]').forEach(a => { const on = a.dataset.at241 === tab; a.classList.toggle('on', on); a.setAttribute('aria-selected', String(on)); }); store.set('addTab241', tab);
    if (tab === 'search') { body.innerHTML = `<label class="fl11"><span>Find a food or menu item</span><input id="as241q" class="in11" type="search" autocomplete="off" placeholder="e.g. Greek yogurt, Chipotle chicken, eggs"></label><ul class="ar241l" id="as241r"></ul>`;
      let t; const q = $('#as241q'); q.focus(); q.oninput = () => { clearTimeout(t); t = setTimeout(async () => { const v = q.value.trim(), out = $('#as241r'); if (!out) return; if (v.length < 2) { out.innerHTML = ''; return; } try { await loadIndex(); } catch {}
        const R = engine.search(v, { limit: 14, filter: d => !d.bad }); out.innerHTML = R.map(d => { const ps = perServ20(d); return rowB(d.code, d.name, `${esc(d.brand || (d.src === 'whole' ? 'USDA' : ''))}${ps ? ` · ${g1(ps.s)} g sugar · ${g1(ps.c)} g carbs ${esc(ps.basis)}` : ''}`, `<span class="sc241">${scores20(d.h, d.score)}</span>`); }).join('') || '<li class="small">No matches.</li>';
        out.querySelectorAll('[data-pick241]').forEach(b => b.onclick = async () => { b.disabled = true; try { const p = await resolveProduct(b.dataset.pick241); if (!p) throw 0; remember(p); put({ t: p.name, src: p.src === 'rest' || /^(r-|ms-)/.test(p.id) ? 'food' : 'food', items: [itemFrom241(p, 1)] }, b); } catch (e) { console.warn(e); b.disabled = false; toast("Couldn't load that food"); } }); }, 220); }; return; }
    if (tab === 'meals') { const ms = savedMeals(); body.innerHTML = ms.length ? `<ul class="ar241l">${ms.map(x => { const s = mealScore241(x.items); return rowB(x.id, x.name, `${x.items.length} item${x.items.length > 1 ? 's' : ''} · ${g1(s.T.sugars)} g sugar · ${g1(s.T.carbs)} g carbs`, `<span class="sc241">${scores20(s.h, s.c)}</span>`); }).join('')}</ul>` : '<p class="small">No saved meals yet. Save one from your log, a chain meal or a bowl.</p>';
      body.querySelectorAll('[data-pick241]').forEach(b => b.onclick = () => { const x = savedMeals().find(y => y.id === b.dataset.pick241); if (x) put({ t: x.name, src: x.bowl241 ? 'bowl' : 'meal', items: x.items.map(it => Object.assign({ k: uid(), m: 1 }, it)) }, b); }); return; }
    if (tab === 'mine') { const C = customFoods(); body.innerHTML = C.length ? `<ul class="ar241l">${C.map(p => { let h = null, c = null; try { c = LumiScore.score(p).score; } catch {} try { h = LumiHealth.rate(p, { whole: false, group: '' }).score; } catch {} return rowB(p.id, p.name, esc(p.brand || 'My food') + ' · ' + esc(servLabel24(p).replace(/<[^>]+>/g, '')), `<span class="sc241">${scores20(h, c)}</span>`); }).join('')}</ul>` : '<p class="small">No custom foods or saved bowls yet.</p>';
      body.querySelectorAll('[data-pick241]').forEach(b => b.onclick = () => { const p = customFoods().find(y => y.id === b.dataset.pick241); if (p) put({ t: p.name, src: /\(built\)$/.test(p.brand || '') ? 'bowl' : 'food', items: [itemFrom241(p, 1)] }, b); }); return; }
    if (tab === 'recent') { const seen = new Set(), R = []; LOG.all().slice().reverse().forEach(e => { if (!seen.has(e.pid + e.label) && R.length < 20) { seen.add(e.pid + e.label); R.push(e); } });
      body.innerHTML = R.length ? `<ul class="ar241l">${R.map(e => rowB(e.id, e.name, `${esc(e.brand || '')} · ${esc(e.label || '')}`)).join('')}</ul>` : '<p class="small">Nothing logged yet.</p>';
      body.querySelectorAll('[data-pick241]').forEach(b => b.onclick = () => { const e = LOG.all().find(y => y.id === b.dataset.pick241); if (e) put({ t: e.name, src: 'food', items: [{ k: uid(), pid: e.pid, name: e.name, brand: e.brand, grams: e.grams, label: e.label, n: e.n, m: 1, src: 'recent' }] }, b); }); return; }
    if (tab === 'ideas') { body.innerHTML = skel(2); let d; try { d = await M13(); await loadIndex(); } catch { body.innerHTML = '<p class="small">Meal ideas couldn\'t load. Check your connection.</p>'; return; }
      const L = pick13(d, m, 8, (Date.now() / 6e4 | 0)), G = L.map(ideaGrp); body.innerHTML = G.length ? `<p class="small">Lower-carb ideas from real foods in Lumi${tgts()[m] ? `, within your ${tgts()[m]} g ${MEAL_L[m].toLowerCase()} target` : ''}.</p><ul class="ar241l">${G.map((gp, i) => { const s = mealScore241(gp.items); return rowB(String(i), gp.t, `${g1(s.T.sugars)} g sugar · ${g1(s.T.carbs)} g carbs`, `<span class="sc241">${scores20(s.h, s.c)}</span>`); }).join('')}</ul>` : '<p class="small">No ideas fit this target.</p>';
      body.querySelectorAll('[data-pick241]').forEach(b => b.onclick = () => put(G[+b.dataset.pick241], b)); } };
  el.querySelectorAll('[data-at241]').forEach(a => a.onclick = e => { e.preventDefault(); tab = a.dataset.at241; paint(); });
  paint();
}

/* ---------- grocery list for a planned week ---------- */
async function viewPlanGrocery241(wk0) {
  const wk = /^\d{4}-\d{2}-\d{2}$/.test(wk0 || '') ? monday(wk0) : monday(new Date()); document.title = 'Grocery list for your plan — Lumi';
  app.innerHTML = `<section class="pg13 pg241"><a class="lnk back13" href="#/plan${wk === monday(new Date()) ? '' : '/w/' + wk}">‹ Meal plan</a><h1>Groceries for this plan</h1><div id="pg241">${skel(3)}</div></section>`;
  try { await loadIndex(); } catch {} const W = P().weeks[wk] || [], M = new Map(), rest = new Map();
  W.forEach(d => MEALS.forEach(m => (d[m] || []).forEach(gp => gp.items.forEach(it => { const r = /^(r-|ms-)/.test(it.pid || '') || /^(ord24|pl241|bowl20)/.test(it.pid || ''); const tgt = r ? rest : M; const e = tgt.get(it.pid) || { it, g: 0, n: 0, pi: isPI(it) }; e.g += +it.grams || 0; e.n++; tgt.set(it.pid, e); }))));
  const AIS = window.LumiAisles, aisleOf = id => { const d = engine.byCode && engine.byCode(id); let ai = d && d.ai != null && d.ai >= 0 ? d.ai : -1; if (ai < 0) { const e = M.get(id); try { ai = AIS.classify({ name: e ? e.it.name : '', cats: '', ucat: '' }); } catch { ai = -1; } } if (ai == null || ai < 0) return 'Other'; const a = AIS.AISLES.find(x => x[0] === AIS.SUB[ai][1]); return a ? a[2] + ' ' + a[1] : 'Other'; };
  const groups = {}; [...M.values()].forEach(e => (groups[aisleOf(e.it.pid)] = groups[aisleOf(e.it.pid)] || []).push(e));
  const el = $('#pg241'); if (!el) return;
  if (!M.size && !rest.size) { el.innerHTML = `<div class="card"><p>Nothing planned this week yet.</p><div class="actions"><a class="btn pri" href="#/plan">Plan meals</a></div></div>`; return; }
  el.innerHTML = `<p class="lead">Everything to buy for ${M.size} planned food${M.size === 1 ? '' : 's'}, totalled across the week, by aisle.</p>
   <div class="actions"><button class="btn pri" id="pg241a">＋ Add all to my grocery list</button><a class="btn" href="#/grocery">Open grocery list</a></div><p class="small" id="pg241s" role="status"></p>
   ${Object.keys(groups).sort().map(h => `<section class="card"><h2>${esc(h)}</h2><ul class="gl13">${groups[h].sort((a, b) => a.it.name.localeCompare(b.it.name)).map(e => `<li><span class="gi241"><b>${esc(e.it.name)}</b><small>${esc(e.it.brand || '')}${e.it.brand ? ' · ' : ''}${e.n}× in plan${e.pi ? '' : ` · about ${Math.round(e.g)} ${/ml/.test(e.it.label || '') ? 'ml' : 'g'} total`}</small></span></li>`).join('')}</ul></section>`).join('')}
   ${rest.size ? `<section class="card"><h2>Eating out (not on the list)</h2><ul class="gl13">${[...rest.values()].map(e => `<li><span class="gi241"><b>${esc(e.it.name)}</b><small>${esc(e.it.brand || '')} · ${e.n}×</small></span></li>`).join('')}</ul></section>` : ''}`;
  $('#pg241a').onclick = async () => { const b = $('#pg241a'); b.disabled = true; let n = 0, k = 0; for (const e of M.values()) { try { const it = await itemFor21(e.it.pid, 'plan'); if (it && addG21(it)) n++; else k++; } catch { k++; } } $('#pg241s').textContent = `Added ${n} to your grocery list${k ? ` (${k} already there or not found)` : ''}.`; b.disabled = false; toast(`Added ${n} to your grocery list`); };
}

/* ---------- 24.1 bowls: portions (light / regular / extra / double…), Save as a meal, Add to plan, score card ---------- */
const STEP = [0.5, 1, 1.5, 2, 3, 4], PL = v => v === 0.5 ? 'Light ½' : v === 1.5 ? 'Extra 1½×' : v + '×';
async function viewBowl241(id) {
  const cfg = BOWL20.find(c => c.id === id); if (!cfg) return viewBowlHub20();
  document.title = cfg.title + ' builder — Lumi'; app.innerHTML = `<section class="pg13 bw20"><h1>${esc(cfg.title)}</h1><div class="skel" style="height:200px"></div></section>`;
  const G = await bowlItems20(cfg); if (!location.hash.startsWith('#/bowl/' + id)) return;
  if (!G.length) { app.innerHTML = `<section class="pg13 bw20"><h1>${esc(cfg.title)}</h1><div class="card"><p>${esc(cfg.chain)} ingredient data isn't loaded. Check your connection and try again.</p></div></section>`; return; }
  const st = draft20(id) || { sel: {}, sv: 1, name: '' }, sel = st.sel, save = () => store.set('bowl20:' + id, st), nm = d => cfg.strip ? d.name.replace(cfg.strip, '') : d.name;
  const all = new Map(); G.forEach(g => g.items.forEach(d => all.set(d.code, d))); for (const c of Object.keys(sel)) if (!all.has(c)) delete sel[c];
  const prods = new Map(), need = async () => { await Promise.all(Object.keys(sel).filter(c => !prods.has(c)).map(async c => { try { const p = await resolveProduct(c); if (p) prods.set(c, p); } catch {} })); };
  app.innerHTML = `<section class="pg13 bw20 bw241"><header><h1>${esc(cfg.title)}</h1><p class="lead">Built from ${esc(cfg.chain)}'s official nutrition for each ingredient. Tap to add, then pick a portion: light, regular, extra or more.</p>${cfg.note ? `<p class="note small">${esc(cfg.note)}</p>` : ''}</header>
   <div class="bwl20"><div class="bwg20">${G.map(g => `<fieldset class="card bf20"><legend><h2>${esc(g.l)}</h2><small>${g.max === 1 ? 'Choose 1' : g.max ? 'Up to ' + g.max : 'Any'}</small></legend><ul class="bi20l">${g.items.map(d => { const q = perServ20(d) || {};
     return `<li><button type="button" class="bo20" data-c="${esc(d.code)}" data-g="${g.k}" aria-pressed="false"><span class="bn20">${esc(nm(d))}</span><small>${q.s == null ? '' : g1(q.s) + ' g sugar · '}${q.c == null ? '' : g1(q.c) + ' g carbs'}</small></button><label class="bq241" hidden><span class="vh">Portion of ${esc(nm(d))}</span><select data-por="${esc(d.code)}" aria-label="Portion of ${esc(nm(d))}">${STEP.map(v => `<option value="${v}">${PL(v)}</option>`).join('')}</select></label></li>`; }).join('')}</ul></fieldset>`).join('')}</div>
   <aside class="card bt20" aria-live="polite" aria-label="Your build"><div id="bt20"></div></aside></div>
   <p class="foot">Per-ingredient values are as published by ${esc(cfg.chain)} for one standard portion. Light, extra and double portions are that portion scaled (½, 1½, 2…), an estimate; restaurant portions vary. Informational only.</p></section>`;
  const items = () => Object.entries(sel).map(([c, m]) => { const p = prods.get(c); return p ? Object.assign(itemFrom241(p, m, 'bowl'), { name: nm(all.get(c)) }) : null; }).filter(Boolean);
  const product = (sv) => { const its = items(), s = mealScore241(its, (st.name || '').trim() || `My ${cfg.title}`, cfg.chain + ' (built)'), q = s.q; if (!q) return null; const pi = q.meta.perItem, n = {};
    const tot = s.T, gs = its.reduce((a, x) => a + x.grams, 0), sg = pi ? 100 : gs / sv, div = pi ? sv : gs / 100; for (const k of NF) n[k] = tot[k] == null ? null : tot[k] / div;
    return { id: 'bowl20-' + id, code: '', src: 'custom', name: q.name, brand: cfg.chain + ' (built)', qty: '', img: '', servQ: Math.round(sg * 10) / 10, serv: pi ? (sv > 1 ? `1 of ${sv} servings` : '1 ' + cfg.kind) : `${sv > 1 ? `1 of ${sv} servings` : '1 ' + cfg.kind} (${Math.round(sg)} g)`, nova: null, additives: [], ing: '', cat: 'Restaurant meal', cats: '', naLabel: true, liquid: false,
      portions: [[pi ? '1 serving' : `1 serving (${Math.round(sg)} g)`, Math.round(sg * 10) / 10]], meta: { src: `Built from ${cfg.chain} official ingredient nutrition`, perItem: pi, built: { chain: cfg.chain, items: Object.entries(sel).map(([c, m]) => (m !== 1 ? PL(m) + ' ' : '') + nm(all.get(c))), servings: sv } }, n, _miss: s.miss }; };
  const paint = () => app.querySelectorAll('.bo20').forEach(b => { const on = !!sel[b.dataset.c]; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); const l = b.nextElementSibling; l.hidden = !on; const s = l.querySelector('select'); if (on) s.value = String(sel[b.dataset.c]); });
  const draw = async () => { await need(); if (!location.hash.startsWith('#/bowl/' + id)) return; paint(); const el = $('#bt20'); if (!el) return;
    if (!Object.keys(sel).length) { el.innerHTML = `<h2>Your ${esc(cfg.kind)}</h2><p class="small">Nothing added yet. Pick a ${esc(G[0].l.toLowerCase())} to start.</p>`; return; }
    const sv = Math.max(1, +st.sv || 1), p = product(sv); if (!p) { el.innerHTML = `<h2>Your ${esc(cfg.kind)}</h2><p class="small">Loading ingredients…</p>`; return; }
    let sc = null, h = null; try { sc = LumiScore.score(p).score; } catch {} try { h = LumiHealth.rate(p, { whole: false, group: '' }).score; } catch {}
    const k = p.meta.perItem ? 1 : p.servQ / 100, ps = f => p.n[f] == null ? null : p.n[f] * k, miss = [...p._miss];
    el.innerHTML = `<h2>Your ${esc(cfg.kind)}</h2><label class="fl11 bwn20"><span>Name</span><input id="bwName" class="in11" value="${esc(st.name || '')}" placeholder="My ${esc(cfg.title)}" autocomplete="off"></label>
     <div class="bsc20">${scores20(h, sc)}</div><p class="small">Scores ${sv > 1 ? `per serving (1 of ${sv})` : `for the whole ${esc(cfg.kind)}`}${p.meta.perItem ? '' : `, ${Math.round(p.servQ)} g`}.</p>
     <div class="bt20g"><div class="key"><small>Sugar</small><b>${g1(ps('sugars'))} g</b></div><div class="key"><small>Total carbs</small><b>${g1(ps('carbs'))} g</b></div><div><small>Fiber</small><b>${g1(ps('fiber'))} g</b></div><div><small>Protein</small><b>${g1(ps('protein'))} g</b></div><div><small>Fat</small><b>${g1(ps('fat'))} g</b></div><div><small>Calories</small><b>${g1(ps('kcal'))}</b></div></div>
     ${miss.length ? `<p class="note small">${esc(cfg.chain)} doesn't publish ${miss.join(', ')} for every item; those totals only count items that list them.</p>` : ''}
     <label class="fl11 bsv20"><span>Servings (shared)</span><input id="bwSv" class="in11" type="number" min="1" max="12" step="1" inputmode="numeric" value="${sv}"></label>
     <ol class="bil20">${Object.entries(sel).map(([c, m]) => `<li>${m !== 1 ? `<b>${PL(m)}</b> ` : ''}${esc(nm(all.get(c)))}</li>`).join('')}</ol>
     <div class="actions"><button class="btn pri" id="bwLog">Log it</button><button class="btn" id="bwPlan">📅 Add to plan</button><button class="btn" id="bwMeal">Save to My meals</button><button class="btn" id="bwSave">Save to My foods</button><button class="btn" id="bwCard">🖼 Score card</button><button class="btn" id="bwClr">Clear</button></div>`;
    $('#bwName').oninput = e => { st.name = e.target.value; save(); };
    $('#bwSv').onchange = e => { st.sv = Math.min(12, Math.max(1, Math.round(+e.target.value || 1))); save(); draw(); };
    $('#bwClr').onclick = () => { for (const c of Object.keys(sel)) delete sel[c]; st.name = ''; save(); draw(); };
    const mk = () => { const q = product(Math.max(1, +st.sv || 1)); delete q._miss; q.id = 'c-bw' + Date.now().toString(36); return q; };
    const grp = () => { const sv = Math.max(1, +st.sv || 1), its = items().map(x => sv > 1 ? Object.assign(x, { grams: Math.round(x.grams / sv * 10) / 10, label: x.label + ` ÷ ${sv}` }) : x); return { t: (st.name || '').trim() || `My ${cfg.title}`, src: 'bowl', items: its }; };
    $('#bwSave').onclick = () => { const q = mk(); store.set('custom', [q, ...customFoods()]); remember(q); toast('Saved to My foods'); location.hash = '#/product/' + q.id; };
    $('#bwMeal').onclick = () => { const gp = grp(), ms = savedMeals(); ms.unshift({ id: 'm' + Date.now().toString(36), name: `${cfg.chain}: ${gp.t}`.slice(0, 90), items: gp.items.map(({ k, m, src, ...r }) => r), used: 0, bowl241: id }); store.set('meals', ms.slice(0, 50)); toast('Saved to My meals'); };
    $('#bwPlan').onclick = () => planSheet241(grp());
    $('#bwCard').onclick = () => { const sv = Math.max(1, +st.sv || 1), q = product(sv); shareSheet24({ kind: 'meal', title: q.name, sub: cfg.chain + ': ' + q.meta.built.items.join(', '), serving: sv > 1 ? `Per serving (1 of ${sv})` : `Whole ${cfg.kind}${q.meta.perItem ? '' : ', ' + Math.round(q.servQ) + ' g'}`, h, c: sc, sugar: ps('sugars'), carbs: ps('carbs'), warn: [ps('carbs') > 75 ? 'High carbs for one meal' : '', ps('sodiumMg') > 1500 ? 'Very high sodium' : ''].filter(Boolean), url: '', file: 'lumi-' + id + '-bowl.png' }); };
    $('#bwLog').onclick = () => { const q = mk(); store.set('custom', [q, ...customFoods()]); remember(q); const now = new Date(), gq = q.meta.perItem ? 100 : q.servQ;
      const e = { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ts: now.getTime(), meal: mealFor(now), pid: q.id, name: q.name, brand: q.brand, grams: gq, label: q.serv, n: per100(q), score: sc, src24: 'bowl' };
      const L = LOG.all(); L.push(e); LOG.save(L); toast(`Logged ${q.name} to ${MEAL_L[e.meal]} (also saved to My foods)`); }; };
  app.querySelectorAll('.bo20').forEach(b => b.onclick = () => { const c = b.dataset.c, g = G.find(x => x.k === b.dataset.g);
    if (sel[c]) delete sel[c]; else { if (g.max) { const on = g.items.filter(d => sel[d.code]); if (on.length >= g.max) delete sel[on[0].code]; } sel[c] = 1; } save(); draw(); });
  app.querySelectorAll('[data-por]').forEach(s => s.onchange = () => { sel[s.dataset.por] = +s.value; save(); draw(); });
  draw();
}
self.viewBowl241 = viewBowl241;
viewBowl20 = viewBowl241;

/* ---------- entry points ---------- */
viewPlan13 = function () { const h = decodeURIComponent(location.hash.replace(/^#\/plan\/?/, '')); if (/^grocery/.test(h)) return viewPlanGrocery241(h.replace(/^grocery\/?/, '')); return viewPlan241(h); };
viewGrocery13 = function () { const h = location.hash.replace(/^#\/plan\/grocery\/?/, ''); return viewPlanGrocery241(h); };
self.viewPlan241 = viewPlan241;
/* product pages: Add to plan */
if (typeof bind8 === 'function') { const b0 = bind8; bind8 = function (p) { const r = b0.apply(this, arguments);
  try { const a = app.querySelector('.actions'); if (a && p && p.n && !$('#pl241b')) { a.insertAdjacentHTML('beforeend', '<button class="btn" id="pl241b">📅 Add to plan</button>'); $('#pl241b').onclick = () => planSheet241({ t: p.name, src: 'food', items: [itemFrom241(p, 1)] }); } } catch (e) { console.warn(e); } return r; }; }
/* saved meals: Add to plan + sugar-first totals (the old line repeated carbs twice) */
if (typeof viewMeals9 === 'function') { const v0 = viewMeals9; viewMeals9 = function () { const r = v0.apply(this, arguments);
  try { app.querySelectorAll('[data-ml9]').forEach(b => { const m = savedMeals().find(x => x.id === b.dataset.ml9); if (!m) return; const li = b.closest('li'), sm = li && li.querySelector('.t small'); const s = mealScore241(m.items);
    if (sm) sm.innerHTML = `${m.items.length} item${m.items.length > 1 ? 's' : ''} · ${g1(s.T.sugars)} g sugar · ${g1(s.T.carbs)} g total carbs${m.used ? ` · logged ${m.used}×` : ''}`;
    if (li && !li.querySelector('.sc20')) li.querySelector('.t').insertAdjacentHTML('beforeend', scores20(s.h, s.c));
    b.insertAdjacentHTML('afterend', `<button class="btn sm" data-pl241="${m.id}" aria-label="Add ${esc(m.name)} to meal plan">📅 Plan</button>`);
    li.querySelector('[data-pl241]').onclick = () => planSheet241({ t: m.name, src: m.bowl241 ? 'bowl' : 'meal', items: m.items.map(it => Object.assign({ k: uid(), m: 1 }, it)) }); }); } catch (e) { console.warn(e); } return r; }; }
/* chain order builder meals: Add to plan (reads the meal's current parts from its selects) */
new MutationObserver(() => { if (!location.hash.startsWith('#/order/')) return; app.querySelectorAll('.ml24 > li [data-card24]').forEach(b => { if (b.parentNode.querySelector('[data-plan241]')) return;
  b.insertAdjacentHTML('beforebegin', `<button class="btn" data-plan241="${b.dataset.card24}">📅 Add to plan</button>`);
  b.parentNode.querySelector('[data-plan241]').onclick = async e => { const btn = e.currentTarget, li = btn.closest('li.card'); btn.disabled = true; const chain = ((app.querySelector('h1') || {}).textContent || '').replace(/^Build a meal at /, '');
    const codes = [...li.querySelectorAll('select[data-sw24]')].map(s => s.value).filter(v => v && v !== '-');
    try { const ps = (await Promise.all(codes.map(c => resolveProduct(c).catch(() => null)))).filter(Boolean); if (!ps.length) throw 0; planSheet241({ t: `${chain} meal`, src: 'order', items: ps.map(p => itemFrom241(p, 1, 'order')) }); } catch { toast("Couldn't load that meal"); } btn.disabled = false; }; }); }).observe(app, { childList: true, subtree: true });
/* Home / sidebar label */
try { const i = SC74.findIndex(x => x[0] === '#/plan'); if (i >= 0) SC74[i][1] = 'Meal plan'; } catch {}
if (/^#\/(plan|bowl)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
})();

if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift( /* 24.1 */
  ['📅', 'A real weekly meal planner', 'Meal plan is now yours to edit: add foods, saved meals, chain meals, bowls or meal ideas to any breakfast, lunch, dinner or snack, change portions, and move between weeks. Every meal shows Health and Blood sugar scores for the whole meal, with sugar first and total carbs second. Log a planned meal in one tap, copy a week forward, or turn the week into a grocery list.'],
  ['🥗', 'Bowls with portions', 'Build-your-own bowls now take light, regular, extra or double portions of each ingredient (scaled from the chain\'s standard portion). Save a bowl to My meals, add it to your plan, or share its score card.']);
