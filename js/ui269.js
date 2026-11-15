/* Lumi 26.9: compact search toolbar + Filters & sort sheet. Keeps the 22/22.1/26 filter store keys and #f22 hooks. */
'use strict';
(function () {
  const IC = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
  const SORTS = [
    ['rel', 'Relevance', 'tab'],
    ['health', 'Health', 'tab'],
    ['score', 'Blood sugar', 'tab'],
    ['carb', 'Low carb', 'tab'],
    ['sug', 'Lowest sugar', 'f22'],
    ['pro', 'Highest protein', 'f22']
  ];
  const FLABEL = {
    good: 'Blood sugar 50+', healthy: 'Healthy 50+', low: 'Carbs ≤10 g', hide: 'Hide conflicts',
    ready: 'Ready-to-eat', photo: 'Has photo', nobad: 'Hide bad data',
    sug5: 'Sugar <5 g', sug10: 'Sugar <10 g', carb15: 'Carbs <15 g', carb30: 'Carbs <30 g', carb45: 'Carbs <45 g',
    pro: 'High protein', fib: 'High fiber', sat: 'Low sat fat', clean: 'No warnings',
    ban: 'No banned additives', dye: 'No synthetic dyes', wf: 'Hide my watch-for items'
  };

  function fl() { return store.get('filters', {}) || {}; }
  function f22raw() { return store.get('f22', {}) || {}; }
  function f26raw() { return (typeof st26 === 'function' ? st26() : store.get('f26', {})) || {}; }

  function activeList() {
    const f = fl(), F = typeof st22 === 'function' ? st22() : {}, a = f26raw(), out = [];
    if (f.good) out.push(['good', FLABEL.good]);
    if (f.healthy) out.push(['healthy', FLABEL.healthy]);
    if (f.low) out.push(['low', FLABEL.low]);
    if (F.sug) out.push(['sug' + F.sug, FLABEL['sug' + F.sug] || ('Sugar <' + F.sug + ' g')]);
    if (F.carb) out.push(['carb' + F.carb, FLABEL['carb' + F.carb] || ('Carbs <' + F.carb + ' g')]);
    if (F.pro) out.push(['pro', FLABEL.pro]);
    if (F.fib) out.push(['fib', FLABEL.fib]);
    if (F.sat) out.push(['sat', FLABEL.sat]);
    if (F.clean) out.push(['clean', FLABEL.clean]);
    if (a.ban) out.push(['ban', FLABEL.ban]);
    if (a.dye) out.push(['dye', FLABEL.dye]);
    if (f22raw().wf && (typeof wfOn221 !== 'function' || wfOn221())) out.push(['wf', FLABEL.wf]);
    if (f.hide) out.push(['hide', FLABEL.hide]);
    if (f.ready) out.push(['ready', FLABEL.ready]);
    if (f.photo) out.push(['photo', FLABEL.photo]);
    if (f.nobad) out.push(['nobad', FLABEL.nobad]);
    return out;
  }

  function curSort() {
    const F = typeof st22 === 'function' ? st22() : {};
    if (F.sort === 'sug' || F.sort === 'pro') return F.sort;
    if (F.sort === 'h') return 'health';
    if (F.sort === 'bs') return 'score';
    if (F.sort === 'carb') return 'carb';
    return store.get('sort', 'rel') || 'rel';
  }

  function setSort(key, kind) {
    const s = f22raw();
    if (kind === 'f22') {
      s.sort = key; store.set('f22', s);
    } else {
      if (s.sort) { s.sort = ''; store.set('f22', s); }
      store.set('sort', key);
      document.querySelectorAll('#sort button').forEach(b => b.classList.toggle('on', b.dataset.s === key));
    }
    if (typeof F22 !== 'undefined') F22.lim = 40;
    if (rs) rs.limit = 40;
    sync269();
    renderResults();
  }

  function clearOne(key) {
    const f = fl(), s = f22raw(), a = store.get('f26', {}) || {};
    if (key === 'good' || key === 'healthy' || key === 'low' || key === 'hide' || key === 'ready' || key === 'photo' || key === 'nobad') { f[key] = false; store.set('filters', f); }
    else if (key === 'ban' || key === 'dye') { a[key] = false; store.set('f26', a); }
    else if (key === 'wf') { delete s.wf; store.set('f22', s); }
    else if (key.slice(0, 3) === 'sug') { s.sug = 0; store.set('f22', s); }
    else if (key.slice(0, 4) === 'carb') { s.carb = 0; store.set('f22', s); }
    else if (key === 'pro' || key === 'fib' || key === 'sat' || key === 'clean') { s[key] = false; store.set('f22', s); }
    if (typeof F22 !== 'undefined') F22.lim = 40;
    if (rs) rs.limit = 40;
    if (typeof syncBar22 === 'function') syncBar22();
    renderResults();
  }

  function clearAll() {
    store.set('filters', {});
    const s = f22raw(), sort = s.sort || '';
    store.set('f22', sort ? { sort } : {});
    store.set('f26', {});
    if (typeof F22 !== 'undefined') F22.lim = 40;
    if (rs) rs.limit = 40;
    if (typeof syncBar22 === 'function') syncBar22();
    renderResults();
  }

  function shownN() {
    const t = ($('#f22n') || {}).textContent || '';
    const m = t.match(/([\d,]+)\s+match/);
    if (m) return +m[1].replace(/,/g, '');
    const rows = document.querySelectorAll('#res a.row').length;
    const more = $('#more');
    if (more) { const k = (more.textContent || '').match(/(\d+)/); if (k) return rows + +k[1]; }
    return rows;
  }

  function isOpen() { const el = $('#fs269'); return !!(el && !el.hidden && el.classList.contains('on')); }

  function openSheet() {
    const el = $('#fs269'); if (!el) return;
    el.hidden = false; el.classList.add('on');
    document.body.classList.add('fs269on');
    const b = $('#fsBtn'); if (b) b.setAttribute('aria-expanded', 'true');
    const x = el.querySelector('.fs269x'); if (x) try { x.focus(); } catch (e) {}
  }
  function closeSheet269() {
    const el = $('#fs269'); if (!el) return;
    el.classList.remove('on'); el.hidden = true;
    document.body.classList.remove('fs269on');
    const b = $('#fsBtn'); if (b) { b.setAttribute('aria-expanded', 'false'); try { b.focus(); } catch (e) {} }
  }
  function toggleSheet() { isOpen() ? closeSheet269() : openSheet(); }

  function syncTyp() {
    const grp = $('#grp'); if (!grp) return;
    const btns = [...grp.querySelectorAll('button[data-g]')];
    let sel = $('#typSel269');
    if (!btns.length) { grp.hidden = true; if (sel) sel.hidden = true; return; }
    grp.hidden = false;
    if (!sel) {
      sel = document.createElement('select');
      sel.id = 'typSel269'; sel.className = 'typSel269'; sel.setAttribute('aria-label', 'Result type');
      grp.after(sel);
      sel.onchange = () => { if (!rs) return; rs.group = sel.value; rs.limit = 40; renderResults(); };
    }
    sel.hidden = false;
    const cur = (rs && rs.group) || 'all';
    sel.innerHTML = btns.map(b => `<option value="${esc(b.dataset.g)}"${b.dataset.g === cur ? ' selected' : ''}>${esc(b.textContent.replace(/\s+/g, ' ').trim())}</option>`).join('');
  }

  function sync269() {
    if (!$('#res')) return;
    const list = activeList(), n = list.length;
    const badge = $('#fsBadge');
    if (badge) { badge.hidden = !n; badge.textContent = n ? String(n) : ''; }
    const act = $('#act269');
    if (act) {
      act.hidden = !n;
      act.innerHTML = n ? list.map(([k, l]) => `<button type="button" class="ach269" data-rm="${esc(k)}" aria-label="Remove ${esc(l)}">${esc(l)} <span aria-hidden="true">×</span></button>`).join('') : '';
      act.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => clearOne(b.dataset.rm));
    }
    const cur = curSort();
    document.querySelectorAll('#fsSort input[name=s269]').forEach(i => { i.checked = i.value === cur; });
    const x = $('#f22x');
    if (x) x.hidden = !n;
    const show = $('#fsShow');
    if (show) {
      const c = shownN();
      show.textContent = 'Show ' + c.toLocaleString() + ' result' + (c === 1 ? '' : 's');
    }
    document.querySelectorAll('#f22 [data-f]').forEach(b => {
      const on = !!fl()[b.dataset.f];
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    syncTyp();
  }

  function bindQuick() {
    const host = $('#f22'); if (!host || host.dataset.q269) return;
    host.dataset.q269 = '1';
    host.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-f]');
      if (!b || !host.contains(b)) return;
      e.preventDefault();
      const k = b.dataset.f, f = fl();
      f[k] = !f[k];
      if (k === 'low' && f.low) {
        const s = f22raw(); if (s.carb) { s.carb = 0; store.set('f22', s); }
      }
      store.set('filters', f);
      if (typeof F22 !== 'undefined') F22.lim = 40;
      if (rs) rs.limit = 40;
      if (typeof syncBar22 === 'function') syncBar22();
      renderResults();
    });
  }

  function bindCarbMutex() {
    const host = $('#f22'); if (!host || host.dataset.c269) return;
    host.dataset.c269 = '1';
    host.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('.f22c[data-k=carb]');
      if (!b) return;
      const f = fl();
      if (f.low) { f.low = false; store.set('filters', f); }
    }, true);
  }

  function bindSheet() {
    const el = $('#fs269'), btn = $('#fsBtn'); if (!el || !btn) return;
    if (el.parentElement !== document.body) {
      document.querySelectorAll('body > #fs269').forEach(x => { if (x !== el) x.remove(); });
      document.body.appendChild(el);
    }
    if (btn.dataset.b269) return;
    btn.dataset.b269 = '1';
    btn.onclick = toggleSheet;
    el.querySelectorAll('[data-close]').forEach(x => x.onclick = closeSheet269);
    const show = $('#fsShow'); if (show) show.onclick = closeSheet269;
    const clr = $('#f22x');
    if (clr && !clr.dataset.c269) {
      clr.dataset.c269 = '1';
      clr.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); clearAll(); }, true);
    }
    if (!document._fs269esc) {
      document._fs269esc = 1;
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); closeSheet269(); } });
    }
    const box = $('#fsSort');
    if (box && !box.dataset.s269) {
      box.dataset.s269 = '1';
      box.innerHTML = `<h3>Sort</h3><div class="sr269" role="radiogroup" aria-label="Sort results">${SORTS.map(([v, l, k]) => `<label class="sro269"><input type="radio" name="s269" value="${v}" data-kind="${k}">${l}</label>`).join('')}</div>`;
      box.addEventListener('change', e => {
        const i = e.target; if (!i || i.name !== 's269') return;
        setSort(i.value, i.dataset.kind);
      });
    }
    bindQuick();
    bindCarbMutex();
    sync269();
  }

  window.mount269 = bindSheet;
  window.sync269 = sync269;
  window.openFilters269 = openSheet;
  window.closeFilters269 = closeSheet269;

  function hookRR() {
    if (typeof renderResults !== 'function') return;
    if (renderResults._269) return;
    const rr = renderResults;
    renderResults = function () {
      const o = rr.apply(this, arguments);
      try { bindSheet(); sync269(); } catch (e) { console.warn(e); }
      return o;
    };
    renderResults._269 = 1;
  }

  if (typeof resultsShell === 'function') {
    const rsh = resultsShell;
    resultsShell = function () {
      const r = rsh.apply(this, arguments);
      try { hookRR(); bindSheet(); sync269(); } catch (e) { console.warn(e); }
      return r;
    };
  }

  hookRR();
  document.addEventListener('DOMContentLoaded', () => {
    hookRR();
    if (window.onLate27) onLate27(() => { hookRR(); try { bindSheet(); sync269(); } catch (e) {} });
    if (typeof V7_NEWS !== 'undefined') {
      const add = () => { if (typeof V7_NEWS === 'undefined') return; if (V7_NEWS[0] && /Easier search/.test(String(V7_NEWS[0][1]||''))) return; V7_NEWS.unshift(['🎛️', 'Easier search (26.9)', 'Search results now open with one Filters & sort button instead of rows of chips and tabs. Tap it for sort and every filter, grouped in a sheet. Active filters show as small chips you can remove.']); };
      add();
      if (window.onLate27) onLate27(add);
    }
  });
})();
