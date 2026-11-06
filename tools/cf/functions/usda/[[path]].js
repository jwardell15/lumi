// Lumi 24.0: USDA FoodData Central proxy (Cloudflare Pages Function on the lumi-data project).
// Adds Lumi's own api.data.gov key server-side (encrypted secret USDA_API_KEY) so it never ships in client JS.
// Only the two endpoints Lumi uses are allowed: /usda/search?query=&pageSize=&dataType= and /usda/food/<fdcId>.
const UP = 'https://api.nal.usda.gov/fdc/v1/';
const ORIGINS = /^(https:\/\/jwardell15\.github\.io|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?)$/;
const TYPES = new Set(['Branded', 'Foundation', 'SR Legacy', 'Survey (FNDDS)']);
function cors(req) { const o = req.headers.get('Origin') || ''; return { 'Access-Control-Allow-Origin': ORIGINS.test(o) ? o : 'https://jwardell15.github.io', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'X-Content-Type-Options': 'nosniff' }; }
const bad = (req, msg, st = 400) => new Response(JSON.stringify({ error: msg }), { status: st, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
export async function onRequest(ctx) {
  const { request: req, env, params } = ctx;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(req), 'Access-Control-Max-Age': '86400' } });
  if (req.method !== 'GET') return bad(req, 'GET only', 405);
  if (!env.USDA_API_KEY) return bad(req, 'proxy not configured', 503);
  const seg = [].concat(params.path || []), u = new URL(req.url); let target, ttl;
  if (seg.length === 1 && seg[0] === 'search') {
    const q = (u.searchParams.get('query') || '').trim(), ps = +(u.searchParams.get('pageSize') || 40), dt = (u.searchParams.get('dataType') || 'Branded,Foundation,SR Legacy').split(',').map(s => s.trim()).filter(Boolean);
    if (!q || q.length > 120 || /[\u0000-\u001f]/.test(q)) return bad(req, 'bad query');
    if (!Number.isInteger(ps) || ps < 1 || ps > 50) return bad(req, 'bad pageSize');
    if (!dt.length || dt.some(t => !TYPES.has(t))) return bad(req, 'bad dataType');
    target = `${UP}foods/search?query=${encodeURIComponent(q)}&pageSize=${ps}&dataType=${encodeURIComponent(dt.join(','))}`; ttl = 86400;
  } else if (seg.length === 2 && seg[0] === 'food' && /^\d{1,10}$/.test(seg[1])) { target = `${UP}food/${seg[1]}`; ttl = 7 * 86400; }
  else return bad(req, 'not found', 404);
  const cache = caches.default, key = new Request('https://usda-cache.lumi/' + target.slice(UP.length));
  let hit = await cache.match(key);
  if (!hit) {
    const r = await fetch(target + (target.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(env.USDA_API_KEY), { headers: { Accept: 'application/json' }, cf: { cacheTtl: 0 } });
    if (!r.ok) return bad(req, 'upstream ' + r.status, r.status === 404 ? 404 : 502);
    hit = new Response(r.body, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` } });
    ctx.waitUntil(cache.put(key, hit.clone()));
  }
  const h = new Headers(hit.headers); Object.entries(cors(req)).forEach(([k, v]) => h.set(k, v)); h.set('Cache-Control', `public, max-age=${Math.min(ttl, 86400)}`); h.set('X-Lumi-Proxy', '1');
  return new Response(hit.body, { status: 200, headers: h });
}
