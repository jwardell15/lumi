# Builds /workspace/m25/out/hb25/ref.json: ingredient-name dictionaries for PFAS (EPA list), Prop 65 (OEHHA), EU fragrance allergens, formaldehyde releasers.
import json,re,csv,collections,datetime,sys
csv.field_size_limit(10**9)
R=(os.environ.get('HB25_WORK','/workspace/m25')+'/raw/'); O=(os.environ.get('HB25_WORK','/workspace/m25')+'/out/hb25/')
import os; os.makedirs(O,exist_ok=True)
def norm(s):
    s=s.lower().replace('α','alpha').replace('β','beta').replace('γ','gamma').replace('’',"'")
    s=re.sub(r"[^a-z0-9]+",' ',s).strip(); return s
# ---- PFAS (EPA CompTox list; synonyms from DSSTox Dec 2025) ----
pf=json.load(open(R+'pfas_dss.json'))
pe=[];pm={}
for k,v in pf.items():
    idx=len(pe); pe.append([v['n'],v['cas'],k])
    names=[v['n']]+v['syn'].split(' | ')
    for s in names:
        n=norm(s)
        if n!=norm(v['n']) and not re.search(r'fluor|flour|flur|perfl|ptfe|teflon|fluo',n): continue
        if (len(n)<9 and n!=norm(v['n'])) or len(n)<6 or re.fullmatch(r'[0-9 ]+',n) or len(n.split())>7: continue
        if re.fullmatch(r'(ec|einecs|nsc|brn|unii|dtxsid|cas)[ no]*[0-9 ]*',n): continue
        if n not in pm: pm[n]=idx
for a in ['ptfe','pfoa','pfos','pfas','pfhxs','pfna','genx']:
    pass
# curated acronyms/trade phrases that are PFAS by name (EPA list lists these chemicals; INCI uses the acronyms)
ACR={'ptfe':'Polytetrafluoroethylene (PTFE)','polytetrafluoroethylene':'Polytetrafluoroethylene (PTFE)','pfoa':'Perfluorooctanoic acid (PFOA)','pfos':'Perfluorooctane sulfonic acid (PFOS)'}
for n,label in ACR.items():
    if n not in pm:
        idx=len(pe); pe.append([label,'9002-84-0' if 'tetra' in label.lower() else '','name']); pm[n]=idx
# ---- Prop 65 ----
p65=json.load(open(R+'p65_rows.json'))
QUAL=re.compile(r'ingested|internal use|hexavalent|inorganic|compounds|oxides|salts|fibers|airborne|asbestiform|respirable|when in|in excess|daily dosage|with the exception|non-?decolorized|manufacture|when |inhalation|oral|tablet|alcoholic bever|processed|smokeless|tobacco|cigarette|wood dust|welding|engine exhaust|marijuana|areca|betel|mate|hot beverage|salted fish|pickled',re.I)
dss={}
cas_needed=set()
for r in p65:
    for c in re.findall(r'\d{2,7}-\d\d-\d',r['cas']): cas_needed.add(c)
with open(R+'dss/DSSTox_CCD_dump_12092025/DSSToxCCDdump.csv',newline='',encoding='utf-8',errors='replace') as f:
    for row in csv.DictReader(f):
        if row['CASRN'] in cas_needed:
            dss[row['CASRN']]=[row['PREFERRED_NAME']]+row['IDENTIFIER'].split(' | ')
print('p65 cas found in dsstox',len(dss),'of',len(cas_needed))
STOP=set('water aqua alcohol oil acid salt sodium potassium calcium mica silica iron carbon zinc sugar glycerin soap wax gel butter extract fragrance parfum perfume aroma flavor color colour dye pigment lead mercury arsenic'.split())
ee=[];em={}
JUNK=re.compile(r'\b(unii|tox21|inchi|dtxsid|epa|pesticide|caswell|einecs|ec no|nsc|brn|ai 3|pc \d|formulation|insecticide|tablet|flavor|condition|balance|volcano|program|not available|alcohol methyl|glycol alcohol|methacrylate|vinylidene|selenium|nitro)\b')
BLOCK={'ethylene glycol monobutyl ether','tris phosphate','bha','methacrylate','vinylidene','condition','glycol alcohol','propylene glycol butyl ether','alcohol methyl','not available','chromium','magnesium aluminum silicate','magnesium aluminium silicate','attapulgite'}
def add_phrase(m,p,idx,minlen=5):
    n=norm(p)
    if n in BLOCK or (n!=norm(p) ) : return
    if JUNK.search(n) and idx is not None and n not in ('selenium sulfide',) and not n.startswith('nitro'): return
    if len(n)<minlen or re.fullmatch(r'[0-9 ]+',n) or len(n.split())>8: return
    if n in STOP: return
    m.setdefault(n,idx)
for r in p65:
    nm=r['name']; q=1 if QUAL.search(nm) else 0
    tox=r['tox'].replace('cancer cancer','cancer')
    cancer='cancer' in tox; rep=any(w in tox for w in ('developmental','female','male'))
    idx=len(ee); ee.append([nm,re.sub(r'\s+','',r['cas']) if r['cas'] not in ('---','--','-') else '',('C' if cancer else '')+('R' if rep else ''),r['date'],q])
    base=re.sub(r'\([^)]*\)','',nm).strip(' ,')
    add_phrase(em,base,idx)
    for par in re.findall(r'\(([^)]*)\)',nm):
        if re.fullmatch(r'[A-Z0-9\-]{3,8}',par.strip()):
            if len(par.strip())>=4 or par.strip() in ('BPA','BPS','BHA'): add_phrase(em,par,idx,3)
        elif len(par.strip())>=8 and not QUAL.search(par) and not re.search(r'hydrated|anhydrous|ingested|technical grade|internal use|mixture|and its|salts|compounds',par,re.I): add_phrase(em,par,idx)
    add_phrase(em,nm,idx)
    for c in re.findall(r'\d{2,7}-\d\d-\d',r['cas']):
        if len(re.findall(r'\d{2,7}-\d\d-\d',r['cas']))>1: continue
        for s in dss.get(c,[]):
            if re.fullmatch(r'\d{2,7}-\d\d-\d',s): continue
            if ' ' in s.strip() or len(s.strip())>=10: add_phrase(em,s,idx,9)
        em.setdefault(c,idx)  # a CAS number printed in an ingredient list
for alias,nmatch in [('cocamide dea','cocamide diethanolamine'),('cocamide diethanolamine','cocamide diethanolamine'),('coco diethanolamide','cocamide diethanolamine'),('cocamide diethanolamide','cocamide diethanolamine'),('coconut diethanolamide','cocamide diethanolamine'),('formaldehyde solution','formaldehyde'),('formalin','formaldehyde'),('talc containing asbestiform fibers','talc')]:
    for i,e in enumerate(ee):
        if nmatch in e[0].lower(): em.setdefault(alias,i); break
# make sure big class names for qualified rows can't match common cosmetic words via synonyms (qualified rows are info only anyway)
# ---- EU fragrance allergens (Reg. 1223/2009 Annex III entries 67-92) ----
FA=[("Amyl cinnamal","122-40-7",["amyl cinnamal","amylcinnamal","alpha amylcinnamaldehyde","amyl cinnamic aldehyde"]),
("Amylcinnamyl alcohol","101-85-9",["amylcinnamyl alcohol","amyl cinnamyl alcohol"]),
("Anise alcohol","105-13-5",["anise alcohol","anisyl alcohol"]),
("Benzyl alcohol","100-51-6",["benzyl alcohol"]),
("Benzyl benzoate","120-51-4",["benzyl benzoate"]),
("Benzyl cinnamate","103-41-3",["benzyl cinnamate"]),
("Benzyl salicylate","118-58-1",["benzyl salicylate"]),
("Butylphenyl methylpropional","80-54-6",["butylphenyl methylpropional","lilial"]),
("Cinnamal","104-55-2",["cinnamal","cinnamaldehyde","cinnamic aldehyde"]),
("Cinnamyl alcohol","104-54-1",["cinnamyl alcohol"]),
("Citral","5392-40-5",["citral"]),
("Citronellol","106-22-9",["citronellol"]),
("Coumarin","91-64-5",["coumarin"]),
("Eugenol","97-53-0",["eugenol"]),
("Evernia furfuracea (treemoss) extract","90028-67-4",["evernia furfuracea","treemoss","tree moss"]),
("Evernia prunastri (oakmoss) extract","90028-68-5",["evernia prunastri","oakmoss","oak moss"]),
("Farnesol","4602-84-0",["farnesol"]),
("Geraniol","106-24-1",["geraniol"]),
("Hexyl cinnamal","101-86-0",["hexyl cinnamal","hexylcinnamal","alpha hexylcinnamaldehyde"]),
("Hydroxycitronellal","107-75-5",["hydroxycitronellal"]),
("Hydroxyisohexyl 3-cyclohexene carboxaldehyde","31906-04-4",["hydroxyisohexyl 3 cyclohexene carboxaldehyde","hicc","lyral"]),
("Isoeugenol","97-54-1",["isoeugenol"]),
("Limonene","5989-27-5",["limonene","d limonene","dl limonene"]),
("Linalool","78-70-6",["linalool"]),
("Methyl 2-octynoate","111-12-6",["methyl 2 octynoate","methyl heptine carbonate"]),
("Alpha-isomethyl ionone","127-51-5",["alpha isomethyl ionone","isomethyl ionone","methyl ionone"])]
FR=[("DMDM hydantoin","6440-58-0",["dmdm hydantoin"]),
("Quaternium-15","4080-31-3",["quaternium 15"]),
("Imidazolidinyl urea","39236-46-9",["imidazolidinyl urea"]),
("Diazolidinyl urea","78491-02-8",["diazolidinyl urea"]),
("Bronopol (2-bromo-2-nitropropane-1,3-diol)","52-51-7",["bronopol","2 bromo 2 nitropropane 1 3 diol"]),
("Sodium hydroxymethylglycinate","70161-44-3",["sodium hydroxymethylglycinate","glycine hydroxymethyl sodium salt"]),
("Polyoxymethylene urea","9011-05-6",["polyoxymethylene urea"]),
("Tris(hydroxymethyl)nitromethane","126-11-4",["tris hydroxymethyl nitromethane","nitromethylidyne trimethanol"]),
("Benzylhemiformal","14548-60-8",["benzylhemiformal","benzyl hemiformal"]),
("5-Bromo-5-nitro-1,3-dioxane","30007-47-7",["5 bromo 5 nitro 1 3 dioxane","bronidox"]),
("Methenamine","100-97-0",["methenamine","hexamethylenetetramine"])]
json.dump({'built':datetime.date.today().isoformat(),'pfas':{'e':pe,'m':pm},'p65':{'e':ee,'m':em,'list':'July 31, 2026'},'fa':FA,'fr':FR},open(O+'ref.json','w'),separators=(',',':'),ensure_ascii=False)
print('pfas entries',len(pe),'phrases',len(pm),'| p65 entries',len(ee),'phrases',len(em),'qualified',sum(1 for e in ee if e[4]))
