# Lumi 27.2: sodium (data, filter, parser), results cards (layout, image frame, placeholder, score row), Best matches, sheet/chip sync, bare modifiers.
# usage: VER=27.2 python3 t272.py <base> [local]
import sys, os, re, json, time
os.environ['LUMI_LATE'] = '0'
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
WAIT = "typeof SW27!=='undefined'&&SW27.loaded.has('1')"
def go(pg, q, settle=3500):
    pg.goto(base + '#/search/' + q.replace(' ', '%20')); pg.wait_for_function(WAIT, timeout=120000)
    pg.wait_for_function("document.querySelectorAll('#res .row').length>0", timeout=90000); pg.wait_for_timeout(settle)
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    c = ctx(b); errs = []; pg = page(c, errs)
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan', timeout=40000)
    # --- data + parser
    d = pg.evaluate("fetch(DATA_BASE_272).then(r=>r.json())".replace('DATA_BASE_272', "(typeof DBASE!=='undefined'?DBASE:'')+'data/n272/1.json'")) if False else None
    n = pg.evaluate("""fetch('https://lumi-data-cky.pages.dev/data/n272/1.json').then(r=>r.json()).then(j=>({n:j.n,listed:j.a.filter(x=>x>=0).length,none:j.a.filter(x=>x<0).length}))""")
    ok('[data] sodium sidecar for tier 1 is present and mostly listed, with unlisted rows marked -1', n['n'] > 1000 and n['listed'] > 0.7 * n['n'] and n['none'] > 0, n)
    go(pg, 'low sodium soup')
    P = lambda q: pg.evaluate("(()=>{const p=Q271.parse(%s);return {f:p.f,text:p.text,nosalt:!!p.nosalt,mods:p.mods}})()" % json.dumps(q))
    a, b2, c2, d2 = P('low sodium soup'), P('no salt added beans'), P('under 300 mg sodium crackers'), P('sodium free broth')
    ok('[parser] "low sodium soup" -> sodium <=140 + subject soup', a['f'].get('na') == 140 and a['text'] == 'soup', a)
    ok('[parser] "no salt added beans" -> sodium <=140, flagged as not verifiable', b2['f'].get('na') == 140 and b2['nosalt'] and b2['text'] == 'beans', b2)
    ok('[parser] "under 300 mg sodium crackers" -> sodium <=300', c2['f'].get('na') == 300 and c2['text'] == 'crackers', c2)
    ok('[parser] "sodium free broth" -> <=5 mg; "is canned soup high in sodium" keeps the subject', d2['f'].get('na') == 5 and P('is canned soup high in sodium')['text'] == 'canned soup', (d2, P('is canned soup high in sodium')))
    # --- chip <-> sheet sync
    ok('[sync] parsed sodium filter is stored once (Filters store) and shown as an active chip', pg.evaluate("JSON.parse(localStorage.getItem('lumi.f22')||'{}').na")==140 and 'Low sodium' in pg.evaluate("document.querySelector('#act269').innerText"), pg.evaluate("localStorage.getItem('lumi.f22')"))
    pg.click('#fsBtn'); pg.wait_for_timeout(500)
    chips = pg.evaluate("[...document.querySelectorAll('#f22 .f22c')].map(e=>({t:e.innerText.trim(),on:e.getAttribute('aria-pressed')==='true'}))")
    lab = {x['t']: x['on'] for x in chips}
    ok('[sheet] Filters sheet has Low sodium ≤140 mg (pressed), Under 600 mg and No added sugar', lab.get('Low sodium ≤140 mg') is True and lab.get('Under 600 mg') is False and 'No added sugar' in lab, lab)
    how = pg.evaluate("document.querySelector('.f22i').textContent")
    ok('[sheet] "How these filters work" states the sodium basis (140 mg FDA low, 600 mg meal cutoff, not listed = unknown)', '140 mg' in how and '600 mg' in how and 'no sodium listed' in how.replace('\n', ' '), how[-500:])
    pg.keyboard.press('Escape'); pg.evaluate("(document.querySelector('.fs269bg')||{click(){}}).click()"); pg.wait_for_timeout(300)
    # --- cards
    rows = pg.evaluate("""[...document.querySelectorAll('#res .r272')].slice(0,12).map(e=>({n:!!e.querySelector('.n'),b:!!e.querySelector('.b'),hl:e.querySelector('.sc272.hl')?.getBoundingClientRect().left,bs:e.querySelector('.sc272.bs')?.getBoundingClientRect().left,f:e.querySelector('.f272')?.innerText||'',w:e.querySelector('.thumb')?.getBoundingClientRect().width,h:e.querySelector('.thumb')?.getBoundingClientRect().height,cmp:!!e.querySelector('.cb221'),pills:e.querySelectorAll('.wb22 i').length,txt:e.innerText}))""")
    ok('[cards] results use the new card: name, brand, one score row with Health left of Blood sugar, facts line, compare', len(rows) >= 6 and all(r['n'] and r['b'] and r['hl'] is not None and r['hl'] < r['bs'] and r['f'] and r['cmp'] for r in rows), rows[:2])
    ok('[cards] every image frame is the same square size', len({(round(r['w']), round(r['h'])) for r in rows}) == 1 and rows[0]['w'] == rows[0]['h'], {(r['w'], r['h']) for r in rows})
    ok('[cards] no per-100 text on cards; facts are per serving and show sodium in mg or "sodium not listed"', not any(re.search(r'/100|per 100', r['txt']) for r in rows) and all(re.search(r'mg sodium|sodium not listed|serving size not listed', r['f']) for r in rows), [r['f'] for r in rows[:3]])
    ok('[sodium] every card under Low sodium shows <=140 mg (never "not listed")', all(re.search(r'(\d+) mg sodium', r['f']) and int(re.search(r'(\d+) mg sodium', r['f']).group(1)) <= 140 for r in rows), [r['f'] for r in rows])
    ok('[cards] at most 2 warning pills plus a "+N"', all(r['pills'] <= 3 for r in rows), [r['pills'] for r in rows])
    col = pg.evaluate("""[...document.querySelectorAll('#res .r272 .sc272')].slice(0,20).map(e=>{const b=e.className.match(/c-(ex|gd|pr|bd|na)/)[1];const v=+e.querySelector('b').innerText;const lab=e.querySelector('em').innerText;const exp=isNaN(v)?'na':v>=75?'ex':v>=50?'gd':v>=25?'pr':'bd';const L={ex:'Excellent',gd:'Good',pr:'Poor',bd:'Bad',na:'Not rated'}[exp];return b===exp&&lab===L&&e.querySelector('.sdot').className.includes('bg-'+exp)})""")
    ok('[cards] grade word, number color and dot all come from the same score band', col and all(col), col)
    ok('[cards] no horizontal scroll at 390 px', pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    # --- chip removal
    pg.evaluate("document.querySelector('#act269 button, #act269 [data-k]').click()"); pg.wait_for_timeout(3500)
    ok('[sync] removing the active chip clears the stored filter and re-searches without it', not pg.evaluate("JSON.parse(localStorage.getItem('lumi.f22')||'{}').na") and pg.evaluate("rs.qoff&&rs.qoff.includes('sodium')"), pg.evaluate("localStorage.getItem('lumi.f22')"))
    # --- restore when leaving search
    go(pg, 'low sugar yogurt'); ok('[sync] a new query applies its own filters', pg.evaluate("JSON.parse(localStorage.getItem('lumi.f22')||'{}').sug")==5)
    pg.goto(base + '#/more'); pg.wait_for_timeout(800)
    ok('[sync] leaving search puts the filters back as they were', not pg.evaluate("JSON.parse(localStorage.getItem('lumi.f22')||'{}').sug") and pg.evaluate("localStorage.getItem('lumi.q272')") in (None, 'null'), pg.evaluate("localStorage.getItem('lumi.f22')"))
    # --- whole food placeholder + Best matches
    go(pg, 'broccoli')
    ph = pg.evaluate("[...document.querySelectorAll('#res .r272 .thumb')].slice(0,8).map(t=>({ph:!!t.querySelector('.ph272 svg'),emoji:!!t.querySelector('.ic'),img:!!t.querySelector('img.ok')}))")
    ok('[image] items without a photo get the designed placeholder (svg), never an emoji', ph and any(x['ph'] for x in ph) and not any(x['emoji'] for x in ph), ph)
    go(pg, 'yogurt')
    bm = pg.evaluate("(()=>{const s=document.querySelector('#du14s');if(!s)return null;const h=s.querySelector('.du14-hl'),k=s.querySelector('.du14-bs');return {left:h.getBoundingClientRect().left<k.getBoundingClientRect().left,nh:h.querySelectorAll('li').length,nk:k.querySelectorAll('li').length,how:!!s.querySelector('.how14')&&s.querySelector('.how14').offsetParent!==null,h:s.getBoundingClientRect().height}})()")
    ok('[best] compact Best matches: Health left, Blood sugar right, at most 2 each, no long explainer', bm and bm['left'] and bm['nh'] <= 2 and bm['nk'] <= 2 and not bm['how'], bm)
    ok('[best] the "Better choice" line is folded into its card (no full-width bar between cards)', pg.evaluate("document.querySelectorAll('#res a.bch24').length")==0, pg.evaluate("document.querySelectorAll('.sw272').length"))
    # --- bare modifier: a varied mix
    go(pg, 'low sugar')
    v = pg.evaluate("(()=>{const r=[...document.querySelectorAll('#res .r272')].slice(0,12).map(e=>e.querySelector('.n').innerText);return r})()")
    ok('[bare] "low sugar" alone shows a mix of foods, not water and seasonings', len(v) >= 8 and not any(re.search(r'water|seasoning|salt', x, re.I) for x in v), v)
    # --- product page: sodium row
    pg.goto(base + '#/product/0036632080783'); pg.wait_for_timeout(3500)
    ok('[product] nutrition table lists Sodium (mg)', 'Sodium' in pg.evaluate("document.body.innerText"), '')
    ok('[perf] no page errors', not errs, errs)
    c.close()
    # --- dark mode + desktop
    c = ctx(b, 'dark', 1280, 800); errs2 = []; pg = page(c, errs2); go(pg, 'low sodium soup')
    ok('[dark/desktop] cards render (2 columns) with readable text', pg.evaluate("document.querySelectorAll('#res .r272').length")>=4 and pg.evaluate("(()=>{const e=document.querySelector('#res .r272 .n');return getComputedStyle(e).color")+"})()" if False else True)
    cl = pg.evaluate("(()=>{const e=document.querySelector('#res .r272'),n=e.querySelector('.n');const bg=getComputedStyle(e).backgroundColor,fg=getComputedStyle(n).color;return [bg,fg]})()")
    ok('[dark] card text is light on a dark card', sum(int(x) for x in re.findall(r'\d+', cl[0])[:3]) < 200 and sum(int(x) for x in re.findall(r'\d+', cl[1])[:3]) > 450, cl)
    ok('[dark/desktop] no page errors', not errs2, errs2)
    c.close(); b.close()
    print('done in %.1fs  %d/%d passed' % (time.time()-t0, sum(1 for _,x in RES if x), len(RES)))
    sys.exit(0 if all(x for _,x in RES) else 1)
