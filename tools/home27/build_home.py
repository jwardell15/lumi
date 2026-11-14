#!/usr/bin/env python3
"""Lumi 26.3: build data/home27/home.json, the small prebuilt pool the Home screen draws from (so Home never has to build the search index).
Method (record and replay with backups): load the real catalog tiers (g, 0, 1 + ingredient sidecars) in headless Chromium from the local repo data,
run every Home picker (homePicks, healthPicks14, homeCols141, topPicks, bestAtRestaurants, restPicks74) over 4 rounds and 7 daily-rotation days,
removing each round's picks from the pool so the next round yields the "next best". The union of all picks is the pool. Real data only: every doc is
copied unchanged from the catalog (keys stored by name so they do not depend on registration order).
usage: python3 tools/home27/build_home.py [--verify]   (serves the repo itself on a free port)"""
import sys, os, re, json, subprocess, time, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = REPO + '/data/home27/home.json'
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=REPO)
H.log_message = lambda *a, **k: None
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=REPO)); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start(); PORT = srv.server_address[1]
def route(c):
    def h_(rt):
        u = rt.request.url; pth = REPO + '/' + u.split('pages.dev/', 1)[1].split('?')[0]
        if os.path.isfile(pth): rt.fulfill(path=pth, headers={'access-control-allow-origin': '*', 'content-type': 'application/json' if pth.endswith('.json') else 'image/webp'})
        else: rt.fulfill(status=404, body='nf')
    c.route(re.compile(r'https://lumi-data-cky\.pages\.dev/(data|img)/.*'), h_)
BUILD = r"""
async () => {
  await loadIndex(); await loadIndexFull(); try { for (let i = 0; i < 4 && await ensure22(); i++); } catch (e) {}
  try { await homeLite(); } catch (e) {} HOME27.docs = null; HOME27.codes = null; /* build from the real engine, never from a previous home.json */
  const real = engine.docs, realCodes = engine._codes, DAY0 = Date.UTC(2026, 10, 1), realNow = Date.now;
  const F = { picks: () => homePicks(), health: () => healthPicks14(), cols: () => homeCols141().flat(), top: () => topPicks(), rest: () => bestAtRestaurants(), rest4: () => restPicks74() };
  const pool = new Map(); let removed = new Set(); const ROUNDS = 4, DAYS = 7;
  try {
    for (let r = 0; r < ROUNDS; r++) {
      const avail = removed.size ? real.filter(d => !removed.has(d)) : real; engine.docs = avail; engine._codes = null;
      const got = new Set();
      for (let day = 0; day < DAYS; day++) { Date.now = () => DAY0 + day * 864e5 + 3e7;
        for (const [name, f] of Object.entries(F)) { let out = []; try { out = f() || []; } catch (e) { console.warn(name, e); } for (const d of out) { got.add(d); pool.set(d.code, d); } } }
      got.forEach(d => removed.add(d)); if (!got.size) break;
    }
    /* the column pickers keep the 4 best docs of each kind and rotate through them by day, so every kind's top 8 (both sort keys) must be present, not only the docs that happened to be picked */
    const P2 = homePool141(); const kinds = new Map();
    for (const key of ['score', 'h']) { const other = key === 'score' ? 'h' : 'score', by = new Map();
      P2.slice().sort((a, b) => (b[key] + b[other] * 0.35) - (a[key] + a[other] * 0.35) || a.rank - b.rank).forEach(d => { const k = kind74(d); if (!by.has(k)) by.set(k, []); const L = by.get(k); if (L.length < 8) { L.push(d); pool.set(d.code, d); } }); }
    /* restaurants: bestAtRestaurants keeps a Map in catalog order (ties sort by it), so also keep the first qualifying doc of every chain */
    const seenChain = new Set();
    for (const d of real) { if (d.src !== 'rest' || d.score == null || d.net == null || d.net < 8 || NOTMEAL.test(d.name)) continue; const k = d.keys.find(x => C.KEYS[x] && C.KEYS[x].startsWith('rest-') && C.KEYS[x] !== 'rest-other'); if (k == null || seenChain.has(k)) continue; seenChain.add(k); pool.set(d.code, d); }
  } finally { engine.docs = real; engine._codes = realCodes; Date.now = realNow; }
  const KEYS = C.KEYS; const chains = new Map();
  const ix = new Map(real.map((d, i) => [d, i])); /* keep the catalog's own order: tie-breaks in the pickers depend on it */
  const docs = [...pool.values()].sort((a, b) => ix.get(a) - ix.get(b)).map(d => { const o = {}; for (const k of Object.keys(d)) if (k !== 'nn') o[k] = d[k]; o.keys = (d.keys || []).map(i => KEYS[i]); for (const k of o.keys) if (/^rest-/.test(k)) chains.set(k, null); return o; });
  return { docs, chainKeys: [...chains.keys()], total: real.length, counts: Object.fromEntries(Object.entries(F).map(([k]) => [k, 0])) };
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); route(c)
    c.add_init_script("localStorage.setItem('lumi.settings',JSON.stringify({onboarded:true}));localStorage.setItem('lumi.notice231','1');")
    pg = c.new_page(); pg.on('console', lambda m: m.type == 'warning' and print('console', m.text[:200]))
    pg.goto(f'http://127.0.0.1:{PORT}/#/'); pg.wait_for_function("()=>typeof ensure22==='function'&&typeof homeCols141==='function'", timeout=60000)
    t0 = time.time(); res = pg.evaluate(BUILD); print('built in %.0fs: %d docs from %d catalog docs' % (time.time() - t0, len(res['docs']), res['total']))
    # chain labels (C.register(key, label, 'rest') data lives in index-g.json -> chains)
    g = json.load(open(REPO + '/data/index-g.json')); lab = {k: l for k, l in g.get('chains', [])}
    chains = [[k, lab[k]] for k in res['chainKeys'] if k in lab]
    missing = [k for k in res['chainKeys'] if k not in lab]
    if missing: print('WARN chain keys without label:', missing[:5])
    docs = [{k: v for k, v in d.items() if v is not False} for d in res['docs']]  # false booleans (zc, bad, fl, hn) are the default, so omit them
    j = {'v': 1, 'built': time.strftime('%Y-%m-%d'), 'note': 'Lumi 26.3 Home pool: real catalog docs (tiers g,0,1 + ingredient sidecars) copied unchanged by tools/home27/build_home.py', 'catalogDocs': res['total'], 'chains': chains, 'docs': docs}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w').write(json.dumps(j, separators=(',', ':'), ensure_ascii=False))
    sz = os.path.getsize(OUT); gz = len(subprocess.run(['gzip', '-9c', OUT], capture_output=True).stdout)
    print('wrote', OUT, sz, 'bytes raw,', gz, 'gz;', len(docs), 'docs,', len(chains), 'chains')
    b.close()
