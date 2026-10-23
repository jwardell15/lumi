'use strict';
/* Lumi 18.0: photo label logging polish (best-effort OCR, confirm step, upload or camera, saves to My foods),
   Clarity meal patterns (post-meal time in range + average rise, from the user's own imported CGM data and log only). Loaded last. */

/* ---------- 1. Label photo flow ---------- */
function fillLabel18(text) { const f = document.getElementById('lbForm'); if (!f || typeof parseLabel !== 'function') return 0;
  const v = parseLabel(text); let n = 0; f.querySelectorAll('.ocr8').forEach(el => el.classList.remove('ocr8'));
  for (const [k] of LF8) if (v[k] != null && v[k] !== '' && f.elements[k]) { f.elements[k].value = v[k]; f.elements[k].classList.add('ocr8'); n++; }
  if (v.liquid && f.elements.liquid) f.elements.liquid.checked = true;
  const st = document.getElementById('lbStat'); if (st) st.textContent = n ? `Read ${n} value${n > 1 ? 's' : ''}. Highlighted fields came from the photo. Please check every one against the label.` : "Couldn't read the label. Try a sharper, straight-on photo, or type the values.";
  const cf = document.getElementById('lbOk18'); if (cf) cf.checked = false; return n; }
self.fillLabel18 = fillLabel18; // test hook: fill the form from OCR text without a file picker
(function () { if (typeof viewLabel !== 'function') return; const v0 = viewLabel;
  viewLabel = function (code) { v0(code); const card = document.querySelector('#lbFile') && document.querySelector('#lbFile').closest('.card'); const f = document.getElementById('lbForm'); if (!card || !f) return;
    document.querySelector('h1').insertAdjacentHTML('afterend', '<p class="be18" role="note"><b>Best effort.</b> Reading a photo can mix up numbers (for example 8 and 3, or 0 and 6). Nothing is saved until you check the numbers and confirm.</p>');
    const lb = card.querySelector('label[for="lbFile"]'); lb.textContent = '📷 Take a photo';
    lb.insertAdjacentHTML('afterend', ' <label class="btn" for="lbFile2">🖼 Upload a photo</label><input id="lbFile2" type="file" accept="image/*" hidden>');
    const inp = document.getElementById('lbFile'), inp2 = document.getElementById('lbFile2'); inp2.onchange = e => inp.onchange(e);
    const act = f.querySelector('.actions'); act.insertAdjacentHTML('beforebegin', '<label class="tg8 ok18"><input type="checkbox" id="lbOk18" required> <b>I checked these numbers against the label</b></label>');
    f.querySelector('.actions .btn.pri').textContent = 'Save to My foods';
    const sub = f.onsubmit; f.onsubmit = e => { if (!document.getElementById('lbOk18').checked) { e.preventDefault(); toast('Please check the numbers first'); return; } sub(e); try { toast('Saved to My foods (custom)'); } catch {} };
  };
})();

/* ---------- 2. Meal patterns from Clarity CSV + log ---------- */
const LO18 = 70, HI18 = 180, MIN18 = 3;
function mealEvents18(log, pts) {
  const groups = new Map(); for (const e of log) { if (!e || !e.ts) continue; const k = dkey16(e.ts) + '|' + (e.meal || 'snack'); const g = groups.get(k) || { ts: e.ts, meal: e.meal, items: [] }; g.ts = Math.min(g.ts, e.ts); g.items.push(e); groups.set(k, g); }
  const ev = [...groups.values()].sort((a, b) => a.ts - b.ts); const out = [];
  ev.forEach((m, i) => { const nxt = ev[i + 1]; const overlap = nxt && nxt.ts - m.ts < 3 * 36e5;
    const lo = bs18(pts, m.ts - 20 * 6e4), hi = bs18(pts, m.ts + 3 * 36e5 + 1); const W = pts.slice(lo, hi); const pre = W.filter(p => p[0] <= m.ts + 5 * 6e4), post = W.filter(p => p[0] >= m.ts);
    if (!pre.length || post.length < 24 || post[post.length - 1][0] < m.ts + 150 * 6e4) return; // need ~2.5 h of readings after the meal and a starting value
    const base = pre[pre.length - 1][1], peak = Math.max(...post.map(p => p[1])), tir = Math.round(100 * post.filter(p => p[1] >= LO18 && p[1] <= HI18).length / post.length);
    const carbs = m.items.reduce((s, e) => s + ((e.n && e.n.carbs) || 0) * (e.grams || 0) / 100, 0);
    out.push({ ts: m.ts, meal: m.meal, items: m.items, base, peak, rise: peak - base, tir, carbs: Math.round(carbs), overlap: !!overlap }); });
  return out; }
function bs18(a, t) { let l = 0, h = a.length; while (l < h) { const m = (l + h) >> 1; if (a[m][0] < t) l = m + 1; else h = m; } return l; }
function agg18(evs) { const foods = new Map(), meals = new Map();
  for (const m of evs) { if (m.overlap) continue; const seen = new Set();
    for (const e of m.items) { const k = (e.pid || e.name || '').toString(); if (!k || seen.has(k)) continue; seen.add(k); const f = foods.get(k) || { name: e.name, brand: e.brand, pid: e.pid, ev: [] }; f.ev.push(m); foods.set(k, f); }
    const mk = [...new Set(m.items.map(e => e.name))].sort().join(' + '); if (m.items.length > 1) { const g = meals.get(mk) || { name: mk, ev: [] }; g.ev.push(m); meals.set(mk, g); } }
  const fin = x => { const n = x.ev.length, rise = Math.round(x.ev.reduce((s, m) => s + m.rise, 0) / n), tir = Math.round(x.ev.reduce((s, m) => s + m.tir, 0) / n); return Object.assign(x, { n, rise, tir, tag: tir >= 80 && rise < 50 ? 'in' : (rise >= 60 || tir < 60) ? 'spike' : 'mid' }); };
  return { foods: [...foods.values()].map(fin), meals: [...meals.values()].map(fin) }; }
function sample18() { /* clearly-labelled illustration: fixed numbers, never saved, never mixed with real data */
  return [['Greek yogurt + berries', 6, 32, 88], ['Eggs + toast', 5, 41, 84], ['Oatmeal with banana', 4, 78, 55], ['Pasta with marinara', 5, 92, 48], ['Chicken salad', 7, 18, 96], ['Bagel with cream cheese', 3, 85, 51]]
    .map(([name, n, rise, tir]) => ({ name, n, rise, tir, tag: tir >= 80 && rise < 50 ? 'in' : (rise >= 60 || tir < 60) ? 'spike' : 'mid' })); }
function row18(x, sample) { const nm = x.pid && !sample ? `<a class="lnk" href="#/product/${esc(x.pid)}">${esc(x.name)}</a>` : esc(x.name);
  return `<tr><th scope="row">${nm}${x.brand ? `<div class="small">${esc(x.brand)}</div>` : ''}</th><td>${x.n}</td><td>${x.tir}%</td><td>${x.rise > 0 ? '+' : ''}${x.rise} mg/dL</td><td><span class="pt18 ${x.tag}">${x.tag === 'in' ? 'Mostly in range' : x.tag === 'spike' ? 'Tends to spike' : 'Mixed'}</span></td></tr>`; }
function table18(list, sample) { return list.length ? `<div class="tw18"><table class="t18"><caption class="sr-only">Post-meal glucose patterns</caption><thead><tr><th scope="col">Food</th><th scope="col">Meals</th><th scope="col">Time in range, 3 h after</th><th scope="col">Avg rise</th><th scope="col">Pattern</th></tr></thead><tbody>${list.map(x => row18(x, sample)).join('')}</tbody></table></div>` : '<p class="small">Not enough repeats yet.</p>'; }
function viewPatterns18(arg) { document.title = 'Meal patterns — Lumi';
  const c0 = typeof cgm11 === 'function' ? cgm11() : null, c = c0 && c0.src === 'clarity' ? c0 : null /* only the user's own Clarity CSV, never simulated readings */, pts = c && c.pts ? c.pts : [], log = LOG.all(); const showSample = arg === 'sample';
  const evs = pts.length ? mealEvents18(log, pts) : []; const A = agg18(evs); const minN = +(store.get('pt18min', MIN18)) || MIN18;
  const F = A.foods.filter(x => x.n >= minN).sort((a, b) => a.rise - b.rise), M = A.meals.filter(x => x.n >= minN).sort((a, b) => a.rise - b.rise);
  const head = `<section class="pg13 pt18p"><h1>Meal patterns</h1><p class="lead">How your glucose tended to move in the 3 hours after foods you logged, from your Dexcom Clarity export. <b>These are patterns, not advice.</b> Insulin timing and dose, activity, stress, illness and what you ate earlier all change the result. Talk to your care team before changing anything.</p>`;
  const how = `<details class="card"><summary><b>How this is worked out</b></summary><ul class="small"><li>A meal is all foods you logged for the same meal on the same day; it starts at the earliest entry.</li><li>Uses Clarity readings from the meal start to 3 hours after. Meals without at least 2.5 hours of readings are skipped.</li><li>Meals followed by another meal within 3 hours are left out, because the two overlap.</li><li><b>Time in range</b> is the share of readings from ${LO18} to ${HI18} mg/dL. <b>Avg rise</b> is the highest reading minus the reading at the start.</li><li>"Mostly in range" means 80% or more in range and an average rise under 50. "Tends to spike" means a rise of 60 or more, or under 60% in range.</li><li>Nothing is estimated or filled in. Foods need at least ${minN} separate meals to show here.</li></ul></details>`;
  if (showSample || !pts.length || !F.length && !M.length) {
    const why = !pts.length ? 'You haven\'t imported a Dexcom Clarity CSV yet.' : !evs.length ? 'None of your logged meals line up with your Clarity readings yet (Lumi needs about 2.5 hours of readings after a logged meal).' : `Your foods don't have ${minN} or more separate meals with readings yet (${evs.filter(e => !e.overlap).length} usable meal${evs.length === 1 ? '' : 's'} so far).`;
    app.innerHTML = head + `<div class="card"><h2>${showSample ? 'Sample view' : 'Not enough data yet'}</h2><p>${esc(why)}</p><div class="actions"><a class="btn pri" href="#/glucose">Import a Clarity CSV</a><a class="btn" href="#/log">Open the log</a></div></div>
      <div class="card sample18" aria-label="Sample data, not yours"><div class="smp18" role="note">SAMPLE DATA: made-up numbers to show the layout. Not your readings.</div>${table18(sample18(), true)}</div>${how}</section>`; return; }
  const ins = F.filter(x => x.tag === 'in').slice(0, 5), sp = F.filter(x => x.tag === 'spike').sort((a, b) => b.rise - a.rise).slice(0, 5);
  app.innerHTML = head + `<p class="small">Based on ${evs.filter(e => !e.overlap).length} meals with readings (${evs.filter(e => e.overlap).length} skipped for overlap), from your Clarity import of ${new Date(c.imported).toLocaleDateString()}.</p>
    <div class="g18"><div class="card"><h2>Tended to stay in range</h2>${ins.length ? `<ul class="l18">${ins.map(x => `<li><b>${esc(x.name)}</b> <span class="small">${x.tir}% in range · +${x.rise} · ${x.n} meals</span></li>`).join('')}</ul>` : '<p class="small">None yet.</p>'}</div>
    <div class="card"><h2>Tended to spike</h2>${sp.length ? `<ul class="l18">${sp.map(x => `<li><b>${esc(x.name)}</b> <span class="small">+${x.rise} avg · ${x.tir}% in range · ${x.n} meals</span></li>`).join('')}</ul>` : '<p class="small">None yet.</p>'}</div></div>
    <div class="card"><div class="fx-h"><h2>All foods</h2><label class="small">Minimum meals <select id="pt18m">${[2, 3, 4, 5].map(n => `<option${n === minN ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>${table18(F)}</div>
    ${M.length ? `<div class="card"><h2>Repeated meals</h2>${table18(M)}</div>` : ''}${how}</section>`;
  const sel = document.getElementById('pt18m'); if (sel) sel.onchange = () => { store.set('pt18min', +sel.value); viewPatterns18(); };
}
self.viewPatterns18 = viewPatterns18;
/* links from Today and Glucose */
(function () { const link = '<a class="card pl18" href="#/patterns"><b>📈 Meal patterns</b><span class="small">Which foods tended to keep you in range or spike, from your Clarity CSV and log. Patterns, not advice.</span></a>';
  if (typeof viewToday16 === 'function') { const t0 = viewToday16; viewToday16 = function (a) { const r = t0(a); setTimeout(() => { const s = app.querySelector('section, .pg13') || app; if (!document.querySelector('.pl18') && location.hash.startsWith('#/today')) s.insertAdjacentHTML('beforeend', link); }, 0); return r; }; self.viewToday16 = viewToday16; }
  if (typeof viewGlucose11 === 'function') { const g0 = viewGlucose11; viewGlucose11 = function (a) { const r = g0(a); if (!document.querySelector('.pl18')) app.insertAdjacentHTML('beforeend', link); return r; }; }
})();
