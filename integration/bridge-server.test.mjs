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
    r=await fetch(url+'/v1/sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dados:{}})});
    assert.equal(r.status,503);
    assert.equal((await r.json()).error,'sync_not_implemented');
  } finally { await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())); }
});
