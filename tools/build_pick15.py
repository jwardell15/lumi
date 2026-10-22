# v15: serving sizes for the home Top-picks pool (codes from /workspace/m15/pool.json) -> data/pick15.json
import json,sys,re
codes=json.load(open(sys.argv[1] if len(sys.argv)>1 else '/workspace/m15/pool.json'))
def gh(s):
  h=0
  for ch in s: h=(h*31+ord(ch))&0xffffffff
  return h%40
out={};C={}
def load(f):
  if f not in C:
    try: C[f]=json.load(open(f))
    except Exception: C[f]={}
  return C[f]
for c in codes:
  r=load(f'data/g/{gh(c)}.json').get(c) if not c.isdigit() else load(f'data/d/{c[-3:]}.json').get(c)
  if not r: continue
  q,lab,por=r[5],r[6],(r[13] if len(r)>13 else None)
  try: q=float(q) if q not in (None,'') else None
  except: q=None
  if por and (not q or not c.isdigit()):
    ok=[x for x in por if x[1] and 30<=x[1]<=250 and not re.fullmatch(r'[\d.]+ ?g',str(x[0]))] or por
    lab,q=min(ok,key=lambda x:abs((x[1] or 0)-100))
  if lab and not re.match(r'^[\d.]',lab): lab='1 '+lab
  if q and 5<=q<=500: out[c]=[round(q,1),(lab or '').strip()[:40]]
json.dump(out,open('data/pick15.json','w'),separators=(',',':'))
print(len(codes),len(out))
