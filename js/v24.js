/* Lumi 24.0: per-serving nutrition everywhere, one "Better choice" engine, chain order builder, shareable score cards, own USDA key via proxy. */
(function () {
/* ---------- 0. helpers ---------- */
const slug24 = s => String(s || '').toLowerCase().replace(/['’®™©]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const unitOf24 = p => p && p.liquid ? 'ml' : 'g';
const g24 = v => v == null || isNaN(v) ? '—' : (Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
const servLabel24 = p => { const u = unitOf24(p); if (p.meta && p.meta.perItem) return 'per item (as published)'; if (p.servQ) { const sv = String(p.serv || '').trim(), gq = Math.round(p.servQ) + ' ' + u; if (!sv || /^\d+(\.\d+)?\s*(g|ml)$/i.test(sv)) return `per serving (${gq})`; const t = sv.replace(/\s*\(([^()]*)\)\s*$/, ', $1'); return `per serving (${esc(t)}${t.includes(String(Math.round(p.servQ))) ? '' : ', ' + gq})`; } return `per 100 ${u} (no serving size on file)`; };
const servK24 = p => p.meta && p.meta.perItem ? 1 : p.servQ ? p.servQ / 100 : 1;
self.slug24 = slug24; self.servLabel24 = servLabel24;

/* ---------- 1. per serving by default (Joe's rule): fact rows, nutrition table, data check ---------- */
if (!store.get('fb24', 0)) { store.set('factBasis', 'serv'); store.set('fb24', 1); }
if (typeof factRows75 === 'function') { const fr0 = factRows75; factRows75 = function () { const F = fr0.apply(this, arguments);
  [F.neg, F.pos].forEach(a => { const i = a.findIndex(r => r.key === 'sugar'), j = a.findIndex(r => r.key === 'net'); if (i > j && j >= 0) { const [r] = a.splice(i, 1); a.splice(j, 0, r); } }); return F; }; }
if (typeof factCard75 === 'function') factCard75 = function (p, F, hp) {
  const u = F.unit, per = p.meta && p.meta.perItem, canServ = p.servQ && !per;
  const tog = per ? '<span class="small bs24">per item (as published)</span>' : canServ ? `<div class="bt75 bt24" role="group" aria-label="Show values per"><button data-b="serv" class="${F.sq ? 'on' : ''}" aria-pressed="${!!F.sq}">per serving (${Math.round(p.servQ)} ${u})</button><button data-b="100" class="sec24 ${F.sq ? '' : 'on'}" aria-pressed="${!F.sq}">per 100 ${u}</button></div>` : `<span class="small bs24">per 100 ${u} · no serving size on file</span>`;
  let i = 0; const L = rows => rows.map(r => factLi75(r, i++)).join('');
  return `<div class="card fxcard" id="fx75">${F.neg.length ? `<div class="fx-h"><h2>${hp ? 'Blood sugar · ' : ''}Negatives</h2>${tog}</div><ul class="fxl">${L(F.neg)}</ul>` : ''}${F.pos.length ? `<div class="fx-h"><h2>${hp ? 'Blood sugar · ' : ''}Positives</h2>${F.neg.length ? '' : tog}</div><ul class="fxl">${L(F.pos)}</ul>` : ''}</div>`;
};
function nutTable24(p, note) {
  const n = p.n || {}, u = unitOf24(p), per = p.meta && p.meta.perItem, sq = !per && p.servQ ? +p.servQ : null, k = servK24(p), two = !!(sq && store.get('nt100_24', false));
  const f = (v, un = 'g', kk = k) => v == null ? '<span class="small">—</span>' : un === 'mg' ? Math.round(v * kk) + ' mg' : un === 'kcal' ? Math.round(v * kk) : g24(v * kk) + ' g';
  const row = (lab, v, un, key) => `<tr class="${key ? 'key' : ''}"><th scope="row">${lab}</th><td>${f(v, un)}</td>${two ? `<td class="c100">${f(v, un, 1)}</td>` : ''}</tr>`;
  const added = n.added != null ? row('Added sugars', n.added) : `<tr><th scope="row">Added sugars</th><td colspan="${two ? 2 : 1}" class="small">not declared${p.ing && /\b(sugar|syrup|honey|dextrose|cane)\b/i.test(p.ing) ? ' (ingredients list a sugar)' : ''}</td></tr>`;
  const head = per ? 'per item<br><small>as published</small>' : sq ? servLabel24(p).replace(/^per serving \((.*)\)$/, 'per serving<br><small>$1</small>') : `per 100 ${u}`;
  return `<div class="card nt24" id="nt24"><div class="fx-h"><h2>Nutrition</h2>${sq ? `<button type="button" class="btn sm sec24" id="nt24t" aria-pressed="${two}">${two ? 'Hide' : 'Show'} per 100 ${u}</button>` : ''}</div>
   <table><thead><tr><th></th><th scope="col">${head}</th>${two ? `<th scope="col" class="c100">per 100 ${u}</th>` : ''}</tr></thead><tbody>
   ${row(n.added === 0 && n.sugars > 0 ? 'Total sugars (all natural)' : 'Total sugars', n.sugars, 'g', 1)}${added}${row('Total carbohydrate', n.carbs, 'g', 1)}${row('Fiber', n.fiber)}${n.polyols ? row('Polyols', n.polyols) : ''}${row('Protein', n.protein)}${row('Fat', n.fat)}${row('Saturated fat', n.sat)}${n.trans != null ? row('Trans fat', n.trans) : ''}${row('Sodium', n.sodiumMg, 'mg')}${row('Calories', n.kcal, 'kcal')}</tbody></table>
   ${!per && !sq ? `<p class="small">No serving size on file, so these values are per 100 ${u}. Check the package for its serving.</p>` : ''}${note ? `<div class="small" style="margin-top:8px">${note}</div>` : ''}</div>`;
}
function fixNut24(p) { const c = [...app.querySelectorAll('.card')].find(x => !x.id && x.querySelector('table') && /^Nutrition$/.test(((x.querySelector('h2') || {}).textContent || '').trim()));
  const old = c || $('#nt24'); if (!old || !p.n || p.n.carbs == null) return; const note = c ? ((c.querySelector('div.small') || {}).innerHTML || '') : (old.dataset.note || '');
  old.outerHTML = nutTable24(p, note); const nw = $('#nt24'); nw.dataset.note = note;
  const t = $('#nt24t'); if (t) t.onclick = () => { store.set('nt100_24', !store.get('nt100_24', false)); fixNut24(p); const b = $('#nt24t'); if (b) b.focus(); }; }
self.nutTable24 = nutTable24;
if (typeof dataCheckCard === 'function') dataCheckCard = function (p, s) {
  const n = p.n; if (p.meta && p.meta.perItem) return ''; if (n.kcal == null) return `<div class="card dcheck"><h2>Data check</h2><p class="small">No calorie value on file, so Lumi can't cross-check the label.</p></div>`;
  const k = servK24(p), lab = p.servQ ? `per serving (${Math.round(p.servQ)} ${unitOf24(p)})` : `per 100 ${unitOf24(p)}`;
  const est = (4 * (n.carbs || 0) + 4 * (n.protein || 0) + 9 * (n.fat || 0)) * k, rep = n.kcal * k, bad = S.implausible(p), d = Math.round(rep - est);
  return `<div class="card dcheck ${bad ? 'bad' : 'ok'}"><h2>${bad ? '⚠ Data looks wrong' : '✓ Label adds up'}</h2><p class="small">${lab}</p>
    <div class="dc-row"><div><b>${Math.round(rep)}</b><span>kcal reported</span></div><div><b>${Math.round(est)}</b><span>kcal from 4·carbs + 4·protein + 9·fat</span></div><div><b>${d > 0 ? '+' : ''}${d}</b><span>difference</span></div></div>
    <p class="small">${bad ? esc(bad) + '. Often a carb value is missing or was entered per serving. Lumi doesn\'t score it, so check the package.' : 'Calories roughly match the macros (fiber, sugar alcohols and alcohol explain small gaps).'}</p></div>`;
};

/* ---------- 2. Better choice: one engine for product pages, search hints, log and Today ---------- */
const SIZE24 = /\b(small|medium|large|regular|x-?large|xl|kids?|junior|value|snack|mini|single|double|triple|half|whole|sm|md|lg|\d+(\.\d+)? ?(fl ?oz|oz|pc|pcs|piece|pieces|ct|count|g|ml|cups?|slices?|lb)|\d+)\b/gi;
const base24 = s => String(s || '').toLowerCase().replace(/[®™©]/g, '').replace(/\([^)]*\)/g, ' ').replace(SIZE24, ' ').replace(/[^a-z]+/g, ' ').trim();
const COMP24 = /^(add|adds|extra|side of|sub|substitute|no)\b|\b(adds?|add-?ons?|toppings?|condiments?|packets?|portion cups?)\b|\b\d+ ?slices?\b(?!.*\b(pizza|pie|bread|toast|cake)\b)|^(tomato|onion|red onion|lettuce|pickles?|jalape(n|ñ)os?|cheddar cheese|swiss cheese|american cheese|bacon|avocado|egg)\b[^a-z]*(\d|$|-)/i;
const NOTM24 = /^(add|adds|extra|side of|sub|substitute|no)\b|\b(adds?|add-?ons?|toppings?|condiments?|packets?|portion cups?|dog|doggie|puppy|pup cup|puppuccino)\b|\b\d+ ?slices?\b(?!.*\b(pizza|pie)\b)/i;
const OEX24 = /\b(kids?|kid's|kid’s|children'?s|family|catering|party|tray|platter for|bucket|gallon|box of|dozen|bulk|feeds|serves|shareables?|\d{2,} ?(pc|piece|pieces|count|ct))\b/i;
const ADD24 = n => NOTM24.test(n) || /\b(for (the )?(endless )?(garden|salad) bar|salad bar|garden bar|dressings?|sauces?|dips?|spreads?|syrups?|creamers?|sweeteners?)\b/i.test(n);
self.NOTM24 = NOTM24; self.OEX24 = OEX24;
const PET24 = /\b(dog|doggie|doggy|puppy|pup cup|puppuccino|pet|pooch)\b/i;
const KID24 = /\b(kids?|kid's|kid’s|children'?s|happy meal|lil'? |little)\b/i;
const bfam24 = b => String(b || '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').trim().split(' ')[0] || '';
const PINS24 = () => { const S = window.LumiStores; return S ? ['costco', 'wholefoods'].map(id => S.STORES.findIndex(s => s[0] === id)).filter(i => i >= 0) : []; };
function kindOf24(d) { const ty = type20(d), rest = d.src === 'rest'; return rest ? ty : ty === 'drink' ? 'drink' : 'food'; }
function basisT24(d) { return d.sg > 0 && d.sb != null && d.sb >= 0 && (d.sb & 3) !== 3 ? ((d.sb & 3) === 1 ? 'item' : 'serv') : 'per100'; }
function better24(doc, cur, limit = 3) {
  if (!doc || typeof engine === 'undefined' || !engine.docs || !engine.docs.length) return [];
  const C = window.LumiCats, keys = doc.keys || [], rest = doc.src === 'rest' || /^(r-|ms-)/.test(doc.code || '');
  const leaf = keys.filter(k => typeof k === 'number' && C && !['whole', 'rest', 'rest-other'].includes(C.KEYS[k])).slice(-1)[0];
  const ps = perServ20(doc) || {}; const cS = cur && cur.score != null ? cur.score : doc.score, cH = cur && cur.h != null ? cur.h : doc.h;
  const cSug = cur && cur.sugar != null ? cur.sugar : ps.s, cCarb = cur && cur.carbs != null ? cur.carbs : ps.c;
  if (cS == null || cCarb == null) return [];
  const kd = leaf == null ? kind20(doc) : null; if (!rest && leaf == null && !kd) return [];
  const fk = fine20(doc), ty = type20(doc), myStores = stores20(doc.sm), pins = PINS24(), fam = bfam24(doc.brand), myBase = base24(doc.name), kid = KID24.test(doc.name), comp = COMP24.test(doc.name), bt = basisT24(doc), toks = TOK20(doc.name), out = [];
  for (const d of engine.docs) {
    if (d.code === doc.code || d.score == null || d.net == null || d.sugar == null || (d.fl && type20(d) !== 'drink') || d.bad || d.zc || d.src === 'world' || (d.src === 'local' && typeof usEnglish === 'function' && !usEnglish(d))) continue;
    let where = '';
    if (rest) { if (d.src !== 'rest' || d.brand !== doc.brand || type20(d) !== ty) continue; if (ADD24(d.name) !== ADD24(doc.name) || OEX24.test(d.name) !== OEX24.test(doc.name)) continue; where = 'chain'; }
    else { if (d.src === 'rest') continue; if (leaf != null ? !(d.keys || []).includes(leaf) : (!kd || kind20(d, true) !== kd)) continue; if ((ty === 'drink') !== (type20(d) === 'drink')) continue;
      const ds = stores20(d.sm); if (fam && bfam24(d.brand) === fam) where = 'brand'; else if (myStores.length && ds.some(i => myStores.includes(i))) where = ds.some(i => pins.includes(i) && myStores.includes(i)) ? 'pin' : 'store';
      else if (!myStores.length && ds.some(i => pins.includes(i))) where = 'pin'; else continue; }
    if (!fineOk20(fk, d)) continue; if (PET24.test(d.name) !== PET24.test(doc.name)) continue; if (COMP24.test(d.name) !== comp || KID24.test(d.name) !== kid) continue; if (myBase && base24(d.name) === myBase) continue;
    const dbt = basisT24(d); if (rest ? (dbt === 'per100') !== (bt === 'per100') : dbt !== bt) continue;
    if (dbt === 'serv' && bt === 'serv' && doc.sg > 0) { const r = d.sg / doc.sg; if (r < 0.5 || r > 2) continue; }
    const q = perServ20(d); if (!q || q.s == null) continue;
    const gain = d.score - cS, hd = d.h != null && cH != null ? d.h - cH : 0, sRed = cSug != null ? cSug - q.s : 0, cRed = cCarb - q.c;
    if (cSug != null && q.s > cSug + 1) continue; if (cRed < -3) continue; if (d.h != null && d.h < 25) continue;
    if (!((gain >= 5 && hd >= -5) || (gain >= 0 && hd >= 10 && sRed >= 0))) continue;
    if (sRed < 0.5 && cRed < 1 && hd < 10) continue; /* must save something real */
    if (ty !== 'drink' && ty !== 'sauce' && cCarb >= 15 && q.c < cCarb * (ty === 'side' ? 0.08 : 0.2)) continue; /* not like-for-like */
    if (ty === 'drink' && !(q.s > 0) && !LOWDRINK20.test(d.name)) continue;
    let ov = 0; for (const t of TOK20(d.name)) if (toks.has(t)) ov++;
    out.push({ d, q, gain, hd, sRed, cRed, where, same: where === 'chain' || where === 'brand', rank: gain + 1.2 * Math.max(0, sRed) + 0.4 * Math.max(0, cRed) + 0.15 * hd + Math.min(3, ov) * 3 + (where === 'brand' ? 8 : where === 'pin' ? 3 : 0) - (d.rank || 0) / Math.max(1, engine.docs.length) * 3 });
  }
  out.sort((a, b) => b.rank - a.rank); const seen = new Set(), res = [];
  for (const x of out) { const k = base24(x.d.name) + '|' + bfam24(x.d.brand); if (seen.has(k)) continue; seen.add(k); res.push(x); if (res.length >= limit) break; }
  return res;
}
self.better24 = better24;
smartSwaps20 = function (doc, cur, limit) { return better24(doc, cur, limit || 3); }; /* log hints, Today and list hints now use the stricter same-kind rules */
const saves24 = x => { const a = []; if (x.sRed >= 0.5) a.push(`${g24(x.sRed)} g sugar`); if (x.cRed >= 0.5) a.push(`${g24(x.cRed)} g carbs`); return a.length ? 'saves ' + a.join(', ') : (x.sRed > -0.5 && x.cRed > -0.5 ? 'same sugar and carbs' : ''); };
const where24 = (x, doc) => x.where === 'chain' ? `Same chain` : x.where === 'brand' ? 'Same brand' : x.where === 'pin' ? (() => { const S = window.LumiStores, ds = stores20(x.d.sm), i = PINS24().find(j => ds.includes(j)); return i != null && S ? 'At ' + S.STORES[i][2] : 'Same store'; })() : 'Same store';
function bcItem24(x, doc) { const d = x.d, q = x.q, groc = d.src !== 'rest';
  return `<li class="bc24i"><a class="bc24a" href="#/product/${esc(d.code)}">${typeof thumb === 'function' ? thumb(d.img, d.name, d.keys, d.cat, false, d.brand) : ''}<span class="bc24t"><b>${esc(d.name)}</b><small>${esc(d.brand || '')} · <span class="same20">${esc(where24(x, doc))}</span></small>${scores20(d.h, d.score)}
   <span class="bc24s"><b>${esc(saves24(x))}</b> ${esc(q.basis === 'per item' ? 'per item' : 'per serving')}</span><small class="sv20">${esc(g24(q.s))} g sugar · ${esc(g24(q.c))} g carbs ${esc(q.basis)}</small></span></a>
   <span class="bc24b"><button type="button" class="btn sm" data-bcc="${esc(d.code)}">⇆ Compare</button>${groc ? `<button type="button" class="btn sm" data-bcg="${esc(d.code)}"${typeof onG21 === 'function' && onG21(d.code) ? ' aria-pressed="true"' : ''}>${typeof onG21 === 'function' && onG21(d.code) ? '✓ On grocery list' : '＋ Grocery list'}</button>` : ''}</span></li>`; }
function bcBlock24(doc, cur, L) { const rest = doc.src === 'rest' || /^(r-|ms-)/.test(doc.code || ''); const ty = type20(doc), kindW = rest ? ({ main: 'main', side: 'side', drink: 'drink', dessert: 'dessert', sauce: 'sauce', breakfast: 'breakfast item' }[ty] || 'item') : 'product';
  const scope = rest ? `Same chain (${esc(doc.brand)}), same kind (${kindW}), similar serving` : doc.src === 'whole' ? 'Same category of basic foods, similar serving' : `Same category from the same brand or your stores (Costco and Whole Foods first), similar serving`;
  return `<section class="card bc24" id="bc24" aria-labelledby="bc24h"><div class="fx-h"><h2 id="bc24h">Better choice</h2><span class="small">${scope}</span></div>
   <p class="small bc24c">This one: Health ${cur.h ?? '?'} · Blood sugar ${cur.score ?? '?'} · ${cur.sugar == null ? '' : g24(cur.sugar) + ' g sugar, '}${g24(cur.carbs)} g carbs ${esc(cur.basis || 'per serving')}.</p>
   ${L.length ? `<ul class="bc24l">${L.map(x => bcItem24(x, doc)).join('')}</ul><p class="foot small">Only shown when the swap is better for blood sugar first (Blood sugar score +5 or more), then health, with no more sugar or carbs per serving.</p>`
   : `<p class="small">No clearly better ${rest ? kindW + ' at ' + esc(doc.brand) : 'option in this category from the same brand or your stores'} right now. ${cur.score >= 70 ? 'This is already one of the better picks.' : ''}</p>`}</section>`; }
async function bcBind24(p) { const root = $('#bc24'); if (!root) return;
  root.querySelectorAll('[data-bcc]').forEach(b => b.onclick = async () => { b.disabled = true; try { const q = await resolveProduct(b.dataset.bcc); if (!q) throw 0; if (!cmpIds().includes(p.id)) toggleCompare(p); if (!cmpIds().includes(q.id)) toggleCompare(q); b.textContent = '✓ Comparing'; toast('Added to compare. Tap Compare at the bottom'); } catch { toast("Couldn't load that item. Check your connection."); } b.disabled = false; });
  root.querySelectorAll('[data-bcg]').forEach(b => b.onclick = async () => { if (b.getAttribute('aria-pressed') === 'true') { location.hash = '#/grocery'; return; } b.disabled = true; try { const it = await itemFor21(b.dataset.bcg, 'swap'); if (it && addG21(it)) { b.textContent = '✓ On grocery list'; b.setAttribute('aria-pressed', 'true'); toast('Added to your grocery list'); } else toast('Already on your grocery list'); } catch { toast("Couldn't add it"); } b.disabled = false; }); }
productSwaps20 = async function (p) {
  if (!p || p.src === 'cos') return; try { await loadIndex(); } catch { return; }
  const code = p.code || p.id; const doc = engine.byCode(code) || { code, name: p.name, brand: p.brand, cat: p.cat || '', keys: [], src: /^(r-|ms-)/.test(code) ? 'rest' : 'local', sg: p.servQ || 0, sb: p.meta && p.meta.perItem ? 1 : p.servQ ? 0 : 3 };
  const draw = () => { if (!location.hash.includes(encodeURIComponent(code)) && !location.hash.includes(code)) return;
    const k = servK24(p), n = p.n || {}; let sc = null, h = null; try { sc = LumiScore.score(p, { mult: 1 }).score; } catch {} try { h = LumiHealth.rate(p, { mult: 1 }).score; } catch {}
    if (n.carbs == null || sc == null) return;
    const cur = { score: sc, h: doc.h != null ? doc.h : h, sugar: n.sugars == null ? null : n.sugars * k, carbs: n.carbs * k, basis: servLabel24(p).replace(/<[^>]+>/g, '') };
    const L = better24(doc, cur, 3), html = bcBlock24(doc, cur, L); const old = $('#bc24'); if (old) old.remove();
    const anchor = $('#hcard') || $('#bg8') || app.querySelector('.card'); if (!anchor) return; anchor.insertAdjacentHTML('afterend', html); bcBind24(p); };
  draw(); try { await loadIndexFull(); draw(); } catch {}
};
searchSwaps20 = function () {
  const res = $('#res'); if (!res || typeof engine === 'undefined' || !engine.docs.length) return; let n = 0;
  for (const a of res.querySelectorAll('a.row')) { if (n >= 8) break; if (a.dataset.sw20) continue; a.dataset.sw20 = '1'; n++;
    const code = decodeURIComponent((a.getAttribute('href') || '').replace('#/product/', '')); const d = engine.byCode(code); if (!d || d.score == null || d.score >= 80) continue;
    const q = perServ20(d); if (!q) continue; const L = better24(d, { score: d.score, h: d.h, sugar: q.s, carbs: q.c }, 1); if (!L.length) continue; const x = L[0], sv = saves24(x);
    a.insertAdjacentHTML('afterend', `<a class="srs20 bch24" href="#/product/${esc(x.d.code)}" aria-label="Better choice for ${esc(d.name)}: ${esc(x.d.name)}, ${esc(sv)} per serving, Blood sugar ${x.d.score}, Health ${x.d.h ?? 'unknown'}"><span aria-hidden="true">↘</span> <span>Better: <b>${esc(x.d.name)}</b>${x.d.brand ? ` <small>${esc(x.d.brand)}</small>` : ''}</span><span class="w20">${esc(sv)}/serving · H ${x.d.h ?? '?'} · BS ${x.d.score}</span></a>`); }
};

/* ---------- 3. product page: hide the older suggestion blocks, per-serving table, new share card ---------- */
if (typeof bind8 === 'function') { const b80 = bind8; bind8 = function (p, s) { const r = b80.apply(this, arguments);
  try { fixNut24(p); } catch (e) { console.warn(e); }
  try { const b = $('#shareCard'); if (b) { b.textContent = '🖼 Score card'; b.onclick = () => shareSheet24(prodCard24(p)); } } catch {}
  try { if (p.src === 'rest' || /^(r-|ms-)/.test(p.id || '')) { const a = app.querySelector('.actions'); if (a && !$('#ord24l') && !(typeof BOWL20 !== 'undefined' && BOWL20.some(c => c.chain === p.brand))) a.insertAdjacentHTML('afterend', `<p class="ord24p"><a class="btn sm" id="ord24l" href="#/order/${slug24(p.brand)}">🍽️ Build a meal at ${esc(p.brand)} under your targets</a></p>`); } } catch {}
  return r; }; }

/* ---------- 4. shareable score cards (PNG via canvas) ---------- */
const BAND24 = { ex: ['#157A3E', '#FFFFFF', 'Excellent'], gd: ['#8CC152', '#132019', 'Good'], pr: ['#F0A93B', '#132019', 'Poor'], bd: ['#C8372D', '#FFFFFF', 'Bad'], na: ['#9AA3A0', '#132019', 'Unknown'] };
function warn24(p) { try { const s = S.score(p), hr = HR(p), F = factRows75(p, s, hr); return F.neg.filter(r => r.key !== 'add' && (r.l === 2 || r.l === 3)).map(r => /impact$/i.test(r.desc) ? r.desc.replace(/\s*impact$/i, '') + ' ' + r.title.toLowerCase() : r.desc).slice(0, 3); } catch { return []; } }
function prodCard24(p) { const k = servK24(p), n = p.n || {}; let c = null, h = null; try { c = LumiScore.score(p, { mult: 1 }).score; } catch {} try { h = LumiHealth.rate(p, { mult: 1 }).score; } catch {}
  const url = p.src === 'custom' ? '' : location.origin + location.pathname + '#/product/' + encodeURIComponent(p.id);
  return { kind: 'product', title: p.name, sub: (p.brand || '') + (p.src === 'custom' ? ' · user-entered' : ''), serving: servLabel24(p).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'), h, c, sugar: n.sugars == null ? null : n.sugars * k, carbs: n.carbs == null ? null : n.carbs * k, warn: warn24(p), url, file: 'lumi-' + slug24(p.name).slice(0, 40) + '.png' }; }
function wrap24(x, t, X, Y, W, lh, max) { const words = String(t || '').split(/\s+/); let line = '', n = 0; for (const w of words) { const tt = line ? line + ' ' + w : w; if (x.measureText(tt).width > W && line) { if (n === max - 1) { let l = line; while (x.measureText(l + '…').width > W && l.length) l = l.slice(0, -1); x.fillText(l + '…', X, Y + n * lh); return n + 1; } x.fillText(line, X, Y + n * lh); line = w; n++; } else line = tt; } if (line && n < max) { x.fillText(line, X, Y + n * lh); n++; } return n; }
function rr24(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
async function canvas24(o) {
  try { if (document.fonts) { await Promise.race([Promise.all([document.fonts.load('600 52px "Fraunces Variable"'), document.fonts.load('600 26px "Inter Variable"')]), new Promise(r => setTimeout(r, 1200))]); } } catch {}
  const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const IN = '"Inter Variable",Inter,system-ui,sans-serif', FR = '"Fraunces Variable",Fraunces,Georgia,serif';
  x.fillStyle = '#F5F3EC'; x.fillRect(0, 0, W, H); x.fillStyle = '#FFFFFF'; rr24(x, 32, 32, W - 64, H - 64, 28); x.fill(); x.strokeStyle = 'rgba(20,40,30,.13)'; x.lineWidth = 2; x.stroke();
  x.fillStyle = '#17724F'; x.beginPath(); x.arc(84, 92, 20, 0, 7); x.fill(); x.fillStyle = '#F3B53F'; x.beginPath(); x.arc(91, 85, 7, 0, 7); x.fill();
  x.fillStyle = '#132019'; x.font = `700 36px ${FR}`; x.fillText('lumi', 116, 105); x.fillStyle = '#56655D'; x.font = `500 20px ${IN}`; x.fillText(o.kind === 'meal' ? 'Meal score card' : 'Food score card', 210, 103);
  x.fillStyle = '#132019'; x.font = `600 50px ${FR}`; const nl = wrap24(x, o.title, 72, 190, 640, 58, 2);
  let y = 190 + nl * 58 - 14; x.fillStyle = '#34433B'; x.font = `500 24px ${IN}`; if (o.sub) { y += 18; y += 30 * wrap24(x, o.sub, 72, y + 12, 640, 30, o.kind === 'meal' ? 3 : 1); }
  x.font = `600 21px ${IN}`; const sv = String(o.serving || ''); const sw = Math.min(640, x.measureText(sv).width + 32); y += 18; x.fillStyle = '#DDEFE6'; rr24(x, 72, y, sw, 40, 20); x.fill(); x.fillStyle = '#11603F'; wrap24(x, sv, 88, y + 27, sw - 32, 26, 1);
  const tile = (X, v, label, band) => { const b = BAND24[band] || BAND24.na; x.fillStyle = b[0]; rr24(x, X, 128, 196, 196, 24); x.fill(); x.fillStyle = b[1]; x.textAlign = 'center'; x.font = `700 84px ${FR}`; x.fillText(v == null ? '?' : String(v), X + 98, 228); x.font = `600 20px ${IN}`; x.fillText('/100 · ' + b[2], X + 98, 266); x.font = `700 22px ${IN}`; x.fillText(label, X + 98, 300); x.textAlign = 'left'; };
  tile(724, o.h, 'Health', HB20(o.h)); tile(936, o.c, 'Blood sugar', CB20(o.c));
  const my = 410; const met = (X, lab, v) => { x.fillStyle = '#56655D'; x.font = `600 20px ${IN}`; x.fillText(lab, X, my); x.fillStyle = '#132019'; x.font = `700 46px ${FR}`; x.fillText(v == null ? '—' : g24(v) + ' g', X, my + 50); };
  met(724, 'Sugar', o.sugar); met(936, 'Total carbs', o.carbs);
  let wx = 72, wy = y + 76; x.font = `600 20px ${IN}`; (o.warn || []).slice(0, 3).forEach(w => { const t = '⚠ ' + w, tw = x.measureText(t).width + 28; if (wx + tw > 700) { wx = 72; wy += 50; } if (wy > 520) return; x.fillStyle = '#FCEFD6'; rr24(x, wx, wy, tw, 38, 19); x.fill(); x.fillStyle = '#7A4300'; x.fillText(t, wx + 14, wy + 26); wx += tw + 10; });
  x.fillStyle = 'rgba(20,40,30,.13)'; x.fillRect(72, 524, W - 144, 2); x.fillStyle = '#11603F'; x.font = `600 20px ${IN}`; const u = (o.url || 'jwardell15.github.io/lumi').replace(/^https?:\/\//, ''); wrap24(x, u, 72, 562, W - 144, 24, 1);
  x.fillStyle = '#56655D'; x.font = `500 17px ${IN}`; x.fillText('Lumi scores, as shown in the app · informational only, not medical advice', 72, 590);
  return c; }
self.canvas24 = canvas24; self.prodCard24 = prodCard24;
async function shareSheet24(o) {
  const old = $('#sh24'); if (old) old.remove(); const back = document.activeElement;
  document.body.insertAdjacentHTML('beforeend', `<div class="sh24" id="sh24" role="dialog" aria-modal="true" aria-labelledby="sh24h"><div class="sh24c card"><div class="fx-h"><h2 id="sh24h">Share score card</h2><button type="button" class="icon" id="sh24x" aria-label="Close">✕</button></div>
   <div class="sh24p"><div class="skel" style="height:180px"></div></div><p class="small">${o.url ? 'The image shows Lumi\'s scores per serving. The link opens this ' + (o.kind === 'meal' ? 'meal' : 'item') + ' in Lumi.' : 'This is your own food, which stays on this device, so there is no link to share. You can share the image.'}</p>
   <div class="actions" id="sh24a"></div></div></div>`);
  const el = $('#sh24'), close = () => { el.remove(); if (back && back.focus) back.focus(); }; $('#sh24x').onclick = close; el.onclick = e => { if (e.target === el) close(); }; el.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }); $('#sh24x').focus();
  let c, blob; try { c = await canvas24(o); blob = await new Promise(r => c.toBlob(r, 'image/png')); } catch (e) { $('.sh24p').innerHTML = '<p class="small">Couldn\'t draw the card on this device.</p>'; return; }
  const url = URL.createObjectURL(blob); $('.sh24p').innerHTML = `<img src="${url}" alt="Score card for ${esc(o.title)}: Health ${o.h ?? 'unknown'}, Blood sugar ${o.c ?? 'unknown'}, ${g24(o.sugar)} g sugar and ${g24(o.carbs)} g carbs ${esc(o.serving || '')}" width="1200" height="630">`;
  const file = new File([blob], o.file || 'lumi-card.png', { type: 'image/png' }); const canFile = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  const txt = `${o.title}: Health ${o.h ?? '?'}/100, Blood sugar ${o.c ?? '?'}/100, ${g24(o.sugar)} g sugar, ${g24(o.carbs)} g carbs ${o.serving || ''} (Lumi)`;
  $('#sh24a').innerHTML = `${canFile ? '<button class="btn pri" id="sh24s">↗ Share image</button>' + (o.url ? '<button class="btn" id="sh24l">↗ Share link</button>' : '') : navigator.share && o.url ? '<button class="btn pri" id="sh24l">↗ Share link</button>' : ''}<button class="btn${canFile || (navigator.share && o.url) ? '' : ' pri'}" id="sh24d">⬇ Download PNG</button>${o.url ? '<button class="btn" id="sh24c">🔗 Copy link</button>' : ''}`;
  if ($('#sh24s')) $('#sh24s').onclick = async () => { try { await navigator.share({ files: [file], title: 'Lumi: ' + o.title, text: txt + (o.url ? '\n' + o.url : '') }); } catch (e) { if (e && e.name !== 'AbortError') toast("Couldn't share. Try Download instead"); } };
  if ($('#sh24l')) $('#sh24l').onclick = () => navigator.share({ title: 'Lumi: ' + o.title, text: txt, url: o.url }).catch(() => {});
  $('#sh24d').onclick = () => { const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500); toast('Card downloaded'); };
  if ($('#sh24c')) $('#sh24c').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(o.url) : Promise.reject()).then(() => toast('Link copied'), () => { prompt('Copy this link', o.url); });
  el.dataset.ready = '1';
}
self.shareSheet24 = shareSheet24;
shareProductCard = function (p) { return shareSheet24(prodCard24(p)); };
})();

/* ---------- 5. Chain order builder: #/order and #/order/<chain>[/m/<main>~<side>~<drink>] ---------- */
(function () {
const NOTM24 = self.NOTM24, OEX24 = self.OEX24;
const slug24 = self.slug24, g = v => v == null || isNaN(v) ? '—' : (Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
const BUN24 = /^[\d"”' .-]*(sesame seed |plain |brioche |wheat |white |honey wheat |multigrain )?(bun|buns|roll|bread|tortilla|croissant|bagel only|english muffin)\s*$/i;
const SIDEN24 = /\b(mozzarella sticks|jalape(n|ñ)o bites|onion rings|poppers|potato cakes|fries|tots|hash browns?)\b/i;
const ZERO24 = /\b(water|diet|zero|sugar[- ]?free|unsweet(ened)?|black coffee|americano|espresso|brewed coffee|hot coffee|iced coffee|cold brew|club soda|seltzer|sparkling water|unsweet tea|hot tea|green tea|black tea)\b/i;
const poss24 = c => esc(c) + (/['’]s$/i.test(c) ? '' : /s$/i.test(c) ? '’' : '’s');
const st = () => Object.assign({ c: 60, s: 10, p: '', side: true, meal: 'lunch' }, store.get('order24', {}));
const chains24 = () => { const m = new Map(); for (const d of engine.docs) if (d.src === 'rest' && d.brand) m.set(d.brand, (m.get(d.brand) || 0) + 1); return [...m].filter(x => x[1] >= 6).sort((a, b) => a[0].localeCompare(b[0])); };
const chainBy24 = sl => { for (const [b] of chains24()) if (slug24(b) === sl) return b; return null; };
async function ready24() { try { await loadIndex(); } catch {} try { await loadIndexFull(); } catch {} try { if (typeof ensure22 === 'function') for (let i = 0; i < 4 && await ensure22(); i++); } catch {} }
function pools24(chain, T) {
  const P = { main: [], breakfast: [], side: [], drink: [] }, cnt = { total: 0, noData: 0, noServ: 0, noProt: 0, skipped: 0 };
  for (const d of engine.docs) { if (d.src !== 'rest' || d.brand !== chain) continue; cnt.total++;
    let role = type20(d); if ((role === 'main' || role === 'breakfast') && SIDEN24.test(d.name)) role = 'side'; if (role === 'dessert' || role === 'sauce' || NOTM24.test(d.name) || OEX24.test(d.name) || BUN24.test(d.name) || (d.fl && role !== 'drink') || d.bad) { cnt.skipped++; continue; }
    if (d.net == null || d.sugar == null) { cnt.noData++; continue; } const q = perServ20(d); if (!q || q.basis === 'per 100 g') { cnt.noServ++; continue; }
    const p = d.p22 != null ? d.p22 * q.k : null; if (T.p && p == null && (role === 'main' || role === 'breakfast')) { cnt.noProt++; continue; }
    const it = { d, c: q.c, s: q.s, p, role, basis: q.basis };
    if (role === 'main' || role === 'breakfast') { if (p != null ? p < 6 : q.c < 10) { cnt.skipped++; continue; } P[role].push(it); } else P[role].push(it); }
  return { P, cnt }; }
function zeroDrinks24(P) { const z = P.drink.filter(x => x.s <= 0.5 && x.c <= 2 && ZERO24.test(x.d.name) && !/\b(shake|smoothie|frapp|latte|mocha|lemonade|juice|milk)\b/i.test(x.d.name));
  const pr = x => /\bwater\b/i.test(x.d.name) ? 0 : /\b(diet|zero)\b/i.test(x.d.name) ? 1 : 2; return z.sort((a, b) => pr(a) - pr(b) || (/\b(medium|regular)\b/i.test(b.d.name) - /\b(medium|regular)\b/i.test(a.d.name)) || a.d.name.localeCompare(b.d.name)); }
const fits24 = (t, T) => t.c <= T.c && t.s <= T.s && (!T.p || (t.p != null && t.p >= T.p));
const tot24 = parts => parts.filter(Boolean).reduce((a, x) => ({ c: a.c + x.c, s: a.s + x.s, p: a.p == null || x.p == null ? (a.p == null ? null : a.p) : a.p + x.p }), { c: 0, s: 0, p: 0 });
const rankM24 = (t, m) => -(3 * t.s + t.c) + 0.6 * (t.p || 0) + 0.15 * (m.d.h || 0) + 0.15 * (m.d.score || 0);
function propose24(P, T, n = 3) {
  const mains = T.meal === 'breakfast' ? P.breakfast : P.main.concat(T.meal === 'any' ? P.breakfast : []); const drink = zeroDrinks24(P)[0] || null;
  const sides = P.side.slice().sort((a, b) => (2 * a.s + a.c - 0.3 * (a.p || 0)) - (2 * b.s + b.c - 0.3 * (b.p || 0))); const out = [];
  for (const m of mains) { let side = null; if (T.side) side = sides.find(sd => fits24(tot24([m, sd, drink]), T)) || null;
    const t = tot24([m, side, drink]); if (!fits24(t, T)) continue; out.push({ main: m, side, drink, t, r: rankM24(t, m) + (side ? 2 : 0) }); }
  out.sort((a, b) => b.r - a.r); const seen = new Set(), res = [];
  for (const x of out) { const k = x.main.d.name.toLowerCase().replace(/\b(small|medium|large|regular|\d+ ?(oz|pc|piece)s?)\b/g, '').replace(/[^a-z]/g, '').slice(0, 14); if (seen.has(k)) continue; seen.add(k); res.push(x); if (res.length >= n) break; }
  const near = res.length ? [] : mains.map(m => ({ m, t: tot24([m, drink]) })).sort((a, b) => (3 * a.t.s + a.t.c) - (3 * b.t.s + b.t.c)).slice(0, 3);
  return { res, near, drink }; }
/* full records -> totals and both scores, built the same way as the bowl builder */
async function score24(parts, chain) {
  const ps = await Promise.all(parts.map(x => x ? resolveProduct(x.d.code).catch(() => null) : null)); const T = { kcal: 0, carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, sat: 0, sodiumMg: 0 }, miss = new Set(); let gsum = 0, gramsKnown = true, added = 0, addedOk = true;
  ps.forEach((p, i) => { if (!parts[i]) return; if (!p) { miss.add('loading'); return; } const per = p.meta && p.meta.perItem; const k = per ? 1 : (+p.servQ || 100) / 100; if (per) gramsKnown = false; else gsum += +p.servQ || 100;
    for (const f of Object.keys(T)) { const v = p.n && p.n[f]; if (v == null) miss.add(f); else T[f] += v * k; } if (p.n && p.n.added != null) added += p.n.added * k; else addedOk = false; });
  const n = {}, div = gramsKnown && gsum ? gsum / 100 : 1; for (const [k, v] of Object.entries(T)) n[k] = miss.has(k) ? null : v / div; if (addedOk) n.added = added / div;
  const names = parts.filter(Boolean).map(x => x.d.name);
  const q = { id: 'ord24-' + parts.filter(Boolean).map(x => x.d.code).join('~'), code: '', src: 'custom', name: names.join(' + '), brand: chain + ' (meal)', qty: '', img: '', servQ: gramsKnown ? Math.round(gsum) : 100, serv: gramsKnown ? `1 meal (${Math.round(gsum)} g)` : '1 meal', nova: null, additives: [], ing: '', cat: 'Restaurant meal', cats: '', naLabel: true, liquid: false, portions: [], meta: { src: chain + ' official nutrition', perItem: !gramsKnown }, n };
  let c = null, h = null; try { c = LumiScore.score(q).score; } catch {} try { h = LumiHealth.rate(q, { whole: false, group: '' }).score; } catch {}
  return { ps, T, miss, c, h, q }; }
function mealCard24(o) { return { kind: 'meal', title: o.chain + ' meal', sub: o.parts.filter(Boolean).map(x => x.d.name).join(' + '), serving: 'Whole meal, as listed by ' + o.chain, h: o.sc.h, c: o.sc.c, sugar: o.sc.T.sugars, carbs: o.sc.T.carbs, warn: [o.sc.T.carbs > 75 ? 'High carbs for one meal' : '', o.sc.T.sodiumMg > 1500 ? 'Very high sodium' : '', o.sc.T.sat > 10 ? 'High saturated fat' : ''].filter(Boolean), url: location.origin + location.pathname + `#/order/${slug24(o.chain)}/m/` + o.parts.map(x => x ? encodeURIComponent(x.d.code) : '-').join('~'), file: 'lumi-' + slug24(o.chain) + '-meal.png' }; }
function compRow24(x, role, i, alts, T, others) {
  const lab = { main: 'Main', breakfast: 'Main', side: 'Side', drink: 'Drink' }[role];
  const opt = a => { const t = tot24(others.concat([a])); return `<option value="${esc(a.d.code)}"${x && a.d.code === x.d.code ? ' selected' : ''}>${esc(a.d.name)} · ${g(a.s)} g sugar · ${g(a.c)} g carbs${fits24(t, T) ? '' : ' (over target)'}</option>`; };
  const fit = alts.filter(a => fits24(tot24(others.concat([a])), T)), over = alts.filter(a => !fits24(tot24(others.concat([a])), T));
  return `<li><span class="rl24">${lab}</span>
   ${x ? `<div class="r24"><a href="#/product/${esc(x.d.code)}"><b>${esc(x.d.name)}</b></a>${scores20(x.d.h, x.d.score)}</div><small>${g(x.s)} g sugar · ${g(x.c)} g carbs · ${x.p == null ? '—' : g(x.p)} g protein · ${esc(x.basis)}</small>` : `<span class="small">${role === 'drink' ? 'No drink (water)' : 'No side'}</span>`}
   <label class="small"><span class="vh">Swap ${lab.toLowerCase()} for meal ${i + 1}</span><select data-sw24="${i}" data-role="${role}" aria-label="Swap ${lab.toLowerCase()} for meal ${i + 1}">${role !== 'main' && role !== 'breakfast' ? `<option value="-"${x ? '' : ' selected'}>${role === 'drink' ? 'No drink (water)' : 'No side'}</option>` : ''}${fit.length ? `<optgroup label="Fits your targets">${fit.map(opt).join('')}</optgroup>` : ''}${over.length ? `<optgroup label="Over a target">${over.map(opt).join('')}</optgroup>` : ''}</select></label></li>`; }
async function viewOrder24(arg) {
  const parts0 = String(arg || '').split('/'), sl = parts0[0], fixed = parts0[1] === 'm' ? (parts0[2] || '').split('~') : null;
  app.innerHTML = `<section class="pg13 or24"><h1>Build a meal</h1><div class="skel" style="height:220px"></div></section>`; await ready24();
  if (!location.hash.startsWith('#/order')) return;
  if (!sl) return hub24(); const chain = chainBy24(sl); if (!chain) return hub24(`Lumi has no menu for “${esc(sl)}”.`);
  document.title = `Build a meal at ${chain} — Lumi`; const T = st(); const bowl = typeof BOWL20 !== 'undefined' && BOWL20.find(c => c.chain === chain);
  const { P, cnt } = pools24(chain, T); const prop = propose24(P, T); let meals = prop.res.map(x => [x.main, x.side, x.drink]);
  if (fixed) { const by = c => { const d = c && c !== '-' ? engine.byCode(decodeURIComponent(c)) : null; if (!d) return null; const q = perServ20(d); return q ? { d, c: q.c, s: q.s, p: d.p22 != null ? d.p22 * q.k : null, role: type20(d), basis: q.basis } : null; }; const m = fixed.map(by); if (m[0]) meals = [m]; }
  const mainPool = T.meal === 'breakfast' ? P.breakfast : P.main.concat(T.meal === 'any' ? P.breakfast : []);
  const sorter = (a, b) => (3 * a.s + a.c) - (3 * b.s + b.c);
  const excl = [cnt.noData ? `${cnt.noData} without published sugar or carb values` : '', cnt.noServ ? `${cnt.noServ} without a serving size` : '', cnt.noProt ? `${cnt.noProt} mains without protein (needed for your protein minimum)` : ''].filter(Boolean);
  app.innerHTML = `<section class="pg13 or24"><header><h1>Build a meal at ${esc(chain)}</h1><p class="lead">Set your targets. Lumi proposes complete meals from ${poss24(chain)} own menu: a main, an optional side, and a zero-sugar drink when the chain lists one.</p></header>
   ${bowl ? `<p class="note small">${esc(chain)} publishes ingredients rather than finished meals. <a class="lnk" href="#/bowl/${bowl.id}">Build your own ${esc(bowl.kind)} ›</a></p>` : ''}
   <form class="card" id="or24f"><h2>Targets for this meal</h2><div class="tg24">
    <label>Sugar at most (g)<input type="number" name="s" min="0" max="200" step="1" inputmode="numeric" value="${T.s}"></label>
    <label>Total carbs at most (g)<input type="number" name="c" min="0" max="400" step="1" inputmode="numeric" value="${T.c}"></label>
    <label>Protein at least (g, optional)<input type="number" name="p" min="0" max="200" step="1" inputmode="numeric" value="${T.p}" placeholder="Any"></label>
    <label>Meal<select name="meal"><option value="lunch"${T.meal === 'lunch' ? ' selected' : ''}>Lunch or dinner</option><option value="breakfast"${T.meal === 'breakfast' ? ' selected' : ''}>Breakfast</option><option value="any"${T.meal === 'any' ? ' selected' : ''}>Any</option></select></label></div>
    <label class="ck24"><input type="checkbox" name="side"${T.side ? ' checked' : ''}> Add a side when it still fits</label><button class="btn pri">Find meals</button></form>
   <p class="small" id="or24n">${cnt.total} ${esc(chain)} items checked. ${excl.length ? 'Left out: ' + excl.join(', ') + '. ' : ''}${cnt.skipped ? `${cnt.skipped} add-ons, sauces, desserts, kids' and family-size items aren't used as meal parts.` : ''}${prop.drink ? '' : ` ${esc(chain)} doesn't list a zero-sugar drink, so meals show no drink (water).`}</p>
   <div id="or24r" aria-live="polite"></div>
   <p class="foot">Numbers are ${poss24(chain)} published nutrition per item as served. Restaurant portions vary. Informational only, not medical advice.</p></section>`;
  $('#or24f').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); const num = (v, d) => v === '' || v == null ? d : Math.max(0, Math.min(400, +v)); store.set('order24', { s: num(f.get('s'), 10), c: num(f.get('c'), 60), p: f.get('p') === '' ? '' : num(f.get('p'), ''), meal: f.get('meal'), side: !!f.get('side') }); location.hash = '#/order/' + sl; viewOrder24(sl); };
  const draw = async () => { const R = $('#or24r'); if (!R) return;
    if (!meals.length) { R.innerHTML = `<div class="card" role="status"><h2>No complete meal fits these targets</h2><p class="small">Try a higher carb or sugar limit${T.p ? ' or a lower protein minimum' : ''}.</p>${prop.near.length ? `<p class="small">Closest mains (with drink):</p><ul class="cp24">${prop.near.map(x => `<li><a href="#/product/${esc(x.m.d.code)}"><b>${esc(x.m.d.name)}</b></a><small>${g(x.t.s)} g sugar${x.t.s > T.s ? ` <span class="over24">(${g(x.t.s - T.s)} over)</span>` : ''} · ${g(x.t.c)} g carbs${x.t.c > T.c ? ` <span class="over24">(${g(x.t.c - T.c)} over)</span>` : ''}${T.p !== '' && T.p != null ? ` · ${x.t.p == null ? 'protein not listed' : g(x.t.p) + ' g protein'}${x.t.p != null && x.t.p < T.p ? ` <span class="over24">(${g(T.p - x.t.p)} short)</span>` : ''}` : ''}</small></li>`).join('')}</ul>` : ''}</div>`; return; }
    R.innerHTML = `<ol class="ml24">${meals.map((m, i) => `<li class="card" id="ml24-${i}"><h3>Meal ${i + 1}</h3><div class="skel" style="height:120px"></div></li>`).join('')}</ol>`;
    for (let i = 0; i < meals.length; i++) { const m = meals[i], sc = await score24(m, chain), el = $('#ml24-' + i); if (!el) return; const t = tot24(m), ok = fits24(t, T);
      const role0 = m[0].role === 'breakfast' ? 'breakfast' : 'main';
      el.innerHTML = `<h3>Meal ${i + 1}</h3><div class="r24">${scores20(sc.h, sc.c)} <span class="${ok ? 'ok24' : 'over24'}">${ok ? '✓ Fits your targets' : '⚠ Over a target'}</span></div><p class="small">Scores for the whole meal.</p>
       <div class="tt24"><div class="key"><small>Sugar</small><b>${g(sc.T.sugars)} g</b></div><div class="key"><small>Total carbs</small><b>${g(sc.T.carbs)} g</b></div><div><small>Protein</small><b>${sc.miss.has('protein') ? g(sc.T.protein) + '+' : g(sc.T.protein)} g</b></div><div><small>Fiber</small><b>${g(sc.T.fiber)} g</b></div><div><small>Calories</small><b>${Math.round(sc.T.kcal)}</b></div></div>
       ${[...sc.miss].filter(f => f !== 'loading').length ? `<p class="note small">${esc(chain)} doesn't publish ${[...sc.miss].filter(f => f !== 'loading').join(', ')} for every part; those totals count only parts that list them.</p>` : ''}
       <ul class="cp24">${compRow24(m[0], role0, i, mainPool.slice().sort(sorter), T, [m[1], m[2]].filter(Boolean))}${compRow24(m[1], 'side', i, P.side.slice().sort(sorter), T, [m[0], m[2]].filter(Boolean))}${compRow24(m[2], 'drink', i, P.drink.slice().sort(sorter), T, [m[0], m[1]].filter(Boolean))}</ul>
       <div class="actions"><button class="btn pri" data-log24="${i}">Log it</button><button class="btn" data-save24="${i}">Save to My meals</button><button class="btn" data-card24="${i}">🖼 Score card</button></div>`;
      el.querySelectorAll('[data-sw24]').forEach(s => s.onchange = () => { const idx = { main: 0, breakfast: 0, side: 1, drink: 2 }[s.dataset.role]; const d = s.value === '-' ? null : engine.byCode(s.value); if (!d && idx === 0) return; const q = d && perServ20(d);
        meals[i][idx] = d ? { d, c: q.c, s: q.s, p: d.p22 != null ? d.p22 * q.k : null, role: type20(d), basis: q.basis } : null; draw().then(() => { const f = $(`#ml24-${i} [data-sw24][data-role="${s.dataset.role}"]`); if (f) f.focus(); }); });
      const items = () => sc.ps.map((p, j) => p && m[j] ? { p, grams: p.meta && p.meta.perItem ? 100 : (+p.servQ || 100), label: p.meta && p.meta.perItem ? '1 item' : (p.serv || Math.round(p.servQ) + ' g') } : null).filter(Boolean);
      el.querySelector('[data-log24]').onclick = () => { const now = new Date(), ml = T.meal === 'breakfast' ? 'breakfast' : mealFor(now); items().forEach(x => addEntry(x.p, x.grams, x.label, ml, now.getTime())); toast(`Logged ${items().length} items to ${MEAL_L[ml]}`); };
      el.querySelector('[data-save24]').onclick = () => { const its = items().map(x => ({ pid: x.p.id, name: x.p.name, brand: x.p.brand || chain, grams: x.grams, label: x.label, n: per100(x.p), score: null })); const ms = savedMeals(); const nm = `${chain}: ${its.map(x => x.name).join(' + ')}`.slice(0, 90);
        ms.unshift({ id: 'm' + Date.now().toString(36), name: nm, items: its, used: 0 }); store.set('meals', ms); toast('Saved to My meals'); };
      el.querySelector('[data-card24]').onclick = () => shareSheet24(mealCard24({ chain, parts: m, sc })); } };
  draw(); }
function hub24(msg) { document.title = 'Build a meal at a chain — Lumi'; const L = chains24(), rec = store.get('order24r', []);
  app.innerHTML = `<section class="pg13 oh24"><h1>Build a meal at a chain</h1><p class="lead">Pick a restaurant, set a sugar and carb limit, and Lumi suggests complete meals from that chain's official nutrition.</p>${msg ? `<p class="note">${msg}</p>` : ''}
   <label class="fl11"><span>Find a chain</span><input id="oh24q" type="search" autocomplete="off" placeholder="e.g. Arby's, Panera, Taco Bell"></label>
   <ul class="oh24l" id="oh24l"></ul><p class="foot small">${L.length} chains with published nutrition in Lumi.</p></section>`;
  const paint = q => { const t = q.trim().toLowerCase(); const S = L.filter(([b]) => !t || b.toLowerCase().includes(t)); $('#oh24l').innerHTML = S.slice(0, t ? 60 : 400).map(([b, n]) => `<li><a href="#/order/${slug24(b)}"><span>${esc(b)}</span><small>${n} items ›</small></a></li>`).join('') || '<li class="small">No chain matches.</li>'; };
  $('#oh24q').oninput = e => paint(e.target.value); paint(''); }
self.viewOrder24 = viewOrder24; self.propose24 = propose24; self.pools24 = pools24;
if (typeof tab19 === 'function') { const t0 = tab19; tab19 = function (view) { if (view === 'order') return 'browse'; return t0.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh = viewHome; viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i);
  if (v === 'order') { app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim(); return viewOrder24(i < 0 ? '' : h.slice(i + 1)); } return vh.apply(this, arguments); }; }
if (typeof viewBrowseHub === 'function') { const bh = viewBrowseHub; viewBrowseHub = function () { const r = bh.apply(this, arguments); const t = app.querySelector('.tools74'); if (t && !t.querySelector('[href="#/order"]')) t.insertAdjacentHTML('afterbegin', '<a href="#/order"><b>Build a meal at a chain</b><span>Main, side and drink under your sugar and carb limits</span></a>'); return r; }; }
if (/^#\/order/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
})();

if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift( /* 24.0 */
  ['🥄', 'Every item per serving, with the serving shown', 'Nutrition facts, scores and the data check now start per serving and say what the serving is, like "1 item, 128 g" or "per item (as published)". Per 100 g is still there as a second toggle. Sugar is listed first.'],
  ['🔁', 'Better choice on every item', 'Product and restaurant item pages suggest up to 3 swaps of the same kind (fries for fries, cereal for cereal, drink for drink) from the same chain, brand family or your pinned Costco and Whole Foods. Each one shows how much sugar and carbs it saves per serving and both scores. Lumi only suggests a swap when it is better for blood sugar first, then health. Search results show a short hint when there is one.'],
  ['🍽️', 'Build a meal at a chain', 'Pick a chain and your limits for sugar, total carbs and optional protein. Lumi proposes up to 3 complete meals from that chain\'s official menu (main, a side if it fits, and water or a zero-sugar drink), with totals and both scores. Swap any part, log it, or save it to My meals. Items with missing nutrition are left out and counted.'],
  ['🖼️', 'Shareable score cards', 'Turn a product or a meal into a picture with its serving, both scores, sugar, total carbs and top warnings. Share it, download it, or copy a link that opens the item.'],
  ['🔑', 'Faster, steadier USDA lookups', 'USDA searches now go through Lumi\'s own relay with its own key, so they no longer hit the shared demo limits. If the relay is down, Lumi falls back to the demo key. Details are on the Privacy page.']);
