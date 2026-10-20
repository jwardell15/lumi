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

## v8.0
- **Blood sugar impact card.** When the product name matches a food in Atkinson, Foster-Powell & Brand-Miller, *International tables of glycemic index and glycemic load values: 2008*, Diabetes Care 31(12):2281–3, doi:10.2337/dc08-1239, Table 1 (`ref/gi2008.json`), it uses that GI and the estimated glycemic load per serving. Otherwise it shows a labeled heuristic based on net carbs, sugar share, fiber, fat and protein. Informational only; no dosing.
- **Label photo scanning** (`#/label`). OCR runs on-device with Tesseract.js 5 from jsDelivr; the photo isn't uploaded. Values go into editable fields, then the food is saved as a local custom product marked "user-entered". The barcode-not-found page links here.
- **Log.** Day / Week (carbs by meal) / Report tabs. The report (`#/report/7|14|30`) is printable with averages, per-meal averages, daily totals and top carb sources, and has CSV export. It contains no doses.
- **Share cards** (canvas PNG via the Web Share API with files, or download plus a copied link) for products, swaps (Compare) and lists. Static Open Graph image at `icons/og.png`.
- **Search.**
  - Category matching: "cereal" also matches category-tagged products like Cheerios.
  - At most 3 results per brand in the top 30.
- **Ingredient watchlist** (`#/alerts`): hidden sugars, maltodextrin, seed oils, artificial sweeteners, plus custom words. Matches are highlighted on product pages and flagged in results when ingredients are known.
- **Offline.** Viewed, saved, logged and list products are kept locally, and lookups fall back to those copies when the network fails. The service worker caches the app shell and the OCR engine.

## v7.5 (Yuka-style rows)
- Hazardous-substances row:
  - No additives → Positives shows "No additives / No hazardous substances ✓".
  - With additives → Negatives shows "N hazardous, up to <worst risk>" with a dot for the worst level. Expanding it lists each additive (E-number, name, hazard-free/limited/moderate/high), linking to its additive page and sources.
  - No ingredient list → "Couldn't verify additives". Never "safe".
- Fiber and Protein rows: green at 3 g+ fiber and 8 g+ protein. In-between amounts show a grey "Some …" row; low fiber shows grey "Low fiber". Neither changes the score.
- Sodium uses "Low/Moderate/High/Very high impact".
- Every row expands with a chevron to a colored scale bar with the product's position marked. A per 100 g / per serving toggle is remembered.
- Home: shortcut pills wrap on mobile, and Top picks have at most 2 dairy items.

## v7.4 (calm home)
- Home now has: greeting, one line, a big search bar with a Scan button (and a small "type a barcode" link), a compact log summary only on days with entries, 5 shortcuts, a slim recent-searches row, and 6 Top picks.
  - Top picks are everyday foods: score 82+, 2–25 g net carbs. No sauces/condiments, alcohol, supplements, staples or sugary drinks. One per food type and one per brand, known brands first.
- Restaurant picks are a collapsed section with at most 4 items and no alcohol.
- New Browse page (#/browse, also in the nav): stores, aisles, categories and tools (Meal builder, Compare, Lists, Overview, Additives, Cosmetics).
- What's new is now a small pill you can dismiss, shown once per version. The Compare bar only appears with 2+ items and adds bottom padding so it doesn't cover content.

## v7.3 (diabetes-aware relevance)
- The query can match anywhere in the name, with a small penalty for later words ("Greek Yogurt" ranks for "yogurt").
- For popular or known-brand results, Carb score counts 0.13×(score−50); for obscure items only 0.03×, so obscure items can't win on score alone.
- Fuzzy brand merge in results: a rare brand within 1 edit (2 for names of 10+ letters) of a brand at least 4× more common in the same aisle is merged. It needs the same first letter and the same digits, and two different known brands are never merged.
- Whole-food cards show a short source (USDA/CNF) instead of a truncated label. More off-topic patterns: plant milks, cheese, yogurt brands and shakes for "milk"; pasta sauce for "cheese"; carrot/pickle chips for "chips"; crispbread for "bread".

## v7.2 (search relevance)
- Relevance now leans on popularity and known US consumer brands, and less on score. Brandless items, known non-US brands, French/Spanish labels and non-US barcodes rank lower. The same rules apply to live Open Food Facts and USDA results.
- Off-topic penalties by query word: soda → crackers/sherbet; chips → Chips Ahoy/fish/cereal; bread → flour/crumbs/pickle chips; milk/cheese/yogurt → similar. Restaurant rows rank below packaged items on generic queries.
- Brand cleanup: misspellings (Bellwether), apostrophe casing (Nancy's, Siggi's), all-lowercase brands, generic words used as brands (e.g. "skyr"), Danone mapped to Oikos/Activia/Dannon, and USDA source labels ("USDA SR Legacy").

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


## v8.1
- Cereal search: a category "mainstream" signal (how many index entries in the category share a product's lead word) lifts Cheerios, Frosted Flakes, Special K, Raisin Bran etc. into the top results; diabetes-aware weighting and the 3-per-brand cap are unchanged.
- GI matching checks preparation: `ref/gi2008.json` entries carry `cooked`/`raw`/`any`; cooked values are not applied to raw/dry/uncooked/flour foods, raw-fruit values not to cooked/canned/dried. No match → labeled heuristic.
- Solids mislabeled as liquid in source data (e.g. raw banana) are served in grams.
- Build-time ingredient flags (doc field 15, presets in `js/watch8.js`) so preset alerts show ⚠ in search results.
- Week table: Net column visible on phones, sideways scroll with sticky day column, averages for Net and Cal.
- OFF search stops starting extra mirrors once one answers (fewer console errors).


## v9.0
- **Carb target per meal** (`settings.mealT`, total or net basis): bars on the log (green within / amber near / red over, always with numbers), tinted week table, "fits your meal" card on product pages, plate total vs target in the meal builder. Purely informational; the dose estimate stays off by default, estimate only.
- **Better choice** card near the top of every product page (best same-category swap, lower impact); swaps also skip bad or suspicious data.
- **Saved meals**: save from the meal builder, one-tap logging from Home with undo, `#/meals` page to log, rename and delete.
- **Onboarding**: added per-meal targets and a quick tour step.
- **Performance**: Home loads only tier 0 + generics (about 1.4 MB gz instead of about 3.4 MB); larger tiers load on search.
- **Accessibility**: skip link, focus-visible outlines, focus moves to the page heading on navigation, aria-live results, reduced-motion support, labeled controls.
- **Fixes**: restaurant rows hidden from the All view unless they're relevant; Open Food Facts searched one mirror at a time with a 10-minute quiet back-off; 0 g net carbs with ≥3 g sugar is flagged "check label" and kept out of picks and swaps; more non-English words filtered; data-driven big-brand signal alongside the hand list; top picks skip hidden-sugar items.


## v11.0
- **Glucose after meals** (`js/v11.js`): import a Dexcom Clarity CSV export; each logged meal can chart the user's own readings from 15 min before to 3 h after (peak, 2 h, 3 h). Low/High values are skipped, never estimated. Optional direct Dexcom API via a user-deployed backend (`tools/dexcom-worker.js`): Dexcom's OAuth needs `client_secret` server-side and `api.dexcom.com` returns no CORS headers (checked: preflight from github.io gets 403), and US data is delayed 1 h (3 h outside US). Sandbox data is labeled "sandbox (simulated data)".
- **Apple Health** via iOS Shortcuts: `shortcuts://run-shortcut?name=Lumi%20to%20Health&input=text&text={json}` with carbs, protein, fat, kcal, name, date. Build guide at `#/applehealth`.
- **Family sharing** without a backend: lists and saved meals packed as deflate-raw + base64url in `#/share/<code>`; opening imports a copy (no sync).
- **Scan history** (`#/history`): scans and typed barcodes with time, note and price, stored locally.
- New layouts: Log timeline + desktop two-column, Settings hub, Lists/Compare/Meal/Meals icon empties and layouts, aisle line icons.
- Chains from official guides: Pizza Ranch (2023-08-17 guide, 812 items), Godfather's Pizza (2026, 412), BIGGBY Coffee (Feb 2026, 753), Scooter's Coffee (729). Skipped: Raising Cane's (403), In-N-Out (PDF behind a JS page), Whataburger (only a 2021 PDF; existing 2018 MenuStat data kept), Smoothie King (502), Caribou (2019 guide only).
- Store brands: Aldi + Fusia, Goldhen, Burman's, Dakota's Pride, Lunch Mate, PurAqua, Benner; Walmart + Prima Della, Spring Valley, Equate.

## v10.0 (redesign)
- New design system in `css/v10.css` (tokens: iOS type scale on the system SF stack, 4-pt spacing, radius, elevation, light/dark palettes with brand orange as accent, motion that honors prefers-reduced-motion) and `js/v10.js` (line icons, minimal emoji, iOS tab bar, desktop sidebar, Yuka-style product layout with large score circle and sticky Log/Save/List/Share bar, scan-first home).
- Presentation only: data, scoring, dose-estimate (off by default, "estimate only, confirm on your pump"), allergen wording ("couldn't verify") and citations unchanged. axe WCAG 2 AA clean on main screens in light and dark.

## v9.1.1
- Chain-name search built from the restaurant data (apostrophe-safe); `#/browse/rest` waits for chain data so every chain is listed.

## v9.1 (data)
- **Products 627,453 → 633,116.** Open Food Facts bulk CSV refreshed (dump of 2026-10-20); USDA FoodData Central Branded is already the latest release (2026-04-30, checked on fdc.nal.usda.gov). Newly allowed: US-only 8-digit UPC-E barcodes (check digit verified; deduped against their UPC-A expansion) and US names with common English loanwords (Creme, Biscuits, Carne, Nature…). Same data-quality checks and GTIN dedupe.
- **Restaurants 98 → 107 chains, 24,666 → 27,873 items.** New, from each chain's own published nutrition PDF (robots.txt checked, one polite fetch, cached): Buffalo Wild Wings (Aug–Nov 2026 guide), The Cheesecake Factory (Summer 2026), Waffle House (Aug 2026), Portillo's (Sep 2026), Dutch Bros, Taco John's (Sep 2026), Cheddar's Scratch Kitchen (Aug 2026), Pollo Tropical (Aug 2024), Cinnabon (Oct 2025). Values are per item as published; each item links its source PDF. Skipped: Texas Roadhouse (no official per-item table, only calories), Freddy's, Fazoli's, Habit Burger (JS-only pages), Schlotzsky's (official PDF 404), Hungry Howie's (2021 guide only).
- **Store brands 71,620 → 73,867** products recognized (added Dealworthy, Bakery Fresh Goodness, Big K, Check This Out, Higher Harvest, Midwest Country Fare, Signature Reserve, Value Corner, Purely Meijer).
- Scripts: `tools/v91/`.
