#!/usr/bin/env python3
"""Lumi 26.2: build data/fish26/fish.json from the two FDA pages (saved HTML):
  RAW/fish.html  https://www.fda.gov/food/consumers/advice-about-eating-fish   (FDA/EPA advice chart, text version)
  RAW/hg.html    https://www.fda.gov/food/environmental-contaminants-food/mercury-levels-commercial-fish-and-shellfish-1990-2012
Usage: python3 tools/fish26/build_fish.py [RAW_DIR]  (default /workspace/m26/raw). Dates are read from the pages' own <time datetime> tags."""
import re, html, json, os, sys, datetime
RAW = sys.argv[1] if len(sys.argv) > 1 else '/workspace/m26/raw'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'fish26'); os.makedirs(OUT, exist_ok=True)
def text(path):
    s = open(path, encoding='utf-8').read(); t = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
    t = re.sub(r'<(br|/p|/li|/tr|/h\d|/div)[^>]*>', '\n', t); t = re.sub(r'<[^>]+>', ' ', t); t = html.unescape(t); t = re.sub(r'[ \t\xa0]+', ' ', t); return s, re.sub(r'\n\s*\n+', '\n', t)
fs, ft = text(os.path.join(RAW, 'fish.html'))
i = ft.index('Best Choice, Good Choice, or Choice to Avoid?'); j = ft.index('En español', i)
lines = [x.strip() for x in ft[i:j].split('\n')[1:] if x.strip()]
assert len(lines) % 2 == 0, len(lines)
CAT = {'Best Choice': 'best', 'Good Choice': 'good', 'Choice to Avoid: HIGHEST MERCURY LEVELS': 'avoid'}
chart = []
for k in range(0, len(lines), 2):
    assert lines[k + 1] in CAT, lines[k:k + 2]; chart.append([lines[k], CAT[lines[k + 1]]])
# mercury table
hs, _ = text(os.path.join(RAW, 'hg.html')); rows = []
for r in re.findall(r'<tr[^>]*>(.*?)</tr>', hs, flags=re.S):
    cells = [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, flags=re.S)]
    if len(cells) >= 7 and cells[0] != 'SPECIES': rows.append(cells)
def num(x):
    x = x.strip()
    if x in ('ND', 'N/A', ''): return None if x == 'N/A' or x == '' else 0.0
    return float(x)
HG = {}
for c in rows: HG[c[0]] = {'name': c[0], 'mean': num(c[1]), 'median': c[2], 'sd': c[3], 'min': c[4], 'max': num(c[5]) if c[5] not in ('ND', 'N/A') else None, 'n': int(c[6]), 'src': c[7]}
# chart name -> mercury-table rows (FDA's own names; footnotes [1] crab, [2] flatfish, [3] bass)
MAP = {'Anchovy': ['ANCHOVIES'], 'Atlantic croaker': ['CROAKER ATLANTIC (Atlantic)'], 'Atlantic mackerel': ['MACKEREL ATLANTIC (N.Atlantic)'], 'Black sea bass': ['BASS (SALTWATER, BLACK, STRIPED, ROCKFISH) [3]'], 'Butterfish': ['BUTTERFISH'],
 'Catfish': ['CATFISH'], 'Clam': ['CLAM'], 'Cod': ['COD'], 'Crab': ['CRAB [1]'], 'Crawfish': ['CRAWFISH'], 'Flounder': ['FLATFISH [2]'], 'Haddock': ['HADDOCK (Atlantic)'], 'Hake': ['HAKE'], 'Herring': ['HERRING'],
 'Lobster, American and spiny': ['LOBSTER (NORTHERN / AMERICAN)', 'LOBSTER (Spiny)'], 'Mullet': ['MULLET'], 'Oyster': ['OYSTER'], 'Pacific chub mackerel': ['MACKEREL CHUB (Pacific)'], 'Perch, freshwater and ocean': ['PERCH (Freshwater)', 'PERCH OCEAN'],
 'Pickerel': ['PICKEREL'], 'Plaice': ['FLATFISH [2]'], 'Pollock': ['POLLOCK'], 'Salmon': ['SALMON (FRESH/FROZEN)', 'SALMON (CANNED)'], 'Sardine': ['SARDINE'], 'Scallop': ['SCALLOP'], 'Shad': ['SHAD'], 'Shrimp': ['SHRIMP'], 'Skate': ['SKATE'],
 'Sole': ['FLATFISH [2]'], 'Squid': ['SQUID'], 'Tilapia': ['TILAPIA'], 'Trout, freshwater': ['TROUT (FRESHWATER)'], 'Tuna, canned light (includes skipjack)': ['TUNA (CANNED, LIGHT)', 'TUNA (FRESH/FROZEN, SKIPJACK)'], 'Whitefish': ['WHITEFISH'], 'Whiting': ['WHITING'],
 'Bluefish': ['BLUEFISH'], 'Buffalofish': ['BUFFALOFISH'], 'Carp': ['CARP'], 'Chilean sea bass/Patagonian toothfish': ['BASS CHILEAN'], 'Grouper': ['GROUPER (ALL SPECIES)'], 'Halibut': ['HALIBUT'], 'Mahi mahi/dolphinfish': ['MAHI MAHI'],
 'Monkfish': ['MONKFISH'], 'Rockfish': ['BASS (SALTWATER, BLACK, STRIPED, ROCKFISH) [3]'], 'Sablefish': ['SABLEFISH'], 'Sheepshead': ['SHEEPSHEAD'], 'Snapper': ['SNAPPER'], 'Spanish mackerel': ['MACKEREL SPANISH (S. Atlantic)', 'MACKEREL SPANISH (Gulf of Mexico)'],
 'Striped bass (ocean)': ['BASS (SALTWATER, BLACK, STRIPED, ROCKFISH) [3]'], 'Tilefish (Atlantic Ocean)': ['TILEFISH (Atlantic)'], 'Tuna, albacore/white tuna, canned and fresh/frozen': ['TUNA (CANNED, ALBACORE)', 'TUNA (FRESH/FROZEN, ALBACORE)'],
 'Tuna, yellowfin': ['TUNA (FRESH/FROZEN, YELLOWFIN)'], 'Weakfish/seatrout': ['WEAKFISH (SEA TROUT)'], 'White croaker/Pacific croaker': ['CROAKER WHITE (Pacific)'], 'King mackerel': ['MACKEREL KING'], 'Marlin': ['MARLIN'], 'Orange roughy': ['ORANGE ROUGHY'],
 'Shark': ['SHARK'], 'Swordfish': ['SWORDFISH'], 'Tilefish (Gulf of Mexico)': ['TILEFISH (Gulf of Mexico)'], 'Tuna, bigeye': ['TUNA (FRESH/FROZEN, BIGEYE)']}
missing = [k for k in MAP if k not in dict(chart)]; assert not missing, missing
unk = [r for v in MAP.values() for r in v if r not in HG]; assert not unk, unk
fish = []
for name, cat in chart:
    hg = [HG[r] for r in MAP.get(name, [])]; fish.append({'n': name, 'c': cat, 'hg': hg})
def dt(s, which=0):
    m = re.findall(r'datetime="(\d{4}-\d\d-\d\d)', s); return m[which] if m else ''
adv = re.search(r'Advice revised ([A-Za-z]+ \d{4})', ft).group(1)
out = {'built': datetime.date.today().isoformat(), 'advice': {'revised': adv, 'pageUpdated': dt(fs), 'url': 'https://www.fda.gov/food/consumers/advice-about-eating-fish'},
       'mercury': {'pageUpdated': dt(hs), 'url': 'https://www.fda.gov/food/environmental-contaminants-food/mercury-levels-commercial-fish-and-shellfish-1990-2012', 'rows': len(HG)}, 'fish': fish}
json.dump(out, open(OUT + '/fish.json', 'w'), ensure_ascii=False, separators=(',', ':'))
c = {}
for f in fish: c[f['c']] = c.get(f['c'], 0) + 1
print(json.dumps({'chart': len(chart), 'cats': c, 'hgRows': len(HG), 'withHg': sum(1 for f in fish if f['hg']), 'advice': adv, 'adviceUpdated': out['advice']['pageUpdated'], 'hgUpdated': out['mercury']['pageUpdated']}))
