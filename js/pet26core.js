/* Lumi 26.1: dog-toxic ingredient matcher (browser + Node). Reads an ingredient list and flags ingredients that U.S. veterinary and poison-control
   sources say can poison dogs. Facts are short paraphrases with links to ASPCA and FDA pages; the pages themselves are the reference.
   A list with no hit is never "safe": it only means none of these ingredients was found in the list on file. Refresh by hand (tools/README-26.md). */
(function (root) {
  'use strict';
  const ASOF = '2026-11-13';
  const S = {
    aspca: ['ASPCA: People foods to avoid feeding your pets', 'https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets'],
    fdaItems: ['FDA: Potentially dangerous items for your pet', 'https://www.fda.gov/animal-veterinary/animal-health-literacy/potentially-dangerous-items-your-pet'],
    fdaXyl: ['FDA: Paws off xylitol, it\u2019s dangerous for dogs', 'https://www.fda.gov/consumers/consumer-updates/paws-xylitol-its-dangerous-dogs'],
    fdaChoc: ['FDA: Leave chocolate out of Rover\u2019s celebrations', 'https://www.fda.gov/animal-veterinary/animal-health-literacy/leave-chocolate-out-rovers-celebrations']
  };
  const POISON = [['ASPCA Animal Poison Control Center', '(888) 426-4435', 'https://www.aspca.org/pet-care/animal-poison-control'], ['Pet Poison Helpline', '(855) 764-7661', 'https://www.petpoisonhelpline.com/']];
  /* level: toxic = a source names it as poisonous to dogs; caution = harmful in some forms or depends on the form and amount; note = related ingredient, check the product */
  const W = [
    { id: 'xylitol', label: 'Xylitol (birch sugar)', level: 'toxic', terms: 'xylitol, birch sugar, E967', re: /\bxylitol\b|\bxilitol\b|\bbirch (?:sugar|xylitol)\b|\be ?967\b|\bbirkenzucker\b/g,
      text: 'A sweetener in sugar-free gum, candy, baked goods, some peanut butters and toothpaste. ASPCA says it can cause low blood sugar and possible liver damage in dogs; FDA says to call a vet or animal poison control right away if a dog may have eaten it.', src: ['fdaXyl', 'aspca', 'fdaItems'] },
    { id: 'chocolate', label: 'Chocolate and cocoa', level: 'toxic', terms: 'chocolate, cocoa, cacao', re: /\bchocolates?\b|\bchocolat\b|\bschokolade\b|\bcocoa\b|\bcacao\b|\bcocoa (?:powder|mass|liquor|nibs?|solids)\b|\bkakao\b|\btheobromine\b/g,
      text: 'Cocoa contains theobromine and caffeine, which are toxic to dogs. FDA says the darker the chocolate, the more theobromine; how sick a dog gets depends on the type and amount eaten and the dog\u2019s size.', src: ['fdaChoc', 'aspca', 'fdaItems'] },
    { id: 'cocoabutter', label: 'Cocoa butter', level: 'note', terms: 'cocoa butter', re: /\b(?:cocoa|cacao) butter\b/g,
      text: 'Cocoa butter is listed. Lumi has no source for how much theobromine a product with cocoa butter holds, so check the rest of the list and the package.', src: ['fdaChoc'] },
    { id: 'caffeine', label: 'Caffeine and coffee', level: 'toxic', terms: 'caffeine, coffee, espresso, guarana', re: /\bcaffeine\b|\bcoffee\b|\bespresso\b|\bguarana\b|\bkaffee\b/g,
      text: 'ASPCA says chocolate, coffee and caffeine all carry a risk through methylxanthines; the higher the caffeine, the greater the risk. FDA lists caffeine (coffee, tea, soda, energy drinks) among hazardous items.', src: ['aspca', 'fdaItems'] },
    { id: 'tea', label: 'Tea, matcha, yerba mate or kola nut', level: 'caution', terms: 'black/green/white tea, matcha, yerba mate, kola nut', re: /\b(?:black|green|white|oolong|pu-?erh) tea\b|\bmatcha\b|\byerba mate\b|\bkola nuts?\b|\bcola nuts?\b|\bmate leaf\b/g,
      text: 'These can contain caffeine. FDA lists caffeine among hazardous items for pets; how much a product holds is not on the ingredient list.', src: ['fdaItems', 'aspca'] },
    { id: 'grapes', label: 'Grapes, raisins and sultanas', level: 'toxic', terms: 'grapes, raisins, sultanas, zante currants', re: /\bgrapes?\b|\braisins?\b|\bsultanas?\b|\bzante currants?\b|\bdried currants?\b|\btraube[n]?\b|\braisin secs?\b|\buvas?\b/g,
      text: 'Grapes and raisins can lead to kidney damage in dogs, and ASPCA notes that even small amounts have caused harm. FDA lists them among hazardous items.', src: ['aspca', 'fdaItems'] },
    { id: 'grapeprod', label: 'Grape juice, grape seed or grape extract', level: 'caution', terms: 'grape juice, grape seed, grape skin, grape extract', re: /\bgrape (?:juice|seeds?|skins?|extract|must|concentrate|pomace|flavou?r(?:ing)?|sugar)\b|\bgrapeseed\b|\bwhite grape juice\b/g,
      text: 'A grape product. Sources warn about grapes and raisins; Lumi has no source that says whether grape juice or extract is safe for dogs, so treat it with caution.', src: ['aspca', 'fdaItems'] },
    { id: 'allium', label: 'Onion, garlic, chives or leek', level: 'toxic', terms: 'onion, garlic, chives, leek, shallot, scallion', re: /\bonions?\b|\bgarlic\b|\bchives?\b|\bleeks?\b|\bshallots?\b|\bscallions?\b|\bspring onions?\b|\ballium\b|\bzwiebel\b|\bknoblauch\b|\boignons?\b|\bail\b|\bcebolla\b|\bajo\b/g,
      text: 'Onion, garlic and chives belong to the Allium family. ASPCA and FDA both list onion and garlic as hazardous to pets; they can damage red blood cells, and powders count too.', src: ['aspca', 'fdaItems'] },
    { id: 'macadamia', label: 'Macadamia nuts', level: 'toxic', terms: 'macadamia', re: /\bmacadamias?(?: nuts?)?\b/g,
      text: 'ASPCA says macadamia nuts can cause weakness, incoordination, depression, vomiting, tremors and high body temperature in dogs. FDA lists them among hazardous items.', src: ['aspca', 'fdaItems'] },
    { id: 'alcohol', label: 'Alcohol (ethanol, wine, beer, spirits)', level: 'caution', terms: 'alcohol, ethanol, wine, beer, rum, vodka, whiskey, brandy', re: /\b(?:ethyl )?alcohol\b|\bethanol\b|\bwines?\b|\bbeers?\b|\brum\b|\bvodka\b|\bwhisk(?:e)?y\b|\bbrandy\b|\bliqueurs?\b|\bbourbon\b|\bsake\b|\bsherry\b/g,
      text: 'ASPCA and FDA list alcoholic drinks and food products containing alcohol as hazardous to pets. How much alcohol is in a product is not on the ingredient list. (Sugar alcohols and fatty alcohols are not counted here.)', src: ['aspca', 'fdaItems'] },
    { id: 'avocado', label: 'Avocado', level: 'caution', terms: 'avocado, guacamole', re: /\bavocados?\b|\bguacamole\b/g,
      text: 'FDA says avocado is only mildly toxic to dogs and cats but can be severely toxic to birds, rabbits, horses and ruminants. ASPCA says it is primarily a problem for birds, rabbits, donkeys, horses and ruminants.', src: ['fdaItems', 'aspca'] }
  ];
  const IDS = W.map(w => w.id);
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&amp;/g, '&').replace(/\b(?:sugar|cetyl|stearyl|cetearyl|benzyl|polyvinyl|isopropyl|lauryl|behenyl|cinnamyl|oleyl|myristyl|fatty|wood|grain) alcohols?\b/g, ' ')
    .replace(/\balcohol[- ]?free\b|\bnon-?alcoholic\b|\bzero alcohol\b/g, ' ').replace(/\bwine (?:vinegar)\b|\bwine acid\b|\bwine yeast\b|\brice wine vinegar\b/g, ' ')
    .replace(/\bonion (?:flavou?r|flavou?ring)\b/g, 'onion flavor ').replace(/\bcocoa-?free\b|\bchocolate[- ]?free\b|\bcarob\b/g, ' ');
  const langHint = raw => { const t = ' ' + norm(raw) + ' '; const fo = (t.match(/ (?:de|des|du|la|le|les|et|und|mit|von|di|con|il|del|para|de la|en|zucker|farine|sucre|huile|agua|eau|sel|lait|zutaten|ingredienti|ingredientes)(?= ) /g) || []).length, en = (t.match(/ (?:and|the|of|with|from|contains|oil|water|salt|sugar|flour|meal|chicken|beef|corn|rice|wheat|vitamin|acid|fat|extract)(?= ) /g) || []).length; return fo >= 3 && fo > en; };
  /* analyze(text, opts) -> {status:'ok'|'none'|'lang', hits:[{id,label,level,text,src,terms,found:[...]}]}. none/lang can still carry hits (a hit is a hit) but never a clear result. */
  function analyze(raw, opts) {
    opts = opts || {}; const txt = String(raw || '').trim();
    if (!txt || (!opts.short && (txt.replace(/[^a-zA-Z\u00c0-\u024f]/g, '').length < 12 || txt.split(/[\s,;]+/).filter(Boolean).length < 2))) return { status: 'none', hits: [] }; /* empty or not a real list (volunteer entries like "80g") */
    let t = norm(txt); const hits = [];
    for (const w of W) { w.re.lastIndex = 0; let m; const found = new Set(); let tt = t; if (w.id === 'chocolate') tt = t.replace(/\b(?:cocoa|cacao) butter\b/g, ' ');
      if (w.id === 'grapes') tt = t.replace(/\bgrape (?:juice|seeds?|skins?|extract|must|concentrate|pomace|flavou?r(?:ing)?|sugar)\b|\bgrapeseed\b/g, ' ');
      if (w.id === 'tea') tt = t.replace(/\bgreen tea\b(?= (?:extract|polyphenols?))/g, 'green tea');
      while ((m = w.re.exec(tt))) { found.add(m[0].trim()); if (w.re.lastIndex === m.index) w.re.lastIndex++; }
      if (found.size) hits.push({ id: w.id, label: w.label, level: w.level, text: w.text, src: w.src, terms: w.terms, found: [...found] }); }
    const order = { toxic: 0, caution: 1, note: 2 }; hits.sort((a, b) => order[a.level] - order[b.level]);
    const lang = opts.lang ? !/^en/i.test(opts.lang) : langHint(txt);
    return { status: lang ? 'lang' : 'ok', hits };
  }
  const api = { ASOF, S, POISON, W, IDS, analyze, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PET26 = api;
})(typeof self !== 'undefined' ? self : this);
