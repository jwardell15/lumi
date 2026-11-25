/* Lumi 27.3: grade a label photo. Loaded on demand by js/ph273a.js (not in the app bundles).
   1. OCR on this device with Tesseract.js served from vendor/tess (worker, LSTM core wasm, English data); the service worker keeps them for offline use.
      The photo is downscaled and converted to a high-contrast gray image first (darkest channel, so orange or red text on cream reads as black on white;
      light text on a dark label is inverted), then read once; if that finds almost nothing, the 90 / 270 / 180 degree turns are tried.
   2. js/label273.js turns the text into per-serving numbers + ingredients + "Contains". Nothing is guessed: a value it couldn't read stays empty.
   3. The same per-serving Health and Blood sugar scores, ingredient warnings and hidden-sugar checks as any product. Every number is editable; the grade updates live.
   4. Save keeps it on this device (IndexedDB + My foods). Nothing is uploaded. */
const PH273 = (() => {
  const VT = '7.0.0', ABS = p => new URL(p, location.href).href;
  const TESS = () => ({ workerPath: ABS('vendor/tess/v7/worker.min.js'), corePath: ABS('vendor/tess/v7/'), langPath: ABS('vendor/tess/v7/'), gzip: true, workerBlobURL: false, cacheMethod: 'none' });
  self.TESS_OPT273 = TESS; /* the older label / menu pages use the same self-hosted files */
  let wP = null, logCb = null; const st = { last: null };
  const loadJs = s => new Promise((res, rej) => { if (s.includes('tesseract') && window.Tesseract) return res(); const e = document.createElement('script'); e.src = s; e.onload = res; e.onerror = () => rej(new Error('The text reader did not load (offline before first use?)')); document.head.appendChild(e); });
  function worker() { if (!wP) wP = loadJs('vendor/tess/v7/tesseract.min.js').then(() => Tesseract.createWorker('eng', 1, Object.assign(TESS(), { logger: m => logCb && logCb(m) })))
      .then(async w => { await w.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '0', user_defined_dpi: '300' }); /* 3 = automatic page segmentation: keeps an ingredient column apart from the Nutrition Facts box */ return w; }).catch(e => { wP = null; throw e; }); return wP; }
  /* ---------- image prep ---------- */
  async function bitmap(file) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {
      return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("This image couldn't be opened (try a JPEG or PNG)")); i.src = URL.createObjectURL(file); }); } }
  /* skew angle (degrees) of the text lines: the angle whose horizontal projection of dark pixels is the most peaked, on a small copy */
  function skewOf(bm, rot, o) { const L = Math.max(bm.width, bm.height), s = 600 / L, w = Math.max(1, Math.round(bm.width * s)), h = Math.max(1, Math.round(bm.height * s)), rw = rot % 180 ? h : w, rh = rot % 180 ? w : h;
    const c = document.createElement('canvas'); c.width = rw; c.height = rh; const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, rw, rh); x.translate(rw / 2, rh / 2); x.rotate(rot * Math.PI / 180); x.drawImage(bm, -w / 2, -h / 2, w, h);
    const p = x.getImageData(0, 0, rw, rh).data; let sum = 0; const g = new Uint8Array(rw * rh); for (let i = 0, j = 0; i < g.length; i++, j += 4) { const l = (p[j] * 299 + p[j + 1] * 587 + p[j + 2] * 114) / 1000; sum += l; g[i] = l; }
    const dark = sum / g.length < 110; for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = dark ? 255 - Math.max(p[j], p[j + 1], p[j + 2]) : Math.min(p[j], p[j + 1], p[j + 2]);
    let m = 0; for (let i = 0; i < g.length; i++) m += g[i]; m /= g.length; const X = [], Y = []; for (let y = 0; y < rh; y++) for (let x0 = 0; x0 < rw; x0++) if (g[y * rw + x0] < m - 50) { X.push(x0 - rw / 2); Y.push(y - rh / 2); }
    if (X.length < 200) return 0; const D = Math.ceil(Math.hypot(rw, rh)) + 2, bins = new Float64Array(D);
    const sc = a => { const r = a * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r); bins.fill(0); for (let i = 0; i < X.length; i++) bins[Math.round(Y[i] * cs - X[i] * sn + D / 2)]++; let q = 0; for (let i = 0; i < D; i++) q += bins[i] * bins[i]; return q; };
    let best = 0, bv = sc(0); for (let a = -15; a <= 15; a += 1) { const v = sc(a); if (v > bv * 1.0001) { bv = v; best = a; } } let b2 = best; for (let a = best - 0.8; a <= best + 0.8; a += 0.2) { const v = sc(a); if (v > bv) { bv = v; b2 = a; } }
    if (o && o.orient) { /* text lines run along x: compare against the profile across x (photo turned 90 degrees) */ const bx = new Float64Array(D); for (let i = 0; i < X.length; i++) bx[Math.round(X[i] + D / 2)]++; let qx = 0; for (let i = 0; i < D; i++) qx += bx[i] * bx[i];
      const qy = sc(0); return qx * rw > qy * rh * 1.3 ? 90 : 0; } /* sum of squares times the axis length: 1 for an even spread, higher when lines stack up */
    return Math.abs(b2) < 0.4 ? 0 : b2; }
  function prep(bm, rot, o) { o = o || {}; const o2 = o; const w0 = bm.width, h0 = bm.height, L = Math.max(w0, h0), tgt = o.tgt || Math.min(2400, Math.max(1500, L)), s = tgt / L, sk = o.skew != null ? o.skew : skewOf(bm, rot);
    const w = Math.round(w0 * s), h = Math.round(h0 * s), R = (rot - sk) * Math.PI / 180, rw = Math.round(Math.abs(w * Math.cos(R)) + Math.abs(h * Math.sin(R))), rh = Math.round(Math.abs(w * Math.sin(R)) + Math.abs(h * Math.cos(R))), c = document.createElement('canvas'); c.width = rw; c.height = rh;
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.translate(rw / 2, rh / 2); x.rotate(R); x.drawImage(bm, -w / 2, -h / 2, w, h); x.setTransform(1, 0, 0, 1, 0, 0); c.skew = sk;
    { /* fill the corners that rotation left empty with the photo's edge color, so they don't read as dark */ const id = x.getImageData(0, 0, rw, rh), q = id.data; let r0 = 0, g0 = 0, b0 = 0, nn = 0; for (let i = 0; i < q.length; i += 4 * 97) if (q[i + 3] > 250) { r0 += q[i]; g0 += q[i + 1]; b0 += q[i + 2]; nn++; }
      if (nn) { r0 /= nn; g0 /= nn; b0 /= nn; for (let i = 0; i < q.length; i += 4) if (q[i + 3] < 250) { q[i] = r0; q[i + 1] = g0; q[i + 2] = b0; q[i + 3] = 255; } x.putImageData(id, 0, 0); } }
    const d = x.getImageData(0, 0, rw, rh), p = d.data, n = rw * rh, g = new Uint8ClampedArray(n); let sum = 0;
    for (let i = 0, j = 0; i < n; i++, j += 4) { const lum = (p[j] * 299 + p[j + 1] * 587 + p[j + 2] * 114) / 1000; sum += lum; g[i] = lum; }
    const dark = sum / n < 110; /* light text on a dark label */
    for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = dark ? 255 - Math.max(p[j], p[j + 1], p[j + 2]) : Math.min(p[j], p[j + 1], p[j + 2]);
    /* contrast stretch (1st..99th percentile), then a local threshold (mean of a ~1/24-width box minus a margin) so shadows and glare don't wipe out text */
    const hist = new Uint32Array(256); for (let i = 0; i < n; i++) hist[g[i]]++; let lo = 0, hi = 255, a = 0; while (a < n * 0.01 && lo < 254) a += hist[lo++]; a = 0; while (a < n * 0.01 && hi > lo + 1) a += hist[hi--];
    const k = 255 / Math.max(1, hi - lo); for (let i = 0; i < n; i++) g[i] = Math.max(0, Math.min(255, (g[i] - lo) * k));
    const I = new Float64Array((rw + 1) * (rh + 1)); for (let y = 0; y < rh; y++) { let row = 0; for (let x0 = 0; x0 < rw; x0++) { row += g[y * rw + x0]; I[(y + 1) * (rw + 1) + x0 + 1] = I[y * (rw + 1) + x0 + 1] + row; } }
    const r = Math.max(8, Math.round(Math.min(rw, rh) / 24));
    for (let y = 0; y < rh; y++) { const y1 = Math.max(0, y - r), y2 = Math.min(rh, y + r + 1); for (let x0 = 0; x0 < rw; x0++) { const x1 = Math.max(0, x0 - r), x2 = Math.min(rw, x0 + r + 1);
        const m = (I[y2 * (rw + 1) + x2] - I[y1 * (rw + 1) + x2] - I[y2 * (rw + 1) + x1] + I[y1 * (rw + 1) + x1]) / ((y2 - y1) * (x2 - x1)), v = g[y * rw + x0], o = (y * rw + x0) * 4;
        const b = o2.gray ? v : v < m - 18 || v < 70 ? 0 : 255; p[o] = p[o + 1] = p[o + 2] = b; p[o + 3] = 255; } }
    /* drop ruled lines (table rules, box borders): long black runs are not text and make Tesseract merge rows */
    if (o2.gray) { x.putImageData(d, 0, 0); return c; }
    const minH = Math.round(rw * 0.2), minV = Math.round(rh * 0.15);
    for (let y = 0; y < rh; y++) { let s = -1; for (let x0 = 0; x0 <= rw; x0++) { const blk = x0 < rw && p[(y * rw + x0) * 4] === 0; if (blk && s < 0) s = x0; else if (!blk && s >= 0) { if (x0 - s >= minH) for (let q = s; q < x0; q++) p[(y * rw + q) * 4] = p[(y * rw + q) * 4 + 1] = p[(y * rw + q) * 4 + 2] = 254; s = -1; } } }
    for (let x0 = 0; x0 < rw; x0++) { let s = -1; for (let y = 0; y <= rh; y++) { const blk = y < rh && p[(y * rw + x0) * 4] === 0; if (blk && s < 0) s = y; else if (!blk && s >= 0) { if (y - s >= minV) for (let q = s; q < y; q++) p[(q * rw + x0) * 4] = p[(q * rw + x0) * 4 + 1] = p[(q * rw + x0) * 4 + 2] = 254; s = -1; } } }
    for (let i = 0; i < n * 4; i += 4) if (p[i] === 254) p[i] = p[i + 1] = p[i + 2] = 255;
    x.putImageData(d, 0, 0); return c; }
  function thumbURL(bm) { const s = 160 / Math.max(bm.width, bm.height), c = document.createElement('canvas'); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.7); }
  /* ---------- OCR ---------- */
  function merge(into, from) { const v = into.r.v, w = from.r.v; let n = 0; for (const k of LumiLabel273.FIELDS) if (v[k] == null && w[k] != null) { v[k] = w[k]; into.r.flags[k] = 'check'; into.r.notes[k] = 'Read on a second pass of the photo. Check it.'; n++; }
    for (const k of LumiLabel273.FIELDS) if (v[k] != null && w[k] != null && into.r.flags[k] === 'check' && /OCR|doubled|Read “\d+9”/.test(into.r.notes[k] || '')) { if (w[k] === v[k] && !from.r.flags[k]) { delete into.r.flags[k]; delete into.r.notes[k]; } }
    for (const k of ['serv', 'ing', 'contains']) if (!v[k] && w[k]) { v[k] = w[k]; n++; } if (n) { into.r.nRead = LumiLabel273.FIELDS.filter(k => v[k] != null).length; into.text += '\n\n--- second pass ---\n' + from.text; into.score = LumiLabel273.quality(into.r); } }
  async function read(file, onp) { const t0 = performance.now(); logCb = m => { if (onp && m.status === 'recognizing text') onp('read', m.progress); else if (onp && /load|initializ/.test(m.status)) onp('load', m.progress); };
    const bm = await bitmap(file), w = await worker(), t1 = performance.now(); const P = LumiLabel273, tries = [];
    const one = async (rot, psm, bin) => { const c = prep(bm, rot, { gray: !bin }); if (psm) await w.setParameters({ tessedit_pageseg_mode: psm }); const r = await w.recognize(c); if (psm) await w.setParameters({ tessedit_pageseg_mode: '3' });
      const q = P.parse(r.data.text); tries.push({ rot, bin: !!bin, psm: psm || '3', skew: Math.round(c.skew * 10) / 10, ms: Math.round(performance.now() - t1), conf: r.data.confidence, n: q.nRead }); return { text: r.data.text, r: q, rot, score: P.quality(q) }; };
    const r0 = bm.width >= bm.height * 0.8 ? skewOf(bm, 0, { orient: 1 }) : 0; /* a tall photo is upright; a wide or square one may be turned */ let best = await one(r0); const n9 = () => Object.values(best.r.notes).filter(x => /OCR|doubled|Read “\d+9”/.test(x)).length;
    const good = () => (best.r.nRead >= 9 && n9() < 2) || (best.r.v.ing && !best.r.hasNF && best.r.nRead === 0 && best.text.length > 40);
    /* second pass on a black-and-white version: fills fields the first pass missed (marked "check"), or replaces it when it reads more */
    if (!good()) { const o = await one(best.rot, null, 1); if (o.score > best.score + 10) { const a = best; best = o; merge(best, a); } else merge(best, o); }
    if (best.r.nRead < 4 && !best.r.v.ing) for (const rot of (r0 ? [270, 0, 180] : [90, 270, 180])) { const o = await one(rot); if (o.score > best.score) best = o; if (best.r.nRead >= 6) break; }
    const conf = (tries.find(x => x.rot === best.rot && !x.bin) || tries[0] || {}).conf; if (conf != null && conf < 60) for (const k of LumiLabel273.FIELDS) if (best.r.v[k] != null && !best.r.flags[k]) { best.r.flags[k] = 'check'; best.r.notes[k] = 'The photo is hard to read (blurry or dim). Check this number.'; }
    best.blurry = conf != null && conf < 60;
    const out = Object.assign(best, { ms: Math.round(performance.now() - t0), ocrMs: Math.round(performance.now() - t1), loadMs: Math.round(t1 - t0), tries, thumb: thumbURL(bm), w: bm.width, h: bm.height });
    st.last = out; return out; }
  /* ---------- product + grade ---------- */
  const FLD = [['servG', 'Serving weight', 'g'], ['servings', 'Servings per container', ''], ['kcal', 'Calories', ''], ['fat', 'Total fat', 'g'], ['sat', 'Saturated fat', 'g'], ['trans', 'Trans fat', 'g'], ['chol', 'Cholesterol', 'mg'], ['sodium', 'Sodium', 'mg'], ['carbs', 'Total carbohydrate', 'g'], ['fiber', 'Dietary fiber', 'g'], ['sugars', 'Total sugars', 'g'], ['added', 'Added sugars', 'g'], ['protein', 'Protein', 'g']];
  const SWEET = [[/\bmonk ?fruit|luo han guo|mogroside/i, 'Monk fruit', 'A zero-calorie sweetener from luo han guo fruit. It does not raise blood sugar by itself. The FDA has not objected to it (GRAS notices); long-term studies are limited.'],
    [/\bstevia|rebaudioside|reb[- ]?a\b|steviol/i, 'Stevia', 'A zero-calorie plant sweetener. It does not raise blood sugar by itself. WHO advises against non-sugar sweeteners for weight control.'],
    [/\ballulose\b/i, 'Allulose', 'A rare sugar that is mostly not absorbed as energy; it has little effect on blood sugar. Counted on US labels in total carbs, not added sugars.'],
    [/\berythritol\b/i, 'Erythritol', 'A sugar alcohol with almost no effect on blood sugar. A 2023 observational study linked blood erythritol with cardiovascular events (emerging evidence).'],
    [/\bsucralose\b/i, 'Sucralose', 'A zero-calorie sweetener. WHO advises against non-sugar sweeteners for weight control.'], [/\baspartame\b/i, 'Aspartame', 'A low-calorie sweetener. IARC rated it "possibly carcinogenic" (2B) in 2023; not for people with PKU.'],
    [/\bacesulfame\b/i, 'Acesulfame K', 'A zero-calorie sweetener, often paired with sucralose or aspartame.'], [/\b(maltitol|sorbitol|xylitol|isomalt)\b/i, 'Sugar alcohol', 'Partly absorbed: maltitol and sorbitol can raise blood sugar somewhat and upset digestion in larger amounts.']];
  function product(S0) { const v = S0.v, g = v.servG > 0 ? v.servG : null, k = g ? 100 / g : 1, n = {}, M = { carbs: 'carbs', sugars: 'sugars', added: 'added', fiber: 'fiber', protein: 'protein', fat: 'fat', sat: 'sat', trans: 'trans', sodium: 'sodiumMg', kcal: 'kcal', chol: 'cholMg' };
    for (const [a, b] of Object.entries(M)) n[b] = v[a] == null ? null : v[a] * k; n.polyols = null;
    return { id: S0.id, code: '', src: 'custom', name: (S0.name || '').trim() || 'Label photo', brand: 'From your photo', qty: '', img: S0.thumb || '', servQ: g || 100, serv: v.serv || (g ? g + ' g' : '1 serving (weight not read)'),
      nova: null, additives: [], ing: v.ing || '', cat: 'Custom', cats: '', naLabel: true, liquid: !!v.liquid, portions: [[v.serv || '1 serving', g || 100]],
      meta: { src: 'Label photo, read on this device', perItem: !g, user: true, photo273: { contains: v.contains || '', servings: v.servings, lt: S0.lt || {}, read: S0.read || {} } }, n }; }
  function grade(p) { let sc = null, h = null; try { sc = S.score(p); } catch (e) {} try { h = HR(p); } catch (e) {} let w = null; try { w = p.ing ? LumiWarn.analyze(p.ing) : null; } catch (e) {}
    const sw = SWEET.filter(([re]) => re.test(p.ing || '')).map(([, a, b]) => ({ name: a, note: b })); return { sc, h, w, sw }; }
  /* ---------- view ---------- */
  const fm = x => x == null ? '' : String(Math.round(x * 100) / 100);
  const CSS = `.pg273 .lead{margin-top:-4px}.ph273top{display:flex;gap:14px;align-items:center}.ph273top img{width:84px;height:84px;object-fit:contain;border-radius:12px;background:var(--bg2,#f4efe9);border:1px solid var(--line,#eee)}
.ph273tag{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--acc);background:var(--acc-soft,rgba(234,108,32,.12));border-radius:999px;padding:3px 10px;margin-bottom:6px}
.ph273sv{font-size:14px;color:var(--mut)}#ph273card .row{pointer-events:none}#ph273card{margin:10px 0}.ph273bar{height:6px;border-radius:3px;background:var(--line,#eee);overflow:hidden;margin-top:8px}.ph273bar i{display:block;height:100%;width:0;background:var(--acc);transition:width .2s}
.ph273w{list-style:none;padding:0;margin:8px 0 0}.ph273w li{padding:7px 0;border-top:1px solid var(--line,#eee);font-size:15px}.ph273w li:first-child{border-top:0}.ph273w b{font-weight:700}.ph273w small{display:block;color:var(--mut);font-size:13px;margin-top:2px}
.ph273w .sv-avoid b{color:var(--bad,#c2410c)}.ph273w .sv-caution b{color:var(--warn,#b45309)}.ph273cv{font-size:14px;color:var(--mut);margin:6px 0 0}.ph273cv b{color:var(--ink)}
.ph273t{width:100%;border-collapse:collapse;font-size:15px}.ph273t td{padding:5px 4px;border-top:1px solid var(--line,#eee);vertical-align:middle}.ph273t tr:first-child td{border-top:0}.ph273t td:nth-child(2){width:96px}
.ph273t input{width:88px;font:inherit;padding:6px 8px;border:1.5px solid var(--line2,#ddd);border-radius:10px;background:var(--card);color:var(--ink);text-align:right}.ph273t input.nr{border-style:dashed}
.ph273t .u{color:var(--mut);font-size:13px;width:34px}.ph273t .s{font-size:12px;color:var(--mut);text-align:right}.ph273t .s.ck{color:var(--warn,#b45309);font-weight:600}.ph273t .s.nr{color:var(--bad,#c2410c);font-weight:600}
.ph273ed label{display:block;margin:8px 0}.ph273ed input[type=text],.ph273ed textarea{width:100%;box-sizing:border-box;font:inherit;padding:8px 10px;border:1.5px solid var(--line2,#ddd);border-radius:10px;background:var(--card);color:var(--ink)}
.ph273acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ph273raw pre{white-space:pre-wrap;font-size:12px;max-height:240px;overflow:auto;background:var(--bg2,#f6f2ee);padding:8px;border-radius:8px}`;
  function css() { if (!document.getElementById('css273')) { const s = document.createElement('style'); s.id = 'css273'; s.textContent = CSS; document.head.appendChild(s); } }
  let S0 = null; /* current scan: {id, v, flags, notes, lt, read, name, thumb, text, ms} */
  function view(A, arg) { css(); document.title = 'Label photo — Lumi'; const f = A.file; A.file = null;
    if (!f && S0) return render();
    if (!f) { app.innerHTML = `<section class="pg273"><h1>Grade a label photo</h1><p class="lead">Add a photo of a Nutrition Facts panel or an ingredient list. It's read on this device; nothing is uploaded.</p>
      <div class="card"><button type="button" class="btn pri" id="ph273pick">Choose or take a photo</button><input type="file" accept="image/*" id="ph273in" hidden><p class="small">You can also paste or drop an image into the search box.</p></div></section>`;
      $('#ph273pick').onclick = () => $('#ph273in').click(); $('#ph273in').onchange = e => { const x = e.target.files[0]; if (x) PH273A.take(x); }; return; }
    const url = URL.createObjectURL(f);
    app.innerHTML = `<section class="pg273"><h1>Reading your label</h1><div class="card"><div class="ph273top"><img src="${url}" alt="Your photo"><div style="flex:1"><div id="ph273s" class="small" aria-live="polite">Starting the text reader on this device…</div><div class="ph273bar"><i id="ph273p"></i></div></div></div></div></section>`;
    const stEl = $('#ph273s'), bar = $('#ph273p');
    read(f, (ph, pr) => { if (!stEl.isConnected) return; if (ph === 'load') { stEl.textContent = 'Loading the text reader (first time only, about 6 MB)…'; bar.style.width = Math.round(10 + 20 * (pr || 0)) + '%'; } else { stEl.textContent = `Reading the label… ${Math.round(pr * 100)}%`; bar.style.width = Math.round(30 + 70 * pr) + '%'; } })
      .then(o => { const r = o.r; S0 = { id: 'c-ph' + Date.now().toString(36), v: Object.assign({}, r.v), flags: r.flags, notes: r.notes, lt: r.lt || {}, read: {}, name: '', thumb: o.thumb, text: o.text, ms: o.ms, ocrMs: o.ocrMs, rot: o.rot, nRead: r.nRead };
        FLD.forEach(([k]) => { if (r.v[k] != null) S0.read[k] = 1; }); if (location.hash === '#/photo') render(); })
      .catch(e => { if (stEl.isConnected) { stEl.innerHTML = `<b>Couldn't read this photo.</b> ${esc(e.message || e)}`; bar.style.width = '0'; } }); }
  function render() { const v = S0.v, nothing = !S0.nRead && !v.ing;
    app.innerHTML = `<section class="pg273"><h1>${nothing ? 'No label found' : 'Label photo graded'}</h1>
      ${nothing ? `<div class="card"><p>Lumi couldn't find Nutrition Facts or an ingredient list in this photo. Try a sharper, straight-on photo in good light, or type the values below.</p></div>` : ''}
      <div class="card"><div class="ph273top"><div><span class="ph273tag">From your photo</span><div class="ph273sv" id="ph273sv"></div></div></div><div id="ph273card"></div><div id="ph273g"></div></div>
      <div class="card ph273ed"><h2>Check the numbers</h2><p class="small">Per serving, as read from the photo. Fix anything misread; the grade updates as you type. Empty means Lumi couldn't read it.</p>
        <label><span class="small">Name</span><input type="text" id="ph273n" value="${esc(S0.name)}" placeholder="Label photo"></label>
        <label><span class="small">Serving size (as printed)</span><input type="text" id="ph273sz" value="${esc(v.serv || '')}" placeholder="not read"></label>
        <table class="ph273t" id="ph273t"><tbody>${FLD.map(([k, l, u]) => `<tr data-k="${k}"><td>${l}</td><td><input inputmode="decimal" data-k="${k}" aria-label="${l}${u ? ' (' + u + ')' : ''}" value="${fm(v[k])}" placeholder="not read" class="${v[k] == null ? 'nr' : ''}"></td><td class="u">${u}</td><td class="s" id="ph273s-${k}"></td></tr>`).join('')}</tbody></table>
        <label><span class="small">Ingredients</span><textarea id="ph273i" rows="4" placeholder="not read">${esc(v.ing || '')}</textarea></label>
        <label><span class="small">Contains (allergens)</span><input type="text" id="ph273c" value="${esc(v.contains || '')}" placeholder="not read"></label>
        <div class="ph273acts"><button type="button" class="btn pri" id="ph273save">Save to My foods</button><button type="button" class="btn" id="ph273cmp">⇆ Compare</button><button type="button" class="btn ghost" id="ph273new">New photo</button></div>
        <p class="small" id="ph273msg"></p></div>
      <details class="card ph273raw"><summary>Text Lumi read from the photo</summary><p class="small">Read on this device in ${(S0.ocrMs / 1000).toFixed(1)} s${S0.rot ? `, turned ${S0.rot}°` : ''}.</p><pre>${esc(S0.text || '')}</pre></details>
      <p class="foot">Read on this device with Tesseract.js; the photo is not uploaded. Scores use the numbers above, per serving. Informational only, not medical advice.</p></section>`;
    const T = $('#ph273t'); let tm;
    const upd = () => { clearTimeout(tm); tm = setTimeout(regrade, 120); };
    T.addEventListener('input', e => { const i = e.target.closest('input[data-k]'); if (!i) return; const k = i.dataset.k, x = i.value.trim().replace(',', '.'), num = x === '' ? null : Number(x.replace(/^</, ''));
      if (x !== '' && !isFinite(num)) { i.setAttribute('aria-invalid', 'true'); return; } i.removeAttribute('aria-invalid'); S0.v[k] = num; delete S0.lt[k]; if (num != null && S0.read[k] && S0.edited) {} S0.ed = Object.assign(S0.ed || {}, { [k]: 1 }); i.classList.toggle('nr', num == null); upd(); });
    $('#ph273n').oninput = e => { S0.name = e.target.value; upd(); }; $('#ph273sz').oninput = e => { S0.v.serv = e.target.value; const m = e.target.value.match(/\(\s*(\d+(?:\.\d+)?)\s*(g|ml)\s*\)/i) || e.target.value.match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i); if (m && !(S0.ed && S0.ed.servG)) { S0.v.servG = +m[1]; const gi = T.querySelector('input[data-k=servG]'); gi.value = m[1]; gi.classList.remove('nr'); } upd(); };
    $('#ph273i').oninput = e => { S0.v.ing = e.target.value.trim(); upd(); }; $('#ph273c').oninput = e => { S0.v.contains = e.target.value.trim(); upd(); };
    $('#ph273save').onclick = () => save(false); $('#ph273cmp').onclick = () => save(true); $('#ph273new').onclick = () => { S0 = null; location.hash = '#/photo'; route(); };
    regrade(); }
  function regrade() { if (!$('#ph273card')) return; const p = product(S0), G = grade(p), v = S0.v; st.p = p; st.g = G;
    let card = ''; try { if (typeof F22 !== 'undefined' && F22.val) F22.val.delete(p.id); card = rowHTML(itemFromProduct(p)); } catch (e) { card = ''; } const cw = $('#ph273card'); cw.innerHTML = card; const a = cw.querySelector('a[href]'); if (a) { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); }
    $('#ph273sv').innerHTML = `Per serving: <b>${esc(v.serv || 'serving size not read')}</b>${v.servG ? '' : ' · weight not read'}${v.servings ? ` · about ${fm(v.servings)} servings` : ''}`;
    const miss = FLD.filter(([k]) => v[k] == null).map(([, l]) => l.toLowerCase()), cv = [];
    if (v.carbs == null) cv.push("Couldn't verify the Blood sugar score: total carbohydrate wasn't read."); else if (v.sugars == null) cv.push("Couldn't verify sugar: total sugars weren't read, so the Blood sugar score leans on total carbs only.");
    if (G.sc && G.sc.bad) cv.push("Couldn't verify the scores: these numbers don't add up (for example carbs + protein + fat are more than the serving weight). Check them against the photo.");
    if (!v.servG) cv.push("Couldn't verify the serving weight, so the numbers are scored per serving as printed.");
    if (!v.ing) cv.push("Couldn't verify the ingredients: no ingredient list was read, so hidden sugars and additives weren't checked.");
    if (!S0.nRead) cv.push("Couldn't verify any Nutrition Facts: none were read from this photo.");
    const W = G.w && G.w.list ? G.w.list : [], hid = G.w && G.w.sugars ? G.w.sugars : [];
    const wl = [...hid.map(s => `<li class="sv-caution"><b>Hidden sugar: ${esc(s)}</b><small>${/coconut/.test(s) ? 'Coconut sugar is sugar (mostly sucrose). It counts as added sugar and raises blood sugar like table sugar.' : 'A sugar under another name. It counts as added sugar.'}</small></li>`),
      ...W.filter(x => x.id !== 'sugar').map(x => `<li class="sv-${esc(x.sev)}"><b>${esc(x.label)}</b><small>${esc(x.note || '')}</small></li>`),
      ...G.sw.map(s => `<li class="sv-info"><b>Sweetener: ${esc(s.name)}</b><small>${esc(s.note)}</small></li>`),
      ...(v.contains ? [`<li class="sv-info"><b>Contains: ${esc(v.contains)}</b><small>Allergens as printed on the label.</small></li>`] : []),
      ...(/caffeine|guarana/i.test(v.ing || '') ? ['<li class="sv-info"><b>Contains caffeine</b><small>The label lists caffeine; the amount isn\'t printed.</small></li>'] : [])];
    const rs = G.sc && G.sc.items ? G.sc.items.slice(0, 4).map(i => `<li><b>${esc(i.label)}</b>${i.detail ? `<small>${esc(i.detail)}</small>` : ''}</li>`) : [];
    $('#ph273g').innerHTML = `${wl.length ? `<h3 class="small" style="margin:12px 0 0">Ingredient notes</h3><ul class="ph273w" id="ph273warn">${wl.join('')}</ul>` : ''}
      ${rs.length ? `<h3 class="small" style="margin:12px 0 0">Why this Blood sugar score</h3><ul class="ph273w">${rs.join('')}</ul>` : ''}
      ${cv.map(x => `<p class="ph273cv">⚠ ${esc(x)}</p>`).join('')}${miss.length && S0.nRead ? `<p class="ph273cv">Not read: ${esc(miss.join(', '))}.</p>` : ''}`;
    for (const [k] of FLD) { const el = $('#ph273s-' + k); if (!el) continue; const ed = S0.ed && S0.ed[k]; el.className = 's'; el.title = '';
      if (v[k] == null) { el.textContent = 'not read'; el.classList.add('nr'); } else if (ed) el.textContent = 'edited'; else if (S0.flags[k] === 'check') { el.textContent = S0.lt[k] ? '< ' + fm(v[k]) + ' · check' : 'check'; el.classList.add('ck'); el.title = S0.notes[k] || ''; } else el.textContent = 'from photo'; } }
  /* ---------- save (IndexedDB + My foods); nothing leaves the device ---------- */
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open('lumi-photo273', 1); r.onupgradeneeded = () => r.result.createObjectStore('scans', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function putScan(rec) { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('scans', 'readwrite'); t.objectStore('scans').put(rec); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close(); }
  async function scans() { const db = await idb(); const out = await new Promise((res, rej) => { const q = db.transaction('scans').objectStore('scans').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); db.close(); return out; }
  async function save(cmp) { const p = product(S0), msg = $('#ph273msg'); try { await putScan({ id: p.id, ts: Date.now(), p, text: S0.text, values: S0.v, edited: Object.keys(S0.ed || {}) }); } catch (e) {}
    store.set('custom', [p, ...customFoods().filter(x => x.id !== p.id)]); try { memo.set(p.id, p); } catch (e) {} try { pushHist('viewed', p); } catch (e) {}
    if (cmp) { const on = toggleCompare(p); if (!on) toggleCompare(p); if (msg) msg.innerHTML = `Saved on this device and added to <a href="#/compare">Compare</a>.`; }
    else if (msg) msg.innerHTML = `Saved on this device to <a href="#/myfoods">My foods</a>. <a href="#/product/${esc(p.id)}">Open the full view</a>.`; S0.saved = 1; }
  return { view, read, prep, product, grade, st, scans, get cur() { return S0; }, set cur(x) { S0 = x; }, render, FLD, worker };
})();
