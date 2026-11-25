# Lumi 27.3: grade a label photo (paste / drop / file input), on-device OCR (self-hosted Tesseract.js), label parser (clean + noisy OCR text), grading, edit table, save, offline.
# usage: VER=27.3 python3 t273.py <base> [local]
import sys, os, re, json, time, base64
os.environ['LUMI_LATE'] = '0'
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
FX = REPO + '/tests27/fx273/'
B64 = lambda f: base64.b64encode(open(FX + f, 'rb').read()).decode()
TRUTH = {'servG': 39, 'servings': 20, 'kcal': 140, 'fat': 1, 'sat': 0.5, 'trans': 0, 'chol': 5, 'sodium': 290, 'carbs': 9, 'fiber': 2, 'sugars': 5, 'added': 4, 'protein': 25}
ING = 'GRASS-FED BEEF BONE BROTH, GRASS-FED HYDROLYZED COLLAGEN, COCOA POWDER, ORGANIC COCONUT SUGAR, NON-FAT DRY MILK, FRENCH GREY SEA SALT, CAFFEINE (GUARANA), ORGANIC MONK FRUIT'
CLEAN = open(FX + 'ocr-clean.txt').read()
NOISY = {
  'O for 0, 9 for g, S for 5, rng for mg, glued labels': CLEAN.replace('Trans Fat 0g', 'Trans Fat Og').replace('Cholesterol <5mg', 'Cholesterol <Smg').replace('Sodium 290mg', 'Sodium 290rng').replace('Dietary Fiber 2g 7%', 'Dietary Fiber 29 7%').replace('Total Carbohydrate 9g', 'TotalCarbohydrate9g').replace('Serving size 1 Scoop (39g)', 'Serving size 1 Scoop (399)').replace('Saturated Fat 0.5g', 'Saturated Fat 05g').replace('Protein 25g', 'Protein 25¢'),
  'merged lines': CLEAN.replace('Total Fat 1g 1%\nSaturated Fat 0.5g 3%', 'Total Fat 1g 1% Saturated Fat 0.5g 3%').replace('Total Sugars 5g\nIncludes 4g Added Sugars 8%', 'Total Sugars 5g Includes 4g Added Sugars 8%'),
  '"5g" read as "59g"': CLEAN.replace('Total Sugars 5g', 'Total Sugars 59g'),
  'two columns interleaved': open(FX + 'ocr-twocol.txt').read(),
}
def wait_result(pg, t=180000): pg.wait_for_function("document.querySelector('#ph273t') || /Couldn/.test((document.querySelector('#ph273s')||{}).textContent||'')", timeout=t)
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    c = ctx(b); errs = []; pg = page(c, errs); reqs = []; pg.on('request', lambda r: reqs.append(r.url))
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan', timeout=40000); pg.wait_for_selector('#sform .ph273', state='attached', timeout=20000); pg.wait_for_timeout(1500)
    # --- intake UI
    ic = pg.evaluate("(()=>{const b=document.querySelector('#sform .ph273'),i=document.querySelector('#sform input.ph273f');const r=b.getBoundingClientRect();return {w:r.width,h:r.height,label:b.getAttribute('aria-label'),accept:i&&i.accept,hidden:i&&i.hidden,n:document.querySelectorAll('#sform .ph273').length}})()")
    ok('[ui] Home chat box has one small photo icon (<=40 px) with a label, and a hidden image file input', ic['n'] == 1 and ic['w'] <= 40 and ic['h'] <= 40 and 'photo' in (ic['label'] or '') and ic['accept'] == 'image/*' and ic['hidden'], ic)
    lazy = [u for u in reqs if 'vendor/tess' in u or 'photo273' in u or 'label273' in u]
    ok('[lazy] Home load does not fetch the OCR engine, language data or the photo reader', not lazy, lazy)
    # --- parser on fixture OCR text
    pg.evaluate("PH273A.load()"); pg.wait_for_function("typeof PH273!=='undefined' && window.LumiLabel273", timeout=30000)
    PARSE = lambda t: pg.evaluate("t=>{const r=LumiLabel273.parse(t);return {v:r.v,flags:r.flags,notes:r.notes,lt:r.lt,n:r.nRead}}", t)
    r = PARSE(CLEAN); bad = {k: r['v'][k] for k in TRUTH if r['v'][k] != TRUTH[k]}
    ok('[parser] clean label text: all 13 Nutrition Facts fields, serving text, ingredients and Contains are exact', not bad and r['v']['serv'] == '1 Scoop (39g)' and r['v']['ing'] == ING and r['v']['contains'] == 'MILK', (bad, r['v']))
    ok('[parser] "<5mg" cholesterol keeps 5 mg, marked less-than and "check"', r['lt'].get('chol') and r['flags'].get('chol') == 'check', r)
    for name, txt in NOISY.items():
        r = PARSE(txt); bad = {k: r['v'][k] for k in TRUTH if r['v'][k] != TRUTH[k]}
        ok('[parser] noisy OCR (%s): every value right' % name, not bad, (bad, r['flags']))
    r = PARSE(NOISY['O for 0, 9 for g, S for 5, rng for mg, glued labels'])
    ok('[parser] reinterpreted values ("399", "29") are flagged "check" with a note', r['flags'].get('servG') == 'check' and r['flags'].get('fiber') == 'check' and 'Check' in r['notes'].get('fiber', ''), r['flags'])
    ing = PARSE(open(FX + 'ocr-ingonly.txt').read()); nf = PARSE(open(FX + 'ocr-nfonly.txt').read())
    ok('[parser] ingredients-only photo: ingredients + Contains read, no nutrition numbers invented', ing['v']['ing'] == ING and ing['v']['contains'] == 'MILK' and ing['n'] == 0 and all(ing['v'][k] is None for k in TRUTH), ing)
    ok('[parser] nutrition-only photo: numbers read, ingredients left empty', nf['n'] == 13 and not nf['v']['ing'], nf['v'])
    part = PARSE('Nutrition Facts\nServing size 2 pieces (30g)\nCalories 120\nTotal Fat 4g 5%\nSodium 85mg 4%')
    ok('[parser] a value that is not on the photo stays null (never guessed)', part['v']['carbs'] is None and part['v']['sugars'] is None and part['v']['protein'] is None and part['v']['servG'] == 30, part['v'])
    # --- real OCR on the replica, via paste into the Home box
    pg.goto(base + '#/'); pg.wait_for_selector('#sform .ph273', state='attached'); reqs.clear()
    pg.evaluate("""async d=>{const b=await (await fetch('data:image/png;base64,'+d)).blob(); const f=new File([b],'label.png',{type:'image/png'}); const dt=new DataTransfer(); dt.items.add(f);
      document.getElementById('q').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))}""", B64('label-caffeinated.png'))
    pg.wait_for_function("location.hash==='#/photo'", timeout=5000); wait_result(pg)
    S = pg.evaluate("(()=>{const s=PH273.cur,l=PH273.st.last;return {v:s.v,flags:s.flags,ms:l.ms,ocr:l.ocrMs,load:l.loadMs,tries:l.tries}})()")
    acc = {k: S['v'][k] == TRUTH[k] for k in TRUTH}
    print('OCR replica (paste): %.2fs total, %.2fs reading; fields %d/13 %s' % (S['ms'] / 1000, S['ocr'] / 1000, sum(acc.values()), S['tries']))
    ok('[ocr] pasted image: real Tesseract on the replica label reads all 13 fields and the ingredient list', all(acc.values()) and S['v']['ing'] == ING and S['v']['contains'] == 'MILK', (acc, S['v']))
    ext = [u for u in reqs if not u.startswith(base) and not u.startswith('data:') and not u.startswith('blob:') and 'lumi-data' not in u and 'openfoodfacts' not in u]
    ok('[privacy] OCR used only this site\'s files (no CDN, no OCR API, no proxy)', not ext and any('vendor/tess/v7/eng.traineddata.gz' in u for u in reqs) and any('vendor/tess/v7/tesseract-core' in u for u in reqs), ext[:5])
    ok('[ocr] reads the replica in under 5 s on this machine', S['ocr'] < 5000, S['ocr'])
    # --- grading
    G = pg.evaluate("""(()=>{const c=document.querySelector('#ph273card'); const sc=PH273.st.g.sc, h=PH273.st.g.h; return {card:c.innerText, sv:document.querySelector('#ph273sv').innerText, hl:h&&h.score, bs:sc&&sc.score,
      warn:[...document.querySelectorAll('#ph273warn li')].map(x=>x.innerText), body:document.querySelector('#app').innerText, tag:document.querySelector('.ph273tag').innerText}})()""")
    print('GRADE', json.dumps({k: G[k] for k in ['hl', 'bs', 'sv', 'card', 'warn']}))
    ok('[grade] shown as the standard card labeled "From your photo" with the parsed serving', 'FROM YOUR PHOTO' in G['tag'].upper() and '1 Scoop (39g)' in G['sv'] and 'HEALTH' in G['card'].upper() and 'BLOOD SUGAR' in G['card'].upper(), G['card'])
    ok('[grade] Health and Blood sugar scores come from the same per-serving scoring as products (5 g sugar, 9 g carbs, 39 g serving)', G['hl'] is not None and G['bs'] is not None and '5 g sugar' in G['card'] and '9 g carbs' in G['card'] and '39 g serving' in G['card'], G['card'])
    ok('[grade] coconut sugar flagged as a hidden sugar; monk fruit sweetener note; Contains: MILK', any('Hidden sugar: coconut sugar' in w for w in G['warn']) and any('Monk fruit' in w for w in G['warn']) and any('MILK' in w for w in G['warn']), G['warn'])
    ok('[grade] never says "safe", no net carbs, no dose estimate', not re.search(r'\bsafe\b', G['body'], re.I) and 'net carb' not in G['body'].lower() and not re.search(r'\bdose|insulin|units? of\b', G['body'], re.I), [m for m in re.findall(r'.{30}(?:safe|net carb|dose).{30}', G['body'], re.I)])
    # --- edit table: live regrade, not read
    bs0 = G['bs']; pg.fill('#ph273t input[data-k=sugars]', '9'); pg.fill('#ph273t input[data-k=added]', '9'); pg.wait_for_timeout(400)
    bs1 = pg.evaluate("PH273.st.g.sc.score"); card1 = pg.inner_text('#ph273card')
    ok('[edit] fixing a value regrades live (sugar 5 -> 9 g, added 4 -> 9 g lowers Blood sugar, card shows 9 g sugar)', bs1 is not None and bs1 < bs0 and '9 g sugar' in card1, (bs0, bs1, card1))
    ok('[edit] the edited row says "edited"', pg.inner_text('#ph273s-sugars') == 'edited', pg.inner_text('#ph273s-sugars'))
    pg.fill('#ph273t input[data-k=carbs]', ''); pg.wait_for_timeout(400)
    cv = pg.evaluate("[...document.querySelectorAll('.ph273cv')].map(x=>x.innerText).join(' | ')")
    ok('[edit] a cleared value shows "not read" and the card says it couldn\'t verify the Blood sugar score', pg.inner_text('#ph273s-carbs') == 'not read' and "Couldn't verify the Blood sugar score" in cv and pg.evaluate("PH273.st.g.sc.score") is None, (cv, pg.inner_text('#ph273s-carbs')))
    pg.fill('#ph273t input[data-k=carbs]', '30'); pg.wait_for_timeout(400)
    ok('[edit] numbers that cannot be right (macros over the serving weight) give no score and say why', pg.evaluate("PH273.st.g.sc.score") is None and "don't add up" in pg.inner_text('#ph273g'), pg.inner_text('#ph273g')[-300:])
    pg.fill('#ph273t input[data-k=carbs]', '9'); pg.fill('#ph273t input[data-k=sugars]', '5'); pg.fill('#ph273t input[data-k=added]', '4'); pg.fill('#ph273n', 'Caffeinated bone broth'); pg.wait_for_timeout(400)
    ok('[edit] restoring the values restores the grade', pg.evaluate("PH273.st.g.sc.score") == bs0, pg.evaluate("PH273.st.g.sc.score"))
    # --- save: IndexedDB + My foods + Compare, nothing uploaded
    reqs.clear(); pg.click('#ph273save'); pg.wait_for_timeout(500)
    sv = pg.evaluate("(async()=>{const a=await PH273.scans(); const id=PH273.cur.id; return {idb:a.some(x=>x.id===id), name:(a.find(x=>x.id===id)||{p:{}}).p.name, custom:JSON.parse(localStorage.getItem('lumi.custom')||'[]').some(x=>x.id===id), id}})()")
    ok('[save] saved on the device: IndexedDB record + My foods entry, no network request', sv['idb'] and sv['custom'] and sv['name'] == 'Caffeinated bone broth' and not [u for u in reqs if not u.startswith('data:')], (sv, reqs[:3]))
    pg.click('#ph273cmp'); pg.wait_for_timeout(300)
    ok('[save] Compare adds it to the compare list', sv['id'] in pg.evaluate("JSON.parse(localStorage.getItem('lumi.compare')||'[]')"), pg.evaluate("localStorage.getItem('lumi.compare')"))
    pg.goto(base + '#/product/' + sv['id']); pg.wait_for_function("document.querySelector('#app h1') && /Caffeinated bone broth/.test(document.querySelector('#app').innerText)", timeout=20000)
    ok('[save] the saved item opens in the standard product view', 'From your photo' in pg.inner_text('#app'), pg.inner_text('#app')[:300])
    # --- Search tab box + drop + file input
    pg.goto(base + '#/search'); pg.wait_for_timeout(1200)
    ok('[ui] the Search tab box has the photo icon too', pg.evaluate("document.querySelectorAll('#sform .ph273').length") == 1, '')
    pg.evaluate("""async d=>{const b=await (await fetch('data:image/png;base64,'+d)).blob(); const f=new File([b],'nf.png',{type:'image/png'}); const dt=new DataTransfer(); dt.items.add(f);
      const s=document.getElementById('sform'); s.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true})); s.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}))}""", B64('label-nfonly.png'))
    wait_result(pg); d = pg.evaluate("PH273.cur.v")
    ok('[ui] dropping an image on the search box grades it (nutrition-only crop: numbers, ingredients "not read")', d['carbs'] == 9 and d['sugars'] == 5 and not d['ing'] and "Couldn't verify the ingredients" in pg.inner_text('#ph273g'), d)
    pg.goto(base + '#/'); pg.wait_for_selector('#sform input.ph273f', state='attached'); pg.set_input_files('#sform input.ph273f', FX + 'label-ingonly.png'); wait_result(pg)
    d = pg.evaluate("PH273.cur.v"); g = pg.inner_text('#ph273g')
    ok('[ui] file input (camera / photo library) works; ingredients-only photo: warnings shown, numbers "not read", couldn\'t verify', d['ing'] == ING and d['carbs'] is None and 'Hidden sugar: coconut sugar' in g and "Couldn't verify" in g and pg.inner_text('#ph273s-carbs') == 'not read', (d, g[:300]))
    pg.goto(base + '#/'); pg.wait_for_selector('#sform input.ph273f', state='attached'); pg.set_input_files('#sform input.ph273f', FX + 'label-rot90.png'); wait_result(pg)
    d = pg.evaluate("PH273.cur.v"); acc = sum(d[k] == TRUTH[k] for k in TRUTH)
    ok('[ocr] a photo turned 90 degrees is turned back and read (>= 12/13 fields)', acc >= 12, (acc, d))
    pg.goto(base + '#/'); pg.wait_for_selector('#sform input.ph273f', state='attached'); pg.set_input_files('#sform input.ph273f', FX + 'label-blur.jpg'); wait_result(pg)
    st = pg.evaluate("(()=>{const s=PH273.cur;return {v:s.v,flags:s.flags}})()"); wrong_unflagged = [k for k in TRUTH if st['v'][k] is not None and st['v'][k] != TRUTH[k] and st['flags'].get(k) != 'check']
    ok('[ocr] blurry photo: whatever is read is marked "check"; nothing wrong passes unflagged', not wrong_unflagged, (wrong_unflagged, st))
    ok('[perf] no page errors', not errs, errs)
    c.close()
    # --- offline after first use (service worker lumi-ocr cache)
    c = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='allow'); c.add_init_script("if(!sessionStorage.getItem('t24s')){sessionStorage.setItem('t24s','1');" + SEED + "}"); errs2 = []; pg = page(c, errs2)
    pg.goto(base + '#/'); pg.wait_for_timeout(3000); pg.reload(); pg.wait_for_function("!!navigator.serviceWorker.controller", timeout=60000)
    pg.wait_for_selector('#sform input.ph273f', state='attached'); pg.set_input_files('#sform input.ph273f', FX + 'label-nfonly.png'); wait_result(pg)
    keys = pg.evaluate("caches.open('lumi-ocr').then(c=>c.keys()).then(k=>k.map(r=>r.url.split('/').pop()))")
    ok('[offline] after the first photo the engine, core and language data are in the lumi-ocr cache', any('eng.traineddata.gz' in k for k in keys) and any('tesseract-core' in k for k in keys) and any('worker.min.js' in k for k in keys), keys)
    c.set_offline(True); pg.goto(base + '#/'); pg.wait_for_selector('#sform input.ph273f', state='attached', timeout=20000); pg.set_input_files('#sform input.ph273f', FX + 'label-nfonly.png'); wait_result(pg, 120000)
    ok('[offline] a label photo is graded with no network', pg.evaluate("PH273.cur && PH273.cur.v.carbs") == 9, pg.inner_text('#app')[:200])
    c.set_offline(False); ok('[offline] no page errors', not errs2, errs2); c.close()
    # --- dark mode result
    c = ctx(b, 'dark'); errs3 = []; pg = page(c, errs3); pg.goto(base + '#/'); pg.wait_for_selector('#sform input.ph273f', state='attached'); pg.set_input_files('#sform input.ph273f', FX + 'label-caffeinated.png'); wait_result(pg)
    cl = pg.evaluate("(()=>{const e=document.querySelector('.ph273ed'),i=e.querySelector('input[data-k=kcal]');return [getComputedStyle(e).backgroundColor,getComputedStyle(i).color]})()")
    ok('[dark] edit table is light text on a dark card', sum(int(x) for x in re.findall(r'\d+', cl[0])[:3]) < 200 and sum(int(x) for x in re.findall(r'\d+', cl[1])[:3]) > 450, cl)
    ok('[dark] no page errors', not errs3, errs3); c.close(); b.close()
    print('done in %.1fs  %d/%d passed' % (time.time()-t0, sum(1 for _,x in RES if x), len(RES)))
    sys.exit(0 if all(x for _,x in RES) else 1)
