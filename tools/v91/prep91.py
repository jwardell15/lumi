import json, collections, datetime
MT=lambda v: int(v) if str(v).isdigit() else (int(datetime.datetime.fromisoformat(str(v).replace('Z','+00:00')).timestamp()) if v else 0)
nz=lambda c:c.lstrip('0')
kz=lambda r:(r.get('ue') or r['code']).lstrip('0')
# OFF: dedupe by normalized GTIN; prefer US-tagged, then newer edit, then more complete
best={}
def comp(r): return sum(v is not None for v in r['n'].values())+(2 if r['ing'] else 0)+(2 if r['img'] else 0)
for l in open('/workspace/m91/off91.jsonl'):
    r=json.loads(l); k=kz(r)
    o=best.get(k)
    if o is None or ((1-r['ca']),MT(r['mod']),comp(r))>((1-o['ca']),MT(o['mod']),comp(o)): best[k]=r
off=sorted(best.values(),key=lambda r:(-(r['scans'] or 0),r['ca'],-comp(r)))
side={};side2={}
with open('us.jsonl','w') as f:
    for r in off:
        side[r['code']]=[r['org'],r['fv']]; side2[r['code']]=[r['al'],r['tr'],r['an'],r['lb']]
        f.write(json.dumps(r,separators=(',',':'))+'\n')
json.dump(side,open('side.json','w')); json.dump(side2,open('side2.json','w'))
offk=set(best); own={k:nz(r['code']) for k,r in best.items()}
# USDA: all GTINs not in OFF; usdax for the OFF-matched ones
ux={}; extra=[]
for l in open('/workspace/m63/usda63.jsonl'):
    r=json.loads(l); k=nz(r['code'])
    if k in offk: ux[own[k]]={'fdc':r['fdc'],'date':r['date'],'mod':r['mod'],'ing':r['ing'],'n':r['n']}
    else: extra.append(r)
sc=lambda r:(0 if r['disc'] else 4)+(2 if r['ing'] else 0)+(1 if r['servQ'] else 0)+(1 if r['n'].get('fiber') is not None else 0)+(1 if r['n'].get('sugars') is not None else 0)+(r['date'] or '')[:4].isdigit()*int((r['date'] or '0000')[:4])/10000
extra.sort(key=lambda r:-sc(r))
with open('extra.jsonl','w') as f:
    for r in extra: f.write(json.dumps(r,separators=(',',':'))+'\n')
json.dump(ux,open('usdax.json','w'))
print('OFF rows',sum(1 for _ in open('/workspace/m91/off91.jsonl')),'unique',len(off),'US',sum(1 for r in off if not r['ca']),'CA-with-US-UPC',sum(1 for r in off if r['ca']))
print('USDA gtins',len(ux)+len(extra),'in OFF',len(ux),'USDA-only',len(extra),'discontinued among USDA-only',sum(1 for r in extra if r['disc']))
print('total unique grocery',len(off)+len(extra))
