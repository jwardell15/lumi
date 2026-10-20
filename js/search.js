/* Lumi local search engine: inverted index with prefix + typo-tolerant (Damerau-Levenshtein) matching. */
(function (root) {
'use strict';
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['and', 'the', 'of', 'with', 'a', 'in', 'for', 'or']);
const stem = t => t.length > 3 && t.endsWith('ies') ? t.slice(0, -3) + 'y' : t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t;
const toks = s => norm(s).split(' ').filter(t => t && !STOP.has(t)).map(stem);
function dl(a, b, max) { // bounded Damerau-Levenshtein
  const la = a.length, lb = b.length; if (Math.abs(la - lb) > max) return max + 1;
  let prev2 = null, prev = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    const cur = [i]; let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1; prev2 = prev; prev = cur;
  }
  return prev[lb];
}
const SIZEW = /\b\d+(\.\d+)?\s*(fl\.? ?oz|oz|ounces?|ct|count|pk|pack|packs|g|grams?|kg|lb|lbs|ml|l|liters?|gal|gallon|qt|pt)\b|\b(family|value|party|snack|fun|king|share) (size|pack)\b|\b\d+ ?x\b|\b(bottles?|cans?|cartons?|jugs?|multipack|variety pack)\b/gi;
/* v6.3 duplicate group: same brand + same name once sizes/pack words are removed */
const groupKey = (name, brand) => { const b = norm(String(brand || '').toLowerCase().replace(/[’']/g, '')); let n = norm(String(name || '').toLowerCase().replace(/[’']/g, '').replace(SIZEW, ' '));
  const bw = b.split(' ').filter(w => w.length > 2); n = n.split(' ').filter(w => !bw.includes(w)).map(w => w.length > 3 ? w.replace(/(es|s)$/, '') : w).join(' '); return b + '|' + n; };
let WATER_; const water = () => WATER_ ?? (WATER_ = typeof self !== 'undefined' && self.LumiAisles ? self.LumiAisles.BYID['bv-water'] : -2); // plain/sparkling water with ~0 carbs counts as filler even when the name doesn't say "water"
const fixName = s => String(s || '').replace(/([A-Za-z])['’]S\b/g, "$1's");
function dedupe(list, get = x => x) { const seen = new Map(), out = []; for (const x of list) { const d = get(x); const k = groupKey(d.name, d.brand); const bk = norm(String(d.brand || '').toLowerCase()).split(' ').slice(0, 2).join(' '); const k2 = d.score != null && d.net != null ? `v|${bk}|${d.score}|${d.h}|${d.net}|${d.sugar}|${d.cat}` : null; const f = seen.get(k) || (k2 && seen.get(k2)); if (k2 && !f) seen.set(k2, d); if (f) { f.sizes = (f.sizes || 1) + 1; continue; } seen.set(k, d); out.push(x); } return out; }
const IMGBASE = 'https://images.openfoodfacts.org/images/products/';
function imgURL(code, v) {
  if (!v) return '';
  if (v[0] === '~') { const parts = code.length > 8 ? code.padStart(13, '0').match(/^(...)(...)(...)(.*)$/).slice(1).join('/') : code; return IMGBASE + parts + '/' + v.slice(1) + '.200.jpg'; }
  if (v.startsWith('w:')) return 'img/w/' + v.slice(2) + '-200.webp';
  return v.startsWith('http') ? v : IMGBASE + v;
}
class Engine {
  constructor() { this.docs = []; this.post = new Map(); this.buckets = new Map(); this.cats = []; this.tiers = 0; }
  add(data) {
    if (data.cats && !data.generic) this.cats = data.cats;
    const cats = data.generic ? data.cats : this.cats; const KC = root.LumiCats;
    for (const d of data.docs) {
      const i = this.docs.length;
      const doc = { code: d[0], name: fixName(d[1]), brand: d[2] || '', score: d[3] < 0 ? null : d[3], net: d[4] < 0 ? null : d[4], cat: cats[d[5]] || '', img: imgURL(d[0], d[6]), keys: d[7] ? d[7].split('.').map(k => /^\d+$/.test(k) ? +k : (KC ? KC.KEYS.indexOf(k) : -1)).filter(k => k >= 0) : [], sugar: d[8] == null || d[8] < 0 ? null : d[8], h: d[9] == null || d[9] < 0 ? null : d[9], hn: !!(d[10] & 1), al: d[11] || 0, df: d[12] == null ? null : d[12], src: data.generic ? (d[7] && d[7].startsWith('rest') ? 'rest' : 'whole') : 'local', rank: i, sm: d[13] || 0, ai: d[14] == null ? -1 : d[14], fl: !!(d[10] & 4) || (d[14] === water() && d[4] >= 0 && d[4] <= 0.5) };
      doc.nn = norm(doc.name + ' ' + doc.brand);
      this.docs.push(doc);
      const seen = new Map();
      for (const t of toks(doc.name)) seen.set(t, Math.max(seen.get(t) || 0, 3));
      for (const t of toks(doc.brand)) seen.set(t, Math.max(seen.get(t) || 0, 2));
      for (const t of toks(doc.cat)) seen.set(t, Math.max(seen.get(t) || 0, 1));
      for (const [t, f] of seen) {
        let p = this.post.get(t); if (!p) { p = []; this.post.set(t, p); const b = t.slice(0, 1); (this.buckets.get(b) || this.buckets.set(b, []).get(b)).push(t); }
        p.push(i * 4 + f);
      }
    }
    this.tiers++;
  }
  terms(q, prefix) {
    const out = new Map(); const fw = (t, w) => { if ((out.get(t) || 0) < w) out.set(t, w); };
    if (this.post.has(q)) fw(q, 1);
    const bucket = this.buckets.get(q[0]) || [];
    const maxD = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0;
    const doPrefix = prefix || q.length >= 4;
    for (const t of bucket) {
      if (t === q) continue;
      if (doPrefix && t.length > q.length && t.startsWith(q)) { fw(t, q.length >= 3 ? 0.8 : 0.6); continue; }
      if (maxD && Math.abs(t.length - q.length) <= maxD) { const d = dl(q, t, maxD); if (d <= maxD) fw(t, d === 1 ? 0.7 : 0.5); }
    }
    // compound words: "peanutbutter" → peanut + butter is out of scope; but "cheerio" first-letter typos:
    if (out.size === 0 && maxD) for (const [b, ts] of this.buckets) { if (b === q[0]) continue; for (const t of ts) if (Math.abs(t.length - q.length) <= 1 && dl(q, t, 1) <= 1) fw(t, 0.55); }
    return out;
  }
  search(query, { limit = 80, prefix = false, filter } = {}) {
    const qt = toks(query); if (!qt.length) return [];
    const per = qt.map((q, k) => {
      const m = new Map();
      for (const [t, w] of this.terms(q, prefix && k === qt.length - 1)) for (const e of this.post.get(t)) { const i = e >> 2, f = e & 3; const s = w * (f === 3 ? 1 : f === 2 ? 0.75 : 0.45); if ((m.get(i) || 0) < s) m.set(i, s); }
      return m;
    });
    const acc = new Map();
    per.forEach(m => { for (const [i, s] of m) { const a = acc.get(i) || [0, 0]; a[0] += s; a[1]++; acc.set(i, a); } });
    const need = qt.length <= 2 ? qt.length : qt.length - 1;
    const nq = norm(query); const N = this.docs.length || 1; const res = [];
    for (const [i, [s, c]] of acc) {
      if (c < need) continue; const d = this.docs[i]; if (filter && !filter(d)) continue;
      let r = (s / qt.length) * 100 * (c / qt.length);
      if (d.nn.includes(nq)) r += 25; if (norm(d.name).startsWith(nq)) r += 10;
      r += 18 * (1 - d.rank / N);
      if (d.src === 'whole') { const nn = norm(d.name), w = nn.split(' '); if (nn.startsWith(qt[0])) r += 14; if (/\braw\b/.test(nn)) r += 6; r -= Math.min(10, Math.max(0, w.length - qt.length - 1) * 1.5); }
      res.push([r, d]);
    }
    res.sort((a, b) => b[0] - a[0]);
    return res.slice(0, limit).map(([r, d]) => Object.assign({ rel: r }, d));
  }
  browse(keyIdx, limit = 5000) { const r = []; for (const d of this.docs) { if (d.keys.includes(keyIdx)) { r.push(Object.assign({ rel: 100 - d.rank / this.docs.length * 50 }, d)); if (r.length >= limit) break; } } return r; }
  similar(doc, limit = 6) {
    const cur = doc.score ?? 0; let pool = [];
    const leaf = (doc.keys || []).slice(-1)[0];
    if (leaf != null) pool = this.docs.filter(d => d.keys.includes(leaf) && d.code !== doc.code);
    if (pool.length < 4 && doc.cat) pool = pool.concat(this.docs.filter(d => d.cat === doc.cat && d.code !== doc.code));
    if (pool.length < 4) { const kw = toks(doc.name).slice(-2).join(' '); if (kw) pool = pool.concat(this.search(kw, { limit: 60 }).filter(d => d.code !== doc.code)); }
    const seen = new Set(); return pool.filter(d => d.score != null && d.net != null && d.score >= cur + 5 && !seen.has(d.code) && seen.add(d.code)).sort((a, b) => b.score - a.score || a.rank - b.rank).slice(0, limit);
  }
  byCode(code) { if (!this._codes) { this._codes = new Map(); } if (this._codes.size !== this.docs.length) { this._codes.clear(); this.docs.forEach(d => this._codes.set(d.code, d)); } return this._codes.get(code); }
}
root.LumiSearch = { Engine, norm, toks, dl, imgURL, groupKey, dedupe, fixName };
})(typeof self !== "undefined" ? self : globalThis);
