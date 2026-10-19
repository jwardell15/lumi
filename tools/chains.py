#!/usr/bin/env python3
"""One-time, polite builder for official chain nutrition data -> chains.jsonl.
Fetches each chain's own published nutrition page/JSON once (cached in ./chain-cache), checks robots.txt,
uses a descriptive UA, sleeps between requests, and skips chains that block automated access (403/captcha)."""
import json, os, re, sys, time, html, urllib.request, urllib.robotparser, datetime
UA = 'LumiNutritionBuild/1.0 (+https://github.com/jwardell15/lumi; one-time personal nutrition index build)'
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'chain-cache')
os.makedirs(CACHE, exist_ok=True)
TODAY = datetime.date.today().isoformat()
def allowed(url):
    from urllib.parse import urlparse
    u = urlparse(url); rp = urllib.robotparser.RobotFileParser(); rp.set_url(f'{u.scheme}://{u.netloc}/robots.txt')
    try:
        req = urllib.request.Request(rp.url, headers={'User-Agent': UA}); rp.parse(urllib.request.urlopen(req, timeout=15).read().decode('utf-8', 'ignore').splitlines())
    except Exception: return True
    return rp.can_fetch(UA, url)
def get(url, name):
    path = os.path.join(CACHE, name)
    if os.path.exists(path): return open(path, encoding='utf-8', errors='ignore').read()
    if not allowed(url): raise RuntimeError('robots.txt disallows ' + url)
    time.sleep(2)
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,application/json'})
    body = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')
    open(path, 'w', encoding='utf-8').write(body); return body
def num(v):
    try: return float(str(v).replace('<', '').replace(',', '').strip().split()[0])
    except Exception: return None
def rec(chain, item, serving, cal, fat, sat, sod, carbs, fiber, sugar, protein, url, menu=''):
    return {'chain': chain, 'item': item.strip(), 'menu': menu, 'serving': serving or '', 'kcal': num(cal), 'fat': num(fat), 'sat': num(sat), 'sodium': num(sod),
            'carbs': num(carbs), 'fiber': num(fiber), 'sugar': num(sugar), 'protein': num(protein), 'source': url, 'date': TODAY}

def chick_fil_a():
    url = 'https://www.chick-fil-a.com/nutrition-allergens'; s = get(url, 'cfa.html')
    m = re.search(r'<script id="wp-script-module-data-@wordpress/interactivity" type="application/json">(.*?)</script>', s, re.S)
    st = json.loads(m.group(1))['state']['nutrition-allergens-table-store']['activeTableData']
    out = []
    def walk(it, menu):
        f = {x['label']: x['value'] for x in it.get('fields', [])}
        if f: out.append(rec("Chick-fil-A", html.unescape(it['title']), f.get('Serving Size'), f.get('Calories'), f.get('Fat (g)'), f.get('Sat. Fat (g)'), f.get('Sodium (mg)'), f.get('Carbohydrates (g)'), f.get('Fiber (g)'), f.get('Sugar (g)'), f.get('Protein (g)'), it.get('link') or url, menu))
        for sub in it.get('sub_items', []): walk(sub, menu)
    for sec in st:
        for it in sec['items']: walk(it, sec['menu'])
    return out

import subprocess
def pdf_rows(url, name, minnums):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        if not allowed(url): raise RuntimeError('robots.txt disallows ' + url)
        time.sleep(2); req = urllib.request.Request(url, headers={'User-Agent': UA})
        open(path, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
    txt = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout
    isnum = lambda x: re.fullmatch(r'<?\d+(\.\d+)?', x.strip()) is not None
    for line in txt.splitlines():
        f = [x.strip() for x in re.split(r'\s{2,}|\t+', line.strip()) if x.strip()]
        if len(f) < minnums + 1 or isnum(f[0]): continue
        i = 1
        while i < len(f) and not isnum(f[i]): i += 1
        nums = []
        while i < len(f) and isnum(f[i]): nums.append(f[i]); i += 1
        if len(nums) >= minnums: yield f[0], ' '.join(f[1:len(f) - len(nums) - (len(f) - i)]), nums
def subway():
    url = 'https://media.subway.com/dam/urn:aaid:aem:f20a4541-8c88-496b-940d-4aa8318cae26/original/as/us-nutrition-en.pdf'
    return [rec('Subway', n, f'{x[0]} g', x[1], x[2], x[3], x[6], x[7], x[8], x[9], x[11], url) for n, sv, x in pdf_rows(url, 'subway.pdf', 12)]
def arbys():
    url = 'https://assets.ctfassets.net/30q5w5l98nbx/42zLskOHOxnHbSVYO98X47/eb5b661b4d42295aaf804a8f6a150b13/Arbys_Nutritional_and_Allergen_OCT_2026.pdf'
    return [rec("Arby's", n, f'{x[0]} g', x[1], x[3], x[4], x[7], x[8], x[9], x[10], x[11], url) for n, sv, x in pdf_rows(url, 'arbys.pdf', 12)]
def dunkin():
    url = 'https://assets.ctfassets.net/ubkcphxhphh0/3qEP8wMU2IFmLsLyEeWLuc/7bdae361f785d1611d25c4d859f8c721/DD_W7_nutrition_guide.pdf'
    out = []
    for n, sv, x in pdf_rows(url, 'dunkin.pdf', 11):
        n = re.sub(r'\s*-\s*$', '', n); item = f'{n} ({sv})' if sv and sv.lower() not in n.lower() else n
        out.append(rec("Dunkin'", item, sv, x[0], x[1], x[2], x[5], x[6], x[7], x[8], x[10], url))
    return out
def five_guys():
    url = 'https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf'
    return [rec('Five Guys', n, f'{x[0]} g', x[1], x[3], x[4], x[7], x[8], x[9], x[10], x[11], url) for n, sv, x in pdf_rows(url, 'fiveguys.pdf', 12)]
# Checked 2026-10-19 and skipped: McDonald's, Panera, Panda Express, KFC (HTTP 403 to automated requests);
# Taco Bell, Chipotle, Starbucks, Wendy's (US), Burger King, Popeyes, Domino's, Pizza Hut, Sonic, Jersey Mike's
# (nutrition only rendered by JS apps/private APIs or no US nutrition file linked) — not worked around.
CHAINS = {'Chick-fil-A': chick_fil_a, 'Subway': subway, "Arby's": arbys, "Dunkin'": dunkin, 'Five Guys': five_guys}

# ---- v4.1: more official PDFs (column maps read from each PDF's header) ----
def fetch_pdf(url, name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        if not allowed(url): raise RuntimeError('robots.txt disallows ' + url)
        time.sleep(2); req = urllib.request.Request(url, headers={'User-Agent': UA})
        body = urllib.request.urlopen(req, timeout=60).read()
        if not body.startswith(b'%PDF'): raise RuntimeError('not a PDF (JS page)')
        open(path, 'wb').write(body)
    return path
NUMRE = re.compile(r'(<?\d+(\.\d+)?|\.\d+|N/A|--|-)$')
def table_rows(path, n, raw=False):
    txt = subprocess.run(['pdftotext', '-raw' if raw else '-layout', path, '-'], capture_output=True, text=True).stdout
    lines = txt.splitlines()
    if raw:  # join "Name 3 6" + "520 290 ..." split lines
        j = []
        for ln in lines:
            if j and re.match(r'^[\d.]', ln) and len(ln.split()) >= n and len(j[-1].split()) and not re.search(r'([\d.]+\s+){%d}' % (n - 1), j[-1]): j[-1] = re.sub(r'(\s+\d{1,2})+$', '', j[-1]) + '  ' + ln
            else: j.append(ln)
        lines = [re.sub(r'\s+', '  ', re.sub(r'^(.*?[A-Za-z\)®™\]])\s+(?=[\d.]+\s)', r'\1  ', l)) for l in j]
    for line in lines:
        fields = [x.strip() for x in re.split(r'\s{2,}|\t+', line.strip()) if x.strip()]
        name, nums = [], []
        def flush():
            if name and len(nums) >= n: return (' '.join(name), [None if x in ('N/A', '--', '-') else num(x) for x in nums[:n]])
        for f in fields:
            toks = f.split()
            if all(NUMRE.match(t) for t in toks):
                nums += toks
            else:
                r = flush()
                if r: yield r
                if nums: name, nums = [], []
                name.append(f)
        r = flush()
        if r: yield r
def pdf_chain(chain, url, file, n, m, raw=False, serv=None, clean=None):
    out = []
    for nm, x in table_rows(fetch_pdf(url, file), n, raw):
        nm = re.sub(r'\s+(\d{1,2}\s*)+$', '', nm) if raw else nm
        if clean: nm = clean(nm)
        nm = re.sub(r'^[-–•\s]+|\s+[A-Z]{1,2}(,[A-Z]{1,2})+$', '', nm).strip()
        if not nm or len(nm) < 3 or re.search(r'calorie|serving size|^total', nm, re.I): continue
        g = lambda k: x[m[k]] if k in m and x[m[k]] is not None else None
        out.append(rec(chain, nm, f"{g('g'):g} g" if 'g' in m and g('g') else (serv or ''), g('cal'), g('fat'), g('sat'), g('sod'), g('carb'), g('fib'), g('sug'), g('pro'), url))
    return out
STD10 = dict(cal=0, fat=1, sat=2, sod=5, carb=6, fib=7, sug=8, pro=9)
STD11 = dict(cal=0, fat=2, sat=3, sod=6, carb=7, fib=8, sug=9, pro=10)
MORE = {
 "Culver's": ('https://cdn.culvers.com/menu/docs/guide-nutrition-allergen.pdf', 'culvers.pdf', 10, STD10, {}),
 'Shake Shack': ('https://shakeshack.com/sites/default/files/2026-01/_Master%20Nut%20%26%20Allergen%201.6.26.pdf', 'shakeshack.pdf', 10, STD10, {'clean': lambda s: re.sub(r'\s*Contains:.*', '', s)}),
 'Sonic': ('https://assets.ctfassets.net/whnlxz6bna9d/665Hn9SdgyT53pJgF9cmkK/090ae5fe05d8cd9643fb98fcde32ef1a/61667-1_FEE_0926_NUTBRO_SEPTEMBER_FA_rg_WCAG.pdf', 'sonic.pdf', 10, STD10, {'clean': lambda s: s.title()}),
 'Jack in the Box': ('https://assets.ctfassets.net/a9odgsv44wmq/2TASloFvjca2Yk6z62XQY2/07218b7c9dcbb4c70abb102720087106/2022_Nutrition_Facts.PDF', 'jitb.pdf', 13, dict(g=0, cal=1, fat=3, sat=4, sod=7, carb=9, fib=10, sug=11, pro=12), {}),
 'Qdoba': ('https://assets.ctfassets.net/0tc4847zqy12/bQFJBCmsAk4ww4qzdfAOm/258189ce59b58cd3f717b577e1247c34/Nutrition-Brochure_6.15.26.pdf', 'qdoba.pdf', 12, dict(g=0, cal=1, fat=3, sat=4, carb=7, fib=8, sug=9, pro=10, sod=11), {}),
 'Whataburger': ('https://wbimageserver.whataburger.com/Nutrition.pdf', 'whataburger.pdf', 11, STD11, {}),
 "Jimmy John's": ('https://resources.jimmyjohns.com/downloadable-files/NutritionGuide.pdf', 'jj.pdf', 11, STD11, {}),
 'Little Caesars': ('https://littlecaesars.com/static/usnutritionguide.pdf', 'lc.pdf', 11, STD11, {'serv': 'whole item'}),
 "Carl's Jr.": ('https://www.carlsjr.com/getContentAsset/86ac3f5e-5c97-4a18-9e27-7a6d62a9148f/dfc3d011-8f63-43f6-9ed8-4b444333a1d0/cj-25w5-sys_np-dig-1120x3000_r0.pdf?language=en-US', 'carls.pdf', 12, dict(g=0, cal=1, fat=3, sat=4, sod=7, carb=8, fib=9, sug=10, pro=11), {}),
 'Tropical Smoothie Cafe': ('https://www.tropicalsmoothiecafe.com/nutrition/nutrition-guide.pdf', 'tsc.pdf', 14, dict(cal=0, fat=3, sat=4, sod=7, carb=8, fib=10, sug=11, pro=13), {'raw': True}),
}
for _k, (_u, _f, _n, _m, _o) in MORE.items():
    CHAINS[_k] = (lambda k=_k, u=_u, f=_f, n=_n, m=_m, o=_o: pdf_chain(k, u, f, n, m, **o))
# Checked 2026-10-19 (v4.1) and skipped: Panda Express, Raising Cane's, Zaxby's, Dairy Queen, Cava, McDonald's (HTTP 403);
# Starbucks, Chipotle, Taco Bell, Panera, Sweetgreen, Smoothie King, In-N-Out, Wingstop, Burger King, Popeyes, Pizza Hut, KFC, Jersey Mike's
# (nutrition only in JS apps, or no official US nutrition file found on the chain's own domain/CDN);
# Wendy's (official PDF found is the UK menu), Domino's and Noodles & Company (PDF layouts not reliably machine-readable), Papa John's (table text not extractable).

def sane(x):
    e = (x['carbs'] or 0) * 4 + (x['protein'] or 0) * 4 + (x['fat'] or 0) * 9; k = x['kcal']
    if (x['fiber'] or 0) > (x['carbs'] or 0) or (x['sugar'] or 0) > (x['carbs'] or 0) + 1: return False
    if k is not None and e > 1.3 * k + 25: return False
    x['item'] = re.sub(r'^[∆*†\s]+|\s+[SEMWPTFCG]{1,5}$|\*+$', '', x['item']).strip()
    return True
if __name__ == '__main__':
    out = []; report = {}
    for name, fn in CHAINS.items():
        try: r = fn(); r = [x for x in r if x['carbs'] is not None and x['item'] and sane(x)]; out += r; report[name] = len(r)
        except Exception as e: report[name] = 'skipped: ' + str(e)[:120]
    with open(sys.argv[1] if len(sys.argv) > 1 else 'chains.jsonl', 'w') as f:
        for x in out: f.write(json.dumps(x) + '\n')
    print(json.dumps(report, indent=1))
