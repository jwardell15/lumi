# Lumi 26.8: late bundle (feature modules load on idle after Home, or before the first non-Home route), gating, wrapper order, SW shell, offline, failure fallback, budgets.
# usage: VER=26.8 python3 t268.py <base> [local]
import sys, os, re, json, time, gzip
os.environ['LUMI_LATE'] = '0'  # see the real cold state (late bundle loads on idle)
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '26.8'); BUD = json.load(open(REPO + '/tests27/perf_budget.json')); BG = BUD.get(VER) or BUD[sorted(BUD)[-1]]
M = json.load(open(REPO + '/dist/manifest.json')); SW = open(REPO + '/sw.js').read(); SH = json.loads(re.search(r'const SHELL_H = (\{.*?\});', SW, re.S).group(1))
gz = lambda f: len(gzip.compress(open(REPO + '/' + f, 'rb').read(), 9)) / 1024
ok(f"[build] main bundle <= {BG['bundle_js_gz_kb']} KB gz ({gz(M['js']):.0f}); late bundle <= {BG['late_js_gz_kb']} KB gz ({gz(M['late']):.0f}); the late files keep their source order", gz(M['js']) <= BG['bundle_js_gz_kb'] and gz(M['late']) <= BG['late_js_gz_kb'] and M['lateFiles'] == [f for f in M['jsFiles'] if f in M['lateFiles']] and len(M['lateFiles']) >= 10)
ok('[build] the late bundle is in the service-worker shell manifest (hashed), manifest current', M['late'] in SH and M['js'] in SH)
ok('[build] ui27.js (the Home/Places/More layer) and its helpers are NOT late; hb/pets/kitchen/etc. modules are', 'js/ui27.js' not in M['lateFiles'] and 'js/v262.js' in M['lateFiles'] and 'js/v261.js' in M['lateFiles'] and 'js/v25.js' in M['lateFiles'] and 'js/v252.js' in M['lateFiles'])
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    # ---- A: cold Home: late bundle comes after Home is drawn
    c = ctx(b); errs = []; pg = page(c, errs); rq = []
    pg.on('request', lambda r: rq.append((time.time(), r.url)))
    pg.goto(base + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000); t_pk = time.time(); st = pg.evaluate("window.lateDone27")
    ok('[late] cold Home: picks are drawn before the late bundle has loaded', st is False, st)
    pg.wait_for_function("window.lateDone27===true", timeout=30000)
    lt = [t for t, u in rq if '/dist/late.' in u]
    ok('[late] the late bundle then loads by itself on idle (one request, after Home)', len(lt) == 1 and lt[0] >= t_pk - 0.05, (len(lt), lt and lt[0] - t_pk))
    ok('[late] Home content does not wait for it and nothing breaks: no page errors', not errs, errs)
    # after load: layer order, news, tabs
    r = pg.evaluate("({home:!!document.querySelector('.home27'),news:V7_NEWS[0][1],tab:tab19('kitchen',''),tabh:tab19('',''),tabp:tab19('product','x')})")
    ok('[late] after it loads Home is still the new Home, the 26.7 news entry is first, tabs map as before (kitchen -> More, product -> Search)', r['home'] and r['news'].startswith('A simpler Lumi') and r['tab'] == 'more' and r['tabh'] == 'home' and r['tabp'] == 'search', r)
    pg.goto(base + '#/'); pg.reload(); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_timeout(500)
    ok('[late] the new Home is drawn once (no duplicate build, no classic-home leftovers)', pg.evaluate("document.querySelectorAll('.home27').length===1&&!document.querySelector('.home74')"))
    c.close()
    # ---- B: deep link to a product waits for the late bundle, renders with every card
    c = ctx(b); errs = []; pg = page(c, errs)
    pg.goto(base + '#/product/0012546011099'); pg.wait_for_selector('#more27', timeout=60000, state='attached'); pg.wait_for_timeout(2500)
    ok('[gate] deep link to a product page: loads the late bundle first, then shows scores, additive watch and the dog-toxic card in More checks', pg.evaluate("window.lateDone27===true&&!!document.getElementById('hcard')&&!!document.getElementById('aw26')&&!!document.querySelector('#more27 #dog261')&&!!document.getElementById('dogj261')"))
    ok('[gate] no page errors on the deep link', not errs, errs)
    # Home -> search through the Home search box
    pg.goto(base + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000)
    pg.fill('#q', 'oats'); pg.keyboard.press('Enter'); pg.wait_for_selector('a.row', timeout=60000)
    ok('[gate] Home search box -> results page works (late bundle loaded on the way)', pg.evaluate("location.hash.startsWith('#/search/')&&window.lateDone27===true&&document.querySelectorAll('a.row').length>3"))
    # every route of the app that lives in the late modules
    bad = []
    for h in ['#/kitchen', '#/fish', '#/pesticides', '#/air', '#/pet', '#/pet/toxic', '#/hb', '#/recalls', '#/supp', '#/otc', '#/water', '#/rmeal', '#/addwatch', '#/plan', '#/order', '#/store/costco/aisles']:
        pg.goto(base + h); pg.wait_for_timeout(1500)
        try: pg.wait_for_function("document.getElementById('app').innerText.trim().length>=40", timeout=25000)
        except Exception: pass
        t = pg.evaluate("document.getElementById('app').innerText")
        if len(t.strip()) < 40 or 'undefined' in t or 'NaN' in t: bad.append((h, t[:60]))
    ok('[gate] the routes owned by the late modules all render', not bad, bad)
    ok('[gate] no page errors across them', not errs, errs); c.close()
    # ---- C: late bundle blocked: Home fine, other pages still draw what the main bundle can, no uncaught errors
    c = ctx(b); errs = []; pg = page(c, errs); c.route(re.compile(r'.*/dist/late\.[0-9a-f]+\.js'), lambda rt: rt.abort())
    pg.goto(base + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_timeout(3500)
    ok('[fail] late bundle unavailable: Home still works', pg.evaluate("!!document.querySelector('.home27')&&document.querySelectorAll('#picks li').length>=6"), errs)
    pg.goto(base + '#/search/oats'); pg.wait_for_timeout(4000)
    ok('[fail] late bundle unavailable: navigating on does not hang on a skeleton or throw (search still lists results)', pg.evaluate("document.querySelectorAll('a.row').length>0") and not [e for e in errs if 'pageerror' in e], errs)
    c.close()
    # ---- D: service worker: late bundle precached, works offline
    c = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='allow'); c.add_init_script(SEED); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if LOCAL:
        def h_(rt):
            pth = REPO + '/' + rt.request.url.split('pages.dev/', 1)[1].split('?')[0]
            rt.fulfill(path=pth, headers={'access-control-allow-origin': '*', 'content-type': 'application/json' if pth.endswith('.json') else 'image/webp'}) if os.path.isfile(pth) else rt.fulfill(status=404, body='nf')
        c.route(re.compile(r'https://lumi-data-cky\.pages\.dev/(data|img)/.*'), h_)
    pg.goto(base + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_function("navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=120000)
    n = pg.evaluate("(async()=>{for(const k of await caches.keys())if(k.startsWith('lumi-v'))return (await (await caches.open(k)).keys()).map(r=>r.url).filter(u=>u.includes('/dist/late.'))})()")
    ok('[sw] the late bundle is in the shell cache under its hashed key', len(n) == 1 and '?h=' + SH[M['late']] in n[0], n)
    pg.goto(base + '#/search/yogurt'); pg.wait_for_selector('a.row', timeout=90000); pg.goto(base + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000)
    c.set_offline(True); pg.reload(); pg.wait_for_selector('#picks .du14', timeout=60000)
    pg.goto(base + '#/kitchen'); pg.wait_for_timeout(2500)
    ok('[sw] offline (network off): Home loads and a late-module page (#/kitchen) opens from the cache', pg.evaluate("window.lateDone27===true&&document.getElementById('app').innerText.length>200"), errs)
    ok('[sw] no page errors', not errs, errs); c.close()
    b.close()
n = len(RES); f = [x for x in RES if not x[1]]
print(f'\n{n - len(f)}/{n} passed in {time.time() - t0:.0f}s'); sys.exit(1 if f else 0)
