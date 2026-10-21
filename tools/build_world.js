// v12.1: international Open Food Facts layer (products not sold/listed in the US index), country-labelled.
// usage: node tools/build_world.js /workspace/m121/sel.jsonl   -> data/w/<last3>.json, data/index-w-<i>.json, data/world.json
const fs = require('fs'), path = require('path');
const S = require('../js/score.js'), C = require('../js/cats.js'), H = require('../js/health.js'), D = require('../js/diet.js');
const ST63 = require('../js/stores.js'), AI = require('../js/aisles.js');
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ref/additives.json'), 'utf8')); H.addSyn(REF.syn);
const WATCH8 = require('../js/watch8.js').map(x => new RegExp(x[2].source, 'i')); const wflags = ing => { let m = 0; if (ing) WATCH8.forEach((re, i) => { if (re.test(ing)) m |= 1 << i; }); return m; };
const out = path.join(__dirname, '..', 'data'); const IMG = 'https://images.openfoodfacts.org/images/products/';
for (const f of fs.readdirSync(out)) if (f === 'w' || /^index-w-\d+\.json$|^world\.json$/.test(f)) fs.rmSync(path.join(out, f), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'w'));
const have = new Set(); for (const f of fs.readdirSync(path.join(out, 'd'))) for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(out, 'd', f), 'utf8')))) have.add(k.replace(/^0+/, ''));
const rnd = v => v == null ? null : Math.round(v * 10) / 10;
const ctyName = c => (c || '').split(',').map(x => x.replace(/^\w\w:/, '').replace(/-/g, ' ').replace(/\b[a-z]/g, m => m.toUpperCase())).filter(Boolean);
const cats = [], catIdx = new Map(), docs = [], shards = {}, seen = new Set(); const CT = {}; const rej = { dupe: 0, pet: 0, quality: 0, noCarb: 0 };
for (const l of fs.readFileSync(process.argv[2], 'utf8').split('\n')) { if (!l) continue;
  const r = JSON.parse(l); const gk = r.code.replace(/^0+/, ''); if (seen.has(gk) || have.has(gk)) { rej.dupe++; continue; } seen.add(gk);
  if (AI.isPet(r.cats) || /\b(dog|cat|pet) (food|treats?)\b/i.test(r.name)) { rej.pet++; continue; }
  const m = r.n; const nut = [m.carbohydrates, m.sugars, m['added-sugars'], m.fiber, m.proteins, m.fat, m['saturated-fat'], m['trans-fat'], m.sodium == null ? null : m.sodium * 1000, m['energy-kcal'], m.polyols].map(rnd);
  const img = r.img && r.img.startsWith(IMG) ? r.img.slice(IMG.length) : (r.img || '');
  const liquid = S.isLiquid(r.cats, r.serv, r.name); const cat = (r.cat || '').replace(/^\w\w:/, '');
  const adds = S.addTags(r.add).filter(t => S.ADDITIVES[t] || H.ADD[t]).join(',');
  const ing = (r.ing || '').slice(0, 400);
  const comp = [r.code, r.name, r.brand || '', r.qty || '', img, r.servQ, r.serv || '', r.nova, nut, adds, ing, cat, (liquid ? 2 : 0) | (S.CARBY.test(r.cats + ' ' + r.cat) ? 4 : 0) | (S.DRY.test(r.cats + ' ' + r.cat) ? 8 : 0) | 16, null, null];
  const cty = ctyName(r.cty); const dm = D.analyze({ ing, name: r.name });
  const hx = { o: /\b(organic|bio)\b/i.test(r.name) ? 1 : 0, fv: null, am: dm.am, tm: dm.tm, df: dm.df, s: { n: 'o', i: ing ? 'o' : '', p: img ? 'o' : '', om: (r.mod || '').slice(0, 10) }, w: cty.slice(0, 4) };
  comp.push(hx);
  const p = S.fromCompact(comp); const q = S.quality(p); if (p.n.carbs == null) { rej.noCarb++; continue; } if (!q.ok) { rej.quality++; continue; }
  const s = S.score(p); const hr = H.rate(p, { organic: !!hx.o, fvl: null });
  (cty.length ? cty : ['Unknown']).slice(0, 1).forEach(c => CT[c] = (CT[c] || 0) + 1);
  if (!catIdx.has(cat)) { catIdx.set(cat, cats.length); cats.push(cat); }
  const parts = r.code.length > 8 ? r.code.padStart(13, '0').match(/^(...)(...)(...)(.*)$/).slice(1).join('/') : r.code;
  let short = img.replace(/\.(100|200|400|full)\.jpg$/, ''); if (short.startsWith(parts + '/')) short = '~' + short.slice(parts.length + 1); else if (!img.startsWith('http')) short = img;
  const sm = ST63.mask(r.brand, r.stores); const ai = AI.classify({ cats: r.cats, ucat: '', name: r.name, brand: r.brand || '', n: r.n });
  docs.push([r.code, r.name, r.brand || '', s.score == null ? -1 : s.score, s.score == null || s.net == null ? -1 : Math.round(s.net), catIdx.get(cat), img ? short : '', C.match(r.cats).join('.'), m.sugars == null ? -1 : Math.round(m.sugars), hr.score == null ? -1 : hr.score, (hr.basis === 'nutrition' ? 1 : 0) | (hr.est.length ? 2 : 0) | (S.isFiller(p) ? 4 : 0) | (s.bad ? 8 : 0), hx.am | hx.tm << 9, hx.df, sm, ai, wflags(ing)]);
  const k = r.code.slice(-3); (shards[k] = shards[k] || {})[r.code] = comp;
}
for (const [k, v] of Object.entries(shards)) fs.writeFileSync(path.join(out, 'w', k + '.json'), JSON.stringify(v));
const STEP = 60000; let t = 0; for (let i = 0; i < docs.length; i += STEP, t++) fs.writeFileSync(path.join(out, `index-w-${t}.json`), JSON.stringify({ world: 1, tier: 'w' + t, cats, docs: docs.slice(i, i + STEP) }));
const W = { n: docs.length, tiers: t, countries: Object.entries(CT).sort((a, b) => b[1] - a[1]), rejected: rej, src: 'Open Food Facts (international, not in the US index)', built: new Date().toISOString().slice(0, 10) };
fs.writeFileSync(path.join(out, 'world.json'), JSON.stringify(W)); console.log(JSON.stringify({ n: W.n, tiers: t, rej, top: W.countries.slice(0, 12) }));
{ const mp = path.join(out, 'meta.json'); const M = JSON.parse(fs.readFileSync(mp, 'utf8')); M.world = { n: W.n, tiers: t, countries: W.countries.slice(0, 40), src: W.src }; fs.writeFileSync(mp, JSON.stringify(M)); }
