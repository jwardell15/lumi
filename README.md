# Lumi v2 — food scanner with a carb-first (T1D-weighted) score
Static PWA hosted on GitHub Pages: https://jwardell15.github.io/lumi/

- `index.html`, `css/app.css`, `js/app.js` (UI/router), `js/score.js` (scoring, shared with the build), `js/search.js` (typo-tolerant local search)
- `data/` bundled index built from the Open Food Facts bulk CSV: top 70k US products with nutrition (`index-0.json` = 15k most popular, loaded first; `index-1.json` = rest; `d/NN.json` = detail shards by last 2 barcode digits)
- `sw.js` + `manifest.webmanifest` + `icons/` for install/offline
- Search layers: local index → USDA FoodData Central (DEMO_KEY) → live Open Food Facts mirrors; merged & de-duplicated by barcode.
- Links: `#/product/<barcode>` or `#/product/fdc-<USDA fdcId>`

Rebuild data: run `tools/extract.py` (in the folder with `products.csv.gz`) then `node tools/build.js us.jsonl`.
Local dev: `python3 serve.py 8765`.
