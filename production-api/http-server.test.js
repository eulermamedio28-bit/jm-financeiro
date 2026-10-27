import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinancialHttpServer} from './http-server.js';

test('HTTP development adapter exposes health and refuses missing bearer',async()=>{
 const pool={query:async()=>{throw Error('Database must not be called')}};
 const server=createFinancialHttpServer(pool);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const port=server.address().port;
  const health=await fetch('http://127.0.0.1:'+port+'/health');
  assert.equal(health.status,200);
  assert.equal(health.headers.get('cache-control'),'no-store');
  assert.equal(health.headers.get('referrer-policy'),'no-referrer');
  assert.equal(health.headers.get('x-frame-options'),'DENY');
  assert.equal((await health.json()).mode,'development-only');
  const pilot=await fetch('http://127.0.0.1:'+port+'/pilot');
  assert.equal(pilot.status,200);
  assert.equal(pilot.headers.get('x-frame-options'),'DENY');
  const html=await pilot.text();
  assert.match(html,/Novo lançamento de teste/);
  assert.match(html,/entry-form/);
  assert.match(html,/transfer-form/);
  assert.match(html,/Transferência interna de teste/);
  const moduleResponse=await fetch('http://127.0.0.1:'+port+'/mobile-client.js');
  assert.equal(moduleResponse.status,200);
  const denied=await fetch('http://127.0.0.1:'+port+'/api/summary?establishmentId=11111111-1111-4111-8111-111111111111');
  assert.equal(denied.status,401);
  const unknown=await fetch('http://127.0.0.1:'+port+'/unknown');
  assert.equal(unknown.status,404);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
