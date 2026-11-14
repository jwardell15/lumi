/* Lumi 26.2: Kitchen and food-contact (PFAS, BPA), Fish and mercury, Pesticide residue on produce, Air quality by ZIP.
   Routes: #/kitchen, #/fish[/<query>], #/pesticides[/<query>], #/air[/<zip>]. Cards on product pages: fish (#fish262), pesticides (#pest262).
   Official data only: FDA/EPA Advice About Eating Fish + FDA mercury table (data/fish26), USDA Pesticide Data Program (data/pdp26), EPA AirData annual county AQI + Census ZCTA-county
   (data/air26). Nothing here is a safety rating: a clear result means "nothing found in the data Lumi has", never "safe". Missing data is "couldn't verify". */
(() => {
'use strict';
const K = window.KIT262; if (!K) { console.warn('v262: core262 missing'); return; }
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const enc = encodeURIComponent, NF = n => Number(n).toLocaleString('en-US');
const ext = (u, t) => `<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a>`;
const shell = (cls, inner) => { app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim(); app.innerHTML = `<section class="${cls} pg13">${inner}</section>`; const h = app.querySelector('h1'); if (h) h.setAttribute('tabindex', '-1'); };
const SRC = {
  fda: ['FDA and EPA: Advice About Eating Fish', 'https://www.fda.gov/food/consumers/advice-about-eating-fish'],
  hg: ['FDA: Mercury levels in commercial fish and shellfish (1990-2012)', 'https://www.fda.gov/food/environmental-contaminants-food/mercury-levels-commercial-fish-and-shellfish-1990-2012'],
  epa: ['EPA: Choose Fish and Shellfish Wisely', 'https://www.epa.gov/choose-fish-and-shellfish-wisely'],
  epac: ['EPA: state, territorial and tribal fish advisory contacts', 'https://www.epa.gov/choose-fish-and-shellfish-wisely/state-territorial-tribal-and-epa-fish-program-contacts'],
  pdp: ['USDA Pesticide Data Program: data sets', 'https://www.ams.usda.gov/datasets/pdp/pdpdata'],
  pdps: ['USDA PDP annual summary reports', 'https://www.ams.usda.gov/reports/pdp-annual-summary-reports'],
  aqs: ['EPA AirData: annual AQI by county', 'https://aqs.epa.gov/aqsweb/airdata/download_files.html#Annual'],
  cen: ['US Census: 2020 ZCTA-to-county relationship file', 'https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.2020.html'],
  airnow: ['AirNow', 'https://www.airnow.gov/'],
  mn116: ['Minnesota Statutes 116.943 (Amara\'s Law)', 'https://www.revisor.mn.gov/statutes/cite/116.943'],
  mn325: ['Minnesota Statutes 325F.075 (food packaging)', 'https://www.revisor.mn.gov/statutes/cite/325F.075'],
  mpca: ['Minnesota Pollution Control Agency: PFAS in products', 'https://www.pca.state.mn.us/air-water-land-climate/pfas-in-products-data'],
  me: ['Maine DEP: PFAS in Products', 'https://www.maine.gov/dep/spills/topics/pfas/PFAS-products/index.html'],
  ca: ['California DTSC: Chemical disclosures for cookware (AB 1200)', 'https://dtsc.ca.gov/scp/safer-food-packaging-cookware-act-of-2021/'],
  fdapfas: ['FDA: Authorized uses of PFAS in food contact applications', 'https://www.fda.gov/food/process-contaminants-food/authorized-uses-pfas-food-contact-applications'],
  fdabpa: ['FDA: Bisphenol A (BPA) in food contact applications', 'https://www.fda.gov/food/food-additives-petitions/bisphenol-bpa-use-food-contact-application'],
  eu: ['EU Regulation 2024/3190 (bisphenols in food contact materials)', 'https://eur-lex.europa.eu/eli/reg/2024/3190/oj/eng']
};
const sl = (...k) => k.map(x => ext(SRC[x][1], SRC[x][0])).join(' · ');
const cache = {}; const load = (k, url, ms) => cache[k] || (cache[k] = getJSON(url, ms || 30000).catch(e => { delete cache[k]; throw e; }));
const fishData = () => load('fish', 'data/fish26/fish.json'), pdpData = () => load('pdp', 'data/pdp26/pdp.json'), aqiData = () => load('aqi', 'data/air26/aqi.json', 40000);
const loadErr = (e, back) => `<div class="card empty"><b>Couldn't load the data</b>${esc(e && e.message || e)}. Check your connection and retry.<div class="actions"><button class="btn pri" onclick="route()">Retry</button><a class="btn" href="${back || '#/browse'}">Back</a></div></div>`;
const slug = s => K.norm(s).replace(/ /g, '-');
const note = t => `<p class="small na262"><b>Couldn't verify.</b> ${t}</p>`;

/* =============== FISH =============== */
const FISH_SERV = `<div class="card fs262"><h2>How much, how often (FDA and EPA)</h2>
 <p class="small">The advice is written for people who are or might become pregnant, who are breastfeeding, and for young children. A serving is about the palm of your hand.</p>
 <ul class="hw26"><li><b>Pregnancy and breastfeeding:</b> a serving is 4 ounces. Eat 2 to 3 servings a week from the Best Choices list, or 1 serving from the Good Choices list.</li>
 <li><b>Children:</b> a serving is about 1 ounce at age 1 to 3, 2 ounces at 4 to 7, 3 ounces at 8 to 10, and 4 ounces at 11. Eat 2 servings a week from the Best Choices list.</li>
 <li><b>Fish caught by family or friends:</b> check for local advisories. If there is none, eat only one serving and no other fish that week.</li></ul>
 <p class="small">Local advisories (lakes, rivers, coastal waters) come from your state, territory or tribe: ${ext(SRC.epac[1], 'EPA list of fish advisory contacts')}.</p></div>`;
const hgLine = h => `<tr><td>${esc(h.name)}</td><td>${h.mean == null ? 'n/a' : esc(h.mean)}</td><td>${esc(h.min)} to ${esc(h.max)}</td><td>${esc(h.n)}</td><td>${esc(h.src)}</td></tr>`;
function fishDetail(f, open) { const c = K.CAT[f.c];
  return `<details class="fr262 ${c[1]}"${open ? ' open' : ''} id="f-${esc(slug(f.n))}"><summary><b>${esc(f.n)}</b><i class="tg262 ${c[1]}">${c[0]}</i></summary>
  ${f.hg && f.hg.length ? `<table class="mt262"><caption class="vh">Mercury measured by FDA, in parts per million</caption><thead><tr><th>FDA mercury row</th><th>Mean (ppm)</th><th>Range (ppm)</th><th>Samples</th><th>Survey</th></tr></thead><tbody>${f.hg.map(hgLine).join('')}</tbody></table>` : note("FDA's mercury table has no row for this fish.")}
  </details>`; }
async function viewFish(arg) {
  document.title = 'Fish and mercury — Lumi';
  shell('fish262p', `<h1>Fish and mercury</h1>${skel(3)}`);
  let d; try { d = await fishData(); } catch (e) { app.innerHTML = loadErr(e); return; }
  if (!/^#\/fish/.test(location.hash)) return;
  const st = { c: 'all', q: decodeURIComponent(arg || '') };
  const cnt = c => d.fish.filter(f => f.c === c).length;
  shell('fish262p', `<h1>Fish and mercury</h1>
   <p class="lead">FDA and EPA sort ${d.fish.length} common fish and shellfish into <b>Best Choices</b> (${cnt('best')}), <b>Good Choices</b> (${cnt('good')}) and <b>Choices to Avoid</b> (${cnt('avoid')}) by how much mercury they tend to have.</p>
   ${FISH_SERV}
   <div class="card"><label class="vh" for="fq262">Search fish</label><input id="fq262" type="search" placeholder="Search fish, like tuna or salmon" autocomplete="off" value="${esc(st.q)}">
   <div class="chips26" role="group" aria-label="Category">${[['all', 'All'], ['best', 'Best Choices'], ['good', 'Good Choices'], ['avoid', 'Choices to Avoid']].map(c => `<button type="button" class="chip fc262" data-c="${c[0]}" aria-pressed="${c[0] === 'all'}">${c[1]}</button>`).join('')}</div>
   <p class="small" id="fn262" aria-live="polite"></p><div id="fl262"></div></div>
   <div class="card"><h2>About tuna</h2><p class="small">Tuna is on the chart four ways: canned light (includes skipjack) is a Best Choice, albacore (white) and yellowfin are Good Choices, and bigeye is a Choice to Avoid. A can that just says "tuna" doesn't tell you which, so Lumi shows all of them.</p></div>
   <div class="card"><h2>Where this comes from</h2><ul class="hw26"><li>The chart is FDA and EPA's <i>Advice About Eating Fish</i> (revised ${esc(d.advice.revised)}; the page was last updated ${esc(d.advice.pageUpdated)}).</li>
   <li>Mercury numbers are FDA's published table, "Mercury levels in commercial fish and shellfish (1990-2012)" (page updated ${esc(d.mercury.pageUpdated)}). They are averages from sampled fish, in parts per million; <b>ND</b> means not detected. A single fish can be higher or lower.</li>
   <li>Lumi matches the chart's names to FDA's mercury rows itself, and ${d.fish.filter(f => !f.hg.length).length === 1 ? 'one fish has' : d.fish.filter(f => !f.hg.length).length + ' fish have'} no row in that table. That's shown as couldn't verify.</li>
   <li>This is general advice, not medical advice. Ask your doctor about fish if you're pregnant or planning to be.</li></ul>
   <p class="small foot">${sl('fda', 'hg', 'epa')}</p></div>`);
  const inp = $('#fq262'), list = $('#fl262'), nn = $('#fn262');
  const run = () => { const toks = K.norm(st.q).split(' ').filter(Boolean); const res = d.fish.filter(f => (st.c === 'all' || f.c === st.c) && toks.every(t => K.norm(f.n).includes(t)));
    list.innerHTML = res.map(f => fishDetail(f, res.length === 1 && toks.length > 0)).join(''); nn.textContent = res.length ? `${res.length} fish` : 'No fish on the chart matches that.'; };
  inp.oninput = () => { st.q = inp.value; run(); try { history.replaceState(null, '', '#/fish' + (st.q ? '/' + enc(st.q) : '')); } catch { } };
  $$('.fc262').forEach(b => b.onclick = () => { st.c = b.dataset.c; $$('.fc262').forEach(x => { const on = x.dataset.c === st.c; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); run(); });
  run(); }

/* =============== PESTICIDES =============== */
const pct = (d, n) => n ? (100 * d / n) : 0, f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const PEST_CAVEAT = `<p class="small">A detection means the lab found a trace of a pesticide. It is not the same as harm: EPA sets a legal limit (a "tolerance") for each pesticide on each food, and USDA reports how many samples went over. Lumi can't tell you what any amount means for you.</p>`;
function yearRows(c) { return c.years.slice().sort((a, b) => b.y - a.y).map(y => `<tr><td>${y.y}</td><td>${NF(y.n)}</td><td>${f1(pct(y.d, y.n))}%</td><td>${NF(y.x)}</td><td>${NF(y.nt)}</td><td>${y.on >= 30 ? `${f1(pct(y.od, y.on))}% of ${NF(y.on)}` : '<span class="small">too few</span>'}</td></tr>`).join(''); }
function pestDetail(c, open) { const L = K.pdpLatest(c);
  return `<details class="pr262"${open ? ' open' : ''} id="p-${esc(slug(c.name))}"><summary><b>${esc(c.name)}</b><span class="pv262"><i class="tg262 pn">${f1(pct(L.d, L.n))}% with a detection</i><small>${L.y} · ${NF(L.n)} samples · ${NF(L.x)} over tolerance</small></span></summary>
   ${L.top && L.top.length ? `<p class="small"><b>Most often found in ${L.y}:</b> ${L.top.slice(0, 5).map(t => `${esc(t[0])} (${f1(t[1])}% of samples)`).join(', ')}</p>` : ''}
   <table class="mt262"><caption class="vh">USDA PDP results by year for ${esc(c.name)}</caption><thead><tr><th>Year</th><th>Samples</th><th>With a detection</th><th>Over tolerance</th><th>No tolerance set</th><th>Labeled organic</th></tr></thead><tbody>${yearRows(c)}</tbody></table>
   <p class="small">${L.on >= 30 ? '' : 'Organic-labeled samples are shown only when there are at least 30 of them in a year. '}Samples are picked without regard to organic labeling, so those counts are what turned up, not a designed comparison.</p></details>`; }
async function viewPest(arg) {
  document.title = 'Pesticide residue — Lumi';
  shell('pest262p', `<h1>Pesticide residue on food</h1>${skel(3)}`);
  let d; try { d = await pdpData(); } catch (e) { app.innerHTML = loadErr(e); return; }
  if (!/^#\/pesticides/.test(location.hash)) return;
  let q = decodeURIComponent(arg || '').replace(/-/g, ' '); const st = { s: 'det' };
  const v = d.verify, yrs = d.years; const last = v[String(Math.max.apply(null, yrs))] || [];
  shell('pest262p', `<h1>Pesticide residue on food</h1>
   <p class="lead">What USDA's Pesticide Data Program (PDP) found when it tested ${d.commodities.length} foods between ${Math.min.apply(null, yrs)} and ${Math.max.apply(null, yrs)}.</p>
   <div class="card"><h2>How to read this</h2>${PEST_CAVEAT}
    <ul class="hw26"><li>USDA collects samples at distribution points, picked at random without regard to country of origin, variety or organic labeling. Before testing, the lab washes each sample for 15 to 20 seconds under cold running water.</li>
    <li>Foods are tested on a rotation, so each food shows the latest year it was tested, with earlier years inside.</li>
    <li>"With a detection" counts samples with at least one pesticide found, leaving out old banned chemicals that persist in soil (USDA reports those separately).</li>
    <li>"No tolerance set" means EPA has no limit for that pesticide on that food.</li>${last.length ? `<li>Check against USDA's own numbers: Lumi's rebuild of ${Math.max.apply(null, yrs)} gives ${NF(last[0])} samples, ${f1(last[1])}% with no detection and ${NF(last[2])} over tolerance, matching USDA's ${Math.max.apply(null, yrs)} summary.</li>` : ''}</ul></div>
   <div class="card"><label class="vh" for="pq262">Search foods</label><input id="pq262" type="search" placeholder="Search a food, like strawberries" autocomplete="off" value="${esc(q)}">
   <div class="chips26" role="group" aria-label="Sort">${[['det', 'Most with a detection'], ['low', 'Fewest with a detection'], ['over', 'Most over tolerance'], ['az', 'A to Z']].map(c => `<button type="button" class="chip ps262" data-s="${c[0]}" aria-pressed="${c[0] === 'det'}">${c[1]}</button>`).join('')}</div>
   <p class="small" id="pn262" aria-live="polite"></p><div id="pl262"></div></div>
   <p class="small foot">Data: ${sl('pdp', 'pdps')}. Built ${esc(d.built)} from USDA's database files for ${Math.min.apply(null, yrs)}-${Math.max.apply(null, yrs)}. Lumi is not affiliated with USDA.</p>`);
  const inp = $('#pq262'), list = $('#pl262'), nn = $('#pn262');
  const run = () => { const toks = K.norm(q).split(' ').filter(Boolean); let res = d.commodities.filter(c => toks.every(t => K.norm(c.name).includes(t)));
    const L = c => K.pdpLatest(c); const keys = { det: c => -pct(L(c).d, L(c).n), low: c => pct(L(c).d, L(c).n), over: c => -L(c).x, az: c => 0 };
    res.sort((a, b) => (keys[st.s](a) - keys[st.s](b)) || a.name.localeCompare(b.name));
    list.innerHTML = res.map(c => pestDetail(c, res.length === 1 && toks.length > 0)).join(''); nn.textContent = res.length ? `${res.length} food${res.length === 1 ? '' : 's'}` : 'No tested food matches that.'; };
  inp.oninput = () => { q = inp.value; run(); try { history.replaceState(null, '', '#/pesticides' + (q ? '/' + enc(q) : '')); } catch { } };
  $$('.ps262').forEach(b => b.onclick = () => { st.s = b.dataset.s; $$('.ps262').forEach(x => { const on = x.dataset.s === st.s; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); run(); });
  run(); }

/* =============== KITCHEN =============== */
function kitchenResult(r) {
  if (r.status === 'none') return note('Paste some text from a cookware, container or packaging page first.');
  if (r.status === 'clear') return `<div class="card kr262 clr262"><p class="small"><b>Nothing found.</b> Lumi found no PFAS, PTFE/Teflon or bisphenol wording in that text. Labels often don't say what a coating or lining is made of, so this doesn't mean none is there. <b>Couldn't verify</b> beyond the words you pasted.</p></div>`;
  return `<div class="card kr262 hit262"><p class="small"><b>${r.hits.length} thing${r.hits.length === 1 ? '' : 's'} to know about</b> in that text. Lumi looks only at the words; it can't test a product.</p>${r.hits.map(h => `<div class="kh262"><h3>${esc(h.label)} <i class="tg262 pn">found: ${esc(h.found)}</i></h3><p class="small">${esc(h.text)}</p></div>`).join('')}</div>`; }
function viewKitchen() { document.title = 'Kitchen and food contact — Lumi';
  shell('kit262p', `<h1>Kitchen and food contact</h1>
   <p class="lead">PFAS and bisphenols (BPA) in cookware, food wrap and containers: what the rules say, and a checker for product descriptions. This is information, not a safety rating.</p>
   <div class="card"><h2>Check a product description</h2><p class="small">Paste the "materials" or "about" text from a cookware, container or wrap page. Lumi looks for words like PTFE, Teflon, PFAS, BPA and bisphenol.</p>
    <label class="vh" for="kt262">Product description to check</label><textarea id="kt262" rows="4" placeholder="Paste text from a product page or package"></textarea>
    <div class="actions"><button type="button" class="btn pri" id="kc262">Check it</button><button type="button" class="btn" id="kx262">Clear</button></div><div id="kr262" aria-live="polite"></div></div>
   <div class="card"><h2>PFAS in cookware</h2>
    <ul class="hw26"><li><b>Minnesota:</b> since January 1, 2025, cookware that contains intentionally added PFAS can't be sold in the state. The law's "cookware" covers pots, pans, bakeware, bowls, utensils and other durable items used to prepare, dispense or store food. ${sl('mn116')}</li>
    <li><b>Maine:</b> its list of products banned when they contain intentionally added PFAS includes cookware from January 1, 2026, with some exceptions the state can allow. ${sl('me')}</li>
    <li><b>California (AB 1200):</b> cookware makers must disclose certain chemicals on the state's Candidate Chemicals List that are intentionally added to food-contact surfaces or handles, and some cookware now carries codes or labels because of it. The same law bans PFAS in plant-based food packaging. ${sl('ca')}</li>
    <li><b>FDA:</b> says the PTFE non-stick coating on pots and pans shows negligible migration into food. ${sl('fdapfas')}</li></ul>
    <p class="small">More on PFAS in products, including the EPA list and Minnesota's reports: <a class="lnk" href="#/pfas">PFAS in products ›</a></p></div>
   <div class="card"><h2>PFAS in food wrap, bags and packaging</h2>
    <ul class="hw26"><li><b>Minnesota:</b> no one may sell a food package (wraps, bags, cups, trays, containers and more) that contains intentionally added PFAS. ${sl('mn325', 'mpca')}</li>
    <li><b>FDA:</b> says PFAS grease-proofing agents for paper packaging are no longer sold into the US market, and that it declared the related notifications no longer effective in January 2025. ${sl('fdapfas')}</li></ul></div>
   <div class="card"><h2>BPA and other bisphenols</h2>
    <ul class="hw26"><li><b>FDA</b> says its current assessment supports the approved uses of BPA in food containers and packaging at the levels found in food. It also changed its rules so BPA-based materials are no longer provided for in baby bottles, sippy cups and infant formula packaging. ${sl('fdabpa')}</li>
    <li><b>European Union:</b> Regulation (EU) 2024/3190 bans BPA and other hazardous bisphenols in food-contact materials, in force since January 20, 2025. Transition periods run longer for some uses: until July 20, 2026 for most single-use and reusable articles, July 20, 2028 for coatings in fruit, vegetable and processed-fish packaging, and January 20, 2028 for professional equipment. ${sl('eu')}</li>
    <li>"BPA-free" only says BPA was left out. A different bisphenol can take its place, which is why the EU rule covers the group.</li></ul></div>
   <div class="card"><h2>Reading a label</h2><ul class="hw26"><li>Look for the material to be named (stainless steel, cast iron, glass, a named coating). A vague "non-stick" or "ceramic-like" doesn't say what it is.</li>
    <li>"PFOA-free" is narrower than "PFAS-free". Neither tells you whether the other family members are used.</li>
    <li>If it matters to you, ask the maker for a test report or a written statement about intentionally added PFAS and bisphenols.</li></ul>
    <p class="small foot">Rules read on ${esc(new Date('2026-11-13T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))} from the official pages linked here. Laws change; the links are the source. Some state pages block automated readers, so Lumi links them without copying them. This isn't legal or medical advice.</p></div>`);
  const ta = $('#kt262'), out = $('#kr262');
  $('#kc262').onclick = () => { out.innerHTML = kitchenResult(K.kitchenCheck(ta.value)); };
  $('#kx262').onclick = () => { ta.value = ''; out.innerHTML = ''; ta.focus(); }; }

/* =============== AIR =============== */
const ZKEY = 'lumi.zip262';
const getZ = () => { try { return localStorage.getItem(ZKEY) || ''; } catch { return ''; } };
const setZ = z => { try { z ? localStorage.setItem(ZKEY, z) : localStorage.removeItem(ZKEY); } catch { } };
const BAND = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5'];
function aqiCard(name, row, yr) {
  const [days, good, mod, usg, unh, vu, haz, mx, p90, med, co, no2, o3, pm25, pm10] = row; const seg = [good, mod, usg, unh, vu, haz]; const lbl = K.AQI_BANDS;
  const main = [['Ozone', o3], ['PM2.5 (fine particles)', pm25], ['PM10', pm10], ['Nitrogen dioxide', no2], ['Carbon monoxide', co]].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  return `<div class="card aq262"><h2>${esc(name)}</h2><p class="small">EPA's summary for ${yr}: air quality was measured on <b>${NF(days)}</b> days.</p>
   <div class="bar262" role="img" aria-label="${esc(lbl.map((b, i) => `${seg[i]} ${b[0].toLowerCase()} days`).join(', '))}">${seg.map((n, i) => n ? `<span class="${BAND[i]}" style="flex:${n}"></span>` : '').join('')}</div>
   <ul class="lg262">${lbl.map((b, i) => `<li><i class="sw262 ${BAND[i]}" aria-hidden="true"></i>${esc(b[0])} (AQI ${b[2]}): <b>${NF(seg[i])}</b> day${seg[i] === 1 ? '' : 's'}</li>`).join('')}</ul>
   <p class="small">Median AQI <b>${med}</b> · 90th percentile <b>${p90}</b> · highest day <b>${mx}</b></p>
   ${main.length ? `<p class="small">Days each pollutant was the main one: ${main.map(x => `${esc(x[0])} <b>${NF(x[1])}</b>`).join(', ')}.</p>` : ''}</div>`; }
async function viewAir(arg) {
  document.title = 'Air quality — Lumi';
  const saved = getZ(); let z = K.zipOK(arg) ? String(arg).trim() : saved;
  shell('air262p', `<h1>Air quality by ZIP</h1>
   <p class="lead">Last year's air quality for the county around a ZIP code, from EPA's AirData summary. It is a yearly summary, not today's reading.</p>
   <div class="card"><form id="af262" novalidate><label for="az262"><b>ZIP code</b></label><div class="zr262"><input id="az262" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" autocomplete="off" placeholder="5-digit ZIP" value="${esc(z || '')}"><button type="submit" class="btn pri">Look up</button></div></form>
   <p class="small" id="am262" aria-live="polite"></p>
   <p class="small">Your ZIP stays on this phone. To find your county, Lumi downloads one small file named for the <b>first 3 digits</b> of the ZIP from its data host; the full ZIP is not sent anywhere. Lumi doesn't read your location.</p>
   <div class="actions"><button type="button" class="btn" id="as262">${saved && saved === z ? 'Forget this ZIP' : 'Remember this ZIP on this phone'}</button></div></div>
   <div id="ar262"></div>
   <div class="card"><h2>Today's air quality</h2><p class="small">For today's reading and forecast, ${ext(SRC.airnow[1], 'open AirNow')} and enter your ZIP there. Lumi doesn't show live readings: AirNow's data service for apps needs a registered account key, and Lumi only uses official data it can read without one.</p></div>
   <div class="card"><h2>Pollen</h2><p class="small">Lumi doesn't show pollen counts. It uses only official, free data, and no US government pollen feed was found.</p></div>
   <p class="small foot">Data: ${sl('aqs', 'cen')}. The ZIP-to-county link uses Census ZIP Code Tabulation Areas, which approximate ZIP codes (PO-box-only ZIPs have none). The county shown is the one holding most of the ZIP's land. Counties without an EPA monitor have no row. The Air Quality Index (AQI) runs from 0 to 500; lower is better.</p>`);
  const inp = $('#az262'), msg = $('#am262'), out = $('#ar262');
  const go = async () => { const v = inp.value.trim(); out.innerHTML = '';
    if (!K.zipOK(v)) { msg.textContent = 'Enter a 5-digit ZIP code.'; return; } msg.textContent = 'Looking up…'; z = v;
    let a, sh; try { a = await aqiData(); if (a.zip3 && !a.zip3.includes(v.slice(0, 3))) sh = {}; else sh = await load('z' + v.slice(0, 3), 'data/air26/z/' + v.slice(0, 3) + '.json', 20000); } catch (e) { msg.textContent = ''; out.innerHTML = loadErr(e, '#/air'); return; }
    if (!/^#\/air/.test(location.hash)) return; msg.textContent = '';
    try { history.replaceState(null, '', '#/air/' + v); } catch { }
    $('#as262').textContent = getZ() === v ? 'Forget this ZIP' : 'Remember this ZIP on this phone';
    const e = sh[v]; if (!e) { out.innerHTML = `<div class="card empty"><b>ZIP ${esc(v)} isn't in the Census list Lumi uses</b>PO-box-only, military and brand-new ZIP codes often aren't. ${note('Lumi has no county for this ZIP.')}</div>`; return; }
    const nm = f => a.names[f] || f; const withData = e.filter(f => a.aqi[f]); const prim = e[0];
    let html = '';
    if (a.aqi[prim]) html += `<div class="card"><p class="small">ZIP <b>${esc(v)}</b> is mainly in <b>${esc(nm(prim))}</b> county${e.length > 1 ? ` and touches ${e.length - 1} other${e.length > 2 ? 's' : ''}` : ''}.</p></div>` + aqiCard(nm(prim) + ' county', a.aqi[prim], a.year);
    else html += `<div class="card"><p class="small">ZIP <b>${esc(v)}</b> is mainly in <b>${esc(nm(prim))}</b> county.</p>${note(`EPA's ${a.year} summary has no air monitor data for ${esc(nm(prim))} county.`)}</div>`;
    const others = withData.filter(f => f !== prim);
    if (others.length) html += `<h2 class="sec262">${a.aqi[prim] ? 'Other counties this ZIP touches' : 'Nearby counties with EPA data'}</h2>` + others.map(f => aqiCard(nm(f) + ' county', a.aqi[f], a.year)).join('');
    else if (!a.aqi[prim]) html += `<div class="card"><p class="small">None of the counties this ZIP touches have EPA monitor data in that summary. Try ${ext(SRC.airnow[1], 'AirNow')}, which includes forecasts for areas without monitors.</p></div>`;
    out.innerHTML = html; };
  $('#af262').onsubmit = ev => { ev.preventDefault(); go(); };
  $('#as262').onclick = () => { const v = inp.value.trim(); if (getZ() === v && v) { setZ(''); $('#as262').textContent = 'Remember this ZIP on this phone'; msg.textContent = 'Forgot the saved ZIP.'; } else if (K.zipOK(v)) { setZ(v); $('#as262').textContent = 'Forget this ZIP'; msg.textContent = 'Saved on this phone.'; } else msg.textContent = 'Enter a 5-digit ZIP first.'; };
  if (z) go(); }

/* =============== product-page cards =============== */
const FISHISH = /fish|seafood|tuna|salmon|sardine|shrimp|mackerel|anchov|crab|oyster|clam|lobster|scallop|trout|cod\b/i;
function fishCard(m) { const stated = m.stated;
  const rows = m.entries.map(f => { const c = K.CAT[f.c], h = f.hg && f.hg[0]; return `<li><a href="#/fish/${enc(f.n.split(/[,(/]/)[0])}"><b>${esc(f.n)}</b></a> <i class="tg262 ${c[1]}">${c[0]}</i>${h && h.mean != null ? `<span class="small"> · FDA mercury mean ${esc(h.mean)} ppm</span>` : ''}</li>`; }).join('');
  return `<div class="card fish262" id="fish262"><h2>Fish and mercury</h2>${stated ? '' : `<p class="small"><b>Couldn't verify the species.</b> The name doesn't say which kind, so here is every kind it could be on FDA and EPA's chart:</p>`}<ul class="fl262">${rows}</ul>
   <p class="small">FDA and EPA advice for people who are or may become pregnant, breastfeeding, and for young children: a serving is 4 ounces; 2 to 3 servings a week of Best Choices, or 1 of Good Choices. <a class="lnk" href="#/fish">All fish ›</a> ${ext(SRC.fda[1], 'FDA chart')}</p></div>`; }
function pestCard(c) { const L = K.pdpLatest(c); const older = c.years.filter(y => y.y !== L.y).sort((a, b) => b.y - a.y).slice(0, 3);
  return `<div class="card pest262" id="pest262"><h2>Pesticide residue (USDA testing)</h2>
   <p class="small">USDA tested <b>${NF(L.n)}</b> samples of <b>${esc(c.name.toLowerCase())}</b> in ${L.y}. <b>${f1(pct(L.d, L.n))}%</b> had at least one pesticide detected${L.x ? `, and ${NF(L.x)} had a residue over EPA's tolerance` : '; none were over EPA\'s tolerance'}.</p>
   ${L.top && L.top.length ? `<p class="small">Most often found: ${L.top.slice(0, 3).map(t => `${esc(t[0])} (${f1(t[1])}%)`).join(', ')}.</p>` : ''}
   ${older.length ? `<p class="small">Earlier: ${older.map(y => `${y.y}: ${f1(pct(y.d, y.n))}% of ${NF(y.n)}`).join(' · ')}.</p>` : ''}
   ${L.on >= 30 ? `<p class="small">Labeled organic in ${L.y}: ${f1(pct(L.od, L.on))}% of ${NF(L.on)} samples had a detection.</p>` : ''}
   ${PEST_CAVEAT}<p class="small"><a class="lnk" href="#/pesticides/${enc(c.name.split(',')[0])}">Details and other years ›</a> ${ext(SRC.pdp[1], 'USDA PDP data')}</p></div>`; }
async function prod262() { const m = location.hash.match(/^#\/product\/([^/?]+)/); if (!m || !app.classList.contains('prodv')) return; const foot = app.querySelector('p.foot'), dog = $('#dog261'); if (!foot || !dog || foot.dataset.k262) return;
  foot.dataset.k262 = '1'; const id = decodeURIComponent(m[1]); let p = memo.get(id); if (!p) { try { p = await resolveProduct(id); } catch { return; } } if (!p || location.hash.indexOf(m[1]) < 0 || $('#fish262') || $('#pest262')) return;
  const usda = p.src === 'usda', cats = JSON.stringify(p.cats || '') + ' ' + (p.cat || '');
  try {
    if ((usda && /fish/i.test(p.cat || '')) || (!usda && FISHISH.test(cats))) { const d = await fishData(); const fm = K.fishMatch(p.name, FISHISH.test(cats) ? p.ing : '', d.fish); if (fm && !$('#fish262') && location.hash.indexOf(m[1]) >= 0) { dog.insertAdjacentHTML('afterend', fishCard(fm)); return; } }
    if (usda && /\braw\b/i.test(p.name || '')) { const d = await pdpData(); const c = K.pdpMatch(p.name, d); if (c && !$('#pest262') && location.hash.indexOf(m[1]) >= 0) dog.insertAdjacentHTML('afterend', pestCard(c)); }
  } catch (e) { console.warn('v262', e); } }

/* =============== integration =============== */
const RT = { kitchen: () => viewKitchen(), fish: a => viewFish(a), pesticides: a => viewPest(a), air: a => viewAir(a) };
if (typeof tab19 === 'function') { const t0 = tab19; tab19 = function (view) { if (RT[view]) return 'browse'; return t0.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh = viewHome; viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i); if (RT[v]) return RT[v](i < 0 ? '' : h.slice(i + 1)); return vh.apply(this, arguments); }; }
if (typeof viewBrowseHub === 'function') { const bh = viewBrowseHub; viewBrowseHub = function () { const r = bh.apply(this, arguments);
  const sec = `<div class="sec-h"><h2>Kitchen, fish, produce and air</h2></div><div class="tools74 kitbr262"><a href="#/kitchen"><b>Kitchen and food contact</b><span>PFAS and BPA in cookware, wrap and containers</span></a><a href="#/fish"><b>Fish and mercury</b><span>FDA and EPA's chart of what to choose</span></a><a href="#/pesticides"><b>Pesticide residue</b><span>USDA testing results for more than 100 foods</span></a><a href="#/air"><b>Air quality by ZIP</b><span>EPA's yearly summary for your county</span></a></div>`;
  if (!app.querySelector('.kitbr262')) { const all = [...app.querySelectorAll('.browse74 .tools74')]; const last = all.pop(); if (last) last.insertAdjacentHTML('afterend', sec); } return r; }; }
{ let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { prod262(); } catch (e) { console.warn(e); } }); }).observe(app, { childList: true, subtree: true }); }
setTimeout(() => { try { prod262(); } catch (e) { console.warn(e); } }, 0);
self.viewKitchen262 = viewKitchen; self.viewFish262 = viewFish; self.viewPest262 = viewPest; self.viewAir262 = viewAir;
if (/^#\/(kitchen|fish|pesticides|air)(\/|$)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(['🧪', 'Kitchen, fish, produce and air (26.2)', 'Check cookware and container text for PFAS and BPA wording with the rules that apply. See FDA and EPA fish choices and mercury, USDA pesticide testing results (also on raw produce pages), and last year\'s EPA air quality summary for your ZIP.']);
})();
