import sys,re,json; sys.path.insert(0,'/workspace/diabetes-scanner/tools')
import chains as C
from fetch import L
NUM=re.compile(r'^(<\s*)?\d+(\.\d+)?$|^---?$')
# spec: chain:(key, N numeric cols, map idx, text-col handling)
SPEC={
 'Pizza Ranch':('pizzaranch',11,dict(cal=0,fat=2,sat=3,sod=6,carb=7,fib=8,sug=9,pro=10)),
 "Godfather's Pizza":('godfathers',11,dict(cal=1,fat=2,sat=3,sod=6,carb=7,fib=8,sug=9,pro=10)),
 'BIGGBY Coffee':('biggby',12,dict(cal=0,fat=1,sat=2,carb=5,fib=6,sug=7,pro=9,sod=10)),
 "Scooter's Coffee":('scooters',10,dict(cal=0,fat=1,sat=2,sod=5,carb=6,fib=7,sug=8,pro=9)),
}
def rows(k,N):
    grp=''
    for ln in open(k+'.txt'):
        t=[x.strip() for x in re.split(r'\s{2,}',ln.strip()) if x.strip()]
        if not t: continue
        i=next((j for j in range(len(t)-N+1) if all(NUM.match(x) for x in t[j:j+N])),None)
        if i is not None and i==2 and k=='pizzaranch' and t[0].isupper(): grp=t[0].title()
        if i is None:
            if len(t)==1 and t[0]==t[0].upper() and re.search('[A-Z]{3}',t[0]) and len(t[0])<60 and not re.search('PEANUT|SVG|CALS|NOTE',t[0]): grp=t[0].title()
            continue
        pre=[x for x in t[:i]]
        if not pre: continue
        yield grp,pre,t[i:i+N]
out=[];rep={}
for chain,(k,N,m) in SPEC.items():
    seen=set();keep=[]
    for grp,pre,v in rows(k,N):
        g=lambda c: None if c not in m or v[m[c]].startswith('-') else v[m[c]]
        if chain=='Pizza Ranch':
            if len(pre)>=2: item=(pre[0].title() if pre[0].isupper() else (grp+(' pizza' if re.search('crust|jumbo',pre[0],re.I) and not re.search('pizza',grp,re.I) else '')+', '+pre[0]).strip(', '))+' — '+pre[1]; serv=pre[1]
            else: item=(grp+' — '+pre[0]) if grp else pre[0]; serv=pre[0]
        elif chain=="Godfather's Pizza": item=' '.join(pre[:-1]); serv=pre[-1]+(' pizza' if '/' in pre[-1] else '')
        elif chain=="Scooter's Coffee": item=' '.join(pre); serv=pre[-1] if re.search(r'oz$',pre[-1]) else ''
        else: item=pre[0]; serv=(re.search(r'\d+\s?oz',pre[0]) or [''])[0]
        item=re.sub(r'\s+',' ',item).strip()
        x=C.rec(chain,item,serv,g('cal'),g('fat'),g('sat'),g('sod'),g('carb'),g('fib'),g('sug'),g('pro'),L[k])
        if x['carbs'] is None or not x['item'] or len(x['item'])>110 or not C.sane(x): continue
        key=(x['item'].lower(),x['serving'],x['kcal'],x['carbs'])
        if key in seen: continue
        seen.add(key);keep.append(x)
    out+=keep;rep[chain]=len(keep)
with open('chains11.jsonl','w') as f:
    for x in out: f.write(json.dumps(x)+'\n')
print(json.dumps(rep,indent=1))
import random;random.seed(1)
for x in random.sample(out,12): print(x['chain'],'|',x['item'],'|',x['serving'],x['kcal'],x['carbs'],x['protein'])
