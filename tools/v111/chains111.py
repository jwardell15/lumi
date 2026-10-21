import sys,re,json; sys.path.insert(0,'/workspace/diabetes-scanner/tools')
import chains as C
from fetch import L
NUM=re.compile(r'^(<\s*)?\d+(\.\d+)?$|^---?$')
SPEC={
 'Donatos':('donatos',10,dict(cal=0,fat=1,sat=2,sod=5,carb=6,fib=7,sug=8,pro=9)),
 'Jollibee':('jollibee',10,dict(cal=0,fat=1,sat=2,sod=5,carb=6,fib=7,sug=8,pro=9)),
 'Gold Star Chili':('goldstar',10,dict(cal=0,fat=1,sat=2,sod=5,carb=6,fib=7,sug=8,pro=9)),
 'Huddle House':('huddle',13,dict(cal=0,fat=2,sat=3,sod=7,carb=9,fib=10,sug=11,pro=12)),
 'QuikTrip':('quiktrip',12,dict(cal=1,fat=2,sat=3,sod=6,carb=7,fib=8,sug=9,pro=11)),
}
SIZE=re.compile(r'^(small|medium|large|x-large|regular|big q|kids?|jumbo|mini|\d+ ?(fl\.? )?oz)\b',re.I)
def rows(k,N):
    par=chi='';lasthdr=None
    for ln in open(k+'.txt'):
        t=[x.strip() for x in re.split(r'\s{2,}',ln.strip()) if x.strip()]
        if len(t)==1 and not re.search(r'\d',t[0]) and len(t[0])<50:
            if lasthdr: par=lasthdr
            chi=t[0]; lasthdr=t[0]; continue
        if t: lasthdr=None
        if t and SIZE.match(t[0]) and chi: t[0]=((par+' ') if par and par not in chi else '')+chi+', '+t[0]
        t=[x.lstrip('●•') for x in t if not re.match(r'^\d+(\.\d+)?%$|^<?\d+%$',x)]
        i=next((j for j in range(len(t)-N+1) if all(NUM.match(x) for x in t[j:j+N])),None)
        if i is None or i==0: continue
        if k!='quiktrip' and i+N<len(t) and NUM.match(t[i+N]): continue  # too many numbers -> misaligned
        yield t[:i],t[i:i+N]
out=[];rep={}
for chain,(k,N,m) in SPEC.items():
    seen=set();keep=[]
    for pre,v in rows(k,N):
        g=lambda c: None if v[m[c]].startswith('-') else v[m[c]]
        item=re.sub(r'^CHILI & GRILL MENU ','',pre[0]); serv=pre[1] if len(pre)>1 else ''
        if re.search(r'^(total|serving|calories|item)',item,re.I) or len(item)<3 or len(item)>110: continue
        x=C.rec(chain,item,serv,g('cal'),g('fat'),g('sat'),g('sod'),g('carb'),g('fib'),g('sug'),g('pro'),L[k])
        if x['carbs'] is None or not C.sane(x): continue
        key=(x['item'].lower(),x['serving'],x['kcal'],x['carbs'])
        if key in seen: continue
        seen.add(key);keep.append(x)
    out+=keep;rep[chain]=len(keep)
with open('chains111.jsonl','w') as f:
    for x in out: f.write(json.dumps(x)+'\n')
print(json.dumps(rep,indent=1))
import random;random.seed(2)
for c in SPEC:
  s=[x for x in out if x['chain']==c]
  for x in random.sample(s,min(3,len(s))): print(c,'|',x['item'],'|',x['serving'],x['kcal'],x['carbs'],x['protein'])
