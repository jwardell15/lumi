# Lumi v2 — food scanner with a carb-first (T1D-weighted) score
Static PWA hosted on GitHub Pages: https://jwardell15.github.io/lumi/

- `index.html`, `css/app.css`, `js/app.js` (UI/router), `js/score.js` (scoring, shared with the build), `js/search.js` (typo-tolerant local search)
- `data/` bundled index built from the Open Food Facts bulk CSV: top 70k US products with nutrition (`index-0.json` = 15k most popular, loaded first; `index-1.json` = rest; `d/NN.json` = detail shards by last 2 barcode digits)
- `sw.js` + `manifest.webmanifest` + `icons/` for install/offline
- Search layers: local index → USDA FoodData Central (DEMO_KEY) → live Open Food Facts mirrors; merged & de-duplicated by barcode.
- Links: `#/product/<barcode>` or `#/product/fdc-<USDA fdcId>`

Rebuild data: run `tools/extract.py` (in the folder with `products.csv.gz`) then `node tools/build.js us.jsonl`.
Local dev: `python3 serve.py 8765`.

## v4.0.0
- Whole foods (USDA Foundation, SR Legacy, FNDDS) and restaurants (official data from Chick-fil-A, Subway, Arby's, Dunkin', Five Guys via `tools/chains.py`; USDA SR for other chains). Build: `python3 tools/build_generic.py && node tools/build.js <off.jsonl> <generic.jsonl>`.
- Portion helper, optional carb ratio estimate (off by default), food log with targets, a 7-day chart, custom foods, saved meals and CSV/JSON export. All of it is stored on this device.
- Swaps from the same subcategory with reasons, and a "For you" section.

## v4.1.0
- Home picks fixed. They had been computed from the first 6,000 index docs, which in v4.0 were all photo-less generic USDA/restaurant docs, so every pick was filtered out. Picks now always render: a skeleton while loading, then a fallback set, then 10–12 varied picks including whole foods and restaurants. Added "Best at restaurants".
- 449k products: Open Food Facts (165k) plus USDA Branded Foods (284k, `tools/extract_branded.py`), lazy-loaded in tiers 3–4 only when searching. Detail shards are keyed by the last 3 barcode digits.
- 15 chains with official data (`tools/chains.py`) plus 13 from USDA. Whole-food subcategories cover chips and swaps.
