/* Lumi 27.3: label photo intake on the Home chat box and the Search box: paste an image, drop one, or tap the small camera icon (photo library or camera).
   Only this stub is in the main bundle; the reader (js/photo273.js, js/label273.js) and Tesseract.js (vendor/tess, ~11 MB incl. language data) load when a photo is added. */
const PH273A = (() => {
  const ICO = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.2h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg>';
  let mods = null; const A = { file: null };
  const isImg = f => f && /^image\//.test(f.type || '') || (f && /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name || ''));
  function load() { if (mods) return mods; const one = s => new Promise((res, rej) => { const e = document.createElement('script'); e.src = s; e.onload = res; e.onerror = () => rej(new Error('Could not load ' + s)); document.head.appendChild(e); });
    mods = (window.LumiLabel273 ? Promise.resolve() : one('js/label273.js')).then(() => typeof PH273 !== 'undefined' ? 0 : one('js/photo273.js')).catch(e => { mods = null; throw e; }); return mods; }
  function take(f) { if (!isImg(f)) return false; A.file = f; load().catch(() => {}); if (location.hash === '#/photo') route(); else location.hash = '#/photo'; return true; }
  function attach() { const f = document.getElementById('sform'), q = document.getElementById('q'); if (!f || !q || f.querySelector('.ph273')) return;
    const fld = f.querySelector('.sfield') || f, sb = fld.querySelector('.sbtn');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ph273'; b.setAttribute('aria-label', 'Add a photo of a label'); b.title = 'Add a label photo'; b.innerHTML = ICO;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.className = 'ph273f'; inp.hidden = true; inp.setAttribute('aria-hidden', 'true'); inp.tabIndex = -1;
    fld.insertBefore(b, sb || null); fld.appendChild(inp); fld.classList.add('has273');
    b.onclick = () => { inp.value = ''; inp.click(); }; inp.onchange = () => { const x = inp.files && inp.files[0]; if (x) take(x); };
    q.addEventListener('paste', e => { const d = e.clipboardData; if (!d) return; let x = [...(d.files || [])].find(isImg); if (!x) { const it = [...(d.items || [])].find(i => i.kind === 'file' && /^image\//.test(i.type)); x = it && it.getAsFile(); } if (x && take(x)) e.preventDefault(); });
    f.addEventListener('dragover', e => { if ([...(e.dataTransfer && e.dataTransfer.items || [])].some(i => i.kind === 'file')) { e.preventDefault(); f.classList.add('drop273'); } });
    f.addEventListener('dragleave', () => f.classList.remove('drop273'));
    f.addEventListener('drop', e => { f.classList.remove('drop273'); const x = [...(e.dataTransfer && e.dataTransfer.files || [])].find(isImg); if (x) { e.preventDefault(); take(x); } }); }
  function view(arg) { app.innerHTML = '<div class="card"><div class="sk skl" style="height:160px"></div></div>'; load().then(() => PH273.view(A, arg)).catch(e => { app.innerHTML = `<div class="card empty"><b>Couldn't open the label reader</b>${esc(e.message)}. Check your connection; after the first use it works offline.<div class="actions"><a class="btn" href="#/">Home</a></div></div>`; }); }
  return { attach, take, view, load, A, isImg };
})();
{ const b0 = bindSearch; bindSearch = function () { const r = b0.apply(this, arguments); try { PH273A.attach(); } catch (e) {} return r; }; }
document.addEventListener('paste', e => { if (location.hash !== '#/photo' && !/^#\/(|search.*)$/.test(location.hash) && location.hash) return; const t = e.target; if (t && t.id === 'q') return; if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return; const d = e.clipboardData; const x = d && [...(d.files || [])].find(PH273A.isImg); if (x && PH273A.take(x)) e.preventDefault(); });
setTimeout(() => { try { PH273A.attach(); } catch (e) {} }, 0); window.addEventListener('hashchange', () => setTimeout(() => { try { PH273A.attach(); } catch (e) {} }, 0));
