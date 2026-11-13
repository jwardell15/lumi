import os
import pandas as pd, json, re, collections, datetime
R=(os.environ.get('HB25_WORK','/workspace/m25')+'/raw/'); O=(os.environ.get('HB25_WORK','/workspace/m25')+'/out/hb25/')
def norm(s):
    s=str(s).lower().replace('&',' and ').replace('’',"'")
    return re.sub(r"[^a-z0-9]+",' ',s).strip()
# ---- CSCP: one record per reported product ----
d=pd.read_csv(R+'cscp.csv',dtype=str,encoding='cp1252',encoding_errors='replace').fillna('')
d=d[d.ChemicalDateRemoved==''] 
recs={}
for r in d.itertuples():
    k=r.CDPHId
    x=recs.setdefault(k,{'n':r.ProductName.strip(),'b':r.BrandName.strip(),'co':r.CompanyName.strip(),'cat':r.PrimaryCategory.strip(),'sub':r.SubCategory.strip(),'ch':[],'disc':r.DiscontinuedDate})
    x['ch'].append([r.ChemicalName.strip(),r.CasNumber.strip(),r.InitialDateReported,r.MostRecentDateReported])
out=list(recs.values())
json.dump(out,open('/workspace/m25/build/cscp_products.json','w'),separators=(',',':'))
print('cscp products',len(out),'rows',len(d))
# ---- Minnesota PRISM: brand-level index ----
p=pd.read_json(R+'prism.jsonl',lines=True)
p['bn']=p.BrandName.fillna('').map(norm)
g=p.groupby(['bn'])
brands=[]
for bn,gg in g:
    if not bn: continue
    names=gg.BrandName.value_counts().index[0]
    cos=gg.AccountableCompanyName.value_counts().index[:2].tolist()
    pf=gg.PFASName.value_counts().head(3).index.tolist()
    comp=gg.ComponentName.fillna('').map(lambda s: re.sub(r'-[A-Z0-9]{4,}-\d+$','',s)[:60]).value_counts().head(3).index.tolist()
    fn=gg.PFASFunction.fillna('').value_counts().head(2).index.tolist()
    models=gg.ProductModel.nunique()
    pub=gg.PublishedOn.max()[:10]
    brands.append([bn,names,cos,int(models),int(len(gg)),pf,comp,fn,pub,gg.DisclosureId.iloc[0]])
brands.sort(key=lambda x:-x[4])
json.dump({'built':datetime.date.today().isoformat(),'rows':int(len(p)),'brands':brands,'companies':int(p.AccountableCompanyName.nunique()),'asof':p.PublishedOn.max()[:10]},open(O+'pfasmn.json','w'),separators=(',',':'),ensure_ascii=False)
print('mn brands',len(brands))
# ---- Safer Choice ----
sc=json.load(open(R+'safer_choice.json'))
by={}
for x in sc:
    k=(x['Id'])
    e=by.setdefault(k,{'id':x['Id'],'n':x['Name'],'p':x['Partner'],'s':set(),'t':set(),'ff':False,'out':False,'since':x['PartnerSince'],'u':set()})
    e['s'].add(x['sector']); e['t'].add(x['sectorType'])
    if x.get('fragrance'): e['ff']=True
    if x.get('releases'): e['out']=True
    if x['UPCs'] and x['UPCs']!='None':
        for u in re.split(r'[,;\s]+',x['UPCs']):
            u=re.sub(r'\D','',u)
            if 8<=len(u)<=14: e['u'].add(u)
res=[]
for e in by.values():
    res.append({'id':e['id'],'n':e['n'],'p':e['p'],'s':sorted(e['s']),'t':sorted(e['t']),'ff':e['ff'],'out':e['out'],'since':e['since'],'u':sorted(e['u'])})
json.dump({'built':datetime.date.today().isoformat(),'items':res},open(O+'safer.json','w'),separators=(',',':'),ensure_ascii=False)
print('safer products',len(res),'with upc',sum(1 for e in res if e['u']), 'fragfree',sum(1 for e in res if e['ff']))
print([ (x['Name'],x['fragrance'],x['releases']) for x in sc[:3]])
