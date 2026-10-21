'use strict';
/* Lumi v4: settings, portion helper, food log, custom foods, saved meals, onboarding. All data stays in localStorage. */
const NK = ['carbs', 'net', 'sugars', 'fiber', 'protein', 'fat', 'kcal'];
const NL = { carbs: 'Carbs', net: 'Net carbs', sugars: 'Sugar', fiber: 'Fiber', protein: 'Protein', fat: 'Fat', kcal: 'Calories' };
const settings = () => Object.assign({ target: null, icr: null, icrBasis: 'total', onboarded: false }, store.get('settings', {}));
const setSettings = o => store.set('settings', Object.assign(settings(), o));
const LOG = { all: () => store.get('log', []), save: l => store.set('log', l) };
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_L = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };
/* v12: breakfast 5:00–10:59, lunch 11:00–14:59, dinner 17:00–20:59; mid-afternoon, late evening and overnight default to snack (always changeable) */
const mealFor = d => { const h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 11 ? 'breakfast' : h >= 11 && h < 15 ? 'lunch' : h >= 17 && h < 21 ? 'dinner' : 'snack'; };
const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const fmtN = (k, v) => v == null ? '—' : k === 'kcal' ? Math.round(v) : r1(v) + (k === 'kcal' ? '' : 'g');

/* per-100 snapshot for a product (net carbs computed once) */
function per100(p) { const s = S.score(p); const n = p.n || {}; return { carbs: n.carbs, net: s.net, sugars: n.sugars, added: n.added, fiber: n.fiber, protein: n.protein, fat: n.fat, kcal: n.kcal, sat: n.sat, sodiumMg: n.sodiumMg }; }
const scale = (n100, g) => Object.fromEntries(Object.entries(n100).map(([k, v]) => [k, v == null ? null : v * g / 100]));
function portionOptions(p) {
  const o = [], seen = new Set(), add = (label, g) => { if (!g || seen.has(label)) return; seen.add(label); o.push([label, g]); };
  if (p.meta && p.meta.perItem) return [['1 item', 100]];
  (p.portions || []).forEach(([l, g]) => add(l + ` (${r1(g)} g)`, g));
  if (p.servQ && !(p.portions || []).length) add(`Label serving${p.serv ? ': ' + p.serv : ''} (${r1(p.servQ)} ${p.liquid ? 'ml' : 'g'})`, p.servQ);
  add(`100 ${p.liquid ? 'ml' : 'g'}`, 100); add(`1 ${p.liquid ? 'ml' : 'g'}`, 1);
  if (!p.liquid) { add('1 oz (28.35 g)', 28.35); } else { add('1 fl oz (29.6 ml)', 29.57); add('1 cup (240 ml)', 240); }
  return o;
}
function speedNote(t) {
  const c = t.carbs || 0, fat = t.fat || 0, pr = t.protein || 0;
  if (c < 5) return { cls: 'gd', txt: 'Very few carbs in this portion.' };
  const fp = fat * 9 + pr * 4, ratio = fp / (c * 4), sugarShare = c ? (t.sugars || 0) / c : 0;
  if (fat >= 20 || ratio > 1.2) return { cls: 'pr', txt: `Fat/protein heavy (${r1(fat)} g fat, ${r1(pr)} g protein): expect a slower, later and longer rise.` };
  if (ratio < 0.5 && (sugarShare > 0.4 || c > 30)) return { cls: 'bd', txt: 'Mostly fast carbs with little fat or protein: expect a quick rise.' };
  return { cls: 'gd', txt: 'Mixed carbs, fat and protein: moderate rise.' };
}
function portionCard(p) {
  const opts = portionOptions(p), perItem = p.meta && p.meta.perItem; const def = opts[0];
  return `<div class="card" id="portion"><h2>Carbs for your portion</h2>
    <div class="por-row"><select id="porSel" aria-label="Portion">${opts.map(([l, g], i) => `<option value="${g}">${esc(l)}</option>`).join('')}</select>
    <div class="qty"><button type="button" data-q="-1" aria-label="Less">−</button><input id="porQty" type="number" inputmode="decimal" min="0" step="0.25" value="1" aria-label="Number of portions"><button type="button" data-q="1" aria-label="More">+</button></div></div>
    <label class="slab2"><span>How much I ate</span><b id="porG"></b></label>
    <input id="porSlider" type="range" min="0" max="${Math.round(Math.max(def[1] * 4, perItem ? 400 : 500))}" step="${perItem ? 25 : 1}" value="${def[1]}" aria-label="Amount eaten">
    <div class="por-grid" id="porGrid"></div><div class="note" id="porSpeed"></div><div id="porIcr"></div>
    <div class="actions"><button class="btn pri" id="addLog">＋ Add to log</button><button class="btn" id="addPlate">🍽 Add to plate</button></div></div>`;
}
function bindPortion(p) {
  const n100 = per100(p), perItem = p.meta && p.meta.perItem, unit = perItem ? 'item' : p.liquid ? 'ml' : 'g';
  const sel = $('#porSel'), qty = $('#porQty'), sl = $('#porSlider'); let grams = +sel.value;
  const render = () => {
    const t = scale(n100, grams);
    $('#porG').textContent = perItem ? `${r1(grams / 100)} item${grams === 100 ? '' : 's'}` : `${r1(grams)} ${unit}`;
    $('#porGrid').innerHTML = NK.map(k => `<div class="fact${k === 'carbs' || k === 'net' ? ' key' : ''}"><small>${NL[k]}</small><b>${fmtN(k, t[k])}</b></div>`).join('');
    const sp = speedNote(t); const el = $('#porSpeed'); el.className = 'note sp-' + sp.cls; el.textContent = sp.txt;
    const st = settings();
    if (st.icr > 0) { const base = st.icrBasis === 'net' ? t.net : t.carbs; $('#porIcr').innerHTML = base == null ? '' : `<div class="icr"><b>${r1(base)} g ${st.icrBasis === 'net' ? 'net' : 'total'} carbs ÷ your 1:${r1(st.icr)} ratio = ${r1(base / st.icr)} units</b><small>Estimate only, confirm on your pump.</small></div>`; }
    else $('#porIcr').innerHTML = '';
    if (+sl.value !== Math.round(grams)) sl.value = Math.min(grams, +sl.max);
  };
  sel.onchange = () => { grams = +sel.value * (+qty.value || 0); render(); };
  qty.oninput = () => { grams = +sel.value * (+qty.value || 0); render(); };
  document.querySelectorAll('.qty button').forEach(b => b.onclick = () => { qty.value = Math.max(0, Math.round(((+qty.value || 0) + 0.25 * +b.dataset.q) * 100) / 100); qty.oninput(); });
  sl.oninput = () => { grams = +sl.value; qty.value = Math.round(grams / +sel.value * 100) / 100; render(); };
  $('#addLog').onclick = () => openAddSheet(p, grams, perItem ? `${r1(grams / 100)} item` : `${r1(grams)} ${unit}`);
  if ($('#addPlate')) $('#addPlate').onclick = () => addToPlate(p, grams, perItem ? `${r1(grams / 100)} item` : `${r1(grams)} ${unit}`);
  render();
}
/* ---------- add-to-log sheet ---------- */
function sheet(html) { let el = $('#sheet'); if (!el) { el = document.createElement('div'); el.id = 'sheet'; document.body.appendChild(el); } el.className = 'sheet on'; el.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet-card" role="dialog" aria-modal="true">${html}</div>`; el.querySelectorAll('[data-close]').forEach(x => x.onclick = closeSheet); return el; }
function closeSheet() { const el = $('#sheet'); if (el) { el.className = 'sheet'; el.innerHTML = ''; } }
const localDT = d => { const x = new Date(d - new Date().getTimezoneOffset() * 6e4); return x.toISOString().slice(0, 16); };
function openAddSheet(p, grams, label) {
  const now = new Date(), t = scale(per100(p), grams);
  sheet(`<h2>Add to log</h2><div class="small" style="margin-bottom:10px">${esc(p.name)} · ${esc(label)} · <b>${fmtN('carbs', t.carbs)} carbs</b></div>
    <div class="seg wide" id="mealSeg">${MEALS.map(m => `<button type="button" data-m="${m}" class="${m === mealFor(now) ? 'on' : ''}">${MEAL_L[m]}</button>`).join('')}</div>
    <label class="field"><span>Time</span><input type="datetime-local" id="logTime" value="${localDT(now)}"></label>
    <div class="actions"><button class="btn" data-close>Cancel</button><button class="btn pri" id="logOk">Add</button></div>`);
  let meal = mealFor(now);
  document.querySelectorAll('#mealSeg button').forEach(b => b.onclick = () => { meal = b.dataset.m; document.querySelectorAll('#mealSeg button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#logOk').onclick = () => { const ts = new Date($('#logTime').value).getTime() || Date.now(); addEntry(p, grams, label, meal, ts); closeSheet(); toast(`Added to ${MEAL_L[meal]}`); };
}
function addEntry(p, grams, label, meal, ts) {
  const l = LOG.all(); remember(p);
  l.push({ id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: ts || Date.now(), meal, pid: p.id, name: p.name, brand: p.brand || '', grams, label, n: per100(p), score: S.score(p).score });
  LOG.save(l);
}
/* keep a compact copy of logged products so re-add works offline and for custom/USDA items */
function remember(p) { const m = store.get('foods', {}); m[p.id] = p; const ks = Object.keys(m); if (ks.length > 400) delete m[ks[0]]; store.set('foods', m); }
const customFoods = () => store.get('custom', []);
const savedMeals = () => store.get('meals', []);
function totals(entries) { const t = Object.fromEntries(NK.map(k => [k, 0])); entries.forEach(e => { const s = scale(e.n, e.grams); NK.forEach(k => t[k] += s[k] || 0); }); return t; }
/* ---------- Today / Log view ---------- */
function ringSVG(val, target, size = 150) {
  const R = size / 2 - 12, c = 2 * Math.PI * R, frac = target ? Math.min(1, val / target) : 0, over = target && val > target;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${R}" fill="none" stroke="currentColor" stroke-opacity=".14" stroke-width="12" class="c-gd"/><circle cx="${size / 2}" cy="${size / 2}" r="${R}" fill="none" class="${over ? 'c-bd' : 'c-ex'}" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}"/></svg><div class="v"><div><b>${Math.round(val)}</b><small>${target ? `of ${target} g carbs` : 'g carbs'}</small></div></div></div>`;
}
function weekChart(endDay, target) {
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(endDay); d.setDate(d.getDate() - i); days.push(d); }
  const l = LOG.all(); const vals = days.map(d => totals(l.filter(e => dayKey(e.ts) === dayKey(d))).carbs);
  const max = Math.max(target || 0, ...vals, 50), W = 320, H = 130, bw = 30;
  return `<svg viewBox="0 0 ${W} ${H + 22}" width="100%" role="img" aria-label="Carbs per day, last 7 days">${target ? `<line x1="0" x2="${W}" y1="${H - target / max * H}" y2="${H - target / max * H}" stroke="currentColor" stroke-dasharray="4 4" class="c-pr"/>` : ''}
    ${vals.map((v, i) => { const h = v / max * H, x = 8 + i * (W - 16) / 7 + 6; return `<rect x="${x}" y="${H - h}" width="${bw}" height="${Math.max(h, 1)}" rx="6" class="${target && v > target ? 'bar-bd' : 'bar-ok'}"/><text x="${x + bw / 2}" y="${H - h - 4}" text-anchor="middle" class="ctext">${v ? Math.round(v) : ''}</text><text x="${x + bw / 2}" y="${H + 16}" text-anchor="middle" class="ctext">${days[i].toLocaleDateString(undefined, { weekday: 'short' })}</text>`; }).join('')}</svg>`;
}
function viewLog(dateArg) {
  const st = settings(); const day = dateArg ? new Date(dateArg + 'T12:00') : new Date(); const dk = dayKey(day), isToday = dk === dayKey(new Date());
  document.title = 'Log — Lumi';
  const entries = LOG.all().filter(e => dayKey(e.ts) === dk).sort((a, b) => a.ts - b.ts), t = totals(entries);
  const prev = new Date(day); prev.setDate(prev.getDate() - 1); const next = new Date(day); next.setDate(next.getDate() + 1);
  const recent = []; const seen = new Set(); LOG.all().slice().reverse().forEach(e => { if (!seen.has(e.pid) && recent.length < 8) { seen.add(e.pid); recent.push(e); } });
  app.innerHTML = `<div class="dayhead"><a class="icon" href="#/log/${dayKey(prev)}" aria-label="Previous day">‹</a><h1>${isToday ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h1>${isToday ? '<span class="icon"></span>' : `<a class="icon" href="#/log/${dayKey(next)}" aria-label="Next day">›</a>`}</div>
  <div class="card today"><div class="today-top">${ringSVG(t.carbs, st.target)}<div class="tot">${NK.filter(k => k !== 'carbs').map(k => `<div><small>${NL[k]}</small><b>${fmtN(k, t[k])}</b></div>`).join('')}</div></div>
    ${st.target ? `<div class="small" style="text-align:center;margin-top:6px">${t.carbs > st.target ? `${Math.round(t.carbs - st.target)} g over your target` : `${Math.round(st.target - t.carbs)} g carbs left of your ${st.target} g target`}</div>` : `<div class="small" style="text-align:center;margin-top:6px"><a class="lnk" href="#/settings">Set a daily carb target</a></div>`}</div>
  ${MEALS.map(m => { const es = entries.filter(e => e.meal === m), mt = totals(es); return `<div class="card meal"><div class="fx-h"><h2>${MEAL_L[m]}</h2><span class="small">${es.length ? `${Math.round(mt.carbs)} g carbs · ${Math.round(mt.kcal)} Cal` : ''}</span></div>
    ${es.length ? `<ul class="loglist">${es.map(e => { const s = scale(e.n, e.grams); return `<li><a href="#/product/${esc(e.pid)}" class="t"><b>${esc(e.name)}</b><small>${esc(e.label)} · ${new Date(e.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></a><span class="v">${fmtN('carbs', s.carbs)}</span><button class="icon sm" data-del="${e.id}" aria-label="Remove ${esc(e.name)}">✕</button></li>`; }).join('')}</ul>
      <div class="row-btns"><button class="chip" data-savemeal="${m}">Save as meal</button></div>` : `<div class="small">Nothing logged.</div>`}</div>`; }).join('')}
  <div class="card"><h2>Last 7 days</h2>${weekChart(day, st.target)}</div>
  <div class="card"><h2>Quick add</h2>
    ${recent.length ? `<div class="small" style="margin:2px 0 6px">Recent</div><div class="chips qa">${recent.map(e => `<button class="chip" data-re="${e.id}">＋ ${esc(e.name.slice(0, 26))}</button>`).join('')}</div>` : ''}
    ${savedMeals().length ? `<div class="small" style="margin:8px 0 6px">Saved meals</div><div class="chips qa">${savedMeals().map(m => `<button class="chip" data-meal="${m.id}">🍽 ${esc(m.name)} · ${Math.round(totals(m.items).carbs)}g</button>`).join('')}</div>` : ''}
    ${saved().length ? `<div class="small" style="margin:8px 0 6px">Favorites</div><div class="chips qa">${saved().slice(0, 10).map(x => `<a class="chip" href="#/product/${esc(x.p.id)}">♥ ${esc(x.p.name.slice(0, 24))}</a>`).join('')}</div>` : ''}
    ${customFoods().length ? `<div class="small" style="margin:8px 0 6px">My foods</div><div class="chips qa">${customFoods().map(c => `<a class="chip" href="#/product/${esc(c.id)}">✎ ${esc(c.name.slice(0, 24))}</a>`).join('')}</div>` : ''}
    <div class="actions"><a class="btn" href="#/custom">＋ Custom food</a><a class="btn" href="#/">Search foods</a></div></div>
  <div class="card"><h2>Export / import</h2><div class="actions"><button class="btn" id="expCsv">Export CSV</button><button class="btn" id="expJson">Backup JSON</button><label class="btn" for="impFile">Import…</label><input type="file" id="impFile" accept=".json,.csv,application/json,text/csv" hidden></div><div class="small" style="margin-top:6px">Your log never leaves this device unless you export it.</div></div>`;
  app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { LOG.save(LOG.all().filter(e => e.id !== b.dataset.del)); viewLog(dateArg); });
  app.querySelectorAll('[data-re]').forEach(b => b.onclick = () => { const e = LOG.all().find(x => x.id === b.dataset.re); if (!e) return; const ts = isToday ? Date.now() : new Date(dk + 'T12:00').getTime(); const l = LOG.all(); l.push(Object.assign({}, e, { id: 'e' + Date.now().toString(36), ts, meal: mealFor(new Date(ts)) })); LOG.save(l); toast('Added ' + e.name); viewLog(dateArg); });
  app.querySelectorAll('[data-meal]').forEach(b => b.onclick = () => { const m = savedMeals().find(x => x.id === b.dataset.meal); if (!m) return; const ts = isToday ? Date.now() : new Date(dk + 'T12:00').getTime(); const l = LOG.all(); m.items.forEach((it, i) => l.push(Object.assign({}, it, { id: 'e' + (Date.now() + i).toString(36), ts, meal: mealFor(new Date(ts)) }))); LOG.save(l); toast('Added ' + m.name); viewLog(dateArg); });
  app.querySelectorAll('[data-savemeal]').forEach(b => b.onclick = () => { const es = entries.filter(e => e.meal === b.dataset.savemeal); const name = prompt('Name this meal', `${MEAL_L[b.dataset.savemeal]} (${es.length} items)`); if (!name) return; const ms = savedMeals(); ms.unshift({ id: 'm' + Date.now().toString(36), name, items: es.map(({ id, ts, ...rest }) => rest) }); store.set('meals', ms.slice(0, 50)); toast('Meal saved'); viewLog(dateArg); });
  $('#expCsv').onclick = exportCSV; $('#expJson').onclick = exportJSON; $('#impFile').onchange = e => importFile(e.target.files[0], () => viewLog(dateArg));
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const csvq = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function exportCSV() {
  const rows = [['date', 'time', 'meal', 'name', 'brand', 'portion', 'grams', 'carbs_g', 'net_carbs_g', 'sugar_g', 'fiber_g', 'protein_g', 'fat_g', 'kcal', 'product_id']];
  LOG.all().sort((a, b) => a.ts - b.ts).forEach(e => { const s = scale(e.n, e.grams), d = new Date(e.ts); rows.push([dayKey(d), d.toTimeString().slice(0, 5), e.meal, e.name, e.brand, e.label, r1(e.grams), r1(s.carbs), r1(s.net), r1(s.sugars), r1(s.fiber), r1(s.protein), r1(s.fat), s.kcal == null ? '' : Math.round(s.kcal), e.pid]); });
  download(`lumi-log-${dayKey(new Date())}.csv`, rows.map(r => r.map(csvq).join(',')).join('\n'), 'text/csv');
}
function exportJSON() { download(`lumi-backup-${dayKey(new Date())}.json`, JSON.stringify({ app: 'lumi', v: 4, exported: new Date().toISOString(), log: LOG.all(), custom: customFoods(), meals: savedMeals(), saved: saved(), settings: settings() }, null, 1), 'application/json'); }
function parseCSV(t) { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c; } if (f || row.length) { row.push(f); rows.push(row); } return rows; }
function importFile(file, done) {
  if (!file) return; const rd = new FileReader();
  rd.onload = () => { try {
    const txt = String(rd.result); let added = 0; const l = LOG.all(), ids = new Set(l.map(e => e.id));
    if (/^\s*\{/.test(txt)) { const j = JSON.parse(txt); (j.log || []).forEach(e => { if (!ids.has(e.id)) { l.push(e); added++; } }); if (j.custom) store.set('custom', [...customFoods(), ...j.custom.filter(c => !customFoods().some(x => x.id === c.id))]); if (j.meals) store.set('meals', [...savedMeals(), ...j.meals.filter(c => !savedMeals().some(x => x.id === c.id))]); if (j.settings) setSettings(j.settings); }
    else { const [h, ...rows] = parseCSV(txt.trim()); const ix = k => h.indexOf(k); rows.forEach((r, i) => { const g = +r[ix('grams')] || 100, k = x => r[ix(x)] === '' || r[ix(x)] == null ? null : +r[ix(x)] * 100 / g; const ts = new Date(r[ix('date')] + 'T' + (r[ix('time')] || '12:00')).getTime(); if (!ts) return; l.push({ id: 'i' + ts.toString(36) + i, ts, meal: MEALS.includes(r[ix('meal')]) ? r[ix('meal')] : 'snack', pid: r[ix('product_id')] || '', name: r[ix('name')] || 'Imported food', brand: r[ix('brand')] || '', grams: g, label: r[ix('portion')] || g + ' g', n: { carbs: k('carbs_g'), net: k('net_carbs_g'), sugars: k('sugar_g'), fiber: k('fiber_g'), protein: k('protein_g'), fat: k('fat_g'), kcal: k('kcal') } }); added++; }); }
    LOG.save(l); toast(`Imported ${added} entries`); done && done();
  } catch (e) { toast('Import failed: ' + e.message); } };
  rd.readAsText(file);
}
/* ---------- custom foods ---------- */
function viewCustom() {
  document.title = 'Custom food — Lumi';
  const F = [['name', 'Name', 'text', 'e.g. Mom’s lasagna'], ['serv', 'Serving description', 'text', 'e.g. 1 slice'], ['grams', 'Serving weight (g, optional)', 'number', ''], ['carbs', 'Total carbs (g)', 'number', ''], ['fiber', 'Fiber (g)', 'number', ''], ['sugars', 'Sugar (g)', 'number', ''], ['protein', 'Protein (g)', 'number', ''], ['fat', 'Fat (g)', 'number', ''], ['sat', 'Saturated fat (g)', 'number', ''], ['sodiumMg', 'Sodium (mg)', 'number', ''], ['kcal', 'Calories', 'number', '']];
  app.innerHTML = `<h1>Custom food</h1><p class="lead">Values per serving, from your label or recipe. Stored on this device.</p><form class="card" id="cf">${F.map(([k, l, t, ph]) => `<label class="field"><span>${l}</span><input name="${k}" type="${t}" ${t === 'number' ? 'inputmode="decimal" step="any" min="0"' : ''} placeholder="${esc(ph)}" ${k === 'name' || k === 'carbs' ? 'required' : ''}></label>`).join('')}<div class="actions"><button class="btn pri">Save food</button></div></form>`;
  $('#cf').onsubmit = e => { e.preventDefault(); const fd = new FormData(e.target), v = k => fd.get(k) === '' ? null : +fd.get(k); const g = v('grams'); const f = g ? 100 / g : 1;
    const n = {}; ['carbs', 'fiber', 'sugars', 'protein', 'fat', 'sat', 'sodiumMg', 'kcal'].forEach(k => n[k] = v(k) == null ? null : v(k) * f);
    const p = { id: 'c-' + Date.now().toString(36), code: '', src: 'custom', name: String(fd.get('name')).trim(), brand: 'My food', qty: '', img: '', servQ: g || 100, serv: String(fd.get('serv') || ''), nova: null, additives: [], ing: '', cat: 'Custom', cats: '', naLabel: true, liquid: false, portions: [[fd.get('serv') || '1 serving', g || 100]], meta: { src: 'Custom food', perItem: !g }, n };
    store.set('custom', [p, ...customFoods()]); toast('Saved'); location.hash = '#/product/' + p.id; };
}
/* ---------- settings + onboarding ---------- */
function viewSettings() {
  const st = settings(); document.title = 'Settings — Lumi';
  app.innerHTML = `<h1>Settings</h1>
  <form class="card" id="sf"><h2>Carbs</h2>
    <label class="field"><span>Daily carb target (g) — optional</span><input name="target" type="number" inputmode="numeric" min="0" step="1" value="${st.target ?? ''}" placeholder="Off"></label>
    <h2 style="margin-top:14px">Insulin-to-carb ratio — optional</h2><p class="small">Off unless you set it. When set, product pages show <i>carbs ÷ your ratio</i> as an estimate only. Lumi never suggests corrections or doses.</p>
    <label class="field"><span>Grams of carbs per unit (the “X” in 1:X)</span><input name="icr" type="number" inputmode="decimal" min="0" step="0.1" value="${st.icr ?? ''}" placeholder="Off"></label>
    <div class="seg wide" id="basis"><button type="button" data-b="total" class="${st.icrBasis !== 'net' ? 'on' : ''}">Use total carbs</button><button type="button" data-b="net" class="${st.icrBasis === 'net' ? 'on' : ''}">Use net carbs</button></div>
    <div class="actions"><button class="btn pri">Save</button></div></form>
  ${prefsCard()}
  <div class="card"><h2>Primary rating</h2><p class="small">Which rating is shown first on cards and product pages. The other one stays as a small badge.</p><div class="seg wide" id="prim"><button type="button" data-p="carb" class="${st.primary !== 'health' ? 'on' : ''}">Carb score</button><button type="button" data-p="health" class="${st.primary === 'health' ? 'on' : ''}">Health rating</button></div></div>
  <div class="card"><h2>Data</h2><div class="actions"><button class="btn" id="expCsv">Export log CSV</button><button class="btn" id="expJson">Backup JSON</button></div><div class="actions"><label class="btn" for="impFile">Import…</label><input type="file" id="impFile" accept=".json,.csv" hidden><button class="btn" id="reOnb">Show intro again</button></div></div>
  <div class="card"><a class="lnk" href="#/about">About Lumi, scoring formula & data sources ›</a></div>`;
  bindPrefs();
  document.querySelectorAll('#prim button').forEach(b => b.onclick = () => { setSettings({ primary: b.dataset.p }); document.querySelectorAll('#prim button').forEach(x => x.classList.toggle('on', x === b)); toast('Primary rating: ' + b.textContent); });
  let basis = st.icrBasis; document.querySelectorAll('#basis button').forEach(b => b.onclick = () => { basis = b.dataset.b; document.querySelectorAll('#basis button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#sf').onsubmit = e => { e.preventDefault(); const fd = new FormData(e.target); const t = +fd.get('target') || null, i = +fd.get('icr') || null; setSettings({ target: t, icr: i, icrBasis: basis }); toast('Saved'); };
  $('#expCsv').onclick = exportCSV; $('#expJson').onclick = exportJSON; $('#impFile').onchange = e => importFile(e.target.files[0]); $('#reOnb').onclick = () => onboarding(true);
}
function onboarding(force) {
  if (!force && settings().onboarded) return;
  let step = 0; const st = settings();
  const steps = [
    () => `<div class="onb-ic">${MASCOT(120, 'big wave')}</div><h2>Welcome to Lumi</h2><p>Every food gets a <b>carb-first score out of 100</b>. Net carbs and sugar weigh the most, then fiber and protein (good), and saturated fat, sodium, ultra-processing and additives (bad).</p>
      <div class="bands"><span><i class="bg-ex"></i>75+ Excellent</span><span><i class="bg-gd"></i>50–74 Good</span><span><i class="bg-pr"></i>25–49 Poor</span><span><i class="bg-bd"></i>0–24 Bad</span></div><p class="small">Informational only — not medical advice.</p>`,
    () => `<h2>Daily carb target</h2><p>Optional. Shows a progress ring on your Today log.</p><label class="field"><span>Grams per day</span><input id="onbT" type="number" inputmode="numeric" min="0" value="${st.target ?? ''}" placeholder="Skip"></label>`,
    () => `<h2>Insulin-to-carb ratio</h2><p>Optional and off by default. If you enter your own ratio (e.g. 1:10), product pages show carbs ÷ ratio as an <b>estimate only — confirm on your pump</b>. No corrections, no dosing advice.</p><label class="field"><span>Grams per unit</span><input id="onbI" type="number" inputmode="decimal" min="0" step="0.1" value="${st.icr ?? ''}" placeholder="Skip"></label>`,
    () => { const t = Object.assign({}, st.mealT || {}); return `<h2>Carbs per meal</h2><p>Optional. If your care team gave you a carb amount per meal, enter it. Your log shows a bar for each meal: green within, amber near, red over, always with the number.</p><div class="mt9g">${MEALS.map(m => `<label class="field"><span>${MEAL_L[m]} (g)</span><input id="onbM_${m}" type="number" inputmode="numeric" min="0" value="${t[m] ?? ''}" placeholder="Skip"></label>`).join('')}</div>`; },
    () => `<h2>Quick tour</h2><ul class="tour9"><li><span>📷</span><div><b>Scan</b> a barcode, or photograph a Nutrition Facts label if it isn't found.</div></li><li><span>🩸</span><div><b>Blood sugar impact</b> uses published GI values when one matches, otherwise a labeled estimate.</div></li><li><span>✨</span><div><b>Better choice</b> near the top of each product shows a same-category swap with less carb impact.</div></li><li><span>🍽</span><div><b>Saved meals</b>: save a plate once, log it from Home in one tap (with undo).</div></li><li><span>⚠</span><div><b>Ingredient alerts</b> flag hidden sugars, maltodextrin, seed oils or sweeteners in results.</div></li></ul><p class="small">Allergen info is shown when available; if Lumi couldn't verify it, it says so. Always check the package.</p>`,
  ];
  const draw = () => { sheet(`<div class="onb">${steps[step]()}<div class="dots">${steps.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div><div class="actions">${step ? '<button class="btn" id="onbBack">Back</button>' : '<button class="btn" id="onbSkip">Skip</button>'}<button class="btn pri" id="onbNext">${step === steps.length - 1 ? 'Start' : 'Next'}</button></div></div>`);
    const save = () => { const t = $('#onbT'), i = $('#onbI'); if (t) setSettings({ target: +t.value || null }); if (i) setSettings({ icr: +i.value || null }); if ($('#onbM_lunch')) { const o = {}; MEALS.forEach(m => { const v = +$('#onbM_' + m).value; o[m] = v > 0 ? v : null; }); setSettings({ mealT: o }); } };
    $('#onbNext').onclick = () => { save(); if (step < steps.length - 1) { step++; draw(); } else { setSettings({ onboarded: true }); closeSheet(); } };
    if ($('#onbBack')) $('#onbBack').onclick = () => { save(); step--; draw(); };
    if ($('#onbSkip')) $('#onbSkip').onclick = () => { setSettings({ onboarded: true }); closeSheet(); };
    document.querySelector('.sheet-bg').onclick = null; };
  draw();
}
