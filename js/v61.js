/* Lumi v6.1: image fallbacks, chain placeholders, per-item source lines, data-source disclosure, image credits. */
const OFFH = 'https://images.openfoodfacts.org/', OFFS = 'https://static.openfoodfacts.org/';
const BADIMG = /image-not-found|placeholder|no[-_]?image|default[-_]image/i;
const LumiImg = {
  ok(el) { const w = Math.max(el.naturalWidth, el.naturalHeight); if (!w || w < 150) { el.remove(); return; } el.classList.add('ok'); },
  err(el) { const s = el.getAttribute('src') || ''; if (s.startsWith(OFFH) && !el.dataset.f) { el.dataset.f = 1; el.src = OFFS + s.slice(OFFH.length); return; } el.remove(); }
};
function chainPH(brand) { let h = 0; for (const c of brand) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `<span class="chainph" style="--h:${h % 360}">${esc(brand)}</span>`; }
const isRestKeys = keys => (keys || []).some(k => (typeof k === 'number' ? (window.LumiCats && LumiCats.KEYS[k]) : k) === 'rest');
let CREDITS = null; const loadCredits = () => CREDITS ? Promise.resolve(CREDITS) : fetch('img/w/credits.json').then(r => r.json()).then(j => (CREDITS = j)).catch(() => null);
const A = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
function sourceParts(p) {
  const x = p.hx && p.hx.s; if (!x) return null; const code = p.code; const offU = 'https://world.openfoodfacts.org/product/' + code; const fdcU = x.fdc ? `https://fdc.nal.usda.gov/food-details/${x.fdc}/nutrients` : '';
  const offL = when => A(offU, 'Open Food Facts') + (when && x.om ? ` (last edit ${esc(x.om)})` : '');
  const usL = () => fdcU ? A(fdcU, 'USDA FoodData Central Branded Foods') + ` (GTIN ${esc(code)}${x.ud ? ', updated ' + esc(x.ud) : ''})` : 'USDA FoodData Central Branded Foods';
  const out = [];
  out.push(['Nutrition', x.n === 'o' ? offL(1) : x.n === 'u' ? usL() : p.meta ? (p.meta.url ? A(p.meta.url, p.meta.src) : esc(p.meta.src)) + (p.meta.date ? ', ' + esc(p.meta.date) : '') : '—']);
  out.push(['Ingredients', x.i === 'o' ? offL(1) : x.i === 'u' ? usL() : x.i === 'c' ? A(x.cu, (p.brand || 'Chain') + ' official menu page') : p.hx.w ? 'none (single whole food)' : 'not listed']);
  if (x.a) out.push(['Allergens', A(p.meta && p.meta.url || x.cu, (p.brand || 'Chain') + ' official allergen table')]);
  const wsl = x.p === 'w' && (p.img.match(/img\/w\/(.+)-\d+\.webp$/) || [])[1];
  out.push(['Photo', x.p === 'o' ? A(offU, 'Open Food Facts contributors') + ', ' + A('https://creativecommons.org/licenses/by-sa/3.0/', 'CC BY-SA') : x.p === 'c' ? A(x.cu, (p.brand || 'Chain') + ' official menu image') : wsl ? `<span data-wc="${esc(wsl)}">Wikimedia Commons</span> · ${'<a href="#/credits">credits</a>'}` : isRestKeys(p.keys || []) || p.src === 'chain' ? 'placeholder (no official image available)' : 'illustration (no free photo found)']);
  return out;
}
function sourceLine(p) { const s = sourceParts(p); return s ? `<div class="srcl">${s.map(([k, v]) => `<span><b>${k}:</b> ${v}</span>`).join(' · ')}</div>` : ''; }
function fillCredits() {
  const els = document.querySelectorAll('[data-wc]'); if (!els.length) return;
  loadCredits().then(c => { if (!c) return; els.forEach(el => { const m = c.credits[el.dataset.wc]; if (m) el.innerHTML = `${esc(m.artist)}, ${m.licUrl ? A(m.licUrl, m.license) : esc(m.license)}, via ${A(m.page, 'Wikimedia Commons')}`; }); });
}
const LBL = { o: 'Open Food Facts', u: 'USDA FoodData Central' };
function altCard(p) {
  const x = p.hx; if (!x || !x.alt || !x.s) return ''; const [as, a] = x.alt; const n = p.n;
  const R = [['Carbohydrate', 'carbs', 0, 'g'], ['Sugars', 'sugars', 1, 'g'], ['Fiber', 'fiber', 3, 'g'], ['Protein', 'protein', 4, 'g'], ['Fat', 'fat', 5, 'g'], ['Saturated fat', 'sat', 6, 'g'], ['Sodium', 'sodiumMg', 8, 'mg'], ['Energy', 'kcal', 9, 'kcal']];
  const f = (v, u) => v == null ? '—' : Math.round(v * 10) / 10 + ' ' + u;
  return `<details class="card"><summary><h2 style="display:inline">Data sources</h2> <span class="small">two databases list this barcode</span></summary>
  <div class="small" style="margin:8px 0">Lumi shows the more complete record (if tied, the more recently updated one). Both are per 100${p.liquid ? 'ml' : 'g'}. Check the package if they differ.</div>
  <table><tr><th></th><th>Shown: ${LBL[x.s.n]}</th><th>${LBL[as]}</th></tr>${R.map(([l, k, i, u]) => `<tr><td>${l}</td><td>${f(n[k], u)}</td><td${a[i] != null && n[k] != null && Math.abs(a[i] - n[k]) > Math.max(1, n[k] * 0.15) ? ' class="neg"' : ''}>${f(a[i], u)}</td></tr>`).join('')}</table></details>`;
}
function viewCredits() {
  app.innerHTML = '<div class="card"><h1>Image credits</h1><p class="small">Loading…</p></div>';
  loadCredits().then(c => {
    if (!c) { app.innerHTML = '<div class="card"><h1>Image credits</h1><p>Couldn\'t load credits.</p></div>'; return; }
    const L = Object.entries(c.credits).sort((a, b) => a[1].foods[0].localeCompare(b[1].foods[0]));
    app.innerHTML = `<div class="card"><h1>Image credits</h1><p class="small">Whole-food photos come from Wikimedia Commons under free licenses (Creative Commons or public domain). Lumi resized and cropped them to squares and hosts the copies itself. Product photos come from Open Food Facts contributors (CC BY-SA). Restaurant photos appear only when the chain publishes them on its own menu pages. Every other chain item gets a plain placeholder with the chain's name.</p></div>
    <div class="card"><ul class="credits">${L.map(([s, m]) => `<li><img src="img/w/${esc(s)}-200.webp" alt="" loading="lazy" width="56" height="56"><div><b>${esc(m.foods.join(', '))}</b><div class="small">${esc(m.artist)} · ${m.licUrl ? A(m.licUrl, m.license) : esc(m.license)} · ${A(m.page, m.file.replace(/_/g, ' '))}</div></div></li>`).join('')}</ul></div>`;
  });
}
