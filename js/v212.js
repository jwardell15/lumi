'use strict';
/* Lumi 21.2: recipe scoring. Paste a recipe URL (read its schema.org Recipe JSON-LD when the site allows cross-origin reads) or the
   ingredient text; each line is parsed into amount / unit / food, matched to a real USDA food in Lumi (editable), summed, divided by
   servings and scored per serving. Lines Lumi can't match or measure are flagged and left out of the totals; nothing is guessed. */

const N212 = s => ' ' + String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9%\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
/* recipe term -> USDA FoodData Central food in Lumi's index (SR Legacy preferred: it carries cup / tbsp / size portions) */
const ALIAS212 = [["all-purpose flour|ap flour|plain flour|flour","fdc-168894"],["whole wheat flour","fdc-168893"],["bread flour","fdc-168896"],["almond flour","fdc-2261420"],["cornmeal","fdc-169697"],["granulated sugar|white sugar|caster sugar|sugar","fdc-169655"],["brown sugar|light brown sugar|dark brown sugar","fdc-168833"],["powdered sugar|confectioners sugar|icing sugar","fdc-169656"],["honey","fdc-2710281"],["maple syrup","fdc-169661"],["molasses","fdc-168820"],["butter|unsalted butter","fdc-173430"],["salted butter","fdc-173410"],["egg|eggs|large egg|large eggs","fdc-171287"],["egg white|egg whites","fdc-172183"],["egg yolk|egg yolks","fdc-172184"],["milk|whole milk","fdc-171265"],["2% milk|reduced fat milk","fdc-171267"],["skim milk|nonfat milk|fat free milk","fdc-171269"],["buttermilk","fdc-170874"],["heavy cream|heavy whipping cream|whipping cream","fdc-170859"],["sour cream","fdc-171257"],["half and half|half-and-half","fdc-171255"],["cream cheese","fdc-173418"],["cheddar|cheddar cheese|shredded cheddar","fdc-173414"],["mozzarella|mozzarella cheese","fdc-170845"],["parmesan|parmesan cheese|parmigiano","fdc-171247"],["feta|feta cheese","fdc-173420"],["ricotta|ricotta cheese","fdc-170851"],["greek yogurt|plain greek yogurt","fdc-171304"],["plain yogurt|yogurt","fdc-171284"],["baking soda","fdc-175040"],["baking powder","fdc-172804"],["salt|kosher salt|sea salt|table salt","fdc-173468"],["black pepper|pepper|ground black pepper","fdc-170931"],["vanilla|vanilla extract","fdc-173471"],["cinnamon|ground cinnamon","fdc-171320"],["cumin|ground cumin","fdc-170923"],["chili powder","fdc-171319"],["paprika","fdc-171329"],["garlic powder","fdc-171325"],["onion powder","fdc-171327"],["oregano|dried oregano","fdc-171328"],["nutmeg","fdc-171326"],["ginger|ground ginger","fdc-170926"],["olive oil|extra virgin olive oil|extra-virgin olive oil","fdc-171413"],["vegetable oil|canola oil","fdc-172336"],["coconut oil","fdc-171412"],["cocoa|cocoa powder|unsweetened cocoa powder","fdc-169593"],["chocolate chips|semisweet chocolate chips|semi-sweet chocolate chips","fdc-167976"],["cornstarch|corn starch","fdc-169698"],["rolled oats|old fashioned oats|oats|old-fashioned oats","fdc-173904"],["white rice|long grain rice|rice","fdc-168877"],["brown rice","fdc-169703"],["spaghetti|pasta|penne|macaroni","fdc-169736"],["banana|bananas|ripe bananas|ripe banana","fdc-173944"],["apple|apples","fdc-171688"],["lemon juice","fdc-167747"],["lime juice","fdc-168156"],["blueberries","fdc-171711"],["strawberries","fdc-167762"],["onion|onions|yellow onion|white onion","fdc-170000"],["red onion","fdc-170000"],["garlic|garlic clove|garlic cloves|cloves garlic|clove garlic","fdc-169230"],["carrot|carrots","fdc-170393"],["celery|celery stalk|celery stalks","fdc-169988"],["tomato|tomatoes","fdc-170457"],["diced tomatoes|canned diced tomatoes|canned tomatoes","fdc-333281"],["tomato paste","fdc-170459"],["tomato sauce","fdc-170054"],["potato|potatoes|russet potatoes","fdc-170026"],["sweet potato|sweet potatoes","fdc-168482"],["bell pepper|red bell pepper|green bell pepper","fdc-170108"],["spinach|baby spinach","fdc-168462"],["broccoli","fdc-170379"],["zucchini","fdc-169291"],["mushrooms|mushroom","fdc-169251"],["avocado","fdc-171705"],["corn","fdc-169998"],["black beans|canned black beans","fdc-175238"],["chickpeas|garbanzo beans","fdc-173801"],["chicken breast|boneless skinless chicken breast|chicken breasts|boneless skinless chicken breasts","fdc-171077"],["chicken thighs|chicken thigh","fdc-173627"],["ground beef|lean ground beef","fdc-174036"],["ground turkey","fdc-172850"],["bacon","fdc-168277"],["salmon|salmon fillet|salmon fillets","fdc-175167"],["shrimp","fdc-175179"],["tofu","fdc-172475"],["chicken broth|chicken stock","fdc-174536"],["vegetable broth","fdc-171583"],["soy sauce","fdc-174277"],["water","fdc-173647"],["peanut butter","fdc-174266"],["almonds","fdc-170567"],["walnuts|chopped walnuts","fdc-170187"],["pecans","fdc-170182"],["raisins","fdc-2709212"],["mayonnaise|mayo","fdc-171009"],["ketchup","fdc-168556"],["dijon mustard|mustard","fdc-172234"],["vinegar|white vinegar","fdc-172237"],["apple cider vinegar","fdc-173469"],["balsamic vinegar","fdc-172241"],["yeast|active dry yeast|instant yeast","fdc-175043"],["flour tortillas|flour tortilla","fdc-175037"],["bread crumbs|breadcrumbs","fdc-174928"],["coconut milk","fdc-170173"]].map(([t, code]) => ({ code, terms: t.split('|').map(x => N212(x).trim()) }));
/* words that turn an ingredient into a different food than the alias term alone ("red pepper flakes" is not black pepper) */
const OTHER212 = /\b(flakes?|powder|tortillas?|green|sauce|paste|juice|zest|oil|broth|stock|extract|syrup|chips?|bread|buns?|cake|mix|soup|seeds?|leaves|starch|wine|vinegar|butter|milk|cream|cheese|jam|jelly|puree|dried|canned|frozen|sweetened|condensed|evaporated|smoked|cooked|instant|crackers?|noodles?|pickled|roasted|toasted)\b/;
const PREP212 = /\b(fresh(ly)?|large|medium|small|extra|chopped|diced|minced|sliced|grated|shredded|crushed|ground|finely|roughly|coarsely|thinly|packed|lightly|firmly|softened|melted|cold|warm|hot|room temperature|at|beaten|whisked|sifted|peeled|seeded|cored|trimmed|rinsed|drained|cubed|halved|quartered|divided|optional|organic|boneless|skinless|ripe|whole|raw|plain|pure|unsalted|salted|kosher|light|dark|heaping|level|about|approximately|of|and|or|plus|more|for|to|taste|the|a|an|into|cut|pieces?|inch|cm|stick|sticks|fine|virgin|extra-virgin|natural|creamy|smooth|good|quality|store-bought|homemade|large-grain|white|yellow|red|baby|uncooked|dry|block)\b/g;
const FR212 = { '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3', '⅛': ' 1/8', '⅜': ' 3/8', '⅝': ' 5/8', '⅞': ' 7/8', '⅙': ' 1/6', '⅚': ' 5/6', '⅕': ' 1/5', '⁄': '/' };
const UNIT212 = [ // [canonical, regex source]
  ['fl oz', 'fl\\.? ?oz\\.?|fluid ounces?'], ['tbsp', 'tbsps?\\.?|tbls?\\.?|tbs\\.?|tablespoons?|T'], ['tsp', 'tsps?\\.?|teaspoons?|t'], ['cup', 'cups?|c\\.'],
  ['g', 'g|grams?|gr|gm'], ['kg', 'kgs?|kilograms?|kilos?'], ['oz', 'oz\\.?|ounces?'], ['lb', 'lbs?\\.?|pounds?'], ['ml', 'ml|millilit(?:er|re)s?|mls'], ['l', 'l|lit(?:er|re)s?'],
  ['pinch', 'pinch(?:es)?'], ['dash', 'dash(?:es)?'], ['clove', 'cloves?'], ['slice', 'slices?'], ['stick', 'sticks?'], ['stalk', 'stalks?|ribs?'],
  ['can', 'cans?|tins?'], ['package', 'packages?|pkgs?\\.?|packets?|envelopes?'], ['bunch', 'bunch(?:es)?'], ['handful', 'handfuls?'], ['piece', 'pieces?'],
  ['large', 'large|lg\\.?'], ['medium', 'medium|med\\.?'], ['small', 'small|sm\\.?'], ['whole', 'whole']];
const UNITRE212 = new RegExp('^(' + UNIT212.map(u => u[1]).join('|') + ')(?![a-z])', '');
const W212 = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 }, VOL212 = { tsp: 1, tbsp: 3, cup: 48, 'fl oz': 6, ml: 0.202884, l: 202.884 }; // volume in teaspoons
const NUM212 = '(\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d*\\.\\d+|\\d+)';
const qf212 = v => v == null ? '' : v >= 10 || Math.abs(v - Math.round(v)) < 0.01 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100);
function num212(s) { s = s.trim(); let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/); if (m) return +m[1] + m[2] / m[3]; m = s.match(/^(\d+)\/(\d+)$/); if (m) return m[2] > 0 ? m[1] / m[2] : null; return +s; }
function unitOf212(w) { for (const [c, src] of UNIT212) if (new RegExp('^(?:' + src + ')$', c === 'tbsp' || c === 'tsp' ? '' : 'i').test(w)) return c; return null; }
/* one ingredient line -> {raw, q, unit, food, pkg, range, skip} */
function parseLine212(raw) {
  let s = String(raw).replace(/[½¼¾⅓⅔⅛⅜⅝⅞⅙⅚⅕⁄]/g, c => FR212[c]).replace(/^[\s•·*▢☐□◦‣–—-]+/, '').replace(/\s+/g, ' ').trim();
  const out = { raw: String(raw).trim(), q: null, unit: null, food: '', pkg: null, range: false, skip: null };
  if (!s) { out.skip = 'blank'; return out; }
  if (/:$/.test(s) || /^(for|to make) (the )?[a-z ]+:?$/i.test(s) && s.split(' ').length <= 5 || (s === s.toUpperCase() && /[A-Z]{3}/.test(s) && !/\d/.test(s))) { out.skip = 'heading'; return out; }
  let m = s.match(new RegExp('^' + NUM212 + '(?:\\s*(?:-|–|to|or)\\s*' + NUM212 + ')?\\s*'));
  if (m) { const a = num212(m[1]), b = m[2] ? num212(m[2]) : null; out.q = b != null ? (a + b) / 2 : a; out.range = b != null; s = s.slice(m[0].length); }
  else if ((m = s.match(/^(a|an|one)\s+(?=\S)/i))) { out.q = 1; s = s.slice(m[0].length); }
  // package weight right after the count: "1 (15 oz) can", "2 (14.5-ounce) cans"
  const pk = () => { const p = s.match(new RegExp('^\\(\\s*' + NUM212 + '\\s*-?\\s*(oz|ounces?|ounce|g|grams?|lbs?|pounds?|ml|fl\\.? ?oz)\\.?(?:\\s+each)?\\s*\\)\\s*', 'i'));
    if (p) { const u = unitOf212(p[2].toLowerCase()) || unitOf212(p[2]); out.pkg = { q: num212(p[1]), unit: u }; s = s.slice(p[0].length); } };
  if (out.q != null) pk();
  const um = s.match(UNITRE212) || s.toLowerCase().match(UNITRE212);
  if (um && out.q != null || um && /^(pinch|dash|handful)/i.test(um[1])) { const u = unitOf212(um[1]); const after = s.slice(um[1].length);
    if (u && (/^[\s.,)]/.test(after) || !after)) { out.unit = u; s = after.replace(/^\.?\s*/, ''); if (out.q == null) out.q = 1; } }
  if (out.q != null && out.unit && /^(large|medium|small|whole)$/.test(out.unit)) { const u2 = s.match(UNITRE212); if (u2 && /^(cans?|cloves?|slices?|sticks?|stalks?|packages?|pieces?)$/i.test(u2[1])) { out.unit = unitOf212(u2[1]); s = s.slice(u2[1].length).trim(); } }
  if (out.q != null && !out.pkg) pk();
  // "of", parentheticals, everything after the first comma (preparation), trailing notes
  let f = s.replace(/^of\s+/i, '').replace(/\([^)]*\)/g, ' ');
  const tt = /\b(to taste|as needed|for (garnish|serving|dusting|greasing|topping|frying)|optional)\b/i.test(f);
  f = f.split(/,|;| - | – /)[0].replace(/\b(to taste|as needed|divided|plus more.*$|or more.*$|for (garnish|serving|dusting|greasing|topping|frying).*$)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  out.food = f;
  if (!f) out.skip = 'nofood';
  else if (out.q == null) out.skip = tt ? 'taste' : 'noamt';
  else if (out.unit === 'pinch' || out.unit === 'dash' || out.unit === 'handful') out.skip = 'pinch';
  return out;
}
const SING212 = w => w.length > 3 && /[^s]s$/.test(w) ? w.replace(/(ies)$/, 'y').replace(/(oes)$/, 'o').replace(/s$/, '') : w;
/* alias match: the longest alias term found as whole words; leftover words that make it a different food send it to search instead */
function alias212(food) { const t = N212(food); let best = null;
  for (const a of ALIAS212) for (const term of a.terms) { const k = ' ' + term + ' '; const i = t.indexOf(k); if (i >= 0 && (!best || term.length > best.term.length)) best = { code: a.code, term, i }; }
  if (!best) return null; const left = (t.slice(0, best.i) + ' ' + t.slice(best.i + best.term.length + 2)).replace(PREP212, ' ').replace(/\b\d+%?\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (left && OTHER212.test(' ' + left + ' ')) return null;
  return { code: best.code, sure: !left, left }; }
/* fallback: Lumi's own search over USDA foods; only accepted when every meaningful word of the ingredient is in the food's name */
function search212(food) { try { const q = N212(food).replace(PREP212, ' ').replace(/\s+/g, ' ').trim(); if (!q) return null; const qt = q.split(' ').map(SING212);
  let best = null; for (const d of engine.search(q, { limit: 25, filter: d => d.src === 'whole' })) { const nt = new Set(N212(d.name).trim().split(' ').map(SING212)); if (!qt.every(w => nt.has(w))) continue;
    const sc = (/\braw\b/i.test(d.name) ? 2 : 0) - d.name.length / 40 - (/\b(cooked|fried|canned|frozen|dried|prepared|baby food|babyfood)\b/i.test(d.name) && !/\b(cooked|fried|canned|frozen|dried)\b/.test(q) ? 3 : 0);
    if (!best || sc > best.sc) best = { code: d.code, sc }; } return best && { code: best.code, sure: false, left: '' }; } catch { return null; } }
/* grams for an amount of a matched food, from weight units or the food's own USDA portions; null when Lumi can't measure it */
function portion212(p, re, line) { let best = null; for (const [lab, g] of p.portions || []) { const m = String(lab).match(re); if (!m || !(g > 0)) continue; const k = m[1] ? +m[1] : 1; if (!(k > 0)) continue;
  const words = String(lab).toLowerCase().replace(m[0].toLowerCase(), ' ').split(/[^a-z]+/).filter(w => w.length > 2), L = N212(line);
  const sc = words.reduce((a, w) => a + (L.includes(' ' + w + ' ') ? 1 : -0.1), 0) - (/whipped|yields|sifted/.test(lab) && !/whipped|sifted/.test(L) ? 1 : 0);
  if (!best || sc > best.sc) best = { lab, g: g / k, sc }; } return best; }
function grams212(L, p) { const q = L.q;
  if (L.pkg && L.pkg.unit) { const one = L.pkg.unit in W212 ? L.pkg.q * W212[L.pkg.unit] : null; if (one) return { g: q * one, how: `${qf212(q)} × ${qf212(L.pkg.q)} ${L.pkg.unit} package` };
    if (L.pkg.unit in VOL212) L = Object.assign({}, L, { q: q * L.pkg.q, unit: L.pkg.unit }); }
  const u = L.unit;
  if (u in W212) return { g: L.q * W212[u], how: `${qf212(L.q)} ${u}` };
  if (u in VOL212) { const V = { cup: /^(?:([\d.]+)\s*)?cups?\b/i, tbsp: /^(?:([\d.]+)\s*)?(?:tbsp|tablespoons?)\b/i, tsp: /^(?:([\d.]+)\s*)?(?:tsp|teaspoons?)\b/i, 'fl oz': /^(?:([\d.]+)\s*)?fl oz\b/i };
    for (const k of [u, 'cup', 'tbsp', 'tsp', 'fl oz']) { if (!V[k]) continue; const b = portion212(p, V[k], L.raw); if (b) { const g = L.q * VOL212[u] / VOL212[k] * b.g; return { g, how: `${qf212(L.q)} ${u} · USDA ${b.lab.replace(/^[\d.]+\s*/, '')} = ${fmt20(b.g)} g` }; } }
    return null; }
  if (u === 'pinch' || u === 'dash' || u === 'handful') return null;
  const cw = (L.food.match(/\b(cloves?|slices?|stalks?|sticks?|ears?|fillets?|breasts?|thighs?|tortillas?|leaves|sprigs?)\b/i) || [])[1];
  const sz = u && u !== 'whole' && u !== 'piece' ? [u] : (cw ? [SING212(cw.toLowerCase()).replace(/^leave$/, 'leaf')] : []).concat(/\beggs?\b/i.test(L.food) ? ['large', 'medium'] : ['medium', 'large'], ['whole', 'each', '']);
  for (const w of sz) { const re = w ? new RegExp('^(?:([\\d.]+)\\s*)?(?:[a-z, ]*?)\\b' + w + 's?\\b', 'i') : /^(?:([\d.]+)\s*)?(?!.*\b(cup|tbsp|tsp|tablespoon|teaspoon|oz|g|lb|fl oz|ml|serving|nlea|guideline|container|package|packet|can|bunch)\b)[a-z]/i;
    const b = portion212(p, re, L.raw); if (b) return { g: L.q * b.g, how: `${qf212(L.q)} × USDA “${b.lab}” = ${fmt20(b.g)} g each` }; }
  return null; }
const SWEET212 = /^(sugars?|honey|syrups?|molasses|sweeteners?|agave)\b|\bsugar(s)?,|maple syrup|corn syrup/i;
const BASIC212 = /^(eggs?|milk|butter|cream|cheese|yogurt|oil|spices|salt|wheat flour|cereals, oats|oats|rice|beans|chickpeas|chicken|beef|turkey|pork|fish|salmon|crustaceans|tofu|nuts|peanut|seeds|water|vinegar|leavening|baking|yeast|lemon juice|lime juice|apples|bananas|blueberries|strawberries|onions|garlic|carrots|celery|tomato|tomatoes|potatoes|sweet potato|peppers|spinach|broccoli|squash|mushrooms|avocados|corn|cornmeal|cornstarch|vanilla|cocoa|soup, chicken broth|soup, vegetable broth|mustard|soy sauce|raisins|coconut)/i;
/* ---------- state ---------- */
let rs212 = store.get('rs212', null) || { url: '', name: '', sv: '', text: '', ov: {} }; const save212 = () => store.set('rs212', rs212);
const P212 = new Map(); let fetchMsg212 = '';
async function prod212(code) { if (P212.has(code)) return P212.get(code); let p = null; try { p = await resolveProduct(code); } catch {} P212.set(code, p); return p; }
/* JSON-LD: find a Recipe anywhere in the page's ld+json blocks (@graph, arrays, @type arrays, mainEntity) */
function findRecipe212(html) { const doc = new DOMParser().parseFromString(html, 'text/html'); const out = [];
  const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk); const t = [].concat(o['@type'] || []); if (t.some(x => /^(schema:)?Recipe$/i.test(String(x)))) out.push(o); ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item'].forEach(k => o[k] && walk(o[k])); };
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => { try { walk(JSON.parse(s.textContent)); } catch {} });
  const r = out.find(x => x.recipeIngredient || x.ingredients); if (!r) return null; const tx = h => { const d = document.createElement('div'); d.innerHTML = String(h); return d.textContent.trim(); };
  const ys = [].concat(r.recipeYield || []).map(String); let sv = null; for (const y of ys) { const m = y.match(/\d+/); if (m) { sv = +m[0]; break; } }
  return { name: tx(r.name || ''), sv, lines: [].concat(r.recipeIngredient || r.ingredients || []).map(tx).filter(Boolean) }; }
async function fetchUrl212(url) { const st = $('#rs212m'); let u; try { u = new URL(url); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { fetchMsg212 = 'That doesn\'t look like a web address. Paste the full link, starting with https://'; st.innerHTML = `<p class="er211">${esc(fetchMsg212)}</p>`; return; }
  st.innerHTML = '<p class="small">Reading the recipe page…</p>'; let html;
  try { const r = await fetch(u.href, { mode: 'cors', credentials: 'omit', redirect: 'follow' }); if (!r.ok) throw new Error('http ' + r.status); html = await r.text(); }
  catch (e) { fetchMsg212 = /^http /.test(e && e.message) ? `That page answered with an error (${e.message.slice(5)}). Copy the ingredient list from the recipe and paste it below.` : `${u.hostname} doesn't let other apps read its pages (no cross-origin access), so Lumi can't open it from here. Copy the ingredient list from the recipe and paste it below.`;
    st.innerHTML = `<p class="nt212" role="alert">${esc(fetchMsg212)}</p>`; $('#rs212t').focus(); return; }
  const R = findRecipe212(html); if (!R || !R.lines.length) { fetchMsg212 = `Lumi couldn't find recipe data (schema.org Recipe) on that page. Copy the ingredient list from it and paste it below.`; st.innerHTML = `<p class="nt212" role="alert">${esc(fetchMsg212)}</p>`; $('#rs212t').focus(); return; }
  rs212.text = R.lines.join('\n'); if (R.name) rs212.name = R.name; if (R.sv) rs212.sv = R.sv; rs212.ov = {}; save212(); fetchMsg212 = '';
  $('#rs212t').value = rs212.text; $('#rs212n').value = rs212.name; $('#rs212v').value = rs212.sv; st.innerHTML = `<p class="ok212">Read ${R.lines.length} ingredients from ${esc(u.hostname)}${R.sv ? `, ${R.sv} servings` : ''}.</p>`; score212(); }
/* ---------- build the lines ---------- */
async function lines212() { const out = [];
  for (const raw of String(rs212.text || '').split(/\r?\n/)) { const L = parseLine212(raw); if (L.skip === 'blank') continue; const ov = rs212.ov[L.raw] || {};
    const it = { L, ov, st: 'skip', why: '', code: null, p: null, g: null, how: '' }; out.push(it);
    if (L.skip === 'heading') { it.why = 'Heading, not an ingredient'; continue; }
    if (ov.off) { it.why = 'You chose not to count this line'; continue; }
    let m = ov.code ? { code: ov.code, sure: true, user: true } : null; if (!m && L.food) m = alias212(L.food) || search212(L.food);
    if (m) { it.code = m.code; it.p = await prod212(m.code); it.sure = m.sure; it.user = !!m.user; }
    if (ov.g > 0 && it.p) { it.g = +ov.g; it.how = 'grams you entered'; it.st = it.sure ? 'ok' : 'check'; continue; }
    if (L.skip === 'taste' || L.skip === 'noamt') { it.st = 'skip'; it.why = L.skip === 'taste' ? 'No amount ("to taste"), not counted' : 'No amount given, not counted. Enter grams to count it.'; continue; }
    if (L.skip === 'pinch') { it.st = 'skip'; it.why = `A ${L.unit} is too small to measure, not counted`; continue; }
    if (L.skip === 'nofood') { it.st = 'none'; it.why = 'No food named on this line'; continue; }
    if (!it.p) { it.st = 'none'; it.why = 'No matching food in Lumi. Pick one, or leave it out.'; it.code = null; continue; }
    const G = grams212(L, it.p); if (!G) { it.st = 'grams'; it.why = `Lumi has no USDA ${L.unit ? '“' + L.unit + '”' : 'size'} measure for this food. Enter grams to count it.`; continue; }
    it.g = G.g; it.how = G.how; it.st = it.sure ? 'ok' : 'check'; if (L.range) it.how += ' (middle of the range)'; }
  return out; }
function total212(items) { const F = ['carbs', 'sugars', 'fiber', 'protein', 'fat', 'sat', 'trans', 'sodiumMg', 'kcal'], T = {}, miss = {}; F.forEach(f => T[f] = 0); let g = 0, added = 0, addedKnown = true; const addNote = [];
  for (const it of items) { if (!(it.st === 'ok' || it.st === 'check') || !it.p) continue; const k = it.g / 100, n = it.p.n || {}; g += it.g;
    for (const f of F) { if (n[f] == null) { if (f !== 'trans') (miss[f] = miss[f] || []).push(it.p.name); } else T[f] += n[f] * k; }
    if (n.added != null) added += n.added * k; else if (SWEET212.test(it.p.name)) added += (n.sugars || 0) * k; else if (BASIC212.test(it.p.name) || !(n.sugars > 0)) {} else { addedKnown = false; addNote.push(it.p.name); } }
  return { T, g, added: addedKnown ? added : null, miss, addNote }; }
function product212(x, items, sv) { const n = {}; for (const [k, v] of Object.entries(x.T)) n[k] = x.miss[k] ? (v > 0 ? v / x.g * 100 : null) : v / x.g * 100; n.added = x.added == null ? null : x.added / x.g * 100; n.polyols = null; if (x.miss.trans) n.trans = null;
  const sg = x.g / sv, nm = (rs212.name || '').trim() || 'My recipe', used = items.filter(i => i.st === 'ok' || i.st === 'check');
  return { id: 'rs212', code: '', src: 'custom', name: nm, brand: 'Recipe (scored)', qty: '', img: '', servQ: r20(sg), serv: `1 of ${sv} serving${sv === 1 ? '' : 's'} (${Math.round(sg)} g)`, nova: null, additives: [],
    ing: used.map(i => i.p.name).join(', '), cat: 'Recipe', cats: '', naLabel: true, liquid: false, portions: [[`1 serving (${Math.round(sg)} g)`, r20(sg)]],
    meta: { src: 'Built from USDA FoodData Central values for each ingredient', perItem: false, recipe: { servings: sv, lines: items.map(i => ({ line: i.L.raw, food: i.p && (i.st === 'ok' || i.st === 'check') ? i.p.name : null, g: i.st === 'ok' || i.st === 'check' ? r20(i.g) : null })) } }, n }; }
const BADGE212 = { ok: ['Matched', 'b-ok'], check: ['Check match', 'b-ck'], grams: ['Needs grams', 'b-no'], none: ['Not matched', 'b-no'], skip: ['Not counted', 'b-sk'] };
async function score212() { const out = $('#rs212r'); if (!out) return; rs212.text = $('#rs212t').value; rs212.name = $('#rs212n').value; rs212.sv = $('#rs212v').value; save212();
  if (!rs212.text.trim()) { out.innerHTML = ''; return; } out.innerHTML = '<div class="skel" style="height:160px"></div>';
  try { await loadIndex(); } catch {} const items = await lines212(); if (!$('#rs212r')) return; const sv = Math.max(1, Math.round(+rs212.sv || 0)) || 1, svSet = +rs212.sv >= 1;
  const flag = items.filter(i => i.st === 'none' || i.st === 'grams'), skip = items.filter(i => i.st === 'skip' && i.L.skip !== 'heading'), used = items.filter(i => i.st === 'ok' || i.st === 'check');
  let sumH = '';
  if (used.length) { const x = total212(items), p = product212(x, items, sv); let sc = null, h = null; try { sc = LumiScore.score(p); } catch {} try { h = LumiHealth.rate(p, { whole: false, group: '' }); } catch {}
    const k = p.servQ / 100, ps = f => p.n[f] == null ? null : p.n[f] * k; const missF = Object.keys(x.miss).filter(f => f !== 'trans');
    sumH = `<div class="card sum212" aria-live="polite"><h2>Per serving</h2><div class="sh212">${scores20(h && h.score, sc && sc.score)}<p class="small">1 of ${sv} serving${sv === 1 ? '' : 's'}, about <b>${Math.round(p.servQ)} g</b>${svSet ? '' : ' (servings not set, so this is the whole recipe; set servings above)'}.</p></div>
      <div class="bt20g ng212"><div class="key"><small>Sugar</small><b>${fmt20(ps('sugars'))} g</b></div><div class="key"><small>Total carbs</small><b>${fmt20(ps('carbs'))} g</b></div><div><small>Added sugar</small><b>${x.added == null ? '—' : fmt20(x.added / sv) + ' g'}</b></div><div><small>Fiber</small><b>${fmt20(ps('fiber'))} g</b></div><div><small>Protein</small><b>${fmt20(ps('protein'))} g</b></div><div><small>Fat</small><b>${fmt20(ps('fat'))} g</b></div><div><small>Calories</small><b>${fmt20(ps('kcal'))}</b></div><div><small>Sodium</small><b>${fmt20(ps('sodiumMg'))} mg</b></div></div>
      <p class="small">Whole recipe: ${Math.round(x.g)} g · ${fmt20(x.T.sugars)} g sugar · ${fmt20(x.T.carbs)} g total carbs, from ${used.length} counted line${used.length === 1 ? '' : 's'}.</p>
      ${flag.length || skip.length ? `<p class="nt212"><b>${flag.length + skip.length} line${flag.length + skip.length === 1 ? ' is' : 's are'} not in these totals.</b> See the flagged lines below.</p>` : ''}
      ${missF.length ? `<p class="small">USDA has no value for ${missF.map(f => `<b>${esc(NL20(f))}</b> (${esc(x.miss[f].slice(0, 3).map(short212).join(', '))}${x.miss[f].length > 3 ? '…' : ''})`).join('; ')}; those totals count only ingredients with data.</p>` : ''}
      ${x.added == null ? `<p class="small">Added sugar is unknown for ${esc(x.addNote.slice(0, 3).map(short212).join(', '))}, so scores use total sugar and the ingredient list.</p>` : '<p class="small">Added sugar counts sweeteners (sugar, honey, syrups) in full; basic foods like milk, fruit and flour count as 0 added.</p>'}
      <div class="acts211"><button type="button" class="btn pri" id="rs212s">Save to My foods</button></div></div>`; window.__rs212p = p; }
  else sumH = `<div class="card sum212"><h2>No totals yet</h2><p class="small">None of the lines could be matched and measured. Pick foods or enter grams for the flagged lines below.</p></div>`;
  const row = it => { const [bl, bc] = BADGE212[it.st]; const L = it.L, k = esc(L.raw);
    return `<li class="ln212 st-${it.st}" data-k="${k}"><div class="lh212"><span class="bd212 ${bc}">${bl}</span><span class="lr212">${esc(L.raw)}</span></div>
     ${it.p && it.st !== 'skip' ? `<div class="lm212"><span>→ <a href="#/product/${esc(it.code)}">${esc(it.p.name)}</a>${it.user ? ' <small>(your pick)</small>' : ''}</span>${it.g != null ? `<span class="lg212"><b>${fmt20(it.g)} g</b> <small>${esc(it.how)}</small></span>` : ''}</div>` : ''}
     ${it.why ? `<p class="why212">${esc(it.why)}</p>` : ''}${it.st === 'check' ? '<p class="why212">Lumi\'s closest USDA food for this wording. Change it if it\'s wrong.</p>' : ''}
     ${L.skip === 'heading' ? '' : `<div class="le212">${it.st === 'skip' && it.ov.off ? `<button type="button" class="btn sm" data-on="${k}">Count it again</button>` : `<button type="button" class="btn sm" data-ch="${k}">${it.p ? 'Change food' : 'Find food'}</button>
       ${it.p ? `<label class="gi212"><span>Grams</span><input type="number" min="0" step="any" inputmode="decimal" data-g="${k}" value="${it.ov.g > 0 ? it.ov.g : ''}" placeholder="${it.g != null ? fmt20(it.g) : 'g'}" aria-label="Grams of ${k}"></label>` : ''}
       <button type="button" class="btn sm ghost" data-off="${k}">Don't count</button>`}</div><div class="fs212" hidden></div>`}</li>`; };
  out.innerHTML = `${flag.length ? `<div class="card fl212"><h2>Flagged: ${flag.length} line${flag.length === 1 ? '' : 's'} not counted</h2><p class="small">Lumi didn't guess these. Pick a food or enter grams to count them, or leave them out.</p><ul class="li212">${flag.map(row).join('')}</ul></div>` : ''}
    ${sumH}<div class="card"><h2>Ingredients</h2><ul class="li212">${items.filter(i => !flag.includes(i)).map(row).join('')}</ul></div>
    <p class="foot">Nutrition per ingredient is USDA FoodData Central data as matched by Lumi; amounts are as written before cooking. Informational only.</p>`;
  bind212(); }
const short212 = s => String(s).split(',').slice(0, 2).join(',');
const NL20 = f => ({ carbs: 'carbs', sugars: 'sugar', fiber: 'fiber', protein: 'protein', fat: 'fat', sat: 'saturated fat', sodiumMg: 'sodium', kcal: 'calories' })[f] || f;
function bind212() { const ov = k => rs212.ov[k] = rs212.ov[k] || {};
  app.querySelectorAll('[data-off]').forEach(b => b.onclick = () => { ov(b.dataset.off).off = true; save212(); score212(); });
  app.querySelectorAll('[data-on]').forEach(b => b.onclick = () => { delete ov(b.dataset.on).off; save212(); score212(); });
  app.querySelectorAll('[data-g]').forEach(i => i.onchange = () => { const v = +i.value; if (v > 0) ov(i.dataset.g).g = v; else delete ov(i.dataset.g).g; save212(); score212(); });
  app.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { const li = b.closest('li'), box = li.querySelector('.fs212'); box.hidden = !box.hidden; if (box.hidden) return; const k = b.dataset.ch, L = parseLine212(k);
    box.innerHTML = `<label class="field"><span>Search USDA foods</span><input type="search" class="in11" value="${esc(N212(L.food).replace(PREP212, ' ').replace(/\s+/g, ' ').trim())}" autocomplete="off"></label><ul class="sr212" role="list"></ul>`;
    const inp = box.querySelector('input'), ul = box.querySelector('ul'); const go = () => { const q = inp.value.trim(); if (!q) { ul.innerHTML = ''; return; } const seen = new Set(), res = [];
      for (const d of engine.search(q, { limit: 8, filter: d => d.src === 'whole' }).concat(engine.search(q, { limit: 12 }))) if (!seen.has(d.code) && d.src !== 'rest' && res.length < 8) { seen.add(d.code); res.push(d); }
      ul.innerHTML = res.length ? res.map(d => `<li><button type="button" class="pk212" data-pick="${esc(d.code)}">${esc(d.name)}${d.brand ? ` <small>${esc(d.brand)}</small>` : ''}</button></li>`).join('') : '<li class="small">No foods match. Try a simpler word.</li>';
      ul.querySelectorAll('[data-pick]').forEach(x => x.onclick = () => { const o = ov(k); o.code = x.dataset.pick; delete o.off; save212(); score212(); }); };
    inp.oninput = () => { clearTimeout(inp.t); inp.t = setTimeout(go, 200); }; go(); inp.focus(); });
  const s = $('#rs212s'); if (s) s.onclick = () => { const p = window.__rs212p; if (!p) return; const q = JSON.parse(JSON.stringify(p)); q.id = 'c-rs' + Date.now().toString(36); store.set('custom', [q, ...customFoods()]); remember(q); toast('Saved to My foods'); location.hash = '#/product/' + q.id; }; }
function viewRecipeScore212() {
  document.title = 'Score a recipe — Lumi'; const svv = rs212.sv || '';
  app.innerHTML = `<section class="rs212"><h1>Score a recipe</h1><p class="lead">Paste a recipe link or its ingredient list. Lumi matches each line to USDA foods, adds them up and scores one serving.</p>
   <div class="card"><form id="rs212u" class="ur212"><label class="field"><span>Recipe link</span><input id="rs212url" type="url" inputmode="url" class="in11" placeholder="https://…" value="${esc(rs212.url || '')}" autocomplete="off"></label><button class="btn" type="submit">Read recipe</button></form>
    <div id="rs212m" role="status" aria-live="polite">${fetchMsg212 ? `<p class="nt212">${esc(fetchMsg212)}</p>` : ''}</div>
    <p class="small">Works when the recipe site publishes standard recipe data and allows other apps to read it. Many don't; then paste the ingredients.</p>
    <label class="field"><span>Ingredients, one per line</span><textarea id="rs212t" rows="8" placeholder="2 cups all-purpose flour&#10;1 cup sugar&#10;2 large eggs&#10;1 (15 oz) can black beans, drained">${esc(rs212.text || '')}</textarea></label>
    <div class="rf212"><label class="field"><span>Recipe name</span><input id="rs212n" class="in11" value="${esc(rs212.name || '')}" placeholder="e.g. Banana bread" autocomplete="off"></label>
     <label class="field sv212"><span>Servings</span><input id="rs212v" class="in11" type="number" min="1" step="1" inputmode="numeric" value="${esc(svv)}" placeholder="e.g. 8"></label></div>
    <div class="acts211"><button type="button" class="btn pri" id="rs212go">Score recipe</button><button type="button" class="btn ghost" id="rs212x">Clear</button><a class="btn ghost" href="#/recipes">My recipes</a></div></div>
   <div id="rs212r"></div></section>`;
  $('#rs212u').onsubmit = e => { e.preventDefault(); rs212.url = $('#rs212url').value.trim(); save212(); fetchUrl212(rs212.url); };
  $('#rs212go').onclick = () => score212(); $('#rs212v').onchange = () => score212(); $('#rs212n').onchange = () => score212();
  $('#rs212x').onclick = () => { rs212 = { url: '', name: '', sv: '', text: '', ov: {} }; fetchMsg212 = ''; save212(); viewRecipeScore212(); };
  if (rs212.text.trim()) score212(); }
/* ---------- wiring ---------- */
if (typeof SC74 !== 'undefined') SC74.push(['#/recipescore', 'Score a recipe']);
if (typeof tab19 === 'function') { const t212 = tab19; tab19 = function (view) { if (view === 'recipescore') return t212.call(this, 'recipes'); return t212.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh212 = viewHome; viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), v = h.split('/')[0]; if (v === 'recipescore') return viewRecipeScore212(); return vh212.apply(this, arguments); }; }
if (typeof viewRecipes12 === 'function') { const vr212 = viewRecipes12; viewRecipes12 = function () { const r = vr212.apply(this, arguments); try { const h = app.querySelector('section h1, header h1'); if (h && !$('#rs212c')) (h.closest('header') || h).insertAdjacentHTML('afterend', '<p class="chips" id="rs212c"><a class="chip" href="#/recipescore">🔗 Score a recipe from a link or pasted text</a></p>'); } catch {} return r; }; }
const BOOK212 = (n = 24) => `<svg class="i10" viewBox="0 0 24 24" width="${n}" height="${n}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/></svg>`;
function deco212() { try { const a = document.querySelector('.sc74 a[href="#/recipescore"]'); if (a && !a.querySelector('.t10') && document.querySelector('.sc74 .t10')) a.innerHTML = `<span class="t10">${BOOK212()}</span><span>Score a recipe</span>`; } catch {} }
{ let q212 = 0; new MutationObserver(() => { if (!q212) q212 = requestAnimationFrame(() => { q212 = 0; deco212(); }); }).observe(document.body, { childList: true, subtree: true }); }
if (/^#\/(recipescore|recipes)/.test(location.hash) || (document.querySelector('.sc74') && !document.querySelector('.sc74 a[href="#/recipescore"]'))) route();
deco212();
