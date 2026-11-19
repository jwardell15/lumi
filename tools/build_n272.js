#!/usr/bin/env node
/* Lumi 27.2: per-tier sodium sidecar. data/n272/<tier>.json = {v, n, c0, c1, a:[mg sodium per 100 g, ...]} parallel to data/index-<tier>.json docs (same layout as data/f22).
   a[i] = -1 when the record has no sodium ("sodium not listed"; never treated as low). Values come only from the product records, which carry them from the
   source: Open Food Facts sodium_100g (salt_100g/2.5 when sodium is absent, read from the OFF export by tools/extract_salt272.py), USDA FoodData Central nutrient 1093
   (branded, SR Legacy, Foundation), Canadian Nutrient File, Whole Foods site and official restaurant nutrition PDFs/pages (per item, converted to per 100 g when the chain data was built).
   Nothing is estimated. usage: node tools/build_n272.js [off_salt.json] */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), D = p => path.join(R, 'data', p);
const meta = JSON.parse(fs.readFileSync(D('meta.json')));
const salt = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2])) : {};
const tiers = ['g']; for (let i = 0; i < (meta.tiers || 11); i++) tiers.push(String(i));
const where = new Map(), out = {}, ends = {}, tag = {};
for (const t of tiers) { const j = JSON.parse(fs.readFileSync(D(`index-${t}.json`))); const n = j.docs.length; out[t] = new Int32Array(n).fill(-1); tag[t] = new Array(n);
  j.docs.forEach((d, i) => where.set(d[0], [t, i])); ends[t] = [j.docs[0][0], j.docs[n - 1][0]]; }
const SRC = { o: 'Open Food Facts', u: 'USDA Branded', g: 'USDA/CNF generic', wfm: 'Whole Foods site' };
const st = {}, bump = (s, k) => { (st[s] = st[s] || { docs: 0, listed: 0, fromSalt: 0, conflict: 0 })[k]++; };
function put(k, r) { const w = where.get(k); if (!w) return; const [t, i] = w, n = r[8] || [], m = r[r.length - 1], sn = m && m.s && m.s.n;
  const s = k.startsWith('r-') || k.startsWith('ms-') ? 'Restaurant chains (official nutrition)' : k.startsWith('fdc-') ? 'USDA whole foods' : (SRC[sn] || 'Other');
  bump(s, 'docs'); let v = n.length > 8 ? n[8] : null, fs_ = false;
  if (v == null && salt[k]) { v = salt[k][0]; fs_ = true; }
  /* a recorded 0 (or a very low value) on a product whose own ingredient list contains salt/sodium is a data conflict: treat it as not listed, never as low */
  const ing = String(r[10] || '').toLowerCase(), first3 = ing.split(/[,;]/).slice(0, 3).join(' '); if (v != null && !fs_ && ((v <= 5 && /\b(salt|sodium|brine|soy sauce)\b/.test(ing)) || (v < 50 && /\b(salt|sea salt)\b/.test(first3)))) { v = null; bump(s, 'conflict'); }
  if (v != null && isFinite(v) && v >= 0 && v < 40000) { out[t][i] = Math.round(v); tag[t][i] = s; bump(s, 'listed'); if (fs_) bump(s, 'fromSalt'); } }
for (const d of ['d', 'g']) for (const f of fs.readdirSync(D(d))) { const sh = JSON.parse(fs.readFileSync(D(d + '/' + f))); for (const k in sh) if (!(d === 'g' && out[where.get(k) && where.get(k)[0]] && 0)) put(k, sh[k]); }
fs.mkdirSync(D('n272'), { recursive: true }); let tot = 0, lst = 0, bytes = 0;
for (const t of tiers) { const a = Array.from(out[t]); tot += a.length; lst += a.filter(x => x >= 0).length; const s = JSON.stringify({ v: 1, n: a.length, c0: ends[t][0], c1: ends[t][1], a }); bytes += s.length; fs.writeFileSync(D(`n272/${t}.json`), s); }
const cov = { docs: tot, listed: lst, pct: +(100 * lst / tot).toFixed(1), jsonBytes: bytes, bySource: st };
fs.writeFileSync('/workspace/m27/sodium_coverage.json', JSON.stringify(cov, null, 1)); console.log(JSON.stringify(cov, null, 1));
