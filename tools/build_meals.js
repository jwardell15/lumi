// v13.0: meal-idea pool from REAL Lumi data only (USDA staples by FDC id, popular packaged items, chain menu items).
// usage: node tools/build_meals.js /workspace/m121/generic121.jsonl  -> data/meals13.json
const fs = require('fs'), path = require('path');
const S = require('../js/score.js'), AI = require('../js/aisles.js'), ST = require('../js/stores.js');
const out = path.join(__dirname, '..', 'data'); const G = new Map();
for (const l of fs.readFileSync(process.argv[2], 'utf8').split('\n')) if (l) { const r = JSON.parse(l); G.set(r.id, r); }
const r1 = v => v == null ? null : Math.round(v * 10) / 10;
const per = (n, g) => { const k = x => n[x] == null ? null : r1(n[x] * g / 100); const c = k('carbs'), f = k('fiber'); return { c, f, p: k('protein'), fat: k('fat'), kcal: n.kcal == null ? null : Math.round(n.kcal * g / 100), net: c }; };
// [fdc id, role(s), grams, portion label, swap group, aisle, short name]
// roles: pro=protein main, bfm=breakfast main, bfc=breakfast carb, ext=extra, veg, sta=starch side, fru=fruit, snk=snack, drk=drink
const SP = [
 ['fdc-171477', 'pro', 85, '3 oz', 'poultry', 'meat', 'Roast chicken breast'],
 ['fdc-174516', 'pro', 85, '3 oz', 'poultry', 'meat', 'Roast turkey breast'],
 ['fdc-175168', 'pro', 85, '3 oz', 'fish', 'meat', 'Salmon, cooked'],
 ['fdc-175178', 'pro', 85, '3 oz', 'fish', 'meat', 'Cod, cooked'],
 ['fdc-175180', 'pro', 85, '3 oz', 'fish', 'meat', 'Shrimp, cooked'],
 ['fdc-334194', 'pro', 85, '3 oz', 'fish', 'canned', 'Tuna, canned in water'],
 ['fdc-174753', 'pro', 85, '3 oz patty', 'beef', 'meat', 'Lean beef patty (93%)'],
 ['fdc-174290', 'pro', 91, '1/5 block', 'plant', 'produce', 'Tofu, extra firm'],
 ['fdc-172187', 'bfm', 122, '2 large eggs', 'eggs', 'dairy', 'Scrambled eggs'],
 ['fdc-173424', 'bfm snk', 100, '2 large eggs', 'eggs', 'dairy', 'Hard-boiled eggs'],
 ['fdc-173423', 'bfm', 92, '2 large eggs', 'eggs', 'dairy', 'Fried eggs'],
 ['fdc-330137', 'bfm snk', 170, '1 container (170 g)', 'yogurt', 'dairy', 'Greek yogurt, plain nonfat'],
 ['fdc-173417', 'bfm snk', 113, '1/2 cup', 'cottage', 'dairy', 'Cottage cheese, 1%'],
 ['fdc-172688', 'bfc sta', 32, '1 slice', 'bread', 'bakery', 'Whole-wheat bread'],
 ['fdc-175063', 'bfc', 57, '1 muffin', 'bread', 'bakery', 'English muffin'],
 ['fdc-173905', 'bfc', 175, '3/4 cup', 'oats', 'bfast', 'Oatmeal, cooked'],
 ['fdc-175047', 'bfc', 76, '2 pancakes (4")', 'pancake', 'baking', 'Buttermilk pancakes'],
 ['fdc-175036', 'bfc sta', 48, '2 corn tortillas', 'tortilla', 'bakery', 'Corn tortillas'],
 ['fdc-174081', 'bfc sta', 41, '1 tortilla', 'tortilla', 'bakery', 'Whole-wheat tortilla'],
 ['fdc-168322', 'ext', 23, '2 slices', 'bacon', 'meat', 'Bacon'],
 ['fdc-328637', 'ext', 17, '1 slice', 'cheese', 'dairy', 'Cheddar cheese'],
 ['fdc-171706', 'ext', 50, '1/3 avocado (50 g)', 'avocado', 'produce', 'Avocado'],
 ['fdc-174266', 'ext', 32, '2 tbsp', 'nutbutter', 'pantry', 'Peanut butter'],
 ['fdc-746778', 'drk', 245, '1 cup', 'milk', 'dairy', 'Milk, 2%'],
 ['fdc-168510', 'veg', 156, '1 cup', 'veg', 'produce', 'Broccoli, cooked'],
 ['fdc-168462', 'veg', 60, '2 cups', 'greens', 'produce', 'Spinach, raw'],
 ['fdc-169247', 'veg', 94, '2 cups shredded', 'greens', 'produce', 'Romaine lettuce'],
 ['fdc-169141', 'veg', 125, '1 cup', 'veg', 'produce', 'Green beans, cooked'],
 ['fdc-168520', 'veg', 124, '1 cup', 'veg', 'produce', 'Cauliflower, cooked'],
 ['fdc-169292', 'veg', 180, '1 cup sliced', 'veg', 'produce', 'Zucchini, cooked'],
 ['fdc-168390', 'veg', 90, '1/2 cup', 'veg', 'produce', 'Asparagus, cooked'],
 ['fdc-168568', 'veg snk', 85, '85 g (about 8)', 'veg', 'produce', 'Baby carrots'],
 ['fdc-168409', 'veg', 104, '1 cup slices', 'veg', 'produce', 'Cucumber'],
 ['fdc-168411', 'veg snk', 78, '1/2 cup', 'veg', 'frozen', 'Edamame'],
 ['fdc-169704', 'sta', 101, '1/2 cup', 'rice', 'pantry', 'Brown rice, cooked'],
 ['fdc-168878', 'sta', 79, '1/2 cup', 'rice', 'pantry', 'White rice, cooked'],
 ['fdc-168917', 'sta', 92, '1/2 cup', 'rice', 'pantry', 'Quinoa, cooked'],
 ['fdc-168910', 'sta', 117, '1 cup', 'pasta', 'pantry', 'Whole-wheat pasta, cooked'],
 ['fdc-168928', 'sta', 124, '1 cup', 'pasta', 'pantry', 'Pasta, cooked'],
 ['fdc-168483', 'sta', 114, '1 medium', 'potato', 'produce', 'Sweet potato, baked'],
 ['fdc-170093', 'sta', 173, '1 medium', 'potato', 'produce', 'Baked potato'],
 ['fdc-173735', 'sta', 86, '1/2 cup', 'beans', 'pantry', 'Black beans, cooked'],
 ['fdc-172421', 'sta', 99, '1/2 cup', 'beans', 'pantry', 'Lentils, cooked'],
 ['fdc-168204', 'fru snk', 172, '1 medium', 'fruit', 'produce', 'Apple'],
 ['fdc-173944', 'fru snk', 118, '1 medium', 'fruit', 'produce', 'Banana'],
 ['fdc-167762', 'fru snk', 152, '1 cup halves', 'berries', 'produce', 'Strawberries'],
 ['fdc-167755', 'fru snk', 123, '1 cup', 'berries', 'produce', 'Raspberries'],
 ['fdc-171711', 'fru snk', 74, '1/2 cup', 'berries', 'produce', 'Blueberries'],
 ['fdc-174683', 'fru snk', 126, '1 cup (126 g)', 'fruit', 'produce', 'Grapes'],
 ['fdc-169097', 'fru snk', 131, '1 orange', 'fruit', 'produce', 'Orange'],
 ['fdc-170567', 'snk', 28, '1 oz (about 23)', 'nuts', 'snacks', 'Almonds'],
 ['fdc-170187', 'snk', 28, '1 oz', 'nuts', 'snacks', 'Walnuts'],
 ['fdc-174289', 'snk ext', 30, '2 tbsp', 'dip', 'deli', 'Hummus'],
 ['fdc-167959', 'snk', 24, '3 cups popped', 'popcorn', 'snacks', 'Popcorn, air-popped'],
 ['fdc-170847', 'snk ext', 28, '1 oz', 'cheese', 'dairy', 'Mozzarella, part skim'],
];
const items = [], miss = [];
for (const [id, roles, g, lab, sg, aisle, short] of SP) { const r = G.get(id); if (!r) { miss.push(id); continue; } const v = per(r.n, g); if (v.c == null || v.p == null || v.fat == null || v.kcal == null) { miss.push(id + ' incomplete'); continue; }
  items.push({ id, nm: short, full: r.name, br: '', ro: roles.split(' '), g, pl: lab, sg, ai: aisle, src: r.src, ...v }); }
// popular packaged: index-0 = most popular US products; per serving from the label
const idx0 = JSON.parse(fs.readFileSync(path.join(out, 'index-0.json'), 'utf8')); const SUBS = AI.SUB.map(s => s[0]);
const PK = { 'bk-tortilla': ['bfc sta', 'tortilla'], 'bk-bread': ['bfc sta', 'bread'], 'bf-oat': ['bfc', 'oats'], 'bf-cereal': ['bfc', 'cereal'], 'bf-granola': ['bfc', 'cereal'], 'dy-yogurt': ['bfm snk', 'yogurt'], 'sn-bars': ['snk', 'bar'], 'sn-chips': ['snk', 'chips'], 'sn-nuts': ['snk', 'nuts'], 'sn-jerky': ['snk', 'jerky'], 'sn-crackers': ['snk', 'crackers'], 'sn-popcorn': ['snk', 'popcorn'], 'dy-cheese': ['snk ext', 'cheese'], 'dy-plantmilk': ['drk', 'milk'] };
const shard = new Map(); const det = code => { const k = code.slice(-3); if (!shard.has(k)) shard.set(k, JSON.parse(fs.readFileSync(path.join(out, 'd', k + '.json'), 'utf8'))); return shard.get(k)[code]; };
const LS = require('../js/search.js'); const KB = LS.KNOWNB || (global.LumiSearch && global.LumiSearch.KNOWNB); const cnt = {}, SEEN = new Set();
for (const d of idx0.docs) { const sub = SUBS[d[14]]; const pk = PK[sub]; if (!pk || (cnt[sub] || 0) >= 14) continue; if (d[10] & 8) continue; if (!(d[0].length === 12 || (d[0].length === 13 && d[0][0] === '0'))) continue; if (!d[2] || !/^[\x20-\x7e’]+$/.test(d[1] + d[2]) || (KB && !KB.test(d[2]))) continue; const c = det(d[0]); if (!c) continue; const p = S.fromCompact(c);
  const sq = +p.servQ; if (!(sq >= 10 && sq <= 300)) continue; const n = p.n; if ([n.carbs, n.protein, n.fat, n.kcal].some(x => x == null)) continue; const q = S.quality(p); if (!q.ok) continue;
  if (/\b(kids?|variety pack|assorted)\b/i.test(p.name) || p.name.length > 60) continue;
  const dk = (p.brand + '|' + p.name).toLowerCase().replace(/[^a-z0-9|]/g, ''); if (SEEN.has(dk)) continue; SEEN.add(dk); const v = per(n, sq); const sm = d[13]; items.push({ id: d[0], nm: p.name, br: p.brand || '', ro: pk[0].split(' '), g: sq, pl: p.serv || `${sq} g`, sg: pk[1], ai: AI.AISLES.find(a => a[0] === AI.SUB[d[14]][1])[0], sub, sm, pk: 1, ...v }); cnt[sub] = (cnt[sub] || 0) + 1; }
// restaurant meal picks: main + side + drink per chain, only from categories classified reliably
const MAING = /^(Entrees|Entrées|Sandwiches|Burgers|Pizza|Salads|Breakfast)$/, SIDEG = /^(Appetizers & Sides|Fried Potatoes|Sides)$/, DRINKG = /^(Beverages|Drinks|Coffee)$/, FOODW = /\b(steak|chicken|beef|turkey|ham|cheese|egg|bacon|sausage|pork|fish|shrimp)\b/i;
const ALC = /\b(beer|wine|margarita|martini|sangria|mimosa|cocktail|ale|lager|ipa|vodka|whiske?y|rum|tequila|bourbon|mojito|daiquiri|spritz|mule|sake|seltzer, hard|hard seltzer)\b/i;
const NOT = /\b(kids?|child|sauce|dressing|dip|topping|add|extra|only|substitute|bun|tortilla|condiment|packet|catering|family|party|platter for|tray|gallon|box of|dozen|bucket)\b/i;
const MAINK = /\b(burger|cheeseburger|sandwich|wrap|burrito|bowl|taco|tacos|quesadilla|salad|pizza|slice|sub|tenders|strips|nuggets|wings|hot dog|runza|omelet|chicken bake|biscuit|croissant|platter|plate|entree|entrée)\b/i;
const SIDEK = /\b(fries|french fries|tots|tater|coleslaw|cole slaw|slaw|fruit cup|apple slices|mashed potatoes|green beans|corn on the cob|corn cup|sweet corn|mac (and|&) cheese|onion rings|side salad|baked potato|hash ?browns?|side)\b/i;
const DRINKK = /\b(water|soda|pepsi|coke|coca-cola|sprite|diet|iced tea|tea|coffee|lemonade|dr pepper|root beer|mountain dew|brisk|lipton|unsweetened)\b/i;
const SHAKE = /\b(shake|malt|smoothie|frapp|freeze|float|blizzard|concrete|latte|mocha|frozen)\b/i;
const SIDEX = /\b(pickles?|bacon|cheese sauce|sour cream|guacamole|queso|salsa|butter|syrup|jelly|ketchup)\b/i;
const chains = {}, R = []; let used = 0;
for (const r of G.values()) { if (!r.keys || !r.keys.includes('rest')) continue; const slug = (r.keys.find(k => k.startsWith('rest-')) || '').slice(5); if (!slug) continue;
  const g = r.perItem ? 100 : (r.portions && r.portions[0] && r.portions[0][1]) || null; if (!g) continue; const v = per(r.n, g); if (v.c == null || v.kcal == null) continue;
  const nm = r.name; let role = null;
  if (r.group) { if (MAING.test(r.group) && !NOT.test(nm) && v.kcal >= 250 && !(r.group === 'Salads' && /side/i.test(nm))) role = 'main'; else if (SIDEG.test(r.group) && !SIDEX.test(nm) && v.kcal >= 60 && v.kcal < 600 && !NOT.test(nm)) role = 'side'; else if (DRINKG.test(r.group) && !ALC.test(nm) && !SHAKE.test(nm) && !FOODW.test(nm) && DRINKK.test(nm) && !/\b(gallon|catering)\b/i.test(nm) && !/\bice\b(?! ?tea)/i.test(nm)) role = 'drink'; }
  else { if (DRINKK.test(nm) && !FOODW.test(nm) && !/\b(gallon|catering|box)\b/i.test(nm) && !ALC.test(nm) && !SHAKE.test(nm) && !MAINK.test(nm)) role = 'drink'; else if (SIDEK.test(nm) && !SIDEX.test(nm) && v.kcal >= 60 && !MAINK.test(nm.replace(/side salad/i, '')) && !NOT.test(nm.replace(/\bside\b/i, '')) && v.kcal < 600) role = 'side'; else if (MAINK.test(nm) && !NOT.test(nm) && !SIDEK.test(nm) && v.kcal >= 250) role = 'main'; }
  if (!role) continue; (chains[slug] = chains[slug] || { name: r.brand, main: [], side: [], drink: [] })[role].push({ id: r.id, nm, pl: r.portions && r.portions[0] ? r.portions[0][0] : '1 item', ...v }); }
/* v16: a side must suit its main (no "Pizza Sub + Hash Browns", "Cobb Salad + Hashbrowns", "Taco + Hash Brown"). */
const BFM16 = /breakfast|biscuit|croissant|omelet|mc ?muffin|english muffin|bagel|pancake|hotcake|\bwaffles?\b(?! fries)|\beggs?\b|scramble|wake-up|french toast|grits|oatmeal|platter|sunrise|morning|yogurt|parfait/i;
const BFONLY16 = /hash ?(browns?|rounds)|hashbrowns?|hashrounds|\beggs?\b|grits|sausage( patty)?|toast|bacon|pancake|biscuit/i, BFOK16 = /hash ?(browns?|rounds)|hashbrowns?|hashrounds|\beggs?\b|grits|sausage|toast|bacon|fruit|apple|yogurt|potatoes|berries|banana|oatmeal/i;
const PIZ16 = /pizza|calzone|stromboli/i, SAL16 = /salad|bowl\b/i, HEAVY16 = /fries|tots|tater|hash|chips|skins|cheetos|poppers|mashed|onion rings|potato salad|mac (and|&) cheese|pasta salad|macaroni/i, NOTSIDE16 = /chicken|nuggets?|tenders?|wings?|shrimp|ribs?\b|\bham\b|pork|patty|steak|chops?\b|beurre|sauce|dressing|hummus|gravy only|spam|scrapple|salmon|fish|tilapia|ranch|dip\b/i;
function fit16(m, s) { if (NOTSIDE16.test(s)) return false; const bf = BFM16.test(m) && !/burger|tenders|nuggets|steak(?! ?(&|and) ?egg)/i.test(m);
  if (bf) return BFOK16.test(s) && !/salad|slaw|fries|beans|corn|mac|mashed|gravy|chips|stuffed|mushroom/i.test(s) && !(/yogurt|parfait|oatmeal/i.test(m) && !/fruit|berries|banana|apple/i.test(s)); if (BFONLY16.test(s)) return false;
  if (PIZ16.test(m)) return /side salad|garden salad|caesar salad|fruit|breadsticks?/i.test(s) && !/potato|pasta|macaroni/i.test(s);
  if (SAL16.test(m) && !/burger|sandwich|wrap/i.test(m)) return !HEAVY16.test(s);
  return true; }
const RM = {}; let skipped = [];
for (const [slug, c] of Object.entries(chains)) { if (!c.main.length || (!c.side.length && !c.drink.length)) { skipped.push(c.name + ` (main ${c.main.length}/side ${c.side.length}/drink ${c.drink.length})`); continue; }
  const part = !c.side.length || !c.drink.length; // v15: 2-part meals only with a stricter side/main check
  const SIDE2 = /\b(fries|tots|slaw|green beans|asparagus|mushrooms|vegetables|corn|mashed|hash ?browns|carrots|squash|spinach|applesauce|side salad|potato salad|beans|broccoli|fruit)\b/i, NOS2 = /\b(chicken|wings?|shrimp|jerky|eggs?|dip|dipping|cup|tenders|meatballs|artichokes)\b/i, NOM2 = /a la carte|supplier|^\d+"? ?wrap$|^wrap$/i;
  const by = k => c[k].filter(x => x.net != null && (!part || (k === 'side' ? SIDE2.test(x.nm) && !NOS2.test(x.nm) : k === 'main' ? !NOM2.test(x.nm) : true))).sort((a, b) => a.net - b.net || a.kcal - b.kcal); const M = by('main'), Sd = by('side'), Dr = by('drink'); if (!M.length || (!Sd.length && !Dr.length)) { skipped.push(c.name + ' (no carb data)'); continue; }
  const meals = [], seen = new Set(); for (const m of M) { const base = m.nm.toLowerCase().replace(/,.*$|\(.*\)|\b(small|medium|large|regular|half|whole|\d+["”]?|single|double|triple)\b/g, '').replace(/\s+/g, ' ').trim(); if (seen.has(base)) continue; seen.add(base); const Sc = Sd.filter(x => fit16(m.nm, x.nm)); const s0 = Sc.length ? Sc[Math.min(meals.length, Sc.length - 1)] : null, s = s0 && (s0.net <= Sc[0].net + 6 ? s0 : Sc[0]); if (!s && !Dr.length) continue; meals.push([m, s, Dr[0]].filter(Boolean)); if (meals.length >= 3) break; }
  if (!meals.length) { skipped.push(c.name + ' (no sensible pairing)'); continue; }
  RM[slug] = { name: c.name, meals: meals.map(x => x.map(y => ({ id: y.id, nm: y.nm, pl: y.pl, c: y.c, f: y.f, p: y.p, fat: y.fat, kcal: y.kcal, net: y.net }))) }; }
const OUT = { v: '13.0', built: new Date().toISOString().slice(0, 10), items, rest: RM, note: 'Every value is Lumi data scaled to the stated portion. No invented nutrition.' };
fs.writeFileSync(path.join(out, 'meals13.json'), JSON.stringify(OUT));
console.log('staples+packaged', items.length, 'packaged', items.filter(x => x.pk).length, 'missing', miss, 'chains with picks', Object.keys(RM).length, 'skipped', skipped.length); fs.writeFileSync('/workspace/m13/skipped.json', JSON.stringify(skipped, null, 1));
