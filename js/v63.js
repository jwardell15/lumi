/* Lumi v6.3: shop by store (store brands + OFF "stores" field) and grocery aisles. All local, from the bundled index. */
const STO = window.LumiStores, AIS = window.LumiAisles;
function storeChips() { return `<div class="sec-h"><h2>Shop by store</h2></div><div class="chips storechips">${STO.STORES.map(s => `<a class="chip" href="#/store/${s[0]}" data-store="${s[0]}">🏪 ${esc(s[1])}</a>`).join('')}</div>`; }
function aisleTiles() { return `<div class="sec-h"><h2>Grocery aisles</h2></div><div class="aisles">${AIS.AISLES.map(a => `<a class="aisle" href="#/aisle/${a[0]}"><span>${a[2]}</span><b>${esc(a[1])}</b></a>`).join('')}</div>`; }
const SORTS = [['score', 'Carb score'], ['health', 'Health'], ['carb', 'Lowest net carbs']];
function sortDocs(L, how) {
  const k = how === 'health' ? d => d.h : d => d.score;
  if (how === 'carb') return L.sort((a, b) => (a.net ?? 999) - (b.net ?? 999) || (b.score ?? -1) - (a.score ?? -1));
  // ties: the other rating, then fewer net carbs, then has a photo, then popularity
  const o = how === 'health' ? d => d.score : d => d.h;
  const full = d => (d.img ? 2 : 0) + (d.h != null && d.hn === false ? 1 : 0) + (d.h != null ? 1 : 0); // photo + complete data first
  return L.sort((a, b) => ((k(b) ?? -1) - (k(a) ?? -1)) || full(b) - full(a) || ((o(b) ?? -1) - (o(a) ?? -1)) || ((a.net ?? 999) - (b.net ?? 999)) || (b.img ? 1 : 0) - (a.img ? 1 : 0) || a.rank - b.rank);
}
/* v6.3.3: never more than 2 in a row from the same subcategory (looks ahead up to 300 items) */
function diversify(L, n = L.length) { const out = [], rest = L.slice(); while (out.length < n && rest.length) { const a = out[out.length - 1], b = out[out.length - 2];
  let j = 0; if (a && b && a.ai === b.ai) { j = rest.findIndex((d, i) => i < 300 && d.ai !== a.ai); if (j < 0) j = 0; } out.push(rest.splice(j, 1)[0]); } return out.concat(rest); }
const RAW = new Set(['pr-fruit', 'pr-veg', 'mt-poultry', 'mt-meat', 'mt-seafood', 'fz-veg', 'fz-fruit', 'fz-meat'].map(k => AIS.BYID[k]));
const RAWNAME = /\b(salmon|cod|tilapia|halibut|trout|pollock|haddock|mahi|shrimp|prawns|scallops|crab legs|lobster tails?|chicken (breasts?|thighs?|tenderloins?|tenders|wings|drumsticks|legs|quarters)|whole chicken|turkey breast|ground (beef|turkey|chicken|pork|bison)|beef|steaks?|sirloin|ribeye|brisket|pork (loin|chops?|tenderloin|shoulder|butt)|lamb|spinach|spring mix|romaine|hearts of romaine|salad greens|arugula|lettuce|kale|broccoli|cauliflower|green beans|asparagus|brussels|vegetable (blend|medley)|stir fry vegetables|mixed vegetables|berries|strawberries|blueberries|raspberries|blackberries|cherries|mangos?|peaches|avocados?|apples|bananas|grapes|edamame|peas|carrots|onions|potatoes|mushrooms)\b/i;
const PROC = /\b(seasoned|breaded|nuggets?|sausages?|jerky|smoked|patties|burgers?|meatballs?|dip|chips|crisps|bars?|snacks?|dried|freeze[- ]dried|jam|juice|smoothie|pie|soup|sauce|salad kit|kit|meal|bowl|entree|pizza|dumplings?|rolls?|marinated|teriyaki|bbq|fried|tempura|cakes?|butter|oil|flakes|powder|seaweed|canned|pouch|tuna)\b/i;
const isPackaged = d => !RAW.has(d.ai) && d.src !== 'whole' && !(RAWNAME.test(d.name) && !PROC.test(d.name));
function listPage({ title, sub, chips, docs, key, keepFill }) {
  const st = store.get('shopSort', 'score'); let lim = 60;
  const nf = keepFill ? 0 : docs.filter(d => d.fl).length;
  const draw = () => { docs.forEach(d => d.sizes = 0); const D = LumiSearch.dedupe(sortDocs(docs.filter(d => keepFill || !d.fl), st), x => x, lim + 1); const L = diversify(D); $('#shopList').innerHTML = L.length ? `<div class="list">${L.slice(0, lim).map(d => rowHTML(itemFromDoc(d))).join('')}</div>${L.length > lim ? '<button class="btn wide" id="shopMore">Show more</button>' : ''}` : `<div class="card empty">${MASCOT(80)}<b>Nothing here yet</b>No products in Lumi's index match this.</div>`;
    const m = $('#shopMore'); if (m) m.onclick = () => { lim += 60; draw(); }; };
  app.innerHTML = `<h1>${title}</h1>${sub ? `<p class="lead">${sub}</p>` : ''}${chips || ''}
    <div class="chips sortchips">${SORTS.map(([k, l]) => `<button class="chip${k === st ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div><div id="shopList"></div>
    ${nf ? `<p class="small">${nf.toLocaleString()} basics with ~no carbs (water, plain tea/coffee, salt, spices…) are left out of this ranking; find them in their own aisle sections.</p>` : ''}<p class="foot">Store matches come from store-brand names and the "stores" field on Open Food Facts. Availability varies by location. Informational only, not medical advice.</p>`;
  document.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { store.set('shopSort', b.dataset.sort); listPage({ title, sub, chips, docs, key, keepFill }); });
  draw();
}
async function shopLoad() { app.innerHTML = `<div class="card">${'<div class="sk skl" style="height:36px;margin:8px 0"></div>'.repeat(6)}</div>`; await loadIndex(); await loadIndexX().catch(() => {}); }
async function viewStore(arg) {
  const [id, sub] = String(arg || '').split('/'); const i = STO.STORES.findIndex(s => s[0] === id); if (i < 0) return viewHome();
  const s = STO.STORES[i]; document.title = `${s[2]} — Lumi`; await shopLoad(); if (!location.hash.startsWith('#/store/' + id)) return;
  const own = d => (d.sm & (1 << i)) !== 0, sold = d => (d.sm & (1 << (16 + i))) !== 0;
  const all = engine.docs.filter(d => own(d) || sold(d)); const nOwn = all.filter(own).length;
  const mode = sub === 'all' ? 'all' : 'own'; const kind = store.get('storeKind', 'packaged'); const L0 = mode === 'own' ? all.filter(own) : all; const L = kind === 'packaged' ? L0.filter(isPackaged) : L0.filter(d => !isPackaged(d));
  const chips = `<div class="chips"><a class="chip${mode === 'own' ? ' on' : ''}" href="#/store/${id}">${esc(s[1])} store brands (${nOwn.toLocaleString()})</a><a class="chip${mode === 'all' ? ' on' : ''}" href="#/store/${id}/all">Everything tagged at ${esc(s[2])} (${all.length.toLocaleString()})</a></div>` + `<div class="chips kindchips"><button class="chip${kind === 'staples' ? ' on' : ''}" data-kind="staples">🥩 Everyday staples (${L0.filter(d => !isPackaged(d)).length.toLocaleString()})</button><button class="chip${kind === 'packaged' ? ' on' : ''}" data-kind="packaged">📦 Packaged picks (${L0.filter(isPackaged).length.toLocaleString()})</button></div>` + storeChips().replace(`data-store="${id}"`, `data-store="${id}" aria-current="true" style="outline:2px solid var(--acc)"`).replace(/<div class="sec-h">.*?<\/div>/, '');
  setTimeout(() => document.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { store.set('storeKind', b.dataset.kind); viewStore(arg); }));
  listPage({ title: `🏪 ${esc(s[2])}`, sub: mode === 'own' ? `Store brands sold at ${esc(s[2])}.${kind === 'packaged' ? ' Packaged picks leave out raw meat, fish and produce.' : ' Everyday staples are raw meat, fish and produce.'}` : `Store brands, plus products Open Food Facts contributors tagged as sold at ${esc(s[2])}.`, chips, docs: L });
}
async function viewAisle(arg) {
  const [aid, sid] = String(arg || '').split('/'); const a = AIS.AISLES.find(x => x[0] === aid); if (!a) return viewHome();
  document.title = `${a[1]} — Lumi`; await shopLoad(); if (!location.hash.startsWith('#/aisle/' + aid)) return;
  const subs = AIS.SUB.map((s, i) => [s, i]).filter(([s]) => s[1] === aid); const set = new Set(subs.map(x => x[1]));
  const inA = engine.docs.filter(d => set.has(d.ai)); const cnt = {}; inA.forEach(d => cnt[d.ai] = (cnt[d.ai] || 0) + 1);
  const si = sid != null ? AIS.BYID[sid] : null; const L = si != null ? inA.filter(d => d.ai === si) : inA;
  const chips = `<div class="chips subchips"><a class="chip${si == null ? ' on' : ''}" href="#/aisle/${aid}">All (${inA.length.toLocaleString()})</a>${subs.filter(([, i]) => cnt[i]).map(([s, i]) => `<a class="chip${i === si ? ' on' : ''}" href="#/aisle/${aid}/${s[0]}">${esc(s[2])} (${cnt[i].toLocaleString()})</a>`).join('')}</div>`;
  listPage({ title: `${a[2]} ${esc(a[1])}${si != null ? ' · ' + esc(AIS.SUB[si][2]) : ''}`, chips, docs: L, keepFill: si != null && /water|tea|coffee|spice|season|salt|herb|extract|sweeten|baking|broth|gum|mint/i.test(AIS.SUB[si][2] + ' ' + AIS.SUB[si][0]) });
}
