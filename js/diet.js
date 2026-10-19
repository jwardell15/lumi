/* Lumi allergen + diet matching. Never claims an item is safe: "none found" only means none in the listed data. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.LumiDiet = f(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const AL = [
  ['gluten', 'Gluten', ['en:gluten'], /\b(wheat|barley|rye|malt|spelt|semolina|durum|farina|triticale|bulgur|couscous|seitan|graham|kamut|einkorn|emmer|breadcrumbs?|croutons?|flour tortilla|pasta|bread|noodles?|spaghetti|macaroni|crackers?|cookies?|cakes?|pastry|pizza|bagels?|muffins?|pretzels?|biscuits?|waffles?|pancakes?|breaded|batter|sandwich|bun|wrap|burrito|croissant)\b/],
  ['milk', 'Milk / lactose', ['en:milk'], /\b(milk|cream|butter|buttermilk|cheeses?|whey|casein|caseinates?|lactose|yogh?urt|ghee|curds?|lactalbumin|lactoglobulin|custard|kefir|paneer|ricotta|mozzarella|cheddar|parmesan)\b/],
  ['eggs', 'Eggs', ['en:eggs'], /\b(eggs?|egg whites?|egg yolks?|albumen|albumin|mayonnaise|mayo|meringue|ovalbumin|lysozyme)\b/],
  ['peanuts', 'Peanuts', ['en:peanuts'], /\b(peanuts?|groundnuts?|arachis|reese'?s)\b/],
  ['nuts', 'Tree nuts', ['en:nuts'], /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|filberts?|macadamias?|brazil nuts?|pine nuts?|chestnuts?|praline|marzipan|nutella|gianduja)\b/],
  ['soy', 'Soy', ['en:soybeans'], /\b(soy|soya|soybeans?|edamame|tofu|tempeh|miso|shoyu|tamari)\b/],
  ['fish', 'Fish', ['en:fish'], /\b(fish|anchov(y|ies)|salmon|tuna|cod|pollock|tilapia|sardines?|haddock|halibut|trout|mackerel|herring|catfish|swordfish|mahi|worcestershire)\b/],
  ['shellfish', 'Shellfish', ['en:crustaceans', 'en:molluscs'], /\b(shrimps?|prawns?|crabs?|lobsters?|crayfish|crawfish|clams?|oysters?|mussels?|scallops?|squid|calamari|octopus|krill|langoustines?)\b/],
  ['sesame', 'Sesame', ['en:sesame-seeds'], /\b(sesame|tahini|benne)\b/]
];
const DIETS = [['vegan', 'Vegan'], ['vegetarian', 'Vegetarian'], ['palm', 'Palm-oil-free'], ['nosugar', 'No added sugar'], ['keto', 'Keto-ish low carb'], ['organic', 'Organic only']];
const MEAT = /\b(beef|pork|chicken|turkey|lamb|veal|bacon|ham|sausages?|pepperoni|salami|prosciutto|chorizo|gelatin|gelatine|lard|tallow|suet|anchov(y|ies)|fish|tuna|salmon|shrimp|crab|lobster|clam|oyster|meat|broth of (beef|chicken)|chicken broth|beef broth|bone broth|collagen|carmine|cochineal|rennet|isinglass|duck|venison|bison|jerky|nuggets?|wings?|burger patty|hot dog)\b/;
const ANIMAL = /\b(milk|cream|butter|cheese|whey|casein|lactose|yogh?urt|ghee|eggs?|egg whites?|honey|beeswax|shellac|lanolin|mayonnaise|albumin)\b/;
const PALM = /\bpalm\b(?!\s*(sugar|hearts?|dates?|wine))|palmolein/;
const SUG = /\b(sugar|cane sugar|brown sugar|sucrose|dextrose|glucose|fructose|corn syrup|high fructose|rice syrup|malt syrup|maltodextrin|agave|honey|molasses|invert sugar|cane juice|evaporated cane|fruit juice concentrate|caramel|treacle|maple syrup|coconut sugar|date syrup|tapioca syrup)\b/;
const NOSUGFREE = /\b(no|without|free of) (added )?sugar|sugar[- ]free|unsweetened\b/;
function clean(t) {
  return String(t || '').toLowerCase()
    .replace(/(gluten|dairy|milk|egg|nut|peanut|soy|lactose)[- ]free/g, ' ')
    .replace(/\b(coconut|almond|oat|soy|rice|cashew|hemp|pea|macadamia) (milk|cream|creamer|beverage|yogh?urt|cheese)/g, ' plant-$2 ')
    .replace(/\b(cocoa|cacao|peanut|nut|almond|cashew|sunflower|apple|shea|seed|sesame|soy) butter/g, ' $1-butter ')
    .replace(/cream of tartar|butternut|buckwheat|water chestnuts?|cream soda|nutmeg|coconut/g, ' ');
}
const SPLIT = /\b(may contain|may also contain|made (in|on) (a )?(facility|shared equipment|equipment)|produced in a facility|processed in a facility|manufactured (in|on) (a )?(facility|shared)|traces? of)\b/;
/* r: {ing, name, allergens (tags str|arr), traces, analysis, labels, organic, whole} -> {am, tm, df} */
function analyze(r) {
  const tagStr = x => Array.isArray(x) ? x.join(',') : String(x || '');
  const at = tagStr(r.allergens), tt = tagStr(r.traces), an = tagStr(r.analysis), lb = tagStr(r.labels);
  const raw = String(r.ing || ''), ingKnown = raw.trim().length > 3; const nameT = clean(r.name);
  const cut = raw.toLowerCase().search(SPLIT); const mainT = clean(cut >= 0 ? raw.slice(0, cut) : raw), trT = cut >= 0 ? clean(raw.slice(cut)) : '';
  let am = 0, tm = 0;
  const gf = /gluten[- ]free/i.test(r.name || '') || /en:no-gluten|en:gluten-free/.test(lb);
  AL.forEach(([k, , tags, re], i) => {
    if (k === 'gluten' && gf) { if (tags.some(t => at.includes(t))) am |= 1 << i; return; }
    if (tags.some(t => at.includes(t)) || re.test(mainT) || ((r.whole || !ingKnown) && re.test(nameT))) am |= 1 << i;
    else if (tags.some(t => tt.includes(t)) || re.test(trT)) tm |= 1 << i;
  });
  let df = 0; const known = ingKnown || !!r.whole; if (known) df |= 1;
  const txt = mainT + ' ' + (ingKnown && !r.whole ? '' : nameT);
  if (/en:non-vegan/.test(an) || MEAT.test(txt) || ANIMAL.test(txt)) df |= 2;
  if (am & (1 << 6 | 1 << 7)) df |= 2 | 4;
  if (/en:non-vegetarian/.test(an) || MEAT.test(txt)) df |= 4;
  if (/en:palm-oil(?!-free)/.test(an) && !/en:palm-oil-free/.test(an) || PALM.test(mainT)) df |= 8;
  if (ingKnown && SUG.test(mainT) && !NOSUGFREE.test(clean(r.name))) df |= 16;
  if (r.organic || /en:organic|usda-organic/.test(lb)) df |= 32;
  if (/en:vegan(?!-status)/.test(an) && !/non-vegan|maybe-vegan/.test(an)) df |= 64;
  if (/en:vegetarian/.test(an) && !/non-vegetarian|maybe-vegetarian/.test(an)) df |= 128;
  if (/en:palm-oil-free/.test(an)) df |= 256;
  if (am & 2 || am & 4) df |= 2; // milk/eggs: not vegan
  return { am, tm, df };
}
/* status for one allergen key */
function alStatus(m, k) { const i = AL.findIndex(a => a[0] === k); if (m.am >> i & 1) return 'contains'; if (m.tm >> i & 1) return 'traces'; return m.df & 1 ? 'none' : 'unknown'; }
function dietStatus(m, k, net) {
  const known = m.df & 1;
  if (k === 'vegan') return m.df & 2 ? 'conflict' : known ? 'none' : 'unknown';
  if (k === 'vegetarian') return m.df & 4 ? 'conflict' : known ? 'none' : 'unknown';
  if (k === 'palm') return m.df & 8 ? 'conflict' : known ? 'none' : 'unknown';
  if (k === 'nosugar') return m.df & 16 ? 'conflict' : known ? 'none' : 'unknown';
  if (k === 'keto') return net == null ? 'unknown' : net > 5 ? 'conflict' : 'none';
  if (k === 'organic') return m.df & 32 ? 'none' : 'conflict';
  return 'unknown';
}
/* prefs: {al:[keys], diets:[keys]} -> {level: 'bad'|'warn'|'unk'|'ok'|null, items:[{k,label,st,text}]} */
function check(m, prefs, net) {
  const items = [];
  for (const k of prefs.al || []) { const a = AL.find(x => x[0] === k); if (!a) continue; const st = alStatus(m, k);
    items.push({ k, label: a[1], st: st === 'contains' ? 'bad' : st === 'traces' ? 'warn' : st === 'unknown' ? 'unk' : 'ok', text: st === 'contains' ? 'Contains ' + a[1].toLowerCase() : st === 'traces' ? 'May contain ' + a[1].toLowerCase() : st === 'unknown' ? 'Couldn\'t verify ' + a[1].toLowerCase() : 'No ' + a[1].toLowerCase() + ' found in listed data' }); }
  for (const k of prefs.diets || []) { const d = DIETS.find(x => x[0] === k); if (!d) continue; const st = dietStatus(m, k, net);
    const T = { vegan: ['Not vegan', 'No animal ingredients found'], vegetarian: ['Not vegetarian', 'No meat or fish found'], palm: ['Contains palm oil', 'No palm oil found'], nosugar: ['Has added sugar', 'No added sugar found'], keto: ['Over 5 g net carbs per 100 g', '5 g net carbs or less per 100 g'], organic: ['Not labelled organic', 'Labelled organic'] }[k];
    items.push({ k, label: d[1], st: st === 'conflict' ? 'bad' : st === 'unknown' ? 'unk' : 'ok', text: st === 'conflict' ? T[0] : st === 'unknown' ? 'Couldn\'t verify: ' + d[1].toLowerCase() : T[1] }); }
  const lv = items.some(i => i.st === 'bad') ? 'bad' : items.some(i => i.st === 'warn') ? 'warn' : items.some(i => i.st === 'unk') ? 'unk' : items.length ? 'ok' : null;
  return { level: lv, items };
}
return { AL, DIETS, analyze, alStatus, dietStatus, check };
});
