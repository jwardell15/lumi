#!/usr/bin/env python3
"""Lumi 17.3: polite Whole Foods crawl. Seeds = public product URLs (from web search); follows only the
size/flavor variation ASINs listed on each allowed /grocery/product/ page. 2.5 s delay; stops on 403/429/503.
usage: crawl_wfm.py seeds.txt out.jsonl [max_requests]"""
import sys, time, re, json, urllib.request
UA = 'Mozilla/5.0 (compatible; LumiPersonalNutrition/17.3; personal use)'
B = 'https://www.wholefoodsmarket.com/grocery/product/'
seen = set()
for l in open(sys.argv[2]) if __import__('os').path.exists(sys.argv[2]) else []:
    try: seen.add((json.loads(l).get('asin') or '').upper())
    except Exception: pass
q = []
for u in [l.strip() for l in open(sys.argv[1]) if l.strip()]:
    m = re.search(r'-(b0[a-z0-9]{8})$', u, re.I)
    if m and m.group(1).upper() not in seen: q.append((m.group(1).upper(), u)); seen.add(m.group(1).upper())
out = open(sys.argv[2], 'a'); mx = int(sys.argv[3]) if len(sys.argv) > 3 else 800; n = 0
while q and n < mx:
    asin, u = q.pop(0); n += 1
    try:
        s = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=20).read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, u, flush=True)
        if e.code in (403, 429, 503): print('STOP: blocked', flush=True); break
        time.sleep(2.5); continue
    except Exception as e:
        print('ERR', e, u, flush=True); time.sleep(2.5); continue
    m = re.search(r'id="__NEXT_DATA__"[^>]*>(.*?)</script>', s, re.S)
    a = None
    try: a = m and json.loads(m.group(1))['props']['pageProps'].get('aapiData')
    except Exception: pass
    if a:
        for v in a.get('variationsList') or []:
            for nd in v.get('variationNodeList') or []:
                x = (nd.get('asin') or '').upper()
                if x and x not in seen: seen.add(x); q.append((x, B + 'p-' + x.lower()))
    if not a or not a.get('nutritionFacts'): print('no nutrition', u, flush=True)
    else:
        out.write(json.dumps({'url': u, 'asin': a.get('asin'), 'brand': a.get('brandName'), 'name': a.get('name'), 'img': (a.get('productImages') or [''])[0], 'ing': a.get('ingredients'), 'type': (a.get('category') or {}).get('productType'), 'nf': a['nutritionFacts'], 'date': time.strftime('%Y-%m-%d')}) + '\n'); out.flush()
        print('ok', len(q), a.get('name'), flush=True)
    time.sleep(2.5)
print('done requests', n, 'queue left', len(q), flush=True)
