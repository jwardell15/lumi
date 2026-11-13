# Home & Body data (Lumi 25): how to refresh

All data is built from official bulk sources into static JSON. See `tools/hb25/SOURCES.md` for every source, URL and license.
Nothing here is scheduled (the monthly nutrition-check routine is untouched): refresh by hand, a few times a year.

1. Download into `$HB25_WORK/raw/` (default `/workspace/m25`):
   - `obf.jsonl.gz`, `opf.jsonl.gz` from static.openbeautyfacts.org / static.openproductsfacts.org (`/data/open*facts-products.jsonl.gz`). Bulk dumps only: the live API is disallowed by robots.txt.
   - `cscp.csv` (California Safe Cosmetics, data.chhs.ca.gov), `p65.pdf` (OEHHA Prop 65 list; `python3 tools/hb25/parse_p65.py`), EPA PFAS structure list XLS + DSSTox names, `safer_choice.json` (EPA Safer Choice), Minnesota PRISM (`python3 tools/hb25/fetch_prism3.py`, keyset paging, polite).
2. `python3 tools/hb25/prep.py && python3 tools/hb25/build_ref.py` (CSCP products, ref.json).
3. `node tools/build_hb25.js <raw> <build> <out>` -> `data/hb25/` (ref.json, index.json, index-c.json, d/*.json, safer.json, pfasmn.json).
4. 25.2 water: download EPA's SDWA bulk zip (echo.epa.gov/files/echodownloads/SDWA_latest_downloads.zip) to `raw/sdwa.zip` (+ unzipped `raw/sdwa/`) and UCMR 5 (epa.gov/dwucmr, `UCMR5_All.txt`, `UCMR5_ZIPCodes.txt`) to `raw/ucmr/`, then `python3 tools/hb25/water.py` -> `out/water25/` (copy to `data/water25/`). Junk office ZIP 00000 is skipped.
4b. 25.2 OTC: download openFDA `drug-ndc` (download.open.fda.gov/drug/ndc/drug-ndc-0001-of-0001.json.zip) to `raw/fda/`, then `python3 tools/hb25/build_otc.py` -> `out/otc25/` (copy to `data/otc25/`).
4c. 25.1 recalls: `python3 tools/hb25/fetch_cpsc2.py` (small date windows, retries) and `python3 tools/hb25/build_recalls.py` -> `data/recalls25/`.
5. `tools/sync_data.sh --verify` publishes `data/` to the Cloudflare Pages project `lumi-data`.

Supplements (NIH DSLD) and the OTC drug label (openFDA) are read live from the browser, so there is nothing to refresh for them; the OTC product list (step 4b) and the recall lists (4c) are the static copies. Refresh 4, 4b and 4c every month or two, then step 5.
