// Unit test of the worker's flow with a MOCKED Dexcom (fixture values are test-only, never shown in Lumi).
import W from '../worker.js';
const kv=new Map(); const TOKENS={get:async k=>kv.get(k)??null,put:async(k,v)=>kv.set(k,v),delete:async k=>kv.delete(k)};
const env={DEXCOM_ENV:'sandbox',APP_ORIGIN:'https://jwardell15.github.io',DEXCOM_CLIENT_ID:'cid',DEXCOM_CLIENT_SECRET:'sec',TOKENS};
let calls=[]; let egvStatus=200;
globalThis.fetch=async(url,o={})=>{calls.push(String(url)); if(String(url).includes('/oauth2/token')){const b=new URLSearchParams(o.body); if(b.get('client_secret')!=='sec')return new Response('',{status:401}); return new Response(JSON.stringify({access_token:'A'+Math.random(),refresh_token:'R',expires_in:7200}))}
 if(String(url).includes('/egvs')){ if(egvStatus===401){egvStatus=200;return new Response('',{status:401})} return new Response(JSON.stringify({records:[{systemTime:'2026-10-20T10:00:00',displayTime:'x',value:111,unit:'mg/dL',trend:'flat'}]}))}};
const R=(p,h={},m='GET')=>W.fetch(new Request('https://w.example'+p,{method:m,headers:h,redirect:'manual'}),env);
const ok=(c,m)=>{console.log(c?'PASS':'FAIL',m); if(!c)process.exitCode=1};
let r=await R('/status',{Origin:'https://jwardell15.github.io'}); let j=await r.json(); ok(j.ok&&j.env==='sandbox'&&j.configured&&!j.connected,'status'); ok(r.headers.get('access-control-allow-origin')==='https://jwardell15.github.io','cors origin');
r=await R('/login?return='+encodeURIComponent('https://evil.example/#/x')); ok(r.status===400,'rejects foreign return');
r=await R('/login?return='+encodeURIComponent('https://jwardell15.github.io/lumi/#/glucose/connected')); const loc=r.headers.get('location'); ok(r.status===302&&loc.startsWith('https://sandbox-api.dexcom.com/v3/oauth2/login?'),'login redirect '+loc.slice(0,60));
const state=new URL(loc).searchParams.get('state'); r=await R('/callback?code=abc&state='+state); const back=r.headers.get('location'); ok(/#\/glucose\/connected\?sid=[0-9a-f]{64}$/.test(back),'callback -> '+back.slice(0,70));
const sid=back.split('sid=')[1]; r=await R('/callback?code=abc&state='+state); ok(r.status===400,'state single-use');
r=await R('/egvs?startDate=2026-10-18T00:00:00&endDate=2026-10-20T00:00:00'); ok(r.status===401,'egvs needs sid');
const A={Authorization:'Bearer '+sid}; r=await R('/egvs?startDate=2026-10-18T00:00:00&endDate=2026-10-20T00:00:00',A); j=await r.json(); ok(r.status===200&&j.records.length===1&&r.headers.get('x-dexcom-env')==='sandbox','egvs ok, env header');
r=await R('/egvs?startDate=2026-08-01T00:00:00&endDate=2026-10-20T00:00:00',A); ok(r.status===400,'range >30d rejected');
egvStatus=401; r=await R('/egvs?startDate=2026-10-18T00:00:00&endDate=2026-10-20T00:00:00',A); ok(r.status===200,'401 -> refresh -> retry');
r=await R('/status',A); j=await r.json(); ok(j.connected,'status connected');
r=await R('/logout',A,'POST'); r=await R('/status',A); j=await r.json(); ok(!j.connected,'logout');
r=await W.fetch(new Request('https://w.example/egvs'),{...env,DEXCOM_CLIENT_SECRET:''}); ok(r.status===500,'unconfigured message');
ok(!calls.some(c=>c.includes('api.dexcom.com/')&&!c.includes('sandbox')),'sandbox only');
