/* Lumi 26.0: additive and dye watch. Pure matcher (browser + Node; tools/build_aw26.js uses the same code for the list filter data).
   Reads a product's own ingredient list and flags additives that FDA, California or the EU has banned, revoked, phased out or restricted,
   or that carry an EU warning label. Every flag carries dated facts with a link to the official source. Display only: no score uses this.
   Facts were read from the linked official pages on ASOF; refresh them by hand (tools/README-26.md). Lumi never says an ingredient list is "safe". */
(function (root) {
  'use strict';
  const ASOF = '2026-11-13';
  /* ---- sources (official pages) ---- */
  const S = {
    red3: ['FDA: FD&C Red No. 3', 'https://www.fda.gov/industry/color-additives/fdc-red-no-3'],
    bvo: ['FDA: Brominated vegetable oil', 'https://www.fda.gov/food/food-additives-petitions/brominated-vegetable-oil-bvo'],
    ab418: ['California AB 418, California Food Safety Act (Health & Safety Code 109025)', 'https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB418'],
    ab2316: ['California AB 2316, California School Food Safety Act', 'https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2316'],
    tio2eu: ['EU Regulation 2022/63 (titanium dioxide, E 171)', 'https://eur-lex.europa.eu/eli/reg/2022/63/oj/eng'],
    tio2fda: ['FDA: Titanium dioxide as a color additive in foods', 'https://www.fda.gov/industry/color-additives/titanium-dioxide-color-additive-foods'],
    eulist: ['EU Union list of food additives (Regulation 1333/2008, Annex II)', 'https://eur-lex.europa.eu/eli/reg/2011/1129/oj/eng'],
    euparab: ['EU Directive 2006/52/EC (removed E 216 and E 217)', 'https://eur-lex.europa.eu/eli/dir/2006/52/oj/eng'],
    euannexv: ['EU Regulation 1333/2008, Annex V (colours that need a warning)', 'https://eur-lex.europa.eu/eli/reg/2008/1333/oj/eng'],
    red3eu: ['EU Regulation 1129/2011, Annex II (E 127 erythrosine)', 'https://eur-lex.europa.eu/eli/reg/2011/1129/oj/eng'],
    fdaselect: ['FDA: Select chemicals in the food supply under FDA review', 'https://www.fda.gov/food/food-chemical-safety/list-select-chemicals-food-supply-under-fda-review'],
    fdadyes: ['FDA: Tracking industry pledges to remove petroleum-based food dyes', 'https://www.fda.gov/food/color-additives-information-consumers/tracking-food-industry-pledges-remove-petroleum-based-food-dyes'],
    fdadyenews: ['FDA, July 22, 2026: Orange B revoked, Citrus Red No. 2 revocation proposed', 'https://www.fda.gov/news-events/press-announcements/fda-takes-further-steps-remove-outdated-authorizations-color-additives-food'],
    pho: ['FDA: Final determination on partially hydrogenated oils', 'https://www.fda.gov/food/food-additives-petitions/final-determination-regarding-partially-hydrogenated-oils-removing-trans-fat'],
    cfr189135: ['21 CFR 189.135 (cyclamate)', 'https://www.ecfr.gov/current/title-21/section-189.135'],
    cfr172806: ['21 CFR 172.806 (azodicarbonamide)', 'https://www.ecfr.gov/current/title-21/section-172.806'],
    cfr172730: ['21 CFR 172.730 (potassium bromate)', 'https://www.ecfr.gov/current/title-21/section-172.730']
  };
  /* ---- the watch list. tier: ban = banned, revoked or not authorised by FDA, California or the EU; dye = synthetic dyes being phased out, restricted or carrying an EU warning; watch = FDA review under way ---- */
  const RED = '(?:fd ?& ?c |fd and c )?';
  const NUM = '\\s*(?:no\\.?\\s*|#\\s*|dye\\s*(?:no\\.?\\s*|#\\s*)?)?';
  const DYEFACT = [
    ['FDA', 'FDA says it is working with industry to eliminate this petroleum-based dye by the end of 2027 (voluntary, not a ban) and lists it under review.', ['fdadyes', 'fdaselect']],
    ['California', 'California bars it from public-school meals and food sold at school from December 31, 2027 (AB 2316). Not a ban on food in stores.', ['ab2316']]
  ];
  const W = [
    { id: 'red3', label: 'Red 3 (erythrosine)', tier: 'ban', re: new RegExp('\\b' + RED + 'red' + NUM + '3\\b(?:\\s*lake)?|\\berythrosine\\b|\\be127\\b', 'g'), facts: [
      ['FDA', 'Revoked for use in food (order January 2025). Makers have until January 15, 2027 to reformulate; ingested drugs until January 18, 2028.', ['red3']],
      ['California', 'Banned in food made or sold in California from January 1, 2027 (AB 418).', ['ab418']],
      ['EU', 'Allowed only in cocktail cherries, candied cherries and Bigarreaux cherries in syrup.', ['red3eu']]] },
    { id: 'bvo', label: 'Brominated vegetable oil (BVO)', tier: 'ban', re: /\bbrominated (?:[a-z]+ ){0,2}oils?\b|\bbvo\b|\be443\b/g, facts: [
      ['FDA', 'Revoked: FDA removed its food additive regulation on July 3, 2024 (effective August 2, 2024; compliance one year later).', ['bvo']],
      ['California', 'Banned in food made or sold in California from January 1, 2027 (AB 418).', ['ab418']],
      ['EU', 'Not on the EU list of authorised food additives.', ['eulist']]] },
    { id: 'bromate', label: 'Potassium bromate', tier: 'ban', re: /\bpotassium bromate\b|\bbromated (?:wheat |enriched )?flour\b|\be924\b/g, facts: [
      ['California', 'Banned in food made or sold in California from January 1, 2027 (AB 418).', ['ab418']],
      ['EU', 'Not on the EU list of authorised food additives.', ['eulist']],
      ['FDA', 'Not banned by FDA. The agency lists it as a review of information (since March 2024). Its rule (21 CFR 172.730) covers use in malting barley.', ['fdaselect', 'cfr172730']]] },
    { id: 'propylparaben', label: 'Propylparaben', tier: 'ban', re: /\bpropyl[- ]?parabens?\b|\bpropyl p-?hydroxybenzoate\b|\be21[67]\b/g, facts: [
      ['California', 'Banned in food made or sold in California from January 1, 2027 (AB 418).', ['ab418']],
      ['EU', 'Removed from the EU list of authorised food additives in 2006.', ['euparab']],
      ['FDA', 'Not banned by FDA. The agency lists it as a scientific assessment under way.', ['fdaselect']]] },
    { id: 'tio2', label: 'Titanium dioxide', tier: 'ban', re: /\btitanium dioxide\b|\be171\b/g, facts: [
      ['EU', 'No longer authorised as a food additive (E 171): banned from August 7, 2022 with sell-through to the date of minimum durability.', ['tio2eu']],
      ['FDA', 'Still a permitted color additive in the US (21 CFR 73.575, up to 1% by weight). FDA is reviewing a 2023 petition and lists a scientific assessment under way.', ['tio2fda', 'fdaselect']]] },
    { id: 'orangeb', label: 'Orange B', tier: 'ban', re: /\b(?:fd ?& ?c )?orange b\b(?!\s*(?:vitamin|complex))/g, facts: [
      ['FDA', 'Revoked: FDA issued a final order revoking its use in food, effective September 8, 2026.', ['fdadyenews']]] },
    { id: 'citrusred2', label: 'Citrus Red 2', tier: 'ban', re: /\bcitrus red\s*(?:no\.?\s*|#\s*)?2\b|\be121\b/g, facts: [
      ['FDA', 'Allowed only for the skins of mature oranges not used for processing. FDA proposed revoking it on July 22, 2026; not final yet.', ['fdadyenews']],
      ['EU', 'Not on the EU list of authorised food additives.', ['eulist']]] },
    { id: 'pho', label: 'Partially hydrogenated oil', tier: 'ban', re: /\bpartially[- ]hydrogenated\b/g, facts: [
      ['FDA', 'FDA determined in 2015 that partially hydrogenated oils are not generally recognized as safe (GRAS). Manufacturers could no longer add them after June 18, 2018 (some products had until 2020 or 2021).', ['pho']]] },
    { id: 'cyclamate', label: 'Cyclamate', tier: 'ban', re: /\bcyclamates?\b|\bcyclamic acid\b|\be952\b/g, facts: [
      ['FDA', 'Food with any added or detectable cyclamate is adulterated under FDA rules (21 CFR 189.135, based on a 1969 order).', ['cfr189135']]] },
    { id: 'ada', label: 'Azodicarbonamide (ADA)', tier: 'ban', re: /\bazodicarbonamide\b|\be927a\b/g, facts: [
      ['EU', 'Not on the EU list of authorised food additives.', ['eulist']],
      ['FDA', 'Allowed in flour and bread dough up to 45 ppm (21 CFR 172.806). FDA began a post-market review in August 2025.', ['cfr172806', 'fdaselect']]] },
    { id: 'red40', label: 'Red 40', tier: 'dye', re: new RegExp('\\b' + RED + 'red' + NUM + '40\\b(?:\\s*lake)?|\\ballura red(?: ac)?\\b|\\be129\\b', 'g'), facts: DYEFACT.concat([
      ['EU', 'Allowed, but foods with it must say it "may have an adverse effect on activity and attention in children" (E 129).', ['euannexv']]]) },
    { id: 'yellow5', label: 'Yellow 5 (tartrazine)', tier: 'dye', re: new RegExp('\\b' + RED + 'yellow' + NUM + '5\\b(?:\\s*lake)?|\\btartrazine\\b|\\be102\\b', 'g'), facts: DYEFACT.concat([
      ['EU', 'Allowed, but foods with it must say it "may have an adverse effect on activity and attention in children" (E 102).', ['euannexv']]]) },
    { id: 'yellow6', label: 'Yellow 6 (sunset yellow)', tier: 'dye', re: new RegExp('\\b' + RED + 'yellow' + NUM + '6\\b(?:\\s*lake)?|\\bsunset yellow(?: fcf)?\\b|\\be110\\b', 'g'), facts: DYEFACT.concat([
      ['EU', 'Allowed, but foods with it must say it "may have an adverse effect on activity and attention in children" (E 110).', ['euannexv']]]) },
    { id: 'blue1', label: 'Blue 1', tier: 'dye', re: new RegExp('\\b' + RED + 'blue' + NUM + '1\\b(?:\\s*lake)?|\\bbrilliant blue(?: fcf)?\\b|\\be133\\b', 'g'), facts: DYEFACT },
    { id: 'blue2', label: 'Blue 2', tier: 'dye', re: new RegExp('\\b' + RED + 'blue' + NUM + '2\\b(?:\\s*lake)?|\\bindigotine\\b|\\bindigo carmine\\b|\\be132\\b', 'g'), facts: DYEFACT },
    { id: 'green3', label: 'Green 3', tier: 'dye', re: new RegExp('\\b' + RED + 'green' + NUM + '3\\b(?:\\s*lake)?|\\bfast green(?: fcf)?\\b|\\be143\\b', 'g'), facts: DYEFACT.concat([
      ['EU', 'Not on the EU list of authorised food additives (E 143).', ['eulist']]]) },
    { id: 'eu3', label: 'Quinoline yellow, carmoisine or ponceau 4R', tier: 'dye', re: /\bquinoline yellow\b|\bcarmoisine\b|\bazorubine\b|\bponceau 4r\b|\bcochineal red a\b|\be10[4]\b|\be122\b|\be124\b/g, facts: [
      ['EU', 'Allowed, but foods with it must say it "may have an adverse effect on activity and attention in children" (E 104, E 122, E 124).', ['euannexv']]] },
    { id: 'dyegen', label: 'Artificial color (not named)', tier: 'dye', re: /\bartificial(?:ly)? colou?r(?:s|ed|ing|ings)?\b|\bcertified colou?rs?\b|\bfd ?& ?c colou?rs?\b/g, facts: [
      ['FDA', 'The label does not say which color. FDA is working with industry to eliminate six petroleum-based dyes by the end of 2027 (voluntary).', ['fdadyes']]] },
    { id: 'bha', label: 'BHA', tier: 'watch', re: /\bbha\b|\bbutylated hydroxyanisole\b|\be320\b/g, facts: [
      ['FDA', 'Not banned. FDA began a post-market safety assessment in August 2025 and asked for information in 2026.', ['fdaselect']]] },
    { id: 'bht', label: 'BHT', tier: 'watch', re: /\bbht\b|\bbutylated hydroxytoluene\b|\be321\b/g, facts: [
      ['FDA', 'Not banned. FDA began a post-market review in August 2025 and asked for information in 2026.', ['fdaselect']]] }
  ];
  W.forEach((w, i) => { w.bit = i; });
  const TIERN = { ban: 'Banned, revoked or not authorised somewhere', dye: 'Synthetic dye: phase-out, restriction or EU warning', watch: 'Under FDA review (not banned)' };
  const BANMASK = W.reduce((m, w) => w.tier === 'ban' ? m | (1 << w.bit) : m, 0), DYEMASK = W.reduce((m, w) => w.tier === 'dye' ? m | (1 << w.bit) : m, 0);
  const norm = ing => (root.LumiWarn && root.LumiWarn.norm ? root.LumiWarn.norm(ing) : String(ing || '').toLowerCase());
  /* ingredient text -> {status: 'ok'|'none'|'lang', hits:[{id,label,tier,terms,facts}], mask} ; none/lang = the list is missing or not English (never "clear") */
  function analyze(ing) {
    const raw = String(ing || '').trim();
    if (raw.replace(/[^a-z]/gi, '').length < 3) return { status: 'none', hits: [], mask: -1 };
    if (root.LumiWarn) { const r = root.LumiWarn.analyze(raw); if (r.status === 'lang') return { status: 'lang', hits: [], mask: -2 }; }
    let s = ' ' + norm(raw) + ' '; const hits = []; let mask = 0;
    for (const w of W) { w.re.lastIndex = 0; const terms = []; let m; while ((m = w.re.exec(s))) { if (!m[0].trim()) { w.re.lastIndex++; continue; } const t = m[0].trim().replace(/\s+/g, ' '); if (!terms.includes(t)) terms.push(t); }
      if (terms.length) { hits.push({ id: w.id, label: w.label, tier: w.tier, terms, facts: w.facts }); mask |= (1 << w.bit); } }
    return { status: 'ok', hits, mask };
  }
  const api = { ASOF, S, W, TIERN, BANMASK, DYEMASK, analyze };
  root.AW26 = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
