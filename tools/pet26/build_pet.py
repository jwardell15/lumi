#!/usr/bin/env python3
"""Lumi 26.1: build data/pet26/ from the Open Pet Food Facts bulk dump and the FDA CVM animal recall table.
Usage: python3 tools/pet26/build_pet.py [RAW_DIR]   (RAW_DIR default /workspace/m26/raw; see tools/README-26.md for the downloads)
Writes: data/pet26/index.json  [code,name,brand,species,hasIngredients]  (search)
        data/pet26/p/<NN>.json  shards by last two digits of the barcode: {code: {n,b,s,q,i,g,l,m}}  (g = ingredient text, l = language of that text)
        data/pet26/recalls.json FDA CVM animal and veterinary recalls (as listed on the FDA page)"""
import gzip, json, os, re, sys, datetime, html
RAW = sys.argv[1] if len(sys.argv) > 1 else '/workspace/m26/raw'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'pet26')
os.makedirs(OUT + '/p', exist_ok=True)
SPECIES_TAGS = [('d', ('dog',)), ('c', ('cat',)), ('b', ('bird', 'parrot', 'canary', 'budgie')), ('f', ('fish', 'aquarium')), ('s', ('rabbit', 'rodent', 'hamster', 'guinea-pig', 'small-animal', 'ferret', 'horse', 'reptile', 'turtle'))]
NAME_WORDS = [('d', r'\b(dogs?|pupp(?:y|ies)|chiens?|chiots?|hunde?n?|welpen?|cani|cane|cachorros?|perros?|honden?|psa|psy)\b'), ('c', r'\b(cats?|kittens?|chats?|chatons?|katzen?|kater|gatti|gatto|gatos?|katten|kot|koty|kota)\b')]
def clean(t, n):
    t = html.unescape(str(t or '')); t = re.sub(r'\s+', ' ', t).strip(); return t[:n]
def img_path(p):
    code = str(p.get('code') or p.get('_id')); im = p.get('images') or {}; best = None
    keys = [k for k in im if k.startswith('front_') and isinstance(im[k], dict) and im[k].get('rev')]
    for k in ['front_en', 'front_' + str(p.get('lang') or '')] + keys:
        if k in im and isinstance(im[k], dict) and im[k].get('rev'): best = k + '.' + str(im[k]['rev']); break
    if not best:
        sf = (im.get('selected') or {}).get('front') or {}
        for lk in ['en', str(p.get('lang') or '')] + list(sf):
            if lk and isinstance(sf.get(lk), dict) and sf[lk].get('rev'): best = 'front_' + lk + '.' + str(sf[lk]['rev']); break
    if not best: return ''
    d = code if len(code) <= 8 else re.sub(r'^(\d{3})(\d{3})(\d{3})(\d*)$', r'\1/\2/\3/\4', code.rjust(13, '0'))
    return d + '/' + best
def species(p):
    tags = ' '.join(p.get('categories_tags') or []) + ' ' + ' '.join(p.get('labels_tags') or [])
    s = ''
    for k, ws in SPECIES_TAGS:
        if any(w in tags for w in ws): s += k
    if not s:
        nm = (str(p.get('product_name') or '') + ' ' + str(p.get('generic_name') or '')).lower()
        for k, rx in NAME_WORDS:
            if re.search(rx, nm): s += k
    return s
def ing_text(p):
    lc = str(p.get('lang') or p.get('lc') or '')
    for k in ['ingredients_text', 'ingredients_text_' + lc, 'ingredients_text_en'] + sorted(x for x in p if x.startswith('ingredients_text_') and not x.endswith('_debug_tags') and not x.startswith('ingredients_text_with_allergens')):
        v = p.get(k)
        if isinstance(v, str) and v.strip():
            return clean(v, 1500), (k.rsplit('_', 1)[-1] if k != 'ingredients_text' and re.fullmatch(r'ingredients_text_[a-z]{2}', k) else lc)
    return '', ''
SPAM = re.compile(r'\+\d{6,}|https?://|www\.|whatsapp|\britual|spell ?caster|\bmoney\b.*\b(nigeria|ritual)\b', re.I)
spam = 0
shards = {}; docs = []; n = 0; withing = 0; withimg = 0; sp = {}
for line in gzip.open(os.path.join(RAW, 'opff.jsonl.gz'), 'rt', encoding='utf-8'):
    p = json.loads(line)
    if p.get('product_type') != 'petfood': continue
    code = str(p.get('code') or p.get('_id') or '')
    if not re.fullmatch(r'\d{6,14}', code): continue
    name = clean(p.get('product_name') or p.get('product_name_en') or p.get('generic_name'), 120)
    brand = clean((p.get('brands') or '').split(',')[0], 60)
    if SPAM.search(name + ' ' + brand): spam += 1; continue
    ing, lang = ing_text(p); s = species(p); ip = img_path(p)
    rec = {'n': name, 'b': brand, 's': s, 'q': clean(p.get('quantity'), 30), 'i': ip, 'g': ing, 'l': lang, 'm': p.get('last_modified_t') or 0}
    rec = {k: v for k, v in rec.items() if v not in ('', 0)}
    shards.setdefault(code[-2:], {})[code] = rec; n += 1
    if ing: withing += 1
    if ip: withimg += 1
    sp[s or '?'] = sp.get(s or '?', 0) + 1
    if name or brand: docs.append([code, name, brand, s, 1 if ing else 0])
for k, v in shards.items():
    with open(f'{OUT}/p/{k}.json', 'w') as f: json.dump(v, f, ensure_ascii=False, separators=(',', ':'))
docs.sort(key=lambda d: (d[2].lower(), d[1].lower()))
built = datetime.date.today().isoformat()
with open(OUT + '/index.json', 'w') as f: json.dump({'built': built, 'n': n, 'withIng': withing, 'withImg': withimg, 'docs': docs}, f, ensure_ascii=False, separators=(',', ':'))
# recalls (FDA CVM xlsx)
import openpyxl
ws = openpyxl.load_workbook(os.path.join(RAW, 'animal_recalls.xlsx')).active
rows = list(ws.iter_rows(values_only=True)); hdr = rows[0]; assert hdr[0] == 'Date' and hdr[1] == 'Brand-Names', hdr
rec = []
for r in rows[1:]:
    if not r[0]: continue
    d = datetime.datetime.strptime(str(r[0]), '%m/%d/%Y').date().isoformat()
    rec.append({'d': d, 'b': clean(r[1], 120), 'p': clean(r[2], 300), 'r': clean(r[3], 300), 'c': clean(r[4], 120), 't': 1 if r[5] else 0})
rec.sort(key=lambda x: x['d'], reverse=True)
asof = open(os.path.join(RAW, 'recalls_asof.txt')).read().strip() if os.path.exists(os.path.join(RAW, 'recalls_asof.txt')) else built
with open(OUT + '/recalls.json', 'w') as f: json.dump({'asof': asof, 'built': built, 'rows': rec}, f, ensure_ascii=False, separators=(',', ':'))
print(json.dumps({'products': n, 'indexed': len(docs), 'withIngredients': withing, 'withImage': withimg, 'species': sp, 'shards': len(shards), 'spamSkipped': spam, 'recalls': len(rec), 'asof': asof}))
