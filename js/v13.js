/* Lumi 13.0: meal ideas, a better meal builder, restaurant meal picks, lower-carb swaps, a weekly plan and grocery list.
   Built ONLY from real foods already in Lumi (data/meals13.json: USDA FoodData Central staples, popular packaged rows from the
   index and restaurant items from official/MenuStat nutrition; see tools/build_meals.js). No dosing or correction math. */
'use strict';
let m13p = null;
const M13 = () => m13p || (m13p = getData('data/meals13.json').then(d => { d.byId = new Map(d.items.map(x => [x.id, x])); Object.entries(d.rest).forEach(([s, c]) => c.meals.forEach(ml => ml.forEach(it => { it.chain = c.name; d.byId.set(it.id, it); }))); return d; }).catch(e => { m13p = null; throw e; }));
const DEF13 = { breakfast: 45, lunch: 60, dinner: 60, snack: 20 };
function tgt13() { const t = mealT9(), own = MEALS.some(m => t[m]); return { own, t: Object.fromEntries(MEALS.map(m => [m, own ? t[m] || null : DEF13[m]])) }; }
const B13 = () => mealBasis9();
const val13 = s => B13() === 'net' ? s.net : s.c;
const unit13 = () => B13() === 'net' ? 'g net carbs' : 'g carbs';
function sum13(parts) { const s = { c: 0, net: 0, f: 0, p: 0, fat: 0, kcal: 0 }; parts.forEach(([it, m]) => Object.keys(s).forEach(k => s[k] += (it[k] || 0) * m)); return s; }
function rng13(seed) { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
const C13 = {};
function combos13(d, meal) { if (C13[meal]) return C13[meal];
  const R = r => d.items.filter(x => x.ro.includes(r) && !(r === 'sta' && /taco shell/i.test(x.nm)) && !(r === 'snk' && /cream cheese|neufch|spread/i.test(x.nm))), out = [], add = ps => out.push(ps.filter(Boolean).map(it => [it, 1]));
  if (meal === 'breakfast') { const carbs = [null, ...R('bfc'), ...R('fru')], ex = [null, ...R('ext'), ...R('drk')];
    for (const a of R('bfm')) for (const b of carbs) for (const c of ex) { if ((b && c && b.sg === c.sg) || (c && c.sg === a.sg)) continue; add([a, b, c]); } }
  else if (meal === 'snack') { const S = R('snk'); S.forEach(a => add([a])); for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) if (S[i].sg !== S[j].sg && S[i].ro.includes('fru') !== S[j].ro.includes('fru')) add([S[i], S[j]]); }
  else { const sta = [null, ...R('sta')]; for (const a of R('pro')) for (const b of R('veg')) for (const c of sta) add([a, b, c]); }
  return C13[meal] = out.map(parts => ({ parts, s: sum13(parts) })).filter(x => meal === 'snack' ? x.s.kcal >= 100 && x.s.kcal <= 350 && x.s.p >= 3 : x.s.kcal >= (meal === 'breakfast' ? 220 : 300) && x.s.p >= 12); }
/* lower-carb first, with variety: a small seeded jitter, each main used once, each side at most twice */
function pick13(d, meal, n, seed, avoid) { const T = tgt13().t[meal], r = rng13(seed + 7);
  const L = combos13(d, meal).filter(x => T == null || val13(x.s) <= T).map(x => ({ x, j: val13(x.s) + r() * 14 })).sort((a, b) => a.j - b.j);
  const used = new Map(), out = []; for (const { x } of L) { const ids = x.parts.map(p => p[0].id); if ((avoid && avoid.has(ids[0])) || ids.some(id => used.get(id))) continue; out.push(x); ids.forEach(id => used.set(id, (used.get(id) || 0) + 1)); if (out.length >= n) break; }
  return out; }
/* a pool item → a log/plate entry (restaurant items are per item, like the plate's perItem rows) */
function ent13(it, m = 1) { const rest = it.g == null, g = rest ? 100 * m : it.g * m, f = rest ? 1 : 100 / it.g;
  const n = { carbs: it.c, net: it.net, fiber: it.f, sugars: null, protein: it.p, fat: it.fat, kcal: it.kcal }; Object.keys(n).forEach(k => n[k] = n[k] == null ? null : n[k] * f);
  return { id: it.id, name: it.nm, brand: it.br || (rest ? it.chain || '' : 'USDA'), grams: g, label: (m !== 1 ? r1(m) + ' × ' : '') + (it.pl || g0(g) + ' g'), n, perItem: rest }; }
function log13(parts, meal, what) { const ts = Date.now(), L = LOG.all(), ids = [];
  parts.forEach(([it, m], i) => { const e = ent13(it, m), id = 'e' + (ts + i).toString(36) + Math.random().toString(36).slice(2, 5); ids.push(id); L.push({ id, ts, meal, pid: e.id, name: e.name, brand: e.brand, grams: e.grams, label: e.label, n: e.n, score: null }); });
  LOG.save(L); haptic(15); snack9(`Logged ${what || 'meal'} to ${MEAL_L[meal]} · ${g0(val13(sum13(parts)))} ${unit13()}`, () => { LOG.save(LOG.all().filter(e => !ids.includes(e.id))); toast('Removed'); }); }
function toPlate13(entries) { const l = plate(), t = Date.now(); entries.forEach((e, i) => l.push({ k: (t + i).toString(36) + i, id: e.id, name: e.name, brand: e.brand || '', grams: e.grams, label: e.label, n: e.n, perItem: !!e.perItem, liquid: false })); store.set('plate', l); }
const nut13 = s => `<p class="nt13"><span><b>${g0(s.net)}</b> g net carbs</span><span>${g0(s.c)} g carbs</span><span>${g0(s.f)} g fiber</span><span>${g0(s.p)} g protein</span><span>${g0(s.fat)} g fat</span><span>${g0(s.kcal)} kcal</span></p>`;
const who13 = it => it.chain ? '' : it.pk ? esc(it.br) : 'USDA';
const parts13 = ps => `<ul class="pt13">${ps.map(([it, m]) => `<li><b>${esc(it.nm)}</b> <small>${m !== 1 ? r1(m) + ' × ' : ''}${esc(it.pl || '')}${who13(it) ? ' · ' + who13(it) : ''}</small></li>`).join('')}</ul>`;
function card13(x, i, meal, T, head) { return `<li class="card id13">${head || ''}${parts13(x.parts)}${nut13(x.s)}${T ? bar9(val13(x.s), T, MEAL_L[meal]) : ''}<div class="actions"><button class="btn sm pri" data-lg13="${i}">Log to ${MEAL_L[meal]}</button><button class="btn sm" data-pl13="${i}">Open in builder</button></div></li>`; }
function bindCards13(root, list, meal, what) {
  root.querySelectorAll('[data-lg13]').forEach(b => b.onclick = () => { const x = list[+b.dataset.lg13]; log13(x.parts, typeof meal === 'function' ? meal() : meal, what ? what(x) : 'meal'); });
  root.querySelectorAll('[data-pl13]').forEach(b => b.onclick = () => { const x = list[+b.dataset.pl13]; toPlate13(x.parts.map(([it, m]) => ent13(it, m))); go('#/meal'); }); }
const err13 = () => `<div class="card" role="status"><p class="small">Meal ideas couldn't load. Check your connection and try again.</p></div>`;
function tgtNote13(meal) { const T = tgt13(); return T.own ? (T.t[meal] ? `<p class="small tg13">Your ${MEAL_L[meal].toLowerCase()} target: <b>${T.t[meal]} ${unit13()}</b> · <a class="lnk" href="#/settings">Change</a></p>` : `<p class="small tg13">No ${MEAL_L[meal].toLowerCase()} target set, so ideas aren't limited. <a class="lnk" href="#/settings">Set one in Settings</a></p>`)
  : `<div class="card tg13 note13"><p class="small"><b>Using starter limits</b> (breakfast 45, lunch 60, dinner 60, snack 20 g carbs) because you haven't set per-meal targets. <a class="lnk" href="#/settings">Set your own in Settings › Carb target per meal</a>.</p></div>`; }

/* ---------- 1. Meal ideas ---------- */
function viewIdeas13(arg) { document.title = 'Meal ideas — Lumi'; const meal = MEALS.includes(arg) ? arg : mealFor(new Date()); let seed = store.get('ideas13', 1);
  app.innerHTML = `<section class="pg13"><h1>Meal ideas</h1><p class="lead">Lower-carb first, built only from real foods in Lumi: USDA staples and popular packaged items, at typical portions.</p>
  <nav class="sg12 sg13" aria-label="Meal">${MEALS.map(m => `<a href="#/ideas/${m}"${m === meal ? ' class="on" aria-current="page"' : ''}>${MEAL_L[m]}</a>`).join('')}</nav>${tgtNote13(meal)}
  <div id="ids13" aria-live="polite">${skel(3)}</div>
  <div class="actions"><button class="btn" id="more13">Show different ideas</button><a class="btn" href="#/plan">Weekly plan</a><a class="btn" href="#/meal">Meal builder</a></div>
  <p class="foot">Ideas, not medical advice. Portions are typical servings; check the label and confirm doses on your pump.</p></section>`;
  const draw = () => M13().then(d => { const el = $('#ids13'); if (!el) return; const T = tgt13().t[meal], L = pick13(d, meal, 6, seed);
    el.innerHTML = L.length ? `<ul class="ids13">${L.map((x, i) => card13(x, i, meal, T)).join('')}</ul>` : `<div class="card"><p class="small">No combinations fit a ${T} g target. Try raising it in Settings.</p></div>`; bindCards13(el, L, meal); }).catch(() => { const el = $('#ids13'); if (el) el.innerHTML = err13(); });
  $('#more13').onclick = () => { seed++; store.set('ideas13', seed); draw(); }; draw(); }

/* ---------- 4. Swaps ---------- */
let dx13 = null;
function docIx13() { if (dx13 && dx13.n === engine.docs.length) return dx13; const by = new Map(), ai = new Map(); engine.docs.forEach(d => { by.set(d.code, d); if (d.ai >= 0) { let a = ai.get(d.ai); if (!a) ai.set(d.ai, a = []); a.push(d); } }); return dx13 = { n: engine.docs.length, by, ai }; }
async function swapsFor13(items) { const d = await M13(); try { await loadIndex(); } catch {} const ix = docIx13(), N = engine.docs.length || 1, out = [];
  for (const e of items) { const pid = e.pid || e.id, old = e.n && e.n.net != null ? e.n.net * e.grams / 100 : null; if (old == null) { out.push(null); continue; }
    const pit = d.byId.get(pid);
    if (pit && pit.sg && pit.g) { let best = null; for (const x of d.items) if (x.sg === pit.sg && x.id !== pit.id && x.net != null && old - x.net >= 2 && (!best || x.net < best.net)) best = x;
      out.push(best ? { kind: 'pool', it: best, save: old - best.net, name: best.nm, por: best.pl, br: who13(best) } : null); continue; }
    const od = ix.by.get(pid); if (!od || od.ai == null || od.ai < 0 || od.src === 'rest') { out.push(null); continue; }
    const tk = new Set(LumiSearch.norm(od.name).split(' ').filter(w => w.length > 2)), o100 = e.n.net; let best = null, bs = -1e9;
    for (const c of ix.ai.get(od.ai) || []) { if (c.code === od.code || c.src === 'world' || c.src === 'rest' || c.bad || c.zc || c.score == null || c.net == null || c.net > o100 * 0.75 || (o100 - c.net) * e.grams / 100 < 2) continue;
      const sh = LumiSearch.norm(c.name).split(' ').filter(w => tk.has(w)).length; const sc = sh * 12 + 14 * (1 - c.rank / N) + 10 * (o100 - c.net) / Math.max(1, o100) + (c.img ? 2 : 0); if (sc > bs) { bs = sc; best = c; } }
    out.push(best ? { kind: 'doc', d: best, save: (o100 - best.net) * e.grams / 100, name: best.name, por: g0(e.grams) + ' g', br: esc(best.brand || '') } : null); }
  return out; }
/* items: log-entry-like rows; acts: [[label, fn(newItems)]] */
async function swapSheet13(items, title, acts) {
  sheet(`<h2>Lower-carb swaps</h2><p class="small">${esc(title)}: similar foods from the same category with fewer net carbs.</p><div id="sw13" aria-live="polite"><p class="small">Finding swaps…</p></div>`);
  let S; try { S = await swapsFor13(items); } catch { const el = $('#sw13'); if (el) el.innerHTML = '<p class="small">Swaps need the food index. Check your connection.</p><div class="actions"><button class="btn" data-close>Close</button></div>'; return; }
  const el = $('#sw13'); if (!el) return; const any = S.some(Boolean);
  el.innerHTML = `<ul class="sw13">${items.map((e, i) => { const s = S[i]; return `<li>${s ? `<label><input type="checkbox" data-sw13="${i}" checked><span><s>${esc(e.name)}</s> → <b>${esc(s.name)}</b><small>${s.br ? s.br + ' · ' : ''}${esc(s.por)} · saves <b>${g0(s.save)} g net carbs</b></small></span></label>` : `<span class="small"><b>${esc(e.name)}</b> · keep (no lower-carb match in the same category)</span>`}</li>`; }).join('')}</ul>
  ${any ? `<p class="sv13" id="sv13"></p><div class="actions">${acts.map((a, i) => `<button class="btn${i ? '' : ' pri'}" data-act13="${i}">${esc(a[0])}</button>`).join('')}<button class="btn" data-close>Cancel</button></div>` : '<p class="small">No lower-carb swaps found for these foods.</p><div class="actions"><button class="btn" data-close>Close</button></div>'}`;
  el.querySelectorAll('[data-close]').forEach(x => x.onclick = closeSheet);
  const sel = () => [...el.querySelectorAll('[data-sw13]:checked')].map(x => +x.dataset.sw13);
  const upd = () => { const t = sel().reduce((a, i) => a + S[i].save, 0), sv = $('#sv13'); if (sv) sv.innerHTML = `Saves about <b>${g0(t)} g net carbs</b> (${g0(totals(items).net)} → ${g0(totals(items).net - t)} g)`; };
  el.querySelectorAll('[data-sw13]').forEach(x => x.onchange = upd); upd();
  el.querySelectorAll('[data-act13]').forEach(b => b.onclick = async () => { b.disabled = true; const on = new Set(sel()), res = [];
    try { for (let i = 0; i < items.length; i++) { const s = S[i], e = items[i]; if (!s || !on.has(i)) { res.push(e); continue; }
        if (s.kind === 'pool') { const x = ent13(s.it); res.push(Object.assign({}, x, { pid: x.id })); }
        else { const p = await resolveProduct(s.d.code); if (!p) throw new Error('nf'); remember(p); res.push({ id: p.id, pid: p.id, name: p.name, brand: p.brand || '', grams: e.grams, label: g0(e.grams) + ' g', n: per100(p), perItem: false }); } }
      closeSheet(); acts[+b.dataset.act13][1](res); } catch { b.disabled = false; toast("Couldn't load a swap food. Try again online."); } }); }
const asMeal13 = es => es.map(e => ({ pid: e.pid || e.id, name: e.name, brand: e.brand || '', grams: e.grams, label: e.label || (e.perItem ? r1(e.grams / 100) + ' item' : g0(e.grams) + ' g'), n: e.n, score: null }));
function saveMeal13(name, es) { const m = { id: 'm' + Date.now().toString(36), name: name, items: asMeal13(es), used: 0 }; store.set('meals', [m].concat(savedMeals())); snack9(`Saved “${name}” to Saved meals`); return m; }
const openPlate13 = es => { store.set('plate', []); toPlate13(es.map(e => Object.assign({}, e, { id: e.pid || e.id }))); go('#/meal'); };

/* ---------- 2. Meal builder: search to add, gram amounts, swaps, save as recipe ---------- */
const _vm13 = viewMeal;
viewMeal = function () { const r = _vm13.apply(this, arguments); try { meal13(); } catch (e) { console.warn('v13', e); } return r; };
function meal13() { const l = plate(), h1 = app.querySelector('h1'); if (!h1 || $('#mq13')) return;
  app.querySelector('.lead').insertAdjacentHTML('afterend', `<div class="card add13"><label class="fl11"><span>Add a food to the plate</span><input id="mq13" class="in11" type="search" placeholder="Search: chicken, rice, Greek yogurt…" autocomplete="off" aria-controls="mres13"></label><ul id="mres13" class="hl11 rres13"></ul><p class="small">Or start from <a class="lnk" href="#/ideas">Meal ideas</a>, <a class="lnk" href="#/meals">a saved meal</a> or <a class="lnk" href="#/recipes">your recipes</a>.</p></div>`);
  app.querySelectorAll('.loglist li').forEach(li => { const del = li.querySelector('[data-del]'), q = li.querySelector('.qty'); if (!del || !q) return; const x = l.find(y => y.k === del.dataset.del); if (!x) return;
    q.outerHTML = `<label class="g13"><input type="number" inputmode="decimal" min="${x.perItem ? 0.25 : 1}" step="${x.perItem ? 0.25 : 1}" data-g13="${x.k}" value="${x.perItem ? r1(x.grams / 100) : Math.round(x.grams)}" aria-label="Amount of ${esc(x.name)} in ${x.perItem ? 'items' : x.liquid ? 'millilitres' : 'grams'}"><span>${x.perItem ? 'item' : x.liquid ? 'ml' : 'g'}</span></label>`; });
  let gt; app.querySelectorAll('[data-g13]').forEach(inp => inp.oninput = () => { clearTimeout(gt); gt = setTimeout(() => { const v = +inp.value; if (!(v > 0)) return; const L = plate(), x = L.find(y => y.k === inp.dataset.g13); if (!x) return; x.grams = x.perItem ? v * 100 : v; x.label = x.perItem ? r1(v) + ' item' : Math.round(v) + (x.liquid ? ' ml' : ' g'); store.set('plate', L); const k = inp.dataset.g13; viewMeal(); const n = document.querySelector(`[data-g13="${k}"]`); if (n) { n.focus(); try { const s = n.value.length; n.type = 'text'; n.setSelectionRange(s, s); n.type = 'number'; } catch {} } }, 450); });
  const acts = app.querySelector('.actions'); if (l.length && acts && $('#plateLog')) { acts.insertAdjacentHTML('beforeend', `<button class="btn" id="swap13">↘ Lower-carb swaps</button><button class="btn" id="rec13">Save as recipe</button><button class="btn" id="shr13">Share</button>`);
    $('#swap13').onclick = () => swapSheet13(plate().map(x => Object.assign({ pid: x.id }, x)), 'This plate', [['Apply to plate', es => { store.set('plate', []); toPlate13(es.map(e => Object.assign({}, e, { id: e.pid || e.id }))); viewMeal(); toast('Plate updated'); }], ['Save as a new meal', es => saveMeal13('Lower-carb plate', es)]]);
    $('#rec13').onclick = () => { const nm = prompt('Recipe name', 'My plate'); if (!nm) return; const r = { id: 'r' + Date.now().toString(36), name: nm.trim(), servings: 1, items: plate().map(x => ({ id: x.id, name: x.name, brand: x.brand, grams: x.grams, n: x.n })), t: Date.now() }; setRecipes12([r].concat(recipes12()).slice(0, 200)); toast('Saved to Recipes'); go('#/recipe/' + r.id); };
    $('#shr13').onclick = () => share11('meal', { name: 'My plate', items: asMeal13(plate()) }); }
  let qt; $('#mq13').oninput = () => { clearTimeout(qt); qt = setTimeout(async () => { const q = $('#mq13').value.trim(), out = $('#mres13'); if (!out) return; if (q.length < 2) { out.innerHTML = ''; return; }
    try { await loadIndex(); } catch {} const seen = new Set(), res = []; for (const d of engine.search(q, { limit: 6, filter: d => d.src === 'whole' }).concat(engine.search(q, { limit: 12 }))) if (!seen.has(d.code) && res.length < 10) { seen.add(d.code); res.push(d); }
    out.innerHTML = res.map(d => `<li><button class="hr11" data-ad13="${esc(d.code)}"><span class="ht11"><b>${esc(d.name)}</b><small>${esc(d.src === 'whole' ? 'USDA / staple' : d.brand || '')}${d.net != null ? ` · ${r1(d.net)} g net/100 g` : ''}</small></span><span class="small">Add</span></button></li>`).join('') || '<li class="small">No matches.</li>';
    out.querySelectorAll('[data-ad13]').forEach(b => b.onclick = async () => { b.disabled = true; try { const p = await resolveProduct(b.dataset.ad13); if (!p) throw 0; const por = p.portions && p.portions[0]; const g = (por && por[1]) || p.servQ || 100; addToPlate(p, Math.round(g * 10) / 10, por ? por[0] : g0(g) + ' g'); viewMeal(); } catch { b.disabled = false; toast("Couldn't load that food"); } }); }, 250); }; }

/* ---------- 3. Restaurant meal picks ---------- */
function restCard13(c, slug, link) { const L = c.meals.map(ml => ({ parts: ml.map(it => [it, 1]), s: sum13(ml.map(it => [it, 1])) }));
  return { L, html: `<section class="card rp13" id="rp13"><h2>Lowest-carb meals at ${esc(c.name)}</h2><p class="small">Main + side + drink, using only menu items from ${esc(c.name)} in Lumi. Lowest ${unit13()} first.</p><ul class="ids13">${L.map((x, i) => `<li class="id13 in13"><b class="tt13">${g0(val13(x.s))} ${unit13()}</b>${parts13(x.parts)}${nut13(x.s)}<div class="actions"><button class="btn sm pri" data-lg13="${i}">Log</button><button class="btn sm" data-pl13="${i}">Open in builder</button></div></li>`).join('')}</ul>${link ? `<a class="lnk" href="#/browse/rest-${slug}">Full menu ›</a>` : ''}</section>` }; }
function restPicks13(key) { M13().then(d => { if (decodeURIComponent(location.hash.replace(/^#\/browse\//, '')) !== key || $('#rp13')) return; const anchor = app.querySelector('.subchips'); if (!anchor) return;
  if (key === 'rest') { const R = Object.entries(d.rest).map(([s, c]) => ({ s, c, v: Math.min(...c.meals.map(ml => val13(sum13(ml.map(it => [it, 1]))))) })).sort((a, b) => a.v - b.v);
    anchor.insertAdjacentHTML('afterend', `<details class="card rp13" id="rp13"><summary><b>Lowest-carb complete meals by chain</b> <small>${R.length} chains</small></summary><p class="small">Each chain's lowest-carb main + side + drink, from its own menu items. Chains whose sides or drinks Lumi can't classify reliably aren't listed.</p><ul class="hl11">${R.map(r => { const ml = r.c.meals[0]; return `<li><a class="hr11" href="#/browse/rest-${r.s}"><span class="ht11"><b>${esc(r.c.name)} · ${g0(r.v)} ${unit13()}</b><small>${ml.map(it => esc(it.nm)).join(' + ')}</small></span></a></li>`; }).join('')}</ul></details>`); return; }
  const slug = key.slice(5), c = d.rest[slug]; if (!c) return; const { L, html } = restCard13(c, slug); anchor.insertAdjacentHTML('afterend', html); bindCards13($('#rp13'), L, () => mealFor(new Date()), () => c.name + ' meal'); }).catch(() => {}); }
/* called from viewBrowse (app.js) on 'rest' and 'rest-<chain>' pages */

/* ---------- 5. Weekly plan + grocery list ---------- */
const plan13 = () => store.get('plan13', null);
function makePlan13(d, old) { const seed = old ? (old.seed || 1) + 1 : 1 + (Date.now() / 864e5 | 0) % 97, days = old ? old.days.map(x => Object.assign({}, x)) : Array.from({ length: 7 }, () => ({}));
  MEALS.forEach(m => { const locked = new Set(days.map(x => x[m] && x[m].lock ? x[m].ids[0][0] : null).filter(Boolean)), opts = pick13(d, m, 14, seed * 13 + m.length, locked); let k = 0;
    days.forEach(day => { if (day[m] && day[m].lock) return; const x = opts.length ? opts[k++ % opts.length] : null; day[m] = x ? { ids: x.parts.map(([it, q]) => [it.id, q]), lock: false } : null; }); });
  const p = { seed, start: old ? old.start : dayKey(new Date()), days }; store.set('plan13', p); return p; }
const slot13 = (d, s) => s ? s.ids.map(([id, q]) => [d.byId.get(id), q]).filter(x => x[0]) : [];
function viewPlan13() { document.title = 'Weekly meal plan — Lumi';
  app.innerHTML = `<section class="pg13"><h1>Weekly meal plan</h1><p class="lead">Seven days of ideas within your carb targets, from real foods in Lumi. Lock what you like, regenerate the rest.</p><div id="pl13">${skel(3)}</div></section>`;
  M13().then(d => { let p = plan13(); if (!p || !p.days || p.days.length !== 7) p = makePlan13(d); const T = tgt13().t, st = new Date(p.start + 'T12:00');
    $('#pl13').innerHTML = `${tgtNote13('lunch').replace(/lunch target[^<]*<b>[^<]*<\/b>/, 'targets are applied per meal')}<div class="actions"><button class="btn pri" id="rg13">↻ Regenerate unlocked</button><a class="btn" href="#/plan/grocery">🛒 Grocery list</a><button class="btn" id="nw13">Start this week today</button></div>
    ${p.days.map((day, i) => { const dt = new Date(st.getTime() + i * 864e5), all = MEALS.flatMap(m => slot13(d, day[m])), s = sum13(all);
      return `<section class="card day13"><h2>${dt.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} <small>${g0(val13(s))} ${unit13()} · ${g0(s.p)} g protein · ${g0(s.kcal)} kcal</small></h2><ul class="sl13">${MEALS.map(m => { const ps = slot13(d, day[m]), v = sum13(ps), lk = day[m] && day[m].lock;
        return `<li><div class="sh13"><b>${MEAL_L[m]}</b> <span class="small">${ps.length ? `${g0(val13(v))} ${unit13()}${T[m] ? ' of ' + T[m] : ''}` : 'nothing fits'}</span></div><div class="sn13">${ps.map(([it, q]) => `${esc(it.nm)} <small>${q !== 1 ? r1(q) + ' × ' : ''}${esc(it.pl)}</small>`).join(' + ')}</div>
        <div class="sb13"><button class="chip${lk ? ' on' : ''}" data-lk13="${i}/${m}" aria-pressed="${!!lk}">${lk ? '🔒 Locked' : '🔓 Lock'}</button><button class="chip" data-nx13="${i}/${m}">Other idea</button>${ps.length ? `<button class="chip" data-lg13="${i}/${m}">Log</button>` : ''}</div></li>`; }).join('')}</ul></section>`; }).join('')}
    <p class="foot">Ideas, not medical advice. Check labels and confirm doses on your pump.</p>`;
    const at = s => { const [i, m] = s.split('/'); return [p.days[+i], m]; };
    $('#rg13').onclick = () => { makePlan13(d, plan13()); viewPlan13(); toast('New ideas for unlocked meals'); };
    $('#nw13').onclick = () => { const q = plan13(); q.start = dayKey(new Date()); store.set('plan13', q); viewPlan13(); };
    app.querySelectorAll('[data-lk13]').forEach(b => b.onclick = () => { const [day, m] = at(b.dataset.lk13); if (!day[m]) return; day[m].lock = !day[m].lock; store.set('plan13', p); viewPlan13(); });
    app.querySelectorAll('[data-nx13]').forEach(b => b.onclick = () => { const [day, m] = at(b.dataset.nx13); const used = new Set(p.days.map(x => x[m] && x[m].ids[0][0]).filter(Boolean)), opts = pick13(d, m, 40, p.seed * 13 + m.length + (Date.now() % 1000), used); if (!opts.length) return toast('No other idea fits this target');
      day[m] = { ids: opts[0].parts.map(([it, q]) => [it.id, q]), lock: false }; store.set('plan13', p); viewPlan13(); });
    app.querySelectorAll('[data-lg13]').forEach(b => b.onclick = () => { const [day, m] = at(b.dataset.lg13); log13(slot13(d, day[m]), m, 'planned ' + MEAL_L[m].toLowerCase()); });
  }).catch(() => { const el = $('#pl13'); if (el) el.innerHTML = err13(); }); }
function groc13(d, p) { const m = new Map(); p.days.forEach(day => MEALS.forEach(k => slot13(d, day[k]).forEach(([it, q]) => { const e = m.get(it.id) || { it, q: 0 }; e.q += q; m.set(it.id, e); }))); return [...m.values()].sort((a, b) => a.it.nm.localeCompare(b.it.nm)); }
const qty13 = e => `${r1(e.q)} × ${e.it.pl}${e.it.g ? ` (≈${g0(e.q * e.it.g)} g)` : ''}`;
function viewGrocery13() { document.title = 'Grocery list — Lumi'; const STO = LumiStores, AIS = LumiAisles; let mode = store.get('grocMode13', 'aisle');
  app.innerHTML = `<section class="pg13"><a class="lnk" href="#/plan">‹ Weekly plan</a><h1>Grocery list</h1><p class="lead">Everything in this week's plan, totalled.</p><div id="gr13">${skel(3)}</div></section>`;
  M13().then(d => { const p = plan13() || makePlan13(d), L = groc13(d, p), ck = store.get('groc13', {});
    const stores = STO.STORES.map((s, i) => ({ s, i, n: L.filter(e => e.it.pk && (STO.has(e.it.sm, i) || STO.has(e.it.sm, STO.SOLD + i))).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
    let sid = store.get('grocStore13', stores[0] ? stores[0].s[0] : null); if (!stores.some(x => x.s[0] === sid)) sid = stores[0] ? stores[0].s[0] : null;
    const row = e => `<li><label class="gi13"><input type="checkbox" data-ck13="${esc(e.it.id)}"${ck[e.it.id] ? ' checked' : ''}><span><b>${esc(e.it.nm)}</b><small>${e.it.pk ? esc(e.it.br) + ' · ' : ''}${esc(qty13(e))}</small></span></label></li>`;
    const groups = () => { if (mode === 'aisle') return AIS.AISLES.map(a => [a[2] + ' ' + a[1], L.filter(e => e.it.ai === a[0])]).filter(g => g[1].length);
      const si = stores.find(x => x.s[0] === sid); if (!si) return [['Any store', L]]; const at = e => e.it.pk && (STO.has(e.it.sm, si.i) || STO.has(e.it.sm, STO.SOLD + si.i));
      return [['At ' + si.s[1], L.filter(at)], ['Any store (staples and items without store data)', L.filter(e => !at(e))]].filter(g => g[1].length); };
    const draw = () => { const G = groups(), left = L.filter(e => !ck[e.it.id]).length;
      $('#gr13').innerHTML = `<div class="sg12" role="group" aria-label="Group list by"><a href="#" data-md13="aisle"${mode === 'aisle' ? ' class="on" aria-current="true"' : ''}>By aisle</a><a href="#" data-md13="store"${mode === 'store' ? ' class="on" aria-current="true"' : ''}>Shop by store</a></div>
      ${mode === 'store' ? `<div class="chips" role="group" aria-label="Store">${stores.map(x => `<button class="chip${x.s[0] === sid ? ' on' : ''}" aria-pressed="${x.s[0] === sid}" data-st13="${x.s[0]}">${esc(x.s[1])} <small>${x.n}</small></button>`).join('')}</div><p class="small">Store matches come from store brands and Open Food Facts store tags; fresh staples are available anywhere.</p>` : ''}
      <p class="small" role="status">${left} of ${L.length} items left</p>${G.map(([h, es]) => `<section class="card"><h2>${esc(h)}</h2><ul class="gl13">${es.map(row).join('')}</ul></section>`).join('')}
      <div class="actions"><button class="btn pri" id="gs13">Share list</button><button class="btn" id="gc13">Clear checks</button></div>`;
      app.querySelectorAll('[data-md13]').forEach(a => a.onclick = ev => { ev.preventDefault(); mode = a.dataset.md13; store.set('grocMode13', mode); draw(); });
      app.querySelectorAll('[data-st13]').forEach(b => b.onclick = () => { sid = b.dataset.st13; store.set('grocStore13', sid); draw(); });
      app.querySelectorAll('[data-ck13]').forEach(b => b.onchange = () => { ck[b.dataset.ck13] = b.checked; if (!b.checked) delete ck[b.dataset.ck13]; store.set('groc13', ck); const s = app.querySelector('[role=status]'); if (s) s.textContent = `${L.filter(e => !ck[e.it.id]).length} of ${L.length} items left`; });
      $('#gc13').onclick = () => { for (const k in ck) delete ck[k]; store.set('groc13', ck); draw(); };
      $('#gs13').onclick = () => { const txt = 'Lumi grocery list\n' + groups().map(([h, es]) => `\n${h}\n` + es.map(e => `${ck[e.it.id] ? '☑' : '☐'} ${e.it.nm}${e.it.pk ? ' (' + e.it.br + ')' : ''}: ${qty13(e)}`).join('\n')).join('\n');
        if (navigator.share) navigator.share({ title: 'Grocery list', text: txt }).catch(() => {}); else (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('List copied'), () => toast("Couldn't copy")); }; };
    draw(); }).catch(() => { const el = $('#gr13'); if (el) el.innerHTML = err13(); }); }

/* ---------- entry points: Home shortcuts, Log (ideas + swaps per meal), Saved meals (swaps) ---------- */
SC74.splice(1, 0, ['#/ideas', 'Meal ideas'], ['#/plan', 'Meal plan']);
(function () {
  const vl = viewLog; viewLog = function (arg) { const r = vl.apply(this, arguments); try { logDeco13(arg); } catch (e) { console.warn('v13', e); } return r; };
  function logDeco13(arg) { if (arg && !/^\d{4}-\d{2}-\d{2}$/.test(arg)) return; const day = arg ? new Date(arg + 'T12:00') : new Date(), es = LOG.all().filter(e => dayKey(e.ts) === dayKey(day));
    const nav = app.querySelector('.sg12'); if (nav && !$('#lk13')) nav.insertAdjacentHTML('afterend', `<p class="lk13" id="lk13"><a class="chip" href="#/ideas">💡 Meal ideas</a><a class="chip" href="#/plan">📅 Weekly plan</a><a class="chip" href="#/meal">🍽 Meal builder</a></p>`);
    app.querySelectorAll('[data-savemeal]').forEach(b => { const m = b.dataset.savemeal, items = es.filter(e => e.meal === m); if (!items.length || b.parentNode.querySelector('[data-swl13]')) return;
      b.insertAdjacentHTML('afterend', `<button class="chip" data-swl13="${m}">↘ Lower-carb version</button>`);
      b.parentNode.querySelector('[data-swl13]').onclick = () => swapSheet13(items, MEAL_L[m] + ' as logged', [['Save as a meal for next time', x => saveMeal13(`${MEAL_L[m]} (lower-carb)`, x)], ['Open in builder', openPlate13]]); }); }
  const vm = viewMeals9; viewMeals9 = function () { const r = vm.apply(this, arguments); try { app.querySelectorAll('[data-ren9]').forEach(b => { const m = savedMeals().find(x => x.id === b.dataset.ren9); if (!m) return;
      b.insertAdjacentHTML('beforebegin', `<button class="btn sm" data-sw9="${m.id}" aria-label="Lower-carb swaps for ${esc(m.name)}">↘ Swap</button>`);
      b.parentNode.querySelector('[data-sw9]').onclick = () => swapSheet13(m.items, m.name, [['Save as new meal', x => { saveMeal13(m.name + ' (lower-carb)', x); viewMeals9(); }], ['Open in builder', openPlate13]]); }); } catch (e) { console.warn('v13', e); } return r; };
})();
