import {randomUUID} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function prepararCadastroCartoes(pool){await pool.query(`CREATE TABLE IF NOT EXISTS jm_cartoes_financeiros(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES jm_accounts(id),client_request_id uuid NOT NULL,nome text NOT NULL,limite_centavos bigint NOT NULL CHECK(limite_centavos>=0),dia_fechamento integer NOT NULL CHECK(dia_fechamento BETWEEN 1 AND 28),dia_vencimento integer NOT NULL CHECK(dia_vencimento BETWEEN 1 AND 31),UNIQUE(account_id,client_request_id),UNIQUE(account_id,nome))`);}
export function cadastroCartoes(pool){return {
 async listar(accountId){return (await pool.query('SELECT * FROM jm_cartoes_financeiros WHERE account_id=$1::uuid ORDER BY nome',[accountId])).rows;},
 async criar(accountId,v){
  if(!uuid.test(v?.client_request_id||'')||typeof v.nome!=='string'||!v.nome.trim()||v.nome.length>120||!Number.isSafeInteger(v.limite_centavos)||v.limite_centavos<0||v.limite_centavos>100000000000||!Number.isInteger(v.dia_fechamento)||v.dia_fechamento<1||v.dia_fechamento>28||!Number.isInteger(v.dia_vencimento)||v.dia_vencimento<1||v.dia_vencimento>31)throw Error('invalid_card');
  await pool.query('INSERT INTO jm_accounts(id) VALUES($1::uuid) ON CONFLICT DO NOTHING',[accountId]);
  const q=await pool.query(`INSERT INTO jm_cartoes_financeiros(id,account_id,client_request_id,nome,limite_centavos,dia_fechamento,dia_vencimento) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7) ON CONFLICT(account_id,client_request_id) DO NOTHING RETURNING *`,[randomUUID(),accountId,v.client_request_id,v.nome.trim(),v.limite_centavos,v.dia_fechamento,v.dia_vencimento]);
  if(q.rows.length)return {created:true,cartao:q.rows[0]};
  const old=(await pool.query('SELECT * FROM jm_cartoes_financeiros WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[accountId,v.client_request_id])).rows[0];
  if(!old||old.nome!==v.nome.trim()||Number(old.limite_centavos)!==v.limite_centavos||old.dia_fechamento!==v.dia_fechamento||old.dia_vencimento!==v.dia_vencimento)throw Error('idempotency_conflict');
  return {created:false,cartao:old};
 }
};}
