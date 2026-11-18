/* Lumi 26.7 "Simple UI": bottom bar Home | Search | Scan | Places | More, a short Home (about 1.5 screens), a Places screen (Costco and Whole Foods pinned, Restaurants,
   other stores behind "More stores"), a grouped More screen, and a collapsed "More checks" group on the product page.
   Nothing was deleted: every existing #/route still works (the old Browse hub is #/browse, the old Home is #/classic); this file loads last and only
   (a) answers the new routes #/places and #/more and the new Home, handing every other route to the previous handler chain, (b) re-maps which tab is lit,
   (c) tidies the product page and Settings after they render. The route table below (R27) is the single list the More screen and the tests read. */
(() => {
'use strict';
const hv = () => location.hash.replace(/^#\/?/, '').split('/')[0];
/* ---------- route table: group -> [hash, title, one-line description] ---------- */
const R27 = window.R27 = [
  ['Places', [['#/places', 'Places', 'Whole Foods and Costco first, restaurants, more stores'], ['#/browse/rest', 'Restaurants', 'Chains with full nutrition, best picks first']]],
  ['Your foods', [['#/myfoods', 'My foods', 'Favorites, history, custom foods'], ['#/saved', 'Saved', 'Products you saved'], ['#/lists', 'Lists', 'Shopping lists'], ['#/compare', 'Compare', 'Side by side'], ['#/alerts', 'Ingredient alerts', 'Your watchlist']]],
  ['Today and planning', [['#/today', 'Today', 'Meals logged, insights'], ['#/log', 'Food log', 'Everything you logged'], ['#/ideas', 'Meal ideas', 'Ready-made ideas, best first'], ['#/plan', 'Meal plan', 'Plan the week'], ['#/grocery', 'Grocery list', 'From your plan'],
    ['#/meal', 'Meal builder', "Add up a plate's carbs"], ['#/meals', 'Saved meals', 'One-tap logging'], ['#/recipes', 'Recipes', 'Your recipes'], ['#/recipescore', 'Score a recipe', 'Paste ingredients']]],
  ['Hidden ingredients', [['#/additives', 'Additives', "What's in it"], ['#/addwatch', 'Additive and dye watch', 'What FDA, California and others say'], ['#/label', 'Scan a label', 'Photo of the Nutrition Facts'], ['#/menuscan', 'Scan a menu', 'Photo of a restaurant menu']]],
  ['Home and body', [['#/hb', 'Personal care and cleaning', 'Shampoo, sunscreen, soap'], ['#/hb/laundry', 'Laundry and cleaning', 'Detergent, dish soap'], ['#/cosmetics', 'Cosmetics', 'Shampoo, sunscreen'], ['#/pfas', 'PFAS in products', 'EPA and Minnesota data'], ['#/recalls', 'Recalls', 'CPSC and FDA'],
    ['#/water', 'Local water quality', 'Violations, lead and PFAS'], ['#/supp', 'Supplements', 'Sugar and carbs per serving'], ['#/otc', 'Medicines', 'Ingredients, sweeteners']]],
  ['Kitchen, fish, produce, air', [['#/kitchen', 'Kitchen and food contact', 'PFAS and BPA'], ['#/fish', 'Fish and mercury', "FDA and EPA's chart"], ['#/pesticides', 'Pesticide residue', 'USDA testing results'], ['#/air', 'Air quality by ZIP', "EPA's yearly summary"]]],
  ['Pets', [['#/pet', 'Pet food', 'Search or scan pet food'], ['#/pet/toxic', 'Dog-toxic ingredients', 'Xylitol, chocolate and more']]],
  ['Insights', [['#/patterns', 'Patterns', 'What moves your numbers'], ['#/glucose', 'Glucose import', 'Clarity CSV'], ['#/applehealth', 'Apple Health', 'Import'], ['#/weekly', 'Weekly report', 'For your endo'], ['#/report', 'Log report', 'Printable summary'], ['#/overview', 'Overview', 'Your stats'], ['#/prices', 'Prices', 'History and checks']]],
  ['Settings and about', [['#/settings', 'Settings', 'Carb targets, alerts, offline, data'], ['#/privacy', 'Privacy', "What's stored and what's sent"], ['#/disclaimer', 'Not medical advice', 'What Lumi is and is not'], ['#/whatsnew', "What's new", 'Release notes'], ['#/about', 'About', 'How scores work'], ['#/credits', 'Credits', 'Data sources'], ['#/browse', 'All browse sections', 'The full old Browse list'], ['#/classic', 'Classic home', 'The old, longer Home']]],
];
function install27() { const prevHome = viewHome, prevTab = tab19;
/* ---------- which tab is lit ---------- */
tab19 = function (view, arg) { const t = prevTab.apply(this, arguments);
  if (view === '' || view === 'home' || view === 'classic') return 'home'; if (t === 'home' || t === 'search') return t;
  if (view === 'picks') return 'picks'; return 'more'; };
/* ---------- route handler ---------- */
viewHome = function () { const v = hv();
  if (v === '' || v === 'home') return viewHome27(); if (v === 'places') return viewPlaces27(); if (v === 'more') return viewMore27(); if (v === 'picks') return viewPicks27();
  return prevHome.apply(this, arguments); };
}
/* installed now, and again after the late bundle loads, so this layer is always the outermost wrapper (the same order as before 26.8, when ui27.js simply loaded last) */
const shell = (cls, title, inner) => { document.title = title + ' — Lumi'; app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim(); app.innerHTML = `<section class="${cls} pg27"><h1>${title}</h1>${inner}</section>`; const h = app.querySelector('h1'); if (h) h.setAttribute('tabindex', '-1'); };
const ic = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
/* ---------- Home (27.0): a short greeting, a big chat-style search box, example prompts, Scan ---------- */
const FILLER270 = /^\s*(?:(?:hey|hi|please|can you|could you|would you)\s+)*(?:show me|find me|find|search for|search|look up|i want|i need|get me|give me)\s+/i;
window.cleanQuery270 = q => { const s = String(q || '').replace(FILLER270, '').replace(/\s+/g, ' ').trim(); return s || String(q || '').trim(); };
const ARROW270 = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const EXAMPLES270 = ['Low sugar yogurt', 'Costco snacks', 'Chipotle bowl'];
function viewHome27() {
  document.title = 'Lumi — food scanner';
  let sc = []; try { sc = histItems('scans').slice(0, 3); } catch {}
  app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim();
  app.innerHTML = `<section class="home27 home270">
    <h1>${greeting()}</h1><p class="ask270">What are you eating?</p>
    <form class="sbox chat270" id="sform" autocomplete="off" role="search"><div class="sfield chat270f"><textarea id="q" rows="3" enterkeyhint="search" placeholder="Ask about a food, brand, or restaurant…" aria-label="Search foods, brands or restaurants"></textarea><button type="button" class="clear" id="qclear" hidden aria-label="Clear">✕</button><button class="sbtn send270" type="submit" aria-label="Search">${ARROW270}</button></div><div class="sugg" id="sugg" role="listbox"></div></form>
    <div class="ex270" role="group" aria-label="Examples">${EXAMPLES270.map(x => `<button type="button" class="chip ex270c" data-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <button class="scan27 scan270" id="heroScan" type="button" aria-label="Scan a barcode">${ic('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/>')}<span>Scan a barcode</span></button>
    <p class="lk27"><button class="lnk74" id="typeBc" type="button">Type a barcode</button><span aria-hidden="true"> · </span><a class="lnk74" href="#/label">Scan a label photo</a></p>
    ${sc.length ? `<div class="rec270"><span>Recent</span>${sc.map(it => `<a class="chip" href="#/product/${esc(it.id)}">${esc(String(it.name || '').slice(0, 28))}</a>`).join('')}</div>` : ''}</section>`;
  bindSearch(); $('#heroScan').onclick = startScan; $('#typeBc').onclick = () => typeBarcode('');
  const f = $('#sform'), q = $('#q'), grow = () => { q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 180) + 'px'; };
  f.addEventListener('submit', () => { q.value = cleanQuery270(q.value); }, true);
  q.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !e.defaultPrevented) { e.preventDefault(); if (q.value.trim()) f.requestSubmit(); } });
  q.addEventListener('input', grow);
  app.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { q.value = b.dataset.ex; f.requestSubmit(); });
}
/* ---------- Picks (27.0: the old Home suggestions live here) ---------- */
function viewPicks27() {
  document.title = 'Picks — Lumi';
  let logged = ''; try { const e = typeof todayEntries === 'function' ? todayEntries() : null, n = e && e.length; if (n) logged = `<a class="td27" href="#/today">${n} item${n === 1 ? '' : 's'} logged today ›</a>`; } catch {}
  let sc = []; try { sc = histItems('scans').slice(0, 4); } catch {}
  app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim();
  app.innerHTML = `<section class="home27 picks270">
    <h1>Picks</h1><p class="small">Top-scoring foods today, per serving. Health on the left, Blood sugar on the right.</p>
    <div class="sec-h sh27h"><h2>Top picks</h2><span class="xs">Updated daily · per serving</span></div><div id="picks">${skel(3)}</div><button class="btn sm" id="allPicks27" type="button" hidden aria-expanded="false">See all picks</button>
    <details class="rest74" id="restBest"><summary>Good picks at restaurants</summary><div class="list" id="restList"></div><a class="lnk74" href="#/browse/rest">All chains ›</a></details></section>`;
    const el = $('#picks'), btn = $('#allPicks27');
  const trim = () => { const cols = el.querySelectorAll('.du14c ul'); if (!cols.length) return; let more = false; cols.forEach(u => [...u.children].forEach((li, i) => { li.classList.toggle('x27', i >= 3); if (i >= 3) more = true; })); btn.hidden = !more && !el.classList.contains('all27'); };
  btn.onclick = () => { const on = el.classList.toggle('all27'); btn.textContent = on ? 'Show fewer' : 'See all picks'; btn.setAttribute('aria-expanded', on); };
  new MutationObserver(trim).observe(el, { childList: true, subtree: true }); setTimeout(trim, 700);
  const plain = err => { let p = []; try { p = homePicks(); } catch (e) { console.warn(e); } const e2 = $('#picks'); if (!e2) return;
    e2.innerHTML = p.length ? `<div class="list">${p.slice(0, 3).map(d => rowHTML(itemFromDoc(d))).join('')}</div>` : `<div class="card" role="status"><p class="small">${err ? "Top picks couldn't load. Check your connection." : 'No top picks to show right now.'} <a class="lnk" href="#/browse">Browse all</a></p>${err ? '<button class="btn" id="picksRetry" type="button">Try again</button>' : ''}</div>`;
    const r = $('#picksRetry'); if (r) r.onclick = () => { e2.innerHTML = skel(3); go27(); }; };
  const go27 = () => homeLite().then(() => { let A = [], B = []; try { [A, B] = homeCols141(); } catch (e) { console.warn(e); } if (A.length || B.length) home14(); else plain(false);
    const rl = $('#restList'); if (rl) rl.innerHTML = restPicks74().slice(0, 3).map(d => rowHTML(itemFromDoc(d))).join(''); }).catch(() => plain(true));
  go27();
}
/* ---------- Places ---------- */
function viewPlaces27() {
  const all = stores181(), P = pins181(), by = Object.fromEntries(all.map(s => [s.id, s])), order = ['wholefoods', 'costco'].concat(P.filter(i => i !== 'wholefoods' && i !== 'costco')),
    feat = order.map(i => by[i]).filter(Boolean), rest = all.filter(s => !order.includes(s.id)), grid = L => `<div class="sg181">${L.map(s => card181(s, false)).join('')}</div>`;
  shell('places27', 'Places', `
    <div class="fg181">${feat.map(s => card181(s, true, true)).join('')}</div>
    <div class="sec-h"><h2>Restaurants</h2></div>
    <div class="rest27"><a class="rb27" href="#/browse/rest"><b>🍽️ Restaurants</b><span>Chains with full nutrition, best picks first</span></a>
      <a href="#/rmeal"><b>Restaurant meal builder</b><span>Pick several items, see the total</span></a><a href="#/order"><b>Build a meal at a chain</b><span>Main, side and drink</span></a><a href="#/bowl"><b>Build your own</b><span>Bowls, subs and pizza</span></a><a href="#/near"><b>Near you</b><span>Chains close by</span></a><a href="#/menuscan"><b>Scan a menu</b><span>Photo of a menu</span></a></div>
    ${aisleTiles()}
    <div class="sec-h"><h2>Categories</h2></div><div class="chips">${C.TOP.map(k => `<a class="chip" href="#/browse/${k}">${C.CATS[k][1]}</a>`).join('')}</div>
    <details class="ms27" id="moreStores"><summary>More stores (${rest.length})</summary><p class="small hint181">Tap ☆ on any store to pin it under Costco and Whole Foods. Pins are saved on this device only.</p>
      <h3 class="h181">Grocery stores</h3>${grid(rest.filter(s => !s.c))}<h3 class="h181">Convenience and drugstores</h3>${grid(rest.filter(s => s.c))}</details>
    <p class="small"><a class="lnk" href="#/browse">All browse sections ›</a></p>`);
}
/* ---------- More ---------- */
function viewMore27() {
  const open = new Set([0, 1]);
  shell('more27', 'More', `<p class="small">Everything else in Lumi, grouped. Tap a group to open it.</p>` + R27.map(([g, L], i) => `<details class="mg27"${open.has(i) ? ' open' : ''}><summary><b>${esc(g)}</b><span>${L.length}</span></summary><div class="ml27">${L.map(([h, t, d]) => `<a href="${h}"><b>${esc(t)}</b><span>${esc(d)}</span></a>`).join('')}</div></details>`).join('') + `<p class="foot more270">Lumi ${VERSION} · <a class="lnk" href="#/whatsnew">What's new</a> · <a class="lnk" href="#/disclaimer">Not medical advice</a> · <a class="lnk" href="#/privacy">Privacy</a></p>`);
  if (typeof navBadge221 === 'function') try { navBadge221(); } catch {}
}
/* ---------- product page: extra checks fold into "More checks"; Settings: optional sections collapse ---------- */
const MORE_IDS = ['dog261', 'fish262', 'pest262', 'ym26', 'dl242'], MORE_CLS = ['dcheck'];
function productMore() { if (!/^#\/product\//.test(location.hash) || !app.classList.contains('prodv')) return;
  const cards = [...app.children].filter(c => MORE_IDS.includes(c.id) || MORE_CLS.some(k => c.classList && c.classList.contains(k))); let d = $('#more27');
  if (!cards.length) { if (d && !d.querySelector('.card')) d.remove(); return; }
  if (!d) { d = document.createElement('details'); d.id = 'more27'; d.className = 'card more27'; d.innerHTML = '<summary><b>More checks</b><span class="mc27"></span></summary><div class="mb27"></div>'; }
  const anchor = $('#nt24') || app.querySelector(':scope > .foot'); if (anchor) { if (d.nextElementSibling !== anchor) anchor.before(d); } else if (!d.parentNode) app.append(d);
  const box = d.querySelector('.mb27'); cards.forEach(c => box.append(c));
  const names = [...box.children].map(c => (c.querySelector('h2,h3,summary') || {}).textContent || '').map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean); d.querySelector('.mc27').textContent = names.slice(0, 3).join(' · ') + (names.length > 3 ? ' · +' + (names.length - 3) : ''); }
function settingsTidy() { if (!/^#\/settings/.test(location.hash)) return;
  [...app.querySelectorAll('.card')].forEach(c => { if (c.dataset.c27 || c.parentElement.tagName === 'DETAILS') return; const h = c.querySelector(':scope > h2, :scope > .fx-h > h2'); if (!h) return;
    if (!/^(Insulin-to-carb ratio|Fat\/protein note|Save for offline|Data$)/i.test(h.textContent.trim())) return; c.dataset.c27 = 1;
    const d = document.createElement('details'); d.className = 'card col27'; const s = document.createElement('summary'); s.textContent = h.textContent.trim(); const fx = h.parentElement.classList.contains('fx-h') ? h.parentElement : h; fx.remove(); d.append(s); while (c.firstChild) d.append(c.firstChild); c.replaceWith(d); }); }
let q = 0; const kick = () => { if (!q) q = requestAnimationFrame(() => { q = 0; try { productMore(); settingsTidy(); } catch (e) { console.warn(e); } }); };
new MutationObserver(kick).observe(app, { childList: true, subtree: true }); addEventListener('hashchange', kick);
/* the jump buttons at the top of a product (e.g. 'Dog-toxic: Xylitol ↓') point at cards that now live in the collapsed More checks group: open it first so the scroll lands on the card */
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button[id$="j261"],button[id$="j262"]'); if (b) { const d = document.getElementById('more27'); if (d && !d.open) d.open = true; } }, true);
const addNews27 = () => {
if (typeof V7_NEWS !== 'undefined' && !V7_NEWS.some(x => /A simpler Lumi/.test(String(x[1] || '')))) V7_NEWS.unshift(['✨', 'A simpler Lumi (26.7)', 'The bottom bar is now Home, Search, Scan, Places and More. Home is shorter: scan or search at the top, then Top picks (Overall health on the left, Blood sugar on the right). Places pins Whole Foods and Costco, then Restaurants, with other stores behind More stores. More groups every other tool. Product pages keep the scores and hidden sugars on top and fold the extra checks into More checks. Lumi also loads and searches faster, and the scanner now works offline. The old Home is at #/classic and the old Browse list at #/browse.']);
};
/* ---------- bottom bar height -> --tabh27 (the product action bar sits right above it) ---------- */
{ const sync = () => { const t = document.querySelector('.tabbar'); if (!t) return; const r = t.getBoundingClientRect(); const bottom = r.width > r.height * 2 && r.bottom >= innerHeight - 2; document.documentElement.style.setProperty('--tabh27', bottom ? Math.ceil(innerHeight - r.top) + 'px' : '0px'); };
  sync(); addEventListener('resize', sync); addEventListener('orientationchange', sync); addEventListener('load', sync); if (window.ResizeObserver) { const t = document.querySelector('.tabbar'); if (t) new ResizeObserver(sync).observe(t); } if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync); }
/* ---------- 26.8: late bundle ----------
   The feature modules that only non-Home screens need (Better choice / order builder / share cards, planner, aisle mode, Home & Body, recalls, supplements / OTC / water,
   restaurant meal builder + additive watch, pets, kitchen / fish / pesticides / air) are in a second bundle (dist/late.<hash>.js, files marked data-late in index.src.html).
   It loads on idle shortly after Home is drawn, and always BEFORE the first route other than Home / Places / More, so every screen runs exactly the code it ran before. */
let lateP = null; window.lateDone27 = false; const lateQ = [];
window.onLate27 = fn => (window.lateDone27 ? fn() : lateQ.push(fn));
window.loadLate27 = () => lateP || (lateP = new Promise((res, rej) => {
  if (!window.LATE27) { window.lateDone27 = true; return res(); }
  const sc = document.createElement('script'); sc.src = window.LATE27;
  sc.onload = () => { window.lateDone27 = true; try { install27(); } catch (e) { console.warn(e); } lateQ.splice(0).forEach(f => { try { f(); } catch (e) { console.warn(e); } }); res(); };
  sc.onerror = () => { lateP = null; rej(new Error('Lumi could not load a part of the app')); };
  document.head.appendChild(sc);
}));
onLate27(addNews27);
const addNews270 = () => { if (typeof V7_NEWS === 'undefined') return; if (!V7_NEWS.some(x => /Simpler Home/.test(String(x[1] || '')))) V7_NEWS.push(['🧡', 'Simpler Home, orange Lumi (27.0)', 'Home is now just a big search box, three example prompts and Scan. Top picks moved to their own Picks tab. Places live under More. New warm orange colors, light and dark.']);
  [/A simpler Lumi/, /Easier search/, /Simpler Home/].forEach(re => { const i = V7_NEWS.findIndex(x => re.test(String(x[1] || ''))); if (i > 0) V7_NEWS.unshift(V7_NEWS.splice(i, 1)[0]); }); }; /* newest first: 27.0, 26.9, 26.7 */
addNews270(); onLate27(addNews270);
const EAGER27 = new Set(['', 'home', 'places', 'more', 'picks']);
const route0 = route;
route = function () {
  if (!window.lateDone27 && !EAGER27.has(hv())) { try { app.innerHTML = skel(3); } catch (e) {} loadLate27().then(() => route0(), () => route0()); return; }
  return route0.apply(this, arguments);
};
removeEventListener('hashchange', route0); addEventListener('hashchange', route);
install27();
if (!window.__routed27) { window.__routed27 = 1; route(); } /* the first route(), now that every module is in place */
{ const idle = () => (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => { loadLate27().catch(() => {}); }, { timeout: 3000 }); const go = () => setTimeout(idle, 1200); document.readyState === 'complete' ? go() : addEventListener('load', go); }
})();
