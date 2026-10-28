// Etapa 10: cálculo puro, sem efeitos no banco e sem tratar resultado como saldo bancário.
const MAX=Number.MAX_SAFE_INTEGER;
function centavos(v){if(!Number.isSafeInteger(v)||Math.abs(v)>MAX)throw Error('invalid_amount');return v;}
function calcularSaldos({contas,lancamentos=[],transferencias=[]}){
 if(!Array.isArray(contas)||!Array.isArray(lancamentos)||!Array.isArray(transferencias))throw Error('invalid_input');
 const saldos=new Map();
 for(const c of contas){
  if(typeof c.id!=='string'||!c.id.trim()||saldos.has(c.id))throw Error('invalid_account');
  saldos.set(c.id,centavos(c.saldo_inicial_centavos));
 }
 let receitas=0,despesas=0;
 function somar(id,v){if(!saldos.has(id))throw Error('unknown_account');saldos.set(id,centavos(saldos.get(id)+v));}
 for(const l of lancamentos){
  const v=centavos(l.valor_centavos);if(v<=0)throw Error('invalid_amount');
  if(l.tipo==='receita'){somar(l.conta_id,v);receitas=centavos(receitas+v);}
  else if(l.tipo==='despesa'){somar(l.conta_id,-v);despesas=centavos(despesas+v);}
  else throw Error('invalid_type');
 }
 for(const t of transferencias){
  const v=centavos(t.valor_centavos);
  if(v<=0||t.origem_id===t.destino_id)throw Error('invalid_transfer');
  if(!saldos.has(t.origem_id)||!saldos.has(t.destino_id))throw Error('unknown_account');
  somar(t.origem_id,-v);somar(t.destino_id,v);
 }
 const saldo_consolidado_centavos=centavos([...saldos.values()].reduce((a,b)=>centavos(a+b),0));
 return Object.freeze({saldos_por_conta:[...saldos].map(([conta_id,saldo_centavos])=>({conta_id,saldo_centavos})),saldo_consolidado_centavos,receitas_centavos:receitas,despesas_centavos:despesas,resultado_centavos:centavos(receitas-despesas)});
}
export {calcularSaldos};
