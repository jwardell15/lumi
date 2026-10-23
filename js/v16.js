/* Lumi 16.0: Clarity CSV import (drag/drop, Files picker, last-import memory, meal matching, time in range after meals),
   daily summary + insights (#/today), search synonyms, home Today strip. Dexcom login removed (see app.js migration).
   Never invents glucose: everything here uses only readings the user imported from Dexcom Clarity (or labeled sample data). */

/* ---------- glucose helpers ---------- */
const DAY16 = 864e5, LO16 = 70, HI16 = 180;
const dkey16 = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dstart16 = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const pct16 = (a, n) => n ? Math.round(a / n * 100) : 0;
function tir16(P) { const n = P.length; if (!n) return null; let lo = 0, hi = 0; P.forEach(p => { if (p[1] < LO16) lo++; else if (p[1] > HI16) hi++; });
  const inr = n - lo - hi, lop = pct16(lo, n), hip = pct16(hi, n); return { n, lo: lop, hi: hip, in: 100 - lop - hip, mean: Math.round(P.reduce((a, p) => a + p[1], 0) / n) }; }
function mealWin16(ts) { const c = cgm11(); if (!c || !c.pts) return null; const P = c.pts.filter(p => p[0] >= ts && p[0] <= ts + 3 * 36e5); return P.length >= 18 ? P : null; } // ≥90 min of 5-min readings
function srcNote16(c) { return !c ? '' : c.src === 'sample' ? '<div class="note smp15" role="note"><b>SAMPLE DATA</b> · Simulated readings for testing. Not real glucose. Remove it on the Glucose page.</div>' : ''; }
function tirBar16(t, label) { return `<div class="tb16" role="img" aria-label="${esc(label)}: ${t.in}% in range 70 to 180, ${t.lo}% below 70, ${t.hi}% above 180"><span class="lo" style="flex-grow:${t.lo}"></span><span class="in" style="flex-grow:${t.in}"></span><span class="hi" style="flex-grow:${t.hi}"></span></div>
  <p class="tbl16"><span><i class="k16 lo"></i>Below 70: <b>${t.lo}%</b></span><span><i class="k16 in"></i>70–180: <b>${t.in}%</b></span><span><i class="k16 hi"></i>Above 180: <b>${t.hi}%</b></span></p>`; }
function postStats16(days) { const since = Date.now() - days * DAY16; const M = meals15().filter(m => m.ts >= since).map(m => Object.assign(m, { P: mealWin16(m.ts), c: curve15(m.ts) })).filter(m => m.P);
  const all = [].concat(...M.map(m => m.P)), by = {}; M.forEach(m => { const b = by[m.meal] = by[m.meal] || { P: [], R: [], n: 0 }; b.n++; b.P.push(...m.P); if (m.c) b.R.push(m.c.rise); });
  return { M, t: tir16(all), by }; }

/* ---------- Clarity import ---------- */
async function import16(f) { const msg = $('#cgmmsg'); const say = t => { if (msg) msg.textContent = t; };
  if (!f) return; if (!/\.(csv|txt)$/i.test(f.name) && !/csv|text/.test(f.type || '')) return say(`"${f.name}" isn't a CSV file. Export a CSV from Dexcom Clarity and try again.`);
  say('Reading ' + f.name + '…');
  try { const before = (cgm11() && cgm11().src === 'clarity') ? cgm11().pts.length : 0; const { pts, lowhi } = parseClarity11(await f.text()); const n = mergeCGM11(pts, 'clarity');
    const matched = meals15().filter(m => m.ts >= pts[0][0] && m.ts <= pts[pts.length - 1][0] && mealWin16(m.ts)).length;
    store.set('cgmMeta', { file: f.name, at: Date.now(), n: pts.length, added: Math.max(0, n - before), from: pts[0][0], to: pts[pts.length - 1][0], lowhi, matched });
    viewGlucose16(); const m2 = $('#cgmmsg'); if (m2) m2.textContent = `Imported ${pts.length.toLocaleString()} readings from ${f.name}. ${matched} logged meal${matched === 1 ? '' : 's'} matched.`; toast('Clarity data imported');
  } catch (e) { say(e.message); } }

function viewGlucose16() { document.title = 'Glucose — Lumi'; const c = cgm11(), meta = store.get('cgmMeta', null);
  const newest = c && c.pts.length ? c.pts[c.pts.length - 1][0] : 0, age = newest ? Math.floor((Date.now() - newest) / DAY16) : 0;
  const L = meals15(), inR = c && c.pts.length ? L.filter(m => m.ts >= c.pts[0][0] && m.ts <= newest) : [], hit = inR.filter(m => mealWin16(m.ts));
  const S = c ? postStats16(14) : null, order = ['breakfast', 'lunch', 'dinner', 'snack'];
  app.innerHTML = `<section class="pg11 g16"><header class="ph11"><span class="phi11">${ic11('drop', 26)}</span><div><h1>Glucose</h1><p class="lead">Bring in your Dexcom Clarity export and Lumi lines it up with the meals you log. Nothing is estimated or made up.</p></div></header>
  ${srcNote16(c)}
  <div class="card dz16" id="dz16"><input type="file" id="cgmf16" class="vh16" accept=".csv,text/csv,text/comma-separated-values,text/plain,application/vnd.ms-excel">
   <label for="cgmf16" class="dzl16">${ic11('drop', 30)}<b>${c && c.src === 'clarity' ? 'Add a newer Clarity CSV' : 'Import your Clarity CSV'}</b><span>Drop the file here, or tap to choose it. On iPhone it's usually in Files › Downloads.</span></label>
   <p class="small" id="cgmmsg" role="status" aria-live="polite"></p></div>
  ${c ? `<div class="card"><h2>Your data</h2><dl class="kv16"><div><dt>Readings</dt><dd>${c.pts.length.toLocaleString()}</dd></div><div><dt>Covers</dt><dd>${c.pts.length ? dt15(c.pts[0][0]) + ' – ' + dt15(newest) : '—'}</dd></div>
    <div><dt>Meals matched</dt><dd>${hit.length} of ${inR.length}</dd></div><div><dt>Last import</dt><dd>${meta && c.src === 'clarity' ? `${esc(meta.file)}<br><small>${new Date(meta.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${meta.added != null ? ` · ${meta.added.toLocaleString()} new` : ''}</small>` : c.src === 'sample' ? 'Sample data' : dt15(c.imported)}</dd></div></dl>
    ${age >= 2 ? `<p class="note warn16" role="note">Your newest reading is ${age} days old. Export again from Clarity to cover recent meals.</p>` : ''}
    <div class="actions"><a class="btn pri" href="#/review">Meals and glucose</a><a class="btn" href="#/today">Today</a><button class="btn" id="cgmdel">Remove glucose data</button></div></div>` : ''}
  ${S && S.t ? `<div class="card"><h2>Time in range after meals</h2><p class="xs">All readings in the 3 hours after ${S.M.length} logged meal${S.M.length > 1 ? 's' : ''} in the last 14 days.</p>${tirBar16(S.t, 'After meals')}
    <table class="pt15 bm16"><caption class="vh16">Time in range by meal</caption><thead><tr><th scope="col">Meal</th><th scope="col">Meals</th><th scope="col">In range</th><th scope="col">Avg rise</th></tr></thead><tbody>
    ${order.filter(k => S.by[k]).map(k => { const b = S.by[k], t = tir16(b.P), r = b.R.length ? Math.round(b.R.reduce((a, x) => a + x, 0) / b.R.length) : null; return `<tr><th scope="row">${esc(MEAL_L[k])}</th><td>${b.n}</td><td>${t.in}%</td><td>${r == null ? '—' : (r >= 0 ? '+' : '') + r}</td></tr>`; }).join('')}</tbody></table>
    <p class="xs">Range 70–180 mg/dL. Rise = peak minus the reading at the meal. Descriptive only, not dosing advice.</p></div>` : c ? `<div class="card"><h2>Time in range after meals</h2><p class="small">Not enough data yet: no meal logged in the last 14 days has at least 90 minutes of readings after it.</p></div>` : ''}
  <div class="card"><h2>How to export from Clarity</h2><ol class="steps11"><li>Open <a class="lnk" href="https://clarity.dexcom.com" target="_blank" rel="noopener">clarity.dexcom.com</a> in Safari or on a computer and sign in.</li><li>Pick a date range (14 days works well), then choose <b>Export</b> to download the CSV.</li><li>Come back here and drop or choose the file. On iPhone, Safari saves it to Files › Downloads.</li></ol>
   <p class="xs">You can re-import any time: Lumi merges files, skips duplicate readings and keeps the last 120 days on this device only.</p></div>
  <p class="foot">Readings as recorded; Low/High values are skipped. Informational only. Make treatment decisions with your Dexcom app and your care team.</p></section>`;
  $('#cgmf16').onchange = e => import16(e.target.files[0]);
  const dz = $('#dz16'); ['dragenter', 'dragover'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(t => dz.addEventListener(t, () => dz.classList.remove('on'))); dz.addEventListener('drop', e => { e.preventDefault(); import16(e.dataTransfer.files[0]); });
  const d = $('#cgmdel'); if (d) d.onclick = () => { if (confirm('Remove all glucose readings from this device?')) { store.set('cgm', null); store.set('cgmMeta', null); viewGlucose16(); } };
}
viewGlucose11 = viewGlucose16;
/* drop a CSV anywhere in the app (not just on the glucose page) */
addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (!f || e.defaultPrevented) return; e.preventDefault(); if (/\.csv$/i.test(f.name)) { if (!/^#\/glucose/.test(location.hash)) location.hash = '#/glucose'; setTimeout(() => import16(f), 60); } });

/* ---------- daily summary + insights ---------- */
function dayEntries16(k) { const a = dstart16(k), b = a + DAY16 + 36e5 * 2; return LOG.all().filter(e => e.ts >= a && dkey16(e.ts) === k).sort((x, y) => x.ts - y.ts); }
function viewToday16(arg) { const today = dkey16(Date.now()), k = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : today; const isT = k === today;
  const label = isT ? 'Today' : new Date(dstart16(k)).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }); document.title = label + ' — Lumi';
  const E = dayEntries16(k), t = totals(E), st = settings(), c = cgm11();
  const prev = dkey16(dstart16(k) - DAY16 / 2), next = dkey16(dstart16(k) + DAY16 * 1.5);
  const byM = {}; E.forEach(e => { (byM[e.meal] = byM[e.meal] || []).push(e); });
  const order = ['breakfast', 'lunch', 'dinner', 'snack'].filter(m => byM[m]);
  const mt = m => totals(byM[m]);
  /* 7 previous days with logs */
  const P7 = []; for (let i = 1; i <= 7; i++) { const kk = dkey16(dstart16(k) - DAY16 * i + 36e5 * 12), es = dayEntries16(kk); if (es.length) P7.push(totals(es)); }
  const avg = f => P7.length ? P7.reduce((a, x) => a + (x[f] || 0), 0) / P7.length : null;
  /* glucose for the day */
  const a = dstart16(k), G = c ? c.pts.filter(p => p[0] >= a && p[0] < a + DAY16) : [], gt = G.length >= 36 ? tir16(G) : null;
  const MM = meals15().filter(m => dkey16(m.ts) === k).map(m => Object.assign(m, { c: curve15(m.ts) })).reverse();
  /* insights: each one is a plain fact computed from the user's own log/readings */
  const I = [];
  if (E.length) { const big = order.map(m => [m, mt(m).carbs]).sort((x, y) => y[1] - x[1])[0]; if (order.length > 1 && t.carbs > 0) I.push(['🍽️', `${MEAL_L[big[0]]} was your biggest carb meal: ${Math.round(big[1])} g, ${pct16(big[1], t.carbs)}% of the day.`]); }
  if (E.length && P7.length >= 3) { const av = avg('carbs'), d = Math.round((t.carbs - av) / (av || 1) * 100); if (av > 0) I.push(['📊', Math.abs(d) < 10 ? `Carbs are close to your recent average (${Math.round(av)} g a day over ${P7.length} logged days).` : `Carbs are ${Math.abs(d)}% ${d > 0 ? 'above' : 'below'} your recent average of ${Math.round(av)} g a day (${P7.length} logged days).`]); }
  order.forEach(m => { const x = mt(m); if ((x.fat || 0) >= 25 || (x.protein || 0) >= 40) I.push(['⏳', `${MEAL_L[m]} was high in fat or protein (${Math.round(x.fat || 0)} g fat, ${Math.round(x.protein || 0)} g protein). Meals like this can raise glucose later, beyond 3 hours.`]); });
  if (E.length && t.carbs >= 30 && (t.fiber || 0) < 10) I.push(['🌾', `Fiber is ${r1(t.fiber || 0)} g so far. Higher-fiber choices tend to slow carb absorption.`]);
  const withC = MM.filter(m => m.c); if (withC.length) { const hi = withC.slice().sort((x, y) => y.c.rise - x.c.rise)[0]; I.push(['📈', `Largest rise after a meal: ${MEAL_L[hi.meal] || 'Meal'} at ${new Date(hi.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}, ${hi.c.rise >= 0 ? '+' : ''}${hi.c.rise} mg/dL (peak ${hi.c.peak} at ${hi.c.ttp} min).`]); }
  if (gt) I.push(['🎯', `${gt.in}% of readings were 70–180 mg/dL (${gt.n} readings, average ${gt.mean}).`]);
  let streak = 0; for (let i = 0; i < 60; i++) { if (dayEntries16(dkey16(Date.now() - DAY16 * i)).length) streak++; else if (i) break; } if (isT && streak >= 3) I.push(['🔥', `You've logged food ${streak} days in a row.`]);
  const ring = st.target ? `<p class="small">Carb target ${st.target} g: <b>${Math.round(t.carbs)} g</b> logged (${pct16(t.carbs, st.target)}%).</p>` : '';
  app.innerHTML = `<section class="pg13 td16p"><nav class="dn16" aria-label="Choose day"><a class="btn sm" href="#/today/${prev}" aria-label="Previous day">‹</a><h1>${esc(label)}</h1>${isT ? '<span class="sp16"></span>' : `<a class="btn sm" href="#/today/${next === today ? '' : next}" aria-label="Next day">›</a>`}</nav>
  <p class="lead74">Your day at a glance, from what you logged${c ? ' and your imported glucose' : ''}. Descriptive only, not dosing advice.</p>${srcNote16(c && G.length ? c : null)}
  ${!E.length ? `<div class="card"><p class="small">Nothing logged ${isT ? 'yet today' : 'on this day'}.</p>${isT ? '<div class="actions"><a class="btn pri" href="#/quick">Quick log</a><a class="btn" href="#/">Search foods</a></div>' : ''}</div>` : `
  <div class="card"><h2>Totals</h2><div class="tt16">${['carbs', 'sugars', 'protein', 'fat', 'fiber', 'kcal'].map(f => `<div><small>${NL[f]}</small><b>${fmtN(f, t[f])}</b>${P7.length >= 3 && f !== 'fiber' ? `<span class="xs">avg ${fmtN(f, avg(f))}</span>` : ''}</div>`).join('')}</div>${ring}</div>
  <div class="card"><h2>Meals</h2><ul class="ml16">${order.map(m => { const x = mt(m), share = pct16(x.carbs, t.carbs); return `<li><div class="mh16"><b>${esc(MEAL_L[m])}</b><span>${Math.round(x.carbs)} g carbs</span></div><div class="mb16" aria-hidden="true"><span style="width:${share}%"></span></div><small>${esc(byM[m].map(e => e.name).join(', '))}</small></li>`; }).join('')}</ul></div>`}
  ${I.length ? `<div class="card"><h2>Insights</h2><ul class="in16">${I.map(([i, s]) => `<li><span aria-hidden="true">${i}</span><span>${esc(s)}</span></li>`).join('')}</ul></div>` : ''}
  ${gt ? `<div class="card"><h2>Glucose ${isT ? 'today' : 'this day'}</h2>${tirBar16(gt, 'This day')}${MM.length ? `<ul class="mr15">${MM.map(m => m.c ? `<li><div><b>${esc(MEAL_L[m.meal] || 'Meal')} · ${new Date(m.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</b><span class="xs">Start ${m.c.start} · peak ${m.c.peak} at ${m.c.ttp} min · rise ${m.c.rise >= 0 ? '+' : ''}${m.c.rise}</span></div>${spark15(m.c, m.ts)}</li>` : '').join('')}</ul>` : ''}</div>`
    : `<div class="card"><p class="small">${c ? 'No imported glucose readings cover this day.' : 'No glucose data on this device.'} <a class="lnk" href="#/glucose">${c ? 'Import a newer Clarity CSV' : 'Import a Clarity CSV'}</a> to see time in range and rises after meals.</p></div>`}
  <div class="actions"><a class="btn" href="#/log">Open log</a><a class="btn" href="#/log/week">Week</a><a class="btn" href="#/review">Meals and glucose</a></div>
  <p class="foot">Informational only, not medical advice. Lumi gives no dosing advice.</p></section>`; }

/* ---------- search: query synonyms (typos are already handled by the engine) ---------- */
const QSYN16 = { frys: 'fries', fry: 'fries', fryes: 'fries', ff: 'french fries', oj: 'orange juice', gf: 'gluten free', pbj: 'pb&j', hotdog: 'hot dog', hotdogs: 'hot dogs', icecream: 'ice cream', nuggs: 'nuggets', sammich: 'sandwich', sammy: 'sandwich', bfast: 'breakfast', brekky: 'breakfast', choc: 'chocolate', mozz: 'mozzarella', parm: 'parmesan', cuke: 'cucumber', avo: 'avocado', zoodles: 'zucchini noodles', 'pop': 'soda', 'doughnut': 'donut', doughnuts: 'donuts', catsup: 'ketchup', 'keto': 'keto', lowcarb: 'low carb', 'sugarfree': 'sugar free', 'sf': 'sugar free', 'pb': 'peanut butter', tortilla: 'tortilla', fritos: 'fritos', 'mac&cheese': 'mac and cheese', macncheese: 'mac n cheese', 'shake': 'shake', 'cuppa': 'tea' };
function qsyn16(q) { const w = String(q).trim().split(/\s+/);
  return w.map((x, i) => { const k = x.toLowerCase(); if (k === 'fry' && i > 0 && /stir/i.test(w[i - 1])) return x; if (k === 'pop' && w.length > 1) return x; const s = QSYN16[k]; return s && s !== k ? s : x; }).join(' '); }
{ const rq = runQuery; runQuery = function (q, typing) { const q2 = qsyn16(q); const r = rq.call(this, q2, typing); if (q2 !== q && !typing) { document.title = `${q} — Lumi`; setTimeout(() => { const res = $('#res'); if (res && !$('.syn16')) res.insertAdjacentHTML('beforebegin', `<p class="syn16 small" role="status">Showing results for <b>${esc(q2)}</b></p>`); }, 50); } return r; }; }

/* ---------- home: Today strip ---------- */
function todayStrip16() { const E = dayEntries16(dkey16(Date.now())), t = totals(E), c = cgm11(), meta = store.get('cgmMeta', null), st = settings();
  const newest = c && c.pts.length ? c.pts[c.pts.length - 1][0] : 0, age = newest ? Math.floor((Date.now() - newest) / DAY16) : null;
  const meals = new Set(E.map(e => e.meal)).size;
  const g = !c ? 'Import Clarity CSV' : c.src === 'sample' ? 'Sample glucose' : age === 0 ? 'Glucose current' : `Glucose ${age} d old`;
  return `<a class="card td16" href="#/today"><span class="td16a"><small>Today</small><b>${E.length ? Math.round(t.carbs) + ' g carbs' : 'Nothing logged yet'}</b><span class="xs">${E.length ? `${meals} meal${meals > 1 ? 's' : ''} · ${Math.round(t.carbs || 0)} g carbs${st.target ? ` · ${pct16(t.carbs, st.target)}% of target` : ''}` : 'Log a meal to see insights'}</span></span>
   <span class="td16g"><small>${esc(g)}</small><b>Insights ›</b></span></a>`; }
function home16() { if (app.querySelector('.td16')) return; const lg = app.querySelector('.home74 .log74'), sc = app.querySelector('.home74 .sc74');
  if (lg) lg.insertAdjacentHTML('beforeend', insightsLink16()); else if (sc) sc.insertAdjacentHTML('beforebegin', todayStrip16()); }
function insightsLink16() { const c = cgm11(), newest = c && c.pts.length ? c.pts[c.pts.length - 1][0] : 0, age = newest ? Math.floor((Date.now() - newest) / DAY16) : null;
  const g = !c ? 'No glucose imported' : c.src === 'sample' ? 'Sample glucose' : age === 0 ? 'Glucose up to date' : `Glucose ${age} day${age > 1 ? 's' : ''} old`;
  return `<a class="td16 td16l" href="#/today"><span class="xs">${esc(g)}</span><b>Today's insights ›</b></a>`; }
{ const vh = viewHome; viewHome = function () { const r = vh.apply(this, arguments); try { home16(); } catch (e) { console.warn(e); } return r; }; }

/* ---------- More hub: daily summary row ---------- */
{ const vs = viewSettings; viewSettings = function () { const r = vs.apply(this, arguments); try { const hub = app.querySelector('.hub11'); if (hub && !hub.querySelector('[href="#/today"]')) hub.insertAdjacentHTML('afterbegin', `<li><a class="hr11" href="#/today"><span class="hic11">${ic11('drop', 20)}</span><span class="ht11"><b>Today and insights</b><small>Daily totals, meals, glucose after meals</small></span>${ic12('chev', 18)}</a></li>`); } catch (e) { console.warn(e); } return r; }; }

/* the review page links back to the Glucose page */
{ const vr = viewReview15; viewReview15 = function () { const r = vr.apply(this, arguments); const b = app.querySelector('.back13'); if (b) b.textContent = '‹ Glucose'; return r; }; }

if (/^#\/(today|insights|glucose|review|settings)\b/.test(location.hash)) route();
else if (/^#?\/?$/.test(location.hash)) { try { home16(); } catch (e) { console.warn(e); } }
