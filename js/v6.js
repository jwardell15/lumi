/* Lumi v6: additive/ingredient pages, allergen & diet alerts, cosmetics, better options, overview. All local. */
const EN = window.LumiEncyc, DT = window.LumiDiet;
const prefs = () => { const s = store.get('settings', {}); return { al: s.al || [], diets: s.diets || [], hide: !!s.hideConflicts }; };
const hasPrefs = () => { const p = prefs(); return p.al.length + p.diets.length > 0; };
const TIERC = ['ex', 'gd', 'pr', 'bd'];
function dietM(p) {
  const x = p.hx || {}; if (x.df != null) return { am: x.am || 0, tm: x.tm || 0, df: x.df };
  const a = p.alg || {}; return DT.analyze({ ing: p.ing, name: p.name, allergens: a.allergens, traces: a.traces, analysis: a.analysis, labels: a.labels, organic: !!(x.o || p.organic), whole: false });
}
const itemM = it => it.m || (it.df == null ? null : { am: (it.al || 0) & 511, tm: (it.al || 0) >> 9, df: it.df });
function checkItem(it) { if (!hasPrefs() || it.src === 'cos') return null; const m = itemM(it); return m ? DT.check(m, prefs(), it.net) : { level: 'unk', items: [] }; }
const conflicts = it => { const c = checkItem(it); return !!c && (c.level === 'bad' || c.level === 'warn'); };
function alertIcon(it) {
  const c = checkItem(it); if (!c || !c.level || c.level === 'ok') return '';
  const t = c.items.filter(i => i.st !== 'ok').map(i => i.text).join(', ') || 'Couldn\'t verify';
  return `<span class="al-ic al-${c.level}" title="${esc(t)}" aria-label="${esc(t)}">${c.level === 'unk' ? '?' : '⚠'}</span>`;
}
function alertBanner(p, net) {
  if (!hasPrefs()) return '';
  const c = DT.check(dietM(p), prefs(), net); const L = { bad: 'Conflicts with your settings', warn: 'May conflict with your settings', unk: 'Couldn\'t verify against your settings', ok: 'No conflicts found in the listed data' }[c.level];
  const rows = c.items.slice().sort((a, b) => ['bad', 'warn', 'unk', 'ok'].indexOf(a.st) - ['bad', 'warn', 'unk', 'ok'].indexOf(b.st));
  return `<div class="alert al-${c.level}" id="alertBanner"><div class="al-h">${c.level === 'ok' ? '✓' : c.level === 'unk' ? '?' : '⚠'} <b>${L}</b></div><ul>${rows.map(i => `<li class="al-${i.st}">${i.st === 'bad' ? '⛔' : i.st === 'warn' ? '⚠️' : i.st === 'unk' ? '❔' : '✓'} ${esc(i.text)}</li>`).join('')}</ul>
    <div class="al-f">Based on the listed ingredients and allergen tags. This is <b>not a guarantee</b>, so for severe allergies always read the physical label. Unknown data is never treated as safe.</div></div>`;
}

/* ---------- encyclopedia pages ---------- */
const evText = ev => /thin/.test(ev) ? 'Evidence is thin. This is flagged as a precaution, not a proven harm.' : /limited/.test(ev) ? 'Evidence is limited or mixed.' : /strong/.test(ev) ? 'Evidence is well established.' : 'Evidence is moderate.';
function srcList(src) { return src.length ? `<ol class="srcs">${src.map(s => `<li>${esc(s[0])} <a href="${esc(s[1])}" target="_blank" rel="noopener">Source ↗</a></li>`).join('')}</ol>` : '<p class="small">No specific source on file.</p>'; }
function encPage(e, kind) {
  return `<div class="card enc"><div class="small"><a class="lnk" href="#/additives/${kind}">‹ ${kind === 'cos' ? 'Cosmetic ingredients' : 'Food additives'}</a></div>
    <h1>${esc(e.name)}</h1>${e.code ? `<div class="b">${esc(e.code)}</div>` : ''}<div class="risk-badge bg-${TIERC[e.tier]}">${EN.TIER[e.tier]}</div>
    <h2>What it is</h2><p>${esc(e.fn)}</p><h2>Why it's ${e.tier ? 'flagged' : 'rated no risk'}</h2><p>${esc(e.why)}</p><p class="small"><b>Evidence:</b> ${evText(e.ev)}</p>
    ${kind === 'food' ? `<div id="usreg" data-e="${esc(e.id)}"></div>` : ''}<h2>Sources</h2>${srcList(e.src)}</div><p class="foot">Risk levels are Lumi's own summary of the cited sources. Informational only, not medical advice.</p>`;
}
function viewAdditive(id) { const e = EN.food(id, HLTH); document.title = (e ? e.name : 'Additive') + ' — Lumi'; app.innerHTML = e ? encPage(e, 'food') : `<div class="card empty">${MASCOT(80)}<b>Unknown additive</b><a class="lnk" href="#/additives">Browse all additives ›</a></div>`; if (e) fillReg(); }
function viewIngredient(id) { const e = EN.cos(id); document.title = (e ? e.name : 'Ingredient') + ' — Lumi'; app.innerHTML = e ? encPage(e, 'cos') : `<div class="card empty">${MASCOT(80)}<b>Unknown ingredient</b><a class="lnk" href="#/additives/cos">Browse ingredients ›</a></div>`; }
function viewAdditives(tab) {
  tab = tab === 'cos' ? 'cos' : 'food'; document.title = 'Additives & ingredients — Lumi';
  const food = Object.keys(HLTH.ADD).map(k => EN.food(k, HLTH)).filter(Boolean).sort((a, b) => b.tier - a.tier || a.code.localeCompare(b.code, 'en', { numeric: true }));
  const cos = EN.COS.map(c => EN.cos(c[0])).sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
  app.innerHTML = `<h1>Additives & ingredients</h1><p class="lead">What each one is, why it's flagged, and the sources.</p>
  <div class="seg wide" id="adTab"><button data-t="food" class="${tab === 'food' ? 'on' : ''}">Food additives (${food.length})</button><button data-t="cos" class="${tab === 'cos' ? 'on' : ''}">Cosmetic ingredients (${cos.length})</button></div>
  <div class="sfield adq">${ICON_SEARCH}<input id="adq" type="search" placeholder="Search by name or E-number (e.g. E150d, red 40, paraben)" aria-label="Search additives"></div><div id="adList"></div>`;
  const ALIAS = { e129: 'red 40', e102: 'yellow 5', e110: 'yellow 6', e133: 'blue 1', e132: 'blue 2', e127: 'red 3', e621: 'msg', e955: 'splenda', e951: 'nutrasweet', e443: 'bvo' };
  const draw = () => { const q = LumiSearch.norm($('#adq').value); const L = (tab === 'food' ? food : cos).filter(e => !q || LumiSearch.norm(e.name + ' ' + (e.code || '') + ' ' + (ALIAS[e.id] || '') + ' ' + e.fn).includes(q));
    $('#adList').innerHTML = L.length ? `<div class="list">${L.map(e => `<a class="row adrow" href="#/${tab === 'food' ? 'additive' : 'ingredient'}/${e.id}"><span class="adot lg bg-${TIERC[e.tier]}"></span><div class="t"><div class="n">${esc(e.name)}${e.code ? ` <small>${esc(e.code)}</small>` : ''}</div><div class="b">${esc(e.fn)} · ${EN.TIER[e.tier]}</div></div><span class="chev">›</span></a>`).join('')}</div>` : `<div class="card empty">${MASCOT(64)}<b>No match</b></div>`; };
  $('#adq').oninput = draw; draw();
  document.querySelectorAll('#adTab button').forEach(b => b.onclick = () => go('#/additives/' + b.dataset.t));
}

/* ---------- cosmetics ---------- */
let COSI = null, COSP = null;
function loadCos() { if (COSI) return Promise.resolve(COSI); if (COSP) return COSP; COSP = fetch('data/cos/index.json').then(r => r.json()).then(j => { COSI = j; j.docs = j.docs.map(d => ({ code: d[0], name: d[1], brand: d[2], score: d[3] < 0 ? null : d[3], cat: j.cats[d[4]][0], img: d[5], src: 'cos', key: LumiSearch.norm(d[1] + ' ' + d[2]) })); return j; }).catch(e => { COSP = null; throw e; }); return COSP; }
async function cosProduct(code) {
  code = String(code).replace(/\D/g, ''); if (code.length < 8) return null;
  const mk = a => ({ id: a[0], code: a[0], src: 'cos', name: a[1], brand: a[2], qty: a[3], img: a[4], ing: a[5], cat: a[6], labels: a[7] || '', n: {} });
  try { const sh = await getJSON('data/cos/d/' + code.slice(-1) + '.json', 8000); for (const c of [code, code.padStart(13, '0'), code.replace(/^0+/, '')]) if (sh[c]) return mk(sh[c]); } catch {}
  try { const j = await getJSON(`https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,image_front_url,ingredients_text,ingredients_text_en,categories_tags,quantity`, 8000);
    if (j && j.status === 1 && j.product) { const p = j.product; return mk([code, p.product_name || 'Unnamed product', String(p.brands || '').split(',')[0], p.quantity || '', p.image_front_url || '', p.ingredients_text_en || p.ingredients_text || '', 'other', '']); } } catch {}
  return null;
}
function cosBand(s) { return s == null ? 'na' : s >= 75 ? 'ex' : s >= 50 ? 'gd' : s >= 25 ? 'pr' : 'bd'; }
function cosRow(d) { return `<a class="row" href="#/cos/${esc(d.code)}">${thumb(d.img, d.name, [], 'cosmetic', false).replace('🛒', '🧴')}<div class="t"><div class="n">${esc(d.name)}</div><div class="b"><span class="tag t-cos">Cosmetic</span>${esc(d.brand || '')}</div></div><div class="rtg"><div class="rt1"><i class="sdot sm bg-${cosBand(d.score)}"></i><b>${d.score ?? '?'}</b><small>/100</small></div><div class="rt-l c-${cosBand(d.score)}">${d.score == null ? 'No ingredients' : HL(d.score)}</div></div></a>`; }
async function viewCosmetics(arg) {
  document.title = 'Cosmetics — Lumi'; const [cat, q0] = String(arg || '').split('/'); const q = decodeURIComponent(q0 || '');
  app.innerHTML = `<h1>Cosmetics & personal care</h1><p class="lead">Rated on their ingredients. Food carb and health ratings don't apply to cosmetics.</p><div id="cosBody">${skel(6)}</div>`;
  let I; try { I = await loadCos(); } catch { $('#cosBody').innerHTML = `<div class="card empty">${MASCOT(64)}<b>Cosmetics data unavailable offline</b></div>`; return; }
  const c = I.cov; let sort = 'pop';
  $('#cosBody').innerHTML = `<div class="sfield adq">${ICON_SEARCH}<input id="cq" type="search" placeholder="Search shampoo, sunscreen, brand…" value="${esc(q)}" aria-label="Search cosmetics"></div>
    <div class="chips" id="cosCats"><button class="chip ${!cat || cat === 'all' ? 'on' : ''}" data-c="all">All</button>${I.cats.filter(x => x[0] !== 'other').map(x => `<button class="chip ${cat === x[0] ? 'on' : ''}" data-c="${x[0]}">${esc(x[1])}</button>`).join('')}<button class="chip ${cat === 'other' ? 'on' : ''}" data-c="other">Other</button></div>
    <div class="tools"><div class="seg" id="cSort"><button data-s="pop" class="on">Popular</button><button data-s="best">Best rated</button></div><span class="small">${c.total.toLocaleString()} items · ${c.rated.toLocaleString()} rated</span></div><div id="cList"></div>
    <p class="foot">Data: <a href="https://world.openbeautyfacts.org" target="_blank" rel="noopener">Open Beauty Facts</a> (ODbL). Barcode scans fall back to Open Beauty Facts when a food isn't found. <a class="lnk" href="#/additives/cos">How ingredients are rated ›</a></p>`;
  const draw = () => { const qq = LumiSearch.norm($('#cq').value), cc = (document.querySelector('#cosCats .on') || {}).dataset.c || 'all';
    let L = I.docs.filter(d => (cc === 'all' || d.cat === cc) && (!qq || qq.split(' ').every(t => d.key.includes(t))));
    if (sort === 'best') L = L.filter(d => d.score != null).sort((a, b) => b.score - a.score);
    $('#cList').innerHTML = L.length ? `<div class="list">${L.slice(0, 80).map(cosRow).join('')}</div>${L.length > 80 ? `<div class="small" style="text-align:center;margin:8px">Showing 80 of ${L.length}. Refine your search.</div>` : ''}` : `<div class="card empty">${MASCOT(64)}<b>No cosmetics found</b>Try another word, or scan the barcode.</div>`; };
  document.querySelectorAll('#cosCats .chip').forEach(b => b.onclick = () => { document.querySelectorAll('#cosCats .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  document.querySelectorAll('#cSort button').forEach(b => b.onclick = () => { sort = b.dataset.s; document.querySelectorAll('#cSort button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#cq').oninput = draw; draw();
}
async function viewCosProduct(id, pre, scanned) {
  if (!pre) app.innerHTML = `<div class="loading-dog">${MASCOT(56, 'bounce')}<span>Reading the ingredient list…</span></div>`;
  const p = pre || await cosProduct(id); if (!p) { app.innerHTML = `<div class="card empty">${MASCOT(80)}<b>Not found</b>This barcode isn't in Open Food Facts or Open Beauty Facts.</div>`; return; }
  memo.set(p.id, p); if (scanned) pushHist('scans', p, 50); else pushHist('viewed', p);
  const r = EN.cosRate(p.ing), b = cosBand(r.score); document.title = `${p.name} — ${r.score ?? '?'}/100 · Lumi`;
  const hit = h => { const e = EN.cos(h.id); return `<li class="fx"><a class="fxa" href="#/ingredient/${h.id}"><span class="fx-i adot lg bg-${TIERC[h.tier]}"></span><span class="fx-t"><b>${esc(h.name)}</b><small>${EN.TIER[h.tier]}. ${esc(e.why)}</small><small class="srcn">${e.src.length} source${e.src.length === 1 ? '' : 's'} ›</small></span></a></li>`; };
  const bad = r.hits.filter(h => h.tier >= 1), ok = r.hits.filter(h => h.tier === 0);
  app.innerHTML = `<div class="card"><div class="ph">${thumb(p.img, p.name, [], 'cosmetic', true).replace('🛒', '🧴')}<div class="ph-t"><h1>${esc(p.name)}</h1><div class="b">${esc(p.brand || '')}${p.qty ? ' · ' + esc(p.qty) : ''}</div><div class="srcline"><span class="tag t-cos">Cosmetic</span> Ingredient rating</div>
    <div class="sline"><span class="sdot bg-${b}"></span><div><b>${r.score ?? '?'}<span>/100</span></b><div class="slab">${r.score == null ? esc(r.reason) : HL(r.score)} <small>· Ingredients</small></div></div></div></div></div>
    ${scanned ? '<div class="scanned"><span>✓ Scanned · Open Beauty Facts</span></div>' : ''}
    <div class="note">Carb and health food ratings don't apply to cosmetics. The rating follows the riskiest ingredient: any high-risk ingredient puts it under 25, any moderate-risk one under 50.</div></div>
    ${r.score == null ? '' : `<div class="card fxcard"><div class="fx-h"><h2>${bad.length ? 'Ingredients of concern' : 'No flagged ingredients'}</h2></div>${bad.length ? `<ul class="fxl">${bad.map(hit).join('')}</ul>` : '<p class="small">None of the listed ingredients is on Lumi\'s risk list. That isn\'t a guarantee of safety.</p>'}${ok.length ? `<div class="fx-h"><h2>Positives</h2></div><ul class="fxl">${ok.map(hit).join('')}</ul>` : ''}</div>`}
    ${p.ing ? `<div class="card"><h2>Ingredients</h2><div class="ing">${esc(p.ing)}</div></div>` : ''}
    <p class="foot">Source: <a href="https://world.openbeautyfacts.org/product/${esc(p.code)}" target="_blank" rel="noopener">Open Beauty Facts</a>. Informational only.</p>`;
}

/* ---------- better options ---------- */
function betterFor(p, s, hr, limit = 10) {
  const hp = PRIM() === 'health'; const cur = hp ? hr.score : s.score; if (cur == null || cur >= 50) return null;
  const doc = engine.byCode(p.code || p.id) || { code: p.code || p.id, keys: C.match(p.cats || ''), cat: p.cat };
  const val = d => hp ? d.h : d.score; const leaf = (doc.keys || []).filter(k => !['whole', 'rest'].includes(C.KEYS[k])).slice(-1)[0];
  let pool = leaf != null ? engine.docs.filter(d => d.keys.includes(leaf)) : [];
  if (pool.length < 4 && doc.cat) pool = pool.concat(engine.docs.filter(d => d.cat === doc.cat));
  const need = Math.max(50, cur + 10); const seen = new Set();
  const c = pool.filter(d => d.code !== doc.code && val(d) != null && val(d) >= need && d.score != null && !conflicts(d) && (d.src !== 'local' || usEnglish(d)))
    .sort((a, b) => (val(b) + (b.img ? 6 : 0) - b.rank / 4000) - (val(a) + (a.img ? 6 : 0) - a.rank / 4000))
    .filter(d => { const k = LumiSearch.norm(d.name + d.brand); if (seen.has(k)) return false; seen.add(k); return true; });
  return { cur, hp, leaf, items: c.slice(0, limit) };
}
async function drawBetter(p, s, hr) {
  const el = $('#better'); if (!el) return; try { await loadIndex(); } catch { return; }
  const draw = () => { const r = betterFor(p, s, hr); if (!r || !r.items.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="card better"><div class="fx-h"><h2>Better options</h2><span class="small">${r.leaf != null ? esc(C.CATS[C.KEYS[r.leaf]][1]) : 'Same category'} · higher ${r.hp ? 'health rating' : 'carb score'}${hasPrefs() ? ' · fits your settings' : ''}</span></div>
      <div class="swaps">${r.items.map(d => `<div class="swap bo"><a href="#/product/${esc(d.code)}">${thumb(d.img, d.name, d.keys, d.cat)}<div class="n">${esc(d.name)}</div><div class="s"><span>${esc((d.brand || '').slice(0, 14))}</span><span class="pills">${pills(d)}</span></div></a><button class="btn sm cmpbtn" data-c="${esc(d.code)}">⇆ Compare</button></div>`).join('')}</div></div>`;
    el.querySelectorAll('.cmpbtn').forEach(b => b.onclick = () => { remember(p); store.set('compare', [p.id, b.dataset.c]); haptic(12); go('#/compare'); }); };
  draw(); loadIndexFull().then(draw).catch(() => {});
}

/* ---------- overview ---------- */
function viewOverview(arg) {
  document.title = 'Overview — Lumi'; const days = arg === '30' ? 30 : 7; const since = Date.now() - days * 864e5; const hp = PRIM() === 'health';
  const foods = store.get('foods', {}); const P = id => foods[id] || memo.get(id) || null;
  const rows = [];
  store.get('scans', []).forEach(x => rows.push({ k: 'scan', ts: x.ts, p: P(x.id), x }));
  LOG.all().forEach(e => rows.push({ k: 'log', ts: e.ts, p: P(e.pid), x: e }));
  const R = rows.filter(r => r.ts >= since).map(r => { const cos = (r.p && r.p.src === 'cos') || r.x.src === 'cos';
    const cs = cos ? null : r.p ? S.score(r.p).score : r.x.score ?? null; const h = cos || !r.p ? null : HR(r.p).score; const cr = cos && r.p ? EN.cosRate(r.p.ing).score : null;
    return Object.assign(r, { cos, cs, h, cr, cat: r.p ? r.p.cat || '' : '', adds: !cos && r.p ? HR(r.p).adds.filter(a => a.tier >= 1) : [] }); });
  const food = R.filter(r => !r.cos), cosm = R.filter(r => r.cos);
  const bands = (L, f) => { const c = { ex: 0, gd: 0, pr: 0, bd: 0 }; let n = 0; L.forEach(r => { const v = f(r); if (v != null) { c[HB(v)]++; n++; } }); return { c, n }; };
  const bar = (lab, b) => `<div class="ov-row"><span class="ov-l">${lab}</span>${b.n ? `<div class="stack">${['ex', 'gd', 'pr', 'bd'].map(k => b.c[k] ? `<i class="bg-${k}" style="flex:${b.c[k]}" title="${HL({ ex: 80, gd: 60, pr: 30, bd: 10 }[k])}: ${b.c[k]}">${b.c[k]}</i>` : '').join('')}</div>` : '<span class="small">No data</span>'}</div>`;
  const avg = (L, f) => { const v = L.map(f).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const ac = avg(food, r => r.cs), ah = avg(food, r => r.h);
  const dayK = t => new Date(t).toDateString(); const dl = [...Array(days)].map((_, i) => { const d = new Date(Date.now() - (days - 1 - i) * 864e5); return { k: d.toDateString(), d }; });
  const per = dl.map(x => { const L = food.filter(r => dayK(r.ts) === x.k); return { d: x.d, n: L.length, a: avg(L, r => hp ? r.h : r.cs) }; }); const mx = Math.max(1, ...per.map(x => x.n));
  const cats = {}; R.filter(r => r.k === 'scan').forEach(r => { const k = r.cos ? 'Cosmetics' : (r.cat || 'Other'); cats[k] = (cats[k] || 0) + 1; });
  const topC = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ad = {}; food.forEach(r => r.adds.forEach(a => { ad[a.e] = ad[a.e] || { a, n: 0 }; ad[a.e].n++; })); const topA = Object.values(ad).sort((a, b) => b.n - a.n || b.a.tier - a.a.tier).slice(0, 8);
  app.innerHTML = `<h1>Overview</h1><p class="lead">Your scans and log, computed on this device.</p>
  <div class="seg wide" id="ovR"><button data-d="7" class="${days === 7 ? 'on' : ''}">Last 7 days</button><button data-d="30" class="${days === 30 ? 'on' : ''}">Last 30 days</button></div>
  ${R.length ? `<div class="card ov-avg"><div><small>Items</small><b>${food.length}</b><span class="small">${R.filter(r => r.k === 'scan').length} scanned · ${R.filter(r => r.k === 'log').length} logged</span></div>
    <div><small>Avg carb score</small><b class="c-${S.band(ac)}">${ac ?? '—'}</b><span class="small">${ac == null ? '' : S.label(ac)}</span></div><div><small>Avg health</small><b class="c-${HB(ah)}">${ah ?? '—'}</b><span class="small">${ah == null ? '' : HL(ah)}</span></div></div>
  <div class="card"><h2>By rating band</h2>${bar('Scanned · carb', bands(food.filter(r => r.k === 'scan'), r => r.cs))}${bar('Scanned · health', bands(food.filter(r => r.k === 'scan'), r => r.h))}${bar('Logged · carb', bands(food.filter(r => r.k === 'log'), r => r.cs))}${bar('Logged · health', bands(food.filter(r => r.k === 'log'), r => r.h))}${cosm.length ? bar('Cosmetics', bands(cosm, r => r.cr)) : ''}
    <div class="legend small"><span><i class="bg-ex"></i>Excellent</span><span><i class="bg-gd"></i>Good</span><span><i class="bg-pr"></i>Poor</span><span><i class="bg-bd"></i>Bad</span></div></div>
  <div class="card"><h2>Trend</h2><div class="small" style="margin:-6px 0 8px">Items per day, coloured by average ${hp ? 'health rating' : 'carb score'}</div><div class="spark ${days === 30 ? 'm' : ''}">${per.map(x => `<div class="sp"><i class="bg-${x.a == null ? 'na' : hp ? HB(x.a) : S.band(x.a)}" style="height:${Math.round(x.n / mx * 100)}%" title="${x.d.toLocaleDateString()}: ${x.n}"></i><small>${days === 7 ? x.d.toLocaleDateString(undefined, { weekday: 'narrow' }) : x.d.getDate() % 5 === 0 ? x.d.getDate() : ''}</small></div>`).join('')}</div></div>
  <div class="card"><h2>Most-scanned categories</h2>${topC.length ? `<ul class="ovl">${topC.map(([k, n]) => `<li><span>${k === 'Cosmetics' ? '🧴' : catIcon([], k)} ${esc(k)}</span><b>${n}</b></li>`).join('')}</ul>` : '<p class="small">No scans in this period.</p>'}</div>
  <div class="card"><h2>Top additives encountered</h2>${topA.length ? `<ul class="ovl">${topA.map(x => `<li><a href="#/additive/${x.a.e}"><i class="adot bg-${TIERC[x.a.tier]}"></i>${esc(x.a.name)} <small>${x.a.e.toUpperCase()} · ${EN.TIER[x.a.tier]}</small></a><b>${x.n}</b></li>`).join('')}</ul>` : '<p class="small">No flagged additives in this period.</p>'}</div>`
  : `<div class="card empty">${MASCOT(96, 'big')}<b>Nothing here yet</b>Scan or log a few foods and your stats show up here.<div class="actions" style="justify-content:center"><a class="btn pri" href="#/">Find foods</a></div></div>`}
  <p class="foot">All stats are computed locally. Informational only, not medical advice.</p>`;
  document.querySelectorAll('#ovR button').forEach(b => b.onclick = () => go('#/overview/' + b.dataset.d));
}

/* ---------- settings: allergens & diets ---------- */
function prefsCard() {
  const p = prefs();
  return `<div class="card" id="prefsCard"><h2>Allergen & diet alerts</h2><p class="small">Lumi checks ingredient lists and allergen tags and warns you on cards, product pages and scans. Data that's missing reads <b>couldn't verify</b> and is never treated as safe. <b>Not a guarantee for severe allergies</b>, so always read the label.</p>
    <div class="small"><b>Allergens</b></div><div class="chips wrap" id="alChips">${DT.AL.map(a => `<button type="button" class="chip tog ${p.al.includes(a[0]) ? 'on' : ''}" data-a="${a[0]}">${esc(a[1])}</button>`).join('')}</div>
    <div class="small" style="margin-top:10px"><b>Diets</b></div><div class="chips wrap" id="dtChips">${DT.DIETS.map(d => `<button type="button" class="chip tog ${p.diets.includes(d[0]) ? 'on' : ''}" data-d="${d[0]}">${esc(d[1])}</button>`).join('')}</div>
    <label class="tgl"><input type="checkbox" id="hideC" ${p.hide ? 'checked' : ''}> Hide items that conflict (in search, picks and better options)</label></div>`;
}
function bindPrefs() {
  const save = () => { setSettings({ al: [...document.querySelectorAll('#alChips .on')].map(b => b.dataset.a), diets: [...document.querySelectorAll('#dtChips .on')].map(b => b.dataset.d), hideConflicts: $('#hideC').checked }); toast('Alerts saved'); };
  document.querySelectorAll('#alChips .chip, #dtChips .chip').forEach(b => b.onclick = () => { b.classList.toggle('on'); haptic(); save(); });
  $('#hideC').onchange = save;
}
