/* Lumi v6.3 store brands + brand-name normalization. Shared by build (node) and app. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.LumiStores = f(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
// [id, chip label, store name, own-brand regex (on normalized brand), OFF "stores" field regex]
const STORES = [
  ['walmart', 'Great Value', 'Walmart', /^(great value|marketside|sam'?s choice|bettergoods|freshness guaranteed|parent'?s choice|prima della|spring valley|equate)\b/, /\bwal-?mart\b/],
  ['costco', 'Kirkland', 'Costco', /^kirkland( signature)?\b|\bkirc?kland('?s)?\b/, /\bcostco\b/],
  ['target', 'Good & Gather', 'Target', /^(good (&|and) gather|market pantry|favorite day|archer farms|simply balanced|up (&|and) up|dealworthy)\b/, /\btarget\b/],
  ['kroger', 'Kroger', 'Kroger', /^(kroger|simple truth|private selection|heritage farm|psst|smart way|home chef|bakery fresh goodness|big k|check this out)\b/, /\b(kroger|ralphs|fred meyer|king soopers|fry'?s|smith'?s|harris teeter|mariano'?s|dillons|qfc)\b/],
  ['wholefoods', '365', 'Whole Foods', /^(365|whole foods)\b/, /\bwhole foods\b/],
  ['traderjoes', "Trader Joe's", "Trader Joe's", /^trader (joe'?s|giotto'?s|ming'?s|jose'?s)\b/, /\btrader joe'?s\b/],
  ['aldi', 'Aldi', 'Aldi', /^(simply nature|millville|clancy'?s|specially selected|friendly farms|happy farms|baker'?s corner|fit (&|and) active|season'?s choice|l'?oven fresh|never any|savoritz|benton'?s|southern grove|stonemill|elevation by millville|choceur|barissimo|casa mamita|mama cozzi'?s|appleton farms|priano|earth grown|moser roth|park street deli|reggano|countryside creamery|emporium selection|bremer|sundae shoppe|brookdale|kirkwood|simms|tuscan garden|little salad bar|nature'?s nectar|northern catch|fremont fish market|chef'?s cupboard|pueblo lindo|live g free|carlini|deutsche k(u|ü)che|aldi|fusia|goldhen|burman'?s|dakota'?s pride|lunch mate|puraqua|benner)\b/, /\baldi\b/],
  ['heb', 'H-E-B', 'H-E-B', /^(h ?e ?b|hill country fare|central market|higher harvest)\b/, /\bh-?e-?b\b/],
  ['publix', 'Publix', 'Publix', /^(publix|greenwise)\b/, /\bpublix\b/],
  ['hyvee', 'Hy-Vee', 'Hy-Vee', /^(hy ?-?vee|midwest country fare)\b/, /\bhy-?vee\b/],
  ['meijer', 'Meijer', 'Meijer', /^(meijer|true goodness|frederik'?s|purely meijer)\b/, /\bmeijer\b/],
  ['safeway', 'Signature / O Organics', 'Safeway & Albertsons', /^(signature (select|kitchens|farms|cafe|care|reserve)|o organics|open nature|lucerne|waterfront bistro|primo taglio|value corner)\b/, /\b(safeway|albertsons|vons|jewel|shaw'?s|acme|tom thumb|randalls)\b/],
  ['wegmans', 'Wegmans', 'Wegmans', /^wegmans( food markets)?\b/, /\bwegmans\b/],
  ['samsclub', "Member's Mark", "Sam's Club", /^member'?s mark\b/, /\bsam'?s club\b/],
  ['sprouts', 'Sprouts', 'Sprouts', /^sprouts( farmers? market)?\b/, /\bsprouts\b/],
  ['seveneleven', '7-Eleven', '7-Eleven', /^(7 ?eleven|7 ?select)\b/, /\b7 ?-? ?eleven\b/, 'c'],
  ['caseys', "Casey's", "Casey's", /^casey'?s\b/, /\bcasey'?s\b/, 'c'],
  ['kwiktrip', 'Kwik Trip', 'Kwik Trip / Kwik Star', /^kwik (trip|star)\b/, /\bkwik ?(trip|star)\b/, 'c'],
  ['quiktrip', 'QuikTrip', 'QuikTrip', /^(quik ?trip|qt kitchens?)\b/, /\bquik ?trip\b/, 'c'],
  ['wawa', 'Wawa', 'Wawa', /^wawa\b/, /\bwawa\b/, 'c'],
  ['sheetz', 'Sheetz', 'Sheetz', /^sheetz\b/, /\bsheetz\b/, 'c'],
  ['circlek', 'Circle K', 'Circle K', /^circle k\b/, /\bcircle ?k\b/, 'c'],
  ['bucees', "Buc-ee's", "Buc-ee's", /^buc ?ee'?s\b/, /\bbuc-?ee'?s\b/, 'c']
];
// explicit aliases (lower-case key -> canonical); everything else is case/spacing-normalized to its most common spelling at build
const ALIAS = { 'rlife': 'fairlife', 'fair life': 'fairlife', 'kirkland': 'Kirkland Signature', 'kirkland signature': 'Kirkland Signature', 'kirkland signature organic': 'Kirkland Signature', 'great value': 'Great Value', 'greatvalue': 'Great Value',
  "trader joes": "Trader Joe's", "trader joe's": "Trader Joe's", 'trader joe': "Trader Joe's", 'heb': 'H-E-B', 'h e b': 'H-E-B', 'h-e-b': 'H-E-B', 'hyvee': 'Hy-Vee', 'hy vee': 'Hy-Vee', 'hy-vee': 'Hy-Vee',
  '365 everyday value': '365 by Whole Foods Market', '365 by whole foods market': '365 by Whole Foods Market', 'whole foods market': '365 by Whole Foods Market', '365': '365 by Whole Foods Market', '365 whole foods market': '365 by Whole Foods Market',
  'good & gather': 'Good & Gather', 'good and gather': 'Good & Gather', "members mark": "Member's Mark", "member's mark": "Member's Mark", 'simple truth organic': 'Simple Truth Organic', 'simple truth': 'Simple Truth',
  'the kroger co.': 'Kroger', 'the kroger co': 'Kroger', 'kroger': 'Kroger', 'publix': 'Publix', 'meijer': 'Meijer', 'wegmans': 'Wegmans', 'wegmans food markets': 'Wegmans', "sam's choice": "Sam's Choice", 'o organics': 'O Organics', 'signature select': 'Signature Select',
  'coca cola': 'Coca-Cola', 'coca-cola': 'Coca-Cola', 'pepsico': 'PepsiCo', 'general mills': 'General Mills', 'kellogg': "Kellogg's", "kellogg's": "Kellogg's", 'kelloggs': "Kellogg's" };
const key = b => String(b || '').toLowerCase().replace(/[®™©]/g, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').replace(/[.,]+$/, '').trim();
function alias(b) { const k = key(b); return ALIAS[k] || null; }
/* brand + OFF stores -> number: own brand = 2^i, "sold at" = 2^(SOLD+i). v11.1: arithmetic (not 32-bit bitwise) so up to 26 stores fit. */
const SOLD = 26; const has = (m, b) => Math.floor((m || 0) / 2 ** b) % 2 === 1;
function mask(brand, stores) {
  const b = key(brand).replace(/’/g, "'"), s = String(stores || '').toLowerCase(); let m = 0;
  STORES.forEach((x, i) => { if (x[3].test(b)) m += 2 ** i; if (s && x[4].test(s)) m += 2 ** (SOLD + i); });
  return m;
}
return { STORES, ALIAS, key, alias, mask, has, SOLD };
});
