/* Lumi 26.1: Pets. Pet-food lookup and barcode scan (Open Pet Food Facts bulk data), FDA animal-food recalls, a dog-toxic ingredient list with sources,
   and a dog-toxic check on human-food product pages. Routes: #/pet[/<dogs|cats|other>[/<query>]], #/pet/toxic, #/pet/recalls, pet product = #/cos/<barcode>.
   Pet food is not scored: Open Pet Food Facts almost never has nutrition facts and Lumi's scores are for human food. A check with no hit never means "safe". */
(() => {
'use strict';
const P = window.PET26; if (!P) { console.warn('v261: pet26core missing'); return; }
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const enc = encodeURIComponent, norm = P.norm, BASE = 'data/pet26/';
const ext = (u, t) => `<a class="lnk" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a>`;
const NF = n => Number(n).toLocaleString('en-US');
const FDA_RECALLS = 'https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals';
const SPN = { d: 'Dogs', c: 'Cats', b: 'Birds', f: 'Fish', s: 'Small pets' };
const spLabel = s => s ? s.split('').map(k => SPN[k]).filter(Boolean).join(', ') : 'Species not stated';
const asofFmt = d => { const m = String(d).match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : String(d || ''); };
const shell = (cls, inner) => { app.className = (app.className || '').replace(/\b(log11|logw11|rp12|prodv)\b/g, '').trim(); app.innerHTML = `<section class="${cls} pg13">${inner}</section>`; const h = app.querySelector('h1'); if (h) h.setAttribute('tabindex', '-1'); };
const srcLinks = keys => keys.map(k => P.S[k] ? ext(P.S[k][1], P.S[k][0]) : '').filter(Boolean).join(' · ');
const poisonLine = () => `<p class="small pz261">If a dog may have eaten something harmful, call your vet or an animal poison line right away: ${P.POISON.map(x => `${ext(x[2], x[0])} <a class="tel261" href="tel:${x[1].replace(/\D/g, '')}">${esc(x[1])}</a>`).join(' · ')}. These lines may charge a fee. Lumi can't tell you how much is dangerous for your dog.</p>`;

/* ---------- data ---------- */
const cache = {};
const load = (k, url, ms) => cache[k] || (cache[k] = getJSON(url, ms || 30000).catch(e => { delete cache[k]; throw e; }));
let DOCS = null, DOCSP = null;
function petIndex() { if (DOCS) return Promise.resolve(DOCS); if (DOCSP) return DOCSP;
  DOCSP = load('idx', BASE + 'index.json', 40000).then(j => { DOCS = { built: j.built, n: j.n, withIng: j.withIng, withImg: j.withImg, docs: j.docs.map(d => ({ code: d[0], name: d[1], brand: d[2], sp: d[3], ing: d[4], key: norm(d[1] + ' ' + d[2]) })) }; return DOCS; }).catch(e => { DOCSP = null; throw e; }); return DOCSP; }
const petRecalls = () => load('rec', BASE + 'recalls.json', 20000);
async function petRec(code) {
  code = String(code); const keys = [code]; if (/^\d+$/.test(code)) keys.push(code.padStart(13, '0'), code.padStart(12, '0'), code.replace(/^0+/, ''));
  for (const k of new Set(keys)) { if (k.length < 6) continue; try { const sh = await load('sh' + k.slice(-2), BASE + 'p/' + k.slice(-2) + '.json', 15000); if (sh[k]) return Object.assign({ c: k }, sh[k]); } catch (e) { if (k === code) throw e; } }
  return null; }
const imgU = path => path ? `https://images.openpetfoodfacts.org/images/products/${path}.400.jpg` : '';
const pageURL = code => `https://world.openpetfoodfacts.org/product/${code}`;
const attrib = () => `<p class="foot small">Pet product data: ${ext('https://world.openpetfoodfacts.org/', 'Open Pet Food Facts')}, a volunteer database (ODbL license; photos CC BY-SA). Entries can be wrong or out of date. Recalls: ${ext(FDA_RECALLS, 'FDA Center for Veterinary Medicine')}. Dog-toxic list: ${ext(P.S.aspca[1], 'ASPCA')} and FDA, ${esc(asofFmt(P.ASOF))}. Not veterinary advice.</p>`;

/* ---------- recall matching (brand level only) ---------- */
const bw = s => norm(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function recallBrands(r) { return String(r.b || '').split(/[,;/]|\band\b/i).map(bw).filter(x => x.length >= 4 && !/^(multiple|various|brand|names?|n a)\b/.test(x)); }
function recallMatch(brand, rec) { const b = bw(brand); if (b.length < 4 || !rec) return []; const out = [];
  for (const r of rec.rows) { for (const t of recallBrands(r)) { if (b === t || (' ' + b + ' ').includes(' ' + t + ' ') || (' ' + t + ' ').includes(' ' + b + ' ')) { out.push(r); break; } } } return out; }
function recallRowHTML(r) { return `<li class="rc261"><b>${esc(asofFmt(r.d))}</b> · ${esc(r.b || 'Brand not listed')}${r.t ? ' <i class="tg261 note261">Recall terminated</i>' : ''}<br><span>${esc(r.p)}</span><br><small>${esc(r.r)}${r.c ? ' · ' + esc(r.c) : ''}</small></li>`; }
async function recallCard(brand) { let rec; try { rec = await petRecalls(); } catch { return `<div class="card pcard261"><h2>FDA recalls</h2><p class="small"><b>Couldn't verify.</b> Lumi couldn't load its recall list. ${ext(FDA_RECALLS, 'Check FDA')}.</p></div>`; }
  if (!brand) return `<div class="card pcard261"><h2>FDA recalls</h2><p class="small"><b>Couldn't verify.</b> This entry has no brand, so Lumi can't match it to a recall. <a class="lnk" href="#/pet/recalls">See all FDA animal recalls ›</a></p></div>`;
  const m = recallMatch(brand, rec);
  if (!m.length) return `<div class="card pcard261"><h2>FDA recalls</h2><p class="small">No recall for the brand <b>${esc(brand)}</b> in Lumi's copy of FDA's animal and veterinary recall list (as of ${esc(asofFmt(rec.asof))}). That doesn't mean there isn't one: this matches the brand name only, and FDA's list may not be complete or current. ${ext(FDA_RECALLS, 'Check FDA')} · <a class="lnk" href="#/pet/recalls">All recalls ›</a></p></div>`;
  return `<div class="card pcard261 hit261" role="region" aria-label="FDA recalls"><h2>FDA recalls for this brand</h2><p class="small"><b>${m.length} recall${m.length === 1 ? '' : 's'} listed for the brand ${esc(brand)}.</b> This matches the brand name only: it does not mean this product is the one recalled. Read each notice for the exact products and lot codes.</p><ul class="rcl261">${m.slice(0, 6).map(recallRowHTML).join('')}</ul>${m.length > 6 ? `<p class="small">Showing 6 of ${m.length}. <a class="lnk" href="#/pet/recalls">All recalls ›</a></p>` : ''}<p class="small">Recall list as of ${esc(asofFmt(rec.asof))}. ${ext(FDA_RECALLS, 'FDA recall page')}</p></div>`; }

/* ---------- dog-toxic check card ---------- */
const LVL = { toxic: ['tox261', 'Named as toxic to dogs'], caution: ['cau261', 'Harmful in some forms'], note: ['note261', 'Related ingredient'] };
function hitHTML(h, open) { const c = LVL[h.level]; return `<details class="dh261 ${c[0]}"${open ? ' open' : ''}><summary><b>${esc(h.label)}</b><i class="tg261 ${c[0]}">${c[1]}</i><span class="fd261">on the label as: ${esc(h.found.join(', '))}</span></summary><p class="small">${esc(h.text)}</p><p class="small sr261">${srcLinks(h.src)}</p></details>`; }
/* opts: {pet: true when the product is pet food, lang, species} */
function dogCard(ing, opts) { opts = opts || {}; const r = P.analyze(ing || '', { lang: opts.lang, short: opts.short }); const head = '<h2>Dog-toxic ingredient check</h2>'; const n = P.W.filter(w => w.level !== 'note').length;
  const tail = `<p class="small">${ext(P.S.aspca[1], 'ASPCA list')} · <a class="lnk" href="#/pet/toxic">All ${n} checked ingredients and a checker ›</a></p>`;
  const cat = opts.species === 'c' ? '<p class="small">This entry is labeled for cats. The check below is about dogs; cats have their own risks.</p>' : '';
  const worst = r.hits.some(h => h.level === 'toxic') ? 'tox261' : r.hits.length ? 'cau261' : '';
  if (r.status === 'none') return `<div class="card dog261 na261" id="dog261">${head}${cat}<p class="small"><b>Couldn't verify.</b> Lumi has no ingredient list for this ${opts.pet ? 'product' : 'item'}, so it couldn't check for ingredients that are toxic to dogs. That doesn't mean it has none.</p>${tail}</div>`;
  const lang = r.status === 'lang' ? `<p class="small na261t"><b>Couldn't fully verify.</b> The ingredient list isn't in English, so Lumi may miss ingredients under their local names.</p>` : '';
  if (!r.hits.length) return `<div class="card dog261 ${r.status === 'lang' ? 'na261' : 'clr261'}" id="dog261">${head}${cat}${lang || `<p class="small"><b>None of the ${n} dog-toxic ingredients Lumi checks were found</b> in the ingredient list on file. That checks this list only: lists can be incomplete, and many other things can harm a dog. This is not a safety rating.</p>`}${tail}</div>`;
  const k = r.hits.length; return `<div class="card dog261 hit261 ${worst}" id="dog261" role="region" aria-label="Dog-toxic ingredient check">${head}${cat}<p class="small dn261"><b>${k} ingredient${k === 1 ? '' : 's'} to know about</b> in the list on file. Each flag says what ASPCA or FDA says, with a link. ${opts.pet ? 'Pet food sold for dogs normally avoids these, so check that the entry matches the package.' : 'Keep this away from dogs.'}</p>${lang}${r.hits.map((h, i) => hitHTML(h, i < 3)).join('')}${poisonLine()}${tail}</div>`; }

/* ---------- pet product view ---------- */
async function viewPetProduct(code, scanned) {
  document.title = 'Pet food — Lumi';
  shell('petp261', `<a class="back25" href="#/pet">‹ Pets</a><h1>Pet food</h1>${skel(3)}`);
  let rec; try { rec = await petRec(code); } catch (e) { app.innerHTML = `<div class="card empty"><b>Couldn't load pet food data</b>${esc(e.message)}. Check your connection and retry.<div class="actions"><button class="btn pri" onclick="route()">Retry</button><a class="btn" href="#/pet">Pets</a></div></div>`; return; }
  if (!/^#\/(cos|product)\//.test(location.hash)) return;
  if (!rec) { app.innerHTML = `<div class="card empty"><b>${esc(code)} isn't in Lumi's pet food data</b>It isn't a food Lumi knows, and it isn't in Open Pet Food Facts. Try the name, or <a class="lnk" href="https://world.openpetfoodfacts.org/cgi/product.pl?type=add&code=${esc(code)}" target="_blank" rel="noopener noreferrer">add it to Open Pet Food Facts ↗</a>.<div class="actions"><a class="btn pri" href="#/pet">Search pet food</a></div></div>`; return; }
  const nm = rec.n || 'Pet food (no name on file)'; document.title = nm + ' — Lumi';
  const im = imgU(rec.i), q = rec.q ? ` · ${esc(rec.q)}` : '', lang = rec.l || '';
  shell('petp261', `<a class="back25" href="#/pet">‹ Pets</a>
   <div class="card ph261"><div class="th261">${im ? `<img src="${esc(im)}" alt="${esc(nm)} package" loading="lazy" width="140" height="140" onerror="this.closest('.th261').classList.add('noimg261');this.remove()">` : ''}<span class="pw261" aria-hidden="true">🐾</span></div>
    <div class="pt261"><h1>${esc(nm)}</h1><p class="small">${esc(rec.b || 'Brand not listed')} · ${esc(spLabel(rec.s))}${q}</p><p class="small">Barcode ${esc(rec.c)}${scanned ? ' · scanned' : ''}</p></div></div>
   ${dogCard(rec.g, { pet: true, lang: lang, species: rec.s === 'c' ? 'c' : '' })}
   <div id="prc261">${skel(1)}</div>
   <div class="card pcard261"><h2>Ingredients on file</h2>${rec.g ? `<p class="ing25">${esc(rec.g)}</p>${lang && !/^en/i.test(lang) ? `<p class="small">Language: ${esc(lang)}</p>` : ''}` : "<p class=\"small\"><b>Couldn't verify.</b> No ingredient list is on file for this product.</p>"}</div>
   <div class="card pcard261"><h2>Not scored</h2><p class="small">Lumi's Health and Blood sugar scores are for human food, so it doesn't score pet food. Open Pet Food Facts rarely has a full nutrition panel, and Lumi won't guess one. Read the guaranteed analysis on the package, and ask your vet what suits your dog.</p></div>
   <p class="small">${ext(pageURL(rec.c), 'This product on Open Pet Food Facts')} · ${ext('https://world.openpetfoodfacts.org/cgi/product.pl?type=edit&code=' + rec.c, 'Fix or add details')}</p>${attrib()}`);
  const h = app.querySelector('h1'); if (h) h.setAttribute('tabindex', '-1');
  const H0 = location.hash; recallCard(rec.b).then(html => { if (location.hash !== H0) return; const box = $('#prc261'); if (box) box.outerHTML = html; });
}

/* ---------- hub, search ---------- */
const SPF = [['all', 'All'], ['dogs', 'Dogs'], ['cats', 'Cats'], ['other', 'Other or not stated']];
const spOK = (f, d) => f === 'all' || (f === 'dogs' ? d.sp.includes('d') : f === 'cats' ? d.sp.includes('c') : !/[dc]/.test(d.sp));
function rowHTML(d) { return `<li class="pr261"><a href="#/cos/${esc(d.code)}"><b>${esc(d.name || 'Pet food (no name)')}</b><small>${esc(d.brand || 'Brand not listed')} · ${esc(spLabel(d.sp))}${d.ing ? ' · ingredients on file' : ''}</small></a></li>`; }
async function viewPetHub(arg) {
  document.title = 'Pets — Lumi';
  const parts = String(arg || '').split('/'); let f = ['dogs', 'cats', 'other', 'all'].includes(parts[0]) ? parts[0] : 'all'; let q = decodeURIComponent((['dogs', 'cats', 'other', 'all'].includes(parts[0]) ? parts.slice(1) : parts).join('/') || '');
  shell('pethub261', `<h1>Pets</h1><p class="lead">Pet food lookup, dog-toxic ingredients and FDA animal recalls.</p>${skel(3)}`);
  let I; try { I = await petIndex(); } catch (e) { app.innerHTML = `<div class="card empty"><b>Couldn't load pet food data</b>${esc(e.message)}.<div class="actions"><button class="btn pri" onclick="route()">Retry</button></div></div>`; return; }
  if (!/^#\/pet(\/|$)/.test(location.hash)) return;
  let rec = null; try { rec = await petRecalls(); } catch { }
  const st = { f, q, ing: false, n: 40 };
  const brands = (() => { const m = new Map(), cap = x => x === x.toLowerCase() || x === x.toUpperCase() ? x.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (a, b, c) => b + c.toUpperCase()) : x; for (const d of I.docs) { if (!d.brand) continue; const k = d.brand.toLowerCase(); const e = m.get(k) || { n: 0, name: cap(d.brand) }; e.n++; m.set(k, e); } return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 16); })();
  shell('pethub261', `<h1>Pets</h1>
   <p class="lead">Look up a pet food by name or scan its barcode. Lumi checks the ingredient list for things that are toxic to dogs and the brand against FDA's animal recall list. It never calls a food “safe”: it shows what it found, or says it couldn't verify.</p>
   <div class="pt261b"><a href="#/pet/toxic"><b>Dog-toxic ingredients</b><span>Xylitol, chocolate, grapes, onion and more, with sources. Paste a list to check it.</span></a><a href="#/pet/recalls"><b>FDA animal recalls</b><span>${rec ? NF(rec.rows.length) + ' recalls on the FDA list, as of ' + esc(asofFmt(rec.asof)) : 'Recalls from FDA'}</span></a><button type="button" id="psc261" class="ptb261"><b>Scan a barcode</b><span>Lumi tries foods first, then pet food</span></button></div>
   <div class="card"><label class="vh" for="pq261">Search pet food</label><input id="pq261" type="search" inputmode="search" autocomplete="off" placeholder="Search pet food by name or brand" value="${esc(q)}">
    <div class="chips26" role="group" aria-label="Species">${SPF.map(c => `<button type="button" class="chip pf261${c[0] === f ? ' on' : ''}" data-f="${c[0]}" aria-pressed="${c[0] === f}">${c[1]}</button>`).join('')}<button type="button" class="chip pi261" id="pi261" aria-pressed="false">Has ingredient list</button></div>
    <div class="chips26 pb261" aria-label="Popular brands">${brands.map(b => `<button type="button" class="chip sm" data-b="${esc(b.name)}">${esc(b.name)} <small>${NF(b.n)}</small></button>`).join('')}</div>
    <p class="small" id="pn261" aria-live="polite"></p><ul class="pl261" id="pl261"></ul><div class="actions"><button type="button" class="btn" id="pm261" hidden>Show more</button></div></div>
   <p class="small">${NF(I.n)} pet foods in Lumi's copy of Open Pet Food Facts; ${NF(I.withIng)} have an ingredient list. Coverage is thin outside Europe, so a missing product only means it isn't in that database. Lumi doesn't score pet food.</p>${attrib()}`);
  const sb = $('#psc261'); if (sb && typeof startScan === 'function') sb.onclick = startScan; else if (sb) sb.hidden = true;
  const inp = $('#pq261'), list = $('#pl261'), more = $('#pm261'), note = $('#pn261'); let tm;
  const run = () => { const toks = norm(st.q).split(/\s+/).filter(Boolean);
    if (!toks.length && !st.ing && st.f === 'all') { list.innerHTML = ''; more.hidden = true; note.textContent = 'Type a name or brand, or tap a brand above.'; return; }
    const res = []; for (const d of I.docs) { if (!spOK(st.f, d) || (st.ing && !d.ing)) continue; if (toks.every(t => d.key.includes(t))) { res.push(d); if (res.length > 3000) break; } }
    res.sort((a, b) => (b.ing - a.ing) || (b.name ? 1 : 0) - (a.name ? 1 : 0));
    list.innerHTML = res.slice(0, st.n).map(rowHTML).join(''); more.hidden = res.length <= st.n;
    note.textContent = res.length ? `${res.length > 3000 ? 'More than 3,000' : NF(res.length)} match${res.length === 1 ? '' : 'es'}${res.length > st.n ? `, showing ${st.n}` : ''}.` : "No match in Lumi's pet food data. It may not be in Open Pet Food Facts yet."; };
  const sync = () => { try { history.replaceState(null, '', '#/pet/' + st.f + (st.q ? '/' + enc(st.q) : '')); } catch { } };
  inp.oninput = () => { st.q = inp.value; st.n = 40; clearTimeout(tm); tm = setTimeout(() => { run(); sync(); }, 120); };
  $$('.pf261').forEach(b => b.onclick = () => { st.f = b.dataset.f; st.n = 40; $$('.pf261').forEach(x => { const on = x.dataset.f === st.f; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); run(); sync(); });
  $('#pi261').onclick = e => { st.ing = !st.ing; e.currentTarget.classList.toggle('on', st.ing); e.currentTarget.setAttribute('aria-pressed', st.ing); st.n = 40; run(); };
  $$('.pb261 [data-b]').forEach(b => b.onclick = () => { inp.value = st.q = b.dataset.b; st.n = 40; run(); sync(); });
  more.onclick = () => { st.n += 40; run(); };
  run(); }

/* ---------- toxic list + checker ---------- */
function viewPetToxic() { document.title = 'Dog-toxic ingredients — Lumi';
  const order = { toxic: 0, caution: 1, note: 2 }; const ws = P.W.slice().sort((a, b) => order[a.level] - order[b.level]);
  shell('pettox261', `<a class="back25" href="#/pet">‹ Pets</a><h1>Dog-toxic ingredients</h1>
   <p class="lead">Ingredients that ASPCA or FDA say can poison dogs. Lumi looks for them in an ingredient list, on human-food pages, and in pet food. This is a short list of common ones, not every danger.</p>
   <div class="card"><h2>Check an ingredient list</h2><label class="vh" for="pt261">Ingredient list to check</label><textarea id="pt261" rows="4" placeholder="Paste an ingredient list, for example from a package"></textarea><div class="actions"><button type="button" class="btn pri" id="pc261">Check it</button><button type="button" class="btn" id="px261">Clear</button></div><div id="pr261" aria-live="polite"></div></div>
   ${poisonLine()}
   ${ws.map(w => { const c = LVL[w.level]; return `<div class="card dh261c ${c[0]}"><h3>${esc(w.label)} <i class="tg261 ${c[0]}">${c[1]}</i></h3><p class="small"><b>Looks for:</b> ${esc(w.terms)}</p><p class="small">${esc(w.text)}</p><p class="small sr261">${srcLinks(w.src)}</p></div>`; }).join('')}
   <div class="card"><h2>How it works</h2><ul class="hw26"><li>The check reads only the <b>ingredient list you give it or Lumi has on file</b>. No list means <b>couldn't verify</b>, never clear.</li><li>A clear result means none of these ingredients was found in that list. It doesn't mean the food is safe for a dog.</li><li>Sources were read on <b>${esc(asofFmt(P.ASOF))}</b>. Lumi paraphrases them and links the original. Amounts, your dog's size and health, and other ingredients all matter, so ask your vet.</li></ul></div>
   <p class="foot small">Not veterinary advice. ${ext(P.S.aspca[1], P.S.aspca[0])} · ${ext(P.S.fdaItems[1], P.S.fdaItems[0])}</p>`);
  const ta = $('#pt261'), out = $('#pr261'); const go = () => { const v = ta.value.trim(); if (!v) { out.innerHTML = '<p class="small na261t"><b>Couldn\'t verify.</b> Paste an ingredient list first.</p>'; return; } out.innerHTML = dogCard(v, { short: true }).replace(' id="dog261"', ''); };
  $('#pc261').onclick = go; $('#px261').onclick = () => { ta.value = ''; out.innerHTML = ''; ta.focus(); }; }

/* ---------- recalls ---------- */
async function viewPetRecalls(arg) { document.title = 'FDA animal recalls — Lumi';
  shell('petrec261', `<a class="back25" href="#/pet">‹ Pets</a><h1>FDA animal recalls</h1>${skel(3)}`);
  let rec; try { rec = await petRecalls(); } catch (e) { app.innerHTML = `<div class="card empty"><b>Couldn't load the recall list</b>${esc(e.message)}.<div class="actions"><button class="btn pri" onclick="route()">Retry</button><a class="btn" href="${esc(FDA_RECALLS)}" target="_blank" rel="noopener noreferrer">FDA recall page</a></div></div>`; return; }
  if (!/^#\/pet\/recalls/.test(location.hash)) return;
  let f = ['dogs', 'cats'].includes(arg) ? arg : 'all'; const dogRx = /\b(dogs?|puppy|puppies|canine)\b/i, catRx = /\b(cats?|kittens?|feline)\b/i;
  const draw = () => { const rows = rec.rows.filter(r => f === 'all' || (f === 'dogs' ? dogRx : catRx).test(r.p + ' ' + r.r + ' ' + r.b));
    $('#rl261').innerHTML = rows.length ? rows.map(recallRowHTML).join('') : '<li class="small">No recall on the list mentions that.</li>'; $('#rn261').textContent = `${rows.length} recall${rows.length === 1 ? '' : 's'}`; $$('.rf261').forEach(b => { const on = b.dataset.f === f; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); };
  shell('petrec261', `<a class="back25" href="#/pet">‹ Pets</a><h1>FDA animal recalls</h1>
   <p class="lead">Recalls and withdrawals of animal food, treats and veterinary products, from the FDA Center for Veterinary Medicine's list, as of <b>${esc(asofFmt(rec.asof))}</b>. This is FDA's table as published; it doesn't hold every recall (some are announced by the company only), so check FDA for the latest.</p>
   <div class="card"><div class="chips26" role="group" aria-label="Filter">${[['all', 'All'], ['dogs', 'Mentions dogs'], ['cats', 'Mentions cats']].map(c => `<button type="button" class="chip rf261" data-f="${c[0]}" aria-pressed="false">${c[1]}</button>`).join('')}</div><p class="small" id="rn261" aria-live="polite"></p><ul class="rcl261" id="rl261"></ul></div>
   <p class="small">${ext(FDA_RECALLS, 'FDA recalls and withdrawals page')}. Lumi shows the brand, product description, reason and company as FDA lists them.</p>${attrib()}`);
  $$('.rf261').forEach(b => b.onclick = () => { f = b.dataset.f; draw(); }); draw(); }

/* ---------- dog check on human-food pages ---------- */
async function prod261() { const m = location.hash.match(/^#\/product\/([^/?]+)/); if (!m || $('#dog261')) return; const foot = app.querySelector('p.foot'); if (!app.classList.contains('prodv') || !foot) return;
  const aw = $('#aw26'); if (!aw) return; /* wait for the additive card, so the order is stable; restaurant and no-list custom items get neither */
  const id = decodeURIComponent(m[1]); let p = memo.get(id); if (!p) { try { p = await resolveProduct(id); } catch { return; } } if (!p || $('#dog261') || location.hash.indexOf(m[1]) < 0) return;
  const html = dogCard(p.ing || '', {}); if ($('#dog261')) return; aw.insertAdjacentHTML('afterend', html);
  const r = P.analyze(p.ing || ''); const top = app.querySelector('.card .actions');
  if (top && r.hits.some(h => h.level === 'toxic') && !$('#dogj261')) { const hs = r.hits.filter(h => h.level === 'toxic'); const anchor = $('#awj26') || $('#iwj22') || top;
    anchor.insertAdjacentHTML('beforebegin', `<button type="button" class="dogj261" id="dogj261"><i class="tg261 tox261">🐕 Dog-toxic</i><span>${esc(hs.slice(0, 3).map(h => h.label.split(' (')[0]).join(', '))}${hs.length > 3 ? '…' : ''} ↓</span></button>`); $('#dogj261').onclick = () => $('#dog261').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }

/* ---------- integration ---------- */
const cp0 = self.cosProduct;
self.cosProduct = async function (code) { code = String(code).replace(/\D/g, ''); if (code.replace(/^0+/, '').length < 8) return cp0 ? cp0.apply(this, arguments) : null;
  try { const r = await petRec(code); if (r) return { id: r.c, code: r.c, src: 'pet26', name: r.n || '', brand: r.b || '', hb: 1 }; } catch { }
  return cp0 ? cp0.apply(this, arguments) : null; };
const vc0 = self.viewCosProduct;
self.viewCosProduct = async function (id, pre, scanned) { if (!pre && /^\d{8,14}$/.test(String(id))) pre = await self.cosProduct(id).catch(() => null);
  if (pre && pre.src === 'pet26') return viewPetProduct(pre.code, scanned); return vc0.call(this, id, pre, scanned); };
const RT = { pet: viewPetHub };
function petRoute(arg) { if (arg === 'toxic') return viewPetToxic(); if (/^recalls(\/|$)/.test(arg)) return viewPetRecalls(arg.split('/')[1]); return viewPetHub(arg); }
if (typeof tab19 === 'function') { const t0 = tab19; tab19 = function (view) { if (view === 'pet') return 'browse'; return t0.apply(this, arguments); }; }
if (typeof viewHome === 'function') { const vh = viewHome; viewHome = function () { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'), v = i < 0 ? h : h.slice(0, i);
  if (v === 'pet') return petRoute(i < 0 ? '' : h.slice(i + 1)); return vh.apply(this, arguments); }; }
if (typeof viewBrowseHub === 'function') { const bh = viewBrowseHub; viewBrowseHub = function () { const r = bh.apply(this, arguments);
  const sec = `<div class="sec-h"><h2>Pets</h2></div><div class="tools74 petbr261"><a href="#/pet"><b>Pet food</b><span>Search or scan pet food, with FDA recalls</span></a><a href="#/pet/toxic"><b>Dog-toxic ingredients</b><span>Xylitol, chocolate, grapes, onion and more</span></a></div>`;
  const t = app.querySelector('.browse74 .tools74'); if (t && !app.querySelector('.petbr261')) { const last = [...app.querySelectorAll('.browse74 .tools74')].pop(); (last || t).insertAdjacentHTML('afterend', sec); } return r; }; }
{ let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; try { prod261(); } catch (e) { console.warn(e); } }); }).observe(app, { childList: true, subtree: true }); }
setTimeout(() => { try { prod261(); } catch (e) { console.warn(e); } }, 0);
self.viewPetHub261 = viewPetHub; self.viewPetProduct261 = viewPetProduct;
if (/^#\/pet(\/|$)/.test(location.hash) && typeof route === 'function') setTimeout(route, 0);
if (typeof V7_NEWS !== 'undefined') V7_NEWS.unshift(['🐕', 'Pets (26.1)', 'Search or scan pet food (from Open Pet Food Facts) to see its ingredients, a dog-toxic ingredient check and any FDA recall listed for the brand. Human-food pages now check for ingredients ASPCA and FDA say can poison dogs, like xylitol, chocolate, grapes and raisins, onion and garlic, with links to the sources. There is also a list of those ingredients, a checker you can paste a label into, and FDA\'s animal recall list. Lumi doesn\'t score pet food, and it never says a food is "safe": a check with no hit only means none of those ingredients was found in the list it has. See Browse → Pets.']);
})();
