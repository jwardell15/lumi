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
