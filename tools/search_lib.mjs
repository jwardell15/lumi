// Shared headless loader for the search engine (same files the worker imports) over the real catalog tiers.
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
export const json = f => JSON.parse(read(f));
export function boot(extra = []) {
  const g = globalThis; g.self = g; g.window = g;
  g.LumiCats = require(path.join(ROOT, 'js/cats.js'));
  g.LumiStores = require(path.join(ROOT, 'js/stores.js'));
  for (const f of ['js/search.js', ...extra]) vm.runInThisContext(read(f), { filename: f });
  return g;
}
export async function loadTiers(engine, tiers) {
  const C = globalThis.LumiCats, loaded = [];
  const attach22 = (j) => { if (!j || !j.a || !j.n) return; const D = engine.docs; let st = -1; for (let i = 0; i < D.length; i++) if (D[i].code === j.c0 && D[i + j.n - 1] && D[i + j.n - 1].code === j.c1) { st = i; break; } if (st < 0) return; const a = j.a, q = v => v < 0 ? null : v / 10;
    for (let i = 0; i < j.n; i++) { const d = D[st + i]; d.p22 = q(a[i * 4]); d.f22 = q(a[i * 4 + 1]); d.s22 = q(a[i * 4 + 2]); d.w22 = a[i * 4 + 3]; }
    if (j.t && j.t.length) for (let k = 0; k < j.t.length; k += 2) { const d = D[st + j.t[k]]; if (d) d.t22 = j.t[k + 1] >>> 0; } };
  const attach26 = (j) => { if (!j || !j.u || !j.n) return; const D = engine.docs; let st = -1; for (let i = 0; i < D.length; i++) if (D[i].code === j.c0 && D[i + j.n - 1] && D[i + j.n - 1].code === j.c1) { st = i; break; } if (st < 0) return; const hm = new Map(); for (let i = 0; i < j.h.length; i += 2) hm.set(j.h[i], j.h[i + 1]);
    for (let i = 0; i < j.n; i++) { const d = D[st + i]; d.aw26u = j.u[i]; d.aw26m = hm.get(i) || 0; } };
  const attach272 = (j) => { if (!j || !j.a || !j.n) return; const D = engine.docs; let st = -1; for (let i = 0; i < D.length; i++) if (D[i].code === j.c0 && D[i + j.n - 1] && D[i + j.n - 1].code === j.c1) { st = i; break; } if (st < 0) return; for (let i = 0; i < j.n; i++) D[st + i].na272 = j.a[i]; };
  for (const t of tiers) {
    const url = /^w\d+$/.test(t) ? `data/index-w-${t.slice(1)}.json` : `data/index-${t}.json`; const d = json(url);
    if (t === 'g') (d.chains || []).forEach(([k, l]) => C.register(k, l, 'rest'));
    engine.add(d); loaded.push(t);
    if (!/^w/.test(t)) { const rd = f => { try { return json(f); } catch { return null; } }; attach22(rd(`data/f22/${t}.json`)); attach26(rd(`data/aw26/${t}.json`)); attach272(rd(`data/n272/${t}.json`)); }
  }
  return loaded;
}
