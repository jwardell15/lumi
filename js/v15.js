/* Lumi 15.0: per-serving top picks, category sanity, short USDA names, plan "Other idea" sheet,
   post-meal glucose review, favorites + quick log, fresh food quick-add, fat/protein note, price history, offline barcodes.
   Descriptive only. No dose math. Glucose is only what the user imported/fetched (or clearly labelled sample/sandbox data). */

/* ---------- (a) serving sizes for the Top picks pool (data/pick15.json, ~7 KB) ---------- */
let P15 = null, p15p = null;
const loadP15 = () => p15p || (p15p = fetch('data/pick15.json').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(j => (P15 = j)));
const serv15 = d => P15 && P15[d.code || d.id];
function fixServ15(root) { if (!P15) return; (root || app).querySelectorAll('.li141:not([data-s15])').forEach(li => { li.dataset.s15 = 1; const a = li.querySelector('a.m14'), nt = li.querySelector('.nt141 > b'); if (!a || !nt) return;
    const code = decodeURIComponent((a.getAttribute('href') || '').split('/').pop()), s = P15[code], d = engine.byCode && engine.byCode(code); if (!s || !d || d.net == null) return;
    const g = s[0], lab = s[1], n = d.net * g / 100, lbl = /\(\s*[\d.]+\s*(g|ml)\s*\)|^[\d.]+ ?(g|ml)$/i.test(lab) ? lab : `${lab} (${Math.round(g)} g)`;
    nt.textContent = (n < 1 ? '<1' : Math.round(n)) + ' g'; const t = nt.nextSibling; if (t && t.nodeType === 3) t.textContent = ` net carbs per ${lbl}` + (/·\s*$/.test(t.textContent) ? ' · ' : ''); li.querySelector('.nt141').title = `${Math.round(d.net)} g net carbs per 100 g`; }); }
new MutationObserver(() => { if (P15 && app.querySelector('.li141:not([data-s15])')) fixServ15(); }).observe(document.getElementById('app'), { childList: true, subtree: true });
{ const _h = home14; home14 = function () { loadP15().then(() => fixServ15()); return _h.apply(this, arguments); }; }

/* ---------- (b) category sanity: don't show a category tag the name contradicts ---------- */
const KIND15 = [['Vegetables', /\b(corn|peas|green beans|carrots?|broccoli|spinach|kale|cauliflower|asparagus|zucchini|squash|lettuce|cucumbers?|peppers?|tomato(es)?|celery|cabbage|beets?|mushrooms?|okra|artichokes?|brussels)\b/i, /veg|produce|canned|frozen|salad|side/i],
  ['Fruit', /\b(apples?|bananas?|berries|strawberr|blueberr|raspberr|blackberr|grapes?|oranges?|peach(es)?|pears?|cherr(y|ies)|mango|pineapple|melon|kiwi)\b/i, /fruit|produce|berr|canned|frozen|snack/i],
  ['Nuts & seeds', /\b(almonds?|walnuts?|cashews?|pecans?|pistachios?|peanuts?|seeds?)\b/i, /nut|seed|snack|trail|butter|spread/i],
  ['Cheese', /\bcheese\b/i, /chees|dairy|snack|deli/i], ['Yogurt', /\b(yogh?urt|skyr|kefir)\b/i, /yog|dairy|kefir/i], ['Eggs', /\beggs?\b(?! noodles)/i, /egg|dairy|breakfast/i]];
{ const _c = catLabel141; catLabel141 = function (d) { const l = _c.apply(this, arguments); if (!l || !d || !d.name) return l;
    const nm = String(d.name).split(/,| with | in /i)[0]; for (const [lab, re, ok] of KIND15) if (re.test(nm) && !ok.test(l)) { const others = KIND15.filter(k => k[0] !== lab && k[1].test(nm)); return others.length ? '' : lab; } return l; }; }

/* ---------- (d) short display names for long USDA records (full name stays on the product page) ---------- */
const PREP15 = /^(raw|cooked|boiled|steamed|roasted|baked|grilled|broiled|fried|frozen|canned|dried|drained|microwaved|stewed|mashed)$/i, FILL15 = /^(mature seeds|all commercial varieties|without salt|with salt|includes .*|nfs|ns as to .*|unprepared|prepared|regular|whole|all varieties|commercial|fresh|plain)$/i;
function short15(n) { const parts = String(n).split(/,\s*/); if (parts.length < 3 && n.length <= 32) return n; const head = parts[0];
  let prep = parts.slice(1).map(p => (p.match(/^(?:[a-z]+, )?([a-z]+)/i) || [])[1]).find(w => w && PREP15.test(w));
  const v = parts[1] && !PREP15.test(parts[1]) && !FILL15.test(parts[1]) && parts[1].split(' ').length <= 2 && parts[1].length <= 14 ? parts[1] : '';
  let out = head + (v ? ', ' + v : '') + (prep ? ', ' + prep.toLowerCase() : ''); if (out.length > 40) out = head + (prep ? ', ' + prep.toLowerCase() : ''); return out; }
{ const _q = nameQ141; nameQ141 = function (d) { const q = _q.apply(this, arguments); if (d && d.src === 'whole' && q && q.name) { const s = short15(q.name); if (s !== q.name) return Object.assign({}, q, { name: s, renamed: true, full: q.name }); } return q; }; }

/* ---------- (f) plan "Other idea" sheet with the two columns ---------- */
function otherSheet15(opts, meal, put) { if (!otherSheet15.ld) { otherSheet15.ld = 1; return loadIndex().catch(() => {}).then(() => otherSheet15(opts, meal, put)); }
  const X = opts.slice(0, 40).map((x, i) => Object.assign({ i, c: val13(x.s) }, plateH14(x.parts)));
  const A = X.slice().sort((a, b) => a.c - b.c).slice(0, 3), seen = new Set(A.map(x => x.i)), B = X.filter(x => x.h != null && x.h >= 50 && !seen.has(x.i)).sort((a, b) => b.h - a.h || a.c - b.c).slice(0, 3);
  const mini = x => `<li><button type="button" class="m14 mi14" data-pk15="${x.i}"><span class="t14"><b>${opts[x.i].parts.map(([it]) => esc(it.nm)).join(' + ')}</b><span class="cs14"><span class="nc14">${Math.round(x.c)} ${unit13()}</span>${x.h != null ? `<span class="sc14 bg-${HB(x.h)}">Health ${x.h}</span>` : ''}</span></span></button></li>`;
  const el = sheet(`<h2 id="os15h">Pick another ${esc(MEAL_L[meal].toLowerCase())}</h2>${dual14(A, B, { label: 'Other ideas for each goal', subA: 'Fewest carbs', subB: 'Highest plate health rating', mini, how: false, empty: 'Health ratings not available for these foods.' })}<div class="actions"><button class="btn" data-close>Cancel</button></div>`);
  const card = el.querySelector('.sheet-card'); card.setAttribute('aria-labelledby', 'os15h');
  el.querySelectorAll('[data-pk15]').forEach(b => b.onclick = () => { closeSheet(); put(opts[+b.dataset.pk15]); toast('Swapped'); });
  const f = el.querySelector('[data-pk15]'); if (f) f.focus();
}

/* ---------- 2. favorites + quick log ---------- */
const favs15 = () => store.get('fav15', []);
const isFav15 = id => favs15().some(f => f.id === id);
function toggleFav15(p) { let L = favs15(); const on = !isFav15(p.id); if (on) { L.unshift({ id: p.id, name: p.name, brand: p.brand || '', t: Date.now() }); remember(p); } else L = L.filter(f => f.id !== p.id); store.set('fav15', L.slice(0, 60)); return on; }
function quick15() { // most-logged (last 60 days) + starred, each with the last portion used
  const since = Date.now() - 60 * 864e5, by = new Map();
  LOG.all().forEach(e => { if (!e.pid || e.ts < since) return; const x = by.get(e.pid) || { id: e.pid, n: 0, last: null }; x.n++; if (!x.last || e.ts > x.last.ts) x.last = e; by.set(e.pid, x); });
  const F = favs15().map(f => Object.assign({ fav: 1 }, by.get(f.id) || { id: f.id, n: 0, last: null }, { name: f.name, brand: f.brand }));
  const T = [...by.values()].filter(x => x.n >= 2 && !F.some(f => f.id === x.id)).sort((a, b) => b.n - a.n);
  return F.concat(T).slice(0, 8).map(x => Object.assign(x, { name: x.name || x.last.name, brand: x.brand ?? x.last.brand }));
}
async function quickLog15(x, btn) {
  const meal = mealFor(new Date()), id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); let e;
  if (x.last) e = Object.assign({}, x.last, { id, ts: Date.now(), meal });
  else { if (btn) btn.disabled = true; let p = null; try { p = await resolveProduct(x.id); } catch {} if (btn) btn.disabled = false; if (!p) return toast('Not available offline yet');
    const q = +p.servQ > 0 ? +p.servQ : 100; e = { id, ts: Date.now(), meal, pid: p.id, name: p.name, brand: p.brand || '', grams: q, label: p.serv || `${q} g`, n: per100(p), score: S.score(p).score }; remember(p); }
  const L = LOG.all(); L.push(e); LOG.save(L); haptic(15);
  snack9(`Logged ${e.name} · ${e.label} to ${MEAL_L[meal]}`, () => { LOG.save(LOG.all().filter(z => z.id !== id)); toast('Removed'); });
}
function quickCard15(full) {
  const Q = quick15();
  const rows = Q.map((x, i) => `<li class="q15"><a class="q15n" href="#/product/${esc(x.id)}"><b>${x.fav ? '<span aria-hidden="true">★ </span>' : ''}${esc(x.name)}</b><small>${esc(x.last ? x.last.label : 'label serving')}${x.n ? ` · logged ${x.n}×` : ''}${x.fav ? ' · starred' : ''}</small></a><button type="button" class="btn sm pri" data-ql15="${i}" aria-label="Log ${esc(x.name)}, ${esc(x.last ? x.last.label : 'label serving')}">Log</button></li>`).join('');
  return { Q, html: `<section class="card qc15" aria-labelledby="qc15h"><div class="du14h"><h2 id="qc15h">Quick log</h2><a class="lnk" href="#/fresh">+ Fresh food</a></div>
    ${Q.length ? `<ul class="ql15">${rows}</ul><p class="xs">One tap logs your usual portion to ${esc(MEAL_L[mealFor(new Date())])}. Undo appears for a few seconds.</p>` : `<p class="small">Star foods on their product page (☆ Favorite) or log something twice and it shows up here for one-tap logging.</p>`}
    ${full ? '' : ''}</section>` };
}
function bindQuick15(root, Q) { root.querySelectorAll('[data-ql15]').forEach(b => b.onclick = () => quickLog15(Q[+b.dataset.ql15], b)); }
function viewQuick15() { document.title = 'Quick log — Lumi'; const { Q, html } = quickCard15(true);
  app.innerHTML = `<section class="pg13"><h1>Quick log</h1><p class="lead74">Your starred and most-logged foods.</p>${html}<p class="foot">Informational only, not medical advice.</p></section>`; bindQuick15(app, Q); }
{ const _vh = viewHome; viewHome = function () { const r = _vh.apply(this, arguments); try { const { Q, html } = quickCard15(); const h = app.querySelector('#picks') && app.querySelector('#picks').previousElementSibling;
    if (Q.length && h) { h.insertAdjacentHTML('beforebegin', html); bindQuick15(app, Q); } } catch (e) { console.warn(e); } setTimeout(prefetch15, 2500); return r; }; }

/* ---------- 3. fresh food quick-add (USDA whole foods, USDA portions only) ---------- */
const plab15 = (l, g) => { l = String(l || '').trim(); if (/^[\d.½¼¾]/.test(l)) return l; if (/^(oz|ounces?|lb|fl oz)\b/i.test(l) && Math.abs(g - 28.35) > 1.5) return Math.round(g) + ' g'; return '1 ' + l; };
function viewFresh15(arg) { document.title = 'Add fresh food — Lumi';
  app.innerHTML = `<section class="pg13"><a class="lnk back13" href="#/log">‹ Log</a><h1>Add fresh food</h1><p class="lead74">Produce, eggs, meat, fish and other whole foods from USDA. Portions are USDA's own household measures.</p>
   <label class="field"><span>Food name</span><input id="fr15q" type="search" autocomplete="off" placeholder="e.g. apple, broccoli, salmon" value="${esc(arg || '')}"></label><div id="fr15" aria-live="polite"></div>
   <p class="foot">USDA FoodData Central. Informational only, not medical advice.</p></section>`;
  const q = $('#fr15q'), out = $('#fr15'); let t;
  const run = () => loadIndex().then(() => { const v = q.value.trim().toLowerCase(); if (v.length < 2) { out.innerHTML = '<p class="small">Type at least 2 letters.</p>'; return; }
    const W = v.split(/\s+/), L = engine.docs.filter(d => d.src === 'whole' && W.every(w => d.name.toLowerCase().includes(w)));
    L.sort((a, b) => (b.name.toLowerCase().startsWith(W[0]) - a.name.toLowerCase().startsWith(W[0])) || /\braw\b/i.test(b.name) - /\braw\b/i.test(a.name) || a.name.length - b.name.length);
    const R = L.slice(0, 12);
    out.innerHTML = R.length ? `<ul class="fr15l">${R.map(d => `<li><button type="button" class="fr15b" data-fr15="${esc(d.code)}" aria-expanded="false"><b>${esc(short15(d.name))}</b><small>${Math.round(d.net)} g net carbs per 100 g</small></button><div class="fr15p" hidden></div></li>`).join('')}</ul>` : '<p class="small">No USDA whole food matches that. Try a simpler word.</p>';
    out.querySelectorAll('[data-fr15]').forEach(b => b.onclick = async () => { const box = b.nextElementSibling, open = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', !open); box.hidden = open; if (open || box.dataset.ok) return;
      box.innerHTML = '<p class="small">Loading portions…</p>'; let p = null; try { p = await genericProduct(b.dataset.fr15); } catch {} box.dataset.ok = 1;
      const P = p && (p.portions || []).filter(x => x && x[1] > 0).slice(0, 6); if (!p || !P.length) { box.innerHTML = `<p class="small">USDA lists no household portions for this food. <a class="lnk" href="#/product/${esc(b.dataset.fr15)}">Open it to log by grams</a>.</p>`; return; }
      const net = S.score(p).net;
      box.innerHTML = `<div class="chips">${P.map((x, i) => `<button type="button" class="chip" data-po15="${i}">${esc(plab15(x[0], x[1]))} <small>${Math.round(x[1])} g · ${net == null ? '?' : Math.round(net * x[1] / 100)} g net</small></button>`).join('')}</div><p class="xs">Tap a portion to log it to ${esc(MEAL_L[mealFor(new Date())])}. Full name: ${esc(p.name)}</p>`;
      box.querySelectorAll('[data-po15]').forEach(c => c.onclick = () => { const x = P[+c.dataset.po15], lab = plab15(x[0], x[1]), meal = mealFor(new Date()); addEntry(p, x[1], lab, meal, Date.now()); const L = LOG.all(), e = L[L.length - 1]; haptic(15);
        snack9(`Logged ${short15(p.name)} · ${lab} to ${MEAL_L[meal]}`, () => { LOG.save(LOG.all().filter(z => z.id !== e.id)); toast('Removed'); }); }); }); });
  q.oninput = () => { clearTimeout(t); t = setTimeout(run, 180); }; run(); if (!arg) q.focus();
}

/* ---------- 4. fat/protein note (off by default, informational only) ---------- */
const fp15 = () => !!settings().fpNote;
const FPTXT15 = 'High fat/protein meals can raise glucose later, sometimes 3–5 hours after eating. Discuss extended or split bolus options with your care team.';
function fpNote15(fat, pro, what) { if (!fp15() || !((fat || 0) >= 20 || (pro || 0) >= 25)) return '';
  return `<div class="note fp15" role="note"><b>Fat/protein note</b> · ${esc(what)} has ${Math.round(fat || 0)} g fat and ${Math.round(pro || 0)} g protein. ${FPTXT15} <span class="xs">Informational only. Lumi does no dose math.</span></div>`; }
{ const _vs = viewSettings; viewSettings = function () { const r = _vs.apply(this, arguments); const st = settings();
    const html = `<div class="card" id="fp15c"><h2>Fat/protein note — optional</h2><p class="small">Off by default. When on, product pages and the log show a short informational note on meals with 20 g+ fat or 25 g+ protein. No dose math, ever.</p>
      <label class="tg15"><input type="checkbox" id="fp15t"${st.fpNote ? ' checked' : ''}> <span>Show the fat/protein note</span></label></div>`;
    const f = $('#sf'); if (f) f.insertAdjacentHTML('afterend', html); const t = $('#fp15t'); if (t) t.onchange = () => { setSettings({ fpNote: t.checked }); toast(t.checked ? 'Fat/protein note on' : 'Fat/protein note off'); }; return r; }; }

/* ---------- 5. price history from scan history ---------- */
const price15 = s => { const v = parseFloat(String(s || '').replace(/[^\d.]/g, '')); return isFinite(v) && v > 0 ? v : null; };
function prices15() { const by = new Map(); scans11().forEach(s => { const v = price15(s.price); if (v == null) return; const k = gtinKey(s.code) || s.code; const x = by.get(k) || { code: s.code, name: s.name, brand: s.brand, P: [] }; x.P.push({ ts: s.ts, v, note: s.note || '' }); by.set(k, x); });
  return [...by.values()].map(x => { x.P.sort((a, b) => b.ts - a.ts); x.min = x.P.reduce((m, p) => p.v < m.v ? p : m, x.P[0]); return x; }).sort((a, b) => b.P[0].ts - a.P[0].ts); }
const $f15 = v => '$' + v.toFixed(2), dt15 = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
function priceCard15(x, link) { return `<section class="card pc15"><h2>${link ? `<a href="#/product/${esc(x.code)}">${esc(x.name)}</a>` : 'Price history'}</h2>${link && x.brand ? `<p class="xs">${esc(x.brand)}</p>` : ''}
  <p><b>Cheapest seen ${$f15(x.min.v)}</b> <span class="small">on ${dt15(x.min.ts)}${x.min.note ? ' · ' + esc(x.min.note) : ''}</span>${x.P.length > 1 ? `<br><span class="small">Latest ${$f15(x.P[0].v)} · ${x.P.length} prices</span>` : ''}</p>
  <table class="pt15"><caption class="vh">Prices you entered</caption><thead><tr><th scope="col">Date</th><th scope="col">Price</th><th scope="col">Note</th></tr></thead><tbody>${x.P.slice(0, 12).map(p => `<tr><td>${dt15(p.ts)}</td><td>${$f15(p.v)}${p === x.min ? ' <span class="xs">lowest</span>' : ''}</td><td>${esc(p.note)}</td></tr>`).join('')}</tbody></table></section>`; }
function viewPrices15() { document.title = 'Price history — Lumi'; const L = prices15();
  app.innerHTML = `<section class="pg13"><a class="lnk back13" href="#/history">‹ Scan history</a><h1>Price history</h1><p class="lead74">From prices you typed into Scan history. Lumi never looks prices up.</p>
  ${L.length ? L.map(x => priceCard15(x, true)).join('') : `<div class="card"><p class="small">No prices yet. In <a class="lnk" href="#/history">Scan history</a>, type a price next to a scan and it shows up here with the cheapest you've seen.</p></div>`}</section>`; }

/* ---------- 1. post-meal glucose review (descriptive only) ---------- */
function curve15(ts) { const r = postMeal11(ts); if (!r) return null; const { P } = r; const start = P.reduce((b, p) => Math.abs(p[0] - ts) < Math.abs(b[0] - ts) ? p : b, P[0]);
  if (Math.abs(start[0] - ts) > 15 * 6e4) return null; const after = P.filter(p => p[0] >= ts && p[0] <= ts + 3 * 36e5); if (after.length < 6) return null;
  const peak = after.reduce((b, p) => p[1] > b[1] ? p : b, after[0]); return { start: start[1], peak: peak[1], rise: peak[1] - start[1], ttp: Math.round((peak[0] - ts) / 6e4), P }; }
function meals15() { const L = LOG.all().slice().sort((a, b) => a.ts - b.ts), M = []; L.forEach(e => { const m = M[M.length - 1]; if (m && m.meal === e.meal && e.ts - m.ts <= 30 * 6e4) m.es.push(e); else M.push({ ts: e.ts, meal: e.meal, es: [e] }); }); return M.reverse(); }
function spark15(c, ts) { const W = 150, H = 44, lo = Math.min(...c.P.map(p => p[1])) - 5, hi = Math.max(...c.P.map(p => p[1])) + 5, x = t => (t - (ts - 15 * 6e4)) / (195 * 6e4) * W, y = v => H - 3 - (v - lo) / (hi - lo || 1) * (H - 6);
  return `<svg class="sp15" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><line x1="${x(ts).toFixed(1)}" x2="${x(ts).toFixed(1)}" y1="0" y2="${H}" class="meal"/><path d="${c.P.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join(' ')}" class="ln"/></svg>`; }
function viewReview15() { document.title = 'Glucose after meals — Lumi'; const c = cgm11();
  const srcL = !c ? '' : c.src === 'sample' ? '<div class="note smp15" role="note"><b>SAMPLE DATA</b> · Simulated readings for testing. Not real glucose. Remove it on the Dexcom glucose page.</div>' : c.src === 'api-sandbox' ? '<div class="note smp15" role="note"><b>Dexcom SANDBOX</b> · Simulated data from Dexcom\'s developer sandbox, not your glucose.</div>' : `<p class="small">Source: ${c.src === 'clarity' ? 'your Dexcom Clarity export' : 'your Dexcom account'} · imported ${dt15(c.imported)}.</p>`;
  const M = c ? meals15().map(m => Object.assign(m, { c: curve15(m.ts) })).filter(m => m.c) : [];
  const F = new Map(); M.forEach(m => { const seen = new Set(); m.es.forEach(e => { const k = e.pid || e.name; if (seen.has(k)) return; seen.add(k); const x = F.get(k) || { name: e.name, R: [] }; x.R.push(m.c.rise); F.set(k, x); }); });
  const FR = [...F.values()].map(x => Object.assign(x, { avg: Math.round(x.R.reduce((a, b) => a + b, 0) / x.R.length) })), ok = FR.filter(x => x.R.length >= 2).sort((a, b) => b.avg - a.avg), few = FR.filter(x => x.R.length < 2);
  app.innerHTML = `<section class="pg13"><a class="lnk back13" href="#/glucose">‹ Dexcom glucose</a><h1>Glucose after meals</h1><p class="lead74">How glucose moved in the 3 hours after each logged meal. Descriptive only. Not dosing advice.</p>${srcL}
  ${!c ? `<div class="card"><p class="small">Not enough data: no glucose readings on this device. <a class="lnk" href="#/glucose">Import a Clarity CSV</a>, then log meals.</p></div>`
    : !M.length ? `<div class="card"><p class="small">Not enough data: none of your logged meals has glucose readings covering the meal time and at least 90 minutes after it.</p></div>`
    : `<section class="card"><h2>Foods by average rise</h2><p class="xs">Rise = peak within 3 h minus the reading at the meal. Meals mix foods, so this shows association, not cause. Foods need 2+ meals with data.</p>
      ${ok.length ? `<ol class="rk15">${ok.slice(0, 15).map(x => `<li><span>${esc(x.name)}</span><span><b>${x.avg >= 0 ? '+' : ''}${x.avg} mg/dL</b> <small>avg of ${x.R.length} meals</small></span></li>`).join('')}</ol>` : '<p class="small">Not enough data yet: no food appears in 2 or more meals with glucose coverage.</p>'}
      ${few.length ? `<p class="xs">Not enough data for ${few.length} other food${few.length > 1 ? 's' : ''} (only 1 meal each).</p>` : ''}</section>
    <section class="card"><h2>Each meal</h2><ul class="mr15">${M.slice(0, 30).map(m => `<li><div><b>${esc(MEAL_L[m.meal] || 'Meal')} · ${new Date(m.ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b><small>${esc(m.es.map(e => e.name).join(', '))}</small>
      <span class="xs">Start ${m.c.start} · peak ${m.c.peak} mg/dL at ${m.c.ttp} min · rise ${m.c.rise >= 0 ? '+' : ''}${m.c.rise}</span></div>${spark15(m.c, m.ts)}</li>`).join('')}</ul></section>`}
  <p class="foot">Readings as recorded; Low/High values are not included. Informational only, not medical advice. Lumi gives no dosing advice.</p></section>`; }

/* ---------- 6. offline: keep saved / favorite / logged foods; resolve scanned barcodes offline ---------- */
const keep15 = () => new Set([...saved().map(s => s.p.id), ...favs15().map(f => f.id), ...LOG.all().slice(-400).map(e => e.pid)].filter(Boolean));
remember = function (p) { if (!p || !p.id) return; const m = store.get('foods', {}); m[p.id] = p; const ks = Object.keys(m); if (ks.length > 400) { const K = keep15(); const k = ks.find(x => !K.has(x)) || ks[0]; delete m[k]; } store.set('foods', m); };
{ const _rp = resolveProduct; resolveProduct = async function (id) { let p = null, err = null; try { p = await _rp.apply(this, arguments); } catch (e) { err = e; }
    if (p) { try { if (keep15().has(p.id) || keep15().has(id)) remember(p); } catch {} return p; }
    if (/^\d{6,}$/.test(String(id))) { const m = store.get('foods', {}); for (const v of codeVariants(id)) { const hit = m[v] || Object.values(m).find(x => x && x.code && gtinKey(x.code) === gtinKey(v)); if (hit) return hit; } const s = saved().find(x => gtinKey(x.p.code || x.p.id) === gtinKey(id)); if (s) return s.p; }
    if (err) throw err; return p; }; }
let pf15 = false;
async function prefetch15() { if (pf15 || !navigator.onLine) return; pf15 = true; const m = store.get('foods', {}), miss = [...keep15()].filter(id => !m[id]).slice(0, 25);
  for (const id of miss) { try { const p = await _rp15(id); if (p) remember(p); } catch {} } }
const _rp15 = id => resolveProduct(id);

/* ---------- product page additions: star, fat/protein note, price history ---------- */
{ const _vp = viewProduct; viewProduct = function (id) { const r = _vp.apply(this, arguments); prodExtra15(id); return r; }; }
function prodExtra15(id) { let n = 0; const tick = async () => { if (!location.hash.includes(encodeURIComponent(id)) && !location.hash.includes(id)) return; const h1 = app.querySelector('h1'); if (!h1 || app.querySelector('.skel')) { if (n++ < 50) setTimeout(tick, 120); return; }
    if (app.querySelector('#px15')) return; let p = null; try { p = await resolveProduct(id); } catch {} if (!p || app.querySelector('#px15')) return;
    const sq = +p.servQ > 0 ? +p.servQ : 100, f = p.n && p.n.fat != null ? p.n.fat * sq / 100 : 0, pr = p.n && p.n.protein != null ? p.n.protein * sq / 100 : 0;
    const pz = prices15().find(x => gtinKey(x.code) === gtinKey(p.code || id));
    const html = `<div id="px15"><div class="actions"><button type="button" class="btn" id="fav15" aria-pressed="${isFav15(p.id)}">${isFav15(p.id) ? '★ Favorite' : '☆ Favorite'}</button></div>${fpNote15(f, pr, 'One ' + (+p.servQ > 0 ? 'serving' : '100 g'))}${pz ? priceCard15(pz) : ''}</div>`;
    h1.parentElement.insertAdjacentHTML('beforeend', html);
    const b = $('#fav15'); b.onclick = () => { const on = toggleFav15(p); b.setAttribute('aria-pressed', on); b.textContent = on ? '★ Favorite' : '☆ Favorite'; toast(on ? 'Added to Quick log' : 'Removed from favorites'); }; };
  setTimeout(tick, 60); }

/* ---------- log: fat/protein note per meal; links into the new pages ---------- */
new MutationObserver(() => { const v = location.hash.replace(/^#\/?/, '').split('/')[0];
  if (v === 'log' && !$('#lk15')) { const h = app.querySelector('h1'); if (h) { h.insertAdjacentHTML('afterend', `<p class="lk15" id="lk15"><a class="lnk" href="#/fresh">+ Add fresh food</a> · <a class="lnk" href="#/quick">Quick log</a> · <a class="lnk" href="#/review">Glucose after meals</a></p>`);
      if (fp15()) { const dk = (location.hash.split('/')[2] || ''), day = dk ? new Date(dk + 'T12:00') : new Date(), s0 = new Date(day).setHours(0, 0, 0, 0), es = LOG.all().filter(e => e.ts >= s0 && e.ts < s0 + 864e5), by = {};
        es.forEach(e => { const g = e.grams / 100, x = by[e.meal] || (by[e.meal] = { f: 0, p: 0 }); x.f += ((e.n && e.n.fat) || 0) * g; x.p += ((e.n && e.n.protein) || 0) * g; });
        const notes = Object.entries(by).map(([m, x]) => fpNote15(x.f, x.p, MEAL_L[m] || m)).join(''); if (notes) $('#lk15').insertAdjacentHTML('afterend', notes); } } }
  if (v === 'glucose' && !$('#gr15') && !$('.g16') && app.querySelector('h1')) app.querySelector('h1').insertAdjacentHTML('afterend', `<p id="gr15"><a class="btn" href="#/review">Glucose after meals: review</a></p>`);
  if (v === 'history' && !$('#hp15') && app.querySelector('h1')) app.querySelector('h1').insertAdjacentHTML('afterend', `<p id="hp15"><a class="lnk" href="#/prices">Price history and cheapest seen ›</a></p>`);
}).observe(document.getElementById('app'), { childList: true });
if (typeof chart11 === 'function') { const _ch = chart11; chart11 = function () { let h = _ch.apply(this, arguments); const c = cgm11(); if (h && c && c.src === 'sample') h = h.replace(/Source: [^.]*\./, 'Source: SAMPLE DATA (simulated for testing, not real glucose).'); return h; }; }

/* routes that landed before this file loaded */
if (/^#\/(quick|fresh|review|prices)\b/.test(location.hash)) route();
else if (/^#?\/?$/.test(location.hash) && $('#picks') && !$('.qc15')) { const { Q, html } = quickCard15(); const h = $('#picks').previousElementSibling; if (Q.length && h) { h.insertAdjacentHTML('beforebegin', html); bindQuick15(app, Q); } loadP15().then(() => fixServ15()); }

