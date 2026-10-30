// One financial read model. Internal transfers never enter operating results.
export function cents(value) {
 const n=typeof value==='string'&&/^-?\d+$/.test(value)?Number(value):value;
 if(!Number.isSafeInteger(n))throw Error('invalid_money');return n;
}
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export const dateOnly=value=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
const add=(a,b)=>cents(a+b);
export function dashboard({contas=[],lancamentos=[],transferencias=[],compras=[]},from='0001-01-01',to='9999-12-31'){
 if(!validDate(from)||!validDate(to)||from>to)throw Error('invalid_period');
 const inside=d=>dateOnly(d)>=from&&dateOnly(d)<=to;
 let receitas=0,despesas=0;
 for(const l of lancamentos.filter(l=>inside(l.data))){if(!['receita','despesa'].includes(l.tipo))throw Error('invalid_entry');const v=cents(l.valor_centavos);if(v<=0)throw Error('invalid_money');if(l.tipo==='receita')receitas=add(receitas,v);else despesas=add(despesas,v);}
 const balances=contas.map(c=>({...c,inicial:cents(c.saldo_inicial_centavos),abertura:cents(c.saldo_inicial_centavos),saldo:cents(c.saldo_inicial_centavos)}));
 let unallocated=0,unallocatedCount=0;
 for(const l of lancamentos){if(dateOnly(l.data)>to)continue;const v=cents(l.valor_centavos)*(l.tipo==='receita'?1:-1);const c=balances.find(c=>l.conta_id?c.id===l.conta_id:c.nome===l.conta);if(!c){unallocated=add(unallocated,v);unallocatedCount++;continue;}c.saldo=add(c.saldo,v);if(dateOnly(l.data)<from)c.abertura=add(c.abertura,v);}
 for(const t of transferencias){if(dateOnly(t.data)>to)continue;const v=cents(t.valor_centavos),a=balances.find(c=>c.id===t.origem_id),b=balances.find(c=>c.id===t.destino_id);if(!a||!b||a===b||v<=0)throw Error('invalid_transfer');a.saldo=add(a.saldo,-v);b.saldo=add(b.saldo,v);if(dateOnly(t.data)<from){a.abertura=add(a.abertura,-v);b.abertura=add(b.abertura,v);}}
 let saldo=0;for(const c of balances)saldo=add(saldo,c.saldo);
 const invoices=new Map();for(const p of compras){const key=JSON.stringify([p.cartao,dateOnly(p.vencimento)]),v=cents(p.valor_centavos);if(!invoices.has(key))invoices.set(key,{cartao:p.cartao,vencimento:dateOnly(p.vencimento),total:0,pendente:0});const f=invoices.get(key);f.total=add(f.total,v);if(!p.paga_em)f.pendente=add(f.pendente,v);}
 return {from,to,receitas,despesas,resultado:add(receitas,-despesas),contas:balances,saldo,conciliado:unallocatedCount===0,naoAlocado:unallocated,quantidadeNaoAlocados:unallocatedCount,lancamentos:lancamentos.filter(l=>inside(l.data)),transferencias:transferencias.filter(t=>inside(t.data)),faturas:[...invoices.values()].sort((a,b)=>a.vencimento.localeCompare(b.vencimento)),compras};
}
export async function loadDashboard(pool,accountId){
 const client=await pool.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const data={};
  for(const [key,table]of Object.entries({contas:'jm_contas_financeiras',lancamentos:'jm_lancamentos',transferencias:'jm_transferencias',compras:'jm_compras_cartao'})){
   const {rows}=await client.query(`SELECT * FROM ${table} WHERE account_id=$1::uuid`,[accountId]);data[key]=rows;
  }
  await client.query('COMMIT');return data;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
