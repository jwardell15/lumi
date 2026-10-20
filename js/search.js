/* Lumi local search engine: inverted index with prefix + typo-tolerant (Damerau-Levenshtein) matching. */
(function (root) {
'use strict';
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['and', 'the', 'of', 'with', 'a', 'in', 'for', 'or']);
const stem = t => t.length > 3 && t.endsWith('ies') ? t.slice(0, -3) + 'y' : t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t;
const toks = s => norm(s).split(' ').filter(t => t && !STOP.has(t)).map(stem);
function dl(a, b, max) { // bounded Damerau-Levenshtein
  const la = a.length, lb = b.length; if (Math.abs(la - lb) > max) return max + 1;
  let prev2 = null, prev = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    const cur = [i]; let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1; prev2 = prev; prev = cur;
  }
  return prev[lb];
}
const SIZEW = /\b\d+(\.\d+)?\s*(fl\.? ?oz|oz|ounces?|ct|count|pk|pack|packs|g|grams?|kg|lb|lbs|ml|l|liters?|gal|gallon|qt|pt)\b|\b(family|value|party|snack|fun|king|share) (size|pack)\b|\b\d+ ?x\b|\b(bottles?|cans?|cartons?|jugs?|multipack|variety pack)\b/gi;
/* v6.3 duplicate group: same brand + same name once sizes/pack words are removed */
const groupKey = (name, brand) => { const b = norm(String(brand || '').toLowerCase().replace(/[’']/g, '')); let n = norm(String(name || '').toLowerCase().replace(/[’']/g, '').replace(SIZEW, ' '));
  const bw = b.split(' ').filter(w => w.length > 2); n = n.split(' ').filter(w => !bw.includes(w)).map(w => w.length > 3 ? w.replace(/(es|s)$/, '') : w).join(' '); return b + '|' + n; };
let WATER_; const water = () => WATER_ ?? (WATER_ = typeof self !== 'undefined' && self.LumiAisles ? [self.LumiAisles.BYID['bv-water'], self.LumiAisles.BYID['bv-sparkling']] : []); // plain/sparkling water with ~0 carbs counts as filler even when the name doesn't say "water"
const OFFAL = /\b(liver|livers|gizzards?|hearts?|kidneys?|tongue|tripe|giblets?|feet|paws|necks?|brains?|spleen|lungs?|chitterlings|offal|mechanically separated|separable fat|skin only|backs?|frames?|testes|sweetbreads?|blood|marrow|ears?|snouts?)\b/;
const MEATQ = /\b(chicken|beef|pork|turkey|lamb|steak)\b/;
const COMMON = /\b(breasts?|thighs?|tenders?|tenderloins?|nuggets?|rotisserie|wings?|drumsticks?|ground|strips?|grilled|patties|sirloin|ribeye|chops?|loin)\b/;
/* v7.2 brand cleanup: source labels, apostrophe casing, parent→consumer brand, known misspellings, generic words used as brands */
const BRAND_FIX = [[/^usda\s+usda\s+/i, 'USDA '], [/\bSr Legacy\b/i, 'SR Legacy'], [/\bFndds\b/i, 'FNDDS'], [/(\w)['’]S\b/g, "$1's"], [/^bel+[ao]w?ther farms?$/i, 'Bellwether Farms'], [/^siggi'?s?$|^siggi s$/i, "Siggi's"], [/^nancy'?s$|^nancy s$/i, "Nancy's"], [/^fage( total)?$/i, 'Fage'], [/^two good$/i, 'Two Good'], [/^chobani(,? llc| inc\.?)?$/i, 'Chobani']];
const GENERIC_BRAND = /^(skyr|yogurt|yoghurt|greek yogurt|milk|cheese|cereal|bread|soda|chips|organic|natural|plain|vanilla|generic|unknown|n\/a|none|food|foods)$/i;
const bnorm = b => norm(fixBrand(b)).replace(/\s+/g, '');
function fixBrand(b, name) {
  b = String(b || '').trim(); for (const [re, to] of BRAND_FIX) b = b.replace(re, to);
  if (GENERIC_BRAND.test(b)) b = '';
  const n = String(name || '').toLowerCase();
  if (/^(danone|dannon|the dannon company|danone us)/i.test(b)) { if (/\boikos\b/.test(n)) b = 'Oikos'; else if (/\bactivia\b/.test(n)) b = 'Activia'; else if (/\blight ?(&|and|\+) ?fit\b/.test(n)) b = 'Light + Fit'; else if (/\bsilk\b/.test(n)) b = 'Silk'; else if (/\bdanimals\b/.test(n)) b = 'Danimals'; else b = 'Dannon'; }
  if (/^general mills/i.test(b) && /\byoplait\b/.test(n)) b = 'Yoplait';
  if (b && b === b.toLowerCase() && !/^(fairlife|siete)$/.test(b)) b = b.replace(/(^|[\s&\-/])([a-z])/g, (m, p, c) => p + c.toUpperCase());
  return b;
}
/* well-known US consumer brands get a relevance boost */
const KNOWNB = /^(chobani|fage|oikos|siggi'?s|two good|ratio|yoplait|dannon|danone|activia|light \+ fit|kirkland|kirkland signature|great value|good & gather|market pantry|365|365 by whole foods market|kroger|private selection|simple truth|simple truth organic|trader joe'?s|stonyfield|stonyfield organic|noosa|tillamook|horizon|horizon organic|organic valley|fairlife|lactaid|silk|oatly|califia farms|kraft|sargento|cabot|philadelphia|daisy|breakstone'?s|kerrygold|general mills|cheerios|kellogg'?s|post|quaker|kashi|nature'?s path|magic spoon|catalina crunch|coca[- ]cola|pepsi|sprite|dr pepper|mountain dew|zevia|olipop|poppi|la croix|lacroix|sparkling ice|canada dry|a&w|lay'?s|frito ?lay|doritos|tostitos|kettle brand|cape cod|siete|ruffles|pringles|sun ?chips|pepperidge farm|dave'?s killer bread|nature'?s own|sara lee|wonder|arnold|oroweat|thomas'?|friendly farms|clancy'?s|h-e-b|heb|publix|wegmans|hy-vee|meijer|signature select|o organics|lucerne|bellwether farms|nancy'?s|maple hill|icelandic provisions|lifeway|ellenos|wallaby|brown cow|clover|alexandre|painterland|quest|premier protein|core power)$/i;
/* known non-US labels that show up in OFF */
const NONUSB = /\b(sojade|yeo valley|olympic|alpro|onken|m[uü]ller|pr[eé]sident|lactalis|carrefour|auchan|leclerc|monoprix|tesco|sainsbury'?s|asda|waitrose|morrisons|marks (&|and) spencer|lidl|milbona|libert[eé]|iogo|astro|natrel|qu[eé]bon|sealtest|neilson|president'?s choice|no name|compliments|arla|la laiti[eè]re|st hubert|bonduelle|gerbl[eé]|bjorg|les 2 vaches|malo|candia|lactel|bridel|paysan breton|soignon|andros|ehrmann|zott|emmi|mlekovita|valio|dux|pozuelo|rovira)\b/i;
/* query word → patterns meaning "a different product that merely contains the word" */
const OFFTOPIC = { soda: /\b(crackers?|sherbet|saltines?|baking soda|bicarbonate|cakes?|cookies?|soda bread|candy)\b/, chips: /\b(carrots?|pickles?|dill|hamburger|banana|coconut|kale|apple|cereal|chips ahoy|chocolate chips?|baking chips|morsels|fish|cookies?|bread (&|and) butter|toffee|mint chip|butterscotch|white chips|chips? (&|and) (salsa|queso|guac\w*|pico))\b/, bread: /\b(crisp ?bread|crispbread|crackers?|flour|crumbs?|chips|pickles?|mix|machine|pudding|stuffing|bowl|dip|panko|yeast|starter)\b/, cereal: /\b(bars?|cookies?|treats)\b/, milk: /\b(mozzarella|ricotta|cheddar|string|cheese|siggi'?s|chobani|oikos|fage|icelandic|ice cream|coconut|almond|oat|oats|soy|cashew|rice milk|pea|hemp|skyr|shakes?|coffee|latte|protein|yogurt|kefir|cheese|creamer|milk chocolate|chocolate (bar|candy|chips?)|chocolates|caramels?|candy|cookies?|bars?|toffee|truffles?|lotion|soap|body)\b/, cheese: /\b(pasta sauce|sauce|spread|croutons?|ravioli|tortellini|bakes|burgers?|crisps|enchiladas?|straws|cheesecake|cheese (puffs|balls|curls|crackers|nips)|cheez|cheetos|goldfish|crackers?|pizza|cheeseburger|mac(aroni)?|dip|bread|danish|filled|bagels?|biscuits?)\b/, yogurt: /\b(covered|coated|pretzels|raisins|granola|parfaits?|bites|cereal|dressing|dip|tzatziki|bark|melts|starter)\b/ };
const NONEN = /\b(islandais|sel|en|vinaigre|jardini[eè]re|citron|mousse|grec|grecque|biologique|nature|natur|à la|brassé|brasse|entier|écrémé|ecreme|fromage blanc|brebis|chèvre|chevre|vache|soja|gourmand|sucré|onctueux|griego|desnatado|entera|naturjoghurt|joghurt|jogurt|yaourt|yoghourt|le|la|les|du|des|et|au|aux|avec|sans|nature|fromage|lait|sucre|chocolat|yaourt|leche|con|sin|del|azucar|queso|und|mit|vanille|fraise|eau|pain|beurre|creme|natur|saveur|parfum|sabor|blanc|petit|recette|aceite|agua|bebida|dulce|avena|cereales|céréales|intero|greco|bianco|biscottes|onctueux|mousse a)\b/i;
const NONEN2 = /\b(uk|united kingdom|france|deutschland|espana|canada|quebec)\b/;
const ALCQ = /\b(vodka|tequila|rum|gin|whiskey|whisky|bourbon|beer|wine|cocktail|hard|spiked|alcohol|margarita|seltzer|mixer)\b/;
const ALCN = /\b(vodka|tequila|rum|gin|whiskey|whisky|bourbon|beer|wine|cocktail|hard seltzer|spiked|liqueur|margarita)\b/;
const PACKQ = /\b(soda|yogurt|yoghurt|cereal|bread|chips|crackers?|cookies?|bars?|protein|granola|ice cream|pizza|pasta sauce|salsa|hummus|juice|candy|chocolate|tortillas?|bagels?|muffins?|waffles?|pancakes?|frozen|snacks?|jerky|popcorn|pretzels?|creamer|milk|cheese|sausage|bacon|hot dogs?|soup|dressing|ketchup|mustard|mayo|peanut butter|jam|coffee|tea|energy drink|sparkling water|kombucha|kefir|oatmeal)\b/;
const CHAINQ = /\b(chick ?fil ?a|starbucks|mcdonalds?|subway|chipotle|taco bell|wendys?|burger king|dunkin|panera|kfc|popeyes|arbys?|sonic|dominos|pizza hut|papa johns|five guys|in n out|shake shack|culvers|jack in the box|panda express|wingstop|dairy queen|ihop|dennys|applebees|chilis|olive garden|whataburger|raising canes|jersey mikes|jimmy johns|firehouse)\b/;
const fixName = s => String(s || '').replace(/([A-Za-z])['’]S\b/g, "$1's");
/* v6.3.3 fuzzy near-duplicate grouping: same brand (first brand word), token-set similarity >= 0.85 after
   stemming/singularizing and removing size/pack/store/brand/filler words, and nutrition within ~10% */
const DSTOP = new Set('fresh costco walmart target kroger kirkland signature the and with of a an in for by brand pack value family size count ct oz lb fl organic natural all premium original classic new 100 product boneless skinless wild caught farm farmed raised antibiotic free range grade usda'.split(' '));
const dstem = w => w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && /(ches|shes|xes|sses)$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w.length > 5 && w.endsWith('ing') ? w.slice(0, -3) : w;
/* v7: spelling/language variants that otherwise split one product into several rows */
const SYN = { yogourt: 'yogurt', yougourt: 'yogurt', yoghurt: 'yogurt', yoghourt: 'yogurt', yaourt: 'yogurt', grec: 'greek', grecque: 'greek', biologique: 'organic', bio: 'organic', hearts: 'heart', hulled: 'shelled', dehulled: 'shelled', seeds: 'seed', chedder: 'cheddar', flavour: 'flavor', colour: 'color', savoury: 'savory', unsweeten: 'unsweetened', almondmilk: 'almond milk', oatmilk: 'oat milk' };
const syn = w => SYN[w] || w;
function dtoks(d) { const bw = new Set(norm(String(d.brand || '').toLowerCase()).split(' ')); const W = norm(String(d.name || '').toLowerCase().replace(/[’']/g, '').replace(SIZEW, ' ')).split(' ').map(syn).join(' ').split(' ').filter(w => w && !DSTOP.has(w) && !/^\d+$/.test(w)); const W2 = W.filter(w => !bw.has(w)); return new Set((W2.length ? W2 : W).map(dstem)); }
const near = (a, b, tol = 0.1, abs = 1) => a == null || b == null ? a == b : Math.abs(a - b) <= Math.max(abs, tol * Math.max(a, b));
function simTok(A, B) { if (!A.size || !B.size) return A.size === B.size ? 1 : 0; let k = 0; for (const t of A) if (B.has(t)) k++; const m = Math.min(A.size, B.size); return (m < 2 && A.size !== B.size) ? k / Math.max(A.size, B.size) : k / m; }
const ADJ = new Set('hulled hand shelled snacking snack halve halves piece pieces whole chopped raw natural premium select fancy jumbo large medium small extra light golden california giant mammoth bulk bag resealable'.split(' '));
const core = T => { const o = [...T].filter(t => !ADJ.has(t)); return o.sort().join(' '); };
function sameNut5(a, b) { return near(a.net, b.net, 0.05, 0.5) && near(a.sugar, b.sugar, 0.05, 0.5) && near(a.score, b.score, 0.05, 2) && near(a.h, b.h, 0.05, 3); }
/* v7: same product, different label submissions (e.g. Kirkland hemp hearts at 3 g vs 7 g net): looser nutrition match, only when the names are a subset match */
function sameNutLoose(a, b) { return near(a.net, b.net, 0.45, 4) && near(a.sugar, b.sugar, 0.5, 3) && near(a.score, b.score, 0.1, 8); }
function subset(A, B) { if (A.size < 2 || B.size < 2) return false; const [S, L] = A.size <= B.size ? [A, B] : [B, A]; for (const t of S) if (!L.has(t)) return false; if (L.size - S.size > 2) return false; for (const t of L) if (!S.has(t) && TYPEW.has(t)) return false; return true; }
const TYPEW = new Set('bar protein cookie mix bite chip crisp cereal drink shake powder ice cream frozen sauce dip snack cake keto light lite diet zero sugar free reduced fat low spicy hot sweet salted unsalted roasted milk dark white chocolate peanut butter cheese vanilla strawberry cinnamon honey'.split(' '));
function sameNut(a, b) { return near(a.net, b.net) && near(a.sugar, b.sugar) && near(a.score, b.score, 0.1, 3) && near(a.h, b.h, 0.1, 5); }
function dedupe(list, get = x => x, max = Infinity) { const seen = new Map(), buck = new Map(), out = [];
  for (const x of list) { if (out.length >= max) break; const d = get(x); const k = groupKey(d.name, d.brand);
    let f = seen.get(k); const bk = (norm(String(d.brand || '').toLowerCase()).split(' ')[0] || '?'); const T = dtoks(d);
    if (!f) { const B = buck.get(bk) || []; for (let i = 0; i < B.length && i < 400; i++) { const [t2, d2] = B[i]; if ((simTok(T, t2) >= 0.85 && sameNut(d, d2)) || (core(T) && core(T) === core(t2) && sameNut5(d, d2)) || (core(T) && core(T) === core(t2) && sameNutLoose(d, d2)) || (subset(T, t2) && sameNutLoose(d, d2))) { f = d2; break; } } }
    if (f) { f.sizes = (f.sizes || 1) + 1; continue; }
    d.sizes = 0; seen.set(k, d); if (!buck.has(bk)) buck.set(bk, []); buck.get(bk).push([T, d]); out.push(x); }
  return out; }
const IMGBASE = 'https://images.openfoodfacts.org/images/products/';
function imgURL(code, v) {
  if (!v) return '';
  if (v[0] === '~') { const parts = code.length > 8 ? code.padStart(13, '0').match(/^(...)(...)(...)(.*)$/).slice(1).join('/') : code; return IMGBASE + parts + '/' + v.slice(1) + '.200.jpg'; }
  if (v.startsWith('w:')) return 'img/w/' + v.slice(2) + '-200.webp';
  return v.startsWith('http') ? v : IMGBASE + v;
}
class Engine {
  constructor() { this.bc = new Map(); this.docs = []; this.post = new Map(); this.buckets = new Map(); this.cats = []; this.tiers = 0; }
  add(data) {
    if (data.cats && !data.generic) this.cats = data.cats;
    const cats = data.generic ? data.cats : this.cats; const KC = root.LumiCats;
    for (const d of data.docs) {
      const i = this.docs.length;
      const doc = { code: d[0], name: fixName(d[1]), brand: fixBrand(d[2], d[1]), score: d[3] < 0 ? null : d[3], net: d[4] < 0 ? null : d[4], cat: cats[d[5]] || '', img: imgURL(d[0], d[6]), keys: d[7] ? d[7].split('.').map(k => /^\d+$/.test(k) ? +k : (KC ? KC.KEYS.indexOf(k) : -1)).filter(k => k >= 0) : [], sugar: d[8] == null || d[8] < 0 ? null : d[8], h: d[9] == null || d[9] < 0 ? null : d[9], hn: !!(d[10] & 1), al: d[11] || 0, df: d[12] == null ? null : d[12], src: data.generic ? (d[7] && d[7].startsWith('rest') ? 'rest' : 'whole') : 'local', rank: i, sm: d[13] || 0, ai: d[14] == null ? -1 : d[14], bad: !!(d[10] & 8), fl: !!(d[10] & 4) || (water().includes(d[14]) && d[4] >= 0 && d[4] <= 0.5) };
      doc.nn = norm(doc.name + ' ' + doc.brand);
      this.docs.push(doc);
      const seen = new Map();
      for (const t of toks(doc.name)) seen.set(t, Math.max(seen.get(t) || 0, 3));
      for (const t of toks(doc.brand)) seen.set(t, Math.max(seen.get(t) || 0, 2));
      for (const t of toks(doc.cat)) seen.set(t, Math.max(seen.get(t) || 0, 1));
      for (const [t, f] of seen) {
        let p = this.post.get(t); if (!p) { p = []; this.post.set(t, p); const b = t.slice(0, 1); (this.buckets.get(b) || this.buckets.set(b, []).get(b)).push(t); }
        p.push(i * 4 + f);
      }
    }
    for (const d of data.docs) { const k = bnorm(d[2]); if (k) this.bc.set(k, (this.bc.get(k) || 0) + 1); }
    this.tiers++;
  }
  terms(q, prefix) {
    const out = new Map(); const fw = (t, w) => { if ((out.get(t) || 0) < w) out.set(t, w); };
    if (this.post.has(q)) fw(q, 1);
    const bucket = this.buckets.get(q[0]) || [];
    const maxD = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0;
    const doPrefix = prefix || q.length >= 4;
    for (const t of bucket) {
      if (t === q) continue;
      if (doPrefix && t.length > q.length && t.startsWith(q)) { fw(t, q.length >= 3 ? 0.8 : 0.6); continue; }
      if (maxD && Math.abs(t.length - q.length) <= maxD) { const d = dl(q, t, maxD); if (d <= maxD) fw(t, d === 1 ? 0.7 : 0.5); }
    }
    // compound words: "peanutbutter" → peanut + butter is out of scope; but "cheerio" first-letter typos:
    if (out.size === 0 && maxD) for (const [b, ts] of this.buckets) { if (b === q[0]) continue; for (const t of ts) if (Math.abs(t.length - q.length) <= 1 && dl(q, t, 1) <= 1) fw(t, 0.55); }
    return out;
  }
  search(query, { limit = 80, prefix = false, filter } = {}) {
    const qt = toks(query); if (!qt.length) return [];
    const per = qt.map((q, k) => {
      const m = new Map();
      for (const [t, w] of this.terms(q, prefix && k === qt.length - 1)) for (const e of this.post.get(t)) { const i = e >> 2, f = e & 3; const s = w * (f === 3 ? 1 : f === 2 ? 0.75 : 0.45); if ((m.get(i) || 0) < s) m.set(i, s); }
      return m;
    });
    const acc = new Map();
    per.forEach(m => { for (const [i, s] of m) { const a = acc.get(i) || [0, 0]; a[0] += s; a[1]++; acc.set(i, a); } });
    const need = qt.length <= 2 ? qt.length : qt.length - 1;
    const nq = norm(query); const N = this.docs.length || 1; const res = [];
    for (const [i, [s, c]] of acc) {
      if (c < need) continue; const d = this.docs[i]; if (filter && !filter(d)) continue;
      let r = (s / qt.length) * 100 * (c / qt.length);
      if (d.nn.includes(nq)) r += 25; { const nmn = norm(d.name), at = (' ' + nmn + ' ').indexOf(' ' + nq); if (at >= 0) r += 10 - Math.min(4, nmn.slice(0, at).split(' ').filter(Boolean).length); } // v7.3: query anywhere in the name, small position penalty
      r += 26 * (1 - d.rank / N);
      // v6.3.3: common cuts first, offal last (unless asked for), and blend in the rating
      if (!OFFAL.test(nq) && OFFAL.test(d.nn)) r -= 30;
      if (MEATQ.test(nq) && COMMON.test(d.nn)) r += 12;
      // v7.3 diabetes-aware: among popular / known-brand results the Carb score matters more; obscure items get only a small score nudge
      const pop = KNOWNB.test(d.brand) || d.rank / N < 0.25;
      if (d.score != null) r += (pop ? 0.13 : 0.03) * (d.score - 50);
      // v7.2: known mainstream US brands first; brandless/non-US labels and off-topic products down
      if (KNOWNB.test(d.brand)) r += 22;
      if (d.src === 'local' && !d.brand) r -= 22;
      if (NONUSB.test(d.brand) || NONEN2.test(d.nn)) r -= 30;
      for (const w of nq.split(" ")) { const o = OFFTOPIC[w] || OFFTOPIC[w + "s"]; if (o && o.test(d.nn) && !o.test(nq)) { r -= 55; break; } }
      // v7.1: shoppers want US packaged products first: demote non-English/non-US labels, unasked-for alcohol, generic FNDDS rows for packaged-type queries, and bad data
      if (d.src !== 'whole' && d.src !== 'rest') { if (!/^[\x20-\x7e]+$/.test(d.name + d.brand) || NONEN.test(d.name.toLowerCase()) || !(d.code.length === 12 || (d.code.length === 13 && /^[01]/.test(d.code)))) r -= 22; if (d.bad) r -= 15; if (!d.img) r -= 3; if (d.name.split(' ').length <= 1 && d.brand && nq.split(' ').length === 1) r -= 6; }
      if (!ALCQ.test(nq) && ALCN.test(d.nn)) r -= 28;
      if (d.src === 'whole' && PACKQ.test(nq)) r -= 30;
      if (d.src === 'rest') r += CHAINQ.test(nq) ? 6 : -30;
      if (d.src === 'whole') { const nn = norm(d.name), w = nn.split(' '); if (nn.startsWith(qt[0])) r += 14; if (/\braw\b/.test(nn)) r += 6; r -= Math.min(10, Math.max(0, w.length - qt.length - 1) * 1.5); }
      res.push([r, d]);
    }
    res.sort((a, b) => b[0] - a[0]);
    this.mergeBrands(res.slice(0, limit * 2).map(x => x[1]));
    return res.slice(0, limit).map(([r, d]) => Object.assign({ rel: r }, d));
  }
  /* v7.3 fuzzy brand merge within a result set: a rare brand that is 1 edit (2 for long names) from a much more common brand
     in the same aisle is treated as a misspelling. Guards: >=6 letters, same first letter, no digit differences, both
     not well-known brands, and the common brand must be >=4x more frequent. */
  mergeBrands(list) {
    const by = new Map();
    for (const d of list) { const k = bnorm(d.brand); if (!k || k.length < 6) continue; if (!by.has(k)) by.set(k, { k, n: this.bc.get(k) || 1, ai: new Set(), ds: [] }); const e = by.get(k); e.ai.add(d.ai); e.ds.push(d); }
    const E = [...by.values()].sort((a, b) => b.n - a.n);
    for (let i = E.length - 1; i > 0; i--) { const r = E[i];
      for (let j = 0; j < i; j++) { const c = E[j]; if (c.n < 4 * r.n || c.k[0] !== r.k[0]) continue;
        if (r.k.replace(/\D/g, '') !== c.k.replace(/\D/g, '')) continue;
        if (KNOWNB.test(r.ds[0].brand) && KNOWNB.test(c.ds[0].brand)) continue;
        if (![...r.ai].some(a => c.ai.has(a))) continue;
        const max = Math.min(r.k.length, c.k.length) >= 10 ? 2 : 1; if (Math.abs(r.k.length - c.k.length) > max || dl(r.k, c.k, max) > max) continue;
        // guard: a misspelling produces a non-word; if every differing word of the rare brand is a real index word (e.g. "Great Valley"), it is a different brand
        const rw = norm(r.ds[0].brand).split(' '), cw = new Set(norm(c.ds[0].brand).split(' ')), diff = rw.filter(w => !cw.has(w));
        if (diff.length && diff.every(w => (this.post.get(w) || []).length >= 25)) continue;
        const nb = c.ds[0].brand; for (const d of r.ds) { d.brandRaw = d.brand; d.brand = nb; d.nn = norm(d.name + ' ' + nb); } break; } }
  }
  browse(keyIdx, limit = 5000) { const r = []; for (const d of this.docs) { if (d.keys.includes(keyIdx)) { r.push(Object.assign({ rel: 100 - d.rank / this.docs.length * 50 }, d)); if (r.length >= limit) break; } } return r; }
  similar(doc, limit = 6) {
    const cur = doc.score ?? 0; let pool = [];
    const leaf = (doc.keys || []).slice(-1)[0];
    if (leaf != null) pool = this.docs.filter(d => d.keys.includes(leaf) && d.code !== doc.code);
    if (pool.length < 4 && doc.cat) pool = pool.concat(this.docs.filter(d => d.cat === doc.cat && d.code !== doc.code));
    if (pool.length < 4) { const kw = toks(doc.name).slice(-2).join(' '); if (kw) pool = pool.concat(this.search(kw, { limit: 60 }).filter(d => d.code !== doc.code)); }
    const seen = new Set(); return pool.filter(d => d.score != null && d.net != null && d.score >= cur + 5 && !seen.has(d.code) && seen.add(d.code)).sort((a, b) => b.score - a.score || a.rank - b.rank).slice(0, limit);
  }
  byCode(code) { if (!this._codes) { this._codes = new Map(); } if (this._codes.size !== this.docs.length) { this._codes.clear(); this.docs.forEach(d => this._codes.set(d.code, d)); } return this._codes.get(code); }
}
/* v7.2: the same relevance adjustments for live Open Food Facts / USDA results */
function relAdj(query, it) {
  const nq = norm(query), qt = toks(query), name = String(it.name || ''), brand = fixBrand(it.brand, name), nn = norm(name + ' ' + brand), code = String(it.code || '');
  let r = 0;
  if (KNOWNB.test(brand)) r += 22;
  if (!brand) r -= 22;
  if (NONUSB.test(brand) || NONEN2.test(nn)) r -= 30;
  if (!/^[\x20-\x7e]+$/.test(name + brand) || NONEN.test(name.toLowerCase())) r -= 22;
  if (code && /^\d+$/.test(code) && !(code.length === 12 || (code.length === 13 && /^[01]/.test(code)) || code.length === 8)) r -= 22;
  if (!ALCQ.test(nq) && ALCN.test(nn)) r -= 28;
  for (const w of nq.split(" ")) { const o = OFFTOPIC[w] || OFFTOPIC[w + "s"]; if (o && o.test(nn) && !o.test(nq)) { r -= 55; break; } }
  return r;
}
root.LumiSearch = { fixBrand, relAdj, Engine, norm, toks, dl, imgURL, groupKey, dedupe, fixName };
})(typeof self !== "undefined" ? self : globalThis);
