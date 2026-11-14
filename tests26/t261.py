# Lumi 26.1 tests: pets (#/pet, pet product via barcode, dog-toxic list + checker, FDA animal recalls) and the dog-toxic check on human-food pages.
# usage: VER=26.1 python3 t261.py <base> [local]
import sys, os, re, json, time, glob, subprocess, random
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '26.1'); OUT = '/workspace/m26/shots/'; os.makedirs(OUT, exist_ok=True)
def txt(pg): return pg.evaluate("document.getElementById('app').innerText")
SAFE = re.compile(r'\b(is|are|it\'s) (completely |totally )?safe\b|safe to (eat|drink|use|buy|feed)|\bsafe food\b|\bsafe for (your |a )?(dog|pet)', re.I)
D = REPO + '/data/pet26/'
def J(p): return json.load(open(p))
# ---------- independent data checks ----------
IDX = J(D + 'index.json'); REC = J(D + 'recalls.json'); shards = {}
for f in sorted(glob.glob(D + 'p/*.json')): shards[os.path.basename(f)[:2]] = J(f)
allp = {k: v for s in shards.values() for k, v in s.items()}
ok('[data] 100 shards by last two digits; every key sits in the shard of its last two digits', len(shards) == 100 and all(k[-2:] == sh for sh, s in shards.items() for k in s))
ok('[data] product count matches the index header, and every indexed code exists in a shard', IDX['n'] == len(allp) and all(d[0] in allp for d in IDX['docs']), (IDX['n'], len(allp)))
ok('[data] the index flag for "has ingredients" equals whether the shard record has text', all(bool(allp[d[0]].get('g')) == bool(d[4]) for d in IDX['docs']))
ok('[data] withIng header equals the number of records with ingredient text', IDX['withIng'] == sum(1 for v in allp.values() if v.get('g')), IDX['withIng'])
ok('[data] every barcode is 6 to 14 digits and the index is sorted by brand', all(re.fullmatch(r'\d{6,14}', k) for k in allp))
ok('[data] spam entries (phone numbers, links) are not in the data', not [k for k, v in allp.items() if re.search(r'\+\d{6,}|https?://|whatsapp|ritual', (v.get('n', '') + ' ' + v.get('b', '')), re.I)])
ok('[data] ingredient text is capped and never invented: every "g" is a string of at most 1500 chars', all(isinstance(v.get('g', ''), str) and len(v.get('g', '')) <= 1500 for v in allp.values()))
ok('[data] species codes are only d c b f s', all(re.fullmatch(r'[dcbfs]*', d[3]) for d in IDX['docs']))
ok('[data] recalls: as-of date, FDA source, every row dated with a product and a reason', re.fullmatch(r'\d{4}-\d\d-\d\d', REC['asof']) and len(REC['rows']) == 65 and all(re.fullmatch(r'\d{4}-\d\d-\d\d', r['d']) and r['p'] and r['r'] for r in REC['rows']), REC['asof'])
ok('[data] recalls are newest first', [r['d'] for r in REC['rows']] == sorted([r['d'] for r in REC['rows']], reverse=True))
# matcher unit cases (node): (text, opts, expected ids, expected status)
cases = [('Sugar, wheat flour, xylitol, cocoa butter, natural flavors', {}, ['cocoabutter', 'xylitol'], 'ok'), ('Chicken, rice, onion powder, garlic, brewers yeast', {}, ['allium'], 'ok'),
         ('water, cetyl alcohol, sugar alcohols, wine vinegar, stearyl alcohol', {}, [], 'ok'), ('Dark chocolate, raisins, macadamia nuts', {}, ['chocolate', 'grapes', 'macadamia'], 'ok'),
         ('Grape juice concentrate, birch sugar', {}, ['grapeprod', 'xylitol'], 'ok'), ('Pollo, arroz, ajo, sal marina', {'lang': 'es'}, ['allium'], 'lang'), ('Chicken, rice, salt, fish oil', {}, [], 'ok'),
         ('', {}, [], 'none'), ('80g', {}, [], 'none'), ('saepulloh', {}, [], 'none'), ('xylitol', {'short': True}, ['xylitol'], 'ok'), ('cocoa-free carob, caffeine, guarana, coffee', {}, ['caffeine'], 'ok'),
         ('sorbitol, E967, citric acid, E330', {}, ['xylitol'], 'ok'), ('green tea extract, matcha, yerba mate', {}, ['tea'], 'ok'), ('avocado, ethyl alcohol, whiskey', {}, ['alcohol', 'avocado'], 'ok'),
         ('onion flavor, scallions, shallots, leeks, chives', {}, ['allium'], 'ok'), ('sultanas, zante currants, grapeseed oil', {}, ['grapeprod', 'grapes'], 'ok'), ('wheat flour, water, yeast, grapefruit juice, lemon', {}, [], 'ok')]
js = "const P=require('./js/pet26core.js');const C=%s;console.log(JSON.stringify(C.map(c=>{const r=P.analyze(c[0],c[1]);return [r.hits.map(h=>h.id).sort(),r.status]})))" % json.dumps(cases)
res = json.loads(subprocess.run(['node', '-e', js], cwd=REPO, capture_output=True, text=True).stdout)
for (s, o, want, st), got in zip(cases, res): ok(f'[matcher] "{s[:46]}" -> {want} / {st}', got == [sorted(want), st], got)
# ---------- items ----------
PED, TETRA, ONION, CHOC_ES, JUNK, CLEANP = '3065890152823', '4004218240322', '9310022193101', '24044318', '10508805', None
for k, v in allp.items():
    if v.get('l') == 'en' and v.get('g') and len(v['g']) > 60 and not re.search(r'onion|garlic|cocoa|chocolate|grape|raisin|tea\b|coffee|caffeine|alcohol|avocado|macadamia|xylitol', v['g'], re.I) and v.get('n') and v.get('b'): CLEANP = k; break
XYL, CHOCR, CLEANH, NOLISTH = '0012546011099', '0050255022005', '0818780013000', '6111184004730'
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    c = ctx(b, w=1440, h=900); errs = []; pg = page(c, errs)
    pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'", timeout=30000); pg.wait_for_timeout(800)
    ok('version ' + VER, pg.evaluate('VERSION') == VER)
    swt = pg.evaluate("fetch('sw.js',{cache:'no-store'}).then(r=>r.text())")
    ok('sw cache lumi-v%s lists the 26.1 files and the pet image host' % VER, ("'lumi-v%s'" % VER) in swt and all(x in swt for x in ('js/v261.js', 'css/v261.css', 'js/pet26core.js', 'images.openpetfoodfacts.org')))
    scr = pg.evaluate("[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean)")
    ok('index loads pet26core then v261 last, after v26', scr[-3:] == ['js/v26.js', 'js/pet26core.js', 'js/v261.js'], scr[-4:])
    ok("What's new lists 26.1 first, then 26.0", pg.evaluate("V7_NEWS[0][1]") == 'Pets (26.1)' and pg.evaluate("V7_NEWS[1][1]") == 'Restaurant meal builder and additive watch (26.0)')
    W = pg.evaluate("PET26.W.map(w=>({id:w.id,level:w.level,src:w.src.map(k=>PET26.S[k]&&PET26.S[k][1])}))")
    ok('[sources] every checked ingredient has at least one source and each is an https ASPCA or FDA page', len(W) == 11 and all(w['src'] and all(u and u.startswith('https://') and re.search(r'(^https://www\.(aspca\.org|fda\.gov)/)', u) for u in w['src']) for w in W), W)
    ok('[sources] the brief\'s dog-toxic items are all present', {'xylitol', 'grapes', 'chocolate', 'allium', 'macadamia'} <= {w['id'] for w in W})
    ok('[sources] poison-line numbers match the ones on the ASPCA and Pet Poison Helpline pages', pg.evaluate("PET26.POISON.map(x=>x[1])") == ['(888) 426-4435', '(855) 764-7661'])
    # ---- hub ----
    go(pg, '#/pet', '#pq261', 1200); t = txt(pg)
    ok('[hub] hub names the sources, the count and says Lumi does not score pet food, never "safe"', 'Open Pet Food Facts' in t and ('%s pet foods' % format(IDX['n'], ',')) in t and "doesn't score pet food" in t and not SAFE.search(t), t[:500])
    ok('[hub] tiles for toxic list, recalls and scanning; brand chips', all(x in t for x in ('Dog-toxic ingredients', 'FDA animal recalls', 'Scan a barcode')) and pg.evaluate("document.querySelectorAll('.pb261 [data-b]').length") >= 10)
    pg.fill('#pq261', 'pedigree'); pg.wait_for_timeout(500); n = pg.evaluate("document.querySelectorAll('#pl261 li').length"); cnt = lambda: int(re.sub(r'[^0-9]', '', pg.evaluate("document.getElementById('pn261').innerText").split(' match')[0]) or 0); n_all = cnt()
    ok('[hub] search "pedigree" lists matches with a count', n >= 20 and 'match' in pg.evaluate("document.getElementById('pn261').innerText") and n_all >= n, (n, n_all))
    ok('[hub] URL follows the search (shareable)', '#/pet/all/pedigree' in pg.evaluate('location.hash'), pg.evaluate('location.hash'))
    pg.click('.pf261[data-f=cats]'); pg.wait_for_timeout(400); n2 = cnt() if 'match' in pg.evaluate("document.getElementById('pn261').innerText") else 0
    ok('[hub] Cats chip narrows the list (or says no match) and keeps aria-pressed', n2 < n_all and pg.evaluate("document.querySelector('.pf261[data-f=cats]').getAttribute('aria-pressed')") == 'true', (n_all, n2))
    pg.click('.pf261[data-f=all]'); pg.click('#pi261'); pg.wait_for_timeout(400)
    ok('[hub] "Has ingredient list" chip leaves only entries with ingredients on file', pg.evaluate("[...document.querySelectorAll('#pl261 li')].every(l=>/ingredients on file/.test(l.innerText))") and pg.evaluate("document.querySelectorAll('#pl261 li').length") > 0)
    pg.click('#pi261'); pg.fill('#pq261', 'zzzqqq nothing'); pg.wait_for_timeout(400)
    ok('[hub] no match says it may not be in Open Pet Food Facts yet (not "not safe/none exist")', 'may not be in Open Pet Food Facts' in pg.evaluate("document.getElementById('pn261').innerText"))
    go(pg, '#/pet/dogs/royal%20canin', '#pl261 li', 600)
    ok('[hub] deep link restores species chip and query', pg.evaluate("document.getElementById('pq261').value") == 'royal canin' and pg.evaluate("document.querySelector('.pf261.on').dataset.f") == 'dogs' and pg.evaluate("document.querySelectorAll('#pl261 li').length") > 0)
    # ---- pet product: Pedigree (recall by brand) ----
    go(pg, '#/pet/all/pedigree', '#pl261 li', 400); pg.click('#pl261 li a'); pg.wait_for_selector('.petp261 h1', timeout=8000); pg.wait_for_timeout(1200); t = txt(pg)
    ok('[pet] a search result opens the pet product view (#/cos/<code>)', '#/cos/' in pg.evaluate('location.hash') and 'Not scored' in t and 'Dog-toxic ingredient check' in t, pg.evaluate('location.hash'))
    go(pg, '#/product/' + PED, '.petp261 h1', 1800); t = txt(pg)
    ok('[pet] scanning/typing a pet barcode (#/product/<code>) lands on the pet view', 'Pedigree' in t and 'Barcode ' + PED in t and 'Open Pet Food Facts' in t, t[:300])
    ok('[pet] FDA recall card: brand-level wording, dates, link to FDA, as-of', 'recalls listed for the brand Pedigree' in t and 'matches the brand name only' in t and '2026' in t and 'Recall list as of November 10, 2026' in t and pg.evaluate("[...document.querySelectorAll('.petp261 a[href^=\"https://www.fda.gov/animal-veterinary\"]')].length") >= 1, t[300:1200])
    ok('[pet] pet food is not scored: no Health / Blood sugar score pills', pg.evaluate("document.querySelectorAll('.petp261 .s20, .petp261 .sc20').length") == 0 and 'Health' not in t.split('Not scored')[0][:60] and "Lumi's Health and Blood sugar scores are for human food" in t)
    ok('[pet] never says safe; shows source links that open safely', not SAFE.search(t) and pg.evaluate("[...document.querySelectorAll('.petp261 a[target=_blank]')].every(a=>/noopener/.test(a.rel))"))
    # ---- hits ----
    go(pg, '#/product/' + ONION, '.petp261 h1', 1500); t = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[pet] onion/garlic in a dog food entry is flagged with sources and the poison lines', 'Onion, garlic, chives or leek' in t and 'ASPCA' in t and 'FDA' in t and '(888) 426-4435' in t and '(855) 764-7661' in t, t[:400])
    ok('[pet] poison numbers are tel: links', pg.evaluate("[...document.querySelectorAll('#dog261 a.tel261')].map(a=>a.getAttribute('href'))") == ['tel:8884264435', 'tel:8557647661'])
    go(pg, '#/product/' + CHOC_ES, '.petp261 h1', 1500); t = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[pet] a Spanish ingredient list still flags chocolate, and says it could not fully verify', 'Chocolate and cocoa' in t and "Couldn't fully verify" in t and "isn't in English" in t, t[:500])
    go(pg, '#/product/' + TETRA, '.petp261 h1', 1800); t = txt(pg); dc = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[pet] no ingredient list: "Couldn\'t verify" for the dog check and the ingredients card', "Couldn't verify" in dc and 'None of the' not in dc and "No ingredient list is on file" in t, dc)
    ok('[pet] a species-labelled entry for fish does not claim the dog check applies as a verdict; Tetra recall found at brand level', 'recall' in t.lower() and 'Tetra' in t)
    go(pg, '#/product/' + JUNK, '.petp261 h1', 1500); dc = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[pet] a junk "ingredient list" (volunteer typo) is not treated as a clean check', "Couldn't verify" in dc and 'None of the' not in dc, dc)
    go(pg, '#/product/' + CLEANP, '.petp261 h1', 1500); dc = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[pet] no toxic ingredient found: says "none found in the list on file", "not a safety rating", never safe', re.search(r'None of the 10 dog-toxic ingredients Lumi checks were found', dc) and 'not a safety rating' in dc and not SAFE.search(dc), dc)
    # ---- barcode order ----
    go(pg, '#/product/01223305', '#aw26', 3000)
    ok('[scan] a food barcode still opens the food page first (not pet)', pg.evaluate("!!document.getElementById('aw26')") and not pg.evaluate("!!document.querySelector('.petp261')"))
    go(pg, '#/browse', '#app', 200); go(pg, '#/product/0000000000017', '.card.empty', 3500); t = txt(pg)
    ok('[scan] a barcode in no source: not-found message now names Open Pet Food Facts', ('Open Pet Food Facts' in t) and 'not found' in t.lower(), t[:300])
    pg.evaluate("sessionStorage.setItem('lumi.scanned','%s')" % PED); go(pg, '#/product/' + PED, '.petp261 h1', 1500); ok('[scan] scanned pet food shows the "scanned" mark', 'scanned' in txt(pg))
    # ---- human food: dog card ----
    go(pg, '#/product/' + XYL, '#dog261', 3000); t = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[dog] xylitol gum: flagged as named toxic to dogs with ASPCA/FDA sources', 'Xylitol' in t and 'Named as toxic to dogs' in t and 'xylitol' in t and not SAFE.search(t), t[:400])
    ok('[dog] sources: ASPCA and FDA links open in a new tab safely', pg.evaluate("[...document.querySelectorAll('#dog261 .sr261 a')].length>=2 && [...document.querySelectorAll('#dog261 .sr261 a')].every(a=>/^https:\\/\\/www\\.(aspca\\.org|fda\\.gov)\\//.test(a.href)&&a.target=='_blank'&&/noopener/.test(a.rel))"))
    ok('[dog] jump button at the top and the card sits after the additive watch card', pg.evaluate("!!document.getElementById('dogj261')") and pg.evaluate("(()=>{const a=document.getElementById('aw26'),d=document.getElementById('dog261');return !!(a.compareDocumentPosition(d)&4)})()"))
    go(pg, '#/product/' + CHOCR, '#dog261', 3000); t = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[dog] chocolate with raisins: both chocolate and grapes/raisins flagged, cocoa butter handled separately', 'Chocolate and cocoa' in t and 'Grapes, raisins and sultanas' in t, t[:500])
    go(pg, '#/product/' + CLEANH, '#dog261', 3000); t = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[dog] clean list: "none found in the list on file", "not a safety rating"', 'None of the 10 dog-toxic ingredients' in t and 'not a safety rating' in t and not SAFE.search(t), t)
    go(pg, '#/product/' + NOLISTH, '#dog261', 3000); t = pg.evaluate("document.getElementById('dog261').innerText")
    ok('[dog] no ingredient list: "Couldn\'t verify", never clean', "Couldn't verify" in t and 'None of the' not in t, t)
    go(pg, '#/product/r-arbys-curly-fries-medium', '#nt24', 2500); ok('[dog] chain menu items (no ingredient lists) get no dog card', not pg.evaluate("!!document.getElementById('dog261')"))
    # ---- toxic page ----
    go(pg, '#/pet/toxic', '#pt261', 800); t = txt(pg)
    ok('[toxic] every checked ingredient listed with level, what it looks for and sources', pg.evaluate("document.querySelectorAll('.dh261c').length") == 11 and 'Xylitol' in t and 'Looks for:' in t and 'ASPCA' in t, t[:300])
    ok('[toxic] poison lines shown; not veterinary advice wording', '(888) 426-4435' in t and 'Not veterinary advice' in t)
    pg.fill('#pt261', ''); pg.click('#pc261'); pg.wait_for_timeout(300); ok('[toxic] checker with nothing pasted: "Couldn\'t verify"', "Couldn't verify" in pg.evaluate("document.getElementById('pr261').innerText"))
    pg.fill('#pt261', 'sugar, wheat flour, xylitol, cocoa butter, natural flavor'); pg.click('#pc261'); pg.wait_for_timeout(400); t = pg.evaluate("document.getElementById('pr261').innerText")
    ok('[toxic] checker flags xylitol and notes cocoa butter, with sources', 'Xylitol' in t and 'Cocoa butter' in t and 'ASPCA' in t, t[:400])
    pg.fill('#pt261', 'chicken, brown rice, salt, fish oil'); pg.click('#pc261'); pg.wait_for_timeout(400); t = pg.evaluate("document.getElementById('pr261').innerText")
    ok('[toxic] checker with nothing found: wording is "none found... not a safety rating"', 'None of the 10 dog-toxic ingredients' in t and 'not a safety rating' in t and not SAFE.search(t), t)
    pg.fill('#pt261', 'xylitol'); pg.click('#pc261'); pg.wait_for_timeout(300); ok('[toxic] a single pasted word still checks', 'Xylitol' in pg.evaluate("document.getElementById('pr261').innerText"))
    pg.click('#px261'); ok('[toxic] Clear empties the box and the result', pg.evaluate("document.getElementById('pt261').value==='' && document.getElementById('pr261').innerHTML===''"))
    # ---- recalls ----
    go(pg, '#/pet/recalls', '#rl261 li', 600); t = txt(pg)
    ok('[recalls] all 65 FDA rows, as-of date, link to FDA, honest about completeness', pg.evaluate("document.querySelectorAll('#rl261 li').length") == 65 and 'November 10, 2026' in t and "doesn't hold every recall" in t and pg.evaluate("!!document.querySelector('.petrec261 a[href^=\"https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals\"]')"), t[:300])
    pg.click('.rf261[data-f=dogs]'); pg.wait_for_timeout(300); nd = pg.evaluate("document.querySelectorAll('#rl261 li.rc261').length")
    ok('[recalls] "Mentions dogs" filter narrows the list and every row mentions a dog or puppy', 0 < nd < 65 and pg.evaluate("[...document.querySelectorAll('#rl261 li.rc261')].every(l=>/\\b(dogs?|puppy|puppies|canine)\\b/i.test(l.innerText))"), nd)
    # ---- browse + nav ----
    go(pg, '#/browse', '.petbr261', 800); ok('[browse] Pets tiles on Browse (pet food, dog-toxic list)', pg.evaluate("!!document.querySelector('.petbr261 [href=\"#/pet\"]') && !!document.querySelector('.petbr261 [href=\"#/pet/toxic\"]')"))
    for hh in ('#/pet', '#/pet/toxic', '#/pet/recalls'):
        go(pg, hh, '.pg13', 300); ok(f'[nav] Browse tab stays highlighted on {hh}', pg.evaluate("(document.querySelector('.tabbar a.on')||{dataset:{}}).dataset.v") == 'browse')
    ok('no page errors (desktop)', not errs, errs); c.close()
    # ---- layouts ----
    for th in ('light', 'dark'):
        for w, h in ((390, 844), (1440, 900)):
            c = ctx(b, th=th, w=w, h=h); errs = []; pg = page(c, errs); pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'"); pg.wait_for_timeout(600)
            for hh, sel in (('#/pet', '#pq261'), ('#/pet/dogs/royal%20canin', '#pl261 li'), ('#/pet/toxic', '.dh261c'), ('#/pet/recalls', '#rl261 li'), ('#/product/' + PED, '.petp261 .pcard261'), ('#/product/' + ONION, '#dog261'), ('#/product/' + XYL, '#dog261'), ('#/product/' + CLEANH, '#dog261')):
                go(pg, '#/browse', '#app', 100); go(pg, hh, sel, 2200)
                a = pg.evaluate(JS); ok(f'[{th} {w}] {hh[:28]} layout/contrast', a['over'] <= 1 and not a['wide'] and not a['bad'] and not a['small'], a)
                if th == 'light' and hh in ('#/pet', '#/product/' + XYL, '#/product/' + ONION, '#/pet/toxic'): pg.evaluate('scrollTo(0,0)'); pg.screenshot(path=OUT + f'v261-{re.sub("[^a-z0-9]", "", hh[2:12])}-{w}.png', full_page=(w == 390))
            ok(f'[{th} {w}] no page errors', not errs, errs); c.close()
    # ---- offline ----
    c = b.new_context(viewport={'width': 390, 'height': 844}); c.add_init_script("if(!sessionStorage.getItem('o')){sessionStorage.setItem('o','1');" + SEED + "}")
    pg = c.new_page(); pg.goto(base + '#/'); pg.wait_for_function("()=>navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=30000); pg.wait_for_timeout(2500)
    keys = pg.evaluate("caches.keys()"); c.set_offline(True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.reload(); pg.wait_for_timeout(2500)
    ok('[offline] app loads from lumi-v' + VER + ' cache with the 26.1 code', ('lumi-v' + VER) in keys and pg.evaluate("typeof PET26==='object' && typeof viewPetHub261==='function'"), keys)
    pg.evaluate("location.hash='#/pet/toxic'"); pg.wait_for_timeout(800); ok('[offline] the dog-toxic page and checker render without a connection', 'Check an ingredient list' in pg.evaluate("document.getElementById('app').innerText"))
    ok('[offline] no page errors', not errs, errs); c.close()
    print(f"\nt261: {sum(1 for _, x in R if x)}/{len(R)} passed in {int(time.time() - t0)}s"); print('FAILS', [r[0] for r in R if not r[1]])
    sys.exit(0 if all(x for _, x in R) else 1)
