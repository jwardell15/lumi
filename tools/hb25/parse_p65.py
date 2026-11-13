import re,json
L=open('p65.txt').read().replace('\x0c','').split('\n')
rows=[];cur=None
pat=re.compile(r'^(?P<name>\S.*?)\s{2,}(?P<tox>(?:cancer|developmental|female|male)[a-z, ]*?)\s+(?P<cas>(?:-{1,3}|[\d\-:;,/ ]+?))\s{2,}(?P<date>[A-Z][a-z]+ \d{1,2} ?,? ?\d{4})\s*$')
for ln in L:
    if not ln.strip() or ln.startswith('Chemical ') or 'Proposition 65 List of Chemicals' in ln or ln.startswith('Date:'): continue
    m=pat.match(ln)
    if m:
        cur={'name':m['name'].strip(),'tox':m['tox'].strip(),'cas':m['cas'].strip(),'date':m['date'],'extra':[]}; rows.append(cur)
    elif cur is not None and (ln.startswith(' ') or ln[0].islower() or True):
        s=ln.strip()
        # continuation: name wrap (left), tox wrap (middle) or cas wrap (right)
        cur['extra'].append(ln)
print(len(rows))
out=[]
for r in rows:
    nm=r['name']; tox=r['tox']; cas=r['cas']
    for e in r['extra']:
        parts=re.split(r'\s{2,}',e.strip())
        if e.startswith(' ') or e[0].islower() or True:
            # left col text always first part if line starts at col<=3
            lead=len(e)-len(e.lstrip())
            if lead<=3: nm+=' '+parts[0]; rest=parts[1:]
            else: rest=parts
            for p in rest:
                if re.fullmatch(r'[\d\-:;,/ ]+',p): cas+=' '+p
                elif re.fullmatch(r'[a-z, ]+',p): tox+=' '+p
                else: nm+=' '+p
    nm=re.sub(r'Chemical Type of Toxicity CAS No\. Date Listed','',nm); nm=re.sub(r'\s+[A-Z][a-z]+ \d{1,2}, \d{4}$','',nm.strip())
    out.append({'name':re.sub(r'\s+',' ',nm).strip(),'tox':re.sub(r'\s+',' ',tox).strip(' ,'),'cas':re.sub(r'\s+',' ',cas).strip(),'date':r['date']})
dl=[o for o in out if 'Delisted' in o['name']]
out=[o for o in out if 'Delisted' not in o['name']]
print(len(out),len(dl))
json.dump(out,open('p65_rows.json','w'),indent=0)
for o in out[:6]+out[300:306]: print(o)
import collections
print(collections.Counter(o['tox'] for o in out).most_common(12))
