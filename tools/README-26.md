# Lumi 26: datasets and how to refresh them

Everything here is real or official data. Nothing is invented; every list says where it came from. Refresh by hand (or from the monthly routine) with the steps below, then publish `data/` with `tools/sync_data.sh --verify` **before** pushing a release that depends on it. The 25.x datasets are in `tools/README-hb25.md`.

## 26.0 Additive and dye watch

| What | Where | Source | Refresh |
|---|---|---|---|
| Watch list (20 entries: what FDA, California and the EU have banned, revoked, phased out, restricted or put a warning label on) | `js/aw26core.js` (`W` and `S`) | Official pages linked in `S`: FDA (Red 3, BVO, PHO, dyes tracker, FDA review list, July 22, 2026 order and proposal), California AB 418 and AB 2316 (leginfo), EU Regulation 2022/63, 1333/2008 (Annex II list, Annex V), 1129/2011, Directive 2006/52/EC, 21 CFR 73.575, 172.730, 172.806, 189.135 | **By hand, monthly.** Re-read each source page; update the fact text and `ASOF` in `js/aw26core.js`. Things that change: FDA Citrus Red No. 2 (proposed July 2026, not final), FDA review list steps (BHA, BHT, ADA, titanium dioxide, potassium bromate, propylparaben), the voluntary dye phase-out (end of 2027), California's AB 418 date (Jan 1, 2027) |
| List filter sidecar (`No banned additives`, `No synthetic dyes`) | `data/aw26/<tier>.json`, 12 files, 730,579 docs, one char per doc + a sparse mask list | built from the product records in `data/d` and `data/g` with the same matcher the app uses | `node tools/build_aw26.js` after any change to `js/aw26core.js`, `js/ingwarn22.js` or the product data; then `tools/sync_data.sh --verify`. If the ingredient matcher changes, also `node tools/build_f22.js` |

Rules the watch follows: it reads only the ingredient list on file; no list or a non-English list is "couldn't verify", never clean; a flag is a rule or agency action, not a recall and not a verdict on a product; nothing is called "safe". 26.0 also fixed an old matcher bug in `js/ingwarn22.js` (`Red No. 40` and `Red #3` were read as a "no ..." claim) and rebuilt `data/f22`.

## 26.0 Restaurant meal builder

No new dataset. It uses the chain nutrition already in `data/index-*.json` and `data/d` (`src: "rest"` items) and scores the meal with `mealScore241` like saved meals.
