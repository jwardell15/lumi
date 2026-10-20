from playwright.sync_api import sync_playwright
import sys,time
base=sys.argv[1]; SH=len(sys.argv)>2 and sys.argv[2]=='1'; TJ=sys.argv[3]; D='/workspace/diabetes-scanner/'
Q=['waffle house','taco johns','buffalo wild wings','dutch bros','cheesecake factory','portillos','cinnabon','cheddars','pollo tropical',"taco john's"]
ERR={}
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,th in [(390,'light'),(390,'dark'),(1440,'light')]:
        tag=f'{w}-{th}'; E=ERR.setdefault(tag,[])
        c=b.new_context(viewport={'width':w,'height':900 if w>500 else 844},device_scale_factor=1 if w>500 else 2,is_mobile=w<500,has_touch=w<500,color_scheme=th)
        c.add_init_script("localStorage.setItem('lumi.settings',JSON.stringify({onboarded:true}));localStorage.setItem('lumi.seenV',JSON.stringify('9.1.1'));localStorage.setItem('lumi.seen91','true')")
        def pg_(u,wait):
            pg=c.new_page(); pg.on('pageerror',lambda e:E.append(u+' JS:'+str(e)[:160])); pg.on('console',lambda m:E.append(u+' console:'+m.text[:120]) if m.type=='error' else None)
            pg.goto(base+u); pg.wait_for_timeout(wait); return pg
        pg=c.new_page(); files=[]; pg.on('pageerror',lambda e:E.append('home JS:'+str(e)[:160]))
        pg.on('response',lambda r: files.append((r.url.split('/data/')[1].split('?')[0],r.headers.get('content-length'))) if '/data/' in r.url else None)
        t0=time.time(); pg.goto(base+'#/'); pg.wait_for_selector('#picks .row',timeout=60000); print(tag,'home picks %.1fs'%(time.time()-t0),'data',sorted(set(f[0] for f in files)))
        pg.wait_for_timeout(1500)
        if SH: pg.screenshot(path=D+f'v911-home-{tag}.png')
        pg.close()
        for q in (Q if w==390 and th=='light' else Q[:3]):
            pg=pg_('#/search/'+q.replace(' ','%20'),12000)
            rows=pg.evaluate("[...document.querySelectorAll('#res .row')].slice(0,5).map(r=>r.querySelector('.n').innerText+' | '+r.querySelector('.b').innerText.slice(0,40))")
            print(tag,'Q',q,'->',rows[:4])
            if SH and (th=='light' or q==Q[0]): pg.screenshot(path=D+f'v911-search-{q.replace(" ","-")}-{tag}.png')
            if q=='waffle house' and pg.query_selector('#res .row'):
                pg.click('#res .row'); pg.wait_for_timeout(5000); print(tag,'item page:',pg.evaluate("document.title"),'| src:',(pg.inner_text('body')[:0]), pg.evaluate("[...document.querySelectorAll('a[href*=wafflehouse]')].length"),'source links')
                if SH: pg.screenshot(path=D+f'v911-product-waffle-house-{tag}.png')
            pg.close()
        pg=pg_('#/product/'+TJ,9000); print(tag,'TJ 8-digit:',pg.evaluate("document.title"))
        if SH and tag=='390-light': pg.screenshot(path=D+'v911-product-upce-390-light.png')
        pg.close()
        pg=pg_('#/browse/rest',5000); L=pg.evaluate("[...document.querySelectorAll('a[href^=\"#/browse/rest-\"]')].map(a=>a.innerText)"); print(tag,'chains listed:',len(L),[x for x in L if any(k in x for k in ['Buffalo','Cheesecake','Waffle','Portillo','Dutch','Taco John','Cheddar','Pollo','Cinnabon'])])
        if SH and w==390 and th=='light': pg.screenshot(path=D+'v911-restaurants-390-light.png',full_page=False)
        pg.close(); c.close()
    for k,v in ERR.items(): print('ERR',k,len(v),v[:5])
    b.close()
