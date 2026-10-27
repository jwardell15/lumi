// ===== Lumi 23.1: "Not medical advice" page, Privacy page, dose-estimate acknowledgement, first-run notice, Delete all my data =====
(() => {
  const UPD = 'Oct 26, 2026', ISSUES = 'https://github.com/jwardell15/lumi/issues';
  const K_ACK = 'doseAck231', K_FR = 'notice231';
  const acked = () => !!store.get(K_ACK, 0);
  const ext = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  const LINE = 'Lumi is an informational food-scoring tool, not medical advice. Never use it to decide an insulin dose.';
  const linksRow = () => `<a href="#/disclaimer">Not medical advice</a><span aria-hidden="true"> · </span><a href="#/privacy">Privacy</a>`;

  /* ---------- pages ---------- */
  function viewDisclaimer231() {
    document.title = 'Not medical advice — Lumi';
    app.innerHTML = `<div class="pg231">
    <h1>Not medical advice</h1>
    <p class="lead lead231">Lumi is an informational food-scoring tool. It is not a medical device, and it doesn't diagnose, treat or manage any condition.</p>
    <div class="card em231" role="note"><h2>In an emergency, call 911</h2><p>If you think you're having a medical emergency, such as a severe low, call 911 (or your local emergency number) right away. Don't wait on an app.</p></div>
    <div class="g231">
    <section class="card"><h2>Scores are opinions</h2><p>Lumi's scores are its own opinion, worked out from published nutrition data: food labels, Open Food Facts, USDA FoodData Central and restaurant chains' own nutrition info. That data can be incomplete, wrong or out of date, and products change their recipes.</p><p><b>Always check the package or label in your hand.</b> If it disagrees with Lumi, the label wins.</p></section>
    <section class="card"><h2>Never use Lumi for insulin dosing</h2><p>Don't use Lumi to decide how much insulin to take. The optional carb ÷ ratio estimate in Settings is off by default, is simple arithmetic on label numbers, and leaves out everything else that matters (insulin on board, activity, illness, fat and protein). Use the plan from your care team and your own meter, CGM or pump.</p></section>
    <section class="card"><h2>Allergens can't be verified</h2><p>Lumi reads ingredient lists and allergen tags, but it can't verify them. When it says <i>couldn't verify</i>, that's exactly what it means, and Lumi never calls a food safe. With a serious allergy, read the label and check with the maker or restaurant.</p></section>
    <section class="card"><h2>Restaurant info can change</h2><p>Restaurant data comes from each chain's published nutrition info. Chains change recipes and portions without notice, and food varies by location and by who's cooking.</p></section>
    <section class="card"><h2>Your care team comes first</h2><p>Follow the advice of your doctor, diabetes educator or dietitian. If something in Lumi doesn't match what they told you, go with them.</p></section>
    </div>
    <p class="small upd231">Last updated ${UPD}. See also <a href="#/privacy">Privacy</a>. Questions or a mistake to report: ${ext(ISSUES, 'GitHub issues')}.</p></div>`;
  }

  const SVC = [
    ['GitHub Pages', 'jwardell15.github.io', 'Every visit', 'Hosts the app itself (pages, code, styles, fonts). Your browser sends the usual request details, such as your IP address and browser type.'],
    ['Cloudflare Pages', 'lumi-data-cky.pages.dev', 'When you search, browse or open a product, and when you tap Save for offline', 'Lumi\'s food database files, food photos and the offline pack. Requests are for data files; nothing you saved is sent.'],
    ['Open Food Facts', 'world.openfoodfacts.org, us.openfoodfacts.org, images.openfoodfacts.org, static.openfoodfacts.org', 'When you search (your search words, unless Lumi\'s own index already has plenty of matches), when you open or scan a barcode (the barcode), and to show product photos', 'Product details and photos.'],
    ['USDA FoodData Central', 'api.nal.usda.gov (via api.data.gov)', 'When you search (your search words), when a scanned barcode isn\'t found elsewhere (the barcode), and when you open a USDA food', 'Nutrition data. Lumi uses the public demo key, not an account.'],
    ['Open Beauty Facts', 'world.openbeautyfacts.org', 'Only when a scanned barcode isn\'t a food anywhere else (the barcode)', 'Cosmetics ingredient data.'],
    ['OpenStreetMap Overpass', 'overpass-api.de', 'Only when you tap Use my location in Restaurants near you', 'Your position rounded to about 1 km (0.6 mi) and the radius you picked. Distances are worked out on your phone.'],
    ['unpkg', 'unpkg.com', 'The first time you open the barcode scanner', 'Downloads the scanner code (html5-qrcode). The camera picture is read on your device and never uploaded.'],
    ['jsDelivr', 'cdn.jsdelivr.net', 'The first time you read a label or menu photo', 'Downloads Tesseract.js and its English language data. The photo is read on your device and never uploaded.'],
    ['Recipe websites', 'the link you paste', 'Only when you paste a recipe link into Score a recipe', 'Lumi opens that page straight from your device to read the ingredient list. No cookies are sent.'],
  ];
  const DEL_P = 'Removes everything Lumi saved on this device: favorites, lists, logs, recipes, settings, watch-for, the offline pack, cached lookups and photos, and downloaded scan data. Lumi itself stays and works as new. This can\'t be undone, so use Backup JSON in Settings first if you want a copy.';
  const delCard = () => `<section class="card del231" id="del231c"><h2>Delete all my Lumi data</h2><p class="small">${DEL_P}</p><div class="actions"><button type="button" class="btn dbtn231" data-del231>Delete all my Lumi data</button></div></section>`;

  function viewPrivacy231() {
    document.title = 'Privacy — Lumi';
    app.innerHTML = `<div class="pg231">
    <h1>Privacy</h1>
    <p class="lead lead231">Short version: no accounts, no ads, no analytics, no tracking. What you save stays on this device. Some features look things up online, and every outside service is listed below with what it gets and when.</p>
    <div class="g231">
    <section class="card"><h2>Stored only on this device</h2><p class="small">In your browser's storage (local storage, cache storage and IndexedDB). Nothing is synced, and there's no copy on any server.</p><ul class="ul231">
      <li>Favorites, saved items and My foods (your own foods)</li><li>Recipes and recipe drafts</li><li>Food log, saved meals and meal plan</li><li>Grocery lists and other lists</li><li>Watch-for ingredients and allergen &amp; diet alerts</li><li>Compare tray, recently viewed, recent searches and scan history</li>
      <li>Settings: carb targets, the optional ratio, theme and primary rating</li><li>Change-alert snapshots, so Lumi can tell you when a saved product's data changes</li><li>Glucose readings you import from a Clarity CSV</li><li>The offline pack (Costco and Whole Foods items), only if you tap Save for offline</li><li>Short-lived copies of lookups (search results, product photos, nearby restaurants for 24 hours) and the app's own files for offline use</li><li>Your acknowledgement of the dose-estimate warning and that you've seen the first-run notice</li></ul></section>
    <section class="card"><h2>No accounts, ads or tracking</h2><ul class="ul231"><li>No sign-in and no accounts.</li><li>No ads, no analytics, no tracking pixels and no cookies set by Lumi.</li><li>Fonts are bundled with the app, so no font service sees your visit.</li><li>Lumi never sends your saved data, log or settings anywhere.</li><li>Share links carry the list inside the link itself; no server stores them. Apple Health sends meal totals to the Shortcuts app on your own phone.</li></ul></section>
    <section class="card"><h2>Camera, photos and location</h2><ul class="ul231"><li>The camera turns on only when you tap Scan. Barcodes are read on your device.</li><li>Label and menu photos are read on your device (Tesseract.js) and never uploaded.</li><li>Location is used only when you tap Use my location (Restaurants near you), and only a rounded position (about 1 km) leaves the device.</li></ul></section>
    </div>
    <section class="card svc231"><h2>Outside services Lumi contacts</h2><p class="small">Each service has its own privacy policy and may log normal request details such as your IP address. Links you tap (sources, FDA, Wikidata, Dexcom Clarity and so on) open those sites, and their policies apply.</p>
      <ul class="svl231">${SVC.map(s => `<li><div class="svh231"><b>${s[0]}</b><code>${s[1]}</code></div><p><span class="wh231">When:</span> ${s[2]}</p><p class="small">${s[3]}</p></li>`).join('')}</ul></section>
    ${delCard()}
    <p class="small upd231">Last updated ${UPD}. This page describes what the app's code does. Questions: ${ext(ISSUES, 'open an issue on GitHub')} (github.com/jwardell15/lumi/issues). See also <a href="#/disclaimer">Not medical advice</a>.</p></div>`;
  }

  /* ---------- delete all ---------- */
  async function wipe231() {
    try { Object.keys(localStorage).filter(k => /^lumi[._]/.test(k)).forEach(k => localStorage.removeItem(k)); } catch {}
    try { Object.keys(sessionStorage).filter(k => /^lumi[._]/.test(k)).forEach(k => sessionStorage.removeItem(k)); } catch {}
    try { if (self.caches) { const cur = 'lumi-v' + VERSION; for (const n of await caches.keys()) { if (!/^lumi/.test(n)) continue;
      if (n === cur) { const c = await caches.open(n); for (const r of await c.keys()) if (new URL(r.url).origin !== location.origin) await c.delete(r); } /* keep only the app's own files so Lumi still opens offline */
      else await caches.delete(n); } } } catch {}
    try { if (self.indexedDB) { const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: 'keyval-store' }];
      await Promise.all(dbs.filter(d => d && d.name && /^(keyval-store|lumi)/.test(d.name)).map(d => new Promise(r => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = () => r(); }))); } } catch {}
  }
  function askDelete231() {
    sheet(`<div class="cf231"><h2>Delete all your Lumi data?</h2><p>${DEL_P}</p><div class="actions"><button type="button" class="btn" id="delNo231">Cancel</button><button type="button" class="btn dbtn231" id="delYes231">Delete everything</button></div></div>`);
    $('#delNo231').onclick = () => closeSheet(); $('#delNo231').focus();
    $('#delYes231').onclick = async () => { $('#delYes231').disabled = true; $('#delYes231').textContent = 'Deleting…'; await wipe231(); sessionStorage.setItem('del231', '1'); location.hash = '#/'; location.reload(); };
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-del231]'); if (b) { e.preventDefault(); askDelete231(); } });
  try { if (sessionStorage.getItem('del231')) { sessionStorage.removeItem('del231'); setTimeout(() => toast('All your Lumi data was deleted from this device'), 900); } } catch {}

  /* ---------- routes + nav ---------- */
  if (typeof viewHome === 'function') { const vh = viewHome; viewHome = function () { const v = location.hash.replace(/^#\/?/, '').split('/')[0];
    if (v === 'disclaimer') return viewDisclaimer231(); if (v === 'privacy') return viewPrivacy231(); return vh.apply(this, arguments); }; }
  if (typeof tab19 === 'function') { const t = tab19; tab19 = function (v, a) { return v === 'disclaimer' || v === 'privacy' ? 'settings' : t.apply(this, arguments); }; }

  /* ---------- dose estimate gate ---------- */
  const WARN = `<b class="dwh231">Estimate only. Never a dose.</b><span>This shows carbs ÷ your ratio and nothing else. It leaves out insulin on board, activity, illness, fat and protein, and label mistakes. Don't use it to decide an insulin dose; follow your care team and your meter or pump.</span>`;
  const gateHTML = id => `<div class="dw231" role="note" id="${id}">${WARN}${acked() ? `<p class="dok231">✓ You read this on ${new Date(store.get(K_ACK, Date.now())).toLocaleDateString()}. The estimate can be turned on.</p>` : `<label class="dack231"><input type="checkbox" data-ack231> I understand this is an estimate, not dosing advice</label><p class="xs dnote231">Read and tick this once before you can turn the estimate on.</p>`}</div>`;
  function gate(inp, id) {
    if (!inp || inp.dataset.g231) return; inp.dataset.g231 = '1';
    const host = inp.closest('label') || inp; host.insertAdjacentHTML('beforebegin', gateHTML(id));
    const box = document.getElementById(id);
    if (!acked()) { inp.disabled = true; inp.setAttribute('aria-describedby', id); inp.dataset.prev231 = inp.value; if (!inp.value) inp.placeholder = 'Off — tick the box above first';
      box.querySelector('[data-ack231]').onchange = e => { if (!e.target.checked) return; store.set(K_ACK, Date.now()); inp.disabled = false; inp.placeholder = 'Off'; document.documentElement.classList.remove('icrlock231');
        box.outerHTML = gateHTML(id); toast('Thanks. You can turn the estimate on now.'); inp.focus(); }; }
  }
  function settingsHook() {
    const sf = $('#sf'); if (sf && !sf.dataset.w231) { sf.dataset.w231 = '1'; gate(sf.querySelector('input[name="icr"]'), 'dw231s');
      const os = sf.onsubmit; sf.onsubmit = function (e) { const prev = settings().icr; const r = os ? os.call(this, e) : undefined; if (!acked() && prev) setSettings({ icr: prev }); return r; }; }
    if (!$('#sp231c')) { const about = [...app.querySelectorAll('.card')].find(c => c.querySelector('a[href="#/about"]')) || null;
      const html = `<section class="card sp231" id="sp231c"><h2>Safety and privacy</h2><p class="small">${LINE}</p><ul class="hub231"><li><a href="#/disclaimer">Not medical advice<span>What Lumi is and isn't</span></a></li><li><a href="#/privacy">Privacy<span>What's stored and what's sent</span></a></li></ul><div class="actions"><button type="button" class="btn dbtn231" data-del231>Delete all my Lumi data</button></div></section>`;
      if (about) about.insertAdjacentHTML('beforebegin', html); else if ($('h1')) app.insertAdjacentHTML('beforeend', html); }
  }
  function onbHook() { const i = $('#onbI'); if (i) gate(i, 'dw231o');
    const p = [...document.querySelectorAll('.onb p.small')].find(x => /not medical advice/i.test(x.textContent) && !x.querySelector('a')); if (p) p.innerHTML = 'Informational only, not medical advice. <a href="#/disclaimer">Read the short version</a>.'; }
  function aboutHook() { if (!/^#\/about/.test(location.hash) || $('#ab231')) return; const lead = app.querySelector('p.lead'); if (!lead) return;
    lead.insertAdjacentHTML('afterend', `<div class="card sp231" id="ab231"><p class="small">${LINE}</p><p class="lk231">${linksRow()}</p></div>`); }

  /* ---------- first-run notice (once, dismissible) ---------- */
  function firstRun() { const app = document.getElementById('app'); if (!app) return; const el = $('#fr231');
    if (store.get(K_FR, 0)) { if (el) el.remove(); return; }
    if (/^#\/disclaimer/.test(location.hash)) { store.set(K_FR, Date.now()); if (el) el.remove(); return; }
    if (el && el.parentNode === app && app.firstElementChild === el) return;
    const n = el || Object.assign(document.createElement('aside'), { id: 'fr231', className: 'fr231' });
    if (!el) { n.setAttribute('aria-label', 'Before you start'); n.innerHTML = `<div class="frt231"><b>Before you start</b><p>Lumi scores food for information only. It isn't medical advice and can be wrong, so check the label and never use it to dose insulin.</p><p class="frl231"><a href="#/disclaimer">Read the full disclaimer</a></p></div><button type="button" class="btn frx231" aria-label="Dismiss this notice">Got it</button>`;
      n.querySelector('.frx231').onclick = () => { store.set(K_FR, Date.now()); n.remove(); }; }
    app.prepend(n);
  }

  /* ---------- footer ---------- */
  function footer() { if ($('#ft231')) return; const m = document.getElementById('app'); if (!m) return;
    m.insertAdjacentHTML('afterend', `<footer class="ft231" id="ft231"><p>${LINE.replace('. Never use it to decide an insulin dose.', '.')} <span class="lk231">${linksRow()}</span></p></footer>`); }

  let q = 0;
  function run() { q = 0;
    document.documentElement.classList.toggle('icrlock231', !acked());
    try { footer(); } catch {} try { firstRun(); } catch {} try { onbHook(); } catch {} try { aboutHook(); } catch {}
    try { if (/^#\/settings/.test(location.hash) && $('#sf')) settingsHook(); } catch (e) { console.warn(e); } }
  const kick = () => { if (!q) q = requestAnimationFrame(run); };
  function start() { new MutationObserver(kick).observe(document.body, { childList: true, subtree: true }); addEventListener('hashchange', kick); run(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.viewDisclaimer231 = viewDisclaimer231; window.viewPrivacy231 = viewPrivacy231;
  if (/^#\/(disclaimer|privacy)(\/|$)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0); /* deep link: app.js routed before this file loaded */
})();
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(
  ['🛡️', 'Safety and privacy pages', 'New plain-English pages: Not medical advice (what Lumi is and isn\'t) and Privacy (what stays on your device and every outside service Lumi contacts). Find them in Settings and at the bottom of every page.'],
  ['🗑️', 'Delete all my Lumi data', 'Settings › Safety and privacy can now wipe everything Lumi saved on this device in one step, after you confirm.'],
  ['⚠️', 'A clear warning on the dose estimate', 'The optional carb ÷ ratio estimate stays off by default. Before you can turn it on, you read and tick a short warning once.']);
