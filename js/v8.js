/* Lumi 8.0: blood-sugar impact, label photo OCR, smarter log (week + printable report), share cards, ingredient watchlist, offline records */
const V8 = {};
/* ---------- 1. Blood sugar impact ---------- */
let GI8 = null;
function loadGI() { if (GI8) return Promise.resolve(GI8); return fetch('ref/gi2008.json').then(r => r.json()).then(j => (GI8 = Object.assign(j, { re: j.foods.map(f => [f[0], f[1], new RegExp(f[2], 'i'), f[3] || 'any']) }))).catch(() => null); }
function giMatch(p) { if (!GI8 || !p || !p.name) return null; const nm = String(p.name).toLowerCase(); const notCooked = /\b(raw|dry|dried|uncooked|unprepared|flour|meal|mix|powder|not prepared)\b/.test(nm) && !/\b(cooked|boiled|prepared|steamed|baked|canned)\b/.test(nm), notRaw = /\b(cooked|boiled|canned|baked|fried|dried|dehydrated|chips|juice|stewed)\b/.test(nm);
  for (const [food, gi, re, prep] of GI8.re) if (re.test(nm)) { if ((prep === 'cooked' && notCooked) || (prep === 'raw' && notRaw)) return null; return { food, gi }; } return null; }
function bgImpact(p) {
  const s = S.score(p), n = p.n || {}; if (s.net == null) return null;
  const perItem = p.meta && p.meta.perItem, u = p.liquid ? 'ml' : 'g'; // v19.1: same serving as the scores (follows the ½×/1×/2×/grams control)
  const g = s.servG || (perItem ? 100 : (p.servQ || 100)), basis = s.servKind === 'per100' ? `per 100 ${u} (no serving size)` : s.servKind === 'item' ? (g === 100 ? 'per item' : `per ${s.servLabel}`) : s.servKind === 'default' ? `per typical serving (${s.servLabel})` : `per serving (${s.servLabel || Math.round(g) + ' ' + u})`;
  const k = g / 100, net = Math.max(0, s.net * k), fat = (n.fat || 0) * k, pro = (n.protein || 0) * k, fib = (n.fiber || 0) * k, sug = (n.sugars || 0) * k;
  const ref = giMatch(p);
  let size, speed, why = [], method;
  if (net < 5) { size = 'Low'; speed = 'minimal'; why.push(`Only ${r1(net)} g carbs ${basis}.`); method = 'heuristic'; }
  else if (ref) {
    const gl = ref.gi * net / 100; method = 'gi';
    size = gl <= 10 ? 'Low' : gl < 20 ? 'Medium' : 'High';
    speed = ref.gi >= 70 ? 'fast' : ref.gi >= 56 ? 'moderate' : 'slow';
    why.push(`Reference GI ${ref.gi} for "${ref.food}" (International Tables 2008). Estimated glycemic load ${Math.round(gl)} ${basis}: low ≤10, medium 11–19, high ≥20. GI ${ref.gi} is ${ref.gi >= 70 ? 'high (≥70)' : ref.gi >= 56 ? 'medium (56–69)' : 'low (≤55)'}.`);
    why.push('This product\'s own GI may differ from the reference food.');
  } else {
    method = 'heuristic';
    size = net < 15 ? 'Low' : net <= 30 ? 'Medium' : 'High';
    const slowers = fat * 9 + pro * 4, ratio = slowers / (net * 4), fibR = fib / Math.max(1, net + fib), sugR = net ? sug / net : 0;
    if (p.liquid && sugR > 0.5) speed = 'fast'; else if (ratio > 1.2 || fibR > 0.25) speed = 'slow'; else if (ratio < 0.5 && (sugR > 0.4 || net > 30)) speed = 'fast'; else speed = 'moderate';
    why.push(`${r1(net)} g carbs ${basis} (low <15, medium 15–30, high >30).`);
    if (sugR > 0.4) why.push(`${Math.round(sugR * 100)}% of the carbs are sugars.`);
    if (p.liquid && sugR > 0.5) why.push('Sugary drinks are absorbed quickly.');
    if (ratio > 1.2) why.push(`Fat and protein (${r1(fat)} g fat, ${r1(pro)} g protein) usually slow and stretch out the rise.`);
    if (fibR > 0.25) why.push(`${r1(fib)} g fiber helps slow absorption.`);
  }
  return { size, speed, why, method, basis, net, ref };
}
function bgCard(p) {
  const b = bgImpact(p); if (!b) return '';
  const cls = b.size === 'Low' ? 'ex' : b.size === 'Medium' ? 'pr' : 'bd', sp = b.speed === 'minimal' ? 'minimal rise' : b.speed + ' rise';
  const src = b.method === 'gi' ? `<p class="small">Source: <a class="lnk" href="${esc(GI8.url)}" target="_blank" rel="noopener">${esc(GI8.source)}</a> doi:${esc(GI8.doi)}</p>` : '<p class="small">Heuristic estimate: no published GI value matches this product. It\'s based on carbs, sugar, fiber, fat and protein.</p>';
  return `<div class="card bg8" id="bg8"><div class="fx-h"><h2>Blood sugar impact</h2><span class="small">${esc(b.basis)}</span></div>
    <div class="bg8-top"><span class="bg8-pill bg-${cls}">${b.size}</span><b>${b.size} impact · ${esc(sp)}</b></div>
    <ul class="bg8-why">${b.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>${src}
    <p class="small">Informational estimate only. Everyone responds differently; check your CGM. Not dosing advice.</p></div>`;
}
/* ---------- 6. Ingredient watchlist ---------- */
/* WATCH8 presets live in js/watch8.js (shared with tools/build.js for index flags) */
function watchFlags(m) { const on = watch8().on; return WATCH8.filter((x, i) => m & (1 << i) && on.includes(x[0])).map(x => x[1]).join(', '); }
const watch8 = () => store.get('watch', { on: [], words: [] });
function watchRules() { const w = watch8(); const r = WATCH8.filter(x => w.on.includes(x[0])).map(x => [x[1], x[2]]); (w.words || []).filter(Boolean).forEach(word => r.push([`"${word}"`, new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi')])); return r; }
function watchHits(p) {
  const ing = String((p && p.ing) || ''), adds = ((p && p.additives) || []).join(' '); if (!ing && !adds) return null;
  const out = []; for (const [label, re] of watchRules()) { re.lastIndex = 0; const m = (ing + ' ' + adds).match(re); if (m) out.push({ label, words: [...new Set(m.map(x => x.toLowerCase()))] }); } return out;
}
function alertsCard(p) {
  const rules = watchRules(); if (!rules.length) return '';
  const hits = watchHits(p);
  if (hits == null) return `<div class="card al8"><div class="fx-h"><h2>Ingredient watchlist</h2><a class="lnk" href="#/alerts">Edit</a></div><p class="small">Couldn't verify: no ingredient list for this product.</p></div>`;
  if (!hits.length) return `<div class="card al8"><div class="fx-h"><h2>Ingredient watchlist</h2><a class="lnk" href="#/alerts">Edit</a></div><p class="small">None of your watchlist items were found in the ingredient list (${rules.map(r => esc(r[0])).join(', ')}). Ingredient lists can be incomplete.</p></div>`;
  let ing = esc(p.ing || ''); for (const [, re] of rules) { re.lastIndex = 0; ing = ing.replace(re, m => `<mark>${m}</mark>`); }
  return `<div class="card al8 hit"><div class="fx-h"><h2>⚠ Watchlist: ${hits.length} match${hits.length > 1 ? 'es' : ''}</h2><a class="lnk" href="#/alerts">Edit</a></div><ul class="bg8-why">${hits.map(h => `<li><b>${esc(h.label)}</b>: ${esc(h.words.join(', '))}</li>`).join('')}</ul>${p.ing ? `<details><summary class="small">Ingredients</summary><p class="small ing8">${ing}</p></details>` : ''}</div>`;
}
function viewAlerts() {
  document.title = 'Ingredient alerts — Lumi'; const w = watch8();
  app.innerHTML = `<h1>Ingredient alerts</h1><p class="lead">Pick what to watch for. Lumi highlights matches in ingredient lists on product pages and flags them in search results when the ingredients are known.</p>
  <div class="card"><form id="wf">${WATCH8.map(x => `<label class="tg8"><input type="checkbox" name="on" value="${x[0]}" ${w.on.includes(x[0]) ? 'checked' : ''}> <b>${x[1]}</b><small>${esc(String(x[2].source).replace(/\\b|\(\?[^)]*\)/g, '').replace(/[()]/g, '').split('|').slice(0, 8).join(', '))}…</small></label>`).join('')}
  <label class="field"><span>Custom words (comma separated)</span><input name="words" value="${esc((w.words || []).join(', '))}" placeholder="e.g. carrageenan, palm oil"></label><div class="actions"><button class="btn pri">Save</button></div></form></div>
  <p class="small">Matches are text-based and ingredient lists can be missing or incomplete, so "no match" means Lumi couldn't find it, not that it isn't there.</p>`;
  $('#wf').onsubmit = e => { e.preventDefault(); const fd = new FormData(e.target); store.set('watch', { on: fd.getAll('on'), words: String(fd.get('words') || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 30) }); toast('Watchlist saved'); };
}
/* ---------- 4. Share cards ---------- */
function canvasCard(draw) { const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1200, 630); g.addColorStop(0, '#fff7ef'); g.addColorStop(1, '#ffe6d2'); x.fillStyle = g; x.fillRect(0, 0, 1200, 630);
  x.fillStyle = '#ff7a2f'; x.font = '700 44px system-ui,sans-serif'; x.fillText('lumi', 60, 90); x.fillStyle = '#6b6478'; x.font = '24px system-ui,sans-serif'; x.fillText('Carb-first food scores for diabetes', 170, 88);
  draw(x); x.fillStyle = '#6b6478'; x.font = '22px system-ui,sans-serif'; x.fillText('jwardell15.github.io/lumi · informational only', 60, 590); return c; }
const BC8 = { ex: '#1aa260', gd: '#8bc34a', pr: '#f5a623', bd: '#e5484d', unknown: '#9b95ab' };
function wrapText(x, t, X, Y, W, lh, max = 2) { const words = String(t).split(' '); let line = '', n = 0; for (const w of words) { const tt = line ? line + ' ' + w : w; if (x.measureText(tt).width > W && line) { x.fillText(line, X, Y + n * lh); line = w; if (++n >= max) return n; } else line = tt; } if (line && n < max) { x.fillText(line, X, Y + n * lh); n++; } return n; }
function scoreDisk(x, cx, cy, v, band, label) { x.beginPath(); x.arc(cx, cy, 78, 0, 7); x.fillStyle = BC8[band] || BC8.unknown; x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '800 64px system-ui,sans-serif'; x.fillText(v == null ? '?' : v, cx, cy + 20); x.fillStyle = '#2a2433'; x.font = '600 22px system-ui,sans-serif'; x.fillText(label, cx, cy + 112); x.textAlign = 'left'; }
function productCanvas(p) { const s = S.score(p), hr = HR(p), b = bgImpact(p);
  return canvasCard(x => { x.fillStyle = '#1d1824'; x.font = '800 54px system-ui,sans-serif'; const nl = wrapText(x, p.name, 60, 190, 700, 62, 2); x.fillStyle = '#6b6478'; x.font = '28px system-ui,sans-serif'; x.fillText(String(p.brand || '') + (p.src === 'custom' ? ' · user-entered' : ''), 60, 190 + nl * 62 + 4);
    x.fillStyle = '#1d1824'; x.font = '600 34px system-ui,sans-serif'; x.fillText(`${r1(s.net ?? 0)} g carbs / 100${p.liquid ? 'ml' : 'g'}`, 60, 430); if (b) { x.font = '28px system-ui,sans-serif'; x.fillStyle = '#4a4356'; x.fillText(`Blood sugar impact: ${b.size}, ${b.speed}`, 60, 480); }
    scoreDisk(x, 900, 230, hr.score, HB(hr.score), 'Health'); scoreDisk(x, 1080, 230, s.score, s.band, 'Carb score'); }); }
function swapCanvas(a, b) { const sa = S.score(a), sb = S.score(b);
  return canvasCard(x => { x.fillStyle = '#1d1824'; x.font = '700 40px system-ui,sans-serif'; x.fillText('Better swap', 60, 160);
    [[a, sa, 60], [b, sb, 640]].forEach(([p, s, X]) => { x.fillStyle = '#1d1824'; x.font = '700 34px system-ui,sans-serif'; wrapText(x, p.name, X, 250, 480, 40, 2); x.fillStyle = '#6b6478'; x.font = '24px system-ui,sans-serif'; x.fillText(String(p.brand || ''), X, 340); x.fillStyle = BC8[s.band] || BC8.unknown; x.font = '800 72px system-ui,sans-serif'; x.fillText(String(s.score ?? '?'), X, 440); x.fillStyle = '#4a4356'; x.font = '26px system-ui,sans-serif'; x.fillText(`/100 · ${r1(s.net ?? 0)} g carbs`, X + 110, 440); });
    x.fillStyle = '#ff7a2f'; x.font = '800 70px system-ui,sans-serif'; x.fillText('→', 555, 300); }); }
function listCanvas(name, items) { return canvasCard(x => { x.fillStyle = '#1d1824'; x.font = '800 48px system-ui,sans-serif'; x.fillText(String(name).slice(0, 34), 60, 170); x.font = '28px system-ui,sans-serif';
  items.slice(0, 9).forEach((it, i) => { x.fillStyle = '#2a2433'; x.fillText(`${it.done ? '☑' : '☐'}  ${String(it.name).slice(0, 34)}${it.score != null ? `  · ${it.score}/100` : ''}`, 60 + (i >= 5 ? 560 : 0), 240 + (i % 5) * 58); });
  if (items.length > 9) { x.fillStyle = '#6b6478'; x.fillText(`+${items.length - 9} more`, 620, 530); } }); }
async function shareCanvas(c, title, text, url, fname) {
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); const file = new File([blob], fname, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title, text: text + (url ? '\n' + url : '') }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  if (url && navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {}); toast(url ? 'Card downloaded · link copied' : 'Card downloaded'); return 'download';
}
const prodURL = p => p.src === 'custom' ? '' : location.origin + location.pathname + '#/product/' + encodeURIComponent(p.id);
function shareProductCard(p) { const s = S.score(p); return shareCanvas(productCanvas(p), 'Lumi: ' + p.name, `${p.name}${p.brand ? ' (' + p.brand + ')' : ''}: Carb score ${s.score ?? '?'}/100, ${r1(s.net ?? 0)} g carbs/100${p.liquid ? 'ml' : 'g'}${p.src === 'custom' ? ' (user-entered label)' : ''}`, prodURL(p), 'lumi-' + String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '.png'); }
/* ---------- 3. Smarter log: week view + printable report ---------- */
function daysBack(n, end = new Date()) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(end); d.setDate(d.getDate() - i); out.push(d); } return out; }
function weekTable(days) { const L = LOG.all(); let tot = 0, nd = 0, totN = 0, totK = 0;
  const rows = days.map(d => { const es = L.filter(e => dayKey(e.ts) === dayKey(d)); const by = MEALS.map(m => totals(es.filter(e => e.meal === m)).carbs); const t = totals(es); if (es.length) { tot += t.carbs; totN += t.net; totK += t.kcal; nd++; } return `<tr><th><a href="#/log/${dayKey(d)}">${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</a></th>${by.map(v => `<td>${v ? Math.round(v) : '–'}</td>`).join('')}<td><b>${es.length ? Math.round(t.carbs) : '–'}</b></td><td>${es.length ? Math.round(t.kcal) : '–'}</td></tr>`; }).join('');
  return `<table class="wk8"><thead><tr><th>Day</th>${MEALS.map(m => `<th>${({ breakfast: 'Bkfst', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' })[m]}</th>`).join('')}<th>Carbs</th><th>Cal</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th>Avg (${nd} d)</th><td colspan="4"></td><td><b>${nd ? Math.round(tot / nd) : '–'}</b></td><td>${nd ? Math.round(totK / nd) : '–'}</td></tr></tfoot></table>`; }
function viewWeek() { document.title = 'Week — Lumi'; const st = settings();
  app.innerHTML = `<div class="dayhead"><a class="icon" href="#/log" aria-label="Back to today">‹</a><h1>Last 7 days</h1><span class="icon"></span></div>
  <div class="seg8"><a href="#/log">Day</a><a class="on" href="#/log/week">Week</a><a href="#/report">Report</a></div>
  <div class="card"><h2>Carbs by meal (g)</h2><div class="wk8w">${weekTable(daysBack(7))}</div>${st.target ? `<p class="small">Daily target: ${st.target} g.</p>` : ''}</div>
  <div class="card"><h2>Carbs per day</h2>${weekChart(new Date(), st.target)}</div>
  <div class="actions"><button class="btn" id="expCsv">Export CSV</button><a class="btn pri" href="#/report">Printable summary</a></div>`;
  $('#expCsv').onclick = exportCSV; }
function viewReport(arg) { const n = Math.min(90, Math.max(3, +arg || 14)); document.title = 'Lumi carb summary'; const days = daysBack(n), L = LOG.all(), st = settings();
  const inR = L.filter(e => e.ts >= new Date(dayKey(days[0]) + 'T00:00').getTime());
  const logged = days.filter(d => L.some(e => dayKey(e.ts) === dayKey(d))); const avg = k => logged.length ? totals(inR)[k] / logged.length : 0;
  const top = {}; inR.forEach(e => { const s = scale(e.n, e.grams); const k = e.name; top[k] = top[k] || { n: 0, c: 0 }; top[k].n++; top[k].c += s.carbs || 0; }); const tops = Object.entries(top).sort((a, b) => b[1].c - a[1].c).slice(0, 10);
  const mealAvg = MEALS.map(m => [m, logged.length ? totals(inR.filter(e => e.meal === m)).carbs / logged.length : 0]);
  app.innerHTML = `<div class="report8"><div class="noprint seg8"><a href="#/log">Day</a><a href="#/log/week">Week</a><a class="on" href="#/report">Report</a></div>
    <div class="noprint actions"><a class="btn${n === 7 ? ' pri' : ''}" href="#/report/7">7 days</a><a class="btn${n === 14 ? ' pri' : ''}" href="#/report/14">14 days</a><a class="btn${n === 30 ? ' pri' : ''}" href="#/report/30">30 days</a><button class="btn pri" id="pr8">Print / save PDF</button><button class="btn" id="expCsv">Export CSV</button></div>
    <h1>Carb intake summary</h1><p class="small">${days[0].toLocaleDateString()} – ${days[n - 1].toLocaleDateString()} · ${logged.length} of ${n} days logged · generated ${new Date().toLocaleString()} by Lumi ${VERSION}. Self-logged food entries; values come from product labels and databases and may contain errors.</p>
    <div class="rp8-kpi"><div><small>Avg carbs/day</small><b>${Math.round(avg('carbs'))} g</b></div><div><small>Avg calories/day</small><b>${Math.round(avg('kcal'))}</b></div>${st.target ? `<div><small>Target</small><b>${st.target} g</b></div>` : ''}</div>
    <h2>Average carbs by meal</h2><table class="wk8"><tr>${mealAvg.map(([m]) => `<th>${MEAL_L[m]}</th>`).join('')}</tr><tr>${mealAvg.map(([, v]) => `<td>${Math.round(v)} g</td>`).join('')}</tr></table>
    <h2>Daily totals</h2>${weekTable(days)}
    <h2>Top carb sources</h2><table class="wk8"><tr><th>Food</th><th>Times</th><th>Total carbs</th></tr>${tops.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.n}</td><td>${Math.round(v.c)} g</td></tr>`).join('') || '<tr><td colspan="3">Nothing logged.</td></tr>'}</table>
    <p class="small">No insulin doses or corrections are included.</p></div>`;
  $('#pr8').onclick = () => window.print(); $('#expCsv').onclick = exportCSV; }
/* ---------- 2. Label photo OCR (Tesseract.js, on-device) ---------- */
function loadTess() { if (window.Tesseract) return Promise.resolve(); return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the OCR engine (offline?)')); document.head.appendChild(s); }); }
function parseLabel(raw) {
  let t = ' ' + String(raw).replace(/\r/g, '').replace(/[|]/g, 'l') + ' ';
  t = t.replace(/(\d)\s*[oO](?=\s*(g|mg)\b)/g, '$10').replace(/\b[oO](?=\s*(g|mg)\b)/g, '0').replace(/\b[lI](?=\s*(g|mg)\b)/g, '1').replace(/(\d),(\d)/g, '$1.$2');
  const num = re => { const m = t.match(re); return m ? +m[1] : null; };
  const sv = t.match(/serving size[^\n]*?\(\s*(\d+?(?:\.\d+)?)\s*(g|9|ml|mL)\s*\)/i) || t.match(/serving size[^\n(]*?(\d+(?:\.\d+)?)\s*(g|ml|mL)\b/i), svText = (t.match(/serving size\s*([^\n]{1,40})/i) || [])[1];
  return {
    serv: svText ? svText.replace(/\s+/g, ' ').replace(/\((\d+)9\)/, '($1g)').trim() : '', grams: sv ? +sv[1] : null, liquid: sv ? /ml/i.test(sv[2]) : false,
    kcal: num(/calories[^\d\n]{0,12}(\d{1,4})/i), fat: num(/total fat\s*(\d+(?:\.\d+)?)\s*g/i), sat: num(/sat(?:urated)?\.? fat\s*(\d+(?:\.\d+)?)\s*g/i),
    sodiumMg: num(/sodium\s*(\d+(?:\.\d+)?)\s*mg/i), carbs: num(/total carb(?:ohydrate|\.)?s?\s*(\d+(?:\.\d+)?)\s*g/i), fiber: num(/(?:dietary )?fib(?:er|re)\s*(\d+(?:\.\d+)?)\s*g/i),
    sugars: num(/total sugars?\s*(\d+(?:\.\d+)?)\s*g/i) ?? num(/\bsugars\s*(\d+(?:\.\d+)?)\s*g/i), added: num(/(?:incl(?:udes|\.)?\s*)?(\d+(?:\.\d+)?)\s*g\s*added sugars/i), protein: num(/protein\s*(\d+(?:\.\d+)?)\s*g/i) };
}
const LF8 = [['name', 'Product name', 'text'], ['brand', 'Brand (optional)', 'text'], ['serv', 'Serving size (as printed)', 'text'], ['grams', 'Serving weight (g or ml)', 'number'], ['kcal', 'Calories', 'number'], ['fat', 'Total fat (g)', 'number'], ['sat', 'Saturated fat (g)', 'number'], ['sodiumMg', 'Sodium (mg)', 'number'], ['carbs', 'Total carbohydrate (g)', 'number'], ['fiber', 'Dietary fiber (g)', 'number'], ['sugars', 'Total sugars (g)', 'number'], ['added', 'Added sugars (g)', 'number'], ['protein', 'Protein (g)', 'number']];
function viewLabel(code) {
  document.title = 'Scan a label — Lumi'; const bc = /^\d{8,14}$/.test(code || '') ? code : '';
  app.innerHTML = `<h1>Scan a Nutrition Facts label</h1><p class="lead">Take a photo of the label. Text is read on this device (Tesseract.js); nothing is uploaded. Check every number before saving.</p>
  <div class="card"><label class="btn pri" for="lbFile">📷 Take or choose a photo</label><input id="lbFile" type="file" accept="image/*" capture="environment" hidden><div id="lbStat" class="small" style="margin-top:8px">${bc ? `For barcode ${esc(bc)}.` : ''}</div><img id="lbPrev" alt="" hidden style="max-width:100%;max-height:260px;margin-top:10px;border-radius:12px"></div>
  <form class="card" id="lbForm"><div class="fx-h"><h2>Values per serving</h2><span class="small">user-entered</span></div>${LF8.map(([k, l, t]) => `<label class="field"><span>${l}</span><input name="${k}" type="${t}" ${t === 'number' ? 'inputmode="decimal" step="any" min="0"' : ''} ${k === 'name' || k === 'carbs' ? 'required' : ''}></label>`).join('')}
  <label class="tg8"><input type="checkbox" name="liquid"> <b>It's a drink</b> <small>(serving in ml)</small></label>
  <div class="actions"><button class="btn pri">Save &amp; score</button></div><p class="small">Saved only on this device as "My food (from label photo)". It's marked as user-entered everywhere.</p></form>`;
  const f = $('#lbForm');
  $('#lbFile').onchange = async e => { const file = e.target.files[0]; if (!file) return; const st = $('#lbStat'), img = $('#lbPrev'); img.src = URL.createObjectURL(file); img.hidden = false;
    try { st.textContent = 'Loading the text reader (first time ~10 MB)…'; await loadTess(); st.textContent = 'Reading the label…';
      const r = await Tesseract.recognize(file, 'eng', { logger: m => { if (m.status === 'recognizing text') st.textContent = `Reading the label… ${Math.round(m.progress * 100)}%`; } });
      const v = parseLabel(r.data.text); V8.lastOCR = { text: r.data.text, v }; let nf = 0;
      for (const [k] of LF8) if (v[k] != null && v[k] !== '' && f.elements[k]) { f.elements[k].value = v[k]; f.elements[k].classList.add('ocr8'); nf++; }
      if (v.liquid) f.elements.liquid.checked = true;
      st.textContent = nf ? `Read ${nf} value${nf > 1 ? 's' : ''}. Highlighted fields came from the photo; please check them.` : "Couldn't read the label. Try a sharper, straight-on photo, or type the values.";
    } catch (err) { st.textContent = err.message + '. You can type the values instead.'; } };
  f.onsubmit = e => { e.preventDefault(); const fd = new FormData(f), v = k => fd.get(k) === '' || fd.get(k) == null ? null : +fd.get(k); const g = v('grams'), k = g ? 100 / g : 1;
    const n = {}; ['carbs', 'fiber', 'sugars', 'added', 'protein', 'fat', 'sat', 'sodiumMg', 'kcal'].forEach(x => n[x] = v(x) == null ? null : v(x) * k); n.trans = null; n.polyols = null;
    const liq = !!fd.get('liquid');
    const p = { id: 'c-' + Date.now().toString(36), code: bc, src: 'custom', name: String(fd.get('name')).trim(), brand: String(fd.get('brand') || '').trim() || 'My food', qty: '', img: '', servQ: g || 100, serv: String(fd.get('serv') || ''), nova: null, additives: [], ing: '', cat: 'Custom', cats: '', naLabel: true, liquid: liq, portions: [[fd.get('serv') || '1 serving', g || 100]], meta: { src: 'Label photo (user-entered)', perItem: !g, user: true }, n };
    store.set('custom', [p, ...customFoods()]); toast('Saved'); location.hash = '#/product/' + p.id; };
}
/* ---------- 7. Offline: keep records for favorites/lists/log/recent; network-failure fallback ---------- */
function keepOffline(p) { try { if (p && p.id && p.src !== 'cos') remember(p); } catch {} }
/* product-page hook (called from app.js after render) */
function bind8(p, s) {
  keepOffline(p);
  const anchor = document.getElementById('fx75') || document.getElementById('hcard');
  loadGI().then(() => { if (document.getElementById('bg8') || !anchor || !document.body.contains(anchor)) return; anchor.insertAdjacentHTML('beforebegin', bgCard(p)); });
  const al = alertsCard(p); if (al && anchor) anchor.insertAdjacentHTML('beforebegin', al);
  const act = document.querySelector('.actions'); if (act && !document.getElementById('shareCard')) { const b = document.createElement('button'); b.className = 'btn'; b.id = 'shareCard'; b.textContent = '🖼 Share card'; b.onclick = () => shareProductCard(p); act.appendChild(b); }
  if (p.src === 'custom' && p.meta && p.meta.user) { const h = document.querySelector('.ph-t .b'); if (h && !document.getElementById('ue8')) h.insertAdjacentHTML('afterend', '<div class="ue8" id="ue8">✎ User-entered from a label photo. Not verified.</div>'); }
}
/* wrap log / compare / list views (defined in earlier files) */
(function () {
  const vl = viewLog; viewLog = function (arg) { if (arg === 'week') return viewWeek(); vl(arg); const h = document.querySelector('.dayhead'); if (h) h.insertAdjacentHTML('afterend', '<div class="seg8"><a class="on" href="#/log">Day</a><a href="#/log/week">Week</a><a href="#/report">Report</a></div>'); };
  if (typeof viewCompare === 'function') { const vc = viewCompare; viewCompare = async function () { await vc(); const ids = cmpIds(); if (ids.length >= 2) { const ps = await Promise.all(ids.slice(0, 2).map(id => resolveProduct(id).catch(() => null))); if (ps[0] && ps[1]) { const [a, b] = (S.score(ps[0]).score ?? 0) >= (S.score(ps[1]).score ?? 0) ? [ps[1], ps[0]] : ps; const el = document.createElement('div'); el.className = 'actions'; el.innerHTML = '<button class="btn pri" id="swapCard">🖼 Share swap card</button>'; app.appendChild(el); $('#swapCard').onclick = () => shareCanvas(swapCanvas(a, b), 'Lumi swap', `Swap ${a.name} (${S.score(a).score}/100) → ${b.name} (${S.score(b).score}/100)`, prodURL(b), 'lumi-swap.png'); } } }; }
  if (typeof viewList === 'function') { const vli = viewList; viewList = function (id) { vli(id); const cur = (store.get('lists', []) || []).find(l => l.id === id); const act = document.querySelector('#lShare') && document.querySelector('#lShare').parentElement; if (cur && act) { const b = document.createElement('button'); b.className = 'btn'; b.id = 'listCard'; b.textContent = '🖼 Share card'; b.onclick = () => shareCanvas(listCanvas(cur.name, cur.items || []), cur.name, `${cur.name}: ${(cur.items || []).length} items`, '', 'lumi-list.png'); act.appendChild(b); } }; }
})();
