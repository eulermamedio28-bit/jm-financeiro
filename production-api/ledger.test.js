import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEntry,validateTransfer,consolidate} from './ledger.js';
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const c='33333333-3333-4333-8333-333333333333';
test('lançamento válido é normalizado',()=>{
 const value=validateEntry({kind:'expense',amount_cents:35000,establishment_id:a,account_id:b,category_id:c,description:' Energia '});
 assert.equal(value.description,'Energia');
});
test('rejeita valores inválidos, contas sem UUID e descrição vazia',()=>{
 const base={kind:'income',amount_cents:100,establishment_id:a,account_id:b,category_id:c,description:'Venda'};
 for(const patch of [{amount_cents:0},{amount_cents:-1},{amount_cents:1.5},{account_id:'errado'},{description:' '},{kind:'transfer'}])
  assert.throws(()=>validateEntry({...base,...patch}),/inválido/);
});
test('transferência não pode ter origem igual ao destino',()=>{
 const base={amount_cents:50000,establishment_id:a,from_account_id:b,to_account_id:c,description:'Caixa para banco'};
 assert.equal(validateTransfer(base).amount_cents,50000);
 assert.throws(()=>validateTransfer({...base,to_account_id:b}),/inválida/);
});
test('transferência interna não altera receitas, despesas nem saldo consolidado',()=>{
 const entries=[{kind:'income',amount_cents:280000},{kind:'expense',amount_cents:35000}];
 const baseline=consolidate({opening_cents:100000,entries});
 const after=consolidate({opening_cents:100000,entries,transfers:[{amount_cents:50000}]});
 assert.deepEqual(after,baseline);
 assert.deepEqual(after,{opening_cents:100000,income_cents:280000,expense_cents:35000,balance_cents:345000});
});
test('rejeita overflow de centavos',()=>{
 assert.throws(()=>consolidate({opening_cents:Number.MAX_SAFE_INTEGER,entries:[{kind:'income',amount_cents:1}]}),/limite/);
});
