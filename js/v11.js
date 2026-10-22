/* Lumi 11.0 — scan history, glucose after meals (Dexcom Clarity CSV import), Apple Health via Shortcuts,
   link/code sharing for lists and saved meals, and new layouts for Log, Lists, Compare, Meal builder, saved meals and Settings.
   Never invents glucose data: charts only draw readings the user imported. */
const I11 = {
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', share: '<path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>', plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  compare: '<path d="M7 4v16M17 4v16M3 8h8M13 16h8"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', chev: '<path d="m9 6 6 6-6 6"/>', note: '<path d="M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h5"/>',
  cart: '<path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
  /* aisle icons */
  produce: '<path d="M12 21c-4 0-7-3-7-7 0-5 4-8 7-11 3 3 7 6 7 11 0 4-3 7-7 7zM12 21V9"/>', meat: '<path d="M15 4a5 5 0 0 1 4 8l-7 7a4 4 0 0 1-6-6l1-1a4 4 0 0 0 1-3 5 5 0 0 1 7-5zM6 18l-2 2"/>',
  dairy: '<path d="M9 3h6v3l2 3v12H7V9l2-3zM7 12h10"/>', bakery: '<path d="M4 13a8 5 0 0 1 16 0v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 11v3M12 10v4M15 11v3"/>',
  frozen: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4l3 2 3-2M9 20l3-2 3 2"/>', pantry: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M6 9h12M10 4V2h4v2"/>',
  snacks: '<path d="M6 3h12l-1 3 1 3-1 3 1 3-1 3 1 3H6l1-3-1-3 1-3-1-3 1-3z"/>', bev: '<path d="M7 7h10l-1 14H8zM6 7h12M12 7l2-4h3"/>',
  breakfast: '<path d="M4 11h16a8 8 0 0 1-16 0zM9 7c0-1 1-2 1-3M13 7c0-1 1-2 1-3"/>', sauce: '<path d="M10 3h4v3l2 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/>',
  baking: '<path d="M5 11h14l-2 9H7zM8 11a4 4 0 0 1 8 0"/>', canned: '<ellipse cx="12" cy="5" rx="6" ry="2"/><path d="M6 5v14c0 1.1 2.7 2 6 2s6-.9 6-2V5M6 10h12"/>',
  deli: '<path d="M3 14h18l-2 4H5zM4 14c0-4 4-7 8-7s8 3 8 7"/>', baby: '<path d="M9 3h6v3H9zM8 6h8l1 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9z"/>',
  supp: '<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M12 9v6"/>'
};
const ic11 = (k, s = 22) => `<svg class="i11" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I11[k] || I11.info}</svg>`;
const fmtT11 = ts => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtD11 = ts => new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const r1x11 = v => Math.round((+v || 0) * 10) / 10;

/* ---------------- scan history ---------------- */
const scans11 = () => store.get('scans', []);
function recordScan11() {
  const m = location.hash.match(/^#\/product\/(\d{8,14})$/); if (!m) return; const flag = sessionStorage.getItem('lumi.scanned'); if (flag !== m[1]) return;
  const h1 = document.querySelector('#app .ph h1'); if (!h1) return; sessionStorage.removeItem('lumi.scanned');
  const b = document.querySelector('#app .ph .b'), sc = document.querySelector('#app .score10 .v b, #app .sline b');
  const L = scans11(); L.unshift({ id: 's' + Date.now().toString(36), code: m[1], ts: Date.now(), name: h1.textContent.trim(), brand: b ? b.textContent.split('·')[0].trim() : '', score: sc ? parseInt(sc.textContent, 10) : null, note: '', price: '' });
  store.set('scans', L.slice(0, 500));
}
function viewHistory11() {
  document.title = 'Scan history — Lumi'; const L = scans11(); const q = (sessionStorage.getItem('lumi.hq') || '').toLowerCase();
  const F = q ? L.filter(s => (s.name + ' ' + s.brand + ' ' + s.note + ' ' + s.code).toLowerCase().includes(q)) : L;
  const days = []; F.forEach(s => { const d = fmtD11(s.ts); let g = days.find(x => x.d === d); if (!g) days.push(g = { d, items: [] }); g.items.push(s); });
  app.innerHTML = `<section class="pg11"><header class="ph11"><span class="phi11">${ic11('clock', 26)}</span><div><h1>Scan history</h1><p class="lead">Every barcode you scan or type, with your in-store notes. Stored only on this device and works offline.</p></div></header>
  ${L.length ? `<label class="sr-only" for="hq">Filter scans</label><input id="hq" class="in11" type="search" placeholder="Filter by name, brand or note" value="${esc(q)}">` : ''}
  ${days.length ? days.map(g => `<h2 class="gh11">${esc(g.d)}</h2><ul class="grp11">${g.items.map(s => `<li class="hi11"><a href="#/product/${esc(s.code)}" class="hr11"><span class="sb11 ${s.score == null ? '' : s.score >= 75 ? 's-ex' : s.score >= 50 ? 's-gd' : s.score >= 25 ? 's-pr' : 's-bd'}">${s.score == null ? '–' : s.score}</span><span class="ht11"><b>${esc(s.name)}</b><small>${esc(s.brand || s.code)} · ${fmtT11(s.ts)}</small></span>${ic11('chev', 18)}</a>
    <div class="hn11"><label><span>Note</span><input data-note="${s.id}" value="${esc(s.note || '')}" placeholder="e.g. aisle 7, try next time" maxlength="140"></label><label class="pr11"><span>Price</span><input data-price="${s.id}" value="${esc(s.price || '')}" placeholder="$" inputmode="decimal" maxlength="12"></label><button class="icon sm" data-sdel="${s.id}" aria-label="Delete ${esc(s.name)} from history">${ic11('trash', 18)}</button></div></li>`).join('')}</ul>`).join('')
    : `<div class="empty11">${ic11('scan', 40)}<b>${L.length ? 'No matches' : 'No scans yet'}</b><p>${L.length ? 'Try another word.' : 'Scan a barcode in the store and it shows up here with the time. Add a note or price for next time.'}</p><button class="btn pri" data-scan>Scan a barcode</button></div>`}
  ${L.length ? `<div class="actions"><button class="btn" id="hclear">Clear history</button></div>` : ''}</section>`;
  const hq = $('#hq'); if (hq) hq.oninput = () => { sessionStorage.setItem('lumi.hq', hq.value); clearTimeout(hq._t); hq._t = setTimeout(() => { viewHistory11(); const n = $('#hq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); };
  const upd = (id, k, v) => store.set('scans', scans11().map(s => s.id === id ? Object.assign(s, { [k]: v.slice(0, k === 'note' ? 140 : 12) }) : s));
  app.querySelectorAll('[data-note]').forEach(i => i.onchange = () => { upd(i.dataset.note, 'note', i.value); toast('Note saved'); });
  app.querySelectorAll('[data-price]').forEach(i => i.onchange = () => { upd(i.dataset.price, 'price', i.value); toast('Price saved'); });
  app.querySelectorAll('[data-sdel]').forEach(b => b.onclick = () => { store.set('scans', scans11().filter(s => s.id !== b.dataset.sdel)); viewHistory11(); });
  const hc = $('#hclear'); if (hc) hc.onclick = () => { if (confirm('Clear all scan history on this device?')) { store.set('scans', []); viewHistory11(); } };
}

/* ---------------- Apple Health via Shortcuts ---------------- */
const SC_NAME = () => (settings().scName || 'Lumi to Health');
function healthURL11(t, label, ts) {
  const p = { carbs: r1x11(t.carbs), protein: r1x11(t.protein), fat: r1x11(t.fat), kcal: Math.round(t.kcal || 0), name: String(label || 'Lumi').slice(0, 60), date: new Date(ts || Date.now()).toISOString() };
  return `shortcuts://run-shortcut?name=${encodeURIComponent(SC_NAME())}&input=text&text=${encodeURIComponent(JSON.stringify(p))}`;
}
function viewHealth11() {
  document.title = 'Apple Health — Lumi'; const st = settings(); const ex = healthURL11({ carbs: 45, protein: 20, fat: 12, kcal: 380 }, 'Example');
  app.innerHTML = `<section class="pg11"><header class="ph11"><span class="phi11">${ic11('heart', 26)}</span><div><h1>Send meals to Apple Health</h1><p class="lead">Lumi can't write to Health directly from a web app. Instead, it opens an iOS Shortcut you build once; the Shortcut logs carbs, protein, fat and calories to Health.</p></div></header>
  <div class="card"><h2>How it works</h2><ol class="steps11"><li>On your Log, tap <b>Send to Health</b> on a meal.</li><li>Lumi opens <code>shortcuts://run-shortcut?name=${esc(SC_NAME())}&amp;input=text&amp;text=…</code> with the meal's totals as text.</li><li>Your Shortcut reads the numbers and saves them as Health samples. Nothing goes to Lumi or anyone else.</li></ol>
  <p class="small">Lumi sends: <code>{"carbs":45,"protein":20,"fat":12,"kcal":380,"name":"Lunch","date":"2026-10-20T17:30:00.000Z"}</code></p></div>
  <div class="card"><h2>Build the Shortcut (about 3 minutes, on your iPhone)</h2><p class="small">A ready-made iCloud link can't be created from here, so build it once by hand:</p>
  <ol class="steps11">
   <li>Open the <b>Shortcuts</b> app, tap <b>+</b>, and rename it <b>${esc(SC_NAME())}</b> (exact name, tap the name at the top to rename).</li>
   <li>Tap the <b>ⓘ</b> details button and turn on <b>Show in Share Sheet</b>, then set the input type to <b>Text</b> only. This makes the Shortcut accept the text Lumi sends.</li>
   <li>Add the action <b>Get Dictionary from Input</b>. Make sure its input is <b>Shortcut Input</b>.</li>
   <li>Add <b>Get Dictionary Value</b>: Get <b>Value</b> for key <code>carbs</code> in <b>Dictionary</b>.</li>
   <li>Add <b>Log Health Sample</b>: Type <b>Carbohydrates</b>, Value = <b>Dictionary Value</b>, unit <b>g</b>. (Optional: tap <b>Date</b> and choose another <b>Get Dictionary Value</b> for key <code>date</code> so the sample uses the meal time.)</li>
   <li>Repeat steps 4–5 for <code>protein</code> → <b>Protein</b> (g), <code>fat</code> → <b>Total Fat</b> (g), and <code>kcal</code> → <b>Dietary Energy</b> (kcal).</li>
   <li>Optional: add <b>Show Notification</b> “Logged to Health”.</li>
   <li>Tap <b>Done</b>. The first time it runs, iOS asks for Health permission for each type. Tap <b>Allow</b>.</li>
  </ol>
  <p class="small">Tip: if you already log carbs in Omnipod or another app that writes to Health, you may want to skip carbs here to avoid counting them twice.</p></div>
  <div class="card"><h2>Settings</h2><label class="fl11"><span>Shortcut name</span><input id="scn" class="in11" value="${esc(st.scName || 'Lumi to Health')}" maxlength="60"></label>
  <div class="actions"><button class="btn" id="scsave">Save name</button><a class="btn pri" id="sctest" href="${esc(ex)}">Test with an example</a></div><p class="small">The test sends 45 g carbs, 20 g protein, 12 g fat, 380 kcal labeled "Example". Delete those samples in Health afterwards if you run it.</p></div>
  <p class="foot">Lumi never sends insulin or dose data to Health.</p></section>`;
  $('#scsave').onclick = () => { const s = settings(); s.scName = $('#scn').value.trim() || 'Lumi to Health'; store.set('settings', s); toast('Saved'); viewHealth11(); };
}

/* ---------------- glucose (CGM) ---------------- */
const cgm11 = () => store.get('cgm', null);
function parseClarity11(txt) {
  const rows = parseCSV(txt); if (!rows.length) throw new Error('Empty file');
  const hi = rows.findIndex(r => r.some(c => /glucose value/i.test(c))); if (hi < 0) throw new Error('This does not look like a Dexcom Clarity export (no "Glucose Value" column).');
  const H = rows[hi], ti = H.findIndex(c => /^timestamp/i.test(c)), gi = H.findIndex(c => /glucose value/i.test(c)), ei = H.findIndex(c => /^event type/i.test(c));
  const mmol = /mmol/i.test(H[gi]); const pts = []; let lowhi = 0;
  for (const r of rows.slice(hi + 1)) {
    if (ei >= 0 && r[ei] && !/^egv$/i.test(r[ei])) continue; const t = Date.parse((r[ti] || '').replace(' ', 'T')); const raw = (r[gi] || '').trim();
    if (!t || !raw) continue; if (/low|high/i.test(raw)) { lowhi++; continue; }
    const v = parseFloat(raw); if (!isFinite(v)) continue; pts.push([t, Math.round(mmol ? v * 18.016 : v)]);
  }
  if (!pts.length) throw new Error('No glucose readings found in that file.');
  pts.sort((a, b) => a[0] - b[0]); return { pts, lowhi };
}
function mergeCGM11(pts, src, extra) {
  const cur = cgm11(); const m = new Map((cur && cur.src === src ? cur.pts : []).map(p => [p[0], p[1]])); pts.forEach(p => m.set(p[0], p[1]));
  const all = [...m.entries()].sort((a, b) => a[0] - b[0]).filter(p => p[0] > Date.now() - 120 * 864e5); // keep 120 days
  store.set('cgm', Object.assign({ src, imported: Date.now(), pts: all }, extra || {}));
  return all.length;
}
function postMeal11(ts) {
  const c = cgm11(); if (!c || !c.pts) return null; const a = ts - 15 * 6e4, b = ts + 3 * 36e5; const P = c.pts.filter(p => p[0] >= a && p[0] <= b);
  if (P.length < 6 || P[P.length - 1][0] < ts + 90 * 6e4) return null; return { P, c };
}
function chart11(ts) {
  const r = postMeal11(ts); if (!r) return ''; const { P, c } = r; const W = 320, H = 140, x = t => 30 + (t - (ts - 15 * 6e4)) / (195 * 6e4) * (W - 40), lo = 40, hi = Math.max(250, ...P.map(p => p[1]) ) + 10, y = v => H - 18 - (v - lo) / (hi - lo) * (H - 30);
  const start = P.reduce((b, p) => Math.abs(p[0] - ts) < Math.abs(b[0] - ts) ? p : b, P[0]); const peak = P.filter(p => p[0] >= ts).reduce((b, p) => p[1] > b[1] ? p : b, start);
  const at = m => { const t = ts + m * 6e4; const q = P.reduce((b, p) => Math.abs(p[0] - t) < Math.abs(b[0] - t) ? p : b, P[0]); return Math.abs(q[0] - t) <= 10 * 6e4 ? q[1] : null; };
  const v2 = at(120), v3 = at(180); const rise = peak[1] - start[1];
  const path = P.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join(' ');
  const desc = `Glucose ${start[1]} mg/dL at the meal, peak ${peak[1]} mg/dL about ${Math.round((peak[0] - ts) / 6e4)} minutes later (${rise >= 0 ? '+' : ''}${rise})${v2 != null ? `, ${v2} at 2 hours` : ''}${v3 != null ? `, ${v3} at 3 hours` : ''}.`;
  const srcL = c.src === 'clarity' ? `Dexcom Clarity export you imported ${new Date(c.imported).toLocaleDateString()}` : c.src === 'api-sandbox' ? 'Dexcom API SANDBOX (simulated data, not yours)' : 'Your Dexcom account via the Dexcom API';
  return `<figure class="gc11"><figcaption><b>Glucose after this meal</b><small>${esc(desc)}</small></figcaption>
   <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(desc)}"><rect x="30" y="${y(180).toFixed(1)}" width="${W - 40}" height="${(y(70) - y(180)).toFixed(1)}" class="band"/>
   ${[70, 180].map(v => `<text x="26" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('')}
   <line x1="${x(ts).toFixed(1)}" x2="${x(ts).toFixed(1)}" y1="6" y2="${H - 18}" class="meal"/>
   ${[0, 60, 120, 180].map(m => `<text x="${x(ts + m * 6e4).toFixed(1)}" y="${H - 4}" text-anchor="middle">${m ? m / 60 + 'h' : 'meal'}</text>`).join('')}
   <path d="${path}" class="ln"/><circle cx="${x(peak[0]).toFixed(1)}" cy="${y(peak[1]).toFixed(1)}" r="3.5" class="pk"/></svg>
   <small class="gsrc">Source: ${esc(srcL)}. Readings as recorded; Low/High values are not plotted. Informational only. Not for treatment decisions.</small></figure>`;
}
function viewGlucose11(arg) {
  document.title = 'Glucose — Lumi'; const c = cgm11(); const st = settings();
  const span = c && c.pts.length ? `${c.pts.length.toLocaleString()} readings, ${new Date(c.pts[0][0]).toLocaleDateString()} – ${new Date(c.pts[c.pts.length - 1][0]).toLocaleDateString()}` : '';
  app.innerHTML = `<section class="pg11"><header class="ph11"><span class="phi11">${ic11('drop', 26)}</span><div><h1>Glucose after meals</h1><p class="lead">See your Dexcom readings for the 3 hours after each logged meal. Lumi only shows readings you bring in, never estimates or made-up curves.</p></div></header>
  <div class="card"><h2>Status</h2>${c ? `<p><b>${c.src === 'clarity' ? 'Dexcom Clarity export' : c.src === 'api-sandbox' ? 'Dexcom API sandbox (simulated data)' : 'Dexcom API'}</b><br><span class="small">${esc(span)}. Last update ${new Date(c.imported).toLocaleString()}.</span></p><div class="actions"><a class="btn" href="#/log">See it on your Log</a><button class="btn" id="cgmdel">Remove glucose data</button></div>` : `<p class="small">No glucose data yet. Import a Clarity export below.</p>`}</div>
  <div class="card"><h2>Import a Dexcom Clarity CSV</h2><ol class="steps11"><li>On a computer, open <a class="lnk" href="https://clarity.dexcom.com" target="_blank" rel="noopener">clarity.dexcom.com</a> and sign in.</li><li>Pick a date range, then choose <b>Export</b> (the share/download icon at the top) to download a CSV.</li><li>Open Lumi on that device (or AirDrop the file to your iPhone) and choose the file here.</li></ol>
   <label class="btn pri" for="cgmf">Choose Clarity CSV…</label><input type="file" id="cgmf" accept=".csv,text/csv" hidden><p class="small" id="cgmmsg" role="status"></p></div>
  <p class="foot">Dexcom data is informational only. Make treatment decisions from your Dexcom app and your care team.</p></section>`;
  $('#cgmf').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const { pts, lowhi } = parseClarity11(t); const n = mergeCGM11(pts, 'clarity'); $('#cgmmsg').textContent = `Imported ${pts.length.toLocaleString()} readings (${n.toLocaleString()} stored).${lowhi ? ` ${lowhi} Low/High readings skipped.` : ''}`; setTimeout(() => viewGlucose11(), 1200); } catch (err) { $('#cgmmsg').textContent = err.message; } }); };
  const d = $('#cgmdel'); if (d) d.onclick = () => { if (confirm('Remove all glucose readings from this device?')) { store.set('cgm', null); viewGlucose11(); } };
}

/* ---------------- sharing (no backend) ---------------- */
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function pack11(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'function') { try { const buf = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(); const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return 'z' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch {} }
  let s = ''; for (let i = 0; i < raw.length; i += 8192) s += String.fromCharCode(...raw.subarray(i, i + 8192)); return 'j' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unpack11(code) {
  code = String(code || '').trim().replace(/^.*#\/share\//, ''); const k = code[0], body = unb64u(code.slice(1));
  let txt; if (k === 'z') txt = await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); else if (k === 'j') txt = new TextDecoder().decode(body); else throw new Error('Unknown code');
  const o = JSON.parse(txt); if (!o || o.app !== 'lumi' || !['list', 'meal', 'recipe'].includes(o.t)) throw new Error('Not a Lumi share code'); return o;
}
const slimItem = it => { const o = {}; ['pid', 'id', 'name', 'brand', 'grams', 'label', 'n', 'score', 'cs', 'h', 'done', 'img'].forEach(k => { if (it[k] != null) o[k] = it[k]; }); return o; };
async function share11(kind, obj) {
  const payload = { app: 'lumi', v: 1, t: kind, name: obj.name, items: (obj.items || []).map(slimItem) }; if (kind === 'recipe') payload.s = obj.servings;
  const code = await pack11(payload); const url = location.origin + location.pathname + '#/share/' + code;
  sheet(`<div class="sh11"><h2>Share “${esc(obj.name)}”</h2><p class="small">Anyone who opens this link (or pastes the code in Lumi › Settings › Import a shared code) gets a copy. It's a one-time copy: later changes don't sync either way. The data is inside the link itself, so share it only with people you trust.</p>
   <label class="fl11"><span>Link</span><textarea class="in11" rows="3" readonly id="shu">${esc(url)}</textarea></label>
   <div class="actions">${navigator.share ? '<button class="btn pri" id="shn">Share…</button>' : ''}<button class="btn" id="shc">Copy link</button><button class="btn" id="shk">Copy code only</button><button class="btn" id="shx">Close</button></div></div>`);
  const cp = t => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied'), () => { $('#shu').select(); toast('Select and copy the text'); });
  const n = $('#shn'); if (n) n.onclick = () => navigator.share({ title: 'Lumi: ' + obj.name, url }).catch(() => {});
  $('#shc').onclick = () => cp(url); $('#shk').onclick = () => cp(code); $('#shx').onclick = closeSheet;
}
async function viewShare11(arg) {
  document.title = 'Import shared — Lumi';
  const head = `<header class="ph11"><span class="phi11">${ic11('share', 26)}</span><div><h1>Import from family</h1><p class="lead">Open a Lumi share link, or paste a share code. You get your own copy; it won't sync back.</p></div></header>`;
  if (!arg) { app.innerHTML = `<section class="pg11">${head}<div class="card"><label class="fl11"><span>Share code or link</span><textarea id="shin" class="in11" rows="4" placeholder="Paste here"></textarea></label><div class="actions"><button class="btn pri" id="shgo">Preview</button></div><p class="small" id="shm" role="status"></p></div></section>`;
    $('#shgo').onclick = () => { const v = $('#shin').value.trim(); if (!v) return; location.hash = '#/share/' + v.replace(/^.*#\/share\//, ''); }; return; }
  let o; try { o = await unpack11(arg); } catch (e) { app.innerHTML = `<section class="pg11">${head}<div class="card"><p><b>That code couldn't be read.</b></p><p class="small">${esc(e.message)}. Ask for a new link.</p><a class="btn" href="#/share">Paste a code</a></div></section>`; return; }
  const tot = o.t !== 'list' ? totals(o.items) : null;
  app.innerHTML = `<section class="pg11">${head}<div class="card"><p class="small">${o.t === 'list' ? 'Shopping list' : o.t === 'recipe' ? `Recipe · ${o.s || 1} servings` : 'Saved meal'}</p><h2>${esc(o.name || 'Shared')}</h2>
   <ul class="grp11 flat">${o.items.slice(0, 50).map(i => `<li class="hr11"><span class="ht11"><b>${esc(i.name || '')}</b><small>${esc([i.brand, i.label].filter(Boolean).join(' · '))}</small></span></li>`).join('')}</ul>
   ${tot ? `<p class="small">${Math.round(tot.carbs)} g carbs · ${Math.round(tot.kcal)} Cal total, from the original foods' label data.</p>` : ''}
   <div class="actions"><button class="btn pri" id="shimp">Import ${o.t}</button><a class="btn" href="#/">Cancel</a></div></div></section>`;
  $('#shimp').onclick = () => {
    if (o.t === 'list') { const L = lists(); const id = 'l' + Date.now().toString(36); L.unshift({ id, name: (o.name || 'Shared list') + ' (shared)', items: o.items.map(i => Object.assign({ done: false, t: Date.now() }, i)), t: Date.now() }); setLists(L); toast('List imported'); location.hash = '#/list/' + id; }
    else if (o.t === 'recipe') { const id = 'r' + Date.now().toString(36); const L = store.get('recipes', []); L.unshift({ id, name: (o.name || 'Shared recipe') + ' (shared)', servings: o.s || 1, items: o.items, t: Date.now() }); store.set('recipes', L); toast('Recipe imported'); location.hash = '#/recipe/' + id; }
    else { const ms = savedMeals(); ms.unshift({ id: 'm' + Date.now().toString(36), name: (o.name || 'Shared meal') + ' (shared)', items: o.items }); store.set('meals', ms); toast('Meal imported'); location.hash = '#/meals'; }
  };
}

/* ---------------- page layouts ---------------- */
const MEAL_IC = { breakfast: 'sun', lunch: 'plate', dinner: 'plate', snack: 'heart' };
function layoutLog11(arg) {
  if (arg === 'week' || /^report/.test(arg || '')) { app.classList.add('logw11'); return; }
  app.classList.add('log11'); const st = settings(); const dk = arg && /^\d{4}-\d\d-\d\d$/.test(arg) ? arg : dayKey(new Date());
  const entries = LOG.all().filter(e => dayKey(e.ts) === dk);
  // timeline: meal cards get an icon, time, Health + glucose actions
  app.querySelectorAll('.card.meal').forEach((c, i) => {
    const m = MEALS[i]; const es = entries.filter(e => e.meal === m).sort((a, b) => a.ts - b.ts); c.classList.add('tl11'); c.dataset.meal = m;
    const h = c.querySelector('.fx-h h2'); if (h && !h.querySelector('.i11')) h.insertAdjacentHTML('afterbegin', `<span class="mi11">${ic11(MEAL_IC[m] || 'plate', 18)}</span>`);
    if (!es.length) { c.classList.add('empty'); return; }
    const t = totals(es); const btns = c.querySelector('.row-btns') || (() => { const d = document.createElement('div'); d.className = 'row-btns'; c.append(d); return d; })();
    btns.insertAdjacentHTML('beforeend', `<a class="chip hk11" href="${esc(healthURL11(t, MEAL_L[m], es[0].ts))}" title="Runs your “${esc(SC_NAME())}” Shortcut">${ic11('heart', 16)} Send to Health</a>`);
    const ch = chart11(es[0].ts); if (ch) { btns.insertAdjacentHTML('beforeend', `<button class="chip" data-gc="${m}" aria-expanded="false">${ic11('drop', 16)} Glucose after</button>`); c.insertAdjacentHTML('beforeend', `<div class="gcw11" hidden>${ch}</div>`); }
  });
  app.querySelectorAll('[data-gc]').forEach(b => b.onclick = () => { const w = b.closest('.card').querySelector('.gcw11'); w.hidden = !w.hidden; b.setAttribute('aria-expanded', String(!w.hidden)); });
  // glucose hint + group secondary cards
  const cards = [...app.querySelectorAll(':scope > .card')]; const exp = cards.find(c => /Export \/ import/.test(c.textContent)); const qa = cards.find(c => /Quick add/.test((c.querySelector('h2') || {}).textContent || ''));
  if (!cgm11() && !app.querySelector('.gh11x')) { const tg = app.querySelector('.card.today'); if (tg) tg.insertAdjacentHTML('afterend', `<a class="card gh11x" href="#/glucose">${ic11('drop', 22)}<span><b>See glucose after meals</b><small>Import a Dexcom Clarity export to chart 3 hours after each meal.</small></span>${ic11('chev', 18)}</a>`); }
  if (exp && exp.tagName !== 'DETAILS') { const d = document.createElement('details'); d.className = 'card exp11'; d.innerHTML = '<summary><h2>Export, import and backup</h2></summary>'; [...exp.childNodes].forEach(n => { if (!(n.tagName === 'H2')) d.append(n); }); exp.replaceWith(d); }
  if (qa) qa.classList.add('qa11');
}
function emptyArt11(kind) { // replace mascot empties with icon art
  app.querySelectorAll('.card.empty').forEach(e => { if (e.dataset.e11) return; e.dataset.e11 = 1; const m = e.querySelector('img.mascot'); if (m) m.outerHTML = `<span class="ea11">${ic11(kind, 40)}</span>`; e.classList.add('empty11c'); });
}
function decorateLists11() { app.classList.add('lists11'); emptyArt11('cart'); }
function decorateList11(id) {
  app.classList.add('list11'); const l = lists().find(x => x.id === id); if (!l || app.querySelector('#shl11')) return;
  const h = app.querySelector('h1'); if (h) h.insertAdjacentHTML('afterend', `<div class="tb11"><button class="chip" id="shl11">${ic11('share', 16)} Share with family</button></div>`);
  $('#shl11').onclick = () => share11('list', l);
}
function decorateMeals11() {
  app.classList.add('meals11'); emptyArt11('plate');
  app.querySelectorAll('[data-del9]').forEach(b => { const id = b.dataset.del9; if (b.parentNode.querySelector(`[data-shm="${id}"]`)) return; b.insertAdjacentHTML('beforebegin', `<button class="chip" data-shm="${id}">${ic11('share', 16)} Share</button>`); });
  app.querySelectorAll('[data-shm]').forEach(b => b.onclick = () => { const m = savedMeals().find(x => x.id === b.dataset.shm); if (m) share11('meal', m); });
  const h = app.querySelector('h1'); if (h && !app.querySelector('.tb11')) h.insertAdjacentHTML('afterend', `<div class="tb11"><a class="chip" href="#/share">${ic11('share', 16)} Import a shared meal</a></div>`);
}
function decorateSettings11() {
  app.classList.add('set11'); if (app.querySelector('.hub11')) return;
  const rows = [['#/applehealth', 'heart', 'Apple Health', 'Send meals via an iOS Shortcut'], ['#/glucose', 'drop', 'Dexcom glucose', cgm11() ? 'Glucose data on this device' : 'Import a Clarity CSV'], ['#/history', 'clock', 'Scan history', `${scans11().length} scans saved`], ['#/share', 'share', 'Import a shared code', 'Lists and meals from family'], ['#/meals', 'plate', 'Saved meals', `${savedMeals().length} saved`], ['#/whatsnew', 'info', "What's new", 'Lumi ' + VERSION]];
  const h = app.querySelector('h1'); if (h) h.insertAdjacentHTML('afterend', `<ul class="hub11 grp11">${rows.map(([u, i, t, s]) => `<li><a class="hr11" href="${u}"><span class="hic11">${ic11(i, 20)}</span><span class="ht11"><b>${t}</b><small>${esc(s)}</small></span>${ic11('chev', 18)}</a></li>`).join('')}</ul><h2 class="gh11">Carbs, targets and estimates</h2>`);
}
const AISLE_IC = [[/produce/i, 'produce'], [/meat|seafood/i, 'meat'], [/dairy|egg/i, 'dairy'], [/bakery|bread/i, 'bakery'], [/frozen/i, 'frozen'], [/pantry/i, 'pantry'], [/snack/i, 'snacks'], [/beverage|drink/i, 'bev'], [/breakfast|cereal/i, 'breakfast'], [/condiment|sauce/i, 'sauce'], [/baking/i, 'baking'], [/canned/i, 'canned'], [/deli/i, 'deli'], [/baby/i, 'baby'], [/supplement|powder/i, 'supp']];
function aisleIcons11() {
  document.querySelectorAll('#app .aisle').forEach(a => { if (a.dataset.i11) return; a.dataset.i11 = 1; const t = a.textContent; const k = (AISLE_IC.find(([r]) => r.test(t)) || [0, 'pantry'])[1];
    const tw = document.createTreeWalker(a, NodeFilter.SHOW_TEXT); let n; const kill = []; while ((n = tw.nextNode())) if (/\p{Extended_Pictographic}/u.test(n.nodeValue)) kill.push(n);
    kill.forEach(n => { const p = n.parentNode; n.nodeValue = n.nodeValue.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim(); if (p !== a && !p.textContent.trim()) p.remove(); });
    a.insertAdjacentHTML('afterbegin', `<span class="ai11">${ic11(k, 26)}</span>`); });
}

/* ---------------- wrap existing views ---------------- */
(function () {
  const W = (name, after) => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function (...a) { const r = f.apply(this, a); const go = () => { try { after(...a); } catch (e) { console.warn('v11', name, e); } }; if (r && typeof r.then === 'function') r.then(go); else go(); return r; }; };
  W('viewLog', a => layoutLog11(a)); W('viewLists', () => decorateLists11()); W('viewList', id => decorateList11(id)); W('viewMeals9', () => decorateMeals11());
  W('viewSettings', () => decorateSettings11()); W('viewCompare', () => { app.classList.add('cmp11'); emptyArt11('compare'); }); W('viewMeal', () => { app.classList.add('meal11'); emptyArt11('plate'); });
  W('viewReport', () => app.classList.add('logw11'));
  const mo = new MutationObserver(() => { recordScan11(); aisleIcons11(); }); const a0 = document.getElementById('app'); if (a0) mo.observe(a0, { childList: true, subtree: true }); else addEventListener('DOMContentLoaded', () => mo.observe(document.getElementById('app'), { childList: true, subtree: true }));
  addEventListener('DOMContentLoaded', () => { recordScan11(); aisleIcons11(); });
  addEventListener('hashchange', () => { const a = document.getElementById('app'); if (a) a.classList.remove('log11', 'logw11', 'lists11', 'list11', 'meals11', 'set11', 'cmp11', 'meal11'); });
})();
