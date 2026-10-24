// ===== Lumi 19.0: new navigation (Home / Search / Browse / Today / My foods), Search landing, theme colour =====
function tab19(view, arg) {
  if (view === '' || view === 'home') return 'home';
  if (['search', 'product', 'compare', 'label'].includes(view)) return 'search';
  if (['browse', 'store', 'aisle', 'meal', 'cosmetics', 'cos', 'overview', 'additives', 'additive', 'ingredient', 'quick', 'fresh', 'prices', 'recipes', 'recipe'].includes(view)) return 'browse';
  if (['today', 'insights', 'glucose', 'review', 'report', 'week', 'dexcom', 'applehealth'].includes(view)) return 'today';
  if (['myfoods', 'saved', 'favorites', 'lists', 'list', 'custom', 'meals', 'history', 'alerts'].includes(view)) return 'myfoods';
  if (['about', 'credits', 'whatsnew', 'share'].includes(view)) return 'settings';
  return view;
}
function viewSearch19() {
  document.title = 'Search — Lumi';
  const rec = store.get('recent', []);
  const pop = ['popcorn', 'greek yogurt', 'tortilla', 'protein bar', 'bread', 'cereal', 'ice cream', 'pasta', 'crackers', 'granola'];
  const cats = (typeof C !== 'undefined' && C.TOP) ? C.TOP.slice(0, 12).map(k => `<a href="#/browse/${k}">${C.CATS[k][1]}</a>`).join('') : '';
  app.innerHTML = `<section class="srch19"><h1 tabindex="-1">Search</h1>
    <p class="lead74">Over 2.6 million foods: groceries, store brands and restaurant menus.</p>
    <div class="hs74">${searchBox()}</div>
    ${rec.length ? `<div class="grp19"><h2>Recent</h2><div class="rec74"><span class="sr-only">Recent searches</span>${rec.slice(0, 8).map(r => `<a href="#/search/${encodeURIComponent(r)}">${esc(r)}</a>`).join('')}<button id="clrRec19" type="button" aria-label="Clear recent searches">Clear</button></div></div>` : ''}
    <div class="grp19"><h2>Popular searches</h2><div class="chips19">${pop.map(t => `<a href="#/search/${encodeURIComponent(t)}">${t}</a>`).join('')}</div></div>
    <div class="grp19"><h2>Other ways to find food</h2><div class="tile19">
      <a href="#/browse/rest"><b>Restaurants</b><span>Official menu nutrition from ${(typeof rest19n === 'function' ? rest19n() : 'many')} chains</span></a>
      <a href="#/label"><b>Scan a label</b><span>Photo of a Nutrition Facts panel</span></a>
      <a href="#/browse"><b>Browse stores</b><span>Whole Foods, Costco and more</span></a>
      <a href="#/myfoods"><b>My foods</b><span>Your saved and custom foods</span></a></div></div>
    ${cats ? `<div class="grp19"><h2>Categories</h2><div class="chips19">${cats}</div></div>` : ''}</section>`;
  bindSearch();
  const c = document.getElementById('clrRec19'); if (c) c.onclick = () => { store.set('recent', []); viewSearch19(); };
  const q = document.getElementById('q'); if (q && matchMedia('(min-width:1024px)').matches) q.focus();
}
function rest19n() { try { const n = C.subs('rest').length; return n > 10 ? n : 'many'; } catch { return 'many'; } }
(function () {
  const meta = () => { const dark = (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    document.querySelectorAll('meta[name=theme-color]').forEach(m => m.setAttribute('content', dark ? '#0c0b19' : '#f5f4fb')); };
  meta(); new MutationObserver(meta).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (/^#\/search\/?$/.test(location.hash)) route();
  else { const h = location.hash.replace(/^#\/?/, ''); const v = h.split('/')[0]; const tv = tab19(v); document.querySelectorAll('.tabbar a').forEach(a => { const on = a.dataset.v === tv; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
})();
/* ===== 19.0: scores PER SERVING ===== */
function servTxt19(it) {
  if (!it || it.sb == null || it.sb < 0) return '';
  const k = it.sb & 3, u = it.sb & 4 ? 'ml' : 'g';
  return k === 0 ? `per serving (${it.sg} ${u})` : k === 1 ? 'per item' : k === 2 ? `per typical serving (${it.sg} ${u})` : `per 100 ${u} (no serving size)`;
}
let SV19 = null; // { id, mult } or { id, grams } — the serving chosen on the product page
(function () {
  const LS = window.LumiScore, LH = window.LumiHealth; if (!LS || !LH) return;
  const sc0 = LS.score, rt0 = LH.rate;
  const ov = p => SV19 && p && p.id === SV19.id ? (SV19.grams ? { grams: SV19.grams } : { mult: SV19.mult }) : null;
  LS.score = function (p, opt) { return sc0.call(this, p, opt || ov(p) || undefined); };
  LH.rate = function (p, opt) { const o = ov(p); return rt0.call(this, p, o ? Object.assign({}, opt || {}, o) : opt); };
  if (typeof HR === 'function') { const hr0 = HR; HR = function (p) { if (ov(p) && typeof _hr !== 'undefined' && _hr && _hr.delete) _hr.delete(p); const r = hr0(p); if (ov(p) && typeof _hr !== 'undefined' && _hr && _hr.delete) _hr.delete(p); return r; }; }
})();
function basisLine19(s) {
  if (!s || s.servKind == null) return '';
  const u = ''; const t = s.servKind === 'per100' ? s.servLabel : s.servKind === 'item' ? 'per item (as published)' : s.servKind === 'default' ? `per typical serving (${s.servLabel}) · no serving size on the label` : `per serving (${s.servLabel})`;
  const cap = s.treat ? `<div class="bl19 tr191" role="note"><b>Sweet treat:</b> sweets and sugary drinks are capped at ${LumiScore.TREAT_CAP || 30} on both scores at any serving size (${esc(s.treat.why)}, ${s.treat.s100} g sugar per 100 ${s.treat.why === 'sweetened drink' ? 'ml' : 'g'}).</div>` : '';
  const sm = s.small ? `<div class="bl19 sm192" role="note"><b>Used in small amounts:</b> ${esc(s.small.why)} is scored per labeled serving (usually 1–2 tbsp), not capped like sweets. A sugar-density penalty still applies, so check how much you actually use.</div>` : '';
  const dk = s.dark ? `<div class="bl19 sm192" role="note"><b>Dark chocolate (70%+ cacao):</b> not capped like candy because it has 25 g sugar or less per 100 g. Its sugar and saturated fat still count.</div>` : '';
  const ml = s.meal ? `<div class="bl19 sm192" role="note"><b>Whole meal:</b> Health is judged against a meal-sized reference (about 1/3 of daily values, ${LumiScore.MEAL_KCAL || 667} kcal) instead of a 100 g snack portion. Meals bigger than that count proportionally more.</div>` : '';
  return `<div class="bl19" role="note">Scores are ${esc(t)}${u}</div>` + cap + sm + dk + ml;
}
if (typeof ratingLines === 'function') { const rl0 = ratingLines; ratingLines = function (s) { return rl0.apply(this, arguments) + basisLine19(s); }; }
function servCtl19() {
  const m = location.hash.match(/^#\/product\/(.+)$/); if (!m) return; const id = decodeURIComponent(m[1]);
  const card = document.querySelector('#app .card .ph'); if (!card || document.querySelector('#app .sv19c')) return;
  const p = memo.get(id) || [...memo.values()].find(x => x.code === id || x.id === id); if (!p || !p.n || p.src === 'cos') return;
  const s = LumiScore.score(p); if (s.score == null) return;
  const cur = SV19 && SV19.id === p.id ? SV19 : { mult: 1 }; const u = p.liquid ? 'ml' : 'g';
  const base = LumiScore.servBasis(p, { mult: 1 });
  const el = document.createElement('div'); el.className = 'sv19c'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Serving size for scores');
  el.innerHTML = `<span class="sv19l">Serving</span>${[0.5, 1, 2].map(x => `<button type="button" data-sv19="${x}" aria-pressed="${!cur.grams && cur.mult === x}">${x === 0.5 ? '½' : x}×</button>`).join('')}
    <label class="sv19g"><span class="sr-only">Grams</span><input id="sv19in" type="number" inputmode="decimal" min="1" max="2000" step="1" value="${Math.round(cur.grams || base.g * (cur.mult || 1))}" aria-label="Serving in ${u}"> ${u}</label>
    <span class="sv19b">${base.kind === 'item' ? '1× = 1 item' : base.kind === 'per100' ? '1× = 100 ' + u + ' (no serving size)' : '1× = ' + esc(base.label)}</span>`;
  card.after(el);
  const go = v => sv19Apply(p, v, v.grams ? '#sv19in' : `[data-sv19="${v.mult}"]`);
  el.querySelectorAll('[data-sv19]').forEach(b => b.onclick = () => go({ mult: +b.dataset.sv19 }));
  const inp = el.querySelector('#sv19in'); inp.onchange = () => { const g = +inp.value; if (g > 0 && g <= 2000) go(base.kind === 'item' ? { mult: g / 100 } : { grams: g }); };
}
/* v19.2: the "Carbs for your portion" box and the Serving control stay in sync both ways, and logging/plating use that amount. */
function sv19Apply(p, v, focusSel) {
  const same = SV19 && SV19.id === p.id && SV19.grams === v.grams && SV19.mult === v.mult; if (same) return;
  SV19 = Object.assign({ id: p.id }, v); const y = scrollY; route();
  setTimeout(() => { scrollTo(0, y); const b = focusSel && document.querySelector(focusSel); if (b) b.focus(); }, 60);
}
function sv19FromGrams(p, g) {
  const base = LumiScore.servBasis(p, { mult: 1 });
  if (base.kind === 'item') return { mult: Math.round(g / 100 * 100) / 100 };
  for (const m of [0.5, 1, 2]) if (Math.abs(g - base.g * m) < 0.6) return { mult: m };
  return { grams: Math.round(g) };
}
if (typeof bindPortion === 'function') { const bp0 = bindPortion; bindPortion = function (p) { bp0.apply(this, arguments); try { portionSync19(p); } catch (e) { console.warn(e); } }; }
function portionSync19(p) {
  const sel = document.getElementById('porSel'), qty = document.getElementById('porQty'), sl = document.getElementById('porSlider'); if (!sel || !qty || !sl || !p || !p.n || p.src === 'cos') return;
  if (LumiScore.score(p).score == null) return;
  const base = LumiScore.servBasis(p, { mult: 1 }), perItem = base.kind === 'item', r2 = x => Math.round(x * 100) / 100;
  let opt = [...sel.options].find(o => Math.abs(+o.value - base.g) < 0.01);
  if (!opt && !perItem) { opt = new Option((base.kind === 'default' ? 'Typical serving: ' : 'Serving: ') + base.label, base.g); sel.insertBefore(opt, sel.firstChild); }
  const cur = SV19 && SV19.id === p.id ? SV19 : null, g = cur ? (cur.grams || base.g * (cur.mult || 1)) : base.g;
  if (opt) sel.value = opt.value;
  if (g > +sl.max) sl.max = Math.ceil(g * 2);
  qty.value = r2(g / (+sel.value || 1)); qty.oninput();
  const h2 = document.querySelector('#portion h2'); if (h2 && !document.querySelector('#portion .por192')) h2.insertAdjacentHTML('afterend', '<p class="small por192">Linked to <b>Serving</b> at the top of the page: changing either one updates both, and the scores, Blood sugar impact and log use this amount.</p>');
  const grams = () => (+sel.value || 0) * (+qty.value || 0);
  const push = sel2 => { const gg = grams(); if (gg > 0 && gg <= 4000) sv19Apply(p, sv19FromGrams(p, gg), sel2); };
  let t = 0; const later = sel2 => { clearTimeout(t); t = setTimeout(() => push(sel2), 450); };
  sel.addEventListener('change', () => push('#porSel'));
  qty.addEventListener('change', () => push('#porQty'));
  sl.addEventListener('change', () => push('#porSlider'));
  document.querySelectorAll('#portion .qty button').forEach(b => b.addEventListener('click', () => later(`#portion .qty button[data-q="${b.dataset.q}"]`)));
}
addEventListener('hashchange', () => { const m = location.hash.match(/^#\/product\/(.+)$/); if (!m || !SV19 || decodeURIComponent(m[1]) !== SV19.id) SV19 = null; });
(function () { let q = 0; const mo = new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { servCtl19(); } catch (e) { console.warn(e); } }); }); const a = document.getElementById('app'); if (a) mo.observe(a, { childList: true, subtree: true }); })();
/* 19.0 Top picks rule (per serving): both scores ≥ 60, 5–25 g total carbs and ≤ 6 g sugar per serving, and a real serving size
   (labeled, or a whole-food portion) — items scored per 100 g only are left out. */
function pickServ19(d) {
  if (!d || !d.sg || d.sb == null || d.sb < 0 || (d.sb & 3) >= 2 || d.net == null || d.sugar == null) return false;
  const c = d.net * d.sg / 100, sg = d.sugar * d.sg / 100; return c >= 5 && c <= 25 && sg <= 6;
}
