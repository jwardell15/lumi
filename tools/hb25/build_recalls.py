# Builds data/recalls25/{r.json,u.json}: CPSC consumer-product recalls + openFDA food / drug / device enforcement (compact).
# Inputs in $HB25_WORK/raw: cpsc_all.json (fetch_cpsc2.py), fda/{food,drug,device}-enforcement-0001-of-0001.json (open.fda.gov/downloads, CC0).
import json,os,re,datetime
W=os.environ.get('HB25_WORK','/workspace/m25'); R=W+'/raw/'; O=W+'/out/recalls25/'; os.makedirs(O,exist_ok=True)
items=[]; 
def clip(s,n): s=re.sub(r'\s+',' ',str(s or '')).strip(); return s if len(s)<=n else s[:n-1].rstrip()+'…'
def upcs(text):
    out=set()
    for m in re.finditer(r'\b(?:UPC|GTIN|Bar\s?code)\b[^0-9]{0,18}((?:\d[\s\-]?){10,14})',text,re.I):
        d=re.sub(r'\D','',m.group(1))
        if len(d) in (12,13,14): out.add(d.lstrip('0').rjust(12,'0') if len(d)==14 else d)
    return sorted(out)[:6]
def fixurl(u):
    u=re.sub(r'^\s*h+ttps?:/*','https://',str(u or '').strip())
    return u if re.match(r'^https://(www\.)?cpsc\.gov/',u) else 'https://www.cpsc.gov/Recalls'
# CPSC
for x in json.load(open(R+'cpsc_all.json')):
    ps=x.get('Products') or []; names='; '.join(p.get('Name','') for p in ps)
    firm='; '.join([m.get('Name','') for m in (x.get('Manufacturers') or [])][:2]) or '; '.join([m.get('Name','') for m in (x.get('Importers') or [])][:1])
    haz=' '.join(h.get('Name','') for h in (x.get('Hazards') or []))
    u=[re.sub(r'\D','',z.get('UPC','')) for z in (x.get('ProductUPCs') or []) if isinstance(z,dict)]
    items.append(['c'+str(x['RecallID']),'c',x['RecallDate'][:10].replace('-',''),clip(x.get('Title'),150),clip(names,200),clip(firm,60),clip(haz,200),0,fixurl(x.get('URL','')),[z for z in u if len(z)>=8][:6],'', ])
# FDA
cut='20211101'; cutd='20251113'
for f,src in (('food','f'),('drug','d'),('device','v')):
    for x in json.load(open(R+'fda/%s-enforcement-0001-of-0001.json'%f))['results']:
        rd=x.get('report_date','')
        if rd<cut: continue
        cls={'Class I':1,'Class II':2,'Class III':3}.get(x.get('classification'),0)
        if src=='v' and cls!=1: continue
        desc=x.get('product_description','')+' '+x.get('code_info','')
        u=upcs(desc)
        if src=='d': u+=['N'+n for n in (x.get('openfda',{}).get('product_ndc') or [])[:8]]
        st='O' if x.get('status')=='Ongoing' else 'T'
        d=x.get('recall_initiation_date') or rd
        items.append([x['recall_number'],src,d,clip(x.get('product_description'),110),clip(x.get('product_description'),170),clip(x.get('recalling_firm'),60),clip(x.get('reason_for_recall'),150),cls,str(x.get('event_id','')),u,st])
items.sort(key=lambda a:a[2],reverse=True)
um={}
for i,a in enumerate(items):
    for u in a[9]: um.setdefault(u,[]).append(i)
asof=datetime.date.today().isoformat()
cnt={s:sum(1 for a in items if a[1]==s) for s in 'cfdv'}
json.dump({'asof':asof,'counts':cnt,'items':items},open(O+'r.json','w'),separators=(',',':'),ensure_ascii=False)
json.dump({'asof':asof,'u':um},open(O+'u.json','w'),separators=(',',':'))
print(cnt,len(items),os.path.getsize(O+'r.json'),len(um),os.path.getsize(O+'u.json'))
