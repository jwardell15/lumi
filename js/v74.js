/* Lumi 7.4: calm home + Browse hub */
const ALC74 = /\b(wine|ros[eé]|beer|ale|lager|ipa|stout|cider|vodka|tequila|rum|gin|whiske?y|bourbon|cocktail|margarita|mimosa|sangria|spritz|seltzer|hard|spiked|champagne|prosecco|sake|soju|mead|liqueur|alcohol)\b/i;
const COND74 = /\b(sauce|dressing|condiment|ketchup|mustard|mayo|mayonnaise|salsa|dip|spread|syrup|seasoning|vinegar|oil|marinade|relish|gravy|bouillon|broth|stock|jam|jelly|honey|sweetener|creamer|butter|ghee|lard|seasoned salt|rub|pesto|hummus)\b/i;
const KINDS74 = [['yogurt', /yogurt|yoghurt|skyr|kefir|light and free|light \+ fit|hipro|\bgreek\b|oikos|chobani|fage/i], ['milk', /\bmilk\b/i], ['cheese', /cheese|mozzarella|cheddar/i], ['eggs', /\beggs?\b/i], ['fruit', /berr|apple|orange|grape|melon|cherr|peach|pear|banana|kiwi|mango|fruit/i], ['veg', /broccoli|spinach|salad|greens|kale|carrot|pepper|cauliflower|bean|pea\b|veg/i], ['nuts', /almond|cashew|pistachio|walnut|pecan|nut|seed/i], ['bars', /\bbars?\b/i], ['cereal', /cereal|granola|oat/i], ['bread', /bread|tortilla|wrap|bagel|bun/i], ['meat', /chicken|turkey|beef|jerky|salmon|tuna|sausage|ham\b/i], ['snack', /chips|crisps|crackers|popcorn|puffs/i]];
function kind74(d) { const t = d.name + ' ' + d.brand + ' ' + d.cat + ' ' + ((d.keys || []).map(k => C.KEYS[k]).join(' ')); for (const [k, re] of KINDS74) if (re.test(t)) return k; return 'ai' + d.ai; }
function homePicks() {
  const out = [], brands = new Map(), cats = new Set(); let nd = 0; const ks = new Set(['sauces', 'drinks', 'sweets'].map(k => C.KEYS.indexOf(k)));
  const pool = engine.docs.filter(d => d.src === 'local' && d.score != null && d.score >= 82 && d.net != null && d.net >= 2 && d.net <= 25 && !d.fl && !d.bad && !d.zc && !(d.wf & 1) && d.img && d.brand && d.rank < 40000
    && !isStaple(d) && !isSugaryDrink(d) && usEnglish(d) && !ALC74.test(d.name + ' ' + d.cat) && !COND74.test(d.name + ' ' + d.cat) && !d.keys.some(k => ks.has(k)) && !/\bwater\b/i.test(d.name) && !/\b(protein powder|powder|supplement|vitamins?|capsules?|gummies|shake mix|peanut butter|nut butter|peanuts?|creamy)\b|\bprotein (shake|drink)|^organic protein\b/i.test(d.name) && d.net >= 2);
  const KB = LumiSearch.KNOWNB; pool.sort((a, b) => (KB.test(b.brand) - KB.test(a.brand)) || a.rank - b.rank);
  for (const d of pool) { const b = d.brand.toLowerCase().split(/[\s,]/)[0], c = kind74(d); const dairy = ['yogurt', 'milk', 'cheese'].includes(c); if (cats.has(c) || (brands.get(b) || 0) >= 1 || (dairy && nd >= 2)) continue; if (dairy) nd++; out.push(d); cats.add(c); brands.set(b, (brands.get(b) || 0) + 1); if (out.length >= 6) break; }
  return out;
}
function restPicks74() { let r = []; try { r = bestAtRestaurants(); } catch {} return r.filter(d => !ALC74.test(d.name)).slice(0, 4); }
function newsPill() { if (store.get('seenV', '') === VERSION) return ''; return `<div class="pill74" id="pill74"><a href="#/whatsnew">New in Lumi ${VERSION} ›</a><button aria-label="Dismiss" id="pill74x">✕</button></div>`; }
const SC74 = [['#/browse', 'Browse'], ['#/myfoods', 'My foods'], ['#/lists', 'Lists'], ['#/compare', 'Compare'], ['#/log', 'Log'], ['#/browse/rest', 'Restaurants']];
function viewHome() {
  const rec = store.get('recent', []), es = (typeof todayEntries === 'function' ? todayEntries() : null);
  const logged = (() => { try { const h = todayCard(); return /Nothing logged today/.test(h) ? '' : h; } catch { return ''; } })();
  app.innerHTML = `<section class="home74">
    ${newsPill()}
    <h1>${greeting()}</h1><p class="lead74">Search or scan a food to see its carbs and health rating.</p>
    <div class="hs74">${searchBox()}<button class="scan74" id="heroScan" aria-label="Scan a barcode"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg><span>Scan</span></button></div>
    <button class="lnk74" id="typeBc">Type a barcode instead</button> <a class="lnk74" href="#/label">Scan a label photo</a>
    ${logged ? `<div class="log74">${logged}</div>` : ''}
    <nav class="sc74" aria-label="Shortcuts">${SC74.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
    ${rec.length ? `<div class="rec74"><span>Recent</span>${rec.slice(0, 6).map(r => `<a href="#/search/${encodeURIComponent(r)}">${esc(r)}</a>`).join('')}<button id="clrRec" aria-label="Clear recent searches">Clear</button></div>` : ''}
    <div class="sec-h"><h2>Top picks</h2><a href="#/browse">Browse all</a></div><div id="picks">${skel(3)}</div>
    <details class="rest74" id="restBest"><summary>Good picks at restaurants</summary><div class="list" id="restList"></div><a class="lnk74" href="#/browse/rest">All chains ›</a></details>
    <p class="foot">Lumi ${VERSION} · <a class="lnk" href="#/whatsnew">What's new</a> · Informational only, not medical advice.</p></section>`;
  bindSearch();
  $('#heroScan').onclick = startScan; $('#typeBc').onclick = () => typeBarcode('');
  if ($('#pill74x')) $('#pill74x').onclick = () => { store.set('seenV', VERSION); $('#pill74').remove(); };
  if ($('#clrRec')) $('#clrRec').onclick = () => { store.set('recent', []); viewHome(); };
  const draw = err => { const el = $('#picks'); if (!el) return; let p = []; try { p = homePicks(); } catch (e) { console.warn(e); }
    if (p.length) el.innerHTML = `<div class="list">${p.map(d => rowHTML(itemFromDoc(d))).join('')}</div>`;
    else { el.innerHTML = `<div class="card" role="status"><p class="small">${err ? "Top picks couldn't load. Check your connection." : 'No top picks to show right now.'} <a class="lnk" href="#/browse">Browse all</a></p>${err ? '<button class="btn" id="picksRetry" type="button">Try again</button>' : ''}</div>`;
      const r = $('#picksRetry'); if (r) r.onclick = () => { el.innerHTML = skel(3); loadIndex().then(() => draw()).catch(() => draw(true)); }; }
    const rl = $('#restList'); if (rl) rl.innerHTML = restPicks74().map(d => rowHTML(itemFromDoc(d))).join(''); };
  loadIndex().then(() => draw()).catch(() => draw(true)); // v9: home needs only tier 0 (≈0.65 MB gz); the larger tiers load when you search
}
function viewBrowseHub() {
  document.title = 'Browse — Lumi';
  app.innerHTML = `<section class="browse74"><h1>Browse</h1>
    ${storeChips()}
    ${aisleTiles()}
    <div class="sec-h"><h2>Categories</h2></div><div class="chips">${C.TOP.map(k => `<a class="chip" href="#/browse/${k}">${C.CATS[k][1]}</a>`).join('')}</div>
    <div class="sec-h"><h2>Tools</h2></div><div class="tools74">
      <a href="#/meal"><b>Meal builder</b><span>Add up a plate's carbs</span></a>
      <a href="#/compare"><b>Compare</b><span>Side by side</span></a>
      <a href="#/lists"><b>Shopping lists</b><span>${typeof listsSummary === 'function' ? listsSummary() : ''}</span></a>
      <a href="#/overview"><b>Overview</b><span>Your stats</span></a>
      <a href="#/additives"><b>Additives</b><span>What's in it</span></a>
      <a href="#/cosmetics"><b>Cosmetics</b><span>Shampoo, sunscreen…</span></a>
      <a href="#/label"><b>Scan a label</b><span>Photo of Nutrition Facts</span></a>
      <a href="#/alerts"><b>Ingredient alerts</b><span>Your watchlist</span></a>
      <a href="#/meals"><b>Saved meals</b><span>One-tap logging</span></a>
      <a href="#/report"><b>Log report</b><span>Printable summary for your endo</span></a>
    </div></section>`;
}
