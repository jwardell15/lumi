#!/usr/bin/env node
// Lumi search-quality harness. usage: node tools/search_eval.mjs [--legacy] [--all] [--out file.json] [--only substr] [--fails N] [--golden file]
// Loads the real catalog tiers headless (same engine files as the worker), runs every query in tests27/search_golden.json the way the app does
// (3 passes: 160 best, 30 restaurant, 30 whole foods; then the q271 parser/filters when js/q271.js exists), and prints a pass/fail scorecard by category and phrase type.
import fs from 'fs'; import { boot, loadTiers, read, json } from './search_lib.mjs'; import { evalCase } from './search_oracle.mjs';
const A = process.argv.slice(2), has = f => A.includes(f), arg = f => { const i = A.indexOf(f); return i >= 0 ? A[i + 1] : null; };
const g = boot(); const hasQ = fs.existsSync(new URL('../js/q271.js', import.meta.url)) && !has('--legacy');
if (hasQ) { const { default: vm } = await import('vm'); vm.runInThisContext(read('js/q271.js'), { filename: 'js/q271.js' }); }
const engine = new g.LumiSearch.Engine(); const tiers = has('--all') ? ['0', 'g', '1', ...Array.from({ length: 9 }, (_, i) => String(i + 2))] : ['0', 'g', '1'];
const t0 = Date.now(); await loadTiers(engine, tiers); const tload = Date.now() - t0;
const SPECS = [{ limit: 160 }, { limit: 30, src: 'rest' }, { limit: 30, src: 'whole' }];
export function legacyRun(q) { const seen = new Set(), items = []; for (const sp of SPECS) for (const d of engine.search(q, { limit: sp.limit, filter: sp.src ? (x => x.src === sp.src) : undefined })) if (!seen.has(d.code)) { seen.add(d.code); items.push(d); }
  items.sort((a, b) => b.rel - a.rel); return { items, note: null, chips: [] }; }
const BARCODE = /^\d{8,14}$/; // the app opens the product page for a typed barcode
const lookup = q => { const d = engine.byCode ? engine.byCode(q) : engine.docs.find(x => x.code === q); return { items: d ? [d] : [], note: null, chips: [] }; };
const run = q => BARCODE.test(q.trim()) ? lookup(q.trim()) : hasQ ? g.Q271.run(engine, q, { specs: SPECS }) : legacyRun(q);
const golden = json(arg('--golden') || 'tests27/search_golden.json'), cases = golden.cases.filter(c => !arg('--only') || c.q.includes(arg('--only')));
const by = { cat: {}, type: {} }, fails = [], rows = []; let tq = 0, worst = 0;
for (const c of cases) {
  const t = performance.now(); let res; try { res = run(c.q); } catch (e) { res = { items: [], err: String(e) }; } const dt = performance.now() - t; tq += dt; worst = Math.max(worst, dt);
  const ch = evalCase(c, res, hasQ ? (items => { const P = g.Q271.parse(c.q); P.nomatch = res.meta && res.meta.nomatch; return g.Q271.bestPool(items, P, engine); }) : null), ok = ch.every(x => x.ok);
  for (const [k, v] of [['cat', c.cat], ['type', c.type]]) { const b = by[k][v] || (by[k][v] = { n: 0, pass: 0 }); b.n++; if (ok) b.pass++; }
  rows.push({ q: c.q, cat: c.cat, type: c.type, ok, fails: ch.filter(x => !x.ok), top: (res.items || []).slice(0, 3).map(d => d.name), note: res.note || null, chips: res.chips || [] });
  if (!ok) fails.push(rows[rows.length - 1]);
}
const pct = b => (100 * b.pass / b.n).toFixed(1).padStart(5) + '%', tot = { n: cases.length, pass: cases.length - fails.length };
const show = (title, o) => { console.log(`\n== ${title}`); for (const [k, b] of Object.entries(o).sort((x, y) => y[1].n - x[1].n)) console.log(`${k.padEnd(22)} ${String(b.pass).padStart(4)}/${String(b.n).padEnd(4)} ${pct(b)}`); };
console.log(`mode: ${hasQ ? 'q271 (new)' : 'legacy (current live code)'} · tiers ${tiers.join(',')} · load ${tload} ms · ${cases.length} queries · avg ${(tq / cases.length).toFixed(1)} ms, worst ${worst.toFixed(0)} ms`);
show('by category', by.cat); show('by phrase type', by.type); console.log(`\nOVERALL ${tot.pass}/${tot.n} ${pct(tot)}`);
const N = +(arg('--fails') || 15); console.log(`\n== ${Math.min(N, fails.length)} of ${fails.length} failures`);
fails.slice(0, N).forEach(f => console.log(`- [${f.cat}/${f.type}] "${f.q}": ${f.fails.map(x => x.n + ' :: ' + String(x.info).slice(0, 160)).join(' ;; ')}`));
if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify({ mode: hasQ ? 'q271' : 'legacy', tiers, load_ms: tload, avg_ms: tq / cases.length, worst_ms: worst, total: tot, by_category: by.cat, by_type: by.type, rows }, null, 1));
process.exit(0);
