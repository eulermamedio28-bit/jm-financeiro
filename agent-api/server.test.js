import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const dir=mkdtempSync(join(tmpdir(),'jm-api-'));
const token='test-token-'.padEnd(40,'x');
const port=20000+Math.floor(Math.random()*30000);
const base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['server.js'],{
 cwd:new URL('.',import.meta.url).pathname,
 env:{...process.env,JM_API_TOKEN:token,JM_DB_PATH:join(dir,'test.sqlite'),PORT:String(port)},
 stdio:['ignore','pipe','pipe']
});
let output='';
child.stdout.on('data',d=>output+=d);
child.stderr.on('data',d=>output+=d);
async function request(path,method='GET',body, key){
 const headers={authorization:'Bearer '+token};
 if(body!==undefined) headers['content-type']='application/json';
 if(key) headers['idempotency-key']=key;
 const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 return {status:res.status,data:await res.json()};
}
test('API local: autenticação, cadastros, idempotência e auditoria',async()=>{
 try {
  let ready=false;
  for(let i=0;i<50;i++){
   if(child.exitCode!==null) throw Error('Servidor encerrou: '+output);
   try {const r=await request('/health');if(r.status===200){ready=true;break;}}catch{}
   await sleep(100);
  }
  assert.ok(ready,'Servidor não iniciou: '+output);
  const noAuth=await fetch(base+'/accounts');
  assert.equal(noAuth.status,401);
  const wrongAuth=await fetch(base+'/entries',{headers:{authorization:'Bearer invalid-token'}});
  assert.equal(wrongAuth.status,401);
  assert.equal((await request('/accounts')).data.length,0);
  assert.equal((await request('/accounts','POST',{name:'Caixa'})).status,400);
  const account=await request('/accounts','POST',{name:'Caixa',opening_cents:10000},'test-account-0001');
  assert.equal(account.status,200);
  assert.ok(account.data.id);
  const repeated=await request('/accounts','POST',{name:'Caixa',opening_cents:10000},'test-account-0001');
  assert.deepEqual(repeated.data,account.data);
  assert.equal((await request('/accounts')).data.length,1);
  const category=await request('/categories','POST',{name:'Insumos'},'test-category-0001');
  assert.equal(category.status,200);
  const bad=await request('/entries','POST',{kind:'expense',account_id:account.data.id,category_id:category.data.id,description:'Inválida',amount_cents:-1},'test-entry-bad-0001');
  assert.equal(bad.status,400);
  const body={kind:'expense',account_id:account.data.id,category_id:category.data.id,description:'Despesa fictícia',amount_cents:2500};
  const missingAccount=await request('/entries','POST',{...body,account_id:'nonexistent'},'test-entry-missing-0001');
  assert.equal(missingAccount.status,400);
  const entry=await request('/entries','POST',body,'test-entry-0001');
  assert.equal(entry.status,200);
  const again=await request('/entries','POST',body,'test-entry-0001');
  assert.deepEqual(again.data,entry.data);
  const changed=await request('/entries','POST',{...body,amount_cents:5000},'test-entry-0001');
  assert.equal(changed.status,400,'Não deve reutilizar a mesma chave para outro valor');
  assert.equal((await request('/entries')).data.length,1);
  assert.equal((await request('/audit')).data.length,3);
  const records=(await request('/entries')).data;
  assert.equal(records[0].amount_cents,2500);
  assert.equal(records[0].kind,'expense');
 } finally {
  if(child.exitCode===null) child.kill();
  await new Promise(resolve=>child.once('exit',resolve));
  rmSync(dir,{recursive:true,force:true});
 }
});
