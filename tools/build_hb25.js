// Lumi 25: builds data/hb25 (Home & Body) from Open Beauty Facts + Open Products Facts bulk exports (ODbL), the California Safe Cosmetics Program,
// EPA Safer Choice, and official ingredient lists (see js/hb25core.js). Inputs are prepared by the scripts next to this file's work dir (see /workspace/m25/build).
// usage: node tools/build_hb25.js <rawdir> <builddir> <outdir>
const fs = require('fs'), zlib = require('zlib'), rl = require('readline'), path = require('path');
const H = require('../js/hb25core.js');
const RAW = process.argv[2] || '/workspace/m25/raw/', BLD = process.argv[3] || '/workspace/m25/build/', OUT = process.argv[4] || '/workspace/m25/out/hb25/';
const ref = JSON.parse(fs.readFileSync(OUT + 'ref.json', 'utf8'));
const cscp = JSON.parse(fs.readFileSync(BLD + 'cscp_products.json', 'utf8'));
const safer = JSON.parse(fs.readFileSync(OUT + 'safer.json', 'utf8')).items;
const mn = JSON.parse(fs.readFileSync(OUT + 'pfasmn.json', 'utf8'));
const norm = H.norm;
const STOPW = new Set('and the for all with shades shade color colour of de la le les du des en pour avec new original classic natural'.split(' '));
const toks = s => norm(s).split(' ').filter(w => w.length > 1 && !STOPW.has(w));
const BR = s => norm(s).replace(/\b(inc|llc|ltd|co|company|corp|corporation|usa|us|the|brands?|laboratories|labs?|cosmetics?|beauty|professional)\b/g, ' ').replace(/\s+/g, ' ').trim();
// ---- CSCP index by brand ----
const csByBrand = new Map();
for (const r of cscp) { const b = BR(r.b || r.co); if (!b) continue; (csByBrand.get(b) || csByBrand.set(b, []).get(b)).push({ r, t: new Set(toks(r.n)) }); }
function csFor(brand, name) {
  const b = BR(brand); const L = csByBrand.get(b); if (!L || !name) return null; const A = new Set(toks(name)); if (A.size < 1) return null;
  const hits = [];
  for (const { r, t } of L) {
    let inter = 0; for (const w of A) if (t.has(w)) inter++;
    const small = Math.min(A.size, t.size), jac = inter / (A.size + t.size - inter);
    if ((inter === small && small >= 2 && inter / Math.max(A.size, t.size) >= 0.5) || jac >= 0.75) hits.push(r);
  }
  if (!hits.length) return null;
  const chem = new Map();
  for (const r of hits) for (const c of r.ch) { if (!c[0]) continue; const k = norm(c[0]); if (!chem.has(k)) chem.set(k, { c: c[0], d: c[3] || c[2] }); }
  return { chem: [...chem.values()], products: hits.slice(0, 2).map(r => r.n) };
}
// ---- Safer Choice by UPC ----
const scByUpc = new Map(); for (const s of safer) for (const u of s.u) scByUpc.set(u.replace(/^0+/, ''), s);
const nUpc = c => String(c).replace(/^0+/, '');
// ---- categories ----
const PC = [['sun', 'Sun care', /sunscreen|\bspf\b|sun ?block|suncare|sun-protection|in-sun|sun care/], ['oral', 'Oral care', /toothpaste|mouthwash|dental|dentifrice|tooth|floss|mouth ?rinse/], ['deo', 'Deodorant', /deodorant|antiperspirant/],
  ['hair', 'Hair care', /shampoo|conditioner|\bhair\b|hair-|dry shampoo|styling|pomade|hairspray/], ['makeup', 'Makeup & nails', /lip(stick| gloss|-balm| balm)?|mascara|foundation|makeup|nail|polish|eyeliner|blush|concealer|primer|bronzer/],
  ['baby', 'Baby', /\bbaby\b|babies|diaper/], ['face', 'Face care', /\bface\b|facial|cleanser|serum|toner|acne|eye cream|micellar|face-/], ['body', 'Body & bath', /body|shower|soap|lotion|hand cream|bath|wash|moistur|cream|butter|oil/]];
const CL = [['laundry', 'Laundry', /laundry|lessive|detergent|fabric-?soft|softener|stain|pre-?treat|dryer|waschmittel/], ['dish', 'Dish soap', /dish|vaisselle|dishwash|lave-vaisselle|geschirr/], ['surface', 'Surface cleaners', /all-purpose|surface|multi-?purpose|bathroom|toilet|glass|window|floor|kitchen|bleach|disinfect|degreas|hard-surface|cleaner|nettoy|reiniger/], ['air', 'Air & odor', /air-fresh|odor|odou?r|deodoriz|freshener/], ['otherc', 'Other cleaning', /./]];
const CATS = PC.map(c => [c[0], c[1]]).concat([['other', 'Other personal care']]).concat(CL.map(c => [c[0], c[1]]));
const ci = id => CATS.findIndex(c => c[0] === id);
const PCX = /skin|face|facial|hair|shampoo|cosmetic|hygiene|toothpaste|deodorant|lotion|beauty|make-?up|shower|\bbody\b|hand-?wash|hand soap|moistur|sunscreen|toilet-paper|diaper|baby-wipes?|intimate/;
const FOOD = /plant-based-foods|beverages|snacks|en:foods|dairies|meals|sweeteners|cereals/;
const CLEANOK = /clean|detergent|laundry|dish|soap|bleach|disinfect|degreas|softener|wipes?|household-chemicals|hard-surface|lessive|vaisselle|nettoy|stain|odor|freshener|reiniger|waschmittel/;
function imgPath(p, host) {
  const c = String(p.code), im = p.images || {}; let best = null;
  const keys = Object.keys(im).filter(k => /^front_/.test(k) && im[k] && im[k].rev); const pref = ['front_en', 'front_' + (p.lang || ''), ...keys];
  for (const k of pref) if (im[k] && im[k].rev) { best = k + '.' + im[k].rev; break; }
  if (!best) { const sf = (im.selected && im.selected.front) || {}; const lk = ['en', p.lang || '', ...Object.keys(sf)].find(k => k && sf[k] && sf[k].rev); if (lk) best = 'front_' + lk + '.' + sf[lk].rev; }
  if (!best) return '';
  const dir = c.length <= 8 ? c : c.padStart(13, '0').replace(/^(\d{3})(\d{3})(\d{3})(\d*)$/, '$1/$2/$3/$4');
  return dir + '/' + best;
}
const cleanIng = t => { t = String(t || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); return t.slice(0, 1500); };
const noisy = t => { if (!t) return false; const w = t.split(/[\s,;]+/).filter(Boolean); if (!w.length) return true; const bad = w.filter(x => /[^\x20-\x7e\u00c0-\u017f]/.test(x) || x.length > 28).length; return bad / w.length > 0.25; };
const docs = [], shards = {}; const cov = { personal: 0, cleaning: 0, withIng: 0, flagged: 0, scored: 0, withImage: 0, safer: 0, csMatches: 0, byType: { pfas: 0, p65: 0, frel: 0, fa: 0, parfum: 0, cscp: 0 } };
const FL = { pfas: 1, p65: 2, frel: 4, fa: 8, parfum: 16, cscp: 32, mn: 64, sc: 128 };
const seenCodes = new Set(); const usedSafer = new Set();
function addRec(p, kind) {
  const code = String(p.code || ''); if (!/^\d{6,14}$/.test(code) || seenCodes.has(code)) return; const name = String(p.product_name || p.product_name_en || '').trim(); if (!name) return;
  const cats = (p.categories_tags || []).join(' ').toLowerCase(), hay = (name + ' ' + cats).toLowerCase();
  let ing = cleanIng(p.ingredients_text_en || p.ingredients_text || ''); if (noisy(ing)) ing = '';
  const brand = String(p.brands || '').split(',')[0].trim().slice(0, 60);
  let cat;
  if (kind === 'b') { if (FOOD.test(cats) && !/cosmetic|hygiene|toothpaste|shampoo|soap/.test(cats)) return; const i = PC.findIndex(c => c[2].test(hay)); cat = i < 0 ? 'other' : PC[i][0]; }
  else { if (!CLEANOK.test(hay) || PCX.test(hay)) return; const i = CL.findIndex(c => c[2].test(hay)); cat = CL[i][0]; }
  const us = (p.countries_tags || []).includes('en:united-states'), upc = code.length === 12 || (code.length === 13 && code[0] === '0');
  if (!ing && !us && !upc) { /* name-only foreign items stay out of the browse index but are still found by barcode */ }
  seenCodes.add(code);
  const flags = ing ? H.evaluate(ing, ref) : [];
  const cs = kind === 'b' ? csFor(brand, name) : null; const sc = scByUpc.get(nUpc(code)) || null; if (sc) usedSafer.add(sc.id);
  const ctx = { hasIng: !!ing, cscp: cs ? cs.chem : [], saferChoice: !!sc };
  const s = H.score(flags, ctx);
  let bits = (ing ? 256 : 0) | (us ? 512 : 0) | (sc ? 128 : 0); for (const f of flags) bits |= FL[f.t] || 0; if (cs && cs.chem.some(c => !/trade secret/i.test(c.c))) bits |= 32;
  const ip = imgPath(p, kind);
  const rec = { c: code, n: name.slice(0, 120), b: brand, q: String(p.quantity || '').slice(0, 30), i: ip, k: kind, g: cat, ing, f: flags.map(f => [f.t, f.n, f.cas || '', f.via || '', f.src, f.tox || '', f.date || '']), cs: cs ? cs.chem.slice(0, 12) : undefined, sc: sc ? sc.id : undefined, us: us ? 1 : 0, m: p.last_modified_t || 0 };
  docs.push([code, rec.n, brand, s.score == null ? -1 : s.score, ci(cat), ip, bits, kind, Number(p.unique_scans_n) || 0]);
  (shards[code.slice(-2)] = shards[code.slice(-2)] || {})[code] = rec;
  if (kind === 'b') cov.personal++; else cov.cleaning++; if (ing) cov.withIng++; if (flags.length || (cs && cs.chem.length)) cov.flagged++; if (s.score != null) cov.scored++; if (ip) cov.withImage++; if (cs) cov.csMatches++;
  for (const f of flags) if (cov.byType[f.t] != null) cov.byType[f.t]++;
}
(async () => {
  for (const [fn, kind] of [['obf', 'b'], ['opf', 'p']]) {
    const r = rl.createInterface({ input: fs.createReadStream(RAW + fn + '.jsonl.gz').pipe(zlib.createGunzip()) });
    for await (const l of r) { try { addRec(JSON.parse(l), kind); } catch (e) { } }
  }
  // Safer Choice products not found in OPF: add as certified-list entries (no ingredient data)
  let scOnly = 0;
  for (const s of safer) {
    if (usedSafer.has(s.id)) continue;
    const code = s.u[0] || ('sc-' + s.id); const kind = 's'; const t = (s.t[0] || '').toLowerCase(); const hay = t + ' ' + s.n.toLowerCase();
    const i = CL.findIndex(c => c[2].test(hay)); const cat = CL[i < 0 ? CL.length - 1 : i][0];
    const rec = { c: code, n: s.n, b: s.p, q: '', i: '', k: 's', g: cat, ing: '', f: [], sc: s.id, us: 1, m: 0 };
    docs.push([code, s.n, s.p, -1, ci(cat), '', 128 | 512, 's', 0]); (shards[String(code).slice(-2)] = shards[String(code).slice(-2)] || {})[code] = rec; scOnly++;
  }
  cov.safer = safer.length; cov.saferOnly = scOnly;
  // popularity order: US + ingredients first, then scans
  docs.sort((a, b) => ((b[6] & 512 ? 2 : 0) + (b[6] & 256 ? 1 : 0)) - ((a[6] & 512 ? 2 : 0) + (a[6] & 256 ? 1 : 0)) || b[8] - a[8]);
  // browse index keeps products with ingredients, a US listing, a UPC, or an image
  const idx = docs.filter(d => (d[6] & (256 | 512 | 128)) || d[5]);
  fs.mkdirSync(OUT + 'd', { recursive: true }); for (const f of fs.readdirSync(OUT + 'd')) fs.unlinkSync(OUT + 'd/' + f);
  for (const [k, v] of Object.entries(shards)) fs.writeFileSync(OUT + 'd/' + k + '.json', JSON.stringify(v));
  const built = new Date().toISOString().slice(0, 10); Object.assign(cov, { indexed: idx.length, total: docs.length });
  fs.writeFileSync(OUT + 'index.json', JSON.stringify({ cats: CATS, docs: idx.filter(d => d[7] === 'b').map(d => d.slice(0, 8)), built, cov }));
  fs.writeFileSync(OUT + 'index-c.json', JSON.stringify({ cats: CATS, docs: idx.filter(d => d[7] !== 'b').map(d => d.slice(0, 8)), built }));
  console.log(JSON.stringify(cov));
})();
