'use strict';
/* Lumi 12.0: redesigned Week + Report, meal assignment/editing (+ safe migration), recipe builder, Dexcom backend setup guide.
   Loads after v11.js and before app.js. Never invents data: charts only use the user's own log; glucose only from Clarity/Dexcom. */
const MEAL_C12 = { breakfast: 'm-b', lunch: 'm-l', dinner: 'm-d', snack: 'm-s' };
const ic12 = (k, s) => ic11(k, s);
const g0 = v => v == null || isNaN(v) ? '—' : String(Math.round(v));
/* ---------- meal migration (runs once, keeps every entry, only fills a missing/unknown meal from its time) ---------- */
function migrate12() {
  try { if (store.get('mig12', false)) return; const l = LOG.all(); let n = 0;
    l.forEach(e => { if (!MEALS.includes(e.meal)) { e.meal = mealFor(new Date(e.ts || Date.now())); n++; } });
    if (n) { try { localStorage.setItem('lumi.log.bak12', JSON.stringify(store.get('log', []))); } catch {} LOG.save(l); }
    store.set('mig12', true);
  } catch (e) { console.warn('mig12', e); }
}
/* ---------- shared bits ---------- */
function seg12(on) { return `<nav class="sg12 noprint" aria-label="Log views">${[['#/log', 'Day', 'day'], ['#/log/week', 'Week', 'week'], ['#/report', 'Report', 'report']].map(([h, l, k]) => `<a href="${h}"${k === on ? ' class="on" aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`; }
function dayStats12(days) {
  migrate12(); const L = LOG.all(); return days.map(d => { const k = dayKey(d), es = L.filter(e => dayKey(e.ts) === k), t = totals(es);
    return { d, k, n: es.length, t, by: Object.fromEntries(MEALS.map(m => [m, totals(es.filter(e => e.meal === m)).carbs])) }; });
}
function legend12() { return `<ul class="lg12" aria-hidden="true">${MEALS.map(m => `<li><i class="${MEAL_C12[m]}"></i>${MEAL_L[m]}</li>`).join('')}</ul>`; }
function bars12(stats, target, opts = {}) {
  const max = Math.max(target || 0, 40, ...stats.map(s => s.t.carbs)) * 1.08, many = stats.length > 14;
  const tl = target ? `<div class="tl12" style="bottom:${target / max * 100}%"><span>${target} g</span></div>` : '';
  return `<div class="bc12${many ? ' many' : ''}" role="list" aria-label="${esc(opts.label || 'Carbs per day by meal')}">${tl}${stats.map((s, i) => {
    const lab = s.d.toLocaleDateString(undefined, many ? { day: 'numeric' } : { weekday: 'short' }), full = s.d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    const desc = s.n ? `${full}: ${Math.round(s.t.carbs)} g carbs (${MEALS.filter(m => s.by[m] > 0.5).map(m => `${MEAL_L[m]} ${Math.round(s.by[m])} g`).join(', ')})` : `${full}: nothing logged`;
    return `<a role="listitem" class="col12${s.k === dayKey(new Date()) ? ' today' : ''}${target && s.t.carbs > target ? ' over' : ''}" href="#/log/${s.k}" aria-label="${esc(desc)}">
      <span class="v12">${s.n ? Math.round(s.t.carbs) : ''}</span><span class="stk12">${MEALS.map(m => s.by[m] > 0 ? `<i class="${MEAL_C12[m]}" style="height:${s.by[m] / max * 100}%"></i>` : '').join('')}${s.n ? '' : '<i class="nil12"></i>'}</span>
      <span class="d12">${esc(lab)}${many && i % 7 === 0 ? `<small>${s.d.toLocaleDateString(undefined, { month: 'short' })}</small>` : ''}</span></a>`; }).join('')}</div>${legend12()}`;
}
function mealSplit12(stats) {
  const logged = stats.filter(s => s.n), nd = logged.length || 1, tot = MEALS.reduce((a, m) => a + logged.reduce((b, s) => b + s.by[m], 0), 0) || 1;
  return `<ul class="ms12">${MEALS.map(m => { const sum = logged.reduce((b, s) => b + s.by[m], 0), share = sum / tot * 100;
    return `<li><span class="mn12"><i class="${MEAL_C12[m]}"></i>${MEAL_L[m]}</span><span class="mb12"><i class="${MEAL_C12[m]}" style="width:${share}%"></i></span><span class="mv12"><b>${Math.round(sum / nd)} g</b><small>${Math.round(share)}%</small></span></li>`; }).join('')}</ul>`;
}
function kpis12(stats, st) {
  const logged = stats.filter(s => s.n), nd = logged.length, avg = k => nd ? logged.reduce((a, s) => a + s.t[k], 0) / nd : null;
  const inT = st.target ? logged.filter(s => s.t.carbs <= st.target).length : null;
  const k = [['Avg carbs / day', avg('carbs') == null ? '—' : g0(avg('carbs')) + ' g', 'carbs'], ['Avg net carbs', avg('net') == null ? '—' : g0(avg('net')) + ' g'], ['Days logged', `${nd}<small> of ${stats.length}</small>`]];
  k.push(st.target ? ['At or under target', nd ? `${inT}<small> of ${nd} days</small>` : '—'] : ['Avg calories', avg('kcal') == null ? '—' : g0(avg('kcal'))]);
  return `<div class="kp12">${k.map(([l, v, c]) => `<div class="${c ? 'key' : ''}"><small>${l}</small><b>${v}</b></div>`).join('')}</div>`;
}
/* ---------- Week ---------- */
function viewWeek12(off) {
  off = Math.max(0, off | 0); const st = settings(), end = new Date(); end.setDate(end.getDate() - 7 * off);
  const days = daysBack(7, end), stats = dayStats12(days), logged = stats.filter(s => s.n);
  document.title = 'Week — Lumi'; app.className = (app.className || '').replace(/\b(log11|logw11)\b/g, '').trim(); app.classList.add('wk12');
  const rng = `${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  app.innerHTML = `<section class="pg12">${seg12('week')}
  <header class="wh12"><a class="icon" href="#/log/week-${off + 1}" aria-label="Previous week">${ic12('chev', 20)}</a><div><h1>${off ? 'Week' : 'This week'}</h1><p class="small">${rng}</p></div>${off ? `<a class="icon nx12" href="#/log/week${off > 1 ? '-' + (off - 1) : ''}" aria-label="Next week">${ic12('chev', 20)}</a>` : '<span class="icon" aria-hidden="true"></span>'}</header>
  ${kpis12(stats, st)}
  <div class="card cc12"><div class="fx-h"><h2>Carbs per day</h2><span class="small">grams, by meal</span></div>${bars12(stats, st.target)}${st.target ? '' : '<p class="small"><a class="lnk" href="#/settings">Set a daily carb target</a> to see it on the chart.</p>'}</div>
  <div class="g12"><div class="card"><h2>Average by meal</h2>${logged.length ? mealSplit12(stats) : '<p class="small">Log a few meals to see how carbs split across your day.</p>'}</div>
  <div class="card"><h2>Days</h2><ul class="grp11 flat dl12">${stats.slice().reverse().map(s => `<li><a class="hr11" href="#/log/${s.k}"><span class="ht11"><b>${s.d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</b><small>${s.n ? `${s.n} item${s.n > 1 ? 's' : ''} · ${g0(s.t.net)} g net · ${g0(s.t.kcal)} Cal` : 'Nothing logged'}</small></span><span class="dv12${st.target && s.t.carbs > st.target ? ' over' : ''}">${s.n ? g0(s.t.carbs) + ' g' : '–'}</span>${ic12('chev', 16)}</a></li>`).join('')}</ul></div></div>
  <div class="actions"><a class="btn pri" href="#/report">Report for my care team</a><button class="btn" id="expCsv">Export CSV</button></div></section>`;
  $('#expCsv').onclick = exportCSV;
}
/* ---------- Report ---------- */
function viewReport12(arg) {
  const n = Math.min(90, Math.max(3, +arg || 14)); document.title = 'Lumi carb summary'; const st = settings(), days = daysBack(n), stats = dayStats12(days);
  app.className = (app.className || '').replace(/\b(log11|logw11)\b/g, '').trim(); app.classList.add('rp12');
  const L = LOG.all(), t0 = new Date(dayKey(days[0]) + 'T00:00').getTime(), inR = L.filter(e => e.ts >= t0), logged = stats.filter(s => s.n);
  const top = {}; inR.forEach(e => { const s = scale(e.n, e.grams), k = (e.name || '') + '|' + (e.brand || ''); top[k] = top[k] || { name: e.name, brand: e.brand, n: 0, c: 0 }; top[k].n++; top[k].c += s.carbs || 0; });
  const tops = Object.values(top).sort((a, b) => b.c - a.c).slice(0, 10), tmax = tops.length ? tops[0].c : 1, tsum = inR.reduce((a, e) => a + (scale(e.n, e.grams).carbs || 0), 0) || 1;
  const hrs = Array(24).fill(0); inR.forEach(e => { hrs[new Date(e.ts).getHours()] += scale(e.n, e.grams).carbs || 0; }); const hmax = Math.max(1, ...hrs);
  const R = [7, 14, 30, 90];
  app.innerHTML = `<section class="pg12 report12">${seg12('report')}
  <div class="tb12 noprint"><div class="rg12" role="group" aria-label="Report range">${R.map(r => `<a class="chip${r === n ? ' on' : ''}" href="#/report/${r}"${r === n ? ' aria-current="page"' : ''}>${r} days</a>`).join('')}</div><div class="actions"><button class="btn pri" id="pr12">Print or save PDF</button><button class="btn" id="expCsv">Export CSV</button></div></div>
  <header class="rh12"><div><p class="ov12">Carb intake summary</p><h1>${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[n - 1].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h1>
   <p class="small">${logged.length} of ${n} days logged · ${inR.length} entries · generated ${new Date().toLocaleString()} by Lumi ${VERSION}</p></div></header>
  ${kpis12(stats, st)}
  <div class="card cc12"><div class="fx-h"><h2>Daily carbs</h2><span class="small">grams, by meal${st.target ? ` · target ${st.target} g` : ''}</span></div>${bars12(stats, st.target, { label: 'Daily carbs by meal' })}</div>
  <div class="g12"><div class="card"><h2>Average per logged day, by meal</h2>${logged.length ? mealSplit12(stats) : '<p class="small">Nothing logged in this range.</p>'}${st.mealT && Object.values(st.mealT).some(Boolean) ? `<p class="small">Per-meal carb amounts set in Settings: ${MEALS.filter(m => st.mealT[m]).map(m => `${MEAL_L[m]} ${st.mealT[m]} g`).join(' · ')}</p>` : ''}</div>
  <div class="card"><h2>When carbs were eaten</h2><div class="hr12" role="img" aria-label="Carbs by hour of day">${hrs.map((v, h) => `<span title="${h}:00 ${Math.round(v)} g"><i style="height:${v / hmax * 100}%"></i></span>`).join('')}</div><div class="hx12" aria-hidden="true"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div><p class="small">Total carbs logged in each hour across the range.</p></div></div>
  <div class="card"><h2>Top carb sources</h2>${tops.length ? `<ol class="ts12">${tops.map(x => `<li><span class="tn12"><b>${esc(x.name)}</b><small>${esc(x.brand || '')}${x.brand ? ' · ' : ''}${x.n}×</small></span><span class="tb12b"><i style="width:${x.c / tmax * 100}%"></i></span><span class="tv12"><b>${Math.round(x.c)} g</b><small>${Math.round(x.c / tsum * 100)}%</small></span></li>`).join('')}</ol>` : '<p class="small">Nothing logged in this range.</p>'}</div>
  <details class="card dt12" open><summary><h2>Daily totals</h2></summary><div class="wk8w">${weekTable(days)}</div></details>
  <p class="foot">Self-logged food entries; values come from product labels and food databases and may contain errors. No insulin doses or corrections are included. Informational only, not medical advice.</p></section>`;
  $('#pr12').onclick = () => { app.querySelectorAll('details').forEach(d => d.open = true); window.print(); }; $('#expCsv').onclick = exportCSV;
}
/* ---------- meal editing in the Day view ---------- */
function editEntrySheet12(id, after) {
  const e = LOG.all().find(x => x.id === id); if (!e) return; let meal = MEALS.includes(e.meal) ? e.meal : mealFor(new Date(e.ts));
  sheet(`<h2>Edit entry</h2><p class="small">${esc(e.name)} · ${esc(e.label || '')}</p>
    <div class="seg wide" id="mealSeg" role="group" aria-label="Meal">${MEALS.map(m => `<button type="button" data-m="${m}" aria-pressed="${m === meal}" class="${m === meal ? 'on' : ''}">${MEAL_L[m]}</button>`).join('')}</div>
    <label class="field"><span>Time</span><input type="datetime-local" id="edTime" value="${localDT(new Date(e.ts))}"></label>
    <label class="field"><span>Amount (${e.label && /item/.test(e.label) ? 'items' : 'grams'})</span><input type="number" id="edG" min="0" step="any" inputmode="decimal" value="${e.label && /item/.test(e.label) ? r1(e.grams / 100) : r1(e.grams)}"></label>
    <div class="actions"><button class="btn" data-close>Cancel</button><button class="btn pri" id="edOk">Save</button></div>`);
  document.querySelectorAll('#mealSeg button').forEach(b => b.onclick = () => { meal = b.dataset.m; document.querySelectorAll('#mealSeg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); });
  $('#edOk').onclick = () => { const l = LOG.all(), x = l.find(y => y.id === id); if (!x) return closeSheet(); const it = x.label && /item/.test(x.label); const v = +$('#edG').value;
    x.meal = meal; x.ts = new Date($('#edTime').value).getTime() || x.ts; if (v > 0) { x.grams = it ? v * 100 : v; x.label = it ? `${r1(v)} item` : `${r1(v)} ${/ml/.test(x.label || '') ? 'ml' : 'g'}`; }
    LOG.save(l); closeSheet(); toast(`Moved to ${MEAL_L[meal]}`); after && after(); };
}
function decorateDay12(arg) {
  app.querySelectorAll('.loglist [data-del]').forEach(b => { if (b.previousElementSibling && b.previousElementSibling.dataset.ed) return; const e = LOG.all().find(x => x.id === b.dataset.del);
    b.insertAdjacentHTML('beforebegin', `<button class="chip ed12" data-ed="${b.dataset.del}" aria-label="Edit meal, time or amount for ${esc(e ? e.name : 'entry')}">Edit</button>`); });
  app.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editEntrySheet12(b.dataset.ed, () => viewLog(arg)));
  const qa = [...app.querySelectorAll('.card')].find(c => /Quick add/.test((c.querySelector('h2') || {}).textContent || '')), acts = qa && qa.querySelector('.actions');
  if (acts && !acts.querySelector('.rc12')) acts.insertAdjacentHTML('afterbegin', `<a class="btn rc12" href="#/recipes">Recipes</a>`);
  const h = app.querySelector('.dayhead'); if (h && !app.querySelector('.sg12')) h.insertAdjacentHTML('beforebegin', seg12('day'));
  app.querySelectorAll('.seg8').forEach(s => s.remove());
}
/* ---------- recipes ---------- */
const recipes12 = () => store.get('recipes', []);
const setRecipes12 = l => store.set('recipes', l);
const RK = ['carbs', 'net', 'fiber', 'sugars', 'protein', 'fat', 'kcal'];
function recTotals12(r) { const t = Object.fromEntries(RK.map(k => [k, 0])), miss = Object.fromEntries(RK.map(k => [k, 0])); let g = 0;
  (r.items || []).forEach(it => { g += +it.grams || 0; RK.forEach(k => { const v = it.n && it.n[k]; if (v == null) miss[k]++; else t[k] += v * (+it.grams || 0) / 100; }); });
  return { t, miss, g, sv: Math.max(1, +r.servings || 1) }; }
function viewRecipes12() {
  document.title = 'Recipes — Lumi'; const L = recipes12();
  app.innerHTML = `<section class="pg11 rcp12"><header class="ph11"><span class="phi11">${ic12('note', 26)}</span><div><h1>Recipes</h1><p class="lead">Build homemade dishes from Lumi foods with gram amounts. Lumi adds up the label data and divides by servings.</p></div></header>
  <div class="tb11"><a class="btn pri" href="#/recipe/new">New recipe</a><a class="chip" href="#/share">${ic12('share', 16)} Import a shared recipe</a></div>
  ${L.length ? `<ul class="grp11">${L.map(r => { const x = recTotals12(r); return `<li><a class="hr11" href="#/recipe/${esc(r.id)}"><span class="hic11">${ic12('note', 20)}</span><span class="ht11"><b>${esc(r.name)}</b><small>${r.items.length} ingredient${r.items.length === 1 ? '' : 's'} · ${x.sv} serving${x.sv === 1 ? '' : 's'}</small></span><span class="rv12"><b>${g0(x.t.net / x.sv)} g</b><small>net / serving</small></span>${ic12('chev', 18)}</a></li>`; }).join('')}</ul>`
  : `<div class="empty11"><span class="ea11">${ic12('note', 40)}</span><h2>No recipes yet</h2><p>Add ingredients like flour, eggs and milk by weight, set how many servings it makes, and log one serving in a tap.</p><a class="btn pri" href="#/recipe/new">Create a recipe</a></div>`}
  <p class="foot">Totals come from each ingredient's label or USDA data, as eaten in the amounts you enter. Cooking changes water weight, not carbs.</p></section>`;
}
function viewRecipe12(id) {
  let r = id === 'new' ? (store.get('recDraft', null) || { id: 'r' + Date.now().toString(36), name: '', servings: 4, items: [], t: Date.now() }) : recipes12().find(x => x.id === id);
  if (!r) { app.innerHTML = `<section class="pg11"><div class="empty11"><h2>Recipe not found</h2><a class="btn" href="#/recipes">All recipes</a></div></section>`; return; }
  const isNew = id === 'new'; document.title = (r.name || 'New recipe') + ' — Lumi'; const st = settings();
  const draft = () => { if (isNew) store.set('recDraft', r); };
  const render = () => { const x = recTotals12(r), ps = k => x.t[k] / x.sv, sg = x.g / x.sv; const anyMiss = RK.some(k => x.miss[k]);
    $('#rtot').innerHTML = r.items.length ? `<div class="rt12"><div class="key"><small>Net carbs / serving</small><b>${g0(ps('net'))} g</b></div><div><small>Carbs / serving</small><b>${g0(ps('carbs'))} g</b></div><div><small>Fiber</small><b>${r1(ps('fiber'))} g</b></div><div><small>Protein</small><b>${r1(ps('protein'))} g</b></div><div><small>Fat</small><b>${r1(ps('fat'))} g</b></div><div><small>Calories</small><b>${g0(ps('kcal'))}</b></div></div>
      <p class="small">Whole recipe: ${g0(x.g)} g · ${g0(x.t.carbs)} g carbs · ${g0(x.t.net)} g net · ${g0(x.t.fiber)} g fiber · ${g0(x.t.protein)} g protein · ${g0(x.t.fat)} g fat · ${g0(x.t.kcal)} Cal. One serving ≈ ${g0(sg)} g.</p>
      ${anyMiss ? `<p class="note sp-pr">Some ingredients have no data for ${RK.filter(k => x.miss[k]).map(k => NL[k] ? NL[k].toLowerCase() : k).join(', ')}; those totals only count ingredients with data.</p>` : ''}
      ${st.icr > 0 ? `<div class="icr"><b>${r1(st.icrBasis === 'net' ? ps('net') : ps('carbs'))} g ${st.icrBasis === 'net' ? 'net' : 'total'} carbs per serving ÷ your 1:${r1(st.icr)} ratio = ${r1((st.icrBasis === 'net' ? ps('net') : ps('carbs')) / st.icr)} units</b><small>Estimate only, confirm on your pump.</small></div>` : ''}` : '<p class="small">Add ingredients to see totals.</p>';
    $('#ring').innerHTML = r.items.length ? r.items.map((it, i) => `<li class="ri12"><span class="ht11"><b>${esc(it.name)}</b><small>${esc(it.brand || '')}${it.n && it.n.carbs != null ? `${it.brand ? ' · ' : ''}${r1(it.n.carbs * it.grams / 100)} g carbs` : ' · no carb data'}</small></span>
      <label class="rg12i"><span class="sr-only">Grams of ${esc(it.name)}</span><input type="number" min="0" step="any" inputmode="decimal" value="${r1(it.grams)}" data-gi="${i}"><span aria-hidden="true">g</span></label><button class="icon sm" data-rx="${i}" aria-label="Remove ${esc(it.name)}">${ic12('trash', 18)}</button></li>`).join('') : '<li class="small" style="padding:8px 0">No ingredients yet. Search above.</li>';
    app.querySelectorAll('[data-gi]').forEach(inp => inp.onchange = () => { r.items[+inp.dataset.gi].grams = Math.max(0, +inp.value || 0); draft(); render(); });
    app.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => { r.items.splice(+b.dataset.rx, 1); draft(); render(); });
    $('#rlog').disabled = $('#rshare').disabled = !r.items.length; };
  app.innerHTML = `<section class="pg11 rcp12"><header class="ph11"><span class="phi11">${ic12('note', 26)}</span><div><h1>${isNew ? 'New recipe' : esc(r.name)}</h1><p class="lead">Ingredients as weighed before cooking. Lumi adds them up from label/USDA data.</p></div></header>
  <div class="card"><div class="rf12"><label class="fl11"><span>Name</span><input id="rname" class="in11" value="${esc(r.name)}" placeholder="e.g. Banana oat muffins" autocomplete="off"></label>
   <label class="fl11 sv12"><span>Servings</span><input id="rsv" class="in11" type="number" min="1" step="1" inputmode="numeric" value="${r.servings}"></label></div></div>
  <div class="card"><h2>Ingredients</h2><label class="fl11"><span>Add an ingredient</span><input id="rq" class="in11" type="search" placeholder="Search foods: flour, egg, milk, banana…" autocomplete="off" aria-controls="rres"></label><ul id="rres" class="grp11 flat rres12" aria-live="polite"></ul>
   <ul id="ring" class="grp11 flat"></ul></div>
  <div class="card" id="rtotc"><h2>Totals</h2><div id="rtot"></div></div>
  <div class="actions"><button class="btn pri" id="rsave">Save recipe</button><button class="btn" id="rlog">Log a serving</button><button class="btn" id="rshare">${ic12('share', 16)} Share</button>${isNew ? '' : '<button class="btn" id="rdel">Delete</button>'}<a class="btn" href="#/recipes">All recipes</a></div>
  <p class="foot">Informational only. Values are only as good as the ingredient data.</p></section>`;
  $('#rname').oninput = () => { r.name = $('#rname').value; draft(); }; $('#rsv').oninput = () => { r.servings = Math.max(1, Math.round(+$('#rsv').value || 1)); draft(); render(); };
  let qt; $('#rq').oninput = () => { clearTimeout(qt); qt = setTimeout(async () => { const q = $('#rq').value.trim(), out = $('#rres'); if (q.length < 2) { out.innerHTML = ''; return; }
    try { await loadIndex(); } catch {} const seen = new Set(), res = []; for (const d of engine.search(q, { limit: 8, filter: d => d.src === 'whole' }).concat(engine.search(q, { limit: 10 }))) if (!seen.has(d.code) && d.src !== 'rest' && res.length < 10) { seen.add(d.code); res.push(d); }
    out.innerHTML = res.map(d => `<li><button class="hr11 rp12b" data-add="${esc(d.code)}"><span class="ht11"><b>${esc(d.name)}</b><small>${esc(d.brand || (d.src === 'whole' ? 'USDA / staple' : ''))}</small></span><span class="small">Add</span></button></li>`).join('') || '<li class="small">No matches.</li>';
    out.querySelectorAll('[data-add]').forEach(b => b.onclick = async () => { b.disabled = true; try { const p = await resolveProduct(b.dataset.add); if (!p) throw new Error('not found'); remember(p);
      const g = (p.portions && p.portions[0] && p.portions[0][1]) || p.servQ || 100; r.items.push({ id: p.id, name: p.name, brand: p.brand || '', grams: Math.round(g * 10) / 10, n: per100(p) }); draft(); out.innerHTML = ''; $('#rq').value = ''; render(); toast('Added ' + p.name); }
      catch (e) { toast("Couldn't load that food"); b.disabled = false; } }); }, 250); };
  const save = () => { r.name = ($('#rname').value || '').trim() || 'My recipe'; r.t = Date.now(); const L = recipes12().filter(x => x.id !== r.id); L.unshift(r); setRecipes12(L.slice(0, 200)); store.set('recDraft', null); return r; };
  $('#rsave').onclick = () => { if (!r.items.length) return toast('Add at least one ingredient'); save(); toast('Recipe saved'); location.hash = '#/recipe/' + r.id; };
  $('#rlog').onclick = () => { if (!r.items.length) return; save(); logRecipe12(r); };
  $('#rshare').onclick = () => { if (!r.items.length) return; save(); share11('recipe', r); };
  const del = $('#rdel'); if (del) del.onclick = () => { if (!confirm(`Delete "${r.name}"?`)) return; setRecipes12(recipes12().filter(x => x.id !== r.id)); location.hash = '#/recipes'; };
  render();
}
function logRecipe12(r) {
  const x = recTotals12(r); if (!x.g) return toast('Ingredients need gram amounts');
  const n = Object.fromEntries(RK.map(k => [k, x.miss[k] === r.items.length ? null : x.t[k] / x.g * 100])); const sg = x.g / x.sv;
  const now = new Date(); let meal = mealFor(now), q = 1;
  sheet(`<h2>Log ${esc(r.name)}</h2><p class="small">1 serving ≈ ${g0(sg)} g · <b>${g0(x.t.carbs / x.sv)} g carbs</b> (${g0(x.t.net / x.sv)} g net)</p>
    <label class="field"><span>Servings eaten</span><input type="number" id="rsq" min="0.25" step="0.25" value="1" inputmode="decimal"></label>
    <div class="seg wide" id="mealSeg" role="group" aria-label="Meal">${MEALS.map(m => `<button type="button" data-m="${m}" aria-pressed="${m === meal}" class="${m === meal ? 'on' : ''}">${MEAL_L[m]}</button>`).join('')}</div>
    <label class="field"><span>Time</span><input type="datetime-local" id="logTime" value="${localDT(now)}"></label>
    <div class="actions"><button class="btn" data-close>Cancel</button><button class="btn pri" id="logOk">Add</button></div>`);
  document.querySelectorAll('#mealSeg button').forEach(b => b.onclick = () => { meal = b.dataset.m; document.querySelectorAll('#mealSeg button').forEach(y => { y.classList.toggle('on', y === b); y.setAttribute('aria-pressed', String(y === b)); }); });
  $('#logOk').onclick = () => { q = Math.max(0.25, +$('#rsq').value || 1); const l = LOG.all(); const ts = new Date($('#logTime').value).getTime() || Date.now();
    l.push({ id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts, meal, pid: 'recipe:' + r.id, name: r.name, brand: 'Homemade recipe', grams: sg * q, label: `${r1(q)} serving${q === 1 ? '' : 's'}`, n, score: null, recipe: r.id });
    LOG.save(l); closeSheet(); toast(`Added to ${MEAL_L[meal]}`); };
}
/* ---------- Dexcom setup guide ---------- */
function viewDexcomSetup12() {
  document.title = 'Connect Dexcom — Lumi'; const st = settings(), steps = [
    ['Joe', 'Create a Dexcom developer account', 'Go to <a class="lnk" href="https://developer.dexcom.com" target="_blank" rel="noopener">developer.dexcom.com</a> and sign up (free). This is separate from your Dexcom G7/G6 login.'],
    ['Joe', 'Create a free Cloudflare account', 'Sign up at <a class="lnk" href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener">dash.cloudflare.com</a>. The free Workers plan is enough. Pick a workers.dev subdomain when asked (for example <code>joe</code>).'],
    ['Joe', 'Install Node.js and log in to Wrangler', 'On a computer: install Node.js 18+ from nodejs.org, then run <code>npx wrangler login</code> and approve in the browser.'],
    ['Joe', 'Download the backend', 'Get <a class="lnk" href="https://github.com/jwardell15/lumi/tree/main/tools/dexcom" target="_blank" rel="noopener">tools/dexcom</a> from the Lumi repo (worker.js + wrangler.toml), or clone the repo and <code>cd tools/dexcom</code>.'],
    ['Joe', 'Create the token store', 'Run <code>npx wrangler kv namespace create TOKENS</code> and paste the printed <code>id</code> into wrangler.toml.'],
    ['Joe', 'Deploy once to get your URL', 'Run <code>npx wrangler deploy</code>. It prints your backend address, like <code>https://lumi-dexcom.joe.workers.dev</code>.'],
    ['Joe', 'Register the Dexcom app', 'In the Dexcom developer portal, create an app. Set the Redirect URI to your backend address + <code>/callback</code> (e.g. <code>https://lumi-dexcom.joe.workers.dev/callback</code>). Copy the Client ID and Client Secret.'],
    ['Joe', 'Add the secrets', 'Run <code>npx wrangler secret put DEXCOM_CLIENT_ID</code> and <code>npx wrangler secret put DEXCOM_CLIENT_SECRET</code>, pasting each value. They stay on Cloudflare, never in Lumi.'],
    ['Joe', 'Test with sandbox first', 'Keep <code>DEXCOM_ENV = "sandbox"</code> in wrangler.toml, then paste the backend address below and tap Connect. On Dexcom\'s page choose a sandbox user (e.g. SandboxUser7). Lumi labels this data “sandbox (simulated)”.'],
    ['Joe', 'Switch to your real data', 'Change to <code>DEXCOM_ENV = "production"</code>, run <code>npx wrangler deploy</code> again, then tap Connect and sign in with your own Dexcom account. US data is delayed about 1 hour (3 hours outside the US) by Dexcom.']];
  app.innerHTML = `<section class="pg11 dx12"><header class="ph11"><span class="phi11">${ic12('drop', 26)}</span><div><h1>Connect Dexcom</h1><p class="lead">Dexcom's API needs a private key that can't live in a web app, so Lumi talks to Dexcom through a tiny backend you own on Cloudflare (free). About 20 minutes, one time.</p></div></header>
  <div class="card"><h2>Your backend</h2><label class="fl11"><span>Backend URL</span><input id="dxb12" class="in11" type="url" inputmode="url" placeholder="https://lumi-dexcom.yourname.workers.dev" value="${esc(st.dxBackend || '')}"></label>
   <div class="actions"><button class="btn" id="dxt12">Save and test</button>${st.dxBackend ? '<button class="btn pri" id="dxc12">Connect Dexcom</button>' : ''}${st.dxSid ? '<button class="btn" id="dxo12">Disconnect</button>' : ''}</div><p class="small" id="dxm12" role="status">${st.dxSid ? 'Connected on this device.' : st.dxBackend ? 'Not connected yet.' : 'Paste the address from step 6.'}</p></div>
  <h2 class="gh11">Steps (only you can do these: they create accounts and keys in your name)</h2>
  <ol class="st12">${steps.map(([w, t, d], i) => `<li><span class="sn12" aria-hidden="true">${i + 1}</span><div><b>${t}</b><p>${d}</p></div></li>`).join('')}</ol>
  <div class="card"><h2>Prefer no backend?</h2><p class="small">Importing a Dexcom Clarity CSV still works and needs no setup. <a class="lnk" href="#/glucose">Glucose after meals</a></p></div>
  <p class="foot">Lumi never shows made-up glucose numbers: only readings from your Clarity file or your Dexcom account (or Dexcom's sandbox, clearly labeled). Informational only.</p></section>`;
  const msg = t => { $('#dxm12').textContent = t; };
  $('#dxt12').onclick = async () => { const v = $('#dxb12').value.trim().replace(/\/+$/, ''); if (!/^https:\/\/[^/]+$/.test(v)) return msg('Use the https:// address only, without a path.');
    const s = settings(); if (s.dxBackend !== v) delete s.dxSid; s.dxBackend = v; store.set('settings', s); msg('Testing…');
    try { const r = await fetch(v + '/status', { headers: s.dxSid ? { Authorization: 'Bearer ' + s.dxSid } : {} }); const j = await r.json(); msg(`Backend OK (${j.env === 'production' ? 'production' : 'sandbox'} mode)${j.configured === false ? ', but secrets are missing: do step 8.' : ''}${j.connected ? '. Connected.' : '. Tap Connect Dexcom.'}`); setTimeout(() => viewDexcomSetup12(), 1500); }
    catch (e) { msg("Couldn't reach the backend. Check the address and that step 6 deployed."); } };
  const c = $('#dxc12'); if (c) c.onclick = () => { location.href = settings().dxBackend + '/login?return=' + encodeURIComponent(location.origin + location.pathname + '#/glucose/connected'); };
  const o = $('#dxo12'); if (o) o.onclick = async () => { const s = settings(); try { await fetch(s.dxBackend + '/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + s.dxSid } }); } catch {} delete s.dxSid; store.set('settings', s); viewDexcomSetup12(); };
}
/* ---------- wire up ---------- */
(function () {
  window.viewWeek = () => viewWeek12(0); window.viewReport = a => { migrate12(); return viewReport12(a); };
  addEventListener('DOMContentLoaded', migrate12);
  const vl = viewLog; viewLog = function (arg) { migrate12(); const m = /^week(?:-(\d+))?$/.exec(arg || ''); if (m) return viewWeek12(+m[1] || 0); const r = vl.apply(this, arguments); try { decorateDay12(arg); } catch (e) { console.warn('v12', e); } return r; };
  const vg = viewGlucose11; viewGlucose11 = function (arg) { const m = /^connected\?sid=([\w-]{16,})/.exec(arg || ''); if (m) { const s = settings(); s.dxSid = m[1]; store.set('settings', s); history.replaceState(null, '', '#/glucose/connected'); arg = 'connected'; }
    const r = vg.call(this, arg); const box = app.querySelector('#dxb'); if (box) { const card = box.closest('.card'); if (card && !card.querySelector('.dxg12')) card.insertAdjacentHTML('afterbegin', `<a class="card gh11x dxg12" href="#/dexcom">${ic12('drop', 22)}<span><b>Step-by-step setup</b><small>Register a Dexcom app, deploy your free backend, connect.</small></span>${ic12('chev', 18)}</a>`); } return r; };
  const vs = viewSettings; viewSettings = function () { const r = vs.apply(this, arguments); try { const hub = app.querySelector('.hub11'); if (hub && !hub.querySelector('[href="#/recipes"]')) hub.insertAdjacentHTML('beforeend', `<li><a class="hr11" href="#/recipes"><span class="hic11">${ic12('note', 20)}</span><span class="ht11"><b>Recipes</b><small>${recipes12().length} saved</small></span>${ic12('chev', 18)}</a></li><li><a class="hr11" href="#/dexcom"><span class="hic11">${ic12('drop', 20)}</span><span class="ht11"><b>Connect Dexcom (setup guide)</b><small>${settings().dxSid ? 'Connected' : 'Your own free backend, step by step'}</small></span>${ic12('chev', 18)}</a></li>`); } catch (e) { console.warn(e); } return r; };
  addEventListener('hashchange', () => { const a = document.getElementById('app'); if (a) a.classList.remove('wk12', 'rp12'); });
})();
