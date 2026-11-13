# CPSC recalls, small windows with backoff, polite pacing (no key needed). usage: python3 fetch_cpsc2.py [start YYYY-MM-DD]
import urllib.request,json,time,datetime,os,sys
UA="Mozilla/5.0 (compatible; LumiBot/1.0 +https://jwardell15.github.io/lumi/)"
OUT=os.path.join(os.environ.get('HB25_WORK','/workspace/m25'),'raw','cpsc_all.json')
allr={}
def get(s,e):
    u="https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=%s&RecallDateEnd=%s"%(s,e)
    for t in range(6):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=60))
            if len(d)==1 and d[0].get('RecallID')==0: raise Exception('api error')
            return d
        except Exception as ex:
            time.sleep(5*(t+1))
    return None
d0=datetime.date.fromisoformat(sys.argv[1] if len(sys.argv)>1 else '2021-11-01'); end=datetime.date.today()+datetime.timedelta(days=1)
fails=[]
while d0<end:
    d1=min(d0+datetime.timedelta(days=29),end)
    r=get(d0.isoformat(),d1.isoformat())
    if r is None: fails.append((str(d0),str(d1))); print('FAIL',d0,flush=True)
    else:
        for x in r: allr[x['RecallID']]=x
        print(d0,len(r),len(allr),flush=True)
    d0=d1+datetime.timedelta(days=1); time.sleep(2)
json.dump(list(allr.values()),open(OUT,'w')); json.dump(fails,open(OUT+'.fails','w')); print('DONE',len(allr),fails)
