# Builds data/otc25/{index.json,u.json}: marketed OTC human drugs from openFDA NDC (CC0): name, labeler, form, actives, UPCs, NDCs, DailyMed set id.
import json,os,re,datetime
W=os.environ.get('HB25_WORK','/workspace/m25'); R=W+'/raw/fda/drug-ndc-0001-of-0001.json'; O=W+'/out/otc25/'; os.makedirs(O,exist_ok=True)
d=json.load(open(R)); today=datetime.date.today().strftime('%Y%m%d')
by={}
def t(s,n): s=re.sub(r'\s+',' ',str(s or '')).strip(); return s[:n]
for x in d['results']:
    if x.get('product_type')!='HUMAN OTC DRUG' or not x.get('finished'): continue
    e=x.get('marketing_end_date') or ''
    if e and e<today: continue
    of=x.get('openfda',{}); sid=(of.get('spl_set_id') or [''])[0]
    if not sid: continue
    acts='; '.join((a.get('name','').title()+(' '+a.get('strength','') if a.get('strength') else '')) for a in (x.get('active_ingredients') or [])[:6])
    r=by.setdefault(sid,{'b':t(x.get('brand_name') or x.get('generic_name'),80),'g':t(x.get('generic_name'),80),'l':t(x.get('labeler_name'),50),'f':t(x.get('dosage_form'),30).title(),'a':t(acts,160),'u':set(),'n':[]})
    r['u'].update(re.sub(r'\D','',u) for u in (of.get('upc') or []) if len(re.sub(r'\D','',u))>=8); r['n'].append(x['product_ndc'])
def L(x):
    m=re.search(r'[a-z0-9]',x.lower()); c=m.group(0) if m else '0'
    return c if c.isalpha() else '0'
sh={}; um={}
for sid,r in sorted(by.items(),key=lambda kv:kv[1]['b'].lower()):
    rec=[sid,r['b'],r['g'],r['l'],r['f'],sorted(r['u'])[:4],r['n'][:3]]
    for k in {L(r['b']),L(r['g'])}: sh.setdefault(k,[]).append(rec)
    for u in r['u']: um[u.lstrip('0')]=[L(r['b']),sid]
os.makedirs(O,exist_ok=True)
for f in os.listdir(O): os.remove(O+f)
tot=0
for k,v in sh.items():
    open(O+'n-%s.json'%k,'w').write(json.dumps(v,separators=(',',':'),ensure_ascii=False)); tot+=os.path.getsize(O+'n-%s.json'%k)
json.dump({'asof':datetime.date.today().isoformat(),'ndcAsof':d['meta']['last_updated'],'shards':sorted(sh),'count':len(by),'u':um},open(O+'index.json','w'),separators=(',',':'))
print(len(by),len(um),'shard bytes',tot,'index',os.path.getsize(O+'index.json'))
