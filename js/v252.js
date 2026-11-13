/* Lumi 25.2: supplements (NIH DSLD, live), over-the-counter medicines (openFDA NDC list as a static file + the drug label live), and local water quality
   (EPA SDWIS + UCMR 5 as static files; you type a ZIP code). Routes: #/supp[/<query|id>], #/otc[/<query>|/<letter>/<setid>], #/water[/zip/<zip>|/find/<ST>/<q>|/<ST>/<PWSID>].
   Nothing here gives dosing advice, and nothing calls a product, medicine or water "safe". */
(() => {
'use strict';
const UI = window.HB25UI; if (!UI || !window.HB25) { console.warn('v252: v25 missing'); return; }
const norm = HB25.norm, ext = UI.ext, NF = UI.NF, enc = encodeURIComponent;
const BW = 'data/water25/', BO = 'data/otc25/', DSLD = 'https://api.ods.od.nih.gov/dsld/v9/', FDA = 'https://api.fda.gov/drug/label.json';
const L = {}; const lazy = (k, f) => L[k] || (L[k] = f().catch(e => { delete L[k]; throw e; }));
const shell = (cls, inner) => { app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim(); app.innerHTML = `<section class="${cls} pg13">${inner}</section>`; const h = app.querySelector('h1'); if (h) h.setAttribute('tabindex', '-1'); };
const errCard = (msg, retry) => `<div class="card empty"><b>Couldn't load this</b>${esc(msg)}.<div class="actions"><button class="btn pri" onclick="route()">Retry</button>${retry || ''}</div></div>`;
const num = (x, d) => { if (x == null || !isFinite(x)) return ''; d = d == null ? 1 : d; return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('en-US', { maximumFractionDigits: d }); };
const dateFmt = s => { if (!s) return ''; const m = String(s).match(/^(\d{4})-?(\d\d)-?(\d\d)$/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); return String(s); };
const mdy = s => { const m = String(s || '').match(/^(\d\d)\/(\d\d)\/(\d{4})$/); return m ? new Date(+m[3], +m[1] - 1, +m[2]).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : String(s || ''); };

/* =====================  WATER  ===================== */
const STN = { AK: 'Alaska', AL: 'Alabama', AR: 'Arkansas', AS: 'American Samoa', AZ: 'Arizona', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DC: 'District of Columbia', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', GU: 'Guam', HI: 'Hawaii', IA: 'Iowa', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', MA: 'Massachusetts', MD: 'Maryland', ME: 'Maine', MI: 'Michigan', MN: 'Minnesota', MO: 'Missouri', MP: 'Northern Mariana Islands', MS: 'Mississippi', MT: 'Montana', NC: 'North Carolina', ND: 'North Dakota', NE: 'Nebraska', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NV: 'Nevada', NY: 'New York', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VA: 'Virginia', VI: 'U.S. Virgin Islands', VT: 'Vermont', WA: 'Washington', WI: 'Wisconsin', WV: 'West Virginia', WY: 'Wyoming' };
const SRCN = { GW: 'Groundwater', SW: 'Surface water', GU: 'Groundwater under the influence of surface water', GWP: 'Purchased groundwater', SWP: 'Purchased surface water' };
const CATN = { MCL: 'Over a legal limit (MCL)', TT: 'Treatment requirement not met', MRDL: 'Disinfectant over its limit', RTC: 'Total coliform rule', TCR: 'Total coliform rule', SWTR: 'Surface water treatment' };
/* EPA PFAS limits (the data is in µg/L; ppt = ng/L). Status per EPA as of Oct 18, 2026. */
const PFREF = { PFOA: { ppt: 4, st: 'final' }, PFOS: { ppt: 4, st: 'final' }, PFHxS: { ppt: 10, st: 'resc' }, PFNA: { ppt: 10, st: 'resc' }, 'HFPO-DA': { ppt: 10, st: 'resc', alias: 'GenX' } };
const wInfo = () => lazy('wi', () => UI.load('wi', BW + 'info.json', 20000));
const wCodes = () => lazy('wc', () => UI.load('wcodes', BW + 'codes.json', 30000));
const wState = st => lazy('ws' + st, () => UI.load('ws' + st, BW + 's-' + st + '.json', 40000));
const wZip = z3 => lazy('wz' + z3, () => UI.load('wz' + z3, BW + 'z-' + z3 + '.json', 20000));
const WATER_ABOUT = `<div class="card"><h2>What this is, and isn't</h2><p class="small">Facts from EPA about <b>public water systems</b>, not a test of your tap. Your water also passes through your own pipes, and a home with lead pipes or solder can have lead even when the system's results look fine. For your own water, read your utility's yearly <b>Consumer Confidence Report</b> and ask about testing. Lumi never says water is "safe": it shows what EPA's records contain and what they don't.</p></div>`;
function sysRow(st, id, s) { const nv = s.nhv || 0; const pf = s.pf || {}; const hi = ['PFOA', 'PFOS'].filter(k => pf[k] && pf[k][2] * 1000 >= 4);
  return `<li class="wr252"><a href="#/water/${st}/${id}"><b>${esc(s.n || id)}</b><span>${esc(STN[st] || st)} · serves about ${NF(s.p || 0)} people${s.s && SRCN[s.s] ? ' · ' + esc(SRCN[s.s].toLowerCase()) : ''}</span><span class="wt252">${nv ? `<i class="wb252 b1">${nv} health-based violation${nv === 1 ? '' : 's'} since 2016</i>` : '<i class="wb252">No health-based violations since 2016</i>'}${hi.length ? `<i class="wb252 b1">${hi.join(' and ')} detected at or above 4 ppt</i>` : ''}</span></a></li>`; }
function waterForm(q) { const st = Object.keys(STN);
  return `<a class="back25" href="#/hb">‹ Home &amp; Body</a><h1>Local water quality</h1>
  <p class="lead">What EPA's records say about the public water system that serves a ZIP code: violations, lead and copper, and PFAS screening results.</p>
  <form class="hbq25 wf252" id="wzf" role="search"><label class="small" for="wz252">ZIP code</label><div class="wfr252"><input id="wz252" inputmode="numeric" autocomplete="postal-code" maxlength="5" pattern="[0-9]{5}" placeholder="5-digit ZIP" value="${/^\d{5}$/.test(q || '') ? q : ''}" aria-describedby="wzh252"><button class="btn pri" type="submit">Look up</button></div><p class="small" id="wzh252">You type it; Lumi doesn't read your location and stores nothing on a server.</p></form>
  <details class="wd252"><summary>Or find a water system by name</summary><form class="hbq25" id="wnf"><div class="wfr252"><select id="wns252" aria-label="State">${st.map(s => `<option value="${s}">${esc(STN[s])}</option>`).join('')}</select><input id="wnq252" type="search" placeholder="City or system name" aria-label="City or system name"><button class="btn" type="submit">Find</button></div></form></details>`; }
function bindWaterForm() { const f = $('#wzf'); if (f) f.onsubmit = e => { e.preventDefault(); const z = $('#wz252').value.trim(); if (!/^\d{5}$/.test(z)) { $('#wzh252').textContent = 'Enter a 5-digit ZIP code.'; $('#wzh252').classList.add('werr252'); return; } location.hash = '#/water/zip/' + z; };
  const g = $('#wnf'); if (g) g.onsubmit = e => { e.preventDefault(); const q = $('#wnq252').value.trim(); location.hash = '#/water/find/' + $('#wns252').value + '/' + enc(q); }; }
function waterSrc(info) { return `<p class="small wsrc252">Sources: ${ext('https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting', 'EPA Safe Drinking Water Information System (SDWIS)')} and ${ext('https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule', 'EPA UCMR 5 results')} (U.S. government public data).${info ? " Lumi's copy was built " + esc(dateFmt(info.built)) + '.' : ''}</p>`; }
async function viewWaterHome(arg) { document.title = 'Water quality — Lumi'; const parts = String(arg || '').split('/').filter(Boolean);
  if (parts[0] === 'zip') return viewWaterZip(parts[1] || ''); if (parts[0] === 'find') return viewWaterFind(parts[1], decodeURIComponent(parts.slice(2).join('/')));
  if (parts.length === 2 && /^[A-Z0-9]{2}$/.test(parts[0])) return viewWaterSys(parts[0], parts[1]);
  shell('wpg252', waterForm('') + WATER_ABOUT + waterSrc()); bindWaterForm(); }
async function viewWaterZip(z) { document.title = 'Water quality — Lumi';
  shell('wpg252', waterForm(z) + `<div id="wres252">${skel(2)}</div>`); bindWaterForm();
  if (!/^\d{5}$/.test(z)) { $('#wres252').innerHTML = '<div class="card empty"><b>Enter a 5-digit ZIP code</b></div>'; return; }
  let m, info; try { [m, info] = await Promise.all([wZip(z.slice(0, 3)), wInfo()]); } catch (e) { if (location.hash === '#/water/zip/' + z) $('#wres252').innerHTML = errCard(e.message); return; }
  if (location.hash !== '#/water/zip/' + z) return;
  const e = m[z]; const box = $('#wres252');
  if (!e) { box.innerHTML = `<div class="card empty"><b>No water system in EPA's data lists ${esc(z)}</b>That doesn't mean there's no water service there. Some ZIP codes are served by systems that list a different ZIP, and private wells aren't covered. Ask your city or water utility, or <a href="#/water/find/MN/">find a system by name</a>.</div>` + WATER_ABOUT + waterSrc(info); return; }
  const ids = [...(e.s || []), ...(e.o || [])]; const sts = [...new Set(ids.map(x => x.split('/')[0]))];
  try { await Promise.all(sts.map(wState)); } catch (er) { box.innerHTML = errCard(er.message); return; }
  const rowH = async a => { let h = ''; for (const x of a) { const [st, id] = x.split('/'); const S = (await wState(st))[id]; if (S) h += sysRow(st, id, S); } return h; };
  const h1 = await rowH((e.s || []).slice(0, 15)), h2 = await rowH((e.o || []).slice(0, 8));
  if (location.hash !== '#/water/zip/' + z) return;
  box.innerHTML = `${h1 ? `<h2 class="wh252">Systems that list ${esc(z)} as a place they serve</h2><ul class="wl252">${h1}</ul><p class="small">${(e.s || []).length > 15 ? 'Showing the 15 largest. ' : ''}A ZIP code can be served by more than one system, and one system's area can cover only part of a ZIP. Your water bill or utility tells you which one is yours.</p>` : ''}
   ${h2 ? `<h2 class="wh252">Systems whose office is in ${esc(z)}</h2><p class="small">These list ${esc(z)} as their mailing ZIP. They may or may not serve homes there.</p><ul class="wl252">${h2}</ul>` : ''}` + WATER_ABOUT + waterSrc(info); }
async function viewWaterFind(st, q) { document.title = 'Water quality — Lumi'; if (!STN[st]) st = 'MN';
  shell('wpg252', waterForm('') + `<div id="wres252">${skel(2)}</div>`); bindWaterForm(); $('#wns252').value = st; $('#wnq252').value = q; $('.wd252').open = true;
  let S, info; try { [S, info] = await Promise.all([wState(st), wInfo()]); } catch (e) { $('#wres252').innerHTML = errCard(e.message); return; }
  const t = norm(q).split(' ').filter(Boolean);
  const hit = Object.entries(S).filter(([id, s]) => !t.length || t.every(w => norm(s.n + ' ' + (s.ct || []).join(' ') + ' ' + (s.co || []).join(' ')).includes(w))).sort((a, b) => (b[1].p || 0) - (a[1].p || 0));
  if (location.hash.indexOf('/water/find/') < 0) return;
  $('#wres252').innerHTML = hit.length ? `<p class="small" aria-live="polite">${NF(hit.length)} system${hit.length === 1 ? '' : 's'} in ${esc(STN[st])}${hit.length > 30 ? ', showing the 30 serving the most people' : ''}</p><ul class="wl252">${hit.slice(0, 30).map(([id, s]) => sysRow(st, id, s)).join('')}</ul>` + WATER_ABOUT + waterSrc(info) : `<div class="card empty"><b>No systems match “${esc(q)}” in ${esc(STN[st])}</b>Try a city name or a shorter word.</div>`; }
const ppt = v => v * 1000;
function pfasCard(s) {
  if (s.pfn == null) return `<div class="card"><h2>PFAS (UCMR 5 screening)</h2><p><b>Couldn't verify.</b> This system has no PFAS results in the EPA UCMR 5 data that Lumi uses. UCMR 5 tested every large system and a sample of smaller ones, so "not in the data" doesn't mean none.</p></div>`;
  const pf = s.pf || {}, ks = Object.keys(pf);
  if (!ks.length) return `<div class="card wok252"><h2>PFAS (UCMR 5 screening)</h2><p><b>No PFAS found above the reporting levels</b> in ${NF(s.pfn)} result${s.pfn === 1 ? '' : 's'} per compound (2023–2025 sampling). That's a screening test at the plant's entry points, not your tap, and it doesn't cover every PFAS.</p></div>`;
  const row = k => { const x = pf[k], v = ppt(x[2]), ref = PFREF[k]; const over = ref && v >= ref.ppt;
    return `<tr class="${over && ref.st === 'final' ? 'wo252' : ''}"><th scope="row">${esc(k)}${ref && ref.alias ? ` <small>(${ref.alias})</small>` : ''}</th><td>${num(v, v < 10 ? 1 : 0)} ppt</td><td>${x[1]} of ${x[0]}</td><td>${ref ? (ref.st === 'final' ? `Limit ${ref.ppt} ppt${over ? ': <b>highest result is at or above it</b>' : ''}` : `Was ${ref.ppt} ppt; EPA proposes to rescind${over ? ' (highest result is at or above it)' : ''}`) : 'No EPA limit'}</td></tr>`; };
  const order = k => (PFREF[k] ? 0 : 1) + k; ks.sort((a, b) => order(a) < order(b) ? -1 : 1);
  return `<div class="card"><h2>PFAS (UCMR 5 screening)</h2><p>Found: <b>${ks.length} PFAS compound${ks.length === 1 ? '' : 's'}</b> at or above the reporting level (2023–2025 sampling, up to ${NF(s.pfn)} result${s.pfn === 1 ? '' : 's'} per compound). Highest single result shown.</p>
   <div class="tbw252"><table class="tb252"><caption class="vh">PFAS results for this system</caption><thead><tr><th scope="col">Compound</th><th scope="col">Highest result</th><th scope="col">Detected</th><th scope="col">EPA drinking-water limit</th></tr></thead><tbody>${ks.map(row).join('')}</tbody></table></div>
   <p class="small">ppt = parts per trillion (ng/L). EPA's limits for PFOA and PFOS (4.0 ppt) apply to a running yearly average at the system, so one result above it isn't by itself a violation. EPA has proposed pushing the compliance date to 2031 and rescinding the limits for PFHxS, PFNA and GenX; those changes aren't final (status per EPA, Oct 18, 2026, so check epa.gov). UCMR 5 samples are taken where treated water enters the system, not at a tap, and they weren't tested for compliance. ${ext('https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas', 'EPA on PFAS in drinking water')}.</p></div>`; }
async function viewWaterSys(st, id) { document.title = 'Water system — Lumi'; shell('wpg252', `<a class="back25" href="#/water">‹ Water quality</a>${skel(3)}`);
  let S, info, codes; try { [S, info, codes] = await Promise.all([wState(st), wInfo(), wCodes()]); } catch (e) { app.innerHTML = errCard(e.message, '<a class="btn" href="#/water">Water quality</a>'); return; }
  if (location.hash.indexOf(id) < 0) return; const s = S[id];
  if (!s) { shell('wpg252', `<a class="back25" href="#/water">‹ Water quality</a><div class="card empty"><b>${esc(id)} isn't in Lumi's water data</b>It may be inactive or not a community water system.<div class="actions"><a class="btn pri" href="#/water">Look up a ZIP code</a></div></div>`); return; }
  const cn = c => (codes.contaminants || {})[c] || ('Contaminant ' + c); const nhv = s.nhv || 0;
  const hvRows = (s.hv || []).map(v => { const [c, b, e, cat, status, meas, unit, lim] = v; return `<li class="hv252"><div class="hh252"><b>${esc(cn(c))}</b><span class="wb252 ${/Unaddressed|Addressed/.test(status) ? 'b1' : ''}">${esc(status || '')}</span></div><div class="hm252">${esc(CATN[cat] || cat || 'Violation')} · ${esc(mdy(b))}${e ? ' to ' + esc(mdy(e)) : ' (no end date listed)'}${meas ? ` · measured ${esc(meas)} ${esc(unit || '')}${lim ? ' (limit ' + esc(lim) + ')' : ''}` : ''}</div></li>`; }).join('');
  const other = Object.values(s.oth || {}).reduce((a, b) => a + b, 0);
  let lead; if (s.pb) { const [d, v, u, sg] = s.pb; lead = { d, val: /mg/i.test(u) ? parseFloat(v) * 1000 : parseFloat(v), sg }; }
  let cu; if (s.cu) { const [d, v, u] = s.cu; cu = { d, val: /mg/i.test(u) ? parseFloat(v) : parseFloat(v) / 1000 }; }
  const leadCard = lead || cu ? `<div class="card"><h2>Lead and copper</h2><ul class="lc252">${lead ? `<li><b>Lead:</b> 90th-percentile result ${lead.sg === '<' ? 'below ' : ''}<b>${num(lead.val, lead.val < 10 ? 1 : 0)} µg/L</b> (sampled ${esc(dateFmt(lead.d))}). EPA's action level is 15 µg/L. ${lead.val > 15 ? '<b class="wo252">This is above the action level.</b>' : 'This is at or below the action level.'}</li>` : "<li><b>Lead:</b> couldn't verify: no result in the data.</li>"}${cu ? `<li><b>Copper:</b> 90th-percentile result <b>${num(cu.val, 2)} mg/L</b> (sampled ${esc(dateFmt(cu.d))}). The action level is 1.3 mg/L. ${cu.val > 1.3 ? '<b class="wo252">This is above the action level.</b>' : 'This is at or below the action level.'}</li>` : ''}</ul><p class="small">The 90th percentile means 9 in 10 of the sampled homes were at or below that number, so some sampled homes were higher. These are results from the system's tap samples in older homes, not your home. If your home has lead pipes or solder, consider testing your tap. ${ext('https://www.epa.gov/ground-water-and-drinking-water/basic-information-about-lead-drinking-water', 'EPA on lead in drinking water')}.</p></div>` : `<div class="card"><h2>Lead and copper</h2><p><b>Couldn't verify.</b> No lead or copper sample result for this system is in Lumi's data.</p></div>`;
  shell('wpg252', `<a class="back25" href="#/water">‹ Water quality</a><div class="card wh2c252"><h1>${esc(s.n)}</h1><p class="small">${esc(STN[st] || st)} · ${esc(id)} · community water system · serves about ${NF(s.p || 0)} people${s.s && SRCN[s.s] ? ' · ' + esc(SRCN[s.s].toLowerCase()) + ' source' : ''}</p>${(s.ct || []).length || (s.co || []).length ? `<p class="small">Area: ${esc([...(s.ct || []).slice(0, 6), ...(s.co || []).slice(0, 3).map(c => c + ' County')].join(', '))}</p>` : ''}
   <p class="wsum252">${nhv ? `<b class="wo252">${nhv} health-based violation${nhv === 1 ? '' : 's'}</b> since 2016 in EPA's records.` : "<b>No health-based violations</b> since 2016 in EPA's records."} <span class="small">That's what the records show, not a guarantee about your water.</span></p></div>
  <div class="card"><h2>Health-based violations since 2016</h2>${nhv ? `<ul class="hvl252">${hvRows}</ul>${nhv > (s.hv || []).length ? `<p class="small">Showing the ${(s.hv || []).length} most recent of ${nhv}.</p>` : ''}<p class="small">A violation means the system broke an EPA rule; "Resolved" means EPA records it as back in compliance. Many are for a limited period. Total coliform rule entries are for bacteria testing, and the system must tell customers.</p>` : '<p>None listed. Violations are reported by the state to EPA, and reporting can lag by months.</p>'}${other ? `<p class="small">Also ${NF(other)} monitoring, reporting or notice violation${other === 1 ? '' : 's'} since 2016 (not health-based).</p>` : ''}</div>
  ${leadCard}${pfasCard(s)}${WATER_ABOUT}
  <div class="actions"><a class="btn" href="#/water">Look up another ZIP</a>${ext('https://echo.epa.gov/detailed-facility-report?fid=' + enc(id) + '&sys=SDWIS', 'This system on EPA ECHO')}</div>${waterSrc(info)}`); }

/* =====================  OTC MEDICINES  ===================== */
const oIdx = () => lazy('oi', () => UI.load('oi', BO + 'index.json', 60000));
const oShard = l => lazy('os' + l, () => UI.load('os' + l, BO + 'n-' + l + '.json', 40000));
const shardOf = w => { const m = String(w || '').toLowerCase().match(/[a-z0-9]/); return m ? (/[a-z]/.test(m[0]) ? m[0] : '0') : '0'; };
const OTCNOTE = `<div class="card"><h2>Not dosing advice</h2><p class="small">Lumi shows what's printed on the drug label and what the FDA lists for the product. It doesn't tell you what to take, how much, or whether a medicine is right for you. Read the Drug Facts label on the package and ask a pharmacist or doctor.</p></div>`;
const rec2o = r => ({ sid: r[0], b: r[1], g: r[2], l: r[3], f: r[4], u: r[5], n: r[6] });
async function otcSearch(q) { const t = norm(q).split(' ').filter(Boolean); if (!t.length) return []; const sh = [...new Set(t.slice(0, 3).map(shardOf))]; const sets = await Promise.all(sh.map(oShard)); const seen = new Set(), out = [];
  for (const S of sets) for (const r of S) { if (seen.has(r[0])) continue; const hay = ' ' + norm(r[1] + ' ' + r[2] + ' ' + r[3]) + ' '; if (t.every(w => hay.includes(w))) { seen.add(r[0]); out.push({ r, sh: [shardOf(r[1]), shardOf(r[2])].find(x => sh.includes(x)) || shardOf(r[1]) }); } }
  out.sort((a, b) => { const A = norm(a.r[1]).startsWith(t[0]) ? 0 : 1, B = norm(b.r[1]).startsWith(t[0]) ? 0 : 1; return A - B || a.r[1].localeCompare(b.r[1]); }); return out; }
const otcLink = (r, sh) => `#/otc/${sh}/${r[0]}`;
async function viewOTCHome(arg) { document.title = 'Medicines — Lumi'; arg = decodeURIComponent(String(arg || ''));
  const m = arg.match(/^([0-9a-z])\/([0-9a-f-]{36})$/); if (m) return viewOTC(m[1], m[2]);
  const q = arg; const st = { n: 30 };
  shell('opg252', `<a class="back25" href="#/hb">‹ Home &amp; Body</a><h1>Over-the-counter medicines</h1><p class="lead">Look up a medicine to read its active and inactive ingredients, see which inactive ingredients are sugars or sweeteners, and check it against recalls. No dosing advice.</p>
   <form class="hbq25" role="search" onsubmit="return false"><input id="oq252" type="search" autocomplete="off" placeholder="Name, active ingredient or maker" aria-label="Search medicines" value="${esc(q)}"></form>
   <p class="small hbn25" id="on252" aria-live="polite"></p><ul class="sl252" id="ol252"></ul><div class="actions"><button class="btn" id="om252" hidden>Show more</button></div>${OTCNOTE}
   <p class="small">Product list: ${ext('https://open.fda.gov/apis/drug/ndc/', 'openFDA National Drug Code directory')} (marketed over-the-counter human drugs, CC0). You can also scan a barcode: if no food or Home &amp; Body product matches, Lumi checks this list.</p>`);
  let tm; const fa = n => `<li><a class="sr252" href="${otcLink(n.r, n.sh)}"><b>${esc(n.r[1])}</b><span>${esc(n.r[3])} · ${esc(n.r[4] || '')}</span>${norm(n.r[2]) === norm(n.r[1]) ? '' : `<span class="small">${esc((n.r[2] || '').slice(0, 90))}</span>`}</a></li>`;
  const run = async () => { const v = $('#oq252').value.trim(); if (!v) { $('#on252').textContent = 'Type a name such as ibuprofen, Tylenol or a store brand.'; $('#ol252').innerHTML = ''; $('#om252').hidden = true; return; }
    if (/^\d{8,14}$/.test(v)) { try { const I = await oIdx(); const h = I.u[v.replace(/^0+/, '')]; if (h) { location.hash = '#/otc/' + h[0] + '/' + h[1]; return; } } catch { } $('#on252').textContent = "That barcode isn't in Lumi's medicine list."; $('#ol252').innerHTML = ''; return; }
    $('#on252').textContent = 'Searching…'; let res; try { res = await otcSearch(v); } catch (e) { $('#on252').textContent = "Couldn't load the medicine list: " + e.message; return; }
    if ($('#oq252').value.trim() !== v) return; st.res = res;
    $('#on252').textContent = `${NF(res.length)} medicine${res.length === 1 ? '' : 's'}`; $('#ol252').innerHTML = res.slice(0, st.n).map(fa).join('') || '<li class="card empty"><b>No medicines match</b>Try a shorter name or the active ingredient.</li>'; $('#om252').hidden = res.length <= st.n; };
  $('#oq252').oninput = () => { clearTimeout(tm); st.n = 30; tm = setTimeout(run, 200); }; $('#om252').onclick = () => { st.n += 50; $('#ol252').innerHTML = st.res.slice(0, st.n).map(fa).join(''); $('#om252').hidden = st.res.length <= st.n; };
  if (q) run(); }
const INACT_RX = /sugar|sucrose|dextrose|glucose|fructose|syrup|sorbitol|xylitol|maltitol|mannitol|isomalt|erythritol|sucralose|aspartame|saccharin|acesulfame|stevia|lactose|honey|molasses|maltodextrin|sweetener/i;
async function viewOTC(sh, sid) { document.title = 'Medicine — Lumi'; const H0 = location.hash; shell('opg252', `<a class="back25" href="#/otc">‹ Medicines</a>${skel(3)}`);
  let rec = null, idx = {}; try { const S = await oShard(sh); const r = S.find(x => x[0] === sid); rec = r ? rec2o(r) : null; idx = await oIdx().catch(() => ({})); } catch (e) { app.innerHTML = errCard(e.message, '<a class="btn" href="#/otc">Medicines</a>'); return; }
  if (location.hash !== H0) return;
  if (!rec) { shell('opg252', `<a class="back25" href="#/otc">‹ Medicines</a><div class="card empty"><b>Not in Lumi's medicine list</b>It may no longer be marketed.<div class="actions"><a class="btn pri" href="#/otc">Search medicines</a></div></div>`); return; }
  const head = `<a class="back25" href="#/otc">‹ Medicines</a><div class="card"><h1>${esc(rec.b)}</h1><p class="small">${esc(rec.l)} · ${esc(rec.f)}${rec.u.length ? ' · UPC ' + esc(rec.u[0]) : ''}${rec.n.length ? ' · NDC ' + esc(rec.n.join(', ')) : ''}</p><p class="small">Over-the-counter drug as listed in FDA's NDC directory. Active ingredients on the directory: ${esc(rec.g || 'not listed')}.</p></div>`;
  shell('opg252', head + `<div id="olab252">${skel(2)}</div><div id="orec252"></div>${OTCNOTE}<p class="small">${ext('https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=' + enc(sid), 'Full label on DailyMed')} · ${ext('https://open.fda.gov/apis/drug/label/', 'openFDA drug label')} (CC0) · FDA NDC directory as of ${esc(idx.ndcAsof || '')}.</p>`);
  /* recalls: strong = an NDC or UPC on a recall notice, possible = same brand and product words */
  (async () => { try { const [U, R] = await Promise.all([UI.recUPC(), UI.recAll()]); const strong = new Map(); const add = k => { (U.m.get(k) || []).forEach(i => { const a = R.items[i]; if (a) strong.set(a[0], a); }); };
      rec.n.forEach(n => add('N' + n)); rec.u.forEach(u => add(u.replace(/^0+/, '')));
      const m = await UI.recallsFor({ code: '', name: rec.b + ' ' + rec.g, brand: rec.l.split(/[ ,]/)[0] }); m.possible = m.possible.filter(a => !strong.has(a[0])); m.strong = [...strong.values()]; m.asof = m.asof || U.asof;
      if (location.hash !== H0) return; const box = $('#orec252'); if (!box) return;
      box.innerHTML = (m.strong.length || m.possible.length) ? UI.recallCard(m) : `<div class="card rcnone251"><p class="small">No recall found for this product's NDC or barcode in Lumi's recall data (CPSC and FDA, as of ${esc(m.asof)}). That doesn't mean there isn't one: check ${ext('https://www.fda.gov/drugs/drug-safety-and-availability/drug-recalls', 'fda.gov drug recalls')}. <a href="#/recalls/d">Drug recalls</a></p></div>`; } catch (e) { console.warn('otc recall', e); } })();
  let lab = null; try { const j = await getJSON(FDA + '?search=' + enc('openfda.spl_set_id:"' + sid + '"') + '&limit=1', 15000); lab = (j.results || [])[0] || null; } catch (e) { lab = false; }
  if (location.hash !== H0) return; const box = $('#olab252'); if (!box) return;
  if (!lab) { box.innerHTML = `<div class="card cv25"><h2>Couldn't load the label ingredients</h2><p>${lab === false ? "openFDA didn't answer" : 'openFDA has no label text for this product'}. Read the Drug Facts on the package, or see the label on DailyMed below.</p>${lab === false ? '<div class="actions"><button class="btn" onclick="route()">Try again</button></div>' : ''}</div>`; return; }
  const t1 = x => (Array.isArray(x) ? x.join(' ') : String(x || '')).replace(/\s+/g, ' ').trim();
  const act = t1(lab.active_ingredient).replace(/^active ingredients?( \([^)]*\))?:?\s*/i, ''), pur = t1(lab.purpose).replace(/^purposes?:?\s*/i, ''), ina = t1(lab.inactive_ingredient).replace(/^inactive ingredients?:?\s*/i, '');
  const ks = ina ? ina.split(/[,;]| and /i).map(x => x.trim()).filter(x => INACT_RX.test(x)) : [];
  box.innerHTML = `<div class="card"><h2>Active ingredient${act ? 's' : ''}</h2><p>${act ? esc(act.slice(0, 700)) : 'Not listed in the label text.'}</p>${pur ? `<p class="small">Purpose: ${esc(pur.slice(0, 300))}</p>` : ''}</div>
   <div class="card"><h2>Inactive ingredients</h2>${ina ? `<p class="ing25">${esc(ina.slice(0, 1800))}</p>${ks.length ? `<p class="wsum252"><b>${ks.length} sugar or sweetener ingredient${ks.length === 1 ? '' : 's'} listed:</b> ${esc([...new Set(ks)].join('; '))}</p>` : '<p class="small">No sugar or sweetener found in the inactive ingredients listed.</p>'}` : `<p><b>Couldn't verify.</b> The label text on file lists no inactive ingredients.</p>`}<p class="small">Label version ${esc(dateFmt(lab.effective_time))}. Manufacturers change formulas, so check the package.</p></div>${ina ? warnCard22({ ing: ina }) : ''}`; }

/* =====================  SUPPLEMENTS (NIH DSLD)  ===================== */
const dsld = (path, ms) => getJSON(DSLD + path, ms || 15000);
const fmtUPC = c => c.length === 12 ? `${c[0]} ${c.slice(1, 6)} ${c.slice(6, 11)} ${c[11]}` : c.length === 13 && c[0] === '0' ? fmtUPC(c.slice(1)) : c;
async function dsldByUPC(code) { code = String(code).replace(/\D/g, ''); if (code.length < 8) return null; const want = code.replace(/^0+/, ''); const forms = [...new Set([fmtUPC(code), code])];
  for (const f of forms) { let j; try { j = await dsld('search-filter?q=' + enc('"' + f + '"') + '&size=4', 8000); } catch { continue; }
    for (const h of (j.hits || []).slice(0, 4)) { try { const l = await dsld('label/' + h._id, 8000); if (String(l.upcSku || '').replace(/\D/g, '').replace(/^0+/, '') === want) return String(h._id); } catch { } } }
  return null; }
const unitTxt = (u, q) => { u = String(u || '').toLowerCase(); return q === 1 ? u.replace(/y\(ies\)/, 'y').replace(/\(s\)/g, '') : u.replace(/y\(ies\)/, 'ies').replace(/\(s\)/g, 's'); };
const srvTxt = s => !s ? '' : `${s.maxQuantity == null || s.minQuantity === s.maxQuantity ? num(s.minQuantity, 2) : num(s.minQuantity, 2) + '–' + num(s.maxQuantity, 2)} ${unitTxt(s.unit, s.maxQuantity == null ? s.minQuantity : s.maxQuantity)}`.trim() + (s.notes && s.notes.length < 60 ? ` (${s.notes})` : '');
async function viewSuppHome(arg) { document.title = 'Supplements — Lumi'; arg = decodeURIComponent(String(arg || ''));
  if (/^\d{1,7}$/.test(arg)) return viewSupp(arg);
  let q = arg, st = { from: 0, hits: [], total: 0 };
  shell('spg252', `<a class="back25" href="#/hb">‹ Home &amp; Body</a><h1>Supplements</h1><p class="lead">Search the NIH Dietary Supplement Label Database. For each label Lumi shows the serving, sugar and carbohydrate per serving, hidden sugars in the other ingredients, and recalls. No dosing advice.</p>
   <form class="hbq25" id="sf252" role="search"><div class="wfr252"><input id="sq252" type="search" autocomplete="off" placeholder="Product, brand, or a barcode" aria-label="Search supplements" value="${esc(q)}"><button class="btn pri" type="submit">Search</button></div></form>
   <p class="small hbn25" id="sn252" aria-live="polite"></p><ul class="sl252" id="sl252"></ul><div class="actions"><button class="btn" id="sm252" hidden>Show more</button></div>${OTCNOTE}
   <p class="small">Data: ${ext('https://dsld.od.nih.gov/', 'NIH Office of Dietary Supplements, Dietary Supplement Label Database')} (U.S. government public data), searched live from your device when you search. Labels are as entered by NIH and may be older than the product in your hand.</p>`);
  const item = h => { const s = h._source || {}; const off = (s.events || []).some(e => /off market/i.test(e.type)); const sv = (s.servingSizes || [])[0];
    return `<li><a class="sr252" href="#/supp/${esc(h._id)}"><b>${esc(s.fullName || 'Supplement')}</b><span>${esc(s.brandName || '')}${s.physicalState ? ' · ' + esc(s.physicalState.langualCodeDescription) : ''}${sv ? ' · serving ' + esc(srvTxt(sv)) : ''}</span>${off ? '<span class="wb252">Off the market (per DSLD)</span>' : ''}</a></li>`; };
  const search = async more => { const v = $('#sq252').value.trim(); if (!v) { $('#sn252').textContent = 'Type a product or brand, such as “vitamin D gummies”.'; return; } q = v;
    if (/^\d{8,14}$/.test(v)) { $('#sn252').textContent = 'Looking up the barcode…'; const id = await dsldByUPC(v).catch(() => null); if (id) { location.hash = '#/supp/' + id; return; } $('#sn252').textContent = 'No supplement label with that barcode in DSLD (it only lists some barcodes).'; $('#sl252').innerHTML = ''; return; }
    if (!more) { st = { from: 0, hits: [], total: 0 }; $('#sl252').innerHTML = ''; } $('#sn252').textContent = 'Searching…'; $('#sm252').hidden = true;
    let j; try { j = await dsld('browse-products?method=by_keyword&q=' + enc(v) + '&size=20&from=' + st.from); } catch (e) { $('#sn252').innerHTML = `Couldn't reach the NIH database (${esc(e.message)}). <button class="btn" id="sre252">Try again</button>`; $('#sre252').onclick = () => search(more); return; }
    if ($('#sq252').value.trim() !== v) return; st.total = (j.total && j.total.value) || 0; st.hits = st.hits.concat(j.hits || []); st.from = st.hits.length;
    $('#sn252').textContent = `${NF(st.total)} label${st.total === 1 ? '' : 's'}${st.total > st.hits.length ? `, showing ${st.hits.length}` : ''}`; $('#sl252').innerHTML = st.hits.map(item).join('') || '<li class="card empty"><b>No supplements match</b>Try fewer words.</li>'; $('#sm252').hidden = st.total <= st.hits.length; };
  $('#sf252').onsubmit = e => { e.preventDefault(); search(false); }; $('#sm252').onclick = () => search(true); if (q) search(false); }
/* the label's one serving (the Supplement Facts box serving) and its numbers */
function suppModel(Lb) { const sv = Lb.servingSizes || []; const sfb = sv.find(s => s.inSFB) || sv[0] || null; const flat = [];
  (function walk(rs, d) { for (const r of rs || []) { flat.push({ r, d }); walk(r.nestedRows, d + 1); } })(Lb.ingredientRows, 0);
  const pick = r => { const qs = r.quantity || []; if (!qs.length) return null; let c = sfb ? qs.filter(q => q.servingSizeOrder === sfb.order) : qs; if (!c.length) c = qs; return (sfb && c.find(q => q.servingSizeQuantity === sfb.minQuantity)) || c[0]; };
  const asG = q => { if (!q || q.quantity == null) return null; const u = String(q.unit || '').toLowerCase(); const v = +q.quantity; return /^gram/.test(u) || u === 'g' ? v : u === 'mg' ? v / 1000 : /^(mcg|µg|ug)/.test(u) ? v / 1e6 : null; };
  const find = rx => { const f = flat.find(x => rx.test(x.r.name || '')); return f ? pick(f.r) : null; };
  const g = (rx, mg) => { const q = find(rx); if (!q) return { v: null }; const gr = asG(q); return { v: gr == null ? null : (mg ? gr * 1000 : gr), lt: q.operator === '<' }; };
  const kq = flat.find(x => /^calories$/i.test(x.r.name || '')); const kqq = kq ? pick(kq.r) : null;
  const nut = { kcal: kqq && kqq.quantity != null ? { v: +kqq.quantity, lt: kqq.operator === '<' } : { v: null }, carbs: g(/^total carbohydrates?$|^carbohydrates?$/i), sugars: g(/^total sugars?$|^sugars?$/i), added: g(/^added sugars?$/i), fiber: g(/dietary fiber|^fiber$/i), fat: g(/^total fat$/i), sat: g(/^saturated fat$/i), protein: g(/^protein$/i), sodium: g(/^sodium$/i, true) };
  const NUTRX = /^(calories|total carbohydrates?|carbohydrates?|total sugars?|sugars?|added sugars?|dietary fiber|fiber|total fat|saturated fat|protein|sodium)$/i;
  const facts = flat.filter(x => !NUTRX.test(x.r.name || '')).map(x => { const q = pick(x.r); const dv = q && (q.dailyValueTargetGroup || [])[0]; return { name: x.r.name, d: x.d, amt: q && q.quantity != null ? `${q.operator && q.operator !== '=' ? q.operator + ' ' : ''}${num(q.quantity, 3)} ${q.unit || ''}` : '', dv: dv ? (dv.percent != null ? `${dv.operator && dv.operator !== '=' ? dv.operator : ''}${dv.percent}%` : '†') : '' }; });
  const other = ((Lb.otheringredients || {}).ingredients || []).map(i => i.name).filter(Boolean); const ot = (Lb.otheringredients || {}).text; const ing = [...other, ...(ot ? [ot] : [])].join(', ');
  return { sfb, nut, facts, other, ing }; }
function suppScore(m, name, brand) { const n = m.nut; if (n.kcal.v == null && n.carbs.v == null && n.sugars.v == null) return null;
  const nn = { kcal: n.kcal.v, carbs: n.carbs.v, sugars: n.sugars.v, added: n.added.v, fiber: n.fiber.v, fat: n.fat.v, sat: n.sat.v, protein: n.protein.v, sodiumMg: n.sodium.v };
  const p = { id: 'dsld', code: '', src: 'dsld', name, brand, servQ: 100, serv: '1 serving', nova: null, additives: [], ing: m.ing, cat: 'Supplement', cats: '', naLabel: true, liquid: false, portions: [['1 serving', 100]], meta: { src: 'NIH DSLD', perItem: true }, n: nn };
  try { const s = S.score(p), h = HR(p); return { c: s.score, h: h.score, p }; } catch (e) { console.warn('supp score', e); return null; } }
async function viewSupp(id) { document.title = 'Supplement — Lumi'; const H0 = location.hash; shell('spg252', `<a class="back25" href="#/supp">‹ Supplements</a>${skel(3)}`);
  let Lb; try { Lb = await dsld('label/' + enc(id), 15000); } catch (e) { app.innerHTML = errCard("The NIH supplement database didn't answer (" + e.message + ')', '<a class="btn" href="#/supp">Supplements</a>'); return; }
  if (location.hash !== H0) return;
  if (!Lb || !Lb.id) { shell('spg252', `<a class="back25" href="#/supp">‹ Supplements</a><div class="card empty"><b>No supplement label ${esc(id)}</b><div class="actions"><a class="btn pri" href="#/supp">Search supplements</a></div></div>`); return; }
  const m = suppModel(Lb), n = m.nut, sc = suppScore(m, Lb.fullName, Lb.brandName); const nm = Lb.fullName || 'Supplement';
  const val = (x, d, unit) => x.v == null ? '<span class="na252">not listed</span>' : `${x.lt ? 'less than ' : ''}${num(x.v, d)} ${unit}`;
  const off = Lb.offMarket === 1 || (Lb.events || []).some(e => /off market/i.test(e.type));
  const mf = (Lb.contacts || []).find(c => (c.types || []).includes('Manufacturer')) || (Lb.contacts || [])[0];
  const A = LumiWarn.analyze(m.ing || ''); const hidden = m.ing ? A.sugars.length : null;
  const none = n.kcal.v == null && n.carbs.v == null && n.sugars.v == null; const sc20 = typeof scores20 === 'function' ? scores20(sc ? sc.h : null, sc ? sc.c : null) : '';
  shell('spg252', `<a class="back25" href="#/supp">‹ Supplements</a>
   <div class="card sh252"><h1>${esc(nm)}</h1><p class="small">${esc(Lb.brandName || '')}${Lb.physicalState ? ' · ' + esc(Lb.physicalState.langualCodeDescription) : ''}${Lb.upcSku ? ' · UPC ' + esc(Lb.upcSku) : ''}${mf && mf.contactDetails && mf.contactDetails.name ? ' · made by ' + esc(mf.contactDetails.name) : ''}</p>
    ${off ? '<p class="wb252">Off the market, per DSLD</p>' : ''}
    <div class="ss252">${sc20}<div class="sd252"><b>${m.sfb ? 'Per serving: ' + esc(srvTxt(m.sfb)) : 'Serving not listed'}</b><span class="small">${Lb.servingsPerContainer ? 'About ' + esc(Lb.servingsPerContainer) + ' servings per container. ' : ''}${sc ? "Lumi's food scores applied to one serving of this label. A supplement isn't a food, so treat them as a guide to the sugar and carbs it adds." : "Couldn't score: this label lists no calories, carbohydrate or sugar."}</span></div></div></div>
   <div class="card"><h2>Sugar and carbs per serving</h2><div class="tbw252"><table class="tb252"><caption class="vh">Sugar and carbohydrate per serving</caption><tbody>
    <tr><th scope="row">Sugars</th><td>${val(n.sugars, 1, 'g')}</td></tr>${n.added.v != null ? `<tr class="sub252"><th scope="row">Added sugars</th><td>${val(n.added, 1, 'g')}</td></tr>` : ''}
    <tr><th scope="row">Total carbohydrate</th><td>${val(n.carbs, 1, 'g')}</td></tr><tr class="sub252"><th scope="row">Fiber</th><td>${val(n.fiber, 1, 'g')}</td></tr>
    <tr><th scope="row">Calories</th><td>${n.kcal.v == null ? '<span class="na252">not listed</span>' : (n.kcal.lt ? 'less than ' : '') + num(n.kcal.v, 0)}</td></tr></tbody></table></div>
    <p class="small">${none ? "Couldn't verify: the label doesn't list sugar, carbohydrate or calories, so Lumi can't tell how much sugar it adds. See the other ingredients below. " : ''}Lumi shows sugar first, then total carbohydrate, as printed. It doesn't subtract fiber or sugar alcohols.</p></div>
   <div class="card ${hidden ? 'cv25' : ''}"><h2>Hidden sugars</h2><p class="wsum252">${hidden == null ? "<b>Couldn't verify.</b> No other-ingredients list is on file." : hidden ? `<b>${hidden} kind${hidden === 1 ? '' : 's'} of sugar</b> in the other ingredients: ${esc(A.sugars.join(', '))}.` : '<b>No added sugars found</b> in the other ingredients on file.'}</p></div>
   ${m.ing ? warnCard22({ ing: m.ing }) : ''}
   <div id="srec252"></div>
   <div class="card"><h2>Supplement Facts as printed</h2>${m.facts.length ? `<div class="tbw252"><table class="tb252"><caption class="vh">Supplement Facts</caption><thead><tr><th scope="col">Ingredient</th><th scope="col">Per serving</th><th scope="col">% Daily Value</th></tr></thead><tbody>${m.facts.slice(0, 60).map(f => `<tr class="${f.d ? 'sub252' : ''}"><th scope="row">${esc(f.name)}</th><td>${esc(f.amt)}</td><td>${esc(f.dv)}</td></tr>`).join('')}</tbody></table></div>${m.facts.length > 60 ? `<p class="small">Showing 60 of ${m.facts.length} rows. See DSLD for the rest.</p>` : ''}<p class="small">† Daily Value not established. This is what the label says it contains, not a recommendation.</p>` : "<p><b>Couldn't verify.</b> No ingredient rows on file.</p>"}
    ${m.other.length ? `<h3 class="h3s252">Other ingredients</h3><p class="ing25">${esc(m.other.join(', '))}</p>` : ''}</div>
   ${OTCNOTE}
   <p class="small">${ext('https://dsld.od.nih.gov/label/' + enc(Lb.id), 'This label on DSLD')} · entered ${esc(dateFmt(Lb.entryDate))}. Source: NIH Office of Dietary Supplements (U.S. government public data). Formulas change; check your package.</p>`);
  (async () => { try { const mm = await UI.recallsFor({ code: Lb.upcSku || '', name: nm, brand: Lb.brandName || '' }); if (location.hash !== H0) return; const box = $('#srec252'); if (!box) return;
      box.innerHTML = (mm.strong.length || mm.possible.length) ? UI.recallCard(mm) : (mm.asof ? `<div class="card rcnone251"><p class="small">No recall found for this product in Lumi's recall data (CPSC and FDA, as of ${esc(mm.asof)}). That doesn't mean there isn't one: check ${ext('https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts', 'fda.gov')}. <a href="#/recalls">All recalls</a></p></div>` : ''); } catch (e) { console.warn('supp recall', e); } })(); }

/* =====================  integration  ===================== */
UI.browse = (UI.browse || []).concat(['<a href="#/water"><b>Local water quality</b><span>Violations, lead and PFAS for your ZIP</span></a>', '<a href="#/supp"><b>Supplements</b><span>Sugar and carbs per serving (NIH)</span></a>', '<a href="#/otc"><b>Medicines</b><span>Ingredients, sweeteners and recalls</span></a>']);
UI.tools = (UI.tools || []).concat(['<a href="#/water"><b>Local water quality</b><span>EPA records for your ZIP</span></a>', '<a href="#/supp"><b>Supplements</b><span>NIH label database</span></a>', '<a href="#/otc"><b>Medicines</b><span>Over-the-counter, with recalls</span></a>']);
const cp0 = self.cosProduct;
self.cosProduct = async function (code) { const r = await cp0.apply(this, arguments); if (r) return r; code = String(code).replace(/\D/g, ''); if (code.length < 8) return null;
  try { const I = await oIdx(); const h = I.u[code.replace(/^0+/, '')]; if (h) return { id: code, code, src: 'otc25', hb: 1, sh: h[0], sid: h[1] }; } catch { }
  try { const id = await dsldByUPC(code); if (id) return { id: code, code, src: 'dsld', hb: 1, did: id }; } catch { }
  return null; };
const vc0 = self.viewCosProduct;
self.viewCosProduct = async function (id, pre, scanned) { if (!pre && /^\d{8,14}$/.test(String(id))) pre = await self.cosProduct(id).catch(() => null);
  if (pre && pre.src === 'otc25') return viewOTC(pre.sh, pre.sid); if (pre && pre.src === 'dsld') return viewSupp(pre.did); return vc0.call(this, id, pre, scanned); };
const RT = { water: viewWaterHome, supp: viewSuppHome, otc: viewOTCHome };
if (typeof tab19 === 'function') { const t0 = tab19; self.tab19 = function (view) { if (RT[view]) return 'browse'; return t0.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh = viewHome; self.viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i);
  if (RT[v]) return RT[v](i < 0 ? '' : h.slice(i + 1)); return vh.apply(this, arguments); }; }
if (/^#\/(water|supp|otc)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(['💧', 'Supplements, medicines and local water (25.2)', 'Look up a supplement (NIH label database) to see sugar and carbs per serving, hidden sugars and recalls. Look up an over-the-counter medicine to read its ingredients and see sugar or sweetener inactive ingredients, with recalls. Type a ZIP code to see EPA records for the water system: violations, lead and copper, and PFAS screening. None of it is dosing advice, and none of it says anything is "safe".']);
})();
