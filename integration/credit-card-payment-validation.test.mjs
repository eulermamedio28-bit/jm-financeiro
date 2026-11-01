import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validarPagamentoFatura} from './credit-card-payment-validation.mjs';
const p={client_request_id:randomUUID(),cartao:'Magazine Luiza',vencimento:'2026-12-01',data_pagamento:'2026-12-01',valor_centavos:74764,conta:'Banco'};
assert.deepEqual(validarPagamentoFatura(p),p);
for(const v of [{...p,valor_centavos:0},{...p,conta:''},{...p,vencimento:'2026-02-30'},{...p,client_request_id:'abc'}])assert.throws(()=>validarPagamentoFatura(v),/invalid_invoice_payment/);
console.log('Validação de pagamento de fatura OK (sem movimentação financeira).');

assert.throws(()=>validarPagamentoFatura({...p,data_pagamento:'2026-02-30'}),/invalid_invoice_payment/);
assert.throws(()=>validarPagamentoFatura({...p,valor_centavos:1.5}),/invalid_invoice_payment/);

import {criarPagamentosFatura} from './credit-card-payments.mjs';
function simular(compras,erro){
 const comandos=[];
 const cliente={async query(sql){
  comandos.push(String(sql));
  if(erro&&String(sql).includes(erro))throw Error('falha_simulada');
  if(String(sql).includes('FROM jm_contas_financeiras'))return {rows:[{id:randomUUID()}]};
  if(String(sql).includes('FROM jm_pagamentos_fatura'))return {rows:[]};
  if(String(sql).includes('FROM jm_compras_cartao')&&String(sql).includes('FOR UPDATE'))return {rows:compras};
  if(String(sql).includes('RETURNING *'))return {rows:[{id:randomUUID()}]};
  return {rows:[]};
 },release(){}};
 return {pool:{connect:async()=>cliente},comandos};
}
const ok=simular([{valor_centavos:'74764',paga_em:null}]);
assert.equal((await criarPagamentosFatura(ok.pool).pagar(randomUUID(),p)).created,true);
assert.equal(ok.comandos.at(-1),'COMMIT');
const divergencia=simular([{valor_centavos:'74763',paga_em:null}]);
await assert.rejects(criarPagamentosFatura(divergencia.pool).pagar(randomUUID(),p),/invoice_amount_mismatch/);
assert.equal(divergencia.comandos.at(-1),'ROLLBACK');
const falha=simular([{valor_centavos:'74764',paga_em:null}],'UPDATE jm_compras_cartao');
await assert.rejects(criarPagamentosFatura(falha.pool).pagar(randomUUID(),p),/falha_simulada/);
assert.equal(falha.comandos.at(-1),'ROLLBACK');
console.log('Pagamento de fatura: transação, divergência e rollback simulados.');

const duplicado=simular([{valor_centavos:'74764',paga_em:'2026-11-30'}]);
await assert.rejects(criarPagamentosFatura(duplicado.pool).pagar(randomUUID(),p),/invoice_not_open/);
assert.equal(duplicado.comandos.at(-1),'ROLLBACK');
const vazia=simular([]);
await assert.rejects(criarPagamentosFatura(vazia.pool).pagar(randomUUID(),p),/invoice_not_open/);
assert.equal(vazia.comandos.at(-1),'ROLLBACK');

const idempotente=simular([]);
idempotente.pool.connect=async()=>({async query(sql){
 idempotente.comandos.push(String(sql));
 if(String(sql).includes('FROM jm_pagamentos_fatura'))return {rows:[{cartao:p.cartao,vencimento:p.vencimento,data_pagamento:p.data_pagamento,valor_centavos:String(p.valor_centavos),conta:p.conta}]};
 return {rows:[]};
},release(){}});
assert.equal((await criarPagamentosFatura(idempotente.pool).pagar(randomUUID(),p)).created,false);
assert.equal(idempotente.comandos.at(-1),'COMMIT');
assert.equal(idempotente.comandos.some(x=>x.includes('INSERT INTO jm_lancamentos')),false);
console.log('Idempotência: repetição não cria nova despesa.');
