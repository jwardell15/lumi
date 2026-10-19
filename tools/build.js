// Build Lumi's static search index + detail shards from extracted OFF records (JSONL).
// usage: node tools/build.js ../offdata/us.jsonl
const fs = require('fs'), path = require('path');
const S = require('../js/score.js');
const src = process.argv[2]; const out = path.join(__dirname, '..', 'data');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'd'), { recursive: true });
const IMG = 'https://images.openfoodfacts.org/images/products/';
const lines = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean);
const cats = [], catIdx = new Map(), docs = [], shards = {}; const seen = new Set();
const rnd = v => v == null ? null : Math.round(v * 10) / 10;
for (const l of lines) {
  const r = JSON.parse(l); if (seen.has(r.code)) continue; seen.add(r.code);
  const m = r.n; const sod = m.sodium;
  const nut = [m.carbohydrates, m.sugars, m['added-sugars'], m.fiber, m.proteins, m.fat, m['saturated-fat'], m['trans-fat'], sod == null ? null : sod * 1000, m['energy-kcal'], m.polyols].map(rnd);
  const img = r.img.startsWith(IMG) ? r.img.slice(IMG.length) : r.img;
  const liquid = S.isLiquid(r.cats, r.serv, r.name); const na = S.isNA(r.cty);
  const adds = S.addTags(r.add).filter(t => S.ADDITIVES[t]).join(',');
  const cat = (r.cat || '').replace(/^\w\w:/, '');
  const comp = [r.code, r.name, r.brand, r.qty, img, r.servQ, r.serv, r.nova, nut, adds, r.ing, cat, (na ? 1 : 0) | (liquid ? 2 : 0)];
  const p = S.fromCompact(comp); const s = S.score(p);
  if (s.score == null) continue;
  if (!catIdx.has(cat)) { catIdx.set(cat, cats.length); cats.push(cat); }
  docs.push([r.code, r.name, r.brand, s.score, s.net == null ? -1 : Math.round(s.net), catIdx.get(cat), docs.length < 20000 ? img : ""]);
  const k = r.code.slice(-2); (shards[k] = shards[k] || {})[r.code] = comp;
}
const TIERS = [[0, 15000], [15000, 70000]];
TIERS.forEach(([a, b], i) => fs.writeFileSync(path.join(out, `index-${i}.json`), JSON.stringify({ tier: i, cats: i ? undefined : cats, docs: docs.slice(a, b) })));
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ built: new Date().toISOString(), n: docs.length, tiers: TIERS.length }));
for (const [k, v] of Object.entries(shards)) fs.writeFileSync(path.join(out, 'd', k + '.json'), JSON.stringify(v));
console.log('docs', docs.length, 'cats', cats.length, '');
