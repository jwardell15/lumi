# Lumi 26.6.1: the barcode-scanner library (html5-qrcode 2.3.8) is served by Lumi itself (vendor/), versioned, in the service worker's shell precache; no unpkg.
# usage: python3 t2661.py <base> [local]   (base = a server of the working tree)
from playwright.sync_api import sync_playwright
import sys, os, re, json, hashlib, subprocess, time
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8836/'; REPO = '/workspace/diabetes-scanner'; LOCAL = 'local' in sys.argv[2:]
R = []
def ok(n, c, info=''):
    R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  :: ' + str(info)[:500]), flush=True)
V = 'vendor/html5-qrcode-2.3.8.min.js'; SHA = '660b12437b1d747e3e68b8be0685c08cb728140110ad213f167b14b66f8b1d8e'
SEED = "localStorage.setItem('lumi.settings',JSON.stringify({onboarded:true}));localStorage.setItem('lumi.notice231','1');"
ok('[files] vendored library is the exact unmodified html5-qrcode 2.3.8 file (sha256) with its Apache-2.0 license', hashlib.sha256(open(REPO + '/' + V, 'rb').read()).hexdigest() == SHA and os.path.isfile(REPO + '/vendor/LICENSE-html5-qrcode.txt'))
SW = open(REPO + '/sw.js').read(); SH = json.loads(re.search(r'const SHELL_H = (\{.*?\});', SW, re.S).group(1))
ok('[shell] the library is in the shell manifest (hash-verified precache); manifest is current', V in SH and subprocess.run([sys.executable, REPO + '/tools/build_shell.py', '--check'], capture_output=True).returncode == 0)
code = open(REPO + '/js/app.js').read() + ''.join(open(REPO + '/dist/' + f).read() for f in os.listdir(REPO + '/dist') if f.endswith('.js'))
ok('[code] no script is loaded from unpkg.com any more; the scanner loader points at vendor/', "unpkg.com/html5-qrcode" not in code and 'unpkg.com' not in open(REPO + '/js/v231.js').read() and "'" + V + "'" in open(REPO + '/js/app.js').read())
ext = []
def want(page):
    page.on('request', lambda r: ext.append(r.url) if 'unpkg.com' in r.url else None)
def scan_open(pg, t=30000):
    pg.evaluate("document.querySelector('[data-scan]').click()"); pg.wait_for_selector('video', timeout=t, state='attached')
    return pg.evaluate("typeof Html5Qrcode")
def local_data(c):
    if LOCAL:
        def h_(rt):
            pth = REPO + '/' + rt.request.url.split('pages.dev/', 1)[1].split('?')[0]
            rt.fulfill(path=pth, headers={'access-control-allow-origin': '*', 'content-type': 'application/json' if pth.endswith('.json') else 'image/webp'}) if os.path.isfile(pth) else rt.fulfill(status=404, body='nf')
        c.route(re.compile(r'https://lumi-data-cky\.pages\.dev/(data|img)/.*'), h_)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'])
    # A. first visit, no service worker, unpkg blocked: scanner still opens
    c = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', permissions=['camera']); c.add_init_script(SEED); local_data(c)
    c.route(re.compile(r'https://unpkg\.com/.*'), lambda rt: rt.abort()); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); want(pg)
    pg.goto(BASE + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000)
    ok('[scan] with unpkg.com blocked and no service worker, the scanner opens (camera view) and the library is defined', scan_open(pg) == 'function', errs)
    ok('[scan] nothing was requested from unpkg.com', not ext, ext); c.close()
    # B. service worker installed: library comes from the precache, also with the network off
    c = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='allow', permissions=['camera']); c.add_init_script(SEED); local_data(c)
    pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); want(pg)
    pg.goto(BASE + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_function("navigator.serviceWorker&&navigator.serviceWorker.controller", timeout=120000)
    n = pg.evaluate("(async()=>{for(const k of await caches.keys())if(k.startsWith('lumi-v')){return (await (await caches.open(k)).keys()).map(r=>r.url).filter(u=>u.includes('html5-qrcode'))}return []})()")
    ok('[sw] the library is in the shell cache under its hashed key', len(n) == 1 and '?h=' + SH[V] in n[0], n)
    ok('[sw] scanner opens with the service worker in control', scan_open(pg) == 'function', errs)
    pg.goto(BASE + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000)
    c.set_offline(True); pg.reload(); pg.wait_for_selector('#app', timeout=60000); pg.wait_for_timeout(1500)
    ok('[sw] offline (network off): the scanner library still loads from the cache and the camera view opens', scan_open(pg) == 'function', errs)
    ok('[scan] no request to unpkg.com with the service worker either; no page errors', not ext and not errs, (ext, errs))
    c.set_offline(False); pg.goto(BASE + '#/privacy'); pg.wait_for_timeout(2500); t = pg.evaluate("document.getElementById('app').innerText")
    ok('[privacy] the data-sources list no longer names unpkg (nothing is fetched from it) and still names jsDelivr', 'unpkg' not in t and 'jsDelivr' in t)
    c.close(); b.close()
print(f'\n{sum(R)}/{len(R)} passed'); sys.exit(0 if all(R) else 1)
