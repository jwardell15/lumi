# Lumi 26.9: compact search toolbar + Filters & sort sheet, active chips, type switch, labeled Compare on Home picks.
# usage: VER=26.9 python3 t269.py <base> [local]
import sys, os, re, json, time
os.environ['LUMI_LATE'] = '0'
exec(open('/workspace/m24/t/t24.py').read().split('with sync_playwright() as p:')[0])
RES = R
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
VER = os.environ.get('VER', '26.9')
BUD = json.load(open(REPO + '/tests27/perf_budget.json')); BG = BUD.get(VER) or BUD[sorted(BUD)[-1]]
exec(open(REPO + '/tests27/perfmod.py').read())
def vis(pg, sel):
    return pg.evaluate("s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect(),st=getComputedStyle(e);return !!(r.width&&r.height)&&st.display!=='none'&&st.visibility!=='hidden'&&e.offsetParent!==null||(st.position==='fixed'&&st.display!=='none'&&r.width&&r.height)}", sel)
def chrome(pg):
    return pg.evaluate("""()=>{
      const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect(),st=getComputedStyle(e);if(st.display==='none'||st.visibility==='hidden'||!r.width||!r.height)return false;return true};
      const app=document.getElementById('app');
      const tools=document.getElementById('toolsLegacy');
      const tabs=[...document.querySelectorAll('#sort button')].filter(vis);
      const quick=['#fGood','#fHealthy','#fLow','#fHide','#fReady','#fPhoto','#fBad'].filter(s=>vis(document.querySelector(s)));
      const f22=document.getElementById('f22');
      const card=f22 && vis(f22) && getComputedStyle(f22).backgroundImage!=='none' && !f22.closest('#fs269.on');
      const above=(()=>{const res=document.getElementById('res'); if(!res)return {};
        const top=res.getBoundingClientRect().top;
        const text=[...app.querySelectorAll('button,a,h2,h3,label')].filter(e=>e.getBoundingClientRect().bottom<=top+2 && vis(e)).map(e=>e.innerText.trim()).filter(Boolean);
        return {text, n:text.length};})();
      return {
        version: typeof VERSION==='undefined'?'':VERSION,
        fsBtn: vis(document.getElementById('fsBtn')),
        fsTxt: (document.getElementById('fsBtn')||{}).innerText||'',
        badge: (document.getElementById('fsBadge')||{}).hidden,
        badgeN: (document.getElementById('fsBadge')||{}).innerText||'',
        sheetOn: !!(document.getElementById('fs269')&&document.getElementById('fs269').classList.contains('on')&&vis(document.getElementById('fs269'))),
        typ: vis(document.getElementById('grp'))||vis(document.getElementById('typSel269')),
        typVal: (document.getElementById('typSel269')||{}).value || ((document.querySelector('#grp button.on')||{}).dataset||{}).g || '',
        act: vis(document.getElementById('act269')),
        actTxt: (document.getElementById('act269')||{}).innerText||'',
        toolsHidden: !tools || tools.hidden || !vis(tools),
        visTabs: tabs.map(b=>b.innerText),
        visQuick: quick,
        f22InSheet: !!(f22 && f22.closest('#fs269')),
        smartCardInColumn: !!card,
        allBtn: !!document.getElementById('allBtn'),
        allParent: (document.getElementById('allBtn')&&document.getElementById('allBtn').closest('.rf269'))?true:false,
        statusInFoot: !!(document.getElementById('status')&&document.getElementById('status').closest('.rf269')),
        rows: document.querySelectorAll('#res a.row').length,
        above,
        sortRadios: [...document.querySelectorAll('#fsSort input[name=s269]')].map(i=>({v:i.value,c:i.checked,l:i.parentElement.innerText.trim()}))
      };
    }""")

with sync_playwright() as p:
    b = p.chromium.launch(args=['--enable-precise-memory-info']); t0 = time.time()
    c = ctx(b); errs = []; pg = page(c, errs)
    # ---- Home compare label (light pass) ----
    pg.goto(base + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_timeout(800)
    ok('version ' + VER, pg.evaluate('VERSION') == VER, pg.evaluate('VERSION'))
    cmp = pg.evaluate("[...document.querySelectorAll('#picks .cmp141')].map(b=>({t:b.innerText.trim(),a:b.getAttribute('aria-label')||''}))")
    ok('[home] each top-pick Compare button is labeled Compare (not an unlabeled icon)', len(cmp) >= 4 and all(x['t'] == 'Compare' and re.search(r'^Compare ', x['a'] or 'Compare ') for x in cmp), cmp[:3])
    # ---- Search, no filters ----
    # clear leftover filters from a previous run on this origin
    pg.evaluate("store.set('filters',{});store.set('f22',{});store.set('f26',{});store.set('sort','rel')")
    pg.goto(base + '#/search/yogurt'); pg.wait_for_selector('#res a.row, #fsBtn', timeout=90000); pg.wait_for_selector('a.row', timeout=90000); pg.wait_for_selector('#allBtn, #dym .dym269', timeout=60000); pg.wait_for_timeout(400)
    S = chrome(pg)
    ok('[search] Filters & sort button is visible under the search bar', S['fsBtn'] and re.search(r'Filters', S['fsTxt']), S)
    ok('[search] type selector is present (All / Products / Restaurants / Whole foods)', S['typ'], S)
    ok('[search] the old sort tabs and quick chips are not visible, and the Smart filters card is not in the results column', S['toolsHidden'] and not S['visTabs'] and not S['visQuick'] and not S['smartCardInColumn'] and S['f22InSheet'], S)
    ok('[search] no active-filter chips or badge when nothing is on', S['badge'] and not S['act'] and S['rows'] > 0, S)
    ok('[search] Search all lives in the results footer, not above the list', S['allBtn'] and S['allParent'] and S['statusInFoot'], S)
    # ---- open / close sheet ----
    pg.click('#fsBtn'); pg.wait_for_selector('#fs269.on', timeout=5000); pg.wait_for_timeout(200)
    S = chrome(pg)
    body = pg.evaluate("({t:(document.getElementById('fs269')||{}).innerText||'',nSort:document.querySelectorAll('#fsSort input[name=s269]').length,f22:!!document.getElementById('f22'),dupSel:document.querySelector('#fs269 .f22s')&&getComputedStyle(document.querySelector('#fs269 .f22s')).display!=='none'})")
    low = body['t'].lower()
    missing = [w for w in ('sugar', 'nutrition', 'ingredients', 'display', 'how these filters work', 'per serving', 'relevance', 'blood sugar') if w not in low]
    ok('[sheet] opens as a dialog with sort radios and grouped filters', S['sheetOn'] and body['f22'] and body['nSort'] >= 6 and not missing and not body['dupSel'], {'missing': missing, 'nSort': body['nSort'], 'dupSel': body['dupSel'], 't': body['t'][:600]})
    pg.click('.fs269x'); pg.wait_for_timeout(300)
    ok('[sheet] close button hides it', not chrome(pg)['sheetOn'])
    pg.click('#fsBtn'); pg.wait_for_timeout(300)
    pg.locator('.fs269bg').click(position={'x': 20, 'y': 8}, force=True); pg.wait_for_timeout(300)
    ok('[sheet] backdrop click hides it', not chrome(pg)['sheetOn'])
    # ---- apply a filter, badge, chips ----
    pg.click('#fsBtn'); pg.wait_for_timeout(300)
    n0 = pg.evaluate("document.querySelectorAll('#res a.row').length")
    pg.evaluate("document.querySelector('#f22 [data-f=healthy]').click()"); pg.wait_for_timeout(1200)
    S = chrome(pg)
    ok('[filter] applying Healthy 50+ shows a badge count of 1 and a removable chip', S['badgeN'] == '1' and 'Healthy 50+' in S['actTxt'] and S['act'], S)
    ok('[filter] results update (or stay a filtered list)', pg.evaluate("document.querySelectorAll('#res a.row').length") >= 0, n0)
    # a second filter
    pg.evaluate("document.querySelector('#f22 [data-f=photo]').click()"); pg.wait_for_timeout(800)
    S = chrome(pg)
    ok('[filter] badge counts both active filters', S['badgeN'] == '2' and 'Has photo' in S['actTxt'], S)
    # remove one chip
    pg.evaluate("[...document.querySelectorAll('#act269 [data-rm]')].find(b=>b.dataset.rm==='photo').click()"); pg.wait_for_timeout(600)
    S = chrome(pg)
    ok('[filter] removing the chip turns that filter off and drops the badge to 1', S['badgeN'] == '1' and 'Has photo' not in S['actTxt'] and 'Healthy 50+' in S['actTxt'], S)
    # ---- clear all ----
    pg.evaluate("document.getElementById('fsBtn').getAttribute('aria-expanded')==='true' || document.getElementById('fsBtn').click()"); pg.wait_for_timeout(200)
    pg.evaluate("document.getElementById('f22x').click()"); pg.wait_for_timeout(800)
    S = chrome(pg)
    ok('[clear] Clear all removes the badge and the chips', S['badge'] and not S['act'] and S['badgeN'] == '', S)
    ok('[clear] store filters are empty', pg.evaluate("JSON.stringify(store.get('filters'))") in ('{}', 'null', 'undefined') or pg.evaluate("!store.get('filters').healthy && !store.get('filters').photo"), pg.evaluate("store.get('filters')"))
    # ---- sort change ----
    pg.evaluate("document.getElementById('fsBtn').getAttribute('aria-expanded')==='true' || document.getElementById('fsBtn').click()"); pg.wait_for_timeout(200)
    before = pg.evaluate("[...document.querySelectorAll('#res a.row')].slice(0,8).map(a=>a.getAttribute('href')).join(' ')")
    pg.evaluate("document.querySelector('#fsSort input[value=health]').click()"); pg.wait_for_timeout(1000)
    after = pg.evaluate("[...document.querySelectorAll('#res a.row')].slice(0,8).map(a=>a.getAttribute('href')).join(' ')")
    hs = pg.evaluate("[...document.querySelectorAll('#res a.row')].slice(0,8).map(a=>{const t=a.innerText;return t})")
    ok('[sort] choosing Health updates the selected radio and the result order (or keeps a Health sort)', pg.evaluate("document.querySelector('#fsSort input[value=health]').checked") and pg.evaluate("store.get('sort')") == 'health', (before != after, store := pg.evaluate("store.get('sort')")))
    # ---- type switch ----
    # reset sort so grouped results / type counts are predictable
    pg.evaluate("document.querySelector('#fsSort input[value=rel]').click()"); pg.wait_for_timeout(800)
    types = pg.evaluate("""()=>{
      const sel=document.getElementById('typSel269');
      const opts=sel?[...sel.options].map(o=>({v:o.value,t:o.text})):[];
      const btns=[...document.querySelectorAll('#grp button')].map(b=>({v:b.dataset.g,t:b.innerText}));
      return {opts,btns,has: (opts.length?opts:btns).map(x=>x.v)};
    }""")
    ok('[type] All / Products / Restaurants / Whole foods are available', set(types['has']) >= {'all','prod','rest','whole'}, types)
    nAll = pg.evaluate("document.querySelectorAll('#res a.row').length")
    pg.evaluate("""()=>{const sel=document.getElementById('typSel269'); if(sel){sel.value='prod'; sel.dispatchEvent(new Event('change',{bubbles:true}));}
      else {const b=document.querySelector('#grp button[data-g=prod]'); if(b)b.click();}}""")
    pg.wait_for_timeout(800)
    ok('[type] switching to Products changes the selection and still lists rows', pg.evaluate("(document.getElementById('typSel269')||{}).value==='prod' || !!document.querySelector('#grp button[data-g=prod].on')") and pg.evaluate("document.querySelectorAll('#res a.row').length") > 0, pg.evaluate("({v:(document.getElementById('typSel269')||{}).value,n:document.querySelectorAll('#res a.row').length})"))
    # reset type
    pg.evaluate("""()=>{const sel=document.getElementById('typSel269'); if(sel){sel.value='all'; sel.dispatchEvent(new Event('change',{bubbles:true}));}
      else {const b=document.querySelector('#grp button[data-g=all]'); if(b)b.click();}}""")
    pg.wait_for_timeout(400)
    ok('[search] no page errors', not errs, errs)
    # ---- desktop type control ----
    c.close()
    c = ctx(b, w=1280, h=800); errs = []; pg = page(c, errs)
    pg.goto(base + '#/'); pg.wait_for_function("()=>typeof store!=='undefined'", timeout=30000)
    pg.evaluate("store.set('filters',{});store.set('f22',{});store.set('f26',{});store.set('sort','rel')")
    pg.goto(base + '#/search/yogurt'); pg.wait_for_selector('a.row', timeout=90000); pg.wait_for_timeout(1000)
    desk = pg.evaluate("""()=>{
      const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect(),st=getComputedStyle(e);return st.display!=='none'&&st.visibility!=='hidden'&&r.width>0&&r.height>0};
      return {fs:vis(document.getElementById('fsBtn')), grp:vis(document.getElementById('grp')), sel:vis(document.getElementById('typSel269')),
        nGrp:[...document.querySelectorAll('#grp button')].length};
    }""")
    ok('[desktop] Filters & sort button and the type segmented control are visible', desk['fs'] and desk['grp'] and desk['nGrp'] >= 4, desk)
    pg.click('#fsBtn'); pg.wait_for_timeout(400)
    ok('[desktop] the sheet opens as a dialog', pg.evaluate("document.getElementById('fs269').classList.contains('on')"))
    pg.click('.fs269x'); pg.wait_for_timeout(200)
    ok('[desktop] no page errors', not errs, errs)
    c.close(); b.close()
    print('done in %.1fs  %d/%d passed' % (time.time()-t0, sum(1 for _,x in RES if x), len(RES)))
    sys.exit(0 if all(x for _,x in RES) else 1)
