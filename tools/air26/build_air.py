#!/usr/bin/env python3
"""Lumi 26.2: build data/air26 (ZIP -> county -> EPA annual air-quality summary). Keyless, official data only.
Inputs (RAW_DIR, default /workspace/m26/raw/air; see tools/README-26.md for how they were downloaded):
  annual_aqi_by_county_2025.csv  = EPA AirData "Annual AQI by County" (https://aqs.epa.gov/aqsweb/airdata/annual_aqi_by_county_2025.zip)
  zcta_county.txt                = US Census 2020 ZCTA-to-County relationship file tab20_zcta520_county20_natl.txt
                                   (https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt)
Output: data/air26/aqi.json (county FIPS -> annual numbers + names), data/air26/z/<zip3>.json (ZIP -> [primary county FIPS, other county FIPS...]).
A ZIP is matched through its Census ZCTA (ZCTAs approximate ZIP codes; PO-box-only ZIPs have none). The primary county is the one holding the most
land area of the ZCTA. This is NOT live air quality: it is last year's EPA summary, and counties without an EPA monitor have no row."""
import sys, os, re, csv, json, collections, unicodedata
RAW = sys.argv[1] if len(sys.argv) > 1 else '/workspace/m26/raw/air'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'air26'); os.makedirs(OUT + '/z', exist_ok=True)
ST = {'01':'Alabama','02':'Alaska','04':'Arizona','05':'Arkansas','06':'California','08':'Colorado','09':'Connecticut','10':'Delaware','11':'District Of Columbia','12':'Florida','13':'Georgia','15':'Hawaii','16':'Idaho','17':'Illinois','18':'Indiana','19':'Iowa','20':'Kansas','21':'Kentucky','22':'Louisiana','23':'Maine','24':'Maryland','25':'Massachusetts','26':'Michigan','27':'Minnesota','28':'Mississippi','29':'Missouri','30':'Montana','31':'Nebraska','32':'Nevada','33':'New Hampshire','34':'New Jersey','35':'New Mexico','36':'New York','37':'North Carolina','38':'North Dakota','39':'Ohio','40':'Oklahoma','41':'Oregon','42':'Pennsylvania','44':'Rhode Island','45':'South Carolina','46':'South Dakota','47':'Tennessee','48':'Texas','49':'Utah','50':'Vermont','51':'Virginia','53':'Washington','54':'West Virginia','55':'Wisconsin','56':'Wyoming','72':'Puerto Rico','78':'Virgin Islands'}
AB = dict(zip(ST, 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR VI'.split()))
SN = {v.lower(): k for k, v in ST.items()}
def norm(n):
    n = ''.join(ch for ch in unicodedata.normalize('NFD', n) if unicodedata.category(ch) != 'Mn').lower()
    n = {'mayagnez': 'mayaguez'}.get(n, n)  # EPA file garbles this name
    n = n.replace('sainte ', 'ste ').replace('saint ', 'st ').replace('st. ', 'st ').replace('ste. ', 'ste ').replace("'", '')
    n = re.sub(r'\b(county|parish|borough|census area|municipality|city and borough|municipio)\b', '', n)
    return re.sub(r'[^a-z0-9]+', '', n)
# county table from Census
names = {}; zc = collections.defaultdict(list); bynorm = {}
for r in csv.DictReader(open(RAW + '/zcta_county.txt', encoding='utf-8-sig'), delimiter='|'):
    fips = r['GEOID_COUNTY_20']
    if not fips or fips[:2] not in ST: continue
    nm = r['NAMELSAD_COUNTY_20']; names[fips] = nm
    z = r['GEOID_ZCTA5_20']
    if z: zc[z].append((int(r['AREALAND_PART'] or 0), fips))
for f, nm in names.items(): bynorm.setdefault((f[:2], norm(nm)), []).append(f)
aqi = {}; miss = []
for r in csv.DictReader(open(RAW + '/annual_aqi_by_county_2025.csv', encoding='utf-8-sig')):
    s = SN.get(r['State'].lower())
    if not s: miss.append((r['State'], r['County'])); continue
    c = bynorm.get((s, 'charlescity' if (s, r['County']) == ('51', 'Charles') else norm(r['County'])))  # EPA lists Charles City County, VA as 'Charles'
    if not c or len(c) != 1:
        # "Doña Ana" style accents / duplicate city+county names: try a prefix-free match
        miss.append((r['State'], r['County'], len(c or []))); continue
    g = lambda k: int(r[k] or 0)
    aqi[c[0]] = [g('Days with AQI'), g('Good Days'), g('Moderate Days'), g('Unhealthy for Sensitive Groups Days'), g('Unhealthy Days'), g('Very Unhealthy Days'), g('Hazardous Days'),
                 g('Max AQI'), g('90th Percentile AQI'), g('Median AQI'), g('Days CO'), g('Days NO2'), g('Days Ozone'), g('Days PM2.5'), g('Days PM10')]
shards = collections.defaultdict(dict); used = set()
for z, lst in zc.items():
    lst.sort(reverse=True); fl = [f for a, f in lst]
    # keep the primary county plus up to 3 more that the ZCTA touches, preferring counties with a monitor
    rest = [f for f in fl[1:]]; rest.sort(key=lambda f: (f not in aqi,))
    ent = [fl[0]] + rest[:3]; shards[z[:3]][z] = ent; used.update(ent)
for k, v in shards.items(): json.dump(v, open(f'{OUT}/z/{k}.json', 'w'), separators=(',', ':'))
cn = {f: names[f].replace(' County', '') + ', ' + AB[f[:2]] if names[f].endswith(' County') else names[f] + ', ' + AB[f[:2]] for f in used | set(aqi)}
json.dump({'year': 2025, 'zip3': sorted(shards), 'cols': ['days', 'good', 'mod', 'usg', 'unh', 'vu', 'haz', 'max', 'p90', 'med', 'co', 'no2', 'o3', 'pm25', 'pm10'], 'aqi': aqi, 'names': cn,
           'src': 'EPA AirData, Annual AQI by County, 2025'}, open(OUT + '/aqi.json', 'w'), separators=(',', ':'))
print(json.dumps({'zctas': len(zc), 'zip3_shards': len(shards), 'counties_with_aqi': len(aqi), 'epa_rows_unmatched': miss, 'counties_named': len(cn)}))
