import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateCorrection,reconcileEntry,prepareReconciliation} from './ledger-reconciliation.mjs';
const payload=()=>({lancamento_id:randomUUID(),client_request_id:randomUUID(),conta_id:randomUUID(),categoria:' Embalagens ',expected:{conta_id:null,conta:'Dinheiro',categoria:null}});
test('corrections accept only account/category and a complete previous state',()=>{
 assert.equal(validateCorrection(payload()).categoria,'Embalagens');
 for(const extra of [{valor_centavos:100},{data:'2026-10-31'},{tipo:'receita'},{account_id:randomUUID()}])assert.throws(()=>validateCorrection({...payload(),...extra}),/invalid_correction/);
 for(const extra of [{conta_id:'bad'},{expected:{}},{categoria:'x'.repeat(121)}])assert.throws(()=>validateCorrection({...payload(),...extra}),/invalid_correction/);
});
test('invalid corrections cannot acquire a database connection',async()=>{
 await assert.rejects(reconcileEntry({connect(){throw Error('must not connect');}},randomUUID(),{...payload(),conta_id:''}),/invalid_correction/);
});
if(process.env.JM_TEST_ISOLATED_DB==='true'){
 test('PostgreSQL reconciliation is audited, isolated, atomic and retry-safe',async()=>{
  if(!process.env.DATABASE_URL?.includes('localhost'))throw Error('Refusing non-local database');
  const {default:pg}=await import('pg'),pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  try{
   const {readFile}=await import('node:fs/promises');const {prepararLancamentos,criarLancamentos}=await import('./ledger-staging.mjs');const {prepararContasFinanceiras,criarContasFinanceiras}=await import('./financial-accounts.mjs');const {prepararPagamentosFatura,criarPagamentosFatura}=await import('./credit-card-payments.mjs');const {prepararCartoes,criarCartoes}=await import('./credit-card-purchases.mjs');const {dashboard,loadDashboard}=await import('./financial-dashboard.mjs');
   await pool.query(await readFile(new URL('./postgres-schema.sql',import.meta.url),'utf8'));await prepararLancamentos(pool);await prepararContasFinanceiras(pool);await prepararCartoes(pool);await prepararPagamentosFatura(pool);await prepareReconciliation(pool);
   const user=randomUUID(),other=randomUUID(),accounts=criarContasFinanceiras(pool),ledger=criarLancamentos(pool);
   const a=await accounts.criar(user,{nome:'Caixa',saldo_inicial_centavos:10000});const b=await accounts.criar(other,{nome:'Outra empresa',saldo_inicial_centavos:0});
   const old=await ledger.registrar(user,{client_request_id:randomUUID(),tipo:'despesa',descricao:'Legado',valor_centavos:2000,data:'2026-10-30',conta:'Dinheiro'});
   const input={...payload(),lancamento_id:old.lancamento.id,conta_id:a.id};
   await assert.rejects(reconcileEntry(pool,other,input),/entry_not_found/);
   await assert.rejects(reconcileEntry(pool,user,{...input,conta_id:b.id}),/invalid_account_reference/);
   const concurrent=await Promise.all([reconcileEntry(pool,user,input),reconcileEntry(pool,user,input)]);assert.equal(concurrent.filter(x=>x.created).length,1);assert.equal((await reconcileEntry(pool,user,input)).created,false);
   await assert.rejects(reconcileEntry(pool,user,{...input,categoria:'Outra'}),/idempotency_conflict/);
   await assert.rejects(reconcileEntry(pool,user,{...input,client_request_id:randomUUID()}),/stale_entry/);
   const d=dashboard(await loadDashboard(pool,user));assert.equal(d.resultado,-2000);assert.equal(d.saldo,8000);assert.equal(d.conciliado,true);assert.equal(d.lancamentos[0].data instanceof Date?d.lancamentos[0].data.toISOString().slice(0,10):String(d.lancamentos[0].data).slice(0,10),'2026-10-30');
   const audit=await pool.query('SELECT * FROM jm_lancamentos_correcoes WHERE account_id=$1',[user]);assert.equal(audit.rows.length,1);assert.equal(audit.rows[0].anterior.conta,'Dinheiro');assert.equal(audit.rows[0].posterior.conta_id,a.id);
   const purchase={client_request_id:randomUUID(),cartao:'Teste',descricao:'Insumos',valor_centavos:500,data_compra:'2026-10-31',vencimento:'2026-11-10',dia_fechamento:25};await criarCartoes(pool).registrar(user,purchase);const paid=await criarPagamentosFatura(pool).pagar(user,{client_request_id:randomUUID(),cartao:'Teste',vencimento:'2026-11-10',data_pagamento:'2026-10-31',valor_centavos:500,conta:'Caixa'});
   await assert.rejects(reconcileEntry(pool,user,{...payload(),lancamento_id:paid.pagamento.lancamento_id,conta_id:a.id,expected:{conta_id:a.id,conta:'Caixa',categoria:'Pagamento de fatura de cartão'}}),/invoice_correction_not_supported/);
  }finally{await pool.end();}
 });
}
