import json
have=set(); g2k={}
for l in open('../m11/generic11.jsonl'):
    r=json.loads(l); have.add(r['id'])
    if r.get('group'): g2k.setdefault(r['group'],r['keys'])
M={1003:'protein',1004:'fat',1005:'carbs',1079:'fiber',2000:'sugars',1063:'sugars',1093:'sodiumMg',1258:'sat',1257:'trans',1008:'kcal',2048:'kcal2',2047:'kcal3'}
out=[];skip=[]
for p in (1,2):
  for f in json.load(open(f'fnd{p}.json'))['foods']:
    i='fdc-%d'%f['fdcId']
    if i in have: continue
    n={}
    for x in f.get('foodNutrients',[]):
        k=M.get(x.get('nutrientId'))
        if k and x.get('value') is not None and k not in n: n[k]=round(float(x['value']),2)
    n['kcal']=n.get('kcal',n.get('kcal2',n.get('kcal3')));[n.pop(k,None) for k in('kcal2','kcal3')]
    g=f.get('foodCategory')
    if n.get('kcal') is None or n.get('carbs') is None or g not in g2k: skip.append((f['description'],g));continue
    s=sum(n.get(k,0) for k in('protein','fat','carbs'))
    if s>101 or n['kcal']>900: skip.append((f['description'],'qc'));continue
    out.append({"id":i,"name":f['description'],"brand":"USDA","group":g,"keys":g2k[g],"n":n,"portions":[["100 g",100.0]],"src":"USDA Foundation","url":f"https://fdc.nal.usda.gov/food-details/{f['fdcId']}/nutrients","date":f.get('publishedDate','')})
json.dump(out,open('fnd_new.json','w'))
print(len(out),len(skip));print(skip[:20]);print([o['name'] for o in out[:15]])
