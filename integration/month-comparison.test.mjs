import test from 'node:test';import assert from 'node:assert/strict';
import {previousMonthPeriod,monthComparison} from './month-comparison.mjs';
test('monthly comparison handles full months, partial days, leap years and January',()=>{
 for(const [from,to,expected]of [
 ['2026-11-01','2026-11-30',{from:'2026-10-01',to:'2026-10-31'}],
 ['2026-11-01','2026-11-10',{from:'2026-10-01',to:'2026-10-10'}],
 ['2026-03-01','2026-03-31',{from:'2026-02-01',to:'2026-02-28'}],
 ['2024-03-30','2024-03-31',{from:'2024-02-29',to:'2024-02-29'}],
 ['2026-01-01','2026-01-01',{from:'2025-12-01',to:'2025-12-01'}]
 ])assert.deepEqual(previousMonthPeriod(from,to),expected);
 assert.equal(previousMonthPeriod('2026-01-01','2026-11-30'),null);
 assert.equal(previousMonthPeriod('0001-01-01','0001-01-31'),null);
 assert.throws(()=>previousMonthPeriod('2026-02-30','2026-03-01'),/invalid_period/);
});
test('comparison follows cash entries without counting transfers or unpaid card purchases',()=>{
 const data={contas:[{id:'a',saldo_inicial_centavos:1000},{id:'b',saldo_inicial_centavos:0}],lancamentos:[
 {tipo:'receita',valor_centavos:10000,data:'2026-10-01',conta_id:'a'},
 {tipo:'despesa',valor_centavos:12000,data:'2026-10-02',conta_id:'a'},
 {tipo:'receita',valor_centavos:15000,data:'2026-11-01',conta_id:'a'},
 {tipo:'despesa',valor_centavos:3000,data:'2026-11-02',conta_id:'a'},
 {tipo:'receita',valor_centavos:99999,data:'2026-10-20',conta_id:'a'}],
 transferencias:[{origem_id:'a',destino_id:'b',valor_centavos:500,data:'2026-11-01'}],compras:[{cartao:'Cartão',vencimento:'2026-11-20',valor_centavos:90000}]};
 const original=JSON.stringify(data),c=monthComparison(data,'2026-11-01','2026-11-10');
 assert.deepEqual(c.metrics,[{key:'receitas',current:15000,previous:10000,difference:5000,percent:50},{key:'despesas',current:3000,previous:12000,difference:-9000,percent:-75},{key:'resultado',current:12000,previous:-2000,difference:14000,percent:null}]);assert.equal(JSON.stringify(data),original);
});
test('empty periods and zero baseline have no fabricated percentage',()=>{
 const c=monthComparison({lancamentos:[{tipo:'receita',valor_centavos:100,data:'2026-11-01'}]},'2026-11-01','2026-11-30');
 assert.equal(c.hasPreviousEntries,false);assert.equal(c.metrics[0].percent,null);
 assert.equal(monthComparison({},'2026-10-01','2026-11-30'),null);
});
