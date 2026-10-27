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
  assert.equal((await health.json()).mode,'development-only');
  const denied=await fetch('http://127.0.0.1:'+port+'/api/summary?establishmentId=11111111-1111-4111-8111-111111111111');
  assert.equal(denied.status,401);
  const unknown=await fetch('http://127.0.0.1:'+port+'/unknown');
  assert.equal(unknown.status,404);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
