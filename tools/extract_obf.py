# Extract US/English items from the Open Beauty Facts bulk export (static.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz).
# usage: python3 tools/extract_obf.py obf.csv.gz obf-us.json
import gzip, csv, json, re, sys
csv.field_size_limit(10**9)
NONEN = re.compile(r"\b(eau|de la|crème|pour|avec|sans|shampooing|gel douche|lait|savon|visage|cheveux|corps|crema|champú|jabón|für|und|mit|haar|pelle|capelli)\b", re.I)
out = []
for x in csv.DictReader(gzip.open(sys.argv[1], 'rt', errors='replace', newline=''), delimiter='\t', quoting=csv.QUOTE_NONE):
    code = (x.get('code') or '').strip(); name = (x.get('product_name') or '').strip(); cty = x.get('countries_tags') or ''
    if not code.isdigit() or not name: continue
    upc = len(code) == 12 or (len(code) == 13 and code[0] == '0')
    if not ('en:united-states' in cty or (upc and (not cty or 'en:canada' in cty))): continue
    if re.search(r"[^\x20-\x7e’®™]", name) or NONEN.search(name): continue
    out.append({'code': code, 'name': name[:120], 'brand': (x.get('brands') or '').split(',')[0][:60], 'qty': (x.get('quantity') or '')[:30], 'img': x.get('image_url') or x.get('image_small_url') or '',
                'ing': (x.get('ingredients_text') or '').strip()[:1500], 'cats': x.get('categories_tags') or '', 'labels': x.get('labels_tags') or '', 'scans': float(x.get('unique_scans_n') or 0)})
json.dump(out, open(sys.argv[2], 'w')); print(len(out))
