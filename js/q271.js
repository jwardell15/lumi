/* Lumi 27.1: query understanding for search. One module, used by the search worker, the main-thread fallback and the Node harness (tools/search_eval.mjs).
   parse(q): turns nutrition modifiers ("low sugar", "high protein", "keto", "unsweetened", "healthy", "diabetic friendly", "under 10g carbs"), a store name ("costco snacks")
   and question/filler words ("is greek yogurt healthy", "show me") into filters + a clean subject, e.g. "low sugar coffee creamer" -> subject "coffee creamer" + Sugar <5 g.
   searchAll(engine, q, specs, opts): subject must match (all words, or the whole phrase) in name/category/brand; filters are per serving, same thresholds as the Smart filters
   (js/v22.js); products with added-sugar flags rank lower for sugar modifiers; when nothing passes the filters the closest subject matches are returned with a note.
   Plain queries with nothing to parse go through the unchanged engine search. */
(function (root) {
'use strict';
const SOFT = new Set(['frozen', 'organic', 'fresh', 'canned', 'dried', 'raw', 'natural', 'original', 'classic', 'plain', 'instant', 'microwave', 'vegan', 'gluten', 'dairy', 'free', 'non', 'gmo', 'whole']);
const LS = root.LumiSearch, norm = LS.norm, dl = LS.dl, STOPW = new Set(['and', 'the', 'of', 'with', 'a', 'in', 'for', 'or']);
const stem = t => t.length > 3 && t.endsWith('ies') ? t.slice(0, -3) + 'y' : t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t;
/* ---- modifiers: [id, regex on the normalized query, filters it sets, chip label, sugar-intent] (stricter sugar words first; first match per group wins) ---- */
const MODS = [
  ['nas', /\b(?:no (?:added )?sugars? added|no added sugars?|without (?:any )?added sugars?|unsweetened|not sweetened|no sweeteners? added)\b/, { nas: 1 }, 'No added sugar', 'sugar'],
  ['sugfree', /\b(?:sugar ?free|zero sugars?|no sugars?|0 ?g sugars?|sugarless|without sugar)\b/, { sug: 0.5 }, 'Sugar <0.5 g', 'sugar'],
  ['lowsugar', /\b(?:low(?:er)? (?:in )?sugars?|less sugars?|reduced sugars?|least sugars?|lowest sugars?|little sugars?)\b/, { sug: 5 }, 'Sugar <5 g', 'sugar'],
  ['lowcarb', /\b(?:low(?:er)? (?:in )?carbs?|low carbohydrates?|keto(?:genic)?(?: friendly)?|carb smart)\b/, { carb: 15 }, 'Carbs <15 g', ''],
  ['pro', /\b(?:high(?:er)? (?:in )?protein|protein packed|extra protein|more protein)\b/, { pro: 1 }, 'High protein', ''],
  ['fib', /\b(?:high(?:er)? (?:in )?fib(?:er|re)|more fib(?:er|re)|fib(?:er|re) rich)\b/, { fib: 1 }, 'High fiber', ''],
  ['sat', /\b(?:low(?:er)? (?:in )?fat|lowfat|fat ?free|non ?fat|reduced fat|less fat)\b/, { sat: 1 }, 'Low sat fat', ''],
  ['sodfree', /\b(?:sodium ?free|salt ?free|no sodium|zero sodium)\b/, { na: 5 }, 'Sodium ≤5 mg', ''],
  ['sodium', /\b(?:low(?:er)? (?:in )?(?:sodium|salt)|reduced sodium|less sodium|low sodium)\b/, { na: 140 }, 'Low sodium ≤140 mg', ''],
  ['nosalt', /\b(?:no salt(?: added)?|no added salt|unsalted|without (?:added )?salt)\b/, { na: 140, _nosalt: 1 }, 'Low sodium ≤140 mg', ''],
  ['diab', /\b(?:(?:good |best |safe |ok |okay )?for diabet(?:ics?|es)|diabet(?:ic|es)[ -]?(?:friendly|safe|approved)?|blood sugar friendly)\b/, { good: 1 }, 'Blood sugar 50+', ''],
  ['healthy', /\b(?:healthy(?! choice)|healthier|good for you|nutritious|health score)\b/, { healthy: 1 }, 'Healthy 50+', ''],
];
const STORES = [['costco', 'costco'], ['whole foods', 'wholefoods'], ['wholefoods', 'wholefoods'], ['trader joes', 'traderjoes'], ['trader joe s', 'traderjoes'], ['walmart', 'walmart'], ['target', 'target'], ['aldi', 'aldi'], ['kroger', 'kroger'], ['sams club', 'samsclub'], ['publix', 'publix'], ['heb', 'heb'], ['sprouts', 'sprouts'], ['safeway', 'safeway'], ['wegmans', 'wegmans'], ['meijer', 'meijer']];
const NUMQ = [
  [/\b(?:under|below|less than|fewer than|max|up to|no more than|within)\s+(\d+(?:\.\d+)?)\s*g?\s*(?:of\s+)?(?:total\s+)?(sugars?|carbs?|carbohydrates?)\b/g, 1],
  [/\b(\d+(?:\.\d+)?)\s*g\s*(?:of\s+)?(sugars?|carbs?|carbohydrates?)\s+or\s+(?:less|fewer)\b/g, 1],
];
const FILL = new Set(['foods', 'food', 'items', 'products', 'things', 'stuff', 'is', 'are', 'was', 'do', 'does', 'what', 'whats', 'which', 'how', 'show', 'me', 'find', 'search', 'please', 'for', 'with', 'has', 'have', 'that', 'i', 'want', 'need', 'get', 'give', 'looking', 'ideas', 'idea', 'options', 'option', 'brands', 'brand', 'best', 'top', 'good', 'great', 'some', 'any', 'a', 'an', 'the', 'my', 'to', 'eat', 'can', 'could', 'would', 'you', 'recommend', 'recommendations', 'in', 'it', 'at', 'from', 'of', 'than', 'less', 'least', 'under', 'only', 'just', 'something', 'anything', 'type', 'types', 'kind', 'kinds', 'are', 'there', 'and', 'but', 'no', 'not', 'sold', 'buy', 'when', 'on']);
const LEADQ = /^\s*(?:(?:hey|hi|please|can you|could you|would you)\s+)*(?:show me|find me|find|search for|search|look up|i want|i need|get me|give me)\s+/i;
function stripFiller(q) { const s = String(q || '').replace(LEADQ, '').replace(/\s+/g, ' ').trim(); return s || String(q || '').trim(); }
const QWORD = /^(?:is|are|was|do|does|what|whats|which|how|can|could|show|find|search|look|please|hey|hi|i|get|give|best|good|top|breakfast|snack|snacks for)\b/;
function parse(q, off) {
  const raw = String(q || ''); let s = ' ' + norm(raw) + ' '; const out = { raw, mods: [], f: {}, labels: [], unverified: [], store: null, text: '', sugarIntent: '', numeric: [] };
  if (s.trim().length === 0) { out.text = ''; return out; }
  const isOff = id => off && off.indexOf(id) >= 0;
  s = s.replace(/\b(?:is|are|how)?\s*(?:too much|high in|high|lots of|a lot of) (?:sodium|salt)\b/g, ' ').replace(/\b(low (?:sodium|salt|carb|sugar|fat|fiber))\s+diet\b/g, '$1').replace(/\bheart healthy\b/g, ' ');
  // numeric limits first ("under 10g carbs", "bars with less than 5g sugar", "20g protein")
  for (const [re] of NUMQ) s = s.replace(re, (m, n, w) => { const v = +n, isSug = /^sug/.test(w); const id = (isSug ? 'sug' : 'carb') + 'n'; if (!isOff(id)) { out.mods.push(id); if (isSug) out.f.sug = v; else out.f.carb = v; out.labels.push((isSug ? 'Sugar <' : 'Carbs <') + v + ' g'); if (isSug) out.sugarIntent = out.sugarIntent || 'sugar'; } return ' '; });
  s = s.replace(/\b(?:under|below|less than|max|up to|no more than)\s+(\d{2,4})\s*mg\s*(?:of\s+)?(?:sodium|salt)\b|\b(\d{2,4})\s*mg\s*(?:of\s+)?(?:sodium|salt)\s+or\s+(?:less|fewer)\b/g, (m, a, b) => { if (!isOff('sodn')) { out.mods.push('sodn'); out.f.na = +(a || b); out.labels.push('Sodium ≤' + (a || b) + ' mg'); } return ' '; });
  s = s.replace(/\b(?:with|has|have|at least|over|\d+)?\s*(\d+)\s*g\s+(?:of\s+)?(protein|fib(?:er|re))\b/g, (m, n, w) => { const id = /^prot/.test(w) ? 'pro' : 'fib'; if (!isOff(id)) { out.mods.push(id); out.f[id] = 1; out.labels.push(id === 'pro' ? 'High protein' : 'High fiber'); } return ' '; });
  // modifier phrases (one per group; strictest sugar wins)
  let sugDone = false;
  for (const [id, re, f, label, intent] of MODS) {
    if (intent === 'sugar' && sugDone) { s = s.replace(re, ' '); continue; }
    const m = re.exec(s); if (!m) continue; s = s.replace(re, ' '); if (intent === 'sugar') sugDone = true;
    if (isOff(id)) continue;
    out.mods.push(id); out.labels.push(label); if (f._unverified) { out.unverified.push(f._unverified); continue; } Object.assign(out.f, f); if (f._nosalt) { delete out.f._nosalt; out.nosalt = true; } if (intent === 'sugar') out.sugarIntent = id;
  }
  if (out.f.nas && out.f.sug) delete out.f.sug; // "no added sugar" and "sugar free" together: the stricter chip stays
  // store
  for (const [w, id] of STORES) { const re = new RegExp('\\b' + w + '\\b'); if (re.test(s)) { const rest = s.replace(re, ' ').replace(/\s+/g, ' ').trim(); const tk = rest.split(' ').filter(t => t && !FILL.has(t)); if (tk.length || out.mods.length) { out.store = id; s = ' ' + rest + ' '; break; } } }
  // question / filler words are dropped when the query is phrased as a question or request, or carried a modifier / store
  const words = s.trim().split(' ').filter(Boolean), qmode = out.mods.length || out.store || QWORD.test(norm(raw));
  const keep = qmode ? words.filter(w => !FILL.has(w) && w !== 'diabetics' && w !== 'diabetic') : words;
  out.text = (keep.length ? keep : (out.mods.length || out.store ? [] : words)).join(' ');
  out.active = !!(out.mods.length || out.store || out.unverified.length || out.text !== norm(raw) || LS.toks(out.text).length >= 2);
  return out;
}
/* light synonyms (whole-phrase level, used as extra search variants; never as filters) */
const SYN = [[/^snacks?$/, ['snacks', 'chips', 'crackers', 'granola bar', 'popcorn', 'nuts', 'jerky', 'pretzels', 'trail mix']], [/^(?:coffee )?creamers?$/, ['coffee creamer', 'creamer', 'coffee whitener', 'whitener']], [/^coffee whiteners?$/, ['coffee creamer', 'creamer', 'whitener']], [/^(?:soda|sodas|pop|soft drinks?)$/, ['soda', 'pop', 'soft drink']], [/^(?:chips?|crisps)$/, ['chips', 'crisps']], [/^cookies?$/, ['cookies', 'biscuits']], [/^candy$/, ['candy', 'candies']], [/^(?:yogurts?|yoghurts?)$/, ['yogurt', 'yoghurt']],
  [/^(?:jelly|jam)$/, ['jam', 'jelly', 'preserves']], [/^french fries$/, ['french fries', 'fries']], [/^fries$/, ['fries', 'french fries']], [/^(?:ice creams?)$/, ['ice cream', 'frozen dessert']], [/^(?:gum|chewing gum)$/, ['gum', 'chewing gum']], [/^(?:granola bars?|snack bars?)$/, ['granola bar', 'snack bar', 'cereal bar']], [/^(?:protein bars?)$/, ['protein bar', 'nutrition bar']], [/^(?:hot dogs?)$/, ['hot dog', 'frankfurter']],
  [/^(?:salad dressings?|dressings?)$/, ['salad dressing', 'dressing', 'vinaigrette']], [/^(?:pasta sauces?|spaghetti sauces?)$/, ['pasta sauce', 'spaghetti sauce', 'marinara']], [/^(?:sparkling water|seltzer)$/, ['sparkling water', 'seltzer']], [/^(?:energy drinks?)$/, ['energy drink']], [/^(?:mayo|mayonnaise)$/, ['mayo', 'mayonnaise']], [/^(?:ketchup|catsup)$/, ['ketchup', 'catsup']]];
function variants(text) { const v = [text]; { const tk = text.split(' ').filter(Boolean), h = tk.filter(w => !SOFT.has(w)); if (h.length && h.length < tk.length) v.push(h.join(' ')); } for (const [re, alts] of SYN) if (re.test(text)) { for (const a of alts) if (v.indexOf(a) < 0) v.push(a); break; } return v; }
/* ---- per-serving numbers (same rules as val22/perServ20 in the app) ---- */
function val(d) { const ok = d.sg > 0 && d.sb != null && d.sb >= 0 && (d.sb & 3) !== 3; if (!ok) return null; const k = d.sg / 100, m = v => v == null ? null : v * k;
  return { k, s: m(d.sugar), c: m(d.net), p: m(d.p22), f: m(d.f22), na: d.na272 != null && d.na272 >= 0 ? d.na272 * k : null, sat: m(d.s22), s100: d.s22, meal: d.src === 'rest' }; }
const added = d => d.w22 == null || d.w22 < 0 ? null : (d.w22 & 15);
function passes(d, F) { // true / false (missing data counts as not passing: never treated as zero)
  if (F.healthy && !(d.h != null && d.h >= 50)) return false; if (F.good && !(d.score != null && d.score >= 50)) return false;
  if (F.nas && added(d) !== 0) return false;
  if (F.sug != null || F.carb != null || F.pro || F.fib || F.sat || F.na != null) { const v = val(d); if (!v) return false; if (F.na != null && !(v.na != null && v.na <= F.na)) return false;
    if (F.sug != null && !(v.s != null && v.s < F.sug)) return false; if (F.carb != null && !(v.c != null && v.c < F.carb)) return false;
    if (F.pro && !(v.p != null && v.p >= (v.meal ? 20 : 15))) return false; if (F.fib && !(v.f != null && v.f >= 5)) return false;
    if (F.sat && !(v.meal ? (v.s100 != null && v.s100 <= 1) : (v.sat != null && v.sat <= 1))) return false; }
  return true;
}
/* how far a doc is from passing (for the "closest" fallback): smaller is closer */
function gap(d, F) { const v = val(d); let g = 0; if (F.sug != null) g += v && v.s != null ? Math.max(0, v.s - F.sug) / Math.max(1, F.sug) : 9; if (F.carb != null) g += v && v.c != null ? Math.max(0, v.c - F.carb) / Math.max(1, F.carb) : 9;
  if (F.pro) g += v && v.p != null ? Math.max(0, 15 - v.p) / 15 : 9; if (F.fib) g += v && v.f != null ? Math.max(0, 5 - v.f) / 5 : 9; if (F.sat) g += v && v.sat != null ? Math.max(0, v.sat - 1) : 9; if (F.nas) g += added(d) == null ? 9 : added(d); if (F.na != null) g += v && v.na != null ? Math.max(0, v.na - F.na) / Math.max(50, F.na) : 9; if (F.healthy) g += d.h != null ? Math.max(0, 50 - d.h) / 50 : 9; if (F.good) g += d.score != null ? Math.max(0, 50 - d.score) / 50 : 9; return g; }
/* product type vs companion: for "soup", "bread", "yogurt" the product itself should win over crackers/chips/crumbs/pretzels that only carry the word as a flavor or pairing */
const OTHERTYPE = /\b(crackers?|biscuits?|cookies?|cakes?|chips?|crisps?|snacks?|candy|candies|confection\w*|pretzels?|cereals?|seasoning|spices?|croutons?|crumbs?|puffs?|popcorn)\b/;
const COMPHEAD = new Set(['cracker', 'crackers', 'chip', 'chips', 'crisp', 'crisps', 'pretzel', 'pretzels', 'crumb', 'crumbs', 'crouton', 'croutons', 'seasoning', 'cookie', 'cookies', 'biscuit', 'biscuits', 'cake', 'cakes', 'puffs', 'popcorn', 'mix']);
function typeAdj(d, v) { if (d.src === 'rest' || d.src === 'whole' || !v.hard.length) return 0; const hs = v.hard, nm = norm(d.name || ''), cn = ' ' + norm(d.cat || '') + ' ';
  if (hs.some(t => COMPHEAD.has(t) || OTHERTYPE.test(t))) return 0; let a = 0;
  const catHas = hs.every(t => cn.includes(' ' + t + ' ') || cn.includes(' ' + t + 's ') || cn.includes(' ' + stem(t) + ' ') || cn.includes(stem(t))), head = nm.split(' ').filter(Boolean).slice(-1)[0] || '';
  if (catHas) a += 6; else if (d.cat && OTHERTYPE.test(cn)) a -= 22;
  if (COMPHEAD.has(head) && head !== hs[hs.length - 1]) a -= 18;
  if (hs.some(t => new RegExp('\\b' + t + 's? (?:covered|dipped|flavou?red|crumbs?|seasoning|croutons?|chips|crackers|cookies|pretzels)\\b|\\b(?:for|with|and) (?:\\w+ )?' + t + 's?\\b').test(nm))) a -= 10;
  return a; }
/* whole-food boost: a generic one-word food query ("broccoli", "salmon", "eggs") should start with the plain USDA food ("Broccoli, raw"), not a brand */
const wholeHead = (d, v) => { const segs = String(d.name || '').split(','), hw = norm(segs.slice(0, 2).join(' ')).split(' ').filter(Boolean).map(stem), all = norm(d.name || '').split(' ').filter(Boolean).length; return all <= v.tk.length + 3 && v.tk.every(t => hw.includes(stem(t))); };
/* a bare modifier ("low sugar", "high protein") has no subject: show a spread of good, ordinary foods across categories instead of whatever has the lowest numbers */
const MIXSKIP = /water|seasoning|spice|salt|extract|vinegar|coffee|tea\b|flavor|baking|sweetener|stevia|supplement|vitamin|powder|broth/i;
function mixPicks(pass) { const cnt = new Map(), out = []; let n = 0;
  for (const x of pass) { const d = x[1]; if (d.h == null || d.h < 50 || d.src === 'rest' && out.length > 30 && n++ > 20 || MIXSKIP.test(d.cat || '') || MIXSKIP.test(d.name || '')) continue; const leaf = String(d.cat || d.name).toLowerCase(); if ((cnt.get(leaf) || 0) >= 1) continue; cnt.set(leaf, 1); out.push([x[0] + 20 - out.length * 0.2, d]); if (out.length >= 80) break; }
  return out.length >= 12 ? out : pass; }
/* ---- subject gate: every subject word appears (exact, plural, prefix or 1-typo) in the name / category / brand, or the whole phrase does ---- */
const words = d => d._w271 || (d._w271 = norm(d.name + ' ' + (d.cat || '') + ' ' + (d.brand || '')).split(' ').filter(Boolean));
const hardOf = tk => { const h = tk.filter(t => !SOFT.has(t)); return h.length ? h : tk; };
function tokOK(t, ws, fuzzy) { for (const w of ws) { if (w === t || stem(w) === t) return true; if (t.length >= 4 && w.startsWith(t) && w.length <= t.length + 3) return true; if (fuzzy && t.length >= 4 && w[0] === t[0] && Math.abs(w.length - t.length) <= 1 && dl(t, w, 1) <= 1) return true; } return false; }
function subjectOK(d, vs, fuzzy, useKi) { const ws = words(d); for (const v of vs) { if (!v.tk.length) return true; if (useKi && v.ki >= 0 && d.keys && d.keys.includes(v.ki)) return true; if (d.nn.includes(v.nq) || (' ' + norm(d.cat || '') + ' ').includes(' ' + v.nq + ' ')) return true; let ok = true; for (const t of v.hard) if (!tokOK(t, ws, fuzzy)) { ok = false; break; } if (ok) return true; } return false; }
const STRONGSOFT = new Set(['frozen', 'dried', 'canned', 'fresh', 'raw', 'instant', 'microwave']);
const softHits = (d, v) => { const ws = words(d); let n = 0; for (const t of v.tk) if (SOFT.has(t) && tokOK(t, ws, false)) n += STRONGSOFT.has(t) ? 14 : 7; return n; };
const storeIdx = id => root.LumiStores ? root.LumiStores.STORES.findIndex(x => x[0] === id) : -1;
const inStore = (d, i) => i >= 0 && (root.LumiStores.has(d.sm, i) || root.LumiStores.has(d.sm, root.LumiStores.SOLD + i));
const SRCK = { rest: 'rest', whole: 'whole' };
/* ranking nudges: added sugar hurts for sugar words (any added sugar is out for "no added sugar"); sweetener-type flags sit below clean ones */
function nudge(d, P) { let r = 0; const a = added(d), v = val(d);
  if (P.sugarIntent) { if (a > 0) r -= Math.min(36, 14 * a); else if (a === 0) r += 5; if (P.sugarIntent !== 'nas' && d.w22 != null && d.w22 > 0 && (d.w22 & ~((1 << 21) | 31))) r -= 3; if (v && v.s != null && P.f.sug != null) r += 10 * (1 - Math.min(v.s, P.f.sug) / P.f.sug); }
  if (P.f.na != null && v && v.na != null) r += 6 * (1 - Math.min(v.na, P.f.na) / P.f.na);
  if (P.f.pro && v && v.p != null) r += Math.min(10, v.p / 3); if (P.f.fib && v && v.f != null) r += Math.min(6, v.f); if (P.f.carb != null && v && v.c != null) r += 6 * (1 - Math.min(v.c, P.f.carb) / P.f.carb);
  if (d.h != null) r += 0.08 * (d.h - 50); return r; }
const NOTE_UNIT = { sug: v => `under ${v} g sugar`, carb: v => `under ${v} g carbs`, pro: () => 'with 15 g+ protein', fib: () => 'with 5 g+ fiber', sat: () => 'with 1 g or less sat fat', nas: () => 'with no added sugar', na: v => `with ${v} mg sodium or less`, healthy: () => 'with Health 50+', good: () => 'with Blood sugar 50+' };
function noteFor(P, text) { const bits = Object.keys(P.f).filter(k => NOTE_UNIT[k]).map(k => NOTE_UNIT[k](P.f[k])); const subj = text || 'products'; return `No ${subj}${/s$/.test(subj) ? '' : 's'} ${bits.join(' and ')} per serving; showing closest.`.replace(' per serving; showing closest', P.f.nas && bits.length === 1 ? '; showing closest' : ' per serving; showing closest'); }
function chainSquash(engine, q) { const cn = engine.chainN; if (!cn || !cn.length) return q; const tk = norm(q).split(' '); let ch = false;
  for (let i = 0; i < tk.length; i++) { if (tk[i].length < 6) continue; for (const c of cn) if (c.n.indexOf(' ') > 0 && c.n.replace(/ /g, '') === tk[i]) { tk[i] = c.n; ch = true; break; } } return ch ? tk.join(' ') : q; }
/* the main entry. specs: [{limit, src}] like the app's three passes. Returns {lists, meta}. */
function searchAll(engine, q, specs, opts) {
  opts = opts || {}; q = chainSquash(engine, q); const P = parse(q, opts.off), fkeys = Object.keys(P.f);
  const meta = { nosalt: !!P.nosalt, active: P.active, text: P.text, mods: P.mods, labels: P.labels, f: P.f, store: P.store, unverified: P.unverified, nomatch: false, note: '' };
  if (!P.active) return { lists: specs.map(sp => engine.search(q, { limit: sp.limit || 80, prefix: !!sp.prefix, filter: sp.src ? (d => d.src === sp.src) : undefined })), meta };
  const si = P.store ? storeIdx(P.store) : -1, vs = P.text ? variants(P.text).map(t => { const tk = LS.toks(t); return { nq: norm(t), tk, hard: hardOf(tk), ki: engine.catKey ? engine.catKey(t) : -1 }; }) : [];
  // candidates
  let cand = new Map(); // code -> [rel, doc]
  const take = (d, rel) => { const c = cand.get(d.code); if (!c || c[0] < rel) cand.set(d.code, [rel, d]); };
  if (vs.length) { for (const v of variants(P.text)) for (const d of engine.search(v, { limit: 900 })) take(d, d.rel); for (const sp of specs) if (sp.src) for (const v of variants(P.text)) for (const d of engine.search(v, { limit: 200, filter: x => x.src === sp.src })) take(d, d.rel); }
  if (vs.length && si >= 0) { const N = engine.docs.length || 1; for (const d of engine.docs) { if (!inStore(d, si) || cand.has(d.code)) continue; take(d, 20 * (1 - d.rank / N) + (d.score != null ? 0.1 * (d.score - 50) : 0)); } }
  if (!vs.length) { const N = engine.docs.length || 1; for (const d of engine.docs) { if (si >= 0 ? !inStore(d, si) : false) continue; take(d, 40 * (1 - d.rank / N) + (d.score != null ? 0.15 * (d.score - 50) : 0) + (LS.KNOWNB.test(d.brand) ? 12 : 0)); } }
  const gather = (fuzzy, ki) => { const ok = []; for (const [, [rel, d]] of cand) { if (si >= 0 && !inStore(d, si)) continue;
      if (vs.length && !subjectOK(d, vs, fuzzy, ki)) { if (d.src !== 'rest') continue; /* chain items: the chain name is the brand; keep what the engine ranked if one subject word beyond it matches */ const ws = words(d); if (vs[0].tk.length < 2 || !vs[0].hard.some(t => tokOK(t, ws, fuzzy))) continue; }
      let bonus = 0; if (vs.length) { bonus = Math.max(...vs.map(v => softHits(d, v))); const cn = ' ' + norm(d.cat || '') + ' '; if (vs[0].hard.length && vs[0].hard.every(t => cn.includes(' ' + t + ' ') || cn.includes(' ' + t + 's '))) bonus += 8; const hw = norm(String(d.name || '').split(/[,(\-]/)[0]).split(' ').filter(Boolean); bonus += typeAdj(d, vs[0]); if (hw.length && vs[0].hard.length && stem(hw[hw.length - 1]) === stem(vs[0].hard[vs[0].hard.length - 1])) bonus += 8; if (d.src === 'whole' && !SOFT.has(vs[0].tk[0]) && wholeHead(d, vs[0])) bonus += 14; } ok.push([rel + bonus + nudge(d, P), d]); } return ok; };
  let ok0 = gather(false, false); if (vs.length && ok0.length < 8) { const k2 = gather(false, true); if (k2.length > ok0.length) ok0 = k2; } if (vs.length && !ok0.length) ok0 = gather(true, true);
  if (!ok0.length && !fkeys.length && !P.store && vs.length) return { lists: specs.map(sp => engine.search(q, { limit: sp.limit || 80, prefix: !!sp.prefix, filter: sp.src ? (d => d.src === sp.src) : undefined })), meta: Object.assign(meta, { active: false }) };
  let pass = fkeys.length ? ok0.filter(x => passes(x[1], P.f)) : ok0;
  const anyPass = pass.length > 0;
  if (fkeys.length && !anyPass && ok0.length) { meta.nomatch = true; meta.note = noteFor(P, P.text); pass = ok0.map(x => [x[0] - 30 * gap(x[1], P.f), x[1]]); }
  pass.sort((a, b) => b[0] - a[0]);
  if (!P.text && !P.store && pass.length > 40 && anyPass) pass = mixPicks(pass);
  const lists = specs.map(sp => { const L = []; for (const [r, d] of pass) { if (sp.src && d.src !== sp.src) continue; L.push(Object.assign({}, d, { rel: r })); if (L.length >= (sp.limit || 80)) break; } return L; });
  if (!P.text && !pass.length) meta.note = '';
  if (P.nosalt) meta.note = (meta.note ? meta.note + ' ' : '') + '"No salt added" can\'t be verified from labels, so this shows low sodium (140 mg or less per serving).';
  if (P.unverified.length) meta.note = (meta.note ? meta.note + ' ' : '') + `Lumi has no sodium data, so "low sodium" can't be checked.`;
  return { lists, meta };
}
/* what the app shows for the three passes: deduped, best match first (the Node harness uses this) */
function run(engine, q, o) { const specs = (o && o.specs) || [{ limit: 160 }, { limit: 30, src: 'rest' }, { limit: 30, src: 'whole' }]; const r = searchAll(engine, q, specs, o), seen = new Set(), items = [];
  for (const L of r.lists) for (const d of L) if (!seen.has(d.code)) { seen.add(d.code); items.push(d); } items.sort((a, b) => b.rel - a.rel);
  return { items, note: r.meta.note, chips: r.meta.labels, meta: r.meta }; }
/* "Best matches" pool (both columns): only items that match the subject and pass the parsed filters. items: app list items or docs (name, cat, brand, keys, src, h, score, rel...) */
function itemDoc(i) { return i._d271 || (i._d271 = Object.assign({}, i, { nn: norm((i.name || '') + ' ' + (i.brand || '')), keys: i.keys || [] })); }
function bestPool(items, P, engine) { const vs = P && P.text ? variants(P.text).map(t => { const tk = LS.toks(t); return { nq: norm(t), tk, hard: hardOf(tk), ki: engine && engine.catKey ? engine.catKey(t) : -1 }; }) : [];
  let L = items.filter(i => i.src !== 'cos' && i.score != null && i.h != null && !i.fl && !i.bad).sort((a, b) => (b.rel || 0) - (a.rel || 0)).slice(0, 40);
  if (vs.length) { const strict = L.filter(i => i.src === 'rest' || subjectOK(itemDoc(i), vs, false, false)); L = strict.length >= 4 ? strict : L.filter(i => i.src === 'rest' || subjectOK(itemDoc(i), vs, true, true)); }
  if (P && P.f && Object.keys(P.f).length && !(P.nomatch)) L = L.filter(i => passes(i, P.f));
  return L; }
root.Q271 = { bestPool, subjectOK, parse, variants, stripFiller, passes, val, added, gap, searchAll, run, MODS, STORES };
})(typeof self !== 'undefined' ? self : globalThis);
