# Lumi 26.3+ speed releases (m27)

## 26.3 "Fast launch"
- `js/home27.js` (loaded before `app.js`): Home draws from `data/home27/home.json` (prebuilt pool, ~55 KB gz) instead of building the search engine.
  `homeLite()` loads the pool; the six pickers (`homePicks`, `healthPicks14`, `homeCols141`, `restPicks74`, `topPicks`, `bestAtRestaurants`) run over it by temporarily
  pointing `engine.docs`/`engine._codes` at the pool (they read those synchronously); `engine.byCode` also resolves pool docs (compare buttons, per-serving fixes).
  If `home.json` can't load, Home falls back to the old path (full index). The full engine now starts only when something calls `loadIndex()` (typing in search, search, product page, builders).
- `tools/home27/build_home.py` builds `data/home27/home.json` from the real catalog (tiers g, 0, 1 + ingredient sidecars): record-and-replay of every Home picker over 4 rounds x 7 daily rotations
  (picks removed each round so "next best" backups are kept), plus each kind's top 8 (column pickers rotate through the top 4) and the first qualifying doc of every chain (tie order).
  Docs are copied unchanged; category keys are stored by name. Rebuild after any catalog rebuild: `python3 tools/home27/build_home.py && tools/sync_data.sh --verify`.
- `js/v14.js`: `homeCols141` split into `homePool141` (candidates) + picker so the builder can see candidates.
- Tests: `tests27/t263.py` (data checks, no catalog fetch on Home, lazy engine, fallback, 14-day equivalence vs the full engine, perf budget from `tests27/perf_budget.json`).

## 26.4 "Search off the main thread"
- `js/sworker.js`: the search engine (parse + index of the catalog tiers) runs in a Web Worker. `js/search27.js` is the page-side client (`SW27`): hydrates the worker's docs (category keys travel by NAME, mapped to the page's `C.KEYS`),
  ops: search / dym / doc / pool / recalls / load. Tier load order stays 0, g, 1, so ranks are identical to the old single engine. The f22/aw26 ingredient sidecars are attached in the worker with the same rules as v22/v26.
- Search defaults to the first two tiers (about 167k products); "Search all" (`#allBtn`) loads tiers 2+ in the worker. Product page: "Better choice" (`better24`) runs over a candidate pool from the worker; recalls (`v251`) are matched in the worker.
- Fallback: no Worker, `?noworker`, or a worker error -> the old main-thread engine, now time-sliced (`search.js` `_begin/_slice/_end`, `addAsync`) so it can't freeze the page.
- `js/perf27.js`: tiny `perf27` marks (picks, search ready, product ready) used by the perf-budget tests.
- Tests: `tests27/t264.py` (worker parity vs the full main-thread index for search rows, Better choice and sidecar fields; page heap; fallback; budgets).

## 26.5 "Shell-only service worker"
- `sw.js` precaches only the app shell (HTML, CSS, JS, fonts, icons, two small ref files; ~1.8 MB raw, ~0.5 MB gz) under hashed keys `file?h=<sha256[:12]>` in cache `lumi-v26.5`.
  Hash manifest (`SHELL_H`) is written by `python3 tools/build_shell.py` (run it after changing ANY shell file; `--check` fails when stale; t265 runs the check).
  Install fetches via the HTTP cache first (the page just loaded those files: no second download), then forces the network if the hash differs; a mismatch aborts the install (old SW keeps serving). Entries unchanged since the previous version are copied, not downloaded.
- Shell is cache-first (no network on warm start). Data (`lumi-data-cky.pages.dev`) is NOT precached: cached on first use, served stale-while-revalidate (revalidated in the background when older than 24 h by its `Date`); `DATA_EPOCH` bumps drop the data cache. Small launch files (home.json, meta) are pre-warmed at install.
- Update path: `skipWaiting` + `clients.claim`; the page reloads once on `controllerchange` (guarded) so a user never runs new HTML against old JS.

## 26.6 "Bundle + minify"
- Source stays editable: `index.src.html` + `css/*.css` + `js/*.js`. `tools/build/build.mjs` (esbuild, pinned in `tools/build/package-lock.json`) minifies each file and emits
  `dist/app.<hash>.js`, `dist/app.<hash>.css` and `dist/manifest.json`, and writes `index.html` (a generated file: do not edit; edit `index.src.html`).
- The JS bundle keeps each source file as its own string injected as a separate classic script by a tiny IIFE loader, so per-file `'use strict'`, hoisting and error isolation are exactly as before
  (t266 compares the global names with the unbundled page). No file is concatenated, so one broken file cannot take the others down.
- Release flow: `cd tools/build && npm ci` once, then `tools/release.sh` (build + `tools/build_shell.py`) right before every commit that touches css/, js/ or index.src.html.
  `python3 tools/build_shell.py --check` fails when the service worker manifest is stale (t265 runs it).
- Tests that used to read `index.html` for script/css names read `dist/manifest.json` (helpers `scr`/`swt` in the older suites).
- Budget (`tests27/perf_budget.json`): bundle JS <= 420 KB gz, CSS <= 45 KB gz, <= 4 JS/CSS requests. Measured 476 -> 379 KB gz JS, 59 -> 38 KB gz CSS, 81 -> 2 requests.

## 26.6.1 "Self-hosted scanner library"
- `vendor/html5-qrcode-2.3.8.min.js` (unmodified, Apache-2.0, sha256 in `vendor/README.md`) replaces the `unpkg.com` script: `loadScanLib` loads `vendor/html5-qrcode-2.3.8.min.js`, which is in the service worker's shell precache (`EXTRA` in `tools/build_shell.py`), so the scanner works offline and can never fail on a CDN/tunnel error.
  The unpkg row is gone from the privacy data-sources list (nothing is fetched from it). Tesseract (jsDelivr) is unchanged.
- Test: `tests27/t2661.py` (file hash, manifest, no unpkg in code, scanner opens with unpkg blocked / with the SW / offline, privacy list).

## 26.7 "Simple UI"
- `js/ui27.js` (last script; also does the first `route()`) installs the new screens on top of the old route chain: it answers `#/` (new Home), `#/places`, `#/more` and hands every other route to the previous handler, so all old `#/` routes work unchanged.
  `#/classic` is the old Home, `#/browse` the old Browse hub. `tab19` is re-mapped: Home, Search (search + product pages), Places (browse, stores, aisles, restaurants), everything else lights More.
- Bottom bar (`index.src.html`): Home, Search, Scan (centre button), Places, More; the desktop sidebar mirrors it.
- Home ~1400 px tall on a phone: scan + search card, four shortcuts, Top picks (Health left, Blood sugar right, 3 each + See all), one collapsed "Good picks at restaurants" row. Uses class `home27` only (v10.js decorates `.home74 .hs74`, which we must not match).
- Places: Whole Foods + Costco pinned, Restaurants (chains, meal builder, order builder, build your own), aisles, categories, then every other store under a collapsed "More stores" row.
- More: 8 collapsible groups linking every other feature (47 links).
- Product page: scores, blood-sugar factors, portion, better choice, additive watch, ingredient warnings and nutrition stay in place; pesticide residue, dog-toxic, label check and other add-on cards fold into a collapsed "More checks" row (`#more27`); the dog-toxic/other jump buttons open it first.
- Settings: insulin ratio, offline and data sections are collapsed `details.col27`.
- Existing suites: t261/t262 read card text, so their `go()` opens More checks; tool pages now light the More tab.
- Test: `tests27/t267.py` (35 checks).

## 26.8 "Late bundle"
- Scripts marked `data-late` in `index.src.html` (v24 .. v262: Better choice / order builder / share cards, planner, aisle mode, Home & Body, recalls, supplements / OTC / water, restaurant meal builder + additive watch, pets, kitchen / fish / pesticides / air; 13 files, ~94 KB gz) build into a second bundle `dist/late.<hash>.js`
  (same per-file loader, same order). `dist/manifest.json` lists it (`late`, `lateFiles`) and `tools/build_shell.py` adds it to the service-worker shell, so it is hashed, precached and works offline.
- `js/ui27.js`: `loadLate27()` loads it (a) on idle ~1.2 s after the page `load` (so Home is drawn first) and (b) always BEFORE any route other than Home / Places / More: `route` is wrapped, shows a skeleton, loads the bundle, then runs the original `route()`.
  Deep links, reloads and the hashchange listener all go through the gate. After the bundle runs, `install27()` re-applies the Home/Places/More + tab layer so it is again the outermost wrapper (the order the modules always ran in); `onLate27(fn)` queues work for after the load (the 26.7 What's-new entry).
  If the bundle can't load the page falls back to the main bundle's routes (no hang, no uncaught error).
- Main bundle 383 -> 289 KB gz (cold Home downloads 94 KB gz less before anything is drawn). To move another file to the late bundle: mark it `data-late` (it must stay in source order after all non-late files it patches, and nothing eager may need it at load time), run `tools/release.sh`, run t268 + the full suites.
- Wrapper chains (viewHome/tab19 x12-16 wraps) and the 27 MutationObservers are NOT retired in 26.8: replacing them means re-writing the old modules' hooks (high regression risk for a layer that is tested only through behavior); the route gate + install27 are the contained step. Documented as follow-up.
- Test: `tests27/t268.py` (18 checks).
- Also in 26.8: the product action bar (Log/Save/List/Share) now sits exactly above the bottom nav (`--tabh27` = live nav height, set in js/ui27.js; `html body .pbar10{bottom:var(--tabh27)}` in css/v27.css) and is drawn under the nav so the raised Scan button and its glow are never covered; body padding makes the last card clear both bars. Test: t267 "[bars WxH]" (390x844, 360x640, 430x932, 1280x800).

## 26.9 "Easier search"
- Search results replace the stacked sort tabs, 7 quick chips, Smart filters card, type tabs, source counts and "Search all" links with one compact row: a **Filters & sort** button (badge = number of active filters) and the type selector (All / Products / Restaurants / Whole foods; a `<select>` on a phone, segmented buttons on a wider screen). Results start right below. Active filters appear as removable chips under the row, and only then.
- Tapping Filters & sort opens a bottom sheet on a phone and a right-hand drawer on a desktop. Sort is one radio list (Relevance, Health, Blood sugar, Low carb, Lowest sugar, Highest protein) that merges the old tabs and the Smart filters dropdown. Filters are grouped: Sugar & carbs, Nutrition, Ingredients & additives, Display. The old ≤10 g carbs chip and the Carbs <15 / <30 / <45 chips are both kept (one carb threshold at a time). Additive-watch and watch-for chips still inject into the Ingredients group. Clear all and Show N results are in the sheet footer; "How these filters work" lives inside the sheet. Amounts are per serving.
- "Search all" (`#allBtn`) and the international search sit in one quiet line under the results; the source-count line moved to that footer. `#allBtn` behaviour is unchanged.
- Home: the unlabeled ⇅-style icon on each top-pick card is now a **Compare** text button (same compare action, no new features).
- Code: `js/ui269.js`, `css/v269.css`; `resultsShell` in `js/app.js`; `bar22` mounts into the sheet so `#f22` / `.f22c` / `#f22x` / `#f22n` / `.f22r` still work for v22 / v221 / v26. VERSION 26.9.
- Test: `tests27/t269.py`. Existing t26 filter checks open the sheet first.

## 27.0 — simpler Home, Picks tab, orange theme
- Home (`viewHome27`, js/ui27.js): greeting, a big chat-style search box (textarea, Enter or the arrow runs the existing search; filler words like "show me"/"find" are stripped by `cleanQuery270`), three example chips, a Scan button, small "Type a barcode" / "Scan a label photo" links and an optional Recent row. No picks data is fetched on Home.
- Picks tab `#/picks` (`viewPicks27`): the old Top picks (Overall health left, Blood sugar right), See all picks, restaurant picks. Bottom bar: Home | Search | Scan | Picks | More.
- Places (`#/places`) and Restaurants are the first group under More; More ends with the version, What's new, Not medical advice and Privacy links. The tab bar lights More for stores/places routes.
- Theme: css/v270.css (loaded last) overrides the v23 green tokens with orange (`--acc #C2410C`, text/link `--accT #9A3412`, dark `#FF8A3D` / `#FFB27A`). Score badge colors and the column accents are unchanged. theme-color metas (js/v19.js sets them at runtime), manifest theme_color `#c2410c`.
- Fixed a 26.9 bug: the sort/filter chips inside the Filters sheet did not show their pressed state (they were looked up under #app, the sheet lives on <body>).
- Tests: tests27/t270.py; t263/t264/t267/t268/t269 updated for the new Home / #/picks.

## 27.1 search relevance
- `js/q271.js` (`Q271`): `parse(q)` turns "low sugar / sugar free / no added sugar / unsweetened / low carb / keto / high protein / high fiber / low fat / low sodium / healthy / diabetic friendly / under Ng carbs", a store name and filler words into per-serving filters (same thresholds as the Smart filters) plus a clean subject. `searchAll` requires the subject (all hard words, or a category match as a fallback), applies the filters, ranks added-sugar-flagged products lower for sugar modifiers, and when nothing passes returns the closest subject matches with a note. Plain single-word queries use the unchanged engine. `bestPool` feeds "Best matches" (subject + filters only). Runs in the worker (`search271` op); chips (`.q271chip`) remove a filter by re-running with `off`.
- Golden suite: `tests27/search_golden.json` (~1,160 queries, regenerate with `node tools/gen_golden.mjs`, checked for satisfiability against the real catalog).
- Harness: `node tools/search_eval.mjs` (new engine, scorecard by category and phrase type, failures listed; `--legacy` = old engine, `--all` all tiers, `--only text`, `--fails N`, `--out file.json`). Threshold: keep overall >= 95%. Baseline 57.5% -> 96.9%.
- Smoke test: `cd tests27 && VER=27.1 python3 t271.py http://localhost:8769/ local`.
