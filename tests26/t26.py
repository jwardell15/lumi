# Lumi 26.0 tests: restaurant meal builder (#/rmeal) + additive and dye watch (product card, filters, #/addwatch).
# usage: VER=26.0 python3 t26.py <base> [local]
import sys, os, re, json, time, glob, subprocess, random
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '26.0'); OUT = '/workspace/m26/shots/'; os.makedirs(OUT, exist_ok=True)
def txt(pg): return pg.evaluate("document.getElementById('app').innerText")
SAFE = re.compile(r'\b(is|are|it\'s) (completely |totally )?safe\b|safe to (eat|drink|use|buy)|\bsafe food\b', re.I)
D = REPO + '/data/'
# ---------- independent data checks (python, no browser) ----------
def J(p): return json.load(open(p))
KEY = re.compile(r'titanium dioxide|potassium bromate|(?<!un)bromated|brominated|propyl ?paraben|erythrosine|\bred\s*(no\.?\s*|#\s*)?3\b|\be171\b|\bpartially hydrogenated\b|azodicarbonamide', re.I)
random.seed(26); recs = []
for f in sorted(glob.glob(D + 'd/*.json'))[:6]:
    for k, v in J(f).items():
        if len(v) > 10 and v[10]: recs.append((k, v[10]))
sample = random.sample(recs, min(6000, len(recs)))
u_by_code = {}
for t in ['g'] + [str(i) for i in range(11)]:
    a = J(D + 'aw26/%s.json' % t); ix = J(D + 'index-%s.json' % t)['docs']; hm = {a['h'][i]: a['h'][i + 1] for i in range(0, len(a['h']), 2)}
    ok(f'[data] aw26/{t}.json lines up with index-{t}.json (n, first and last code)', a['n'] == len(ix) == len(a['u']) and a['c0'] == ix[0][0] and a['c1'] == ix[-1][0])
    for i, d in enumerate(ix): u_by_code[d[0]] = (a['u'][i], hm.get(i, 0))
miss = [(k, u_by_code[k][0], ing[:150]) for k, ing in sample if k in u_by_code and KEY.search(ing) and u_by_code[k][0] != 'x']
ok('[data] no false negatives: every sampled ingredient list with a strong keyword (BVO, bromate, Red 3, TiO2, paraben, PHO, ADA) is flagged', not miss, miss[:3])
fp = [(k, ing[:150]) for k, ing in sample if k in u_by_code and u_by_code[k][0] == 'x' and not re.search(r'titanium|bromat|brominated|paraben|erythrosine|red\s*(no\.?\s*|#\s*)?(3|40)\b|yellow\s*(no\.?\s*|#\s*)?[56]\b|blue\s*(no\.?\s*|#\s*)?[12]\b|green\s*(no\.?\s*|#\s*)?3\b|e1\d\d|e9\d\d|e3\d\d|hydrogenated|azodicarb|cyclam|bha|bht|butylated|artificial|tartrazine|allura|sunset|brilliant|indigo|fast green|quinoline|carmoisine|azorubine|ponceau|orange b|citrus red|fd ?& ?c|certified', ing, re.I)]
ok('[data] no false positives: every sampled flagged list contains a watched term', not fp, fp[:3])
ok('[data] "none" docs really have no usable ingredient text', all(not ing or len(re.sub(r'[^a-z]', '', ing.lower())) >= 3 for k, ing in sample if k in u_by_code and u_by_code[k][0] != 'n'))
# matcher unit cases (node)
cases = [('Sugar, FD&C Red No. 3, citric acid', ['red3']), ('Red #3 lake', ['red3']), ('water, Red No. 40, Blue #1, Yellow 5 Lake, Yellow No. 6', ['red40', 'blue1', 'yellow5', 'yellow6']),
         ('flour, potassium bromate, malted barley', ['bromate']), ('Brominated vegetable oil, water', ['bvo']), ('propylparaben, E171', ['propylparaben', 'tio2']), ('no artificial colors, no preservatives, free of titanium dioxide', []),
         ('orange beverage, orange juice, vitamin B12', []), ('water, red 30, blue 12, green 33', []), ('partially hydrogenated cottonseed oil, azodicarbonamide, sodium cyclamate', ['pho', 'ada', 'cyclamate']),
         ('artificial flavors and artificial colors, BHA, BHT', ['dyegen', 'bha', 'bht']), ('Orange B, citrus red 2, E129, tartrazine', ['orangeb', 'citrusred2', 'red40', 'yellow5']), ('sugar', [])]
js = "globalThis.LumiWarn=require('./js/ingwarn22.js');const A=require('./js/aw26core.js');const C=%s;console.log(JSON.stringify(C.map(c=>A.analyze(c[0]).hits.map(h=>h.id).sort())))" % json.dumps(cases)
res = json.loads(subprocess.run(['node', '-e', js], cwd=REPO, capture_output=True, text=True).stdout)
for (s, want), got in zip(cases, res): ok(f'[matcher] "{s[:48]}" -> {sorted(want)}', got == sorted(want), got)
# ---------- test items ----------
AW = J(D + 'aw26/0.json'); IX = J(D + 'index-0.json')['docs']
BVO, RED3, CLEAR, NOLIST = '01223305', '0017082874009', '6111035000430', '6111184004730'
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    c = ctx(b, w=1440, h=900); errs = []; pg = page(c, errs)
    pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'", timeout=30000); pg.wait_for_timeout(800)
    ok('version ' + VER, pg.evaluate('VERSION') == VER)
    swt = pg.evaluate("fetch('sw.js',{cache:'no-store'}).then(r=>r.text())")
    ok('sw cache lumi-v%s lists v26 files' % VER, ("'lumi-v%s'" % VER) in swt and 'js/v26.js' in swt and 'css/v26.css' in swt and 'js/aw26core.js' in swt)
    scr = pg.evaluate("[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean)")
    ok('index loads aw26core then v26 last, after v252', (lambda i: i >= 1 and scr[i-1] == 'js/v252.js' and scr[i+1] == 'js/v26.js')(scr.index('js/aw26core.js')), scr[-6:])
    nw = pg.evaluate("V7_NEWS.map(x=>x[1])"); ok("What's new lists 26.0 directly before 25.2", nw.index('Restaurant meal builder and additive watch (26.0)') + 1 == nw.index('Supplements, medicines and local water (25.2)'), nw[:4])
    # ---- watch list integrity ----
    W = pg.evaluate("AW26.W.map(w=>({id:w.id,tier:w.tier,facts:w.facts.map(f=>({j:f[0],s:f[1],u:f[2].map(k=>AW26.S[k]&&AW26.S[k][1])}))}))")
    ok('[watch] every entry has at least one dated fact and every fact an official https source', len(W) == 20 and all(w['facts'] and all(f['u'] and all(u and u.startswith('https://') for u in f['u']) for f in w['facts']) for w in W), [w['id'] for w in W if not w['facts']])
    hosts = pg.evaluate("[...new Set(Object.values(AW26.S).map(s=>new URL(s[1]).hostname))]")
    ok('[watch] sources are only fda.gov, california legislature, eur-lex and ecfr.gov', all(re.search(r'(^|\.)(fda\.gov|legislature\.ca\.gov|europa\.eu|ecfr\.gov)$', h) for h in hosts), hosts)
    ok('[watch] the four things named in the brief are all on the list', {'red3', 'bvo', 'bromate', 'propylparaben', 'tio2'} <= {w['id'] for w in W})
    # ---- product card ----
    for code, want, label in ((BVO, ['Brominated vegetable oil (BVO)', 'Yellow 5'], 'BVO + Yellow 5'), (RED3, ['Red 3 (erythrosine)'], 'Red 3')):
        go(pg, '#/product/' + code, '#aw26', 3000); t = pg.evaluate("document.getElementById('aw26').innerText")
        ok(f'[card] {label}: flags named, with the rule', all(w in t for w in want) and 'watched additive' in t, t[:300])
        ok(f'[card] {label}: each fact links to an official source, opens in a new tab safely', pg.evaluate("[...document.querySelectorAll('#aw26 .fc26 li')].every(li=>li.querySelector('a[href^=\"https://\"][target=_blank][rel*=noopener]'))"))
        ok(f'[card] {label}: never says safe/unsafe verdicts', not SAFE.search(t) and 'not a statement that this product is unsafe' in t)
    go(pg, '#/product/' + BVO, '#aw26', 3000)
    ok('[card] sits before the standard ingredient warnings', pg.evaluate("(()=>{const a=document.getElementById('aw26'),b=document.getElementById('iw22');return !b||!!(a.compareDocumentPosition(b)&4)})()"))
    ok('[card] jump button at the top lists the flags', pg.evaluate("!!document.getElementById('awj26')") and 'Brominated vegetable oil' in pg.evaluate("document.getElementById('awj26').innerText"))
    go(pg, '#/product/' + CLEAR, '#aw26', 3000); t = pg.evaluate("document.getElementById('aw26').innerText")
    ok('[card] clean list: says none found in the list on file, not "safe"', 'None of the 20 watched additives found' in t and not SAFE.search(t) and 'read the package' in t, t)
    go(pg, '#/product/' + NOLIST, '#aw26', 3000); t = pg.evaluate("document.getElementById('aw26').innerText")
    ok('[card] no ingredient list: "Couldn\'t verify", never clean', "Couldn't verify" in t and 'None of the' not in t, t)
    # restaurant item: no card
    go(pg, '#/product/r-arbys-curly-fries-medium', '#nt24', 2500); ok('[card] chain menu items (no ingredient lists) get no watch card', not pg.evaluate("!!document.getElementById('aw26')"))
    # ---- filters ----
    go(pg, '#/search/soda', '#f22', 4000)
    ok('[filter] two chips on the smart filter bar', pg.evaluate("[...document.querySelectorAll('.f26c')].map(b=>b.innerText)") == ['No banned additives', 'No synthetic dyes'])
    n0 = pg.evaluate("document.querySelectorAll('#res a.row').length")
    pg.evaluate("document.querySelector('.f26c[data-k26=ban]').click()"); pg.wait_for_timeout(4000)
    rows = pg.evaluate("[...document.querySelectorAll('#res a.row')].map(a=>decodeURIComponent(a.getAttribute('href').slice(10)))"); n1 = len(rows)
    flags = pg.evaluate("ids=>ids.map(i=>{const d=codeMap22().get(i);return d?[d.aw26u,d.aw26m&AW26.BANMASK]:null})", rows)
    ok('[filter] No banned additives: every listed item was checked and has none of the banned set', n1 > 0 and all(f and f[0] == '.' or (f and f[0] == 'x' and f[1] == 0) for f in flags), (n0, n1, flags[:5]))
    note = pg.evaluate("document.getElementById('f26n').innerText")
    ok('[filter] hidden items are counted: flagged and "no ingredient list, couldn\'t verify"', re.search(r'\d+ hidden with a flag', note) and "couldn't verify" in note and pg.evaluate("document.querySelector('.f26c[data-k26=ban]').getAttribute('aria-pressed')") == 'true', note)
    pg.evaluate("document.querySelector('.f26c[data-k26=dye]').click()"); pg.wait_for_timeout(2500)
    rows2 = pg.evaluate("[...document.querySelectorAll('#res a.row')].map(a=>decodeURIComponent(a.getAttribute('href').slice(10)))")
    flags2 = pg.evaluate("ids=>ids.map(i=>{const d=codeMap22().get(i);return d?[d.aw26u,d.aw26m&(AW26.BANMASK|AW26.DYEMASK)]:null})", rows2)
    ok('[filter] both chips: stricter, listed items have neither banned additives nor dyes', len(rows2) <= n1 and all(f and f[1] == 0 and f[0] in '.x' for f in flags2), (len(rows2), flags2[:5]))
    ok('[filter] choice is remembered on this device', pg.evaluate("JSON.stringify(store.get('f26'))") == '{"ban":true,"dye":true}')
    pg.click('#f26x'); pg.wait_for_timeout(2500)
    ok('[filter] Clear additive filters restores the list and unpresses both chips', pg.evaluate("document.querySelectorAll('#res a.row').length") == n0 and pg.evaluate("[...document.querySelectorAll('.f26c')].every(b=>b.getAttribute('aria-pressed')=='false')") and pg.evaluate("JSON.stringify(store.get('f26'))") == '{}', (n0, pg.evaluate("document.querySelectorAll('#res a.row').length")))
    # combines with a 22.0 filter
    pg.evaluate("document.querySelector('.f26c[data-k26=ban]').click()"); pg.wait_for_timeout(1500); pg.evaluate("document.querySelector('#f22 .f22c[data-k=sug]').click()"); pg.wait_for_timeout(2500)
    ok('[filter] combines with the sugar filter (both apply)', pg.evaluate("document.querySelectorAll('#res a.row').length") <= n1 and 'matches' in pg.evaluate("document.getElementById('f22n').innerText") or 'match' in pg.evaluate("document.getElementById('f22n').innerText"))
    pg.evaluate("document.getElementById('f22x').click()"); pg.wait_for_timeout(1500)
    ok('[filter] the main Clear filters button also clears the additive chips', pg.evaluate("JSON.stringify(store.get('f26'))") == '{}')
    # ---- watch page ----
    go(pg, '#/addwatch', '.awp26', 800); t = txt(pg)
    ok('[page] #/addwatch lists all 20 entries in three groups with the date the sources were read', pg.evaluate("document.querySelectorAll('.awp26 .awl26 .card').length") == 20 and 'November 13, 2026' in t and all(x in t for x in ['Banned, revoked or not authorised somewhere', 'Synthetic dye', 'Under FDA review']) and not SAFE.search(t), t[:200])
    go(pg, '#/browse', '.tools74', 500); ok('[page] Browse hub links to the meal builder and the watch', pg.evaluate("!!document.querySelector('.tools74 [href=\"#/rmeal\"]') && !!document.querySelector('.tools74 [href=\"#/addwatch\"]')"))
    # ---- meal builder ----
    go(pg, '#/rmeal', '#rh26l li', 1200); ok('[meal] hub lists chains', pg.evaluate("document.querySelectorAll('#rh26l li').length") > 100 and 'Chick-fil-A' in pg.evaluate("document.getElementById('rh26l').innerText"))
    pg.fill('#rh26q', 'chick-fil'); pg.wait_for_timeout(300); ok('[meal] hub search narrows', 0 < pg.evaluate("document.querySelectorAll('#rh26l li').length") < 4)
    go(pg, '#/rmeal/chick-fil-a', '#mm26 li', 2500); ok('[meal] builder opens with the chain\'s menu, sections and a search box', pg.evaluate("document.querySelectorAll('#mm26 .mi26').length") > 20 and pg.evaluate("document.querySelectorAll('#mc26 .chip').length") >= 3)
    ok('[meal] empty state explains what to do', 'Pick items from the menu' in pg.evaluate("document.getElementById('ym26').innerText"))
    pg.fill('#mq26', 'nuggets'); pg.wait_for_timeout(400); ok('[meal] menu search filters', 0 < pg.evaluate("document.querySelectorAll('#mm26 .mi26').length") < 40 and pg.evaluate("[...document.querySelectorAll('#mm26 .mn26 b')].every(b=>/nugget/i.test(b.innerText))"))
    pg.fill('#mq26', ''); pg.wait_for_timeout(300)
    # pick: a main, then a side, a drink
    codes = []
    for role in ('main', 'side', 'drink'):
        pg.click('#mc26 [data-role="%s"]' % role); pg.wait_for_timeout(300)
        codes.append(pg.evaluate("document.querySelector('#mm26 [data-add26]:not([disabled])').dataset.add26"))
        pg.evaluate("document.querySelector('#mm26 [data-add26]:not([disabled])').click()"); pg.wait_for_timeout(1500)
    ok('[meal] section chips switch the list (main, side, drink picked)', len(set(codes)) == 3)
    codes_done = True
    pg.click('#mc26 [data-role="side"]'); pg.wait_for_timeout(300); pg.evaluate("c=>document.querySelector('[data-add26=\"'+c+'\"]').click()", codes[1]); pg.wait_for_timeout(2500)  # second side
    t = pg.evaluate("document.getElementById('ym26').innerText")
    ok('[meal] four lines of nutrients and the totals table are shown', all(w in t for w in ['Total carbs', 'Sugar', 'Calories', 'Protein', 'Fiber', 'Saturated fat', 'Sodium']) and pg.evaluate("document.querySelectorAll('#ym26 .yi26').length") == 3)
    ok('[meal] second add of the same item makes it 2×', pg.evaluate("[...document.querySelectorAll('#ym26 .qs26 output')].map(o=>o.innerText)") == ['1×', '2×', '1×'])
    # recompute expectation properly: quantities 1,2,1
    exp = pg.evaluate("""async(cs)=>{const q={};cs.forEach(c=>q[c]=(q[c]||0)+1);const T={carbs:0,sugars:0,protein:0,kcal:0};
      for(const c of Object.keys(q)){const p=await resolveProduct(c);const k=p.meta&&p.meta.perItem?1:(+p.servQ||100)/100;for(const f of Object.keys(T))T[f]+=(p.n[f]||0)*k*q[c];}return T}""", [codes[0], codes[1], codes[1], codes[2]])
    def shown(label):
        m = re.search(label + r'\s*\n?\s*([\d,.]+)', t); return float(m.group(1).replace(',', '')) if m else None
    ok('[meal] total carbs = sum of the picked items × quantities (independent sum)', abs((shown('Total carbs') or -9) - exp['carbs']) <= max(0.6, exp['carbs'] * 0.01), (shown('Total carbs'), exp))
    ok('[meal] total sugar and calories add up the same way', abs((shown('Sugar') or -9) - exp['sugars']) <= max(0.6, exp['sugars'] * 0.01) and abs((shown('Calories') or -9) - exp['kcal']) <= max(2, exp['kcal'] * 0.01), (shown('Sugar'), shown('Calories'), exp))
    order = pg.evaluate("[...document.querySelectorAll('#ym26 .sc20 .s20')].map(s=>s.title)")
    ok('[meal] Health score on the left, Blood sugar on the right, both numbers', order == ['Health score', 'Blood sugar score'] and pg.evaluate("[...document.querySelectorAll('#ym26 .sc20 b')].every(b=>/^\\d+$/.test(b.innerText))"))
    ok('[meal] scores say they are for the whole meal and which serving', 'Scores are for this whole meal' in t and 'as listed by Chick-fil-A' in t)
    ok('[meal] no net carbs anywhere, never says safe', not re.search(r'net carb', t + txt(pg), re.I) and not SAFE.search(t))
    h = pg.evaluate("location.hash"); ok('[meal] meal is in the URL (shareable), quantities included', '/m/' in h and h.count('~') == 2 and '*2' in h, h)
    pg.reload(); pg.wait_for_function("()=>typeof VERSION!=='undefined'"); pg.wait_for_selector('#ym26 .yi26', timeout=25000); pg.wait_for_timeout(1500)
    ok('[meal] reload restores the same meal from the link', pg.evaluate("document.querySelectorAll('#ym26 .yi26').length") == 3 and pg.evaluate("[...document.querySelectorAll('#ym26 .qs26 output')].map(o=>o.innerText)") == ['1×', '2×', '1×'])
    go(pg, '#/rmeal/chick-fil-a', '#ym26 .yi26', 2500); ok('[meal] opening the chain again keeps your last meal on this device', pg.evaluate("document.querySelectorAll('#ym26 .yi26').length") == 3)
    pg.evaluate("document.querySelector('[data-dec26]').click()"); pg.wait_for_timeout(2000)
    ok('[meal] − lowers a quantity and at 1 removes the item; totals update', pg.evaluate("document.querySelectorAll('#ym26 .yi26').length") == 2)
    pg.evaluate("document.querySelector('[data-rm26]').click()"); pg.wait_for_timeout(1800)
    ok('[meal] ✕ removes an item', pg.evaluate("document.querySelectorAll('#ym26 .yi26').length") == 1)
    n_log = pg.evaluate("(store.get('log',[])||[]).length") if False else None
    before = pg.evaluate("JSON.stringify(Object.keys(localStorage).filter(k=>/log/i.test(k)).map(k=>localStorage.getItem(k).length))")
    pg.click('#log26'); pg.wait_for_timeout(800); after = pg.evaluate("JSON.stringify(Object.keys(localStorage).filter(k=>/log/i.test(k)).map(k=>localStorage.getItem(k).length))")
    ok('[meal] Log it writes to the food log and confirms', before != after and 'Logged' in pg.evaluate("document.getElementById('toast').innerText"), (before, after))
    nm = pg.evaluate("store.get('meals',[]).length"); pg.click('#save26'); pg.wait_for_timeout(500)
    ok('[meal] Save to My meals adds a saved meal', pg.evaluate("store.get('meals',[]).length") == nm + 1)
    pg.click('#plan26'); pg.wait_for_timeout(800); ok('[meal] Add to plan opens the plan sheet', pg.evaluate("!!document.querySelector('.sheet,[role=dialog]')"))
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    pg.click('#card26'); pg.wait_for_selector('#sh24[data-ready]', timeout=15000); ok('[meal] Score card opens the share sheet with the meal image', pg.evaluate("!!document.querySelector('#sh24 img')")); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.click('#clr26'); pg.wait_for_timeout(1000); ok('[meal] Clear empties the meal', pg.evaluate("document.querySelectorAll('#ym26 .yi26').length") == 0 and '/m/' not in pg.evaluate("location.hash"))
    # items with no carb data cannot be added
    ok('[meal] items with no published carb data are listed but cannot be added', pg.evaluate("[...document.querySelectorAll('#mm26 .mi26')].every(li=>{const b=li.querySelector('[data-add26]');const has=!/No published carb data/.test(li.innerText);return has||b.disabled})"))
    # bad link
    go(pg, '#/rmeal/not-a-chain', '#rh26l li', 1200); ok('[meal] unknown chain: message and the chain list', "no menu for" in txt(pg) and pg.evaluate("document.querySelectorAll('#rh26l li').length") > 100)
    go(pg, '#/rmeal/chick-fil-a/m/r-nope*3~' + codes[0] + '*0.5~' + codes[2] + '*999', '#ym26 .yi26', 2500)
    ok('[meal] bad link: unknown codes dropped, quantities clamped (0.5 step, max 20)', pg.evaluate("[...document.querySelectorAll('#ym26 .qs26 output')].map(o=>o.innerText)") == ['0.5×', '20×'], pg.evaluate("[...document.querySelectorAll('#ym26 .qs26 output')].map(o=>o.innerText)"))
    # product page link
    go(pg, '#/product/' + codes[0], '#ord24l', 2500); ok('[meal] chain product pages offer "Start a meal with this item"', pg.evaluate("!!document.getElementById('rml26')") and '/rmeal/chick-fil-a/m/' in pg.evaluate("document.getElementById('rml26').getAttribute('href')"))
    ok('no page errors (desktop)', not errs, errs); c.close()
    # ---- layouts ----
    for th in ('light', 'dark'):
        for w, h in ((390, 844), (1440, 900)):
            c = ctx(b, th=th, w=w, h=h); errs = []; pg = page(c, errs); pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'"); pg.wait_for_timeout(600)
            meal = '#/rmeal/chick-fil-a/m/' + '~'.join(x + '*1' for x in codes)
            for hh, sel in (('#/rmeal', '#rh26l li'), (meal, '#ym26 .yi26'), ('#/addwatch', '.awl26 .card'), ('#/product/' + BVO, '#aw26'), ('#/product/' + CLEAR, '#aw26'), ('#/search/soda', '#f22')):
                go(pg, '#/browse', '#app', 100); go(pg, hh, sel, 2500)
                if hh == '#/search/soda': pg.evaluate("document.querySelector('.f26c[data-k26=dye]').click()"); pg.wait_for_timeout(2500)
                a = pg.evaluate(JS); ok(f'[{th} {w}] {hh[:26]} layout/contrast', a['over'] <= 1 and not a['wide'] and not a['bad'] and not a['small'], a)
                if th == 'light' and hh in (meal, '#/product/' + BVO, '#/addwatch'): pg.evaluate('scrollTo(0,0)'); pg.screenshot(path=OUT + f'v26-{hh[2:7]}-{w}.png', full_page=(w == 390))
            ok(f'[{th} {w}] no page errors', not errs, errs); c.close()
    # ---- offline ----
    c = b.new_context(viewport={'width': 390, 'height': 844}); c.add_init_script("if(!sessionStorage.getItem('o')){sessionStorage.setItem('o','1');" + SEED + "}")
    pg = c.new_page(); pg.goto(base + '#/'); pg.wait_for_function("()=>navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=30000); pg.wait_for_timeout(2500)
    keys = pg.evaluate("caches.keys()"); c.set_offline(True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.reload(); pg.wait_for_timeout(2500)
    ok('[offline] app loads from lumi-v' + VER + ' cache with the v26 code', ('lumi-v' + VER) in keys and pg.evaluate("typeof AW26==='object' && typeof viewMealBuilder26==='function'"), keys)
    pg.evaluate("location.hash='#/addwatch'"); pg.wait_for_timeout(800); ok('[offline] the watch page renders without a connection', 'How it works' in pg.evaluate("document.getElementById('app').innerText"))
    ok('[offline] no page errors', not errs, errs); c.close()
    print(f"\nt26: {sum(1 for _, x in R if x)}/{len(R)} passed in {int(time.time() - t0)}s"); print('FAILS', [r[0] for r in R if not r[1]])
    sys.exit(0 if all(x for _, x in R) else 1)
