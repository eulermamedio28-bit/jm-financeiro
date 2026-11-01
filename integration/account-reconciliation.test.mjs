import assert from 'node:assert/strict';
import {conciliarSaldos} from './account-reconciliation.mjs';
const contas=[{id:'a',nome:'Dinheiro',saldo_inicial_centavos:'10000'},{id:'b',nome:'Nubank',saldo_inicial_centavos:'20000'}];
const lancamentos=[{conta:'Dinheiro',tipo:'receita',valor_centavos:'5000'},{conta:'Nubank',tipo:'despesa',valor_centavos:'3000'}];
const transferencias=[{origem_id:'a',destino_id:'b',valor_centavos:'2000'}];
const result=conciliarSaldos({contas,lancamentos,transferencias});
assert.equal(result.disponivel,true);assert.equal(result.saldo_consolidado_centavos,32000);
assert.equal(result.receitas_centavos,5000);assert.equal(result.despesas_centavos,3000);
assert.deepEqual(result.saldos_por_conta,[{conta_id:'a',saldo_centavos:13000},{conta_id:'b',saldo_centavos:19000}]);
assert.deepEqual(conciliarSaldos({contas,lancamentos:[{...lancamentos[0],conta:'Outra'}],transferencias}).motivo,'lancamentos_sem_conta_conciliada');
assert.equal(conciliarSaldos({contas:[...contas,{id:'c',nome:'dinheiro',saldo_inicial_centavos:0}],lancamentos,transferencias}).disponivel,false);

// Transferência interna muda as contas, nunca o faturamento nem o saldo consolidado.
const semTransferencia=conciliarSaldos({contas,lancamentos,transferencias:[]});
assert.equal(semTransferencia.disponivel,true);
assert.equal(semTransferencia.saldo_consolidado_centavos,result.saldo_consolidado_centavos);
assert.equal(semTransferencia.receitas_centavos,result.receitas_centavos);
assert.equal(semTransferencia.despesas_centavos,result.despesas_centavos);
assert.deepEqual(semTransferencia.saldos_por_conta,[{conta_id:'a',saldo_centavos:15000},{conta_id:'b',saldo_centavos:17000}]);
// Vínculo por UUID tem precedência sobre um nome legado divergente.
const comId=conciliarSaldos({contas,lancamentos:[{conta_id:'a',conta:'Nome antigo',tipo:'receita',valor_centavos:'5000'}],transferencias:[]});
assert.equal(comId.disponivel,true);
assert.equal(comId.saldo_consolidado_centavos,35000);
// Não publicar saldo quando há conta vinculada a um identificador desconhecido.
assert.equal(conciliarSaldos({contas,lancamentos:[{conta_id:'desconhecida',tipo:'despesa',valor_centavos:'100'}],transferencias:[]}).disponivel,false);

console.log('Conciliação conservadora e invariância de transferências validadas');
