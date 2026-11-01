import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prepareEntryManagement,validateEntryChange,changeEntry,entryHistory} from './ledger-management.mjs';
const payload=()=>({lancamento_id:randomUUID(),client_request_id:randomUUID(),acao:'editar',expected_version:0,motivo:'Corrigir digitação',descricao:'Insumos',valor_centavos:2000,data:'2026-10-31',conta_id:randomUUID(),categoria:'Ingredientes'});
test('management validates cents, dates, optimistic version and rejects client-supplied identity',()=>{
 assert.equal(validateEntryChange(payload()).descricao,'Insumos');
 for(const patch of [{autor_id:randomUUID()},{account_id:randomUUID()},{tipo:'receita'},{valor_centavos:0},{valor_centavos:1.2},{data:'2026-02-30'},{expected_version:-1},{motivo:' '}])assert.throws(()=>validateEntryChange({...payload(),...patch}),/invalid_entry_change/);
 const p=payload();delete p.descricao;assert.throws(()=>validateEntryChange(p));
 assert.throws(()=>validateEntryChange({...payload(),acao:'excluir'}),/invalid_entry_change/);
});
test('invalid management request never opens a database connection',async()=>{
 await assert.rejects(changeEntry({connect(){throw Error('must not connect');}},randomUUID(),{...payload(),valor_centavos:-1}),/invalid_entry_change/);
});
if(process.env.JM_TEST_ISOLATED_DB==='true')test('audited edit, logical deletion, restore and concurrency preserve all read models and invoice links',async()=>{
 if(!process.env.DATABASE_URL?.includes('localhost'))throw Error('Refusing non-local database');
 const {default:pg}=await import('pg'),pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try{
  const {readFile}=await import('node:fs/promises');const {prepararLancamentos,criarLancamentos}=await import('./ledger-staging.mjs');const {prepararContasFinanceiras,criarContasFinanceiras}=await import('./financial-accounts.mjs');const {prepararPagamentosFatura,criarPagamentosFatura}=await import('./credit-card-payments.mjs');const {prepararCartoes,criarCartoes}=await import('./credit-card-purchases.mjs');const {prepareReconciliation,reconcileEntry}=await import('./ledger-reconciliation.mjs');const {loadDashboard,dashboard}=await import('./financial-dashboard.mjs');
  await pool.query(await readFile(new URL('./postgres-schema.sql',import.meta.url),'utf8'));await prepararLancamentos(pool);await prepararContasFinanceiras(pool);await prepararCartoes(pool);await prepararPagamentosFatura(pool);await prepareReconciliation(pool);await prepareEntryManagement(pool);
  const user=randomUUID(),other=randomUUID(),accounts=criarContasFinanceiras(pool),ledger=criarLancamentos(pool);const a=await accounts.criar(user,{nome:'Caixa gestão',saldo_inicial_centavos:10000});const b=await accounts.criar(user,{nome:'Banco gestão',saldo_inicial_centavos:0});const foreign=await accounts.criar(other,{nome:'Conta de outro usuário'});
  const {lancamento:entry}=await ledger.registrar(user,{client_request_id:randomUUID(),tipo:'despesa',descricao:'Despesa comum',valor_centavos:1000,data:'2026-10-30',conta_id:a.id});
  const edit={...payload(),lancamento_id:entry.id,conta_id:b.id};
  await assert.rejects(changeEntry(pool,other,edit),/entry_not_found/);await assert.rejects(entryHistory(pool,other,entry.id),/entry_not_found/);
  await assert.rejects(changeEntry(pool,user,{...edit,conta_id:foreign.id}),/invalid_account_reference/);
  assert.equal((await entryHistory(pool,user,entry.id)).length,0);
  const edits=await Promise.all([changeEntry(pool,user,edit),changeEntry(pool,user,edit)]);assert.equal(edits.filter(e=>e.created).length,1);
  await assert.rejects(changeEntry(pool,user,{...edit,valor_centavos:3000}),/idempotency_conflict/);
  await assert.rejects(changeEntry(pool,user,{...edit,client_request_id:randomUUID()}),/stale_entry/);
  const october30=dashboard(await loadDashboard(pool,user),'2026-10-30','2026-10-30');assert.equal(october30.despesas,0);assert.equal(october30.saldo,10000);
  const october31=dashboard(await loadDashboard(pool,user),'2026-10-31','2026-10-31');assert.equal(october31.despesas,2000);assert.equal(october31.saldo,8000);assert.equal(october31.contas.find(c=>c.id===b.id).saldo,-2000);
  const deletion={lancamento_id:entry.id,client_request_id:randomUUID(),acao:'excluir',expected_version:1,motivo:'Lançamento errado'};
  const deletes=await Promise.all([changeEntry(pool,user,deletion),changeEntry(pool,user,deletion)]);assert.equal(deletes.filter(d=>d.created).length,1);assert.equal((await ledger.resumo(user)).despesas_centavos,'0');assert.equal((await ledger.listar(user)).length,0);assert.equal(dashboard(await loadDashboard(pool,user)).saldo,10000);assert.equal((await accounts.saldos(user)).saldo_contas_cadastradas_centavos,'10000');
  const stored=(await pool.query('SELECT * FROM jm_lancamentos WHERE id=$1',[entry.id])).rows[0];assert.ok(stored.excluido_em);assert.equal(stored.excluido_por,user);assert.equal(stored.valor_centavos,'2000');
  await assert.rejects(reconcileEntry(pool,user,{lancamento_id:entry.id,client_request_id:randomUUID(),conta_id:a.id,categoria:'Outra',expected:{conta_id:b.id,conta:b.nome,categoria:'Ingredientes'}}),/invalid_entry_state/);
  const restore={lancamento_id:entry.id,client_request_id:randomUUID(),acao:'restaurar',expected_version:2,motivo:'Restaurar para conferência'};await changeEntry(pool,user,restore);assert.equal((await changeEntry(pool,user,restore)).created,false);assert.equal(dashboard(await loadDashboard(pool,user)).saldo,8000);assert.equal((await ledger.resumo(user)).despesas_centavos,'2000');
  const history=await entryHistory(pool,user,entry.id);assert.equal(history.length,3);assert.ok(history.every(h=>h.autor_id===user&&h.criado_em));assert.equal(history.find(h=>h.acao==='editar').anterior.valor_centavos,'1000');assert.equal(history.find(h=>h.acao==='editar').posterior.valor_centavos,'2000');
  const race=await Promise.allSettled([changeEntry(pool,user,{...edit,client_request_id:randomUUID(),expected_version:3,valor_centavos:3000}),changeEntry(pool,user,{...edit,client_request_id:randomUUID(),expected_version:3,valor_centavos:4000})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.match(race.find(r=>r.status==='rejected').reason.message,/stale_entry/);
  await criarCartoes(pool).registrar(user,{client_request_id:randomUUID(),cartao:'Cartão protegido',descricao:'Compra',valor_centavos:500,data_compra:'2026-10-31',vencimento:'2026-11-10',dia_fechamento:25});const paid=await criarPagamentosFatura(pool).pagar(user,{client_request_id:randomUUID(),cartao:'Cartão protegido',vencimento:'2026-11-10',valor_centavos:500,data_pagamento:'2026-10-31',conta:a.nome});
  for(const acao of ['excluir','editar'])await assert.rejects(changeEntry(pool,user,acao==='editar'?{...edit,lancamento_id:paid.pagamento.lancamento_id,client_request_id:randomUUID(),expected_version:0}:{...deletion,lancamento_id:paid.pagamento.lancamento_id,client_request_id:randomUUID(),expected_version:0}),/linked_entry_protected/);
  assert.equal((await entryHistory(pool,user,paid.pagamento.lancamento_id)).length,0);
 }finally{await pool.end();}
});
