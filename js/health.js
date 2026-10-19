/* Lumi Health rating — a Yuka-style general rating (0-100). ~60% nutrition (Nutri-Score 2023), ~30% additives, ~10% organic.
   Shared by the browser and tools/build.js. Informational only. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.LumiHealth = f(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
// risk tiers: 0 none, 1 limited, 2 moderate, 3 high  [name, tier]
const ADD = {
  e171: ['Titanium dioxide', 3], e249: ['Potassium nitrite', 3], e250: ['Sodium nitrite', 3], e251: ['Sodium nitrate', 3], e252: ['Potassium nitrate', 3],
  e320: ['BHA', 3], e319: ['TBHQ', 3], e951: ['Aspartame', 3], e924: ['Potassium bromate', 3], e443: ['Brominated vegetable oil', 3], e127: ['Erythrosine (Red 3)', 3],
  e102: ['Tartrazine (Yellow 5)', 3], e110: ['Sunset yellow (Yellow 6)', 3], e129: ['Allura red (Red 40)', 3], e124: ['Ponceau 4R', 3], e122: ['Azorubine', 3], e104: ['Quinoline yellow', 3],
  e321: ['BHT', 2], e133: ['Brilliant blue (Blue 1)', 2], e132: ['Indigo carmine (Blue 2)', 2], e150c: ['Ammonia caramel', 2], e150d: ['Sulphite ammonia caramel', 2],
  e950: ['Acesulfame K', 2], e955: ['Sucralose', 2], e954: ['Saccharin', 2], e962: ['Aspartame-acesulfame salt', 3],
  e338: ['Phosphoric acid', 2], e339: ['Sodium phosphates', 2], e340: ['Potassium phosphates', 2], e341: ['Calcium phosphates', 2], e450: ['Diphosphates', 2], e451: ['Triphosphates', 2], e452: ['Polyphosphates', 2], e541: ['Sodium aluminium phosphate', 3],
  e407: ['Carrageenan', 2], e433: ['Polysorbate 80', 2], e466: ['Carboxymethylcellulose', 2], e211: ['Sodium benzoate', 2], e210: ['Benzoic acid', 2], e385: ['Calcium disodium EDTA', 2], e310: ['Propyl gallate', 2],
  e220: ['Sulphur dioxide', 2], e221: ['Sodium sulphite', 2], e222: ['Sodium bisulphite', 2], e223: ['Sodium metabisulphite', 2], e224: ['Potassium metabisulphite', 2], e1442: ['Hydroxypropyl distarch phosphate', 1],
  e621: ['Monosodium glutamate', 1], e627: ['Disodium guanylate', 1], e631: ['Disodium inosinate', 1], e635: ['Disodium ribonucleotides', 1], e471: ['Mono- and diglycerides', 1], e472e: ['DATEM', 1], e481: ['Sodium stearoyl lactylate', 1],
  e202: ['Potassium sorbate', 1], e200: ['Sorbic acid', 1], e282: ['Calcium propionate', 1], e965: ['Maltitol', 1], e420: ['Sorbitol', 1], e160b: ['Annatto', 1], e1422: ['Acetylated distarch adipate', 1], e1450: ['Starch sodium octenyl succinate', 1],
  e415: ['Xanthan gum', 0], e412: ['Guar gum', 0], e322: ['Lecithins', 0], e330: ['Citric acid', 0], e300: ['Ascorbic acid', 0], e306: ['Tocopherols', 0], e440: ['Pectin', 0], e500: ['Sodium bicarbonate', 0], e270: ['Lactic acid', 0], e160a: ['Carotenes', 0], e170: ['Calcium carbonate', 0], e410: ['Locust bean gum', 0], e414: ['Gum arabic', 0], e967: ['Xylitol', 0], e968: ['Erythritol', 0], e960: ['Steviol glycosides', 0]
};
const TXT = [[/titanium dioxide/, 'e171'], [/sodium nitrite/, 'e250'], [/potassium nitrite/, 'e249'], [/sodium nitrate/, 'e251'], [/\bbha\b|butylated hydroxyanisole/, 'e320'], [/\bbht\b|butylated hydroxytoluene/, 'e321'], [/tbhq|tert-?butylhydroquinone/, 'e319'],
  [/aspartame/, 'e951'], [/acesulfame/, 'e950'], [/sucralose/, 'e955'], [/saccharin/, 'e954'], [/potassium bromate|bromated flour/, 'e924'], [/brominated vegetable oil/, 'e443'],
  [/yellow #?\s?5|tartrazine/, 'e102'], [/yellow #?\s?6|sunset yellow/, 'e110'], [/red #?\s?40|allura red/, 'e129'], [/red #?\s?3\b|erythrosine/, 'e127'], [/blue #?\s?1\b/, 'e133'], [/blue #?\s?2\b/, 'e132'],
  [/caramel colou?r/, 'e150d'], [/phosphoric acid/, 'e338'], [/(di|tri|mono)?sodium (acid )?(pyro)?phosphate|sodium hexametaphosphate|sodium tripolyphosphate/, 'e339'], [/(di|tri|mono)?potassium phosphate/, 'e340'], [/(di|tri|mono)?calcium phosphate/, 'e341'],
  [/sodium aluminum phosphate|sodium aluminium phosphate/, 'e541'], [/carrageenan/, 'e407'], [/polysorbate 80/, 'e433'], [/carboxymethyl ?cellulose|cellulose gum/, 'e466'], [/sodium benzoate/, 'e211'], [/benzoic acid/, 'e210'], [/disodium edta|calcium disodium/, 'e385'], [/propyl gallate/, 'e310'],
  [/sulfur dioxide|sulphur dioxide/, 'e220'], [/sodium (bi|meta)?sulfite|sodium (bi|meta)?bisulfite/, 'e221'], [/potassium metabisulfite/, 'e224'],
  [/monosodium glutamate|\bmsg\b/, 'e621'], [/disodium guanylate/, 'e627'], [/disodium inosinate/, 'e631'], [/mono- ?(and|&) ?diglycerides/, 'e471'], [/\bdatem\b|diacetyl tartaric/, 'e472e'], [/sodium stearoyl lactylate/, 'e481'],
  [/potassium sorbate/, 'e202'], [/sorbic acid/, 'e200'], [/calcium propionate/, 'e282'], [/maltitol/, 'e965'], [/sorbitol/, 'e420'], [/annatto/, 'e160b'], [/xanthan/, 'e415'], [/guar gum/, 'e412'], [/lecithin/, 'e322'], [/citric acid/, 'e330']];
const TIER = ['No risk', 'Limited risk', 'Moderate risk', 'High risk'];
function additives(tags, ing) {
  const s = new Set((tags || []).map(t => String(t).replace(/^en:/, '').toLowerCase()).filter(t => ADD[t]));
  const i = String(ing || '').toLowerCase(); if (i) for (const [re, t] of TXT) if (re.test(i) && ![...s].some(x => x.slice(0, 4) === t.slice(0, 4))) s.add(t);
  return [...s].map(t => ({ e: t, name: ADD[t][0], tier: ADD[t][1] })).sort((a, b) => b.tier - a.tier);
}
const pts = (v, th) => { let p = 0; for (const t of th) if (v > t) p++; return p; };
const T = { en: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350], su: [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51], sat: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], salt: Array.from({ length: 20 }, (_, i) => +(0.2 * (i + 1)).toFixed(1)), pr: [2.4, 4.8, 7.2, 9.6, 12, 14, 17], fi: [3, 4.1, 5.2, 6.3, 7.4],
  ben: [30, 90, 150, 210, 240, 270, 300, 330, 360, 390], bsu: [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11], bpr: [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0], fen: [120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200], rat: [10, 16, 22, 28, 34, 40, 46, 52, 58, 64] };
const FATS = /\b(oils?|olive oil|butter(?! ?milk)|margarine|ghee|lard|shortening|nut butters?|peanut butters?|almond butter|nuts?|almonds?|peanuts?|cashews?|pecans?|walnuts?|pistachios?|hazelnuts?|macadamia|seeds?|tahini|nut and seed)\b/i;
const NOTFAT = /cookie|cake|bar\b|candy|cereal|cracker|chocolate|cup|ice cream|bread|granola|trail mix|popcorn|sandwich|salad|dressing|spread|muffin|pie|pretzel/i;
const CHEESE = /\bchees(e|es)\b|cheddar|mozzarella|parmesan|brie|feta|gouda|swiss cheese|provolone/i;
const NOTCHEESE = /cake|macaroni|mac (and|&)|pizza|burger|sandwich|cracker|puff|curls|sauce|dip|snack|chip|bread|quesadilla|biscuit|danish|omelet|fries|melt|stick|bagel|wrap|taco|burrito|soup|dog|steak|crisps|nachos|enchilada/i;
const REDMEAT = /\b(beef|pork|lamb|veal|bacon|ham|sausages?|salami|pepperoni|hot dogs?|jerky|bison|venison|chorizo)\b/i;
const FVL_G = /^(Fruits and Fruit Juices|Vegetables and Vegetable Products|Legumes and Legume Products)$/;
const SWEET = /e95[0-5]|e96[0-2]|e967|e968|e960/;
/* p: normalized product (score.js shape). opt: {organic, fvl, whole, rest, group} */
function rate(p, opt = {}) {
  let n = p.n || {}; const est0 = [];
  if (p.meta && p.meta.perItem) { // restaurant values are per item with no weight: estimate weight from macro mass (solids ~50% of food, ~20% of drinks)
    const m = (n.carbs || 0) + (n.protein || 0) + (n.fat || 0) + (n.fiber || 0) * 0; const g = Math.max(m / (p.liquid ? 0.2 : 0.5), (n.kcal || 0) / (p.liquid ? 1.2 : 4), 20);
    if (m > 0 || n.kcal) { const f = 100 / g; n = Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v == null ? v : v * f])); est0.push('item weight'); }
  }
  const out = { score: null, band: 'unknown', basis: 'full', est: est0, neg: [], pos: [], adds: [] };
  let kcal = n.kcal; const mac = [n.carbs, n.protein, n.fat];
  if (kcal == null && mac.some(v => v != null)) { kcal = (n.carbs || 0) * 4 + (n.protein || 0) * 4 + (n.fat || 0) * 9; out.est.push('energy'); }
  if (kcal == null || kcal > 950 || [n.carbs, n.sugars, n.fat, n.sat, n.protein, n.fiber].some(v => v != null && (v < 0 || v > 100))) { out.reason = kcal == null ? 'Calories and macros not reported' : kcal > 950 ? 'Over 950 kcal per 100 g, which is impossible, so the label data is wrong' : 'A nutrient is listed above 100 g per 100 g, so the label data is wrong'; return out; }
  let su = n.sugars; if (n.carbs != null && su != null && su > n.carbs + 1) { su = n.carbs; out.est.push('sugars capped at carbs'); } if (su == null) {  su = n.carbs == null ? 0 : Math.min(n.carbs, Math.max(0, n.carbs * 0.25)); out.est.push('sugars'); }
  let sat = n.sat; if (sat == null) { sat = n.fat == null ? 0 : n.fat * 0.35; out.est.push('sat fat'); }
  let salt = n.sodiumMg == null ? null : n.sodiumMg * 2.5 / 1000; if (salt == null) { salt = 0; out.est.push('salt'); }
  const fi = n.fiber ?? 0, pr = n.protein ?? 0, kj = kcal * 4.184;
  const name = (p.name || '') + ' ' + (p.cat || ''), grp = opt.group || '';
  let fvl = opt.fvl; if (fvl == null) { fvl = FVL_G.test(grp) ? 100 : 0; if (!fvl && /fruit cup|fruit bowl|apple slices|side salad|garden salad|kale crunch|veggie tray|steamed (vegetables|broccoli)|green beans|carrot sticks/i.test(p.name || '')) { fvl = 85; out.est.push('fruit/veg share'); } }
  const adds = additives(p.additives, p.ing); out.adds = adds;
  const known = !!(p.ing && String(p.ing).trim().length > 3) || (p.additives && p.additives.length > 0);
  const bev = !!p.liquid && (!grp || /juice|drink|milk|beverage|nectar|smoothie|soda|\btea\b|coffee|water|lemonade|shake|frost|chiller|latte|cola/i.test(p.name || '')) && !/yog|soup|broth|sauce|syrup|creamer|smoothie bowl/i.test(name);
  const isWater = bev && kcal < 1 && su < 0.1 && /water/i.test(name);
  const cheese = !bev && CHEESE.test(name) && !NOTCHEESE.test(p.name || '');
  const fat = !bev && !cheese && (FATS.test(p.cat || '') || FATS.test(p.name || '') && !NOTFAT.test(name) || /Fats and Oils|Nut and Seed/.test(grp)) && (n.fat ?? 0) >= 20;
  let N, P, cls, v;
  if (bev) {
    const sw = adds.some(a => SWEET.test(a.e)) ? 4 : 0;
    const a = { en: pts(kj, T.ben), su: pts(su, T.bsu), sat: pts(sat, T.sat), salt: pts(salt, T.salt), sw };
    N = a.en + a.su + a.sat + a.salt + sw; const pp = { pr: pts(pr, T.bpr), fi: pts(fi, T.fi), fv: fvl > 80 ? 6 : fvl > 60 ? 4 : fvl > 40 ? 2 : 0 }; P = pp.pr + pp.fi + pp.fv; v = 'beverage';
    const s = N - P; cls = isWater ? 'A' : s <= 2 ? 'B' : s <= 6 ? 'C' : s <= 9 ? 'D' : 'E'; out.ns = { N, P, s, a, pp };
  } else {
    const a = { en: fat ? pts(sat * 37, T.fen) : pts(kj, T.en), su: pts(su, T.su), sat: fat ? pts(n.fat ? sat / n.fat * 100 : 0, T.rat) : pts(sat, T.sat), salt: pts(salt, T.salt) };
    N = a.en + a.su + a.sat + a.salt;
    let prp = pts(pr, T.pr); if (REDMEAT.test(p.name || '')) prp = Math.min(prp, 2);
    const pp = { pr: prp, fi: pts(fi, T.fi), fv: fvl > 80 ? 5 : fvl > 60 ? 2 : fvl > 40 ? 1 : 0 };
    if (!cheese && N >= (fat ? 7 : 11)) pp.pr = 0;
    P = pp.pr + pp.fi + pp.fv; const s = N - P; v = cheese ? 'cheese' : fat ? 'fats' : 'general';
    cls = fat ? (s <= -6 ? 'A' : s <= 2 ? 'B' : s <= 10 ? 'C' : s <= 18 ? 'D' : 'E') : (s <= 0 ? 'A' : s <= 2 ? 'B' : s <= 10 ? 'C' : s <= 18 ? 'D' : 'E');
    out.ns = { N, P, s, a, pp };
  }
  out.variant = v; out.grade = cls;
  // map Nutri-Score points to 0-100 within grade bands: A 80-100, B 60-79, C 40-59, D 20-39, E 0-19
  const s = out.ns.s, R = { A: [80, 100], B: [60, 79], C: [40, 59], D: [20, 39], E: [0, 19] }[cls];
  const lim = bev ? { A: [-15, 0], B: [-15, 2], C: [3, 6], D: [7, 9], E: [10, 25] } : fat ? { A: [-20, -6], B: [-5, 2], C: [3, 10], D: [11, 18], E: [19, 40] } : { A: [-15, 0], B: [1, 2], C: [3, 10], D: [11, 18], E: [19, 40] };
  const [lo, hi] = lim[cls]; const t = hi === lo ? 0.5 : Math.max(0, Math.min(1, (hi - s) / (hi - lo)));
  const nut = isWater ? 100 : Math.round(R[0] + t * (R[1] - R[0])); out.nutrition = nut;
  const organic = !!opt.organic;
  if (!known || opt.whole) { out.basis = 'nutrition'; out.score = nut; }
  else {
    const high = adds.some(a => a.tier === 3); const asc = high ? 0 : Math.max(0, 100 - adds.reduce((x, a) => x + (a.tier === 2 ? 30 : a.tier === 1 ? 8 : 0), 0));
    out.additiveScore = asc; out.organic = organic;
    let sc = Math.round(nut * 0.6 + asc * 0.3 + (organic ? 10 : 0)); if (high) sc = Math.min(sc, 49); if (cls === 'E') sc = Math.min(sc, 24); else if (cls === 'D') sc = Math.min(sc, 49); out.score = sc;
  }
  out.band = out.score >= 75 ? 'excellent' : out.score >= 50 ? 'good' : out.score >= 25 ? 'poor' : 'bad';
  // negatives / positives (per 100 g/ml), Yuka-style
  const lvl = (x, a, b, c) => x <= a ? 0 : x <= b ? 1 : x <= c ? 2 : 3;
  const row = (k, title, val, l, desc) => (l >= 2 ? out.neg : out.pos).push({ k, title, val, l, desc });
  if (!isWater) row('kcal', 'Calories', Math.round(kcal) + ' kcal', bev ? lvl(kcal, 1, 14, 35) : lvl(kcal, 160, 360, 560), bev ? ['Low calorie', 'Low calorie', 'A bit caloric', 'Too caloric'] [lvl(kcal, 1, 14, 35)] : ['Low calorie', 'Low impact', 'A bit too caloric', 'Too caloric'][lvl(kcal, 160, 360, 560)]);
  const sl = bev ? lvl(su, 0.5, 2, 5) : lvl(su, 4.5, 9, 18); row('sug', 'Sugar', (Math.round(su * 10) / 10) + 'g', sl, ['Low sugar', 'Low impact', 'A bit too sweet', 'Too sweet'][sl]);
  const tl = lvl(sat, 1, 2, 4); row('sat', 'Saturated fat', (Math.round(sat * 10) / 10) + 'g', tl, ['Low sat. fat', 'Low impact', 'A bit too fatty', 'Too fatty'][tl]);
  const al = lvl(salt, 0.46, 0.92, 1.62); row('salt', 'Salt', (Math.round(salt * 100) / 100) + 'g', al, ['Low salt', 'Low impact', 'A bit too salty', 'Too salty'][al]);
  if (fi >= 3) row('fib', 'Fiber', (Math.round(fi * 10) / 10) + 'g', fi >= 4.7 ? 0 : 1, fi >= 4.7 ? 'Excellent amount of fiber' : 'Some fiber');
  if (pr >= 4.8) row('pro', 'Protein', (Math.round(pr * 10) / 10) + 'g', pr >= 9.6 ? 0 : 1, pr >= 9.6 ? 'Excellent amount of protein' : 'Some protein');
  if (fvl > 40) row('fvl', 'Fruits, vegetables, legumes', Math.round(fvl) + '%', fvl > 80 ? 0 : 1, fvl > 80 ? 'Excellent quantity' : 'Some');
  if (out.basis === 'full') {
    const risky = adds.filter(a => a.tier >= 1);
    if (risky.length) out.neg.push({ k: 'add', title: 'Additives', val: String(risky.length), l: Math.max(...risky.map(a => a.tier)) === 3 ? 3 : 2, desc: risky.some(a => a.tier === 3) ? 'Contains a high-risk additive' : 'Contains additives to limit', list: risky.map(a => ({ name: a.name + ' (' + a.e.toUpperCase().replace('E', 'E') + ')', risk: TIER[a.tier], tier: a.tier })) });
    else out.pos.push({ k: 'add', title: 'Additives', val: '0', l: 0, desc: adds.length ? 'Only no-risk additives' : 'No additives found' });
    if (organic) out.pos.push({ k: 'org', title: 'Organic', val: '✓', l: 0, desc: 'Certified organic' });
  }
  return out;
}
const LABEL = { excellent: 'Excellent', good: 'Good', poor: 'Poor', bad: 'Bad', unknown: '?' };
return { rate, additives, ADD, TIER, LABEL };
});
