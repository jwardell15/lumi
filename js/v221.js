/* Lumi 22.1: compare 2–4 items side by side, a personal "Watch for" list, ingredient-change alerts on favorites, and a full offline mode.
   Everything here is stored on this device only. Builds on 22.0 (js/ingwarn22.js, js/v22.js). */
'use strict';
const CMAX221 = 4;
const g221 = v => v == null || !isFinite(v) ? null : v;
const fmtg221 = v => v == null ? '—' : (v < 10 ? Math.round(v * 10) / 10 : Math.round(v)) + ' g';
const ingOf221 = p => (p && p.ing) || '';

/* ======================= 1. COMPARE 2–4 ======================= */
toggleCompare = function (p) { let l = cmpIds(); try { if (p && p.n) { remember(p); memo.set(p.id, p); } } catch {}
  let out = null; if (l.includes(p.id)) l = l.filter(x => x !== p.id); else { if (l.length >= CMAX221) out = l.shift(); l.push(p.id); }
  store.set('compare', l); try { haptic(12); } catch {} drawCmpTray(); if (out) setTimeout(() => toast(`Compare holds ${CMAX221} items, so the oldest one was swapped out`), 60); offPersonal221([p.id]); return l.includes(p.id); };
drawCmpTray = function () { let t = $('#cmpTray'); const l = cmpIds();
  if (!t) { t = document.createElement('a'); t.id = 'cmpTray'; t.className = 'cmp-tray'; t.href = '#/compare'; document.body.appendChild(t); }
  const on = l.length >= 1 && !/^#\/compare/.test(location.hash); document.body.classList.toggle('has-tray', on); t.classList.toggle('on', on); t.classList.add('ct221');
  t.innerHTML = `<span class="cnt">${l.length}/${CMAX221}</span> Compare${l.length < 2 ? ' · add one more' : ' now'} ›`; t.setAttribute('aria-label', `Compare tray, ${l.length} of ${CMAX221} items`); };
/* list cards (search, browse, chain menus, store pages, My foods): small ⇆ button */
const CBI221 = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8"/></svg>';
function cmpBtns221() { const l = new Set(cmpIds());
  for (const r of app.querySelectorAll('a.row[href^="#/product/"], li.mr211')) { const a = r.matches('a') ? r : r.querySelector('a[href^="#/product/"]'); if (!a) continue;
    const id = decodeURIComponent(a.getAttribute('href').slice(10)); let b = r.querySelector('.cb221');
    if (!b) { const host = r.querySelector('.rtg') || r.querySelector('.mt211') || r; host.insertAdjacentHTML('beforeend', `<span class="cb221" role="button" tabindex="0" data-cid="${esc(id)}">${CBI221}<span class="sr">Compare</span></span>`); b = r.querySelector('.cb221'); }
    const on = l.has(id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Remove from compare' : 'Add to compare'); b.title = on ? 'In compare (tap to remove)' : 'Add to compare'; } }
function cmpTap221(e) { const b = e.target.closest && e.target.closest('.cb221'); if (!b) return; e.preventDefault(); e.stopPropagation(); if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
  const id = b.dataset.cid; let l = cmpIds(); const was = l.includes(id);
  if (was) l = l.filter(x => x !== id); else { if (l.length >= CMAX221) { toast(`Compare holds ${CMAX221} items. Remove one first.`); return; } l.push(id); }
  store.set('compare', l); try { haptic(12); } catch {} drawCmpTray(); cmpBtns221(); toast(was ? 'Removed from compare' : l.length >= 2 ? `Added (${l.length}/${CMAX221}) — tap Compare at the bottom` : 'Added — pick one more to compare');
  if (!was) resolveProduct(id).then(p => { if (p) { remember(p); offPersonal221([id]); } }).catch(() => {}); }
document.addEventListener('click', cmpTap221, true); document.addEventListener('keydown', e => { if (e.target.closest && e.target.closest('.cb221')) cmpTap221(e); }, true);

const KIND221 = { label: '', item: '', default: ' (typical serving; no serving on the label)', per100: '', custom: '' };
function cmpData221(p, mode) { const isItem = !!(p.meta && p.meta.perItem); const sb = S.servBasis(p); const n = per100(p);
  const g = mode === 'p100' ? (isItem ? 100 : 100) : sb.g; const per = scale(n, g);
  const serv = mode === 'p100' ? (isItem ? '1 item (per-item data)' : `100 ${p.liquid ? 'ml' : 'g'}`) : (sb.label || '') + (KIND221[sb.kind] || '');
  const s = S.score(p), h = HR(p), w = LumiWarn.analyze(ingOf221(p)); const warn = w.status === 'ok' ? LumiWarn.badges(w.mask) : null;
  return { p, isItem, sb, g, per, serv, bs: s.score, hs: h.score, w, warn, sugars: w.status === 'ok' ? w.sugars : null, wf: wfCheckP221(p) }; }
function cmpText221(R, mode) { const L = [`Lumi compare (${mode === 'p100' ? 'per 100 g' : 'per serving'})`];
  for (const r of R) { const x = r.per; L.push('', `${r.p.name}${r.p.brand ? ' — ' + r.p.brand : ''}`, `  Serving: ${r.serv || '—'}`, `  Health ${r.hs ?? '?'} · Blood sugar ${r.bs ?? '?'}`,
    `  Sugar ${fmtg221(x.sugars)} · Total carbs ${fmtg221(x.carbs)} · Fiber ${fmtg221(x.fiber)} · Protein ${fmtg221(x.protein)}`,
    `  Sat fat ${fmtg221(x.sat)} · Sodium ${x.sodiumMg == null ? '—' : Math.round(x.sodiumMg) + ' mg'} · Calories ${x.kcal == null ? '—' : Math.round(x.kcal)}`,
    `  Added sugars: ${r.sugars == null ? 'ingredients not available' : r.sugars.length ? r.sugars.length + ' (' + r.sugars.join(', ') + ')' : 'none found'}`,
    `  Warnings: ${r.warn == null ? 'ingredients not available' : r.warn.length ? r.warn.map(x => x.label).join(', ') : 'none found'}`); }
  L.push('', 'Scores and numbers from the labels on file in Lumi. Check the package.'); return L.join('\n'); }
async function viewCompare() {
  document.title = 'Compare — Lumi'; app.classList.add('cmp11', 'cmp221'); drawCmpTray();
  let ids = cmpIds(); if (ids.length > CMAX221) { ids = ids.slice(-CMAX221); store.set('compare', ids); }
  if (!ids.length) { app.innerHTML = `<h1>Compare</h1><div class="card empty">${MASCOT(96, 'big')}<b>Nothing to compare yet</b>Tap <b>⇆</b> on any list card, or <b>⇆ Compare</b> on a product, restaurant meal, My food or recipe. Compare 2 to ${CMAX221} items side by side.<div class="actions" style="justify-content:center"><a class="btn pri" href="#/">Find foods</a><a class="btn" href="#/myfoods">My foods</a></div></div>`; return; }
  app.innerHTML = `<h1>Compare</h1><div class="card">${'<div class="sk skl" style="height:36px;margin:8px 0"></div>'.repeat(6)}</div>`;
  const got = await Promise.all(ids.map(id => (memo.get(id) && memo.get(id).n ? Promise.resolve(memo.get(id)) : resolveProduct(id)).catch(() => null)));
  if (!/^#\/compare/.test(location.hash)) return;
  const miss = ids.filter((id, i) => !got[i]); const ps = got.filter(Boolean); ps.forEach(p => { memo.set(p.id, p); });
  const mode = store.get('cmp221', 'serv') === 'p100' ? 'p100' : 'serv'; const R = ps.map(p => cmpData221(p, mode));
  const best = (f, low) => { const v = R.map(f).filter(x => x != null && isFinite(x)); if (v.length < 2 || Math.max(...v) === Math.min(...v)) return null; return low ? Math.min(...v) : Math.max(...v); };
  const line = (lab, f, fmt, low, cls) => { const b = best(f, low); return `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${lab}</th>${R.map(r => { const v = f(r); const w = v != null && b != null && v === b; return `<td class="${w ? 'win' : ''}">${v == null ? '<small class="na221">not on label</small>' : fmt(v)}${w ? '<span class="sr"> (best)</span>' : ''}</td>`; }).join('')}</tr>`; };
  const pill = (v, band) => v == null ? '?' : `<span class="pill bg-${band(v)}">${v}</span>`;
  const gs = R.filter(r => !r.isItem && r.sb.kind !== 'per100').map(r => r.g), differ = mode === 'serv' && ((gs.length >= 2 && Math.max(...gs) / Math.min(...gs) >= 2) || (R.some(r => r.isItem) && R.some(r => !r.isItem)));
  const noServ = mode === 'serv' && R.some(r => r.sb.kind === 'per100');
  const cols = R.length; const wf = wfOn221();
  app.innerHTML = `<h1>Compare <small class="cn221">${cols} of ${CMAX221}</small></h1>
  <div class="seg wide" id="cmp221m"><button data-m="serv" class="${mode === 'serv' ? 'on' : ''}" aria-pressed="${mode === 'serv'}">Per serving</button><button data-m="p100" class="${mode === 'p100' ? 'on' : ''}" aria-pressed="${mode === 'p100'}">Per 100 g</button></div>
  <p class="small cmpn221">${mode === 'serv' ? 'Each column uses its own serving, shown in the Serving row. ' : 'Every packaged item at 100 g (100 ml for drinks); restaurant items stay per item. '}Best value in each row is highlighted. Scores are always per serving, the same as on each product page.</p>
  ${differ ? `<p class="note221" role="note"><b>Servings differ a lot.</b> ${R.map(r => esc(r.serv)).join(' vs ')}. Per-serving numbers aren't like for like${R.some(r => !r.isItem) ? '; tap Per 100 g to line them up' : ''}.</p>` : ''}
  ${noServ ? '<p class="note221" role="note">Some items have no serving size on the label, so they are shown per 100 g.</p>' : ''}
  ${miss.length ? `<p class="note221">${miss.length} item${miss.length === 1 ? '' : 's'} couldn't be loaded${navigator.onLine ? '' : ' offline'}. <button class="lnk221" id="cmpMiss">Remove</button></p>` : ''}
  ${cols < 2 ? '<p class="note221">Add at least one more item to compare.</p>' : ''}
  <div class="cmpw221" role="region" aria-label="Comparison table, scroll sideways" tabindex="0"><table class="cmpt cmpt221" style="--n:${cols}">
  <thead><tr><th class="c0" scope="col"><span class="sr">Item</span></th>${R.map(r => `<th scope="col"><a href="#/product/${esc(r.p.id)}">${thumb(r.p.img, r.p.name, [], r.p.cat)}<span class="cn">${esc(r.p.name)}</span><small>${esc(r.p.src === 'custom' ? (String(r.p.id).startsWith('c-rs') ? 'My recipe' : 'My food') : r.p.brand || '')}</small></a>${scores20(r.hs, r.bs)}<button class="x" data-rm="${esc(r.p.id)}" aria-label="Remove ${esc(r.p.name)}">✕</button></th>`).join('')}</tr></thead><tbody>
  ${line('Health', r => r.hs, v => pill(v, HB) + ` <small>${HL(v)}</small>`)}${line('Blood sugar', r => r.bs, v => pill(v, S.band))}
  <tr class="sv221"><th scope="row">Serving</th>${R.map(r => `<td>${esc(r.serv || '—')}</td>`).join('')}</tr>
  ${line('Sugar', r => g221(r.per.sugars), fmtg221, 1)}${line('Total carbs', r => g221(r.per.carbs), fmtg221, 1)}${line('Fiber', r => g221(r.per.fiber), fmtg221)}${line('Protein', r => g221(r.per.protein), fmtg221)}
  ${line('Sat fat', r => g221(r.per.sat), fmtg221, 1)}${line('Sodium', r => g221(r.per.sodiumMg), v => Math.round(v) + ' mg', 1)}
  <tr><th scope="row">Calories</th>${R.map(r => `<td>${r.per.kcal == null ? '<small class="na221">not on label</small>' : Math.round(r.per.kcal)}</td>`).join('')}</tr>
  ${(() => { const b = best(r => r.sugars == null ? null : r.sugars.length, 1); return `<tr class="as221"><th scope="row">Added sugars</th>${R.map(r => { const n = r.sugars == null ? null : r.sugars.length; return `<td class="${n != null && n === b ? 'win' : ''}">${n == null ? "<small class=\"na221\">couldn't check: ingredients not available</small>" : n ? `<b>${n}</b> <small>${esc(r.sugars.join(', '))}</small>` : '<b>0</b> <small>none found</small>'}</td>`; }).join('')}</tr>`; })()}
  ${(() => { const b = best(r => r.warn == null ? null : r.warn.length, 1); return `<tr class="cw22 cw221"><th scope="row">Ingredient warnings</th>${R.map(r => { const n = r.warn == null ? null : r.warn.length; return `<td class="${n != null && n === b ? 'win' : ''}">${r.w.status === 'lang' ? "<small class=\"na221\">couldn't read (not English)</small>" : n == null ? "<small class=\"na221\">couldn't check: ingredients not available</small>" : n ? r.warn.map(x => `<i class="w22 ${SEVC22[x.lv]}">${esc(x.label)}</i>`).join(' ') : '<small>none found</small>'}</td>`; }).join('')}</tr>`; })()}
  ${wf ? `<tr class="wfr221"><th scope="row">Your watch-for list</th>${R.map(r => `<td>${wfCellHTML221(r.wf)}</td>`).join('')}</tr>` : ''}
  </tbody></table></div>
  <div class="actions cmpa221"><a class="btn" href="#/">＋ Add${cols < CMAX221 ? ` (${CMAX221 - cols} more)` : ''}</a><button class="btn" id="cmpCopy">Copy as text</button>${navigator.share ? '<button class="btn" id="cmpShare">Share</button>' : ''}<button class="btn" id="cmpClr">Clear all</button></div>
  <p class="small">Your compare list is kept on this device${offOn221() ? ' and works offline' : ''}. Numbers are from each label; "not on label" means the label doesn't list it, never zero.</p>`;
  app.querySelectorAll('#cmp221m button').forEach(b => b.onclick = () => { store.set('cmp221', b.dataset.m); viewCompare(); });
  app.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { store.set('compare', cmpIds().filter(x => x !== b.dataset.rm)); drawCmpTray(); viewCompare(); });
  if ($('#cmpMiss')) $('#cmpMiss').onclick = () => { store.set('compare', cmpIds().filter(x => !miss.includes(x))); viewCompare(); };
  $('#cmpClr').onclick = () => { store.set('compare', []); drawCmpTray(); viewCompare(); };
  const txt = cmpText221(R, mode);
  $('#cmpCopy').onclick = async () => { try { await navigator.clipboard.writeText(txt); toast('Copied comparison as text'); } catch { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied comparison as text'); } catch { toast("Couldn't copy"); } ta.remove(); } };
  if ($('#cmpShare')) $('#cmpShare').onclick = () => navigator.share({ title: 'Lumi compare', text: txt }).catch(() => {});
  window.LumiCompareText221 = txt;
}

/* ======================= 2. WATCH FOR (personal list) ======================= */
/* categories use LumiWarn mask bits (index-wide), terms use the 22.1 term mask, custom words are matched on the ingredient text */
const WCAT221 = [
  ['added', 'Added sugars (any kind)', m => (m & 15) > 0, 'sugar'], ['fast', 'Fast sugars (maltodextrin, dextrose, glucose…)', m => !!(m & 16), 'sugar'],
  ['sweet', 'Artificial sweeteners', m => !!(m & 256), 'sweet'], ['polyol', 'Sugar alcohols (maltitol, sorbitol…) & allulose', m => !!(m & 1536), 'sweet'],
  ['seed', 'Seed oils', m => !!(m & 32), 'oil'], ['vegoil', 'Unnamed "vegetable oil"', m => !!(m & (1 << 20)), 'oil'], ['pho', 'Partially hydrogenated oil (trans fat)', m => !!(m & 64), 'oil'], ['hoil', 'Hydrogenated oils', m => !!(m & (128 | (1 << 22))), 'oil'],
  ['colors', 'Artificial colors', m => !!(m & 2048), 'add'], ['tio2', 'Titanium dioxide', m => !!(m & (1 << 18)), 'add'], ['restricted', 'Restricted additives (Red 3, BVO, bromate, propylparaben)', m => !!(m & ((1 << 12) | (1 << 24))), 'add'],
  ['nitrite', 'Nitrites / nitrates (incl. celery powder)', m => !!(m & ((1 << 13) | (1 << 14))), 'add'], ['carr', 'Carrageenan', m => !!(m & (1 << 15)), 'add'], ['presv', 'BHA, TBHQ & BHT', m => !!(m & ((1 << 16) | (1 << 17))), 'add'], ['msg', 'MSG', m => !!(m & (1 << 19)), 'add']];
const WGRP221 = { sugar: 'Sugars', sweet: 'Sweeteners', oil: 'Oils & fats', add: 'Additives', color: 'Colors' };
const wf221 = () => { let w = store.get('watch22', null);
  if (!w) { const o = store.get('watch', null); w = { cats: [], terms: [], words: [] }; /* migrate the 8.x watchlist */
    if (o) { const on = o.on || []; if (on.includes('sugars')) w.cats.push('added'); if (on.includes('malto')) w.terms.push('malto'); if (on.includes('seed')) w.cats.push('seed'); if (on.includes('sweet')) w.cats.push('sweet'); w.words = (o.words || []).filter(Boolean).slice(0, 40); }
    store.set('watch22', w); }
  return { cats: w.cats || [], terms: w.terms || [], words: w.words || [] }; };
const wfOn221 = () => { const w = wf221(); return w.cats.length + w.terms.length + w.words.length > 0; };
const TI221 = new Map(LumiWarn.TERMS.map((t, i) => [t[0], i]));
/* from masks (index docs): {hits:[labels], st:'hit'|'clear'|'unk'|'lang', words:'ok'|'unk'|'none'} */
function wfMask221(m, tm, ing) { const w = wf221(); if (m == null || m === -1) return { st: 'unk', hits: [] }; if (m === -2) return { st: 'lang', hits: [] };
  const hits = []; for (const c of WCAT221) if (w.cats.includes(c[0]) && c[2](m)) hits.push(c[1].replace(/ \(.*\)$/, ''));
  for (const k of w.terms) { const i = TI221.get(k); if (i != null && tm && (tm & (1 << i))) hits.push(LumiWarn.TERMS[i][1]); }
  let words = 'none'; if (w.words.length) { if (ing == null) words = 'unk'; else { words = 'ok'; for (const x of LumiWarn.matchWords(ing, w.words) || []) hits.push(`"${x.word}"` + (x.found.some(f => f !== x.word.toLowerCase()) ? ` (${x.found.join(', ')})` : '')); } }
  return { st: hits.length ? 'hit' : 'clear', hits, words }; }
function wfCheckP221(p) { if (!wfOn221()) return null; const ing = ingOf221(p); const r = LumiWarn.analyze(ing); if (r.status === 'none') return { st: 'unk', hits: [] }; if (r.status === 'lang') return { st: 'lang', hits: [] }; return wfMask221(r.mask, r.tmask, ing); }
/* list item: index doc masks, else the product record if one is loaded */
function wfCheckId221(id) { if (!wfOn221()) return null; const d = codeMap22().get(id); const pm = memo.get(id) || (OFF221.recs && OFF221.recP(id));
  if (pm && pm.n) return wfCheckP221(pm); if (d && d.w22 !== undefined) return wfMask221(d.w22, d.t22 || 0, null); return null; }
function wfCellHTML221(r) { if (!r) return ''; if (r.st === 'unk') return "<small class=\"na221\">couldn't check: no ingredient list</small>"; if (r.st === 'lang') return "<small class=\"na221\">couldn't check: not in English</small>";
  return r.hits.length ? r.hits.map(h => `<i class="wfb221">${esc(h)}</i>`).join(' ') : '<small>none of yours found</small>'; }
/* product page callout, above the standard warnings card */
async function wfProd221() { const m = location.hash.match(/^#\/product\/([^/?]+)/); { const w = $('#wf221'), j = $('#iwj22'); if (w && j && w.nextElementSibling !== j && !$('#chg221')) j.before(w); } if (!m || !wfOn221() || $('#wf221')) return; if (!app.classList.contains('prodv') || !app.querySelector('p.foot')) return;
  const id = decodeURIComponent(m[1]); let p = memo.get(id); if (!p) { try { p = await resolveProduct(id); } catch { return; } } if (!p || $('#wf221') || location.hash.indexOf(m[1]) < 0) return;
  const r = wfCheckP221(p); if (!r) return; const anchor = $('#chg221') ? $('#chg221').nextElementSibling : (app.querySelector('#iwj22') || app.querySelector('.card .actions'));
  const html = r.st === 'hit' ? `<div class="wf221 hit" id="wf221" role="alert"><div class="wfh221">${EYE221}<b>On your watch-for list</b></div><p>${r.hits.map(h => `<i class="wfb221">${esc(h)}</i>`).join(' ')}</p><a class="lnk221" href="#/alerts">Edit my list</a></div>`
    : r.st === 'clear' ? `<div class="wf221 ok" id="wf221"><div class="wfh221">${EYE221}<b>None of your watch-for items found</b></div><p class="small">Checked against the ingredient list on file. Lists can be incomplete, so check the package.</p></div>`
    : `<div class="wf221 unk" id="wf221"><div class="wfh221">${EYE221}<b>Couldn't check your watch-for list</b></div><p class="small">${r.st === 'lang' ? "The ingredient list isn't in English." : 'Lumi has no ingredient list for this item.'} That doesn't mean it's free of them.</p></div>`;
  const top = app.querySelector('#iwj22') || app.querySelector('.hero10 .actions.sec10') || app.querySelector('.card .actions'); if (top) top.insertAdjacentHTML('beforebegin', html); else (app.querySelector('#iw22') || app.querySelector('p.foot')).insertAdjacentHTML('beforebegin', html); }
const EYE221 = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
/* list badges */
function wfBadges221() { if (!wfOn221()) return; for (const r of app.querySelectorAll('a.row[href^="#/product/"], li.mr211')) { if (r.dataset.wf221) continue; const a = r.matches('a') ? r : r.querySelector('a[href^="#/product/"]'); if (!a) continue;
    const id = decodeURIComponent(a.getAttribute('href').slice(10)); const v = wfCheckId221(id); if (!v) continue; r.dataset.wf221 = v.st;
    if (v.st === 'hit') { const t = r.querySelector('.t') || r.querySelector('.mt211'); if (t) t.insertAdjacentHTML('beforeend', `<span class="wfl221" title="On your watch-for list: ${esc(v.hits.join(', '))}">${EYE221}${esc(v.hits[0])}${v.hits.length > 1 ? ` +${v.hits.length - 1}` : ''}</span>`); } } }
/* the old 8.x watchlist UI is replaced by this one */
watchFlags = () => ''; watchHits = () => []; alertsCard = () => '';
/* the Watch for page (#/alerts, also #/alerts) */
function viewWatch221() { document.title = 'Watch for — Lumi'; const w = wf221(); const n = w.cats.length + w.terms.length + w.words.length;
  const tg = (k, v, label, on) => `<label class="tg221"><input type="checkbox" data-k="${k}" value="${esc(v)}"${on ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  const groups = ['sugar', 'sweet', 'oil', 'color', 'add'];
  app.innerHTML = `<h1>Watch for</h1><p class="lead">Pick what you want to avoid. Lumi flags it on product pages, list cards and Compare, and the <b>Hide my watch-for items</b> filter hides it from results. Saved on this device only.</p>
  <div class="card wfs221"><div class="fx-h"><h2>Categories</h2><span class="small" id="wfN">${n} on</span></div><div class="tgg221">${WCAT221.map(c => tg('cats', c[0], c[1], w.cats.includes(c[0]))).join('')}</div></div>
  <div class="card wfs221"><h2>Specific ingredients</h2>${groups.map(g => { const T = LumiWarn.TERMS.filter(t => t[2] === g); return T.length ? `<h3 class="wg221">${WGRP221[g]}</h3><div class="tgg221">${T.map(t => tg('terms', t[0], t[1], w.terms.includes(t[0]))).join('')}</div>` : ''; }).join('')}</div>
  <div class="card wfs221"><h2>Your own words</h2><p class="small">Any ingredient, like <i>peanut</i>, <i>coconut</i> or <i>natural flavor</i>. Whole words only, singular or plural ("strawberry" finds "strawberries"; "corn" won't match "peppercorn" or "popcorn"). Claims like "peanut-free" or "no sugar added" are ignored. At least 3 letters.</p>
    <form id="wfw221" class="wfw221"><input id="wfwi" type="text" maxlength="40" placeholder="Add a word, e.g. peanut" aria-label="Add a custom word" autocomplete="off"><button class="btn pri">Add</button></form>
    <div class="wfc221" id="wfc221">${w.words.map(x => `<span class="chip on">${esc(x)}<button type="button" data-rmw="${esc(x)}" aria-label="Remove ${esc(x)}">✕</button></span>`).join('') || '<small class="muted">No custom words yet.</small>'}</div></div>
  <div class="card"><h2>How it checks</h2><p class="small">Categories and specific ingredients are checked for every item with an ingredient list, so they work in search filters too. Your own words are checked wherever the full ingredient list is loaded: product pages, Compare, and items saved offline. Items without an ingredient list show <b>couldn't check</b>, never "clear". Allergens: this is a word match on the label text on file, not an allergen guarantee; check the package.</p>
  <div class="actions"><button class="btn" id="wfClr">Turn everything off</button><a class="btn" href="#/settings">Settings</a></div></div>`;
  const save = () => { const s = { cats: [...app.querySelectorAll('input[data-k=cats]:checked')].map(i => i.value), terms: [...app.querySelectorAll('input[data-k=terms]:checked')].map(i => i.value), words: wf221().words }; store.set('watch22', s); $('#wfN').textContent = `${s.cats.length + s.terms.length + s.words.length} on`; };
  app.querySelectorAll('.tg221 input').forEach(i => i.onchange = save);
  $('#wfw221').onsubmit = e => { e.preventDefault(); const v = $('#wfwi').value.trim().replace(/\s+/g, ' '); if (!v) return; if (!LumiWarn.wordRe(v)) { toast('Use at least 3 letters'); return; } const s = wf221(); if (!s.words.some(x => x.toLowerCase() === v.toLowerCase())) s.words.push(v); store.set('watch22', s); viewWatch221(); toast(`Watching for "${v}"`); };
  app.querySelectorAll('[data-rmw]').forEach(b => b.onclick = () => { const s = wf221(); s.words = s.words.filter(x => x !== b.dataset.rmw); store.set('watch22', s); viewWatch221(); });
  $('#wfClr').onclick = () => { store.set('watch22', { cats: [], terms: [], words: [] }); viewWatch221(); }; }
viewAlerts = viewWatch221;
function wfSummary221() { const w = wf221(); const L = [...w.cats.map(k => (WCAT221.find(c => c[0] === k) || [, k])[1].replace(/ \(.*\)$/, '')), ...w.terms.map(k => { const i = TI221.get(k); return i == null ? k : LumiWarn.TERMS[i][1]; }), ...w.words.map(x => `"${x}"`)];
  return L.length ? L.slice(0, 6).join(', ') + (L.length > 6 ? ` +${L.length - 6} more` : '') : 'Nothing yet'; }
/* filter bar chip: "Hide my watch-for items" */
const wfF221 = () => !!store.get('f22', {}).wf && wfOn221();
function wfChip221() { const r = app.querySelector('#f22 .f22r'); if (!r) return; let b = r.querySelector('.wfc22'); if (!wfOn221()) { if (b) b.remove(); return; }
  if (!b) { r.insertAdjacentHTML('beforeend', `<button type="button" class="chip f22c wfc22" title="Hide items with anything on your watch-for list, and items Lumi couldn't check">${EYE221}Hide my watch-for items</button>`); b = r.querySelector('.wfc22');
    b.onclick = () => { const s = store.get('f22', {}); s.wf = !s.wf; store.set('f22', s); F22.lim = 40; renderResults(); }; }
  const on = wfF221(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  const x = $('#f22x'); if (x) { if (on) x.hidden = false; if (!x.dataset.wf221) { x.dataset.wf221 = 1; x.addEventListener('click', () => { const s = store.get('f22', {}); if (s.wf) { delete s.wf; store.set('f22', s); renderResults(); } }); } } }
if (typeof renderResults === 'function') { const rr221 = renderResults; renderResults = function () {
  if (!rs || !$('#res') || !wfF221()) { const o = rr221.apply(this, arguments); try { wfChip221(); } catch {} return o; }
  const all = rs.items, keep = new Map(); let hit = 0, unk = 0, wunk = 0;
  for (const [k, it] of all) { const v = wfCheckId221(it.id || it.code); if (!v || v.st === 'unk' || v.st === 'lang') { unk++; continue; } if (v.st === 'hit') { hit++; continue; } if (v.words === 'unk') { wunk++; continue; } keep.set(k, it); }
  let out; rs.items = keep; try { out = rr221.apply(this, arguments); } finally { rs.items = all; }
  try { wfChip221(); const n = $('#f22n'); if (n) { const parts = []; if (hit) parts.push(`${hit.toLocaleString()} hidden: on your watch-for list`); if (unk) parts.push(`${unk.toLocaleString()} hidden: couldn't check (no ingredient list)`); if (wunk) parts.push(`${wunk.toLocaleString()} hidden: couldn't check your own words here (open an item to check)`);
      if (!n.textContent.trim()) n.innerHTML = `<b>${keep.size.toLocaleString()} shown</b>`; if (parts.length) n.insertAdjacentHTML('beforeend', `<span class="wfn221"> · ${parts.join(' · ')}</span>`); }
    if (!keep.size && all.size && $('#res') && !$('#res').querySelector('.empty')) $('#res').innerHTML = `<div class="empty">${MASCOT(96, 'big sad')}<b>Nothing left after hiding your watch-for items</b>Tap the chip again to show them.</div>`; } catch (e) { console.warn(e); }
  return out; }; }
/* 22.1 term masks ride along in data/f22 ("t": [docIndex, mask, ...]) */
{ const at0 = attach22; attach22 = function (t, j) { const ok = at0.apply(this, arguments); if (!ok || !j.t || !j.t.length) return ok; const D = engine.docs; let st = -1;
    for (let i = 0; i < D.length; i++) if (D[i].code === j.c0 && D[i + j.n - 1] && D[i + j.n - 1].code === j.c1) { st = i; break; }
    if (st >= 0) for (let k = 0; k < j.t.length; k += 2) { const d = D[st + j.t[k]]; if (d) d.t22 = j.t[k + 1] >>> 0; } return ok; }; }

/* ======================= 3. INGREDIENT CHANGE ALERTS (favorites) ======================= */
/* snapshot = what the favorite looked like when saved; compared with Lumi's current data (daily, and on viewing it). Nothing leaves the device. */
const snaps221 = () => store.get('snap221', {}), chgs221 = () => store.get('chg221', {});
const favIds221 = () => myFav17().map(f => f.id).filter(id => id && !/^c-/.test(id));
const dv221 = () => (META && META.built) || '';
function snapOf221(p) { const n = p.n || {}, sb = S.servBasis(p); return { name: p.name || '', brand: p.brand || '', ing: ingOf221(p), s: n.sugars ?? null, c: n.carbs ?? null, sg: sb && sb.kind === 'label' ? Math.round(sb.g) : null, g: sb && sb.g ? Math.round(sb.g) : null, label: sb ? sb.label : '', dv: dv221(), t: Date.now() }; }
function snap221(p) { if (!p || !p.id || /^c-/.test(p.id)) return; const S0 = snaps221(); if (S0[p.id] && !S0[p.id].test) return; S0[p.id] = snapOf221(p); store.set('snap221', S0); }
function unsnap221(id) { if (myFav17().some(f => f.id === id)) return; const S0 = snaps221(); delete S0[id]; store.set('snap221', S0); const C0 = chgs221(); if (C0[id]) { delete C0[id]; store.set('chg221', C0); } navBadge221(); }
{ const tf = toggleFav15; toggleFav15 = function (p) { const on = tf.apply(this, arguments); try { if (on) { snap221(p); offPersonal221([p.id]); } else unsnap221(p.id); } catch {} return on; }; }
{ const ts = toggleSave; toggleSave = function (p) { const on = ts.apply(this, arguments); try { if (on) { snap221(p); offPersonal221([p.id]); } else unsnap221(p.id); } catch {} return on; }; }
const toks221 = ing => { const out = []; let d = 0, cur = ''; for (const ch of String(ing || '').replace(/^\s*ingredients?\s*:\s*/i, '')) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d = Math.max(0, d - 1); if ((ch === ',' || ch === ';') && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur);
  return out.map(x => x.replace(/\s+/g, ' ').replace(/^[\s.*]+|[\s.*]+$/g, '').trim()).filter(x => x.length > 1); };
const tkey221 = x => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
const big221 = (a, b, abs) => a != null && b != null && Math.abs(a - b) >= abs && Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 0.001) >= 0.05;
function diff221(o, nw) { const A = toks221(o.ing), B = toks221(nw.ing), ka = new Map(A.map(x => [tkey221(x), x])), kb = new Map(B.map(x => [tkey221(x), x]));
  const added = [...kb].filter(([k]) => !ka.has(k)).map(x => x[1]), removed = [...ka].filter(([k]) => !kb.has(k)).map(x => x[1]);
  const wo = LumiWarn.analyze(o.ing), wn = LumiWarn.analyze(nw.ing); const os = new Set(wo.sugars || []), oi = new Set((wo.list || []).map(x => x.id));
  const newSug = (wn.sugars || []).filter(x => !os.has(x)), newWarn = (wn.list || []).filter(x => x.id !== 'sugar' && x.lv > 0 && !oi.has(x.id)).map(x => x.label);
  const nums = []; if (big221(o.s, nw.s, 0.5) || (o.s == null) !== (nw.s == null)) nums.push(['Sugar per 100 g', o.s, nw.s]); if (big221(o.c, nw.c, 0.5) || (o.c == null) !== (nw.c == null)) nums.push(['Total carbs per 100 g', o.c, nw.c]);
  if (o.sg != null && nw.sg != null && Math.abs(o.sg - nw.sg) >= 1) nums.push(['Serving', o.sg, nw.sg]);
  const ingCh = (o.ing && nw.ing) ? (added.length + removed.length > 0) : (!!o.ing !== !!nw.ing);
  if (!ingCh && !nums.length) return null; return { added, removed, newSug, newWarn, nums, ingGone: !!o.ing && !nw.ing, ingNew: !o.ing && !!nw.ing }; }
async function fresh221(id) { /* current data from Lumi's files, not the saved copy */
  if (/^\d+$/.test(id)) return localProduct(id); if (/^(fdc|r|ms|cnf|wfm)-/.test(id)) return genericProduct(id); return null; }
let chkBusy221 = false;
async function checkChanges221(opt = {}) { if (chkBusy221) return 0; if (!navigator.onLine && !opt.force) return 0; chkBusy221 = true; let n = 0;
  try { await loadMeta(); const S0 = snaps221(), C0 = chgs221(), ids = opt.ids || Object.keys(S0); const fav = new Set(favIds221());
    for (const id of ids) { const o = S0[id]; if (!o || !fav.has(id)) continue; if (!opt.force && o.dv && o.dv === dv221() && !o.test) continue; /* data unchanged since the snapshot */
      let p = null; try { p = await fresh221(id); } catch {} if (!p) continue; const nw = snapOf221(p); const d = diff221(o, nw);
      if (d) { C0[id] = { id, name: p.name || o.name, brand: p.brand || o.brand, old: o, neu: nw, d, t: Date.now(), test: !!o.test }; n++; } else if (!o.test) { o.dv = dv221(); } }
    store.set('chg221', C0); store.set('snap221', S0); store.set('chk221', Date.now()); } finally { chkBusy221 = false; } navBadge221(); chgCard221(); return n; }
function ackChange221(id) { const C0 = chgs221(), c = C0[id]; if (!c) return; const S0 = snaps221(); S0[id] = Object.assign({}, c.neu, { dv: dv221(), t: Date.now() }); delete C0[id]; store.set('snap221', S0); store.set('chg221', C0); navBadge221(); }
function navBadge221() { const n = Object.keys(chgs221()).length; document.querySelectorAll('a[href="#/myfoods"]').forEach(a => { let b = a.querySelector('.nb221'); if (!n) { if (b) b.remove(); return; } if (!b) { a.insertAdjacentHTML('beforeend', '<i class="nb221"></i>'); b = a.querySelector('.nb221'); } b.textContent = n; b.title = `${n} favorite${n === 1 ? '' : 's'} changed`; b.setAttribute('aria-label', `${n} ingredient change${n === 1 ? '' : 's'}`); }); }
const li221 = (a, cls) => a.map(x => `<li class="${cls}">${esc(x)}</li>`).join('');
const num221 = (k, v, ml) => v == null ? 'not listed' : k === 'Serving' ? `${v} ${ml ? 'ml' : 'g'}` : `${Math.round(v * 10) / 10} g`;
function changeHTML221(c) { const d = c.d; return `<div class="chg221${c.test ? ' test' : ''}" data-chg="${esc(c.id)}"><div class="chh221"><b><a href="#/product/${esc(c.id)}">${esc(c.name)}</a></b>${c.brand ? ` <small>${esc(c.brand)}</small>` : ''}${c.test ? ' <span class="tst221">TEST</span>' : ''}</div>
  ${d.newSug.length || d.newWarn.length ? `<p class="nw221" role="alert">⚠ Newly added: ${[...d.newSug.map(x => x + ' (added sugar)'), ...d.newWarn].map(esc).join(', ')}</p>` : ''}
  ${d.ingGone ? '<p class="small">The ingredient list is no longer on file.</p>' : ''}${d.ingNew ? '<p class="small">An ingredient list is now on file.</p>' : ''}
  ${d.added.length && !d.ingNew ? `<p class="small"><b>Added ingredients</b></p><ul class="dl221">${li221(d.added, 'add')}</ul>` : ''}${d.removed.length && !d.ingGone ? `<p class="small"><b>Removed ingredients</b></p><ul class="dl221">${li221(d.removed, 'rm')}</ul>` : ''}
  ${d.nums.length ? `<table class="nt221"><thead><tr><th></th><th>Before</th><th>Now</th></tr></thead><tbody>${d.nums.map(([k, a, b]) => { const og = c.old.g || c.old.sg, ng = c.neu.g || c.neu.sg, ps = /per 100 g$/.test(k) && og && ng; /* show per serving, with the serving, like the rest of Lumi */ if (ps) { const kk = k.replace('per 100 g', 'per serving'), f = (v, g) => v == null ? 'not listed' : `${Math.round(v * g / 10) / 10} g <small>(${g} g serving)</small>`; return `<tr><th scope="row">${kk}</th><td>${f(a, og)}</td><td><b>${f(b, ng)}</b></td></tr>`; } return `<tr><th scope="row">${k}</th><td>${num221(k, a)}</td><td><b>${num221(k, b)}</b></td></tr>`; }).join('')}</tbody></table>` : ''}
  <p class="small muted">Saved ${new Date(c.old.t).toLocaleDateString()}${c.old.dv ? ` · data ${esc(String(c.old.dv).slice(0, 10))}` : ''} → data ${esc(String(c.neu.dv || '').slice(0, 10))}. Check the package: makers change recipes.</p>
  <div class="actions"><button class="btn pri" data-ack="${esc(c.id)}">Got it</button><a class="btn" href="#/product/${esc(c.id)}">Open</a></div></div>`; }
function bindAck221(root) { root.querySelectorAll('[data-ack]').forEach(b => b.onclick = () => { ackChange221(b.dataset.ack); const el = b.closest('.chg221'); const card = b.closest('.chgc221'); if (el) el.remove(); if (card && !card.querySelector('.chg221')) card.remove(); toast('Updated: Lumi will compare against this version from now on'); }); }
function chgCard221() { const C0 = Object.values(chgs221()); const pm = location.hash.match(/^#\/product\/([^/?]+)/);
  if (/^#\/myfoods\/?$/.test(location.hash) || location.hash === '#/myfoods') { const old = $('#chgs221'); if (!C0.length) { if (old) old.remove(); return; } if (old) return; const at = app.querySelector('.mf17 .sg12') || app.querySelector('h1'); if (!at) return;
    at.insertAdjacentHTML('afterend', `<section class="card chgc221" id="chgs221" aria-label="What changed"><div class="fx-h"><h2>What changed</h2><span class="small">${C0.length} favorite${C0.length === 1 ? '' : 's'} updated</span></div><p class="small">Lumi's data now shows a different ingredient list or numbers than when you saved these.</p>${C0.map(changeHTML221).join('')}</section>`); bindAck221($('#chgs221')); }
  else if (pm && app.classList.contains('prodv')) { const id = decodeURIComponent(pm[1]); const c = chgs221()[id]; if (!c || $('#chg221')) return; const top = app.querySelector('.card .actions'); if (!top) return;
    top.closest('.card').insertAdjacentHTML('afterend', `<section class="card chgc221" id="chg221" aria-label="What changed"><h2>This favorite changed</h2>${changeHTML221(c)}</section>`); bindAck221($('#chg221')); } }
async function viewFavCheck221() { const m = location.hash.match(/^#\/product\/([^/?]+)/); if (!m || !navigator.onLine) return; const id = decodeURIComponent(m[1]); if (viewFavCheck221.last === id) return; viewFavCheck221.last = id;
  const o = snaps221()[id]; if (!o || chgs221()[id]) return; await checkChanges221({ ids: [id] }); }
function firstRun221() { if (store.get('snap221i', 0)) return; const ids = favIds221(); if (!ids.length) { store.set('snap221i', Date.now()); return; }
  loadMeta().then(async () => { for (const id of ids) { if (snaps221()[id]) continue; let p = null; const sv = saved().find(s => s.p && s.p.id === id); p = sv ? sv.p : (store.get('foods', {})[id] || null); if (!p) { try { p = await resolveProduct(id); } catch {} } if (p) snap221(p); } store.set('snap221i', Date.now()); }); }
window.LumiChange221 = { /* test hook: tests seed an older snapshot (marked test:true, shown as TEST) and force a check. No fake data ships. */
  check: o => checkChanges221(Object.assign({ force: true }, o || {})), snaps: snaps221, changes: chgs221, ack: ackChange221,
  seedTest: (id, patch) => { const S0 = snaps221(); if (!S0[id]) return false; S0[id] = Object.assign({}, S0[id], patch || {}, { test: true }); store.set('snap221', S0); return true; } };

/* ======================= 4. OFFLINE MODE ======================= */
const OFFC221 = 'lumi-off', PACK221 = 'data/off221/stores.json', PERS221 = new URL('off221-personal.json', location.href).href;
const packURL221 = () => (typeof dataURL === 'function' ? dataURL(PACK221) : PACK221);
const EXTRA221 = ['data/f22/g.json', 'data/f22/0.json'];
const offOn221 = () => !!store.get('off221', {}).on;
const OFF221 = { recs: null, pers: null, docsAdded: false, p: null,
  recP(id) { const a = this.recs && this.recs[id]; if (!a) return null; try { return S.fromCompact(a); } catch { return null; } } };
async function offLoad221() { if (OFF221.p) return OFF221.p; if (!('caches' in window)) return null;
  OFF221.p = (async () => { const c = await caches.open(OFFC221); const r = await c.match(packURL221()); const q = await c.match(PERS221);
    OFF221.pers = q ? await q.json().catch(() => ({})) : {}; if (!r) return null; const j = await r.json(); OFF221.recs = j.recs || {}; OFF221.pack = j; return j; })().catch(() => null);
  return OFF221.p; }
/* offline: add the pack's Costco + Whole Foods rows (beyond the cached tier 0) to the search index, with their 22.0 filter values */
async function offDocs221() { if (OFF221.docsAdded) return; const j = await offLoad221(); if (!j || OFF221.docsAdded || !j.rows) return; await loadIndex().catch(() => {});
  const have = new Set(engine.docs.map(d => d.code)); const keep = [], fi = []; j.rows.forEach((r, i) => { if (!have.has(r[0])) { keep.push(r); fi.push(i); } }); if (!keep.length) { OFF221.docsAdded = true; return; }
  const st = engine.docs.length; engine.add({ docs: keep }); OFF221.docsAdded = true; const tm = new Map(); for (let k = 0; k < (j.t || []).length; k += 2) tm.set(j.t[k], j.t[k + 1]);
  const q = v => v < 0 ? null : v / 10; fi.forEach((i, k) => { const d = engine.docs[st + k]; if (!d) return; d.p22 = q(j.f[i * 4]); d.f22 = q(j.f[i * 4 + 1]); d.s22 = q(j.f[i * 4 + 2]); d.w22 = j.f[i * 4 + 3]; if (tm.has(i)) d.t22 = tm.get(i) >>> 0; d.off221 = 1; });
  try { byChain211 = null; } catch {} try { F22.seen = 0; F22.byCode = new Map(); } catch {} notifyTier(); }
/* product lookups fall back to (and, offline, start from) the saved data */
{ const rp = resolveProduct; resolveProduct = async function (id) { const sid = String(id);
    if (!navigator.onLine && offOn221()) { await offLoad221(); const p = (OFF221.pers && OFF221.pers[sid]) || OFF221.recP(sid) || (/^\d+$/.test(sid) ? (codeVariants(sid).map(v => OFF221.recP(v)).find(Boolean) || null) : null); if (p) return p; }
    let p = null, err = null; try { p = await rp.apply(this, arguments); } catch (e) { err = e; } if (p) return p;
    if (offOn221()) { await offLoad221(); const q = (OFF221.pers && OFF221.pers[sid]) || OFF221.recP(sid) || (/^\d+$/.test(sid) ? (codeVariants(sid).map(v => OFF221.recP(v)).find(Boolean) || null) : null); if (q) return q; }
    if (err) throw err; return p; }; }
/* offline barcode / product page: saved data first, else a clear "not saved offline" card */
{ const vp = viewProduct; viewProduct = async function (id) { if (navigator.onLine) return vp.apply(this, arguments);
    let p = null; try { p = await resolveProduct(id); } catch {} if (p) { memo.set(p.id, p); return vp.apply(this, arguments); }
    app.innerHTML = `<div class="card empty off221e">${MASCOT(80, 'big sad')}<b>Not saved offline — connect to look up</b>${/^\d{8,14}$/.test(String(id)) ? `Barcode ${esc(id)} isn't in your offline data.` : "This item isn't in your offline data."} ${offOn221() ? 'Your favorites, lists, compare items, recently viewed and all Costco and Whole Foods items are saved.' : 'Turn on <b>Save for offline</b> in Settings to keep Costco, Whole Foods and your own foods on this device.'}<div class="actions" style="justify-content:center"><button class="btn pri" onclick="route()">Retry</button><a class="btn" href="#/myfoods">My foods</a></div></div>`; }; }
/* the user's own items: favorites, saved, compare, grocery lists, recently viewed */
function personalIds221() { const s = new Set(); try { myFav17().forEach(f => s.add(f.id)); } catch {} cmpIds().forEach(x => s.add(x)); try { lists().forEach(l => (l.items || []).forEach(i => s.add(i.id))); } catch {}
  try { store.get('viewed', []).slice(0, 40).forEach(x => s.add(x.id)); } catch {} return [...s].filter(id => id && !/^c-/.test(id)); }
let persQ221 = Promise.resolve();
function offPersonal221(ids) { if (!offOn221() || !('caches' in window)) return; persQ221 = persQ221.then(async () => { await offLoad221(); const P = OFF221.pers || {}; let ch = 0;
    for (const id of ids || personalIds221()) { if (P[id] && ids == null) continue; let p = memo.get(id); if (!p || !p.n) { if (!navigator.onLine) continue; try { p = await resolveProduct(id); } catch { p = null; } } if (p && p.n) { P[id] = p; ch++; } }
    if (ch) { OFF221.pers = P; const c = await caches.open(OFFC221); await c.put(PERS221, new Response(JSON.stringify(P), { headers: { 'content-type': 'application/json' } })); } }).catch(() => {}); return persQ221; }
async function offSizes221() { let pack = 0, all = 0; try { const c = await caches.open(OFFC221); for (const k of await c.keys()) { const r = await c.match(k); const b = await r.clone().arrayBuffer(); if (k.url === packURL221()) pack = b.byteLength; all += b.byteLength; } } catch {}
  let est = null; try { est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch {} return { pack, all, est }; }
const MB221 = b => (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB';
async function offDownload221(onp) { const c = await caches.open(OFFC221); const info = await fetch(typeof dataURL === 'function' ? dataURL('data/off221/info.json') : 'data/off221/info.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const r = await fetch(packURL221(), { cache: 'no-store', mode: 'cors', credentials: 'omit' }); if (!r.ok) throw new Error('HTTP ' + r.status);
  const total = (info && info.bytes) || +r.headers.get('content-length') || 0; const rd = r.body && r.body.getReader ? r.body.getReader() : null; let got = 0; const parts = [];
  if (rd) { for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.byteLength; onp && onp(got, total); } } else { const b = new Uint8Array(await r.arrayBuffer()); parts.push(b); got = b.byteLength; onp && onp(got, got); }
  const blob = new Blob(parts, { type: 'application/json' }); const j = JSON.parse(await blob.text()); if (!j || !j.recs) throw new Error('bad pack');
  await c.put(packURL221(), new Response(blob, { headers: { 'content-type': 'application/json' } }));
  for (const u of EXTRA221) { try { const x = await fetch(u); if (x.ok) await c.put(typeof dataURL === 'function' ? dataURL(u) : u, x); } catch {} }
  OFF221.p = null; OFF221.recs = null; await offLoad221(); store.set('off221', { on: true, t: Date.now(), n: j.n, built: j.built, bytes: blob.size }); try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
  await offPersonal221(); return j; }
async function offRemove221() { try { await caches.delete(OFFC221); } catch {} OFF221.p = null; OFF221.recs = null; OFF221.pers = null; store.set('off221', { on: false }); }
function offCardHTML221() { const o = store.get('off221', {}); return `<div class="card off221c" id="off221c"><div class="fx-h"><h2>Save for offline</h2><label class="sw221"><input type="checkbox" id="off221t"${o.on ? ' checked' : ''} aria-label="Save for offline"><span></span></label></div>
  <p class="small">Keeps your favorites, grocery lists, My foods and recipes, compare tray, watch-for list, recently viewed, and every Costco and Whole Foods item (${(o.n || 9522).toLocaleString()} items) on this device, so search, store pages, product pages and barcode scans of saved items work with no connection. Photos aren't included.</p>
  <div class="offp221" id="off221p" hidden><div class="bar221"><i id="off221b"></i></div><small id="off221s"></small></div>
  <p class="small" id="off221i">${o.on ? `Saved ${o.t ? new Date(o.t).toLocaleDateString() : ''}${o.bytes ? ' · ' + MB221(o.bytes) : ''}` : 'Off'}</p>
  <div class="actions"${o.on ? '' : ' hidden'} id="off221a"><button class="btn" id="off221u">Update now</button><button class="btn" id="off221r">Remove offline data</button></div></div>`; }
async function offInfo221() { const el = $('#off221i'); if (!el) return; const o = store.get('off221', {}); if (!o.on) { el.textContent = 'Off'; return; } const s = await offSizes221(); if (!$('#off221i')) return;
  el.innerHTML = `Saved ${o.t ? new Date(o.t).toLocaleDateString() : ''} · Costco + Whole Foods pack <b>${MB221(s.pack || o.bytes || 0)}</b> · all offline data ${MB221(s.all)}${s.est && s.est.usage ? ` · Lumi uses ${MB221(s.est.usage)} on this device` : ''}${OFF221.pers ? ` · ${Object.keys(OFF221.pers).length} of your items` : ''}`; }
function bindOff221() { const t = $('#off221t'); if (!t) return; offInfo221();
  const run = async () => { const p = $('#off221p'), b = $('#off221b'), s = $('#off221s'); p.hidden = false; t.disabled = true; $('#off221a').hidden = true;
    try { await offDownload221((g, T) => { if (T) { b.style.width = Math.min(100, g / T * 100).toFixed(0) + '%'; s.textContent = `Downloading ${MB221(g)} of ${MB221(T)}`; } else s.textContent = `Downloading ${MB221(g)}`; }); s.textContent = 'Saving your own items…'; toast('Saved for offline'); p.hidden = true; $('#off221a').hidden = false; }
    catch (e) { s.textContent = navigator.onLine ? `Download failed (${e.message}). Try again.` : "You're offline. Connect to download."; t.checked = offOn221(); }
    t.disabled = false; offInfo221(); offPill221(); };
  t.onchange = async () => { if (t.checked) run(); else { await offRemove221(); $('#off221a').hidden = true; offInfo221(); offPill221(); toast('Offline data removed'); } };
  $('#off221u').onclick = () => { if (!navigator.onLine) { toast("You're offline"); return; } run(); }; $('#off221r').onclick = async () => { await offRemove221(); t.checked = false; $('#off221a').hidden = true; offInfo221(); offPill221(); toast('Offline data removed'); }; }
function offPill221() { let el = $('#offpill221'); if (navigator.onLine) { if (el) el.remove(); document.body.classList.remove('is-off221'); return; } document.body.classList.add('is-off221');
  if (!el) { el = document.createElement('div'); el.id = 'offpill221'; el.className = 'offpill221'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<i></i>Offline${offOn221() ? ' · using saved data' : ''}`; }
function goOffline221() { offPill221(); if (offOn221()) offDocs221().then(() => { try { if (/^#\/(store|search|browse)/.test(location.hash)) route(); } catch {} }); }
window.addEventListener('offline', goOffline221); window.addEventListener('online', () => { offPill221(); setTimeout(daily221, 3000); });
window.LumiOffline221 = { load: offLoad221, docs: offDocs221, download: offDownload221, remove: offRemove221, sizes: offSizes221, personal: offPersonal221, state: () => ({ on: offOn221(), recs: OFF221.recs ? Object.keys(OFF221.recs).length : 0, pers: OFF221.pers ? Object.keys(OFF221.pers).length : 0, docs: engine.docs.filter(d => d.off221).length }) };

/* ======================= settings, hooks, version notes ======================= */
{ const vs = viewSettings; viewSettings = function () { const r = vs.apply(this, arguments); try { if (!$('#wf221c')) { const at = $('#prefsCard') || app.querySelector('.card');
      const html = `<div class="card wf221c" id="wf221c"><div class="fx-h"><h2>${EYE221}Watch for</h2><a class="btn" href="#/alerts">Edit</a></div><p class="small">${esc(wfSummary221())}</p><p class="small muted">Your personal list of ingredients to avoid, flagged on products, list cards and Compare. On this device only.</p></div>` + offCardHTML221();
      if (at) at.insertAdjacentHTML('afterend', html); else app.insertAdjacentHTML('beforeend', html); bindOff221(); } } catch (e) { console.warn(e); } return r; }; }
function daily221() { if (!navigator.onLine) return; const last = store.get('chk221', 0); if (Date.now() - last > 20 * 3600e3) checkChanges221().catch(() => {});
  if (offOn221() && Date.now() - (store.get('offp221', 0)) > 20 * 3600e3) { store.set('offp221', Date.now()); offPersonal221(); } }
{ let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { cmpBtns221(); wfBadges221(); wfProd221(); chgCard221(); navBadge221(); viewFavCheck221(); } catch (e) { console.warn(e); } }); }).observe(app, { childList: true, subtree: true }); }
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(
  ['⇆', 'Compare up to 4', 'Compare 2 to 4 items side by side: groceries, restaurant meals, My foods and recipes. Tap ⇆ on any list card or Compare on a product. Health and Blood sugar scores, serving, sugar, total carbs, fiber, protein, sat fat, sodium, calories, added sugars and warnings, with the best in each row highlighted. Copy or share as text.'],
  ['👁', 'Watch for', 'Make your own list of ingredients to avoid in Settings → Watch for: categories, specific ones like maltodextrin or Red 40, or your own words. Lumi flags them on products, list cards and Compare, and "Hide my watch-for items" filters them out. Items with no ingredient list say "couldn\u2019t check".'],
  ['🔔', 'Favorite change alerts', 'Lumi remembers the ingredients and numbers of your favorites. When the data changes, you get a badge on My foods and a "What changed" view with added and removed ingredients, newly added sugars highlighted, and old vs new numbers.'],
  ['📴', 'Offline mode', 'Settings → Save for offline keeps your favorites, lists, My foods, recipes, compare tray, recently viewed and every Costco and Whole Foods item on this device. Scanning a saved item works with no signal.']);
setTimeout(() => { try { if (/^#\/(settings|compare|alerts)/.test(location.hash)) route(); drawCmpTray(); firstRun221(); navBadge221(); offPill221(); if (!navigator.onLine) goOffline221(); setTimeout(daily221, 4000); if (offOn221()) offLoad221(); } catch (e) { console.warn(e); } }, 0);
