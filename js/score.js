/* Lumi scoring — shared by the browser app and the Node index builder. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.LumiScore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const SYRUPS = /(glucose[- ]?fructose|fructose[- ]?glucose|high[- ]fructose|corn syrup|glucose syrup|rice syrup|malt syrup|maltodextrin|dextrose|invert (cane )?sugar|golden syrup|agave|isoglucose|maltose|tapioca syrup|cane syrup|honey|molasses|caramel syrup|fruit juice concentrate)/gi;
const SUGAR_WORDS = /\b(sugar|cane sugar|brown sugar|sucrose|evaporated cane juice|azucar|sucre)\b/i;
const STARCH = /(modified (corn |food |potato |tapioca )?starch|corn ?starch|potato starch|potato flakes|dehydrated potato|tapioca starch|rice flour|white rice|enriched (wheat )?flour|enriched corn|unbleached (enriched )?(wheat )?flour|bleached flour|degermed|corn flour|cornmeal)/gi;
const HYDRO = /hydrogenated/i;
const ADDITIVES = { e150c:'Ammonia caramel', e150d:'Sulphite ammonia caramel', e171:'Titanium dioxide', e250:'Sodium nitrite', e251:'Sodium nitrate', e252:'Potassium nitrate', e249:'Potassium nitrite', e102:'Tartrazine', e110:'Sunset yellow', e124:'Ponceau 4R', e129:'Allura red', e122:'Azorubine', e104:'Quinoline yellow', e133:'Brilliant blue', e951:'Aspartame', e950:'Acesulfame K', e955:'Sucralose', e954:'Saccharin', e320:'BHA', e321:'BHT', e319:'TBHQ', e433:'Polysorbate 80', e466:'Carboxymethylcellulose', e407:'Carrageenan', e338:'Phosphoric acid', e211:'Sodium benzoate', e220:'Sulphur dioxide', e1442:'Hydroxypropyl distarch phosphate', e965:'Maltitol' };
const LIQUID = /(beverage|drink|soda|juice|nectar|smoothie|milk(?!.*chocolate)|tea|coffee|water)/i;
const r1 = v => v == null ? null : Math.round(v * 10) / 10;
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;

/* Normalized product: {id, code, name, brand, qty, img, servQ, serv, nova, additives:[e...], ing, cat, cats, naLabel, liquid, src, n:{carbs,sugars,added,fiber,protein,fat,sat,trans,sodiumMg,kcal,polyols}} */
/* Data sanity: never treat missing/implausible carbs as zero. Returns {ok, issues, dropFiber}. */
const DRY = /breakfast-cereals|breakfast cereals|granola|muesli|crisps|chips|crackers|biscuits|cookies|pretzel|puff/i;
const CARBY = /cereal|bread|biscuit|cookie|cracker|crisps|chips|pasta|noodle|\brice\b|cake|cand(y|ies)|granola|muesli|\bbars?\b|pretzel|tortilla|flour|oat|puff/i;
function quality(p) {
  const n = p.n || {}, issues = []; let dropFiber = false;
  const c = n.carbs, f = n.fiber, su = n.sugars, pr = n.protein, fa = n.fat, k = n.kcal;
  if (c == null) issues.push('carbs unknown');
  if (c != null && su != null && su > c + 1) issues.push('sugars exceed carbs');
  if (!(p.meta && p.meta.perItem) && c != null && (c + (pr || 0) + (fa || 0)) > 105) issues.push('macros exceed 100 g');
  if (c != null && f != null && c > 5 && f > c * 0.6) { dropFiber = true; }
  if (c != null && k != null && k > 0 && pr != null && fa != null) {
    const est = 4 * c + 4 * pr + 9 * fa; // fiber/polyols/alcohol make this a loose check
    if (Math.abs(est - k) > Math.max(70, 0.4 * k)) issues.push('energy doesn’t match macros');
  }
  if (c === 0 && (su || 0) > 0.5) issues.push('0 carbs but has sugar');
  if (c != null && c > 2 && k === 0) issues.push('0 calories but has carbs');
  if (c != null && f != null && p.naLabel && f > c + 1) issues.push('fiber exceeds total carbs');
  const carby = p.carby != null ? p.carby : CARBY.test((p.cats || '') + ' ' + (p.cat || ''));
  if (c != null && c < 3 && carby && !/keto|low.?carb|zero.?carb/i.test(p.name || '')) issues.push('carbs implausibly low for category');
  if (c === 0 && k == null) issues.push('zero carbs unverified (no energy value)');
  const dry = (p.dry != null ? p.dry : DRY.test((p.cats || '') + ' ' + (p.cat || ''))) && !p.liquid && !/ready.to.eat|overnight|\bcups?\b|pouch|cooked|prepared|soup/i.test(p.name || '');
  if (dry && k != null && k < 250) issues.push('values look per serving, not per 100 g (too few calories for a dry food)');
  if (dry && k == null && c != null && c < 20 && !/keto|protein|grain.?free|nut granola|low.?carb/i.test(p.name || '')) issues.push('carbs implausibly low for a dry food');
  return { ok: issues.length === 0, issues, dropFiber };
}
function netCarbs(p) {
  const n = p.n; if (n.carbs == null) return { net: null, note: '' };
  if (quality(p).dropFiber) { return { net: n.carbs, note: 'Fiber value implausible (> 60% of carbs) — ignored; net = total carbs', fiberDropped: true }; }
  let net = n.carbs, note;
  if (p.naLabel && n.fiber != null) { net = Math.max(0, n.carbs - n.fiber); note = 'US label: net = total carbs − fiber'; }
  else if (p.naLabel) note = 'US label, fiber unknown: net = total carbs';
  else note = 'EU-style label: carbohydrate already excludes fiber';
  if (n.polyols > 0) { net = Math.max(0, net - n.polyols * (/maltitol|e965/i.test(p.ing || '') ? 0.5 : 1)); note += /maltitol|e965/i.test(p.ing || '') ? '; − ½ polyols (maltitol)' : '; − polyols'; }
  return { net, note };
}

function score(p) {
  const n = p.n || {}, items = [];
  const { net, note, fiberDropped } = netCarbs(p);
  const base = { net, netNote: note, perServ: null, servQ: p.servQ || null };
  if (p.servQ) base.perServ = { net: net == null ? null : net * p.servQ / 100 };
  const q = quality(p); base.quality = q;
  if (net == null) return Object.assign(base, { score: null, band: 'na', label: 'Carbs unknown', items, missing: true });
  if (!q.ok) return Object.assign(base, { score: null, band: 'na', label: 'Data inconsistent', items, missing: true, bad: true });
  const ing = (p.ing || '').toLowerCase();
  let hidden = 0; // v6.3: small terms still count toward the total (so near-identical items don't all tie at 100); they're just not listed
  const add = (key, label, pts, detail) => { if (Math.abs(pts) >= 0.5) items.push({ key, label, pts: Math.round(pts * 10) / 10, detail }); else hidden += pts; };
  const nc = net != null ? net : n.sugars;
  const liquid = !!p.liquid;
  // --- glycemic core
  add('net100', 'Net carbs per 100' + (liquid ? 'ml' : 'g'), -Math.min(30, nc * 0.6), r1(nc) + ' g');
  const sq = p.servQ || (liquid ? 240 : 50);
  const netServ = nc * sq / 100;
  add('netServ', p.servQ ? 'Net carbs per serving' : `Net carbs per assumed ${sq}${liquid ? 'ml' : 'g'} serving`, -Math.min(liquid ? 30 : 25, netServ * (liquid ? 0.9 : 0.6)), r1(netServ) + ' g');
  const dairy = /yog|milk|kefir|skyr|cheese|dairy|cream|lait/i.test((p.cats || '') + ' ' + (p.cat || '') + ' ' + (p.name || ''));
  const natural = n.added === 0 && n.sugars > 0;
  if (n.sugars != null) add('sugar', natural ? (dairy ? 'Total sugars (natural sugar, lactose)' : 'Total sugars (natural, none added)') : 'Total sugars', -Math.min(15, n.sugars * 0.4), r1(n.sugars) + ' g/100');
  const syr = [...new Set((ing.match(SYRUPS) || []))];
  const sugarIng = SUGAR_WORDS.test(ing) || syr.length > 0;
  if (n.added != null) { if (n.added === 0) items.push({ key: 'added', label: 'Added sugars', pts: 0, detail: '0 g/100 (declared)' }); else add('added', 'Added sugars', -Math.min(12, n.added * 0.5), r1(n.added) + ' g/100'); }
  else if (sugarIng && n.sugars) add('added', 'Added sugar (in ingredients; qty undeclared)', -Math.min(8, n.sugars * 0.4), 'estimated');
  if (liquid && (n.sugars || 0) > 2.5) add('liquid', 'Liquid sugar — rapid absorption', -Math.min(30, n.sugars * 3), r1(n.sugars) + ' g/100ml');
  if (liquid && n.sugars != null && n.sugars * sq / 100 >= 15) add('liquidDose', '≥15 g sugar per drink serving', -10, r1(n.sugars * sq / 100) + ' g');
  // sugar share of carbs: high fraction = faster spike
  if (!liquid && nc > 10 && n.sugars != null && n.sugars / nc > 0.5) add('sugarShare', 'Mostly sugar (>50% of net carbs)', -5, Math.round(n.sugars / nc * 100) + '%');
  let gi = 0; const hits = [];
  if (syr.length) { gi += Math.min(12, syr.length * 6); hits.push(...syr); }
  const first = ing.split(/[,(.;]/)[0] || '';
  if (SUGAR_WORDS.test(first) || new RegExp(SYRUPS.source, 'i').test(first)) { gi += 5; hits.push('sugar/syrup first'); }
  const st = [...new Set(ing.match(STARCH) || [])];
  if (st.length) { gi += Math.min(8, st.length * 4); hits.push(...st); }
  if (gi) add('gi', 'Glycemic proxies (syrups, refined starch)', -Math.min(18, gi), hits.slice(0, 4).join(', '));
  // --- buffers
  if (n.fiber != null && !fiberDropped) {
    add('fiber', 'Fiber', Math.min(10, n.fiber), r1(n.fiber) + ' g/100');
    if (nc > 5 && n.fiber / (nc + n.fiber) >= 0.2) add('fiberRatio', 'High fiber relative to carbs', 3, '≥20%');
  }
  // v6.3: protein only buffers carbs, so its bonus is capped at half the carb penalty and can't outweigh a lower-carb/lower-sugar profile
  if (n.protein != null) { const carbPen = Math.abs(items.filter(i => i.key === 'net100' || i.key === 'netServ').reduce((a, i) => a + i.pts, 0)); const cap = Math.min(6, carbPen / 2); const raw = Math.min(6, n.protein * 0.3); add('protein', raw > cap ? 'Protein (capped at half the carb penalty)' : 'Protein', Math.min(raw, cap), r1(n.protein) + ' g/100'); }
  // --- secondary
  if (n.sat != null) add('sat', 'Saturated fat', -Math.min(8, n.sat * 0.8), r1(n.sat) + ' g/100');
  if ((n.trans || 0) > 0.05) add('trans', 'Trans fat', -Math.min(8, n.trans * 8), r1(n.trans) + ' g/100');
  else if (HYDRO.test(ing) && !/fully hydrogenated/.test(ing)) add('trans', 'Partially hydrogenated oil', -6, 'trans-fat source');
  if (n.sodiumMg != null) add('sodium', 'Sodium', -Math.min(8, n.sodiumMg / 100), Math.round(n.sodiumMg) + ' mg/100');
  if (p.nova === 4) add('nova', 'Ultra-processed (NOVA 4)', -4, 'processing is weighed fully in the Health rating'); else if (p.nova === 3) add('nova', 'Processed (NOVA 3)', -2, '');
  const adds = (p.additives || []).filter((t, i, s) => ADDITIVES[t] && s.indexOf(t) === i);
  if (adds.length) add('additives', 'Additives of concern', -Math.min(8, adds.length * 2), adds.map(t => t.toUpperCase() + ' ' + ADDITIVES[t]).join(', '));
  if (Math.abs(hidden) >= 0.05) items.push({ key: 'small', label: 'Small amounts (sodium, sat fat, sugar…) combined', pts: Math.round(hidden * 10) / 10, detail: 'each under 0.5' });
  const raw = 100 + items.reduce((s, i) => s + i.pts, 0);
  const sc = Math.max(0, Math.min(100, Math.round(raw)));
  items.sort((a, b) => a.pts - b.pts);
  const missing = [['fiber', 'fiber'], ['sugars', 'sugars'], ['sat', 'sat fat'], ['sodiumMg', 'sodium'], ['protein', 'protein']].filter(([k]) => n[k] == null).map(x => x[1]);
  return Object.assign(base, { score: sc, band: band(sc), label: label(sc), items, missingFields: missing, assumedServing: !p.servQ, netServ });
}
/* v6.3 "filler": basics with ~no calories or carbs (water, plain tea/coffee, salt, spices, extracts, zero-cal sweeteners, gum).
   They still get a score, but they're kept out of "best of" rankings (home, stores, aisles, swaps, better options). */
const FILLER = /\b(water|seltzer|club soda|ice|salt|pepper(corns)?|spices?|seasoning|herbs?|oregano|basil|paprika|cumin|cinnamon|garlic powder|onion powder|chili powder|turmeric|extract|vinegar|baking (soda|powder)|cream of tartar|yeast|gelatin|sweetener|stevia|sucralose|monk fruit|gum|mints?|tea|coffee|espresso|bouillon|broth|stock|hot sauce|mustard|food colou?ring|flavou?r drops|water enhancer|liquid enhancer)\b/i;
/* v6.3.4: cooking ingredients (oils, sprays, flours/meals, dried herbs) are fillers too */
const INGRED = /\b(oils?|cooking spray|oil spray|olive oil|avocado oil|coconut oil|ghee|shortening|lard|flours?|almond meal|flax ?seed meal|flaxseed|cornmeal|corn meal|masa|semolina|breadcrumbs|panko|starch|xanthan|psyllium|parsley flakes|dried (parsley|basil|oregano|thyme|rosemary|dill|chives|cilantro)|(parsley|basil|oregano|thyme|rosemary|dill|chives|cilantro|bay) (flakes|leaves)|herbes|italian seasoning|curry powder|nutritional yeast|lemon juice|lime juice|(flavou?red|coffee|caramel|vanilla|hazelnut) syrup)\b/i;
function isFiller(p) {
  const n = p.n || {}; const k = n.kcal, c = n.carbs, nm = String(p.name || '');
  if (INGRED.test(nm) && !/\b(chips|crackers?|bars?|cookies?|bread|tortillas?|pasta|cereal|popcorn|tuna|sardines|fish|in oil|packed in|fried|dressing|mayo|cake|muffins?|pancake|waffle|pizza|snacks?|pretzels?|nuggets?|tenders|breaded)\b/i.test(nm)) return true;
  if (!FILLER.test(nm)) return false;
  if (/\b(latte|mocha|frappuccino|chai latte|milk tea|bubble tea|sweet tea|creamer|cake|cookie|bar|chips|nuts?|candy|chocolate|jerky|cracker|pretzel)\b/i.test(nm)) return false;
  return (k == null || k <= 25) && (c == null || c <= 5) || /\b(salt|spices?|seasoning|pepper(corns)?|oregano|basil|paprika|cumin|cinnamon|garlic powder|onion powder|chili powder|turmeric|extract|baking (soda|powder)|yeast|gelatin|food colou?ring)\b/i.test(nm) && (p.servQ == null || p.servQ <= 10);
}
const band = s => s == null ? 'na' : s >= 75 ? 'ex' : s >= 50 ? 'gd' : s >= 25 ? 'pr' : 'bd';
const label = s => ({ ex: 'Excellent', gd: 'Good', pr: 'Poor', bd: 'Bad', na: 'Not enough data' })[band(s)];

/* --- normalizers --- */
const addTags = s => (Array.isArray(s) ? s : String(s || '').split(',')).map(t => t.trim().replace(/^en:/, '').split('-')[0].toLowerCase()).filter(Boolean);
const isNA = c => { const a = Array.isArray(c) ? c : String(c || '').split(','); return a.length > 0 && a.some(x => /united-states/.test(x)) && a.every(x => /united-states|canada|mexico|puerto/.test(x) || !x); };
const LIQ_TAG = /^(beverages|.*-beverages|drinks|.*-drinks|sodas|.*-sodas|.*juices?|.*nectars?|waters|.*-waters|milks|.*-milks|.*smoothies|teas|iced-teas|coffees|.*-coffees|colas|.*-colas|lemonades|energy-drinks|soft-drinks)$/;
function isLiquid(cats, serv, name) {
  const tags = String(cats || '').split(',').map(t => t.trim().replace(/^\w\w:/, '').toLowerCase()).filter(t => t && !/foods-and-beverages|beverage-preparations|powder|mixes/.test(t));
  const byTag = tags.some(t => LIQ_TAG.test(t)) || (tags.length && !String(cats).includes(':') && LIQUID.test(cats) && !/foods and beverages/i.test(cats));
  const byServ = /\b\d+(\.\d+)?\s?(ml|fl\.? ?oz)\b/i.test(serv || '');
  return (byTag || byServ) && !/(powder|mix\b|bar\b|cereal|cookie|creamer|chips)/i.test(name || '');
}
function fromOFF(p) {
  const m = p.nutriments || {}; const g = k => num(m[k + '_100g']);
  let sod = g('sodium'); if (sod == null && g('salt') != null) sod = g('salt') / 2.5;
  const cats = (p.categories_tags || []).join(',');
  return { id: p.code, code: p.code, src: 'off', name: p.product_name || p.product_name_en || p.generic_name || 'Unnamed product', brand: String(p.brands || '').split(',')[0], qty: p.quantity || '',
    img: p.image_front_url || p.image_url || p.image_front_small_url || p.image_small_url || '', servQ: num(p.serving_quantity) || null, serv: p.serving_size || '', nova: num(p.nova_group),
    additives: addTags(p.additives_tags), ing: p.ingredients_text_en || p.ingredients_text || '', cat: (p.categories_tags || []).slice(-1)[0]?.replace(/^\w\w:/, '').replace(/-/g, ' ') || '', cats,
    alg: { allergens: p.allergens_tags || [], traces: p.traces_tags || [], analysis: p.ingredients_analysis_tags || [], labels: p.labels_tags || [] }, organic: (p.labels_tags || []).some(t => /organic/.test(t)), fvl: num(m['fruits-vegetables-legumes-estimate-from-ingredients_100g']) ?? num(m['fruits-vegetables-nuts-estimate-from-ingredients_100g']), naLabel: isNA(p.countries_tags || []), liquid: isLiquid(cats, p.serving_size, p.product_name),
    n: { carbs: g('carbohydrates'), sugars: g('sugars'), added: g('added-sugars'), fiber: g('fiber'), protein: g('proteins'), fat: g('fat'), sat: g('saturated-fat'), trans: g('trans-fat'), sodiumMg: sod != null ? sod * 1000 : null, kcal: g('energy-kcal') ?? (g('energy') != null ? g('energy') / 4.184 : null), polyols: g('polyols') } };
}
// USDA FDC: nutrient numbers (search results: nutrientNumber/value; detail: nutrient.number/amount). Branded values are per 100 g/ml.
const FDC = { '205': 'carbs', '269': 'sugars', '539': 'added', '291': 'fiber', '203': 'protein', '204': 'fat', '606': 'sat', '605': 'trans', '307': 'sodiumMg', '208': 'kcal', '299': 'polyols' };
function fromUSDA(f) {
  const n = {}; for (const x of f.foodNutrients || []) { const no = String(x.nutrientNumber || (x.nutrient && x.nutrient.number) || ''); const k = FDC[no]; const v = num(x.value ?? x.amount); if (k && v != null && n[k] == null) n[k] = v; }
  if (n.sugars == null) for (const x of f.foodNutrients || []) if (/sugars, total/i.test(x.nutrientName || (x.nutrient && x.nutrient.name) || '')) n.sugars = num(x.value ?? x.amount);
  const unit = String(f.servingSizeUnit || '').toLowerCase();
  const servQ = f.servingSize && /^(g|grm|ml|mlt)$/.test(unit) ? +f.servingSize : null;
  const gtin = f.gtinUpc ? String(f.gtinUpc).replace(/\D/g, '') : '';
  const cat = f.brandedFoodCategory || f.foodCategory || (f.foodCategory && f.foodCategory.description) || '';
  const catS = typeof cat === 'string' ? cat : (cat.description || '');
  const name = titleCase(f.description || 'USDA food');
  return { id: 'fdc-' + f.fdcId, code: gtin, fdcId: f.fdcId, src: 'usda', name, brand: titleCase(f.brandName || f.brandOwner || (f.dataType !== 'Branded' ? 'USDA ' + (f.dataType || '') : '')), qty: f.packageWeight || '',
    img: '', servQ, serv: f.householdServingFullText ? `${f.householdServingFullText} (${f.servingSize}${unit === 'grm' ? 'g' : unit === 'mlt' ? 'ml' : unit})` : servQ ? servQ + unit : '', nova: null, additives: [], ing: (f.ingredients || '').toLowerCase(), cat: catS, cats: catS,
    naLabel: true, liquid: /beverage|drink|soda|juice|milk|water/i.test(catS) || unit === 'ml' || unit === 'mlt', n };
}
const titleCase = s => String(s || '').toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\b(Of|And|With|In|The|A)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());
/* compact local-index record (see tools/build.js) */
const DK = ['carbs', 'sugars', 'added', 'fiber', 'protein', 'fat', 'sat', 'trans', 'sodiumMg', 'kcal', 'polyols'];
function fromCompact(a) {
  const [code, name, brand, qty, img, servQ, serv, nova, nut, adds, ing, cat, flags, portions, meta] = a; const fl = flags || 0; const n = {}; DK.forEach((k, i) => n[k] = nut[i] == null ? null : nut[i]);
  return { id: code, code: /^\d+$/.test(code) ? code : '', src: meta ? (meta.src.includes('official') ? 'chain' : 'usda') : 'local', fdcId: /^fdc-/.test(code) ? code.slice(4) : undefined, name, brand, qty, img: img ? (img.startsWith('w:') ? 'img/w/' + img.slice(2) + '-200.webp' : img.startsWith('http') ? img : 'https://images.openfoodfacts.org/images/products/' + img) : '', servQ, serv, nova, additives: adds ? adds.split(',') : [], ing, cat, cats: cat, naLabel: !!(fl & 1), liquid: !!(fl & 2), carby: fl & 16 ? !!(fl & 4) : undefined, dry: fl & 16 ? !!(fl & 8) : undefined, portions: portions || null, meta: meta || null, hx: a[15] || null, n };
}
const imgSize = (u, n) => u ? u.replace(/\.(100|200|400|full)\.jpg$/, '.' + n + '.jpg').replace(/-(200|400)\.webp$/, '-' + n + '.webp') : '';
return { isFiller, DRY, CARBY, imgSize, score, quality, fromOFF, fromUSDA, fromCompact, band, label, netCarbs, addTags, isNA, isLiquid, DK, ADDITIVES };
});
