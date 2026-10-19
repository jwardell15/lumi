// Build Lumi's static search index + detail shards from extracted OFF records (JSONL).
// usage: node tools/build.js ../offdata/us.jsonl
const fs = require('fs'), path = require('path');
const S = require('../js/score.js'); const C = require('../js/cats.js');
const audit = { total: 0, carbsUnknown: 0, inconsistent: 0, fiberDropped: 0, zeroCarbOk: 0, issues: {} };
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
  const comp = [r.code, r.name, r.brand, r.qty, img, r.servQ, r.serv, r.nova, nut, adds, r.ing, cat, (na ? 1 : 0) | (liquid ? 2 : 0) | (S.CARBY.test(r.cats + ' ' + r.cat) ? 4 : 0) | (S.DRY.test(r.cats + ' ' + r.cat) ? 8 : 0) | 16];
  const p = S.fromCompact(comp); const s = S.score(p); audit.total++;
  const q = S.quality(p); q.issues.forEach(i => audit.issues[i] = (audit.issues[i] || 0) + 1);
  if (p.n.carbs == null) audit.carbsUnknown++; else if (!q.ok) audit.inconsistent++; else if (q.dropFiber) audit.fiberDropped++;
  if (q.ok && p.n.carbs === 0) audit.zeroCarbOk++;
  if (!catIdx.has(cat)) { catIdx.set(cat, cats.length); cats.push(cat); }
  const keys = C.match(r.cats).join('.');
  const parts = r.code.length > 8 ? r.code.padStart(13, '0').match(/^(...)(...)(...)(.*)$/).slice(1).join('/') : r.code;
  let short = img.replace(/\.(100|200|400|full)\.jpg$/, '');
  if (short.startsWith(parts + '/')) short = '~' + short.slice(parts.length + 1); else if (!img.startsWith('http')) short = img;
  docs.push([r.code, r.name, r.brand, s.score == null ? -1 : s.score, s.score == null || s.net == null ? -1 : Math.round(s.net), catIdx.get(cat), img ? short : '', keys]);
  const k = r.code.slice(-2); (shards[k] = shards[k] || {})[r.code] = comp;
}
const TIERS = [[0, 15000], [15000, 70000]];
TIERS.forEach(([a, b], i) => fs.writeFileSync(path.join(out, `index-${i}.json`), JSON.stringify({ tier: i, cats: i ? undefined : cats, docs: docs.slice(a, b) })));
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ built: new Date().toISOString(), n: docs.length, tiers: TIERS.length }));
for (const [k, v] of Object.entries(shards)) fs.writeFileSync(path.join(out, 'd', k + '.json'), JSON.stringify(v));
console.log(JSON.stringify(audit));console.log('docs', docs.length, 'cats', cats.length, '');
