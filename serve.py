#!/usr/bin/env python3
"""Static server + optional search proxy (fallback when Open Food Facts search lacks CORS). Usage: python3 serve.py [port]"""
import http.server, sys, urllib.request, urllib.parse, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path.endswith('/api/search'):
            q = urllib.parse.parse_qs(u.query)
            url = 'https://search.openfoodfacts.org/search?' + urllib.parse.urlencode({'q': q.get('q', [''])[0][:200], 'page_size': 24, 'fields': q.get('fields', ['code'])[0][:1000]})
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Lumi/1.0'}), timeout=15) as r: body, code = r.read(), 200
            except Exception as e: body, code = b'{"error":"upstream"}', 502
            self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers(); self.wfile.write(body); return
        return super().do_GET()
http.server.ThreadingHTTPServer(('0.0.0.0', int(sys.argv[1]) if len(sys.argv) > 1 else 8765), H).serve_forever()
