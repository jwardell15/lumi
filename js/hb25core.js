/* Lumi 25: Home & Body ingredient engine (shared by the app and tools/build_hb25.js).
   Matches ingredient text against OFFICIAL lists only (EPA PFAS list, California Prop 65, EU fragrance allergens, formaldehyde releasers).
   Never says "safe": it reports flags, or "no flagged ingredients found in available data", or "couldn't verify" when there is no ingredient list. */
(function (root, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else root.HB25 = m; })(this, function () {
'use strict';
const norm = s => String(s || '').toLowerCase().replace(/α/g, 'alpha').replace(/β/g, 'beta').replace(/γ/g, 'gamma').replace(/[’‘`]/g, "'").replace(/&amp;/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const ngrams = (t, N = 8) => { const w = norm(t).split(' ').filter(Boolean), out = new Set(); for (let i = 0; i < w.length; i++) { let s = ''; for (let n = 0; n < N && i + n < w.length; n++) { s += (n ? ' ' : '') + w[i + n]; out.add(s); } } return out; };
const CASRE = /\b\d{2,7}-\d\d-\d\b/g;
/* source cards: why each kind of flag exists and where it comes from */
const SRC = {
  pfas: { name: 'EPA CompTox Chemicals Dashboard, PFAS structure list', url: 'https://comptox.epa.gov/dashboard/chemical-lists/PFASSTRUCT' },
  pfasn: { name: 'OECD 2021 definition of PFAS (name pattern)', url: 'https://www.oecd.org/chemicalsafety/portal-perfluorinated-chemicals/' },
  p65: { name: 'California Proposition 65 list (OEHHA, July 31, 2026)', url: 'https://oehha.ca.gov/proposition-65/proposition-65-list' },
  fa: { name: 'EU Cosmetics Regulation 1223/2009, Annex III (declarable fragrance allergens)', url: 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj' },
  frel: { name: 'National Cancer Institute: formaldehyde and formaldehyde-releasing preservatives', url: 'https://www.cancer.gov/about-cancer/causes-prevention/risk/substances/formaldehyde' },
  parfum: { name: 'FDA: Fragrances in Cosmetics', url: 'https://www.fda.gov/cosmetics/cosmetic-ingredients/fragrances-cosmetics' },
  cscp: { name: 'California Safe Cosmetics Program: Chemicals in Cosmetics', url: 'https://data.chhs.ca.gov/dataset/chemicals-in-cosmetics' },
  mn: { name: 'Minnesota PFAS in products (MPCA / PRISM)', url: 'https://www.pca.state.mn.us/air-water-land-climate/pfas-in-products-data' },
  sc: { name: 'EPA Safer Choice', url: 'https://www.epa.gov/saferchoice/products' }
};
const WHY = {
  pfas: 'PFAS ("forever chemicals") are very slow to break down and build up in the environment and in people.',
  p65: 'California lists this chemical as known to cause cancer or reproductive harm. A listing is about the chemical; it does not mean this product exceeds any limit.',
  p65q: 'California lists a specific form of this chemical (for example airborne dust). Shown for information only, so it does not change the score.',
  fa: 'One of the 26 fragrance allergens the EU requires companies to name on the label. It can trigger reactions in people who are sensitive.',
  frel: 'A preservative that slowly releases small amounts of formaldehyde, which is a known human carcinogen and a common skin allergen.',
  parfum: '"Fragrance" or "parfum" is a blend whose individual ingredients are not listed, so Lumi cannot check them.',
  cscp: 'The company reported to California that this product contains this chemical. A report is a disclosure, not a finding of harm.',
  mn: 'The manufacturer reported this product to Minnesota as containing intentionally added PFAS.'
};
/* points: [first, each more, cap] */
const PTS = { pfas: [35, 15, 60], p65: [25, 10, 45], frel: [15, 5, 25], fa: [3, 3, 15], parfum: [4, 4, 4], cscp: [4, 4, 12], mn: [35, 15, 60] };
/* names that look like PFAS but are not (fluoride salts have no C-F bond) */
const NOTPFAS = /monofluorophosph|sodium fluoride|stannous fluoride|fluorosilicate|calcium fluoride|fluorapatite|fluoroflogopite|fluorophlogopite|fluorite|synthetic fluorphlogopite/;
const PFASNAME = /\b(perfluoro\w*|polyperfluoro\w*|polytetrafluoroethylene|ptfe|pfoa|pfos|pfhxs|pfna|fluoropolymer|\w*fluoroalcohol\w*)\b/;

/* split an ingredient list into candidate names: each item, the text outside its parentheses, the text inside, "/" and "(and)" parts */
function candidates(text) {
  let t = String(text || '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').replace(/^\s*(ingredients?|ingr[eé]dients?|inci|contains|active ingredients?|inactive ingredients?)\s*[:\-]\s*/i, '');
  t = t.replace(/\(\s*and\s*\)/gi, ',').replace(/\s+\band\b\s+/gi, ' and ');
  const items = []; let d = 0, cur = '';
  for (const ch of t) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d = Math.max(0, d - 1); if ((ch === ',' || ch === ';' || ch === '•' || ch === '·' || ch === '\n') && d === 0) { items.push(cur); cur = ''; } else cur += ch; }
  items.push(cur);
  const out = new Set(), add = x => { const n = norm(x.replace(/\d+([.,]\d+)?\s*%/g, ' ').replace(/\*/g, ' ')); if (n && n.length >= 3 && n.split(' ').length <= 12) out.add(n); };
  for (const it of items) {
    const x = it.trim(); if (!x) continue; add(x);
    const outside = x.replace(/\([^)]*\)|\[[^\]]*\]/g, ' '); if (outside !== x) add(outside);
    (x.match(/\(([^)]*)\)|\[([^\]]*)\]/g) || []).forEach(m => add(m.slice(1, -1)));
    if (!/copolymer|crosspolymer|polymer|acrylate|resin|\bvp\b|ester|glycol/i.test(outside)) outside.split(/\/| or /i).forEach(p => { if (p.trim() !== outside.trim()) add(p); });
  }
  return { items: items.map(x => x.trim()).filter(Boolean), cand: out };
}
const NEXTBAD = /^(copolymer|crosspolymer|polymer|acrylates|acrylate|methacrylate|\d+|oxide|sulfonate|sulfate|resin|glycol)$/;
function evaluate(text, ref, opt) {
  opt = opt || {}; const flags = [], seen = new Set(), push = f => { const k = f.t + '|' + f.n; if (!seen.has(k)) { seen.add(k); flags.push(f); } };
  const t = String(text || ''); const N = norm(t); if (N.length < 3) return flags;
  const C = candidates(t); const cand = C.cand;
  /* a list with no separators (some scanned labels) is searched phrase by phrase, never inside longer names such as "benzophenone-3" or "styrene/acrylates copolymer" */
  const noSep = C.items.length <= 2 && N.split(' ').length > 14, G = noSep ? ngrams(t, 8) : cand;
  const okG = g => { if (!noSep) return true; const i = N.indexOf(g); if (i < 0) return true; const rest = N.slice(i + g.length).trim().split(' ')[0] || '', before = N.slice(0, i).trim().split(' ').pop() || ''; return !NEXTBAD.test(rest) && !/^\d+$/.test(before); };
  if (ref) {
    for (const g of G) {
      if (!okG(g)) continue;
      const pi = ref.pfas.m[g]; if (pi != null && !NOTPFAS.test(g)) { const e = ref.pfas.e[pi]; push({ t: 'pfas', n: e[0], cas: e[1], via: g, src: e[2] === 'name' ? 'pfasn' : 'pfas' }); }
      const qi = ref.p65.m[g]; if (qi != null) { const e = ref.p65.e[qi]; push({ t: e[4] ? 'p65q' : 'p65', n: e[0], cas: e[1], tox: e[2], date: e[3], via: g, src: 'p65' }); }
    }
    for (const m of (t.match(CASRE) || [])) { const qi = ref.p65.m[m]; if (qi != null) { const e = ref.p65.e[qi]; push({ t: e[4] ? 'p65q' : 'p65', n: e[0], cas: e[1], tox: e[2], date: e[3], via: m, src: 'p65' }); } }
    for (const a of ref.fa) if (a[2].some(p => G.has(p) && okG(p))) push({ t: 'fa', n: a[0], cas: a[1], src: 'fa' });
    for (const a of ref.fr) if (a[2].some(p => G.has(p) && okG(p))) push({ t: 'frel', n: a[0], cas: a[1], src: 'frel' });
  }
  if (/\b(parfum|fragrance|perfume)\b/.test(N)) push({ t: 'parfum', n: 'Fragrance (parfum)', src: 'parfum' });
  for (const g of cand) { if (NOTPFAS.test(g)) continue; const m = g.match(PFASNAME); if (!m) continue; if (flags.some(f => f.t === 'pfas' && (norm(f.n) === g || f.via === g))) continue; if (g.split(' ').length > 6) continue; push({ t: 'pfas', n: g, cas: '', via: g, src: 'pfasn' }); }
  return flags;
}
/* ctx: { hasIng, cscp: [{c:chemical,d:date}], mnProduct: {n, firm, range}, saferChoice } */
function score(flags, ctx) {
  ctx = ctx || {}; const items = []; const by = {};
  flags.forEach(f => (by[f.t] = by[f.t] || []).push(f));
  const take = (type, list, label) => { const p = PTS[type]; let tot = 0; list.forEach((f, i) => { const v = Math.min(i ? p[1] : p[0], Math.max(0, p[2] - tot)); tot += v; items.push({ pts: -v, f }); }); };
  take('pfas', by.pfas || []);
  const mnf = ctx.mnProduct && !(by.pfas || []).length ? [{ t: 'mn', n: ctx.mnProduct.n || 'PFAS reported to Minnesota', src: 'mn', firm: ctx.mnProduct.firm, range: ctx.mnProduct.range }] : [];
  take('mn', mnf);
  take('p65', by.p65 || []);
  take('frel', by.frel || []);
  take('fa', by.fa || []);
  take('parfum', by.parfum || []);
  (by.p65q || []).forEach(f => items.push({ pts: 0, f }));
  const known = new Set(flags.map(f => norm(f.n)));
  const cs = (ctx.cscp || []).filter(c => !known.has(norm(c.c)) && !/trade secret/i.test(c.c)); const seenC = new Set(); const csu = cs.filter(c => { const k = norm(c.c); if (seenC.has(k)) return false; seenC.add(k); return true; });
  take('cscp', csu.map(c => ({ t: 'cscp', n: c.c, src: 'cscp', date: c.d })));
  const have = !!ctx.hasIng || (ctx.cscp && ctx.cscp.length > 0) || !!ctx.mnProduct;
  if (!ctx.hasIng && !items.length) return { score: null, band: 'na', label: ctx.saferChoice ? 'Certified by EPA Safer Choice' : "Couldn't verify: no ingredient list", items: [], hasIng: false };
  const tot = items.reduce((a, b) => a + b.pts, 0), s = Math.max(0, 100 + tot);
  const flagged = items.filter(i => i.pts < 0).length;
  const band = s >= 100 ? 'ex' : s >= 80 ? 'gd' : s >= 55 ? 'pr' : 'bd';
  const label = s >= 100 ? 'No flagged ingredients found in available data' : s >= 80 ? 'A few flags' : s >= 55 ? 'Some flags' : 'Several or serious flags';
  return { score: ctx.hasIng ? s : null, band: ctx.hasIng ? band : 'na', label: ctx.hasIng ? label : (items.length ? 'Reported flags only: no ingredient list' : "Couldn't verify: no ingredient list"), items, hasIng: !!ctx.hasIng, flagged, partial: !ctx.hasIng };
}
const KIND_LABEL = { pfas: 'PFAS', mn: 'PFAS reported', p65: 'Prop 65 listed', p65q: 'Prop 65 (specific form)', frel: 'Formaldehyde releaser', fa: 'Fragrance allergen', parfum: 'Undisclosed fragrance', cscp: 'Reported to California' };
return { norm, ngrams, candidates, evaluate, score, SRC, WHY, PTS, KIND_LABEL };
});
