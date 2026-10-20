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
- v5.1: every item also gets a Yuka-style Health rating (js/health.js: Nutri-Score 2023 ~60%, additive risk tiers ~30%, organic ~10%; nutrition-only when ingredients are unknown). Precomputed in tools/build.js; organic/fruit-veg share come from `offdata/side.py`.
- v6: additive & cosmetic-ingredient pages with cited sources (`js/encyc.js`; every link checked), allergen/diet alerts (`js/diet.js`, OFF allergen/traces/analysis tags via `tools/side2.py` plus ingredient text), cosmetics from the Open Beauty Facts bulk export (`tools/extract_obf.py`, then `node tools/build_cos.js`; run it after `tools/build.js`, which clears `data/`), better options after a scan, and a local Overview.

## v7.1 (audit release)
- Search: US packaged products first. Foreign and non-English labels, generic USDA rows on packaged-type queries, and unrequested alcohol are ranked lower. Restaurant rows rank higher only when you search a chain.
- Store picks: juice and sports/sugary drinks are left out of picks. More pantry staples (cones, sauces, chopped nuts, beans) moved to Staples & ingredients. Aisle pages use a blended ranking instead of tied 100s.
- Data checks: 0 g carbs on juice, fruit, chocolate milk or sauces is flagged (1,394 items). Per-serving entry errors on dry foods are flagged (3,396). Small servings that say "0 g" get a label-rounding penalty.
- Aisles: produce no longer appears in Baby, Bakery or Deli. Supplements are split into Protein, Greens, Vitamins and Sport. Vinegar, ground meat and tuna steaks are fixed.
- Cosmetics data restored (it had been missing since 6.3). Mobile product header no longer overflows. Scan falls back to typing the barcode when there is no camera.

## v7.0
- Data check: every product is cross-checked with 4/4/9 Atwater factors (`LumiScore.implausible`). If calories are far above or below what carbs, protein and fat explain (with allowances for fiber, polyols, low-calorie sweeteners, alcohol and vinegar), or every nutrient is 0 for a food that must have carbs, the item is marked "data looks wrong", gets no Carb score or Health rating, and is left out of rankings. Curated USDA SR/Foundation and official restaurant data are not checked (rounding noise). Index flag: `d[10] & 8`.
- Packaged picks are ready-to-eat only: pantry staples and cooking ingredients (canned tomatoes/pumpkin/beans, soup and broth, coffee and tea, cones, flour, sugar, oats, rice, pasta, spices, oils, eggs, tofu…) are under "Staples & ingredients" (`isStaple` in `js/v63.js`).
- Near-duplicate grouping: spelling/language variants (yogourt/yoghurt/grec/biologique…) and subset names with looser nutrition match (same brand), so e.g. Kirkland hemp hearts show as one row.
- Aisles: chocolate, nut/seed butters (protein > 8 g/100 g), cookies, candy eggs and prepared meals moved out of Dairy; fresh "super greens" salads (under 10 g carbs and 80 kcal) moved to Produce; Supplements split into Protein & collagen, Greens & superfood powders, Creatine/pre-workout/hydration, Vitamins/gummies/capsules and Other (`post7` in `js/aisles.js`; classification needs a rebuild).
- Shopping lists (`#/lists`), "Add to list" and "Copy link" on product pages, data-check card, ready-to-eat / has-photo / hide-bad-data search filters, two-column product layout on desktop, what's-new card, "/" to focus search (`js/v7.js`).
- Rebuild: `node --max-old-space-size=7000 tools/build.js /workspace/m63/us.jsonl /workspace/generic62.jsonl /workspace/m63/extra.jsonl` (about 2.5 min).
