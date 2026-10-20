from playwright.sync_api import sync_playwright
import sys,json,time
base,pre=sys.argv[1],sys.argv[2]; only=sys.argv[3].split(',') if len(sys.argv)>3 and sys.argv[3] else None
D='/workspace/diabetes-scanner/'
now=int(time.time()*1000); day=86400000
exec('def seed'+open('/workspace/v9/t9.py').read().split('def seed')[1].split('ERRS={}')[0])
lst=[{'id':'lfam','name':'Weekly groceries','t':now,'items':[{'id':'0016000275263','name':'Cheerios','brand':'General Mills','done':False,'t':now,'score':51},{'id':'0071524100354','name':'Refried Beans','brand':'Old El Paso','done':True,'t':now,'score':70}]}]
scans=[{'id':'s1','code':'0016000275263','ts':now-3600000,'name':'Cheerios','brand':'General Mills','score':51,'note':'Aisle 7, on sale','price':'4.29'},{'id':'s2','code':'0071524100354','ts':now-day,'name':'Refried Beans','brand':'Old El Paso','score':70,'note':'','price':''}]
extra=f"localStorage.setItem('lumi.lists',JSON.stringify({json.dumps(lst)}));localStorage.setItem('lumi.scans',JSON.stringify({json.dumps(scans)}));localStorage.setItem('lumi.seenV',JSON.stringify('11.0'));localStorage.setItem('lumi.seen11','true');"
S=[('home','#/',4000),('product','#/product/0016000275263',7000),('search','#/search/cereal',9000),('log','#/log',3500),('week','#/log/week',3000),('report','#/report',3000),('browse','#/browse',3000),('aisles','#/browse',3000),('aisle','#/browse/cereal',6000),('lists','#/lists',2500),('list','#/list/lfam',2500),('compare','#/compare',3000),('meal','#/meal',3000),('meals','#/meals',2500),('settings','#/settings',2500),('history','#/history',2500),('applehealth','#/applehealth',2000),('glucose','#/glucose',2000),('share','#/share',2000),('restaurants','#/browse/rest',6000),('whatsnew','#/whatsnew',2000)]
ERR=[]
with sync_playwright() as p:
  b=p.chromium.launch()
  for w,th in [(390,'light'),(390,'dark'),(1440,'light')]:
    c=b.new_context(viewport={'width':w,'height':844 if w<500 else 900},device_scale_factor=2 if w<500 else 1,is_mobile=w<500,has_touch=w<500,color_scheme=th)
    c.add_init_script(seed(w,th)+extra)
    for n,u,wt in S:
      if only and n not in only: continue
      pg=c.new_page(); pg.on('pageerror',lambda e,n=n:ERR.append(f'{w}{th} {n} JS:{e}'[:220])); pg.on('console',lambda m,n=n:ERR.append(f'{w}{th} {n} con:{m.text}'[:200]) if m.type in('error','warning') and 'openfoodfacts' not in m.text and 'ERR_FAILED' not in m.text else None)
      pg.goto(base+u); pg.wait_for_timeout(wt)
      if n=='aisles': pg.evaluate("(document.querySelector('.aisles')||document.body).scrollIntoView()"); pg.wait_for_timeout(400)
      pg.screenshot(path=(pre if pre.startswith('/') else D+pre)+f'-{n}-{w}-{th}.png'); pg.close()
    c.close()
  b.close()
print('ERRORS',len(ERR)); [print(e) for e in ERR[:40]]
