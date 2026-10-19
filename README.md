# Lumi — food scanner (T1D-weighted scoring)
Static SPA: index.html, style.css, app.js. Data: Open Food Facts (client-side).
Run locally: `python3 serve.py 8765` (static + optional /api/search proxy fallback).
Any static host works (GitHub Pages, Netlify, Cloudflare Pages); product barcode lookup works everywhere.
Text search uses OFF's cgi search (CORS-enabled when healthy) then search.openfoodfacts.org; the same-origin
proxy in serve.py is only available when served by serve.py.
Routes: #/, #/search/<q>, #/product/<barcode>, #/favorites, #/about.
