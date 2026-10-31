import {randomUUID} from 'node:crypto';
import {validDate,dateOnly} from './financial-dashboard.mjs';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export async function prepareEntryManagement(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_lancamentos_historico (
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES jm_accounts(id),lancamento_id uuid NOT NULL REFERENCES jm_lancamentos(id),
 client_request_id uuid NOT NULL,acao text NOT NULL CHECK(acao IN ('editar','excluir','restaurar')),
 autor_id uuid NOT NULL,motivo text NOT NULL,solicitacao jsonb NOT NULL,anterior jsonb NOT NULL,posterior jsonb NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT now(),UNIQUE(account_id,client_request_id))`);
}
export function validateEntryChange(v){
 const keys=['lancamento_id','client_request_id','acao','expected_version','motivo','descricao','valor_centavos','data','conta_id','categoria'];
 if(!v||Object.keys(v).some(k=>!keys.includes(k))||!uuid(v.lancamento_id)||!uuid(v.client_request_id)||!['editar','excluir','restaurar'].includes(v.acao)||!Number.isSafeInteger(v.expected_version)||v.expected_version<0||typeof v.motivo!=='string'||!v.motivo.trim()||v.motivo.length>300)throw Error('invalid_entry_change');
 const request={lancamento_id:v.lancamento_id,acao:v.acao,expected_version:v.expected_version,motivo:v.motivo.trim()};
 if(v.acao==='editar'){
  if(typeof v.descricao!=='string'||!v.descricao.trim()||v.descricao.length>500||!Number.isSafeInteger(v.valor_centavos)||v.valor_centavos<=0||v.valor_centavos>100000000000||!validDate(v.data)||!uuid(v.conta_id)||typeof v.categoria!=='string'||v.categoria.length>120)throw Error('invalid_entry_change');
  Object.assign(request,{descricao:v.descricao.trim(),valor_centavos:v.valor_centavos,data:v.data,conta_id:v.conta_id,categoria:v.categoria.trim()||null});
 }else if(['descricao','valor_centavos','data','conta_id','categoria'].some(k=>k in v))throw Error('invalid_entry_change');
 return request;
}
const snapshot=e=>({id:e.id,tipo:e.tipo,descricao:e.descricao,valor_centavos:String(e.valor_centavos),data:dateOnly(e.data),conta_id:e.conta_id||null,conta:e.conta||null,categoria:e.categoria||null,versao:e.versao,excluido_em:e.excluido_em||null,excluido_por:e.excluido_por||null});
export async function changeEntry(pool,actor,input){
 const request=validateEntryChange(input),client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[actor+'|entry-change|'+input.client_request_id]);
  const prior=await client.query('SELECT * FROM jm_lancamentos_historico WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[actor,input.client_request_id]);
  if(prior.rows.length){const old=prior.rows[0];if(Object.keys(request).length!==Object.keys(old.solicitacao).length||Object.entries(request).some(([k,v])=>old.solicitacao[k]!==v))throw Error('idempotency_conflict');await client.query('COMMIT');return {created:false,historico:old};}
  const selected=await client.query('SELECT * FROM jm_lancamentos WHERE account_id=$1::uuid AND id=$2::uuid FOR UPDATE',[actor,request.lancamento_id]);
  const entry=selected.rows[0];if(!entry)throw Error('entry_not_found');
  if(entry.versao!==request.expected_version)throw Error('stale_entry');
  const payment=await client.query('SELECT id FROM jm_pagamentos_fatura WHERE account_id=$1::uuid AND lancamento_id=$2::uuid',[actor,entry.id]);
  // Legacy invoice entries are also protected even when the historical link is absent.
  if(payment.rows.length||/^Pagamento fatura /i.test(entry.descricao)||entry.categoria==='Pagamento de fatura de cartão')throw Error('linked_entry_protected');
  if(request.acao==='restaurar'?!entry.excluido_em:!!entry.excluido_em)throw Error('invalid_entry_state');
  const before=snapshot(entry);let result;
  if(request.acao==='editar'){
   const account=await client.query('SELECT nome FROM jm_contas_financeiras WHERE account_id=$1::uuid AND id=$2::uuid FOR KEY SHARE',[actor,request.conta_id]);if(!account.rows.length)throw Error('invalid_account_reference');
   result=await client.query(`UPDATE jm_lancamentos SET descricao=$3,valor_centavos=$4,data=$5::date,conta_id=$6::uuid,conta=$7,categoria=$8,versao=versao+1 WHERE account_id=$1::uuid AND id=$2::uuid RETURNING *`,[actor,entry.id,request.descricao,request.valor_centavos,request.data,request.conta_id,account.rows[0].nome,request.categoria]);
  }else if(request.acao==='excluir')result=await client.query('UPDATE jm_lancamentos SET excluido_em=now(),excluido_por=$1::uuid,versao=versao+1 WHERE account_id=$1::uuid AND id=$2::uuid RETURNING *',[actor,entry.id]);
  else result=await client.query('UPDATE jm_lancamentos SET excluido_em=NULL,excluido_por=NULL,versao=versao+1 WHERE account_id=$1::uuid AND id=$2::uuid RETURNING *',[actor,entry.id]);
  const after=snapshot(result.rows[0]);
  const audit=await client.query(`INSERT INTO jm_lancamentos_historico(id,account_id,lancamento_id,client_request_id,acao,autor_id,motivo,solicitacao,anterior,posterior) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$2::uuid,$6,$7::jsonb,$8::jsonb,$9::jsonb) RETURNING *`,[randomUUID(),actor,entry.id,input.client_request_id,request.acao,request.motivo,JSON.stringify(request),JSON.stringify(before),JSON.stringify(after)]);
  await client.query('COMMIT');return {created:true,historico:audit.rows[0]};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function entryHistory(pool,actor,id){
 if(!uuid(id))throw Error('invalid_entry_change');
 const entry=await pool.query('SELECT id FROM jm_lancamentos WHERE account_id=$1::uuid AND id=$2::uuid',[actor,id]);if(!entry.rows.length)throw Error('entry_not_found');
 const {rows}=await pool.query(`SELECT id,acao,autor_id,motivo,anterior,posterior,criado_em FROM jm_lancamentos_historico WHERE account_id=$1::uuid AND lancamento_id=$2::uuid
 UNION ALL SELECT id,'conta/categoria' AS acao,account_id AS autor_id,'Correção de conta/categoria' AS motivo,anterior,posterior,criado_em FROM jm_lancamentos_correcoes WHERE account_id=$1::uuid AND lancamento_id=$2::uuid ORDER BY criado_em DESC,id DESC LIMIT 100`,[actor,id]);return rows;
}
