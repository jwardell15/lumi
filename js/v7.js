/* Lumi v7: shopping lists, data-check card (4/4/9 Atwater), copy link, ready-to-eat filter, what's-new card, "/" to search. Uses globals from app.js/v63.js at call time. */
/* v7.1: manual barcode entry when the camera isn't available (or by choice) */
function typeBarcode(msg) {
  const el = document.createElement('div'); el.className = 'lp-wrap';
  el.innerHTML = `<form class="lp" role="dialog" aria-label="Type a barcode"><b>Type the barcode number</b>${msg ? `<p class="small">${esc(msg)}</p>` : ''}<input inputmode="numeric" pattern="[0-9 ]*" maxlength="16" placeholder="e.g. 049000028911" aria-label="Barcode number" style="padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--bg2);color:var(--ink);font:inherit;font-size:18px;letter-spacing:.06em"><button class="btn pri">Look up</button><button type="button" class="btn lp-x">Cancel</button></form>`;
  document.body.appendChild(el); const close = () => el.remove(); const inp = el.querySelector('input'); setTimeout(() => inp.focus(), 30);
  el.onclick = e => { if (e.target === el || e.target.classList.contains('lp-x')) close(); };
  el.querySelector('form').onsubmit = e => { e.preventDefault(); const c = inp.value.replace(/\D/g, ''); if (c.length < 8 || c.length > 14) { toast('Enter the 8–14 digits under the barcode'); return; } close(); go('#/product/' + c); };
}
document.addEventListener('click', e => { if (e.target && e.target.id === 'scanType') { if (typeof stopScan === 'function') stopScan(); typeBarcode(''); } });
const V7_NEWS = [
  ['🔍', 'Search inside a store (17.2)', 'After picking a store in Browse (and in aisle lists), a search box filters only that list. It forgives typos like “chese” or “greek yogrt”, keeps your sort, and stays pinned at the top on phones.'],
  ['🌍', 'About 1.47 million foods (17.1)', '460,000 more real packaged foods from Open Food Facts outside the US index (mainly France, the UK, Germany, Ireland and Spain), deduplicated by barcode against everything already in Lumi and scored with the new formula. They load only when you search international foods, so Home stays fast. Whole Foods Market items can now come straight from wholefoodsmarket.com product pages.'],
  ['🩹', 'My foods tile fix (17.0.1)', 'The My foods shortcut on Home now has its heart icon and lines up with the other tiles.'],
  ['💚', 'Lumi 17.0: Overall health leads, smarter Blood sugar score (17.0)', 'Overall health now comes first everywhere two scores appear: Top picks show Overall health on the left and Blood sugar on the right, and the Health pill leads in search, lists, product pages, compare, meals and restaurant picks (you can still switch in Settings › Primary rating). The Blood sugar score keeps sugar as the top driver and now also counts refined starch (white rice, white bread, pasta, crackers, fries…): starch is total carbs minus sugar and fiber, applied only to refined grains and refined-starch ingredients. New My foods page (Home › My foods) for favorites and custom foods, with a local backup file. Restaurants: 14 more chains get lower-carb single-item picks from their official nutrition (dessert-only chains are left out). Grocery › Shop by store now shows real store-brand options for 15 stores (Great Value, Good & Gather, Kroger, 365, Trader Joe\'s, Aldi, H-E-B, Publix and more), not just Kirkland.'],
  ['🔎', 'Search suggestions fixed (16.1.1)', 'Names and brands in the search dropdown were cut in half on some screens. They now show in full, and the Recent chips hide while the dropdown is open.'],
  ['🍬', 'Lumi 16.1: sugar-first Blood sugar score, no more net carbs (16.1)', 'Lumi now always uses total carbs as labeled. The Blood sugar score is driven mainly by sugar (added sugar counts more than natural sugar), then total carbs; fiber is only a small bonus and is never subtracted. Top picks now need 2–20 g total carbs and no more than 5 g sugar per 100 g, with both scores 60+.'],
  ['📅', 'Lumi 16: Today, insights and easy Clarity import (16.0)', 'New Today page (Home › Today strip, or More › Today and insights): daily totals vs your recent average, a carb share per meal, and plain-language insights from your own log and readings. Glucose import is now drag-and-drop or one tap from the iPhone Files picker; Lumi remembers your last import, matches readings to logged meals, and shows time in range (70–180) in the 3 hours after meals, by meal type. Restaurant meal picks now pair sides that suit the main (no more hash browns with a pizza sub). Search understands more shorthand (frys, oj, gf, pb, bfast…). The Dexcom login was removed: glucose comes from your Clarity CSV only, and any stored Dexcom session was cleared from this device.'],
  ['🍽️', 'Lumi 15: quick log, glucose after meals and more (15.0)', 'Quick log on Home: starred and most-logged foods log in one tap, with undo (also a home-screen shortcut). Add fresh food: search produce and whole foods and log USDA portions like 1 medium apple. Glucose after meals: if you imported Clarity data or connected Dexcom, each logged meal gets a 0–3 h curve with rise, peak and time to peak, and foods are ranked by average rise. Descriptive only, never dosing advice. Optional fat/protein note (off by default, Settings). Price history: prices typed into Scan history show the cheapest you have seen. Saved, starred and logged foods open offline, including by barcode. Top picks show carbs per serving. Shorter USDA names, clearer categories, real 2-food snack ideas, restaurant meal ideas for 23 more chains, two-column “Other idea” in the meal plan and clearer store labels in the grocery list.'],
  ['✨', 'Smarter Top picks (14.1)', 'Top picks now only show ready-to-eat foods where both the carb score and the health rating are 60 or higher, with at most 20 g carbs per 100 g, a real product photo and a mix of categories. They rotate daily. Each row shows labelled Carb and Health scores, carbs, its category and a compare button. Products with unclear names (like a bare product-line name) get their Lumi category added, for example “HiPro yogurt”, or are left out of suggestions. The same quality rules apply to Better choices, Best matches and meal ideas.'],
  ['⚖️', 'Two kinds of suggestions side by side (14.0)', 'Top picks, Better choices on every product, search and browse results, and meal ideas now show two columns: Blood sugar (ranked by carb score) and Overall health (ranked by the health rating: sugar, saturated fat, salt, fiber, protein, fruit/veg content and additives). Tap “How the two columns are ranked” for the method. Only real items with data on record are shown.'],
  ['🎨', 'A fresh look everywhere (14.0)', 'A cleaner, calmer design on every screen in light and dark: warmer background, outlined cards, frosted header and tab bar, and layouts that fit phones, tablets and desktop without sideways scrolling. The meal builder totals no longer get cramped on small phones, and Meal ideas and Meal plan highlight in the desktop sidebar.'],
  ['💡', 'Meal ideas and a weekly plan (13.0)', 'Breakfast, lunch, dinner and snack ideas that fit your carb target per meal, lowest carbs first, built only from real foods in Lumi (USDA staples and popular packaged items) with carbs, fiber, protein, fat and calories. One tap logs them. The weekly plan fills 7 days within your targets: lock what you like, regenerate the rest, and get a grocery list grouped by aisle or by store that you can check off and share.'],
  ['🍽', 'Better meal builder, swaps and restaurant meals (13.0)', 'Search and add foods straight into the meal builder, type exact amounts, then save the plate as a meal or recipe, or log it. Lower-carb swaps suggest similar foods from the same category for any plate, saved meal or logged meal, showing the carbs saved. Chain pages now list main dishes first, plus the lowest-carb main + side + drink from that chain\'s own menu. Searching "pizza" shows pizzas before pizza sauce.'],
  ['🛒', 'Costco and more chains (12.1)', 'Browse › Shop by store now starts with Costco: Kirkland Signature, products tagged as sold at Costco, and the Costco Food Court menu from Costco\'s official nutrition guide. New official restaurant nutrition: Runza, Farmer Boys and Royal Farms (convenience-store hot food).'],
  ['🌍', 'Over 1 million foods (12.1)', '332,000 more real packaged foods from Open Food Facts outside the US index (UK, Canada, Ireland, Australia, France and more), deduplicated by barcode and checked for consistent nutrition. They are marked 🌍 Intl with the country listed, load only when you ask for them or US results are thin, and barcode scans find them too.'],
  ['📊', 'Week and Report, redesigned (12.0)', 'Week shows carbs per day stacked by meal with your target line, averages by meal and a tap-through day list. Browse past weeks. The Report adds a by-hour chart and ranked top carb sources, and prints cleanly for your care team.'],
  ['🍳', 'Recipe builder (12.0)', 'Settings › Recipes, or Log › Quick add › Recipes: add ingredients by grams, set servings, and see total and per-serving carbs, fiber, protein and fat. Save, log a serving, or share a link.'],
  ['🕒', 'Meals you can change (12.0)', 'When you log, Lumi suggests Breakfast, Lunch, Dinner or Snack from the time (mid-afternoon and late night count as snacks). Tap Edit on any logged item to move it to another meal, or change its time or amount.'],
  ['🍕', 'Better restaurant results (12.0)', 'Searching a chain now shows real dishes (pizzas, sandwiches, entrees) before sauces, drizzles, toppings and zero-carb add-ons.'],
  ['🩸', 'Recipes and meal editing (12.0)', 'Build recipes, edit or reassign logged meals, and see a redesigned Week and Report. (Glucose now comes from a Clarity CSV only.)'],
  ['🛠', 'Top picks fix (11.1.1)', 'Home Top picks could get stuck on grey placeholders. Fixed, and if picks ever can\'t load you now see a message and a Try again button.'],
  ['🏪', 'Stores and chains (11.1)', 'Browse › Shop by store now has 23 stores, including 8 convenience stores (7-Eleven, Casey\'s, Kwik Trip, QuikTrip, Wawa, Sheetz, Circle K, Buc-ee\'s). New official restaurant nutrition: Donatos, Jollibee, Gold Star Chili, Huddle House and QuikTrip hot food.'],
  ['📈', 'Glucose after meals (11.0)', 'Import a Dexcom Clarity CSV and each logged meal can show your real readings for the 3 hours after it, with peak and 2-hour values. Lumi never estimates or invents glucose.'],
  ['❤️', 'Apple Health via Shortcuts (11.0)', 'Send a meal\'s carbs, protein, fat and calories to Apple Health with one tap, through a Shortcut you build once. Step-by-step guide in Settings › Apple Health.'],
  ['👪', 'Share with family (11.0)', 'Share a shopping list or saved meal as a link or code. Opening it imports a copy. It is a one-time copy, not live sync.'],
  ['🕘', 'Scan history (11.0)', 'Every barcode you scan, with time, your in-store notes and optional price. Offline, on this device only.'],
  ['🎨', 'Redesign, part 2 (11.0)', 'New layouts for Log (timeline, desktop two-column), Settings (grouped hub), Lists, Compare, Meal builder and saved meals, and line icons for grocery aisles.'],
  ['🍕', 'More chains (11.0)', "Pizza Ranch, Godfather's Pizza, BIGGBY Coffee and Scooter's Coffee from their official nutrition guides, plus more Aldi and Walmart store brands recognized."],
  ['✨', 'All-new design (10.0)', 'Lumi was redesigned from the ground up to feel like a native iPhone app: system font, calmer colors, line icons instead of emoji, light and dark themes, subtle motion that respects Reduce Motion, and a sidebar on desktop.'],
  ['📱', 'New product page (10.0)', 'Big photo, large score circle, Negatives and Positives first, then blood sugar impact and the better choice. Log, Save, List and Share stay pinned at the bottom.'],
  ['🏠', 'Scan-first home (10.0)', 'One big Scan button, search, and quick tiles for Browse, Lists, Compare, Log and Restaurants.'],
  ['🍔', 'Restaurant search fix (9.1.1)', "Searching a chain name (like Waffle House or Taco John's) now shows that chain's own items first, and the restaurant list shows every chain."],
  ['🍔', 'More restaurants (9.1)', "9 new chains from their own official nutrition guides: Buffalo Wild Wings, The Cheesecake Factory, Waffle House, Portillo's, Dutch Bros, Taco John's, Cheddar's, Pollo Tropical and Cinnabon (about 3,200 items)."],
  ['🛒', 'More groceries (9.1)', "Fresh Open Food Facts data (Oct 20, 2026) plus short 8-digit US barcodes and more US English names: 633k products. More store brands recognized (Kroger, H-E-B, Hy-Vee, Safeway, Meijer, Target and more)."],
  ['🎯', 'Carb target per meal (9.0)', 'Set grams for breakfast, lunch, dinner and snacks. Your log shows a bar per meal (green within, amber near, red over, always with the number), the week table is tinted, and product pages show whether a serving fits the meal you are eating now.'],
  ['✨', 'Better choice (9.0)', 'Near the top of every product page: the best same-category swap with less carb impact, Yuka-style. More swaps are further down.'],
  ['🍽', 'One-tap saved meals (9.0)', 'Save a plate from the meal builder or your log, then log it from Home in one tap, with undo. Manage them under Browse › Saved meals.'],
  ['🧭', 'Quick tour, faster start, accessibility (9.0)', 'New intro tour; Home loads about 2 MB less; skip link, visible focus, screen-reader labels and reduced-motion support.'],
  ['🥣', 'Better cereal search (8.1)', 'Searching "cereal" now surfaces mainstream boxes like Cheerios, Frosted Flakes and Special K near the top, still ranked with blood sugar in mind.'],
  ['⚠', 'Ingredient alerts in search (8.1)', 'Your preset alerts (hidden sugars, maltodextrin, seed oils, sweeteners) now show ⚠ right in the results. Custom words still show on the product page.'],
  ['🍌', 'Fixes (8.1)', 'Glycemic index values only match the right preparation (no cooked GI for dry lentils), raw fruit is measured in grams, and the week table shows Carbs on phones.'],
  ['🩸', 'Blood sugar impact (8.0)', 'Each product has a Low/Medium/High, fast/slow estimate. It uses published glycemic index values (International Tables 2008) when one matches; otherwise it is a clearly labeled heuristic from carbs, sugar, fiber, fat and protein. No dosing math.'],
  ['📷', 'Scan a Nutrition Facts label (8.0)', 'Barcode not found? Photograph the label. Lumi reads it on your device, lets you check every number, then saves and scores it as a user-entered food.'],
  ['📒', 'Smarter log (8.0)', 'Day and week views by meal, CSV export, and a printable summary for your endo.'],
  ['🖼', 'Share cards (8.0)', 'Share an image card for a product, a swap (from Compare) or a shopping list.'],
  ['🔎', 'Search finds by category (8.0)', '"cereal" now also finds Cheerios and other cereals without the word in their name, with at most 3 results per brand at the top.'],
  ['⚠️', 'Ingredient alerts (8.0)', 'Watch for hidden sugars, maltodextrin, seed oils, artificial sweeteners or your own words. Matches are highlighted on product pages.'],
  ['📴', 'Works offline (8.0)', 'Favorites, recent, lists, your log and custom foods open without a connection.'],
  ['🧪', 'Hazardous substances & expandable rows (7.5)', 'Products now show "No additives / No hazardous substances" or how many additives they have and the risk level of each, with fiber and protein rows. Tap any row to see where the product falls on a scale, and switch between per 100 g and per serving.'],
  ['🏠', 'A calmer home (7.4)', 'Search and Scan up top, five shortcuts, and six everyday top picks. Stores, aisles, Meal builder, Cosmetics, Overview and Additives are now on the new Browse page.'],
  ['🩸', 'Diabetes-aware search (7.3)', 'Among popular brands, lower-carb options rank first: Chobani and Oikos plain Greek for "yogurt", Magic Spoon and Catalina Crunch for "cereal", zero-sugar sodas for "soda". The search word can appear anywhere in the name. Misspelled brands are merged automatically.'],
  ['🎯', 'Smarter search ranking (7.2)', 'Big US brands (Chobani, Fage, Oikos, Siggi\'s, Yoplait, Kirkland, Great Value…) rank first. Imported, foreign-label and no-brand items rank lower. Off-topic matches (soda crackers, Chips Ahoy, bread flour, pickle chips) are pushed down.'],
  ['🏷️', 'Cleaner brand names (7.2)', 'Misspelled and mis-cased brands are merged (Bellwether Farms, Nancy\'s, Siggi\'s), Danone shows as Oikos/Activia/Dannon, and USDA sources read "USDA Foundation" and "USDA SR Legacy".'],
  ['🔎', 'Better search (7.1)', 'US products first, fewer foreign-label and generic rows, no cocktails when you search "soda", chains rank higher for chain names.'],
  ['🧹', 'Cleaner aisles & data checks (7.1)', 'Spinach is no longer in Baby, sushi not in Bakery; 0 g carbs on juice, fruit or chocolate milk is flagged; "0 g" on small servings is scored with label rounding in mind; juice and sports drinks are no longer store picks.'],
  ['🧴', 'Cosmetics are back (7.1)', 'The cosmetics scanner data had gone missing in an earlier update. It\'s restored.'],
  ['📦', 'Packaged picks are ready-to-eat', 'Canned tomatoes, pumpkin, broth, coffee, cones, flour and other ingredients moved to "Staples & ingredients".'],
  ['⚠️', 'Bad label data is flagged', 'If calories don\'t add up from carbs, protein and fat (4/4/9), the item says "data looks wrong" and gets no score.'],
  ['☰', 'Shopping lists', 'Make lists (Costco run, school snacks…), check items off, see the carb total and share the list.'],
  ['💊', 'Supplements, sorted', 'Protein & collagen, greens powders, creatine & hydration, vitamins. Fresh "super greens" salads moved to Produce.'],
  ['🔎', 'Smarter search filters', 'Ready-to-eat, has photo and hide bad data, plus better near-duplicate grouping (one row per product).']];
function whatsNewCard() { if (store.get('seen13', false)) return ''; return `<div class="card news7"><div class="n7h"><b>✨ New in Lumi ${VERSION}</b><button class="icon" id="n7x" aria-label="Dismiss">✕</button></div><ul>${V7_NEWS.slice(0, 3).map(n => `<li><span>${n[0]}</span><div><b>${esc(n[1])}</b> <span class="d">${esc(n[2])}</span></div></li>`).join('')}</ul><a class="lnk" href="#/whatsnew">Everything new ›</a></div>`; }
document.addEventListener('click', e => { if (e.target && e.target.id === 'n7x') { store.set('seen13', true); const c = document.querySelector('.news7'); if (c) c.remove(); } });
function viewWhatsNew() { document.title = 'New in Lumi'; store.set('seen13', true);
  app.innerHTML = `<h1>New in Lumi ${VERSION}</h1><div class="card news7 full"><ul>${V7_NEWS.map(n => `<li><span>${n[0]}</span><div><b>${esc(n[1])}</b> ${esc(n[2])}</div></li>`).join('')}</ul></div><p class="foot">Informational only, not medical advice. Dose from the physical label.</p>`; }
/* ready-to-eat: index docs use the aisle + staple rules; outside items (USDA/OFF live) use the name rules only */
function readyToEat(i) { if (i.src === 'whole' || i.src === 'rest' || i.src === 'chain') return true; const d = { name: i.name || '', ai: i.ai == null ? -1 : i.ai }; return !isStaple(d) && !RAW.has(d.ai); }
/* ---- data check (Atwater 4/4/9) ---- */
function dataCheckCard(p, s) {
  const n = p.n; if (n.kcal == null) return `<div class="card dcheck"><h2>Data check</h2><p class="small">No calorie value on file, so Lumi can't cross-check the label.</p></div>`;
  if (p.meta && p.meta.perItem) return '';
  const est = 4 * (n.carbs || 0) + 4 * (n.protein || 0) + 9 * (n.fat || 0); const bad = S.implausible(p); const d = Math.round(n.kcal - est);
  return `<div class="card dcheck ${bad ? 'bad' : 'ok'}"><h2>${bad ? '⚠ Data looks wrong' : '✓ Label adds up'}</h2>
    <div class="dc-row"><div><b>${Math.round(n.kcal)}</b><span>kcal reported</span></div><div><b>${Math.round(est)}</b><span>kcal from 4·carbs + 4·protein + 9·fat</span></div><div><b>${d > 0 ? '+' : ''}${d}</b><span>difference</span></div></div>
    <p class="small">${bad ? esc(bad) + '. Often a carb value is missing or was entered per serving. Lumi doesn\'t score it, so check the package.' : 'Calories roughly match the macros (fiber, sugar alcohols and alcohol explain small gaps).'}</p></div>`;
}
/* ---- shopping lists (on this device) ---- */
const lists = () => store.get('lists', []);
const setLists = L => store.set('lists', L);
const lmin = p => ({ id: p.id, code: p.code, name: p.name, brand: p.brand, img: p.img, score: S.score(p).score, net: S.score(p).net, servQ: p.servQ || null, serv: p.serv || '' });
function listsSummary() { const L = lists(); if (!L.length) return 'Plan a shop'; const open = L.reduce((a, l) => a + l.items.filter(i => !i.done).length, 0); return `${L.length} list${L.length > 1 ? 's' : ''} · ${open} to buy`; }
function newList(name) { const L = lists(); const l = { id: 'l' + Date.now().toString(36), name: name || 'My list', items: [], t: Date.now() }; L.unshift(l); setLists(L); return l; }
function addToList(lid, p) { try { remember(p); } catch {} const L = lists(); const l = L.find(x => x.id === lid); if (!l) return false; if (l.items.some(i => i.id === p.id)) return false; l.items.push(Object.assign(lmin(p), { done: false, t: Date.now() })); setLists(L); return true; }
function listPicker(p) {
  const L = lists(); const el = document.createElement('div'); el.className = 'lp-wrap';
  el.innerHTML = `<div class="lp" role="dialog" aria-label="Add to list"><b>Add to a list</b>${L.map(l => `<button class="lp-i" data-l="${l.id}">☰ ${esc(l.name)} <small>${l.items.length}</small></button>`).join('')}<form class="lp-new"><input placeholder="New list name" aria-label="New list name" maxlength="40"><button class="btn pri">＋ Create</button></form><button class="btn lp-x">Cancel</button></div>`;
  document.body.appendChild(el); const close = () => el.remove();
  el.onclick = e => { if (e.target === el || e.target.classList.contains('lp-x')) close(); const b = e.target.closest('[data-l]'); if (b) { const ok = addToList(b.dataset.l, p); toast(ok ? 'Added to ' + lists().find(x => x.id === b.dataset.l).name : 'Already on that list'); close(); } };
  el.querySelector('form').onsubmit = e => { e.preventDefault(); const nm = el.querySelector('input').value.trim() || 'My list'; const l = newList(nm); addToList(l.id, p); toast('Added to ' + nm); close(); };
  setTimeout(() => { const i = el.querySelector('input'); if (i && !L.length) i.focus(); }, 30);
}
function splitProduct() { // v7 desktop: two independent columns (no shared row heights leaving big gaps)
  if (!app.classList.contains('prodv') || app.querySelector(':scope > .pcol')) return;
  const kids = [...app.children]; const L = document.createElement('div'), R = document.createElement('div'); L.className = 'pcol l'; R.className = 'pcol r';
  kids.forEach((k, i) => (i === 0 || k.classList.contains('dcheck') || k.classList.contains('foot') ? L : R).appendChild(k)); app.append(L, R); app.classList.add('split'); }
function bindProduct7(p) {
  splitProduct();
  const a = $('#addList'); if (a) a.onclick = () => listPicker(p);
  const c = $('#copyLink'); if (c) c.onclick = async () => { const url = location.origin + location.pathname + '#/product/' + encodeURIComponent(p.id); try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy this link', url); } };
}
function viewLists() {
  document.title = 'Lists — Lumi'; const L = lists();
  app.innerHTML = `<h1>Shopping lists</h1><p class="lead">Plan a shop, check items off in the store. Stored on this device.</p>
  <form class="lp-new card" id="nl"><input placeholder="New list, e.g. Costco run" aria-label="New list name" maxlength="40"><button class="btn pri">＋ New list</button></form>
  ${L.length ? `<div class="lists7">${L.map(l => { const t = l.items.reduce((a, i) => a + (i.net || 0), 0); return `<a class="card l7" href="#/list/${l.id}"><b>☰ ${esc(l.name)}</b><span>${l.items.length} item${l.items.length === 1 ? '' : 's'} · ${l.items.filter(i => i.done).length} checked</span><span class="small">avg ${l.items.length ? Math.round(t / l.items.length) : 0} g carbs/100</span></a>`; }).join('')}</div>` : `<div class="card empty">${MASCOT(80)}<b>No lists yet</b>Create one here, or tap “☰ Add to list” on any product.</div>`}`;
  $('#nl').onsubmit = e => { e.preventDefault(); const l = newList($('#nl input').value.trim() || 'My list'); go('#/list/' + l.id); };
}
function viewList(id) {
  const l = lists().find(x => x.id === id); if (!l) return viewLists(); document.title = l.name + ' — Lumi';
  const sortIt = it => it.slice().sort((a, b) => a.done - b.done || a.t - b.t);
  const draw = () => { const cur = lists().find(x => x.id === id); if (!cur) return viewLists(); const it = sortIt(cur.items); const open = it.filter(i => !i.done);
    app.innerHTML = `<div class="sec-h"><h1>☰ ${esc(cur.name)}</h1><a href="#/lists">All lists</a></div>
    <p class="lead">${it.length} item${it.length === 1 ? '' : 's'} · ${open.length} to buy${it.length ? ` · average Carb score ${Math.round(it.filter(i => i.score != null).reduce((a, i) => a + i.score, 0) / Math.max(1, it.filter(i => i.score != null).length))}` : ''}</p>
    <div class="actions"><button class="btn pri" id="lShare">↗ Share list</button><button class="btn" id="lRen">✎ Rename</button><button class="btn" id="lClr">Clear checked</button><button class="btn" id="lDel">🗑 Delete list</button></div>
    ${it.length ? `<div class="list">${it.map(i => `<div class="row l7i${i.done ? ' done' : ''}"><label class="ck"><input type="checkbox" data-ck="${esc(i.id)}" ${i.done ? 'checked' : ''} aria-label="Got it"></label><a class="t" href="#/product/${esc(i.id)}"><div class="n">${esc(i.name)}</div><div class="b">${esc(i.brand || '')}${i.net != null ? ` · ${r1(i.net)}g carbs/100` : ''}</div></a>${mini(i)}<button class="icon" data-rm="${esc(i.id)}" aria-label="Remove">✕</button></div>`).join('')}</div>` : `<div class="card empty">${MASCOT(80)}<b>Empty list</b>Search or scan a product, then tap “☰ Add to list”.</div>`}
    ${searchBox()}`;
    bindSearch();
    document.querySelectorAll('[data-ck]').forEach(c => c.onchange = () => { const L = lists(); const x = L.find(y => y.id === id); const i = x.items.find(y => y.id === c.dataset.ck); if (i) i.done = c.checked; setLists(L); draw(); });
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const L = lists(); const x = L.find(y => y.id === id); x.items = x.items.filter(y => y.id !== b.dataset.rm); setLists(L); draw(); });
    $('#lClr').onclick = () => { const L = lists(); const x = L.find(y => y.id === id); x.items = x.items.filter(y => !y.done); setLists(L); draw(); };
    $('#lDel').onclick = () => { if (!confirm('Delete "' + cur.name + '"?')) return; setLists(lists().filter(y => y.id !== id)); go('#/lists'); };
    $('#lRen').onclick = () => { const nm = prompt('List name', cur.name); if (!nm) return; const L = lists(); L.find(y => y.id === id).name = nm.slice(0, 40); setLists(L); draw(); };
    $('#lShare').onclick = async () => { const text = `${cur.name}\n` + it.map(i => `${i.done ? '☑' : '☐'} ${i.name}${i.brand ? ' (' + i.brand + ')' : ''}${i.net != null ? ` · ${r1(i.net)}g carbs/100` : ''}`).join('\n') + '\n\nvia Lumi'; if (navigator.share) { try { await navigator.share({ title: cur.name, text }); return; } catch (e) { if (e.name === 'AbortError') return; } } try { await navigator.clipboard.writeText(text); toast('List copied'); } catch { prompt('Copy your list', text); } };
  };
  draw();
}
/* "/" focuses search (desktop) */
document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { const q = document.getElementById('q'); if (q) { e.preventDefault(); q.focus(); q.select(); } else { e.preventDefault(); go('#/'); setTimeout(() => { const q2 = document.getElementById('q'); if (q2) q2.focus(); }, 60); } } });
