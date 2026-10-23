// Lumi 17.1: add Whole Foods Market product-page nutrition (tools/fetch_wfm.py output) to the generic layer (data/g + index-g) as wfm-<asin>.
// usage: node tools/add_wfm.js wfm.jsonl   (idempotent: replaces existing wfm-* entries)
const fs = require('fs'), path = require('path');
const S = require('../js/score.js'), H = require('../js/health.js'), D = require('../js/diet.js');
const DATA = path.join(__dirname, '..', 'data'), ghash = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 40; };
const IG = JSON.parse(fs.readFileSync(path.join(DATA, 'index-g.json'), 'utf8')); IG.docs = IG.docs.filter(d => !/^wfm-/.test(d[0]));
const sh = {}; const shard = k => sh[k] = sh[k] || JSON.parse(fs.readFileSync(path.join(DATA, 'g', k + '.json'), 'utf8'));
const g = v => { const m = String(v || '').match(/([\d.]+)\s*(m?g)/i); return m ? +m[1] / (m[2].toLowerCase() === 'mg' ? 1000 : 1) : null; };
const OZ = 28.3495; let n = 0, skip = 0;
const group = 'Whole Foods Market'; if (!IG.cats.includes(group)) IG.cats.push(group); const gi = IG.cats.indexOf(group);
for (const l of fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(l), nf = r.nf, M = {}; for (const x of nf.macronutrients || []) M[x.name.toLowerCase()] = x.amount;
  // serving weight: "(30g)" in serving size, else net weight / servings per container from the product name
  let sv = g((nf.servingSize || '').match(/\(([^)]*g)\)/)?.[1]);
  if (!sv) { const oz = (r.name.match(/([\d.]+)\s*(ounce|oz)\b/i) || [])[1], spc = parseFloat(nf.servingsPerContainer); if (oz && spc) sv = Math.round(oz * OZ / spc * 10) / 10; }
  if (!sv || M['total carbohydrate'] == null) { skip++; continue; }
  const f = 100 / sv, p100 = k => { const v = g(M[k]); return v == null ? null : Math.round(v * f * 10) / 10; };
  const nut = [p100('total carbohydrate'), p100('sugars'), p100('added sugars'), p100('dietary fiber'), p100('protein'), p100('total fat'), p100('saturated fat'), p100('trans fat'), M.sodium == null ? null : Math.round(g(M.sodium) * 1000 * f), nf.caloriesAmount == null ? null : Math.round(+nf.caloriesAmount * f), p100('sugar alcohol')];
  const id = 'wfm-' + String(r.asin).toLowerCase(), serv = (nf.servingSize || '').replace(/^Per\s*/i, '').replace(/^1\.0 ea$/i, '1 item') + ` (${sv} g)`;
  const comp = [id, r.name.replace(/,?\s*[\d.]+\s*(Count|Ounce|oz|Fl Oz|Pound|lb)\b.*$/i, '').trim(), r.brand || 'Whole Foods Market', '', /^https:\/\/m\.media-amazon\.com\//.test(r.img) ? r.img : '', sv, serv, null, nut, '', r.ing || '', group, 1 | (S.CARBY.test(r.type + ' ' + r.name) ? 4 : 0) | 16, [[serv, sv]], { src: 'Whole Foods Market product page', url: r.url, date: r.date }];
  const dm = D.analyze({ name: r.name, ing: r.ing || '' }); comp.push({ w: 0, g: group, o: /organic/i.test(r.name) ? 1 : 0, am: dm.am, tm: dm.tm, df: dm.df, s: { n: 'wfm', i: r.ing ? 'wfm' : '', p: comp[4] ? 'wfm' : '' } });
  const p = S.fromCompact(comp), s = S.score(p), hr = H.rate(p, { whole: false, group, organic: !!comp[15].o });
  shard(ghash(id))[id] = comp;
  IG.docs.push([id, comp[1], comp[2], s.score == null ? -1 : s.score, s.score == null || s.net == null ? -1 : Math.round(s.net), gi, comp[4], 'grocery-wfm', nut[1] == null ? -1 : Math.round(nut[1]), hr.score == null ? -1 : hr.score, (hr.basis === 'nutrition' ? 1 : 0) | (hr.est.length ? 2 : 0) | (S.isFiller(p) ? 4 : 0) | (s.bad ? 8 : 0), dm.am | dm.tm << 9, dm.df, 0, -1, 0]);
  n++; console.log(id, comp[1], 'carb', s.score, 'health', hr.score);
}
for (const [k, v] of Object.entries(sh)) fs.writeFileSync(path.join(DATA, 'g', k + '.json'), JSON.stringify(v));
fs.writeFileSync(path.join(DATA, 'index-g.json'), JSON.stringify(IG)); console.log(JSON.stringify({ added: n, skipped: skip }));
