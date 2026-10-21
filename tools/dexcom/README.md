# Lumi Dexcom backend (Cloudflare Worker)

Lumi is a static web app. Dexcom's API needs a **client secret** for the OAuth token exchange, Dexcom asks partners to keep tokens on a server, and `api.dexcom.com` doesn't allow browser (CORS) calls. This small worker does the OAuth on your own free Cloudflare account. Lumi only ever holds an opaque session id.

You do every step below yourself, because each one creates an account or key in your name. Nobody else can do them for you, and Lumi never deploys anything.

## Steps (about 20 minutes)
1. **Dexcom developer account.** Sign up at https://developer.dexcom.com. This is separate from your G7/G6 login.
2. **Cloudflare account.** Sign up free at https://dash.cloudflare.com/sign-up and choose a workers.dev subdomain (e.g. `joe`).
3. **Node + Wrangler.** Install Node.js 18+ from https://nodejs.org, then run `npx wrangler login` and approve in the browser.
4. **Get this folder.** Run `git clone https://github.com/jwardell15/lumi && cd lumi/tools/dexcom`.
5. **Token store.** Run `npx wrangler kv namespace create TOKENS`, then paste the printed `id` into `wrangler.toml`.
6. **Deploy.** Run `npx wrangler deploy`. Note the URL it prints, e.g. `https://lumi-dexcom.joe.workers.dev`.
7. **Register the Dexcom app.** In the Dexcom portal › My Apps › New App, set the Redirect URI to `<your URL>/callback`. Copy the Client ID and Client Secret.
8. **Secrets.** Run `npx wrangler secret put DEXCOM_CLIENT_ID`, then `npx wrangler secret put DEXCOM_CLIENT_SECRET`.
9. **Sandbox test.** Leave `DEXCOM_ENV = "sandbox"`. In Lumi › Settings › Connect Dexcom, paste your URL, tap **Save and test**, then **Connect Dexcom**. Pick a sandbox user (e.g. SandboxUser7) on Dexcom's page. Lumi labels this data "sandbox (simulated)".
10. **Go live.** Set `DEXCOM_ENV = "production"`, run `npx wrangler deploy` again, then tap Connect in Lumi and sign in with your own Dexcom account.

## Notes
- Dexcom delays data by about 1 hour in the US (3 hours elsewhere). For older data, Clarity CSV import still works with no backend.
- Dexcom may require app approval before people other than the developer can use production access. See "Scopes & Access" in Dexcom's docs.
- To revoke access, use dexcom.com › Permissions, or **Disconnect** in Lumi (this deletes the session on your worker).
- Endpoints: `GET /status`, `GET /login?return=`, `GET /callback`, `GET /egvs?startDate=&endDate=` (at most 30 days; `Authorization: Bearer <sid>`), `POST /logout`.
