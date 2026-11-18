# Shared local perf helper (CPU 4x, no network shaping): launch measurements for the budget test.
import re, os, json, time
INIT = r"""
window.__m={lt:[],fcp:0,home:0,picks:0};
try{new PerformanceObserver(l=>{for(const e of l.getEntries())__m.lt.push([e.startTime,e.duration])}).observe({type:'longtask',buffered:true})}catch(e){}
try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')__m.fcp=e.startTime}).observe({type:'paint',buffered:true})}catch(e){}
(function poll(){const a=document.getElementById('app');if(a){const t=a.innerText||'';if(!__m.home&&/Scan a barcode|Scan/.test(t)&&a.querySelector('input,textarea'))__m.home=performance.now();if(!__m.picks&&a.querySelector('#picks a[href^="#/product/"], .du14 a[href^="#/product/"]'))__m.picks=performance.now();}requestAnimationFrame(poll)})();
"""
def measure(browser, base, ctxfn, hash_='#/', wait=6000, cpu=4):
    c = ctxfn(browser); pg = c.new_page(); cd = c.new_cdp_session(pg)
    reqs = {}; cd.send('Network.enable'); cd.send('Performance.enable'); cd.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
    cd.on('Network.requestWillBeSent', lambda e: reqs.setdefault(e['requestId'], {'url': e['request']['url'], 'type': e.get('type', '?'), 'size': 0}))
    cd.on('Network.loadingFinished', lambda e: reqs.get(e['requestId']) and reqs[e['requestId']].update(size=e.get('encodedDataLength', 0)))
    pg.add_init_script(INIT)
    m0 = {x['name']: x['value'] for x in cd.send('Performance.getMetrics')['metrics']}
    pg.goto(base + hash_); pg.wait_for_timeout(wait)
    m = pg.evaluate('window.__m'); m1 = {x['name']: x['value'] for x in cd.send('Performance.getMetrics')['metrics']}
    heap = pg.evaluate('performance.memory ? performance.memory.usedJSHeapSize : 0')
    lt = m['lt']; out = dict(fcp=round(m['fcp']), home=round(m['home']), picks=round(m['picks']), longtasks=len(lt), lt_max=round(max([d for s, d in lt] or [0])), tbt=round(sum(max(0, d - 50) for s, d in lt)),
        script_s=round(m1['ScriptDuration'] - m0['ScriptDuration'], 2), task_s=round(m1['TaskDuration'] - m0['TaskDuration'], 2), heap_mb=round(heap / 1048576),
        n_js=sum(1 for r in reqs.values() if r['type'] == 'Script'), n_css=sum(1 for r in reqs.values() if r['type'] == 'Stylesheet'), n_req=len(reqs),
        data=sorted([(r['url'].split('/data/')[-1], r['size']) for r in reqs.values() if '/data/' in r['url']], key=lambda x: -x[1])[:6],
        data_files=[r['url'].split('/data/')[-1] for r in reqs.values() if '/data/' in r['url']],
        js_kb=round(sum(r['size'] for r in reqs.values() if r['type'] == 'Script') / 1024), css_kb=round(sum(r['size'] for r in reqs.values() if r['type'] == 'Stylesheet') / 1024))
    c.close(); return out
