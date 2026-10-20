import csv, gzip, json, sys, re, collections
sys.path.insert(0,'/workspace/diabetes-scanner/tools')
NONEN=re.compile(open('/workspace/diabetes-scanner/tools/extract.py').read().split('NONEN=re.compile(r"')[1].split('",re.I)')[0],re.I)
OKW={'biscuits','biscuit','creme','nature','carne','natur','integral','pan','salsa de','noir','blanc','dulce','con','la','del'}
def english(name):
    if re.search(r"[^\x20-\x7e’®™]", name): return False
    hits=[(w if isinstance(w,str) else w[0]).lower() for w in NONEN.findall(name)]
    return all(h in OKW for h in hits) and len(hits)<=1  # v9.1: allow common US-English loanwords (Creme, Biscuits, Carne Asada, Nature Valley, Dulce de leche…)
def upce(c):
    if len(c)!=8 or c[0] not in '01': return None
    d=c; x=d[6]
    if x in '012': m=d[1]+d[2]+x+'00'; p='00'+d[3]+d[4]+d[5]
    elif x=='3': m=d[1]+d[2]+d[3]+'00'; p='000'+d[4]+d[5]
    elif x=='4': m=d[1]+d[2]+d[3]+d[4]+'0'; p='0000'+d[5]
    else: m=d[1:6]; p='0000'+x
    a=d[0]+m+p
    s=sum(int(a[i])*(3 if i%2==0 else 1) for i in range(11)); ck=(10-s%10)%10
    return a+str(ck) if str(ck)==d[7] else None
csv.field_size_limit(10**9)
F=lambda r,k: (r.get(k) or '').strip()
def num(v):
    try: x=float(v); return x if x==x and 0<=x<10000 else None
    except: return None
st=collections.Counter(); out=open('/workspace/m91/off91.jsonl','w')
NK=['carbohydrates','sugars','added-sugars','fiber','proteins','fat','saturated-fat','trans-fat','sodium','energy-kcal','polyols']
with gzip.open('/workspace/offdata/products.csv.gz','rt',encoding='utf-8',errors='replace',newline='') as f:
    for r in csv.DictReader(f,delimiter='\t',quoting=csv.QUOTE_NONE):
        cty=F(r,'countries_tags'); us='en:united-states' in cty; ca='en:canada' in cty
        if not (us or ca): continue
        code=F(r,'code')
        if not code.isdigit() or len(code)<8 or len(code)>14: st['badcode']+=1; continue
        g=code.lstrip('0'); upc=len(g)<=12 and len(code) in (12,13,14)  # UPC-A (possibly zero-padded to EAN-13/GTIN-14)
        if not us:
            if not upc: st['ca-nonUPC']+=1; continue
            st['ca-upc-candidates']+=1
        elif len(code)==8:
            us_only=all(x in ('en:united-states','en:puerto-rico') for x in cty.split(',') if x)
            if not (us_only and upce(code)): st['us-badlen']+=1; continue
            st['upce']+=1
        elif not (upc or len(code)==13): st['us-badlen']+=1; continue
        name=F(r,'product_name') or F(r,'product_name_en')
        if not name: st['noname']+=1; continue
        if not english(name): st['nonenglish']+=1; continue
        n={k:num(F(r,k+'_100g')) for k in NK}
        c=n['carbohydrates']
        if c is None or c>100: st['nocarbs']+=1; continue
        if n['energy-kcal'] is not None and n['energy-kcal']>950: st['badkcal']+=1; continue
        img=F(r,'image_url'); ik='front'
        if not img:
            img=F(r,'image_ingredients_url') or F(r,'image_nutrition_url'); ik='other' if img else ''
        lab=F(r,'labels_tags'); fv=num(F(r,'fruits-vegetables-legumes_100g'))
        rec={'code':code,'name':name[:120],'brand':(F(r,'brands_en') or F(r,'brands') or F(r,'brand_owner')).split(',')[0].strip()[:60],'bt':F(r,'brands_tags')[:200],'qty':F(r,'quantity')[:30],
             'img':img,'ik':ik,'servQ':num(F(r,'serving_quantity')),'serv':F(r,'serving_size')[:40],'nova':num(F(r,'nova_group')),'add':F(r,'additives_tags'),'ing':F(r,'ingredients_text')[:1500],
             'cat':F(r,'main_category_en')[:50],'cats':F(r,'categories_tags'),'cty':cty,'stores':F(r,'stores')[:120],'mod':F(r,'last_modified_t'),
             'org':1 if ('en:organic' in lab or 'usda-organic' in lab) else 0,'fv':fv,'al':F(r,'allergens_tags'),'tr':F(r,'traces_tags'),'an':F(r,'ingredients_analysis_tags'),'lb':lab[:400],
             'scans':num(F(r,'unique_scans_n')) or 0,'ca':0 if us else 1,'ue':upce(code) if len(code)==8 else None,'n':n}
        st['kept-us' if us else 'kept-ca-upc']+=1; st['img-'+(ik or 'none')]+=1
        out.write(json.dumps(rec,separators=(',',':'))+'\n')
print(dict(st))
