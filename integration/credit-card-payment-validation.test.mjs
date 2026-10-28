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
