# Lumi 25.2: build static water-quality data from EPA SDWIS (ECHO SDWA bulk download) + UCMR 5 (EPA).
import pandas as pd, csv, json, os, re, zipfile, collections, datetime, sys
R=(os.environ.get('HB25_WORK','/workspace/m25')+'/raw/'); O=(os.environ.get('HB25_WORK','/workspace/m25')+'/out/water25/')
os.makedirs(O,exist_ok=True)
ps=pd.read_csv(R+'sdwa/SDWA_PUB_WATER_SYSTEMS.csv',dtype=str,usecols=['PWSID','PWS_NAME','PWS_ACTIVITY_CODE','PWS_TYPE_CODE','GW_SW_CODE','POPULATION_SERVED_COUNT','PRIMARY_SOURCE_CODE','CITY_NAME','ZIP_CODE','STATE_CODE','IS_WHOLESALER_IND','OWNER_TYPE_CODE'])
ps=ps[(ps.PWS_ACTIVITY_CODE=='A')&(ps.PWS_TYPE_CODE=='CWS')].copy().fillna('')
ps['pop']=pd.to_numeric(ps.POPULATION_SERVED_COUNT,errors='coerce').fillna(0).astype(int)
print('active CWS',len(ps))
ids=set(ps.PWSID)
sysd={}
for r in ps.itertuples():
    sysd[r.PWSID]={'n':r.PWS_NAME.title() if r.PWS_NAME else '', 'p':int(r.pop),'s':(r.PRIMARY_SOURCE_CODE or r.GW_SW_CODE or ''),'st':(r.STATE_CODE or r.PWSID[:2]),'ct':[], 'co':[], 'oz':(r.ZIP_CODE or '')[:5]}
# geographic areas
ga=pd.read_csv(R+'sdwa/SDWA_GEOGRAPHIC_AREAS.csv',dtype=str,usecols=['PWSID','AREA_TYPE_CODE','STATE_SERVED','ZIP_CODE_SERVED','CITY_SERVED','COUNTY_SERVED'])
ga=ga[ga.PWSID.isin(ids)]
zips=collections.defaultdict(set)
for r in ga.itertuples():
    d=sysd[r.PWSID]
    if isinstance(r.CITY_SERVED,str) and r.CITY_SERVED.strip(): d['ct'].append(r.CITY_SERVED.strip().title())
    if isinstance(r.COUNTY_SERVED,str) and r.COUNTY_SERVED.strip(): d['co'].append(r.COUNTY_SERVED.strip().title())
    if isinstance(r.ZIP_CODE_SERVED,str) and re.fullmatch(r'\d{5}',r.ZIP_CODE_SERVED.strip()): zips[r.PWSID].add(r.ZIP_CODE_SERVED.strip())
# UCMR5 zips
uz=pd.read_csv(R+'ucmr/UCMR5_ZIPCodes.txt',sep='\t',dtype=str)
for r in uz.itertuples():
    z=str(r.ZIPCODE).strip()[:5]
    if re.fullmatch(r'\d{5}',z): zips[r.PWSID].add(z)
for k,d in sysd.items():
    d['ct']=sorted(set(d['ct']))[:8]; d['co']=sorted(set(d['co']))[:4]
print('systems with zips',sum(1 for k in sysd if k in zips))
# code values
cv=pd.read_csv(R+'sdwa/SDWA_REF_CODE_VALUES.csv',dtype=str)
cont=dict(cv[cv.VALUE_TYPE=='CONTAMINANT_CODE'][['VALUE_CODE','VALUE_DESCRIPTION']].values)
vcode=dict(cv[cv.VALUE_TYPE=='VIOLATION_CODE'][['VALUE_CODE','VALUE_DESCRIPTION']].values)
# violations (last 10 yrs), dedupe by violation id
cut=datetime.datetime(2016,1,1)
vio=collections.defaultdict(dict)
cols=['PWSID','VIOLATION_ID','NON_COMPL_PER_BEGIN_DATE','NON_COMPL_PER_END_DATE','VIOLATION_CODE','VIOLATION_CATEGORY_CODE','IS_HEALTH_BASED_IND','CONTAMINANT_CODE','VIOL_MEASURE','UNIT_OF_MEASURE','FEDERAL_MCL','VIOLATION_STATUS']
zf=zipfile.ZipFile(R+'sdwa.zip')
nrow=0
with zf.open('SDWA_VIOLATIONS_ENFORCEMENT.csv') as f:
    for ch in pd.read_csv(f,dtype=str,usecols=cols,chunksize=500000):
        nrow+=len(ch)
        ch=ch[ch.PWSID.isin(ids)]
        b=pd.to_datetime(ch.NON_COMPL_PER_BEGIN_DATE,format='%m/%d/%Y',errors='coerce')
        ch=ch[b>=cut]
        for r in ch.itertuples():
            vio[r.PWSID][r.VIOLATION_ID]=[r.VIOLATION_CATEGORY_CODE,1 if r.IS_HEALTH_BASED_IND=='Y' else 0,r.CONTAMINANT_CODE,r.NON_COMPL_PER_BEGIN_DATE,r.NON_COMPL_PER_END_DATE if isinstance(r.NON_COMPL_PER_END_DATE,str) else '',r.VIOLATION_STATUS,r.VIOLATION_CODE,r.VIOL_MEASURE if isinstance(r.VIOL_MEASURE,str) else '',r.UNIT_OF_MEASURE if isinstance(r.UNIT_OF_MEASURE,str) else '',r.FEDERAL_MCL if isinstance(r.FEDERAL_MCL,str) else '']
        print('vio rows',nrow,len(vio),flush=True)
# LCR samples (90th percentile lead / copper)
lcr={}
with zf.open('SDWA_LCR_SAMPLES.csv') as f:
    for ch in pd.read_csv(f,dtype=str,usecols=['PWSID','SAMPLING_END_DATE','CONTAMINANT_CODE','RESULT_SIGN_CODE','SAMPLE_MEASURE','UNIT_OF_MEASURE'],chunksize=500000):
        ch=ch[ch.PWSID.isin(ids)&ch.CONTAMINANT_CODE.isin(['PB90','CU90'])]
        for r in ch.itertuples():
            try: d=datetime.datetime.strptime(r.SAMPLING_END_DATE,'%m/%d/%Y')
            except Exception: continue
            k=(r.PWSID,r.CONTAMINANT_CODE)
            if k not in lcr or d>lcr[k][0]: lcr[k]=(d,r.SAMPLE_MEASURE,r.UNIT_OF_MEASURE,r.RESULT_SIGN_CODE)
print('lcr',len(lcr))
# UCMR5 PFAS
PF=['11Cl-PF3OUdS','4:2 FTS','6:2 FTS','8:2 FTS','9Cl-PF3ONS','ADONA','HFPO-DA','NEtFOSAA','NFDHA','NMeFOSAA','PFBA','PFBS','PFDA','PFDoA','PFEESA','PFHpA','PFHpS','PFHxA','PFHxS','PFMBA','PFMPA','PFNA','PFOA','PFOS','PFPeA','PFPeS','PFTA','PFTrDA','PFUnA']
uc=collections.defaultdict(lambda: collections.defaultdict(lambda:[0,0,0.0,'']))
nuc=0
with open(R+'ucmr/UCMR5_All.txt',encoding='latin-1',newline='') as f:
    for ch in pd.read_csv(f,sep='\t',dtype=str,usecols=['PWSID','CollectionDate','Contaminant','AnalyticalResultsSign','AnalyticalResultValue','Units'],chunksize=500000,encoding_errors='replace'):
        ch=ch[ch.Contaminant.isin(PF)&ch.PWSID.isin(ids)]
        for r in ch.itertuples():
            a=uc[r.PWSID][r.Contaminant]; a[0]+=1
            try: dt=datetime.datetime.strptime(r.CollectionDate,'%m/%d/%Y').strftime('%Y-%m-%d')
            except Exception: dt=''
            if r.AnalyticalResultsSign=='=' and isinstance(r.AnalyticalResultValue,str):
                try: v=float(r.AnalyticalResultValue)
                except Exception: continue
                a[1]+=1
                if v>a[2]: a[2]=v
                if dt>a[3]: a[3]=dt
        nuc+=len(ch)
print('ucmr rows kept',nuc,'systems',len(uc))
def clean(x):
    if isinstance(x,float) and x!=x: return ''
    if isinstance(x,dict): return {k:clean(v) for k,v in x.items()}
    if isinstance(x,(list,tuple)): return [clean(v) for v in x]
    return x
# write per-state shards
by=collections.defaultdict(dict)
for pid,d in sysd.items():
    o={'n':d['n'],'p':d['p'],'s':d['s'],'ct':d['ct'],'co':d['co']}
    z=sorted(zips.get(pid,[]))
    if z: o['z']=z[:40]
    v=vio.get(pid,{})
    hv=[[x[2],x[3],x[4],x[0],x[5],x[7],x[8],x[9]] for x in v.values() if x[1]==1]
    hv.sort(key=lambda x: datetime.datetime.strptime(x[1],'%m/%d/%Y') if x[1] else datetime.datetime(1900,1,1),reverse=True)
    o['hv']=hv[:30]; o['nhv']=len(hv)
    cnt=collections.Counter(x[0] for x in v.values() if x[1]==0); o['oth']=dict(cnt); 
    for code,key in (('PB90','pb'),('CU90','cu')):
        if (pid,code) in lcr:
            dd,m,u,sg=lcr[(pid,code)]; o[key]=[dd.strftime('%Y-%m-%d'),m,u,sg or '']
    if pid in uc:
        o['pfn']=max(x[0] for x in uc[pid].values()); o['pf']={k:[x[0],x[1],round(x[2],4),x[3]] for k,x in uc[pid].items() if x[1]>0}
    by[d['st'] if d['st'] else pid[:2]][pid]=clean(o)
tot=0
for st,m in by.items():
    s=json.dumps(m,separators=(',',':'),ensure_ascii=False); tot+=len(s)
    open(O+'s-%s.json'%st,'w').write(s); assert 'NaN' not in s
print('states',len(by),'bytes',tot)
# zip -> pwsid shards (first 3 digits)
zs=collections.defaultdict(dict)
for pid,zz in zips.items():
    if pid not in sysd: continue
    for z in zz: zs[z[:3]].setdefault(z,{'s':[],'o':[]})['s'].append(sysd[pid]['st']+'/'+pid)
for pid,d in sysd.items():
    z=d['oz']
    if re.fullmatch(r'\d{5}',z) and z not in zips.get(pid,()): zs[z[:3]].setdefault(z,{'s':[],'o':[]})['o'].append(sysd[pid]['st']+'/'+pid)
for k,m in zs.items():
    for z in m:
        m[z]['s'].sort(key=lambda p: -sysd[p.split('/')[1]]['p']); m[z]['o'].sort(key=lambda p: -sysd[p.split('/')[1]]['p'])
        if not m[z]['o']: del m[z]['o']
        if not m[z]['s']: del m[z]['s']
    open(O+'z-%s.json'%k,'w').write(json.dumps(m,separators=(',',':')))
json.dump({'contaminants':{k:v for k,v in cont.items()},'violCodes':vcode},open(O+'codes.json','w'),separators=(',',':'))
json.dump({'built':datetime.date.today().isoformat(),'systems':len(sysd),'zipShards':len(zs),'states':sorted(by)},open(O+'info.json','w'))
print('done')
