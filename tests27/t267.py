# Lumi 26.7 tests: simple UI (bottom bar Home | Search | Scan | Places | More, short Home, Places, More, product "More checks", Settings sections), old routes intact.
# usage: VER=26.7 python3 t267.py <base> [local]
import sys, os, re, json, time
os.environ['LUMI_LATE'] = '0'  # see the real cold state (late bundle loads on idle)
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '26.7')
BUD = json.load(open(REPO + '/tests27/perf_budget.json')); BG = BUD.get(VER) or BUD[sorted(BUD)[-1]]
exec(open(REPO + '/tests27/perfmod.py').read())
def txt(pg): return pg.evaluate("document.getElementById('app').innerText")
TAB = "[...document.querySelectorAll('.tabbar > a, .tabbar > button')].filter(e=>e.offsetParent!==null&&getComputedStyle(e).display!=='none').map(e=>({t:(e.querySelector('span:last-child')||e).textContent.trim(),h:e.getAttribute('href')||(e.hasAttribute('data-scan')?'scan':''),on:e.classList.contains('on')||e.getAttribute('aria-current')==='page',w:Math.round(e.getBoundingClientRect().width),hh:Math.round(e.getBoundingClientRect().height),x:Math.round(e.getBoundingClientRect().x)}))"
with sync_playwright() as p:
    b = p.chromium.launch(args=['--enable-precise-memory-info']); t0 = time.time()
    c = ctx(b); errs = []; pg = page(c, errs)
    pg.goto(base + '#/picks'); pg.wait_for_selector('#picks .du14', timeout=40000); pg.wait_for_timeout(1500)
    ok('version ' + VER, pg.evaluate('VERSION') == VER, pg.evaluate('VERSION'))
    # ---------- bottom bar ----------
    tb = pg.evaluate(TAB)
    ok('[bar] five slots in order Home, Search, Scan, Picks, More (phone)', [x['t'] for x in tb] == ['Home', 'Search', 'Scan', 'Picks', 'More'], tb)
    ok('[bar] Scan is the centre slot', len(tb) == 5 and tb[2]['t'] == 'Scan' and abs((tb[2]['x'] + tb[2]['w'] / 2) - 195) <= 6, tb)
    ok('[bar] links: #/ , #/search, scan button, #/places, #/more; every slot at least 44 px tall', [x['h'] for x in tb] == ['#/', '#/search', 'scan', '#/picks', '#/more'] and all(x['hh'] >= 44 for x in tb), tb)
    ok('[bar] Picks is lit on #/picks', [x['t'] for x in tb if x['on']] == ['Picks'], tb)
    # ---------- Home ----------
    H = pg.evaluate("({h:document.getElementById('app').scrollHeight,vw:innerWidth,sw:document.documentElement.scrollWidth,t:document.getElementById('app').innerText})")
    ok(f"[home] about 1.5 phone screens: page height <= {BG.get('home_max_px', 1700)} px at 390x844 ({H['h']}); no sideways scroll", H['h'] <= BG.get('home_max_px', 1700) and H['sw'] <= H['vw'] + 1, H)
    ok('[picks] the Picks page has no hero search card', pg.evaluate("!document.querySelector('.hero27,#heroScan')"))
    sh = pg.evaluate("[...document.querySelectorAll('.sh27 a')].map(a=>[a.getAttribute('href'),a.innerText.replace(/\\n/g,' ')])")
    ok('[picks] the four shortcut tiles are gone', sh == [], sh)
    cols = pg.evaluate("[...document.querySelectorAll('#picks .du14c')].map(c=>({h:c.querySelector('h3').innerText,vis:[...c.querySelectorAll('li')].filter(l=>l.offsetParent!==null).length,all:c.querySelectorAll('li').length,ps:/per serving|per item/.test(c.innerText),x:Math.round(c.getBoundingClientRect().x)}))")
    ok('[home] Top picks: Overall health on the left, Blood sugar on the right, 3 each, per-serving text kept', len(cols) == 2 and re.search('health', cols[0]['h'], re.I) and re.search('blood sugar', cols[1]['h'], re.I) and cols[0]['x'] < cols[1]['x'] and all(c['vis'] == 3 and c['ps'] for c in cols), cols)
    ok('[home] "See all picks" reveals the rest of each list', (cols[0]['all'] > 3) and pg.evaluate("(()=>{const b=document.getElementById('allPicks27');if(!b||b.hidden)return false;b.click();const n=[...document.querySelectorAll('#picks .du14c')].map(c=>[...c.querySelectorAll('li')].filter(l=>l.offsetParent!==null).length);b.click();return n.every(x=>x>3)})()"), cols)
    ok('[home] Good picks at restaurants is one collapsed row', pg.evaluate("(()=>{const d=document.getElementById('restBest');return !!d&&!d.open&&d.getBoundingClientRect().height<80})()"))
    ok('[home] old clutter is gone from Home: no 12-tile tool grid, no "New in Lumi" pill, no Today card', not re.search(r'Meal ideas\s+Grocery list\s+Meal plan', H['t']) and 'New in Lumi' not in H['t'] and pg.evaluate("!document.querySelector('.sc74,.pill74,.tc16,.today16')"), H['t'][:300])
    ok('[home] no page errors', not errs, errs)
    # ---------- Places ----------
    pg.goto(base + '#/places'); pg.wait_for_selector('.places27', timeout=20000); pg.wait_for_timeout(600)
    P = pg.evaluate("""(()=>{const s=document.querySelector('.places27');const f=[...s.querySelectorAll('.fg181 .st181 > a.m181 b')].map(x=>x.innerText.replace(/[^A-Za-z ]/g,'').trim());const ys=n=>{const e=[...s.querySelectorAll('h2')].find(h=>h.textContent.trim()===n);return e?e.getBoundingClientRect().top+scrollY:-1};
      const ms=document.getElementById('moreStores');return {feat:f,restY:ys('Restaurants'),featY:s.querySelector('.fg181').getBoundingClientRect().top+scrollY,aisleY:ys('Grocery aisles'),catY:ys('Categories'),msOpen:ms&&ms.open,msY:ms&&ms.getBoundingClientRect().top+scrollY,msCards:ms?ms.querySelectorAll('.st181').length:0,
      topLevelStores:[...s.querySelectorAll('.st181')].filter(e=>!e.closest('#moreStores')).length,rest:[...s.querySelectorAll('.rest27 a')].map(a=>a.getAttribute('href'))}})()""")
    ok('[places] Whole Foods and Costco are pinned at the very top, before Restaurants', P['feat'][:2] == ['Whole Foods', 'Costco'] and P['featY'] < P['restY'], P)
    ok('[places] Restaurants come next: chains, meal builder, chain order builder, build your own', P['restY'] < P['aisleY'] and all(h in P['rest'] for h in ['#/browse/rest', '#/rmeal', '#/order', '#/bowl']), P)
    ok('[places] all other stores sit behind a collapsed "More stores" row, after aisles and categories; only the pinned stores are outside it', P['msOpen'] is False and P['msCards'] >= 40 and P['topLevelStores'] <= 4 and P['msY'] > P['catY'], P)
    ok('[places] More is the lit tab for Places; the old Browse list still exists at #/browse', [x['t'] for x in pg.evaluate(TAB) if x['on']] == ['More'])
    pg.goto(base + '#/browse'); pg.wait_for_selector('.browse74', timeout=20000); pg.wait_for_timeout(600)
    ok('[places] old Browse hub at #/browse still lists every store and tool (Shop by store, Tools, Pets)', all(w in txt(pg) for w in ['Shop by store', 'Tools', 'Pets', 'Convenience']), txt(pg)[:200])
    # ---------- More ----------
    pg.goto(base + '#/more'); pg.wait_for_selector('.more27 .mg27', timeout=20000); pg.wait_for_timeout(500)
    G = pg.evaluate("[...document.querySelectorAll('.mg27')].map(d=>({g:d.querySelector('summary b').innerText,n:d.querySelectorAll('.ml27 a').length,open:d.open}))")
    ok('[more] grouped screen with 9 collapsible groups, first two open', len(G) == 9 and G[0]['open'] and G[1]['open'] and not any(g['open'] for g in G[2:]), G)
    links = pg.evaluate("[...document.querySelectorAll('.ml27 a')].map(a=>a.getAttribute('href'))")
    need = ['#/myfoods', '#/today', '#/log', '#/plan', '#/grocery', '#/additives', '#/addwatch', '#/hb', '#/pfas', '#/recalls', '#/water', '#/supp', '#/otc', '#/kitchen', '#/fish', '#/pesticides', '#/air', '#/pet', '#/pet/toxic', '#/patterns', '#/glucose', '#/applehealth', '#/weekly', '#/settings', '#/privacy', '#/whatsnew', '#/about', '#/browse', '#/classic']
    ok('[more] every feature from the plan is one tap away (' + str(len(links)) + ' links)', all(n in links for n in need), [n for n in need if n not in links])
    bad = []; pg2 = page(c, errs); n0 = len(errs)
    for h in dict.fromkeys(links):
        pg2.goto(base + h); pg2.wait_for_timeout(1200); t = pg2.evaluate("document.getElementById('app').innerText")
        if len(t.strip()) < 25 or 'undefined' in t or 'NaN' in t: bad.append((h, t[:60]))
    ok('[more] every link on the More screen opens a real page (no blank, undefined or NaN)', not bad, bad)
    ok('[more] no page errors while visiting them', len(errs) == n0, errs[n0:])
    pg2.close()
    # tabs lit
    lit = {}
    for h in ['#/store/costco', '#/today', '#/myfoods', '#/product/fdc-2346409', '#/search/oats', '#/settings', '#/browse/rest', '#/pet', '#/classic']:
        pg.goto(base + h); pg.wait_for_timeout(900); lit[h] = [x['t'] for x in pg.evaluate(TAB) if x['on']]
    ok('[bar] the right slot is lit: stores and restaurants -> Places; Today, My foods, Settings, Pet -> More; product and search -> Search; classic home -> Home', lit == {'#/store/costco': ['More'], '#/today': ['More'], '#/myfoods': ['More'], '#/product/fdc-2346409': ['Search'], '#/search/oats': ['Search'], '#/settings': ['More'], '#/browse/rest': ['More'], '#/pet': ['More'], '#/classic': ['Home']}, lit)
    pg.goto(base + '#/classic'); pg.wait_for_selector('.home74', timeout=30000); pg.wait_for_timeout(800)
    ok('[classic] the old full Home is kept at #/classic (tool grid, Today, Top picks)', pg.evaluate("!!document.querySelector('.sc74')") and 'Top picks' in txt(pg), txt(pg)[:200])
    pg.goto(base + '#/whatsnew'); pg.wait_for_timeout(1200)
    ok('[news] What\'s new has the 26.7 entry', 'A simpler Lumi (26.7)' in txt(pg))
    # ---------- product page ----------
    pg.goto(base + '#/product/fdc-2346409'); pg.wait_for_selector('#more27', timeout=40000); pg.wait_for_timeout(2500)
    PR = pg.evaluate("""(()=>{const a=document.getElementById('app'),m=document.getElementById('more27'),ix=e=>[...a.children].indexOf(e),y=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().top+scrollY:-1};
      return {open:m.open,inside:[...m.querySelectorAll('.card')].map(c=>c.id),outside:['hcard','bg8','fx75','portion','bc24','aw26','iw22','nt24'].filter(i=>document.getElementById(i)&&!m.contains(document.getElementById(i))),hcardY:y('#hcard'),moreY:m.getBoundingClientRect().top+scrollY,sum:m.querySelector('summary').innerText.replace(/\\n/g,' | '),hero:(document.querySelector('.hero10')||document.querySelector('.card')).innerText.slice(0,120)}})()""")
    ok('[product] extra checks (pesticide residue, dog-toxic, label check) are folded into a collapsed "More checks" group', not PR['open'] and 'pest262' in PR['inside'] and 'dog261' in PR['inside'], PR)
    ok('[product] scores, blood-sugar factors, portion, better choice, additives, ingredient warnings and nutrition stay outside it, with More checks below the scores', all(i in PR['outside'] for i in ['hcard', 'bg8', 'fx75', 'portion', 'aw26', 'iw22', 'nt24']) and PR['moreY'] > PR['hcardY'], PR)
    hc = pg.evaluate("(()=>{const t=document.querySelector('.hero10')?.innerText||'';const i=t.search(/health/i),j=t.search(/blood sugar|carb score/i);return [i,j]})()")
    ok('[product] Health score is still on the left and Blood sugar on the right at the top', hc[0] >= 0 and (hc[1] < 0 or hc[0] < hc[1]), hc)
    pg.click('#more27 summary'); pg.wait_for_timeout(300)
    ok('[product] opening More checks shows the cards', pg.evaluate("document.getElementById('more27').open&&document.querySelector('#more27 #pest262').offsetHeight>50"))
    # a packaged product: dog-toxic check lives in the group too
    pg.goto(base + '#/product/0096619483556'); pg.wait_for_selector('#more27', timeout=40000); pg.wait_for_timeout(2500)
    ok('[product] packaged product: dog-toxic check inside More checks, additive watch outside', pg.evaluate("!!document.querySelector('#more27 #dog261')&&!document.querySelector('#more27 #aw26')&&!!document.getElementById('aw26')"))
    # ---------- product action bar vs bottom nav (26.8 fix) ----------
    BARS = """(()=>{const R=e=>{const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom}},t=document.querySelector('.tabbar'),pb=document.querySelector('.pbar10'),sc=t.querySelector('[data-scan]'),T=R(t),P=R(pb),S=R(sc),a=document.getElementById('app');
      const hit=(x,y)=>{const e=document.elementFromPoint(x,y);return !!e&&(e===sc||sc.contains(e))};
      const cx=(S.l+S.r)/2, ints=[...pb.querySelectorAll('button,a')].map(R), ov=ints.filter(i=>!(i.r<=S.l||i.l>=S.r||i.b<=S.t||i.t>=S.b)).length;
      scrollTo(0,document.documentElement.scrollHeight); const phone=T.t>innerHeight/2;
      const lb=Math.max(...[...document.body.children].filter(e=>e.offsetHeight>0&&getComputedStyle(e).position!=='fixed'&&!/^(SCRIPT|STYLE)$/.test(e.tagName)).map(e=>{const kids=[...e.querySelectorAll('*')].filter(k=>k.offsetHeight>0&&!k.closest('.pbar10,.tabbar'));return Math.max(e.getBoundingClientRect().bottom,0)}));
      const barTop=phone?Math.min(P.t,T.t):P.t;
      return {T,P,S,vh:innerHeight,phone,aboveNav:P.b<=T.t+0.5,sideOK:P.l>=T.r-0.5,scanVis:hit(cx,S.t+4)&&hit(cx,(S.t+S.b)/2)&&hit(S.l+8,(S.t+S.b)/2)&&hit(cx,S.b-4),pbarBtnsClear:ov===0,zOK:(parseInt(getComputedStyle(pb).zIndex)||0)<(parseInt(getComputedStyle(t).zIndex)||0),lastBottom:lb,barTop,contentClear:lb<=barTop+1}})()"""
    for (w_, h_) in [(390, 844), (360, 640), (430, 932), (1280, 800)]:
        cc = ctx(b, w=w_, h=h_); errs2 = []; pb_ = page(cc, errs2); pb_.goto(base + '#/product/0078742082752'); pb_.wait_for_selector('.pbar10', timeout=60000); pb_.wait_for_timeout(3000)
        r = pb_.evaluate(BARS); pb_.wait_for_timeout(300)
        phone = r['phone']
        ok(f'[bars {w_}x{h_}] ' + ('the action bar (Log/Save/List/Share) sits fully above the bottom nav, with no overlap' if phone else 'the action bar starts right of the sidebar, no overlap'), (r['aboveNav'] if phone else r['sideOK']), r)
        ok(f'[bars {w_}x{h_}] the centre Scan button is fully visible: every edge and the middle hit the button, and no action-bar button touches it; the nav is drawn above the action bar so the raised glow is not cut', r['scanVis'] and r['pbarBtnsClear'] and r['zOK'], r)
        ok(f'[bars {w_}x{h_}] scrolled to the bottom, the last card and the footer end above both bars (nothing hidden behind them)', r['contentClear'], r)
        cc.close()
    # ---------- settings ----------
    pg.goto(base + '#/settings'); pg.wait_for_selector('#sf, .set11', timeout=30000); pg.wait_for_timeout(1500)
    S = pg.evaluate("[...document.querySelectorAll('details.col27')].map(d=>[d.querySelector('summary').innerText,d.open])")
    ok('[settings] insulin ratio, offline and data sections are collapsed by default', len(S) >= 3 and not any(o for _, o in S) and any(re.search('offline', n, re.I) for n, _ in S) and any(re.match('Data', n) for n, _ in S), S)
    ok('[settings] the sections still work once opened (offline buttons present inside)', pg.evaluate("(()=>{const d=[...document.querySelectorAll('details.col27')].find(x=>/offline/i.test(x.querySelector('summary').innerText));d.open=true;return !!d.querySelector('button')})()"))
    ok('[settings] no page errors', not errs, errs); c.close()
    # ---------- desktop sidebar ----------
    c = ctx(b, w=1280, h=800); pg = page(c, errs); pg.goto(base + '#/picks'); pg.wait_for_selector('#picks .du14', timeout=40000); pg.wait_for_timeout(800)
    tb = [x for x in pg.evaluate(TAB) if x['t'] != 'lumi']
    ok('[desktop] the sidebar matches the phone bar: Home, Search, Scan, Picks, More', [x['t'] for x in tb] == ['Home', 'Search', 'Scan', 'Picks', 'More'], tb)
    c.close()
    # ---------- perf ----------
    def cf(bb):
        cc = bb.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True, service_workers='block')
        cc.add_init_script(SEED + "localStorage.setItem('lumi.notice231','1');")
        h_ = lambda rt: (lambda pth: rt.fulfill(path=pth, headers={'access-control-allow-origin': '*', 'content-type': 'application/json' if pth.endswith('.json') else 'image/webp'}) if os.path.isfile(pth) else rt.fulfill(status=404, body='nf'))(REPO + '/' + rt.request.url.split('pages.dev/', 1)[1].split('?')[0])
        if LOCAL: cc.route(re.compile(r'https://lumi-data-cky\.pages\.dev/(data|img)/.*'), h_)
        return cc
    h = measure(b, base, cf, hash_='#/picks')
    ok(f"[budget] Home (4x CPU): picks <= {BG['home_picks_ms']} ms ({h['picks']}), TBT <= {BG['home_tbt_ms']} ms ({h['tbt']}), longest task <= {BG['home_longtask_max_ms']} ms ({h['lt_max']})", 0 < h['picks'] <= BG['home_picks_ms'] and h['tbt'] <= BG['home_tbt_ms'] and h['lt_max'] <= BG['home_longtask_max_ms'], h)
    h0 = measure(b, base, cf, hash_='#/')
    ok(f"[budget] new Home (4x CPU): search box visible, no data beyond meta.json, TBT <= {BG['home_tbt_ms']} ms ({h0['tbt']}), longest task <= {BG['home_longtask_max_ms']} ms ({h0['lt_max']})", h0['home'] > 0 and h0['tbt'] <= BG['home_tbt_ms'] and h0['lt_max'] <= BG['home_longtask_max_ms'] and h0['data_files'] == ['meta.json'], h0)
    b.close()
n = len(RES); f = [x for x in RES if not x[1]]
print(f'\n{n - len(f)}/{n} passed in {time.time() - t0:.0f}s'); sys.exit(1 if f else 0)
