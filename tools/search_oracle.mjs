// Independent oracle for search-quality checks: per-serving numbers, filter thresholds, "Best matches" ranking. Matches the app's Smart filters.
export const TH = { pro: 15, proMeal: 20, fib: 5, sat: 1 };
export function val(d) {
  const ok = d.sg > 0 && d.sb != null && d.sb >= 0 && (d.sb & 3) !== 3; if (!ok) return null; const k = d.sg / 100, m = v => v == null ? null : v * k;
  return { k, s: m(d.sugar), c: m(d.net), p: m(d.p22), f: m(d.f22), sat: m(d.s22), na: d.na272 != null && d.na272 >= 0 ? d.na272 * k : null, s100: d.s22, w: d.w22 === undefined ? null : d.w22, meal: d.src === 'rest' };
}
export const added = d => (d.w22 == null || d.w22 < 0) ? null : (d.w22 & 15);
export function passes(d, F) { // true / false
  const v = val(d);
  if (F.h != null && !(d.h != null && d.h >= F.h)) return false;
  if (F.bs != null && !(d.score != null && d.score >= F.bs)) return false;
  if (F.sug != null || F.carb != null || F.pro || F.fib || F.sat || F.na != null) { if (!v) return false; }
  if (F.na != null && !(v.na != null && v.na <= F.na)) return false;
  if (F.sug != null && !(v.s != null && v.s < F.sug)) return false;
  if (F.carb != null && !(v.c != null && v.c < F.carb)) return false;
  if (F.pro && !(v.p != null && v.p >= (v.meal ? TH.proMeal : TH.pro))) return false;
  if (F.fib && !(v.f != null && v.f >= TH.fib)) return false;
  if (F.sat && !(v.meal ? (v.s100 != null && v.s100 <= TH.sat) : (v.sat != null && v.sat <= TH.sat))) return false;
  if (F.nas && added(d) !== 0) return false;
  return true;
}
export const hay = d => `${d.name} ${d.cat || ''} ${d.brand || ''}`.toLowerCase();
const bk14 = d => d.src === 'whole' ? 'w:' + d.code : String(d.brand || d.code || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')[0] || d.code;
export function rank14(pool, key, n = 3, per = 1) { const other = key === 'score' ? 'h' : 'score', cnt = new Map(), out = [], seen = new Set();
  const L = pool.filter(d => d && d[key] != null).sort((a, b) => b[key] - a[key] || (b[other] ?? -1) - (a[other] ?? -1) || (a.rank ?? 1e9) - (b.rank ?? 1e9));
  for (const d of L) { const b = bk14(d), k = (d.name || '').toLowerCase(); if ((cnt.get(b) || 0) >= Math.min(per, 3) || seen.has(k)) continue; cnt.set(b, (cnt.get(b) || 0) + 1); seen.add(k); out.push(d); if (out.length >= n) break; }
  return out; }
export function bestMatches(items, poolFn) { const all = items.filter(i => i.src !== 'cos' && i.score != null && i.h != null && !i.fl && !i.bad); const pool = poolFn ? poolFn(items) : all.slice().sort((a, b) => (b.rel || 0) - (a.rel || 0)).slice(0, 40);
  if (pool.length < 4) return null; return { A: rank14(pool, 'score', 3, 1), B: rank14(pool, 'h', 3, 1) }; }
export function inStore(d, id) { const S = globalThis.LumiStores, i = S.STORES.findIndex(x => x[0] === id); return i >= 0 && (S.has(d.sm, i) || S.has(d.sm, S.SOLD + i)); }
const nrm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
export function evalCase(c, res, poolFn) { // res: {items, note, chips}
  const out = [], add = (n, ok, info) => out.push({ n, ok: !!ok, info: ok ? undefined : info }), items = res.items || [];
  if (c.none) { add('no results', items.length === 0, items.slice(0, 3).map(x => x.name)); return out; }
  add('has results', items.length > 0, 'empty'); if (!items.length) return out;
  const reX = c.subj ? new RegExp(c.subj, 'i') : null, re = c.subjN ? { test: s => nrm(s).includes(c.subjN) } : reX, fb = c.forb ? new RegExp(c.forb, 'i') : null, top = items.slice(0, c.n || 5);
  if (c.code) { add('barcode first', items[0].code === c.code, items[0].name); return out; }
  if (re) { const hit = top.filter(d => re.test(hay(d))).length, need = Math.min(c.min || 4, top.length); add(`subject in top ${top.length} (${hit}/${need})`, hit >= need, top.map(d => d.name).join(' | ')); }
  if (fb) { const bad = items.slice(0, 10).filter(d => fb.test(`${d.name} ${d.cat || ''}`)); add('no forbidden terms in top 10', !bad.length, bad.map(d => d.name).join(' | ')); }
  if (c.diverse) { const cs = new Set(items.slice(0, 12).map(d => d.cat)); add(`varied categories in top 12 (${cs.size}/${c.diverse})`, cs.size >= c.diverse, [...cs].join(' | ')); }
  if (c.wholeTop) add('plain USDA whole food in top 3', items.slice(0, 3).some(d => d.src === 'whole'), items.slice(0, 3).map(d => d.name).join(' | '));
  const F = c.f || {};
  if (c.nomatch) add('no-match note shown', !!res.note && /closest|no /i.test(res.note), res.note);
  else if (Object.keys(F).length) { const bad = top.filter(d => !passes(d, F)); add('filters hold per serving (top 5)', !bad.length, bad.map(d => `${d.name} [s=${val(d)?.s?.toFixed?.(1)} c=${val(d)?.c?.toFixed?.(1)} add=${added(d)}]`).join(' | ')); }
  if (c.nas) { const bad = top.filter(d => added(d) !== 0); add('no added sugar in top 5', !bad.length, bad.map(d => d.name + ' add=' + added(d)).join(' | ')); }
  if (c.store) { const n = top.filter(d => inStore(d, c.store)).length, need = Math.min(c.min || 4, top.length); add(`sold at ${c.store} in top ${top.length} (${n}/${need})`, n >= need, top.map(d => d.name + ' sm=' + d.sm).join(' | ')); }
  if (c.kind === 'whole') { const n = items.slice(0, 10).filter(d => d.src === 'whole').length; add('a whole-food (USDA) item in top 10', n >= 1, items.slice(0, 5).map(d => d.src + ':' + d.name).join(' | ')); }
  else if (c.kind) { const n = top.slice(0, 3).filter(d => c.kind === 'product' ? d.src !== 'rest' && d.src !== 'whole' : d.src === c.kind).length; add(`type ${c.kind} in top 3`, n >= 2, top.slice(0, 3).map(d => d.src + ':' + d.name).join(' | ')); }
  if (re && !c.noBest) { const b = bestMatches(items, poolFn); if (b) { const L = [...b.A, ...b.B], bad = L.filter(d => !re.test(hay(d)) || (!c.nomatch && Object.keys(F).length && !passes(d, F)) || (fb && fb.test(`${d.name} ${d.cat || ''}`)));
      add('Best matches obey subject + filters', !bad.length, bad.map(d => d.name).join(' | ')); } }
  return out;
}
