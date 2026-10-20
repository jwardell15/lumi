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
  ['🔎', 'Better search (7.1)', 'US products first, fewer foreign-label and generic rows, no cocktails when you search "soda", chains rank higher for chain names.'],
  ['🧹', 'Cleaner aisles & data checks (7.1)', 'Spinach is no longer in Baby, sushi not in Bakery; 0 g carbs on juice, fruit or chocolate milk is flagged; "0 g" on small servings is scored with label rounding in mind; juice and sports drinks are no longer store picks.'],
  ['🧴', 'Cosmetics are back (7.1)', 'The cosmetics scanner data had gone missing in an earlier update. It\'s restored.'],
  ['📦', 'Packaged picks are ready-to-eat', 'Canned tomatoes, pumpkin, broth, coffee, cones, flour and other ingredients moved to "Staples & ingredients".'],
  ['⚠️', 'Bad label data is flagged', 'If calories don\'t add up from carbs, protein and fat (4/4/9), the item says "data looks wrong" and gets no score.'],
  ['☰', 'Shopping lists', 'Make lists (Costco run, school snacks…), check items off, see the carb total and share the list.'],
  ['💊', 'Supplements, sorted', 'Protein & collagen, greens powders, creatine & hydration, vitamins. Fresh "super greens" salads moved to Produce.'],
  ['🔎', 'Smarter search filters', 'Ready-to-eat, has photo and hide bad data, plus better near-duplicate grouping (one row per product).']];
function whatsNewCard() { if (store.get('seen71', false)) return ''; return `<div class="card news7"><div class="n7h"><b>✨ New in Lumi ${VERSION}</b><button class="icon" id="n7x" aria-label="Dismiss">✕</button></div><ul>${V7_NEWS.slice(0, 3).map(n => `<li><span>${n[0]}</span><div><b>${esc(n[1])}</b> <span class="d">${esc(n[2])}</span></div></li>`).join('')}</ul><a class="lnk" href="#/whatsnew">Everything new ›</a></div>`; }
document.addEventListener('click', e => { if (e.target && e.target.id === 'n7x') { store.set('seen71', true); const c = document.querySelector('.news7'); if (c) c.remove(); } });
function viewWhatsNew() { document.title = 'New in 7.0 — Lumi'; store.set('seen71', true);
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
function addToList(lid, p) { const L = lists(); const l = L.find(x => x.id === lid); if (!l) return false; if (l.items.some(i => i.id === p.id)) return false; l.items.push(Object.assign(lmin(p), { done: false, t: Date.now() })); setLists(L); return true; }
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
  ${L.length ? `<div class="lists7">${L.map(l => { const t = l.items.reduce((a, i) => a + (i.net || 0), 0); return `<a class="card l7" href="#/list/${l.id}"><b>☰ ${esc(l.name)}</b><span>${l.items.length} item${l.items.length === 1 ? '' : 's'} · ${l.items.filter(i => i.done).length} checked</span><span class="small">avg ${l.items.length ? Math.round(t / l.items.length) : 0} g net carbs/100</span></a>`; }).join('')}</div>` : `<div class="card empty">${MASCOT(80)}<b>No lists yet</b>Create one here, or tap “☰ Add to list” on any product.</div>`}`;
  $('#nl').onsubmit = e => { e.preventDefault(); const l = newList($('#nl input').value.trim() || 'My list'); go('#/list/' + l.id); };
}
function viewList(id) {
  const l = lists().find(x => x.id === id); if (!l) return viewLists(); document.title = l.name + ' — Lumi';
  const sortIt = it => it.slice().sort((a, b) => a.done - b.done || a.t - b.t);
  const draw = () => { const cur = lists().find(x => x.id === id); if (!cur) return viewLists(); const it = sortIt(cur.items); const open = it.filter(i => !i.done);
    app.innerHTML = `<div class="sec-h"><h1>☰ ${esc(cur.name)}</h1><a href="#/lists">All lists</a></div>
    <p class="lead">${it.length} item${it.length === 1 ? '' : 's'} · ${open.length} to buy${it.length ? ` · average Carb score ${Math.round(it.filter(i => i.score != null).reduce((a, i) => a + i.score, 0) / Math.max(1, it.filter(i => i.score != null).length))}` : ''}</p>
    <div class="actions"><button class="btn pri" id="lShare">↗ Share list</button><button class="btn" id="lRen">✎ Rename</button><button class="btn" id="lClr">Clear checked</button><button class="btn" id="lDel">🗑 Delete list</button></div>
    ${it.length ? `<div class="list">${it.map(i => `<div class="row l7i${i.done ? ' done' : ''}"><label class="ck"><input type="checkbox" data-ck="${esc(i.id)}" ${i.done ? 'checked' : ''} aria-label="Got it"></label><a class="t" href="#/product/${esc(i.id)}"><div class="n">${esc(i.name)}</div><div class="b">${esc(i.brand || '')}${i.net != null ? ` · ${r1(i.net)}g net carbs/100` : ''}</div></a>${mini(i)}<button class="icon" data-rm="${esc(i.id)}" aria-label="Remove">✕</button></div>`).join('')}</div>` : `<div class="card empty">${MASCOT(80)}<b>Empty list</b>Search or scan a product, then tap “☰ Add to list”.</div>`}
    ${searchBox()}`;
    bindSearch();
    document.querySelectorAll('[data-ck]').forEach(c => c.onchange = () => { const L = lists(); const x = L.find(y => y.id === id); const i = x.items.find(y => y.id === c.dataset.ck); if (i) i.done = c.checked; setLists(L); draw(); });
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const L = lists(); const x = L.find(y => y.id === id); x.items = x.items.filter(y => y.id !== b.dataset.rm); setLists(L); draw(); });
    $('#lClr').onclick = () => { const L = lists(); const x = L.find(y => y.id === id); x.items = x.items.filter(y => !y.done); setLists(L); draw(); };
    $('#lDel').onclick = () => { if (!confirm('Delete "' + cur.name + '"?')) return; setLists(lists().filter(y => y.id !== id)); go('#/lists'); };
    $('#lRen').onclick = () => { const nm = prompt('List name', cur.name); if (!nm) return; const L = lists(); L.find(y => y.id === id).name = nm.slice(0, 40); setLists(L); draw(); };
    $('#lShare').onclick = async () => { const text = `${cur.name}\n` + it.map(i => `${i.done ? '☑' : '☐'} ${i.name}${i.brand ? ' (' + i.brand + ')' : ''}${i.net != null ? ` · ${r1(i.net)}g net/100` : ''}`).join('\n') + '\n\nvia Lumi'; if (navigator.share) { try { await navigator.share({ title: cur.name, text }); return; } catch (e) { if (e.name === 'AbortError') return; } } try { await navigator.clipboard.writeText(text); toast('List copied'); } catch { prompt('Copy your list', text); } };
  };
  draw();
}
/* "/" focuses search (desktop) */
document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { const q = document.getElementById('q'); if (q) { e.preventDefault(); q.focus(); q.select(); } else { e.preventDefault(); go('#/'); setTimeout(() => { const q2 = document.getElementById('q'); if (q2) q2.focus(); }, 60); } } });
