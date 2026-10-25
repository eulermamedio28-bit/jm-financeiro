import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
const port=18000+Math.floor(Math.random()*20000);
const base='http://127.0.0.1:'+port;
const external='https://jm-financeiro-agent-gateway-test.onrender.com';
const signing='s'.repeat(64),password='p'.repeat(48),read='r'.repeat(64);
const child=spawn(process.execPath,['agent-gateway/server.js'],{env:{...process.env,PORT:String(port),JM_GATEWAY_READ_TOKEN:read,JM_OAUTH_SIGNING_SECRET:signing,JM_OAUTH_LOGIN_SECRET:password},stdio:'ignore'});
async function request(path,opts={}){return fetch(base+path,{redirect:'manual',...opts});}
async function ready(){for(let i=0;i<100;i++){try{const r=await request('/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('Gateway did not start');}
test('MCP OAuth discovery, PKCE and read-only tools',async t=>{
 await ready();t.after(()=>child.kill());
 const meta=await request('/.well-known/oauth-authorization-server');assert.equal(meta.status,200);
 const info=await meta.json();assert.equal(info.issuer,external);
 const resource=await request('/.well-known/oauth-protected-resource');assert.equal(resource.status,200);
 const unauth=await request('/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});assert.equal(unauth.status,401);
 assert.match(unauth.headers.get('www-authenticate')||'',/resource_metadata/);
 const redirect='https://chatgpt.com/connector/oauth/test';
 const reg=await request('/oauth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({redirect_uris:[redirect]})});assert.equal(reg.status,201);
 const client=await reg.json();assert.ok(client.client_id);
 const verifier='v'.repeat(64),challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
 const p=new URLSearchParams({client_id:client.client_id,redirect_uri:redirect,response_type:'code',code_challenge:challenge,code_challenge_method:'S256',state:'test-state',scope:'jm:demo:read'});
 const form=await request('/oauth/authorize?'+p);assert.equal(form.status,200);
 const denied=await request('/oauth/authorize',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...Object.fromEntries(p),password:'wrong'})});assert.equal(denied.status,403);
 const approved=await request('/oauth/authorize',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...Object.fromEntries(p),password})});assert.equal(approved.status,302);
 const location=new URL(approved.headers.get('location'));assert.equal(location.origin,'https://chatgpt.com');assert.equal(location.searchParams.get('state'),'test-state');
 const code=location.searchParams.get('code');
 const tokenRes=await request('/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:client.client_id,redirect_uri:redirect,code_verifier:verifier})});assert.equal(tokenRes.status,200);
 const access=(await tokenRes.json()).access_token;assert.ok(access);
 const reuse=await request('/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:client.client_id,redirect_uri:redirect,code_verifier:verifier})});assert.equal(reuse.status,400);
 const tools=await request('/mcp',{method:'POST',headers:{authorization:'Bearer '+access,'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list'})});assert.equal(tools.status,200);
 const names=(await tools.json()).result.tools.map(t=>t.name);assert.deepEqual(names,['consultar_resumo_ficticio','consultar_mes_ficticio','consultar_categorias_ficticias','comparar_meses_ficticios']);
 const call=await request('/mcp',{method:'POST',headers:{authorization:'Bearer '+access,'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'consultar_resumo_ficticio',arguments:{}}})});assert.equal(call.status,200);assert.match(JSON.stringify(await call.json()),/fictional-demo/);
});
