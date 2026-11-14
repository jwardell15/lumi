# Lumi 26.6 tests: bundled + minified build (tools/build/build.mjs). The bundle must behave exactly like the separate files.
# usage: python3 t266.py   (serves the working tree and, for the equivalence check, OLD_REF extracted from git; default 7a711cf = 26.5, separate files)
import sys, os, re, json, time, gzip, threading, subprocess, tempfile, shutil, http.server
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); RES = []
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
from playwright.sync_api import sync_playwright
OLD_REF = os.environ.get('OLD_REF', '7a711cf'); ROOT = {'p': REPO}
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path): return http.server.SimpleHTTPRequestHandler.translate_path(self, path).replace(os.getcwd(), ROOT['p'], 1)
    def log_message(self, f, *a): pass
os.chdir(REPO); srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H); BASE = f'http://localhost:{srv.server_address[1]}/'; threading.Thread(target=srv.serve_forever, daemon=True).start()
SEED = "localStorage.setItem('lumi.settings',JSON.stringify({onboarded:true}));localStorage.setItem('lumi.notice231','1');"
html = open(REPO + '/index.html').read(); src = open(REPO + '/index.src.html').read(); M = json.load(open(REPO + '/dist/manifest.json'))
chk = subprocess.run(['node', REPO + '/tools/build/build.mjs', '--check'], capture_output=True, text=True)
ok('[build] index.html + dist/ are exactly what tools/build/build.mjs makes from index.src.html (run tools/release.sh after editing css/, js/ or index.src.html)', chk.returncode == 0, chk.stdout + chk.stderr)
ok('[build] index.html has one bundled script and one bundled stylesheet, no separate js/ or css/ tags', len(re.findall(r'<script src="dist/app\.[0-9a-f]{10}\.js"', html)) == 1 and len(re.findall(r'<link rel="stylesheet" href="dist/app\.[0-9a-f]{10}\.css"', html)) == 1 and not re.search(r'<script src="js/|href="css/', html), re.findall(r'<(?:script|link)[^>]*(?:js|css)/[^>]*>', html)[:3])
ok('[build] bundle keeps the source order of every file in index.src.html (' + str(len(M['jsFiles'])) + ' js, ' + str(len(M['cssFiles'])) + ' css)', M['jsFiles'] == re.findall(r'<script src="(js/[^"]+)"', src) and M['cssFiles'] == re.findall(r'<link rel="stylesheet" href="(css/[^"]+)"', src) and 'js/app.js' in M['jsFiles'])
gj = len(gzip.compress(open(REPO + '/' + M['js'], 'rb').read(), 9)) / 1024; gc = len(gzip.compress(open(REPO + '/' + M['css'], 'rb').read(), 9)) / 1024
BUD = json.load(open(REPO + '/tests27/perf_budget.json')); VER = re.search(r"VERSION = '([\d.]+)'", open(REPO + '/js/app.js').read()).group(1); BG = BUD.get(VER) or BUD[sorted(BUD)[-1]]
ok(f"[budget] bundle sizes: js <= {BG.get('bundle_js_gz_kb', 420)} KB gz ({gj:.0f}), css <= {BG.get('bundle_css_gz_kb', 45)} KB gz ({gc:.0f}) (separate files were 476 + 59 KB)", gj <= BG.get('bundle_js_gz_kb', 420) and gc <= BG.get('bundle_css_gz_kb', 45), (gj, gc))
def snap(b, base):
    c = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); c.add_init_script(SEED); pg = c.new_page(); errs = []; rq = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('request', lambda r: rq.append(r.url))
    pg.goto(base + '#/'); pg.wait_for_selector('#picks .du14, .home74 #picks .list, #picks .list', timeout=60000); pg.wait_for_timeout(2500)
    pg.evaluate("typeof loadLate27==='function'?loadLate27():0"); pg.wait_for_timeout(800)  # 26.8: the feature modules live in the late bundle; load it so the global names can be compared
    G = pg.evaluate("Object.keys(window).filter(k=>!/^(__|webkit|on[a-z]+$)/.test(k)).map(k=>k+':'+typeof window[k]).sort()")
    fn = pg.evaluate("(()=>{const o={};for(const k of ['route','viewHome','viewProduct','renderResults','tab19','viewBrowseHub','viewStore','homePicks','engine','VERSION'])o[k]=typeof window[k]==='undefined'?(()=>{try{return typeof eval(k)}catch(e){return 'undef'}})():typeof window[k];return o})()")
    local = [u for u in rq if u.startswith(base) and re.search(r'\.(js|css)(\?|$)', u)]
    for h in ['#/product/fdc-2346409', '#/browse', '#/search/yogurt', '#/settings', '#/today', '#/kitchen', '#/pet', '#/rmeal', '#/privacy']:
        pg.goto(base + h); pg.wait_for_timeout(1800)
    c.close(); return G, fn, local, errs
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    G1, fn1, loc1, e1 = snap(b, BASE)
    ok('[load] cold Home requests the main script and the stylesheet (the late bundle follows on idle): <= 4 js/css requests', len([u for u in loc1 if '/dist/app.' in u]) == 2 and len([u for u in loc1 if '/dist/' in u]) <= 3 and len(loc1) <= 4, loc1)
    ok('[load] no page errors across Home, product, browse, search, settings, today, kitchen, pet, restaurant builder, privacy', not e1, e1)
    old = tempfile.mkdtemp(prefix='lumi_old_'); ar = subprocess.run(f'cd {REPO} && git archive {OLD_REF} | tar -x -C {old}', shell=True, capture_output=True, text=True)
    if ar.returncode == 0 and os.path.isfile(old + '/index.html') and 'dist/app.' not in open(old + '/index.html').read():
        ROOT['p'] = old; G0, fn0, loc0, e0 = snap(b, BASE); ROOT['p'] = REPO
        extra = sorted(set(G1) - set(G0)); missing = sorted(set(G0) - set(G1))
        ok('[equivalence] the bundle defines exactly the same globals (names and types) as the ' + OLD_REF + ' separate files: ' + str(len(G0)) + ' globals', not [x for x in missing if not x.startswith('VERSION')] and not [x for x in extra if not re.match(r'(VERSION|__routed27|R27|LATE27|lateDone27|loadLate27|onLate27)', x)], (missing[:8], extra[:8]))
        ok('[equivalence] the separate-files build also loaded without page errors (control)', not e0, e0)
        ok('[equivalence] and it needed far more requests (' + str(len(loc0)) + ' js/css) than the bundle (' + str(len(loc1)) + ')', len(loc0) > 40 and len(loc1) <= 4, (len(loc0), len(loc1)))
    else:
        ok('[equivalence] (skipped: could not extract an unbundled ' + OLD_REF + ')', True, ar.stderr)
    shutil.rmtree(old, ignore_errors=True); b.close()
n = len(RES); f = [x for x in RES if not x[1]]
print(f'\n{n - len(f)}/{n} passed in {time.time() - t0:.0f}s'); sys.exit(1 if f else 0)
