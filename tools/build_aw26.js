#!/usr/bin/env node
/* Lumi 26.0: per-tier sidecar for the additive-watch filters. data/aw26/<tier>.json = {v, n, c0, c1, u, h}, parallel to data/index-<tier>.json docs (same alignment as data/f22):
   u = string, one char per doc: '.' ingredient list read and no watched additive found, 'x' watched additive found (mask in h), 'n' no ingredient list, 'l' list not in English.
   h = [docIndex, mask, ...] for 'x' docs (mask bits = js/aw26core.js W[i].bit). Built from the same product records as tools/build_f22.js with the same matcher the app uses. Usage: node tools/build_aw26.js */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), D = p => path.join(R, 'data', p);
globalThis.LumiWarn = require(path.join(R, 'js/ingwarn22.js'));
const A = require(path.join(R, 'js/aw26core.js'));
const meta = JSON.parse(fs.readFileSync(D('meta.json')));
const tiers = ['g']; for (let i = 0; i < (meta.tiers || 11); i++) tiers.push(String(i));
const where = new Map(), out = {}, hits = {}, ends = {};
for (const t of tiers) { const j = JSON.parse(fs.readFileSync(D(`index-${t}.json`))); const n = j.docs.length; out[t] = new Array(n).fill('?'); hits[t] = [];
  j.docs.forEach((d, i) => where.set(d[0], [t, i])); ends[t] = [j.docs[0][0], j.docs[n - 1][0]]; }
const st = { seen: 0, ok: 0, hit: 0, none: 0, lang: 0, cnt: {} };
function put(code, a) { const w = where.get(code); if (!w) return; const [t, i] = w; if (out[t][i] !== '?') return; st.seen++;
  const r = A.analyze(a[10] || '');
  if (r.status === 'none') { out[t][i] = 'n'; st.none++; } else if (r.status === 'lang') { out[t][i] = 'l'; st.lang++; }
  else { st.ok++; if (r.mask) { out[t][i] = 'x'; hits[t].push(i, r.mask); st.hit++; for (const h of r.hits) st.cnt[h.id] = (st.cnt[h.id] || 0) + 1; } else out[t][i] = '.'; } }
for (const f of fs.readdirSync(D('d'))) { const sh = JSON.parse(fs.readFileSync(D('d/' + f))); for (const k in sh) put(k, sh[k]); }
for (const f of fs.readdirSync(D('g'))) { const sh = JSON.parse(fs.readFileSync(D('g/' + f))); for (const k in sh) put(k, sh[k]); }
fs.mkdirSync(D('aw26'), { recursive: true }); let tot = 0;
for (const t of tiers) { const u = out[t].map(c => c === '?' ? 'n' : c).join(''); tot += u.length; fs.writeFileSync(D(`aw26/${t}.json`), JSON.stringify({ v: 1, n: u.length, c0: ends[t][0], c1: ends[t][1], u, h: hits[t] })); }
console.log(JSON.stringify({ docs: tot, matched: st.seen, withIngredients: st.ok, flagged: st.hit, noList: st.none, nonEnglish: st.lang, asof: A.ASOF }));
console.log(JSON.stringify(st.cnt));
