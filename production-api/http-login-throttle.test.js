import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinancialHttpServer} from './http-server.js';

test('HTTP login endpoint throttles repeated attempts before database access',async()=>{
 let connections=0;
 const pool={connect:async()=>{connections++;throw Error('Banco fictício indisponível')}};
 const server=createFinancialHttpServer(pool);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/login';
  const responses=[];
  for(let i=0;i<11;i++){
   const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'euler',password:'senha-incorreta'})});
   responses.push(response.status);
  }
  assert.equal(responses.slice(0,10).every(code=>code===500),true);
  assert.equal(responses[10],429);
  assert.equal(connections,10);
  const blocked=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(blocked.status,429);
  assert.equal(blocked.headers.get('cache-control'),'no-store');
  assert.equal(connections,10);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
