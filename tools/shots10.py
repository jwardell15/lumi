from playwright.sync_api import sync_playwright
import sys
base,pre=sys.argv[1],sys.argv[2]; only=sys.argv[3].split(',') if len(sys.argv)>3 else None
D='/workspace/diabetes-scanner/'
S=[('home','#/',4000),('product','#/product/0016000275263',7000),('search','#/search/cereal',9000),('log','#/log',3000),('week','#/log/week',3000),('report','#/log/report',3000),('browse','#/browse',3000),('aisle','#/browse/cereal',6000),('store','#/store/costco',6000),('lists','#/lists',2500),('compare','#/compare',2500),('meal','#/meal',3000),('meals','#/meals',2500),('settings','#/settings',2500),('saved','#/saved',2500),('restaurants','#/browse/rest',6000),('whatsnew','#/whatsnew',2000)]
ERR=[]
with sync_playwright() as p:
  b=p.chromium.launch()
  for w,th in [(390,'light'),(390,'dark'),(1440,'light')]:
    c=b.new_context(viewport={'width':w,'height':844 if w<500 else 900},device_scale_factor=2 if w<500 else 1,is_mobile=w<500,has_touch=w<500,color_scheme=th)
    c.add_init_script("localStorage.setItem('lumi.settings',JSON.stringify({onboarded:true}));localStorage.setItem('lumi.seenV',JSON.stringify('10.0'));['seen91','seen10'].forEach(k=>localStorage.setItem('lumi.'+k,'true'));if(!localStorage.getItem('lumi.log'))localStorage.setItem('lumi.log',JSON.stringify([]))")
    for n,u,wt in S:
      if only and n not in only: continue
      pg=c.new_page(); pg.on('pageerror',lambda e,n=n:ERR.append(f'{w}{th} {n} JS:{e}'[:200])); pg.on('console',lambda m,n=n:ERR.append(f'{w}{th} {n} con:{m.text}'[:160]) if m.type=='error' and 'openfoodfacts' not in m.text and 'ERR_FAILED' not in m.text else None)
      pg.goto(base+u); pg.wait_for_timeout(wt); pg.screenshot(path=D+f'{pre}-{n}-{w}-{th}.png'); pg.close()
    c.close()
  b.close()
print('ERRORS',len(ERR)); [print(e) for e in ERR[:30]]
