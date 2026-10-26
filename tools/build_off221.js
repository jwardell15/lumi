#!/usr/bin/env node
/* Lumi 22.1 offline pack: every Costco + Whole Foods item (store brands, items tagged as sold there, Whole Foods store-made, Costco food court)
   data/off221/stores.json = { v, built (meta.built), n, rows: [index rows from tiers 1+ not already in the app shell], f: [p, f, s, w per row] (data/f22 values),
   t: [rowIndex, termMask, ...], recs: { id: compact product record } for all of them (tier 0 / generic included) }.
   Real records only, copied from data/d and data/g. Usage: node tools/build_off221.js */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = path.join(__dirname, '..'), D = p => path.join(R, 'data', p);
const STO = require(path.join(R, 'js/stores.js'));
const meta = JSON.parse(fs.readFileSync(D('meta.json')));
const ci = STO.STORES.findIndex(s => s[0] === 'costco'), wi = STO.STORES.findIndex(s => s[0] === 'wholefoods');
const want = d => STO.has(d[13], ci) || STO.has(d[13], wi) || STO.has(d[13], STO.SOLD + ci) || STO.has(d[13], STO.SOLD + wi) || /^wfm-/.test(d[0]) || /^r-costco/.test(d[0]);
const ghash = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 40; };
const rows = [], f = [], t = [], ids = new Set(); let shellN = 0;
const tiers = ['g']; for (let i = 0; i < (meta.tiers || 11); i++) tiers.push(String(i));
for (const tr of tiers) { const j = JSON.parse(fs.readFileSync(D(`index-${tr}.json`))), s = JSON.parse(fs.readFileSync(D(`f22/${tr}.json`))); const tm = new Map(); for (let k = 0; k < (s.t || []).length; k += 2) tm.set(s.t[k], s.t[k + 1]);
  j.docs.forEach((d, i) => { if (!want(d) || ids.has(d[0])) return; ids.add(d[0]);
    if (tr === 'g' || tr === '0') { shellN++; return; } /* already in the cached app shell (index-g / index-0) */
    const r = rows.length; rows.push(d); f.push(s.a[i * 4], s.a[i * 4 + 1], s.a[i * 4 + 2], s.a[i * 4 + 3]); if (tm.has(i)) t.push(r, tm.get(i)); }); }
const recs = {}, sh = new Map(), gsh = new Map(); let miss = 0;
for (const id of ids) { let a = null;
  if (/^\d+$/.test(id)) { const k = id.slice(-3); if (!sh.has(k)) sh.set(k, fs.existsSync(D(`d/${k}.json`)) ? JSON.parse(fs.readFileSync(D(`d/${k}.json`))) : {}); a = sh.get(k)[id]; }
  else { const k = ghash(id); if (!gsh.has(k)) gsh.set(k, JSON.parse(fs.readFileSync(D(`g/${k}.json`)))); a = gsh.get(k)[id]; }
  if (a) recs[id] = a; else miss++; }
fs.mkdirSync(D('off221'), { recursive: true });
const out = JSON.stringify({ v: 1, built: meta.built, n: ids.size, rows, f, t, recs });
fs.writeFileSync(D('off221/stores.json'), out);
fs.writeFileSync(D('off221/info.json'), JSON.stringify({ v: 1, built: meta.built, n: ids.size, bytes: Buffer.byteLength(out) }));
const gz = zlib.gzipSync(out, { level: 9 }).length, br = zlib.brotliCompressSync(out).length;
console.log(JSON.stringify({ items: ids.size, inShell: shellN, rows: rows.length, recs: Object.keys(recs).length, missingRecord: miss, rawMB: +(out.length / 1048576).toFixed(2), gzipMB: +(gz / 1048576).toFixed(2), brotliMB: +(br / 1048576).toFixed(2) }));
