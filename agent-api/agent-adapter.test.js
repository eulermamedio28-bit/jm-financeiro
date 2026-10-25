import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalAgentAdapter} from './agent-adapter.js';
const secret='f'.repeat(40);
const make=(fetchImpl,baseUrl)=>createLocalAgentAdapter({baseUrl,token:secret,pilotSession:secret,userSession:secret,fetchImpl});
test('bloqueia URL pública e credenciais insuficientes',()=>{
 assert.throws(()=>make(async()=>{},'https://example.com'),/localhost/);
 assert.throws(()=>createLocalAgentAdapter({token:'x',pilotSession:secret,userSession:secret}),/Credenciais/);
});
test('consultas usam rota e credenciais sem expor valores no resultado',async()=>{
 let called;
 const api=make(async(url,options)=>{called={url:String(url),options};return {ok:true,json:async()=>({balance_cents:0})};});
 const result=await api.read('consultar_resumo');
 assert.equal(result.balance_cents,0);
 assert.equal(called.url,'http://127.0.0.1:8787/summary');
 assert.equal(called.options.method,'GET');
 assert.equal(called.options.headers.authorization,'Bearer '+secret);
 await assert.rejects(()=>api.read('ferramenta_inexistente'),/desconhecida/);
});
test('escritas não são executadas sem confirmação vinculada à operação',async()=>{
 let count=0;
 const api=make(async()=>{count++;return {ok:true,json:async()=>({id:'ficticio'})};});
 const prepared=api.prepareWrite('registrar_lancamento',{kind:'expense',account_id:'caixa',category_id:'fornecedores',description:'teste',amount_cents:35000});
 assert.equal(count,0);
 await assert.rejects(()=>api.executeApproved(prepared),/Confirmação/);
 await assert.rejects(()=>api.executeApproved(prepared,{confirmed:true,operationKey:'errada',summary:prepared.summary}),/Confirmação/);
 assert.equal(count,0);
 const result=await api.executeApproved(prepared,{confirmed:true,operationKey:prepared.idempotencyKey,summary:prepared.summary});
 assert.equal(result.id,'ficticio');
 assert.equal(count,1);
});
test('modificação após preparação invalida autorização',async()=>{
 const api=make(async()=>{throw Error('não deveria executar');});
 const prepared=api.prepareWrite('criar_categoria',{name:'Fictícia'});
 prepared.body.name='Alterada';
 await assert.rejects(()=>api.executeApproved(prepared,{confirmed:true,operationKey:prepared.idempotencyKey,summary:prepared.summary}),/alterada/);
});
