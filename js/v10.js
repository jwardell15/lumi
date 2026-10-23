/* Lumi 10.0 — design system layer: iOS-style shell, Yuka-style product page, line icons, minimal emoji. Pure presentation; data, scoring and constraints untouched. */
(function () {
  const I = {
    log: '<path d="M12 5v14M5 12h14"/>', save: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>', share: '<path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    browse: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    lists: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>', compare: '<path d="M7 4v16M17 4v16M3 8h8M13 16h8"/>',
    logbook: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>', rest: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 7h4M16 3c-1.5 2-2 4-2 7h3v11"/>',
    meal: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>', type: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
    label: '<path d="M4 4h10l6 6-10 10-6-6z"/><circle cx="9" cy="9" r="1.5"/>', scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/>',
    ideas: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>', plan: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6"/>',
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'
  };
  const svg = (k, s = 22) => `<svg class="i10" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;
  window.Lumi10 = { svg, I };
  const EMO = /^(?:[\p{Extended_Pictographic}\u2190-\u21ff\u2300-\u23ff\u2600-\u27bf\u2b00-\u2bff☰＋✓✕⇆↗♡♥]\uFE0F?\s*)+/u;
  function deEmoji(root) {
    root.querySelectorAll('.btn, .chip, h2, summary, .sec-h a, .lnk74').forEach(el => {
      if (el.dataset.e10) return; el.dataset.e10 = 1;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const t = w.nextNode();
      if (t && EMO.test(t.nodeValue) && t.nodeValue.replace(EMO, '').trim()) t.nodeValue = t.nodeValue.replace(EMO, '');
    });
  }
  const LBL = { Browse: 'browse', Lists: 'lists', Compare: 'compare', Log: 'logbook', Restaurants: 'rest', Meals: 'meal', 'Meal ideas': 'ideas', 'Meal plan': 'plan' };
  function home(app) {
    const sec = app.querySelector('.home74'); if (!sec || sec.dataset.h10) return; sec.dataset.h10 = 1; app.classList.add('h10');
    const nav = sec.querySelector('.sc74'); if (nav) nav.querySelectorAll('a').forEach(a => { const k = LBL[a.textContent.trim()]; if (k) a.innerHTML = `<span class="t10">${svg(k, 24)}</span><span>${a.textContent.trim()}</span>`; });
    const hs = sec.querySelector('#heroScan'); if (hs) { hs.innerHTML = `${svg('scan', 30)}<span class="hs10"><b>Scan a barcode</b><small>Point your camera at any US product</small></span>`; hs.classList.add('scan10'); sec.querySelector('.hs74').before(hs); }
    const tb = sec.querySelector('#typeBc'), lb = [...sec.querySelectorAll('a.lnk74')].find(a => /label/i.test(a.textContent));
    if (tb && lb && !sec.querySelector('.alt10')) { const d = document.createElement('div'); d.className = 'alt10'; tb.innerHTML = svg('type', 18) + '<span>Type a barcode</span>'; lb.innerHTML = svg('label', 18) + '<span>Scan a label photo</span>'; d.append(tb, lb); sec.querySelector('.hs74').after(d); }
  }
  function product(app) {
    const ph = app.querySelector('.ph'); if (!ph) return;
    const hero = ph.closest('.card'); if (!hero || hero.classList.contains('hero10')) return; app.dataset.p10 = location.hash;
    app.classList.add('p10'); app.classList.remove('split'); hero.classList.add('hero10');
    // flatten the two columns into one ordered flow
    app.querySelectorAll(':scope > .pcol').forEach(c => { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); });
    const sl = ph.querySelector('.sline'); const b = sl && sl.querySelector('b'); const n = b ? parseInt(b.textContent, 10) : NaN;
    if (sl && !isNaN(n)) {
      const dot = sl.querySelector('.sdot'); const cls = dot ? [...dot.classList].find(c => /^bg-/.test(c)) || 'bg-na' : 'bg-na';
      const lab = (sl.querySelector('.slab') || {}).firstChild; const L = lab ? String(lab.textContent).trim() : '';
      const C = 2 * Math.PI * 34, off = C * (1 - Math.max(0, Math.min(100, n)) / 100);
      const ring = document.createElement('div'); ring.className = 'score10 ' + cls.replace('bg-', 's-'); ring.setAttribute('role', 'img'); ring.setAttribute('aria-label', `${PRIM() === 'health' ? 'Health rating' : 'Carb score'} ${n} out of 100, ${L}`);
      ring.innerHTML = `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" class="tr"/><circle cx="40" cy="40" r="34" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg><span class="v"><b>${n}</b><small>/100</small></span>`;
      const wrap = document.createElement('div'); wrap.className = 'sc10'; wrap.append(ring); const tx = document.createElement('div'); tx.className = 'sct10'; tx.innerHTML = `<b>${L || 'Not rated'}</b><small>${PRIM() === 'health' ? 'Health rating' : 'Carb score'}</small>`; wrap.append(tx);
      sl.replaceWith(wrap);
    }
    // order: hero, positives/negatives, blood sugar, better choice, portion, health, then the rest in original order
    const pick = ['#fx75', '#bg8', '#better9', '#portion', '#hcard', '#swapsCard'].map(s => app.querySelector(':scope > ' + s)).filter(Boolean);
    let at = hero; for (const el of pick) { at.after(el); at = el; }
    // sticky actions (proxy to the existing, tested buttons)
    const act = hero.querySelector('.actions');
    if (act && !document.querySelector('.pbar10')) {
      const bar = document.createElement('div'); bar.className = 'pbar10'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Product actions');
      [['log', 'Log', '#addLog'], ['save', 'Save', '#save'], ['list', 'List', '#addList'], ['share', 'Share', '#share']].forEach(([k, t, sel]) => {
        const o = document.querySelector(sel); if (!o) return; const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'pb10' + (k === 'log' ? ' pri' : ''); bt.innerHTML = svg(k, 22) + `<span>${t}</span>`;
        bt.addEventListener('click', () => { const x = document.querySelector(sel); if (k === 'log' && x) x.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); x && x.click(); }); bar.append(bt);
      });
      document.body.append(bar); document.body.classList.add('hasbar10');
      act.classList.add('sec10'); ['#share', '#save', '#addList'].forEach(s => { const x = act.querySelector(s); if (x) x.classList.add('dup10'); });
    }
  }
  function clean() { if (!document.querySelector('#app .hero10')) { document.querySelectorAll('.pbar10').forEach(x => x.remove()); document.body.classList.remove('hasbar10'); } }
  function tabbar() {
    const tb = document.querySelector('.tabbar'); if (!tb || tb.dataset.t10) return; tb.dataset.t10 = 1;
    const h = tb.querySelector('a[data-v=home]'); if (h) { h.querySelector('svg').outerHTML = svg('home', 24); h.querySelector('span').textContent = 'Home'; }
    const brand = document.createElement('a'); brand.href = '#/'; brand.className = 'side10'; brand.setAttribute('aria-label', 'Lumi home'); brand.innerHTML = '<img src="icons/mascot-128.png" width="36" height="36" alt=""><span>lumi</span>'; tb.prepend(brand);
    const lg = tb.querySelector('a[data-v=log]'); if (lg) lg.insertAdjacentHTML('afterend', `<a href="#/ideas" data-v="ideas" class="side13">${svg('ideas', 24)}<span>Meal ideas</span></a><a href="#/plan" data-v="plan" class="side13">${svg('plan', 24)}<span>Meal plan</span></a>`); // v13.0.1: desktop sidebar only
  }
  let q = 0; const run = () => { q = 0; const app = document.getElementById('app'); if (!app) return; tabbar(); clean(); home(app); product(app); deEmoji(app); deEmoji(document.querySelector('.tabbar') || app); app.classList.toggle('p10', !!app.querySelector('.hero10')); app.classList.toggle('h10', !!app.querySelector('.home74')); };
  const mo = new MutationObserver(() => { if (!q) q = requestAnimationFrame(run); });
  const start = () => { const app = document.getElementById('app'); if (app) mo.observe(app, { childList: true, subtree: true }); run(); };
  addEventListener('hashchange', () => { document.querySelectorAll('.pbar10').forEach(x => x.remove()); document.body.classList.remove('hasbar10'); const a = document.getElementById('app'); if (a) delete a.dataset.p10; });
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
})();
