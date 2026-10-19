import csv,gzip,json,sys
csv.field_size_limit(10**9)
codes=set(json.loads(l)['code'] for l in open('us.jsonl'))
out={}
with gzip.open('products.csv.gz','rt',encoding='utf-8',errors='replace',newline='') as f:
  for r in csv.DictReader(f,delimiter='\t',quoting=csv.QUOTE_NONE):
    c=(r.get('code') or '').strip()
    if c not in codes: continue
    lab=r.get('labels_tags') or ''; fv=r.get('fruits-vegetables-legumes_100g') or ''
    try: fv=float(fv)
    except: fv=None
    out[c]=[1 if 'en:organic' in lab or 'usda-organic' in lab else 0, fv]
json.dump(out,open('side.json','w'))
print(len(out),sum(v[0] for v in out.values()),sum(v[1] is not None for v in out.values()))
