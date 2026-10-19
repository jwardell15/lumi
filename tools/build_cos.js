// Cosmetics index from Open Beauty Facts bulk export (US/English subset, see tools/extract_obf.py).
// usage: node tools/build_cos.js /workspace/obf/obf-us.json
const fs = require('fs'), path = require('path'); const E = require('../js/encyc.js');
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = path.join(__dirname, '..', 'data', 'cos'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'd'), { recursive: true });
const CATS = [['sun', 'Sun care', /sunscreen|\bspf\b|sun ?block|suncare|sun-protection|in-sun|sun care/], ['oral', 'Oral care', /toothpaste|mouthwash|dental|dentifrice|tooth|floss|mouth ?rinse/], ['deo', 'Deodorant', /deodorant|antiperspirant/],
  ['hair', 'Hair care', /shampoo|conditioner|\bhair\b|hair-|dry shampoo|styling|pomade|hairspray/], ['makeup', 'Makeup & nails', /lip(stick| gloss|-balm| balm)?|mascara|foundation|makeup|nail|polish|eyeliner|blush|concealer|primer|bronzer/],
  ['baby', 'Baby', /\bbaby\b|babies|diaper/], ['face', 'Face care', /\bface\b|facial|cleanser|serum|toner|acne|eye cream|micellar|face-/], ['body', 'Body & bath', /body|shower|soap|lotion|hand cream|bath|wash|moistur|cream|butter|oil/], ['other', 'Other', /./]];
const FOOD = /plant-based-foods|beverages|snacks|en:foods|dairies|meals|sweeteners|cereals/;
const docs = [], sh = {}; const cov = { total: 0, withIngredients: 0, rated: 0, withImage: 0, byCat: {}, bands: { ex: 0, gd: 0, pr: 0, bd: 0, na: 0 } };
const seen = new Set(); src.sort((a, b) => (b.scans || 0) - (a.scans || 0));
for (const r of src) {
  if (seen.has(r.code) || (FOOD.test(r.cats) && !/cosmetic|hygiene|toothpaste|shampoo|soap/.test(r.cats))) continue; seen.add(r.code);
  const hay = (r.name + ' ' + r.cats).toLowerCase(); const ci = CATS.findIndex(c => c[2].test(hay));
  const rt = E.cosRate(r.ing); cov.total++; if (r.ing) cov.withIngredients++; if (rt.score != null) cov.rated++; if (r.img) cov.withImage++;
  cov.byCat[CATS[ci][1]] = (cov.byCat[CATS[ci][1]] || 0) + 1; const b = rt.score == null ? 'na' : rt.score >= 75 ? 'ex' : rt.score >= 50 ? 'gd' : rt.score >= 25 ? 'pr' : 'bd'; cov.bands[b]++;
  docs.push([r.code, r.name, r.brand, rt.score == null ? -1 : rt.score, ci, r.img || '']);
  (sh[r.code.slice(-1)] = sh[r.code.slice(-1)] || {})[r.code] = [r.code, r.name, r.brand, r.qty, r.img, r.ing, CATS[ci][0], r.labels];
}
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ cats: CATS.map(c => [c[0], c[1]]), docs, built: new Date().toISOString(), cov }));
for (const [k, v] of Object.entries(sh)) fs.writeFileSync(path.join(out, 'd', k + '.json'), JSON.stringify(v));
console.log(JSON.stringify(cov));
