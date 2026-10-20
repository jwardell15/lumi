/* Lumi v6.3 grocery aisles: precise subcategories from OFF category tags and USDA branded_food_category. Shared by build (node) and app. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.LumiAisles = f(); })(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const AISLES = [['produce', 'Produce', '🥬'], ['meat', 'Meat & seafood', '🥩'], ['dairy', 'Dairy & eggs', '🥛'], ['bakery', 'Bakery', '🍞'], ['frozen', 'Frozen', '🧊'], ['pantry', 'Pantry', '🥫'], ['snacks', 'Snacks', '🍿'], ['bev', 'Beverages', '🥤'], ['bfast', 'Breakfast', '🥣'], ['cond', 'Condiments & sauces', '🍅'], ['baking', 'Baking', '🧁'], ['canned', 'Canned goods', '🥫'], ['deli', 'Deli', '🥪'], ['baby', 'Baby', '🍼'], ['supp', 'Supplements & powders', '💊']];
// [id, aisle, label, OFF tag regex (on categories_tags), USDA category regex, name regex (fallback)]
const SUB = [
  // frozen first: "frozen" beats the food type
  ['fz-pizza', 'frozen', 'Frozen pizza', /en:frozen-pizzas/, /^pizza$|pies\/pastries\/pizzas\/quiches - savoury \(frozen\)/i, /\bfrozen pizza/],
  ['fz-meals', 'frozen', 'Frozen meals & entrées', /en:frozen-(ready-made-)?meals|en:frozen-dishes|en:frozen-lasagne/, /frozen dinners|^frozen meals|ready-made combination meals - not ready to eat \(frozen\)|vegetable based products \/ meals - not ready to eat \(frozen\)|frozen prepared sides|frozen foods/i, null],
  ['fz-bfast', 'frozen', 'Frozen breakfast', /en:frozen-(waffles|pancakes)|en:frozen-breakfast/, /frozen breakfast|frozen pancakes, waffles/i, null],
  ['fz-app', 'frozen', 'Frozen appetizers & snacks', /en:frozen-(appetizers|snacks)|en:frozen-french-fries|en:frozen-fried-potatoes/, /frozen appetizers|french fries, potatoes & onion rings|frozen potato|frozen snack|frozen bread & dough|bread \(frozen\)/i, null],
  ['fz-veg', 'frozen', 'Frozen vegetables', /en:frozen-vegetables/, /frozen vegetables|vegetables\s+[-–]?\s*(un)?prepared\/(un)?processed \(frozen\)/i, null],
  ['fz-fruit', 'frozen', 'Frozen fruit', /en:frozen-fruits/, /frozen fruit|fruits?\s+[-–]?\s*(un)?prepared\/(un)?processed \(frozen\)/i, null],
  ['fz-meat', 'frozen', 'Frozen meat & seafood', /en:frozen-(fish|seafood|meats|chicken|poultry)/, /frozen fish|frozen poultry|frozen patties|frozen bacon|frozen sausages|other frozen meats|frozen chicken|frozen meat|vegetarian frozen meats/i, null],
  ['fz-dessert', 'frozen', 'Ice cream & frozen desserts', /en:ice-creams|en:frozen-desserts|en:sorbets|en:frozen-yogurts|en:ice-cream/, /ice cream|frozen yogurt|other frozen desserts|desserts \(frozen\)|ice-cream|cakes - sweet \(frozen\)|pies\/pastries - sweet \(frozen\)/i, /\bice cream\b/],
  // produce
  ['pr-fruit', 'produce', 'Fresh fruit', /en:fresh-fruits/, /^fruit$|berries\/small fruit/i, null],
  ['pr-veg', 'produce', 'Fresh vegetables', /en:fresh-vegetables|en:salads$/, /pre-packaged fruit & vegetables|fruits, vegetables & produce|^vegetables$|^salads$|^peppers$/i, null],
  ['pr-dried', 'produce', 'Dried fruit', /en:dried-fruits/, /fruit\/nuts\/seeds combination/i, /\b(raisins|dried (cranberries|mango|apricots|fruit))\b/],
  // meat & seafood
  ['mt-bacon', 'meat', 'Bacon', /en:bacons?\b/, /^bacon$/i, /\bbacon\b/],
  ['mt-sausage', 'meat', 'Sausages & hot dogs', /en:sausages|en:hot-dogs|en:frankfurters/, /sausages, hotdogs|bacon, sausages & ribs|sausages\s*[-–]?\s*prepared|sausages\/smallgoods/i, /\b(sausages?|hot dogs?|bratwurst|franks)\b/],
  ['mt-poultry', 'meat', 'Chicken & turkey', /en:poultr|en:chickens?\b|en:turkeys?\b/, /poultry, chicken & turkey|chicken - |turkey - /i, null],
  ['mt-seafood', 'meat', 'Fish & seafood', /en:fishes|en:seafood|en:smoked-fishes/, /^fish & seafood|fish\s+[-–]?\s*(un)?prepared|shellfish|seafood miscellaneous|smoked fish|aquatic invertebrates|sushi/i, null],
  ['mt-plant', 'meat', 'Plant-based meat', /en:meat-analogues|en:meat-alternatives|en:plant-based-meat/, /meat substitutes|fish substitutes|vegetarian$/i, null],
  ['mt-meat', 'meat', 'Beef, pork & other meat', /en:meats\b|en:beef|en:pork|en:ground/, /meat\/poultry\/other animals|other meats|^fresh meat|beef - |pork - |includes products from (mature|animals)/i, null],
  // deli
  ['dl-cold', 'deli', 'Lunch meat & salami', /en:(cold-cuts|deli-meats|hams|salamis|prepared-meats|sliced-meats)/, /pepperoni, salami & cold cuts|ham\/cold meats|salami \/ cured/i, null],
  ['dl-dips', 'deli', 'Hummus & fresh dips', /en:hummus/, /dips\/hummus\/pate/i, /\bhummus\b/],
  ['dl-prep', 'deli', 'Prepared meals, sandwiches & salads', /en:sandwiches|en:prepared-salads|en:meals\b/, /deli salads|other deli|prepared subs|sandwiches\/filled|prepared wraps|lunch snacks & combinations|entrees, sides & small meals|cooked & prepared|ready-made combination meals$|prepared meals|deli and chilled|antipasto/i, null],
  // dairy & eggs
  ['dy-eggs', 'dairy', 'Eggs', /en:eggs\b|en:chicken-eggs/, /eggs/i, null],
  ['dy-plantmilk', 'bev', 'Plant-based milk & creamers', /en:plant-based-milk|en:(almond|oat|soy)-milks?/, /plant based milk/i, null],
  ['dy-milk', 'dairy', 'Milk', /en:milks\b|en:(whole|skimmed|semi-skimmed|flavoured|chocolate)-milks?/, /^milk$|milk\/milk substitutes|milk\/cream/i, null],
  ['dy-yogurt', 'dairy', 'Yogurt', /en:yogurts|en:yoghurts/, /yogurt|dairy foods\/yoghurts/i, null],
  ['dy-cheese', 'dairy', 'Cheese', /en:cheeses/, /cheese(?!.*sauce)|frozen food made from the curd/i, null],
  ['dy-butter', 'dairy', 'Butter & spreads', /en:butters|en:margarines|en:dairy-spreads/, /butter & spread|butter\/butter substitutes/i, null],
  ['dy-cream', 'dairy', 'Cream & creamers', /en:creams\b|en:coffee-creamers|en:creamers|en:sour-creams|en:whipped-cream/, /^cream|milk additives|cream\/cream substitutes/i, /\bcreamer\b/],
  ['dy-pudding', 'dairy', 'Puddings & desserts', /en:dairy-desserts|en:puddings/, /puddings & custards|desserts & custard|puddings and desserts/i, null],
  // bakery
  ['bk-tortilla', 'bakery', 'Tortillas & wraps', /en:tortillas|en:wraps|en:flatbreads/, /taco shells/i, /\b(tortillas?|wraps?|pita|naan|flatbread)\b/],
  ['bk-bagel', 'bakery', 'Bagels, muffins & English muffins', /en:bagels|en:muffins|en:english-muffins/, null, /\b(bagels?|muffins?)\b/],
  ['bk-buns', 'bakery', 'Buns & rolls', /en:buns|en:rolls|en:hamburger-buns|en:hot-dog-buns/, null, /\b(buns?|rolls?)\b/],
  ['bk-bread', 'bakery', 'Bread', /en:breads/, /breads & buns|^bread|bread - incl|dried breads|savoury bakery products/i, null],
  ['bk-donut', 'bakery', 'Donuts & pastries', /en:donuts|en:doughnuts|en:pastries|en:croissants|en:viennoiseries/, /croissants, sweet rolls|pies\/pastries - sweet \(shelf|pastries\/pies/i, /\b(donuts?|doughnuts?|danish|croissants?)\b/],
  ['bk-cake', 'bakery', 'Cakes & pies', /en:cakes|en:pies\b|en:cupcakes/, /cakes, cupcakes|sweet bakery products|cakes and slices/i, null],
  // breakfast
  ['bf-oat', 'bfast', 'Oatmeal & hot cereal', /en:oat-flakes|en:porridges|en:oatmeals|en:instant-oatmeal|en:hot-cereals/, /breakfast cereals - hot/i, /\b(oatmeal|grits|cream of wheat)\b/],
  ['bf-granola', 'bfast', 'Granola & muesli', /en:granolas|en:mueslis/, /cereal\/muesli bars/i, /\bgranola\b(?!.*bar)/],
  ['bf-cereal', 'bfast', 'Cereal', /en:breakfast-cereals/, /^cereal$|cereals products - ready to eat|processed cereal products|cereal products - ready/i, null],
  ['bf-pancake', 'bfast', 'Pancake & waffle mixes', /en:pancake-mixes|en:waffle-mixes/, /pancakes, waffles, french toast & crepes$/i, /\b(pancake|waffle) mix/],
  ['bf-syrup', 'bfast', 'Syrup', /en:syrups|en:maple-syrups/, /syrups & molasses/i, null],
  // snacks
  ['sn-bars', 'snacks', 'Snack & protein bars', /en:bars\b|en:cereal-bars|en:protein-bars|en:energy-bars|en:granola-bars/, /snack, energy & granola bars|wrapped snacks - (muesli|nut|cereal)/i, /\bbars?\b/],
  ['sn-chips', 'snacks', 'Chips & crisps', /en:chips|en:crisps|en:tortilla-chips|en:potato-chips/, /chips, pretzels & snacks|chips\/crisps|snack foods - (chips|corn chips)/i, /\bchips\b/],
  ['sn-popcorn', 'snacks', 'Popcorn & pretzels', /en:popcorn|en:pretzels/, /popcorn \(shelf/i, /\b(popcorn|pretzels?)\b/],
  ['sn-nuts', 'snacks', 'Nuts, seeds & trail mix', /en:nuts\b|en:trail-mixes|en:seeds\b|en:peanuts|en:almonds|en:cashews|en:pistachios/, /popcorn, peanuts, seeds|nuts\/seeds|snack foods - nuts|fruit\/nuts\/seeds mixes/i, null],
  ['sn-jerky', 'snacks', 'Jerky & meat snacks', /en:jerk|en:meat-snacks/, null, /\b(jerky|meat sticks?|beef sticks?)\b/],
  ['sn-crackers', 'snacks', 'Crackers', /en:crackers/, /crackers & biscotti|flavored snack crackers|biscuits cracker/i, null],
  ['sn-cookies', 'snacks', 'Cookies', /en:biscuits|en:cookies/, /cookies & biscuits|biscuits\/cookies|biscuits (chocolate|plain)/i, null],
  ['sn-candy', 'snacks', 'Candy & gum', /en:candies|en:confectioneries|en:chewing-gum|en:gummies|en:lollipops/, /^candy$|chewing gum|sugar candy|^confectionery|confection & snacks/i, null],
  ['sn-choc', 'snacks', 'Chocolate', /en:chocolates|en:chocolate-candies/, /^chocolate$/i, null],
  ['sn-fruit', 'snacks', 'Fruit snacks & applesauce', /en:fruit-snacks|en:compotes|en:applesauces/, /wholesome snacks/i, /\b(fruit snacks|applesauce|fruit cups?)\b/],
  ['sn-other', 'snacks', 'Other snacks', /en:snacks|en:salty-snacks|en:sweet-snacks/, /other snacks|^snacks|snack foods - other|snacks other|snacks variety|snack foods - cereal/i, null],
  // beverages
  ['bv-water', 'bev', 'Water & sparkling water', /en:waters|en:spring-waters|en:mineral-waters|en:sparkling-waters|en:flavored-waters/, /^water$|plant based water|liquid water enhancer/i, null],
  ['bv-soda', 'bev', 'Soda', /en:sodas|en:colas|en:carbonated-soft-drinks/, /^soda$|drinks - soft drinks/i, null],
  ['bv-juice', 'bev', 'Juice', /en:juices|en:fruit-juices|en:nectars|en:fruit-based-beverages/, /fruit & vegetable juice|drinks - juices/i, null],
  ['bv-coffee', 'bev', 'Coffee', /en:coffees|en:coffee-drinks|en:iced-coffees/, /^coffee|coffee\/coffee substitutes/i, null],
  ['bv-tea', 'bev', 'Tea', /en:teas|en:iced-teas|en:tea-bags|en:herbal-teas/, /iced & bottle tea|tea bags|tea and infusions|tea - bags|coffee\/tea/i, null],
  ['bv-energy', 'bev', 'Energy & sports drinks', /en:energy-drinks|en:sports-drinks/, /sport drinks|drinks - energy/i, /\b(energy drink|electrolyte)\b/],
  ['bv-protein', 'bev', 'Protein & nutrition shakes', /en:protein-shakes|en:meal-replacements|en:dietary-supplements/, /energy, protein & muscle recovery|meal replacement|breakfast drinks|weight control|sports and weight|specialty formula supplements/i, /\b(protein shake|nutrition shake)\b/],
  ['bv-mix', 'bev', 'Drink mixes', /en:instant-beverages|en:drink-mixes|en:powdered-drinks/, /powdered drinks|not ready to drink|drinks - powdered/i, null],
  ['bv-alcohol', 'bev', 'Beer, wine & spirits', /en:alcoholic-beverages|en:beers|en:wines/, /alcohol|^beer$/i, null],
  ['bv-other', 'bev', 'Other drinks', /en:beverages/, /other drinks|non alcoholic beverages|drinks flavoured|^drinks$|ready to drink$/i, null],
  // condiments & sauces
  ['cd-ketchup', 'cond', 'Ketchup, mustard & BBQ', /en:ketchups|en:mustards|en:barbecue-sauces/, /ketchup, mustard, bbq/i, null],
  ['cd-dressing', 'cond', 'Salad dressing & mayo', /en:salad-dressings|en:mayonnaises/, /salad dressing|salad dressings|dressings\/dips/i, null],
  ['cd-pasta', 'cond', 'Pasta & pizza sauce', /en:pasta-sauces|en:tomato-sauces|en:pizza-sauces/, /prepared pasta & pizza sauces/i, null],
  ['cd-salsa', 'cond', 'Salsa & dips', /en:salsas|en:dips/, /dips & salsa|dips - shelf/i, null],
  ['cd-ethnic', 'cond', 'Asian, Mexican & hot sauces', /en:soy-sauces|en:hot-sauces|en:chili-sauces/, /oriental, mexican & ethnic|mexican dinner mixes/i, /\b(hot sauce|soy sauce|sriracha|teriyaki)\b/],
  ['cd-pickles', 'cond', 'Pickles, olives & peppers', /en:pickles|en:olives|en:pickled/, /pickles|pickled vegetables/i, null],
  ['cd-jam', 'cond', 'Jam, honey & sweet spreads', /en:jams|en:honeys|en:fruit-spreads|en:sweet-spreads|en:hazelnut-spreads/, /jam, jelly|^honey$|sweet spreads|^spreads$/i, null],
  ['cd-other', 'cond', 'Other sauces & condiments', /en:sauces|en:condiments|en:gravies/, /other cooking sauces|sauces\/spreads\/dips|other condiments|gravy mix|^sauces|sauces - cooking|condiments, oils|other sauces|includes any products that can be described\/observed as a (frozen )?substance which can be heated/i, null],
  // baking
  ['bk2-flour', 'baking', 'Flour & cornmeal', /en:flours/, /flours & corn meal|grains\/flour|flour - cereal|sugar and flour|fine powder derived/i, null],
  ['bk2-sugar', 'baking', 'Sugar & sweeteners', /en:sugars|en:sweeteners/, /granulated, brown|sugars\/sugar substitute/i, null],
  ['bk2-mix', 'baking', 'Baking mixes', /en:baking-mixes|en:cake-mixes|en:brownie-mixes/, /cake, cookie & cupcake mixes|bread & muffin mixes|baking\/cooking mixes|crusts & dough|pastry shells|pre-mixed dough/i, null],
  ['bk2-chips', 'baking', 'Chocolate chips & decorations', /en:chocolate-chips|en:baking-chocolates|en:sprinkles|en:frostings/, /baking decorations|desserts\/dessert sauces/i, null],
  ['bk2-other', 'baking', 'Baking ingredients', /en:baking-ingredients|en:leavening|en:extracts/, /baking additives|baking\/cooking supplies|^baking|baking needs|gelatin, gels/i, null],
  // canned
  ['cn-soup', 'canned', 'Soup, chili & broth', /en:soups|en:broths|en:stocks|en:chili/, /soup|chili & stew|liquid food made from the stock/i, null],
  ['cn-tomato', 'canned', 'Canned tomatoes', /en:canned-tomatoes|en:tomato-pastes|en:diced-tomatoes/, /^tomatoes$/i, null],
  ['cn-beans', 'canned', 'Canned beans', /en:canned-beans|en:canned-legumes/, /canned & bottled beans|chickpeas/i, null],
  ['cn-fish', 'canned', 'Canned tuna, fish & meat', /en:canned-fishes|en:canned-tunas|en:canned-meats/, /canned tuna|canned seafood|canned meat|canned fish/i, null],
  ['cn-fruit', 'canned', 'Canned fruit', /en:canned-fruits/, /canned fruit|fruits?\s*[-–]?\s*prepared\/processed|fruit\s+prepared\/processed/i, null],
  ['cn-veg', 'canned', 'Canned vegetables', /en:canned-vegetables|en:canned-foods/, /canned vegetables|canned\/dried veges|vegetables\s*[-–]?\s*prepared\/processed|vegetables\s+unprepared\/unprocessed \(shelf/i, null],
  // pantry
  ['pt-pasta', 'pantry', 'Pasta & noodles', /en:pastas|en:noodles|en:spaghetti|en:macaroni/, /pasta by shape|all noodles|pasta\/noodles|^pasta$/i, null],
  ['pt-boxed', 'pantry', 'Mac & cheese & boxed meals', /en:macaroni-and-cheese|en:instant-noodles|en:meal-kits/, /pasta dinners|pizza mixes & other dry|flavored rice dishes|stuffing|dough based products|pasta - instant|grain based products/i, /\bmac(aroni)? (and|&) cheese\b/],
  ['pt-rice', 'pantry', 'Rice & grains', /en:rices|en:cereal-grains|en:quinoa|en:grains/, /^rice|other grains & seeds|^grains$|rice & grains/i, null],
  ['pt-beans', 'pantry', 'Dry beans & lentils', /en:dried-legumes|en:lentils|en:dry-beans/, /vegetable and lentil mixes/i, null],
  ['pt-nutbutter', 'pantry', 'Peanut butter & nut butters', /en:nut-butters|en:peanut-butters|en:nuts-and-seeds-butters/, /nut & seed butter/i, null],
  ['pt-oil', 'pantry', 'Oils & vinegar', /en:vegetable-oils|en:olive-oils|en:vinegars|en:cooking-oils|en:oils/, /vegetable & cooking oils|oils edible|fats edible|vinegars|cooking oils/i, null],
  ['pt-spice', 'pantry', 'Spices & seasonings', /en:spices|en:seasonings|en:herbs|en:salts|en:condiment-mixes/, /seasoning mixes|herbs & spices|herbs\/spices|herbs and spices|extracts\/salt/i, null],
  // baby
  ['by-formula', 'baby', 'Baby formula', /en:infant-formulas|en:baby-milks/, /children's nutritional/i, /\binfant formula\b/],
  ['by-food', 'baby', 'Baby food & snacks', /en:baby-foods|en:baby-food/, /baby\/infant/i, null],
  // v6.3.3 (appended so stored indexes stay valid)
  ['sp-powder', 'supp', 'Protein, greens & supplement powders', /en:protein-powders|en:bodybuilding-supplements|en:dietary-supplements/, /vitamins|herbal supplements|^supplements|sport supplements/i, /\b(protein powder|greens powder|superfood (blend|powder)|collagen (peptides|powder)|whey (protein|isolate)|pre-?workout|creatine|supplement)\b/]
];
const BYID = Object.fromEntries(SUB.map((s, i) => [s[0], i]));
// name keyword fallback (only when no category tag or USDA category matched), most specific first
const NAMEMAP = [[/\bfrozen\b.*\bpizza|\bpizza\b.*\bfrozen/, 'fz-pizza'], [/\bice cream|gelato|frozen yogurt|popsicle|sorbet/, 'fz-dessert'], [/\bfrozen\b.*\b(vegetables?|peas|corn|broccoli|spinach|green beans)/, 'fz-veg'], [/\bfrozen\b.*\b(berries|fruit|mango|strawberr)/, 'fz-fruit'], [/\bfrozen\b/, 'fz-meals'],
  [/\bpizza\b/, 'fz-pizza'], [/\bgreek yog|\byog(h)?urt|\bskyr\b|\bkefir\b/, 'dy-yogurt'], [/\bcream cheese|\bsour cream|\bhalf (and|&) half|\bcreamer\b|whipping cream|heavy cream/, 'dy-cream'], [/\bcheese\b|cheddar|mozzarella|parmesan/, 'dy-cheese'],
  [/\b(almond|oat|soy|coconut|cashew) (milk|beverage)/, 'dy-plantmilk'], [/\bmilk\b/, 'dy-milk'], [/\bbutter\b(?! ?(cookie|cup|milk))|margarine/, 'dy-butter'], [/\beggs?\b/, 'dy-eggs'],
  [/\bpeanut butter|almond butter|nut butter|\bnutella/, 'pt-nutbutter'], [/\b(jam|jelly|preserves|marmalade|honey)\b/, 'cd-jam'], [/\bsyrup\b/, 'bf-syrup'], [/\bgranola\b(?!.*bar)|\bmuesli/, 'bf-granola'], [/\boatmeal|\boats\b|\bgrits\b/, 'bf-oat'], [/\bcereal\b|\bflakes\b|\bo'?s\b/, 'bf-cereal'],
  [/\b(protein|granola|snack|energy|nut|cereal) bars?\b|\bbars?\b/, 'sn-bars'], [/\bchips\b|\bcrisps\b|\btortilla chips/, 'sn-chips'], [/\bpopcorn|pretzels?/, 'sn-popcorn'], [/\bjerky|meat sticks?/, 'sn-jerky'], [/\btrail mix|\b(almonds|cashews|peanuts|pistachios|walnuts|pecans|mixed nuts|sunflower seeds)\b/, 'sn-nuts'],
  [/\bcrackers?\b/, 'sn-crackers'], [/\bcookies?\b|\bbiscotti/, 'sn-cookies'], [/\bchocolate\b(?!.*(milk|chip))|\btruffles?\b/, 'sn-choc'], [/\b(candy|candies|gumm(y|ies)|lollipops?|licorice|mints?|gum)\b/, 'sn-candy'], [/\bfruit snacks|applesauce|fruit cups?/, 'sn-fruit'],
  [/\bsparkling water|\bspring water|\bwater\b/, 'bv-water'], [/\bsoda\b|\bcola\b|ginger ale|root beer/, 'bv-soda'], [/\bjuice\b|\blemonade|\bnectar\b/, 'bv-juice'], [/\bcoffee|espresso|cold brew/, 'bv-coffee'], [/\btea\b/, 'bv-tea'], [/energy drink|sports drink|electrolyte/, 'bv-energy'], [/protein shake|nutrition shake/, 'bv-protein'],
  [/\bbeer\b|\bwine\b|vodka|whiskey|\brum\b|tequila|seltzer.*(hard|alc)/, 'bv-alcohol'], [/\bdrink\b|beverage/, 'bv-other'],
  [/\bbagels?|english muffins?/, 'bk-bagel'], [/\btortillas?|\bwraps?\b|\bpita\b|\bnaan\b/, 'bk-tortilla'], [/\bbuns?\b|\brolls?\b(?!.*(egg|spring|fruit))/, 'bk-buns'], [/\bdonuts?|doughnuts?|croissants?|danish|pastr(y|ies)/, 'bk-donut'], [/\bcakes?\b|\bpies?\b|cupcakes?|brownies?/, 'bk-cake'], [/\bbread\b|\bloaf\b/, 'bk-bread'],
  [/\bbacon\b/, 'mt-bacon'], [/\bsausages?|hot dogs?|bratwurst|franks\b|kielbasa/, 'mt-sausage'], [/\bham\b|\bsalami|\bpepperoni|\bbologna|turkey breast slices|deli/, 'dl-cold'], [/\bhummus\b/, 'dl-dips'], [/\bsandwich|\bwrap kit|lunch kit|\bsalad kit/, 'dl-prep'],
  [/\bchicken|\bturkey\b/, 'mt-poultry'], [/\bsalmon|\btuna\b|\bshrimp|\bcod\b|tilapia|\bfish\b|crab|lobster|scallops?/, 'mt-seafood'], [/\bbeef\b|\bpork\b|\bsteak|ground (beef|pork)|\blamb\b/, 'mt-meat'], [/plant[- ]based (burger|meat)|meatless|veggie burger/, 'mt-plant'],
  [/\bketchup|\bmustard|bbq sauce|barbecue sauce/, 'cd-ketchup'], [/\bdressing\b|\bmayo|mayonnaise|vinaigrette/, 'cd-dressing'], [/pasta sauce|marinara|pizza sauce|alfredo/, 'cd-pasta'], [/\bsalsa\b|\bdips?\b|queso/, 'cd-salsa'], [/hot sauce|soy sauce|sriracha|teriyaki|enchilada sauce/, 'cd-ethnic'], [/\bpickles?\b|\bolives?\b|jalape|pepperoncini|relish/, 'cd-pickles'], [/\bsauce\b|\bgravy|\bmarinade/, 'cd-other'],
  [/\bsoup\b|\bbroth\b|\bstock\b|\bchili\b|\bstew\b/, 'cn-soup'], [/\b(diced|crushed|whole peeled|stewed) tomatoes|tomato paste|tomato sauce/, 'cn-tomato'], [/\b(black|pinto|kidney|cannellini|garbanzo|refried|navy|baked) beans|chickpeas/, 'cn-beans'],
  [/\bmac(aroni)? (and|&) cheese|\bramen\b|instant noodles|\bhelper\b|rice mix|stuffing/, 'pt-boxed'], [/\bpasta\b|spaghetti|penne|macaroni|fettuccine|linguine|rotini|lasagna noodles|\bnoodles\b/, 'pt-pasta'], [/\brice\b|quinoa|couscous|farro|barley/, 'pt-rice'], [/\blentils|split peas|dry beans/, 'pt-beans'],
  [/\boil\b|vinegar/, 'pt-oil'], [/\bseasoning|\bspices?\b|\bsalt\b|pepper(corns)?\b|\bpaprika|cinnamon|\boregano|\bcumin|\brub\b/, 'pt-spice'], [/\bflour\b|cornmeal/, 'bk2-flour'], [/\bsugar\b|sweetener|stevia|monk fruit/, 'bk2-sugar'], [/\b(cake|brownie|muffin|cookie|pancake) mix/, 'bk2-mix'], [/chocolate chips|sprinkles|frosting|icing/, 'bk2-chips'], [/baking (soda|powder)|\bextract\b|\byeast\b/, 'bk2-other'],
  [/\bbaby\b|\binfant|toddler/, 'by-food'], [/\b(apples?|bananas?|oranges?|grapes|berries|strawberries|blueberries|avocados?|lemons?|limes?|peaches|pears|mangos?|pineapple|watermelon|cherries)\b/, 'pr-fruit'], [/\b(lettuce|spinach|kale|salad|carrots?|broccoli|onions?|potatoes|peppers?|cucumbers?|celery|mushrooms?|tomatoes|zucchini|cauliflower|cabbage)\b/, 'pr-veg']];
const SALADCO = /\b(fresh express|little salad bar|dole|taylor farms|earthbound|organic girl|marketside|bowery|gotham greens|vertical roots|little leaf|revol|plenty|brightfarms|ready pac|church brothers|tanimura|josie'?s)\b/;
const EGGSUB = /\b(egg (substitute|replacer|alternative)s?|vegan egg|plant[- ]based egg|just egg|egg[- ]free egg|eggless)\b/;
const OVR = [[/\b((almond|oat|coconut|soy|cashew|plant[- ]based|pea|macadamia|hemp|non-?dairy|dairy[- ]free|vegan)( milk)? (coffee )?creamers?|(almond|oat|soy|cashew|coconut|pea|macadamia|hemp|rice) (milk|beverage|drink)|non-?dairy (milk|beverage))\b/, 'dy-plantmilk', /\b(chocolate bar|ice cream|frozen|yogurt|cheese)\b/],
  [/\b(egg (substitute|replacer|alternative)s?|vegan egg|plant[- ]based egg|just egg|egg[- ]free egg|eggless)\b/, 'mt-plant', null],
  [/\b(greens? (powder|blend|superfood)|organic greens|super ?greens|superfood (blend|powder|greens)|protein powder|collagen (peptides|powder)|whey (protein|isolate)|pre-?workout|creatine|plant protein powder|meal replacement powder)\b/, 'sp-powder', /\b(bars?|cookies?|chips|shakes? ready|ready to drink|rtd|yogurt|cereal|pasta)\b/],
  [/\b(bubly|la ?croix|spindrift|sparkling (mineral |spring )?water|seltzer( water)?|perrier|san pellegrino|s\.? ?pellegrino|topo chico|polar seltzer|waterloo|aha sparkling|klarbrunn|schweppes seltzer|vintage seltzer|canada dry seltzer)\b/, 'bv-water', /\b(hard|vodka|tequila|alcohol|alcoholic|spiked|truly|white claw|high noon|coors|smirnoff|bud light|corona|bon (&|and) viv|vizzy|michelob|bacardi|ketel|cutwater|nutrl|beer|abv|proof|cocktail|rum|gin|whiskey|malt)\b/],
[/\b(peanut|almond|cashew|sunflower( seed)?|pumpkin seed|seed|nut|hazelnut|pecan|walnut|pistachio|macadamia|soy ?nut|watermelon seed) butter\b|\btahini\b/, 'pt-nutbutter', /\b(cookies?|cups?|bars?|crackers?|pretzels?|filled|sandwich|wafers?|candy|bites|ice cream|frozen|gelato|pies?|fudge|chocolate|cheesecake|cereal|granola|puffs|eggs?|balls|protein (shake|drink|powder)|shakes?|trail|mix|clusters|popcorn|dessert|cakes?|brownies?|bread|swirl|squares|truffles?|nougat|bark|treats?|dog|oats|oatmeal|yogurt|smoothie|creamer|syrup|sauce)\b/],
  [/\b(chips|crisps)\b/, 'sn-chips', /\b(chocolate|baking|cookies?|ice cream|mint chip|ahoy|pickles?)\b/],
  [/\b(almonds|cashews|peanuts|pistachios|pecans|walnuts|mixed nuts|trail mix|sunflower seeds|pumpkin seeds)\b/, 'sn-nuts', /\b(milk|butter|bars?|chocolate covered|flour|cereal|granola|beverage|creamer|yogurt|cheese)\b/],
  [/\b(egg noodles|noodles)\b/, 'pt-pasta', /\b(soup|ramen|instant|cup|bowl|meal|frozen|with|alfredo|stroganoff|chicken)\b/],
  [/\b(cacao|cocoa) powder\b/, 'bk2-other', /\b(drink|hot cocoa|mix|protein)\b/],
  [/\b(tofu|tempeh|seitan)\b/, 'mt-plant', /\b(chips|jerky|snack)\b/],
  [/\b(black|pinto|kidney|garbanzo|navy|cannellini|refried|great northern|butter|lima|mayocoba|white) beans\b|\bchick ?peas\b|\blentils\b/, 'cn-beans', /\b(chips|crisps|snacks?|roasted|crunchy|puffs|pasta|soup|chili|dip|hummus|frozen|burritos?|rice and|& rice|salad)\b/]];
const PET = /en:pet-foods?|en:dog-foods?|en:cat-foods?|en:animal-foods/;

const WHOLE = { 'whole-fruit': 'pr-fruit', 'whole-veg': 'pr-veg' };
/* r: {cats (OFF tags string), ucat (USDA category), name} -> sub index or -1 */
function classify(r) {
  const c = (r.cats || '').toLowerCase(), u = r.ucat || '', n = (r.name || '').toLowerCase();
  const refine = i => { const a = SUB[i][1]; for (let j = 0; j < SUB.length; j++) if (j !== i && SUB[j][1] === a && SUB[j][5] && SUB[j][5].test(n)) return j; return i; };
  // v6.3.1 strong name overrides: items whose identity is unambiguous beat loose category tags (seed butters were landing in Dairy, beans/tempeh in Snacks)
  const base = classify0(c, u, n, refine);
  if (SALADCO.test(String(r.brand || '').toLowerCase()) && /\b(butter|lettuce|salad|greens|blend|mix|romaine|spinach|kale|crisp|sweet)\b/.test(n) && !/\b(dressing|kit|croutons?)\b/.test(n)) return BYID['pr-veg']; // salad growers' 'Sweet Butter' is lettuce
  if (base >= 0 && SUB[base][1] === 'dairy' && EGGSUB.test(n)) return BYID['mt-plant'];
  if (base >= 0 && (SUB[base][1] === 'frozen' || /^(pt-beans|cn-beans|pt-nutbutter|cn-soup|dl-dips|cd-pickles|sn-bars|bv-alcohol)$/.test(SUB[base][0]))) return base;
  for (const [re, id, not] of OVR) if (re.test(n) && !(not && not.test(n))) return BYID[id];
  return gate(base, n, c, u);
}
/* v6.3.3 aisle gates: a "type" aisle only keeps items whose name says what they are; misfits fall back to the name map (outside that aisle) or to uncategorized */
const GATES = {
  dairy: /\b(milks?|cheeses?|cheddar|mozzarella|parmesan|parmigiano|provolone|swiss|gouda|brie|feta|ricotta|cottage|colby|jack|havarti|queso|mascarpone|burrata|halloumi|paneer|string|yog(h)?urts?|skyr|kefir|lassi|butter|ghee|cream|creamer|half (&|and) half|eggs?|egg whites|whites|curds?|whey|dairy|custard|pudding|margarine|spread|buttermilk|lactose|ultra-filtered|a2|chobani|fage|oikos|siggi|fairlife|horizon|almond|oat|soy|coconut|cashew|rice|pea|plant|nog|frozen yogurt|flan|mousse|dessert|tapioca|rice pudding|crema|labneh|quark|neufchatel|fromage|chevre|goat|sheep|blue|bleu|camembert|muenster|asiago|romano|pecorino|manchego|gruyere|fontina|emmental|pepper jack|monterey|american|velveeta|singles|slices|shredded|crumbles|block)\b/,
  meat: /\b(chicken|beef|pork|turkey|lamb|veal|bison|venison|duck|goose|game|steak|steaks|ribeye|sirloin|brisket|roast|ribs?|chops?|loin|tenderloin|ground|burgers?|patties|meatballs?|sausages?|bratwurst|kielbasa|franks?|hot dogs?|bacon|ham|jerky|salami|pepperoni|prosciutto|chorizo|fish|salmon|tuna|cod|tilapia|halibut|trout|catfish|pollock|haddock|mahi|swordfish|sardines?|anchov|mackerel|shrimp|prawns?|crab|lobster|scallops?|clams?|mussels?|oysters?|squid|calamari|octopus|crawfish|seafood|surimi|krab|sushi|rolls?|maki|nigiri|sashimi|poke|tempura|ceviche|plant[- ]based|meatless|vegan|vegetarian|veggie|tofu|tempeh|seitan|beyond|impossible|gardein|morningstar|egg|wings?|drumsticks?|thighs?|breasts?|legs?|quarters|whole|fillets?|filets?|strips|tenders|nuggets|cutlets?|kabobs?|carnitas|barbacoa|pulled|rotisserie|smoked|cured|deli|meat|poultry|links|crumbles)\b/,
  produce: /\b(fruits?|vegetables?|veggies?|salads?|greens|lettuce|spinach|kale|arugula|cabbage|broccoli|cauliflower|carrots?|celery|cucumbers?|tomato(es)?|peppers?|onions?|garlic|potato(es)?|sweet potato|squash|zucchini|mushrooms?|corn|peas|beans|asparagus|brussels|beets?|radish|herbs?|cilantro|parsley|basil|mint|apples?|bananas?|oranges?|grapes?|berries|strawberr|blueberr|raspberr|blackberr|cherr|peach|pears?|plums?|mangos?|mangoes|pineapple|melon|watermelon|cantaloupe|kiwi|lemons?|limes?|avocados?|grapefruit|clementines?|mandarins?|dates|figs|raisins|apricots?|cranberr|prunes|coconut|papaya|pomegranate|dried|slaw|sprouts|stir fry|medley|florets|edamame|ginger|jalape|chiles?|leeks?|shallots?|scallions?|bok choy|chard|collard|romaine|spring mix|microgreens|okra|eggplant|artichoke|fennel|yams?|plantains?|jicama|turnips?|parsnips?|rutabaga|tomatillo)\b/
};
const TRUST = { dairy: /en:(dairies|yogurts|yoghurts|cheeses|milks|creams|butters|eggs|fermented-milk|plant-based-milk)|yogurt|cheese|^milk|dairy|cream|butter|eggs|plant based milk/i,
  meat: /en:(meats|poultr|fishes|seafood|sausages|hams|bacons|meat-analogues)|meat|poultry|chicken|turkey|beef|pork|fish|seafood|shellfish|sausage|bacon|frankfurt|substitutes/i,
  produce: /en:(fresh-fruits|fresh-vegetables|dried-fruits|fruits|vegetables)|fruit|vegetable|produce|salads|berries|peppers/i };
const NOTDAIRY = /\b(lettuce|squash|lima|butter beans|(peanut|almond|cashew|nut|seed|apple|cookie) butter|butternut|butterscotch|buttermilk (biscuits?|pancakes?|bread|ranch)|cream of (mushroom|chicken|celery)|ice cream cones?|cream crackers|eggplant|egg (rolls?|noodles))\b/;
function fallback(a, n) { for (const [re, id] of NAMEMAP) if (SUB[BYID[id]][1] !== a && re.test(n)) return BYID[id]; return -1; }
function gate(i, n, c = '', u = '') {
  if (i < 0) return i; const a = SUB[i][1], g = GATES[a]; if (a === 'dairy' && NOTDAIRY.test(n)) return fallback(a, n); if (!g || g.test(n)) return i;
  if (TRUST[a] && (TRUST[a].test(c) || TRUST[a].test(u))) return i; // the category tag itself says it belongs (e.g. "Blended Strawberry" tagged en:yogurts)
  for (const [re, id] of NAMEMAP) if (SUB[BYID[id]][1] !== a && re.test(n)) return BYID[id];
  return -1;
}
function misfit(i, n) { if (i < 0) return false; const g = GATES[SUB[i][1]]; return !!g && !g.test(String(n || '').toLowerCase()); } // name-only check, used by the audit
function classify0(c, u, n, refine) {
  if (c) for (let i = 0; i < SUB.length; i++) if (SUB[i][3] && SUB[i][3].test(c)) return i;
  if (u) for (let i = 0; i < SUB.length; i++) if (SUB[i][4] && SUB[i][4].test(u)) return refine(i);
  for (const [re, id] of NAMEMAP) if (re.test(n)) return BYID[id];
  return -1;
}
const isPet = cats => PET.test(cats || '');
return { AISLES, SUB, BYID, WHOLE, GATES, classify, isPet, misfit };
});
