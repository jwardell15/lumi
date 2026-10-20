import sys, json, re; sys.path.insert(0,'/workspace/diabetes-scanner/tools')
import chains as C
from fetch import L
S10=C.STD10; S11=C.STD11
def cl_w(s): return re.sub(r'^(Plus your choice of:|Includes:|Toppings ?:|Waffle House Hashbrowns:|Hashbrowns:|Name)\s*','',s).strip()
def cl_c(s): return re.sub(r'\s+\d+\s*\(\d+g\)$','',s).strip()
SPEC={'Buffalo Wild Wings':('bww',10,S10,{}),
 'The Cheesecake Factory':('tcf',11,S11,{}),
 'Waffle House':('waffle',10,S10,{'clean':cl_w}),
 "Portillo's":('portillos',11,S11,{}),
 'Dutch Bros':('dutch',11,dict(cal=0,fat=2,sat=3,sod=6,carb=7,fib=8,sug=9,pro=10),{}),
 "Taco John's":('tacojohns',10,S10,{}),
 "Cheddar's Scratch Kitchen":('cheddars',11,dict(cal=0,fat=2,sat=3,pro=6,sod=7,carb=8,fib=9,sug=10),{}),
 'Pollo Tropical':('pollo',12,dict(cal=1,fat=3,sat=4,sod=7,carb=8,fib=9,sug=10,pro=11),{}),
 'Cinnabon':('cinnabon',11,dict(cal=0,fat=1,sat=2,sod=5,carb=6,fib=7,sug=8,pro=10),{'clean':cl_c}),
}
out=[]; rep={}
for chain,(k,n,m,o) in SPEC.items():
    try:
        r=C.pdf_chain(chain,L[k],k+'.pdf',n,m,**o)
        seen=set(); keep=[]
        for x in r:
            if x['carbs'] is None or not x['item'] or not C.sane(x): continue
            if re.search(r'^(name|menu item|signature sauces|dry rubs|page \d)',x['item'],re.I) or len(x['item'])>110: continue
            key=(x['item'].lower(),x['kcal'],x['carbs'])
            if key in seen: continue
            seen.add(key); keep.append(x)
        out+=keep; rep[chain]=len(keep)
    except Exception as e: rep[chain]='skipped: '+str(e)[:100]
with open('chains91.jsonl','w') as f:
    for x in out: f.write(json.dumps(x)+'\n')
print(json.dumps(rep,indent=1))
