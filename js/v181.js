'use strict';
/* Lumi 18.1: desktop layout (wider, centered, two-column Home), store grid with pinned favorites (Whole Foods + Costco by default),
   extra grocery / convenience stores matched by their own store-brand names in the existing USDA + Open Food Facts data. Loaded last. */
const X181 = [["foodlion", "Food Lion", "Food Lion", "^food lion\\b", ""], ["giant", "Giant", "Giant Food / Giant Company", "^giant( food| company)?\\b(?! eagle| tiger)", ""], ["stopshop", "Stop & Shop", "Stop & Shop", "^stop ?(&|and) ?shop\\b", ""], ["hannaford", "Hannaford", "Hannaford", "^hannaford\\b", ""], ["harristeeter", "Harris Teeter", "Harris Teeter", "^harris teeter\\b", ""], ["shoprite", "ShopRite · Bowl & Basket", "ShopRite", "^(shoprite|shop rite|bowl (&|and) basket)\\b", ""], ["gianteagle", "Giant Eagle · Market District", "Giant Eagle", "^(giant eagle|market district)\\b", ""], ["weis", "Weis", "Weis Markets", "^weis\\b", ""], ["schnucks", "Schnucks", "Schnucks", "^schnucks\\b", ""], ["raleys", "Raley's", "Raley's", "^raley'?s\\b", ""], ["smartfinal", "First Street", "Smart & Final", "^(smart (&|and) final|first street)\\b", ""], ["staterbros", "Stater Bros.", "Stater Bros.", "^stater bros\\b", ""], ["tops", "Tops", "Tops Markets", "^tops( markets)?$|^tops (friendly|markets)\\b", ""], ["winndixie", "Winn-Dixie · SE Grocers", "Winn-Dixie", "^(winn ?-?dixie|se grocers)\\b", ""], ["marketbasket", "Market Basket", "Market Basket", "^market basket\\b", ""], ["lowesfoods", "Lowes Foods", "Lowes Foods", "^lowes foods\\b", ""], ["winco", "WinCo Foods", "WinCo", "^winco\\b", ""], ["lidl", "Lidl · Preferred Selection", "Lidl", "^(lidl|preferred selection)\\b", ""], ["pricechopper", "Price Chopper", "Price Chopper", "^price chopper\\b", ""], ["ingles", "Laura Lynn", "Ingles", "^(ingles|laura lynn)\\b", ""], ["freshmarket", "The Fresh Market", "The Fresh Market", "^the fresh market\\b", ""], ["bjs", "Wellsley Farms", "BJ's Wholesale", "^(wellsley farms|berkley (&|and )?jensen)\\b", ""], ["naturalgrocers", "Natural Grocers", "Natural Grocers", "^natural grocers\\b", ""], ["dollargeneral", "Clover Valley", "Dollar General", "^(clover valley|dollar general)\\b", "c"], ["cvs", "Gold Emblem", "CVS", "^(cvs|gold emblem)\\b", "c"], ["walgreens", "Nice!", "Walgreens", "^(walgreens\\b|nice!)", "c"]];
/* [id, brand line, store name, store-brand regex (lower-case brand), 'c' = convenience/drugstore]. Counts are computed live from the loaded index. */
const XN181 = {"lidl": 927, "bjs": 875, "foodlion": 2362, "giant": 768, "winco": 617, "smartfinal": 2044, "harristeeter": 2759, "freshmarket": 519, "walgreens": 939, "dollargeneral": 1368, "staterbros": 1283, "stopshop": 219, "shoprite": 3560, "hannaford": 2288, "gianteagle": 3592, "weis": 2896, "naturalgrocers": 56, "winndixie": 1857, "schnucks": 2430, "raleys": 2371, "cvs": 867, "pricechopper": 474, "marketbasket": 1083, "tops": 1681, "ingles": 426, "lowesfoods": 730}; /* counts from the 18.1 index build; replaced by live counts after a store page loads */
const XS181 = X181.map(x => ({ id: x[0], line: x[1], name: x[2], re: new RegExp(x[3]), c: x[4] === 'c' }));
const PIN0_181 = ['wholefoods', 'costco'];
function pins181() { const p = store.get('pin181', null); return Array.isArray(p) ? p : PIN0_181.slice(); }
function stores181() { /* unified list: core stores (store-brand + "sold at" tags) and extra brand-matched stores */
  const v = (META && META.v63 && META.v63.stores) || {};
  const core = STO.STORES.map(s => ({ id: s[0], line: s[1], name: s[2], c: s[5] === 'c', n: (v[s[0] + ':brand'] || 0) + (v[s[0] + ':soldAt'] || 0) }));
  core.forEach(s => { if (s.id === 'safeway') s.name = 'Safeway & Albertsons'; });
  const xc = Object.assign({}, XN181, store.get('xs181n', {}) || {});
  return core.concat(XS181.map(s => ({ id: s.id, line: s.line, name: s.name, c: s.c, n: xc[s.id] || 0, x: 1 }))); }
const ICON181 = { wholefoods: '🥬', costco: '🛒', walmart: '🏬', target: '🎯', traderjoes: '🌺', aldi: '🧺', heb: '⭐', samsclub: '📦', sprouts: '🌱' };
function card181(s, pinned, feat) { const n = s.n ? `<span class="n181">${s.n.toLocaleString()} products</span>` : '';
  const pin = `<button type="button" class="pin181" data-pin181="${esc(s.id)}" aria-pressed="${pinned}" aria-label="${pinned ? 'Unpin' : 'Pin'} ${esc(s.name)}">${pinned ? '★' : '☆'}</button>`;
  const extra = feat && s.id === 'costco' ? `<a class="sub181" href="#/browse/rest-costco-food-court">🍕 Costco Food Court <span>Official nutrition: pizza, hot dogs, Chicken Bake, treats</span></a>` : feat && s.id === 'wholefoods' ? `<a class="sub181" href="#/store/wholefoods/all">🛍 Everything tagged at Whole Foods <span>365 plus other brands sold there</span></a>` : '';
  return `<div class="st181${feat ? ' feat' : ''}"><a class="m181" href="#/store/${esc(s.id)}"><b>${feat ? (ICON181[s.id] || '🏪') + ' ' : ''}${esc(s.name)}</b><span class="l181">${esc(s.line)}</span>${n}</a>${pin}${extra}</div>`; }
storeChips = function () { const all = stores181(), P = pins181(); const byId = Object.fromEntries(all.map(s => [s.id, s]));
  const feat = P.map(id => byId[id]).filter(Boolean); const rest = all.filter(s => !P.includes(s.id));
  const grid = L => `<div class="sg181">${L.map(s => card181(s, false)).join('')}</div>`;
  return `<div class="sec-h"><h2>Shop by store</h2></div>
    <p class="small hint181">Tap ☆ to pin a store to the top. Pins are saved on this device only.</p>
    ${feat.length ? `<div class="fg181">${feat.map(s => card181(s, true, true)).join('')}</div>` : ''}
    <h3 class="h181">All grocery stores</h3>${grid(rest.filter(s => !s.c))}
    <div class="sec-h"><h2>Convenience &amp; drugstores</h2></div>${grid(rest.filter(s => s.c))}
    <p class="small">Store pages list each store's own-brand products found in USDA and Open Food Facts data; the main stores also include products tagged as sold there. Albertsons, Vons, Jewel-Osco and Acme are part of Safeway &amp; Albertsons.</p>`; };
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pin181]'); if (!b) return; e.preventDefault();
  const id = b.dataset.pin181, P = pins181(); const i = P.indexOf(id); if (i >= 0) P.splice(i, 1); else P.push(id); store.set('pin181', P);
  const y = scrollY; route(); setTimeout(() => { scrollTo(0, y); const nb = document.querySelector(`[data-pin181="${CSS.escape(id)}"]`); if (nb) nb.focus(); }, 30);
  try { toast(i >= 0 ? 'Unpinned' : 'Pinned to the top'); } catch {} });
/* live counts for the extra stores once the index is loaded (cached for the store grid) */
function count181() { if (!engine || !engine.docs || engine.docs.length < 100000) return; const n = {};
  for (const d of engine.docs) { const b = String(d.brand || '').toLowerCase().replace(/’/g, "'").trim(); if (!b) continue; for (const s of XS181) if (s.re.test(b)) { n[s.id] = (n[s.id] || 0) + 1; break; } }
  store.set('xs181n', n); return n; }
/* store page for the extra stores (brand-matched) */
(function () { const v0 = viewStore;
  viewStore = async function (arg) { const [id] = String(arg || '').split('/'); const s = XS181.find(x => x.id === id); if (!s) return v0(arg);
    document.title = `${s.name} — Lumi`; await shopLoad(); if (!location.hash.startsWith('#/store/' + id)) return;
    const own = engine.docs.filter(d => s.re.test(String(d.brand || '').toLowerCase().replace(/’/g, "'").trim())); count181();
    const kind = store.get('storeKind', 'packaged'); const L = kind === 'packaged' ? own.filter(isPackaged) : own.filter(d => !isPackaged(d));
    const chips = `<div class="chips kindchips"><button class="chip${kind === 'staples' ? ' on' : ''}" data-kind="staples">🥩 Staples & ingredients (${own.filter(d => !isPackaged(d)).length.toLocaleString()})</button><button class="chip${kind === 'packaged' ? ' on' : ''}" data-kind="packaged">📦 Packaged (${own.filter(isPackaged).length.toLocaleString()})</button></div>`;
    setTimeout(() => document.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { store.set('storeKind', b.dataset.kind); viewStore(arg); }));
    listPage({ title: `🏪 ${esc(s.name)}`, sub: `${esc(s.line)} store-brand products found in USDA and Open Food Facts data (${own.length.toLocaleString()}). Not every store item is listed.`, chips, docs: L, blend: kind === 'packaged' }); };
  self.viewStore = viewStore; })();
if (typeof loadMeta === 'function') loadMeta().then(() => { if (/^#\/browse\/?$/.test(location.hash)) route(); });
/* Home: hero row (scan + search | Today card) on desktop */
(function () { const fix = () => { const h = document.querySelector('#app .home74'); if (!h || h.querySelector('.hr181')) return;
  const sc = h.querySelector('.scan74'), hs = h.querySelector('.hs74'), alt = h.querySelector('.alt10'), td = h.querySelector('.td16'); if (!sc || !hs) return;
  const row = document.createElement('div'); row.className = 'hr181'; const L = document.createElement('div'); L.className = 'hl181';
  if ([sc, hs, alt, td].some(e => e && e.parentElement !== h)) return; sc.before(row); row.append(L); [sc, hs, alt].forEach(e => e && L.append(e)); if (td) row.append(td); };
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; fix(); }); }).observe(document.getElementById('app'), { childList: true, subtree: true }); fix(); })();
