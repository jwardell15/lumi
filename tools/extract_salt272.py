# Lumi 27.2: for OFF products whose record has no sodium, read salt_100g / sodium_100g straight from the OFF export (salt g -> sodium mg = salt/2.5*1000).
# usage: python3 tools/extract_salt272.py /workspace/offdata/products.csv.gz need.json out.json
import csv, gzip, json, sys
csv.field_size_limit(10**9)
need = set(json.load(open(sys.argv[2]))); out = {}
def num(v):
    try:
        x = float(v); return x if x == x and 0 <= x < 1000 else None
    except: return None
with gzip.open(sys.argv[1], 'rt', encoding='utf-8', errors='replace', newline='') as f:
    for r in csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE):
        c = (r.get('code') or '').strip()
        if c not in need: continue
        so = num(r.get('sodium_100g') or ''); sa = num(r.get('salt_100g') or '')
        if so is not None: out[c] = [round(so * 1000, 1), 'sodium']
        elif sa is not None: out[c] = [round(sa / 2.5 * 1000, 1), 'salt']
json.dump(out, open(sys.argv[3], 'w')); print(len(out))
