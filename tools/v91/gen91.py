import json,re
slug=lambda s: re.sub(r'[^a-z0-9]+','-',s.lower().replace("'",'').replace('’','')).strip('-')
DR=re.compile(r'\b(latte|mocha|tea|coffee|cold brew|rebel|frost|freeze|smoothie|lemonade|soda|shake|malt|cocoa|chai|americano|breve|cappuccino|espresso|mimosa|sangria|martini|margarita|mule|spritz|punch|cooler|juice|milk|water|cocktail|daiquiri|colada|old fashioned|beer|wine|drink|limeade|float|fizz)\b',re.I)
ids=set(); out=[]; chains=json.load(open('generic62.jsonl.chains.json'))
for l in open('generic62.jsonl'): out.append(l.rstrip('\n')); ids.add(json.loads(l)['id'])
have={c[0] for c in chains}; add={}
for l in open('m91/chains91.jsonl'):
    r=json.loads(l); s=slug(r['chain']); name=r['item'].strip()
    m=re.search(r'\((\d+)\s?g\)',name); g=float(m.group(1)) if m else None
    i='r-%s-%s'%(s,slug(name))[:90]; k=i; n=2
    while k in ids: k='%s-%d'%(i,n); n+=1
    ids.add(k)
    nn={'carbs':r['carbs'],'fiber':r['fiber'],'sugars':r['sugar'],'fat':r['fat'],'sat':r['sat'],'sodiumMg':r['sodium'],'protein':r['protein'],'kcal':r['kcal']}
    nn={a:b for a,b in nn.items() if b is not None}
    if g: nn={a:round(b*100/g,3) for a,b in nn.items()}
    rec={'id':k,'name':name,'brand':r['chain'],'group':'','keys':['rest','rest-'+s],'n':nn,'portions':[['1 item (%d g)'%g if g else '1 item', g or 100]],'perItem':not g,'src':'%s official nutrition'%r['chain'],'url':r['source'],'date':r['date'],'liquid':bool(DR.search(name)) and not g}
    out.append(json.dumps(rec)); add[s]=r['chain']
for s,c in add.items():
    if s not in have: chains.append([s,c])
open('m91/generic91.jsonl','w').write('\n'.join(out)+'\n'); json.dump(chains,open('m91/generic91.jsonl.chains.json','w'))
print('records',len(out),'new chain slugs',[a for a in add if a not in have],'chains total',len(chains))
