import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {prepararContasFinanceiras,criarContasFinanceiras} from './financial-accounts.mjs';
import {prepararLancamentos,criarLancamentos} from './ledger-staging.mjs';
import {prepararCartoes,criarCartoes} from './credit-card-purchases.mjs';
import {prepararPagamentosFatura,criarPagamentosFatura} from './credit-card-payments.mjs';

if(process.env.JM_TEST_ISOLATED_DB!=='true'){
 console.log('SKIP: teste PostgreSQL executado somente na rotina isolada.');
} else {
 if(!process.env.DATABASE_URL?.includes('localhost'))throw Error('Refusing non-local test database');
 const {default:pg}=await import('pg');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {
 await pool.query(await readFile(new URL('./postgres-schema.sql',import.meta.url),'utf8'));
 await prepararLancamentos(pool);
 await prepararContasFinanceiras(pool);
 await prepararCartoes(pool);
 await prepararPagamentosFatura(pool);
 const accountId=randomUUID();
 await pool.query('INSERT INTO jm_accounts(id) VALUES($1)',[accountId]);
 await criarContasFinanceiras(pool).criar(accountId,{nome:'Banco CI'});
 const cartoes=criarCartoes(pool), pagamentos=criarPagamentosFatura(pool), ledger=criarLancamentos(pool);
 const compra={client_request_id:randomUUID(),cartao:'Cartao CI',descricao:'Compra de teste',valor_centavos:74764,data_compra:'2026-10-27',vencimento:'2026-12-01',dia_fechamento:25};
 assert.equal((await cartoes.registrar(accountId,compra)).created,true);
 assert.equal((await ledger.resumo(accountId)).quantidade,0);
 const p={client_request_id:randomUUID(),cartao:'Cartao CI',vencimento:'2026-12-01',data_pagamento:'2026-11-30',valor_centavos:74764,conta:'Banco CI'};
 await assert.rejects(pagamentos.pagar(accountId,{...p,valor_centavos:74763}),/invoice_amount_mismatch/);
 assert.equal((await ledger.resumo(accountId)).quantidade,0);
 assert.equal((await cartoes.listarFaturas(accountId))[0].pendente_centavos,74764);
 assert.equal((await pagamentos.pagar(accountId,p)).created,true);
 assert.equal((await pagamentos.pagar(accountId,p)).created,false);
 const resumo=await ledger.resumo(accountId);
 assert.equal(resumo.quantidade,1);
 assert.equal(resumo.despesas_centavos,'74764');
 assert.equal((await cartoes.listarFaturas(accountId))[0].pendente_centavos,0);
 await assert.rejects(pagamentos.pagar(accountId,{...p,client_request_id:randomUUID()}),/invoice_not_open/);
 await assert.rejects(pagamentos.pagar(accountId,{...p,conta:'Outra conta'}),/idempotency_conflict/);
 assert.equal((await ledger.resumo(accountId)).quantidade,1);
 console.log('PASSOU: PostgreSQL isolado, pagamento, baixa, resumo, rollback e idempotencia.');
} finally {await pool.end();}

}
