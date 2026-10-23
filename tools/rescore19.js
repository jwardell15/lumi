// Lumi 19.0: re-score every food PER SERVING (js/score.js servBasis) and patch all search indexes in place.
// usage: node --max-old-space-size=8192 tools/rescore19.js        (reads data/{d,w,g}/*.json shards, rewrites data/index-*.json)
// Index doc fields changed: [3] Blood sugar score, [9] Health score, [10] flags (bits 1/2/8 refreshed), new [16] serving grams/ml used,
// new [17] serving basis: 0 labeled serving, 1 restaurant item, 2 category default serving, 3 per 100 g (no serving size); +4 = liquid (ml).
const fs = require('fs'), path = require('path');
const S = require('../js/score.js'), H = require('../js/health.js');
H.addSyn(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ref/additives.json'), 'utf8')).syn);
const DATA = path.join(__dirname, '..', 'data'); const KIND = { label: 0, custom: 0, item: 1, default: 2, per100: 3 };
const stat = { n: 0, kinds: [0, 0, 0, 0], changed: 0 };
function scoreDir(dir) {
  const M = new Map();
  for (const f of fs.readdirSync(path.join(DATA, dir))) { if (!f.endsWith('.json')) continue;
    const J = JSON.parse(fs.readFileSync(path.join(DATA, dir, f), 'utf8'));
    for (const [id, comp] of Object.entries(J)) { try {
      const p = S.fromCompact(comp), hx = comp[15] || {}; const s = S.score(p); const hr = H.rate(p, { whole: !!hx.w, group: hx.g || '', organic: !!hx.o, fvl: hx.fv == null ? null : hx.fv });
      const kd = (KIND[s.servKind] ?? 3) | (p.liquid ? 4 : 0); stat.kinds[kd & 3]++; stat.n++;
      M.set(id, [s.score == null ? -1 : s.score, hr.score == null ? -1 : hr.score, (hr.basis === 'nutrition' ? 1 : 0) | (hr.est.length ? 2 : 0) | (s.bad ? 8 : 0), Math.round(s.servG), kd]);
    } catch (e) { } } }
  return M;
}
function patch(files, M) {
  for (const f of files) { const fp = path.join(DATA, f); const J = JSON.parse(fs.readFileSync(fp, 'utf8')); let n = 0, miss = 0;
    for (const d of J.docs) { const v = M.get(d[0]); if (!v) { miss++; continue; }
      if (d[3] !== v[0] || d[9] !== v[1]) stat.changed++;
      d[3] = v[0]; d[9] = v[1]; d[10] = (d[10] & 4) | v[2]; while (d.length < 16) d.push(0); d[16] = v[3]; d[17] = v[4]; n++; }
    fs.writeFileSync(fp, JSON.stringify(J)); console.log(f, 'patched', n, 'missing', miss); }
}
const all = fs.readdirSync(DATA);
for (const [dir, re] of [['g', /^index-g\.json$/], ['d', /^index-\d+\.json$/], ['w', /^index-w-\d+\.json$/]]) {
  if (process.argv[2] && process.argv[2] !== dir) continue;
  const t = Date.now(); const M = scoreDir(dir); console.log(dir, 'scored', M.size, (Date.now() - t) / 1000 + 's'); patch(all.filter(f => re.test(f)), M);
}
console.log(JSON.stringify(stat));
