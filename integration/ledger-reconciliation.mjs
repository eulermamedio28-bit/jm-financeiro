// Only account/category corrections. Amount, date and invoice settlement remain immutable.
import {randomUUID} from 'node:crypto';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const nullable=x=>x==null||x===''?null:x;
export async function prepareReconciliation(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_lancamentos_correcoes (
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES jm_accounts(id),
 lancamento_id uuid NOT NULL REFERENCES jm_lancamentos(id),client_request_id uuid NOT NULL,
 anterior jsonb NOT NULL,posterior jsonb NOT NULL,criado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,client_request_id))`);
}
export function validateCorrection(input){
 if(!input||Object.keys(input).some(k=>!['lancamento_id','client_request_id','conta_id','categoria','expected'].includes(k))||!uuid(input.lancamento_id)||!uuid(input.client_request_id)||!uuid(input.conta_id)||typeof input.categoria!=='string'||input.categoria.length>120)throw Error('invalid_correction');
 const e=input.expected;
 if(!e||Object.keys(e).sort().join(',')!=='categoria,conta,conta_id'||(e.conta_id!==null&&!uuid(e.conta_id))||[e.conta,e.categoria].some(v=>v!==null&&(typeof v!=='string'||v.length>120)))throw Error('invalid_correction');
 return {...input,categoria:nullable(input.categoria.trim())};
}
export async function reconcileEntry(pool,accountId,input){
 const v=validateCorrection(input),client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[accountId+'|correction|'+v.client_request_id]);
  const prior=await client.query('SELECT * FROM jm_lancamentos_correcoes WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[accountId,v.client_request_id]);
  if(prior.rows.length){const p=prior.rows[0];if(p.lancamento_id!==v.lancamento_id||p.posterior.conta_id!==v.conta_id||p.posterior.categoria!==v.categoria||JSON.stringify([p.anterior.conta_id,p.anterior.conta,p.anterior.categoria])!==JSON.stringify([v.expected.conta_id,v.expected.conta,v.expected.categoria]))throw Error('idempotency_conflict');await client.query('COMMIT');return {created:false,correcao:p};}
  const result=await client.query('SELECT * FROM jm_lancamentos WHERE account_id=$1::uuid AND id=$2::uuid FOR UPDATE',[accountId,v.lancamento_id]);
  const entry=result.rows[0];if(entry?.excluido_em)throw Error('invalid_entry_state');if(!entry)throw Error('entry_not_found');
  const before={conta_id:nullable(entry.conta_id),conta:nullable(entry.conta),categoria:nullable(entry.categoria)};
  if(JSON.stringify([before.conta_id,before.conta,before.categoria])!==JSON.stringify([v.expected.conta_id,v.expected.conta,v.expected.categoria]))throw Error('stale_entry');
  // Invoice account is also recorded in the payment ledger. Do not silently diverge them.
  const paid=await client.query('SELECT id FROM jm_pagamentos_fatura WHERE account_id=$1::uuid AND lancamento_id=$2::uuid',[accountId,entry.id]);
  if(paid.rows.length)throw Error('invoice_correction_not_supported');
  const linked=await client.query('SELECT nome FROM jm_contas_financeiras WHERE account_id=$1::uuid AND id=$2::uuid FOR KEY SHARE',[accountId,v.conta_id]);
  if(linked.rows.length!==1)throw Error('invalid_account_reference');
  const after={conta_id:v.conta_id,conta:linked.rows[0].nome,categoria:v.categoria};
  await client.query('UPDATE jm_lancamentos SET conta_id=$3::uuid,conta=$4,categoria=$5,versao=versao+1 WHERE account_id=$1::uuid AND id=$2::uuid',[accountId,entry.id,after.conta_id,after.conta,after.categoria]);
  const audit=await client.query('INSERT INTO jm_lancamentos_correcoes(id,account_id,lancamento_id,client_request_id,anterior,posterior) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::jsonb,$6::jsonb) RETURNING *',[randomUUID(),accountId,entry.id,v.client_request_id,JSON.stringify(before),JSON.stringify(after)]);
  await client.query('COMMIT');return {created:true,correcao:audit.rows[0]};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
