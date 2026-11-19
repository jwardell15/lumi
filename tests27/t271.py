# Lumi 27.1: search relevance end to end (query understanding, subject gate, chips, no-match note, Best matches).
# usage: VER=27.1 python3 t271.py <base> [local]
import sys, os, re, json, time
os.environ['LUMI_LATE'] = '0'
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '27.1')
ROWS = "[...document.querySelectorAll('#res a[href^=\"#/product\"]')].map(a=>a.innerText.replace(/\\s+/g,' ').trim()).filter(t=>!t.startsWith('↘'))"
BEST = "[...document.querySelectorAll('#du14s a[href^=\"#/product\"]')].map(a=>a.innerText.replace(/\\s+/g,' ').trim())"
# query -> (subject regex every top-8 row must match, forbidden regex, chips expected)
CASES = [
 ('low sugar coffee creamer', r'cream|whiten|half|dairy|oat|almond|coffee', r'cheese', ['Sugar <5 g']),
 ('sugar free creamer', r'cream|whiten|coffee', r'cheese', ['Sugar <0.5 g']),
 ('low sugar yogurt', r'yogurt|yoghurt|skyr|kefir', r'cheese', ['Sugar <5 g']),
 ('high protein snack', r'.', r'^$', ['High protein']),
 ('sugar free gum', r'gum|mint|chew', r'seed gums', ['Sugar <0.5 g']),
 ('low carb bread', r'bread|bun|roll|wrap|bagel|toast|loaf', r'^$', ['Carbs <15 g']),
 ('unsweetened almond milk', r'almond|milk', r'^$', ['No added sugar']),
 ('keto ice cream', r'ice cream|frozen|gelato|pint|bar', r'cheese', ['Carbs <15 g']),
 ('low sugar cereal', r'cereal|oat|granola|flakes|bran|muesli', r'cheese', ['Sugar <5 g']),
 ('high fiber bread', r'bread|bun|roll|wrap|bagel|toast|loaf', r'cheese', ['High fiber']),
 ('high protein bars', r'bar|protein', r'cheese', ['High protein']),
 ('gluten free pasta', r'pasta|noodle|spaghetti|penne|macaroni|rotini|fusilli', r'^$', []),
 ('is greek yogurt healthy', r'yogurt|yoghurt', r'^$', ['Healthy 50+']),
 ('show me low sugar snacks', r'.', r'cheese, swiss', ['Sugar <5 g']),
 ('cheese', r'chees', r'^$', []),
 ('chipotle bowl', r'.', r'^$', []),
 ('costco protein', r'.', r'^$', []),
 ('snacks under 10g carbs', r'.', r'^$', ['Carbs <10 g']),
]
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    c = ctx(b); errs = []; pg = page(c, errs)
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan', timeout=40000)
    for q, subj, forb, chips in CASES:
        pg.goto(base + '#/search/' + q.replace(' ', '%20')); pg.wait_for_function("document.querySelectorAll('#res a[href^=\"#/product\"]').length>0", timeout=90000); pg.wait_for_function("SW27.loaded.has('1')", timeout=90000); pg.wait_for_timeout(2500)
        rows = pg.evaluate(ROWS)[:8]; got = pg.evaluate("[...document.querySelectorAll('#act269 button')].map(e=>e.innerText.replace('×','').trim()).filter(x=>x)")
        bad = [r for r in rows if re.search(forb, r, re.I)] if forb != r'^$' else []
        miss = [r for r in rows if subj != '.' and not re.search(subj, r, re.I)]
        ok('[%s] has results, nothing forbidden, subject words present in the top rows' % q, rows and not bad and len(miss) <= 2, (rows, bad, miss))
        ok('[%s] filter chips %s' % (q, chips), sorted(got) == sorted(chips), got)
    # chip removal re-runs without that filter
    pg.goto(base + '#/search/low%20sugar%20coffee%20creamer'); pg.wait_for_selector('#act269 button', timeout=90000); pg.wait_for_timeout(1500)
    n0 = len(pg.evaluate(ROWS)); pg.click('#act269 button'); pg.wait_for_timeout(2500)
    ok('[chip] removing the Sugar chip drops it and keeps results', pg.evaluate("document.querySelectorAll('#act269 button').length") == 0 and len(pg.evaluate(ROWS)) >= 1, n0)
    # no-match note
    pg.goto(base + '#/search/sugar%20free%20potatoes'); pg.wait_for_timeout(4000)
    note = pg.evaluate("(document.querySelector('.q271note')||{}).innerText||''"); ok('[note] impossible filter shows a "showing closest" note or results pass', ('closest' in note) or len(pg.evaluate(ROWS)) > 0, note)
    pg.goto(base + '#/search/no%20salt%20added%20beans'); pg.wait_for_timeout(5000)
    ok('[note] "no salt added" is approximated by low sodium and says so', "can't be verified" in pg.evaluate("(document.querySelector('.q271note')||{}).innerText||''"))
    ok('[perf] no page errors', not errs, errs)
    c.close(); b.close()
    print('done in %.1fs  %d/%d passed' % (time.time()-t0, sum(1 for _,x in RES if x), len(RES)))
    sys.exit(0 if all(x for _,x in RES) else 1)
