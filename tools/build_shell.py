#!/usr/bin/env python3
"""Lumi 26.5: write the shell manifest (content hash per app-shell file) into sw.js between /*SHELL-BEGIN*/ and /*SHELL-END*/.
The list = every local script/stylesheet/preload/icon/manifest referenced by index.html + EXTRA (files fetched by code, not by index.html).
Run after any change to a shell file (the release flow: edit -> python3 tools/build_shell.py -> commit). tests27 checks the manifest is current.
usage: python3 tools/build_shell.py [--check]"""
import re, os, sys, hashlib, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EXTRA = ['js/sworker.js', 'js/dbase.js', 'js/cats.js', 'js/aisles.js', 'js/search.js', 'js/hb25core.js', 'ref/gi2008.json', 'ref/additives.json', 'manifest.webmanifest',
         'icons/mascot-128.png', 'icons/mascot-256.png', 'icons/favicon-32.png', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'fonts/inter-var-latin.woff2', 'fonts/fraunces-var-latin.woff2']
def files():
    h = open(ROOT + '/index.html', encoding='utf-8').read(); out = ['index.html']
    for m in re.finditer(r'(?:src|href)="([^"#?]+)"', h):
        u = m.group(1)
        if re.match(r'(https?:|//|data:|mailto:)', u): continue
        if re.search(r'\.(js|css|woff2|png|webmanifest|ico|json)$', u) and u not in out: out.append(u)
    for u in EXTRA:
        if u not in out: out.append(u)
    return out
def build():
    d = {}
    for f in files():
        p = ROOT + '/' + f
        if not os.path.isfile(p): print('MISSING', f); sys.exit(1)
        d[f] = hashlib.sha256(open(p, 'rb').read()).hexdigest()[:12]
    return d
if __name__ == '__main__':
    d = build(); s = open(ROOT + '/sw.js', encoding='utf-8').read()
    block = '/*SHELL-BEGIN*/\nconst SHELL_H = ' + json.dumps(d, indent=0, separators=(',', ':')).replace('\n', '') + ';\n/*SHELL-END*/'
    new = re.sub(r'/\*SHELL-BEGIN\*/.*?/\*SHELL-END\*/', lambda m: block, s, flags=re.S)
    if '--check' in sys.argv: print('current' if new == s else 'STALE'); sys.exit(0 if new == s else 1)
    open(ROOT + '/sw.js', 'w', encoding='utf-8').write(new); print(len(d), 'shell files,', sum(os.path.getsize(ROOT + '/' + f) for f in d), 'bytes raw')
