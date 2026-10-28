'use strict';
/* Lumi 21.1: menu photo scan (on-device OCR, matched only to chains' official nutrition data already in Lumi) and
   restaurants near you (permission-gated geolocation + OpenStreetMap Overpass, cached on this device). Loaded after v21.js.
   Real data only: a dish that isn't in a chain's own nutrition data gets no scores, and nothing is estimated. */

/* ---------- 0. shared helpers ---------- */
const N211 = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’`´]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const CMP211 = s => N211(s).replace(/^the /, '').replace(/ (scratch kitchen|restaurant|restaurants|food court)$/, '').replace(/ /g, '');
const STOP211 = new Set(['the', 'and', 'with', 'for', 'of', 'or', 'a', 'an', 'on', 'in', 'our', 'your', 'served', 'choice', 'new', 'fresh', 'made', 'style', 'size', 'cal', 'cals', 'calories', 'each', 'add', 'oz', 'pc', 'pcs', 'piece', 'pieces', 'regular', 'reg', 'w', 'ct', 'count', 'pc', 'pcs', 'piece', 'pieces', 'kid', 'kids']);
const stem211 = w => w.length > 4 && /ies$/.test(w) ? w.slice(0, -3) + 'y' : w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w;
const TK211 = s => N211(s).split(' ').filter(w => w.length > 1 && !STOP211.has(w) && !/^\d+$/.test(w)).map(stem211);
function lev211(a, b) { if (Math.abs(a.length - b.length) > 1) return 2; let p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[b.length]; }
const same211 = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && lev211(a, b) <= 1); // one OCR slip allowed on longer words
function chains211() { try { return C.subs('rest').filter(k => k !== 'rest-other').map(k => ({ k, name: C.CATS[k][1], ki: C.KEYS.indexOf(k), cmp: CMP211(C.CATS[k][1]) })); } catch { return []; } }
let byChain211 = null;
function chainDocs211(k) { if (!byChain211) { byChain211 = new Map(); const ks = new Map(chains211().map(c => [c.ki, c.k]));
    for (const d of engine.docs) { if (d.src !== 'rest' || d.score == null) continue; for (const x of d.keys) { const kk = ks.get(x); if (kk) { if (!byChain211.has(kk)) byChain211.set(kk, []); byChain211.get(kk).push(d); } } } }
  return byChain211.get(k) || []; }
const both211 = d => (d.h == null || d.score == null) ? -1 : (d.h + d.score) / 2 + Math.min(d.h, d.score) / 1000; // both scores: mean, ties go to the better weaker score
const ALC211 = /\b(wine|beer|ale|lager|ipa|stout|cider|vodka|tequila|rum|gin|whiske?y|bourbon|cocktail|margarita|mimosa|sangria|spritz|hard seltzer|spiked|champagne|prosecco|sake|liqueur)\b/i;
function row211(d, extra) { const it = fromDoc21(d, 'menu');
  return `<li class="mr211"><div class="mt211"><a href="#/product/${encodeURIComponent(d.code)}"><b>${esc(d.name)}</b></a>
    <span class="mn211"><span>Sugar <b>${fmt20(it.sugar)} g</b></span><span>Total carbs <b>${fmt20(it.carbs)} g</b></span><small>${esc(it.basis || '')}</small></span>${extra || ''}</div>${scores20(d.h, d.score)}</li>`; }
/* a chain's top picks: real meals (not sauces/drinks/add-ons/alcohol), ranked by both scores */
const ADDON211 = /\b(add[- ]?ons?|extra|side of|toppings?|sauces?|dressings?|dips?|condiments?|packets?|seasonings?|croutons?|sliced|shredded|fresh|canned|bread|buns?|tortillas?|shells?|patty|patties|portion|ingredient|cheese only|syrup|spread|jam|jelly|butter|creamer)\b|\(option with |^\d+"\s|\(pocket\)/i;
const MEAL211 = /\b(sandwich|burger|wrap|bowl|salad|tenders?|nuggets?|strips?|chicken|tacos?|burrito|quesadilla|pizza|sub|subs|hoagie|melt|club|grilled|omelet|omelette|platter|plate|entree|wings?|steak|turkey|chili|soup|oatmeal|parfait|scramble|gyro|pita|flatbread|kebab|skewers?|fajitas?|enchiladas?|salmon|shrimp|fish|pasta|egg|eggs|breakfast|combo|meal|hot dog|bratwurst|ribs?|brisket|pork|beef)\b/i;
/* a chain's top picks: real meals (no sauces, drinks, add-ons, components or alcohol), ranked by both scores */
function picks211(k, n = 3) { const ds = chainDocs211(k).filter(d => d.h != null && d.net != null && !ALC211.test(d.name) && !ADDON211.test(d.name) && !NOTMEAL.test(d.name));
  const big = d => { const q = perServ20(d); return q && q.basis !== 'per 100 g' ? q.c >= 5 : d.net >= 5; };
  const meal = ds.filter(d => MEAL211.test(d.name) && ['main', 'breakfast'].includes(type20(d)) && big(d)), seen = new Set(), out = [];
  for (const d of (meal.length >= n ? meal : meal.concat(ds.filter(d => !meal.includes(d) && ['main', 'breakfast', 'side'].includes(type20(d)) && big(d)))).sort((a, b) => both211(b) - both211(a))) {
    const key = TK211(d.name).slice(0, 2).join(' '); if (seen.has(key)) continue; seen.add(key); out.push(d); if (out.length >= n) break; } // vary: not 3 near-identical items
  return out; }

/* ---------- 1. menu photo scan ---------- */
const PRICE211 = /\$?\s*\d{1,3}[.,]\d{2}\b|\b\d{2,4}\s*(?:-\s*\d{2,4}\s*)?cal(?:ories|s)?\b|\.{2,}|[•·…|_~*]+/gi;
function lines211(raw) { const out = [], seen = new Set();
  for (let l of String(raw || '').replace(/\r/g, '').split('\n')) { l = l.replace(PRICE211, ' ').replace(/\s+/g, ' ').trim(); const t = TK211(l);
    if (t.length === 0 || l.length < 3 || l.length > 90 || !/[a-z]{3}/i.test(l)) continue; const key = t.join(' '); if (seen.has(key)) continue; seen.add(key); out.push({ raw: l, t }); }
  return out.slice(0, 80); }
function idf211(docs) { const df = new Map(); docs.forEach(d => new Set(TK211(d.name)).forEach(w => df.set(w, (df.get(w) || 0) + 1))); const N = docs.length || 1;
  return w => Math.log(1 + N / (df.get(w) || 0.5)); }
/* F-score of weighted token overlap between a menu line and a dish name */
function fit211(lt, dt, idf) { if (!lt.length || !dt.length) return 0; let hitL = 0, hitD = 0, wL = 0, wD = 0;
  for (const w of lt) { const x = idf(w); wL += x; if (dt.some(v => same211(w, v))) hitL += x; }
  for (const v of dt) { const x = idf(v); wD += x; if (lt.some(w => same211(w, v))) hitD += x; }
  const P = hitL / wL, R = hitD / wD; return P + R ? 2 * P * R / (P + R) : 0; }
/* the chain's own name is noise inside its menu ("Chick-fil-A Nuggets" = "Nuggets"); a piece count must agree when both give one */
const CNT211 = s => { const m = String(s || '').match(/\b(\d{1,3})\s*-?\s*(?:ct|count|pc|pcs|piece|pieces)\b/i); return m ? +m[1] : null; };
const noBrand211 = (t, bt) => { if (!bt.length) return t; const r = t.filter(w => !bt.includes(w)); return r.length ? r : t; };
function prep211(k) { const bt = TK211(C.CATS[k] ? C.CATS[k][1] : ''); const docs = chainDocs211(k).map(d => ({ d, t: noBrand211(TK211(d.name), bt), n: CNT211(d.name) })).filter(x => x.t.length); return { docs, bt, idf: idf211(docs.map(x => x.d)) }; }
function best211(line, P) { const lt = noBrand211(line.t, P.bt), ln = CNT211(line.raw); if (P.bt.length && line.t.every(w => P.bt.includes(w))) return null; // the chain's name on its own is a heading
  let b = null, bf = 0, bs = -1; for (const x of P.docs) { let f = fit211(lt, x.t, P.idf); if (f <= 0) continue;
    if (ln != null && x.n != null) f = ln === x.n ? f : f * 0.5; else if (ln != null) f -= 0.02;
    const s = f - (x.n != null && ln == null ? 0.001 + x.n / 1e6 : 0) - x.t.length / 1e5; // ties: no count, then smallest count, then the shorter name
    if (s > bs) { bs = s; bf = f; b = x; } }
  return b ? { d: b.d, f: Math.min(1, bf), sz: ln == null && b.n != null } : null; }
const OK211 = 0.67, SURE211 = 0.9;
function matchMenu211(k, lines) { const P = prep211(k), got = new Map(), miss = [];
  for (const l of lines) { const b = best211(l, P); if (b && b.f >= OK211 && (l.t.length >= 2 || b.f >= SURE211)) { const g = got.get(b.d.code); if (!g || b.f > g.f) got.set(b.d.code, { d: b.d, f: b.f, sz: b.sz, line: l.raw }); } else miss.push(l.raw); }
  return { hits: [...got.values()].sort((a, b) => both211(b.d) - both211(a.d)), miss }; }
/* chain suggestion: chain names printed on the menu, then how many lines match each chain's own item names */
function suggest211(raw, lines) { const txt = ' ' + N211(raw) + ' ', cmpTxt = txt.replace(/ /g, ''), out = new Map();
  for (const c of chains211()) { const nm = ' ' + N211(c.name).replace(/^the /, '') + ' ';
    if ((c.cmp.length >= 6 && cmpTxt.includes(c.cmp)) || (nm.trim().length >= 3 && txt.includes(nm))) out.set(c.k, { c, named: true, n: 0 }); }
  const L = lines.filter(l => l.t.length >= 2).slice(0, 40);
  if (L.length) for (const c of chains211()) { const P = prep211(c.k); if (!P.docs.length) continue; let n = 0; for (const l of L) { const b = best211(l, P); if (b && b.f >= 0.8) n++; }
    if (n) { const o = out.get(c.k) || { c, named: false, n: 0 }; o.n = n; out.set(c.k, o); } }
  return [...out.values()].filter(o => o.named || o.n >= 2).sort((a, b) => (b.named - a.named) || (b.n - a.n)).slice(0, 4); }
let ms211 = { raw: '', k: '' };
function viewMenuScan211(arg) {
  document.title = 'Scan a menu — Lumi'; app.innerHTML = skel(3);
  loadIndex().catch(() => {}).then(() => { if (!/^#\/menuscan/.test(location.hash)) return; byChain211 = null;
    const cs = chains211().sort((a, b) => a.name.localeCompare(b.name)); const pre = /^rest-/.test(arg || '') && C.CATS[arg] ? arg : (ms211.k || ''); if (pre !== ms211.k) ms211 = { raw: '', k: pre };
    app.innerHTML = `<section class="ms211"><h1>Scan a menu</h1>
    <p class="lead">Photograph a restaurant menu and Lumi finds the dishes it has official nutrition data for, ranked by both scores. The photo is read on this device and never uploaded.</p>
    <div class="card"><label class="field sel211"><span>Restaurant</span><select id="ms211c"><option value="">Let Lumi suggest from the menu</option><option value="none"${pre === 'none' ? ' selected' : ''}>Not a chain / local restaurant</option>${cs.map(c => `<option value="${c.k}"${c.k === pre ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <div class="acts211"><label class="btn pri" for="ms211f">📷 Take or choose a menu photo</label><input id="ms211f" type="file" accept="image/*" capture="environment" hidden></div>
      <details class="ps211" id="ms211p"${ms211.raw ? ' open' : ''}><summary>Or paste or type menu text</summary><label class="sr-only" for="ms211t">Menu text, one dish per line</label><textarea id="ms211t" rows="6" placeholder="One dish per line, e.g.&#10;Grilled Chicken Sandwich&#10;Waffle Potato Fries">${esc(ms211.raw)}</textarea><button type="button" class="btn" id="ms211go">Match dishes</button></details>
      <div id="ms211s" class="small" role="status" aria-live="polite"></div><img id="ms211i" alt="Your menu photo" hidden></div>
    <div id="ms211r"></div>
    <p class="small">Only chains in Lumi have nutrition data, taken from each chain's own published nutrition information. Lines that don't match a dish get no scores; Lumi never guesses a dish's numbers. Close matches are marked so you can check them.</p></section>`;
    $('#ms211c').onchange = () => { ms211.k = $('#ms211c').value; if (ms211.raw) run211(); };
    $('#ms211go').onclick = () => { ms211.raw = $('#ms211t').value; run211(); };
    $('#ms211f').onchange = async e => { const f = e.target.files && e.target.files[0]; if (!f) return; const st = $('#ms211s'), im = $('#ms211i');
      try { im.src = URL.createObjectURL(f); im.hidden = false; } catch {}
      st.textContent = 'Loading the on-device text reader…';
      try { await loadTess(); st.textContent = 'Reading the menu…';
        const r = await Tesseract.recognize(f, 'eng', { logger: m => { if (m.status === 'recognizing text') st.textContent = `Reading the menu… ${Math.round(m.progress * 100)}%`; } });
        ms211.raw = (r && r.data && r.data.text) || ''; $('#ms211t').value = ms211.raw; $('#ms211p').open = true; run211();
      } catch (err) { st.textContent = (err && err.message) || "Couldn't read that photo. You can paste the menu text instead."; } };
    if (ms211.raw) run211(); }); }
function run211() { const st = $('#ms211s'), out = $('#ms211r'); if (!out) return; const lines = lines211(ms211.raw), sel = $('#ms211c').value;
  if (!lines.length) { st.textContent = ''; out.innerHTML = `<div class="card nd211" role="note"><b>No dish names found.</b> Try a sharper, well-lit photo of one menu section, or paste the text.</div>`; return; }
  st.textContent = `${lines.length} menu line${lines.length === 1 ? '' : 's'} read.`;
  let sug = []; if (sel !== 'none') sug = suggest211(ms211.raw, lines);
  const k = sel && sel !== 'none' ? sel : (sel === 'none' ? '' : (sug[0] ? sug[0].c.k : ''));
  const sugH = sug.some(o => !sel || (o.c.k !== k && o.named)) && sel !== 'none' ? `<div class="card sg211"><h2>${sel ? 'Other possible matches' : 'Looks like'}</h2><div class="chips">${sug.filter(o => !sel || (o.c.k !== k && o.named)).map(o => `<button type="button" class="chip${o.c.k === k ? ' on' : ''}" data-k="${o.c.k}" aria-pressed="${o.c.k === k}">${esc(o.c.name)} <small>${o.named ? 'name on menu' : ''}${o.named && o.n ? ' · ' : ''}${o.n ? o.n + ' dishes match' : ''}</small></button>`).join('')}</div>${sel ? '' : '<p class="small">Lumi picked the best guess. Choose the restaurant above if it\'s wrong.</p>'}</div>` : '';
  if (!k) { out.innerHTML = `<div class="card nd211" role="note" id="ms211none"><h2>No nutrition data for this menu</h2><p>${sel === 'none' ? 'This restaurant isn\'t a chain in Lumi' : 'Lumi couldn\'t match this menu to a chain it has data for'}, so it has no nutrition data for these dishes and shows no scores. Lumi doesn't estimate dishes. If it is a chain, choose it above.</p><details><summary>${lines.length} lines read</summary><ul class="ml211">${lines.map(l => `<li>${esc(l.raw)}</li>`).join('')}</ul></details></div>${sugH}`; bindSug211(); return; }
  const nm = C.CATS[k][1], R = matchMenu211(k, lines);
  out.innerHTML = (R.hits.length ? `<section class="card" id="ms211hits"><div class="fx-h"><h2>${R.hits.length} dish${R.hits.length === 1 ? '' : 'es'} at ${esc(nm)}</h2><span class="small">best first, by both scores</span></div>
      <ol class="ml211 res211">${R.hits.map(h => row211(h.d, `<small class="rd211">${h.f >= SURE211 ? '' : '<span class="cl211">Close match, check it</span> '}${h.sz ? '<span class="cl211">Size not on menu, check yours</span> ' : ''}Menu says “${esc(h.line)}”</small>`)).join('')}</ol>
      <p class="small"><a href="#/browse/${k}">All of ${esc(nm)}'s menu in Lumi ›</a></p></section>`
    : `<div class="card nd211" role="note" id="ms211none"><h2>No matching dishes</h2><p>None of these lines match a dish in ${esc(nm)}'s nutrition data, so no scores are shown. Check the restaurant, or try a clearer photo.</p></div>`)
    + (R.miss.length ? `<details class="card nm211" id="ms211miss"${R.hits.length ? '' : ' open'}><summary>${R.miss.length} line${R.miss.length === 1 ? '' : 's'} with no nutrition data</summary><p class="small">Not found in ${esc(nm)}'s nutrition data (or not a dish), so no scores. Lumi doesn't estimate them.</p><ul class="ml211">${R.miss.slice(0, 40).map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` : '') + sugH;
  bindSug211(); }
function bindSug211() { app.querySelectorAll('.sg211 [data-k]').forEach(b => b.onclick = () => { $('#ms211c').value = b.dataset.k; ms211.k = b.dataset.k; run211(); }); }

/* ---------- 2. restaurants near you ---------- */
/* 23.2: main Overpass server first, then two public mirrors whose usage policy allows any project (OSM wiki, Oct 2026). One at a time, never in parallel. */
const OVP211 = [['https://overpass-api.de/api/interpreter', 'overpass-api.de'], ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'VK Maps mirror'], ['https://overpass.private.coffee/api/interpreter', 'private.coffee mirror']];
let RETRY211 = 6000; const TTL211 = 24 * 3600e3, MI211 = 1609.344, RADS211 = [1, 3, 5, 10], DEFR211 = 5, CV211 = 232;
const cell211 = (la, lo) => [Math.round(la * 100) / 100, Math.round(lo * 100) / 100]; // ~1 km grid: the only location that leaves the device
function dist211(a, b, c, d) { const R = 6371e3, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
try { const o = JSON.parse(localStorage.getItem('lumi.near211') || 'null'); if (o && o.v !== CV211) localStorage.removeItem('lumi.near211'); } catch {} // 23.2: drop older saved searches; they could be a failed search saved as "nothing here"
function cacheGet211(cl, rad) { const c = store.get('near211', null); return c && c.v === CV211 && c.cl && c.cl[0] === cl[0] && c.cl[1] === cl[1] && c.rad >= rad && Array.isArray(c.el) && c.el.length && Date.now() - c.t < TTL211 ? c : null; }
const ovErr211 = (kind, msg) => Object.assign(new Error(msg || kind), { kind }); // kind: busy (server answered with an error) | net (no answer)
async function ovOne211(url, q, ms) { const ac = typeof AbortController === 'function' ? new AbortController() : null, tm = ac && setTimeout(() => ac.abort(), ms);
  try { let r; try { r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'omit', referrerPolicy: 'origin', signal: ac ? ac.signal : undefined }); }
    catch (e) { throw ovErr211(ac && ac.signal.aborted ? 'busy' : 'net', ac && ac.signal.aborted ? 'timed out' : 'network'); }
    if (!r.ok) throw ovErr211(r.status === 429 || r.status === 406 || r.status >= 500 ? 'busy' : 'net', 'HTTP ' + r.status);
    let j; try { j = await r.json(); } catch { throw ovErr211('busy', 'bad JSON'); }
    if (j && j.remark && /error|timed? ?out|out of memory|abort/i.test(j.remark)) throw ovErr211('busy', String(j.remark).slice(0, 160)); // Overpass reports overload as HTTP 200 + remark, with no elements
    if (!j || !Array.isArray(j.elements)) throw ovErr211('busy', 'no elements');
    return j; } finally { if (tm) clearTimeout(tm); } }
let ovLog211 = []; // what each server answered, for the status line and tests
async function overpass211(cl, rad, onTry) {
  const R = Math.round(rad * MI211 + 1000); // +1 km covers the rounding
  const q = `[out:json][timeout:25];nwr["amenity"~"^(restaurant|fast_food|cafe|ice_cream)$"]["name"](around:${R},${cl[0]},${cl[1]});out center tags 8000;`;
  let busy = false, last = null; ovLog211 = []; const t0 = Date.now(), order = OVP211.map((_, i) => i);
  for (let n = 0; n < order.length; n++) { const i = order[n]; if (onTry) onTry(i, n);
    if (n === OVP211.length) await new Promise(r => setTimeout(r, RETRY211)); // every server said no quickly: wait a moment, then one more try on the main one
    try { const j = await ovOne211(OVP211[i][0], q, 35000); // keep only what Lumi needs
      const el = j.elements.map(e => { const t = e.tags || {}, la = e.lat ?? (e.center && e.center.lat), lo = e.lon ?? (e.center && e.center.lon); return la == null ? null : [t.name || '', t.brand || t['brand:en'] || '', +la.toFixed(5), +lo.toFixed(5), [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '), t['addr:city'] || '', t['name:en'] || '']; }).filter(Boolean);
      ovLog211.push([i, 'ok', el.length]);
      const v = { v: CV211, t: Date.now(), cl, rad, el, src: i, ts: (j.osm3s && j.osm3s.timestamp_osm_base) || '' }; if (el.length) store.set('near211', v); return v; } // only real answers are saved; never a failure or an empty answer
    catch (e) { last = e; ovLog211.push([i, e.kind, e.message]); if (e.kind === 'busy') busy = true; if (n === OVP211.length - 1 && Date.now() - t0 < 20000) order.push(0); } }
  throw ovErr211(busy ? 'busy' : 'net', last && last.message); }
function matchChain211(name, brand, cs, en) { const xs = [brand, name, en].filter(Boolean).map(CMP211).filter(Boolean);
  for (const c of cs) if (xs.some(x => x === c.cmp || (c.cmp.length >= 5 && x.startsWith(c.cmp)))) return c; return null; }
function nearList211(v, me, rad) { const cs = chains211().sort((a, b) => b.cmp.length - a.cmp.length), by = new Map(); let other = 0;
  for (const [name, brand, la, lo, addr, city, en] of v.el) { const m = dist211(me[0], me[1], la, lo); if (m > rad * MI211) continue; const c = matchChain211(name, brand, cs, en);
    if (!c || !chainDocs211(c.k).length) { other++; continue; } const o = by.get(c.k); if (!o) by.set(c.k, { c, m, n: 1, addr, city, la, lo }); else { o.n++; if (m < o.m) Object.assign(o, { m, addr, city, la, lo }); } }
  return { list: [...by.values()].sort((a, b) => a.m - b.m), other }; }
const mi211 = m => { const x = m / MI211; return x < 0.1 ? '< 0.1 mi' : (x < 10 ? x.toFixed(1) : Math.round(x)) + ' mi'; };
let me211 = null, acc211 = 0; // the position from the last tap, kept in memory on this page only (never saved)
const rad211 = () => { const x = +(($('#nr211r') || {}).value); return RADS211.includes(x) ? x : DEFR211; }; // the dropdown is the one source of truth
const mis211 = r => `${r} mile${r > 1 ? 's' : ''}`;
function viewNear211() {
  document.title = 'Restaurants near you — Lumi'; let rad = store.get('near211r', DEFR211); if (!RADS211.includes(rad)) rad = DEFR211; const c = store.get('near211', null); me211 = null; again211 = false;
  app.innerHTML = `<section class="nr211"><h1>Restaurants near you</h1>
  <p class="lead">Chains near you that Lumi has nutrition data for, closest first, with each one's top picks by both scores.</p>
  <div class="card"><div class="acts211"><button type="button" class="btn pri" id="nr211go">📍 Use my location</button>
    <label class="field rad211"><span>Within</span><select id="nr211r">${RADS211.map(x => `<option value="${x}"${x === rad ? ' selected' : ''}>${mis211(x)}</option>`).join('')}</select></label></div>
    <p class="small pv211" id="nr211pv"><b>Your location stays on this device.</b> Lumi asks for it only when you tap the button. To find restaurants, it sends a rounded position (to about 1 km, 0.6 mi) to OpenStreetMap's public Overpass service (a backup Overpass server if the main one is busy). Distances are worked out on your phone, and nothing goes to Lumi. Results are kept on this device for 24 hours. ${c ? '<button type="button" class="lk211" id="nr211x">Forget saved results</button>' : ''}</p>
    <div id="nr211s" class="small" role="status" aria-live="polite"></div></div>
  <div id="nr211o"></div>
  <p class="small">Restaurant locations: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> (ODbL), via the Overpass API. Volunteers map these places, so a location may be missing or out of date.</p></section>`;
  $('#nr211r').onchange = () => { store.set('near211r', rad211()); if (me211) search211(); }; // a new distance searches again; no stale "within N miles" left on screen
  if ($('#nr211x')) $('#nr211x').onclick = () => { try { localStorage.removeItem('lumi.near211'); } catch {} toast('Saved nearby results removed'); viewNear211(); };
  $('#nr211go').onclick = locate211;
  if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(p => { if (p.state === 'denied' && $('#nr211s')) $('#nr211s').innerHTML = '<span class="er211">Location is blocked for this site. Turn it on in your browser\'s site settings to use this.</span>'; }).catch(() => {}); }
let busy211 = false, asking211 = false, again211 = false;
function locate211() { if (asking211) return; const st = $('#nr211s'), b = $('#nr211go');
  if (!('geolocation' in navigator)) { st.innerHTML = '<span class="er211">This browser can\'t share your location.</span>'; return; }
  asking211 = true; b.disabled = true; st.textContent = 'Asking for your location…';
  navigator.geolocation.getCurrentPosition(p => { asking211 = false; if (!$('#nr211s')) return; me211 = [p.coords.latitude, p.coords.longitude]; acc211 = +p.coords.accuracy || 0; search211(); },
  e => { asking211 = false; if (!$('#nr211s')) return; if ($('#nr211go')) $('#nr211go').disabled = false; $('#nr211s').innerHTML = `<span class="er211">${e.code === 1 ? 'Location permission was denied, so Lumi can\'t look for nearby restaurants. You can allow it in your browser\'s site settings.' : e.code === 3 ? 'Finding your location took too long. Try again.' : 'Your location isn\'t available right now.'}</span>`; },
  { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }); }
async function search211() { if (busy211) { again211 = true; return; } if (!me211 || !$('#nr211s')) return;
  const rad = rad211(), cl = cell211(me211[0], me211[1]), st = $('#nr211s'); busy211 = true; if ($('#nr211go')) $('#nr211go').disabled = true; $('#nr211o').innerHTML = '';
  try { await loadIndex(); byChain211 = null; let v = cacheGet211(cl, rad); const cached = !!v;
    if (!v) { st.textContent = `Finding restaurants within ${mis211(rad)}…`; v = await overpass211(cl, rad, (i, n) => { const x = $('#nr211s'); if (!x || !n) return; x.textContent = n >= OVP211.length ? 'OpenStreetMap servers are busy. Trying once more…' : `The main OpenStreetMap server is busy. Trying a backup server (${i} of ${OVP211.length - 1})…`; }); }
    if (!/^#\/near/.test(location.hash) || !$('#nr211s')) return;
    if (rad211() !== rad) { again211 = true; return; } // the distance changed while searching: search again for the new one
    drawNear211(v, me211, rad, cached);
  } catch (e) { if (!$('#nr211s')) return; if (rad211() !== rad) { again211 = true; return; } fail211(e); }
  finally { busy211 = false; if ($('#nr211go')) $('#nr211go').disabled = false; if (again211) { again211 = false; if (me211 && $('#nr211s')) search211(); } } }
function fail211(e) { const st = $('#nr211s'); $('#nr211o').innerHTML = '';
  st.innerHTML = `<span class="er211" id="nr211err">${e && e.kind === 'busy' ? `The OpenStreetMap service is busy right now, so Lumi couldn't search (it tried ${OVP211.length} servers). This doesn't mean there are no restaurants near you.` : "Couldn't reach the OpenStreetMap service. Check your connection."}</span> <button type="button" class="btn" id="nr211retry">Try again</button>`;
  $('#nr211retry').onclick = () => me211 ? search211() : locate211(); }
const acc211t = () => { if (!(acc211 > 1000)) return ''; const km = acc211 / 1000, mi = acc211 / MI211, f = x => x < 10 ? x.toFixed(1) : Math.round(x); return `Your browser gave an approximate location (about ${f(km)} km, ${f(mi)} mi accuracy), so distances may be off. A phone with location services on is more precise.`; };
function drawNear211(v, me, rad, cached) { const st = $('#nr211s'), o = $('#nr211o'), R = nearList211(v, me, rad);
  { const pv = $('#nr211pv'); if (pv && !$('#nr211x')) { pv.insertAdjacentHTML('beforeend', '<button type="button" class="lk211" id="nr211x">Forget saved results</button>'); } const x = $('#nr211x'); if (x) x.onclick = () => { try { localStorage.removeItem('lumi.near211'); } catch {} toast('Saved nearby results removed'); viewNear211(); }; }
  st.innerHTML = `<span id="nr211c">${R.list.length} chain${R.list.length === 1 ? '' : 's'} with nutrition data within ${mis211(rad)}${cached ? ` · saved search from ${new Date(v.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}${!cached && v.src ? ` · via the ${OVP211[v.src][1]}` : ''}.</span>${acc211t() ? `<span class="ac232" id="nr211acc">${acc211t()}</span>` : ''}`;
  o.innerHTML = (R.list.length ? `<ol class="nl211" id="nr211l">${R.list.map(x => { const pk = picks211(x.c.k), nm = x.c.name;
    return `<li class="card ni211"><div class="nh211"><h2><a href="#/browse/${x.c.k}">${esc(nm)}</a></h2><span class="nd211d"><b>${mi211(x.m)}</b>${x.n > 1 ? ` <small>· ${x.n} locations</small>` : ''}</span></div>
      ${x.addr || x.city ? `<p class="small na211">Nearest: ${esc([x.addr, x.city].filter(Boolean).join(', '))}</p>` : ''}
      ${pk.length ? `<h3 class="pk211">Top picks</h3><ul class="ml211">${pk.map(d => row211(d)).join('')}</ul>` : '<p class="small">No scored menu items.</p>'}
      <p class="lnk211"><a href="#/browse/${x.c.k}">Full menu ›</a> <a href="#/menuscan/${x.c.k}">Scan this menu ›</a></p></li>`; }).join('')}</ol>`
    : `<div class="card nd211" role="note" id="nr211zero"><b>No chains in Lumi within ${mis211(rad)}.</b> OpenStreetMap answered and found ${v.el.length ? 'places, but none of them are' : 'no restaurants mapped'} ${v.el.length ? 'chains Lumi has nutrition data for' : 'here'}.${rad < RADS211[RADS211.length - 1] ? ` <button type="button" class="btn" id="nr211wide" data-r="${RADS211[RADS211.indexOf(rad) + 1]}">Search within ${mis211(RADS211[RADS211.indexOf(rad) + 1])}</button>` : ''}</div>`)
    + (R.other ? `<p class="small" id="nr211n">${R.other} other place${R.other === 1 ? '' : 's'} nearby ${R.other === 1 ? 'isn\'t a chain' : 'aren\'t chains'} in Lumi, so there's no nutrition data for ${R.other === 1 ? 'it' : 'them'}.</p>` : '');
  const w = $('#nr211wide'); if (w) w.onclick = () => { $('#nr211r').value = w.dataset.r; store.set('near211r', rad211()); search211(); }; }

/* ---------- 3. entry points + route ---------- */
if (typeof SC74 !== 'undefined') SC74.push(['#/near', 'Near you'], ['#/menuscan', 'Scan a menu']);
if (typeof tab19 === 'function') { const t211 = tab19; tab19 = function (view) { if (view === 'near' || view === 'menuscan') return 'browse'; return t211.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh211 = viewHome; viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i), a = i < 0 ? '' : decodeURIComponent(h.slice(i + 1));
  if (v === 'near') return viewNear211(); if (v === 'menuscan') return viewMenuScan211(a); return vh211.apply(this, arguments); }; }
if (typeof viewBrowse === 'function') { const vb211 = viewBrowse; viewBrowse = function (key) { const r = vb211.apply(this, arguments);
  try { if ((key === 'rest' || /^rest-/.test(key || '')) && C.CATS[key]) { const a = app.querySelector('.subchips'); if (a && !$('#rs211')) a.insertAdjacentHTML('afterend', `<p class="chips" id="rs211"><a class="chip" href="#/near">📍 Restaurants near you</a><a class="chip" href="#/menuscan${key === 'rest' ? '' : '/' + key}">📷 Scan ${key === 'rest' ? 'a menu' : 'this menu'}</a></p>`); } } catch {}
  return r; }; }
const PIN211 = (n = 24) => `<svg class="i10" viewBox="0 0 24 24" width="${n}" height="${n}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>`;
const MENU211 = (n = 24) => `<svg class="i10" viewBox="0 0 24 24" width="${n}" height="${n}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg>`;
function deco211() { try { for (const [h, l, ic] of [['#/near', 'Near you', PIN211], ['#/menuscan', 'Scan a menu', MENU211]]) { const a = document.querySelector(`.sc74 a[href="${h}"]`); if (a && !a.querySelector('.t10') && document.querySelector('.sc74 .t10')) a.innerHTML = `<span class="t10">${ic()}</span><span>${l}</span>`; } } catch {} }
{ let q211 = 0; new MutationObserver(() => { if (!q211) q211 = requestAnimationFrame(() => { q211 = 0; deco211(); }); }).observe(document.body, { childList: true, subtree: true }); }
if (/^#\/(near|menuscan|browse\/rest)/.test(location.hash) || (document.querySelector('.sc74') && !document.querySelector('.sc74 a[href="#/near"]'))) route();
deco211();
