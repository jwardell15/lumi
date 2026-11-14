# Lumi 26.5 tests: shell-only service worker (hashed precache, cache-first shell, lazy data cache, safe update, offline).
# usage: python3 t265.py   (serves the working tree itself on a local port; real data host over the network; OLD_REF = commit with the previous SW, default 09e38b4 = 26.4)
import sys, os, re, json, time, hashlib, threading, subprocess, tempfile, shutil, http.server, functools
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); RES = []
def ok(name, cond, info=''):
    RES.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  :: ' + str(info)[:700]), flush=True)
from playwright.sync_api import sync_playwright
VER = os.environ.get('VER') or re.search(r"VERSION = '([\d.]+)'", open(REPO + '/js/app.js').read()).group(1); OLD_REF = os.environ.get('OLD_REF', '09e38b4')
ROOT = {'p': REPO}; LOG = []
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path): return http.server.SimpleHTTPRequestHandler.translate_path(self, path).replace(os.getcwd(), ROOT['p'], 1)
    def log_message(self, f, *a): LOG.append(self.path.split('?')[0])
    def end_headers(self): self.send_header('Cache-Control', 'public, max-age=600'); super().end_headers()
os.chdir(REPO); srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H); PORT = srv.server_address[1]; threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://localhost:{PORT}/'
SEED = "localStorage.setItem('lumi.settings',JSON.stringify({onboarded:true}));localStorage.setItem('lumi.notice231','1');"
CACHES = "(async()=>{const o={};for(const k of await caches.keys()){const c=await caches.open(k);o[k]=(await c.keys()).map(r=>r.url.replace(location.origin+'/',''))}return o})()"
def newctx(b, **kw):
    c = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='allow', **kw); c.add_init_script(SEED); return c
def sw_ready(pg, t=90):
    pg.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller", timeout=t * 1000)
# ---------- 1. manifest ----------
chk = subprocess.run([sys.executable, REPO + '/tools/build_shell.py', '--check'], capture_output=True, text=True)
ok('[manifest] tools/build_shell.py --check: SHELL_H in sw.js matches the files (run build_shell.py after editing any shell file)', chk.returncode == 0, chk.stdout + chk.stderr)
SW = open(REPO + '/sw.js').read(); SH = json.loads(re.search(r'const SHELL_H = (\{.*?\});', SW, re.S).group(1))
ok('[manifest] sw.js cache name matches VERSION; ' + str(len(SH)) + ' shell files, each hashed', f"'lumi-v{VER}'" in SW and len(SH) >= 90 and all(re.fullmatch(r'[0-9a-f]{12}', v) for v in SH.values()), len(SH))
ok('[manifest] the shell has no catalog data (no index-*.json, no data/ in the precache list)', not [f for f in SH if f.startswith('data/') or 'index-' in f], [f for f in SH if 'index-' in f][:3])
ok('[manifest] startup files all in the shell: index.html, sworker.js, search27.js, home27.js, app.js, fonts, manifest', all(f in SH for f in ['index.html', 'js/sworker.js', 'js/search27.js', 'js/home27.js', 'js/app.js', 'manifest.webmanifest', 'fonts/inter-var-latin.woff2']), [f for f in ['js/sworker.js', 'js/search27.js'] if f not in SH])
ok('[manifest] shell raw size under 2.2 MB', sum(os.path.getsize(REPO + '/' + f) for f in SH) < 2.2e6, sum(os.path.getsize(REPO + '/' + f) for f in SH))
import gzip
BG = json.load(open(REPO + '/tests27/perf_budget.json')).get(VER) or {}
gz = sum(len(gzip.compress(open(REPO + '/' + f, 'rb').read(), 6)) for f in SH) / 1024
ok(f"[budget] the whole shell the worker installs is <= {BG.get('shell_gz_kb', 900)} KB gzipped ({gz:.0f} KB); the old worker pre-downloaded ~17 MB of catalog files", gz <= BG.get('shell_gz_kb', 900), gz)
with sync_playwright() as p:
    b = p.chromium.launch(); t0 = time.time()
    # ---------- 2. first visit: install ----------
    c = newctx(b); errs = []; pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); LOG.clear()
    pg.goto(BASE + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000); sw_ready(pg)
    ok('[install] version ' + VER, pg.evaluate('VERSION') == VER, pg.evaluate('VERSION'))
    cs = pg.evaluate(CACHES); shell = cs.get('lumi-v' + VER, [])
    ok('[install] shell cache holds every manifest file under a hashed key (file?h=hash)', len(shell) == len(SH) and all(re.search(r'\?h=[0-9a-f]{12}$', u) for u in shell), (len(shell), len(SH)))
    dkeys = [k for k in cs if k.startswith('lumi-d-')]; dents = [u for k in dkeys for u in cs[k]]
    ok('[install] data is NOT precached: the data cache holds only the small Home files (no catalog tiers)', all(re.search(r'(pick15|meta|home27/home)\.json$', u) for u in dents) and len(dents) <= 4, dents)
    n_install = len(LOG); ok('[install] first visit: the local server saw each shell file about once (page load + install reuse the HTTP cache): <= 135 requests', n_install <= 135, n_install)
    # every cached entry really is the file its key names
    bad = pg.evaluate("""async (V)=>{const c=await caches.open('lumi-v'+V),bad=[];for(const r of await c.keys()){const m=r.url.match(/\\?h=([0-9a-f]{12})$/);const x=await c.match(r);const b=await x.arrayBuffer();const h=[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,12);if(h!==m[1])bad.push(r.url)}return bad}""", VER)
    ok('[install] every cached shell entry matches its content hash', not bad, bad[:3])
    # ---------- 3. warm start: nothing from the network ----------
    LOG.clear(); pg.reload(); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_timeout(1500)
    ok('[warm] reload serves the whole shell from the cache: <= 3 requests reach the server (the sw.js update check)', len(LOG) <= 3, LOG[:8])
    ok('[warm] Home draws picks from the cached data', pg.evaluate("document.querySelectorAll('#picks .du14').length") >= 1 and not errs, errs)
    # ---------- 4. data gets cached on first use; works offline ----------
    pg.goto(BASE + '#/search/yogurt'); pg.wait_for_selector('#res a.row', timeout=90000); pg.wait_for_function("SW27.loaded.size>=3", timeout=120000); pg.wait_for_timeout(1500)
    cs = pg.evaluate(CACHES); dents = [u for k in cs if k.startswith('lumi-d-') for u in cs[k]]
    ok('[data] after a search the tiers are in the data cache (index-0, index-g, index-1)', all(any(t in u for u in dents) for t in ('index-0.json', 'index-g.json', 'index-1.json')), [u[-30:] for u in dents])
    c.set_offline(True); pg.goto(BASE + '#/'); pg.reload(); pg.wait_for_selector('#picks .du14', timeout=60000)
    ok('[offline] reload with no network: the app opens and Home shows picks', pg.evaluate("document.querySelectorAll('#picks .du14').length") >= 1 and not errs, errs)
    pg.goto(BASE + '#/search/yogurt'); pg.reload(); pg.wait_for_selector('#res a.row', timeout=90000)
    ok('[offline] a search that was done online works offline (tiers come from the data cache)', pg.evaluate("document.querySelectorAll('#res a.row').length") >= 5)
    c.set_offline(False); c.close()
    # ---------- 5. update path from the previous release ----------
    old = tempfile.mkdtemp(prefix='lumi_old_'); ar = subprocess.run(f'cd {REPO} && git archive {OLD_REF} | tar -x -C {old}', shell=True, capture_output=True, text=True)
    if ar.returncode == 0 and os.path.isfile(old + '/sw.js'):
        oldv = re.search(r"const V = '(lumi-v[\d.]+)'", open(old + '/sw.js').read()).group(1); ROOT['p'] = old
        c = newctx(b); errs = []; pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.goto(BASE + '#/'); pg.wait_for_selector('#picks .du14', timeout=90000); sw_ready(pg, 180)
        pg.wait_for_function("(async()=>(await caches.keys()).includes('%s'))()" % oldv, timeout=180000)
        ov = pg.evaluate('VERSION'); ok(f'[update] the previous release ({ov}, cache {oldv}) is installed and controlling', ov != VER and oldv != 'lumi-v' + VER, (ov, oldv))
        pg.reload(); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_function("!!navigator.serviceWorker.controller") # a returning visit: the page is controlled, as for a real user
        ROOT['p'] = REPO; LOG.clear(); pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())")
        try: pg.wait_for_function("VERSION==='%s'" % VER, timeout=120000)
        except Exception as e: pass
        pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_timeout(2500)
        ok('[update] the new release takes over by itself (page reloaded once onto the new files)', pg.evaluate('VERSION') == VER, pg.evaluate('VERSION'))
        ks = pg.evaluate("caches.keys()"); ok('[update] old shell cache removed, new one present: ' + str(sorted(ks)), ('lumi-v' + VER) in ks and oldv not in ks, ks)
        ok('[update] page and service worker run the same files (shell cache is complete, controller is the new worker)', len(pg.evaluate(CACHES).get('lumi-v' + VER, [])) == len(SH) and pg.evaluate("!!navigator.serviceWorker.controller"))
        ok('[update] no page errors across the update', not errs, errs); c.close(); shutil.rmtree(old, ignore_errors=True)
    else:
        ok('[update] (skipped: could not extract ' + OLD_REF + ')', True, ar.stderr)
    # ---------- 6. a stale/mismatched file must not install ----------
    bad_root = tempfile.mkdtemp(prefix='lumi_bad_'); shutil.copytree(REPO, bad_root, dirs_exist_ok=True, ignore=shutil.ignore_patterns('.git', 'data', '__pycache__', 'node_modules'))
    open(bad_root + '/js/v20.js', 'a').write('\n/* tampered after the manifest was built */\n'); ROOT['p'] = bad_root
    c = newctx(b); pg = c.new_page(); pg.goto(BASE + '#/'); pg.wait_for_selector('#picks .du14', timeout=60000); pg.wait_for_timeout(9000)
    st = pg.evaluate("(async()=>{const r=await navigator.serviceWorker.getRegistration();return {active:!!(r&&r.active),ctl:!!navigator.serviceWorker.controller}})()")
    ok('[safety] a shell file that does not match the manifest aborts the install: no worker takes over (the page still works from the network)', not st['active'] and not st['ctl'], st)
    c.close(); ROOT['p'] = REPO; shutil.rmtree(bad_root, ignore_errors=True)
    b.close()
n = len(RES); f = [x for x in RES if not x[1]]
print(f'\n{n - len(f)}/{n} passed in {time.time() - t0:.0f}s'); sys.exit(1 if f else 0)
