/* Lumi scoring — shared by the browser app and the Node index builder. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.LumiScore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const SYRUPS = /(glucose[- ]?fructose|fructose[- ]?glucose|high[- ]fructose|corn syrup|glucose syrup|rice syrup|malt syrup|maltodextrin|dextrose|invert (cane )?sugar|golden syrup|agave|isoglucose|maltose|tapioca syrup|cane syrup|honey|molasses|caramel syrup|fruit juice concentrate)/gi;
const SUGAR_WORDS = /\b(sugar|cane sugar|brown sugar|sucrose|evaporated cane juice|azucar|sucre)\b/i;
const STARCH = /(modified (corn |food |potato |tapioca )?starch|corn ?starch|potato starch|potato flakes|dehydrated potato|tapioca starch|rice flour|white rice|enriched (wheat )?flour|enriched corn|unbleached (enriched )?(wheat )?flour|bleached flour|degermed|corn flour|cornmeal)/gi;
const HYDRO = /hydrogenated/i;
const REFINED = /\b(white rice|rice, white|rice, cooked|steamed rice|fried rice|jasmine rice|basmati rice|sushi rice|bread, white|white bread|bagels?|pasta|spaghetti|macaroni|linguine|fettuccine|penne|noodles?|ramen|udon|crackers?|pretzels?|rice cakes?|corn ?flakes|puffed rice|rice krispies|couscous|grits|cream of wheat|english muffins?|pancakes?|waffles?|biscuits?|pita|naan|croissants?|flour tortillas?|tortillas?, flour|mashed potato(es)?|potatoes, mashed|instant potato(es)?|hash browns?|french fries|white flour|wheat flour, white|all[- ]purpose flour|buns?|dinner rolls?|baguette|sourdough|saltines?|breadsticks?|breadcrumbs|panko|tater tots|gnocchi|risotto|rice pudding|tapioca|cornstarch|corn starch)\b/i;
const WHOLEG = /\b(whole[- ]?(wheat|grain|grains|meal)|brown rice|rice, brown|wild rice|bran|oats?|oatmeal|quinoa|lentils?|chickpeas?|beans?|almond|coconut flour|keto|low[- ]carb|carb ?(smart|balance)|cauliflower|protein|zero ?carb|konjac|shirataki|hearts of palm|sprouted|flax|rye|barley|bulgur|farro|buckwheat)\b/i;
const ADDITIVES = { e150c:'Ammonia caramel', e150d:'Sulphite ammonia caramel', e171:'Titanium dioxide', e250:'Sodium nitrite', e251:'Sodium nitrate', e252:'Potassium nitrate', e249:'Potassium nitrite', e102:'Tartrazine', e110:'Sunset yellow', e124:'Ponceau 4R', e129:'Allura red', e122:'Azorubine', e104:'Quinoline yellow', e133:'Brilliant blue', e951:'Aspartame', e950:'Acesulfame K', e955:'Sucralose', e954:'Saccharin', e320:'BHA', e321:'BHT', e319:'TBHQ', e433:'Polysorbate 80', e466:'Carboxymethylcellulose', e407:'Carrageenan', e338:'Phosphoric acid', e211:'Sodium benzoate', e220:'Sulphur dioxide', e1442:'Hydroxypropyl distarch phosphate', e965:'Maltitol' };
const LIQUID = /(beverage|drink|soda|juice|nectar|smoothie|milk(?!.*chocolate)|tea|coffee|water)/i;
const r1 = v => v == null ? null : Math.round(v * 10) / 10;
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;

// v8.1: some USDA/legacy rows mark solids (raw banana, apples) as liquid; serve those in grams.
const DRINKW = /\b(juice|drinks?|beverages?|milk|soda|cola|water|nectar|smoothies?|tea|coffee|latte|broth|stock|soup|syrup|shakes?|oil|sauce|dressing|kefir|lemonade|punch|wine|beer|liquor|creamer|kombucha|cocktail|ade|vinegar|extract|liquid)\b/i;
const SOLIDW = /\b(raw|fresh|banana|bananas|apples?|pears?|berries|grapes|melon|vegetables?|beans|rice|bread|cheese|meat|chicken|beef|pork|fish|nuts?|seeds?|flour|cereal|bar|chips|crackers|cookies?|cake|dried|frozen|peeled|whole|sliced|cooked|boiled|baked)\b/i;
function notSolid(name, liq) { return !!liq && !(SOLIDW.test(name || '') && !DRINKW.test(name || '')); }
/* Normalized product: {id, code, name, brand, qty, img, servQ, serv, nova, additives:[e...], ing, cat, cats, naLabel, liquid, src, n:{carbs,sugars,added,fiber,protein,fat,sat,trans,sodiumMg,kcal,polyols}} */
/* Data sanity: never treat missing/implausible carbs as zero. Returns {ok, issues, dropFiber}. */
const DRY = /breakfast-cereals|breakfast cereals|granola|muesli|crisps|chips|crackers|biscuits|cookies|pretzel|puff/i;
const CARBY = /cereal|bread|biscuit|cookie|cracker|crisps|chips|pasta|noodle|\brice\b|cake|cand(y|ies)|granola|muesli|\bbars?\b|pretzel|tortilla|flour|oat|puff/i;
/* v7: 4/4/9 Atwater cross-check. Calories that carbs+protein+fat can't explain (or that are far below what they imply) mean the
   label was entered wrong (often a missing carb value), so the item is marked "data looks wrong" and never scored 100.
   Allowances: fiber/polyols/allulose-type sweeteners lower real energy; alcohol (7 kcal/g) and vinegar (acetic acid) raise it. */
const ALC = /\b(beer|ale|lager|ipa|stout|porter|wine|vodka|whiske?y|bourbon|rum|gin|tequila|tequilla|brandy|cognac|liqueur|sake|soju|hard seltzer|spiked|cocktail|margarita|spirits?|long drink|mezcal|scotch|cider|abv|proof|sangria|mead)\b/i;
const LOWCAL_SWEET = /\b(allulose|erythritol|monk ?fruit|stevia|sugar[- ]free|zero sugar|no sugar|keto|sweetener|xylitol|lakanto|swerve|maltitol|sugar alcohol|fiber syrup|inulin|chicory|sucralose|splenda)\b/i;
const CARBYNAME = /\b(milk chocolate|chocolate bar|candy|cookies?|brownies?|cake|muffins?|bread|bagels?|croissants?|crackers|pretzels|cereal|granola|pasta|spaghetti|tortillas?|honey|donuts?|pancakes?|waffles?)\b/i;
const NOTCARBY = /\b(cauliflower|konjac|shirataki|hearts of palm|palm|zucchini|pork rinds?|cheese|keto|low.?carb|zero|sugar[- ]free|no sugar|protein|egg|chicken|meat|fish|seaweed|kale|almond flour|coconut flour|lettuce|cloud)\b/i;
function implausible(p) {
  const n = p.n || {}; const c = n.carbs, pr = n.protein, fa = n.fat, k = n.kcal, nm = String(p.name || '');
  if (c == null || k == null || (p.meta && (p.meta.perItem || (p.meta.src && !/Branded/i.test(p.meta.src))))) return null; // curated USDA SR/Foundation and official restaurant data: rounding on small portions makes this check noisy
  const est = 4 * c + 4 * (pr || 0) + 9 * (fa || 0);
  const lo = est - 4 * (n.fiber || 0) - 4 * (n.polyols || 0) - (LOWCAL_SWEET.test(nm) ? 4 * c : 0);
  if (pr != null && fa != null && k > est + Math.max(40, 0.4 * k) && !ALC.test(nm) && !(/vinegar|essig|vinaigre/i.test(nm) && k <= 60)) return `calories (${Math.round(k)} kcal) are far higher than carbs, protein and fat explain (${Math.round(est)} kcal by 4/4/9)`;
  if (k < lo - Math.max(40, 0.4 * lo)) return `calories (${Math.round(k)} kcal) are far lower than carbs, protein and fat imply (${Math.round(est)} kcal by 4/4/9)`;
  if (c === 0 && (pr || 0) === 0 && (fa || 0) === 0 && k === 0 && CARBYNAME.test(nm) && !NOTCARBY.test(nm) && !LOWCAL_SWEET.test(nm)) return 'every nutrient is 0, which is impossible for this kind of food';
  return null;
}
const CARBS_EXPECTED = /\b(juices?|lemonade|nectar|smoothies?|fruit punch|sports? drinks?|gatorade|powerade|sweet tea|chocolate milk|sorbet|sherbet|popsicles?|ice pops?|grapes|raspberries|strawberries|blueberries|blackberries|cherries|mangos?|mangoes|bananas?|apples?|pineapple|peaches|pears|plums|watermelon|cantaloupe|raisins|dates|jam|jelly|preserves|marmalade|honey|maple syrup|ketchup|bbq sauce|barbecue sauce|teriyaki|salsa|latte|frappuccino|mocha|hot chocolate|hot cocoa|coconut water|root beer|ginger ale|cream soda|grape soda|orange soda)\b/i;
const NOT_EXPECTED = /\b(zero|diet|sugar[- ]?free|no sugar|unsweetened|keto|0 ?(g|calorie|cal)|zero calorie|water|sparkling|seltzer|extract|flavou?r(ed|ing)? (drops|enhancer)|enhancer|drops|tablets?|electrolyte|konjac|vinegar|seasoning|spice|tea bags?|herbal|wipes|lip|shampoo|candle|scent|pickled?|peppers?|jalape|cider vinegar|apple cider|lite|light)\b/i;
const DRYNAME = /\b((sugar|waffle|cake|ice cream) cones?|crackers|pretzels|tortilla chips|potato chips|cereal|granola|muesli|cookies|biscotti|rice cakes|graham|wafers|flour|pancake mix|muffin mix|cake mix|brownie mix|cocoa powder|cacao powder|breadcrumbs|panko)\b/i;
function quality(p) {
  const n = p.n || {}, issues = []; let dropFiber = false;
  const c = n.carbs, f = n.fiber, su = n.sugars, pr = n.protein, fa = n.fat, k = n.kcal;
  if (c == null) issues.push('carbs unknown');
  if (c != null && su != null && su > c + 1) issues.push('sugars exceed carbs');
  if (!(p.meta && p.meta.perItem) && c != null && (c + (pr || 0) + (fa || 0)) > 105) issues.push('macros exceed 100 g');
  if (c != null && f != null && c > 5 && f > c * 0.6) { dropFiber = true; }
  const aw = implausible(p); if (aw) issues.push(aw);
  if (c != null && c < 0.5 && CARBS_EXPECTED.test(p.name || '') && !NOT_EXPECTED.test(p.name || '') && !LOWCAL_SWEET.test(p.name || '')) issues.push('0 g carbs is implausible for this food (juice, fruit, sweetened drinks and sauces always have carbs)');
  // v7: cow/goat/sheep milk, yogurt and kefir always carry milk sugar (~3-5 g/100 g); 0 g means the carb value is missing
  if (c != null && c < 1 && (/\b(milk|yog(h)?urts?|yogourt|yoghourt|kefir|skyr|lassi)\b/i.test(p.name || '') || (/^(fage|chobani|oikos|siggi'?s|icelandic provisions|noosa|dannon|yoplait|stonyfield|two good)\b/i.test(p.brand || '') && !/\b(creamer|cheese|oat|coffee|dip|bar)\b/i.test(p.name || ''))) && !/\b(almond|coconut|cashew|soy|oat|rice|hemp|pea|flax|macadamia|pistachio|walnut|hazelnut|plant|non-?dairy|dairy[- ]free|vegan|keto|zero carb|carb ?master|protein (powder|isolate)|whey|casein|powder|cheese|butter|cream|creamer|half|chocolate|milk thistle|milkweed|grains|cultures?|starter)\b/i.test(p.name || '')) issues.push('0 g carbs is impossible for milk or yogurt (milk sugar)');
  if (c === 0 && (su || 0) > 0.5) issues.push('0 carbs but has sugar');
  if (c != null && c > 2 && k === 0) issues.push('0 calories but has carbs');
  if (c != null && f != null && p.naLabel && f > c + 1) issues.push('fiber exceeds total carbs');
  const carby = p.carby != null ? p.carby : CARBY.test((p.cats || '') + ' ' + (p.cat || ''));
  if (c != null && c < 3 && (carby || (CARBYNAME.test(p.name || '') && !NOTCARBY.test(p.name || ''))) && !/keto|low.?carb|zero.?carb/i.test(p.name || '')) issues.push('carbs implausibly low for category');
  if (c === 0 && k == null) issues.push('zero carbs unverified (no energy value)');
  const dry = (p.dry != null ? p.dry || DRYNAME.test(p.name || '') : DRY.test((p.cats || '') + ' ' + (p.cat || '')) || DRYNAME.test(p.name || '')) && !p.liquid && !/ready.to.eat|overnight|\bcups?\b|pouch|cooked|prepared|soup/i.test(p.name || '');
  if (dry && k != null && k < 250) issues.push('values look per serving, not per 100 g (too few calories for a dry food)');
  if (dry && k == null && c != null && c < 20 && !/keto|protein|grain.?free|nut granola|low.?carb/i.test(p.name || '')) issues.push('carbs implausibly low for a dry food');
  return { ok: issues.length === 0, issues, dropFiber };
}
/* v16.1: Lumi no longer uses "carbs". Carbs are always the TOTAL carbohydrate from the label (EU-style labels already exclude
   fiber, which is what they print). The legacy field name `net` is kept internally for compatibility and always equals total carbs. */
function netCarbs(p) {
  const n = p.n; if (n.carbs == null) return { net: null, note: '' };
  return { net: n.carbs, note: p.naLabel === false ? 'Total carbohydrate as labeled (EU-style labels list carbohydrate without fiber)' : 'Total carbohydrate as labeled' };
}

/* v19.1 SWEETS & SUGARY DRINKS ("treat") detector. A food is a treat when its category/name says sweets (candy, chocolate, cookies,
   pastries, cakes, donuts, ice cream, desserts, sugary cereal, soda and other sweetened drinks…) AND it is actually sugar-dense with added
   sugar (added-sugar share of sugar ≥ 40 % or sugar in the ingredients), or when it is very sugar-dense with added sugar regardless of name.
   Sugar density is measured per 100 g/ml (restaurant items: per estimated item weight), so a tiny serving can't hide it. */
const TREAT_SOLID = /\b(cand(y|ies)|confection\w*|chocolates?|truffles?|fudge|caramels?|toffees?|gumm(y|ies)|jelly beans?|marshmallows?|lollipops?|licorice|liquorice|cookies?|biscuits?|brownies?|blondies?|pastr(y|ies)|danish|croissants?|cakes?|cupcakes?|cheesecakes?|donuts?|doughnuts?|muffins?|cinnamon rolls?|sweet rolls?|cinnabons?|pies?|tarts?|toaster pastr\w*|pop-?tarts?|ice creams?|gelato|frozen (desserts?|yogurt|custard|treats?)|sherbet|sorbet|popsicles?|ice pops?|sundaes?|blizzards?|concretes?|desserts?|sweets|wafers?|macarons?|frosting|icing|snickers|kit ?kat|twix|m&m'?s|reese'?s|oreos?|cobbler|churros?|funnel cake|kolache|scones?|pudding|custard|nougat|praline|bonbons?|mochi|baklava|eclairs?|cannoli|biscotti|shortbread|snack cakes?|honey buns?|cream puffs?)\b/i;
const TREAT_DRINK = /\b(soda|sodas|soft drinks?|cola|pop|lemonade|limeade|sweet tea|iced tea|energy drinks?|sports drinks?|punch|fruit drinks?|juice drinks?|cocktail|milkshakes?|shakes?|frapp\w*|slush\w*|smoothies?|horchata|boba|bubble tea|milk tea|hot chocolate|hot cocoa|chocolate milk|sweetened|frosty|refresher|agua fresca|mocha|latte|macchiato|chiller|cooler|freeze|frozen (coffee|drink))\b/i;
const CEREALW = /\b(cereals?|granola|frosted|loops|puffs|crunch|flakes|o's|pops)\b/i;
/* v19.2 CONDIMENTS & SPREADS used in small amounts (honey, jam/jelly/preserves, syrups, ketchup, BBQ and other sauces, dressings…):
   not capped as treats. They are scored per labeled serving (typically 1–2 tbsp; a USDA "1 cup" basis is replaced by 1 tbsp) and the
   sugar-density penalty still applies, so they still score low when they're mostly sugar. Dishes that merely contain a sauce
   ("BBQ chicken sandwich", "honey bun") are not condiments. */
const SMALLUSE = /\b(honey|jams?|jell(y|ies)|preserves|marmalades?|fruit spreads?|spreads?|(maple|pancake|waffle|agave|table|corn|golden|date|simple|chocolate|caramel|fruit) syrups?|syrups?|agave( nectar)?|molasses|ketchup|catsup|sauces?|dressings?|vinaigrettes?|marinades?|glazes?|relish|chutneys?|salsas?|dips?|hoisin|teriyaki|sriracha|condiments?|toppings?)\b/i;
const NOTSMALL = /\b(jelly beans?|jelly (rolls?|donuts?|doughnuts?|filled)|honey ?(buns?|roasted|nut|graham|wheat|oat|crisp|bunches|butter chicken|walnut shrimp|glazed (chicken|ham|salmon|donut|doughnut))|buns?|sandwich(es)?|sub|burgers?|wings?|ribs?|chicken|pork|beef|steak|shrimp|salmon|fish|tofu|meatballs?|pizza|bowls?|pasta|spaghetti|noodles|lasagna|rice|cereal|bars?|cookies?|cakes?|cupcakes?|donuts?|doughnuts?|pastr(y|ies)|pies?|tarts?|yog(h)?urts?|ice creams?|gelato|sundaes?|drinks?|teas?|lattes?|coffee|soda|lemonade|crackers?|chips|pretzels?|nuts|almonds|peanuts|cashews|pecans|granola|oats?|oatmeal|grahams?|candy|candies|gumm(y|ies)|filled|covered|dipped|coated|rolls?|toast|waffles?|pancakes?|biscuits?|fries|tots|tenders|nuggets|strips|salads?(?! dressing)|wraps?|burritos?|tacos?|quesadillas?|nachos|plate|platter|meal|combo|entree|dinner|dessert|shakes?|smoothies?|frozen|kit|pouch(es)?|baby|puree|beans|soup|chili|stew|curry|mac|cheese ?(sticks|curds|bites)|fruit snacks?|pops?|comb|popcorn|kettle corn|corn|cereals?|clusters|crisps?|bites)\b/i;
function smallUse(p) {
  if (!p) return null; const nm = (p.name || '') + ' ' + (p.cat || '');
  if (!SMALLUSE.test(p.name || '') || NOTSMALL.test(p.name || '') || /cereal|snack|candy|confection|cookie|biscuit|dessert|beverage|drink/i.test(p.cat || '') || TREAT_SOLID.test((p.name || '').replace(/\b(chocolate|caramel|fudge|frosting|icing)\b/gi, ''))) return null;
  const n = p.n || {};
  if (p.meta && p.meta.perItem) { if ((n.kcal || 0) > 250) return null; } // restaurant cups/packets
  else if (!(+p.servQ > 0 && +p.servQ <= 60) && !(p.portions || []).some(([l, g]) => g > 0 && g <= 45 && /tbsp|tablespoon|packet|tsp|teaspoon|portion cup|cup \(1 oz\)|pat/i.test(l)) && +p.servQ > 0) return null;
  const why = /\bhoney\b/i.test(nm) ? 'honey' : /\b(jams?|jell(y|ies)|preserves|marmalades?|fruit spreads?)\b/i.test(nm) ? 'jam / fruit spread' : /\b(syrups?|agave|molasses)\b/i.test(nm) ? 'syrup' : /\b(dressings?|vinaigrettes?)\b/i.test(nm) ? 'dressing' : /\bspreads?\b/i.test(nm) ? 'spread' : 'sauce / condiment';
  return { why };
}
/* v20.0: single-ingredient sugars (honey, maple syrup, agave, molasses, table/brown/cane/coconut sugar, corn/rice/date/golden syrup).
   All of their sugar is free sugar, so it's scored as ADDED sugar whatever the label says (US labels may list honey/maple's sugar as
   "0 g added" for the pure product). Mixed foods that merely contain honey (honey mustard, honey-roasted nuts, honey wheat bread) don't match. */
const PURESUGAR = /\b(honey|(pure |real |organic )?maple syrup|agave( nectar| syrup)?|molasses|treacle|(cane|brown|white|granulated|powdered|confectioners'?|coconut|turbinado|demerara|raw|date|palm|beet|table|caster|muscovado) sugar|sugar|(corn|light corn|dark corn|brown rice|rice|date|golden|cane|pancake|table|simple|tapioca|sorghum) syrup|sorghum|jaggery|piloncillo|panela)\b/i;
const NOTPURE = /\b(sugar[- ]?free|no sugar|zero sugar|unsweetened|reduced sugar|less sugar|lite|light syrup|sugar[- ]?(snap|cookies?|peas?|plums?|wafers?)|mustard|roasted|glazed|wheat|oat|nut|bun|graham|butter|barbecue|bbq|sauce|dressing|vinaigrette|marinade|chicken|ham|salmon|turkey|bacon|sausage|ice|yog(h)?urt|cereal|bar|bars|cookies?|crackers?|candy|candies|chews?|drops|lozenges?|pops?|cough|tea|teas|coffee|latte|drink|water|soda|lemonade|crisps?|chips|pretzels?|bread|rolls?|cake|pie|tart|donuts?|doughnuts?|pastry|muffins?|biscuits?|waffles?|pancakes?(?! syrup)|granola|clusters|bites|bunches|comb cereal|cured|scrub|lip|soap|mix|baking mix|frosting|icing|jam|jelly|preserves|spread|whipped|cream|creamed|infused with|with|&|and)\b/i;
function pureSugar(p) {
  if (!p) return false; const nm = String(p.name || '').replace(/\b(organic|raw|pure|natural|real|100 ?%|grade a|amber|dark|golden|light|wildflower|clover|orange blossom|manuka|local|unfiltered|filtered|premium|kirkland signature|365|great value|good & gather|market pantry)\b/gi, ' ');
  if (!PURESUGAR.test(nm) || NOTPURE.test(nm)) return false;
  const n = p.n || {}; if (n.sugars == null || n.carbs == null || n.carbs <= 0 || n.sugars < n.carbs * 0.6) return false; // honey/syrups/sugars are mostly sugar
  if ((n.protein || 0) > 3 || (n.fat || 0) > 3) return false;
  const ing = String(p.ing || '').toLowerCase().trim(); if (!ing) return true;
  const parts = ing.split(/[,;]/).map(x => x.replace(/[^a-z ]/g, ' ').trim()).filter(Boolean);
  return parts.every(x => /honey|maple|agave|molasses|treacle|sugar|syrup|nectar|sorghum|jaggery|water|natural flavou?r|vanilla|salt|caramel colou?r|sodium benzoate|potassium sorbate|sorbic acid|citric acid|cellulose gum|pollen|propolis/.test(x));
}
/* v19.2: 70 %+ cacao dark chocolate isn't capped as a sweet when it has ≤ 25 g sugar per 100 g (it is still sugar-penalized normally). */
function darkChoc(p) {
  const nm = p.name || '', m = nm.match(/(\d{2,3})\s?%/); if (!m || +m[1] < 70 || +m[1] > 100) return false;
  return /\b(cacao|cocoa|chocolate|chocolat)\b/i.test(nm) && !/\b(cookies?|cakes?|brownies?|wafers?|biscuits?|truffles?|bonbons?|caramel|filled|milk chocolate|white chocolate|cereal|drink|milk|beverage|cocoa powder|baking)\b/i.test(nm);
}
/* sugar per 100 g/ml; restaurant per-item values are spread over an estimated item weight (macro mass ÷ 0.5, drinks ÷ 0.2) */
function sugar100(p) {
  const n = p.n || {}, liq = !!p.liquid; if (n.sugars == null && n.carbs == null) return null;
  let w = 100; if (p.meta && p.meta.perItem) { const m = (n.carbs || 0) + (n.protein || 0) + (n.fat || 0); w = Math.max(m / (liq ? 0.2 : 0.5), (n.kcal || 0) / (liq ? 1.2 : 4), 20); }
  return (n.sugars == null ? n.carbs * 0.4 : n.sugars) * 100 / w; // sugar not listed: assume 40 % of carbs (typical for cookies/cakes)
}
function treat(p) {
  const n = p.n || {}; if (n.sugars == null && !(n.carbs >= 40 && !p.liquid && TREAT_SOLID.test((p.name || '') + ' ' + (p.cat || '')))) return null;
  if (smallUse(p)) return null; // v19.2
  const nm = (p.name || '') + ' ' + (p.cat || '') + ' ' + (p.cats || ''), ing = String(p.ing || '').toLowerCase(), liq = !!p.liquid;
  const s100 = sugar100(p);
  if (s100 <= 25 && darkChoc(p)) return null; // v19.2
  const sugarIng = SUGAR_WORDS.test(ing) || SYRUPS.test(ing) || /\b(honey|syrup|molasses|fruit juice concentrate)\b/.test(ing);
  const addR = n.added != null && n.sugars > 0 ? n.added / n.sugars : null;
  const added = (addR != null && addR >= 0.4) || sugarIng || (addR == null && !ing); // no ingredient list (restaurant menus, bakery items): a sweets-named, sugar-dense food is assumed to have added sugar
  if (!added || /\b(unsweetened|sugar[- ]free|no sugar added|diet|zero sugar|zero)\b/i.test(p.name || '')) return null;
  let why = '';
  const drink = liq && !/\b(sauces?|ketchup|dressings?|jams?|jell(y|ies)|preserves|spreads?|syrups?|honey|powders?|mix|creamers?|marinades?|salsa|dips?|crisps|chips|pretzels?|ice creams?|frozen desserts?|gelato|sorbet|yog(h)?urts?|soups?|purees?|baby food)\b/i.test(nm);
  const lac = drink && /\b(milks?|kefir|lassi|dairy|yog(h)?urts?|skyr|protein shakes?)\b/i.test(nm) ? 5 : 0; // milk sugar (lactose) isn't added sugar
  if (drink && ((TREAT_DRINK.test(nm) && s100 >= 4 + lac) || s100 >= 6 + lac)) why = 'sweetened drink';
  else if (drink) why = '';
  else if (TREAT_SOLID.test(nm) && s100 >= 12) why = 'sweets/dessert';
  else if (CEREALW.test(nm) && /cereal/i.test(nm) && s100 >= 22) why = 'sugary cereal';
  else if (s100 >= 30) why = 'very high in added sugar';
  return why ? { why, s100: Math.round(s100 * 10) / 10 } : null;
}
const TREAT_CAP = 30;
/* v19.2 WHOLE-MEAL items (restaurant entrées, bowls, burgers, sandwiches, plated/frozen meals) are judged for Health against a
   meal-sized reference (about 1/3 of daily values, ~667 kcal) instead of the 100 g snack reference: a meal up to 667 kcal is judged on
   its nutrient density (like Nutri-Score), bigger meals are scaled up in proportion (to 2.5×), smaller ones down to 0.75×. */
const MEAL_KCAL = 667;
const MEALW = /\b(bowls?|salads?|burritos?|sandwich(es)?|subs?|hoagies?|burgers?|cheeseburgers?|whoppers?|big mac|wraps?|plates?|platters?|entr[eé]es?|meals?|combos?|dinners?|lunch|pasta|spaghetti|lasagna|pizza|tacos?|quesadillas?|enchiladas?|fajitas?|omelet(te)?s?|breakfast|bento|poke|curry|stir[- ]fry|fried rice|teriyaki|pad thai|ramen|pho|gyros?|kebabs?|shawarma|casserole|pot pie|chicken|steak|salmon|grilled|baskets?)\b/i;
const MEALCAT = /^(Entrees|Sandwiches|Pizza|Burgers|Salads|Fast Foods|Restaurant Foods)$|mixed dishes|frozen meals?|prepared meals?/i;
const NOTMEAL = /\b(fries|tots|onion rings|chips|nachos? chips|side|sides|dressing|sauce|dip|soup|chowder|bisque|dessert|shake|drink|kids?|cookie|pie|cake|brownie|biscuit|muffin|cinnamon|toast sticks|hash ?browns?|pretzel|bread ?sticks|garlic (bread|knots|strips)|smoothies?|cereals?|\d+ ?(ounce|fl ?oz)|pretzels|snack|wings? \(\d+ ?pc\)|appetizer|sampler|add|extra|topping)\b/i;
function mealItem(p, kServ) {
  if (!p || p.liquid || kServ == null || kServ < 350) return false;
  const nm = p.name || '', cat = p.cat || '';
  if (NOTMEAL.test(nm) || TREAT_SOLID.test(nm) || smallUse(p)) return false;
  return !!((p.meta && p.meta.perItem) || MEALCAT.test(cat) || MEALW.test(nm + ' ' + cat));
}
/* v19.0 serving basis. Scores are computed PER SERVING. Order of preference:
   1) the labeled serving size in grams/ml (servQ)  2) restaurant items: per item as published
   3) a documented category default serving (DEFSERV below)  4) per 100 g, flagged "per 100 g (no serving size)". */
const DEFSERV = [
  [/\b(soda|cola|pop|soft drink)\b/i, 355, '1 can (355 ml)'], [/\b(energy drink)\b/i, 250, '1 can (250 ml)'],
  [/\b(milk|juice|nectar|lemonade|tea|coffee|latte|smoothie|kefir|drink|beverage|water|shake)\b/i, 240, '1 cup (240 ml)'],
  [/\b(yogh?urt|skyr)\b/i, 170, '1 container (170 g)'], [/\bcottage cheese\b/i, 113, '1/2 cup (113 g)'], [/\bcheese\b/i, 28, '1 oz (28 g)'],
  [/\b(cereal|granola|muesli)\b/i, 40, '1 cup (40 g)'], [/\b(oats|oatmeal)\b/i, 40, '1/2 cup dry (40 g)'],
  [/\b(chips|crisps|crackers?|pretzels?|popcorn|puffs|cheese curls)\b/i, 28, '1 oz (28 g)'], [/\b(nuts?|almonds|cashews|pistachios|peanuts|trail mix|seeds)\b/i, 28, '1 oz (28 g)'],
  [/\b(cookies?|biscuits)\b/i, 30, '2 cookies (30 g)'], [/\b(candy|chocolate|gummies|candies)\b/i, 40, '1 bar / piece (40 g)'], [/\b(bar|bars)\b/i, 40, '1 bar (40 g)'],
  [/\b(ice cream|gelato|frozen dessert)\b/i, 66, '2/3 cup (66 g)'], [/\b(cake|brownie|muffin|donut|doughnut|pastry|croissant|pie)\b/i, 70, '1 piece (70 g)'],
  [/\b(bread|toast)\b/i, 50, '2 slices (50 g)'], [/\b(bagel)\b/i, 95, '1 bagel (95 g)'], [/\b(tortillas?|wraps?)\b/i, 45, '1 tortilla (45 g)'],
  [/\b(rice)\b/i, 158, '1 cup cooked (158 g)'], [/\b(pasta|noodles|spaghetti|macaroni)\b/i, 140, '1 cup cooked (140 g)'],
  [/\b(pizza)\b/i, 125, '1 slice (125 g)'], [/\b(soup|chili|stew)\b/i, 245, '1 cup (245 g)'], [/\b(frozen meal|entree|dinner|bowl)\b/i, 280, '1 meal (280 g)'],
  [/\b(sauce|dressing|ketchup|salsa|dip|hummus|spread|jam|jelly|syrup|honey)\b/i, 30, '2 tbsp (30 g)'], [/\b(peanut butter|nut butter|almond butter)\b/i, 32, '2 tbsp (32 g)'],
  [/\b(fruit|apples?|bananas?|berries|grapes|oranges?|melon)\b/i, 150, '1 cup / medium (150 g)'], [/\b(vegetables?|broccoli|spinach|carrots?|salad|greens|beans|lentils)\b/i, 85, '1 cup (85 g)'],
  [/\b(chicken|beef|pork|turkey|fish|salmon|tuna|shrimp|meat|sausage|bacon|ham)\b/i, 85, '3 oz (85 g)'], [/\b(eggs?)\b/i, 50, '1 egg (50 g)']];
function servBasis(p, opt) {
  opt = opt || {};
  if (opt.grams > 0) return { g: opt.grams, kind: 'custom', label: Math.round(opt.grams) + ((p && p.liquid) ? ' ml' : ' g') };
  const m = opt.mult > 0 ? opt.mult : 1, u = p.liquid ? 'ml' : 'g';
  if (p.meta && p.meta.perItem) return { g: 100 * m, kind: 'item', label: m === 1 ? '1 item' : m + ' items', perItem: true };
  let q = +p.servQ;
  if (q > 60 && smallUse(p)) { const sp = (p.portions || []).filter(([l, g]) => g > 0 && g <= 45 && /tbsp|tablespoon|packet|tsp|teaspoon|portion cup|pat/i.test(l)).sort((a, b) => /tbsp|tablespoon/i.test(b[0]) - /tbsp|tablespoon/i.test(a[0]))[0];
    if (sp) return { g: sp[1] * m, kind: 'label', label: (m === 1 ? '' : m + ' × ') + sp[0].replace(/\s*\([^)]*\)\s*$/, '') + ' (' + Math.round(sp[1]) + ' ' + u + ')' }; q = 0; } // v19.2: condiments are judged per tbsp, not per cup
  if (q >= 1 && q <= 1500) return { g: q * m, kind: 'label', label: (m === 1 ? '' : m + ' × ') + Math.round(q) + ' ' + u };
  const t = (p.name || '') + ' ' + (p.cat || '') + ' ' + (p.cats || '');
  for (const [re, g, lab] of DEFSERV) if (re.test(t)) { return { g: g * m, kind: 'default', label: (m === 1 ? '' : m + ' × ') + lab }; }
  return { g: 100 * m, kind: 'per100', label: 'per 100 ' + u + ' (no serving size)' };
}
/* v19.0 Blood sugar score, PER SERVING: SUGAR per serving is the primary driver (added sugar weighs more than natural sugar when the
   label says which is which), then TOTAL carbs per serving, then a refined-starch penalty; fiber per serving is a small bonus only and
   is never subtracted from carbs. opt: {mult} (0.5/1/2 servings) or {grams}. */
function score(p, opt) {
  const pure = pureSugar(p), n = pure ? Object.assign({}, p.n, { added: p.n.sugars }) : (p.n || {}), items = []; // v20.0: honey/syrup/agave sugar = added
  const { net, note } = netCarbs(p); const fiberDropped = quality(p).dropFiber;
  const sb = servBasis(p, opt), G = sb.g, k = G / 100;
  const base = { net, carbs: net, netNote: note, perServ: null, servQ: p.servQ || null, servG: G, servKind: sb.kind, servLabel: sb.label };
  base.perServ = { net: net == null ? null : net * k, carbs: net == null ? null : net * k };
  const q = quality(p); base.quality = q;
  if (net == null) return Object.assign(base, { score: null, band: 'na', label: 'Carbs unknown', items, missing: true });
  if (!q.ok) return Object.assign(base, { score: null, band: 'na', label: 'Data looks wrong', items, missing: true, bad: true });
  const ing = (p.ing || '').toLowerCase();
  let hidden = 0;
  const add = (key, label, pts, detail) => { if (Math.abs(pts) >= 0.5) items.push({ key, label, pts: Math.round(pts * 10) / 10, detail }); else hidden += pts; };
  const liquid = !!p.liquid; const ps = sb.kind === 'per100' ? ' per 100 ' + (liquid ? 'ml' : 'g') : ' per serving';
  const dairy = /yog|milk|kefir|skyr|cheese|dairy|cream|lait/i.test((p.cats || '') + ' ' + (p.cat || '') + ' ' + (p.name || ''));
  const syr = [...new Set((ing.match(SYRUPS) || []))];
  const sugarIng = SUGAR_WORDS.test(ing) || syr.length > 0;
  const sg = n.sugars, sgS = sg == null ? null : sg * k, ncS = net * k;
  // --- 1. sugar per serving (primary)
  if (sg != null) {
    if (n.added != null && !(n.added === 0 && sugarIng && sg > 2)) { // a declared 0 g added sugar that contradicts sugar in the ingredients is ignored
      const ad = Math.min(n.added, sg > 0 ? Math.max(sg, n.added) : n.added) * k, nat = Math.max(0, sgS - ad);
      if (ad > 0) add('added', 'Added sugar' + ps, -Math.min(60, ad * 2.0), r1(ad) + ' g'); else items.push({ key: 'added', label: 'Added sugar', pts: 0, detail: '0 g (declared)' });
      if (nat > 0) add('sugar', (dairy ? 'Natural sugar (lactose)' : 'Natural sugar') + ps, -Math.min(30, nat * 1.0), r1(nat) + ' g');
    } else if (sugarIng) add('sugar', 'Sugar' + ps + ' (added sugar in ingredients)', -Math.min(58, sgS * 1.9), r1(sgS) + ' g');
    else add('sugar', 'Total sugar' + ps, -Math.min(50, sgS * 1.3), r1(sgS) + ' g');
  } else if (sugarIng) add('sugar', 'Sugar amount not listed (sugar in ingredients)', -8, 'unknown');
  const sm = smallUse(p), liqPen = liquid && !sm; // v19.2: a runny jam/syrup/sauce isn't a drink
  if (liqPen && (sg || 0) > 2.5 && sgS > 3) add('liquid', 'Liquid sugar: rapid absorption', -Math.min(25, sgS * 0.8), r1(sgS) + ' g' + ps);
  if (liqPen && sgS != null && sgS >= 15) add('liquidDose', '15 g or more sugar per drink', -10, r1(sgS) + ' g');
  // v19.1: per-100 g sugar density (added sugar only), so a tiny serving of a very sugary food can't escape
  const tr = treat(p);
  if (sg != null && (sugarIng || (n.added || 0) > 0 || sm)) { const s100 = tr ? tr.s100 : sugar100(p);
    if (s100 != null) { const dp = liqPen ? Math.min(20, Math.max(0, s100 - 4) * 2) : Math.min(20, Math.max(0, s100 - 10) * 0.4); if (dp >= 0.5) add('density', 'Sugar density: ' + r1(s100) + ' g per 100 ' + (liquid ? 'ml' : 'g'), -dp, 'any serving size'); } }
  // --- 2. total carbs per serving (secondary)
  add('carbsServ', 'Total carbs' + ps, -Math.min(35, ncS * 0.7), r1(ncS) + ' g');
  let gi = 0; const hits = [];
  if (syr.length) { gi += Math.min(10, syr.length * 5); hits.push(...syr); }
  const first = ing.split(/[,(.;]/)[0] || '';
  if (SUGAR_WORDS.test(first) || new RegExp(SYRUPS.source, 'i').test(first)) { gi += 4; hits.push('sugar/syrup first'); }
  const st = [...new Set(ing.match(STARCH) || [])];
  if (st.length) { gi += Math.min(8, st.length * 4); hits.push(...st); }
  if (pure) { gi = 9; hits.length = 0; hits.push('single-ingredient sugar'); } // v20.0: same fast-carb penalty with or without an ingredient list
  if (gi && ncS >= 3) add('gi', 'Fast carbs (syrups, refined starch)', -Math.min(12, gi * Math.min(1, ncS / 15)), hits.slice(0, 4).join(', '));
  // --- 3. refined-starch penalty (white rice, white bread, pasta, crackers…). Starch = total carbs − sugar − fiber, per serving.
  const nm = (p.name || '') + ' ' + (p.cat || '');
  const refName = REFINED.test(nm) && !WHOLEG.test(p.name || '');
  const refIng = st.length > 0 && !WHOLEG.test(p.name || '') && !/^\s*(whole|brown rice|oat|100% whole)/i.test(ing);
  const starchS = Math.max(0, net - (sg || 0) - (n.fiber || 0)) * k;
  if ((refName || refIng) && starchS >= 5) add('starch', 'Refined starch' + ps, -Math.min(25, starchS * 0.9), r1(starchS) + ' g' + (refName ? ' (refined grain)' : ' (refined starch in ingredients)'));
  // --- buffers: fiber (small bonus), protein (capped)
  if (n.fiber != null && !fiberDropped) add('fiber', 'Fiber' + ps + ' (small bonus)', Math.min(6, n.fiber * k * 1.0), r1(n.fiber * k) + ' g');
  if (n.protein != null) { const carbPen = Math.abs(items.filter(i => /^(sugar|added|carbsServ|starch)$/.test(i.key)).reduce((a, i) => a + i.pts, 0)); const cap = Math.min(5, carbPen / 3); const raw = Math.min(6, n.protein * k * 0.3); add('protein', raw > cap ? 'Protein (capped)' : 'Protein', Math.min(raw, cap), r1(n.protein * k) + ' g'); }
  // --- secondary (per serving)
  if (n.sat != null) add('sat', 'Saturated fat', -Math.min(8, n.sat * k * 1.0), r1(n.sat * k) + ' g');
  if ((n.trans || 0) > 0.05) add('trans', 'Trans fat', -Math.min(8, n.trans * k * 8), r1(n.trans * k) + ' g');
  else if (HYDRO.test(ing) && !/fully hydrogenated/.test(ing)) add('trans', 'Partially hydrogenated oil', -6, 'trans-fat source');
  if (n.sodiumMg != null) add('sodium', 'Sodium', -Math.min(8, n.sodiumMg * k / 150), Math.round(n.sodiumMg * k) + ' mg');
  if (p.nova === 4) add('nova', 'Ultra-processed (NOVA 4)', -4, 'processing is weighed fully in the Health rating'); else if (p.nova === 3) add('nova', 'Processed (NOVA 3)', -2, '');
  const adds = (p.additives || []).filter((t, i, s) => ADDITIVES[t] && s.indexOf(t) === i);
  if (adds.length) add('additives', 'Additives of concern', -Math.min(8, adds.length * 2), adds.map(t => t.toUpperCase() + ' ' + ADDITIVES[t]).join(', '));
  // v7.1: US labels round under 0.5 g per serving down to 0, so "0 g" can hide up to 0.99 g per serving.
  if (n.carbs != null && n.carbs < 0.5 && p.naLabel && p.servQ && p.servQ < 100 && !(p.meta && p.meta.perItem)) { const unc = 0.99 * G / p.servQ; if (unc >= 0.5) add('round0', 'Label rounding: "0 g" per serving can hide up to 0.99 g', -Math.min(6, unc * 3), 'up to ' + r1(unc) + ' g'); }
  if (Math.abs(hidden) >= 0.05) items.push({ key: 'small', label: 'Small amounts (sodium, sat fat, sugar…) combined', pts: Math.round(hidden * 10) / 10, detail: 'each under 0.5' });
  const raw = 100 + items.reduce((s, i) => s + i.pts, 0);
  let sc = Math.max(0, Math.min(100, Math.round(raw)));
  if (tr && sc > TREAT_CAP) { items.push({ key: 'treat', label: 'Sweets & sugary drinks: capped at ' + TREAT_CAP + ' at any serving size', pts: TREAT_CAP - sc, detail: tr.why + ', ' + tr.s100 + ' g sugar per 100 ' + (liquid ? 'ml' : 'g') }); sc = TREAT_CAP; }
  items.sort((a, b) => a.pts - b.pts);
  const missing = [['fiber', 'fiber'], ['sugars', 'sugars'], ['sat', 'sat fat'], ['sodiumMg', 'sodium'], ['protein', 'protein']].filter(([k]) => n[k] == null).map(x => x[1]);
  return Object.assign(base, { score: sc, band: band(sc), label: label(sc), items, missingFields: missing, treat: tr, small: sm, pure, meal: !tr && !sm && n.kcal != null && mealItem(p, n.kcal * G / 100), dark: !tr && darkChoc(p) && (sg || 0) > 0, assumedServing: sb.kind === 'default' || sb.kind === 'per100', netServ: ncS, carbsServ: ncS, sugarServ: sgS });
}
/* v6.3 "filler": basics with ~no calories or carbs (water, plain tea/coffee, salt, spices, extracts, zero-cal sweeteners, gum).
   They still get a score, but they're kept out of "best of" rankings (home, stores, aisles, swaps, better options). */
const FILLER = /\b(water|seltzer|club soda|ice|salt|pepper(corns)?|spices?|seasoning|herbs?|oregano|basil|paprika|cumin|cinnamon|garlic powder|onion powder|chili powder|turmeric|extract|vinegar|baking (soda|powder)|cream of tartar|yeast|gelatin|sweetener|stevia|sucralose|monk fruit|gum|mints?|tea|coffee|espresso|bouillon|broth|stock|hot sauce|mustard|food colou?ring|flavou?r drops|water enhancer|liquid enhancer)\b/i;
/* v6.3.4: cooking ingredients (oils, sprays, flours/meals, dried herbs) are fillers too */
const INGRED = /\b(oils?|cooking spray|oil spray|olive oil|avocado oil|coconut oil|ghee|shortening|lard|flours?|almond meal|flax ?seed meal|flaxseed|cornmeal|corn meal|masa|semolina|breadcrumbs|panko|starch|xanthan|psyllium|parsley flakes|dried (parsley|basil|oregano|thyme|rosemary|dill|chives|cilantro)|(parsley|basil|oregano|thyme|rosemary|dill|chives|cilantro|bay) (flakes|leaves)|herbes|italian seasoning|curry powder|nutritional yeast|lemon juice|lime juice|(flavou?red|coffee|caramel|vanilla|hazelnut) syrup)\b/i;
function isFiller(p) {
  const n = p.n || {}; const k = n.kcal, c = n.carbs, nm = String(p.name || '');
  if (INGRED.test(nm) && !/\b(chips|crackers?|bars?|cookies?|bread|tortillas?|pasta|cereal|popcorn|tuna|sardines|fish|in oil|packed in|fried|dressing|mayo|cake|muffins?|pancake|waffle|pizza|snacks?|pretzels?|nuggets?|tenders|breaded)\b/i.test(nm)) return true;
  if (!FILLER.test(nm)) return false;
  if (/\b(latte|mocha|frappuccino|chai latte|milk tea|bubble tea|sweet tea|creamer|cake|cookie|bar|chips|nuts?|candy|chocolate|jerky|cracker|pretzel)\b/i.test(nm)) return false;
  return (k == null || k <= 25) && (c == null || c <= 5) || /\b(salt|spices?|seasoning|pepper(corns)?|oregano|basil|paprika|cumin|cinnamon|garlic powder|onion powder|chili powder|turmeric|extract|baking (soda|powder)|yeast|gelatin|food colou?ring)\b/i.test(nm) && (p.servQ == null || p.servQ <= 10);
}
const band = s => s == null ? 'na' : s >= 75 ? 'ex' : s >= 50 ? 'gd' : s >= 25 ? 'pr' : 'bd';
const label = s => ({ ex: 'Excellent', gd: 'Good', pr: 'Poor', bd: 'Bad', na: 'Not enough data' })[band(s)];

/* --- normalizers --- */
const addTags = s => (Array.isArray(s) ? s : String(s || '').split(',')).map(t => t.trim().replace(/^en:/, '').split('-')[0].toLowerCase()).filter(Boolean);
const isNA = c => { const a = Array.isArray(c) ? c : String(c || '').split(','); return a.length > 0 && a.some(x => /united-states/.test(x)) && a.every(x => /united-states|canada|mexico|puerto/.test(x) || !x); };
const LIQ_TAG = /^(beverages|.*-beverages|drinks|.*-drinks|sodas|.*-sodas|.*juices?|.*nectars?|waters|.*-waters|milks|.*-milks|.*smoothies|teas|iced-teas|coffees|.*-coffees|colas|.*-colas|lemonades|energy-drinks|soft-drinks)$/;
function isLiquid(cats, serv, name) {
  const tags = String(cats || '').split(',').map(t => t.trim().replace(/^\w\w:/, '').toLowerCase()).filter(t => t && !/foods-and-beverages|beverage-preparations|powder|mixes/.test(t));
  const byTag = tags.some(t => LIQ_TAG.test(t)) || (tags.length && !String(cats).includes(':') && LIQUID.test(cats) && !/foods and beverages/i.test(cats));
  const byServ = /\b\d+(\.\d+)?\s?(ml|fl\.? ?oz)\b/i.test(serv || '');
  return (byTag || byServ) && !/(powder|mix\b|bar\b|cereal|cookie|creamer|chips)/i.test(name || '');
}
function fromOFF(p) {
  const m = p.nutriments || {}; const g = k => num(m[k + '_100g']);
  let sod = g('sodium'); if (sod == null && g('salt') != null) sod = g('salt') / 2.5;
  const cats = (p.categories_tags || []).join(',');
  return { id: p.code, code: p.code, src: 'off', name: p.product_name || p.product_name_en || p.generic_name || 'Unnamed product', brand: String(p.brands || '').split(',')[0], qty: p.quantity || '',
    img: p.image_front_url || p.image_url || p.image_front_small_url || p.image_small_url || '', servQ: num(p.serving_quantity) || null, serv: p.serving_size || '', nova: num(p.nova_group),
    additives: addTags(p.additives_tags), ing: p.ingredients_text_en || p.ingredients_text || '', cat: (p.categories_tags || []).slice(-1)[0]?.replace(/^\w\w:/, '').replace(/-/g, ' ') || '', cats,
    alg: { allergens: p.allergens_tags || [], traces: p.traces_tags || [], analysis: p.ingredients_analysis_tags || [], labels: p.labels_tags || [] }, organic: (p.labels_tags || []).some(t => /organic/.test(t)), fvl: num(m['fruits-vegetables-legumes-estimate-from-ingredients_100g']) ?? num(m['fruits-vegetables-nuts-estimate-from-ingredients_100g']), naLabel: isNA(p.countries_tags || []), liquid: isLiquid(cats, p.serving_size, p.product_name),
    n: { carbs: g('carbohydrates'), sugars: g('sugars'), added: g('added-sugars'), fiber: g('fiber'), protein: g('proteins'), fat: g('fat'), sat: g('saturated-fat'), trans: g('trans-fat'), sodiumMg: sod != null ? sod * 1000 : null, kcal: g('energy-kcal') ?? (g('energy') != null ? g('energy') / 4.184 : null), polyols: g('polyols') } };
}
// USDA FDC: nutrient numbers (search results: nutrientNumber/value; detail: nutrient.number/amount). Branded values are per 100 g/ml.
const FDC = { '205': 'carbs', '269': 'sugars', '539': 'added', '291': 'fiber', '203': 'protein', '204': 'fat', '606': 'sat', '605': 'trans', '307': 'sodiumMg', '208': 'kcal', '299': 'polyols' };
function fromUSDA(f) {
  const n = {}; for (const x of f.foodNutrients || []) { const no = String(x.nutrientNumber || (x.nutrient && x.nutrient.number) || ''); const k = FDC[no]; const v = num(x.value ?? x.amount); if (k && v != null && n[k] == null) n[k] = v; }
  if (n.sugars == null) for (const x of f.foodNutrients || []) if (/sugars, total/i.test(x.nutrientName || (x.nutrient && x.nutrient.name) || '')) n.sugars = num(x.value ?? x.amount);
  const unit = String(f.servingSizeUnit || '').toLowerCase();
  const servQ = f.servingSize && /^(g|grm|ml|mlt)$/.test(unit) ? +f.servingSize : null;
  const gtin = f.gtinUpc ? String(f.gtinUpc).replace(/\D/g, '') : '';
  const cat = f.brandedFoodCategory || f.foodCategory || (f.foodCategory && f.foodCategory.description) || '';
  const catS = typeof cat === 'string' ? cat : (cat.description || '');
  const name = titleCase(f.description || 'USDA food');
  return { id: 'fdc-' + f.fdcId, code: gtin, fdcId: f.fdcId, src: 'usda', name, brand: (f.brandName || f.brandOwner) ? titleCase(f.brandName || f.brandOwner) : (f.dataType && f.dataType !== 'Branded' ? 'USDA ' + String(f.dataType).replace(/^sr legacy$/i, 'SR Legacy').replace(/^survey \(fndds\)$/i, 'FNDDS') : ''), qty: f.packageWeight || '',
    img: '', servQ, serv: f.householdServingFullText ? `${f.householdServingFullText} (${f.servingSize}${unit === 'grm' ? 'g' : unit === 'mlt' ? 'ml' : unit})` : servQ ? servQ + unit : '', nova: null, additives: [], ing: (f.ingredients || '').toLowerCase(), cat: catS, cats: catS,
    naLabel: true, liquid: notSolid(name, /beverage|drink|soda|juice|milk|water/i.test(catS) || unit === 'ml' || unit === 'mlt'), n };
}
const titleCase = s => String(s || '').toLowerCase().replace(/(^|[^a-z'’])([a-z])/g, (m, p, c) => p + c.toUpperCase()).replace(/\b(Of|And|With|In|The|A)\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());
/* compact local-index record (see tools/build.js) */
const DK = ['carbs', 'sugars', 'added', 'fiber', 'protein', 'fat', 'sat', 'trans', 'sodiumMg', 'kcal', 'polyols'];
function fromCompact(a) {
  const [code, name, brand, qty, img, servQ, serv, nova, nut, adds, ing, cat, flags, portions, meta] = a; const fl = flags || 0; const n = {}; DK.forEach((k, i) => n[k] = nut[i] == null ? null : nut[i]);
  return { id: code, code: /^\d+$/.test(code) ? code : '', src: meta ? (meta.src.includes('official') ? 'chain' : 'usda') : 'local', fdcId: /^fdc-/.test(code) ? code.slice(4) : undefined, name, brand, qty, img: img ? (img.startsWith('w:') ? (typeof dataURL === 'function' ? dataURL : String)('img/w/' + img.slice(2) + '-200.webp') : img.startsWith('http') ? img : 'https://images.openfoodfacts.org/images/products/' + img) : '', servQ, serv, nova, additives: adds ? adds.split(',') : [], ing, cat, cats: cat, naLabel: !!(fl & 1), liquid: notSolid(name, !!(fl & 2)), carby: fl & 16 ? !!(fl & 4) : undefined, dry: fl & 16 ? !!(fl & 8) : undefined, portions: portions || null, meta: meta || null, hx: a[15] || null, n };
}
const imgSize = (u, n) => u ? u.replace(/\.(100|200|400|full)\.jpg$/, '.' + n + '.jpg').replace(/-(200|400)\.webp$/, '-' + n + '.webp') : '';
return { pureSugar, treat, smallUse, darkChoc, sugar100, mealItem, MEAL_KCAL, TREAT_CAP, servBasis, DEFSERV, implausible, isFiller, DRY, CARBY, imgSize, score, quality, fromOFF, fromUSDA, fromCompact, band, label, netCarbs, addTags, isNA, isLiquid, DK, ADDITIVES };
});
