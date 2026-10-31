import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from './bridge-server.mjs';

test('gateway de protótipo falha fechado sem autenticação e sem banco', async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  try {
    let r=await fetch(url+'/health');
    assert.equal(r.status,200);
    assert.equal((await r.json()).readyForFinancialData,false);
    r=await fetch(url+'/v1/sync/status');
    assert.equal(r.status,503);
    r=await fetch(url+'/v1/sync/status',{headers:{Authorization:'Bearer invalid-test-token-123456789'}});
    assert.equal(r.status,503);
    r=await fetch(url+'/v1/sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dados:{}})});
    assert.equal(r.status,503);
    assert.equal((await r.json()).error,'sync_not_implemented');
    assert.equal(r.headers.get('access-control-allow-origin'),null);
    r=await fetch(url+'/v1/sync',{method:'GET'});
    assert.equal(r.status,503);
    r=await fetch(url+'/v1/sync',{method:'OPTIONS'});
    assert.equal(r.status,503);
    r=await fetch(url+'/mcp',{method:'POST'});
    assert.equal(r.status,404);
  } finally { await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())); }
});

test('credencial configurada autoriza apenas consulta de status', async () => {
  const original=process.env.JM_BRIDGE_TEST_TOKEN;
  process.env.JM_BRIDGE_TEST_TOKEN='a'.repeat(64);
  const {server: protegido}=await import('./bridge-server.mjs?auth-test');
  await new Promise(resolve=>protegido.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+protegido.address().port;
  try {
    let resposta=await fetch(url+'/v1/sync/status');
    assert.equal(resposta.status,401);
    resposta=await fetch(url+'/v1/sync/status',{headers:{Authorization:'Bearer '+ 'b'.repeat(64)}});
    assert.equal(resposta.status,401);
    resposta=await fetch(url+'/v1/sync/status',{headers:{Authorization:'Bearer '+ 'a'.repeat(64)}});
    assert.equal(resposta.status,200);
    assert.equal((await resposta.json()).syncEnabled,false);
    resposta=await fetch(url+'/v1/sync',{method:'POST',headers:{Authorization:'Bearer '+ 'a'.repeat(64)},body:'{}'});
    assert.equal(resposta.status,503);
  } finally {
    await new Promise(resolve=>protegido.close(resolve));
    if(original===undefined) delete process.env.JM_BRIDGE_TEST_TOKEN;
    else process.env.JM_BRIDGE_TEST_TOKEN=original;
  }
});
