import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { hashPassword } from './pilot-auth.js';

const dir=mkdtempSync(join(tmpdir(),'jm-api-'));
const token='test-token-'.padEnd(40,'x');
const pilotSession='test-session-'.padEnd(40,'y');
const password='senha-ficticia-para-testes-123';
let userSession='';
const port=20000+Math.floor(Math.random()*30000);
const base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['server.js'],{
 cwd:new URL('.',import.meta.url).pathname,
 env:{...process.env,JM_API_TOKEN:token,JM_PILOT_SESSION:pilotSession,JM_PILOT_PASSWORD_HASH:hashPassword(password),JM_ALLOWED_ORIGIN:'http://localhost:4321',JM_DB_PATH:join(dir,'test.sqlite'),PORT:String(port)},
 stdio:['ignore','pipe','pipe']
});
let output='';
child.stdout.on('data',d=>output+=d);
child.stderr.on('data',d=>output+=d);
async function request(path,method='GET',body, key){
 const headers={authorization:'Bearer '+token,'x-jm-pilot-session':pilotSession};
 if(userSession) headers['x-jm-user-session']=userSession;
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
   try {const r=await request('/health');if(r.status===401){ready=true;break;}}catch{}
   await sleep(100);
  }
  assert.ok(ready,'Servidor não iniciou: '+output);
  assert.equal((await request('/accounts')).status,401,'Sem sessão individual não deve acessar dados');
  assert.equal((await request('/auth/login','POST',{username:'silvia',password})).status,401);
  assert.equal((await request('/auth/login','POST',{username:'euler',password:'senha-errada'})).status,401);
  const login=await request('/auth/login','POST',{username:'euler',password});
  assert.equal(login.status,200);
  userSession=login.data.token;
  assert.deepEqual((await request('/auth/me')).data,{username:'euler'});
  const pilotPage=await fetch(base+'/pilot');
  assert.equal(pilotPage.status,200);
  assert.match(await pilotPage.text(),/JM Financeiro/);
  assert.equal((await fetch(base+'/pilot/summary')).status,401,'Resumo sem cookie deve ser negado');
  const pilotLogin=await fetch(base+'/pilot/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'euler',password})});
  assert.equal(pilotLogin.status,200);
  const cookie=pilotLogin.headers.get('set-cookie');
  assert.match(cookie,/HttpOnly/);
  assert.match(cookie,/SameSite=Strict/);
  const browserCookie=cookie.split(';')[0];
  const browserSummary=await fetch(base+'/pilot/summary',{headers:{cookie:browserCookie}});
  assert.equal(browserSummary.status,200);
  assert.equal((await browserSummary.json()).balance_cents,0);
  const crossSite=await fetch(base+'/pilot/summary',{headers:{cookie:browserCookie,origin:'https://invasor.test'}});
  assert.equal(crossSite.status,403);
  const pilotLogout=await fetch(base+'/pilot/logout',{method:'POST',headers:{cookie:browserCookie}});
  assert.equal(pilotLogout.status,200);
  assert.equal((await fetch(base+'/pilot/summary',{headers:{cookie:browserCookie}})).status,401);

  const noAuth=await fetch(base+'/accounts');
  assert.equal(noAuth.status,401);
  const missingSession=await fetch(base+'/accounts',{headers:{authorization:'Bearer '+token}});
  assert.equal(missingSession.status,401);
  const wrongSession=await fetch(base+'/accounts',{headers:{authorization:'Bearer '+token,'x-jm-pilot-session':'invalid'}});
  assert.equal(wrongSession.status,401);
  const untrustedOrigin=await fetch(base+'/accounts',{headers:{authorization:'Bearer '+token,'x-jm-pilot-session':pilotSession,origin:'https://exemplo-invalido.test'}});
  assert.equal(untrustedOrigin.status,403);
  const trustedOrigin=await fetch(base+'/accounts',{headers:{authorization:'Bearer '+token,'x-jm-pilot-session':pilotSession,origin:'http://localhost:4321','x-jm-user-session':userSession}});
  assert.equal(trustedOrigin.status,200);
  const untrustedWrite=await fetch(base+'/accounts',{method:'POST',headers:{authorization:'Bearer '+token,'x-jm-pilot-session':pilotSession,origin:'https://exemplo-invalido.test','idempotency-key':'origin-denied-0001','content-type':'application/json'},body:JSON.stringify({name:'Conta não autorizada'})});
  assert.equal(untrustedWrite.status,403);
  assert.equal((await request('/accounts')).data.length,0);
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
  const summary=await request('/summary');
  assert.equal(summary.status,200);
  assert.deepEqual(summary.data,{income_cents:0,expense_cents:2500,opening_cents:10000,balance_cents:7500});
  const second=await request('/accounts','POST',{name:'Banco',opening_cents:0},'test-account-0002');
  assert.equal(second.status,200);
  const transferBody={from_account_id:account.data.id,to_account_id:second.data.id,amount_cents:3000,description:'Transferência fictícia'};
  const transfer=await request('/transfers','POST',transferBody,'test-transfer-0001');
  assert.equal(transfer.status,200);
  const duplicateTransfer=await request('/transfers','POST',transferBody,'test-transfer-0001');
  assert.deepEqual(duplicateTransfer.data,transfer.data);
  assert.equal((await request('/transfers')).data.length,1);
  const balances=(await request('/account-balances')).data;
  assert.equal(balances.find(x=>x.id===account.data.id).balance_cents,4500);
  assert.equal(balances.find(x=>x.id===second.data.id).balance_cents,3000);
  const afterTransfer=(await request('/summary')).data;
  assert.equal(afterTransfer.balance_cents,7500,'Transferência não muda saldo consolidado');
  assert.equal(afterTransfer.income_cents,0,'Transferência não é receita');
  assert.equal(afterTransfer.expense_cents,2500,'Transferência não é despesa');
  const sameAccount=await request('/transfers','POST',{...transferBody,to_account_id:account.data.id},'test-transfer-same-0001');
  assert.equal(sameAccount.status,400);
  assert.equal((await request('/transfers')).data.length,1);
  const missingDestination=await request('/transfers','POST',{...transferBody,to_account_id:'missing'},'test-transfer-missing-0001');
  assert.equal(missingDestination.status,400);
  const invalidAmount=await request('/transfers','POST',{...transferBody,amount_cents:0},'test-transfer-zero-0001');
  assert.equal(invalidAmount.status,400);
  const insufficient=await request('/transfers','POST',{...transferBody,amount_cents:999999},'test-transfer-over-0001');
  assert.equal(insufficient.status,400);
  assert.equal((await request('/transfers')).data.length,1);
  const balancesAfterRejection=(await request('/account-balances')).data;
  assert.deepEqual(balancesAfterRejection,balances,'Operação rejeitada não pode alterar os saldos');
  assert.deepEqual((await request('/summary')).data,afterTransfer,'Operação rejeitada não pode alterar o consolidado');
  const audit=(await request('/audit')).data;
  assert.equal(audit.length,5);
  assert.ok(audit.every(x=>x.actor==='euler'));
  const logout=await request('/auth/logout','POST');
  assert.equal(logout.status,200);
  assert.equal((await request('/entries')).status,401);
  assert.equal((await request('/summary')).status,401);
  assert.equal((await request('/transfers','POST',transferBody,'test-after-logout-0001')).status,401);
 } finally {
  if(child.exitCode===null && child.signalCode===null) {
   const exited=new Promise(resolve=>child.once('exit',resolve));
   child.kill();
   await exited;
  }
  rmSync(dir,{recursive:true,force:true});
 }
});
