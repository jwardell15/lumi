/* Lumi ↔ Dexcom backend (reference, Cloudflare Worker). NOT deployed by Lumi. Joe deploys it under his own account.
   Why it exists: Dexcom's OAuth token exchange needs client_secret (must stay server-side) and api.dexcom.com sends no CORS headers,
   so a static site can't call it directly. Docs: https://developer.dexcom.com/docs/dexcom/authentication , /docs/dexcomv3/endpoint-overview/
   Setup:
   1. Register at https://developer.dexcom.com, create an app, set Redirect URI to https://<worker>/callback . Copy client_id + client_secret.
   2. `npm create cloudflare@latest lumi-dexcom` (or the dashboard), paste this file, create a KV namespace bound as TOKENS.
   3. Secrets: wrangler secret put DEXCOM_CLIENT_ID / DEXCOM_CLIENT_SECRET. Vars: DEXCOM_ENV = "sandbox" or "production",
      APP_ORIGIN = "https://jwardell15.github.io".
   4. In Lumi › Settings › Dexcom glucose, paste https://<worker> and tap Connect. Sandbox: pick SandboxUser7 (G7) on Dexcom's page.
   Production access for real users beyond the developer's own testing may require Dexcom approval; see "Scopes & Access" in Dexcom's docs. */
export default {
  async fetch(req, env) {
    const u = new URL(req.url), base = env.DEXCOM_ENV === 'production' ? 'https://api.dexcom.com' : 'https://sandbox-api.dexcom.com';
    const cors = { 'Access-Control-Allow-Origin': env.APP_ORIGIN, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Expose-Headers': 'x-dexcom-env', 'Vary': 'Origin' };
    const sid = (req.headers.get('Cookie') || '').match(/lumi_sid=([\w-]+)/)?.[1];
    if (u.pathname === '/login') {
      const state = crypto.randomUUID(); const ret = u.searchParams.get('return') || env.APP_ORIGIN;
      if (!ret.startsWith(env.APP_ORIGIN)) return new Response('bad return', { status: 400 });
      await env.TOKENS.put('state:' + state, ret, { expirationTtl: 600 });
      const q = new URLSearchParams({ client_id: env.DEXCOM_CLIENT_ID, redirect_uri: u.origin + '/callback', response_type: 'code', scope: 'offline_access', state });
      return Response.redirect(`${base}/v3/oauth2/login?${q}`, 302);
    }
    if (u.pathname === '/callback') {
      const ret = await env.TOKENS.get('state:' + u.searchParams.get('state')); if (!ret) return new Response('expired', { status: 400 });
      const tok = await token(base, env, { grant_type: 'authorization_code', code: u.searchParams.get('code'), redirect_uri: u.origin + '/callback' });
      const id = crypto.randomUUID(); await env.TOKENS.put('sid:' + id, JSON.stringify(tok), { expirationTtl: 60 * 60 * 24 * 90 });
      return new Response(null, { status: 302, headers: { Location: ret, 'Set-Cookie': `lumi_sid=${id}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=7776000` } });
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'content-type' } });
    if (u.pathname === '/egvs') {
      if (!sid) return new Response('not connected', { status: 401, headers: cors });
      let tok = JSON.parse(await env.TOKENS.get('sid:' + sid) || 'null'); if (!tok) return new Response('not connected', { status: 401, headers: cors });
      if (Date.now() > tok.exp - 60000) { tok = await token(base, env, { grant_type: 'refresh_token', refresh_token: tok.refresh_token, redirect_uri: u.origin + '/callback' }); await env.TOKENS.put('sid:' + sid, JSON.stringify(tok), { expirationTtl: 60 * 60 * 24 * 90 }); }
      const q = new URLSearchParams({ startDate: u.searchParams.get('startDate'), endDate: u.searchParams.get('endDate') });
      const r = await fetch(`${base}/v3/users/self/egvs?${q}`, { headers: { Authorization: 'Bearer ' + tok.access_token } });
      return new Response(r.body, { status: r.status, headers: { ...cors, 'content-type': 'application/json', 'x-dexcom-env': env.DEXCOM_ENV === 'production' ? 'production' : 'sandbox' } });
    }
    return new Response('Lumi Dexcom backend', { headers: cors });
  }
};
async function token(base, env, p) {
  const r = await fetch(`${base}/v3/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...p, client_id: env.DEXCOM_CLIENT_ID, client_secret: env.DEXCOM_CLIENT_SECRET }) });
  if (!r.ok) throw new Error('token ' + r.status); const j = await r.json(); return { ...j, exp: Date.now() + j.expires_in * 1000 };
}
