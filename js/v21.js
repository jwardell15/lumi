'use strict';
/* Lumi 21.0: smarter label scan (vertical / dual-column / tabular / per-100 g labels, unreadable fields flagged, live scores, save to My foods),
   grocery list (My foods, favorites, accepted smart swaps; Whole Foods + Costco pinned; by section; check off; share / copy / print). Loaded last.
   Real data only: the label parser never fills a value it couldn't read; it flags the field for the user instead. */

/* ---------- 1. label parser ---------- */
const NUM21 = '(<\\s*|less than\\s*)?(\\d+(?:\\.\\d+)?)\\s*(mcg|mg|kcal|kj|ml|g|9|%)?';
const DV21 = { fat: 78, sat: 20, sodiumMg: 2300, carbs: 275, fiber: 28, added: 50, protein: 50 };
const LAB21 = {
  fat: [/\btotal\s*fat\b/i, /\bfat\b/i], sat: [/\bsat(?:urated|\.)?\s*fat\b|\bsaturates\b/i], sodiumMg: [/\bsodium\b/i],
  carbs: [/\btotal\s*carb(?:ohydrates?|s|\.)?/i, /\bcarbohydrates?\b|\bcarbs?\b/i], fiber: [/\b(?:dietary\s*)?fib(?:er|re)\b/i],
  sugars: [/\btotal\s*sugars?\b/i, /\bsugars?\b/i], added: [/\badded\s*sugars?\b/i], protein: [/\bprotein\b/i] };
const UNIT21 = { fat: 'g', sat: 'g', sodiumMg: 'mg', carbs: 'g', fiber: 'g', sugars: 'g', added: 'g', protein: 'g' };
const NAME21 = { serv: 'Serving size', grams: 'Serving weight', kcal: 'Calories', fat: 'Total fat', sat: 'Saturated fat', sodiumMg: 'Sodium', carbs: 'Total carbs', fiber: 'Fiber', sugars: 'Total sugars', added: 'Added sugars', protein: 'Protein' };
const ANYLAB21 = /\b(total\s*fat|sat(?:urated|\.)?\s*fat|saturates|trans\s*fat|cholest\w*|sodium|salt|total\s*carb\w*\.?|carbohydrates?|dietary\s*fib\w*|fib(?:er|re)|total\s*sugars?|sugars?|incl\w*\.?|added\s*sugars?|protein|vitamin|calcium|iron|potassium|calories|energy)\b/gi;
function clean21(raw) {
  let t = String(raw || '').replace(/\r/g, '').replace(/[|]/g, ' ').replace(/[‘’]/g, "'").replace(/[—–]/g, '-');
  t = t.replace(/(\d)\s*[oO](?=\s*(?:g|mg|%)\b)/g, '$10').replace(/\b[oO](?=\s*(?:g|mg)\b)/g, '0').replace(/\b[lI](?=\s*(?:g|mg)\b)/g, '1');
  t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2');
  return t;
}
/* amounts that follow a label, on the same line (or the next line when the label stands alone), up to the next nutrient label */
function after21(t, idx) {
  let s = t.slice(idx, idx + 90); const nl = s.indexOf('\n'); let line = nl < 0 ? s : s.slice(0, nl);
  if (!/\d/.test(line) && nl >= 0) { const rest = s.slice(nl + 1); const n2 = rest.indexOf('\n'); line = n2 < 0 ? rest : rest.slice(0, n2); }
  ANYLAB21.lastIndex = 0; const m = ANYLAB21.exec(line); if (m && m.index > 0) line = line.slice(0, m.index);
  const out = [], re = new RegExp(NUM21, 'gi'); let x;
  while ((x = re.exec(line))) out.push({ lt: !!x[1], v: +x[2], raw: x[2], u: (x[3] || '').toLowerCase() });
  return out;
}
function findLab21(t, list, skip) {
  for (const r of list) { const g = new RegExp(r.source, 'gi'); let m;
    while ((m = g.exec(t))) { const pre = t.slice(Math.max(0, m.index - 14), m.index).toLowerCase();
      if (skip && skip(pre, m[0].toLowerCase(), t.slice(m.index + m[0].length, m.index + m[0].length + 14).toLowerCase())) continue; return m.index + m[0].length; } }
  return -1;
}
function parseLabel21(raw) {
  const t = clean21(raw), flags = {}, notes = {}, v = { serv: '', grams: null, liquid: false, kcal: null, fat: null, sat: null, sodiumMg: null, carbs: null, fiber: null, sugars: null, added: null, protein: null };
  const lines = t.split('\n'); let layout = 'vertical', col = 0, per100 = false;
  const hdr = lines.find(l => /per\s*100\s*(g|ml)/i.test(l) && /serving|portion/i.test(l));
  if (/(?<!servings\s{0,3})per\s+(container|package|pack|pkg|bag|bottle|can|box|carton|jar)\b/i.test(t) && /per\s+serving/i.test(t)) layout = 'dual';
  else if (hdr) { layout = 'per100+serving'; col = /per\s*100/i.exec(hdr).index < /serving|portion/i.exec(hdr).index ? 1 : 0; }
  else if (/per\s*100\s*(g|ml)\b/i.test(t) && !/serving size/i.test(t)) { layout = 'per100'; per100 = true; }
  if (layout === 'vertical') { let multi = 0; for (const l of lines) { ANYLAB21.lastIndex = 0; const k = (l.match(ANYLAB21) || []).length; if (k >= 2) multi++; } if (multi >= 2) layout = 'tabular'; }
  const pickAmt = (A, k) => { const am = A.filter(a => a.u !== '%'); const pc = A.filter(a => a.u === '%');
    let a = am[col] || (col ? null : am[0]); if (!a) return null; let val = a.v, unit = a.u;
    const want = UNIT21[k], dv = DV21[k];
    if (unit === '9' || (!unit && want === 'g')) { // OCR often reads "g" as "9": 8g -> 89
      const s9 = /9$/.test(a.raw) && a.raw.length > 1 ? +a.raw.slice(0, -1) : null, pct = pc[col] || pc[0];
      if (unit === '9') { unit = 'g'; }
      else if (s9 != null) { const fit = c => pct && dv ? Math.abs(c / dv * 100 - pct.v) : null;
        if (pct && dv && fit(s9) < fit(val) && fit(s9) <= Math.max(2, pct.v * 0.3)) { val = s9; notes[k] = `Read as ${s9} g (the photo shows “${a.raw}”, likely “${s9}g”). Check it.`; flags[k] = 'check'; }
        else if (!(pct && dv && fit(val) <= Math.max(2, pct.v * 0.3))) { flags[k] = 'check'; notes[k] = `Read “${a.raw}” with no unit. If the label says ${s9} g, fix it.`; } } }
    if (want === 'mg' && unit === 'g') val = val * 1000;
    if (a.lt) { flags[k] = 'check'; notes[k] = `The label says “less than ${a.v}”. ${a.v} is filled in; change it if you prefer 0.`; }
    return val; };
  for (const k of Object.keys(LAB21)) {
    let skip = null;
    if (k === 'fat') skip = pre => /(sat\w*|trans|from|unsat\w*|mono\w*|poly\w*|of which)\.?\s*$/.test(pre);
    if (k === 'carbs') skip = pre => /net\s*$/.test(pre);
    if (k === 'sugars') skip = (pre, m, post) => /(added|incl\w*\.?\s*\d*\.?\d*\s*g?)\s*$/.test(pre) || /^\s*alcohol/.test(post);
    let i = findLab21(t, LAB21[k], skip);
    if (k === 'added') { const m = t.match(/incl(?:udes|\.)?\s*(<\s*)?(\d+(?:\.\d+)?)\s*(g|9)?\s*(?:of\s*)?added\s*sugars?/i);
      if (m) { v.added = +m[2]; if (m[1]) { flags.added = 'check'; notes.added = 'The label says “less than”. Check it.'; } continue; } }
    if (i < 0) continue; const A = after21(t, i); const val = pickAmt(A, k); if (val != null) v[k] = Math.round(val * 100) / 100;
  }
  if (v.sodiumMg == null) { const i = findLab21(t, [/\bsalt\b/i]); if (i >= 0) { const A = after21(t, i).filter(a => a.u !== '%'); const a = A[col] || A[0]; if (a) { v.sodiumMg = Math.round(a.v * (a.u === 'mg' ? 1 : 1000) / 2.5); flags.sodiumMg = 'check'; notes.sodiumMg = `Converted from salt (${a.v} ${a.u || 'g'} salt ÷ 2.5). Check it.`; } } }
  { const m = t.match(/calories(?!\s*from)\s*[:\-]?\s*(?:per\s*serving)?[^\d\n]{0,14}\n?[^\d\n]{0,10}(\d{1,4})(?:\s+(\d{1,4}))?/i);
    if (m) v.kcal = +(col && m[2] ? m[2] : m[1]);
    else { const k = [...t.matchAll(/(\d{1,4})\s*kcal/gi)]; if (k.length) v.kcal = +(k[col] || k[0])[1]; } }
  { const li = lines.findIndex(l => /serv(?:ing)?\.?\s*size/i.test(l));
    if (li >= 0) { let s = lines[li].replace(/^.*?serv(?:ing)?\.?\s*size\s*[:\-]?\s*/i, ''); if (!/\d/.test(s) || (/\(\s*$/.test(s) || (!/\)/.test(s) && /^\s*\(/.test(lines[li + 1] || '')))) s += ' ' + (lines[li + 1] || '');
      s = s.replace(/\s+/g, ' ').replace(/\s*\b(calories|amount per|servings? per|per serving|total fat)\b.*$/i, '').trim().slice(0, 50); v.serv = s;
      let g = s.match(/\(\s*(\d+(?:\.\d+)?)\s*(g|ml)\s*\)/i) || s.match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
      if (g) { v.grams = +g[1]; v.liquid = /ml/i.test(g[2]); }
      else if ((g = s.match(/\(\s*(\d+)9\s*\)/))) { v.grams = +g[1]; v.serv = s.replace(/\((\d+)9\)/, '($1g)'); flags.grams = 'check'; notes.grams = `Read “${g[1]}9”, used ${g[1]} g. Check it.`; } } }
  if (hdr && v.grams == null) { const m = hdr.match(/(?:per\s*)?(\d+(?:\.\d+)?)\s*(g|ml)\s*(?:serving|portion)|(?:serving|portion)\s*\(?\s*(\d+(?:\.\d+)?)\s*(g|ml)/i); if (m) { v.grams = +(m[1] || m[3]); v.liquid = /ml/i.test(m[2] || m[4]); v.serv = v.serv || `${v.grams} ${v.liquid ? 'ml' : 'g'}`; } }
  if (per100) { v.grams = 100; v.serv = v.serv || '100 g'; flags.serv = 'check'; notes.serv = 'This label lists values per 100 g. Change the serving to what you eat; the values stay per 100 g.'; }
  if (layout === 'dual') notes._layout = 'Two-column label: the Per serving column was used.';
  if (layout === 'per100+serving') notes._layout = 'Label lists per 100 g and per serving: the per-serving column was used.';
  if (layout === 'tabular') notes._layout = 'Side-by-side (tabular) label read.';
  // sanity checks: never correct silently, only flag
  const chk = (c, ks, msg) => { if (c) ks.forEach(k => { flags[k] = flags[k] || 'check'; notes[k] = notes[k] || msg; }); };
  chk(v.sat != null && v.fat != null && v.sat > v.fat, ['sat'], 'Saturated fat is higher than total fat. Check both.');
  chk(v.sugars != null && v.carbs != null && v.sugars > v.carbs + 0.5, ['sugars', 'carbs'], 'Sugars are higher than total carbs. Check both.');
  chk(v.fiber != null && v.carbs != null && v.fiber > v.carbs + 0.5, ['fiber'], 'Fiber is higher than total carbs. Check it.');
  chk(v.added != null && v.sugars != null && v.added > v.sugars + 0.5, ['added'], 'Added sugars are higher than total sugars. Check both.');
  if (v.kcal != null && v.carbs != null && v.protein != null && v.fat != null) { const e1 = 4 * v.carbs + 4 * v.protein + 9 * v.fat, e2 = e1 - 2 * (v.fiber || 0);
    if (Math.min(Math.abs(e1 - v.kcal), Math.abs(e2 - v.kcal)) > Math.max(25, v.kcal * 0.25)) chk(true, ['kcal'], `Calories don't match carbs, protein and fat (about ${Math.round(e1)} expected). Check the numbers.`); }
  if (v.grams != null && v.carbs != null && (v.carbs + (v.protein || 0) + (v.fat || 0)) > v.grams * 1.05 + 1) chk(true, ['grams'], 'The serving weight is smaller than carbs + protein + fat. Check it.');
  for (const k of ['serv', 'grams', 'kcal', 'fat', 'sat', 'sodiumMg', 'carbs', 'fiber', 'sugars', 'added', 'protein']) if (v[k] == null || v[k] === '') { flags[k] = 'miss'; delete notes[k]; }
  return { v, flags, notes, layout };
}
self.parseLabel21 = parseLabel21;
/* the older OCR handlers call parseLabel(); route them through the new parser and keep the full result for flagging */
parseLabel = function (raw) { const r = parseLabel21(raw); parseLabel21.last = r; return r.v; };

/* ---------- 2. label confirm screen: flags + live scores ---------- */
const REQ21 = ['serv', 'grams', 'kcal', 'fat', 'carbs', 'fiber', 'sugars', 'protein']; // must be filled when the photo couldn't give them
function labelProduct21(f) { const fd = new FormData(f), num = k => { const x = fd.get(k); return x === '' || x == null || isNaN(+x) ? null : +x; };
  const g = num('grams'), k = g ? 100 / g : 1, n = {}; ['carbs', 'fiber', 'sugars', 'added', 'protein', 'fat', 'sat', 'sodiumMg', 'kcal'].forEach(x => n[x] = num(x) == null ? null : num(x) * k); n.trans = null; n.polyols = null;
  return { id: 'c-preview', code: '', src: 'custom', name: String(fd.get('name') || 'Label preview'), brand: 'My food', qty: '', img: '', servQ: g || 100, serv: String(fd.get('serv') || ''), nova: null, additives: [], ing: '', cat: 'Custom', cats: '', naLabel: true, liquid: !!fd.get('liquid'), portions: [[fd.get('serv') || '1 serving', g || 100]], meta: { src: 'Label photo (user-entered)', perItem: !g, user: true }, n, _g: g }; }
function liveScores21() { const f = $('#lbForm'), box = $('#lb21s'); if (!f || !box) return; const p = labelProduct21(f), fd = new FormData(f);
  if (fd.get('carbs') === '' || fd.get('carbs') == null) { box.innerHTML = '<p class="small">Enter total carbs (and sugar) to see both scores.</p>'; return; }
  let s = null, h = null; try { s = LumiScore.score(p, { mult: 1 }).score; } catch {} try { h = LumiHealth.rate(p, { mult: 1 }).score; } catch {}
  const sv = p._g ? `per serving${fd.get('serv') ? ' (' + esc(String(fd.get('serv'))) + ')' : ` (${p._g} ${p.liquid ? 'ml' : 'g'})`}` : 'per serving (no weight entered)';
  const sg = fd.get('sugars'), cb = fd.get('carbs');
  box.innerHTML = `<div class="lb21r">${scores20(h, s)}<span class="lb21n"><b>Sugar ${sg === '' ? '—' : esc(sg) + ' g'}</b> · Total carbs ${esc(cb)} g<small>${sv}</small></span></div>${Object.keys(FL21.flags).some(k => FL21.flags[k] === 'miss' && !(f.elements[k] && f.elements[k].value)) ? '<p class="small lb21w">Scores update as you fill the highlighted fields.</p>' : ''}`; }
const FL21 = { flags: {}, notes: {} };
function applyFlags21(r) { const f = $('#lbForm'); if (!f) return; FL21.flags = r ? r.flags : {}; FL21.notes = r ? r.notes : {};
  f.querySelectorAll('.miss21,.chk21').forEach(el => el.classList.remove('miss21', 'chk21')); f.querySelectorAll('.fl21').forEach(el => el.remove());
  f.querySelectorAll('input[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); if (!/^(name|carbs)$/.test(el.name)) el.required = false; });
  const b = $('#lb21b'); if (!r) { if (b) b.innerHTML = ''; liveScores21(); return; }
  const miss = [], chk = [];
  for (const [k, fl] of Object.entries(r.flags)) { const inp = f.elements[k]; if (!inp || !inp.closest) continue; const lab = inp.closest('label'); if (!lab) continue;
    const id = 'fl21-' + k; lab.classList.add(fl === 'miss' ? 'miss21' : 'chk21'); inp.setAttribute('aria-invalid', fl === 'miss' ? 'true' : 'false'); inp.setAttribute('aria-describedby', id);
    if (fl === 'miss') { miss.push(NAME21[k] || k); if (REQ21.includes(k)) inp.required = true; }
    else chk.push(NAME21[k] || k);
    lab.insertAdjacentHTML('beforeend', `<small class="fl21" id="${id}">${fl === 'miss' ? (REQ21.includes(k) ? '⚠ Couldn’t read this. Type it from the label.' : '⚠ Couldn’t read this. Type it from the label, or leave it blank if the label doesn’t list it.') : '⚑ ' + esc(r.notes[k] || 'Check this value.')}</small>`); }
  const read = Object.keys(NAME21).filter(k => r.v[k] != null && r.v[k] !== '').length;
  if (b) b.innerHTML = `<div class="lb21b${miss.length ? ' has' : ''}" role="status"><b>Read ${read} of ${Object.keys(NAME21).length} values.</b>${r.notes._layout ? ' ' + esc(r.notes._layout) : ''}
    ${miss.length ? `<br><span class="m21">${miss.length} couldn’t be read: ${esc(miss.join(', '))}. Lumi didn’t guess them; fill them in from the label.</span>` : ''}${chk.length ? `<br><span class="c21">Double-check: ${esc(chk.join(', '))}.</span>` : ''}</div>`;
  liveScores21(); }
(function () { if (typeof viewLabel !== 'function') return; const v0 = viewLabel;
  viewLabel = function (code) { v0(code); const f = $('#lbForm'); if (!f) return; parseLabel21.last = null; FL21.flags = {};
    const h2 = f.querySelector('.fx-h'); h2.insertAdjacentHTML('afterend', '<div id="lb21b"></div><section class="lb21s" aria-labelledby="lb21sh"><h3 id="lb21sh">Scores for this serving</h3><div id="lb21s" aria-live="polite"></div></section>');
    const card = $('#lbFile').closest('.card'); card.insertAdjacentHTML('beforeend', `<details class="lb21p"><summary>Or paste the label text</summary><label class="field"><span>Label text</span><textarea id="lb21t" rows="6" placeholder="Serving size 1 cup (55g)&#10;Calories 210&#10;Total Fat 3g …"></textarea></label><button type="button" class="btn" id="lb21go">Read text</button></details>
      <p class="small lb21h">Works with standard US labels, side-by-side and two-column (per serving / per container) labels, and per-100 g labels. Fields it can’t read are highlighted for you to fill; nothing is guessed.</p>`);
    const inp = $('#lbFile'), h0 = inp.onchange; inp.onchange = async e => { parseLabel21.last = null; applyFlags21(null); await h0(e); if (parseLabel21.last) applyFlags21(parseLabel21.last); };
    $('#lb21go').onclick = () => { const t = $('#lb21t').value; if (!t.trim()) return toast('Paste the label text first'); const n = fillLabel18(t); toast(n ? `Read ${n} values` : 'No values found in that text'); };
    f.addEventListener('input', e => { const lab = e.target.closest && e.target.closest('label'); if (lab && lab.classList.contains('miss21') && e.target.value !== '') { lab.classList.remove('miss21'); lab.classList.add('ok21'); } liveScores21(); });
    liveScores21(); };
  if (typeof fillLabel18 === 'function') { const fl0 = fillLabel18; fillLabel18 = function (text) { const f = $('#lbForm'); if (f) f.querySelectorAll('input').forEach(el => { if (el.type !== 'checkbox' && el.type !== 'file' && !/^(name|brand)$/.test(el.name)) el.value = ''; }); const n = fl0(text); applyFlags21(parseLabel21.last); return n; }; self.fillLabel18 = fillLabel18; }
})();

/* ---------- 3. grocery list (local only) ---------- */
const G21 = () => { const g = store.get('groc21', null) || {}; g.items = Array.isArray(g.items) ? g.items : []; g.store = g.store || 'wholefoods'; g.other = g.other || ''; return g; };
const saveG21 = g => store.set('groc21', g);
const PIN21 = ['wholefoods', 'costco'];
function stores21() { const S = LumiStores.STORES.map((s, i) => ({ id: s[0], chip: s[1], name: s[2], i })); return [...PIN21.map(id => S.find(x => x.id === id)).filter(Boolean), ...S.filter(x => !PIN21.includes(x.id))]; }
function aisleOf21(name, cat, brand) { try { const i = LumiAisles.classify({ name, cats: cat || '', ucat: cat || '', brand: brand || '' }); if (i >= 0) return LumiAisles.SUB[i][1]; } catch {} return 'other'; }
const basis21 = (b, liquid) => b.kind === 'item' ? 'per item' : b.kind === 'per100' ? 'per 100 ' + (liquid ? 'ml' : 'g') : b.kind === 'default' ? 'per typical serving (' + b.label + ')' : `per serving (${Math.round(b.g)} ${liquid ? 'ml' : 'g'})`;
function fromDoc21(d, from) { const q = perServ20(d) || {};
  const ai = d.ai != null && d.ai >= 0 && LumiAisles.SUB[d.ai] ? LumiAisles.SUB[d.ai][1] : aisleOf21(d.name, d.cat, d.brand);
  return { id: d.code, name: d.name, brand: d.brand || '', from, h: d.h, s: d.score, sugar: q.s == null ? null : r20(q.s), carbs: q.c == null ? null : r20(q.c), basis: q.basis || '', ai, sm: d.sm || 0, t: Date.now() }; }
function fromProd21(p, from) { let s = null, h = null, b = { g: 100, kind: 'per100' }; try { s = LumiScore.score(p, { mult: 1 }).score; } catch {} try { h = LumiHealth.rate(p, { mult: 1 }).score; } catch {} try { b = LumiScore.servBasis(p, { mult: 1 }); } catch {}
  const k = (b.g || 100) / 100, n = p.n || {}; let sm = 0; try { sm = LumiStores.mask(p.brand, p.stores || ''); } catch {}
  return { id: p.id, name: p.name, brand: p.src === 'custom' ? 'My food' : (p.brand || ''), from, h, s, sugar: n.sugars == null ? null : r20(n.sugars * k), carbs: n.carbs == null ? null : r20(n.carbs * k), basis: basis21(b, p.liquid), ai: aisleOf21(p.name, p.cats || p.cat, p.brand), sm, t: Date.now() }; }
async function itemFor21(id, from) { // engine doc first (same numbers as search/browse), then the stored product, then a lookup
  try { if (typeof engine !== 'undefined' && engine.byCode) { const d = engine.byCode(id); if (d && d.src !== 'rest' && d.score != null) return fromDoc21(d, from); } } catch {}
  const c = customFoods().find(p => p.id === id); if (c) return fromProd21(c, from);
  const sv = (store.get('saved', []) || []).find(s => s.p && s.p.id === id); if (sv) return fromProd21(sv.p, from);
  const m = store.get('foods', {})[id]; if (m) return fromProd21(m, from);
  try { const p = await resolveProduct(id); if (p) return fromProd21(p, from); } catch {} return null; }
function addG21(it) { if (!it || !it.id) return false; const g = G21(); if (g.items.some(x => x.id === it.id)) return false; g.items.push(it); saveG21(g); return true; }
const onG21 = id => G21().items.some(x => x.id === id);
function candidates21() { const seen = new Set(G21().items.map(x => x.id)), out = [];
  for (const f of (typeof myFav17 === 'function' ? myFav17() : store.get('fav15', []))) if (f && f.id && !/^(r-|ms-)/.test(f.id) && !seen.has(f.id)) { seen.add(f.id); out.push({ id: f.id, name: f.name || f.id, brand: f.brand || '', from: 'fav' }); }
  for (const p of customFoods()) if (p && p.id && !seen.has(p.id)) { seen.add(p.id); out.push({ id: p.id, name: p.name, brand: 'My food', from: 'custom' }); }
  return out; }
function itemRow21(x, ck, si) { const st = si && si.i != null && (LumiStores.has(x.sm, si.i) ? `<span class="st21">${esc(si.chip)} store brand</span>` : LumiStores.has(x.sm, LumiStores.SOLD + si.i) ? `<span class="st21">Tagged at ${esc(si.name)}</span>` : '');
  return `<li class="gi21${ck ? ' ck' : ''}"><label class="gc21"><input type="checkbox" data-ck21="${esc(x.id)}"${ck ? ' checked' : ''}><span class="sr-only">Got it: ${esc(x.name)}</span></label>
    <div class="gt21"><a href="#/product/${esc(x.id)}"><b>${esc(x.name)}</b></a><small>${esc(x.brand)}${x.from === 'swap' ? ' · <span class="sw21b">Smart swap</span>' : x.from === 'custom' ? ' · Custom food' : x.from === 'fav' ? ' · Favorite' : ''}${st ? ' · ' + st : ''}</small>
    <span class="gn21">${scores20(x.h, x.s)}<span class="gm21"><span>Sugar ${x.sugar == null ? '—' : fmt20(x.sugar) + ' g'}</span><span>Total carbs ${x.carbs == null ? '—' : fmt20(x.carbs) + ' g'}</span><small>${esc(x.basis || '')}</small></span></span></div>
    <button type="button" class="icon sm rm21" data-rm21="${esc(x.id)}" aria-label="Remove ${esc(x.name)} from the grocery list">✕</button></li>`; }
function groups21(items) { const A = [...LumiAisles.AISLES, ['other', 'Other', '🛒']]; return A.map(a => [a, items.filter(x => (A.some(b => b[0] === x.ai) ? x.ai : 'other') === a[0])]).filter(g => g[1].length); }
function text21(g) { const si = stores21().find(s => s.id === g.store), name = g.store === 'other' ? (g.other || 'Any store') : si ? si.name : 'Any store';
  return `Lumi grocery list — ${name}\n` + groups21(g.items).map(([a, L]) => `\n${a[1]}\n` + L.map(x => `${x.ck ? '☑' : '☐'} ${x.name}${x.brand ? ' (' + x.brand + ')' : ''} — Health ${x.h ?? '?'} · Blood sugar ${x.s ?? '?'} · sugar ${x.sugar == null ? '—' : fmt20(x.sugar) + ' g'} · carbs ${x.carbs == null ? '—' : fmt20(x.carbs) + ' g'} ${x.basis || ''}`).join('\n')).join('\n') + '\n\nScores are per serving. Check labels in store.'; }
function viewGrocery21() { document.title = 'Grocery list — Lumi'; app.className = (app.className || '').replace(/\b(log11|logw11|rp12)\b/g, '').trim();
  app.innerHTML = `<section class="pg13 gl21p"><h1>Grocery list</h1><p class="lead">Built from your favorites, custom foods and the smart swaps you add. Saved only on this device; no account.</p><div id="gl21">${skel(3)}</div></section>`;
  const draw = () => { const g = G21(), S = stores21(), si = S.find(s => s.id === g.store), left = g.items.filter(x => !x.ck).length, C = candidates21();
    const tagged = si ? g.items.filter(x => LumiStores.has(x.sm, si.i) || LumiStores.has(x.sm, LumiStores.SOLD + si.i)).length : 0;
    $('#gl21').innerHTML = `<section class="card st21c" aria-labelledby="st21h"><h2 id="st21h">Store${si && g.store !== 'other' ? `: ${esc(si.name)}` : g.store === 'other' && g.other ? `: ${esc(g.other)}` : ''}</h2>
      <div class="chips" role="group" aria-label="Pinned stores">${S.slice(0, 2).map(s => `<button type="button" class="chip${g.store === s.id ? ' on' : ''}" aria-pressed="${g.store === s.id}" data-st21="${s.id}"><span aria-hidden="true">📌 </span>${esc(s.name)}</button>`).join('')}</div>
      <label class="field sel21"><span>Or pick any store</span><select id="sel21"><option value="">Choose a store…</option>${S.slice(2).map(s => `<option value="${s.id}"${g.store === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}<option value="other"${g.store === 'other' ? ' selected' : ''}>Another store (type its name)</option></select></label>
      ${g.store === 'other' ? `<label class="field ot21"><span>Store name</span><input id="ot21" value="${esc(g.other)}" maxlength="40" placeholder="e.g. Fareway"></label><p class="small">Lumi has no product listings for this store, so items are grouped by section only.</p>`
        : si ? `<p class="small">${tagged} of ${g.items.length} item${g.items.length === 1 ? '' : 's'} ${tagged === 1 ? 'is a' : 'are'} ${esc(si.chip)} store brand or tagged at ${esc(si.name)} in Lumi's data. No tag means no data either way, not that the store doesn't sell it.</p>` : ''}</section>
      ${g.items.length ? `<p class="small gs21" role="status">${left} of ${g.items.length} item${g.items.length === 1 ? '' : 's'} left</p>${groups21(g.items).map(([a, L]) => `<section class="card gg21"><h2><span aria-hidden="true">${a[2]}</span> ${esc(a[1])}</h2><ul class="gl21">${L.map(x => itemRow21(x, x.ck, g.store === 'other' ? null : si)).join('')}</ul></section>`).join('')}
        <div class="actions noprint"><button type="button" class="btn pri" id="gsh21">Share</button><button type="button" class="btn" id="gcp21">Copy</button><button type="button" class="btn" id="gpr21">Print</button><button type="button" class="btn" id="gcl21">Uncheck all</button><button type="button" class="btn" id="grm21">Remove checked</button></div>`
        : `<div class="card"><p>Your list is empty. Add favorites or custom foods below, or tap <b>🛒 Add to grocery list</b> on a smart swap or any food.</p></div>`}
      <section class="card noprint ad21" aria-labelledby="ad21h"><div class="fx-h"><h2 id="ad21h">Add from My foods</h2>${C.some(c => c.from === 'fav') ? '<button type="button" class="btn sm" id="adall21">Add all favorites</button>' : ''}</div>
      ${C.length ? `<ul class="gl21 ad21l">${C.map(c => `<li><span class="gt21"><b>${esc(c.name)}</b><small>${esc(c.brand)} · ${c.from === 'fav' ? 'Favorite' : 'Custom food'}</small></span><button type="button" class="btn sm" data-ad21="${esc(c.id)}" data-fr21="${c.from}" aria-label="Add ${esc(c.name)} to the grocery list">+ Add</button></li>`).join('')}</ul>`
        : '<p class="small">Everything in My foods is already on the list. Star foods (☆ Favorite) or save label scans to see them here.</p>'}</section>
      <p class="small noprint">Scores are per serving: Health on the left, Blood sugar on the right. Smart swaps come from product pages and search; tap 🛒 on one to add it.</p>`;
    app.querySelectorAll('[data-st21]').forEach(b => b.onclick = () => { const g = G21(); g.store = b.dataset.st21; saveG21(g); draw(); if (g.store === 'other') { const i = $('#ot21'); if (i) i.focus(); } });
    $('#sel21').onchange = e => { if (!e.target.value) return; const g = G21(); g.store = e.target.value; saveG21(g); draw(); const f = g.store === 'other' ? $('#ot21') : $('#sel21'); if (f) f.focus(); };
    const ot = $('#ot21'); if (ot) ot.onchange = () => { const g = G21(); g.other = ot.value.trim().slice(0, 40); saveG21(g); };
    app.querySelectorAll('[data-ck21]').forEach(b => b.onchange = () => { const g = G21(), x = g.items.find(y => y.id === b.dataset.ck21); if (x) x.ck = b.checked; saveG21(g); b.closest('li').classList.toggle('ck', b.checked); const s = $('.gs21'); if (s) s.textContent = `${g.items.filter(y => !y.ck).length} of ${g.items.length} item${g.items.length === 1 ? '' : 's'} left`; });
    app.querySelectorAll('[data-rm21]').forEach(b => b.onclick = () => { const g = G21(); g.items = g.items.filter(y => y.id !== b.dataset.rm21); saveG21(g); toast('Removed'); draw(); });
    app.querySelectorAll('[data-ad21]').forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = 'Adding…'; const it = await itemFor21(b.dataset.ad21, b.dataset.fr21); if (!it) { b.disabled = false; b.textContent = '+ Add'; return toast("Couldn't load that food"); } addG21(it); toast('Added to grocery list'); draw(); });
    const all = $('#adall21'); if (all) all.onclick = async () => { all.disabled = true; let n = 0; for (const c of candidates21().filter(c => c.from === 'fav')) { const it = await itemFor21(c.id, 'fav'); if (it && addG21(it)) n++; } toast(`Added ${n} favorite${n === 1 ? '' : 's'}`); draw(); };
    const sh = $('#gsh21'); if (sh) { const txt = () => text21(G21());
      sh.onclick = () => { if (navigator.share) navigator.share({ title: 'Grocery list', text: txt() }).catch(() => {}); else copy21(txt()); };
      $('#gcp21').onclick = () => copy21(txt()); $('#gpr21').onclick = () => { document.body.classList.add('pr21'); window.print(); setTimeout(() => document.body.classList.remove('pr21'), 500); };
      $('#gcl21').onclick = () => { const g = G21(); g.items.forEach(x => x.ck = false); saveG21(g); draw(); };
      $('#grm21').onclick = () => { const g = G21(), n = g.items.filter(x => x.ck).length; if (!n) return toast('Nothing checked'); g.items = g.items.filter(x => !x.ck); saveG21(g); toast(`Removed ${n}`); draw(); }; } };
  Promise.resolve(typeof loadIndex === 'function' ? loadIndex().catch(() => {}) : 0).then(draw); }
function copy21(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('List copied'), () => { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} a.remove(); toast(ok ? 'List copied' : "Couldn't copy"); }); }
self.viewGrocery21 = viewGrocery21; self.text21 = text21;

/* add-to-list buttons: smart swap cards, product page */
if (typeof swapCard20 === 'function') { const sc0 = swapCard20; swapCard20 = function (x, cur, rest) { const h = sc0.apply(this, arguments); if (rest || !x || !x.d || x.d.src === 'rest') return h; const on = onG21(x.d.code);
  return `<div class="sw21w">${h}<button type="button" class="btn sm gb21" data-gl21="${esc(x.d.code)}"${on ? ' disabled' : ''} aria-label="${on ? 'On grocery list' : 'Add ' + esc(x.d.name) + ' to grocery list'}">${on ? '✓ On grocery list' : '🛒 Add to grocery list'}</button></div>`; }; }
document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-gl21]'); if (!b) return; e.preventDefault(); b.disabled = true;
  let it = null; try { const d = engine.byCode(b.dataset.gl21); if (d) it = fromDoc21(d, 'swap'); } catch {} if (!it) it = await itemFor21(b.dataset.gl21, 'swap');
  if (it && (addG21(it) || onG21(it.id))) { b.textContent = '✓ On grocery list'; b.setAttribute('aria-label', 'On grocery list'); toast('Added to grocery list'); } else { b.disabled = false; toast("Couldn't add that food"); } });
if (typeof bind9 === 'function') { const b921 = bind9; bind9 = function (p, s) { const r = b921.apply(this, arguments);
  try { if (p && p.src !== 'cos' && p.src !== 'rest' && !/^(r-|ms-)/.test(p.id || '')) { const act = document.querySelector('#app .actions'); if (act && !$('#pg21')) { const on = onG21(p.id); act.insertAdjacentHTML('beforeend', `<button type="button" class="btn" id="pg21"${on ? ' disabled' : ''}>${on ? '✓ On grocery list' : '🛒 Grocery list'}</button>`);
    $('#pg21').onclick = async () => { const b = $('#pg21'); b.disabled = true; const it = await itemFor21(p.id, p.src === 'custom' ? 'custom' : 'product'); if (it && addG21(it)) { b.textContent = '✓ On grocery list'; toast('Added to grocery list'); } else { b.disabled = false; toast("Couldn't add that food"); } }; } } } catch (e) { console.warn('v21', e); }
  return r; }; }

/* ---------- 4. entry points + route ---------- */
if (typeof SC74 !== 'undefined') SC74.splice(2, 0, ['#/grocery', 'Grocery list']);
if (typeof viewMyFoods17 === 'function') { const mf0 = viewMyFoods17; viewMyFoods17 = function () { const r = mf0.apply(this, arguments); try { const l = app.querySelector('.mf17 .lead'); if (l && !$('#gl21l')) l.insertAdjacentHTML('afterend', `<p id="gl21l"><a class="chip" href="#/grocery">🛒 Grocery list <small>${G21().items.length}</small></a></p>`); } catch {} return r; }; self.viewMyFoods17 = viewMyFoods17; }
if (typeof viewGrocery13 === 'function') { const vg0 = viewGrocery13; viewGrocery13 = function () { const r = vg0.apply(this, arguments); try { const h = app.querySelector('.pg13 .back13'); if (h && !$('#gl21p')) h.insertAdjacentHTML('afterend', '<p id="gl21p" class="small">This list totals your weekly meal plan. For favorites, custom foods and swaps, see <a href="#/grocery">your grocery list</a>.</p>'); } catch {} return r; }; }
if (typeof tab19 === 'function') { const t21 = tab19; tab19 = function (view, arg) { if (view === 'grocery') return 'myfoods'; return t21.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh21 = viewHome; viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), v = h.split('/')[0]; if (v === 'grocery') return viewGrocery21(); return vh21.apply(this, arguments); }; }
/* home shortcut tile + desktop sidebar link (the home view may have rendered before this file loaded) */
const CART21 = (n = 24) => `<svg class="i10" viewBox="0 0 24 24" width="${n}" height="${n}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>`;
function deco21() { try {
  const a = document.querySelector('.sc74 a[href="#/grocery"]'); if (a && !a.querySelector('.t10') && document.querySelector('.sc74 .t10')) a.innerHTML = `<span class="t10">${CART21()}</span><span>Grocery list</span>`;
  const tb = document.querySelector('.tabbar'), pl = tb && tb.querySelector('a[data-v=plan].side13');
  if (pl && !tb.querySelector('a[data-v=grocery]')) pl.insertAdjacentHTML('afterend', `<a href="#/grocery" data-v="grocery" class="side13">${CART21()}<span>Grocery list</span></a>`);
  const g = tb && tb.querySelector('a[data-v=grocery]'); if (g) { const on = /^#\/grocery/.test(location.hash); g.classList.toggle('on', on); if (on) g.setAttribute('aria-current', 'page'); else g.removeAttribute('aria-current');
    const mf = tb.querySelector('a[data-v=myfoods]'); if (on && mf && matchMedia('(min-width:1024px)').matches) { mf.classList.remove('on'); mf.removeAttribute('aria-current'); } }
} catch {} }
{ let q21 = 0; new MutationObserver(() => { if (!q21) q21 = requestAnimationFrame(() => { q21 = 0; deco21(); }); }).observe(document.body, { childList: true, subtree: true }); window.addEventListener('hashchange', deco21); }
if (/^#\/(grocery|label|myfoods)/.test(location.hash) || (document.querySelector('.sc74') && !document.querySelector('.sc74 a[href="#/grocery"]'))) route();
deco21();
