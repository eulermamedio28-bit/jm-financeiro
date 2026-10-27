import test from 'node:test';
import assert from 'node:assert/strict';
import {createMobileClient} from './mobile-client.js';

test('mobile client requires HTTPS except localhost',()=>{
 assert.throws(()=>createMobileClient({baseUrl:'http://example.com'}),/HTTPS/);
 assert.doesNotThrow(()=>createMobileClient({baseUrl:'http://127.0.0.1:3000'}));
});
test('mobile client keeps token in memory and clears on logout',async()=>{
 const calls=[];
 const client=createMobileClient({baseUrl:'https://example.test/',fetchImpl:async(url,options)=>{
  calls.push({url:String(url),options});
  if(String(url).endsWith('/api/login')) return {ok:true,json:async()=>({token:'f'.repeat(64),expiresAt:'2026-12-01T00:00:00Z'})};
  if(String(url).includes('/api/summary')) return {ok:true,json:async()=>({income_cents:'2800'})};
  return {ok:true,json:async()=>({ok:true})};
 }});
 assert.equal(client.authenticated,false);
 await assert.rejects(client.summary('test'),/Sessão necessária/);
 await client.login('senha-de-teste');
 assert.equal(client.authenticated,true);
 const summary=await client.summary('11111111-1111-4111-8111-111111111111');
 assert.equal(summary.income_cents,'2800');
 assert.equal(calls[1].options.headers.authorization,'Bearer '+'f'.repeat(64));
 await client.logout();
 assert.equal(client.authenticated,false);
 await assert.rejects(client.summary('test'),/Sessão necessária/);
});
