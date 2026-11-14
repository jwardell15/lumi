#!/usr/bin/env python3
"""Lumi 26.2: build data/pdp26/pdp.json from the USDA Pesticide Data Program (PDP) database ZIPs for 2015-2024.
Usage: python3 tools/pdp26/build_pdp.py [RAW_DIR]   RAW_DIR holds x15..x24 = the unzipped <year>PDPDatabase.zip files
  (https://www.ams.usda.gov/datasets/pdp/pdpdata, see tools/README-26.md). Needs openpyxl and xlrd (older years are .xls).
Method (matches USDA's own annual summaries): a sample 'has a detection' if any result has MEAN code O, A or R for a pesticide other than the 21
organochlorine environmental contaminants listed in Appendix E of the 2024 summary (aldrin, BHC isomers, chlordanes, DDD/DDE/DDT, dieldrin, endrin,
heptachlor, HCB, lindane, mirex). Check: 2024 -> 9,872 samples, 42.3% with no detection (USDA's published figure), 76 samples above tolerance."""
import sys, os, re, glob, json, collections, datetime
RAW = sys.argv[1] if len(sys.argv) > 1 else '/workspace/m26/raw/pdp'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'pdp26'); os.makedirs(OUT, exist_ok=True)
EC = re.compile(r'^(aldrin|bhc[ ,]|chlordane|dd[det][ ,]|dieldrin|endrin|heptachlor|hexachlorobenzene|hcb|lindane|mirex)', re.I)
def sheet(path, name):
    if path.endswith('.xlsx'):
        import openpyxl; wb = openpyxl.load_workbook(path, read_only=True); return [list(r) for r in wb[name].iter_rows(values_only=True)]
    import xlrd; sh = xlrd.open_workbook(path).sheet_by_name(name); return [[sh.cell_value(i, j) for j in range(sh.ncols)] for i in range(sh.nrows)]
def clean_name(n): return re.sub(r'\s+', ' ', str(n)).strip().rstrip(',').strip()
comm = {}   # name -> {year -> stats}
verify = {}
for yy in range(15, 25):
    d = f'{RAW}/x{yy}'; ref = (glob.glob(d + '/*Reference*.xlsx') or glob.glob(d + '/*Reference*.xls'))[0]; year = 2000 + yy
    cn = {str(r[0]): clean_name(r[1]) for r in sheet(ref, 'Commodity')[5:] if r[0]}
    pn = {str(r[0]): clean_name(r[1]) for r in sheet(ref, 'Pest Code')[4:] if r[0]}
    ec = {c for c, n in pn.items() if EC.match(n)}
    samp = {}
    for l in open(f'{d}/PDP{yy}Samples.txt', encoding='latin-1'):
        f = l.rstrip('\n').split('|'); samp[int(f[0])] = (cn.get(f[6], f[6]), f[13])
    det = collections.defaultdict(set); exc = set(); nt = set(); means = collections.Counter()
    for l in open(f'{d}/PDP{yy}Results.txt', encoding='latin-1'):
        f = l.rstrip('\n').split('|'); means[f[13]] += 1
        if f[13] in ('O', 'A', 'R') and f[4] not in ec:
            pk = int(f[0]); det[pk].add(f[4])
            if f[11] == 'X': exc.add(pk)
            elif f[11] in ('V', 'QV'): nt.add(pk)
    assert set(means) <= {'ND', 'NP', 'O', 'R', 'A', 'N', ''}, (yy, means)
    per = collections.defaultdict(lambda: {'n': 0, 'd': 0, 'x': 0, 'nt': 0, 'on': 0, 'od': 0, 'p': collections.Counter()})
    for pk, (name, claim) in samp.items():
        s = per[name]; s['n'] += 1; hit = pk in det
        if hit: s['d'] += 1
        if pk in exc: s['x'] += 1
        if pk in nt: s['nt'] += 1
        if claim == 'PO':
            s['on'] += 1; s['od'] += 1 if hit else 0
        for pc in det.get(pk, ()): s['p'][pn.get(pc, pc)] += 1
    nd = sum(1 for k in samp if k not in det); verify[year] = (len(samp), round(100 * nd / len(samp), 1), len(exc), len(ec))
    for name, s in per.items():
        top = [[p, round(100 * c / s['n'], 1)] for p, c in s['p'].most_common(12) if 100 * c / s['n'] >= 5][:8]
        comm.setdefault(name, {})[year] = {'y': year, 'n': s['n'], 'd': s['d'], 'x': s['x'], 'nt': s['nt'], 'on': s['on'], 'od': s['od'], 'top': top}
rows = []
for name, ys in comm.items():
    L = sorted(ys.values(), key=lambda r: -r['y']); rows.append({'name': name, 'years': L})
rows.sort(key=lambda r: r['name'].lower())
out = {'built': datetime.date.today().isoformat(), 'years': list(range(2015, 2025)), 'source': 'https://www.ams.usda.gov/datasets/pdp/pdpdata', 'summary': 'https://www.ams.usda.gov/reports/pdp-annual-summary-reports', 'verify': {str(k): v for k, v in verify.items()}, 'commodities': rows}
json.dump(out, open(OUT + '/pdp.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(json.dumps({'commodities': len(rows), 'verify(year: samples, %noDetect, aboveTolerance, ecCompounds)': verify}))
