/* Lumi category taxonomy — matched on Open Food Facts category tags (shared by build + app). */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.LumiCats = f(); })(typeof self !== 'undefined' ? self : globalThis, function () {
const T = s => s.split(' ');
// key: [emoji, label, include tags, exclude tags, parent]
const CATS = {
  cereal: ['🥣', 'Cereal', T('breakfast-cereals mueslis granolas rolled-oats porridges oat-flakes'), T('nut-butters peanut-butters eggs breads cereal-bars bars plant-based-milk-alternatives milk-substitutes milks creamers butters spreads biscuits cookies plant-based-beverages beverages yogurts')],
  'cereal-cold': ['', 'Cold cereal', T('breakfast-cereals'), T('mueslis granolas rolled-oats porridges oat-flakes hot-cereals instant-oatmeals'), 'cereal'],
  'cereal-hot': ['', 'Hot cereal & oats', T('rolled-oats porridges oat-flakes hot-cereals instant-oatmeals oatmeals'), T('mueslis granolas'), 'cereal'],
  'cereal-granola': ['', 'Granola & muesli', T('mueslis granolas crunchy-mueslis'), [], 'cereal'],
  snacks: ['🍿', 'Snacks', T('salty-snacks crisps crackers-appetizers popcorn corn-chips'), T('french-fries frozen-foods')],
  'snacks-chips': ['', 'Chips', T('crisps potato-crisps corn-chips tortilla-chips'), [], 'snacks'],
  'snacks-crackers': ['', 'Crackers', T('crackers-appetizers crackers'), [], 'snacks'],
  'snacks-popcorn': ['', 'Popcorn', T('popcorn'), [], 'snacks'],
  drinks: ['🥤', 'Drinks', T('beverages'), T('beverage-preparations dehydrated-beverages coffees ground-coffees tea-bags syrups')],
  'drinks-soda': ['', 'Soda', T('sodas carbonated-drinks colas'), [], 'drinks'],
  'drinks-juice': ['', 'Juice', T('juices-and-nectars fruit-juices'), [], 'drinks'],
  'drinks-plantmilk': ['', 'Plant milk', T('plant-based-milk-alternatives milk-substitutes'), [], 'drinks'],
  'drinks-water': ['', 'Water', T('waters'), [], 'drinks'],
  yogurt: ['🥛', 'Yogurt', T('yogurts'), T('frozen-yogurts')],
  'yogurt-greek': ['', 'Greek', T('greek-style-yogurts'), [], 'yogurt'],
  'yogurt-plain': ['', 'Plain', T('plain-yogurts'), [], 'yogurt'],
  sauces: ['🥫', 'Sauces', T('sauces salad-dressings condiments'), []],
  'sauces-pasta': ['', 'Pasta & tomato', T('pasta-sauces tomato-sauces'), [], 'sauces'],
  'sauces-dressing': ['', 'Dressings', T('salad-dressings'), [], 'sauces'],
  'sauces-hot': ['', 'Hot sauce', T('hot-sauces'), [], 'sauces'],
  bars: ['🍫', 'Bars', T('bars protein-bars cereal-bars energy-bars'), []],
  'bars-protein': ['', 'Protein bars', T('protein-bars'), [], 'bars'],
  'bars-granola': ['', 'Granola bars', T('cereal-bars'), [], 'bars'],
  bread: ['🍞', 'Bread', T('breads'), T('breadcrumbs breaded-products')],
  'bread-sliced': ['', 'Sliced bread', T('white-breads wheat-breads sliced-breads whole-wheat-breads'), [], 'bread'],
  'bread-tortilla': ['', 'Tortillas & wraps', T('flatbreads tortillas wraps'), [], 'bread'],
  'bread-bagel': ['', 'Bagels', T('bagel-breads'), [], 'bread'],
  dairy: ['🧀', 'Dairy', T('cheeses milks cow-milks'), T('yogurts plant-based-milk-alternatives milk-substitutes plant-based-beverages')],
  'dairy-cheese': ['', 'Cheese', T('cheeses'), [], 'dairy'],
  'dairy-milk': ['', 'Milk', T('milks cow-milks'), T('cheeses'), 'dairy'],
  sweets: ['🍪', 'Sweets', T('confectioneries chocolates biscuits ice-creams ice-creams-and-sorbets cakes'), T('crackers-appetizers')],
  'sweets-cookies': ['', 'Cookies', T('biscuits cookies'), T('crackers-appetizers'), 'sweets'],
  'sweets-choc': ['', 'Chocolate', T('chocolates chocolate-candies'), [], 'sweets'],
  'sweets-candy': ['', 'Candy', T('candies'), [], 'sweets'],
  'sweets-ice': ['', 'Ice cream', T('ice-creams ice-creams-and-sorbets'), [], 'sweets'],
  nuts: ['🥜', 'Nuts', T('nuts nut-butters peanut-butters nuts-and-their-products'), T('chocolates candies bars')],
  'nuts-nuts': ['', 'Nuts', T('nuts'), [], 'nuts'],
  'nuts-butter': ['', 'Nut butters', T('nut-butters peanut-butters'), [], 'nuts'],
};
// v4: whole foods + restaurants (keys assigned by the USDA/chain build, not tag-matched)
Object.assign(CATS, {
  whole: ['🥦', 'Whole foods', [], []], 'whole-fruit': ['', 'Fruit', [], [], 'whole'], 'whole-veg': ['', 'Vegetables', [], [], 'whole'], 'whole-grains': ['', 'Rice, grains & pasta', [], [], 'whole'],
  'whole-meat': ['', 'Meat & poultry', [], [], 'whole'], 'whole-fish': ['', 'Fish & seafood', [], [], 'whole'], 'whole-legumes': ['', 'Beans & legumes', [], [], 'whole'], 'whole-dairy': ['', 'Dairy & eggs', [], [], 'whole'],
  'whole-nuts': ['', 'Nuts & seeds', [], [], 'whole'], 'whole-dishes': ['', 'Meals & dishes', [], [], 'whole'],
  rest: ['🍔', 'Restaurants', [], []], 'rest-other': ['', 'Other restaurant foods', [], [], 'rest'],
});
const KEYS = Object.keys(CATS);
function match(tagStr) {
  const tags = new Set(String(tagStr || '').split(',').map(t => t.trim().replace(/^\w\w:/, '').toLowerCase()));
  const out = [];
  KEYS.forEach((k, i) => { const [, , inc, exc, parent] = CATS[k]; if (inc.some(t => tags.has(t)) && !exc.some(t => tags.has(t))) out.push(i); });
  // subcategories require the parent to match too
  return out.filter(i => { const p = CATS[KEYS[i]][4]; return !p || out.includes(KEYS.indexOf(p)); });
}
const ORDER = ['rest', 'whole'];
const TOP = ORDER.concat(KEYS.filter(k => !CATS[k][4] && !ORDER.includes(k)));
function register(key, label, parent) { if (CATS[key]) return KEYS.indexOf(key); CATS[key] = ['', label, [], [], parent]; KEYS.push(key); return KEYS.length - 1; }
const subs = k => { const r = KEYS.filter(x => CATS[x][4] === k); return k === 'rest' ? r.filter(x => x !== 'rest-other').concat(r.includes('rest-other') ? ['rest-other'] : []) : r; };
return { CATS, KEYS, TOP, subs, match, register };
});
