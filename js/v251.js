/* Lumi 25.1: laundry and cleaning products (Open Products Facts + EPA Safer Choice) in Home & Body, and recalls (CPSC + openFDA enforcement):
   recall warnings on matching food and Home & Body product pages, and a recalls page (#/recalls[/<source>[/<query>]]).
   Recall data is a static snapshot (data/recalls25); "possible match" means brand + product words only, so it says to compare the notice. */
(() => {
'use strict';
const UI = window.HB25UI; if (!UI || !window.HB25) { console.warn('v251: v25 missing'); return; }
const norm = HB25.norm, ext = UI.ext, NF = UI.NF;
const BASE = 'data/recalls25/';
/* ---------- cleaning ---------- */
UI.withClean = true; UI.cats = ['laundry', 'dish', 'surface', 'air', 'otherc'];
UI.FILT.sc = ['EPA Safer Choice', d => d.bits & 128];
UI.browse = (UI.browse || []).concat(['<a href="#/hb/laundry"><b>Laundry &amp; cleaning</b><span>Detergent, dish soap, cleaners, with EPA Safer Choice</span></a>', '<a href="#/recalls"><b>Recalls</b><span>CPSC and FDA, with warnings on matching products</span></a>']);
UI.tools = (UI.tools || []).concat(['<a href="#/recalls"><b>Recalls</b><span>CPSC and FDA notices</span></a>']);
const saferURL = 'https://www.epa.gov/saferchoice/products';
UI.EXTRAS.push(async rec => { if (!rec.sc) return '';
  let S = null; try { S = (await UI.load('safer', 'data/hb25/safer.json', 20000)).items.find(x => x.id === rec.sc); } catch { }
  const bits = S ? [S.p ? 'Partner: ' + S.p : '', S.t && S.t.length ? 'Type: ' + S.t.slice(0, 3).join(', ') : '', S.s && S.s.length ? 'For: ' + S.s.join(' and ').toLowerCase() + ' use' : ''].filter(Boolean) : [];
  return `<div class="card sc251"><h2>✓ EPA Safer Choice</h2><p>This product is on EPA's Safer Choice list. EPA reviews every ingredient in a certified product against its criteria for human health and the environment, and the product also has to perform.</p>${bits.length ? `<p class="small">${bits.map(esc).join(' · ')}</p>` : ''}
   <p class="small">A positive label, not a guarantee that a product suits everyone, and Lumi doesn't use it to hide flags. Source: ${ext(saferURL, 'EPA Safer Choice product list')}.</p></div>`; });
/* ---------- recalls ---------- */
const SRCN = { c: 'Consumer product (CPSC)', f: 'Food (FDA)', d: 'Drug (FDA)', v: 'Device (FDA)' };
const SRCS = { c: 'CPSC', f: 'FDA', d: 'FDA', v: 'FDA' };
const CLS = { 1: 'Class I: most serious', 2: 'Class II', 3: 'Class III', 0: '' };
const L = {}; const lazy = (k, f) => L[k] || (L[k] = f().catch(e => { delete L[k]; throw e; }));
const recAll = () => lazy('r', () => UI.load('rr', BASE + 'r.json', 60000).then(j => { j.items.forEach(a => { a._k = ' ' + norm(a[4] + ' ' + a[5]) + ' '; a._s = ' ' + norm(a[3] + ' ' + a[4] + ' ' + a[5] + ' ' + a[6]) + ' '; a._t = new Set(norm(a[4]).split(' ').filter(w => w.length >= 4)); }); return j; }));
const recUPC = () => lazy('u', () => UI.load('ru', BASE + 'u.json', 30000).then(j => { const m = new Map(); for (const [k, v] of Object.entries(j.u)) if (!/^N/.test(k)) m.set(k.replace(/^0+/, ''), v); return { asof: j.asof, m }; }));
const STOP = new Set('original classic fresh natural organic flavor flavored flavour style with free light lite large small medium size pack count ounce ounces whole mild sweet salted unsalted plain regular family value brand product this that from made food foods each case bottle container'.split(' '));
const url = a => a[1] === 'c' ? (/^https:\/\/(www\.)?cpsc\.gov\//.test(a[8]) ? a[8] : 'https://www.cpsc.gov/Recalls') : 'https://www.accessdata.fda.gov/scripts/ires/index.cfm?Event=' + encodeURIComponent(a[8]);
const fd = d => { d = String(d); return d.length === 8 ? new Date(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : d; };
function nameTokens(name, brand) { const b = new Set(norm(brand).split(' ')); return [...new Set(norm(name).split(' ').filter(w => w.length >= 4 && !STOP.has(w) && !b.has(w) && !/^\d+$/.test(w)))]; }
/* strong: barcode on a recall. possible: brand words + at least 2 distinctive product words in a recall's product text */
async function recallsFor(p) { const out = { strong: [], possible: [], asof: '' };
  const code = String(p.code || '').replace(/\D/g, '').replace(/^0+/, '');
  try { const U = await recUPC(); out.asof = U.asof; if (code.length >= 8 && U.m.has(code)) { const R = await recAll(); out.strong = U.m.get(code).map(i => R.items[i]).filter(Boolean); } } catch { return out; }
  const bn = norm(p.brand || ''), tk = nameTokens(p.name || '', p.brand || '');
  if (bn.length >= 3 && tk.length >= 2) { try { const R = await recAll(); const seen = new Set(out.strong.map(a => a[0])); const bw = ' ' + bn + ' ';
      for (const a of R.items) { if (seen.has(a[0]) || !a._k.includes(bw)) continue; const hit = tk.filter(t => a._t.has(t)).length; if (hit >= 2) { out.possible.push(a); if (out.possible.length >= 12) break; } } } catch { } }
  return out; }
const item = a => `<li class="rc251 s-${a[1]}"><div class="rh251"><b>${esc(a[3])}</b>${a[7] ? `<span class="cl251 c${a[7]}">${esc(CLS[a[7]])}</span>` : ''}</div><div class="rm251">${esc(SRCN[a[1]])} · ${esc(fd(a[2]))}${a[5] ? ' · ' + esc(a[5]) : ''}${a[10] === 'O' ? ' · ongoing' : a[10] === 'T' ? ' · closed' : ''}</div>${a[6] ? `<p>${esc(a[6])}</p>` : ''}<a href="${esc(url(a))}" target="_blank" rel="noopener">Official notice (${SRCS[a[1]]}) ›</a></li>`;
function recallCard(m, where) { if (!m.strong.length && !m.possible.length) return '';
  const q = encodeURIComponent((m.strong[0] || m.possible[0])[3].split(/[,:;(]/)[0].slice(0, 40));
  return `<div class="card rcall251" role="note">${m.strong.length ? `<h2>⚠ Recall: this barcode is on a recall notice</h2><ul class="rcl251">${m.strong.slice(0, 3).map(item).join('')}</ul>` : ''}
   ${m.possible.length ? `<h2 class="${m.strong.length ? 'h2b' : ''}">⚠ Possible recall match</h2><p class="small">Matched by brand and product words only, so it may be a different product. Compare the name, size and lot or date codes on the official notice before deciding anything.</p><ul class="rcl251">${m.possible.slice(0, 3).map(item).join('')}</ul>${m.possible.length > 3 ? `<p class="small"><a href="#/recalls/all/${q}">See ${m.possible.length - 3}+ more like this</a></p>` : ''}` : ''}
   <p class="small">Recall data: CPSC and FDA, as of ${esc(m.asof)}. <a href="#/recalls">All recalls</a></p></div>`; }
UI.recallsFor = recallsFor; UI.recAll = recAll; UI.recUPC = recUPC;
UI.EXTRAS.push(async rec => { const m = await recallsFor({ code: rec.c, name: rec.n, brand: rec.b }); if (m.strong.length || m.possible.length) return recallCard(m);
  return m.asof ? `<div class="card rcnone251"><p class="small">No recall found for this product in Lumi's recall data (CPSC and FDA, as of ${esc(m.asof)}). That doesn't mean there isn't one: check ${ext('https://www.cpsc.gov/Recalls', 'cpsc.gov')} and ${ext('https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts', 'fda.gov')}. <a href="#/recalls">All recalls</a></p></div>` : ''; });
/* food product pages */
if (typeof viewProduct === 'function') { const vp = viewProduct; self.viewProduct = async function (id) { const r = await vp.apply(this, arguments);
  try { const p = memo.get(id); const h = location.hash; if (!p || !h.includes('/product/') || /^(r-|ms-)/.test(String(id)) || (!p.brand && !p.code)) return r;
    const m = await recallsFor({ code: p.code || (/^\d{8,14}$/.test(id) ? id : ''), name: p.name, brand: p.brand }); if (location.hash !== h || document.getElementById('rcal251')) return r;
    const html = recallCard(m); if (html) { const place = () => { const c = app.querySelector(':scope > .card:not(.rcall251)') || app.querySelector('.card:not(.rcall251)'); if (!c) return; let w = document.getElementById('rcal251'); if (!w) { c.insertAdjacentHTML('afterend', html.replace('class="card rcall251"', 'class="card rcall251" id="rcal251"')); return; } if (c.nextElementSibling !== w) c.after(w); }; place();
      /* the product page can re-render after its extras load: put the warning back, until the user leaves this product */
      const mo = new MutationObserver(() => { if (location.hash !== h) { mo.disconnect(); return; } place(); }); mo.observe(app, { childList: true }); setTimeout(() => mo.disconnect(), 60000); } } catch (e) { console.warn('recall check', e); } return r; }; }
/* recalls page */
async function viewRecalls(arg) {
  document.title = 'Recalls — Lumi'; const parts = String(arg || '').split('/'); let src = ['c', 'f', 'd', 'v'].includes(parts[0]) ? parts[0] : 'all'; let q = decodeURIComponent(parts.slice(1).join('/') || '');
  app.innerHTML = `<section class="rcp251 pg13"><h1>Recalls</h1><p class="lead">Product recalls from the U.S. Consumer Product Safety Commission and the FDA, with warnings on matching products you scan.</p>${skel(3)}</section>`;
  let R; try { R = await recAll(); } catch (e) { app.innerHTML = `<div class="card empty"><b>Couldn't load recalls</b>${esc(e.message)}.<div class="actions"><button class="btn pri" onclick="route()">Retry</button></div></div>`; return; }
  if (!/^#\/recalls/.test(location.hash)) return;
  const st = { src, q, cls1: false, open: false, n: 30, live: [] };
  const SR = [['all', 'All'], ['c', 'Consumer products'], ['f', 'Food'], ['d', 'Drugs'], ['v', 'Devices']];
  app.innerHTML = `<section class="rcp251 pg13"><a class="back25" href="#/hb">‹ Home &amp; Body</a><h1>Recalls</h1>
   <p class="lead">Notices from the ${ext('https://www.cpsc.gov/Recalls', 'CPSC')} (consumer products) and the ${ext('https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts', 'FDA')} (food, drugs, devices), from late 2021. Data as of <b>${esc(R.asof)}</b>.</p>
   <form class="hbq25" role="search" onsubmit="return false"><input id="rq251" type="search" autocomplete="off" placeholder="Search a product, brand or company" aria-label="Search recalls" value="${esc(q)}"></form>
   <div class="chips hbc25" role="group" aria-label="Source">${SR.map(s => `<a class="chip${src === s[0] ? ' on' : ''}" data-s="${s[0]}" href="#/recalls${s[0] === 'all' ? '' : '/' + s[0]}">${s[1]}</a>`).join('')}</div>
   <div class="hbf25" role="group" aria-label="Filters"><button type="button" class="chip fb25" id="c1251" aria-pressed="false">Class I only</button><button type="button" class="chip fb25" id="op251" aria-pressed="false">Ongoing only (FDA)</button><button type="button" class="chip" id="lv251">Check CPSC for newer recalls</button></div>
   <p class="small hbn25" id="rn251" aria-live="polite"></p><ul class="rcl251 rcp" id="rl251"></ul><div class="actions"><button class="btn" id="rm251" hidden>Show more</button></div>
   <div class="card"><h2>How matching works</h2><p class="small">On a product page Lumi looks for the barcode in recall notices (a strong match), then for the same brand plus at least two distinctive product words (a <i>possible</i> match, which can be wrong). Many notices have no barcode, so Lumi can miss a recall. It can't know your lot or date code. Always check the official notice and the package. Class I is FDA's most serious class.</p><p class="small">Sources: ${ext('https://www.saferproducts.gov/RestWebServices/', 'CPSC Recalls API')}; ${ext('https://open.fda.gov/apis/food/enforcement/', 'openFDA enforcement reports')} (public domain, CC0). Devices: Class I only, since late 2021.</p></div></section>`;
  const all = () => st.live.concat(R.items);
  const ps = () => { const t = norm(st.q).split(' ').filter(Boolean); return all().filter(a => (st.src === 'all' || a[1] === st.src) && (!st.cls1 || a[7] === 1) && (!st.open || a[10] === 'O') && (!t.length || t.every(w => (a._s || ' ' + norm(a[3] + ' ' + a[4] + ' ' + a[5] + ' ' + a[6]) + ' ').includes(w)))); };
  const paint = () => { const l = ps(); $('#rn251').textContent = `${NF(l.length)} recall${l.length === 1 ? '' : 's'}`; $('#rl251').innerHTML = l.slice(0, st.n).map(item).join('') || '<li class="card empty"><b>No recalls match</b>Try a shorter search.</li>'; $('#rm251').hidden = l.length <= st.n; };
  $('#rq251').oninput = e => { st.q = e.target.value; st.n = 30; paint(); }; $('#rm251').onclick = () => { st.n += 50; paint(); };
  $('#c1251').onclick = e => { st.cls1 = !st.cls1; e.target.classList.toggle('on'); e.target.setAttribute('aria-pressed', st.cls1); paint(); };
  $('#op251').onclick = e => { st.open = !st.open; e.target.classList.toggle('on'); e.target.setAttribute('aria-pressed', st.open); paint(); };
  $('#lv251').onclick = async e => { const b = e.target; b.disabled = true; b.textContent = 'Checking CPSC…'; const since = (R.items.filter(a => a[1] === 'c')[0] || [0, 0, R.asof.replace(/-/g, '')])[2];
    const s = since.slice(0, 4) + '-' + since.slice(4, 6) + '-' + since.slice(6), e2 = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    try { const j = await getJSON(`https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=${s}&RecallDateEnd=${e2}`, 20000); const have = new Set(R.items.map(a => a[0]));
      if (!Array.isArray(j) || (j.length === 1 && !j[0].RecallID)) throw new Error("CPSC's service returned an error");
      st.live = j.filter(x => !have.has('c' + x.RecallID)).map(x => ['c' + x.RecallID, 'c', x.RecallDate.slice(0, 10).replace(/-/g, ''), String(x.Title || '').slice(0, 150), (x.Products || []).map(p => p.Name).join('; ').slice(0, 200), ((x.Manufacturers || [])[0] || {}).Name || '', ((x.Hazards || [])[0] || {}).Name || '', 0, x.URL, [], '']).sort((a, b) => b[2].localeCompare(a[2]));
      b.textContent = st.live.length ? `${st.live.length} newer CPSC recall${st.live.length === 1 ? '' : 's'} added` : 'No newer CPSC recalls'; paint(); }
    catch (err) { b.disabled = false; b.textContent = "CPSC didn't answer. Try again"; } };
  paint();
}
const RT = { recalls: viewRecalls };
if (typeof tab19 === 'function') { const t0 = tab19; self.tab19 = function (view) { if (view === 'recalls') return 'browse'; return t0.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh = viewHome; self.viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i);
  if (RT[v]) { app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim(); return RT[v](i < 0 ? '' : h.slice(i + 1)); } return vh.apply(this, arguments); }; }
if (/^#\/(recalls|hb|cos\/|product\/|cosmetics)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(['🧺', 'Laundry, cleaners and recalls (25.1)', 'Home & Body now covers laundry detergent, dish soap and cleaners (Open Products Facts, with an EPA Safer Choice badge) and checks them for PFAS, Prop 65 and other flags. New Recalls page (CPSC and FDA) and a warning on food and Home & Body product pages that match a recall by barcode, or possibly by brand and name.']);
})();
