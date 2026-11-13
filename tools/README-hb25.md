# Home & Body data (Lumi 25): how to refresh

All data is built from official bulk sources into static JSON. See `tools/hb25/SOURCES.md` for every source, URL and license.
Nothing here is scheduled (the monthly nutrition-check routine is untouched): refresh by hand, a few times a year.

1. Download into `$HB25_WORK/raw/` (default `/workspace/m25`):
   - `obf.jsonl.gz`, `opf.jsonl.gz` from static.openbeautyfacts.org / static.openproductsfacts.org (`/data/open*facts-products.jsonl.gz`). Bulk dumps only: the live API is disallowed by robots.txt.
   - `cscp.csv` (California Safe Cosmetics, data.chhs.ca.gov), `p65.pdf` (OEHHA Prop 65 list; `python3 tools/hb25/parse_p65.py`), EPA PFAS structure list XLS + DSSTox names, `safer_choice.json` (EPA Safer Choice), Minnesota PRISM (`python3 tools/hb25/fetch_prism3.py`, keyset paging, polite).
2. `python3 tools/hb25/prep.py && python3 tools/hb25/build_ref.py` (CSCP products, ref.json).
3. `node tools/build_hb25.js <raw> <build> <out>` -> `data/hb25/` (ref.json, index.json, index-c.json, d/*.json, safer.json, pfasmn.json).
4. `python3 tools/hb25/water.py` -> `data/water25/` (25.2).
5. `tools/sync_data.sh --verify` publishes `data/` to the Cloudflare Pages project `lumi-data`.
