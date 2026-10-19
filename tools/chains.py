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
if __name__ == '__main__':
    out = []; report = {}
    for name, fn in CHAINS.items():
        try: r = fn(); r = [x for x in r if x['carbs'] is not None and x['item']]; out += r; report[name] = len(r)
        except Exception as e: report[name] = 'skipped: ' + str(e)[:120]
    with open(sys.argv[1] if len(sys.argv) > 1 else 'chains.jsonl', 'w') as f:
        for x in out: f.write(json.dumps(x) + '\n')
    print(json.dumps(report, indent=1))
