import {cadastroCartoes} from './credit-card-registry.mjs';
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
import {prepararLancamentos,criarLancamentos} from './ledger-staging.mjs';
import {prepararContasFinanceiras,criarContasFinanceiras} from './financial-accounts.mjs';
import {prepararCartoes,criarCartoes} from './credit-card-purchases.mjs';
import {prepararPagamentosFatura,criarPagamentosFatura} from './credit-card-payments.mjs';
import {dashboard,loadDashboard} from './financial-dashboard.mjs';
import {prepareArchive,saveArchive} from './local-archive.mjs';
if(process.env.JM_TEST_ISOLATED_DB!=='true')console.log('SKIP: dashboard PostgreSQL requires isolated database');
else{
 if(!process.env.DATABASE_URL?.includes('localhost'))throw Error('Refusing non-local database');
 const {default:pg}=await import('pg');let pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try{
 await pool.query(await readFile(new URL('./postgres-schema.sql',import.meta.url),'utf8'));await prepararLancamentos(pool);await prepararContasFinanceiras(pool);await prepararCartoes(pool);await prepararPagamentosFatura(pool);await prepareArchive(pool);
 const id=randomUUID(),other=randomUUID(),accounts=criarContasFinanceiras(pool),ledger=criarLancamentos(pool),cards=criarCartoes(pool),payments=criarPagamentosFatura(pool);
 const req={nome:'Caixa',saldo_inicial_centavos:10000,client_request_id:randomUUID()};
 const a=await accounts.criar(id,req),again=await accounts.criar(id,req);assert.equal(a.id,again.id);await assert.rejects(accounts.criar(id,{...req,nome:'Outra'}),/idempotency_conflict/);
 const b=await accounts.criar(id,{nome:'Banco',saldo_inicial_centavos:0});await accounts.criar(other,{nome:'Privada',saldo_inicial_centavos:99999});
 const receipt={client_request_id:randomUUID(),tipo:'receita',valor_centavos:20000,descricao:'Venda',conta_id:a.id,data:'2026-10-01'};
 assert.equal((await ledger.registrar(id,receipt)).created,true);assert.equal((await ledger.registrar(id,receipt)).created,false);
 await assert.rejects(ledger.registrar(other,{...receipt,client_request_id:randomUUID()}),/invalid_account_reference/);
 await assert.rejects(ledger.registrar(id,{...receipt,data:'2026-02-30',client_request_id:randomUUID()}),/invalid_entry/);
 await ledger.registrar(id,{...receipt,client_request_id:randomUUID(),tipo:'despesa',valor_centavos:3000,conta_id:b.id,descricao:'Insumos',data:'2026-10-02'});
 const before=dashboard(await loadDashboard(pool,id),'2026-10-01','2026-10-31');assert.equal(before.resultado,17000);assert.equal(before.saldo,27000);
 const tr={client_request_id:randomUUID(),origem_id:a.id,destino_id:b.id,valor_centavos:5000,data:'2026-10-03'};
 const concurrent=await Promise.all([accounts.transferir(id,tr),accounts.transferir(id,tr)]);assert.equal(concurrent.filter(x=>x.created).length,1);
 const after=dashboard(await loadDashboard(pool,id),'2026-10-01','2026-10-31');assert.equal(after.saldo,before.saldo);assert.equal(after.resultado,before.resultado);assert.deepEqual(after.contas.map(c=>c.saldo).sort((a,b)=>a-b),[2000,25000]);
 await assert.rejects(accounts.transferir(other,{...tr,client_request_id:randomUUID()}));
 const cardMetadata={nome:'Cartao',limite_centavos:100000,dia_fechamento:25,dia_vencimento:10,client_request_id:randomUUID()};const registry=cadastroCartoes(pool);assert.equal((await registry.criar(id,cardMetadata)).created,true);assert.equal((await registry.criar(id,cardMetadata)).created,false);await assert.rejects(registry.criar(id,{...cardMetadata,limite_centavos:2}),/idempotency_conflict/);assert.equal((await registry.listar(other)).length,0);assert.equal((await loadDashboard(pool,id)).cartoes.length,1);
 const purchase={client_request_id:randomUUID(),cartao:'Cartao',descricao:'Compra',valor_centavos:1200,data_compra:'2026-10-04',vencimento:'2026-11-10',dia_fechamento:25};await cards.registrar(id,purchase);
 assert.equal(dashboard(await loadDashboard(pool,id)).saldo,27000);
 const payment={client_request_id:randomUUID(),cartao:'Cartao',vencimento:'2026-11-10',data_pagamento:'2026-10-05',valor_centavos:1200,conta:'Banco'};
 await assert.rejects(payments.pagar(id,{...payment,conta:'Nao existe'}),/invalid_payment_account/);
 await payments.pagar(id,payment);await payments.pagar(id,payment);
 let final=dashboard(await loadDashboard(pool,id),'2026-10-01','2026-10-31');assert.equal(final.saldo,25800);assert.equal(final.resultado,15800);assert.equal(final.faturas[0].pendente,0);assert.equal(final.conciliado,true);
 for(let i=0;i<110;i++)await ledger.registrar(id,{...receipt,client_request_id:randomUUID(),valor_centavos:1});
 final=dashboard(await loadDashboard(pool,id));assert.equal(final.lancamentos.length,113);assert.equal(final.resultado,15910);
 const archive=Object.fromEntries(['jm_receitas_v1','jm_despesas_v1','jm_contas_v1','jm_movs_v1','jm_categorias_v1','jm_demo_v1','jm_prev_v1'].map(k=>[k,null]));archive.jm_demo_v1='1';const saved=await saveArchive(pool,id,archive);assert.deepEqual(await saveArchive(pool,id,archive),saved);assert.equal(dashboard(await loadDashboard(pool,id)).resultado,15910);
 await pool.end();pool=new pg.Pool({connectionString:process.env.DATABASE_URL});assert.equal(dashboard(await loadDashboard(pool,id)).resultado,15910);assert.equal((await loadDashboard(pool,other)).lancamentos.length,0);
 console.log('PASS: real PostgreSQL persistence after reconnect; tenant isolation; 113 entries; balances; filters; transfers; invoice payment; concurrent idempotency; immutable legacy archive.');
 }finally{await pool.end();}
}
