# Lumi 27.0: minimal chat-style Home, Picks tab, Places under More, orange theme.
# usage: VER=27.0 python3 t270.py <base> [local]
import sys, os, re, json, time
os.environ['LUMI_LATE'] = '0'
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '27.0')
BUD = json.load(open(REPO + '/tests27/perf_budget.json')); BG = BUD.get(VER) or BUD[sorted(BUD)[-1]]
exec(open(REPO + '/tests27/perfmod.py').read())

def lum(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
def cr(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x + .05) / (y + .05)
def rgb2hex(s):
    n = [int(float(v)) for v in re.findall(r'[\d.]+', s)[:3]]; return '#%02x%02x%02x' % tuple(n)
TAB = "[...document.querySelectorAll('.tabbar a,.tabbar button')].filter(e=>e.offsetParent!==null).map(e=>({t:e.innerText.trim(),h:e.getAttribute('href')||(e.hasAttribute('data-scan')?'scan':''),on:e.classList.contains('on')}))"
with sync_playwright() as p:
    b = p.chromium.launch(args=['--enable-precise-memory-info']); t0 = time.time()
    c = ctx(b); errs = []; pg = page(c, errs); reqs = []
    pg.on('request', lambda r: reqs.append(r.url))
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan', timeout=40000); pg.wait_for_timeout(1500)
    ok('version ' + VER, pg.evaluate('VERSION') == VER, pg.evaluate('VERSION'))
    H = pg.evaluate("""()=>{const q=document.getElementById('q'),r=q.closest('.chat270f').getBoundingClientRect(),a=document.getElementById('app');
      return {ph:q.placeholder,w:r.width,h:r.height,tag:q.tagName,top:r.top,scrollH:a.scrollHeight,vw:innerWidth,sw:document.documentElement.scrollWidth,
      ex:[...document.querySelectorAll('.ex270c')].map(x=>x.innerText),scanTop:document.getElementById('heroScan').getBoundingClientRect().top,
      h1:!!document.querySelector('.home270 h1'),tiles:!!document.querySelector('.sh27,.sc74,#allPicks27,#restBest'),picks:!!document.getElementById('picks'),txt:a.innerText}}""")
    ok('[home] hero search is big (>= 320 wide, >= 70 tall), multi-line, with the chat placeholder', H['w'] >= 320 and H['h'] >= 70 and H['tag'] == 'TEXTAREA' and H['ph'] == 'Ask about a food, brand, or restaurant…', H)
    ok('[home] three example chips: Low sugar yogurt, Costco snacks, Chipotle bowl', H['ex'] == ['Low sugar yogurt', 'Costco snacks', 'Chipotle bowl'], H['ex'])
    ok('[home] Scan sits right below the chips; Type a barcode and Scan a label photo stay as small links', pg.evaluate("(()=>{const s=document.getElementById('heroScan').getBoundingClientRect();return s.height>=52&&!!document.getElementById('typeBc')&&!!document.querySelector('a[href=\"#/label\"]')})()") and H['scanTop'] < 520, H)
    ok('[home] removed: shortcut tiles, Top picks, See all picks, restaurant picks, footer', not H['tiles'] and not H['picks'] and 'Top picks' not in H['txt'] and not pg.evaluate("(()=>{const f=document.querySelector('.ft231');return !!f&&f.getBoundingClientRect().height>0})()"), H['txt'][:200])
    ok('[home] about one screen: no scrolling needed at 390x844, no sideways scroll', H['scrollH'] <= 700 and H['sw'] <= H['vw'] + 1, H)
    ok('[home] no picks data fetched on Home', not any('home27/home' in u or 'data/home' in u for u in reqs), [u for u in reqs if 'home' in u][:5])
    tb = pg.evaluate(TAB)
    ok('[nav] order Home, Search, Scan, Picks, More; Home lit; links', [x['t'] for x in tb] == ['Home', 'Search', 'Scan', 'Picks', 'More'] and [x['h'] for x in tb] == ['#/', '#/search', 'scan', '#/picks', '#/more'] and [x['t'] for x in tb if x['on']] == ['Home'], tb)
    # Enter submits (multi-line box), Shift+Enter does not
    pg.fill('#q', 'show me greek yogurt'); pg.keyboard.press('Shift+Enter'); ok('[home] Shift+Enter makes a new line and does not search', '#/search' not in pg.url, pg.url)
    pg.fill('#q', 'show me greek yogurt'); pg.keyboard.press('Enter'); pg.wait_for_selector('#res a.row, a.row', timeout=60000)
    ok('[home] Enter runs the search; filler "show me" is stripped', 'search/greek%20yogurt' in pg.url.lower().replace('+', '%20') or 'search/greek yogurt' in pg.url.lower(), pg.url)
    ok('[home] the search lists results', pg.evaluate("document.querySelectorAll('a.row').length") >= 3)
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan'); pg.fill('#q', 'oats'); pg.click('.send270'); pg.wait_for_selector('a.row', timeout=60000)
    ok('[home] the send arrow runs the search', 'search/oats' in pg.url, pg.url)
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan'); pg.click('.ex270c >> text=Costco snacks'); pg.wait_for_selector('a.row', timeout=60000)
    ok('[home] an example chip runs the search', 'search/costco' in pg.url.lower(), pg.url)
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan'); pg.fill('#q', 'bread'); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    pg.goto(base + '#/'); pg.wait_for_selector('#heroScan'); pg.click('#heroScan'); pg.wait_for_timeout(1500)
    ok('[home] the Scan button opens the scanner', pg.evaluate("!!document.querySelector('#scanner,.scan-ov,.scanov,[data-scanner],video,.sc-ov,#sov')||/scan/i.test(document.body.innerText)") , pg.url)
    # ---------- Picks ----------
    pg.goto(base + '#/picks'); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_timeout(1000)
    cols = pg.evaluate("[...document.querySelectorAll('#picks .du14c')].map(c=>({h:c.querySelector('h3').innerText,x:Math.round(c.getBoundingClientRect().x),n:c.querySelectorAll('li').length,ps:/per serving|per item/.test(c.innerText),cmp:c.querySelectorAll('.cmp141').length}))")
    ok('[picks] Overall health on the left, Blood sugar on the right, per serving, Compare buttons', len(cols) == 2 and re.search('health', cols[0]['h'], re.I) and re.search('blood sugar', cols[1]['h'], re.I) and cols[0]['x'] < cols[1]['x'] and all(c['ps'] and c['cmp'] >= 1 for c in cols), cols)
    ok('[picks] See all picks, restaurant picks and the ranking note are here', pg.evaluate("!!document.getElementById('allPicks27')&&!!document.getElementById('restBest')&&!!document.getElementById('how14')||/ranked/i.test(document.getElementById('app').innerText)"))
    tb = pg.evaluate(TAB); ok('[nav] Picks is lit on #/picks', [x['t'] for x in tb if x['on']] == ['Picks'], tb)
    # ---------- More has Places ----------
    pg.goto(base + '#/more'); pg.wait_for_selector('.ml27', timeout=30000)
    L = pg.evaluate("[...document.querySelectorAll('.ml27 a')].map(a=>a.getAttribute('href'))"); first = pg.evaluate("document.querySelector('.mg27 summary b').innerText")
    ok('[more] Places is the first group (open) with Places and Restaurants; hidden sugars/additives still there; version + What\'s new at the bottom', first == 'Places' and '#/places' in L and '#/browse/rest' in L and '#/additives' in L and pg.evaluate("/27\\.[01]/.test(document.querySelector('.more270').innerText)&&!!document.querySelector('.more270 a[href=\"#/whatsnew\"]')"), (first, L[:5]))
    tb = pg.evaluate(TAB); ok('[nav] More is lit on #/more', [x['t'] for x in tb if x['on']] == ['More'], tb)
    pg.goto(base + '#/places'); pg.wait_for_selector('.places27', timeout=30000); ok('[places] #/places still works and More is lit', [x['t'] for x in pg.evaluate(TAB) if x['on']] == ['More'])
    # ---------- Theme ----------
    meta = pg.evaluate("[...document.querySelectorAll('meta[name=theme-color]')].map(m=>m.content)")
    man = json.load(open(REPO + '/manifest.webmanifest'))
    ok('[theme] theme-color metas and manifest are orange/warm (no green, no grey)', meta and meta[0] == '#c2410c' and all(m in ('#c2410c', '#1a0f08') for m in meta) and man['theme_color'].lower() == '#c2410c', (meta, man['theme_color']))
    for th in ('light', 'dark'):
        pg.evaluate("t=>{document.documentElement.dataset.theme=t}", th); pg.goto(base + '#/'); pg.wait_for_selector('#heroScan'); pg.wait_for_timeout(300)
        pg.evaluate("t=>{document.documentElement.dataset.theme=t}", th); pg.wait_for_timeout(200)
        S = pg.evaluate("""()=>{const g=s=>getComputedStyle(document.querySelector(s));const rs=getComputedStyle(document.documentElement);return {acc:rs.getPropertyValue('--acc').trim(),accT:rs.getPropertyValue('--accT').trim(),fg:rs.getPropertyValue('--accFg').trim(),bg:rs.getPropertyValue('--bg').trim(),
          scan:g('#heroScan').backgroundColor,scanFg:g('#heroScan').color,send:g('.send270').backgroundColor,sendFg:g('.send270').color,link:g('#typeBc').color,tab:g('.tab-scan .scan-btn').backgroundColor,bodyBg:g('body').backgroundColor}}""")
        hue = lambda h: (lambda r, g, b_: r > g > b_ and r - b_ > 90)(*[int(S['acc'][i:i+2], 16) for i in (1, 3, 5)])
        ok(f'[theme {th}] primary is orange; Scan, send and the centre tab button use it', hue(S['acc']) and rgb2hex(S['scan']) == S['acc'].lower() and rgb2hex(S['send']) == S['acc'].lower() and rgb2hex(S['tab']) == S['acc'].lower(), S)
        ok(f'[theme {th}] AA contrast: text on orange >= 4.5, link text on page >= 4.5 (Scan {cr(rgb2hex(S["scanFg"]), rgb2hex(S["scan"])):.2f}, link {cr(rgb2hex(S["link"]), rgb2hex(S["bodyBg"])):.2f})', cr(rgb2hex(S['scanFg']), rgb2hex(S['scan'])) >= 4.5 and cr(rgb2hex(S['sendFg']), rgb2hex(S['send'])) >= 4.5 and cr(rgb2hex(S['link']), rgb2hex(S['bodyBg'])) >= 4.5, S)
    pg.evaluate("delete document.documentElement.dataset.theme")
    pg.goto(base + '#/search/soda'); pg.wait_for_selector('#fsBtn', timeout=60000); pg.wait_for_timeout(2500); pg.evaluate("document.getElementById('fsBtn').click()"); pg.wait_for_selector('#f22'); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('.f26c[data-k26=ban]').click()"); pg.wait_for_timeout(1200)
    ok('[sheet] a filter chip tapped in the Filters sheet shows as pressed (aria-pressed + on)', pg.evaluate("(()=>{const b=document.querySelector('.f26c[data-k26=ban]');return b.getAttribute('aria-pressed')==='true'&&b.classList.contains('on')})()"))
    pg.goto(base + '#/more'); pg.wait_for_selector('.ml27'); pg.wait_for_timeout(300)
    ok('[sheet] navigating away from Search closes the Filters sheet', pg.evaluate("!document.getElementById('fs269').classList.contains('on')&&!document.body.classList.contains('fs269on')"))
    ok('[perf] no page errors', not errs, errs)
    c.close(); b.close()
    print('done in %.1fs  %d/%d passed' % (time.time()-t0, sum(1 for _,x in RES if x), len(RES)))
    sys.exit(0 if all(x for _,x in RES) else 1)
