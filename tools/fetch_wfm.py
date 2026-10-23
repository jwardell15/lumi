#!/usr/bin/env python3
"""Lumi 17.1: fetch Whole Foods Market public product pages (robots.txt allows /grocery/product/), politely.
usage: python3 tools/fetch_wfm.py urls.txt out.jsonl   (2.5 s between requests; stops on 403/429/503)"""
import sys, time, re, json, urllib.request
UA = 'Mozilla/5.0 (compatible; LumiPersonalNutrition/17.1; personal use)'
out = open(sys.argv[2], 'a')
for u in [l.strip() for l in open(sys.argv[1]) if l.strip()]:
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=20); s = r.read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, u); 
        if e.code in (403, 429, 503): print('STOP: blocked'); break
        continue
    m = re.search(r'id="__NEXT_DATA__"[^>]*>(.*?)</script>', s, re.S)
    a = m and json.loads(m.group(1))['props']['pageProps'].get('aapiData')
    if not a or not a.get('nutritionFacts'): print('no nutrition', u); time.sleep(2.5); continue
    out.write(json.dumps({'url': u, 'asin': a.get('asin'), 'brand': a.get('brandName'), 'name': a.get('name'), 'img': (a.get('productImages') or [''])[0], 'ing': a.get('ingredients'), 'type': (a.get('category') or {}).get('productType'), 'nf': a['nutritionFacts'], 'date': time.strftime('%Y-%m-%d')}) + '\n'); out.flush(); print('ok', a.get('name'))
    time.sleep(2.5)
