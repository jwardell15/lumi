#!/usr/bin/env node
/* Lumi 22.0: per-tier sidecar for smart filters + list-card ingredient badges.
   data/f22/<tier>.json = {v, n, c0, c1 (first/last doc code, to line up with the loaded index), a:[p, f, s, w, ...]} parallel to data/index-<tier>.json docs:
   p/f/s = protein / fiber / saturated fat per 100 g (x10, -1 = not on the label), w = LumiWarn mask (-1 no ingredient list, -2 not in English).
   All values come straight from the product records in data/d and data/g; nothing is estimated. Usage: node tools/build_f22.js [--stats] */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), D = p => path.join(R, 'data', p);
const W = require(path.join(R, 'js/ingwarn22.js'));
const meta = JSON.parse(fs.readFileSync(D('meta.json')));
const tiers = ['g']; for (let i = 0; i < (meta.tiers || 11); i++) tiers.push(String(i));
const where = new Map(), out = {}, ends = {};
for (const t of tiers) { const j = JSON.parse(fs.readFileSync(D(`index-${t}.json`))); const n = j.docs.length; out[t] = new Int32Array(n * 4).fill(-1);
  j.docs.forEach((d, i) => where.set(d[0], [t, i])); ends[t] = [j.docs[0][0], j.docs[n - 1][0]]; console.log('tier', t, n); }
const ghash = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 40; };
const st = { hit: 0, ing: 0, lang: 0, prot: 0, cnt: {}, terms: {} };
const q10 = v => v == null || !isFinite(v) || v < 0 ? -1 : Math.round(v * 10);
function put(code, a) { const w = where.get(code); if (!w) return; const [t, i] = w, o = out[t], nut = a[8] || [];
  if (o[i * 4 + 3] !== -1 && o[i * 4 + 3] !== -3) return; st.hit++;
  o[i * 4] = q10(nut[4]); o[i * 4 + 1] = q10(nut[3]); o[i * 4 + 2] = q10(nut[6]); if (nut[4] != null) st.prot++;
  const r = W.analyze(a[10] || ''); o[i * 4 + 3] = r.mask; if (r.status === 'ok') st.ing++; if (r.status === 'lang') st.lang++;
  if (process.argv.includes('--stats') && r.status === 'ok') for (const x of r.list) { st.cnt[x.id] = (st.cnt[x.id] || 0) + 1; const T = st.terms[x.id] = st.terms[x.id] || {}; for (const term of x.terms) T[term] = (T[term] || 0) + 1; } }
for (const f of fs.readdirSync(D('d'))) { const sh = JSON.parse(fs.readFileSync(D('d/' + f))); for (const k in sh) put(k, sh[k]); }
for (const f of fs.readdirSync(D('g'))) { const sh = JSON.parse(fs.readFileSync(D('g/' + f))); for (const k in sh) put(k, sh[k]); }
fs.mkdirSync(D('f22'), { recursive: true });
let tot = 0; for (const t of tiers) { const a = Array.from(out[t]); tot += a.length / 4; fs.writeFileSync(D(`f22/${t}.json`), JSON.stringify({ v: 1, n: a.length / 4, c0: ends[t][0], c1: ends[t][1], a })); }
console.log(JSON.stringify({ docs: tot, matched: st.hit, withIngredients: st.ing, nonEnglish: st.lang, withProtein: st.prot }));
if (process.argv.includes('--stats')) { console.log(JSON.stringify(st.cnt)); for (const k in st.terms) console.log(k, JSON.stringify(Object.entries(st.terms[k]).sort((a, b) => b[1] - a[1]).slice(0, 40))); }
