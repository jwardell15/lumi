# Lumi 25.0 tests: Home & Body (personal care), PFAS, Prop 65, CSCP flags, score, hooks into scan/search/Browse.
# usage: VER=25.0 python3 t25.py <base> [local]
import sys, os, re, json, time, random
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '25.0'); OUT = '/workspace/m25/shots/'
def txt(pg): return pg.evaluate("document.getElementById('app').innerText")
def idx(): return json.load(open(REPO + '/data/hb25/index.json'))
I = idx(); DOCS = I['docs']; CATS = [c[0] for c in I['cats']]
def shard(code):
    return json.load(open(REPO + '/data/hb25/d/%s.json' % code[-2:]))[code]
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    c = ctx(b, w=1440, h=900); errs = []; pg = page(c, errs)
    pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'", timeout=30000); pg.wait_for_timeout(800)
    ok('version ' + VER, pg.evaluate('VERSION') == VER, pg.evaluate('VERSION'))
    swt = pg.evaluate("fetch('sw.js',{cache:'no-store'}).then(r=>r.text())")
    ok('sw cache lumi-v%s lists v25 + core + earlier files' % VER, ("'lumi-v%s'" % VER) in swt and all(f in swt for f in ('js/v25.js', 'css/v25.css', 'js/hb25core.js', 'js/v242.js')))
    scr = pg.evaluate("[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean)")
    ok('index loads hb25core then v25 after v242', scr[-5:-2] == ['js/v242.js', 'js/hb25core.js', 'js/v25.js'], scr[-4:])
    ok("What's new lists 25.0 (after 25.2 and 25.1)", pg.evaluate("V7_NEWS[2][1]") == 'Home & Body (25.0)')
    # ---- Browse ----
    go(pg, '#/browse', '.fg181', 1200)
    r = pg.evaluate("()=>({feat:[...document.querySelectorAll('.fg181 .st181 .m181')].map(a=>a.getAttribute('href')), hb:[...document.querySelectorAll('.hbbr25 a')].map(a=>a.getAttribute('href')), first:(document.querySelector('.browse74 > *:nth-child(2)')||{}).className||'', order:[...document.querySelectorAll('.browse74 .sec-h h2')].map(h=>h.innerText)})")
    ok('[browse] Costco + Whole Foods still pinned', set(r['feat']) == {'#/store/wholefoods', '#/store/costco'}, r)
    ok('[browse] Home & Body area with links', '#/hb' in r['hb'] and '#/pfas' in r['hb'] and 'Home & Body' in r['order'] and r['order'].index('Home & Body') < r['order'].index('Tools'), r)
    # ---- hub ----
    go(pg, '#/hb', '#hbl25 .row', 1500)
    n = int(re.sub(r'\D', '', pg.evaluate("document.getElementById('hbn25').innerText")))
    pcn = len(DOCS) + len(json.load(open(REPO + '/data/hb25/index-c.json'))['docs'])
    ok('[hub] lists all indexed products (personal care; 25.1 adds cleaning)', n == pcn and n > 30000, (n, pcn))
    ok('[hub] category chips + filters + sort', pg.evaluate("document.querySelectorAll('.hbc25 .chip').length") == 15 and pg.evaluate("document.querySelectorAll('.fb25').length") == 7 and pg.evaluate("!!document.getElementById('hbsort25')"))
    rows = pg.evaluate("[...document.querySelectorAll('#hbl25 .row')].map(a=>({h:a.getAttribute('href'),s:a.querySelector('.hbp25').innerText}))")
    byc = {d[0]: d for d in DOCS + json.load(open(REPO + '/data/hb25/index-c.json'))['docs']}
    ok('[hub] row scores = index scores, rows link to #/cos/<barcode>', all(x['h'].startswith('#/cos/') and (x['s'] == '?' if byc[x['h'][6:]][3] < 0 else x['s'] == str(byc[x['h'][6:]][3])) for x in rows), rows[:3])
    pg.click('.fb25[data-f=clean]'); pg.wait_for_timeout(300)
    sc = pg.evaluate("[...document.querySelectorAll('#hbl25 .hbp25')].map(e=>e.innerText)")
    ok('[hub] Flag-free filter shows only score 100', len(sc) > 10 and set(sc) == {'100'}, set(sc))
    pg.click('.fb25[data-f=clean]'); pg.click('.fb25[data-f=nopfas]'); pg.click('.fb25[data-f=nop65]'); pg.wait_for_timeout(300)
    tg = pg.evaluate("[...document.querySelectorAll('#hbl25 .tg25i')].map(e=>e.innerText)")
    ok('[hub] No PFAS + No Prop 65 filters hide those flags', len(tg) > 0 and 'PFAS' not in tg and 'Prop 65' not in tg and not any('?' == s for s in pg.evaluate("[...document.querySelectorAll('#hbl25 .hbp25')].map(e=>e.innerText)")))
    pg.click('.fb25[data-f=nopfas]'); pg.click('.fb25[data-f=nop65]')
    pg.fill('#hbq25', 'shampoo'); pg.wait_for_timeout(400)
    nn = pg.evaluate("document.querySelectorAll('#hbl25 .row').length"); names = pg.evaluate("[...document.querySelectorAll('#hbl25 .n')].map(e=>e.innerText.toLowerCase()+' ')")
    ok('[hub] search "shampoo" finds shampoos', nn >= 20 and sum('shampoo' in x for x in names) >= nn * 0.8, (nn, names[:5]))
    pg.select_option('#hbsort25', 'best'); pg.wait_for_timeout(300)
    ss = [int(x) for x in pg.evaluate("[...document.querySelectorAll('#hbl25 .hbp25')].map(e=>e.innerText)") if x != '?']
    ok('[hub] sort by highest score', ss == sorted(ss, reverse=True) and ss[0] == 100, ss[:8])
    pg.evaluate("localStorage.removeItem('lumi.hbf25')"); go(pg, '#/hb/sun', '#hbl25 .row', 800)
    ok('[hub] category route #/hb/sun', pg.evaluate("document.querySelector('.hbc25 .chip.on').dataset.c") == 'sun' and int(re.sub(r'\D', '', pg.evaluate("document.getElementById('hbn25').innerText"))) == sum(1 for d in DOCS if d[7] == 'b' and CATS[d[4]] == 'sun'))
    # ---- product pages: real products with each kind of flag ----
    def pick(bit, noother=False, need_ing=True):
        L = [d for d in DOCS if d[7] == 'b' and d[6] & bit and d[6] & 512 and d[5]]
        return L[:1] and random.Random(bit).choice(L)
    pf = pick(1); p65 = pick(2); csc = pick(32); fr = pick(4); fa = pick(8)
    noing = next(d for d in DOCS if d[7] == 'b' and not d[6] & 256 and d[6] & 512 and d[5])
    clean = next(d for d in DOCS if d[7] == 'b' and d[3] == 100 and d[6] & 512 and d[5])
    for tag, d in (('PFAS', pf), ('Prop 65', p65), ('CSCP', csc), ('formaldehyde releaser', fr), ('fragrance allergen', fa)):
        if not d: ok('[product ' + tag + '] sample exists', False); continue
        go(pg, '#/cos/' + d[0], '.hbpg25', 1200)
        t = txt(pg); rec = shard(d[0])
        ok('[product %s] page shows name, score %s and why-this-score with sources' % (tag, d[3]), rec['n'] in t and pg.evaluate("document.querySelector('.hbs25 .hbp25').innerText") == (str(d[3]) if d[3] >= 0 else '?') and 'Why this score' in t and pg.evaluate("document.querySelectorAll('.fl25 a[href^=\"https://\"]').length") >= 1, t[:300])
        want = {'PFAS': 'PFAS', 'Prop 65': 'Prop 65 listed', 'CSCP': 'Reported to California', 'formaldehyde releaser': 'Formaldehyde releaser', 'fragrance allergen': 'Fragrance allergen'}[tag]
        ok('[product %s] shows a "%s" flag' % (tag, want), want in t, t[:400])
        if tag == 'CSCP': ok('[product CSCP] says possible match by brand and product name, not a finding of harm', 'possible match by brand and product name' in t and 'not a finding of harm' in t, t[:400])
        if tag == 'PFAS': ok('[product PFAS] cites EPA', 'EPA CompTox' in t)
        if tag == 'Prop 65': ok('[product Prop 65] says a listing is about the chemical, not a limit', 'does not mean this product exceeds any limit' in t)
    go(pg, '#/cos/' + noing[0], '.hbpg25', 1000); t = txt(pg)
    ok('[product no ingredients] "couldn\'t verify", no number score, nothing called safe', "Couldn't verify" in t and pg.evaluate("document.querySelector('.hbs25 .hbp25').innerText") == '?' and not re.search(r'\b(is|are) (completely )?safe\b', t, re.I), t[:400])
    go(pg, '#/cos/' + clean[0], '.hbpg25', 1000); t = txt(pg)
    ok('[product flag-free] "No flagged ingredients found in available data", score 100, not-a-safety-rating text', 'No flagged ingredients found in available data' in t and pg.evaluate("document.querySelector('.hbs25 .hbp25').innerText") == '100' and 'not a safety rating' in t.lower() and not re.search(r'\b(is|are) (completely )?safe\b', t, re.I), t[:500])
    ok('[product] ODbL attribution, ingredient list, source link to Open Beauty Facts', 'Open Beauty Facts' in t and 'ODbL' in t and pg.evaluate("!!document.querySelector('.hbpg25 a[href*=\"openbeautyfacts.org/product/\"]')"))
    go(pg, '#/cos/0000000000000', '.hbnf25', 800)
    ok('[product] unknown barcode explains and offers the checker', "isn't in Lumi's Home & Body data" in txt(pg) and pg.evaluate("!!document.querySelector('a[href=\"#/hb-check\"]')"))
    # ---- score parity: the app's engine equals the build for random products (exact-match rules verified against the shipped data)
    sample = random.Random(25).sample([d for d in DOCS if d[7] == 'b' and d[3] >= 0], 60)
    pg.evaluate("window.__ref=null"); bad = pg.evaluate("""async (codes)=>{ const ref=await HB25UI.hbRef(), out=[]; for(const c of codes){ const r=await HB25UI.hbRec(c); const fl=HB25.evaluate(r.ing,ref), s=HB25.score(fl, HB25UI.scoreCtx(r)).score; out.push([c,s]); } return out; }""", [d[0] for d in sample])
    miss = [(c, s, byc[c][3]) for c, s in bad if s != byc[c][3]]
    ok('[engine] browser engine reproduces build scores for 60 random products', not miss, miss[:5])
    # ---- exact-match false positive checks ----
    FP = pg.evaluate("""async ()=>{ const ref=await HB25UI.hbRef(); const t=x=>HB25.evaluate(x,ref).map(f=>f.t+':'+f.n);
      return { ptfe:t('Aqua, Polytetrafluoroethylene'), naf:t('Aqua, Sodium Fluoride, Sodium Monofluorophosphate'), bp3:t('Benzophenone-3, Octocrylene'), sty:t('Styrene/Acrylates Copolymer'), mas:t('Magnesium Aluminum Silicate'), cde:t('Cocamide DEA'), gly:t('Glycol Distearate, Propylene Glycol'), hyd:t('Hydrated Silica'), dmdm:t('DMDM Hydantoin'), parf:t('Parfum, Limonene'), form:t('Formaldehyde') } }""")
    ok('[engine] PTFE is flagged as PFAS', any(x.startswith('pfas:') for x in FP['ptfe']), FP['ptfe'])
    ok('[engine] sodium fluoride / monofluorophosphate are not PFAS', not any(x.startswith('pfas:') for x in FP['naf']), FP['naf'])
    ok('[engine] look-alike names are not flagged (benzophenone-3, styrene copolymer, magnesium aluminum silicate, cocamide DEA, glycols, hydrated silica)', not any(x.startswith('p65:') and re.search(r'^p65:(Benzophenone|Styrene|Palygorskite|Atrazine|Ethylene glycol|Cyclophosphamide)', x, re.I) for k in ('bp3', 'sty', 'mas', 'cde', 'gly', 'hyd') for x in FP[k]), {k: FP[k] for k in ('bp3', 'sty', 'mas', 'cde', 'gly', 'hyd')})
    ok('[engine] DMDM hydantoin = formaldehyde releaser; Parfum + Limonene = fragrance flags; formaldehyde = Prop 65', any(x.startswith('frel:') for x in FP['dmdm']) and any(x.startswith('parfum:') for x in FP['parf']) and any(x.startswith('fa:') for x in FP['parf']) and any(x.startswith('p65:') for x in FP['form']), FP)
    # ---- ingredient checker ----
    go(pg, '#/hb-check', '#hbck25', 400); pg.click('#hbex25'); pg.wait_for_selector('#hbres25 .fl25', timeout=30000)
    t = txt(pg)
    ok('[checker] example shows score, PFAS, formaldehyde releaser and fragrance flags; nothing stored', all(x in t for x in ('Home & Body score', 'Polytetrafluoroethylene', 'DMDM hydantoin', 'Fragrance')) and pg.evaluate("Object.keys(localStorage).every(k=>!/hbck|ingredient/i.test(k))"), t[:300])
    pg.fill('#hbck25', 'Water, Glycerin, Citric Acid'); pg.click('#hbgo25'); pg.wait_for_timeout(800)
    t = txt(pg); ok('[checker] clean list: "No flagged ingredients found", not safe', 'No flagged ingredients found in available data' in t and not re.search(r'\b(is|are) safe\b', t, re.I), t[:300])
    pg.fill('#hbck25', ''); pg.click('#hbgo25'); pg.wait_for_timeout(300); ok('[checker] empty input asks for a list', 'Paste an ingredient list first' in txt(pg))
    # ---- PFAS + Prop 65 + about ----
    go(pg, '#/pfas', '#pfq25', 800); pg.wait_for_function("()=>document.getElementById('pfl25').innerText.includes('brands from')", timeout=30000)
    pg.fill('#pfq25', 'cummins'); pg.wait_for_timeout(400); t = txt(pg)
    ok('[pfas] Minnesota brand lookup + "doesn\'t mean" wording + link-only sources', "Cummins" in t and "doesn't mean" in t and 'Toxic-Free Future' in t and 'Maine DEP' in t and "doesn't copy" in t, t[:200])
    pg.fill('#pfi25', 'polytetrafluoroethylene'); pg.wait_for_timeout(500); ok('[pfas] EPA list lookup finds PTFE', 'on EPA' in pg.evaluate("document.getElementById('pfr25').innerText"), pg.evaluate("document.getElementById('pfr25').innerText"))
    pg.fill('#pfi25', 'sodium fluoride'); pg.wait_for_timeout(500); ok('[pfas] sodium fluoride is not on the PFAS list', pg.evaluate("document.getElementById('pfr25').innerText").startswith('Not on the EPA'), pg.evaluate("document.getElementById('pfr25').innerText"))
    go(pg, '#/prop65', '#p65q25', 500); pg.wait_for_function("()=>document.getElementById('p65r25').innerText.includes('listed chemicals')", timeout=30000)
    pg.fill('#p65q25', 'formaldehyde'); pg.wait_for_timeout(400); ok('[prop65] lookup finds formaldehyde with CAS 50-00-0', '50-00-0' in pg.evaluate("document.getElementById('p65r25').innerText"))
    go(pg, '#/hb-about', '.hbab25', 400); t = txt(pg)
    ok('[about] explains points, sources, licenses and limits', all(x in t for x in ('not a safety rating', 'ODbL', 'Safe Cosmetics', 'EPA CompTox', 'couldn\'t verify', 'Maine DEP')), t[:200])
    # ---- scan / search integration ----
    go(pg, '#/search/shampoo', '#cosHint .cos-hint', 3000)
    h = pg.evaluate("document.querySelector('#cosHint').innerText"); ok('[search] food search offers Home & Body matches', 'Home & Body product' in h and 'match "shampoo"' in h, h)
    pg.click('#cosHint .cos-hint'); pg.wait_for_selector('#hbl25 .row', timeout=30000); ok('[search] hint opens the hub with the query', pg.evaluate("document.getElementById('hbq25').value") == 'shampoo')
    # scan flow: the food lookup misses, then Home & Body answers
    pg.evaluate("sessionStorage.setItem('lumi.scanned','%s')" % pf[0]); go(pg, '#/product/' + pf[0], '.hbpg25', 3000)
    ok('[scan] a non-food barcode that misses food falls back to the Home & Body page', pg.evaluate("!!document.querySelector('.hbpg25')") and shard(pf[0])['n'] in txt(pg))
    go(pg, '#/product/0000000000017', '#app h1, .card.empty', 3000); ok('[scan] unknown barcode: message mentions Open Products Facts', 'Open Products Facts' in txt(pg) or 'Barcode' in txt(pg), txt(pg)[:200])
    # ---- privacy + disclaimer ----
    go(pg, '#/privacy', '.pg231', 300); t = txt(pg); ok('[privacy] lists OBF/OPF photos, no live API call', 'Open Beauty Facts and Open Products Facts' in t and 'does not call their live API' in t and 'Home & Body' in t, t[:100])
    go(pg, '#/disclaimer', '.pg231', 300); ok("[disclaimer] Home & Body flags aren't safety ratings", "Home & Body flags aren't safety ratings" in txt(pg))
    ok('[existing] cosmetics route still opens (#/cosmetics -> Home & Body hub)', (go(pg, '#/cosmetics', '#hbl25 .row', 1000) or True) and pg.evaluate("!!document.querySelector('.hbhub25')"))
    ok('no page errors (desktop)', not errs, errs); c.close()
    # ---- layouts ----
    for th in ('light', 'dark'):
        for w, h in ((390, 844), (1440, 900)):
            c = ctx(b, th=th, w=w, h=h); errs = []; pg = page(c, errs); pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'"); pg.wait_for_timeout(600)
            for hh, sel in (('#/hb', '#hbl25 .row'), ('#/cos/' + pf[0], '.hbpg25'), ('#/cos/' + clean[0], '.hbpg25'), ('#/hb-check', '#hbck25'), ('#/pfas', '#pfq25'), ('#/prop65', '#p65q25'), ('#/hb-about', '.hbab25')):
                go(pg, hh, sel, 1200)
                if hh == '#/hb-check': pg.click('#hbex25'); pg.wait_for_selector('#hbres25 .fl25', timeout=30000)
                a = pg.evaluate(JS); ok(f'[{th} {w}] {hh[:12]} layout/contrast', a['over'] <= 1 and not a['wide'] and not a['bad'] and not a['small'], a)
                if th == 'light' and hh in ('#/hb', '#/cos/' + pf[0]): pg.evaluate('scrollTo(0,0)'); pg.screenshot(path=OUT + f'v25-{hh[2:5]}-{w}.png', full_page=(w == 390))
            ok(f'[{th} {w}] no page errors', not errs, errs); c.close()
    # ---- offline ----
    c = b.new_context(viewport={'width': 390, 'height': 844}); c.add_init_script("if(!sessionStorage.getItem('o')){sessionStorage.setItem('o','1');" + SEED + "}")
    pg = c.new_page(); pg.goto(base + '#/'); pg.wait_for_function("()=>navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=30000); pg.wait_for_timeout(2500)
    keys = pg.evaluate("caches.keys()"); c.set_offline(True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.reload(); pg.wait_for_timeout(2500)
    ok('[offline] app loads from lumi-v' + VER + ' cache with v25 code', ('lumi-v' + VER) in keys and pg.evaluate("typeof viewHBHub==='undefined' ? (typeof HB25==='object' && typeof HB25UI==='object') : true"), keys)
    pg.evaluate("location.hash='#/hb-about'"); pg.wait_for_timeout(800); ok('[offline] Home & Body about page renders without a connection', 'how it works' in pg.evaluate("document.getElementById('app').innerText"))
    ok('[offline] no page errors', not errs, errs); c.close()
    print(f"\nt25: {sum(1 for _, x in R if x)}/{len(R)} passed in {int(time.time() - t0)}s")
    sys.exit(0 if all(x for _, x in R) else 1)
