"""Lumi 21.0: tag Kirkland Signature (Costco's own brand) products as Costco store brand when the brand or name says Kirkland
but the brand string wasn't a clean 'Kirkland...' (e.g. 'Costco Kirkland', 'Organic Kirkland', 'Kirklands', 'Kirckland Costco').
Only sets the existing Costco own-brand bit (2^1) in field 13 of index docs. Restaurant docs are skipped."""
import json, glob, re, sys
KIRK = re.compile(r"\bkirc?kland(?:'?s)?\b", re.I)
tot = 0
for f in sorted(glob.glob('data/index-*.json')):
    raw = open(f, encoding='utf-8').read(); x = json.loads(raw); n = 0
    for d in x['docs']:
        if str(d[0]).startswith(('r-', 'ms-')) or (len(d) > 7 and str(d[7] or '').startswith('rest')): continue
        if not (KIRK.search(str(d[2] or '')) or KIRK.search(str(d[1] or ''))): continue
        while len(d) < 14: d.append(None)
        sm = d[13] or 0
        if (sm // 2) % 2 == 1 or (sm // 2**27) % 2 == 1: continue
        d[13] = sm + 2; n += 1; print(f, d[0], d[1], '|', d[2])
    if n:
        open(f, 'w', encoding='utf-8').write(json.dumps(x, separators=(',', ':'), ensure_ascii=False)); tot += n
print('tagged', tot)
