import csv,gzip,json
csv.field_size_limit(10**9)
codes=set(json.loads(l)['code'] for l in open('us.jsonl'))
out={}
with gzip.open('products.csv.gz','rt',encoding='utf-8',errors='replace',newline='') as f:
  for r in csv.DictReader(f,delimiter='\t',quoting=csv.QUOTE_NONE):
    c=(r.get('code') or '').strip()
    if c not in codes: continue
    out[c]=[r.get('allergens_tags') or '', r.get('traces_tags') or '', r.get('ingredients_analysis_tags') or '', r.get('labels_tags') or '']
json.dump(out,open('side2.json','w'))
print(len(out), sum(1 for v in out.values() if v[0]), sum(1 for v in out.values() if v[2]))
