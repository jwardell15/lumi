import urllib.request,json,time,sys
UA="Mozilla/5.0 (compatible; LumiBot/1.0 +https://jwardell15.github.io/lumi/)"
sel="AccountableCompanyName,BrandName,ProductModel,ComponentName,PFASName,PFASId,PFASFunction,PFASRange,PublishedOn,DisclosureId,ReportBNPMId"
seen=set(); last=0
for l in open('prism.jsonl'):
    x=json.loads(l); seen.add((x['ReportBNPMId'],x['PFASId'])); last=max(last,x['ReportBNPMId'])
out=open('prism.jsonl','a')
while True:
    u="https://prism.theic2.org/odata/vSearch?$top=3000&$filter=ReportBNPMId ge %d&$orderby=ReportBNPMId&$select=%s"%(last,sel)
    u=u.replace(' ','%20')
    v=None
    for t in range(5):
        try: v=json.loads(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA,"Accept":"application/json"}),timeout=120).read().decode('utf-8','replace'))['value']; break
        except Exception as e: print('retry',e,flush=True); time.sleep(4)
    if v is None: sys.exit(1)
    new=0
    for x in v:
        k=(x['ReportBNPMId'],x['PFASId'])
        if k in seen: continue
        seen.add(k); out.write(json.dumps(x)+"\n"); new+=1
    out.flush()
    m=max((x['ReportBNPMId'] for x in v),default=last); print(last,'->',m,len(v),new,len(seen),flush=True)
    if len(v)<3000: break
    if m==last:
        last=m+1
    else: last=m
    time.sleep(0.7)
open('prism.done','w').write(str(len(seen)))
