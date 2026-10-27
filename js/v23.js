/* Lumi 23.0: redesign helpers. Reads scores the app already computed (no formula changes).
   - Product score pair (.sp23): Overall health on the left, Blood sugar on the right, each with its serving.
   - Nav: aria-current on the active tab.  - Home masthead wrapper.  - Chain chip row scrolls the active chip into view. */
(function () {
  'use strict';
  const BANDS = { ex: 'Excellent', gd: 'Good', pr: 'Poor', bd: 'Bad', na: 'Not rated' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function band(el, re) { const c = el && [...el.classList].find(k => re.test(k)); return c ? c.replace(re, '') : 'na'; }
  function readHero(ph) {
    const ring = ph.querySelector('.sc10 .score10'), b2 = ph.querySelector('.sline2 .b2');
    const out = {};
    if (ring) {
      const m = /^(Health rating|Carb score)\s+(\d+)\s+out of 100,\s*(.*)$/.exec(ring.getAttribute('aria-label') || '');
      if (m) out[m[1] === 'Health rating' ? 'h' : 'c'] = { v: +m[2], l: m[3] || '', b: band(ring, /^s-/) };
    }
    if (b2) {
      const t = b2.textContent.replace(/\s+/g, ' ').trim(); const m = /^(Health rating|Carb score)\s+(\d+|\?)\s*\/100(?:\s*·\s*(.*))?$/.exec(t);
      if (m) out[m[1] === 'Health rating' ? 'h' : 'c'] = { v: m[2] === '?' ? null : +m[2], l: m[3] || '', b: band(b2.querySelector('i'), /^bg-/) };
    }
    const base = [...ph.querySelectorAll('.bl19')].find(e => !e.classList.contains('tr191') && !e.classList.contains('sm192'));
    out.sv = base ? base.textContent.replace(/^\s*Scores are\s*/i, '').trim() : '';
    return out;
  }
  function tile(k, s, sv) {
    const name = k === 'h' ? 'Overall health' : 'Blood sugar', sub = k === 'h' ? 'Nutrition, additives, processing' : 'Sugar first, then carbs';
    if (!s) return `<div class="t23 bg-na" data-k="${k === 'h' ? 'health' : 'sugar'}"><span class="k23">${name}</span><span class="n23"><b>?</b></span><span class="l23">Not rated</span></div>`;
    const v = s.v == null ? '?' : s.v, bd = BANDS[s.b] ? s.b : 'na', L = s.l || BANDS[bd];
    return `<div class="t23 b-${bd}" data-k="${k === 'h' ? 'health' : 'sugar'}" data-v="${esc(v)}" role="group" aria-label="${name} score ${esc(v)} out of 100, ${esc(L)}${sv ? ', ' + esc(sv) : ''}">
<span class="k23">${name}</span><span class="n23"><b>${esc(v)}</b><small>/100</small></span><span class="l23"><i class="d23"></i>${esc(L)}</span>
<span class="m23" aria-hidden="true"><i style="width:${s.v == null ? 0 : Math.max(2, Math.min(100, s.v))}%"></i></span><span class="sv23">${sv ? esc(sv) : sub}</span></div>`;
  }
  function pair(ph) {
    const d = readHero(ph); if (!d.h && !d.c) return;
    const sig = JSON.stringify(d); let el = ph.querySelector(':scope > .sp23');
    if (el && el.dataset.sig === sig) return;
    if (!el) { el = document.createElement('div'); el.className = 'sp23'; const at = ph.querySelector(':scope > .sc10') || ph.querySelector(':scope > .sline2'); at ? at.before(el) : ph.append(el); }
    el.dataset.sig = sig;
    el.innerHTML = tile('h', d.h, d.sv) + tile('c', d.c, d.sv);
    document.documentElement.classList.add('sp23on');
  }
  function home(app) {
    const s = app.querySelector(':scope > section.home74'); if (!s) return;
    const parts = ['#pill74', 'h1', '.lead74', '.hr181'].map(q => s.querySelector(':scope > ' + q)).filter(Boolean);
    if (!parts.length) return;
    let w = s.querySelector(':scope > .mh23');
    if (!w) { w = document.createElement('div'); w.className = 'mh23'; parts[0].before(w); }
    const order = ['pill74', 'H1', 'lead74', 'hr181'], key = e => e.id === 'pill74' ? 'pill74' : e.tagName === 'H1' ? 'H1' : e.classList.contains('lead74') ? 'lead74' : 'hr181';
    parts.forEach(p => { const k = order.indexOf(key(p)); const nxt = [...w.children].find(c => order.indexOf(key(c)) > k); nxt ? w.insertBefore(p, nxt) : w.append(p); });
  }
  function nav() {
    document.querySelectorAll('.tabbar > a').forEach(a => { if (a.classList.contains('on')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  function chips(app) {
    // filter chip groups become single swipeable rows on phones (CSS decides per width)
    app.querySelectorAll('.tools').forEach(t => {
      const loose = [...t.children].filter(c => c.matches('.chip.tog')); if (!loose.length) return;
      let row = t.querySelector(':scope > .chiprow23'); if (!row) { row = document.createElement('div'); row.className = 'chiprow23 scroll23'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Quick filters'); loose[0].before(row); }
      loose.forEach(c => row.append(c));
    });
    app.querySelectorAll('.f22r:not(.scroll23)').forEach(r => r.classList.add('scroll23'));
    const row = app.querySelector('.chips.subchips'); if (!row || row.dataset.s23) return; row.dataset.s23 = '1'; row.classList.add('scroll23', 'always23');
    const h = decodeURIComponent(location.hash); const on = [...row.querySelectorAll('a.chip')].find(a => a.classList.contains('on') || a.getAttribute('aria-current') || decodeURIComponent(a.getAttribute('href') || '') === h);
    if (on && row.scrollWidth > row.clientWidth) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - 16);
  }
  let q = 0;
  function run() {
    q = 0; const app = document.getElementById('app'); if (!app) return;
    try { app.querySelectorAll('.hero10 .ph-t').forEach(pair); } catch (e) { /* keep app usable */ }
    try { home(app); } catch (e) {}
    try { chips(app); } catch (e) {}
    try { nav(); } catch (e) {}
  }
  const kick = () => { if (!q) q = requestAnimationFrame(run); };
  function start() {
    const app = document.getElementById('app'); if (!app) return;
    new MutationObserver(kick).observe(app, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'class'] });
    const tb = document.querySelector('.tabbar'); if (tb) new MutationObserver(kick).observe(tb, { subtree: true, attributes: true, attributeFilter: ['class'] });
    addEventListener('hashchange', kick); run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(
  ['🌿', 'A fresh new look', 'Lumi has a new design: calmer colors, clearer type, a bottom tab bar on phones and a side rail on computers, and wide multi-column pages on big screens. Light and dark themes were both redone.'],
  ['⚖️', 'Scores side by side', 'Every product now leads with Overall health on the left and Blood sugar on the right, each showing the serving it is based on. Scores and rules did not change.']);
