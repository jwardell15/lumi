/* Lumi 27.3: Nutrition Facts + ingredient parser for photo text (OCR). Pure: browser (LumiLabel273) and Node (tests).
   Reads per-serving values from US-style labels (single column, dual column, side-by-side), the serving size, servings per container,
   the ingredient list and "Contains:" allergens. Robust to common OCR noise: O/o for 0, l/I/| for 1, S for 5, "g" read as "9",
   "<5mg", merged lines, two-column photos. A value it can't read stays null ("not read"); a value it had to interpret is flagged "check". */
(function (root) {
  'use strict';
  const F = ['servG', 'servings', 'kcal', 'fat', 'sat', 'trans', 'chol', 'sodium', 'carbs', 'fiber', 'sugars', 'added', 'protein'];
  const UNIT = { fat: 'g', sat: 'g', trans: 'g', chol: 'mg', sodium: 'mg', carbs: 'g', fiber: 'g', sugars: 'g', added: 'g', protein: 'g' };
  const DV = { fat: 78, sat: 20, chol: 300, sodium: 2300, carbs: 275, fiber: 28, added: 50, protein: 50 };
  const MAX = { fat: 100, sat: 60, trans: 20, chol: 1500, sodium: 8000, carbs: 200, fiber: 80, sugars: 150, added: 150, protein: 120, kcal: 2500 };
  /* label words, tolerant of OCR letter swaps (1/l/I, 0/o, rn/m) */
  const L = {
    fat: /\bt[o0]ta[l1i|]\s*fa[t+](?![a-z])/, sat: /\bsat(?:urated|[a-z]{3,7}|\.)?\s*fa[t+](?![a-z])|\bsaturates(?![a-z])/, trans: /\btrans\s*fa[t+](?![a-z])/, chol: /\bch[o0][l1i]est[a-z]*\.?/,
    sodium: /\bs[o0]d[i1l|]u(?:m|rn)(?![a-z])/, carbs: /\bt[o0]ta[l1i|]\s*carb[a-z]*\.?|\bcarb[o0]hydrates?(?![a-z])/, fiber: /\b(?:d[i1l]etary\s*)?f[i1l]b(?:er|re)(?![a-z])/,
    sugars: /\bt[o0]ta[l1i|]\s*sugars?(?![a-z])|\bsugars?(?![a-z])/, added: /\badded\s*sugars?(?![a-z])/, protein: /\bp?r[o0]te[i1l|]n(?![a-z])/, fatAlone: /\bfa[t+](?![a-z])/ };
  const ANY = /\b(t[o0]ta[l1i|]\s*fa[t+]|sat(?:urated|\.)?\s*fa[t+]|saturates|trans\s*fa[t+]|p[o0]ly[a-z]*\s*fa[t+]|m[o0]n[o0][a-z]*\s*fa[t+]|ch[o0][l1i]est[a-z]*|s[o0]d[i1l|]u(?:m|rn)|t[o0]ta[l1i|]\s*carb[a-z]*|carb[o0]hydrates?|d[i1l]etary\s*f[i1l]b[a-z]*|f[i1l]b(?:er|re)|s[o0]luble\s*f[a-z]*|t[o0]ta[l1i|]\s*sugars?|sugars?|incl[a-z]*|added\s*sugars?|sugar\s*alc[a-z]*|pr[o0]te[i1l|]n|v[i1l]tam[i1l]n\s*\w|calc[i1l]um|[i1l]r[o0]n|p[o0]tass[i1l]um|calories|energy)(?![a-z])/g;
  /* digits: fix letters that OCR puts inside numbers, only next to digits or units */
  function fixNum(s) {
    return s.replace(/(\d)[sS](?=\s*mg(?![a-z]))/g, '$1').replace(/(?<=\d)[oO](?=\s*(?:m?g|%|mcg)\b)/g, '0').replace(/(?<![a-z])[oO](?=\s*(?:m?g|mcg)\b)/g, '0').replace(/(?<![a-z])[oO](?=[.,]\d)/g, '0')
      .replace(/(?<![a-z])[lI|](?=\d*\s*(?:m?g|%)\b)/g, '1').replace(/(?<=\d)[lI|](?=\d*\s*(?:m?g|%)\b)/g, '1').replace(/(?<![a-z])[sS](?=\s*m?g\b)/g, '5')
      .replace(/(?<![\d.a-z])[0oO][sS5]\s*[g9y](?![a-z\d])/g, '0.5g').replace(/(?<![\d.])0([1-9])[g9](?![a-z\d])/g, '0.$1g').replace(/(?<![\d.])0([1-9])[0o](?=\s+\d{1,2}\s*%)/g, '0.$1g').replace(/(?<![\d.])0([1-9])(?=\s*g(?![a-z]))/g, '0.$1')
      .replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2').replace(/(\d)\s+\.\s*(\d)/g, '$1.$2')
      .replace(/(\d)\s*rng\b/g, '$1mg').replace(/(\d)\s*mq\b/g, '$1mg').replace(/(\d)\s*[gq](?=\s*(?:\d{1,3}\s*%|$|\s))/g, '$1g');
  }
  function clean(raw) { return fixNum(String(raw || '').replace(/(fat|sterol|sodium|drates?|fib(?:er|re)|sugars?|protein|calories)(?=[0-9oOlIsS|]{1,4}\s*(?:m?g|9|y)?(?![a-z]))/gi, '$1 ').replace(/\r/g, '').replace(/(\d)\s*[¢€]/g, '$1g').replace(/[‘’`]/g, "'").replace(/[—–]/g, '-').replace(/[ \t]+/g, ' ').replace(/\u00a0/g, ' ')); }
  const NUMRE = /(<|less than)?\s*(\d{1,4}(?:\.\d{1,2})?)\s*(mcg|mg|kcal|kj|ml|g|9|%)?/gi;
  function amounts(s) { const out = []; let m; NUMRE.lastIndex = 0; while ((m = NUMRE.exec(s))) out.push({ lt: !!m[1], v: +m[2], raw: m[2], u: (m[3] || '').toLowerCase(), i: m.index }); return out; }
  /* text after a label up to the next label on that line; if no number there, the start of the next line */
  function segAfter(lines, li, end) { const ln = lines[li].toLowerCase(); let s = lines[li].slice(end); ANY.lastIndex = 0; const lo = ln.slice(end); const m = ANY.exec(lo); if (m && m.index > 0) s = s.slice(0, m.index);
    if (!/\d/.test(s) && lines[li + 1] != null) { const nx = lines[li + 1], nl = nx.toLowerCase(); ANY.lastIndex = 0; const m2 = ANY.exec(nl); const t = m2 ? nx.slice(0, m2.index) : nx; if (/\d/.test(t)) s += ' ' + t; }
    return s; }
  const ANYc = s => { ANY.lastIndex = 0; return ANY.test(String(s).toLowerCase()); };
  function parse(raw) {
    const t = clean(raw), lines = t.split('\n').map(x => x.trim()), low = lines.map(x => x.toLowerCase());
    const v = {}, flags = {}, notes = {}, lt = {}; F.forEach(k => v[k] = null); v.serv = ''; v.ing = ''; v.contains = ''; v.liquid = false;
    const flag = (k, msg) => { flags[k] = 'check'; if (msg) notes[k] = msg; };
    const hasNF = /nutrition\s*fa\w*|amount\s*per\s*serving|serving\s*size|calories/i.test(t) || low.some(x => (x.match(ANY) || []).length >= 1 && /\d\s*m?g\b/.test(x));
    /* nutrients */
    /* first occurrence of the label that has an amount after it (an ingredient line saying "sugar" has none) */
    const find = (k, re, skip) => { for (const src of re.source.split('|').length > 1 && k === 'sugars' ? [/\bt[o0]ta[l1i|]\s*sugars?\b/, re] : [re]) for (let li = 0; li < low.length; li++) { const r = new RegExp(src.source, 'g'); let m; while ((m = r.exec(low[li]))) { const pre = low[li].slice(Math.max(0, m.index - 16), m.index); if (skip && skip(pre, low[li].slice(m.index + m[0].length, m.index + m[0].length + 16))) continue; if (k === 'sugars' && /added/.test(pre)) continue; const e = m.index + m[0].length; if (amounts(segAfter(lines, li, e)).some(a => a.u !== '%')) return [li, e]; } } return null; };
    const pick = (k, A) => { const want = UNIT[k], am = A.filter(a => a.u !== '%'), pc = A.filter(a => a.u === '%'); let a = am[0]; if (!a) return null; let val = a.v, unit = a.u; const dv = DV[k], pct = pc[0];
      const fits = x => pct && dv ? Math.abs(x / dv * 100 - pct.v) <= Math.max(1.5, pct.v * 0.35) : null;
      if (unit === '9' || (!unit && want === 'g' && /9$/.test(a.raw) && a.raw.length > 1)) { const s9 = +a.raw.slice(0, -1) || (a.raw === '9' ? null : 0);
        if (unit === '9' && a.raw.length >= 1 && !(a.raw.length > 1 && fits(s9))) { unit = 'g'; }
        else if (a.raw.length > 1 && (fits(s9) || (!fits(val) && val > (MAX[k] || 999) * 0.6))) { val = s9; unit = 'g'; flag(k, `Read “${a.raw}”, used ${s9} g (OCR often reads “g” as “9”). Check it.`); }
        else { unit = 'g'; if (fits(val) === false || pct == null) flag(k, `Read “${a.raw}${a.u}” with no clear unit. Check it.`); } }
      if (want === 'mg' && unit === 'g') { if (k === 'sodium' && val < 10) val = val * 1000; }
      if (want === 'g' && unit === 'mg') val = val / 1000;
      if (a.lt) { lt[k] = 1; flag(k, `The label says “less than ${a.v} ${want}”; Lumi uses ${a.v} ${want}.`); }
      if (val > (MAX[k] || 1e9)) { flag(k, `“${a.raw}” looks too high for one serving. Check it.`); }
      if (fits(val) === false && dv && k !== 'protein' && !flags[k]) flag(k, `The ${pct.v}% Daily Value doesn't match ${val} ${want}. Check it.`);
      return Math.round(val * 100) / 100; };
    const SK = {
      fat: pre => /(sat\w*|trans|poly\w*|mono\w*|unsat\w*|from|of which)\.?\s*$/.test(pre), sat: null, trans: null, chol: null, sodium: null,
      carbs: pre => /net\s*$/.test(pre), fiber: (pre) => /(soluble|insoluble)\s*$/.test(pre), sugars: (pre, post) => /(added|incl\w*\.?\s*[<\d.]*\s*[g9]?|alcohols?)\s*$/.test(pre) || /^\s*alc/.test(post), added: null, protein: null };
    for (const k of ['fat', 'sat', 'trans', 'chol', 'sodium', 'carbs', 'fiber', 'sugars', 'added', 'protein']) {
      if (k === 'added') { const m = t.match(/[i1l]ncl\w*\.?\s*(<|less than)?\s*(\d{1,3}(?:\.\d)?)\s*(g|9)?\s*(?:of\s*)?added\s*sugars?/i);
        if (m) { let x = +m[2]; if (!m[3] && /9$/.test(m[2]) && m[2].length > 1) { x = +m[2].slice(0, -1); flag('added', `Read “${m[2]}”, used ${x} g. Check it.`); } v.added = x; if (m[1]) flag('added', 'The label says “less than”. Check it.'); continue; } }
      let at = find(k, L[k], SK[k]); if (!at && k === 'fat') at = find(k, L.fatAlone, SK.fat); if (k === 'sugars' && at && /added/.test(low[at[0]].slice(Math.max(0, at[1] - 14), at[1]))) at = null;
      if (!at) continue; const A = amounts(segAfter(lines, at[0], at[1])); const val = pick(k, A); if (val != null) v[k] = val; }
    /* calories: "Calories 140", "Calories\n140" or a big number at the end of the line; not "calories from fat" or "2,000 calories a day" */
    { let got = null; for (let i = 0; i < low.length && got == null; i++) { const m = low[i].match(/\bca[l1i]o?r[a-z.,]{1,4}(?![a-z])(?!\s*from)/); if (!m || /a day|diet|daily|2000|2,000|per gram/.test(low[i])) continue;
        const A = amounts(low[i].slice(m.index + m[0].length)).filter(a => a.u === '' || a.u === 'kcal'); if (A.length) got = A[0].v; else if (low[i + 1] != null) { const B = amounts(low[i + 1]).filter(a => a.u === '' || a.u === 'kcal'); if (B.length && !/[a-z]{4}/.test(low[i + 1].replace(/\d/g, ''))) got = B[0].v; } }
      if (got == null) { const k = t.match(/(\d{1,4})\s*kcal/i); if (k) got = +k[1]; } if (got != null && got <= MAX.kcal) v.kcal = got; }
    /* serving size and servings per container */
    { let li = low.findIndex(l => /serv[i1l]ng\s*s[i1l]ze|serv\.?\s*size/.test(l)); if (li < 0) { li = low.findIndex(l => /\bserv/.test(l) && !/per\s*(container|package)/.test(l) && /\(\s*\d{1,4}(?:\.\d)?\s*(?:g|ml)\s*\)/.test(l)); if (li >= 0) { lines[li] = lines[li].replace(/^.*?\bserv\S*\s*\S{0,6}\s+(?=\d)/i, 'Serving size '); low[li] = lines[li].toLowerCase(); } }
      if (li >= 0) { let s = lines[li].replace(/^.*?serv(?:[i1l]ng)?\.?\s*s[i1l]ze\s*[:\-]?\s*/i, ''); if (!/\d/.test(s) || /\(\s*$/.test(s) || (!/\)/.test(s) && /^\s*\(/.test(lines[li + 1] || ''))) s += ' ' + (lines[li + 1] || '');
        if (!/\d/.test(s)) { /* two-column photos: the amount can land a few lines away; take the nearest "... (39g)" line */ for (let d = 1; d <= 5 && !/\d/.test(s); d++) for (const j of [li + d, li - d]) { const x = lines[j]; if (x && /\(\s*\d{1,4}(?:\.\d)?\s*(?:g|9|ml)\s*\)/i.test(x) && !ANYc(x)) { s = x; flag('servG', 'The serving size was read from a nearby line. Check it.'); break; } } }
        s = s.replace(/\s+/g, ' ').replace(/\s*\b(calories|amount per|servings? per|per serving|total fat)\b.*$/i, '').trim().slice(0, 50);
        let g = s.match(/\(\s*(?:about\s*)?(\d+(?:\.\d+)?)\s*(g|ml)\s*\)/i) || s.match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
        if (g) { v.servG = +g[1]; v.liquid = /ml/i.test(g[2]); } else if ((g = s.match(/\(\s*(\d+)9\s*\)/))) { v.servG = +g[1]; s = s.replace(/\((\d+)9\)/, '($1g)'); flag('servG', `Read “${g[1]}9”, used ${g[1]} g. Check it.`); }
        v.serv = s; }
      const sp = t.match(/(?:about|approx\.?|approximately)?\s*(\d{1,3}(?:\.\d)?)\s*s\S{2,8}\s*per\s*(?:container|package|pack|bag|box|jar|can|bottle)/i) || t.match(/serv[i1l]ngs?\s*per\s*(?:container|package|pack|bag|box|jar|can|bottle)\s*[:\-]?\s*(?:about|approx\.?)?\s*(\d{1,3}(?:\.\d)?)/i);
      if (sp) v.servings = +sp[1]; }
    /* ingredients: from "Ingredients:" line by line; each line is cut where Nutrition Facts text starts (two-column photos interleave them);
       stops at Contains / allergen / company lines, or a blank line once the list has ended with a period */
    { const i0 = low.findIndex(l => /[i1l]ngred[i1l]ents?\s*[:;]/.test(l));
      if (i0 >= 0) { const STOP = /\b(contains|allergen|may contain|distributed|manufactured|made in|produced in|keep refrigerated|store in|best by|net wt)\b/i, CUT = /(\bnutrition\s*fa\w*|amount\s*per|%\s*da[i1l]ly|daily\s*value|serv[i1l]ng\s*s[i1l]ze|serv[a-z]*\s*per|about\s*\d+\s*serv)/i;
        let acc = '';
        for (let i = i0; i < lines.length && i < i0 + 25; i++) { let s = i === i0 ? lines[i].replace(/^.*?[i1l]ngred[i1l]ents?\s*[:;]\s*/i, '') : lines[i];
          const st = s.search(STOP); let end = false; if (st >= 0) { s = s.slice(0, st); end = true; }
          const lo = s.toLowerCase(); let ai = 1e9; { const R = new RegExp(ANY.source, 'g'); let a; while ((a = R.exec(lo))) { const nx = lo.slice(a.index + a[0].length, a.index + a[0].length + 14); if (/^[^,;]*?[<\d]/.test(nx)) { ai = a.index; break; } } } const b = CUT.exec(s); const cut = Math.min(ai, b ? b.index : 1e9); if (cut < 1e9) s = s.slice(0, cut);
          s = s.trim(); if (!s) { if (!lines[i].trim() && /\.\s*$/.test(acc)) break; if (end) break; continue; }
          acc += (acc && !/-$/.test(acc) ? ' ' : '') + s; if (end) break; }
        acc = acc.replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, ''); if (acc.replace(/[^a-z]/gi, '').length >= 3) v.ing = acc; } }
    { const m = t.match(/\bcontains\s*[:;]\s*([^\n.]{2,80})/i) || t.match(/\ballergens?\s*[:;]\s*([^\n.]{2,80})/i); if (m) v.contains = m[1].replace(/\s+/g, ' ').trim().replace(/[.,;\s]+$/, ''); }
    /* "5g" read as "59g": when a gram value ending in 9 breaks the label's own arithmetic and dropping the 9 fixes it, use that and flag it */
    const no9 = x => { const s = String(x); return /^\d+9$/.test(s) ? +s.slice(0, -1) : null; };
    const fix9 = (k, bad, ok) => { const s = no9(v[k]); if (v[k] != null && s != null && bad(v[k]) && ok(s)) { flag(k, `Read “${v[k]}g”, used ${s} g (the photo's “g” likely doubled as a 9). Check it.`); v[k] = s; } };
    if (v.carbs != null) { fix9('sugars', x => x > v.carbs + 0.5, s => s <= v.carbs + 0.5); fix9('fiber', x => x > v.carbs + 0.5, s => s <= v.carbs + 0.5); }
    if (v.sugars != null) fix9('added', x => x > v.sugars + 0.5, s => s <= v.sugars + 0.5);
    if (v.fat != null) fix9('sat', x => x > v.fat + 0.01, s => s <= v.fat + 0.01);
    if (v.servG) for (const k of ['carbs', 'protein', 'fat']) fix9(k, x => x > v.servG, s => s <= v.servG);
    if (v.kcal != null && v.carbs != null && v.protein != null && v.fat != null) { const e = (c, p, f) => Math.abs(4 * c + 4 * p + 9 * f - v.kcal); for (const k of ['carbs', 'protein', 'fat']) { const s = no9(v[k]); if (s == null) continue; const o = { carbs: v.carbs, protein: v.protein, fat: v.fat }, o2 = Object.assign({}, o, { [k]: s }); if (e(o.carbs, o.protein, o.fat) > Math.max(30, v.kcal * 0.3) && e(o2.carbs, o2.protein, o2.fat) <= Math.max(30, v.kcal * 0.3)) { flag(k, `Read “${v[k]}g”, used ${s} g so calories add up. Check it.`); v[k] = s; } } }
    /* sanity checks: flag, never correct silently */
    const chk = (c, ks, msg) => { if (c) ks.forEach(k => { if (!flags[k]) flag(k, msg); }); };
    chk(v.sat != null && v.fat != null && v.sat > v.fat + 0.01, ['sat'], 'Saturated fat is higher than total fat. Check both.');
    chk(v.sugars != null && v.carbs != null && v.sugars > v.carbs + 0.5, ['sugars', 'carbs'], 'Sugars are higher than total carbs. Check both.');
    chk(v.fiber != null && v.carbs != null && v.fiber > v.carbs + 0.5, ['fiber'], 'Fiber is higher than total carbs. Check it.');
    chk(v.added != null && v.sugars != null && v.added > v.sugars + 0.5, ['added'], 'Added sugars are higher than total sugars. Check both.');
    if (v.kcal != null && v.carbs != null && v.protein != null && v.fat != null) { const e1 = 4 * v.carbs + 4 * v.protein + 9 * v.fat; if (Math.abs(e1 - v.kcal) > Math.max(30, v.kcal * 0.3)) chk(true, ['kcal'], `Calories don't match carbs, protein and fat (about ${Math.round(e1)} expected). Check the numbers.`); }
    if (v.servG != null && (v.carbs || 0) + (v.protein || 0) + (v.fat || 0) > v.servG * 1.05 + 1) chk(true, ['servG'], 'The serving weight is smaller than carbs + protein + fat. Check it.');
    const nRead = F.filter(k => v[k] != null).length;
    return { v, flags, notes, lt, nRead, hasNF: hasNF && nRead > 0, hasIng: !!v.ing, text: t };
  }
  /* a 0-100 quality guess for picking the best of several OCR passes (rotations) */
  function quality(r) { return r.nRead * 6 + (r.v.ing ? 12 : 0) + (r.v.serv ? 4 : 0) - Object.keys(r.flags).length * 2; }
  const api = { parse, clean, quality, FIELDS: F, UNIT, DV };
  root.LumiLabel273 = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
