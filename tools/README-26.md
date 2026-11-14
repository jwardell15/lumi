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

## 26.1 Pets

| What | Where | Source | Refresh |
|---|---|---|---|
| Pet food products (barcode, name, brand, species, quantity, front photo path, ingredient text and its language) | `data/pet26/p/<NN>.json` (100 shards by the last two digits of the barcode), `data/pet26/index.json` (search: `[code, name, brand, species, hasIngredients]`) | Open Pet Food Facts **bulk dump** `https://static.openpetfoodfacts.org/data/openpetfoodfacts-products.jsonl.gz` (ODbL; photos CC BY-SA). robots.txt (`/api`, `/cgi`, `/facets` disallowed) was read; only the static dump is used, never the live API. Nov 13, 2026: 15,865 pet foods, 13,124 with a name or brand, 2,874 with an ingredient list, 13,777 with a photo; 16 spam entries (phone numbers, links) skipped | `curl -o /workspace/m26/raw/opff.jsonl.gz <url>` then `python3 tools/pet26/build_pet.py [RAW_DIR]`, then `tools/sync_data.sh --verify` |
| FDA animal and veterinary recalls (date, brand names, product, reason, company, terminated flag) | `data/pet26/recalls.json` | FDA Center for Veterinary Medicine table, `https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals` (the page's own "download" link gives `animal_recalls.xlsx`; 65 rows as of 2026-11-10). Put the page's "Content current as of" date in `RAW_DIR/recalls_asof.txt` before building | Same build command (it reads `RAW_DIR/animal_recalls.xlsx`) |
| Dog-toxic ingredient list (11 entries: xylitol, chocolate/cocoa, cocoa butter, caffeine/coffee, tea/matcha/yerba mate, grapes/raisins, grape products, onion/garlic/chives/leek, macadamia, alcohol, avocado) | `js/pet26core.js` (`W`, `S`, `POISON`, `ASOF`) | ASPCA "People foods to avoid feeding your pets", FDA "Potentially dangerous items for your pet", FDA "Paws off xylitol", FDA "Leave chocolate out of Rover's celebrations", read Nov 13, 2026. Short paraphrases only, each with a link; poison-line numbers from the ASPCA and Pet Poison Helpline pages | Re-read the four pages by hand, edit `W`, bump `ASOF` |

How the pet pieces behave:
- Pet food is **not scored**: Open Pet Food Facts almost never has a nutrition panel and Lumi's scores are for human food. A pet product page shows the name, brand, species, photo, ingredient list on file, the dog-toxic check, and a brand-level FDA recall match (labelled as brand-name matching only).
- A dog-toxic check with no hit says "none of the ... found in the list on file ... not a safety rating". A missing list, a non-English list (hits still shown) or a junk list (under 12 letters or 2 words, e.g. a volunteer typo like "80g") is "couldn't verify". Nothing says "safe".
- Barcode scan order: Lumi's food index and Open Food Facts/USDA first, then pet food (Open Pet Food Facts), then Home & Body, then OTC medicines, then NIH DSLD supplements. Scans are looked up in Lumi's own copy; nothing is sent to Open Pet Food Facts except the product photo file name when a photo is shown (`images.openpetfoodfacts.org`, listed on the Privacy page).
- The same dog-toxic check runs on every human-food product page that has an ingredient list (after the additive watch card).
- Tests: `tests26/t261.py` (needs the repo `data/pet26/` for its independent checks).
