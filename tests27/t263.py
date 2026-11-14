# Lumi 26.3 tests: fast launch (Home draws from data/home27/home.json, the search engine starts lazily) + performance budget.
# usage: VER=26.3 python3 t263.py <base> [local]
import sys, os, re, json, time, gzip
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '26.3')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); BUD = json.load(open(REPO + '/tests27/perf_budget.json'))
PM = open(REPO + '/tests27/perfmod.py').read(); exec(PM)
# ---------- independent data checks ----------
HP = REPO + '/data/home27/home.json'; HJ = json.load(open(HP)); raw = open(HP, 'rb').read()
ok('[home.json] built, 300+ docs, 100+ chains, under 80 KB gzipped', len(HJ['docs']) >= 300 and len(HJ['chains']) >= 100 and len(gzip.compress(raw)) < 80000, (len(HJ['docs']), len(HJ['chains']), len(gzip.compress(raw))))
ok('[home.json] every doc is local/whole/rest with a code, name, per-100 score; no doc invented (codes unique)', all(d['src'] in ('local', 'whole', 'rest') and d.get('code') and d.get('name') and d.get('score') is not None for d in HJ['docs']) and len({d['code'] for d in HJ['docs']}) == len(HJ['docs']))
# every doc must exist, unchanged, in the real catalog tiers (index rows: [code,name,brand,score,net,...])
rows = {}
for f in ('index-g.json', 'index-0.json', 'index-1.json'):
    for r in json.load(open(REPO + '/data/' + f))['docs']: rows[r[0]] = r
miss = [d['code'] for d in HJ['docs'] if d['code'] not in rows]
bad = [d['code'] for d in HJ['docs'] if d['code'] in rows and (rows[d['code']][3] != (d['score'] if d['score'] is not None else -1) or rows[d['code']][4] != (d['net'] if d['net'] is not None else -1))]
ok('[home.json] every doc is a real catalog row (same code, carb score and carbs)', not miss and not bad, (miss[:5], bad[:5]))
_M = json.load(open(REPO + '/dist/manifest.json')) if os.path.isfile(REPO + '/dist/manifest.json') else None  # 26.6+: bundled; the manifest lists files in load order
_order = _M['jsFiles'] if _M else re.findall(r'<script src="(js/[^"]+)"', open(REPO + '/index.html').read())
ok('[home.json] home27.js is shipped (service worker shell or bundle) and loads before app.js', ('js/home27.js' in open(REPO + '/sw.js').read() or bool(_M)) and _order.index('js/home27.js') < _order.index('js/app.js'))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--enable-precise-memory-info']); t0 = time.time()
    # ---------- launch: no catalog download, picks drawn ----------
    c = ctx(b); errs = []; pg = page(c, errs); reqs = []
    pg.on('request', lambda r: '/data/' in r.url and reqs.append(r.url.split('/data/')[1]))
    pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'", timeout=30000)
    ok('version ' + VER, pg.evaluate('VERSION') == VER, pg.evaluate('VERSION'))
    try: pg.wait_for_selector('#picks .du14 a[href^="#/product/"]', timeout=20000)
    except Exception: pass
    pg.wait_for_timeout(3500)
    ok('[launch] Home picks drawn from home.json', 'home27/home.json' in reqs and pg.evaluate("document.querySelectorAll('#picks a[href^=\"#/product/\"]').length") >= 6, reqs)
    idx = [r for r in reqs if re.match(r'(index-|f22/|aw26/|g/|d/)', r)]
    ok('[launch] Home downloads no catalog tiers or ingredient sidecars', not idx, idx)
    ok('[launch] the search engine is not built for Home (0 docs in engine)', pg.evaluate('engine.docs.length') == 0 and pg.evaluate('HOME27.docs.length') >= 300, pg.evaluate('engine.docs.length'))
    ok('[launch] restaurant picks list filled', pg.evaluate("document.querySelectorAll('#restList a.row').length") >= 2)
    L = pg.evaluate("""()=>{const hs=[...document.querySelectorAll('#picks .du14 h3, #picks .du14 h4, #picks .du14 .dh14, #picks .du14 [class*=hd]')].map(e=>({t:e.innerText,x:e.getBoundingClientRect().x})); const cols=[...document.querySelectorAll('#picks .du14 > *')].map(e=>({t:e.innerText.slice(0,60),x:Math.round(e.getBoundingClientRect().x)})); return {hs,cols}}""")
    txt = pg.evaluate("document.querySelector('#picks').innerText")
    ok('[launch] Health column is left of Blood sugar column', txt.find('health') >= 0 and (txt.lower().find('health') < txt.lower().find('blood sugar') or txt.lower().find('health') < txt.lower().find('glucose')), L)
    ok('[launch] per-serving carbs with serving shown on every pick row', len(re.findall(r'carbs per (serving|item)', txt)) >= 6 and 'carbs per 100' not in txt.split('Updated daily')[0] or len(re.findall(r'carbs per serving \(\d+ (g|ml)\)', txt)) >= 6, txt[:600])
    ok('[launch] no "safe" claims on Home', not re.search(r'\bsafe\b', pg.evaluate("document.getElementById('app').innerText"), re.I))
    ok('[launch] no page errors', not errs, errs)
    # ---------- equivalence with the full engine (all 6 pickers, 14 daily rotations) ----------
    r = pg.evaluate("""async()=>{ await loadIndex(); await loadIndexFull(); try{for(let i=0;i<4&&await ensure22();i++);}catch(e){}
      const names=['homePicks','healthPicks14','homeCols141','restPicks74','topPicks','bestAtRestaurants']; const realNow=Date.now; const diffs=[]; let n=0;
      for(let day=0;day<14;day++){ Date.now=()=>Date.UTC(2026,10,1)+day*864e5+3e7;
        for(const nm of names){ const f=self[nm]; const cd=x=>(Array.isArray(x[0])?x.flat():x).map(d=>d.code).join();
          const a=cd(f()); const h=HOME27.docs,c=HOME27.codes; HOME27.docs=null; const b=cd(f()); HOME27.docs=h; HOME27.codes=c; n++; if(a!==b) diffs.push([day,nm]); } }
      Date.now=realNow; return {n,diffs,docs:engine.docs.length}; }""")
    ok('[equivalence] the prebuilt pool gives the same picks as the full catalog (6 pickers x 14 days)', r['n'] == 84 and not r['diffs'] and r['docs'] > 100000, r)
    c.close()
    # ---------- lazy engine: typing starts it, search + product still work ----------
    c = ctx(b); errs = []; pg = page(c, errs); pg.goto(base + '#/'); pg.wait_for_selector('#picks .du14', timeout=25000); pg.wait_for_timeout(1500)
    ok('[lazy] engine empty on Home', pg.evaluate('engine.docs.length') == 0)
    pg.fill('#q', 'yogurt'); pg.wait_for_function("()=>engine.docs.length>1000||(typeof SW27!==\x27undefined\x27&&SW27.loaded&&SW27.loaded.size>=1)", timeout=60000); pg.wait_for_selector('#sugg a[href^="#/product/"]', timeout=30000)
    ok('[lazy] typing in the Home search box starts the engine and shows suggestions', pg.evaluate("document.querySelectorAll('#sugg a[href^=\"#/product/\"]').length") >= 3)
    pg.keyboard.press('Enter'); pg.wait_for_selector('a.row', timeout=60000); pg.wait_for_timeout(1500)
    ok('[lazy] search results for yogurt', 'yogurt' in pg.evaluate("document.getElementById('app').innerText").lower() and pg.evaluate("document.querySelectorAll('a.row').length") >= 5)
    pg.evaluate("location.hash='#/product/0096619483556'"); pg.wait_for_selector('#app h1', timeout=30000); pg.wait_for_timeout(2500)
    t = pg.evaluate("document.getElementById('app').innerText")
    ok('[lazy] product page opens with Health and Blood sugar scores', re.search(r'yogurt', t, re.I) and 'Health' in t and ('Blood sugar' in t or 'Carb' in t), t[:300])
    ok('[lazy] no page errors', not errs, errs); c.close()
    # ---------- fallback: home.json unreachable -> old path still draws picks ----------
    c = ctx(b); errs = []; pg = page(c, errs)
    c.route(re.compile(r'.*/data/home27/home\.json.*'), lambda rt: rt.fulfill(status=404, body='nf'))
    pg.goto(base + '#/')
    try: pg.wait_for_selector('#picks .du14 a[href^="#/product/"]', timeout=90000)
    except Exception: pass
    pg.wait_for_timeout(1500)
    ok('[fallback] home.json missing: Home still shows picks (via the full index)', pg.evaluate("document.querySelectorAll('#picks a[href^=\"#/product/\"]').length") >= 6 and pg.evaluate("engine.docs.length>1000||!!(typeof SW27!==\x27undefined\x27&&SW27.loaded&&SW27.loaded.size>=1)"))
    ok('[fallback] no page errors', not [e for e in errs if 'home27' not in e and '404' not in e], errs); c.close()
    # ---------- performance budget (CPU 4x, mobile profile) ----------
    BG = BUD.get(VER) or BUD[sorted(BUD)[-1]]
    def cf(bb):
        cc = bb.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, service_workers='block')
        cc.add_init_script(SEED + "localStorage.setItem('lumi.notice231','1');")
        h_ = lambda rt: (lambda pth: rt.fulfill(path=pth, headers={'access-control-allow-origin': '*', 'content-type': 'application/json' if pth.endswith('.json') else 'image/webp'}) if os.path.isfile(pth) else rt.fulfill(status=404, body='nf'))(REPO + '/' + rt.request.url.split('pages.dev/', 1)[1].split('?')[0])
        if LOCAL: cc.route(re.compile(r'https://lumi-data-cky\.pages\.dev/(data|img)/.*'), h_)
        return cc
    runs = [measure(b, base, cf) for _ in range(3)]; m = sorted(runs, key=lambda x: x['picks'])[1]
    print('perf runs:', json.dumps(runs)[:1400])
    dbytes = sum(sz for f, sz in m['data'])
    ok(f"[budget] Home picks visible within {BG['home_picks_ms']} ms at 4x CPU (median {m['picks']} ms)", 0 < m['picks'] <= BG['home_picks_ms'], m)
    ok(f"[budget] longest main-thread task under {BG['home_longtask_max_ms']} ms (median run {m['lt_max']} ms)", m['lt_max'] <= BG['home_longtask_max_ms'], m)
    ok(f"[budget] total blocking time under {BG['home_tbt_ms']} ms (median run {m['tbt']} ms)", m['tbt'] <= BG['home_tbt_ms'], m)
    ok(f"[budget] data downloaded for Home under {BG['home_data_bytes']//1000} KB ({dbytes//1000} KB) and no catalog tiers", dbytes <= BG['home_data_bytes'] and not [f for f in m['data_files'] if re.match(r'(index-|f22/|aw26/)', f)], m['data_files'])
    ok(f"[budget] script requests at startup <= {BG['max_js_requests']} ({m['n_js']}), stylesheets <= {BG['max_css_requests']} ({m['n_css']})", m['n_js'] <= BG['max_js_requests'] and m['n_css'] <= BG['max_css_requests'], m)
    b.close()
n = len(RES); f = [x for x in RES if not x[1]]
print(f'\n{n - len(f)}/{n} passed in {time.time() - t0:.0f}s'); sys.exit(1 if f else 0)
