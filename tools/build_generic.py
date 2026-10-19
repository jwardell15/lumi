#!/usr/bin/env python3
"""Whole foods + restaurant layer: USDA SR Legacy, Foundation, FNDDS bulk JSON + official chain nutrition (chains.jsonl) -> generic.jsonl"""
import json, re, sys, os
U = sys.argv[1] if len(sys.argv) > 1 else '/workspace/usda'
CH = sys.argv[2] if len(sys.argv) > 2 else '/workspace/chains.jsonl'
OUT = sys.argv[3] if len(sys.argv) > 3 else '/workspace/generic.jsonl'
NUM = {'205': 'carbs', '269': 'sugars', '539': 'added', '291': 'fiber', '203': 'protein', '204': 'fat', '606': 'sat', '605': 'trans', '307': 'sodiumMg', '208': 'kcal', '299': 'polyols'}
GROUP = {'Fruits and Fruit Juices': 'whole-fruit', 'Vegetables and Vegetable Products': 'whole-veg', 'Cereal Grains and Pasta': 'whole-grains', 'Beef Products': 'whole-meat', 'Pork Products': 'whole-meat',
         'Poultry Products': 'whole-meat', 'Lamb, Veal, and Game Products': 'whole-meat', 'Sausages and Luncheon Meats': 'whole-meat', 'Finfish and Shellfish Products': 'whole-fish', 'Legumes and Legume Products': 'whole-legumes',
         'Dairy and Egg Products': 'whole-dairy', 'Nut and Seed Products': 'whole-nuts', 'Spices and Herbs': 'whole', 'Fats and Oils': 'whole'}
SUBS = [('whole-dishes', r'mixed dish|sandwich|burger|pizza|taco|burrito|meals|entree|side dish|soup|stew|casserole|omelet|frankfurter|hot dog|lo/chow|fried rice|nachos|dumpling|egg roll'),
 ('whole-drinks', r'beverage|juice|coffee|\btea\b|soft drink|soda|water|liquor|cocktail|beer|wine|smoothie|drink|shake'),
 ('whole-sweets', r'sweet|cake|cookie|brownie|cand|ice cream|frozen dairy|dessert|\bpie|doughnut|pastr|sugar|syrup|jam|jelly|pudding'),
 ('whole-snacks', r'snack|chips|pretzel|popcorn|crackers'),
 ('whole-sauces', r'sauce|dressing|gravy|dip|condiment|\boil|fats|butter|margarine|spice|herb|seasoning|mayonnaise|ketchup|mustard'),
 ('whole-bakery', r'bread|baked|bagel|roll|biscuit|muffin|pancake|waffle|french toast|tortilla|bun'),
 ('whole-grains', r'cereal|grain|rice|pasta|noodle|oat|cornmeal|flour|quinoa'),
 ('whole-fish', r'fish|shellfish|seafood|shrimp|salmon|tuna|crab'),
 ('whole-meat', r'beef|pork|poultry|chicken|turkey|lamb|veal|game|sausage|bacon|cold cut|meat|ham\b'),
 ('whole-dairy', r'dairy|cheese|milk|yogurt|egg|cream'),
 ('whole-legumes', r'legume|bean|pea\b|peas|lentil|tofu|soy'),
 ('whole-nuts', r'\bnut|seed|almond|peanut|cashew|walnut'),
 ('whole-fruit', r'fruit|banana|apple|berr|citrus|melon|grape|orange|peach|pear|plum|cherr|mango|pineapple|raisin'),
 ('whole-veg', r'vegetable|potato|lettuce|tomato|green|onion|corn|carrot|broccoli|spinach|squash|pepper|cabbage|starchy')]
def sub_for(group, desc):
    for txt in (group or '', desc or ''):
        for k, rx in SUBS:
            if re.search(rx, txt, re.I): return k
    return None
OFFICIAL = None  # set below
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower().replace("'", '').replace('’', '')).strip('-')
OFFICIAL = {slug(json.loads(l)['chain']) for l in open(CH)}
def tc(s):
    s = s.lower(); s = re.sub(r"\b([a-z])", lambda m: m.group(1).upper(), s)
    s = re.sub(r"(?<=[A-Za-z])'S\b", "'s", s); s = re.sub(r"\bMc([a-z])", lambda m: 'Mc' + m.group(1).upper(), s)
    return re.sub(r'\b(Of|And|With|In|The|A|Or|To)\b', lambda m: m.group(1).lower(), s)
def nutr(f):
    n = {}
    for x in f.get('foodNutrients', []):
        no = str((x.get('nutrient') or {}).get('number', '')); k = NUM.get(no)
        if k and x.get('amount') is not None and k not in n: n[k] = round(float(x['amount']), 2)
    if 'kcal' not in n:
        for x in f.get('foodNutrients', []):
            nn = x.get('nutrient') or {}
            if nn.get('number') in ('957', '958'): n['kcal'] = round(float(x['amount']), 1); break
    return n
def portions(f):
    out = []
    for p in sorted(f.get('foodPortions', []), key=lambda p: p.get('sequenceNumber') or 0):
        g = p.get('gramWeight') or 0
        if not g: continue
        lab = p.get('portionDescription') or ''
        if not lab or lab.lower().startswith('quantity not'):
            unit = (p.get('measureUnit') or {}).get('name', '')
            amt = p.get('amount') or p.get('value') or 1
            mod = p.get('modifier') or ''
            if unit in ('undetermined', 'RACC'): unit = ''
            lab = ' '.join(str(x) for x in [('%g' % amt) if amt else '', unit, mod] if x and not str(x).isdigit()).strip() or ('%g g' % g)
        out.append([lab[:40], round(g, 1)])
    seen = set(); res = []
    for l, g in out:
        if l.lower() in seen: continue
        seen.add(l.lower()); res.append([l, g])
    return res[:8]
recs = []
sr = json.load(open(os.path.join(U, 'FoodData_Central_sr_legacy_food_json_2018-04.json')))['SRLegacyFoods']
fd = json.load(open([os.path.join(U, x) for x in os.listdir(U) if x.startswith('FoodData_Central_foundation') and x.endswith('.json')][0]))['FoundationFoods']
fn = json.load(open(os.path.join(U, 'surveyDownload.json')))['SurveyFoods']
chains_sr = {}
for f, src in [(x, 'SR Legacy') for x in sr] + [(x, 'Foundation') for x in fd]:
    if not f: continue
    g = (f.get('foodCategory') or {}).get('description', ''); desc = f['description']; n = nutr(f)
    if 'carbs' not in n or g in ('Baby Foods', 'American Indian/Alaska Native Foods'): continue
    keys = []; brand = 'USDA'
    if g == 'Fast Foods' or g == 'Restaurant Foods':
        m = re.match(r"^((?:Mc|Mr\. )?[A-Z][A-Z0-9 '’.&-]+?),\s*(.*)$", desc)
        if m and m.group(1) not in ('FAST FOODS', 'RESTAURANT', 'FAST FOOD'):
            chain = {'Kfc': 'KFC', 'T.g.i. Friday\'s': "TGI Friday's", 'Mcdonald\'s': "McDonald's"}.get(tc(m.group(1)), tc(m.group(1))); item = tc(m.group(2)); s_ = slug(chain)
            if s_ in OFFICIAL: continue  # prefer official chain data
            keys = ['rest', 'rest-' + s_]; brand = chain; name = item; chains_sr[s_] = chain
        else:
            name = tc(re.sub(r'^(Fast Foods|Fast foods|Restaurant|RESTAURANT),\s*', '', desc)); keys = ['rest', 'rest-other']; brand = 'Restaurant (USDA)'
    else:
        name = desc; k = GROUP.get(g) or sub_for(g, desc)
        keys = ['whole'] + ([k] if k and k != 'whole' else [])
    por = portions(f)
    recs.append({'id': 'fdc-%d' % f['fdcId'], 'name': name, 'brand': brand, 'group': g, 'keys': keys, 'n': n, 'portions': por, 'src': 'USDA ' + src, 'url': 'https://fdc.nal.usda.gov/food-details/%d/nutrients' % f['fdcId'], 'date': f.get('publicationDate', '')})
DISH = re.compile(r'pizza|burger|sandwich|taco|burrito|nacho|pasta|macaroni|soup|stew|casserole|stir|fried rice|rice mixed|chicken patt|egg rolls|dumpling|frozen meal|mexican|chinese|asian|meat mixed|poultry mixed|seafood mixed|bean, pea', re.I)
for f in fn:
    if not f: continue
    n = nutr(f); w = (f.get('wweiaFoodCategory') or {}).get('wweiaFoodCategoryDescription', '')
    if 'carbs' not in n or re.search(r'human milk|formula|baby', w, re.I): continue
    k = 'whole-dishes' if DISH.search(w) else sub_for(w, f['description']); keys = ['whole'] + ([k] if k else [])
    recs.append({'id': 'fdc-%d' % f['fdcId'], 'name': f['description'], 'brand': 'USDA (FNDDS)', 'group': w, 'keys': keys, 'n': n, 'portions': portions(f), 'src': 'USDA FNDDS 2021-2023', 'url': 'https://fdc.nal.usda.gov/food-details/%d/nutrients' % f['fdcId'], 'date': f.get('publicationDate', '')})
# official chains
for l in open(CH):
    r = json.loads(l); item = re.sub(r'\s*Contains:.*$', '', r['item']).strip(' •†*–-'); item = re.sub(r'\s+', ' ', item)
    if not item or len(item) < 3: continue
    m = re.match(r'([\d.]+)\s*g\b', r['serving'] or ''); grams = float(m.group(1)) if m else None
    per = (lambda v: None if v is None else round(v * 100 / grams, 2)) if grams else (lambda v: v)
    n = {'carbs': per(r['carbs']), 'fiber': per(r['fiber']), 'sugars': per(r['sugar']), 'fat': per(r['fat']), 'sat': per(r['sat']), 'sodiumMg': per(r['sodium']), 'protein': per(r['protein']), 'kcal': per(r['kcal'])}
    s_ = slug(r['chain'])
    recs.append({'id': 'r-%s-%s' % (s_, slug(item))[:70], 'name': item, 'brand': r['chain'], 'group': r.get('menu', ''), 'keys': ['rest', 'rest-' + s_], 'n': n,
                 'portions': [[('1 item (%s)' % r['serving']) if r['serving'] else '1 item', grams or 100]], 'perItem': not grams, 'src': '%s official nutrition' % r['chain'], 'url': r['source'], 'date': r['date'], 'liquid': bool(re.search(r'coffee|latte|tea|drink|lemonade|soda|shake|smoothie|chiller|refresher|juice|milk\b|cold brew|frozen', item, re.I))})
    chains_sr[s_] = r['chain']
seen = set(); out = []
for r in recs:
    if r['id'] in seen: continue
    seen.add(r['id']); out.append(r)
with open(OUT, 'w') as f:
    for r in out: f.write(json.dumps(r) + '\n')
from collections import Counter
print(len(out), Counter(k for r in out for k in r['keys'][1:2]).most_common(60))
json.dump(sorted(chains_sr.items(), key=lambda x: x[1]), open(OUT + '.chains.json', 'w'))
