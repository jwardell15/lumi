/* Lumi ↔ Dexcom backend (Cloudflare Worker). Deployed by Joe under his own Cloudflare account; Lumi never deploys it.
   Why: Dexcom's OAuth token exchange needs client_secret, which must stay on a server, and Dexcom asks partners to keep tokens
   server-side (https://developer.dexcom.com/docs/dexcom/authentication/). api.dexcom.com also sends no CORS headers.
   Session: after Dexcom login the worker redirects back to Lumi with an opaque session id in the URL fragment
   (#/glucose/connected?sid=…). Lumi sends it as `Authorization: Bearer <sid>`; Dexcom tokens never leave the worker.
   (No third-party cookies, so it also works in iOS Safari.)
   Endpoints: GET /status · GET /login?return=<lumi url> · GET /callback (Dexcom redirect) · GET /egvs?startDate&endDate · POST /logout
   Setup: see README.md in this folder or Lumi › Settings › Connect Dexcom. */
const TTL = 60 * 60 * 24 * 365; // Dexcom refresh tokens last up to 1 year
const MAX_RANGE = 30 * 864e5;   // Dexcom limits a single EGV query to 30 days
export default {
  async fetch(req, env) {
    const u = new URL(req.url), prod = env.DEXCOM_ENV === 'production', base = prod ? 'https://api.dexcom.com' : 'https://sandbox-api.dexcom.com';
    const origin = req.headers.get('Origin') || '', allowed = (env.APP_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || ''), 'Access-Control-Expose-Headers': 'x-dexcom-env', 'Vary': 'Origin' };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json', 'x-dexcom-env': prod ? 'production' : 'sandbox', 'cache-control': 'no-store' } });
    const configured = !!(env.DEXCOM_CLIENT_ID && env.DEXCOM_CLIENT_SECRET && env.TOKENS && allowed.length);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Max-Age': '86400' } });
    const sid = ((req.headers.get('Authorization') || '').match(/^Bearer ([\w-]{16,})$/) || [])[1];
    try {
      if (u.pathname === '/' || u.pathname === '/status') {
        const connected = !!(sid && env.TOKENS && await env.TOKENS.get('sid:' + sid));
        return json({ ok: true, app: 'lumi-dexcom', env: prod ? 'production' : 'sandbox', configured, connected });
      }
      if (!configured) return json({ error: 'Backend not configured: set DEXCOM_CLIENT_ID, DEXCOM_CLIENT_SECRET, APP_ORIGIN and the TOKENS KV binding.' }, 500);
      if (u.pathname === '/login') {
        const ret = u.searchParams.get('return') || allowed[0];
        if (!allowed.some(a => ret === a || ret.startsWith(a + '/'))) return new Response('Return address is not an allowed Lumi origin (APP_ORIGIN).', { status: 400 });
        const state = crypto.randomUUID(); await env.TOKENS.put('state:' + state, ret, { expirationTtl: 600 });
        const q = new URLSearchParams({ client_id: env.DEXCOM_CLIENT_ID, redirect_uri: u.origin + '/callback', response_type: 'code', scope: 'offline_access', state });
        return Response.redirect(`${base}/v3/oauth2/login?${q}`, 302);
      }
      if (u.pathname === '/callback') {
        const state = u.searchParams.get('state') || '', ret = state && await env.TOKENS.get('state:' + state);
        if (!ret) return new Response('Login link expired. Go back to Lumi and tap Connect again.', { status: 400 });
        await env.TOKENS.delete('state:' + state);
        const back = (extra) => Response.redirect(ret + (ret.includes('?') ? '&' : '?') + extra, 302);
        if (u.searchParams.get('error')) return back('error=' + encodeURIComponent(u.searchParams.get('error')));
        const tok = await token(base, env, { grant_type: 'authorization_code', code: u.searchParams.get('code') || '', redirect_uri: u.origin + '/callback' });
        const id = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
        await env.TOKENS.put('sid:' + id, JSON.stringify(tok), { expirationTtl: TTL });
        return back('sid=' + id);
      }
      if (!sid) return json({ error: 'not connected' }, 401);
      if (u.pathname === '/logout' && req.method === 'POST') { await env.TOKENS.delete('sid:' + sid); return json({ ok: true }); }
      if (u.pathname === '/egvs') {
        let tok = JSON.parse(await env.TOKENS.get('sid:' + sid) || 'null'); if (!tok) return json({ error: 'not connected' }, 401);
        const iso = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/, s = u.searchParams.get('startDate') || '', e = u.searchParams.get('endDate') || '';
        if (!iso.test(s) || !iso.test(e) || Date.parse(e + 'Z') <= Date.parse(s + 'Z') || Date.parse(e + 'Z') - Date.parse(s + 'Z') > MAX_RANGE) return json({ error: 'startDate/endDate must be YYYY-MM-DDThh:mm:ss, at most 30 days apart' }, 400);
        const get = () => fetch(`${base}/v3/users/self/egvs?${new URLSearchParams({ startDate: s, endDate: e })}`, { headers: { Authorization: 'Bearer ' + tok.access_token } });
        const refresh = async () => { tok = await token(base, env, { grant_type: 'refresh_token', refresh_token: tok.refresh_token }); await env.TOKENS.put('sid:' + sid, JSON.stringify(tok), { expirationTtl: TTL }); };
        if (Date.now() > tok.exp - 60000) await refresh();
        let r = await get(); if (r.status === 401) { await refresh(); r = await get(); }
        if (!r.ok) return json({ error: 'Dexcom returned ' + r.status }, r.status === 401 ? 401 : 502);
        const j = await r.json(); return json({ env: prod ? 'production' : 'sandbox', records: (j.records || []).map(x => ({ systemTime: x.systemTime, displayTime: x.displayTime, value: x.value, unit: x.unit, trend: x.trend })) });
      }
      return json({ error: 'not found' }, 404);
    } catch (err) {
      if (/^token 400/.test(err.message) && sid) { await env.TOKENS.delete('sid:' + sid); return json({ error: 'Dexcom access expired or was revoked. Tap Connect Dexcom again.' }, 401); }
      return json({ error: err.message }, 502);
    }
  }
};
async function token(base, env, p) {
  const r = await fetch(`${base}/v3/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...p, client_id: env.DEXCOM_CLIENT_ID, client_secret: env.DEXCOM_CLIENT_SECRET }) });
  if (!r.ok) throw new Error('token ' + r.status); const j = await r.json(); return { access_token: j.access_token, refresh_token: j.refresh_token, exp: Date.now() + (j.expires_in || 7200) * 1000 };
}
