// Lumi 17.3: add official restaurant nutrition (parsed from each chain's own published PDF) to the generic layer as r-<chain>-<item>.
// usage: node tools/add_rest.js rest.json   (idempotent per chain: replaces that chain's r-<slug>-* entries)
const fs = require('fs'), path = require('path');
const S = require('../js/score.js'), H = require('../js/health.js'), D = require('../js/diet.js');
const DATA = path.join(__dirname, '..', 'data'), ghash = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 40; };
const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const R = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const chains = [...new Set(R.map(r => r.chain))];
const IG = JSON.parse(fs.readFileSync(path.join(DATA, 'index-g.json'), 'utf8')); const sh = {}; const shard = k => sh[k] = sh[k] || JSON.parse(fs.readFileSync(path.join(DATA, 'g', k + '.json'), 'utf8'));
const pre = chains.map(c => 'r-' + slug(c) + '-'); IG.docs = IG.docs.filter(d => { if (!pre.some(p => d[0].startsWith(p))) return true; delete shard(ghash(d[0]))[d[0]]; return false; }); // 20.2: also drop the replaced items from their shards
// 20.1: REPLACE_MS="Chipotle" also drops that chain's older MenuStat (ms-*) items when its own official PDF replaces them
const RMS = (process.env.REPLACE_MS || '').split('|').filter(Boolean); let rms = 0;
if (RMS.length) IG.docs = IG.docs.filter(d => { if (d[0].startsWith('ms-') && RMS.includes(d[2])) { const s = shard(ghash(d[0])); delete s[d[0]]; rms++; return false; } return true; });
if (rms) console.log('removed MenuStat items', rms);
for (const c of chains) { const k = 'rest-' + slug(c); if (!IG.chains.some(x => x[0] === k)) IG.chains.push([k, c]); }
IG.chains.sort((a, b) => a[1].localeCompare(b[1])); const gi = IG.cats.indexOf('') >= 0 ? IG.cats.indexOf('') : (IG.cats.push(''), IG.cats.length - 1);
const DR = /\b(latte|mocha|tea|coffee|smoothie|lemonade|soda|shake|malt|cocoa|juice|milk|water|drink|limeade|float|coke|sprite|pepper|fanta|root beer|punch|refresher|frozen beverage)\b/i;
const ids = new Set(); let n = 0;
for (const r of R) {
  const s_ = slug(r.chain); let id = ('r-' + s_ + '-' + slug(r.item)).slice(0, 90), k = id, i = 2; while (ids.has(k)) k = id + '-' + i++; id = k; ids.add(id);
  const gr = r.grams || null, f = gr ? 100 / gr : 1, v = x => x == null ? null : Math.round(x * f * 10) / 10;
  const nut = [v(r.carbs), v(r.sugar), r.added == null ? null : v(r.added), v(r.fiber), v(r.protein), v(r.fat), v(r.sat), r.trans == null ? null : v(r.trans), r.sodium == null ? null : Math.round(r.sodium * f), r.kcal == null ? null : Math.round(r.kcal * f), null];
  const serv = r.serving || (gr ? `1 item (${gr} g)` : '1 item');
  const comp = [id, r.item, r.chain, '', '', gr || 100, serv, null, nut, '', '', '', 17, [[serv, gr || 100]], Object.assign({ src: r.srcLabel || (r.chain + ' official nutrition'), url: r.source, date: r.date, perItem: !gr }, r.section ? { sec: r.section } : {}, r.chol != null ? { chol: r.chol } : {}, r.note ? { note: r.note } : {})];
  const dm = D.analyze({ name: r.item, ing: '' }); comp.push({ w: 0, g: '', o: 0, s: { n: 'g' }, am: dm.am, tm: dm.tm, df: dm.df });
  if (DR.test(r.item) && !gr) comp[14].liquid = true;
  const p = S.fromCompact(comp), sc = S.score(p), hr = H.rate(p, { whole: false, group: '' });
  shard(ghash(id))[id] = comp;
  IG.docs.push([id, r.item, r.chain, sc.score == null ? -1 : sc.score, sc.score == null || sc.net == null ? -1 : Math.round(sc.net), gi, '', 'rest.rest-' + s_, r.sugar == null ? -1 : Math.round(r.sugar * f), hr.score == null ? -1 : hr.score, (hr.basis === 'nutrition' ? 1 : 0) | (hr.est.length ? 2 : 0) | (S.isFiller(p) ? 4 : 0) | (sc.bad ? 8 : 0), dm.am | dm.tm << 9, dm.df, 0, -1, 0]);
  n++;
}
for (const [k, v] of Object.entries(sh)) fs.writeFileSync(path.join(DATA, 'g', k + '.json'), JSON.stringify(v));
fs.writeFileSync(path.join(DATA, 'index-g.json'), JSON.stringify(IG)); console.log(JSON.stringify({ added: n, chains }));
