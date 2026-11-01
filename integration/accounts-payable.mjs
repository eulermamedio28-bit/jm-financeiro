import {randomUUID} from 'node:crypto';
import {validDate,dateOnly} from './financial-dashboard.mjs';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const amount=x=>Number.isSafeInteger(x)&&x>0&&x<=100000000000;
export function monthlyDue(first,offset){if(!validDate(first)||!Number.isInteger(offset)||offset<0||offset>11)throw Error('invalid_payable');const [y,m,d]=first.split('-').map(Number),start=new Date(Date.UTC(y,m-1+offset,1)),last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();const s=start.getUTCFullYear()+'-'+String(start.getUTCMonth()+1).padStart(2,'0')+'-'+String(Math.min(d,last)).padStart(2,'0');if(!validDate(s))throw Error('invalid_payable');return s;}
export async function preparePayables(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_contas_pagar(
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES jm_accounts(id),serie_id uuid NOT NULL,
 descricao text NOT NULL,categoria text NOT NULL DEFAULT '',natureza text NOT NULL CHECK(natureza IN ('fixa','variavel')),
 valor_previsto_centavos bigint NOT NULL CHECK(valor_previsto_centavos>0),vencimento date NOT NULL,
 situacao text NOT NULL DEFAULT 'aberta' CHECK(situacao IN ('aberta','paga','cancelada')),versao integer NOT NULL DEFAULT 0,
 lancamento_id uuid REFERENCES jm_lancamentos(id),valor_pago_centavos bigint,data_pagamento date,
 criado_em timestamptz NOT NULL DEFAULT now(),atualizado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,id),UNIQUE(account_id,serie_id,vencimento),
 CHECK((situacao='paga')=(lancamento_id IS NOT NULL AND valor_pago_centavos IS NOT NULL AND data_pagamento IS NOT NULL)))`);
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_contas_pagar_eventos(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES jm_accounts(id),client_request_id uuid NOT NULL,autor_id uuid NOT NULL,acao text NOT NULL,solicitacao jsonb NOT NULL,anterior jsonb,posterior jsonb NOT NULL,criado_em timestamptz NOT NULL DEFAULT now(),UNIQUE(account_id,client_request_id))`);
 await pool.query('ALTER TABLE jm_lancamentos ADD COLUMN IF NOT EXISTS conta_pagar_id uuid, ADD COLUMN IF NOT EXISTS natureza_despesa text');
 await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS jm_pagamento_conta_ativo ON jm_lancamentos(account_id,conta_pagar_id) WHERE conta_pagar_id IS NOT NULL AND excluido_em IS NULL');
 await pool.query('CREATE INDEX IF NOT EXISTS jm_contas_pagar_vencimento ON jm_contas_pagar(account_id,vencimento,id)');
}
export function validatePayable(v){
 const base=['acao','client_request_id'];if(!v||typeof v!=='object'||!uuid(v.client_request_id)||!['criar','editar','pagar','cancelar','desfazer'].includes(v.acao))throw Error('invalid_payable');
 const fields=v.acao==='criar'?['descricao','categoria','natureza','valor_previsto_centavos','vencimento','repeticoes']:v.acao==='editar'?['id','expected_version','descricao','categoria','natureza','valor_previsto_centavos','vencimento']:v.acao==='pagar'?['id','expected_version','valor_centavos','data_pagamento','conta_id']:['id','expected_version','motivo'];
 if(Object.keys(v).some(k=>![...base,...fields].includes(k))||fields.some(k=>!(k in v)))throw Error('invalid_payable');
 const p={acao:v.acao};for(const key of fields)p[key]=v[key];
 if(v.acao!=='criar'&&(!uuid(v.id)||!Number.isSafeInteger(v.expected_version)||v.expected_version<0))throw Error('invalid_payable');
 if(['criar','editar'].includes(v.acao)){
  if(typeof v.descricao!=='string'||!v.descricao.trim()||v.descricao.length>500||typeof v.categoria!=='string'||v.categoria.length>120||!['fixa','variavel'].includes(v.natureza)||!amount(v.valor_previsto_centavos)||!validDate(v.vencimento))throw Error('invalid_payable');p.descricao=v.descricao.trim();p.categoria=v.categoria.trim();
  if(v.acao==='criar'&&(!Number.isInteger(v.repeticoes)||v.repeticoes<1||v.repeticoes>12))throw Error('invalid_payable');
 }
 if(v.acao==='pagar'&&(!amount(v.valor_centavos)||!validDate(v.data_pagamento)||!uuid(v.conta_id)))throw Error('invalid_payable');
 if(['cancelar','desfazer'].includes(v.acao)&&(typeof v.motivo!=='string'||!v.motivo.trim()||v.motivo.length>300))throw Error('invalid_payable');
 return p;
}
export async function listPayables(pool,actor){const {rows}=await pool.query('SELECT * FROM jm_contas_pagar WHERE account_id=$1::uuid ORDER BY vencimento,id',[actor]);return rows;}
export async function mutatePayable(pool,actor,input){
 const p=validatePayable(input),client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[actor+'|payable|'+input.client_request_id]);
  const prior=(await client.query('SELECT * FROM jm_contas_pagar_eventos WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[actor,input.client_request_id])).rows[0];
  if(prior){if(JSON.stringify(prior.solicitacao,Object.keys(prior.solicitacao).sort())!==JSON.stringify(p,Object.keys(p).sort()))throw Error('idempotency_conflict');await client.query('COMMIT');return {created:false,contas:prior.posterior};}
  let before=null,after=[];
  if(p.acao==='criar'){
   await client.query('INSERT INTO jm_accounts(id) VALUES($1::uuid) ON CONFLICT DO NOTHING',[actor]);const serie=randomUUID();
   for(let i=0;i<p.repeticoes;i++){const {rows}=await client.query('INSERT INTO jm_contas_pagar(id,account_id,serie_id,descricao,categoria,natureza,valor_previsto_centavos,vencimento) VALUES($1,$2,$3,$4,$5,$6,$7,$8::date) RETURNING *',[randomUUID(),actor,serie,p.descricao,p.categoria,p.natureza,p.valor_previsto_centavos,monthlyDue(p.vencimento,i)]);after.push(rows[0]);}
  }else{
   const bill=(await client.query('SELECT * FROM jm_contas_pagar WHERE account_id=$1::uuid AND id=$2::uuid FOR UPDATE',[actor,p.id])).rows[0];if(!bill)throw Error('payable_not_found');if(bill.versao!==p.expected_version)throw Error('stale_payable');before=bill;
   if(p.acao==='desfazer'?bill.situacao!=='paga':bill.situacao!=='aberta')throw Error('invalid_payable_state');
   if(p.acao==='editar')after=(await client.query('UPDATE jm_contas_pagar SET descricao=$3,categoria=$4,natureza=$5,valor_previsto_centavos=$6,vencimento=$7::date,versao=versao+1,atualizado_em=now() WHERE account_id=$1 AND id=$2 RETURNING *',[actor,bill.id,p.descricao,p.categoria,p.natureza,p.valor_previsto_centavos,p.vencimento])).rows;
   if(p.acao==='cancelar')after=(await client.query("UPDATE jm_contas_pagar SET situacao='cancelada',versao=versao+1,atualizado_em=now() WHERE account_id=$1 AND id=$2 RETURNING *",[actor,bill.id])).rows;
   if(p.acao==='pagar'){
    const account=(await client.query('SELECT nome FROM jm_contas_financeiras WHERE account_id=$1 AND id=$2 FOR KEY SHARE',[actor,p.conta_id])).rows[0];if(!account)throw Error('invalid_account_reference');const id=randomUUID();
    await client.query(`INSERT INTO jm_lancamentos(id,account_id,client_request_id,tipo,valor_centavos,descricao,categoria,conta,conta_id,data,conta_pagar_id,natureza_despesa) VALUES($1,$2,$3,'despesa',$4,$5,$6,$7,$8,$9::date,$10,$11)`,[id,actor,randomUUID(),p.valor_centavos,bill.descricao,bill.categoria||null,account.nome,p.conta_id,p.data_pagamento,bill.id,bill.natureza]);
    after=(await client.query("UPDATE jm_contas_pagar SET situacao='paga',lancamento_id=$3,valor_pago_centavos=$4,data_pagamento=$5::date,versao=versao+1,atualizado_em=now() WHERE account_id=$1 AND id=$2 RETURNING *",[actor,bill.id,id,p.valor_centavos,p.data_pagamento])).rows;
   }
   if(p.acao==='desfazer'){
    const entry=(await client.query('SELECT * FROM jm_lancamentos WHERE account_id=$1 AND id=$2 FOR UPDATE',[actor,bill.lancamento_id])).rows[0];if(!entry||entry.excluido_em||entry.conta_pagar_id!==bill.id)throw Error('invalid_payable_state');
    await client.query('UPDATE jm_lancamentos SET excluido_em=now(),excluido_por=$1,versao=versao+1 WHERE account_id=$1 AND id=$2',[actor,entry.id]);
    after=(await client.query("UPDATE jm_contas_pagar SET situacao='aberta',lancamento_id=NULL,valor_pago_centavos=NULL,data_pagamento=NULL,versao=versao+1,atualizado_em=now() WHERE account_id=$1 AND id=$2 RETURNING *",[actor,bill.id])).rows;
   }
  }
  await client.query('INSERT INTO jm_contas_pagar_eventos(id,account_id,client_request_id,autor_id,acao,solicitacao,anterior,posterior) VALUES($1,$2,$3,$2,$4,$5::jsonb,$6::jsonb,$7::jsonb)',[randomUUID(),actor,input.client_request_id,p.acao,JSON.stringify(p),JSON.stringify(before),JSON.stringify(after)]);
  await client.query('COMMIT');return {created:true,contas:after};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
