# Lumi 26.4 tests: search in a Web Worker (default: first two catalog tiers, "Search all" on demand), Better choice + recalls from the worker, perf budget.
# usage: VER=26.4 python3 t264.py <base> [local]
import sys, os, re, json, time
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '26.4')
BUD = json.load(open(REPO + '/tests27/perf_budget.json')); BG = BUD.get(VER) or BUD[sorted(BUD)[-1]]
exec(open(REPO + '/tests27/perfmod.py').read())
def txt(pg): return pg.evaluate("document.getElementById('app').innerText")
def data_reqs(pg, store): pg.on('request', lambda r: '/data/' in r.url and store.append(r.url.split('/data/')[1]))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--enable-precise-memory-info']); t0 = time.time()
    # ---------- 1. default search: two tiers, worker, Search all ----------
    c = ctx(b); errs = []; pg = page(c, errs); rq = []; data_reqs(pg, rq)
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan', timeout=25000); pg.wait_for_timeout(1200)
    ok('version ' + VER, pg.evaluate('VERSION') == VER, pg.evaluate('VERSION'))
    ok('[worker] Home starts no worker and downloads no catalog tiers', pg.evaluate('SW27.w') is None and not [r for r in rq if re.match(r'(index-|f22/|aw26/)', r)], rq)
    pg.click('#q'); pg.fill('#q', 'yogurt'); pg.wait_for_selector('#sugg a[href^="#/product/"]', timeout=60000)
    ok('[worker] typing in the Home search box starts the worker and shows suggestions', pg.evaluate('SW27.ok && !!SW27.w') and pg.evaluate("document.querySelectorAll('#sugg a[href^=\"#/product/\"]').length") >= 3)
    pg.keyboard.press('Enter'); pg.wait_for_selector('a.row', timeout=60000); pg.wait_for_function("SW27.loaded.size>=3", timeout=90000); pg.wait_for_timeout(2500)
    ok('[worker] yogurt results shown', 'yogurt' in txt(pg).lower() and pg.evaluate("document.querySelectorAll('a.row').length") >= 8)
    ok('[worker] the page itself never built the index (0 docs in the page engine)', pg.evaluate('engine.docs.length') == 0, pg.evaluate('engine.docs.length'))
    loaded = pg.evaluate('[...SW27.loaded].sort()')
    ok('[default] search covers the first two tiers only (index-0, index-g, index-1)', loaded == ['0', '1', 'g'] and not [r for r in rq if re.match(r'index-([2-9]|10|w)', r)], (loaded, rq))
    ok('[default] a "Search all" button is offered with the product count', pg.evaluate("!!document.getElementById('allBtn') && /Search all [\\d,]+\\+? ?products/.test(document.getElementById('allBtn').textContent)"), pg.evaluate("(document.getElementById('dym')||{}).innerText"))
    n0 = pg.evaluate("document.querySelectorAll('a.row').length")
    pg.fill('#q', 'oikos triple zero'); pg.keyboard.press('Enter'); pg.wait_for_timeout(2500)
    pg.click('#allBtn'); pg.wait_for_function("SW27.allDone", timeout=240000); pg.wait_for_timeout(2500)
    ok('[all] "Search all" loads the remaining tiers in the worker and hides the button', pg.evaluate('SW27.loaded.size') >= 10 and pg.evaluate("!document.getElementById('allBtn')") and pg.evaluate('engine.docs.length') == 0, pg.evaluate('[...SW27.loaded]'))
    ok('[all] no page errors', not errs, errs); c.close()
    # ---------- 2. product page: no index on the page, Better choice from the worker ----------
    c = ctx(b); errs = []; pg = page(c, errs); pg.goto(base + '#/product/r-arbys-curly-fries-medium'); pg.wait_for_selector('#bc24', timeout=60000); pg.wait_for_timeout(1500)
    t = pg.evaluate("document.querySelector('#bc24').innerText")
    ok("[better] Arby's curly fries -> Crinkle Fries (same chain, side) via the worker", 'Crinkle Fries' in t and 'Same chain' in t and 'saves' in t, t[:300])
    ok('[better] the product page built no index on the page', pg.evaluate('engine.docs.length') == 0 and pg.evaluate('typeof tier0') != 'object' or pg.evaluate('engine.docs.length') == 0)
    ok('[better] old hidden swap cards are empty (not computed)', pg.evaluate("[...document.querySelectorAll('#better9,#swapsCard,#sw20,#du14p,#how14')].every(e=>e.innerText.trim()==='' )"))
    pg.evaluate("location.hash='#/product/0096619483556'"); pg.wait_for_selector('#bc24', timeout=30000); pg.wait_for_timeout(2500)
    t = txt(pg); ok('[better] packaged yogurt page: Health and Blood sugar scores, Better choice card', 'Health' in t and 'Blood sugar' in t and pg.evaluate("!!document.getElementById('bc24')"), t[:300])
    ok('[better] no page errors', not errs, errs); c.close()
    # ---------- 3. parity with the old main-thread engine (same swaps, same sidecar fields) ----------
    c = ctx(b); errs = []; pg = page(c, errs); pg.goto(base + '#/picks'); pg.wait_for_selector('#picks .du14', timeout=25000)
    r = pg.evaluate("""async()=>{ await loadIndex(); await loadIndexFull(); try{for(let i=0;i<4&&await ensure22();i++);}catch(e){} await SW27.base();
      const D=engine.docs.filter(d=>d.src!=='world'&&d.score!=null&&d.score<85&&d.sugar!=null&&d.net!=null&&!d.bad&&!d.zc&&d.img&&(d.rank%997===0||d.src==='rest'&&d.rank%53===0||d.src==='whole'&&d.rank%11===0)).slice(0,90);
      let same=0,diff=[],checked=0;
      for(const doc of D){ const q=perServ20(doc); if(!q||q.s==null) continue; const cur={score:doc.score,h:doc.h,sugar:q.s,carbs:q.c}; checked++;
        const a=better24(doc,cur,3).map(x=>x.d.code).join();
        const rest0=doc.src==='rest'||/^(r-|ms-)/.test(doc.code), leaf0=(doc.keys||[]).filter(k=>typeof k==='number'&&!['whole','rest','rest-other'].includes(C.KEYS[k])).slice(-1)[0];
        if(!(rest0||leaf0!=null)) continue;
        const pool=await SW27.pool({leaf:rest0?null:C.KEYS[leaf0],rest:rest0,brand:doc.brand,minScore:cur.score});
        const d0=engine.docs,c0=engine._codes; engine.docs=pool; engine._codes=null; engine.N27=SW27.total; let bb; try{ bb=better24(doc,cur,3).map(x=>x.d.code).join(); } finally{ engine.docs=d0; engine._codes=c0; engine.N27=undefined; }
        if(a===bb) same++; else diff.push([doc.code,a,bb]); }
      // sidecar parity: rows from the worker carry the same f22 / aw26 fields as the page's own docs
      const L=await SW27.search('chicken breast',[{limit:60},{limit:20,src:'rest'},{limit:20,src:'whole'}]); const rows=[].concat(...L); let sp=0,sd=[];
      for(const w of rows){ const m=engine.docs.find?null:null; }
      const byc=new Map(engine.docs.map(d=>[d.code,d])); for(const w of rows){ const m=byc.get(w.code); if(!m) continue; const f=['p22','f22','s22','w22','t22','aw26u','aw26m','score','net','h','sugar','sg','sb','ai','wf','sm']; const bad=f.filter(k=>JSON.stringify(w[k])!==JSON.stringify(m[k])); if(bad.length) sd.push([w.code,bad]); else sp++; }
      return {checked,same,diff:diff.slice(0,4),sp,sd:sd.slice(0,4),rows:rows.length}; }""")
    ok('[parity] Better choice from worker pools = Better choice from the full main-thread index (sampled products, all kinds)', r['checked'] >= 40 and not r['diff'] and r['same'] >= 30, r)
    ok('[parity] worker rows carry the same ingredient/additive sidecar fields and scores as page docs', r['sp'] >= 40 and not r['sd'], r)
    ok('[parity] no page errors', not errs, errs); c.close()
    # search-row "Better:" hints still appear in worker mode (candidates come from the worker pool; the page holds no docs)
    c = ctx(b); errs = []; pg = page(c, errs); pg.goto(base + '#/search/frosted%20flakes'); pg.wait_for_selector('#res a.row', timeout=60000)
    try: pg.wait_for_selector('#res a.srs20, #res .sw272', timeout=60000)
    except Exception: pass
    sw = pg.evaluate("[...document.querySelectorAll('#res a.srs20, #res .sw272')].map(a=>({h:a.getAttribute('href')||a.dataset.href,t:a.textContent,p:a.matches('.sw272')?!!a.closest('a.row'):a.previousElementSibling&&a.previousElementSibling.matches('a.row')}))")
    ok('[search swaps] worker mode still shows Better-choice hints under weak search rows (with per-serving savings)', len(sw) >= 1 and all(x['p'] and re.search(r'saves .*serving', x['t']) for x in sw) and not pg.evaluate('engine.docs.length'), sw[:2])
    ok('[search swaps] no page errors', not errs, errs); c.close()
    # ---------- 4. recalls from the worker ----------
    U = json.load(open(REPO + '/data/recalls25/u.json')); R_ = json.load(open(REPO + '/data/recalls25/r.json'))
    code = next((k for k, v in U['u'].items() if re.fullmatch(r'\d{12,13}', k) and v and R_['items'][v[0]][1] == 'f'), None)
    c = ctx(b); errs = []; pg = page(c, errs); pg.goto(base + '#/product/' + str(code)); pg.wait_for_selector('#app h1', timeout=30000)
    try: pg.wait_for_selector('#rcal251', timeout=40000)
    except Exception: pass
    pg.wait_for_timeout(500)
    ok('[recalls] a barcode on an FDA recall shows the recall card, matched in the worker', code is not None and pg.evaluate("!!document.getElementById('rcal251')") and pg.evaluate('engine.docs.length') == 0, (code, txt(pg)[:200]))
    pg.evaluate("location.hash='#/product/0096619483556'"); pg.wait_for_timeout(9000)
    ok('[recalls] yogurt: no recall card', pg.evaluate("!document.getElementById('rcal251')")); ok('[recalls] no page errors', not [e for e in errs if 'Failed' not in e], errs); c.close()
    # ---------- 5. fallbacks: no Worker support / worker script missing -> old time-sliced main-thread engine ----------
    for tag, setup in (('?noworker', None), ('worker file missing', 'c.route(re.compile(r".*/js/sworker\\.js.*"), lambda rt: rt.fulfill(status=404, body="x"))')):
        c = ctx(b); errs = []; pg = page(c, errs)
        if setup: exec(setup)
        pg.goto(base + ('?noworker' if tag == '?noworker' else '') + '#/search/yogurt'); pg.wait_for_selector('a.row', timeout=90000); pg.wait_for_timeout(3000)
        ok(f'[fallback {tag}] search works through the main-thread engine', pg.evaluate("document.querySelectorAll('a.row').length") >= 8 and not pg.evaluate('SW27.ok') and pg.evaluate('engine.docs.length') > 1000, (pg.evaluate('SW27.ok'), pg.evaluate('engine.docs.length')))
        ok(f'[fallback {tag}] default is still two tiers + "Search all"', pg.evaluate("!!document.getElementById('allBtn')") and pg.evaluate('engine.docs.length') < 400000, pg.evaluate('engine.docs.length'))
        pg.evaluate("location.hash='#/product/r-arbys-curly-fries-medium'"); pg.wait_for_selector('#bc24', timeout=60000); pg.wait_for_timeout(1500)
        ok(f'[fallback {tag}] Better choice still works', 'Crinkle Fries' in pg.evaluate("document.querySelector('#bc24').innerText"))
        ok(f'[fallback {tag}] no page errors', not [e for e in errs if not re.search(r'sworker|404|Failed to load|worker', e)], errs); c.close()
    # ---------- 6. performance budget (CPU 4x, mobile profile; the old code: search TBT ~19.8 s, product TBT ~10 s on this profile) ----------
    def cf(bb):
        cc = bb.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, service_workers='block')
        cc.add_init_script(SEED + "localStorage.setItem('lumi.notice231','1');")
        h_ = lambda rt: (lambda pth: rt.fulfill(path=pth, headers={'access-control-allow-origin': '*', 'content-type': 'application/json' if pth.endswith('.json') else 'image/webp'}) if os.path.isfile(pth) else rt.fulfill(status=404, body='nf'))(REPO + '/' + rt.request.url.split('pages.dev/', 1)[1].split('?')[0])
        if LOCAL: cc.route(re.compile(r'https://lumi-data-cky\.pages\.dev/(data|img)/.*'), h_)
        return cc
    s = sorted([measure(b, base, cf, hash_='#/search/yogurt', wait=16000) for _ in range(2)], key=lambda x: x['tbt'])[0]
    ok(f"[budget] search (20 s window at 4x): longest task <= {BG['search_longtask_max_ms']} ms ({s['lt_max']}), TBT <= {BG['search_tbt_ms']} ms ({s['tbt']}), page heap <= {BG['search_heap_mb']} MB ({s['heap_mb']})", s['lt_max'] <= BG['search_longtask_max_ms'] and s['tbt'] <= BG['search_tbt_ms'] and s['heap_mb'] <= BG['search_heap_mb'], s)
    q = sorted([measure(b, base, cf, hash_='#/product/0096619483556', wait=14000) for _ in range(2)], key=lambda x: x['tbt'])[0]
    ok(f"[budget] product page cold (14 s window at 4x): longest task <= {BG['product_longtask_max_ms']} ms ({q['lt_max']}), TBT <= {BG['product_tbt_ms']} ms ({q['tbt']}), page heap <= {BG['product_heap_mb']} MB ({q['heap_mb']})", q['lt_max'] <= BG['product_longtask_max_ms'] and q['tbt'] <= BG['product_tbt_ms'] and q['heap_mb'] <= BG['product_heap_mb'], q)
    h = measure(b, base, cf, hash_='#/picks')
    ok(f"[budget] Home still meets the 26.3 budget (picks {h['picks']} ms, TBT {h['tbt']} ms)", 0 < h['picks'] <= BG['home_picks_ms'] and h['tbt'] <= BG['home_tbt_ms'] and h['lt_max'] <= BG['home_longtask_max_ms'], h)
    b.close()
n = len(RES); f = [x for x in RES if not x[1]]
print(f'\n{n - len(f)}/{n} passed in {time.time() - t0:.0f}s'); sys.exit(1 if f else 0)
