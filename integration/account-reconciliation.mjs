// Conciliação conservadora: nenhum saldo é apresentado quando a conta não está vinculada inequivocamente.
import {calcularSaldos} from './native-sync/account-balances.js';
const cents=x=>{const n=typeof x==='string'&&/^-?\d+$/.test(x)?Number(x):x;if(!Number.isSafeInteger(n))throw Error('invalid_amount');return n;};
export function conciliarSaldos({contas,lancamentos,transferencias}){
 if(!Array.isArray(contas)||!Array.isArray(lancamentos)||!Array.isArray(transferencias))throw Error('invalid_input');
 const byName=new Map();
 for(const c of contas){
  const nome=typeof c.nome==='string'?c.nome.trim().toLocaleLowerCase('pt-BR'):'';
  if(!nome||byName.has(nome))return {disponivel:false,motivo:'contas_ambiguas'};
  byName.set(nome,c.id);
 }
 const itens=[];
 for(const l of lancamentos){
  const nome=typeof l.conta==='string'?l.conta.trim().toLocaleLowerCase('pt-BR'):'';
  const id=l.conta_id||byName.get(nome);
  if(!id||!contas.some(c=>c.id===id)||!['receita','despesa'].includes(l.tipo))return {disponivel:false,motivo:'lancamentos_sem_conta_conciliada'};
  itens.push({conta_id:id,tipo:l.tipo,valor_centavos:cents(l.valor_centavos)});
 }
 try{
  const saldos=calcularSaldos({contas:contas.map(c=>({id:c.id,saldo_inicial_centavos:cents(c.saldo_inicial_centavos)})),lancamentos:itens,transferencias:transferencias.map(t=>({origem_id:t.origem_id,destino_id:t.destino_id,valor_centavos:cents(t.valor_centavos)}))});
  return {disponivel:true,...saldos};
 }catch{return {disponivel:false,motivo:'dados_inconsistentes'};}
}
