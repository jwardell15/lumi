/* Lumi 22.0: ingredient warnings. Pure matcher (browser + Node; tools/build_f22.js uses the same code for the list-card data).
   Reads a product's own ingredient list and flags hidden/added sugars, seed and hydrogenated oils, and notable additives,
   each with a short factual note and a severity: info (a note), caution, avoid. Display only: no score uses this. */
(function (root) {
  'use strict';
  const SEV = ['info', 'caution', 'avoid'];
  /* ---- added sugars: [canonical name, regex, fast (mostly glucose: faster rise than table sugar)] ---- */
  const SUG = [
    ['high-fructose corn syrup', /\bhigh[- ]fructose corn syrups?\b|\bhfcs\b|\bglucose[- ]fructose(?: syrup)?\b|\bisoglucose\b/g],
    ['corn syrup', /\b(?:dried )?corn syrups?(?: solids)?\b/g, 1],
    ['glucose syrup', /\b(?:dried )?glucose syrups?(?: solids)?\b|\bglucose solids\b|\bliquid glucose\b/g, 1],
    ['maltodextrin', /\bmaltodextrins?\b/g, 1],
    ['dextrose', /\b(?:dextrose(?: monohydrate)?|corn sugar)\b/g, 1],
    ['rice syrup', /\b(?:organic )?(?:brown )?rice (?:malt )?syrups?(?: solids)?\b/g, 1],
    ['tapioca syrup', /\btapioca syrups?(?: solids)?\b/g, 1],
    ['isomaltooligosaccharides (IMO)', /\bisomalto[- ]?oligosaccharides?\b/g, 1],
    ['maltose', /\bmaltose\b/g, 1],
    ['glucose', /\bglucose\b(?![- ]?(?:oxidase|syrup))/g, 1],
    ['barley malt', /\b(?:barley )?malt(?:ed barley)? (?:syrup|extract)s?\b|\bmalted barley extract\b|\bbarley malt\b(?! (?:vinegar|flour))|\bmalt syrup\b/g],
    ['evaporated cane juice', /\b(?:organic )?(?:evaporated |dried )?(?:sugar ?)?cane (?:juice|syrup)(?: crystals| solids)?\b|\bcane juice\b|\bcane syrup\b/g],
    ['invert sugar', /\binvert(?:ed)? (?:cane )?(?:sugar|syrup)(?: syrup)?\b/g],
    ['brown sugar', /\b(?:organic |light |dark |golden )*brown sugar\b/g],
    ['coconut sugar', /\bcoconut (?:palm )?(?:sugar|nectar|syrup)\b/g],
    ['date syrup', /\bdate (?:syrup|sugar)\b/g],
    ['maple syrup', /\b(?:organic |pure )*maple (?:syrup|sugar)\b/g],
    ['molasses', /\b(?:blackstrap |cane |sugar ?cane |organic )*molasses\b|\btreacle\b/g],
    ['honey', /\b(?:organic |raw |clover |wildflower |dried |pure )*honey\b(?! ?(?:dew|comb|crisp apple))/g],
    ['agave', /\b(?:organic |blue )*agave(?: syrup| nectar)?\b(?! ?(?:inulin|fiber|fibre))/g],
    ['fruit juice concentrate', /\b(?:[a-z]+ ){0,2}juice concentrates?\b|\bconcentrated (?:[a-z]+ ){0,2}juices?\b|\b(?:[a-z]+ )?juices? from concentrate\b/g],
    ['golden syrup', /\bgolden syrup\b/g],
    ['sorghum syrup', /\bsorghum syrup\b/g],
    ['fructose', /\b(?:crystalline )?fructose\b/g],
    ['trehalose', /\btrehalose\b/g],
    ['turbinado sugar', /\bturbinado(?: sugar)?\b|\bdemerara(?: sugar)?\b|\bmuscovado(?: sugar)?\b|\bsucanat\b|\brapadura\b|\bpanela\b|\bpiloncillo\b|\bjaggery\b/g],
    ['sugar', /\b(?:organic |raw |pure |granulated |dried |natural |fine |powdered |confectioner'?s'? |icing |cane |beet |white |caster |unrefined |evaporated )*(?:sugar|sucrose)\b|\bsimple syrup\b/g]
  ];
  /* not sugars (consumed first so they never match a sugar term) */
  const NOTSUG = /\bsugar alcohols?\b|\bsugar snap\b|\bsugar ?beet fib(?:er|re)\b|\bsugar ?cane fib(?:er|re)\b|\b(?:digestion[- ])?resistant (?:malto)?dextrins?\b|\bsoluble corn fib(?:er|re)\b|\bpolydextrose\b|\b(?:lemon|lime) juice concentrates?\b|\bconcentrated (?:lemon|lime) juices?\b|\bsugars?\s*(?=\()|\bcaramel colou?r\b|\bglucono[- ]?delta[- ]?lactone\b|\bglucosamine\b|\b(?:non|un)[- ]?hydrogenated\b|\b(?:vegetable|carrot|purple carrot|black carrot|beet|beetroot|radish|red radish|tomato|celery|spinach|purple sweet potato|sweet potato|red cabbage|cabbage|onion|garlic|pumpkin|paprika|turmeric) juice concentrates?\b|\bconcentrated (?:vegetable|carrot|beet|tomato|celery) juices?\b|\b[a-z]+ juice concentrates? \((?:for |to add )?colou?r\)|\bsugar ?cane (?:fib(?:er|re)|extract)\b/g;
  const SRC = '(?:canola|rapeseed|soybean|soya?|corn|cottonseed|sunflower(?:seed)?|safflower|grape ?seed|rice bran)';
  const MOD = '(?:(?:expeller[- ]pressed|cold[- ]pressed|high[- ]oleic|mid[- ]oleic|organic|refined|non[- ]gmo)\\s+)*';
  const ANYSRC = '(?:canola|rapeseed|soybean|soya?|corn|cottonseed|sunflower(?:seed)?|safflower|grape ?seed|rice bran|palm(?: kernel)?|palm fruit|olive|coconut|avocado|peanut|sesame|vegetable|cocoa)';
  const SEP = '(?:\\s*,\\s*|\\s+or\\s+|\\s+and\\s+|\\s*,\\s*(?:and|or)\\s+)';
  const OILRUN = new RegExp('\\b(' + MOD + ANYSRC + ')(?=(?:' + SEP + MOD + ANYSRC + ')*' + SEP + MOD + ANYSRC + '\\s+oils?\\b)', 'g');
  /* the rest: [id, bit, sev, label, note, regex] */
  const ADD = [
    ['phoil', 6, 2, 'Partially hydrogenated oil', 'The main source of artificial trans fat, which raises LDL cholesterol. The FDA ended its GRAS status in 2018.', /\bpartially[- ]hydrogenated\b[^,;()\[\]]{0,60}/g],
    ['fhoil', 22, 0, 'Fully hydrogenated oil', 'Fully hydrogenated oil has almost no trans fat, but it is a heavily processed fat.', /\bfully[- ]hydrogenated\b[^,;()\[\]]{0,60}/g],
    ['hsh', 9, 1, 'Hydrogenated starch hydrolysate', 'A sugar alcohol made from starch; it can raise blood sugar noticeably.', /\bhydrogenated starch hydrolysates?\b/g],
    ['hoil', 7, 1, 'Hydrogenated oil', 'The label doesn\u2019t say fully or partially hydrogenated; partially hydrogenated oil contains trans fat.', /\b(?:interesterified (?:and|or) )?hydrogenated\b(?! starch)[^,;()\[\]]{0,60}/g],
    ['bvo', 12, 2, 'Brominated vegetable oil', 'The FDA revoked its approval for food in 2024.', /\bbrominated vegetable oils?\b|\bbvo\b/g],
    ['seed', 5, 1, 'Seed oil', 'Refined seed oil, high in omega-6 fat. Research on its health effects is mixed.', new RegExp('\\b' + MOD + SRC + '(?: seed)? oils?\\b|\\b(?:canola|rapeseed|cottonseed|safflower|grapeseed)\\b(?! ?(?:lecithin|meal|protein|flour|seeds?\\b))', 'g')],
    ['vegoil', 20, 0, 'Vegetable oil (source not listed)', 'The label doesn\u2019t say which plant the oil comes from.', /\bvegetable oils?\b(?!\s*\()/g],
    ['maltitol', 9, 1, 'Maltitol', 'A sugar alcohol that raises blood sugar noticeably (about half as much as sugar) and can upset digestion.', /\bmaltitol(?: syrup)?\b/g],
    ['ery', 10, 0, 'Erythritol', 'Sugar alcohol with almost no effect on blood sugar.', /\berythritol\b/g],
    ['allulose', 10, 0, 'Allulose', 'Rare sugar with almost no effect on blood sugar; not counted as added sugar.', /\ballulose\b|\bd-psicose\b/g],
    ['polyol', 10, 0, 'Sugar alcohol', 'Smaller effect on blood sugar than sugar; large amounts can upset digestion.', /\b(?:sorbitol|xylitol|isomalt|lactitol|mannitol)\b/g],
    ['sweet', 8, 0, 'Artificial sweetener', 'No direct effect on blood sugar. Listed for people who prefer to limit it.', /\bsucralose\b|\baspartame\b|\bacesulfame(?:[- ](?:potassium|k))?\b|\bace[- ]k\b|\b(?:sodium |calcium )?saccharin\b|\bneotame\b|\badvantame\b|\bcyclamate\b|\be9(?:50|51|54|55|61|62)\b/g],
    ['red3', 12, 2, 'Red 3 (erythrosine)', 'Synthetic dye; the FDA revoked its use in food in 2025 (makers have until 2027).', /\b(?:fd ?& ?c |fd and c )?red\s*(?:no\.?\s*|#\s*)?3\b(?:\s*lake)?|\berythrosine\b|\be127\b/g],
    ['dyeE', 11, 1, 'Artificial color', 'Synthetic dye. In the EU, foods with it must carry a warning that it may affect attention and activity in children.', /\b(?:fd ?& ?c |fd and c )?(?:red\s*(?:no\.?\s*|#\s*)?40|yellow\s*(?:no\.?\s*|#\s*)?[56])\b(?:\s*lake)?|\ballura red(?: ac)?\b|\btartrazine\b|\bsunset yellow(?: fcf)?\b|\be1(?:02|10|29)\b/g],
    ['dye', 11, 1, 'Artificial color', 'Synthetic food dye.', /\b(?:fd ?& ?c |fd and c )?(?:blue\s*(?:no\.?\s*|#\s*)?[12]|green\s*(?:no\.?\s*|#\s*)?3|citrus red\s*(?:no\.?\s*|#\s*)?2)\b(?:\s*lake)?|\bbrilliant blue(?: fcf)?\b|\bindigo(?:tine| carmine)\b|\bfast green(?: fcf)?\b|\be1(?:32|33|43)\b|\bartificial colou?r(?:s|ing|ings)?\b|\bartificially colou?red\b/g],
    ['tio2', 18, 1, 'Titanium dioxide', 'Whitening color; no longer allowed in food in the EU since 2022.', /\btitanium dioxide\b|\be171\b/g],
    ['bromate', 12, 2, 'Potassium bromate', 'Flour additive banned in food in the EU, UK and Canada, and in California from 2027; a possible carcinogen (IARC).', /\bpotassium bromate\b|\bbromated (?:wheat )?flour\b/g],
    ['nitrite', 13, 1, 'Nitrite / nitrate', 'Curing salt used in processed meats. The WHO\u2019s cancer agency classes processed meat as a cause of colorectal cancer.', /\b(?:sodium|potassium) nitr(?:ite|ate)s?\b|\be2(?:49|50|51|52)\b/g],
    ['celery', 14, 0, 'Celery powder (natural nitrite)', 'A natural source of nitrite used for curing; it works the same way as added nitrite.', /\b(?:cultured |organic )*celery (?:powder|juice powder|juice|extract)\b/g],
    ['carr', 15, 0, 'Carrageenan', 'Seaweed thickener, approved in the US; some studies suggest it may irritate the gut.', /\bcarrageenan\b|\be407a?\b/g],
    ['bha', 16, 1, 'BHA', 'Preservative the US National Toxicology Program lists as \u201creasonably anticipated\u201d to be a human carcinogen.', /\bbha\b|\bbutylated hydroxyanisole\b|\be320\b/g],
    ['tbhq', 16, 1, 'TBHQ', 'Synthetic preservative; the FDA caps it at 0.02% of the fat in a food.', /\btbhq\b|\btert(?:iary)?[- ]?butyl ?hydroquinone\b|\be319\b/g],
    ['bht', 17, 0, 'BHT', 'Preservative approved in the US; evidence of harm at food levels is limited.', /\bbht\b|\bbutylated hydroxytoluene\b|\be321\b/g],
    ['paraben', 24, 1, 'Propylparaben', 'Preservative that California bans in food from 2027.', /\bpropyl ?paraben\b|\be216\b/g],
    ['msg', 19, 0, 'MSG', 'Flavor enhancer the FDA considers safe; listed for people who prefer to avoid it.', /\bmonosodium glutamate\b|\bmsg\b|\be621\b/g]
  ];
  const EN = /\b(water|salt|sugar|oil|flour|milk|natural|acid|and|wheat|corn|cream|contains|less than|of|with|vitamin|powder|syrup|starch|extract)\b/g;
  const FOREIGN = /\b(sucre|sel|lait|huile|farine|eau|sirop|amidon|azucar|az\u00facar|leche|aceite|harina|agua|zucker|milch|wasser|mehl|zucchero|latte|olio|farina|acqua|suiker|melk|olie|cukier|mleko|acucar|a\u00e7\u00facar|agua|et|de|du|des|und|mit|con|di|del|y|em|ou|oder|ingr[e\u00e9]dients|zutaten|ingredientes|ingredienti)\b/g;
  function norm(ing) {
    let s = String(ing || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019`\u00b4]/g, "'").replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ');
    s = s.replace(/^\s*ingredients?\s*:?/, ' ').replace(/[\[{]/g, '(').replace(/[\]}]/g, ')').replace(/\s*\*+/g, ' ');
    s = s.replace(/\band\s*\/\s*or\b/g, ' or ').replace(/\b(?:contains )?no more than\b/g, 'less than');
    // claims are not ingredients: "sugar-free", "no sugar added", "no artificial colors", "without nitrites", "free of ..."
    s = s.replace(/\b[a-z]+(?:[- ][a-z]+)?-free\b/g, ' ').replace(/\b(?:sugar|nitrite|nitrate|msg|dye|gluten|fat) free\b/g, ' ');
    s = s.replace(/\b(?:no|zero|without|free (?:of|from)|contains no|not added|nothing artificial|never any)\b(?: added)?[^,;().:]*/g, ' ');
    s = s.replace(/\bunsweetened\b/g, ' ');
    // "canola, soybean and/or sunflower oil" -> each source is an oil; "vegetable oil (soybean, canola)" likewise
    s = s.replace(/\b(oils?)\s*\(([^()]*)\)/g, (m, o, inner) => o + ' (' + inner.replace(new RegExp('\\b(' + MOD + ANYSRC + ')\\b(?!\\s+oils?\\b)', 'g'), '$1 oil') + ')');
    s = s.replace(OILRUN, '$1 oil');
    return s;
  }
  const blank = (s, m, i) => s.slice(0, i) + ' '.repeat(m.length) + s.slice(i + m.length);
  function take(s, re, hit) { re.lastIndex = 0; let m, out = s; while ((m = re.exec(s))) { if (!m[0].trim()) { re.lastIndex++; continue; } hit(m[0].trim(), m.index); out = blank(out, m[0], m.index); } return out; }
  function analyze(ing) {
    const raw = String(ing || '').trim();
    if (raw.replace(/[^a-z]/gi, '').length < 3) return { status: 'none', list: [], sugars: [], mask: -1 };
    let s = ' ' + norm(raw) + ' '; const s0 = s;
    const en = (s.match(EN) || []).length, fo = (s.match(FOREIGN) || []).length;
    if (fo >= 3 && fo > en) return { status: 'lang', list: [], sugars: [], mask: -2 };
    const list = [], byId = new Map(), push = (id, bit, sev, label, note, term) => { let w = byId.get(id); if (!w) { w = { id, bit, sev: SEV[sev], lv: sev, label, note, terms: [] }; byId.set(id, w); list.push(w); } const t = term.replace(/\s+/g, ' '); if (!w.terms.includes(t)) w.terms.push(t); };
    s = take(s, NOTSUG, () => {});
    // oils + polyols first (so "hydrogenated starch hydrolysate" and "hydrogenated soybean oil" never read as sugar or seed oil)
    for (const a of ADD.slice(0, 7)) s = take(s, a[5], t => push(a[0], a[1], a[2], a[3], a[4], t));
    for (const a of ADD.slice(7)) s = take(s, a[5], t => push(a[0], a[1], a[2], a[3], a[4], t));
    const at = new Map();
    for (const [name, re, f] of SUG) s = take(s, re, (t, i) => { if (!at.has(name) || at.get(name)[0] > i) at.set(name, [i, f]); });
    const so = [...at].sort((a, b) => a[1][0] - b[1][0]), sugars = so.map(x => x[0]), fast = so.filter(x => x[1][1]).map(x => x[0]);
    if (sugars.length) {
      const n = sugars.length;
      list.unshift({ id: 'sugar', bit: 0, sev: 'caution', lv: 1, label: n === 1 ? 'Added sugar' : `${n} kinds of added sugar`, terms: sugars.slice(),
        note: (n === 1 ? `Contains ${sugars[0]}.` : `Lists ${n} different sugars: ${sugars.join(', ')}.`) + (fast.length ? ` ${cap(listJoin(fast))} ${fast.length === 1 ? 'is' : 'are'} mostly glucose and raise${fast.length === 1 ? 's' : ''} blood sugar faster than table sugar.` : '') });
    }
    { const a = list.findIndex(w => w.id === 'dyeE'), b = list.findIndex(w => w.id === 'dye'); // one artificial-colors entry
      if (a >= 0 && b >= 0) { const A = list[a]; A.terms = A.terms.concat(list[b].terms); A.label = 'Artificial colors'; A.note = `Synthetic dyes. In the EU, foods with ${A.terms.length > 2 ? 'some of these' : list[a].terms[0]} must carry a warning that they may affect attention and activity in children.`; list.splice(b, 1); }
      else if (a >= 0 && list[a].terms.length > 1 || b >= 0 && list[b].terms.length > 1) list[a >= 0 ? a : b].label = 'Artificial colors'; }
    let mask = 1 << 21; mask |= Math.min(15, sugars.length); if (fast.length) mask |= 1 << 4; for (const w of list) if (w.id !== 'sugar') mask |= 1 << w.bit;
    list.sort((a, b) => b.lv - a.lv);
    return { status: 'ok', list, sugars, fast, mask, tmask: termMask(sugars, list, s0) };
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const listJoin = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  /* compact mask (list cards / filters) -> short badges, most severe first */
  const MB = [[6, 2, 'Trans fat'], [12, 2, 'Restricted additive'], [7, 1, 'Hydrogenated oil'], [9, 1, 'Maltitol'], [11, 1, 'Artificial color'], [13, 1, 'Nitrite'], [16, 1, 'BHA/TBHQ'], [18, 1, 'Titanium dioxide'], [24, 1, 'Propylparaben'], [5, 1, 'Seed oil']];
  function badges(mask) {
    if (mask == null || mask < 0 || !(mask & (1 << 21))) return [];
    const out = []; for (const [b, lv, l] of MB) if (mask & (1 << b)) out.push({ lv, label: l });
    const n = mask & 15; if (n) out.splice(out.filter(x => x.lv === 2).length, 0, { lv: 1, label: n === 1 ? 'Added sugar' : `${n} added sugars` });
    return out;
  }
  const clean = mask => mask != null && mask >= 0 && !!(mask & (1 << 21)) && badges(mask).length === 0; // no caution/avoid flags (info notes don't count)

  /* 22.1 watch-for: specific terms people pick to avoid. Bit i of tmask = TERMS[i] found (index-wide via data/f22 "t"). */
  const T = (w, re) => (r, s0) => { const x = r.find(v => v.id === w || (Array.isArray(w) && w.includes(v.id))); return !!x && x.terms.some(t => re.test(t)); };
  const SG = n => sug => sug.includes(n);
  const TD = (w, re, full) => (r, s0) => { const x = r.find(v => v.id === w || (Array.isArray(w) && w.includes(v.id))); return !!x && (x.terms.some(t => re.test(t)) || (!!s0 && full.test(s0))); }; // dyes: also lists like "red 3 & 40"
  const TERMS = [
    ['hfcs', 'High-fructose corn syrup', 'sugar', SG('high-fructose corn syrup')], ['cornsyrup', 'Corn syrup', 'sugar', SG('corn syrup')],
    ['malto', 'Maltodextrin', 'sugar', SG('maltodextrin')], ['dextrose', 'Dextrose', 'sugar', SG('dextrose')], ['glusyrup', 'Glucose syrup', 'sugar', SG('glucose syrup')],
    ['ricesyrup', 'Rice syrup', 'sugar', SG('rice syrup')], ['tapsyrup', 'Tapioca syrup', 'sugar', SG('tapioca syrup')], ['sugar', 'Sugar / cane sugar', 'sugar', SG('sugar')],
    ['honey', 'Honey', 'sugar', SG('honey')], ['agave', 'Agave', 'sugar', SG('agave')], ['fjc', 'Fruit juice concentrate', 'sugar', SG('fruit juice concentrate')],
    ['molasses', 'Molasses', 'sugar', SG('molasses')], ['brownsugar', 'Brown sugar', 'sugar', SG('brown sugar')], ['invert', 'Invert sugar', 'sugar', SG('invert sugar')],
    ['malt', 'Barley malt', 'sugar', SG('barley malt')],
    ['soyoil', 'Soybean oil', 'oil', T('seed', /\bsoy/)], ['canola', 'Canola / rapeseed oil', 'oil', T('seed', /canola|rapeseed/)], ['sunoil', 'Sunflower oil', 'oil', T('seed', /sunflower/)],
    ['cornoil', 'Corn oil', 'oil', T('seed', /\bcorn\b/)], ['cotton', 'Cottonseed oil', 'oil', T('seed', /cottonseed/)], ['palm', 'Palm oil', 'oil', null],
    ['sucralose', 'Sucralose', 'sweet', T('sweet', /sucralose|e955/)], ['aspartame', 'Aspartame', 'sweet', T('sweet', /aspartame|e951/)], ['acek', 'Acesulfame K', 'sweet', T('sweet', /acesulfame|e950/)], ['stevia', 'Stevia', 'sweet', null],
    ['red40', 'Red 40', 'color', TD('dyeE', /red\D{0,8}40|allura|e129/, /(?<![a-z])red\s*(?:no\.?\s*|#\s*|\.\s*)?(?:\d{1,2}\s*(?:&|,|and|\/)\s*(?:no\.?\s*|#\s*|\.\s*)?){0,4}40(?!\d)/)], ['yel5', 'Yellow 5', 'color', TD('dyeE', /yellow\D{0,8}5\b|tartrazine|e102/, /(?<![a-z])yellow\s*(?:no\.?\s*|#\s*|\.\s*)?(?:\d{1,2}\s*(?:&|,|and|\/)\s*(?:no\.?\s*|#\s*|\.\s*)?){0,4}5(?!\d)/)], ['yel6', 'Yellow 6', 'color', TD('dyeE', /yellow\D{0,8}6\b|sunset yellow|e110/, /(?<![a-z])yellow\s*(?:no\.?\s*|#\s*|\.\s*)?(?:\d{1,2}\s*(?:&|,|and|\/)\s*(?:no\.?\s*|#\s*|\.\s*)?){0,4}6(?!\d)/)], ['blue1', 'Blue 1', 'color', TD(['dye', 'dyeE'], /blue\D{0,8}1\b|brilliant blue|e133/, /(?<![a-z])blue\s*(?:no\.?\s*|#\s*|\.\s*)?(?:\d{1,2}\s*(?:&|,|and|\/)\s*(?:no\.?\s*|#\s*|\.\s*)?){0,4}1(?!\d)/)],
    ['ery', 'Erythritol', 'sweet', (r) => r.some(v => v.id === 'ery')], ['xylitol', 'Xylitol', 'sweet', T('polyol', /xylitol/)],
  ];
  const PALM = /\bpalm (?:kernel |fruit )?(?:oils?|olein|stearin|fat)\b/, STEVIA = /\bstevia\b|\brebaudioside\b|\breb[- ]?a\b|\bsteviol\b/;
  function termMask(sugars, list, s0) { let m = 0; TERMS.forEach((t, i) => { const hit = t[0] === 'palm' ? PALM.test(s0) : t[0] === 'stevia' ? STEVIA.test(s0) : t[2] === 'sugar' ? t[3](sugars) : t[3](list, s0); if (hit) m |= (1 << i); }); return m >>> 0; }
  /* custom watch words: whole-word match on the normalized list (claims like "peanut-free" / "no sugar added" are already removed),
     singular/plural forms, flexible spaces and hyphens; terms under 3 letters are ignored */
  function wordRe(w) { let t = String(w || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 \-&']/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.replace(/[^a-z0-9]/g, '').length < 3) return null;
    const parts = t.split(/[ -]+/), last = parts.pop(); let stem = last, tail = '(?:s|es)?';
    if (/ies$/.test(last) && last.length > 4) { stem = last.slice(0, -3); tail = '(?:y|ies)'; } else if (/[^aeiou]y$/.test(last)) { stem = last.slice(0, -1); tail = '(?:y|ies)'; }
    else if (/(?:ches|shes|sses|xes|oes)$/.test(last)) { stem = last.slice(0, -2); } else if (/[^s]s$/.test(last) && last.length > 3) { stem = last.slice(0, -1); }
    const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?<![a-z0-9])' + parts.map(esc).map(x => x + '[ -]?').join('') + esc(stem) + tail + "(?![a-z0-9])", 'g'); }
  /* a few compound forms of common words, so "soy" also finds soybean oil and "corn" finds cornstarch */
  const WALIAS = { soy: ['soybean', 'soya'], corn: ['cornstarch', 'cornmeal', 'cornflour'], milk: ['buttermilk', 'milkfat'], peanut: ['groundnut'], wheat: ['wheatgrass'], egg: ['egg white', 'egg yolk'], coconut: ['coconut oil'], palm: ['palm oil', 'palm kernel oil', 'palmitate'] };
  const WNOT = { milk: /\b(?:coconut|almond|oat|soy|rice|cashew|hemp|pea|macadamia) milks?\b|\bmilk thistle\b/g, butter: /\b(?:peanut|almond|cashew|cocoa|shea|nut|seed|sunflower) butter\b/g, cream: /\bcream of tartar\b/g, egg: /\beggplants?\b/g };
  function matchWords(ing, words) { const raw = String(ing || '').trim(); if (raw.replace(/[^a-z]/gi, '').length < 3) return null;
    const s = ' ' + norm(raw) + ' ', out = [];
    for (const w of words || []) { const k = String(w || '').toLowerCase().trim(), al = WALIAS[k] || WALIAS[k.replace(/s$/, '')] || [];
      const res = [wordRe(w), ...al.map(wordRe)].filter(Boolean); if (!res.length) continue; const sk = WNOT[k] || WNOT[k.replace(/s$/, '')], s1 = sk ? s.replace(sk, ' ') : s; const m = [].concat(...res.map(re => s1.match(re) || [])); if (!m.length) continue; out.push({ word: w, found: [...new Set(m.map(x => x.trim()))] }); }
    return out; }
  const api = { analyze, badges, clean, norm, SEV, TERMS: TERMS.map(t => t.slice(0, 3)), wordRe, matchWords };
  root.LumiWarn = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
