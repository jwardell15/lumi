# functional checks: share round-trip (list + meal), Clarity CSV parse + chart (TEST FIXTURE, not saved as screenshot), scan record, health URL
from playwright.sync_api import sync_playwright
import sys,json,time
base=sys.argv[1]
with sync_playwright() as p:
  b=p.chromium.launch();c=b.new_context();c.add_init_script("localStorage.setItem('lumi.settings',JSON.stringify({onboarded:true}));localStorage.setItem('lumi.seen11','true')")
  pg=c.new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)))
  pg.goto(base+'#/');pg.wait_for_timeout(2500)
  code=pg.evaluate("pack11({app:'lumi',v:1,t:'list',name:'Test list',items:[{id:'0016000275263',name:'Cheerios',brand:'General Mills'}]})")
  print('code len',len(code),code[:1])
  pg.goto(base+'#/share/'+code);pg.wait_for_timeout(1500);print('preview:',pg.inner_text('#app h2'))
  pg.click('#shimp');pg.wait_for_timeout(1000);print('after import hash',pg.evaluate('location.hash'),[l['name'] for l in pg.evaluate("store.get('lists',[])")])
  mc=pg.evaluate("pack11({app:'lumi',v:1,t:'meal',name:'Taco night',items:[{name:'Corn tortilla',grams:90,label:'90 g',n:{carbs:44,protein:5,fat:3,kcal:218}}]})")
  pg.goto(base+'#/share/'+mc);pg.wait_for_timeout(1200);pg.click('#shimp');pg.wait_for_timeout(800);print('meals',[m['name'] for m in pg.evaluate("store.get('meals',[])")])
  pg.goto(base+'#/share/zzzbad');pg.wait_for_timeout(800);print('bad code:',pg.inner_text('#app .card b'))
  # Clarity parse with a synthetic TEST FIXTURE (cleared afterwards)
  t0=int(time.time()//300*300)-4*3600
  rows=['Index,Timestamp (YYYY-MM-DDThh:mm:ss),Event Type,Event Subtype,Patient Info,Device Info,Source Device ID,Glucose Value (mg/dL),Insulin Value (u),Carb Value (grams)','1,,FirstName,,TEST,,,,,']
  for i in range(48):
    tt=time.strftime('%Y-%m-%dT%H:%M:%S',time.localtime(t0+i*300)); rows.append(f'{i+2},{tt},EGV,,,,iOS G7,{100+i if i<20 else 140-(i-20)},,')
  rows.append(f'99,{time.strftime("%Y-%m-%dT%H:%M:%S",time.localtime(t0+60))},EGV,,,,iOS G7,Low,,')
  csv='\n'.join(rows)
  r=pg.evaluate("t=>{const r=parseClarity11(t);mergeCGM11(r.pts,'clarity');return [r.pts.length,r.lowhi, !!chart11(%d*1000+600000)]}"%t0, csv)
  print('clarity pts,lowhi,chart?',r)
  print('no chart without data window:',pg.evaluate("!!chart11(Date.now()-86400000*30)"))
  pg.evaluate("store.set('cgm',null)")
  print('health url:',pg.evaluate("healthURL11({carbs:45.25,protein:20,fat:12,kcal:380.4},'Lunch',0)")[:160])
  # scan record
  pg.evaluate("sessionStorage.setItem('lumi.scanned','0016000275263')");pg.goto(base+'#/product/0016000275263');pg.wait_for_timeout(6000)
  print('scans',[(s['name'],s['score']) for s in pg.evaluate("store.get('scans',[])")])
  print('JS errors',E)
  b.close()
