/* Lumi 26.2 core (pure logic, no DOM): fish-species matching, pesticide-commodity matching, kitchen/food-contact term checker, ZIP lookup helpers.
   Data comes from data/fish26 (FDA/EPA Advice About Eating Fish + FDA mercury table), data/pdp26 (USDA Pesticide Data Program), data/air26 (EPA AirData + Census). */
(() => {
'use strict';
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9%+ ]+/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- fish: label text -> entries on the FDA/EPA chart ---------- */
/* each rule: [regex, [chart-name prefixes]]. One prefix = the species is stated. Several = the species isn't stated, so every possible one is shown. First matching rule wins. */
const FR = [
  [/\bbigeye tuna\b|\btuna,? bigeye\b/, ['Tuna, bigeye']], [/\byellowfin\b|\bahi\b/, ['Tuna, yellowfin']],
  [/\balbacore\b|\bwhite tuna\b|\btuna,? white\b/, ['Tuna, albacore']], [/\bskipjack\b|\bchunk light\b|\blight tuna\b|\btuna,? light\b/, ['Tuna, canned light']],
  [/\btuna\b/, ['Tuna, canned light', 'Tuna, albacore', 'Tuna, yellowfin', 'Tuna, bigeye']],
  [/\bking mackerel\b|\bmackerel,? king\b/, ['King mackerel']], [/\bspanish mackerel\b|\bmackerel,? spanish\b/, ['Spanish mackerel']], [/\batlantic mackerel\b|\bmackerel,? atlantic\b/, ['Atlantic mackerel']], [/\b(pacific )?chub mackerel\b|\bmackerel,? pacific\b/, ['Pacific chub mackerel']],
  [/\bmackerel\b/, ['Atlantic mackerel', 'Pacific chub mackerel', 'Spanish mackerel', 'King mackerel']],
  [/\bblack sea bass\b/, ['Black sea bass']], [/\bchilean sea bass\b|\bpatagonian toothfish\b/, ['Chilean sea bass']], [/\bstriped bass\b|\bbass,? striped\b/, ['Striped bass']], [/\bsea bass\b/, ['Black sea bass', 'Chilean sea bass']],
  [/\bgulf tilefish\b/, ['Tilefish (Gulf']], [/\btilefish\b/, ['Tilefish (Atlantic', 'Tilefish (Gulf']],
  [/\banchov/, ['Anchovy']], [/\bwhite croaker\b|\bpacific croaker\b/, ['White croaker']], [/\bcroaker,? atlantic\b|\batlantic croaker\b/, ['Atlantic croaker']], [/\bcroaker\b/, ['Atlantic croaker', 'White croaker']], [/\bcatfish\b/, ['Catfish']], [/\bclams?\b/, ['Clam']],
  [/\bcod\b|\bcodfish\b/, ['Cod']], [/\bcrabs?\b/, ['Crab']], [/\bcrawfish\b|\bcrayfish\b/, ['Crawfish']], [/\bflounder\b/, ['Flounder']], [/\bhaddock\b/, ['Haddock']], [/\bhake\b/, ['Hake']],
  [/\bherring\b/, ['Herring']], [/\blobsters?\b/, ['Lobster']], [/\bmullet\b/, ['Mullet']], [/\boysters?\b/, ['Oyster']], [/\bperch\b/, ['Perch']], [/\bpickerel\b/, ['Pickerel']], [/\bplaice\b/, ['Plaice']],
  [/\bpollock\b|\bpollack\b/, ['Pollock']], [/\bsalmon\b/, ['Salmon']], [/\bsardines?\b|\bpilchard/, ['Sardine']], [/\bscallops?\b/, ['Scallop']], [/\bshad\b/, ['Shad']], [/\bshrimps?\b|\bprawns?\b/, ['Shrimp']],
  [/\bskate\b/, ['Skate']], [/\bsmelt\b/, ['Smelt']], [/\bsole\b/, ['Sole']], [/\bsquid\b|\bcalamari\b/, ['Squid']], [/\btilapia\b/, ['Tilapia']], [/\btrout\b/, ['Trout']], [/\bwhitefish\b/, ['Whitefish']], [/\bwhiting\b/, ['Whiting']],
  [/\bbluefish\b/, ['Bluefish']], [/\bbuffalo ?fish\b/, ['Buffalofish']], [/\bcarp\b/, ['Carp']], [/\bgrouper\b/, ['Grouper']], [/\bhalibut\b/, ['Halibut']], [/\bmahi\b|\bdolphinfish\b/, ['Mahi']], [/\bmonkfish\b/, ['Monkfish']],
  [/\brockfish\b/, ['Rockfish']], [/\bsablefish\b|\bblack cod\b/, ['Sablefish']], [/\bsheepshead\b/, ['Sheepshead']], [/\bsnapper\b/, ['Snapper']], [/\bweakfish\b|\bseatrout\b/, ['Weakfish']],
  [/\bmarlin\b/, ['Marlin']], [/\borange roughy\b/, ['Orange roughy']], [/\bshark\b/, ['Shark']], [/\bswordfish\b/, ['Swordfish']]
];
const NOTFISH = /\b(pet|dog|cat|kitten|puppy|fish oil|oil capsule|cod liver|sauce|crackers?|flavou?red?|flavou?r|broth|stock|chowder|bisque|cake|chips|seasoning|rub|salad dressing|dressing|cat food|dog food)\b/;
/* match(text, fishList): fishList = fish26.fish. Returns {rule, entries[], stated} or null. Uses only the name (and the start of the ingredient list) so a flavor line can't trigger it. */
function fishMatch(name, ing, fishList) {
  const t = norm(name), g = norm(String(ing || '').split(/[.;]/)[0]).split(' ').slice(0, 14).join(' ');
  for (const src of [t, g]) { if (!src || NOTFISH.test(src)) continue;
    for (const [rx, pre] of FR) { if (!rx.test(src)) continue;
      const ents = []; for (const p of pre) { const f = fishList.find(x => x.n.toLowerCase().startsWith(p.toLowerCase())); if (f && !ents.includes(f)) ents.push(f); }
      if (ents.length) return { entries: ents, stated: ents.length === 1, term: (src.match(rx) || [''])[0] }; } }
  return null; }
const CAT = { best: ['Best Choices', 'b'], good: ['Good Choices', 'g'], avoid: ['Choices to Avoid', 'a'] };

/* ---------- pesticide: USDA product name -> PDP commodity ---------- */
const stem = s => { s = norm(s).replace(/ies$/, 'y'); if (/oes$/.test(s)) return s.slice(0, -2); if (/(ch|sh|x|ss)es$/.test(s)) return s.slice(0, -2); return s.replace(/s$/, ''); };
const ALIAS = { 'kale': 'Kale Greens', 'peppers sweet': 'Sweet Bell Peppers', 'melons cantaloupe': 'Cantaloupe', 'cucumber': 'Cucumbers', 'cucumbers': 'Cucumbers', 'avocados': 'Avocado' };
const PROC = /\b(canned|frozen|juice|dried|cooked|boiled|fried|baked|roasted|steamed|sauce|stewed|pickled|jam|jelly|puree|paste|candied|dehydrated|drained|microwaved|blanched|sauteed)\b/;
/* pdpMatch: only raw foods; returns the commodity record or null. */
function pdpMatch(name, pdp) {
  const n = norm(name); if (!/\braw\b/.test(n) || PROC.test(n)) return null;
  const segs = String(name).split(',').map(s => s.trim()); const s0 = norm(segs[0]), s01 = norm(segs[0] + ' ' + (segs[1] || ''));
  const list = pdp.commodities; let key = null;
  for (const k of Object.keys(ALIAS)) { if (s01 === k || s0 === k) { key = ALIAS[k]; break; } }
  if (key) return list.find(c => c.name === key) || null;
  const st = stem(s0); const c = list.filter(x => stem(x.name.split(',')[0]) === st); if (!c.length) return null;
  return c.find(x => x.name.indexOf(',') < 0) || c.find(x => /, Fresh$/.test(x.name)) || c.find(x => /Cultivated/.test(x.name)) || null; }
function pdpLatest(c) { return c.years.slice().sort((a, b) => b.y - a.y)[0]; }

/* ---------- kitchen / food-contact checker ---------- */
const KT = [
  { id: 'fluoro', label: 'Fluoropolymer non-stick (PTFE, Teflon)', rx: /\bptfe\b|\bteflon\b|\bpolytetrafluoroethylene\b|\bfluoropolymers?\b|\bfep\b(?=\W)|\bpfa\b(?=\W)|\bxylan\b|\bwhitford\b/i, grp: 'pfas',
    text: 'Non-stick coatings like PTFE are fluoropolymers, and fluoropolymers fall inside the OECD definition of PFAS. FDA says PTFE non-stick pots and pans show negligible migration into food; some US states restrict PFAS in cookware.' },
  { id: 'pfoa', label: 'PFOA, PFOS or GenX (named PFAS)', rx: /\bpfoa\b|\bpfos\b|\bgenx\b|\bperfluorooctan|\bperfluorooctane/i, grp: 'pfas',
    text: 'These are specific PFAS. A "PFOA-free" claim only says PFOA was left out; it does not say the product has no other PFAS.' },
  { id: 'pfas', label: 'PFAS, perfluoro- or polyfluoro- wording', rx: /\bpfas\b|\bperfluor\w*|\bpolyfluor\w*|\bfluorinated\b|\bfluorotelomer\w*|\bforever chemicals?\b/i, grp: 'pfas',
    text: 'PFAS is a large family of fluorinated chemicals. "PFAS-free" is a claim by the maker; Lumi cannot verify it from a label.' },
  { id: 'bpa', label: 'BPA or bisphenol', rx: /\bbpa\b|\bbisphenol(?:[- ]?[a-z])?\b|\bbps\b|\bbpf\b|\bbpaf\b/i, grp: 'bis',
    text: 'BPA (bisphenol A) is used in polycarbonate plastic and in epoxy linings of some cans. "BPA-free" can mean a related bisphenol such as BPS or BPF was used instead; the EU now restricts the whole bisphenol group in food-contact materials.' },
  { id: 'epoxy', label: 'Epoxy or polycarbonate (may contain bisphenols)', rx: /\bepoxy\b|\bpolycarbonate\b|\bpc plastic\b|\bresin lined\b|\bresin[- ]lining\b|\bcan lining\b|\bcan liner\b|\benamel lined\b|\blining\b/i, grp: 'bis',
    text: 'FDA says BPA is used to make polycarbonate and appears in the epoxy resins that line some metal food and drink cans. A lining of epoxy or polycarbonate does not by itself show BPA is present. Ask the maker.' },
  { id: 'freeclaim', label: '"Free of" claim', rx: /\b(?:pfas|pfoa|ptfe|bpa|bps|bisphenol)[- ]free\b|\bfree of (?:pfas|pfoa|ptfe|bpa|bisphenols?)\b|\bnon[- ]?toxic\b/i, grp: 'claim',
    text: 'A "free of" claim comes from the maker. Lumi can only read the words; it cannot confirm what is in the product. Check what exactly is claimed (for example PFOA-free is narrower than PFAS-free).' }
];
function kitchenCheck(text) {
  const t = String(text || ''), short = norm(t).length < 3, hits = [];
  if (short) return { status: 'none', hits };
  for (const k of KT) { const m = t.match(k.rx); if (m) hits.push({ id: k.id, label: k.label, grp: k.grp, text: k.text, found: m[0] }); }
  // "free of" phrases hide the very term they name: don't report fluoropolymer/PFAS/BPA from "PFAS-free"; report the claim.
  const claim = hits.find(h => h.id === 'freeclaim');
  const stripped = t.replace(/\b(?:pfas|pfoa|ptfe|bpa|bps|bisphenols?)[- ]free\b|\bfree of (?:(?:pfas|pfoa|ptfe|bpa|bps|bisphenols?)(?:\s*(?:,|and|or|&)\s*)?)+/ig, ' ');
  if (claim) for (const k of KT) { if (k.id === 'freeclaim') continue; const i = hits.findIndex(h => h.id === k.id); if (i >= 0 && !k.rx.test(stripped)) hits.splice(i, 1); }
  return { status: hits.length ? 'hit' : 'clear', hits };
}

/* ---------- ZIP ---------- */
const zipOK = z => /^\d{5}$/.test(String(z || '').trim());
const AQI_BANDS = [['Good', 1, '0-50'], ['Moderate', 2, '51-100'], ['Unhealthy for sensitive groups', 3, '101-150'], ['Unhealthy', 4, '151-200'], ['Very unhealthy', 5, '201-300'], ['Hazardous', 6, '301+']];

self.KIT262 = { norm, fishMatch, CAT, pdpMatch, pdpLatest, stem, kitchenCheck, KT, zipOK, AQI_BANDS };
})();
