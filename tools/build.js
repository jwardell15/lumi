// Build Lumi's static search index + detail shards from extracted OFF records (JSONL).
// usage: node tools/build.js ../offdata/us.jsonl
const fs = require('fs'), path = require('path');
const S = require('../js/score.js'); const C = require('../js/cats.js'); const H = require('../js/health.js');
const SIDE = fs.existsSync(path.join(path.dirname(process.argv[2]), 'side.json')) ? JSON.parse(fs.readFileSync(path.join(path.dirname(process.argv[2]), 'side.json'), 'utf8')) : {};
const COV = {}; const cov = (k, r) => { const c = COV[k] = COV[k] || { n: 0, rated: 0, full: 0, nutritionOnly: 0, estimated: 0, unrated: 0, reasons: {} }; c.n++; if (r.score == null) { c.unrated++; c.reasons[r.reason] = (c.reasons[r.reason] || 0) + 1; } else { c.rated++; c[r.basis === 'full' ? 'full' : 'nutritionOnly']++; if (r.est.length) c.estimated++; } };
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ref/additives.json'), 'utf8')); H.addSyn(REF.syn);
const ORG = /\borganic\b/i; const D = require('../js/diet.js');
const SIDE2 = fs.existsSync(path.join(path.dirname(process.argv[2]), 'side2.json')) ? JSON.parse(fs.readFileSync(path.join(path.dirname(process.argv[2]), 'side2.json'), 'utf8')) : {};
const ALC = {}; const alc = (k, m) => { const c = ALC[k] = ALC[k] || { n: 0, ingredientsKnown: 0, anyAllergen: 0 }; c.n++; if (m.df & 1) c.ingredientsKnown++; if (m.am) c.anyAllergen++; };
// v6.1: cross-source merge (OFF CSV extract + USDA Branded by GTIN with leading zeros stripped, so UPC-A/EAN-13/GTIN-14 all match)
const M61 = process.env.LUMI_MERGE || '/workspace/m63/'; const rj = f => fs.existsSync(M61 + f) ? JSON.parse(fs.readFileSync(M61 + f, 'utf8')) : {};
const OX = rj('offx.json'), UX = rj('usdax.json');
for (const o of Object.values(OX)) { if (/^\d{9,11}$/.test(o.mod || '')) o.mod = new Date(o.mod * 1000).toISOString().slice(0, 10); else if (o.mod) o.mod = String(o.mod).slice(0, 10); }
const OFFIMG = /^https:\/\/images\.openfoodfacts\.org\/images\/products\/[0-9\/]+\/[a-z0-9_]+\.\d+\.\d+\.jpg$/;
const oxOk = o => o && /^\d{4}-\d\d-\d\d$/.test(o.mod || '') && (!o.img || OFFIMG.test(o.img)) && !/^https?:/.test(o.ing || '');
const WATCH8 = require('../js/watch8.js').map(x => new RegExp(x[2].source, 'i')); const wflags = ing => { let m = 0; if (ing) WATCH8.forEach((re, i) => { if (re.test(ing)) m |= 1 << i; }); return m; };
const cleanIng = t => (t || '').replace(/^\s*ingredients?\s*:\s*/i, '').trim();
const NKs = ['carbohydrates', 'sugars', 'fiber', 'proteins', 'fat', 'saturated-fat', 'sodium', 'energy-kcal'];
const cmpl = n => n ? NKs.filter(k => n[k] != null).length : 0;
const nutArr = m => [m.carbohydrates, m.sugars, m['added-sugars'], m.fiber, m.proteins, m.fat, m['saturated-fat'], m['trans-fat'], m.sodium == null ? null : m.sodium * 1000, m['energy-kcal'], m.polyols].map(v => v == null ? null : Math.round(v * 10) / 10);
const ST = {}; const st = (k, f) => { const c = ST[k] = ST[k] || { n: 0, photoBefore: 0, photoAfter: 0, ingBefore: 0, ingAfter: 0, verifiableBefore: 0, verifiableAfter: 0, nutritionSwapped: 0, altNutrition: 0, ingFrom: {} }; f(c); };
const audit = { total: 0, carbsUnknown: 0, inconsistent: 0, fiberDropped: 0, zeroCarbOk: 0, issues: {} };
const src = process.argv[2]; const out = path.join(__dirname, '..', 'data');
// v7.1: keep data/cos (cosmetics, built separately by build_cos.js); only clear what this script writes
for (const f of fs.existsSync(out) ? fs.readdirSync(out) : []) if (f === 'd' || f === 'g' || /^index-.*\.json$|^meta\.json$/.test(f)) fs.rmSync(path.join(out, f), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'd'), { recursive: true });
const IMG = 'https://images.openfoodfacts.org/images/products/';
const lines = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean);
const nOFF = lines.length;
// v4.1: extra US products from USDA Branded Foods (no photos), deduped and ordered by completeness/recency
const xsrc = process.argv[4]; let nX = 0;
if (xsrc) {
  const X = fs.readFileSync(xsrc, 'utf8').split('\n').filter(Boolean).map(JSON.parse); // v6.3: every USDA GTIN not in OFF (deduped by normalized GTIN in prep63.py, already ordered)
  const sc = r => (r.ing ? 2 : 0) + (r.servQ ? 1 : 0) + (r.n['saturated-fat'] != null ? 1 : 0) + (r.cats ? 2 : 0) + (r.date || '').slice(0, 4) / 1000;
  X.forEach(r => lines.push(JSON.stringify(r))); nX = X.length;
}
const ST63 = require('../js/stores.js'), AI = require('../js/aisles.js');
const BC = new Map(); for (const l of lines) { const m = l.match(/"brand":"((?:[^"\\]|\\.)*)"/); if (!m) continue; let b; try { b = JSON.parse('"' + m[1] + '"'); } catch { continue; } const k = ST63.key(b); if (!k) continue; const c = BC.get(k) || {}; c[b] = (c[b] || 0) + 1; BC.set(k, c); }
const pretty = b => b === b.toUpperCase() && /[A-Z]{3}/.test(b) ? b.toLowerCase().replace(/(^|[\s\-&/(])([a-z])/g, (m, a, c) => a + c.toUpperCase()).replace(/'S\b/g, "'s") : b;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)+$/; const unslug = b => b.replace(/-/g, ' ').replace(/(^|\s)([a-z])/g, (m, a, c) => a + c.toUpperCase());
const canonBrand = b => { const k = ST63.key(b); if (!k) return b || ''; const a = ST63.alias(b); if (a) return a; const c = BC.get(k); if (!c) return SLUG.test(b) ? unslug(b) : pretty(b); const top = Object.entries(c).sort((x, y) => (SLUG.test(x[0]) - SLUG.test(y[0])) || (y[0] !== y[0].toUpperCase()) - (x[0] !== x[0].toUpperCase()) || y[1] - x[1])[0][0]; return SLUG.test(top) ? unslug(top) : pretty(top); };
const A63 = { brandsBefore: BC.size, aisle: {}, stores: {}, pets: 0, photoOther: 0 };
const cats = [], catIdx = new Map(), docs = [], shards = {}; const seen = new Set();
const rnd = v => v == null ? null : Math.round(v * 10) / 10;
for (const l of lines) {
  const r = JSON.parse(l); if (seen.has(r.code)) continue; seen.add(r.code);
  if (AI.isPet(r.cats) || /\b(dog|cat|pet) (food|treats?)\b/i.test(r.name)) { A63.pets++; continue; }
  r.brand = canonBrand(r.brand);
  if (r.mod && /^\d{9,11}$/.test(r.mod)) r.mod = new Date(r.mod * 1000).toISOString().slice(0, 10); else if (r.mod) r.mod = String(r.mod).slice(0, 10);
  const isU = r.src === 'usda-branded'; const gk = r.code.replace(/^0+/, ''); const ox0 = OX[gk]; const ox = oxOk(ox0) ? ox0 : null; const ux = UX[gk];
  const SK = isU ? 'USDA Branded' : 'OFF'; const b4 = { img: !!r.img, ing: !!(r.ing && r.ing.trim()) };
  let s2b = SIDE2[r.code]; const dmB = D.analyze({ ing: r.ing, name: r.name, allergens: s2b && s2b[0], traces: s2b && s2b[1], analysis: s2b && s2b[2], labels: s2b && s2b[3] });
  const SRC = { n: isU ? 'u' : 'o', i: r.ing ? (isU ? 'u' : 'o') : '', p: r.img ? (r.ik === 'other' ? 'o2' : 'o') : '', om: ox ? ox.mod : (r.mod || ''), fdc: isU ? r.fdc : ux ? ux.fdc : 0, ud: isU ? r.date : ux ? ux.date : '' };
  if (isU && ux && cleanIng(ux.ing).length > (r.ing || '').length) r.ing = cleanIng(ux.ing);
  if (isU && ox) { if (ox.img && !r.img) { r.img = ox.img; SRC.p = ox.ik === 'other' ? 'o2' : 'o'; } if (!r.stores && ox.stores) r.stores = ox.stores; if (!r.offcats && ox.cats) r.offcats = ox.cats; if (!r.ing && ox.ing) { r.ing = ox.ing; SRC.i = 'o'; } if (!r.add && ox.add) r.add = ox.add; s2b = [ox.al, ox.tr, ox.an, ox.lb]; if (!r.cats && ox.cats) r.cats = ox.cats; }
  if (!isU && !r.ing && ux && cleanIng(ux.ing)) { r.ing = cleanIng(ux.ing); SRC.i = 'u'; }
  let ALT = null; { const oth = isU ? ox && ox.n : ux && ux.n; const od = isU ? ox && ox.mod : ux && ux.date; const md = isU ? r.date : ox ? ox.mod : '';
    const plaus = m => { const c = m.carbohydrates || 0, pr = m.proteins || 0, f = m.fat || 0, k = m['energy-kcal']; if (k == null) return false; const e = 4 * c + 4 * pr + 9 * f; return Math.abs(e - k) <= Math.max(15, 0.35 * Math.max(e, k)) && (m.sugars == null || m.sugars <= c + 0.5); };
    if (oth && oth.carbohydrates != null && oth['energy-kcal'] != null && plaus(oth) && !(oth['energy-kcal'] === 0 && (r.n['energy-kcal'] || 0) > 5)) { const a = cmpl(oth), b = cmpl(r.n);
      if (r.n.carbohydrates == null || !plaus(r.n) || a > b || (a === b && (od || '') > (md || ''))) { ALT = [SRC.n, nutArr(r.n)]; r.n = Object.assign({ polyols: r.n.polyols }, oth); SRC.n = isU ? 'o' : 'u'; } else ALT = [isU ? 'o' : 'u', nutArr(oth)]; } }
  const m = r.n; const sod = m.sodium;
  const nut = [m.carbohydrates, m.sugars, m['added-sugars'], m.fiber, m.proteins, m.fat, m['saturated-fat'], m['trans-fat'], sod == null ? null : sod * 1000, m['energy-kcal'], m.polyols].map(rnd);
  const img = r.img.startsWith(IMG) ? r.img.slice(IMG.length) : r.img;
  const liquid = S.isLiquid(r.cats, r.serv, r.name); const na = S.isNA(r.cty);
  const adds = S.addTags(r.add).filter(t => S.ADDITIVES[t] || H.ADD[t]).join(',');
  const cat = (r.cat || '').replace(/^\w\w:/, '');
  const comp = [r.code, r.name, r.brand, r.qty, img, r.servQ, r.serv, r.nova, nut, adds, r.ing, cat, (na ? 1 : 0) | (liquid ? 2 : 0) | (S.CARBY.test(r.cats + ' ' + r.cat) ? 4 : 0) | (S.DRY.test(r.cats + ' ' + r.cat) ? 8 : 0) | 16];
  if (r.src === 'usda-branded') comp.push(null, { src: 'USDA Branded Foods', url: `https://fdc.nal.usda.gov/food-details/${r.fdc}/nutrients`, date: r.date });
  const sd = SIDE[r.code]; const hx = { o: (sd && sd[0]) || ORG.test(r.name) ? 1 : 0, fv: sd && sd[1] != null ? sd[1] : null };
  const s2 = s2b; const dm = D.analyze({ ing: r.ing, name: r.name, allergens: s2 && s2[0], traces: s2 && s2[1], analysis: s2 && s2[2], labels: s2 && s2[3], organic: !!hx.o }); hx.am = dm.am; hx.tm = dm.tm; hx.df = dm.df; alc(SK, dm); hx.s = SRC; if (ALT) hx.alt = ALT;
  st(SK, c => { c.n++; c.photoBefore += b4.img; c.photoAfter += !!r.img; c.ingBefore += b4.ing; c.ingAfter += !!(r.ing && r.ing.trim()); c.verifiableBefore += dmB.df & 1; c.verifiableAfter += dm.df & 1; if (SRC.n !== (isU ? 'u' : 'o')) c.nutritionSwapped++; if (ALT) c.altNutrition++; if (SRC.i) c.ingFrom[SRC.i] = (c.ingFrom[SRC.i] || 0) + 1; });
  if (r.src !== 'usda-branded') comp.push(null, null); comp.push(hx);
  const p = S.fromCompact(comp); const s = S.score(p); audit.total++;
  const hr = H.rate(p, { organic: !!hx.o, fvl: hx.fv }); cov(r.src === 'usda-branded' ? 'USDA Branded (no photo)' : 'Open Food Facts', hr);
  const q = S.quality(p); q.issues.forEach(i => { i = i.replace(/\d+ kcal/g, 'n kcal'); audit.issues[i] = (audit.issues[i] || 0) + 1; });
  if (p.n.carbs == null) audit.carbsUnknown++; else if (!q.ok) audit.inconsistent++; else if (q.dropFiber) audit.fiberDropped++;
  if (q.ok && p.n.carbs === 0) audit.zeroCarbOk++;
  if (!catIdx.has(cat)) { catIdx.set(cat, cats.length); cats.push(cat); }
  const keys = C.match(r.cats).join('.');
  const parts = r.code.length > 8 ? r.code.padStart(13, '0').match(/^(...)(...)(...)(.*)$/).slice(1).join('/') : r.code;
  let short = img.replace(/\.(100|200|400|full)\.jpg$/, '');
  if (short.startsWith(parts + '/')) short = '~' + short.slice(parts.length + 1); else if (!img.startsWith('http')) short = img;
  const sm = ST63.mask(r.brand, r.stores); const ai = AI.classify({ cats: isU ? (r.offcats || '') : r.cats, ucat: r.ucat || (isU ? r.cat : ''), name: r.name, brand: r.brand || '', n: r.n });
  if (ai >= 0) A63.aisle[AI.SUB[ai][1]] = (A63.aisle[AI.SUB[ai][1]] || 0) + 1; else A63.aisle.none = (A63.aisle.none || 0) + 1;
  ST63.STORES.forEach((x, i) => { if (ST63.has(sm, i)) A63.stores[x[0] + ':brand'] = (A63.stores[x[0] + ':brand'] || 0) + 1; if (ST63.has(sm, ST63.SOLD + i)) A63.stores[x[0] + ':soldAt'] = (A63.stores[x[0] + ':soldAt'] || 0) + 1; });
  if (SRC.p === 'o2') A63.photoOther++;
  docs.push([r.code, r.name, r.brand, s.score == null ? -1 : s.score, s.score == null || s.net == null ? -1 : Math.round(s.net), catIdx.get(cat), img ? short : '', keys, m.sugars == null ? -1 : Math.round(m.sugars), hr.score == null ? -1 : hr.score, (hr.basis === 'nutrition' ? 1 : 0) | (hr.est.length ? 2 : 0) | (S.isFiller(p) ? 4 : 0) | (s.bad ? 8 : 0), hx.am | hx.tm << 9, hx.df, sm, ai, wflags(r.ing)]);
  const k = r.code.slice(-3); (shards[k] = shards[k] || {})[r.code] = comp;
}
const TIERS = [[0, 15000], [15000, 70000], [70000, 130000]]; for (let a = 130000; a < docs.length; a += 70000) TIERS.push([a, Math.min(docs.length, a + 70000)]);
TIERS.forEach(([a, b], i) => fs.writeFileSync(path.join(out, `index-${i}.json`), JSON.stringify({ tier: i, cats: i ? undefined : cats, docs: docs.slice(a, b) })));
const META = { built: new Date().toISOString(), n: docs.length, products: docs.length, off: nOFF, usdaBranded: nX, tiers: TIERS.length };
for (const [k, v] of Object.entries(shards)) fs.writeFileSync(path.join(out, 'd', k + '.json'), JSON.stringify(v));
console.log(JSON.stringify(audit));console.log('docs', docs.length, 'cats', cats.length, '');

// ---- generic layer: USDA whole foods/FNDDS + restaurants (official chain data preferred) ----
const gsrc = process.argv[3];
if (gsrc) {
  const G = fs.readFileSync(gsrc, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const chainCount = {}; G.forEach(r => r.keys[1] && r.keys[1].startsWith('rest-') && (chainCount[r.keys[1]] = (chainCount[r.keys[1]] || 0) + 1));
  const chainNames = Object.fromEntries(JSON.parse(fs.readFileSync(gsrc + '.chains.json', 'utf8')).map(([k, v]) => ['rest-' + k, v]));
  const dyn = Object.entries(chainCount).filter(([k, c]) => k !== 'rest-other' && c >= 5).map(([k]) => [k, chainNames[k] || k.slice(5)]).sort((a, b) => a[1].localeCompare(b[1]));
  const okKeys = new Set(dyn.map(x => x[0]));
  const gcats = [], gci = new Map(), gdocs = [], gsh = {};
  const order = r => r.src.includes('official') ? 0 : r.src.includes('Foundation') ? 1 : r.src.includes('SR') ? 2 : 3;
  G.sort((a, b) => order(a) - order(b));
  const hash = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 40; };
  const ga = { total: 0, inconsistent: 0 };
  const WC = fs.existsSync(path.join(__dirname, '..', 'img/w/credits.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'img/w/credits.json'), 'utf8')).names : {};
  const wbase = n => n.toLowerCase().replace(/\(.*?\)/g, '').split(',')[0].trim();
  const CFA = rj('cfa_items.json'); const cfaN = {}; for (const [t, v] of Object.entries(CFA)) cfaN[t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()] = v;
  const CFAT = { milk: 'en:milk', egg: 'en:eggs', soy: 'en:soybeans', wheat: 'en:gluten', sesame: 'en:sesame-seeds', 'tree-nuts': 'en:nuts', peanut: 'en:peanuts', fish: 'en:fish' };
  const CFAIMG = /^https:\/\/www\.cdn-chick-fil-a\.com\/|^https:\/\/www\.chick-fil-a\.com\//;
  for (const r of G) {
    const n = r.n; const nut = S.DK.map(k => n[k] == null ? null : rnd(n[k]));
    const p0 = r.portions && r.portions[0];
    const liquid = !!r.liquid || /beverage|drinks?\b|juice|milk\b|soda|coffee|tea\b/i.test(r.group + ' ' + r.name) && !/powder|dry|bar\b/i.test(r.name);
    const comp = [r.id, r.name, r.brand, '', '', p0 ? p0[1] : null, p0 ? p0[0] : '', null, nut, '', '', r.group, 1 | (liquid ? 2 : 0) | (S.CARBY.test(r.group + ' ' + r.name) ? 4 : 0) | 16, r.portions || [], { src: r.src, url: r.url, date: r.date, perItem: !!r.perItem }];
    const isWhole = r.keys[0] === 'whole' || !r.keys.some(k => k.startsWith('rest')); const hx = { w: isWhole ? 1 : 0, g: r.group, o: ORG.test(r.name) ? 1 : 0 }; if (r.keys.some(k => /^whole-(fruit|veg|legumes)/.test(k))) hx.fv = 100; { const simple = isWhole && /^(Fruits|Vegetables|Legumes|Nut and Seed|Spices|Finfish|Beef Products|Pork Products|Poultry|Lamb|Dairy and Egg)/.test(r.group || '') && !/FNDDS/.test((r.brand || '') + r.src) && !/breaded|batter|fried|stuffed|with |sauce|gravy|prepared|recipe/i.test(r.name); const GK = isWhole ? 'Whole' : 'Restaurant'; const dmB = D.analyze({ name: r.name, whole: simple }); hx.s = { n: 'g' };
      if (isWhole) { const sl = WC[wbase(r.name)]; if (sl) { comp[4] = 'w:' + sl; hx.s.p = 'w'; } }
      const cf = r.brand === 'Chick-fil-A' && cfaN[r.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()]; let tags = '';
      if (cf) { if (cf.img && CFAIMG.test(cf.img)) { comp[4] = cf.img; hx.s.p = 'c'; } if (cf.ing) { comp[10] = cf.ing; hx.s.i = 'c'; } if (cf.allergens) { tags = Object.entries(cf.allergens).filter(([k, v]) => v && CFAT[k]).map(([k]) => CFAT[k]).join(','); hx.s.a = 1; } if (cf.link) hx.s.cu = cf.link; }
      const dm = D.analyze({ name: r.name, ing: comp[10], allergens: tags, whole: simple, organic: !!hx.o }); hx.am = dm.am; hx.tm = dm.tm; hx.df = dm.df; alc(GK, dm);
      st(GK, c => { c.n++; c.photoAfter += !!comp[4]; c.ingAfter += !!comp[10]; c.verifiableBefore += dmB.df & 1; c.verifiableAfter += dm.df & 1; if (hx.s.i) c.ingFrom[hx.s.i] = (c.ingFrom[hx.s.i] || 0) + 1; if (hx.s.p) c.ingFrom['photo-' + hx.s.p] = (c.ingFrom['photo-' + hx.s.p] || 0) + 1; }); } comp.push(hx);
    const p = S.fromCompact(comp); const s = S.score(p); ga.total++;
    const hr = H.rate(p, { whole: isWhole, group: r.group, organic: !!hx.o, fvl: hx.fv }); cov(isWhole ? (r.src.includes('Canadian') ? 'Whole foods (CNF)' : 'Whole foods (USDA)') : r.src.includes('official') ? 'Restaurants (official)' : r.src.includes('MenuStat') ? 'Restaurants (MenuStat 2018)' : 'Restaurants (USDA)', hr); if (s.score == null) ga.inconsistent++;
    let keys = r.keys.filter(k => k === 'rest' || k === 'whole' || !k.startsWith('rest-') || okKeys.has(k) || k === 'rest-other');
    if (r.keys[1] && r.keys[1].startsWith('rest-') && !okKeys.has(r.keys[1]) && r.keys[1] !== 'rest-other') keys = ['rest', 'rest-other'];
    if (!gci.has(r.group)) { gci.set(r.group, gcats.length); gcats.push(r.group); }
    gdocs.push([r.id, r.name, r.brand, s.score == null ? -1 : s.score, s.score == null || s.net == null ? -1 : Math.round(s.net), gci.get(r.group), comp[4] || '', keys.join('.'), n.sugars == null ? -1 : Math.round(n.sugars), hr.score == null ? -1 : hr.score, (hr.basis === 'nutrition' ? 1 : 0) | (hr.est.length ? 2 : 0) | (S.isFiller(p) ? 4 : 0) | (s.bad ? 8 : 0), hx.am | hx.tm << 9, hx.df, 0, (() => { const w = r.keys.find(k => AI.WHOLE[k]); return w && isWhole ? AI.BYID[AI.WHOLE[w]] : -1; })(), wflags(comp[10])]);
    const k = hash(r.id); (gsh[k] = gsh[k] || {})[r.id] = comp;
  }
  fs.mkdirSync(path.join(out, 'g'), { recursive: true });
  fs.writeFileSync(path.join(out, 'index-g.json'), JSON.stringify({ generic: true, cats: gcats, chains: dyn, docs: gdocs }));
  for (const [k, v] of Object.entries(gsh)) fs.writeFileSync(path.join(out, 'g', k + '.json'), JSON.stringify(v));
  META.whole = gdocs.filter(d => d[7].startsWith('whole')).length; META.restaurant = gdocs.length - META.whole; META.chains = dyn.length; META.chainCounts = dyn.map(x => [x[1], chainCount[x[0]], G.some(r => r.keys[1] === x[0] && r.src.includes('official')) ? 'official' : 'USDA']);
  console.log('generic', JSON.stringify(ga), 'chains', dyn.map(x => x[1] + ':' + chainCount[x[0]]).join(', '));
}
META.health = COV; META.audit = audit; META.version = '11.1'; META.v63 = A63; META.fillers = { grocery: docs.filter(d => d[10] & 4).length }; console.log('V63', JSON.stringify(A63)); META.sources = ST; console.log('SOURCES', JSON.stringify(ST, null, 1)); META.allergenData = ALC; console.log('ALLERGEN', JSON.stringify(ALC)); console.log('HEALTH', JSON.stringify(COV));
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(META));
