# Full OFF CSV pass: images, ingredients, dates, allergen tags, nutrients for codes in our OFF extract + USDA-only GTINs.
import csv,gzip,json
csv.field_size_limit(10**9)
nz=lambda c:c.lstrip('0')
usda=set(nz(json.loads(l)['code']) for l in open('/workspace/m63/usda63.jsonl'))
want=usda
NK=['carbohydrates','sugars','added-sugars','fiber','proteins','fat','saturated-fat','trans-fat','sodium','energy-kcal','polyols']
def num(v):
    try: x=float(v); return x if 0<=x<10000 else None
    except: return None
out={}
with gzip.open('/workspace/offdata/products.csv.gz','rt',encoding='utf-8',errors='replace',newline='') as f:
  for r in csv.DictReader(f,delimiter='\t',quoting=csv.QUOTE_NONE):
    c=(r.get('code') or '').strip()
    if not c.isdigit(): continue
    k=nz(c)
    if k not in want: continue
    fi=r.get('image_url') or ''; oi=r.get('image_ingredients_url') or r.get('image_nutrition_url') or ''
    rec={'c':c,'img':fi or oi,'ik':'front' if fi else ('other' if oi else ''),'stores':(r.get('stores') or '')[:120],'bt':(r.get('brands_tags') or '')[:200],'cats':r.get('categories_tags') or '','cty':r.get('countries_tags') or '','imgs':r.get('image_small_url') or '','imgi':r.get('image_ingredients_url') or '','imgn':r.get('image_nutrition_url') or '',
         'mod':(r.get('last_modified_datetime') or '')[:10],'ing':(r.get('ingredients_text') or '')[:1500],'name':(r.get('product_name') or '')[:120],
         'al':r.get('allergens_tags') or '','tr':r.get('traces_tags') or '','an':r.get('ingredients_analysis_tags') or '','lb':r.get('labels_tags') or '','add':r.get('additives_tags') or ''}
    if k in usda: rec['n']={x:num(r.get(x+'_100g')) for x in NK}
    old=out.get(k)
    if not old or (rec['img'] and not old['img']) or rec['mod']>old['mod']: out[k]=rec
json.dump(out,open('/workspace/m91/offx.json','w'))
print('matched',len(out),'usda-only matched',sum(1 for k in out if k in usda),'with img',sum(1 for k,v in out.items() if k in usda and v['img']),'with ing',sum(1 for k,v in out.items() if k in usda and v['ing']))
