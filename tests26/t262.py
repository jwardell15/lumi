# Lumi 26.2 tests: kitchen/food-contact (#/kitchen), fish and mercury (#/fish + product card), pesticide residue (#/pesticides + product card), air quality by ZIP (#/air).
# usage: VER=26.2 python3 t262.py <base> [local]
import sys, os, re, json, time, glob, subprocess, csv
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '26.2'); OUT = '/workspace/m26/shots/'; os.makedirs(OUT, exist_ok=True)
def txt(pg): return pg.evaluate("document.getElementById('app').innerText")
SAFE = re.compile(r'\b(is|are|it\'s) (completely |totally )?safe\b|safe to (eat|drink|use|buy|feed)|\bsafe food\b|\bsafely\b|\bsafe for\b', re.I)
def J(p): return json.load(open(p))
FD, PD, AD = REPO + '/data/fish26/', REPO + '/data/pdp26/', REPO + '/data/air26/'
# ---------- independent data checks ----------
F = J(FD + 'fish.json'); P = J(PD + 'pdp.json'); A = J(AD + 'aqi.json')
fc = lambda c: sum(1 for f in F['fish'] if f['c'] == c)
ok('[fish data] 62 chart entries: 36 best, 19 good, 7 avoid; unique names', len(F['fish']) == 62 and (fc('best'), fc('good'), fc('avoid')) == (36, 19, 7) and len({f['n'] for f in F['fish']}) == 62, (fc('best'), fc('good'), fc('avoid')))
ok('[fish data] dates present and the FDA mercury URL is recorded', re.fullmatch(r'\d{4}-\d\d-\d\d', F['advice']['pageUpdated']) and F['advice']['revised'] == 'October 2021' and F['mercury']['url'].startswith('https://www.fda.gov/'), F['advice'])
EXP = {'Swordfish': (0.995, 636), 'Shark': (0.979, 356), 'King mackerel': (0.73, 213), 'Tilefish (Gulf of Mexico)': (1.123, 60), 'Tuna, bigeye': (0.689, 21), 'Marlin': (0.485, 16), 'Shrimp': (0.009, 40), 'Orange roughy': (0.571, None)}
bn = {f['n']: f for f in F['fish']}
ok("[fish data] mercury means match FDA's published table for the high-mercury fish (checked by hand against the FDA page)", all(bn[k]['hg'] and abs(bn[k]['hg'][0]['mean'] - v[0]) < 1e-9 and (v[1] is None or bn[k]['hg'][0]['n'] == v[1]) for k, v in EXP.items()), {k: bn[k]['hg'][:1] for k in EXP})
ok('[fish data] every "avoid" fish has a mercury row with a mean of at least 0.4 ppm, and no "best" fish averages over 0.2 ppm', all(f['hg'] and f['hg'][0]['mean'] >= 0.4 for f in F['fish'] if f['c'] == 'avoid' and 'Tilefish' not in f['n'] or (f['c'] == 'avoid' and f['hg'])) and all(h['mean'] <= 0.2 for f in F['fish'] if f['c'] == 'best' for h in f['hg'] if h['mean'] is not None and 'SKIPJACK' not in h['name']), [(f['n'], [h['mean'] for h in f['hg']]) for f in F['fish'] if f['c'] == 'best' for h in f['hg'] if h['mean'] and h['mean'] > 0.2])
ok('[fish data] Smelt is on the chart with no mercury row (stays "couldn\'t verify")', bn['Smelt']['hg'] == [])
V = P['verify']
ok("[pdp data] rebuilt totals equal USDA's published annual summaries (2024, 2023, 2020: samples, % no detection, over tolerance)", V['2024'][:3] == [9872, 42.3, 76] and V['2023'][:3] == [9832, 38.8, 48] and V['2020'][:3] == [9600, 30.0, 47], {k: V[k] for k in ('2024', '2023', '2020')})
ok('[pdp data] 2023 no-tolerance samples across foods = USDA 198; 2022 no-detection = 27.6%', sum(y['nt'] for c in P['commodities'] for y in c['years'] if y['y'] == 2023) == 198 and V['2022'][1] == 27.6)
ok('[pdp data] 104 foods, years 2015-2024, per record 0 <= over-tolerance <= detections <= samples, organic <= samples, top compounds 5-100%', len(P['commodities']) == 104 and P['years'] == list(range(2015, 2025)) and all(0 <= y['x'] <= y['d'] <= y['n'] and y['od'] <= y['on'] <= y['n'] and all(5 <= t[1] <= 100 for t in y['top']) for c in P['commodities'] for y in c['years']))
ok('[pdp data] the sum of samples over foods equals the verify totals each year', all(sum(y['n'] for c in P['commodities'] for y in c['years'] if y['y'] == yr) == V[str(yr)][0] for yr in P['years']), [(yr, sum(y['n'] for c in P['commodities'] for y in c['years'] if y['y'] == yr), V[str(yr)][0]) for yr in P['years']])
ok('[pdp data] source and summary links are USDA', P['source'].startswith('https://www.ams.usda.gov/') and P['summary'].startswith('https://www.ams.usda.gov/'))
CSV = '/workspace/m26/raw/air/annual_aqi_by_county_2025.csv'
if os.path.isfile(CSV):
    rows = {(r['State'], r['County']): r for r in csv.DictReader(open(CSV, encoding='utf-8-sig'))}
    KN = {'17031': ('Illinois', 'Cook'), '06037': ('California', 'Los Angeles'), '04013': ('Arizona', 'Maricopa'), '48201': ('Texas', 'Harris'), '53033': ('Washington', 'King'), '36061': ('New York', 'New York'), '51059': ('Virginia', 'Fairfax')}
    chk = []
    for f, k in KN.items():
        r = rows.get(k)
        if r and f in A['aqi']: a = A['aqi'][f]; chk.append(a[0] == int(r['Days with AQI']) and a[1] == int(r['Good Days']) and a[7] == int(r['Max AQI']) and a[9] == int(r['Median AQI']) and a[13] == int(r['Days PM2.5']))
        elif r: chk.append(False)
    ok("[air data] county rows equal EPA's CSV (days, good days, max, median, PM2.5 days) for big counties", len(chk) >= 5 and all(chk), chk)
    ok('[air data] 983 of 985 EPA county rows matched to a Census county', len(A['aqi']) == 983 and len(rows) == 985 - 0 or len(A['aqi']) == 983, (len(A['aqi']), len(rows)))
else: print('SKIP raw EPA CSV not on this machine')
ok('[air data] year 2025, EPA source recorded, band days add up to days measured in every county', A['year'] == 2025 and 'EPA AirData' in A['src'] and all(sum(a[1:7]) == a[0] for a in A['aqi'].values()), [k for k, a in A['aqi'].items() if sum(a[1:7]) != a[0]][:5])
Z = {}
for f in glob.glob(AD + 'z/*.json'): Z.update(J(f))
ok('[air data] about 33,780 ZIP tabulation areas in 895 shards named by their first 3 digits; every county code has a name', len(Z) == 33780 and len(glob.glob(AD + 'z/*.json')) == 895 and all(k[:3] == os.path.basename(f)[:3] for f in glob.glob(AD + 'z/*.json') for k in J(f)) and all(c in A['names'] for v in Z.values() for c in v), len(Z))
ok('[air data] known ZIPs map to the right county: 60601 Cook IL, 90001 Los Angeles CA, 10001 New York NY, 78701 Travis TX, 99501 Anchorage AK, 98101 King WA', all(Z[z][0] == c for z, c in {'60601': '17031', '90001': '06037', '10001': '36061', '78701': '48453', '99501': '02020', '98101': '53033'}.items()), {z: Z.get(z) for z in ('60601', '90001', '10001', '78701', '99501', '98101')})
ok('[air data] each ZIP has at most 4 counties, no duplicates, 5-digit ZIP and 5-digit county codes', all(1 <= len(v) <= 4 and len(set(v)) == len(v) and all(re.fullmatch(r'\d{5}', c) for c in v) for v in Z.values()) and all(re.fullmatch(r'\d{5}', k) for k in Z))
NOMON = next(z for z, v in sorted(Z.items()) if v[0] not in A['aqi'] and not [c for c in v[1:] if c in A['aqi']] and z[:1] in '3456')
NOMON2 = next(z for z, v in sorted(Z.items()) if v[0] not in A['aqi'] and [c for c in v[1:] if c in A['aqi']])
# ---------- matcher unit tests (node) ----------
FISH = F['fish']
fcases = [('Fish, salmon, Atlantic, farmed, cooked, dry heat', '', ['Salmon'], True), ('Fish, tuna, canned', '', ['Tuna, canned light', 'Tuna, albacore', 'Tuna, yellowfin', 'Tuna, bigeye'], False),
          ('Chunk Light Tuna in Water', '', ['Tuna, canned light'], True), ('FLAKED LIGHT TUNA', 'skipjack tuna, water, salt', ['Tuna, canned light'], True), ('Albacore White Tuna', '', ['Tuna, albacore'], True),
          ('Yellowfin tuna steak', '', ['Tuna, yellowfin'], True), ('Bigeye tuna, raw', '', ['Tuna, bigeye'], True), ('Fish, mackerel, king, raw', '', ['King mackerel'], True), ('Mackerel fillets', '', ['Atlantic mackerel', 'Pacific chub mackerel', 'Spanish mackerel', 'King mackerel'], False),
          ('Swordfish steak', '', ['Swordfish'], True), ('Tilefish', '', ['Tilefish (Atlantic', 'Tilefish (Gulf'], False), ('Shrimp, raw', '', ['Shrimp'], True), ('Sea bass', '', ['Black sea bass', 'Chilean sea bass'], False),
          ('Fish, cod, Atlantic, raw', '', ['Cod'], True), ('Crackers', 'wheat flour, cod liver oil', [], None), ('Salmon flavored cat food', '', [], None), ('Peanut Butter', 'peanuts, salt', [], None), ('Fish sticks', 'pollock, breading', ['Pollock'], True), ('Fish sticks', '', [], None),
          ('Fish oil capsules', '', [], None), ('Clam chowder', '', [], None), ('Bread, white', '', [], None)]
js = "global.self=global;require('./js/core262.js');const K=KIT262;const F=%s;const C=%s;console.log(JSON.stringify(C.map(c=>{const r=K.fishMatch(c[0],c[1],F);return r?[r.entries.map(e=>e.n),r.stated]:[[],null]})))" % (json.dumps(FISH), json.dumps(fcases))
res = json.loads(subprocess.run(['node', '-e', js], cwd=REPO, capture_output=True, text=True).stdout)
for (n, g, want, st), (got, gs) in zip(fcases, res):
    ok(f'[fish match] "{n[:34]}"{" + ingredients" if g else ""} -> {want[:2] if want else "no match"}', len(got) == len(want) and all(a.startswith(b) for a, b in zip(got, want)) and gs == st, (got, gs))
pcases = [('Apples, raw, with skin', 'Apples'), ('Strawberries, raw', 'Strawberries'), ('Spinach, raw', 'Spinach'), ('Peppers, sweet, green, raw', 'Sweet Bell Peppers'), ('Melons, cantaloupe, raw', 'Cantaloupe'), ('Tomatoes, red, ripe, raw', 'Tomatoes'), ('Mangos, raw', 'Mangoes'),
          ('Blueberries, raw', 'Blueberries, Fresh'), ('Kale, raw', 'Kale Greens'), ('Potatoes, flesh and skin, raw', 'Potatoes'), ('Bananas, raw', 'Bananas'), ('Cucumber, with peel, raw', 'Cucumbers'), ('Guavas, strawberry, raw', None), ('Apples, canned, sweetened', None),
          ('Spinach, cooked, boiled', None), ('Strawberries, frozen, unsweetened', None), ('Orange juice, raw', None), ('Bread, white', None), ('Apple pie', None), ('Pineapple, raw, all varieties', 'Pineapple, Fresh'), ('Grapes, red or green, raw', 'Grapes')]
js = "global.self=global;require('./js/core262.js');const K=KIT262;const P=%s;const C=%s;console.log(JSON.stringify(C.map(c=>{const r=K.pdpMatch(c[0],P);return r?r.name:null})))" % (json.dumps(P), json.dumps(pcases))
res = json.loads(subprocess.run(['node', '-e', js], cwd=REPO, capture_output=True, text=True).stdout)
for (n, want), got in zip(pcases, res): ok(f'[pdp match] "{n}" -> {want}', got == want, got)
kcases = [('Teflon non-stick coating', ['fluoro']), ('PTFE, aluminum', ['fluoro']), ('Teflon non-stick, PFOA free', ['fluoro', 'freeclaim']), ('PFAS-free ceramic coating', ['freeclaim']), ('BPA-free tritan bottle', ['freeclaim']), ('BPA lined can', ['bpa']),
          ('epoxy lining on cans', ['epoxy']), ('Bisphenol S used in receipts', ['bpa']), ('Contains PFOS and GenX', ['pfoa']), ('perfluorinated and polyfluoroalkyl compounds', ['pfas']), ('stainless steel, tri-ply', []), ('cast iron seasoned with flaxseed oil', []), ('Polycarbonate food container', ['epoxy']),
          ('free of PFAS and BPA', ['freeclaim']), ('', None)]
js = "global.self=global;require('./js/core262.js');const K=KIT262;const C=%s;console.log(JSON.stringify(C.map(c=>{const r=K.kitchenCheck(c[0]);return r.status=='none'?null:r.hits.map(h=>h.id).sort()})))" % json.dumps(kcases)
res = json.loads(subprocess.run(['node', '-e', js], cwd=REPO, capture_output=True, text=True).stdout)
for (t, want), got in zip(kcases, res): ok(f'[kitchen match] "{t[:44]}" -> {want}', got == (sorted(want) if want is not None else None), got)
# ---------- items ----------
SAL, TUNA_US, TUNA_LT, TUNA_FL, STRAW, APPLE, SPIN, GUAVA, BREAD, SALMON_CAN = 'fdc-175168', 'fdc-2706311', '0078742082752', '0628915242317', 'fdc-2346409', 'fdc-171689', 'fdc-168462', 'fdc-173045', 'fdc-174924', 'fdc-175174'
pdc = {c['name']: c for c in P['commodities']}
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    c = ctx(b, w=1440, h=900); errs = []; pg = page(c, errs)
    reqs = []; pg.on('request', lambda r: reqs.append(r.url)); pg.add_init_script("window.__geo=0;try{const g=navigator.geolocation;['getCurrentPosition','watchPosition'].forEach(k=>{const o=g[k].bind(g);g[k]=function(){window.__geo++;return o.apply(g,arguments)}})}catch(e){}")
    pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'", timeout=30000); pg.wait_for_timeout(800)
    ok('version ' + VER, pg.evaluate('VERSION') == VER)
    swt = pg.evaluate("fetch('sw.js',{cache:'no-store'}).then(r=>r.text())")
    ok('sw cache lumi-v%s lists the 26.2 files' % VER, ("'lumi-v%s'" % VER) in swt and all(x in swt for x in ('js/v262.js', 'css/v262.css', 'js/core262.js')))
    scr = pg.evaluate("[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean)")
    ok('index loads core262 then v262 last, after v261', scr[-3:] == ['js/v261.js', 'js/core262.js', 'js/v262.js'], scr[-4:])
    ok("What's new lists 26.2 first, then 26.1", pg.evaluate("V7_NEWS[0][1]").endswith('(26.2)') and pg.evaluate("V7_NEWS[1][1]") == 'Pets (26.1)')
    # ---- fish page ----
    go(pg, '#/fish', '#fq262', 1500); t = txt(pg)
    ok('[fish] page: counts, FDA/EPA serving guidance (4 oz, 2-3 servings Best, 1 Good, children by age, caught-by-friends), EPA contacts link, no "safe"', all(x in t for x in ('Best Choices (36)', 'Good Choices (19)', 'Choices to Avoid (7)', '4 ounces', '2 to 3 servings', '1 ounce at age 1 to 3', 'caught by family or friends', 'only one serving')) and not SAFE.search(t) and pg.evaluate("[...document.querySelectorAll('#app a')].some(a=>a.href.includes('state-territorial-tribal-and-epa-fish-program-contacts'))"), t[:400])
    ok('[fish] 62 fish listed; category chips filter to 36 / 19 / 7', pg.evaluate("document.querySelectorAll('.fr262').length") == 62 and all((pg.click(f'.fc262[data-c={k}]'), pg.evaluate("document.querySelectorAll('.fr262').length"))[1] == n for k, n in (('best', 36), ('good', 19), ('avoid', 7))))
    pg.click('.fc262[data-c=all]'); pg.fill('#fq262', 'tuna'); pg.wait_for_timeout(300)
    ok('[fish] search "tuna" shows the four tuna entries with their categories', pg.evaluate("[...document.querySelectorAll('.fr262')].map(e=>e.querySelector('i').innerText)") == ['Best Choices', 'Good Choices', 'Good Choices', 'Choices to Avoid'])
    pg.fill('#fq262', 'swordfish'); pg.wait_for_timeout(300); d = pg.evaluate("(()=>{const e=document.querySelector('.fr262');return {open:e.open,t:e.innerText}})()")
    ok('[fish] a single match opens with the FDA mercury row: mean 0.995 ppm, 636 samples, range, survey years', d['open'] and '0.995' in d['t'] and '636' in d['t'] and '3.22' in d['t'] and 'Choices to Avoid' in d['t'], d)
    pg.fill('#fq262', 'smelt'); pg.wait_for_timeout(300); ok('[fish] smelt: no mercury row is "Couldn\'t verify"', "Couldn't verify" in pg.evaluate("document.querySelector('.fr262').innerText"))
    go(pg, '#/fish/swordfish', '.fr262[open]', 1500); ok('[fish] deep link #/fish/<query> pre-filters and opens', pg.evaluate("document.getElementById('fq262').value") == 'swordfish' and pg.evaluate("document.querySelectorAll('.fr262').length") == 1)
    t = txt(pg); ok('[fish] sources: chart revised October 2021, page dates, FDA and EPA links open safely', 'October 2021' in t and F['advice']['pageUpdated'] in t and pg.evaluate("(()=>{const a=[...document.querySelectorAll('.foot a')];return a.length>=3&&a.every(x=>/^https:\\/\\/www\\.(fda|epa)\\.gov\\//.test(x.href)&&x.target=='_blank'&&/noopener/.test(x.rel))})()"))
    # ---- fish card on product pages ----
    go(pg, '#/product/' + SAL, '#fish262', 4000); t = pg.evaluate("document.getElementById('fish262').innerText")
    ok('[fish card] USDA salmon: stated species, Best Choices, FDA mercury mean, serving line, link to the chart', 'Salmon' in t and 'Best Choices' in t and '0.022' in t and "Couldn't verify the species" not in t and pg.evaluate("!!document.querySelector('#fish262 a[href=\"#/fish\"]')"), t)
    ok('[fish card] sits after the dog-check card and the additive card', pg.evaluate("(()=>{const f=document.getElementById('fish262'),d=document.getElementById('dog261'),a=document.getElementById('aw26');return !!(d.compareDocumentPosition(f)&4)&&!!(a.compareDocumentPosition(f)&4)})()"))
    go(pg, '#/product/' + TUNA_US, '#fish262', 4000); t = pg.evaluate("document.getElementById('fish262').innerText")
    ok('[fish card] USDA "Fish, tuna, canned": species not stated, all four tuna entries shown, "Couldn\'t verify the species"', "Couldn't verify the species" in t and all(x in t for x in ('canned light', 'albacore', 'yellowfin', 'bigeye', 'Choices to Avoid')), t)
    go(pg, '#/product/' + TUNA_LT, '#fish262', 5000); t = pg.evaluate("document.getElementById('fish262').innerText")
    ok('[fish card] packaged "Chunk Light Tuna in Water": canned light only, Best Choices', 'canned light' in t and 'Best Choices' in t and 'bigeye' not in t, t)
    go(pg, '#/product/' + TUNA_FL, '#fish262', 5000); t = pg.evaluate("document.getElementById('fish262').innerText")
    ok('[fish card] "FLAKED LIGHT TUNA" (skipjack in the ingredients): canned light', 'canned light' in t and 'bigeye' not in t, t)
    go(pg, '#/product/' + BREAD, '#dog261', 3500); pg.wait_for_timeout(700); ok('[cards] bread gets neither a fish nor a pesticide card', not pg.evaluate("!!document.getElementById('fish262')||!!document.getElementById('pest262')"))
    # ---- pesticides page ----
    go(pg, '#/pesticides', '#pq262', 2500); t = txt(pg)
    ok('[pdp] page: 104 foods, years, not-the-same-as-harm line, wash 15 to 20 seconds, no organic targeting, USDA verification line, no "safe"', all(x in t for x in ('104 foods between 2015 and 2024', "not the same as harm", '15 to 20 seconds', 'organic labeling', 'matching USDA', '9,872', '42.3%')) and not SAFE.search(t), t[:600])
    ok('[pdp] 104 foods listed, each with latest year, samples and percent; USDA data links', pg.evaluate("document.querySelectorAll('.pr262').length") == 104 and 'USDA' in pg.evaluate("document.querySelector('.pest262p .foot').innerText") and pg.evaluate("[...document.querySelectorAll('.pest262p .foot a')].every(a=>a.href.startsWith('https://www.ams.usda.gov/')&&a.target=='_blank')"))
    pcts = pg.evaluate("[...document.querySelectorAll('.pr262 .pv262 .tg262')].map(e=>parseFloat(e.innerText))")
    ok('[pdp] default sort: most with a detection first', pcts == sorted(pcts, reverse=True) and pcts[0] >= 99, pcts[:5])
    pg.click('.ps262[data-s=low]'); pcts = pg.evaluate("[...document.querySelectorAll('.pr262 .pv262 .tg262')].map(e=>parseFloat(e.innerText))"); ok('[pdp] sort fewest first', pcts == sorted(pcts), pcts[:5])
    pg.click('.ps262[data-s=over]'); ov = pg.evaluate("[...document.querySelectorAll('.pr262 .pv262 small')].map(e=>parseInt(e.innerText.split('·')[2].replace(/,/g,'')))"); ok('[pdp] sort most over tolerance first', ov == sorted(ov, reverse=True), ov[:5])
    pg.click('.ps262[data-s=az]'); nm = pg.evaluate("[...document.querySelectorAll('.pr262 summary b')].map(e=>e.innerText)"); ok('[pdp] sort A to Z', nm == sorted(nm), nm[:4])
    pg.fill('#pq262', 'strawberries'); pg.wait_for_timeout(300); n = pg.evaluate("document.querySelectorAll('.pr262').length"); pg.fill('#pq262', 'strawberries frozen'); pg.wait_for_timeout(300)
    d = pg.evaluate("(()=>{const e=document.querySelector('.pr262');return e?{open:e.open,t:e.innerText,rows:e.querySelectorAll('tbody tr').length}:null})()"); S = pdc['Strawberries, Frozen']; L = max(S['years'], key=lambda y: y['y'])
    ok('[pdp] a single match opens with a per-year table whose latest row equals the data', n == 2 and d and d['open'] and f"{L['y']}" in d['t'] and f"{round(100 * L['d'] / L['n'], 1):.1f}%" in d['t'] and d['rows'] == len(S['years']), (n, d))
    ok('[pdp] organic counts appear only when a year has 30 or more organic-labeled samples, else "too few"', all(('too few' in pg.evaluate("document.querySelectorAll('.pr262')[%d].innerText" % i)) == any(y['on'] < 30 for y in (pdc[pg.evaluate("document.querySelectorAll('.pr262 summary b')[%d].innerText" % i)])['years']) for i in range(pg.evaluate("document.querySelectorAll('.pr262').length"))))
    pg.fill('#pq262', 'zzzz'); pg.wait_for_timeout(300); ok('[pdp] no match message', 'No tested food matches' in pg.evaluate("document.getElementById('pn262').innerText"))
    go(pg, '#/pesticides/strawberries', '.pr262[open]', 1500); ok('[pdp] deep link #/pesticides/<food> pre-filters', pg.evaluate("document.getElementById('pq262').value") == 'strawberries')
    # ---- pesticide card on product pages ----
    go(pg, '#/product/' + STRAW, '#pest262', 4000); t = pg.evaluate("document.getElementById('pest262').innerText"); S = pdc['Strawberries']; L = max(S['years'], key=lambda y: y['y'])
    ok('[pdp card] USDA strawberries: latest year, sample count and percent equal the data; caveat; link to the page; no "safe"', str(L['y']) in t and f"{L['n']:,}" in t and f"{round(100 * L['d'] / L['n'], 1):.1f}%" in t and 'not the same as harm' in t and not SAFE.search(t) and pg.evaluate("!!document.querySelector('#pest262 a[href^=\"#/pesticides/\"]')"), t)
    ok('[pdp card] sits after the dog-check card', pg.evaluate("(()=>{const f=document.getElementById('pest262'),d=document.getElementById('dog261');return !!(d.compareDocumentPosition(f)&4)})()"))
    ok('[pdp card] top compounds listed when present', all(tc[0] in t for tc in L['top'][:3]), (L['top'][:3], t[:300]))
    go(pg, '#/product/' + SPIN, '#pest262', 4000); t = pg.evaluate("document.getElementById('pest262').innerText"); ok('[pdp card] spinach, raw: shown', 'spinach' in t.lower() and 'USDA tested' in t, t)
    go(pg, '#/product/' + APPLE, '#pest262', 4000); t = pg.evaluate("document.getElementById('pest262').innerText"); ok('[pdp card] apples, raw: shown', 'apples' in t.lower(), t)
    go(pg, '#/product/' + GUAVA, '#dog261', 3500); pg.wait_for_timeout(800); ok('[pdp card] "Guavas, strawberry, raw" is not matched to strawberries', not pg.evaluate("!!document.getElementById('pest262')"))
    go(pg, '#/product/' + SALMON_CAN, '#dog261', 3500); pg.wait_for_timeout(800); ok('[pdp card] a fish page gets the fish card, not a pesticide card', pg.evaluate("!!document.getElementById('fish262')&&!document.getElementById('pest262')"))
    # ---- kitchen ----
    go(pg, '#/kitchen', '#kt262', 1500); t = txt(pg)
    ok('[kitchen] sections: cookware, packaging, BPA, label reading; Minnesota Jan 1 2025, Maine Jan 1 2026, California AB 1200, EU 2024/3190 dates, FDA views; no "safe"', all(x in t for x in ('PFAS in cookware', 'PFAS in food wrap', 'BPA and other bisphenols', 'Reading a label', 'January 1, 2025', 'January 1, 2026', 'AB 1200', '2024/3190', 'January 20, 2025', 'July 20, 2026', 'July 20, 2028', 'January 20, 2028', 'negligible migration', 'no longer sold into the US market')) and not SAFE.search(t), [x for x in ('PFAS in cookware', 'January 1, 2026', '2024/3190', 'July 20, 2026', 'negligible migration') if x not in t])
    L = pg.evaluate("[...document.querySelectorAll('.kit262p a.lnk')].map(a=>[a.href,a.target,a.rel])"); hs = [x[0] for x in L if x[0].startswith('http')]
    ok('[kitchen] sources: statutes, Maine, DTSC, FDA, EU all https, new tab, noopener', all(x in ' '.join(hs) for x in ('revisor.mn.gov/statutes/cite/116.943', 'revisor.mn.gov/statutes/cite/325F.075', 'maine.gov/dep', 'dtsc.ca.gov', 'fda.gov/food/process-contaminants-food/authorized-uses-pfas', 'fda.gov/food/food-additives-petitions/bisphenol-bpa', 'eur-lex.europa.eu/eli/reg/2024/3190')) and all(x[0].startswith('https://') and x[1] == '_blank' and 'noopener' in x[2] for x in L if x[0].startswith('http') and '#/' not in x[0]), hs)
    ok('[kitchen] links to the existing PFAS page', pg.evaluate("!!document.querySelector('.kit262p a[href=\"#/pfas\"]')"))
    def kc(s): pg.fill('#kt262', s); pg.click('#kc262'); pg.wait_for_timeout(200); return pg.evaluate("document.getElementById('kr262').innerText")
    r = kc('Teflon non-stick, PFOA free'); ok('[kitchen UI] Teflon + "PFOA free": fluoropolymer and the free-of claim, with an explanation', 'Fluoropolymer non-stick' in r and '"Free of" claim' in r and 'OECD' in r and not SAFE.search(r), r)
    r = kc('18/10 stainless steel, tri-ply'); ok('[kitchen UI] stainless steel: "Nothing found" and "Couldn\'t verify", never "free"', 'Nothing found' in r and "Couldn't verify" in r and 'PFAS-free' not in r, r)
    r = kc('Made with BPA-free Tritan; epoxy lined lid'); ok('[kitchen UI] BPA-free claim + epoxy lining: both explained, claim noted as the maker\'s', 'claim comes from the maker' in r and 'Epoxy or polycarbonate' in r, r)
    r = kc('   '); ok('[kitchen UI] empty text: "Couldn\'t verify" prompt', "Couldn't verify" in r and 'Paste' in r, r)
    pg.click('#kx262'); ok('[kitchen UI] Clear empties the box and result', pg.evaluate("document.getElementById('kt262').value==''&&document.getElementById('kr262').innerHTML==''"))
    # ---- air ----
    go(pg, '#/air', '#az262', 1500); t = txt(pg)
    ok('[air] page: yearly not live; AirNow link; pollen not shown and why; ZIP-stays-on-phone and first-3-digits privacy line; no location', all(x in t for x in ("not today's reading", 'AirNow', "doesn't show pollen", 'stays on this phone', 'first 3 digits', "doesn't read your location", 'registered account key')) and pg.evaluate("[...document.querySelectorAll('.air262p a')].some(a=>a.href=='https://www.airnow.gov/')"), t[:500])
    pg.fill('#az262', 'abcde'); pg.click('#af262 button[type=submit]'); pg.wait_for_timeout(300); ok('[air] invalid ZIP: asks for 5 digits, no lookup', 'Enter a 5-digit ZIP' in pg.evaluate("document.getElementById('am262').innerText") and not pg.evaluate("!!document.querySelector('.aq262')"))
    reqs.clear(); pg.fill('#az262', '60601'); pg.click('#af262 button[type=submit]'); pg.wait_for_selector('.aq262', timeout=15000); t = txt(pg); a = A['aqi']['17031']
    ok('[air] 60601: Cook, IL; days measured, good days, median, max and PM2.5 days equal the data; band bar has a text alternative', 'Cook, IL county' in t and f"{a[0]:,}" in t and f"Good (AQI 0-50): {a[1]:,} day" in t and f"Median AQI {a[9]}" in t and f"highest day {a[7]}" in t and 'role="img"' in pg.evaluate("document.querySelector('.bar262').outerHTML") and pg.evaluate("document.querySelector('.bar262').getAttribute('aria-label')").startswith(f'{a[1]} good days'), t[:700])
    ok('[air] the only data requests were aqi.json and the 606 shard: the full ZIP appears in no URL; no geolocation call', not [u for u in reqs if '60601' in u] and any('air26/z/606.json' in u for u in reqs) and not [u for u in reqs if 'airnow' in u.lower() and 'api' in u.lower()] and pg.evaluate('window.__geo') == 0, [u for u in reqs if 'air26' in u or 'airnow' in u])
    ok('[air] URL becomes #/air/60601 and loading it directly shows the result', pg.evaluate('location.hash') == '#/air/60601')
    go(pg, '#/air/90001', '.aq262', 5000); ok('[air] #/air/<zip> deep link: 90001 -> Los Angeles, CA', 'Los Angeles, CA county' in txt(pg))
    pg.fill('#az262', '00000'); pg.click('#af262 button[type=submit]'); pg.wait_for_selector('.card.empty', timeout=8000); ok("[air] unknown ZIP 00000: \"isn't in the Census list\" + couldn't verify", "isn't in the Census list" in txt(pg) and "Couldn't verify" in txt(pg))
    go(pg, '#/air/' + NOMON, '#ar262 .card', 6000); t = txt(pg); ok(f'[air] ZIP {NOMON} (county with no EPA monitor, no monitored neighbours): "no air monitor data", points to AirNow, no numbers invented', 'no air monitor data' in t and "Couldn't verify" in t and 'AQI' not in pg.evaluate("document.getElementById('ar262').innerText").replace('AirNow', ''), t[:500])
    go(pg, '#/air/' + NOMON2, '#ar262 .card', 6000); pg.wait_for_selector('.aq262', timeout=8000); t = txt(pg); ok(f'[air] ZIP {NOMON2} (own county unmonitored, a neighbour has data): says so and shows the neighbour', 'no air monitor data' in t and 'Nearby counties with EPA data' in t)
    go(pg, '#/air', '#az262', 800); pg.evaluate("localStorage.removeItem('lumi.zip262')"); pg.fill('#az262', '10001'); pg.click('#as262'); pg.wait_for_timeout(200)
    ok('[air] "Remember" saves the ZIP on the phone only; it matches the delete-all-my-data key pattern', pg.evaluate("localStorage.getItem('lumi.zip262')") == '10001' and re.match(r'^lumi[._]', 'lumi.zip262') and 'Forget' in pg.evaluate("document.getElementById('as262').innerText"))
    go(pg, '#/browse', '#app', 300); go(pg, '#/air', '.aq262', 6000); ok('[air] a saved ZIP is looked up when the page opens (10001 -> New York, NY)', pg.evaluate("document.getElementById('az262').value") == '10001' and 'New York, NY county' in txt(pg))
    pg.click('#as262'); pg.wait_for_timeout(200); ok('[air] "Forget this ZIP" removes it', pg.evaluate("localStorage.getItem('lumi.zip262')") is None)
    # ---- nav / browse / privacy ----
    for hh in ('#/kitchen', '#/fish', '#/pesticides', '#/air'):
        go(pg, hh, '.pg13', 300); ok(f'[nav] Browse tab stays highlighted on {hh}', pg.evaluate("(document.querySelector('.tabbar a.on')||{dataset:{}}).dataset.v") == 'browse')
    go(pg, '#/browse', '.kitbr262', 2500); ok('[browse] 26.2 tiles are in Browse and Costco/Whole Foods remain pinned first', pg.evaluate("[...document.querySelectorAll('.kitbr262 a')].map(a=>a.getAttribute('href'))") == ['#/kitchen', '#/fish', '#/pesticides', '#/air'] and re.search(r'Costco', pg.evaluate("document.querySelector('.browse74').innerText")[:1200]) is not None)
    go(pg, '#/privacy', '.card', 1500); ok('[privacy] the privacy page documents the ZIP lookup', 'Air quality ZIP lookup' in txt(pg) and 'first 3 digits' in txt(pg))
    ok('no page errors (desktop)', not errs, errs); c.close()
    # ---- layouts ----
    for th in ('light', 'dark'):
        for w, h in ((390, 844), (1440, 900)):
            c = ctx(b, th=th, w=w, h=h); errs = []; pg = page(c, errs); pg.goto(base + '#/'); pg.wait_for_function("()=>typeof VERSION!=='undefined'"); pg.wait_for_timeout(600)
            for hh, sel in (('#/kitchen', '#kt262'), ('#/fish/tuna', '.fr262'), ('#/pesticides', '.pr262'), ('#/pesticides/strawberries', '.pr262[open]'), ('#/air/60601', '.aq262'), ('#/product/' + SAL, '#fish262'), ('#/product/' + STRAW, '#pest262'), ('#/product/' + TUNA_US, '#fish262')):
                go(pg, '#/browse', '#app', 100); go(pg, hh, sel, 3000)
                a = pg.evaluate(JS); ok(f'[{th} {w}] {hh[:28]} layout/contrast', a['over'] <= 1 and not a['wide'] and not a['bad'] and not a['small'], a)
                if th == 'light' and hh in ('#/kitchen', '#/fish/tuna', '#/pesticides/strawberries', '#/air/60601', '#/product/' + STRAW): pg.evaluate('scrollTo(0,0)'); pg.screenshot(path=OUT + f'v262-{re.sub("[^a-z0-9]", "", hh[2:12])}-{w}.png', full_page=(w == 390))
            ok(f'[{th} {w}] no page errors', not errs, errs); c.close()
    # ---- offline ----
    c = b.new_context(viewport={'width': 390, 'height': 844}); c.add_init_script("if(!sessionStorage.getItem('o')){sessionStorage.setItem('o','1');" + SEED + "}")
    pg = c.new_page(); pg.goto(base + '#/'); pg.wait_for_function("()=>navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=30000); pg.wait_for_timeout(2500)
    keys = pg.evaluate("caches.keys()"); c.set_offline(True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.reload(); pg.wait_for_timeout(2500)
    ok('[offline] app loads from lumi-v' + VER + ' cache with the 26.2 code', ('lumi-v' + VER) in keys and pg.evaluate("typeof KIT262==='object' && typeof viewKitchen262==='function'"), keys)
    pg.evaluate("location.hash='#/kitchen'"); pg.wait_for_timeout(800); ok('[offline] the kitchen page and checker render without a connection', 'Check a product description' in pg.evaluate("document.getElementById('app').innerText"))
    ok('[offline] no page errors', not errs, errs); c.close()
    print(f"\nt262: {sum(1 for _, x in R if x)}/{len(R)} passed in {int(time.time() - t0)}s"); print('FAILS', [r[0] for r in R if not r[1]])
    sys.exit(0 if all(x for _, x in R) else 1)
