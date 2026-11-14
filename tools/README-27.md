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
