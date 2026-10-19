#!/usr/bin/env python3
"""USDA FoodData Central Branded Foods (bulk CSV) -> extra US products not already in the OFF extract.
usage: extract_branded.py <branded csv dir> <off us.jsonl> <out jsonl>"""
import csv, json, sys, re
D, OFF, OUT = sys.argv[1:4]
csv.field_size_limit(10**9)
norm = lambda c: c.lstrip('0')
have = set()
for l in open(OFF): have.add(norm(json.loads(l)['code']))
# USDA branded category -> OFF-style tags understood by js/cats.js
CM = [(r'^cereal$|processed cereal', 'breakfast-cereals'), (r'granola|snack, energy|bars', 'bars,cereal-bars'), (r'chips, pretzels', 'salty-snacks,crisps'), (r'popcorn, peanuts', 'salty-snacks,popcorn'),
      (r'crackers', 'crackers-appetizers,crackers'), (r'^soda$', 'beverages,sodas'), (r'juice|nectar|fruit drinks', 'beverages,juices-and-nectars'), (r'^water$', 'beverages,waters'),
      (r'plant based milk', 'beverages,plant-based-milk-alternatives'), (r'tea|other drinks|energy, protein|powdered drinks|ready to drink|sport', 'beverages'), (r'^yogurt', 'yogurts'),
      (r'ketchup|sauce|salsa|dips|dressing|mayonnaise', 'sauces'), (r'pasta & pizza sauce', 'sauces,pasta-sauces'), (r'salad dressing', 'sauces,salad-dressings'), (r'breads & buns', 'breads'),
      (r'cheese', 'cheeses'), (r'^milk$', 'milks'), (r'^candy$|chewing gum', 'confectioneries,candies'), (r'chocolate', 'confectioneries,chocolates'), (r'cookies|biscuits', 'biscuits,cookies'),
      (r'ice cream|frozen yogurt', 'ice-creams'), (r'cakes|cupcakes', 'cakes'), (r'nut & seed butter', 'nut-butters'), (r'^nuts|seeds', 'nuts')]
def tags(cat):
    t = set()
    for rx, tg in CM:
        if re.search(rx, cat, re.I): t.update(tg.split(','))
    return ','.join('en:' + x for x in sorted(t))
tc = lambda s: s.title().replace("'S ", "'s ") if s and s.upper() == s else (s or '')
best = {}
for r in csv.DictReader(open(f'{D}/branded_food.csv', encoding='utf-8', errors='replace')):
    g = re.sub(r'\D', '', r['gtin_upc'] or '')
    if len(g) < 8 or r['discontinued_date'] or (r['market_country'] and r['market_country'] != 'United States'): continue
    g = g.lstrip('0'); g = g.zfill(12) if len(g) <= 12 else g.zfill(13)
    if len(g) > 13 or norm(g) in have: continue
    k = r['available_date'] or r['modified_date']
    if g not in best or k > best[g][0]:
        best[g] = (k, int(r['fdc_id']), r['brand_name'] or r['brand_owner'], (r['ingredients'] or '')[:300], r['serving_size'], r['serving_size_unit'], r['household_serving_fulltext'], r['branded_food_category'], r['package_weight'])
print('gtins', len(best), file=sys.stderr)
want = {v[1]: g for g, v in best.items()}
desc = {}
for r in csv.DictReader(open(f'{D}/food.csv', encoding='utf-8', errors='replace')):
    i = int(r['fdc_id'])
    if i in want: desc[i] = r['description']
NID = {'1005': 'carbohydrates', '2000': 'sugars', '1235': 'added-sugars', '1079': 'fiber', '1003': 'proteins', '1004': 'fat', '1258': 'saturated-fat', '1257': 'trans-fat', '1093': 'sodium', '1008': 'energy-kcal'}
nut = {}
with open(f'{D}/food_nutrient.csv', encoding='utf-8', errors='replace') as f:
    for r in csv.reader(f):
        if r[2] in NID:
            i = int(r[1]) if r[1].isdigit() else -1
            if i in want:
                try: v = float(r[3])
                except ValueError: continue
                nut.setdefault(i, {})[NID[r[2]]] = v
n = 0
with open(OUT, 'w') as o:
    for g, (k, i, brand, ing, sq, su, hh, cat, pw) in best.items():
        m = nut.get(i, {}); name = desc.get(i, '').strip()
        if not name or m.get('carbohydrates') is None or m['carbohydrates'] > 100: continue
        if 'sodium' in m: m['sodium'] = m['sodium'] / 1000  # mg -> g, like OFF
        try: sq = float(sq)
        except ValueError: sq = None
        rec = {'code': g, 'name': tc(name)[:120], 'brand': tc(brand)[:60], 'qty': pw[:30], 'img': '', 'servQ': sq, 'serv': (hh or (f'{sq:g} {su}' if sq else ''))[:40], 'nova': None, 'add': '',
               'ing': ing.lower(), 'cat': cat[:50], 'cats': tags(cat), 'cty': 'en:united-states', 'n': {kk: m.get(kk) for kk in ['carbohydrates', 'sugars', 'added-sugars', 'fiber', 'proteins', 'fat', 'saturated-fat', 'trans-fat', 'sodium', 'energy-kcal', 'polyols']},
               'src': 'usda-branded', 'fdc': i, 'date': k}
        o.write(json.dumps(rec, separators=(',', ':')) + '\n'); n += 1
print('out', n, file=sys.stderr)
