/* Lumi 7.5: Yuka-style Positives/Negatives with hazardous-substances row, fiber/protein, expandable scale bars, per-100/per-serving toggle */
const RISK75 = ['Hazard-free', 'Limited risk', 'Moderate risk', 'High risk'];
const basis75 = () => store.get('factBasis', '100');
function factRows75(p, s, hr) {
  const n = p.n, liq = p.liquid, out = [], u = liq ? 'ml' : 'g';
  const sq = basis75() === 'serv' && p.servQ && !(p.meta && p.meta.perItem) ? p.servQ : null, k = sq ? sq / 100 : 1;
  const fmt = (v, d = 1) => d ? (Math.round(v * k * 10) / 10) : Math.round(v * k);
  const row = (key, ic, title, v, cuts, max, good, descs, unit, d = 1) => { const l = good === 'low' ? lvl(v, cuts) : (v >= cuts[1] ? 0 : v >= cuts[0] ? 2.4 : 2.5); out.push({ key, ic, title, l, desc: good === 'low' ? descs[l] : descs[l === 0 ? 0 : l === 2.4 ? 1 : 2], val: `${fmt(v, d)}${unit}`, v, scale: { cuts, max, good, unit, k } }); };
  if (s.net != null) row('net', 'carbs', 'Net carbs', s.net, liq ? [2, 5, 8] : [5, 15, 30], liq ? 16 : 60, 'low', ['Low net carbs', 'Moderate net carbs', 'High net carbs', 'Very high net carbs'], 'g');
  if (n.sugars != null) row('sugar', 'sugar', 'Sugar', n.sugars, liq ? [1, 2.5, 6] : [1, 5, 12.5], liq ? 12 : 25, 'low', ['No sugar', 'Low sugar', 'Too much sugar', 'Way too much sugar'], 'g');
  const gi = s.items.find(i => i.key === 'gi');
  if (gi) out.push({ key: 'gi', ic: 'fast', title: 'Fast-acting carbs', l: gi.pts <= -10 ? 3 : 2, desc: 'Syrups or refined starch', val: '' });
  if (n.sat != null) row('sat', 'fat', 'Saturated fat', n.sat, [1, 2, 5], 10, 'low', ['Low saturated fat', 'Some saturated fat', 'Too much saturated fat', 'Way too much saturated fat'], 'g');
  if (n.sodiumMg != null) row('sodium', 'salt', 'Sodium', n.sodiumMg, [120, 400, 800], 1600, 'low', ['Low impact', 'Moderate impact', 'High impact', 'Very high impact'], 'mg', 0);
  if (n.kcal != null) row('kcal', 'kcal', 'Calories', n.kcal, liq ? [14, 35, 70] : [160, 360, 560], liq ? 140 : 800, 'low', ['Low calorie', 'Moderate calories', 'A bit too caloric', 'Too caloric'], ' Cal', 0);
  const implaus = s.netNote && s.netNote.includes('implausible');
  if (n.fiber != null && !implaus && !liq) row('fiber', 'fiber', 'Fiber', n.fiber, [1.5, 3], 8, 'high', ['Excellent amount of fiber', 'Some fiber', 'Low fiber'], 'g');
  if (n.protein != null && !implaus && !(liq && n.protein < 4)) row('protein', 'protein', 'Protein', n.protein, [4, 8], 16, 'high', ['Excellent amount of protein', 'Some protein', 'Low protein'], 'g');
  // hazardous substances (additives)
  // low fiber/protein stay visible as neutral (grey) rows; they don't change the score
  const adds = (hr && hr.adds) || [];
  if (!p.ing && hr && hr.basis === 'nutrition') out.push({ key: 'add', ic: 'additives', title: 'Additives', l: 2.5, desc: "Couldn't verify additives (no ingredient list)", val: '?' });
  else if (!adds.length) out.push({ key: 'add', ic: 'additives', title: 'No additives', l: 0, desc: 'No hazardous substances', val: '<span class="ok75">✓</span>' });
  else { const worst = Math.max(...adds.map(a => a.tier)); const risky = adds.filter(a => a.tier >= 1).length;
    out.push({ key: 'add', ic: 'additives', title: 'Additives', l: worst === 0 ? 0 : worst === 1 ? 1.5 : worst, desc: risky ? `${risky} hazardous, up to ${RISK75[worst].toLowerCase()}${adds.length > risky ? ` · ${adds.length - risky} hazard-free` : ''}` : `${adds.length} hazard-free, no hazardous substances`, val: String(adds.length), list: adds }); }
  out.forEach(r => { r.side = r.l === 2.4 || (r.l < 2 && r.l !== 1.5) ? 'pos' : 'neg'; });
  const first = a => a.sort((x, y) => (y.key === 'add') - (x.key === 'add'));
  return { neg: first(out.filter(r => r.side === 'neg')), pos: first(out.filter(r => r.side === 'pos')), unit: u, sq };
}
const DOT75 = l => l === 2.5 || l === 2.4 ? 'na' : l === 1.5 ? 'gd' : LV[l];
function scaleBar(sc, v) {
  const cols = sc.good === 'low' ? ['ex', 'gd', 'pr', 'bd'] : ['na', 'gd', 'ex'];
  const edges = [0, ...sc.cuts, sc.max]; const pct = x => Math.min(100, Math.max(0, x / sc.max * 100));
  const segs = edges.slice(0, -1).map((a, i) => `<i class="bg-${cols[i]}" style="left:${pct(a)}%;width:${pct(edges[i + 1]) - pct(a)}%"></i>`).join('');
  const lab = sc.cuts.map(c => `<span style="left:${pct(c)}%">${Math.round(c * sc.k * 10) / 10}</span>`).join('');
  return `<div class="sc75" role="img" aria-label="Scale: ${v} of ${sc.max}"><div class="sc75-bar">${segs}<b style="left:${pct(v)}%"></b></div><div class="sc75-lab"><span style="left:0">0</span>${lab}<span style="left:100%">${Math.round(sc.max * sc.k * 10) / 10}${sc.unit.trim()}</span></div></div>`;
}
function factLi75(r, i) {
  const body = r.list ? `<ul class="al75">${r.list.map(a => `<li><a href="#/additive/${esc(a.e)}"><i class="adot bg-${['ex', 'gd', 'pr', 'bd'][a.tier]}"></i><b>${esc(String(a.e).toUpperCase())}</b> ${esc(a.name)} <small>· ${RISK75[a.tier]}</small><span class="chev">›</span></a></li>`).join('')}</ul><p class="small">Risk levels come from Lumi's additive reviews (FDA status and published sources on each additive page). "Hazard-free" means no known risk at normal intake, not a guarantee.</p>`
    : r.scale ? scaleBar(r.scale, r.v) : r.key === 'add' ? `<p class="small">${r.l === 2.5 ? 'This product has no ingredient list in the source data, so Lumi couldn\'t check its additives.' : 'No additives were found in the ingredient list. This isn\'t a safety guarantee.'} <a class="lnk" href="#/additives">How additives are rated ›</a></p>` : `<p class="small">${esc(r.desc)}.</p>`;
  return `<li class="fx fx75" data-x="${i}"><button class="fx75-h" aria-expanded="false"><span class="fx-i">${icon(r.ic)}</span><span class="fx-t"><b>${esc(r.title)}</b><small>${esc(r.desc)}</small></span><span class="fx-v">${r.val}</span><span class="fx-d bg-${DOT75(r.l)}"></span><span class="chev75" aria-hidden="true">›</span></button><div class="fx75-b" hidden>${body}</div></li>`;
}
function factCard75(p, F, hp) {
  const u = F.unit, canServ = p.servQ && !(p.meta && p.meta.perItem);
  const tog = p.meta && p.meta.perItem ? '<span class="small">per item</span>' : `<div class="bt75" role="group" aria-label="Basis"><button data-b="100" class="${F.sq ? '' : 'on'}">per 100${u}</button>${canServ ? `<button data-b="serv" class="${F.sq ? 'on' : ''}">per serving (${Math.round(p.servQ)}${u})</button>` : ''}</div>`;
  let i = 0; const L = rows => rows.map(r => factLi75(r, i++)).join('');
  return `<div class="card fxcard" id="fx75">${F.neg.length ? `<div class="fx-h"><h2>${hp ? 'Carb score · ' : ''}Negatives</h2>${tog}</div><ul class="fxl">${L(F.neg)}</ul>` : ''}${F.pos.length ? `<div class="fx-h"><h2>${hp ? 'Carb score · ' : ''}Positives</h2>${F.neg.length ? '' : tog}</div><ul class="fxl">${L(F.pos)}</ul>` : ''}</div>`;
}
function bind75(p, s, hr, hp) {
  const card = document.getElementById('fx75'); if (!card) return;
  card.onclick = e => { const b = e.target.closest('[data-b]'); if (b) { store.set('factBasis', b.dataset.b); const open = [...card.querySelectorAll('.fx75')].filter(x => !x.querySelector('.fx75-b').hidden).map(x => x.dataset.x); card.outerHTML = factCard75(p, factRows75(p, s, hr), hp); open.forEach(x => { const li = document.querySelector(`#fx75 .fx75[data-x="${x}"]`); if (li) { li.querySelector('.fx75-b').hidden = false; li.classList.add('open'); li.querySelector('.fx75-h').setAttribute('aria-expanded', 'true'); } }); bind75(p, s, hr, hp); return; }
    const h = e.target.closest('.fx75-h'); if (!h) return; const li = h.parentElement, bd = li.querySelector('.fx75-b'); bd.hidden = !bd.hidden; li.classList.toggle('open', !bd.hidden); h.setAttribute('aria-expanded', String(!bd.hidden)); };
}
