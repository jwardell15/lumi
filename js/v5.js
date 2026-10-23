/* ---------- v5.1 dual ratings ---------- */
const HLTH = window.LumiHealth;
const PRIM = () => (store.get('settings', {}).primary === 'carb' ? 'carb' : 'health'); // 17.0: health leads by default
const HB = s => s == null ? 'na' : s >= 75 ? 'ex' : s >= 50 ? 'gd' : s >= 25 ? 'pr' : 'bd';
const HL = s => s == null ? 'Not rated' : s >= 75 ? 'Excellent' : s >= 50 ? 'Good' : s >= 25 ? 'Poor' : 'Bad';
const sortKey = sort => sort === 'health' ? 'h' : sort === 'score' || sort === 'carb' ? 'score' : (PRIM() === 'health' ? 'h' : 'score');
const _hr = new WeakMap();
function HR(p) { if (!p) return { score: null, est: [], neg: [], pos: [], adds: [], reason: 'No data' }; if (_hr.has(p)) return _hr.get(p);
  const x = p.hx || {}; const r = HLTH.rate(p, { organic: !!(x.o || p.organic || /\borganic\b/i.test(p.name || '')), fvl: x.fv != null ? x.fv : (p.fvl ?? null), whole: !!x.w || p.src === 'whole', group: x.g || '' }); _hr.set(p, r); return r; }
/* Lumi v5: mascot, compare, meal builder (plate), scan/viewed history, did-you-mean, haptics. Uses globals from app.js/log.js at call time. */
const MASCOT = (size = 64, cls = '') => `<img class="mascot ${cls}" src="icons/mascot-${size <= 64 ? 128 : size <= 128 ? 256 : 512}.png" width="${size}" height="${size}" alt="" decoding="async">`;
// Reaction: mascot with a tinted badge (happy for Good/Excellent, concerned for Poor/Bad)
function mascotReact(score) {
  if (score == null) return '';
  const b = S.band(score), hp = PRIM() === 'health', good = b === 'ex' || b === 'gd';
  const msg = b === 'ex' ? 'Great pick!' : b === 'gd' ? 'Good choice' : b === 'pr' ? (hp ? 'Hmm, not the healthiest' : 'Hmm, watch the carbs') : (hp ? 'Careful, low health rating' : 'Careful, this one spikes');
  return `<div class="react react-${good ? 'ok' : 'warn'}">${MASCOT(44)}<span class="rb">${good ? '♥' : '!'}</span><span class="rt">${msg}</span></div>`;
}
const haptic = (ms = 8) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };
document.addEventListener('pointerdown', e => { const b = e.target.closest('.btn,.chip,.row,.swap,.tabbar a,.tab-scan,.sbtn'); if (b) { b.classList.add('press'); haptic(6); setTimeout(() => b.classList.remove('press'), 160); } }, { passive: true });

/* ---------- history (viewed + scanned) ---------- */
function pushHist(key, p, max = 30) {
  if (!p || !p.id) return; const s = S.score(p);
  const l = store.get(key, []).filter(x => x.id !== p.id);
  l.unshift({ id: p.id, code: p.code || '', name: p.name, brand: p.brand || '', img: p.img || '', score: s.score, net: s.net == null ? null : Math.round(s.net), src: p.src, ts: Date.now() });
  store.set(key, l.slice(0, max)); if (typeof remember === 'function') remember(p);
}
const histItems = key => store.get(key, []).map(x => ({ id: x.id, code: x.code, name: x.name, brand: x.brand, img: x.img, score: x.score, net: x.net, src: x.src === 'chain' ? 'rest' : x.src, keys: [], cat: '' }));

/* ---------- compare ---------- */
const cmpIds = () => store.get('compare', []);
function toggleCompare(p) {
  let l = cmpIds(); remember(p); memo.set(p.id, p);
  if (l.includes(p.id)) l = l.filter(x => x !== p.id); else { if (l.length >= 3) l.shift(); l.push(p.id); }
  store.set('compare', l); haptic(12); drawCmpTray(); return l.includes(p.id);
}
function drawCmpTray() {
  let t = $('#cmpTray'); const l = cmpIds();
  if (!t) { t = document.createElement('a'); t.id = 'cmpTray'; t.className = 'cmp-tray'; t.href = '#/compare'; document.body.appendChild(t); }
  const on = l.length >= 2 && !/^#\/compare/.test(location.hash); document.body.classList.toggle('has-tray', on);
  t.classList.toggle('on', on); t.innerHTML = `<span class="cnt">${l.length}</span> Compare${l.length < 2 ? ' · add one more' : ' now'} ›`;
}
async function viewCompare() {
  document.title = 'Compare — Lumi';
  const ids = cmpIds();
  if (!ids.length) { app.innerHTML = `<h1>Compare</h1><div class="card empty">${MASCOT(96, 'big')}<b>Nothing to compare yet</b>Open any product and tap <b>⇆ Compare</b>. Add 2–3 items to see them side by side.<div class="actions" style="justify-content:center"><a class="btn pri" href="#/">Find foods</a></div></div>`; return; }
  app.innerHTML = `<h1>Compare</h1><div class="card">${'<div class="sk skl" style="height:36px;margin:8px 0"></div>'.repeat(6)}</div>`;
  const ps = (await Promise.all(ids.map(id => resolveProduct(id).catch(() => null)))).filter(Boolean);
  if (!/^#\/compare/.test(location.hash)) return;
  const mode = store.get('cmpMode', 'common'); const isItem = p => !!(p.meta && p.meta.perItem);
  const p0 = ps.find(p => !isItem(p)); const common = p0 && p0.servQ ? Math.round(p0.servQ) : 100; const cu = p0 && p0.liquid ? 'ml' : 'g';
  const rows = ps.map(p => { const s = S.score(p); const h = HR(p); const lab = p.servQ || (isItem(p) ? 100 : null); const g = mode === 'label' ? lab : isItem(p) ? 100 : common; const per = g ? scale(per100(p), g) : null; return { p, s, h, g, per, n: per100(p) }; });
  const best = (f, low) => { const v = rows.map(f).filter(x => x != null); if (v.length < 2) return null; return low ? Math.min(...v) : Math.max(...v); };
  const line = (lab, f, fmt, low) => { const b = best(f, low); return `<tr><td>${lab}</td>${rows.map(r => { const v = f(r); return `<td class="${v != null && v === b ? 'win' : ''}">${v == null ? '—' : fmt(v)}</td>`; }).join('')}</tr>`; };
  const g = v => r1(v) + ' g', mg = v => Math.round(v) + ' mg', k = v => Math.round(v);
  const note = mode === 'label' ? 'Each column uses its own labeled serving, so the amounts differ.' : `Every column uses the same portion: <b>${common} ${cu}</b>${ps.some(isItem) ? ' (restaurant items stay at 1 item, because their data is per item)' : ''}.`;
  app.innerHTML = `<h1>Compare</h1><p class="lead">Best value in each row is highlighted.</p>
  <div class="seg wide" id="cmpMode"><button data-m="common" class="${mode === 'common' ? 'on' : ''}">Same portion (${common} ${cu})</button><button data-m="label" class="${mode === 'label' ? 'on' : ''}">As labeled</button></div><p class="small" id="cmpNote">${note}</p>
  <div class="card cmp"><table class="cmpt"><tr><th></th>${rows.map(r => `<th><a href="#/product/${esc(r.p.id)}">${thumb(r.p.img, r.p.name, [], r.p.cat)}<span class="cn">${esc(r.p.name)}</span><small>${esc(r.p.brand || '')}</small></a><button class="x" data-rm="${esc(r.p.id)}" aria-label="Remove">✕</button></th>`).join('')}</tr>
  ${[['Carb score', line('Carb score', r => r.s.score, v => `<span class="pill bg-${S.band(v)}">${v}</span>`)], ['Health', line('Health rating', r => r.h.score, v => `<span class="pill bg-${HB(v)}">${v}</span> <small>${HL(v)}</small>`)]].sort((a, b) => (PRIM() === 'health') === (a[0] === 'Health') ? -1 : 1).map(x => x[1]).join('')}
  <tr><td>Additives</td>${rows.map(r => { const a = r.h.adds.filter(x => x.tier >= 1); return `<td>${r.h.basis !== 'full' ? '<small>unknown</small>' : a.length ? a.map(x => `<span class="adot bg-${['ex', 'gd', 'pr', 'bd'][x.tier]}"></span>`).join('') + ' ' + a.length : '0'}</td>`; }).join('')}</tr>
  <tr class="sub"><td colspan="${rows.length + 1}">${mode === 'label' ? 'Per labeled serving' : `Per ${common} ${cu} portion`}</td></tr>
  <tr><td>Portion</td>${rows.map(r => `<td>${r.g ? esc(isItem(r.p) ? '1 item' : mode === 'label' ? (r.p.serv || r.g + ' g') : r.g + ' ' + (r.p.liquid ? 'ml' : 'g')) : '—'}</td>`).join('')}</tr>
  ${line('Total carbs', r => r.per && r.per.carbs, g, 1)}${line('Total sugar', r => r.per && r.per.sugars, g, 1)}${line('Added sugar', r => r.per && r.per.added, g, 1)}${line('Fiber', r => r.per && r.per.fiber, g)}${line('Protein', r => r.per && r.per.protein, g)}${line('Calories', r => r.per && r.per.kcal, k, 1)}
  <tr class="sub"><td colspan="${rows.length + 1}">Per 100 g / item</td></tr>
  ${line('Total carbs', r => r.n.carbs, g, 1)}${line('Total sugar', r => r.n.sugars, g, 1)}${line('Added sugar', r => r.n.added, g, 1)}${line('Fiber', r => r.n.fiber, g)}${line('Protein', r => r.n.protein, g)}${line('Fat', r => r.n.fat, g, 1)}${line('Sat. fat', r => r.n.sat, g, 1)}${line('Sodium', r => r.n.sodiumMg, mg, 1)}${line('Calories', r => r.n.kcal, k, 1)}
  </table></div>
  <div class="actions"><a class="btn" href="#/">＋ Add another</a><button class="btn" id="cmpClr">Clear all</button></div>
  <p class="foot">Informational only — not medical advice.</p>`;
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { store.set('compare', cmpIds().filter(x => x !== b.dataset.rm)); viewCompare(); });
  $('#cmpClr').onclick = () => { store.set('compare', []); viewCompare(); };
  document.querySelectorAll('#cmpMode button').forEach(b => b.onclick = () => { store.set('cmpMode', b.dataset.m); viewCompare(); });
}

/* ---------- meal builder (plate) ---------- */
const plate = () => store.get('plate', []);
function addToPlate(p, grams, label) {
  remember(p); const l = plate(); l.push({ k: Date.now().toString(36), id: p.id, name: p.name, brand: p.brand || '', grams, label, n: per100(p), cs: S.score(p).score, h: HR(p).score, perItem: !!(p.meta && p.meta.perItem), liquid: !!p.liquid });
  store.set('plate', l); haptic(15); toast(`Added to plate · ${l.length} item${l.length > 1 ? 's' : ''}`);
}
function plateAvg(l) { const av = k => { let w = 0, t = 0; l.forEach(x => { if (x[k] != null) { w += x.grams; t += x[k] * x.grams; } }); return w ? Math.round(t / w) : null; };
  const c = av('cs'), h = av('h'); if (c == null && h == null) return '';
  return `<div class="pavg small">Plate average (by weight): <span class="b2"><i class="bg-${HB(h)}"></i>Health ${h ?? '?'} ${h == null ? '' : HL(h)}</span> <span class="b2"><i class="bg-${S.band(c)}"></i>Carb ${c ?? '?'}</span></div>`; }
function viewMeal() {
  document.title = 'Meal builder — Lumi';
  const l = plate(), st = settings();
  const t = totals(l.map(x => ({ n: x.n, grams: x.grams })));
  const icr = st.icr > 0 ? (() => { const base = st.icrBasis === 'net' ? t.net : t.carbs; return `<div class="icr"><b>${r1(base)} g ${st.icrBasis === 'net' ? 'net' : 'total'} carbs ÷ your 1:${r1(st.icr)} ratio = ${r1(base / st.icr)} units</b><small>Estimate only, confirm on your pump.</small></div>`; })() : '';
  app.innerHTML = `<h1>Meal builder</h1><p class="lead">Build a plate from several foods and see the totals.</p>
  ${l.length ? `<div class="card plate-tot"><div class="pt-big"><b>${Math.round(t.carbs)}</b><span>g carbs</span></div>${plateAvg(l)}<div class="tot">${['net', 'sugars', 'fiber', 'protein', 'fat', 'kcal'].map(k => `<div><small>${NL[k]}</small><b>${fmtN(k, t[k])}</b></div>`).join('')}</div></div>${icr}
  <div class="card"><h2>On the plate</h2><ul class="loglist">${l.map(x => { const c = x.n.carbs == null ? null : x.n.carbs * x.grams / 100; return `<li><div class="t"><b>${esc(x.name)}</b><small>${esc(x.brand)}</small>${x.cs !== undefined ? `<span class="pills">${pills({ score: x.cs, h: x.h })}</span>` : ''}</div>
    <div class="qty sm"><button data-pm="${x.k}" data-d="-1" aria-label="Less">−</button><span class="pq">${x.perItem ? r1(x.grams / 100) + ' item' : Math.round(x.grams) + (x.liquid ? ' ml' : ' g')}</span><button data-pm="${x.k}" data-d="1" aria-label="More">+</button></div>
    <span class="v">${c == null ? '—' : r1(c) + 'g'}</span><button class="icon sm" data-del="${x.k}" aria-label="Remove">✕</button></li>`; }).join('')}</ul></div>
  <div class="actions"><button class="btn pri" id="plateLog">＋ Log this meal</button><a class="btn" href="#/">＋ Add food</a><button class="btn" id="plateClr">Clear</button></div>`
  : `<div class="card empty">${MASCOT(96, 'big')}<b>Your plate is empty</b>On any product, pick a portion and tap <b>🍽 Add to plate</b>.<div class="actions" style="justify-content:center"><a class="btn pri" href="#/">Find foods</a></div></div>`}
  <p class="foot">Informational only — not medical advice. No correction-dose math.</p>`;
  document.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { const l2 = plate(); const x = l2.find(y => y.k === b.dataset.pm); const step = x.perItem ? 50 : x.grams >= 100 ? 25 : 10; x.grams = Math.max(step, x.grams + step * +b.dataset.d); store.set('plate', l2); haptic(); viewMeal(); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { store.set('plate', plate().filter(y => y.k !== b.dataset.del)); viewMeal(); });
  if ($('#plateClr')) $('#plateClr').onclick = () => { store.set('plate', []); viewMeal(); };
  if ($('#plateLog')) $('#plateLog').onclick = () => {
    const now = new Date();
    sheet(`<h2>Log this meal</h2><div class="small" style="margin-bottom:10px">${l.length} items · <b>${Math.round(t.carbs)} g carbs</b></div><div class="seg wide" id="mealSeg">${MEALS.map(m => `<button type="button" data-m="${m}" class="${m === mealFor(now) ? 'on' : ''}">${MEAL_L[m]}</button>`).join('')}</div><div class="actions"><button class="btn" id="lgCancel">Cancel</button><button class="btn pri" id="lgOk">Add to log</button></div>`);
    document.querySelectorAll('#mealSeg button').forEach(b => b.onclick = () => document.querySelectorAll('#mealSeg button').forEach(x => x.classList.toggle('on', x === b)));
    $('#lgCancel').onclick = closeSheet;
    $('#lgOk').onclick = () => { const meal = document.querySelector('#mealSeg .on').dataset.m; const lg = LOG.all(); const ts = Date.now();
      l.forEach((x, i) => lg.push({ id: 'e' + (ts + i).toString(36) + Math.random().toString(36).slice(2, 5), ts, meal, pid: x.id, name: x.name, brand: x.brand, grams: x.grams, label: x.perItem ? r1(x.grams / 100) + ' item' : Math.round(x.grams) + ' g', n: x.n, score: null }));
      LOG.save(lg); store.set('plate', []); closeSheet(); haptic(20); toast('Meal logged'); go('#/log'); };
  };
}

/* ---------- did you mean ---------- */
function didYouMean(q) {
  if (!engine.post || !engine.post.size) return null; let changed = false;
  const surface = c => { const p = engine.post.get(c); const d = p && engine.docs[p[0] >> 2]; if (d) for (const w of LumiSearch.norm(d.name).split(' ')) if (LumiSearch.toks(w)[0] === c) return w; return c; };
  const out = LumiSearch.norm(q).split(' ').map(w => {
    const t = LumiSearch.toks(w)[0]; if (!t) return w;
    const own = engine.post.has(t) ? engine.post.get(t).length : 0;
    if (t.length < 3 || own >= 25) return w;
    let best = null, bs = 1e9; const cand = engine.buckets.get(t[0]) || [];
    for (const c of cand) { if (Math.abs(c.length - t.length) > 2 || (c.length < t.length && t.startsWith(c))) continue; const d = LumiSearch.dl(t, c); if (d > (t.length > 5 ? 2 : 1)) continue; const pc = engine.post.get(c).length; if (pc < Math.max(10, own * 10)) continue; const sc = d * 100000 - pc; if (sc < bs) { bs = sc; best = c; } }
    if (best && best !== t) { changed = true; return surface(best); } return w;
  });
  return changed ? out.join(' ') : null;
}
