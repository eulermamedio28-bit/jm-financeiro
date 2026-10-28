import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validarCompraCartao} from './credit-card-purchases.mjs';
const compra={client_request_id:randomUUID(),cartao:'Magazine Luiza',descricao:'Compra de carnes',valor_centavos:74764,data_compra:'2026-10-27',vencimento:'2026-12-01',dia_fechamento:25};
assert.deepEqual(validarCompraCartao(compra),compra);
for(const v of [{...compra,valor_centavos:0},{...compra,data_compra:'2026-02-30'},{...compra,vencimento:'2026-10-26'},{...compra,dia_fechamento:31},{...compra,client_request_id:'invalid'}])assert.throws(()=>validarCompraCartao(v));
console.log('Credit card purchase validation OK');
