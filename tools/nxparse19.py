import re,json,glob,html,sys
EX=set(json.load(open('/workspace/m19/rest/existing.json')))
slug=lambda s:re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',re.sub(r"['’]",'',s.lower())))
M={'Calories':'kcal','Total Fat':'fat','Saturated Fat':'sat','Sodium':'sodium','Total Carbohydrates':'carbs','Dietary Fiber':'fiber','Sugars':'sugar','Protein':'protein'}
out=[];log=[]
NAMES=json.load(open('names.json')) if len(sys.argv)<2 else {}
for f in sorted(glob.glob('nx_*.html')):
    s=f[3:-5];h=open(f,errors='ignore').read()
    if 'class="nmItem"' not in h: continue
    m=re.search(r'<img title="[^"]*" src="[^"]*" alt="([^"]+)"',h); name=html.unescape(m.group(1)).strip() if m else s
    name=NAMES.get(s,name)
    DUP={'checkers':"Checker's Drive-In/Rallys",'rallys':"Checker's Drive-In/Rallys",'dickeys-barbecue-pit':"Dickey's Barbeque Pit",'jamba':'Jamba Juice','the-habit-burger-grill':'Habit Burger & Grill'}
    if slug(name) in EX or s in EX or s in DUP: log.append(f'SKIP {s}: already in Lumi ({DUP.get(s,name)})');continue
    upd=re.search(r'Last Updated:</strong>\s*([\d/]+)',h); upd=upd.group(1) if upd else ''
    if upd and int(upd[-4:])<=2021: log.append(f'SKIP {s}: {name} menu last updated {upd} (too old)');continue
    rows=0;seen=set()
    for tr in re.findall(r'<tr class="(?:odd|even)">(.*?)</tr>',h,re.S):
        it=re.search(r'class="nmItem" title="([^"]+)"',tr)
        if not it: continue
        item=html.unescape(it.group(1)).strip()
        r={'chain':name,'item':item}
        for val,unit,lab in re.findall(r'aria-label="([\d,.<]+)\s*(g|mg|)\s*([A-Za-z ]+)"',tr):
            k=M.get(lab.strip())
            if k:
                try:r[k]=float(val.replace(',','').replace('<',''))
                except:pass
        if r.get('carbs') is None or r.get('kcal') is None: continue
        if (item.lower()) in seen: continue
        seen.add(item.lower())
        # sanity 4/4/9
        est=4*r['carbs']+4*r.get('protein',0)+9*r.get('fat',0)
        if r['kcal']>40 and est>0 and not (0.6<est/r['kcal']<1.5): continue
        r.update(source=f'https://www.nutritionix.com/{s}/menu/premium',date='2026-10-23',grams=None,serving='1 menu item (as listed)',srcLabel=f'{name} official nutrition menu (published via Nutritionix'+(f', updated {upd}' if upd else '')+')')
        out.append(r);rows+=1
        if rows>=600: break
    log.append(f'{s}: {name} {rows} items (updated {upd})')
json.dump(out,open('rest19nx.json','w'));open('nxlog.txt','w').write('\n'.join(log));print(len(out));print('\n'.join(log))
