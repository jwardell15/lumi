# Lumi 25.2 tests: supplements (NIH DSLD), OTC medicines (openFDA NDC + label), local water quality (EPA SDWIS + UCMR 5).
# usage: VER=25.2 python3 t252.py <base> [local]
# NIH/openFDA responses are mocked from saved real responses (t/fix) except the two checks tagged "live", which call the real APIs.
import sys, os, re, json, time, glob
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '25.2'); OUT = '/workspace/m25/shots/'; FIX = '/workspace/m25/t/fix/'
def txt(pg): return pg.evaluate("document.getElementById('app').innerText")
D = REPO + '/data/'
def J(p): return json.load(open(p))
def fx(n): return open(FIX + n).read()
# ---- test data from the real built files ----
best = {}
for f in sorted(glob.glob(D + 'water25/s-*.json')):
    st = os.path.basename(f)[2:4]
    for k, v in J(f).items():
        if not v.get('z'): continue
        if 'pf' not in best and v.get('nhv', 0) > 0 and any(x in v.get('pf', {}) and v['pf'][x][2] >= 0.004 for x in ('PFOA', 'PFOS')): best['pf'] = (st, k, v)
        if 'nopf' not in best and 'pfn' not in v and v.get('p', 0) > 3000: best['nopf'] = (st, k, v)
        if 'pbhi' not in best and v.get('pb') and float(v['pb'][1]) * (1000 if 'mg' in v['pb'][2].lower() else 1) > 15: best['pbhi'] = (st, k, v)
        if 'nopfdet' not in best and v.get('pfn') and not v.get('pf'): best['nopfdet'] = (st, k, v)
        if 'nolead' not in best and not v.get('pb') and v.get('p', 0) > 3000: best['nolead'] = (st, k, v)
MN = J(D + 'water25/s-MN.json'); AV = MN['MN1190001']
OIDX = J(D + 'otc25/index.json'); U = J(D + 'recalls25/u.json')['u']; ND = {k[1:] for k in U if k.startswith('N')}
rec_otc = None
for f in sorted(glob.glob(D + 'otc25/n-*.json')):
    for r in J(f):
        if any(n in ND for n in r[6]): rec_otc = (os.path.basename(f)[2], r); break
    if rec_otc: break
upc_otc = next(k for k, v in OIDX['u'].items() if len(k) == 12 and v[0] == 'c'); sh_otc, sid_otc = OIDX['u'][upc_otc]
ibu = [r for r in J(D + 'otc25/n-i.json') if re.search(r'ibuprofen', (r[1] + ' ' + r[2] + ' ' + r[3]).lower())]
CORS = {'access-control-allow-origin': '*', 'content-type': 'application/json'}
def mock(pg, dsld=True, fda='ok', log=None):
    def h_dsld(rt):
        u = rt.request.url
        if log is not None: log.append(u)
        if not dsld: return rt.abort()
        if '/label/317045' in u: return rt.fulfill(status=200, headers=CORS, body=fx('dsld_label_gummy.json'))
        if '/label/999001' in u: return rt.fulfill(status=200, headers=CORS, body=fx('dsld_label_capsule.json'))
        if '/browse-products' in u: return rt.fulfill(status=200, headers=CORS, body=fx('dsld_search_gummy.json'))
        if '/search-filter' in u: return rt.fulfill(status=200, headers=CORS, body=fx('dsld_upc.json') if '33674' in u else json.dumps({'hits': []}))
        return rt.fulfill(status=404, headers=CORS, body='{}')
    def h_fda(rt):
        if log is not None: log.append(rt.request.url)
        if fda == 'fail': return rt.abort()
        return rt.fulfill(status=200, headers=CORS, body=fx('fda_label_sweet.json'))
    pg.route(re.compile(r'https://api\.ods\.od\.nih\.gov/.*'), h_dsld); pg.route(re.compile(r'https://api\.fda\.gov/.*'), h_fda)
SAFE = re.compile(r'\b(is|are|it\'s|water is|looks) safe\b|safe to (drink|use|take|buy)', re.I)
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    c = ctx(b, w=1440, h=900); errs = []; pg = page(c, errs); calls = []; mock(pg, log=calls)
    pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'", timeout=30000); pg.wait_for_timeout(800)
    ok('version ' + VER, pg.evaluate('VERSION') == VER)
    swt = pg.evaluate("fetch('sw.js',{cache:'no-store'}).then(r=>r.text())")
    ok('sw cache lumi-v%s lists v252 files' % VER, ("'lumi-v%s'" % VER) in swt and 'js/v252.js' in swt and 'css/v252.css' in swt)
    scr = pg.evaluate("[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean)")
    ok('index loads v252 last, after v251 and v25', scr[scr.index('js/v25.js'):scr.index('js/v25.js')+3] == ['js/v25.js', 'js/v251.js', 'js/v252.js'], scr[-4:])
    ok("What's new lists 25.2, 25.1, 25.0", (lambda N: N.index('Supplements, medicines and local water (25.2)') + 1 == N.index('Laundry, cleaners and recalls (25.1)') and N.index('Laundry, cleaners and recalls (25.1)') + 1 == N.index('Home & Body (25.0)'))(pg.evaluate("V7_NEWS.map(n=>n[1])")))
    go(pg, '#/browse', '.hbbr25', 1200)
    r = pg.evaluate("()=>({feat:[...document.querySelectorAll('.fg181 .st181 .m181')].map(a=>a.getAttribute('href')), hb:[...document.querySelectorAll('.hbbr25 a')].map(a=>a.getAttribute('href'))})")
    ok('[browse] Costco + Whole Foods pinned; Home & Body links to water, supplements, medicines (and 25.1 links kept)', set(r['feat']) == {'#/store/wholefoods', '#/store/costco'} and all(x in r['hb'] for x in ('#/water', '#/supp', '#/otc', '#/recalls', '#/hb/laundry')), r)
    # ================= water =================
    go(pg, '#/water', '#wz252', 600); t = txt(pg)
    ok('[water] home: ZIP box, name search, what-this-isnt card, sources', pg.evaluate("!!document.querySelector('#wz252')&&!!document.querySelector('#wnf')") and "not a test of your tap" in t and 'EPA' in t, t[:200])
    pg.fill('#wz252', '123'); pg.click('#wzf button'); pg.wait_for_timeout(300)
    ok('[water] bad ZIP is rejected without navigating', '#/water/zip' not in pg.evaluate('location.hash') and 'Enter a 5-digit' in txt(pg))
    pg.fill('#wz252', '55124'); pg.click('#wzf button'); pg.wait_for_selector('.wl252 .wr252', timeout=20000); pg.wait_for_timeout(500); t = txt(pg)
    ok('[water] ZIP 55124 lists Apple Valley with people served and violation text from data', ('Apple Valley' in t and '50,300' in t and 'No health-based violations since 2016' in t), t[:400])
    pg.click('.wr252 a'); pg.wait_for_selector('.wh2c252', timeout=20000); pg.wait_for_timeout(500); t = txt(pg)
    ok('[water] system page: from the data (no violations, lead 0, PFAS table)', pg.evaluate('location.hash') == '#/water/MN/MN1190001' and 'No health-based violations' in t and re.search(r'Lead:.*90th-percentile result\s+0 µg/L', t) and 'PFBA' in t and '28 ppt' in t and 'PFHxS' in t and '3.1 ppt' in t, t[:900])
    ok('[water] PFHxS shown as proposed-to-rescind, not a final limit; no EPA limit for PFBA', 'Was 10 ppt; EPA proposes to rescind' in t and 'No EPA limit' in t)
    ok('[water] says not tap water / screening, never "safe"', 'not at a tap' in t and not SAFE.search(t), SAFE.search(t))
    # a system with PFOS >= 4 ppt and violations
    st, pid, S = best['pf']; z = S['z'][0]
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/zip/' + z, '.wl252 .wr252', 900); t = txt(pg)
    ok('[water] ZIP list flags PFOA/PFOS at or above 4 ppt and violation count', S['n'] in t and re.search(r'PFOS|PFOA', t) and ('%d health-based violation' % S['nhv']) in t, (S['n'], z, t[:300]))
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/%s/%s' % (st, pid), '.wh2c252', 1000); t = txt(pg)
    nrow = pg.evaluate("document.querySelectorAll('.hv252').length")
    ok('[water] violations page: rows = min(count,30) and count in header', nrow == min(S['nhv'], 30) and ('%d health-based violation' % S['nhv']) in t, (nrow, S['nhv']))
    ok('[water] PFOS result compared with 4 ppt limit ("at or above it") and the average caveat', 'Limit 4 ppt: highest result is at or above it' in t and 'running yearly average' in t, t[-1500:])
    ok('[water] PFAS compliance extension / rescission shown as proposed, not final', 'aren\'t final' in t and '2031' in t)
    st, pid, S = best['pbhi']
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/%s/%s' % (st, pid), '.wh2c252', 800); t = txt(pg)
    ok('[water] lead above 15 µg/L says above the action level', 'above the action level' in t, t[:600])
    st, pid, S = best['nopf']
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/%s/%s' % (st, pid), '.wh2c252', 800); t = txt(pg)
    ok('[water] no UCMR 5 data: "Couldn\'t verify", not "none"', "Couldn't verify" in t and 'doesn\'t mean none' in t, t[-900:])
    st, pid, S = best['nopfdet']
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/%s/%s' % (st, pid), '.wh2c252', 800); t = txt(pg)
    ok('[water] tested but nothing detected: "No PFAS found above the reporting levels" with the count', 'No PFAS found above the reporting levels' in t and ('in %d result' % S['pfn']) in t, t[-900:])
    st, pid, S = best['nolead']
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/%s/%s' % (st, pid), '.wh2c252', 800); t = txt(pg)
    ok('[water] no lead result: couldn\'t verify', re.search(r"Lead and copper\s+Couldn't verify", t), t[:700])
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/zip/00001', '#wres252 .card', 900); t = txt(pg)
    ok('[water] unknown ZIP: says it does not mean there is no water', "doesn't mean there's no water service" in t, t[:300])
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/find/MN/apple%20valley', '.wl252 .wr252', 900); t = txt(pg)
    ok('[water] find by name (Minnesota: apple valley)', 'Apple Valley' in t and 'Minnesota' in t, t[:300])
    go(pg, '#/browse', '#app', 200); go(pg, '#/water/MN/ZZ0000000', '.card.empty', 600)
    ok('[water] unknown system id: friendly message', "isn't in Lumi's water data" in txt(pg))
    # ================= supplements (mocked NIH) =================
    calls.clear(); go(pg, '#/browse', '#app', 200); go(pg, '#/supp/gummy', '#sl252 li', 1000); t = txt(pg)
    sj = json.loads(fx('dsld_search_gummy.json'))
    ok('[supp] search shows NIH hits with the total, brand and serving', ('%d label' % sj['total']['value']) in t and 'Gummy' in t and 'serving' in t and any('browse-products' in u and 'q=gummy' in u for u in calls), (t[:300], calls[:3]))
    ok('[supp] each hit links to #/supp/<id>', pg.evaluate("[...document.querySelectorAll('#sl252 a')].every(a=>/^#\\/supp\\/\\d+$/.test(a.getAttribute('href')))"))
    go(pg, '#/browse', '#app', 200); go(pg, '#/supp/317045', '.ss252', 1200); t = txt(pg)
    ok('[supp] per-serving line shows the serving', 'Per serving: 1 gummy' in t and 'Children 2-5' in t, t[:400])
    rows = pg.evaluate("[...document.querySelectorAll('.tb252 tbody tr')].slice(0,5).map(r=>r.innerText.replace(/\\s+/g,' ').trim())")
    ok('[supp] sugar first, then total carbohydrate (no net carbs): sugars 1 g, added 1 g, total carbs 2 g, calories 10', rows[0].startswith('Sugars 1 g') and rows[1].startswith('Added sugars 1 g') and rows[2].startswith('Total carbohydrate 2 g') and rows[4].startswith('Calories 10') and not re.search(r'net carb', t, re.I), rows)
    sc = pg.evaluate("[...document.querySelectorAll('.ss252 .s20')].map(s=>[s.querySelector('small').innerText,s.querySelector('b').innerText])")
    eng = pg.evaluate("""()=>{ const p={id:'x',code:'',src:'dsld',name:'t',brand:'b',servQ:100,serv:'1 serving',nova:null,additives:[],ing:'Cane Sugar, Tapioca Syrup, Water, Purified, Pectin, Natural Flavors, Sodium Citrate, Citric Acid, Maltodextrin, Coconut Oil, Beeswax',cat:'Supplement',cats:'',naLabel:true,liquid:false,portions:[['1 serving',100]],meta:{src:'NIH DSLD',perItem:true},n:{kcal:10,carbs:2,sugars:1,added:1,fiber:null,fat:null,sat:null,protein:null,sodiumMg:5}}; return [HR(p).score, S.score(p).score]; }""")
    ok('[supp] Health LEFT, Blood sugar RIGHT, equal to Lumi\'s food scores for these per-serving numbers', sc[0][0] == 'Health' and sc[1][0] == 'Blood sugar' and [int(sc[0][1]), int(sc[1][1])] == eng, (sc, eng))
    ok('[supp] hidden sugars count (3 kinds) and the ingredient-warnings card', '3 kinds of sugar' in t and 'tapioca syrup' in t and 'Ingredient warnings' in t, t[600:1100])
    ok('[supp] recall check ran (no recall found wording) and supplement facts + source', "No recall found for this product" in t and 'Supplement Facts as printed' in t and 'Vitamin C' in t and 'DSLD' in t)
    ok('[supp] no dosing advice: disclaimer present, no directions/dose wording', 'Not dosing advice' in t and not re.search(r'directions|take \d|recommended dose|dosage', t, re.I), t[-700:])
    ok('[supp] never says safe', not SAFE.search(t))
    go(pg, '#/browse', '#app', 200); go(pg, '#/supp/999001', '.ss252', 1200); t = txt(pg)
    sc = pg.evaluate("[...document.querySelectorAll('.ss252 .s20 b')].map(b=>b.innerText)")
    ok('[supp] capsule with no carbs/sugar/calories: scores "?" and "Couldn\'t score", "No added sugars found"', sc == ['?', '?'] and "Couldn't score" in t and 'No added sugars found' in t and "Couldn't verify: the label doesn't list sugar" in t, (sc, t[:700]))
    # barcode chain (food -> Home & Body -> OTC list -> NIH)
    calls.clear(); go(pg, '#/browse', '#app', 200); go(pg, '#/product/033674136768', '.spg252 h1', 2500); t = txt(pg)
    ok('[scan] unknown barcode falls through to the NIH supplement label (UPC verified on the label)', 'Sambucus Kids' in t and any('search-filter' in u for u in calls) and any('/label/317045' in u for u in calls), (t[:200], calls))
    go(pg, '#/browse', '#app', 200); go(pg, '#/product/0000000000017', '.card.empty', 3500); t = txt(pg)
    ok('[scan] barcode in no source: still the not-found message', 'not found' in t.lower() or "isn't" in t.lower(), t[:200])
    # NIH down
    c2 = ctx(b, w=1440, h=900); e2 = []; p2 = page(c2, e2); mock(p2, dsld=False); p2.goto(base + '#/'); p2.wait_for_function("()=>typeof VERSION!=='undefined'"); p2.wait_for_timeout(500)
    go(p2, '#/supp/317045', '.card.empty', 800); t2 = txt(p2)
    ok("[supp] NIH unreachable: clear message with Retry, no crash", "didn't answer" in t2 and p2.evaluate("!!document.querySelector('.card.empty .btn.pri')"), t2[:300])
    go(p2, '#/supp/gummy', '#sn252', 1500); t2 = txt(p2)
    ok("[supp] NIH unreachable in search: message and Try again button", "Couldn't reach the NIH database" in t2 and p2.evaluate("!!document.querySelector('#sre252')"), t2[:300])
    ok('[supp] failures cause no page errors', not e2, e2); c2.close()
    # ================= OTC =================
    go(pg, '#/browse', '#app', 200); go(pg, '#/otc/ibuprofen', '#ol252 li', 1000); t = txt(pg)
    nshown = int(re.sub(r'\D', '', pg.evaluate("document.getElementById('on252').innerText").split(' ')[0]))
    ok('[otc] search count equals the data (all ibuprofen products from the NDC list)', nshown == len(ibu) and nshown > 100, (nshown, len(ibu)))
    ok('[otc] results link to #/otc/<letter>/<setid>', pg.evaluate("[...document.querySelectorAll('#ol252 a')].every(a=>/^#\\/otc\\/[0-9a-z]\\/[0-9a-f-]{36}$/.test(a.getAttribute('href')))"))
    pg.fill('#oq252', upc_otc); pg.wait_for_timeout(1200)
    ok('[otc] typing a barcode opens that product', ('#/otc/%s/%s' % (sh_otc, sid_otc)) == pg.evaluate('location.hash'), pg.evaluate('location.hash'))
    calls.clear(); go(pg, '#/browse', '#app', 200); go(pg, '#/otc/%s/%s' % (sh_otc, sid_otc), '#olab252 .card', 1500); t = txt(pg)
    ok('[otc] product page: active ingredient + purpose, inactive list; sugar/sweetener inactive ingredients counted (mocked label: sorbitol, sucralose, HFCS)', 'Acetaminophen 160 mg' in t and 'Purpose: Pain reliever' in t and '3 sugar or sweetener ingredients listed' in t and 'sorbitol' in t and 'sucralose' in t and 'high fructose corn syrup' in t, t[:900])
    ok('[otc] no dosing advice: label directions are not shown, disclaimer is', 'TEST-DOSE-TEXT' not in t and 'every 4 hours' not in t and 'Not dosing advice' in t and not re.search(r'\bdosage\b|how much to take', t.split('Not dosing advice')[0], re.I), t[:1500])
    ok('[otc] only the label ID is sent to openFDA', any('api.fda.gov' in u and 'spl_set_id' in u and 'limit=1' in u for u in calls), calls)
    ok('[otc] never says safe; recall check line present', not SAFE.search(t) and 'No recall found for this product' in t)
    sh, rr = rec_otc; sid = rr[0]
    go(pg, '#/browse', '#app', 200); go(pg, '#/otc/%s/%s' % (sh, sid), '.rcall251', 2500); t = txt(pg)
    ok('[otc] NDC on an FDA drug recall: strong "Recall: this barcode is on a recall notice" with the official notice link', 'Recall: this barcode is on a recall notice' in t and pg.evaluate("[...document.querySelectorAll('.rcall251 a')].some(a=>/accessdata\\.fda\\.gov|fda\\.gov/.test(a.href))"), (rr[1], rr[6], t[:500]))
    go(pg, '#/browse', '#app', 200); go(pg, '#/product/' + upc_otc, '.opg252 h1', 3000)
    ok('[scan] a barcode only in the OTC list opens the medicine page', pg.evaluate("!!document.querySelector('.opg252 h1')") and pg.evaluate("document.querySelector('.opg252 h1').innerText").strip() != '', txt(pg)[:100])
    c3 = ctx(b, w=1440, h=900); e3 = []; p3 = page(c3, e3); mock(p3, fda='fail'); p3.goto(base + '#/'); p3.wait_for_function("()=>typeof VERSION!=='undefined'"); p3.wait_for_timeout(500)
    go(p3, '#/otc/%s/%s' % (sh_otc, sid_otc), '#olab252 .card', 1500); t3 = txt(p3)
    ok("[otc] openFDA down: \"Couldn't load the label ingredients\" with Try again; directory info still shown", "Couldn't load the label ingredients" in t3 and 'NDC' in t3 and p3.evaluate("!!document.querySelector('#olab252 .btn')"), t3[:400])
    ok('[otc] openFDA failure causes no page errors', not e3, e3); c3.close()
    # ================= privacy / disclaimer =================
    go(pg, '#/privacy', '.pg231', 300); t = txt(pg)
    ok('[privacy] lists NIH DSLD, openFDA drug label and EPA water files; updated date', 'NIH Dietary Supplement Label Database' in t and 'api.ods.od.nih.gov' in t and 'api.fda.gov' in t and 'EPA drinking water data' in t and 'you type a ZIP code' in t and 'Last updated Nov 13, 2026' in t, t[:100])
    go(pg, '#/disclaimer', '.pg231', 300); ok('[disclaimer] medicines, supplements and tap water card', 'Medicines, supplements and tap water' in txt(pg) and 'not dosing advice' in txt(pg))
    ok('no page errors (desktop)', not errs, errs); c.close()
    # ================= live APIs (the only two live checks) =================
    c = ctx(b, w=1440, h=900); errs = []; pg = page(c, errs); pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'"); pg.wait_for_timeout(500)
    go(pg, '#/supp/317045', '.ss252', 3000); t = txt(pg)
    ok('[live NIH] label 317045 renders from api.ods.od.nih.gov (CORS ok from the page)', 'Sambucus Kids' in t and 'Per serving' in t, t[:200])
    go(pg, '#/otc/%s/%s' % (sh_otc, sid_otc), '#olab252 .card', 3000); t = txt(pg)
    ok('[live openFDA] drug label loads from api.fda.gov (CORS ok from the page)', 'Active ingredient' in t and 'Inactive ingredients' in t, t[:300])
    ok('[live] no page errors', not errs, errs); c.close()
    # ================= layouts =================
    for th in ('light', 'dark'):
        for w, h in ((390, 844), (1440, 900)):
            c = ctx(b, th=th, w=w, h=h); errs = []; pg = page(c, errs); mock(pg); pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'"); pg.wait_for_timeout(600)
            for hh, sel in (('#/water', '#wz252'), ('#/water/zip/55124', '.wl252 .wr252'), ('#/water/MN/MN1190001', '.wh2c252'), ('#/water/%s/%s' % best['pf'][:2], '.hv252'), ('#/supp/gummy', '#sl252 li'), ('#/supp/317045', '.ss252'), ('#/supp/999001', '.ss252'), ('#/otc/ibuprofen', '#ol252 li'), ('#/otc/%s/%s' % (sh_otc, sid_otc), '#olab252 .card')):
                go(pg, '#/browse', '#app', 100); go(pg, hh, sel, 1500)
                a = pg.evaluate(JS); ok(f'[{th} {w}] {hh[:22]} layout/contrast', a['over'] <= 1 and not a['wide'] and not a['bad'] and not a['small'], a)
                if th == 'light' and hh in ('#/water/MN/MN1190001', '#/supp/317045', '#/otc/%s/%s' % (sh_otc, sid_otc)): pg.evaluate('scrollTo(0,0)'); pg.screenshot(path=OUT + f'v252-{hh[2:6]}-{w}.png', full_page=(w == 390))
            ok(f'[{th} {w}] no page errors', not errs, errs); c.close()
    print('\nTOTAL %d  FAILS %d  %.0fs' % (len(RES), sum(1 for r in RES if not r[1]), time.time() - t0)); print('FAILS', [r[0] for r in RES if not r[1]])
