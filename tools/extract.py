import csv, gzip, json, sys, heapq, re
NONEN=re.compile(r"\b(le|la|les|du|des|de|et|au|aux|avec|sans|nature|fromage|lait|sucre|sans|chocolat|biscuits?|gateau|confiture|jus|boisson|yaourt|leche|con|sin|del|azucar|galletas|queso|und|mit|ohne|vanille|fraise|framboise|eau|pain|beurre|creme|pâte|natur|saveur|parfum|sabor|naranja|fresa|thé|blanc|noir|petit|tradition|recette|aceite|harina|arroz|frijoles|salsa de|agua|bebida|refresco|zumo|dulce|pollo|carne|huevo|pan|integral|tostadas|avena)\b",re.I)
def english(name):
    if re.search(r"[^\x20-\x7e’®™]", name): return False
    return len(NONEN.findall(name)) == 0
def us_ok(code, cty):
    c=[x for x in cty.split(',') if x]
    us_only = c and all(x in ('en:united-states','en:puerto-rico') for x in c)
    upc = (len(code)==12) or (len(code)==13 and code[0] in '01')
    return upc or (us_only and len(code)!=8)
csv.field_size_limit(10**9)
F=lambda r,k: (r.get(k) or '').strip()
def num(v):
    try:
        x=float(v); return x if x==x and 0<=x<10000 else None
    except: return None
heap=[]; N=70000; n=0; kept=0
with gzip.open('products.csv.gz','rt',encoding='utf-8',errors='replace',newline='') as f:
    rd=csv.DictReader(f,delimiter='\t',quoting=csv.QUOTE_NONE)
    for r in rd:
        n+=1
        if 'en:united-states' not in F(r,'countries_tags'): continue
        name=F(r,'product_name'); code=F(r,'code')
        if not name or not code.isdigit() or len(code)<8: continue
        if not english(name) or not us_ok(code, F(r,'countries_tags')): continue
        c=num(F(r,'carbohydrates_100g'))
        if c is None or c>100: continue
        scans=num(F(r,'unique_scans_n')) or 0
        comp=num(F(r,'completeness')) or 0
        pri=scans*10+comp*5+(1 if F(r,'image_small_url') else 0)
        rec={'code':code,'name':name[:120],'brand':(F(r,'brands_en') or F(r,'brand_owner')).split(',')[0][:60],'qty':F(r,'quantity')[:30],
         'img':F(r,'image_small_url'),'servQ':num(F(r,'serving_quantity')),'serv':F(r,'serving_size')[:40],
         'nova':num(F(r,'nova_group')),'add':F(r,'additives_tags'),'ing':F(r,'ingredients_text')[:500],
         'cat':F(r,'main_category_en')[:50],'cats':F(r,'categories_tags')[-300:],'cty':F(r,'countries_tags'),
         'n':{k:num(F(r,k+'_100g')) for k in ['carbohydrates','sugars','added-sugars','fiber','proteins','fat','saturated-fat','trans-fat','sodium','energy-kcal','polyols']}}
        kept+=1
        item=(pri,n,rec)
        if len(heap)<N: heapq.heappush(heap,item)
        elif pri>heap[0][0]: heapq.heapreplace(heap,item)
        if n%500000==0: print(n,kept,file=sys.stderr,flush=True)
heap.sort(key=lambda x:-x[0])
with open('us.jsonl','w') as o:
    for _,_,r in heap: o.write(json.dumps(r,separators=(',',':'))+'\n')
print('rows',n,'us',kept,'out',len(heap),file=sys.stderr)
