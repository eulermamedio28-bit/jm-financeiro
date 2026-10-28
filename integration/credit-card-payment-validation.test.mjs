import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validarPagamentoFatura} from './credit-card-payment-validation.mjs';
const p={client_request_id:randomUUID(),cartao:'Magazine Luiza',vencimento:'2026-12-01',data_pagamento:'2026-12-01',valor_centavos:74764,conta:'Banco'};
assert.deepEqual(validarPagamentoFatura(p),p);
for(const v of [{...p,valor_centavos:0},{...p,conta:''},{...p,vencimento:'2026-02-30'},{...p,client_request_id:'abc'}])assert.throws(()=>validarPagamentoFatura(v),/invalid_invoice_payment/);
console.log('Validação de pagamento de fatura OK (sem movimentação financeira).');

assert.throws(()=>validarPagamentoFatura({...p,data_pagamento:'2026-02-30'}),/invalid_invoice_payment/);
assert.throws(()=>validarPagamentoFatura({...p,valor_centavos:1.5}),/invalid_invoice_payment/);
