'use strict';
/* Lumi 20.0: smart swaps (product page, search results, logged meals), build-your-own bowls from official component items,
   weekly report for the endo (print / PDF / share), single-ingredient sugar note. Loaded last. Real data only: nothing here invents food or glucose values. */

/* ---------- 0. small helpers ---------- */
const r20 = v => v == null || isNaN(v) ? null : Math.round(v * 10) / 10;
const fmt20 = v => v == null ? '—' : (Math.abs(v) >= 10 ? String(Math.round(v)) : String(r20(v)));
const HB20 = s => s == null ? 'na' : s >= 75 ? 'ex' : s >= 50 ? 'gd' : s >= 25 ? 'pr' : 'bd';
const CB20 = s => { try { return LumiScore.band(s); } catch { return HB20(s); } };
/* per-serving numbers for an index doc (net/sugar are per 100 g, or per item for per-item menus; sg = serving grams) */
function perServ20(d) {
  if (!d || d.net == null) return null; const k = d.sg > 0 && d.sb != null && d.sb >= 0 && (d.sb & 3) !== 3 ? d.sg / 100 : null;
  if (k == null) return { c: d.net, s: d.sugar, basis: 'per 100 g', k: 1 };
  return { c: d.net * k, s: d.sugar == null ? null : d.sugar * k, basis: (d.sb & 3) === 1 ? 'per item' : `per serving (${Math.round(d.sg)} ${(d.sb & 4) ? 'ml' : 'g'})`, k };
}
/* two scores, Health LEFT, Blood sugar RIGHT (standing layout rule) */
function scores20(h, c) {
  return `<span class="sc20"><span class="s20 bg-${HB20(h)}" title="Health score"><small>Health</small><b>${h ?? '?'}</b></span><span class="s20 bg-${CB20(c)}" title="Blood sugar score"><small>Blood sugar</small><b>${c ?? '?'}</b></span></span>`;
}

/* ---------- 1. single-ingredient sugars: note on the product page ---------- */
if (typeof basisLine19 === 'function') { const b0 = basisLine19; basisLine19 = function (s) { const r = b0.apply(this, arguments);
  return r + (s && s.pure ? '<div class="bl19 sm192 pu20" role="note"><b>Single-ingredient sugar:</b> all of its sugar is counted as added sugar, whatever the label lists, so honey, maple syrup, agave and table sugar are scored the same way.</div>' : ''); }; }

/* ---------- 2. smart swaps ---------- */
const DRINK20 = /\b(drinks?|soda|cola|coke|sprite|pepsi|lemonade|limeade|tea|coffee|latte|mocha|cappuccino|frappe|frappuccino|smoothie|shake|juice|water|milk|refresher|punch|agua fresca|sweet tea|iced|float|slush|beverage|fl ?oz)\b/i;
const DESSERT20 = /\b(cookies?|brownies?|cakes?|cheesecake|pie|donuts?|doughnuts?|churros?|sundae|ice cream|blizzard|concrete|custard|cinnamon roll|cupcake|muffin|pastry|tiramisu|dessert|candy|fudge|parfait|cobbler|pudding)\b/i;
const SAUCE20 = /\b(sauce|dressing|vinaigrette|dip|ketchup|mustard|mayo|mayonnaise|ranch|aioli|salsa|syrup|honey|jam|jelly|glaze|drizzle|gravy|butter|cream cheese|spread)\b/i;
const SIDE20 = /\b(fries|tots|chips|onion rings|side|slaw|coleslaw|mac|mashed|hash browns?|corn|beans|rice|applesauce|fruit cup|apple slices|soup|cup)\b/i;
const BFAST20 = /\b(breakfast|egg|eggs|omelet|omelette|pancakes?|waffles?|french toast|biscuit|bagel|croissant|oatmeal|hash brown)\b/i;
const LOWDRINK20 = /\b(zero|diet|sugar[- ]?free|no sugar|unsweetened|unsweet|light|lite|water|seltzer|sparkling|club soda|tea|coffee|espresso|americano|cold brew|keto|stevia|low[- ]sugar|less sugar|0 ?g|milk|almond|soy|oat|protein)\b/i;
function type20(d) { const n = (d.name || '') + ' ' + (d.cat || ''); return DRINK20.test(n) ? 'drink' : DESSERT20.test(n) ? 'dessert' : SAUCE20.test(d.name || '') && !/\b(sandwich|burger|wrap|bowl|salad|chicken|pizza|burrito|taco)\b/i.test(d.name || '') ? 'sauce' : BFAST20.test(n) ? 'breakfast' : SIDE20.test(d.name || '') && !/\b(sandwich|burger|wrap|bowl|salad|plate|platter|burrito|entree)\b/i.test(d.name || '') ? 'side' : 'main'; }
const TOK20 = s => new Set(String(s || '').toLowerCase().replace(/[^a-z ]+/g, ' ').split(' ').filter(w => w.length > 2 && !/^(the|and|with|for|of|organic|original|classic|large|small|medium|regular|kids|oz)$/.test(w)));
function stores20(sm) { const STO = window.LumiStores; if (!STO || !sm) return []; const o = []; for (let i = 0; i < STO.STORES.length; i++) if (STO.has(sm, i) || STO.has(sm, STO.SOLD + i)) o.push(i); return o; }
const KIND20 = [['topping', /\b(toppings?|sprinkles|crumbs?|crusts?|dough|mix)\b/i], ['bar', /\b(bars?|bites)\b/i], ['cracker', /\b(crackers?|goldfish|cheez[- ]?its?|graham|triscuit|wheat thins|pretzels?|rice cakes?)\b/i], 
  ['cookie', /\b(cookies?|biscuits?|oreos?|macarons?|wafers?|biscotti|shortbread|snickerdoodles?|chips ahoy|nutter butter|fig newtons?)\b/i], ['chips', /\b(chips|crisps|puffs|tortilla chips|popcorn)\b/i],
  ['cereal', /\b(cereals?|flakes|granola|oatmeal|o'?s cereal|muesli|cheerios|loops)\b/i], ['bread', /\b(bread|bagels?|buns?|rolls?|tortillas?|wraps?|english muffins?|pita)\b/i],
  ['yogurt', /\b(yog(h)?urts?|skyr|kefir)\b/i], ['icecream', /\b(ice cream|frozen dessert|gelato|sorbet|popsicles?|frozen yog)\b/i], ['candy', /\b(candy|candies|chocolate|gumm(y|ies)|caramels?|lollipops?|truffles?)\b/i],
  ['cake', /\b(cakes?|cupcakes?|brownies?|muffins?|donuts?|doughnuts?|pastr(y|ies)|pies?|danish|croissants?)\b/i], ['soda', /\b(soda|cola|soft drinks?|sparkling|lemonade|energy drinks?)\b/i], ['juice', /\b(juices?|smoothies?|nectar)\b/i],
  ['spread', /\b(jams?|jell(y|ies)|preserves|spreads?|peanut butter|nut butter|hazelnut)\b/i], ['pasta', /\b(pasta|spaghetti|macaroni|noodles?)\b/i]];
function kind20(d, cand) { const f = cand ? '_k20c' : '_k20'; if (d[f] !== undefined) return d[f];
  const clean = t => String(t || '').replace(/\b(cookies?|cookie dough) ?(&|and|'?n'?) ?cream\b|\bcookie dough\b|\bprotein\b.*/gi, ' ');
  const pick = t => { for (const [n, r] of KIND20) if (r.test(t)) return n; return null; };
  let k = pick(clean(d.name)); if (!k && !cand) k = pick(d.cat); return (d[f] = k); }
function smartSwaps20(doc, cur, limit = 3) {
  if (!doc || typeof engine === 'undefined' || !engine.docs || !engine.docs.length) return [];
  const C = window.LumiCats, keys = doc.keys || [], rest = doc.src === 'rest' || keys.some(k => C && C.KEYS[k] === 'rest');
  const leaf = keys.filter(k => typeof k === 'number' && C && !['whole', 'rest', 'rest-other'].includes(C.KEYS[k])).slice(-1)[0];
  const ps = perServ20(doc) || {}; const cS = cur && cur.score != null ? cur.score : doc.score, cH = cur && cur.h != null ? cur.h : doc.h;
  const cSug = cur && cur.sugar != null ? cur.sugar : ps.s, cCarb = cur && cur.carbs != null ? cur.carbs : ps.c;
  if (cS == null) return [];
  const kd = leaf == null ? kind20(doc) : null; if (!rest && leaf == null && !kd) return [];
  const ty = type20(doc), myStores = stores20(doc.sm), toks = TOK20(doc.name), out = [];
  for (const d of engine.docs) {
    if (d.code === doc.code || d.score == null || d.net == null || d.fl || d.bad || d.zc || (d.src === 'local' && typeof usEnglish === 'function' && !usEnglish(d)) || d.src === 'world') continue;
    let same = false;
    if (rest) { if (d.src !== 'rest' || type20(d) !== ty) continue; same = d.brand === doc.brand; }
    else { if (leaf != null ? !d.keys.includes(leaf) : (!kd || kind20(d, true) !== kd)) continue; if (ty === 'drink' ? type20(d) !== 'drink' : false) continue; same = myStores.length ? stores20(d.sm).some(i => myStores.includes(i)) : false; }
    const q = perServ20(d); if (!q || q.k === 1 && d.sg === 0 && ps.k !== 1) continue;
    const gain = d.score - cS, sRed = cSug != null && q.s != null ? cSug - q.s : 0, cRed = cCarb != null ? cCarb - q.c : 0;
    if (gain < 5) continue; if (sRed < 1 && gain < 10) continue; if (cH != null && d.h != null && d.h < cH - 5) continue; if (d.h != null && d.h < 25) continue;
    if (cRed < -3) continue; // never "swap" to more carbs per serving
    if (ty !== 'drink' && ty !== 'sauce' && cCarb >= 15 && q.c < cCarb * 0.2) continue; // not a like-for-like swap
    if (ty === 'drink' && !(q.s > 0) && !LOWDRINK20.test(d.name)) continue; // a 0 g sugar regular soda is a label/data error, not a swap
    let ov = 0; for (const t of TOK20(d.name)) if (toks.has(t)) ov++;
    out.push({ d, q, gain, sRed, cRed, same, rank: gain + 1.2 * Math.max(0, sRed) + 0.4 * Math.max(0, cRed) + (same ? 12 : 0) + Math.min(3, ov) * 4 + (d.h != null && cH != null ? (d.h - cH) * 0.1 : 0) - (d.rank || 0) / Math.max(1, engine.docs.length) * 4 });
  }
  out.sort((a, b) => b.rank - a.rank); const seen = new Set(), res = [];
  for (const x of out) { const k = (x.d.name || '').toLowerCase().replace(/[^a-z]/g, '') + '|' + (x.d.brand || '').toLowerCase().slice(0, 8); if (seen.has(k)) continue; seen.add(k); res.push(x); if (res.length >= limit) break; }
  if (res.length && res.filter(x => x.same).length < res.length && out.some(x => x.same && !res.includes(x))) { /* prefer same store/chain when there are enough */ }
  return res;
}
function delta20(v, unit, betterLow = true) { if (v == null || Math.abs(v) < 0.5) return ''; const good = betterLow ? v < 0 : v > 0; return `<span class="dl20 ${good ? 'gd' : 'bd'}">${v > 0 ? '+' : '−'}${fmt20(Math.abs(v))}${unit}</span>`; }
function swapCard20(x, cur, rest) {
  const d = x.d, q = x.q, sv = q.basis;
  return `<a class="sw20" href="#/product/${esc(d.code)}">${typeof thumb === 'function' ? thumb(d.img, d.name, d.keys, d.cat, false, d.brand) : ''}<span class="sw20t"><b>${esc(d.name)}</b><small>${esc(d.brand || '')}${x.same ? ` · <span class="same20">${rest ? 'Same chain' : 'Same store'}</span>` : ''}</small>
   ${scores20(d.h, d.score)}<span class="sw20d"><span>Blood sugar ${delta20(x.gain, ' pts', false)}</span><span>Sugar ${q.s == null ? '—' : fmt20(q.s) + ' g'} ${delta20(q.s == null || cur.sugar == null ? null : q.s - cur.sugar, ' g')}</span><span>Carbs ${fmt20(q.c)} g ${delta20(cur.carbs == null ? null : q.c - cur.carbs, ' g')}</span></span><small class="sv20">${esc(sv)}</small></span></a>`;
}
function swapsBlock20(doc, cur, opt = {}) {
  const S = smartSwaps20(doc, cur, opt.limit || 3); if (!S.length) return '';
  const rest = doc.src === 'rest';
  return `<section class="card swc20" id="${opt.id || 'sw20'}" aria-labelledby="${opt.id || 'sw20'}h"><div class="fx-h"><h2 id="${opt.id || 'sw20'}h">Smart swaps</h2><span class="small">Lower sugar or better Blood sugar score, ${rest ? 'same kind of item' : 'same category'}${S.some(x => x.same) ? (rest ? ', this chain first' : ', your stores first') : ''}</span></div>
  <p class="small sw20n">Compared with this food: ${cur.sugar == null ? '' : `${fmt20(cur.sugar)} g sugar, `}${fmt20(cur.carbs)} g carbs ${esc(cur.basis || 'per serving')}. Each swap shows its own serving.</p>
  <div class="sw20l">${S.map(x => swapCard20(x, cur, rest)).join('')}</div></section>`;
}
async function productSwaps20(p, s) {
  if (!p || p.src === 'cos') return; try { await loadIndex(); } catch { return; }
  const code = p.code || p.id; const doc = engine.byCode(code) || { code, name: p.name, brand: p.brand, cat: p.cat || '', keys: [], src: /^(r-|ms-)/.test(code) ? 'rest' : 'local' };
  const draw = () => { if (!location.hash.includes(encodeURIComponent(code)) && !location.hash.includes(code)) return;
    const base = LumiScore.servBasis ? LumiScore.servBasis(p, { mult: 1 }) : { g: p.servQ || 100 }; const k = (base.g || 100) / 100, n = p.n || {};
    const sc = LumiScore.score(p, { mult: 1 }); let h = null; try { h = LumiHealth.rate(p, { mult: 1 }).score; } catch {}
    const cur = { score: sc.score, h: doc.h != null ? doc.h : h, sugar: n.sugars == null ? null : n.sugars * k, carbs: n.carbs == null ? null : n.carbs * k, basis: base.kind === 'item' ? 'per item' : base.kind === 'per100' ? 'per 100 g' : `per serving (${Math.round(base.g)} g)` };
    const html = swapsBlock20(doc, cur); const old = $('#sw20'); if (old) old.remove(); if (!html) return;
    const anchor = $('#hcard') || $('#bg8') || app.querySelector('.card'); if (!anchor) return; anchor.insertAdjacentHTML('afterend', html);
    ['#swapsCard', '#better9', '#du14p'].forEach(s => { const o = $(s); if (o) o.hidden = true; }); };
  draw(); try { await loadIndexFull(); draw(); } catch {}
}
if (typeof bind9 === 'function') { const _b920 = bind9; bind9 = function (p, s) { const r = _b920.apply(this, arguments); productSwaps20(p, s).catch(() => {}); return r; }; }
/* search results: one inline swap under each of the first results that has a clearly better option */
function searchSwaps20() {
  const res = $('#res'); if (!res || typeof engine === 'undefined' || !engine.docs.length) return; let n = 0;
  for (const a of res.querySelectorAll('a.row')) { if (n >= 8) break; if (a.dataset.sw20) continue; a.dataset.sw20 = '1'; n++;
    const code = decodeURIComponent((a.getAttribute('href') || '').replace('#/product/', '')); const d = engine.byCode(code); if (!d || d.score == null || d.score >= 70) continue;
    const q = perServ20(d); if (!q) continue; const S = smartSwaps20(d, { score: d.score, h: d.h, sugar: q.s, carbs: q.c }, 1); if (!S.length) continue; const x = S[0];
    const why = [x.sRed >= 1 ? `${fmt20(x.sRed)} g less sugar` : '', x.cRed >= 1 ? `${fmt20(x.cRed)} g fewer carbs` : '', `+${x.gain} Blood sugar pts`].filter(Boolean).join(', ');
    a.insertAdjacentHTML('afterend', `<a class="srs20" href="#/product/${esc(x.d.code)}" aria-label="Smart swap for ${esc(d.name)}: ${esc(x.d.name)}, ${esc(why)} per serving"><span aria-hidden="true">↘</span> <span>Swap: <b>${esc(x.d.name)}</b>${x.d.brand ? ` <small>${esc(x.d.brand)}</small>` : ''}</span><span class="w20">${esc(why)}</span></a>`); }
}
if (typeof renderResults === 'function') { const _rr20 = renderResults; renderResults = function () { const r = _rr20.apply(this, arguments); try { searchSwaps20(); } catch (e) { console.warn(e); } return r; }; }
/* logged meals: swap hint under logged foods (Log day view) + a card on Today */
function logSwapFor20(e) {
  if (!e || !e.pid || typeof engine === 'undefined') return null; const d = engine.byCode(e.pid); if (!d || d.score == null || d.score >= 70) return null;
  const g = +e.grams || 0, n = e.n || {}; const cur = { score: d.score, h: d.h, sugar: n.sugars == null ? null : n.sugars * g / 100, carbs: n.carbs == null ? null : n.carbs * g / 100 };
  const q = perServ20(d); if (q) { cur.sugar = q.s; cur.carbs = q.c; } const S = smartSwaps20(d, cur, 1); return S.length ? { e, d, x: S[0], cur } : null;
}
async function decorateLog20() {
  const lists = app.querySelectorAll('.loglist'); if (!lists.length) return; try { await loadIndex(); } catch { return; } const L = LOG.all();
  app.querySelectorAll('.loglist [data-del]').forEach(b => { const li = b.closest('li'); if (!li || li.dataset.sw20) return; li.dataset.sw20 = '1'; const e = L.find(x => x.id === b.dataset.del); const r = logSwapFor20(e); if (!r) return;
    li.insertAdjacentHTML('afterend', `<li class="ls20"><a href="#/product/${esc(r.x.d.code)}"><span aria-hidden="true">↘</span> Next time: <b>${esc(r.x.d.name)}</b> <small>${r.x.sRed >= 1 ? `${fmt20(r.x.sRed)} g less sugar · ` : ''}+${r.x.gain} Blood sugar pts per serving</small></a></li>`); });
}
async function todaySwaps20() {
  if (!/^#\/today/.test(location.hash) || $('#tsw20')) return; const m = location.hash.match(/^#\/today\/(\d{4}-\d{2}-\d{2})/); const k = m ? m[1] : dkey16(Date.now());
  const E = LOG.all().filter(e => dkey16(e.ts) === k); if (!E.length) return; try { await loadIndex(); } catch { return; }
  const seen = new Set(), R = []; for (const e of E) { if (seen.has(e.pid)) continue; seen.add(e.pid); const r = logSwapFor20(e); if (r) R.push(r); if (R.length >= 3) break; }
  if (!R.length || $('#tsw20')) return; const anchor = [...app.querySelectorAll('.card')].find(c => /Meals/.test((c.querySelector('h2') || {}).textContent || '')); if (!anchor) return;
  anchor.insertAdjacentHTML('afterend', `<section class="card swc20" id="tsw20"><div class="fx-h"><h2>Smart swaps for what you logged</h2><span class="small">per serving</span></div><div class="sw20l">${R.map(r => `<div class="tsr20"><p class="small">Instead of <b>${esc(r.e.name)}</b> (${r.cur.sugar == null ? '' : fmt20(r.cur.sugar) + ' g sugar, '}${fmt20(r.cur.carbs)} g carbs)</p>${swapCard20(r.x, r.cur, r.d.src === 'rest')}</div>`).join('')}</div></section>`);
}
(function () { let q = 0; const run = () => { q = 0; try { decorateLog20(); todaySwaps20(); } catch (e) { console.warn(e); } };
  const mo = new MutationObserver(() => { if (!q) q = setTimeout(run, 120); }); const a = document.getElementById('app'); if (a) mo.observe(a, { childList: true }); })();

/* ---------- 3. build-your-own bowls (official component items only) ---------- */
const BOWL20 = [
  { id: 'chipotle', chain: 'Chipotle', title: 'Chipotle bowl', kind: 'bowl', src: 'Chipotle official US nutrition facts PDF (OCT-2024-US)', ex: /^Kids /, groups: [
    ['base', 'Base', /^(Cilantro-Lime White Rice|Cilantro-Lime Brown Rice|Supergreens Salad Mix|Flour Tortilla \(burrito\)|Flour Tortilla \(taco\)|Crispy Corn Tortilla|Romaine Lettuce \(tacos\))$/, 2],
    ['protein', 'Protein', /^(Chicken|Steak|Barbacoa|Carnitas|Sofritas)$/, 2], ['beans', 'Beans', /^(Black Beans|Pinto Beans)$/, 2],
    ['top', 'Salsas & toppings', /^(Fajita Vegetables|Fresh Tomato Salsa|Roasted Chili-Corn Salsa|Tomatillo-Green Chili Salsa|Tomatillo-Red Chili Salsa|Sour Cream|Cheese|Guacamole \(topping\/side\)|Queso Blanco \(entreé\)|Chipotle-Honey Vinaigrette)$/, 0],
    ['side', 'Sides', /^(Chips \(regular\)|Chips \(large\)|Queso Blanco \(side\)|Queso Blanco \(large\)|Guacamole \(large\))$/, 0]] },
  { id: 'cava', chain: 'CAVA', title: 'CAVA bowl or pita', kind: 'bowl', src: 'CAVA official Nutrition and Allergen Guide (PDF, Sep 2026)', note: 'CAVA lists each base, main, dip, topping and dressing as one standard portion but gives no weights, so totals are per portion as served. For a pita, choose Whole Pita as a base.', groups: [
    ['base', 'Base', /^(Saffron Basmati Rice|Brown Rice|Black Lentils|Super Greens|Arugula|Baby Spinach|Romaine|Power Greens|Whole Pita)$/, 2],
    ['protein', 'Main', /^(Grilled Chicken|Harissa Honey Chicken|Grilled Steak|Braised Lamb|Spicy Lamb Meatballs|Falafel|Glazed Salmon|Roasted Vegetables)$/, 2],
    ['dip', 'Dips & spreads', /^(Hummus|Red Pepper Hummus|Crazy Feta®|Tzatziki|Roasted Eggplant|Harissa \(dip\))$/, 0],
    ['top', 'Toppings', /^(Shredded Romaine|Pita Crisps|Sumac Cabbage Slaw|Tomato \+ Onion|Persian Cucumber|Tomato \+ Cucumber|Kalamata Olives|Fiery Broccoli|Pickled Onions|Salt-Brined Pickles|Crumbled Feta|Fire-Roasted Corn|Avocado)$/, 0],
    ['sauce', 'Dressing', /^(Greek Goddess Dressing|Balsamic Date Vinaigrette|Yogurt Dill Dressing|Lemon Herb Tahini Dressing|Greek Vinaigrette|Skhug Dressing|Hot Harissa Vinaigrette|Garlic Dressing)$/, 0],
    ['side', 'Sides', /^(Side Quarter Pita|Pita Chips|Harissa BBQ Pita Chips)$/, 0]] },
  { id: 'moes', chain: "Moe's Southwest Grill", title: "Moe's bowl", kind: 'bowl', ex: /for (Kids|Tacos|Nachos|Stacks|Quesadillas|Junior)|Double/, groups: [
    ['base', 'Base', /^(Cilantro Lime Rice, for Bowls|Seasoned Rice, for Bowls|Salad Bowl|Chopped Romaine|Flour Tortilla, 12 in|Whole Grain Tortilla, 12 in)$/, 2],
    ['protein', 'Protein', /^(Adobo Chicken|Grilled Steak|Pork Carnitas|Ground Beef|Organic Tofu|Fish), Regular$/, 2], ['beans', 'Beans', /^(Black Beans|Pinto Beans)$/, 2],
    ['top', 'Toppings', /^(Queso, Bowl|Guacamole, Bowl|Sour Cream|Shredded Lettuce|Black Olives|Pickled Jalapenos|Grilled Peppers|Diced Tomatoes|Fresh Jalapenos|Shredded Cheese|Pico De Gallo|Grilled Mushrooms|Diced Cucumbers|Bacon Pieces|Grilled Onions|Corn Pico|Chopped Cilantro|Diced Onions)$/, 0],
    ['sauce', 'Salsas & sauces', /^(Chipotle Ranch|Southwest Vinaigrette|Tomatillo|El Guapo|Scorpion Pepper Salsa|Tomatillos Hot Friend Salsa|Hard Rock N Roll Hot Sauce)$/, 0], ['side', 'Sides', /^(Chips|Queso, Side)$/, 0]] },
  { id: 'cafe-rio', chain: 'Cafe Rio', title: 'Cafe Rio bowl', kind: 'bowl', groups: [
    ['base', 'Base', /^(Cilantro Lime Rice|Lettuce|Cabbage|Tostada Shell|6 inch Corn Tortilla|6 inch Flour Tortilla|6 inch Wheat Tortilla|12 inch Flour Tortilla|12 inch Wheat Tortilla)$/, 2],
    ['protein', 'Protein', /^(Baja Citrus Shrimp|Carne Asada|Chile Roast Beef|Coconut Shrimp|Fire-Grilled Chicken|Fire-Grilled Steak|Pollo Asado|Shredded Chicken Breast|Sweet Pork Barbacoa)$/, 2],
    ['beans', 'Beans', /^(Black Beans|Pinto Beans)$/, 2], ['sauce', 'Sauces & dressing', /^(Creamy Tomatillo Dressing|Green Chile Sauce \(Medium\)|Habanero \(Hottest\)|Red Chile Sauce \(Hot\)|Tomatillo Sauce \(Mild\))$/, 0],
    ['top', 'Toppings', /^(Mango Salsa|Cheddar Jack Blend|Cotija Cheese|Guacamole|Pico de Gallo|Queso|Salsa Fresca|Shredded Jack Cheese|Sour Cream|Lime Wedge|Tortilla Strips)$/, 0], ['side', 'Sides', /^(Tortilla Chips)$/, 0]] },
  { id: 'barberitos', chain: 'Barberitos', title: 'Barberitos burrito bowl', kind: 'bowl', strip: /^Salad, /, groups: [
    ['base', 'Base', /^Salad, (Romaine Lettuce|Iceberg Lettuce|Spinach|Rice|Salad Shell)$/, 2], ['protein', 'Protein', /^Salad, (Chicken|Spicy Chicken|Steak|Ground Beef|Ground Turkey|Fish|Tofu)$/, 2],
    ['beans', 'Beans', /^Salad, (Black Beans|Pinto Beans)$/, 2], ['top', 'Toppings', /^Salad, (Avocado Slices|Black Olives|Cheese|Corn Salsa|Cucumbers|Green Pepper|Guacamole|Jalapeno, Fresh|Jalapeno, Pickled|Mushrooms|Onions|Salsa|Heavy D Salsa|Sour Cream)$/, 0],
    ['sauce', 'Sauces & dressings', /^Salad, (Chipotle Hot Sauce|Chipotle Ranch|Fat Free Balsamic Vinaigrette|Hot Sauce|Southwestern Vinaigrette|Tomatillo Sauce)$/, 0]] },
  { id: 'pancheros', chain: 'Pancheros', title: 'Pancheros bowl', kind: 'bowl', note: 'Pancheros lists a smaller and a larger scoop for most items; pick one of each.', groups: [
    ['base', 'Base', /^(Cilantro Lime Rice|Large Tortilla|Small Tortilla)$/, 2], ['protein', 'Protein', /^(Carnitas|Chicken|Steak|Tofusada), [\d.]+ oz$/, 2],
    ['top', 'Toppings', /^(Veggies|Guacamole|Queso|Shredded Cheese|Pico de Gallo), [\d.]+ oz$|^(Sour Cream|Jalapenos)$/, 0],
    ['sauce', 'Salsas & dressing', /^(Hot Tomatillo Salsa|Medium Salsa Verde|Mild Ancho Salsa|Roasted Corn Salsa), [\d.]+ oz$|^Cilantro Lime Vinaigrette$/, 0], ['side', 'Sides', /^Chips$/, 0]] },
  { id: 'hot-head', chain: 'Hot Head Burritos', title: 'Hot Head bowl', kind: 'bowl', groups: [
    ['base', 'Base', /^(White Rice|Brown Rice|Flour Tortilla|Cheddar Jalapeno Tortilla)$/, 2], ['protein', 'Protein', /^(Barbacoa|Chicken|Chorizo|Fish|Pork|Steak|Taco Meat), Regular Entree Portion$/, 2],
    ['beans', 'Beans', /^(Black Beans|Pinto Beans)$/, 2], ['top', 'Toppings', /Topping$/, 0], ['sauce', 'Salsas & sauces', /^(Corn Salsa|Pico Salsa|Roja Salsa|Verde Salsa|Wild Salsa|BBQ Sauce|Cholula Sauce|Hot Head Sauce|Jalapeno Ranch|Mango Habanero Sauce|Ranch Sauce|Smoky Tabasco|Southwest Ranch Sauce|Straight Habanero Sauce|Sweet Habanero Sauce|Sweet Teriyaki Sauce|Taco Sauce)$/, 0],
    ['side', 'Sides', /^(Bag of Tortilla Chips)$/, 0]] },
  { id: 'qdoba', chain: 'Qdoba', title: 'Qdoba bowl', kind: 'bowl', note: 'Qdoba publishes full nutrition for its signature bowls and add-ons, not for each rice, bean or protein scoop, so start from a signature bowl and add extras.', groups: [
    ['base', 'Signature bowl', /^(Keto Bowl - (Brisket Birria|Chicken|Steak)|Chicken Queso Bowl|Cholula® Hot & Sweet Chicken Bowl)$/, 1],
    ['top', 'Add-ons', /^(Chile Crema \(1 oz\)|Cotija Cheese \(\.25 oz\.\)|Picante Ranch Dressing \(1\.5 oz\.\)|Queso Diablo \(2 oz\.\)|Romaine Lettuce \(0\.25 oz\.\)|Salsa Verde \(1 oz\.\)|Seasoned Potatoes \(2 oz\.\)|Shredded Cheese \(1\.0 oz\.\)|Sour Cream, \(1 oz\.\)|Three Cheese Queso \(2 oz\.\)|Chopped Cilantro.*)$/, 0],
    ['side', 'Sides', /^(Tortilla Chips \(2 oz\.\) WG|Side \(black beans w\/ cheese\))$/, 0]] },
  { id: 'subway', chain: 'Subway', title: 'Subway 6-inch', kind: 'sandwich', note: 'Subway lists each bread, meat, cheese, vegetable and sauce for a 6-inch sub.', groups: [
    ['base', 'Bread', /^(6" (Artisan Italian|Hearty Multigrain|Italian Herbs & Cheese|Jalapeño Cheddar) Bread|6" Artisan Flatbread|9" Wrap \(Pocket\)|12" Wrap)$/, 1],
    ['protein', 'Protein', /^(All-American Club Meats.*|Bacon \(2 strips\)|Cold Cut Combo® Meats|Genoa Salami.*|Grilled Chicken, Sweet Onion Teriyaki Glazed|Meatballs|Pastrami|Pepperoni, \(3 slices\)|Rotisserie-Style Chicken|Steak \(no cheese\)|Subway Club® Meats.*)$/, 2],
    ['cheese', 'Cheese', /^(American|Monterey Cheddar, Shredded|Parmesan Grated|Pepperjack|Provolone)$/, 2],
    ['top', 'Vegetables', /^(Avocado, Sliced|Avocado, Smashed|Banana Peppers.*|Cucumbers.*|Green Chiles|Green Peppers.*|Jalapeno Peppers.*|Lettuce|Olives, Black.*|Onions|Pickles, Crinkle.*|Spinach, Baby|Tomatoes.*)$/, 0],
    ['sauce', 'Sauces', /^(Baja Chipotle|BBQ Sauce|Frank's RedHot® Buffalo Sauce|Honey Mustard|Hot Honey Sauce|Mayonnaise|Mustard, Yellow|Olive Oil Blend|Olive Oil Blend & Vinegar|MVP Parmesan Vinaigrette®|Peppercorn Ranch|Red Wine Vinegar|Roasted Garlic Aioli|Sweet Onion Teriyaki)$/, 0]] },
  { id: 'blaze', chain: 'Blaze Pizza', title: 'Blaze pizza', kind: 'pizza', note: 'Blaze lists each crust, sauce and topping for a whole 11-inch pizza. Set how many servings (slices shared) below.', groups: [
    ['base', 'Crust', /^(Classic Dough|High Rise Dough|Gluten Free Dough|Keto Crust \(GF\)|Cauliflower Crust \(GF\))$/, 1], ['sauce', 'Sauce', /^(Garlic Pesto Sauce|White Cream Sauce|Spicy Red Sauce)$/, 2],
    ['cheese', 'Cheese', /^(Feta|Goat Cheese|Gorgonzola|Grated Parmesan|Ovalini Mozzarella|Shaved Parmesan|Shredded Mozzarella|Vegan Cheese|Ricotta)$/, 0],
    ['protein', 'Meats', /^(Applewood Bacon|Chicken|Italian Sausage|Pepperoni|Salame|Smoked Ham|Spicy Chorizo \(Vegan\)|Spicy Hot Chicken|Meatballs)$/, 0],
    ['top', 'Vegetables', /^(Artichokes|Banana Peppers|Basil|Black Olives|Cherry Tomatoes|Green Bell Peppers|Jalapenos|Kalamata Olives|Mushrooms|Pineapple|Red Onions|Red Peppers|Roasted Broccoli|Roasted Brussel Sprouts|Roasted Butternut Squash|Roasted Garlic|Scorpion Slaw|Spinach|Zucchini|Arugula|Roasted Corn)$/, 0],
    ['fin', 'Finishes', /^(Balsamic Glaze|Basil Pesto|Buffalo Sauce|Chipotle Ranch Drizzle|Franks Red Hot Drizzle|Olive Oil Drizzle|Oregano|Ranch|Sea Salt|Spicy Chili Oil Drizzle|Spicy Sweet Drizzle)$/, 0]] },
  { id: 'mod', chain: 'Mod Pizza', title: 'MOD pizza', kind: 'pizza', note: 'MOD lists each crust, sauce and topping. Set how many servings (slices shared) below.', groups: [
    ['base', 'Crust', /^(Cauliflower Crust|Gluten-Friendly Crust|Mega Thick Crust \(11-inch\)|Mini \(6-inch Thin Crust\)|MOD \(11-inch Thin Crust\))$/, 1],
    ['sauce', 'Sauce', /^(Creamy Alfredo Sauce|Extra Virgin Olive Oil|Garlic Pesto|Garlic Rub|Signature Tomato Sauce|Spicy Calabrian Chili Tomato Sauce|Sweet BBQ Sauce)$/, 2],
    ['cheese', 'Cheese', /^(Asiago|Cheddar|Feta|Gorgonzola|Mozzarella|Parmesan|Plant-Based Cheese|Ricotta)$/, 0],
    ['protein', 'Meats', /^(Anchovies|Canadian Bacon|Crispy Bacon|Egg – Scrambled|Grilled Chicken|Mild Italian Sausage|Pepperoni|Plant-Based Italian Sausage|Salami|Seasoned Ground Beef|Spicy Chicken Sausage)$/, 0],
    ['top', 'Vegetables', /^(Artichokes|Arugula|Banana Peppers|Basil, Fresh Chopped|Black Olives|Broccoli, Roasted|Chickpeas|Cilantro|Corn, Roasted|Cucumbers|Garlic, Chopped|Garlic, Roasted|Greek Olives|Green Bell Peppers|Jalapenos|Mama Lil's Sweet Hot Peppas|Mixed Spring Greens|Mushrooms|Pineapple|Red Onion|Red Peppers, Roasted|Romaine|Serrano Peppers|Spinach|Vine-Ripened Tomatoes, Diced|Vine-Ripened Tomatoes, Sliced)$/, 0],
    ['fin', 'Finishes', /^(Balsamic Fig Glaze|Garlic Pesto Drizzle|Hot Buffalo Sauce|Mike’S Hot Honey|Ranch Finish|Sriracha Ranch|Sweet BBQ Swirl|Tomato Sauce Dollops)$/, 0]] },
  { id: 'pokeworks', chain: 'Pokeworks', title: 'Pokeworks poke bowl', kind: 'bowl', note: 'Pokeworks publishes its signature bowls (with base and protein) and its sauces and sides, not each scoop, so start from a signature bowl.', groups: [
    ['base', 'Signature bowl', /^(Avocado Salad|Bang Bang Chicken|Hawaiian Ahi|Luxe Lobster|Spicy Ahi Tuna|Sweet Sesame Chicken|Sweet Shoyu Tofu|Umami Ahi|Yuzu Ponzu Salmon) Bowl, (Small|Regular)$/, 1],
    ['sauce', 'Extra sauce', /^(Black Garlic Aioli|Hawaiian Salt & Chili|O\.G\. Shoyu|Pokeworks Classic|Ponzu Fresh|Spicy Serrano Aioli|Sriracha Aioli|Sweet Chili Gochujang|Sweet Shoyu|Umami Shoyu)$/, 0],
    ['side', 'Sides', /^(Furikake Mac Salad|Miso Soup|Seaweed Salad|Spicy Edamame|Surimi Salad|Spam Musubi)$/, 0]] }
];
async function bowlItems20(cfg) {
  try { await loadIndex(); } catch {} const D = engine.docs.filter(d => d.src === 'rest' && d.brand === cfg.chain && !(cfg.ex && cfg.ex.test(d.name)));
  const G = cfg.groups.map(([k, l, re, max]) => ({ k, l, max, items: D.filter(d => re.test(d.name)).sort((a, b) => a.name.localeCompare(b.name)) })).filter(g => g.items.length);
  return G;
}
function bowlAvail20() { return BOWL20.filter(c => engine.docs.some(d => d.src === 'rest' && d.brand === c.chain)); }
async function viewBowlHub20() {
  document.title = 'Build your own — Lumi'; try { await loadIndex(); } catch {}
  const A = bowlAvail20();
  app.innerHTML = `<section class="pg13 bw20"><h1>Build your own</h1><p class="lead">Pick a chain, then assemble your bowl, sub or pizza from that chain's own published nutrition for each ingredient. Totals and both scores update as you go.</p>
  <ul class="bwh20">${A.map(c => `<li><a href="#/bowl/${c.id}"><span class="bi20" aria-hidden="true">${c.kind === 'pizza' ? '🍕' : c.kind === 'sandwich' ? '🥪' : '🥗'}</span><span><b>${esc(c.title)}</b><small>${esc(c.chain)}</small></span><span aria-hidden="true">›</span></a></li>`).join('')}</ul>
  <p class="foot">Only chains that publish nutrition for individual ingredients are here. Sweetgreen isn't included yet: Lumi has no allowed official ingredient-level source for it right now.</p></section>`;
}
const draft20 = id => store.get('bowl20:' + id, null);
async function viewBowl20(id) {
  const cfg = BOWL20.find(c => c.id === id); if (!cfg) return viewBowlHub20();
  document.title = cfg.title + ' builder — Lumi'; app.innerHTML = `<section class="pg13 bw20"><h1>${esc(cfg.title)}</h1><div class="skel" style="height:200px"></div></section>`;
  const G = await bowlItems20(cfg); if (!location.hash.startsWith('#/bowl/' + id)) return;
  if (!G.length) { app.innerHTML = `<section class="pg13 bw20"><h1>${esc(cfg.title)}</h1><div class="card"><p>${esc(cfg.chain)} ingredient data isn't loaded. Check your connection and try again.</p></div></section>`; return; }
  const st = draft20(id) || { sel: {}, sv: 1, name: '' }; const sel = st.sel; const save = () => store.set('bowl20:' + id, st);
  const all = new Map(); G.forEach(g => g.items.forEach(d => all.set(d.code, d)));
  const prods = new Map(); const need = async () => { await Promise.all(Object.keys(sel).filter(c => !prods.has(c)).map(async c => { try { const p = await resolveProduct(c); if (p) prods.set(c, p); } catch {} })); };
  app.innerHTML = `<section class="pg13 bw20"><header><h1>${esc(cfg.title)}</h1><p class="lead">Built from ${esc(cfg.chain)}'s official nutrition for each ingredient. Tap to add; use − / + for double portions.</p>${cfg.note ? `<p class="note small">${esc(cfg.note)}</p>` : ''}</header>
   <div class="bwl20"><div class="bwg20">${G.map(g => `<fieldset class="card bf20"><legend><h2>${esc(g.l)}</h2><small>${g.max === 1 ? 'Choose 1' : g.max ? 'Up to ' + g.max : 'Any'}</small></legend><ul class="bi20l">${g.items.map(d => { const q = perServ20(d) || {}; const nm = cfg.strip ? d.name.replace(cfg.strip, '') : d.name;
     return `<li><button type="button" class="bo20" data-c="${esc(d.code)}" data-g="${g.k}" aria-pressed="false"><span class="bn20">${esc(nm)}</span><small>${q.c == null ? '' : fmt20(q.c) + ' g carbs'}${q.s == null ? '' : ' · ' + fmt20(q.s) + ' g sugar'}</small></button><span class="bq20" hidden><button type="button" class="icon sm" data-m="${esc(d.code)}" aria-label="Less ${esc(nm)}">−</button><b data-n="${esc(d.code)}">1×</b><button type="button" class="icon sm" data-p="${esc(d.code)}" aria-label="More ${esc(nm)}">+</button></span></li>`; }).join('')}</ul></fieldset>`).join('')}</div>
   <aside class="card bt20" aria-live="polite" aria-label="Your build"><div id="bt20"></div></aside></div>
   <p class="foot">Per-ingredient values are as published by ${esc(cfg.chain)}; restaurant portions vary. Informational only.</p></section>`;
  const paint = () => { app.querySelectorAll('.bo20').forEach(b => { const on = !!sel[b.dataset.c]; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); const q = b.nextElementSibling; q.hidden = !on; const n = q.querySelector('b'); if (n) n.textContent = (sel[b.dataset.c] || 1) + '×'; }); };
  const total = () => { const T = { kcal: 0, carbs: 0, sugars: 0, fiber: 0, protein: 0, fat: 0, sat: 0, sodiumMg: 0 }, miss = new Set(); let g = 0, gramsKnown = true, addedOk = true, added = 0;
    for (const [c, m] of Object.entries(sel)) { const p = prods.get(c); if (!p) { miss.add('loading'); continue; } const per = p.meta && p.meta.perItem; const k = (per ? 100 : (+p.servQ || 100)) / 100 * m; if (per) gramsKnown = false; else g += (+p.servQ || 100) * m;
      for (const f of Object.keys(T)) { const v = p.n && p.n[f]; if (v == null) miss.add(f); else T[f] += v * k; } if (p.n && p.n.added != null) added += p.n.added * k; else addedOk = false; }
    return { T, g, gramsKnown, miss, added: addedOk ? added : null }; };
  const product = (x, sv) => { const per = !x.gramsKnown || !x.g; const div = per ? sv : x.g / 100; const n = {}; for (const [k, v] of Object.entries(x.T)) n[k] = x.miss.has(k) ? null : v / div; if (x.added != null) n.added = x.added / div;
    const items = Object.entries(sel).map(([c, m]) => { const d = all.get(c); return (m > 1 ? m + '× ' : '') + (cfg.strip ? d.name.replace(cfg.strip, '') : d.name); });
    const sg = per ? 100 : x.g / sv; return { id: 'bowl20-' + id, code: '', src: 'custom', name: (st.name || '').trim() || `My ${cfg.title}`, brand: cfg.chain + ' (built)', qty: '', img: '', servQ: Math.round(sg * 10) / 10, serv: per ? (sv > 1 ? `1 of ${sv} servings` : '1 ' + cfg.kind) : `${sv > 1 ? `1 of ${sv} servings` : '1 ' + cfg.kind} (${Math.round(sg)} g)`, nova: null, additives: [], ing: '', cat: 'Restaurant meal', cats: '', naLabel: true, liquid: false, portions: [[per ? '1 serving' : `1 serving (${Math.round(sg)} g)`, Math.round(sg * 10) / 10]], meta: { src: `Built from ${cfg.chain} official ingredient nutrition`, perItem: per, built: { chain: cfg.chain, items, servings: sv } }, n }; };
  const draw = async () => { await need(); if (!location.hash.startsWith('#/bowl/' + id)) return; paint(); const el = $('#bt20'); if (!el) return; const n = Object.keys(sel).length;
    if (!n) { el.innerHTML = `<h2>Your ${esc(cfg.kind)}</h2><p class="small">Nothing added yet. Pick a ${esc(G[0].l.toLowerCase())} to start.</p>`; return; }
    const x = total(), sv = Math.max(1, +st.sv || 1), p = product(x, sv); let sc = null, h = null; try { sc = LumiScore.score(p); } catch {} try { h = LumiHealth.rate(p, { whole: false, group: '' }); } catch {}
    const k = p.meta.perItem ? 1 : p.servQ / 100, ps = f => p.n[f] == null ? null : p.n[f] * k;
    el.innerHTML = `<h2>Your ${esc(cfg.kind)}</h2><label class="fl11 bwn20"><span>Name</span><input id="bwName" class="in11" value="${esc(st.name || '')}" placeholder="My ${esc(cfg.title)}" autocomplete="off"></label>
     <div class="bsc20">${scores20(h && h.score, sc && sc.score)}</div><p class="small">Scores ${sv > 1 ? `per serving (1 of ${sv})` : `for the whole ${esc(cfg.kind)}`}${p.meta.perItem ? '' : `, ${Math.round(p.servQ)} g`}.</p>
     <div class="bt20g"><div class="key"><small>Carbs</small><b>${fmt20(ps('carbs'))} g</b></div><div><small>Sugar</small><b>${fmt20(ps('sugars'))} g</b></div><div><small>Fiber</small><b>${fmt20(ps('fiber'))} g</b></div><div><small>Protein</small><b>${fmt20(ps('protein'))} g</b></div><div><small>Fat</small><b>${fmt20(ps('fat'))} g</b></div><div><small>Calories</small><b>${fmt20(ps('kcal'))}</b></div></div>
     ${x.miss.size ? `<p class="note small">${x.miss.has('loading') ? 'Still loading some ingredients… ' : ''}${[...x.miss].filter(f => f !== 'loading').length ? `${esc(cfg.chain)} doesn't publish ${[...x.miss].filter(f => f !== 'loading').join(', ')} for every item; those totals only count items that list them.` : ''}</p>` : ''}
     <label class="fl11 bsv20"><span>Servings (shared)</span><input id="bwSv" class="in11" type="number" min="1" max="12" step="1" inputmode="numeric" value="${sv}"></label>
     <ol class="bil20">${Object.entries(sel).map(([c, m]) => `<li>${m > 1 ? m + '× ' : ''}${esc(cfg.strip ? all.get(c).name.replace(cfg.strip, '') : all.get(c).name)}</li>`).join('')}</ol>
     <div class="actions"><button class="btn pri" id="bwLog">Log it</button><button class="btn" id="bwSave">Save to My foods</button><button class="btn" id="bwClr">Clear</button></div>`;
    $('#bwName').oninput = e => { st.name = e.target.value; save(); };
    $('#bwSv').onchange = e => { st.sv = Math.min(12, Math.max(1, Math.round(+e.target.value || 1))); save(); draw(); };
    $('#bwClr').onclick = () => { for (const c of Object.keys(sel)) delete sel[c]; st.name = ''; save(); draw(); };
    const mk = () => { const q = product(total(), Math.max(1, +st.sv || 1)); q.id = 'c-bw' + Date.now().toString(36); return q; };
    $('#bwSave').onclick = () => { const q = mk(); store.set('custom', [q, ...customFoods()]); remember(q); toast('Saved to My foods'); location.hash = '#/product/' + q.id; };
    $('#bwLog').onclick = () => { const q = mk(); store.set('custom', [q, ...customFoods()]); remember(q); const now = new Date(); const g = q.meta.perItem ? 100 : q.servQ;
      const e = { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ts: now.getTime(), meal: mealFor(now), pid: q.id, name: q.name, brand: q.brand, grams: g, label: q.serv, n: per100(q), score: (LumiScore.score(q) || {}).score };
      const L = LOG.all(); L.push(e); LOG.save(L); toast(`Logged ${q.name} to ${MEAL_L[e.meal]} (also saved to My foods)`); };
  };
  app.querySelectorAll('.bo20').forEach(b => b.onclick = () => { const c = b.dataset.c, g = G.find(x => x.k === b.dataset.g);
    if (sel[c]) delete sel[c]; else { if (g.max) { const on = g.items.filter(d => sel[d.code]); if (on.length >= g.max) delete sel[on[0].code]; } sel[c] = 1; } save(); draw(); });
  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const c = b.dataset.p; sel[c] = Math.min(4, (sel[c] || 1) + 1); save(); draw(); });
  app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const c = b.dataset.m; if ((sel[c] || 1) <= 1) delete sel[c]; else sel[c]--; save(); draw(); });
  draw();
}
/* entry points: Browse tools, chain pages, product pages of those chains */
if (typeof viewBrowseHub === 'function') { const _bh20 = viewBrowseHub; viewBrowseHub = function () { const r = _bh20.apply(this, arguments); const t = app.querySelector('.tools74');
  if (t && !t.querySelector('[href="#/bowl"]')) { t.insertAdjacentHTML('afterbegin', '<a href="#/bowl"><b>Build your own</b><span>Bowls, subs &amp; pizza from official ingredients</span></a><a href="#/weekly"><b>Weekly report</b><span>For your endo: print, PDF or share</span></a>'); } return r; }; }
function bowlLink20(chain) { const c = BOWL20.find(x => x.chain === chain); return c ? `<a class="btn bwlk20" href="#/bowl/${c.id}">${c.kind === 'pizza' ? '🍕' : c.kind === 'sandwich' ? '🥪' : '🥗'} Build your own ${esc(c.kind)} at ${esc(chain)}</a>` : ''; }
if (typeof bind9 === 'function') { const _b9b = bind9; bind9 = function (p) { const r = _b9b.apply(this, arguments); try { const l = p && bowlLink20(p.brand); if (l && !$('.bwlk20')) { const h = app.querySelector('h1'); if (h) h.parentNode.insertAdjacentHTML('beforeend', `<p class="bwp20">${l}</p>`); } } catch {} return r; }; }
if (typeof viewStore === 'function') { const _vs20 = viewStore; viewStore = function (arg) { const r = _vs20.apply(this, arguments); setTimeout(() => { try { const c = BOWL20.find(x => 'rest-' + x.chain.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === arg || x.id === arg); const h = app.querySelector('h1');
  if (c && h && !$('.bwlk20')) h.insertAdjacentHTML('afterend', `<p class="bwp20">${bowlLink20(c.chain)}</p>`); } catch {} }, 300); return r; }; }

/* ---------- 4. weekly report for the endo ---------- */
const SAMPLE20 = (() => { /* fixed, clearly-labeled illustration. Never saved, never mixed with real data. */
  const M = [['breakfast', 7.5, 'Greek yogurt + berries', 24, 15], ['lunch', 12.5, 'Turkey sandwich', 48, 7], ['dinner', 18.75, 'Chicken, rice + broccoli', 62, 4], ['snack', 15.5, 'Apple + peanut butter', 28, 20]];
  const days = []; for (let i = 0; i < 7; i++) { const sh = [0, 15, -10, 30, 5, 45, 20][i] / 60, f = [1, 1.1, 0.9, 1.25, 1, 1.4, 1.15][i];
    days.push(M.map(([m, h, name, c, s], j) => ({ meal: m, h: h + sh + (j === 2 && i === 5 ? 1.25 : 0), name, carbs: Math.round(c * f), sugars: Math.round(s * f), tir: [92, 78, 70, 88][j] - (i === 5 ? 12 : 0), rise: [28, 52, 61, 35][j] + (i === 5 ? 18 : 0) }))); }
  return days; })();
function week20(off) { const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1 - 7 * off); const start = new Date(end); start.setDate(start.getDate() - 7); return { t0: start.getTime(), t1: end.getTime(), days: [...Array(7)].map((_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; }) }; }
const hm20 = h => { const H = Math.floor(h), M = Math.round((h - H) * 60); const d = new Date(2000, 0, 1, H, M); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
function weeklyModel20(off, forceSample) {
  const W = week20(off), L = LOG.all().filter(e => e.ts >= W.t0 && e.ts < W.t1), c0 = typeof cgm11 === 'function' ? cgm11() : null, clarity = c0 && c0.src === 'clarity' ? c0 : null;
  const pts = clarity ? clarity.pts.filter(p => p[0] >= W.t0 - 36e5 && p[0] < W.t1 + 4 * 36e5) : [];
  const sample = forceSample || (!L.length && !pts.length);
  const m = { off, W, sample, range: `${W.days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${W.days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`, simGlucose: !!(c0 && c0.src !== 'clarity' && c0.pts && c0.pts.length) };
  if (sample) {
    m.days = W.days.map((d, i) => { const D = SAMPLE20[i]; return { d, n: D.length, carbs: D.reduce((a, x) => a + x.carbs, 0), sugars: D.reduce((a, x) => a + x.sugars, 0), meals: Object.fromEntries(D.map(x => [x.meal, x.h])) }; });
    m.post = Object.fromEntries(['breakfast', 'lunch', 'dinner', 'snack'].map(k => { const X = SAMPLE20.flat().filter(x => x.meal === k); return [k, { n: X.length, tir: Math.round(X.reduce((a, x) => a + x.tir, 0) / X.length), rise: Math.round(X.reduce((a, x) => a + x.rise, 0) / X.length) }]; }));
    m.tir = { in: 79, lo: 3, hi: 18, n: 2016, mean: 148 }; m.glu = true; m.entries = 28;
    m.top = [['Chicken, rice + broccoli', 7, 62 * 1.13, 4.5], ['Turkey sandwich', 7, 48 * 1.13, 7.9], ['Apple + peanut butter', 7, 28 * 1.13, 22.6], ['Greek yogurt + berries', 7, 24 * 1.13, 17]].map(([name, n, c, s]) => ({ name, n, carbs: c, sugars: s }));
    m.patterns = ['Dinner was the largest carb meal on average (about 70 g).', 'The latest dinner (8:45 PM) had the lowest post-meal time in range of the week (58%) and the largest rise (+79 mg/dL).', 'Greek yogurt + berries: mostly in range after eating (avg 3 h time in range 90%, 7 meals).', 'Chicken, rice + broccoli: tends to rise more (avg +64 mg/dL, 7 meals).'];
    return m; }
  const byDay = W.days.map(d => { const k = dayKey(d), E = L.filter(e => dayKey(new Date(e.ts)) === k), t = totals(E), meals = {};
    E.slice().sort((a, b) => a.ts - b.ts).forEach(e => { const mm = e.meal || 'snack'; if (meals[mm] == null) { const x = new Date(e.ts); meals[mm] = x.getHours() + x.getMinutes() / 60; } });
    return { d, n: E.length, carbs: t.carbs || 0, sugars: t.sugars || 0, meals }; });
  m.days = byDay; m.entries = L.length;
  m.glu = pts.length >= 36; m.tir = m.glu ? tir16(pts.filter(p => p[0] >= W.t0 && p[0] < W.t1)) : null;
  const evs = m.glu && typeof mealEvents18 === 'function' ? mealEvents18(LOG.all(), clarity.pts).filter(e => e.ts >= W.t0 && e.ts < W.t1) : [];
  m.post = {}; ['breakfast', 'lunch', 'dinner', 'snack'].forEach(k => { const X = evs.filter(e => (e.meal || 'snack') === k); if (X.length) m.post[k] = { n: X.length, tir: Math.round(X.reduce((a, x) => a + x.tir, 0) / X.length), rise: Math.round(X.reduce((a, x) => a + x.rise, 0) / X.length) }; });
  const F = {}; L.forEach(e => { const k = (e.pid || e.name) + ''; const s = scale(e.n || {}, e.grams || 0); const f = F[k] = F[k] || { name: e.name, brand: e.brand, n: 0, carbs: 0, sugars: 0, sN: 0 }; f.n++; f.carbs += s.carbs || 0; if (s.sugars != null) { f.sugars += s.sugars; f.sN++; } });
  m.top = Object.values(F).sort((a, b) => b.n - a.n || b.carbs - a.carbs).slice(0, 8).map(f => ({ name: f.name, brand: f.brand, n: f.n, carbs: f.carbs / f.n, sugars: f.sN ? f.sugars / f.sN : null }));
  const P = [], logged = byDay.filter(d => d.n);
  if (logged.length < 7) P.push(`${7 - logged.length} of 7 days have no food logged, so daily totals are incomplete.`);
  const mt = {}; logged.forEach(d => Object.keys(d.meals).forEach(k => { const E = L.filter(e => dayKey(new Date(e.ts)) === dayKey(d.d) && (e.meal || 'snack') === k); mt[k] = mt[k] || []; mt[k].push(totals(E).carbs || 0); }));
  const big = Object.entries(mt).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1])[0]; if (big && Object.keys(mt).length > 1) P.push(`${MEAL_L[big[0]] || big[0]} was the largest carb meal on average (about ${Math.round(big[1])} g).`);
  const late = L.filter(e => new Date(e.ts).getHours() >= 21).length; if (late) P.push(`${late} food entr${late === 1 ? 'y was' : 'ies were'} logged after 9 PM.`);
  const st = settings(); if (st.target) { const over = logged.filter(d => d.carbs > st.target).length; P.push(`${over} of ${logged.length} logged days were above the ${st.target} g daily carb target set in Settings.`); }
  const pk = Object.entries(m.post).filter(([, v]) => v.n >= 2).sort((a, b) => a[1].tir - b[1].tir); if (pk.length >= 2) P.push(`Post-meal time in range was lowest after ${MEAL_L[pk[0][0]].toLowerCase()} (${pk[0][1].tir}%, ${pk[0][1].n} meals) and highest after ${MEAL_L[pk[pk.length - 1][0]].toLowerCase()} (${pk[pk.length - 1][1].tir}%).`);
  if (evs.length && typeof agg18 === 'function') { const A = agg18(evs).foods.filter(f => f.n >= 2); A.filter(f => f.tag === 'in').slice(0, 2).forEach(f => P.push(`${f.name}: mostly in range after eating (avg 3 h time in range ${f.tir}%, ${f.n} meals).`)); A.filter(f => f.tag === 'spike').sort((a, b) => b.rise - a.rise).slice(0, 2).forEach(f => P.push(`${f.name}: tends to rise more (avg ${f.rise > 0 ? '+' : ''}${f.rise} mg/dL, ${f.n} meals).`)); }
  m.patterns = P; return m;
}
function weeklyText20(m) { const L = [`Lumi weekly summary ${m.range}${m.sample ? ' (SAMPLE DATA, not real)' : ''}`, 'Patterns, not medical advice.'];
  m.days.forEach(d => L.push(`${d.d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${d.n ? `${Math.round(d.carbs)} g carbs, ${Math.round(d.sugars)} g sugar` : 'not logged'}`));
  if (m.tir) L.push(`Time in range 70-180: ${m.tir.in}% (below ${m.tir.lo}%, above ${m.tir.hi}%)`); m.patterns.forEach(p => L.push('- ' + p)); return L.join('\n'); }
function viewWeekly20(arg) {
  const forceSample = arg === 'sample', off = forceSample ? 0 : Math.max(0, Math.min(12, +arg || 0)); const m = weeklyModel20(off, forceSample); document.title = 'Weekly report — Lumi';
  const logged = m.days.filter(d => d.n), avg = f => logged.length ? logged.reduce((a, d) => a + d[f], 0) / logged.length : null, mx = Math.max(1, ...m.days.map(d => d.carbs));
  const MK = ['breakfast', 'lunch', 'dinner', 'snack'], mtAvg = k => { const v = m.days.map(d => d.meals[k]).filter(x => x != null); return v.length ? { avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length, min: Math.min(...v), max: Math.max(...v) } : null; };
  const SB = m.sample ? '<div class="smp20" role="note"><b>SAMPLE DATA</b> · Made-up numbers to show the layout. Not your food log or glucose. Log meals or import a Dexcom Clarity CSV to see your own week.</div>' : '';
  app.innerHTML = `<section class="pg13 wk20 rp20"><nav class="noprint dn16 wkn20" aria-label="Choose week">${forceSample ? '<a class="btn sm" href="#/weekly">Back to my week</a>' : `<a class="btn sm" href="#/weekly/${off + 1}" aria-label="Previous week">‹</a><span class="sp16"></span>${off ? `<a class="btn sm" href="#/weekly/${off - 1}" aria-label="Next week">›</a>` : ''}`}</nav>
  <header class="wh20"><p class="ov12">Weekly summary for my care team</p><h1>${esc(m.range)}${m.sample ? ' <span class="smt20">(sample)</span>' : ''}</h1><p class="small">${m.sample ? 'Sample layout' : `${logged.length} of 7 days logged · ${m.entries} food entr${m.entries === 1 ? 'y' : 'ies'}${m.glu ? ' · Dexcom Clarity readings imported by me' : ' · no Clarity glucose data for this week'}`} · generated ${new Date().toLocaleString()} by Lumi ${typeof VERSION !== 'undefined' ? VERSION : ''}</p></header>
  ${SB}<div class="nma20" role="note"><b>Patterns, not medical advice.</b> Self-logged food and my own CGM export. Descriptive only: no insulin doses, no treatment suggestions.</div>
  ${m.simGlucose && !m.sample ? '<p class="note small">Simulated test glucose readings on this device are left out of this report.</p>' : ''}
  <div class="noprint actions wa20"><button class="btn pri" id="wkPdf">Download PDF</button><button class="btn" id="wkShare">Share</button><button class="btn" id="wkPrint">Print</button>${!m.sample && !forceSample ? '<a class="btn" href="#/weekly/sample">See a sample</a>' : ''}</div>
  <div class="card"><div class="fx-h"><h2>Carbs and sugar per day</h2><span class="small">grams${logged.length ? ` · avg ${Math.round(avg('carbs'))} g carbs, ${Math.round(avg('sugars'))} g sugar per logged day` : ''}</span></div>
   <div class="wb20" role="img" aria-label="Daily carbs and sugar">${m.days.map(d => `<div class="wbd20"><div class="wbb20"><i class="c" style="height:${d.carbs / mx * 100}%"></i><i class="s" style="height:${d.sugars / mx * 100}%"></i></div><small>${d.d.toLocaleDateString(undefined, { weekday: 'short' })}</small></div>`).join('')}</div>
   <p class="lg20 small"><span><i class="c"></i>Carbs</span><span><i class="s"></i>Sugar</span></p>
   <div class="tw18"><table class="t20"><caption class="sr-only">Daily totals</caption><thead><tr><th scope="col">Day</th><th scope="col">Carbs</th><th scope="col">Sugar</th><th scope="col">Entries</th></tr></thead><tbody>${m.days.map(d => `<tr><th scope="row">${d.d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</th>${d.n ? `<td>${Math.round(d.carbs)} g</td><td>${Math.round(d.sugars)} g</td><td>${d.n}</td>` : '<td colspan="3" class="small">not logged</td>'}</tr>`).join('')}</tbody></table></div></div>
  <div class="card"><h2>Meal timing</h2><div class="tw18"><table class="t20"><caption class="sr-only">Meal times</caption><thead><tr><th scope="col">Meal</th><th scope="col">Usual time</th><th scope="col">Earliest – latest</th><th scope="col">Days</th></tr></thead><tbody>${MK.map(k => { const a = mtAvg(k); return a ? `<tr><th scope="row">${esc(MEAL_L[k])}</th><td>${hm20(a.avg)}</td><td>${hm20(a.min)} – ${hm20(a.max)}</td><td>${a.n}</td></tr>` : ''; }).join('') || '<tr><td colspan="4" class="small">No meals logged this week.</td></tr>'}</tbody></table></div><p class="small">Time of the first food logged for each meal.</p></div>
  <div class="card"><h2>Glucose after meals</h2>${m.glu ? `${m.tir ? `<p class="small">Whole week: ${m.tir.n} readings, average ${m.tir.mean} mg/dL.</p>${typeof tirBar16 === 'function' ? tirBar16(m.tir, 'Whole week') : ''}` : ''}
   ${Object.keys(m.post).length ? `<div class="tw18"><table class="t20"><caption class="sr-only">Post-meal time in range</caption><thead><tr><th scope="col">Meal</th><th scope="col">Meals with readings</th><th scope="col">Time in range, 3 h after</th><th scope="col">Avg rise</th></tr></thead><tbody>${MK.filter(k => m.post[k]).map(k => `<tr><th scope="row">${esc(MEAL_L[k])}</th><td>${m.post[k].n}</td><td>${m.post[k].tir}%</td><td>${m.post[k].rise > 0 ? '+' : ''}${m.post[k].rise} mg/dL</td></tr>`).join('')}</tbody></table></div>` : '<p class="small">No logged meals line up with at least 2.5 hours of Clarity readings this week.</p>'}`
   : `<p class="small">No Dexcom Clarity readings cover this week. <a class="lnk noprint" href="#/glucose">Import a Clarity CSV</a> to add time in range after meals. Lumi never estimates glucose.</p>`}</div>
  <div class="card"><h2>Top foods</h2>${m.top.length ? `<div class="tw18"><table class="t20"><caption class="sr-only">Most-logged foods</caption><thead><tr><th scope="col">Food</th><th scope="col">Times</th><th scope="col">Carbs each</th><th scope="col">Sugar each</th></tr></thead><tbody>${m.top.map(f => `<tr><th scope="row">${esc(f.name)}${f.brand ? `<div class="small">${esc(f.brand)}</div>` : ''}</th><td>${f.n}</td><td>${Math.round(f.carbs)} g</td><td>${f.sugars == null ? '—' : Math.round(f.sugars) + ' g'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small">Nothing logged this week.</p>'}</div>
  <div class="card"><h2>Patterns</h2>${m.patterns.length ? `<ul class="pt20">${m.patterns.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '<p class="small">Not enough data for patterns yet.</p>'}<p class="small"><b>These are patterns, not medical advice.</b> Insulin, activity, illness, stress and earlier meals all affect glucose. Discuss changes with your care team.</p></div>
  <p class="foot">Food values come from product labels and food databases and may contain errors. Glucose values are only from the Dexcom Clarity export imported on this device. Lumi does not give dosing advice.</p></section>`;
  const fname = `lumi-weekly-${dayKey(m.W.days[0])}${m.sample ? '-SAMPLE' : ''}.pdf`;
  $('#wkPrint').onclick = () => window.print();
  $('#wkPdf').onclick = () => { const b = pdf20(m); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('PDF downloaded'); };
  $('#wkShare').onclick = async () => { const b = pdf20(m); const f = new File([b], fname, { type: 'application/pdf' }); const txt = weeklyText20(m);
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Lumi weekly summary', text: 'Weekly summary (patterns, not medical advice)' }); return; }
      if (navigator.share) { await navigator.share({ title: 'Lumi weekly summary', text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(txt); toast('Sharing isn\'t available here. Summary copied; use Download PDF to send the file.'); } catch { toast('Sharing isn\'t available here. Use Download PDF.'); } };
}
/* minimal PDF writer (Helvetica, text, filled boxes): no library, works offline */
function pdf20(m) {
  const A = s => String(s).replace(/[–—]/g, '-').replace(/[·•]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/×/g, 'x').replace(/[^\x20-\x7e]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const pages = []; let c = [], y = 0; const W = 612, H = 792, X = 48;
  const np = () => { c = []; pages.push(c); y = H - 54; }; np();
  const need = h => { if (y - h < 54) np(); };
  const txt = (x, yy, s, sz = 10, b = false, col = '0 0 0') => c.push(`BT ${col} rg /${b ? 'F2' : 'F1'} ${sz} Tf ${x} ${yy} Td (${A(s)}) Tj ET`);
  const box = (x, yy, w, h, col) => c.push(`${col} rg ${x} ${yy} ${w} ${h} re f`);
  const wrap = (s, sz, w) => { const words = A(s).split(' '), out = []; let l = ''; const cw = sz * 0.5; for (const wd of words) { if ((l + ' ' + wd).length * cw > w && l) { out.push(l); l = wd; } else l = l ? l + ' ' + wd : wd; } if (l) out.push(l); return out.map(x => x.replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')')); };
  const para = (s, sz = 10, b = false, col) => { for (const l of wrap(s, sz, W - 2 * X)) { need(sz + 4); txt(X, y, l, sz, b, col); y -= sz + 4; } };
  const h2 = s => { need(40); y -= 10; txt(X, y, s, 13, true, '0.23 0.15 0.6'); y -= 6; c.push(`0.8 0.8 0.9 RG 0.5 w ${X} ${y} m ${W - X} ${y} l S`); y -= 14; };
  const row = (cells, xs, b = false) => { need(15); cells.forEach((s, i) => txt(xs[i], y, String(s).slice(0, 52), 9.5, b)); y -= 14; };
  txt(X, y, 'Weekly summary for my care team', 11, false, '0.35 0.33 0.47'); y -= 22; txt(X, y, m.range, 20, true); y -= 18;
  para(m.sample ? 'Sample layout' : `${m.days.filter(d => d.n).length} of 7 days logged - ${m.entries} food entr${m.entries === 1 ? 'y' : 'ies'}${m.glu ? ' - Dexcom Clarity readings imported by me' : ' - no Clarity glucose data for this week'} - generated ${new Date().toLocaleString()} by Lumi`, 9, false, '0.35 0.33 0.47');
  if (m.sample) { need(34); box(X, y - 20, W - 2 * X, 28, '1 0.92 0.8'); txt(X + 8, y - 10, 'SAMPLE DATA - made-up numbers to show the layout. Not a real food log or glucose.', 10, true, '0.55 0.25 0'); y -= 36; }
  need(30); box(X, y - 18, W - 2 * X, 26, '0.93 0.92 1'); txt(X + 8, y - 9, 'Patterns, not medical advice. Self-logged food and my own CGM export. No insulin doses.', 10, true, '0.23 0.15 0.6'); y -= 34;
  h2('Carbs and sugar per day'); const mx = Math.max(1, ...m.days.map(d => d.carbs)); need(130); const by = y - 100, bw = (W - 2 * X) / 7;
  m.days.forEach((d, i) => { const x = X + i * bw + 10, hc = d.carbs / mx * 90, hs = d.sugars / mx * 90; box(x, by, bw / 2 - 12, hc, '0.36 0.25 0.85'); box(x + bw / 2 - 10, by, bw / 2 - 12, hs, '0.04 0.54 0.49');
    txt(x, by - 12, d.d.toLocaleDateString('en-US', { weekday: 'short' }), 8.5); if (d.n) txt(x, by + hc + 3, Math.round(d.carbs) + 'g', 7.5); });
  y = by - 28; box(X, y + 2, 8, 8, '0.36 0.25 0.85'); txt(X + 12, y + 3, 'Carbs', 8.5); box(X + 60, y + 2, 8, 8, '0.04 0.54 0.49'); txt(X + 72, y + 3, 'Sugar', 8.5); y -= 18;
  const xs = [X, X + 170, X + 260, X + 350]; row(['Day', 'Carbs', 'Sugar', 'Entries'], xs, true); m.days.forEach(d => row([d.d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), d.n ? Math.round(d.carbs) + ' g' : 'not logged', d.n ? Math.round(d.sugars) + ' g' : '', d.n || ''], xs));
  h2('Meal timing'); row(['Meal', 'Usual time', 'Earliest - latest', 'Days'], xs, true);
  ['breakfast', 'lunch', 'dinner', 'snack'].forEach(k => { const v = m.days.map(d => d.meals[k]).filter(x => x != null); if (!v.length) return; row([MEAL_L[k], hm20(v.reduce((a, b) => a + b, 0) / v.length), hm20(Math.min(...v)) + ' - ' + hm20(Math.max(...v)), v.length], xs); });
  h2('Glucose after meals'); if (m.glu) { if (m.tir) para(`Whole week: ${m.tir.in}% in range 70-180 mg/dL, ${m.tir.lo}% below 70, ${m.tir.hi}% above 180 (${m.tir.n} readings, average ${m.tir.mean} mg/dL).`);
    const ks = ['breakfast', 'lunch', 'dinner', 'snack'].filter(k => m.post[k]); if (ks.length) { row(['Meal', 'Meals w/ readings', 'TIR 3 h after', 'Avg rise'], xs, true); ks.forEach(k => row([MEAL_L[k], m.post[k].n, m.post[k].tir + '%', (m.post[k].rise > 0 ? '+' : '') + m.post[k].rise + ' mg/dL'], xs)); } else para('No logged meals line up with at least 2.5 hours of Clarity readings this week.', 9.5); }
  else para('No Dexcom Clarity readings cover this week. Lumi never estimates glucose.', 9.5);
  h2('Top foods'); if (m.top.length) { const x2 = [X, X + 290, X + 340, X + 420]; row(['Food', 'Times', 'Carbs each', 'Sugar each'], x2, true); m.top.forEach(f => row([f.name, f.n, Math.round(f.carbs) + ' g', f.sugars == null ? '-' : Math.round(f.sugars) + ' g'], x2)); } else para('Nothing logged this week.', 9.5);
  h2('Patterns'); (m.patterns.length ? m.patterns : ['Not enough data for patterns yet.']).forEach(p => para('- ' + p, 9.5));
  y -= 6; para('These are patterns, not medical advice. Insulin, activity, illness, stress and earlier meals all affect glucose. Food values come from labels and databases and may contain errors; glucose values come only from the Dexcom Clarity export imported on this device.', 8.5, false, '0.35 0.33 0.47');
  pages.forEach((p, i) => { p.push(`BT 0.45 0.45 0.55 rg /F1 8 Tf ${X} 30 Td (${A(`Lumi weekly summary ${m.range}${m.sample ? ' - SAMPLE DATA' : ''} - page ${i + 1} of ${pages.length}`)}) Tj ET`); });
  const objs = []; const add = s => { objs.push(s); return objs.length; };
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pagesId = objs.length + 1 + pages.length * 2; const kids = [];
  pages.forEach(p => { const s = p.join('\n'); const cid = add(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`); kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cid} 0 R >>`)); });
  add(`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`); const cat = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const info = add(`<< /Title (${A('Lumi weekly summary ' + m.range + (m.sample ? ' SAMPLE' : ''))}) /Producer (Lumi) >>`);
  let out = '%PDF-1.4\n'; const off = []; objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xr = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xr}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}
self.pdf20 = pdf20; self.weeklyModel20 = weeklyModel20; self.smartSwaps20 = smartSwaps20;
/* entry points to the weekly report: report page, Today, glucose page */
(function () { const add = () => { const h = location.hash;
  if (/^#\/report/.test(h)) { const a = app.querySelector('.tb12 .actions'); if (a && !a.querySelector('.wk20l')) a.insertAdjacentHTML('afterbegin', '<a class="btn wk20l" href="#/weekly">Weekly report for my endo</a>'); }
  if (/^#\/(today|insights)/.test(h)) { const a = [...app.querySelectorAll('.actions')].pop(); if (a && !a.querySelector('.wk20l')) a.insertAdjacentHTML('beforeend', '<a class="btn wk20l" href="#/weekly">Weekly report</a>'); }
  if (/^#\/patterns/.test(h)) { const s = app.querySelector('section'); if (s && !s.querySelector('.wk20l')) s.insertAdjacentHTML('beforeend', '<p class="noprint"><a class="btn wk20l" href="#/weekly">Weekly report for my endo</a></p>'); } };
  let q = 0; const mo = new MutationObserver(() => { if (!q) q = setTimeout(() => { q = 0; try { add(); } catch {} }, 100); }); const a = document.getElementById('app'); if (a) mo.observe(a, { childList: true }); })();

/* ---------- 5. routes ---------- */
if (typeof tab19 === 'function') { const t0 = tab19; tab19 = function (view, arg) { if (view === 'bowl') return 'browse'; if (view === 'weekly') return 'today'; return t0.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh20 = viewHome; viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i), arg = i < 0 ? '' : decodeURIComponent(h.slice(i + 1));
  if (v === 'bowl') { app.className = (app.className || '').replace(/\b(log11|logw11|rp12)\b/g, '').trim(); return arg ? viewBowl20(arg) : viewBowlHub20(); }
  if (v === 'weekly') { app.className = (app.className || '').replace(/\b(log11|logw11|rp12)\b/g, '').trim(); return viewWeekly20(arg); }
  return vh20.apply(this, arguments); }; }
if (/^#\/(bowl|weekly)/.test(location.hash)) route();
