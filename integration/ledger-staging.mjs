// Authenticated, idempotent JM Financeiro ledger. Monetary values in integer BRL cents.
import {randomUUID} from 'node:crypto';
const TYPES=new Set(['receita','despesa']);
export async function prepararLancamentos(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_lancamentos (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES jm_accounts(id),
 client_request_id uuid NOT NULL, tipo text NOT NULL CHECK(tipo IN ('receita','despesa')),
 valor_centavos bigint NOT NULL CHECK(valor_centavos>0),
 descricao text NOT NULL, categoria text, conta text, data date NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,client_request_id))`);
 await pool.query('CREATE INDEX IF NOT EXISTS jm_lancamentos_account_data ON jm_lancamentos(account_id,data DESC,criado_em DESC)');
}
export function criarLancamentos(pool){
 return {
 async registrar(accountId,input){
  if(!TYPES.has(input?.tipo)||!Number.isSafeInteger(input.valor_centavos)||input.valor_centavos<=0||input.valor_centavos>100000000000||typeof input.descricao!=='string'||!input.descricao.trim()||input.descricao.length>500||typeof input.client_request_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.client_request_id)||typeof input.data!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.data)||Number.isNaN(Date.parse(input.data+'T00:00:00Z')))throw Error('invalid_entry');
  for(const k of ['categoria','conta'])if(input[k]!=null&&(typeof input[k]!=='string'||input[k].length>120))throw Error('invalid_entry');
  const args=[randomUUID(),accountId,input.client_request_id,input.tipo,input.valor_centavos,input.descricao.trim(),input.categoria||null,input.conta||null,input.data];
  await pool.query('INSERT INTO jm_accounts(id) VALUES($1::uuid) ON CONFLICT DO NOTHING',[accountId]);
  const {rows}=await pool.query(`INSERT INTO jm_lancamentos(id,account_id,client_request_id,tipo,valor_centavos,descricao,categoria,conta,data)
 VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9::date)
 ON CONFLICT(account_id,client_request_id) DO NOTHING RETURNING *`,args);
  if(rows.length)return {created:true,lancamento:rows[0]};
  const existing=await pool.query('SELECT * FROM jm_lancamentos WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[accountId,input.client_request_id]);
  const item=existing.rows[0];if(!item)throw Error('idempotency_lookup_failed');
  if(item.tipo!==input.tipo||Number(item.valor_centavos)!==input.valor_centavos||item.descricao!==input.descricao.trim())throw Error('idempotency_conflict');
  return {created:false,lancamento:item};
 },
 async listar(accountId,limit=50){
  const {rows}=await pool.query('SELECT * FROM jm_lancamentos WHERE account_id=$1::uuid ORDER BY data DESC,criado_em DESC LIMIT $2',[accountId,Math.min(Math.max(limit,1),100)]);
  return rows;
 }
 };
}
