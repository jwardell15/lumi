// Lumi 20.0: remove restaurant items that were taken from Nutritionix-hosted menus whose path robots.txt now disallows
// (https://www.nutritionix.com/robots.txt "Disallow: /<chain>/*"). Only items whose meta.src says "via Nutritionix" are removed;
// items from a chain's own site / MenuStat / USDA stay. usage: node tools/rm_nx_disallowed.js disallowed-slugs.txt
const fs = require('fs'), path = require('path'); const DATA = path.join(__dirname, '..', 'data');
const gh = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 40; };
const dis = new Set(fs.readFileSync(process.argv[2], 'utf8').split(/\s+/).filter(Boolean));
const IG = JSON.parse(fs.readFileSync(path.join(DATA, 'index-g.json'), 'utf8')); const sh = {}; const S = k => sh[k] = sh[k] || JSON.parse(fs.readFileSync(path.join(DATA, 'g', k + '.json'), 'utf8'));
const rm = {}; IG.docs = IG.docs.filter(d => { const k = String(d[7] || '').split('.').find(x => x.startsWith('rest-')); if (!k || !dis.has(k.slice(5))) return true;
  const r = S(gh(d[0]))[d[0]]; if (!r || !/via Nutritionix/i.test((r[14] && r[14].src) || '')) return true; delete S(gh(d[0]))[d[0]]; rm[k] = (rm[k] || 0) + 1; return false; });
const left = new Set(IG.docs.map(d => String(d[7] || '').split('.').find(x => x.startsWith('rest-'))).filter(Boolean));
IG.chains = IG.chains.filter(c => left.has(c[0]));
for (const [k, v] of Object.entries(sh)) fs.writeFileSync(path.join(DATA, 'g', k + '.json'), JSON.stringify(v));
fs.writeFileSync(path.join(DATA, 'index-g.json'), JSON.stringify(IG)); console.log(JSON.stringify({ removed: rm, total: Object.values(rm).reduce((a, b) => a + b, 0), chains: IG.chains.length }));
