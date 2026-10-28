// Etapa 10: contas financeiras por usuário e transferências atômicas e idempotentes.
// Não altera jm_lancamentos e não considera transferências como receita/despesa.
import {randomUUID} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function prepararContasFinanceiras(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_contas_financeiras (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES jm_accounts(id),
 nome text NOT NULL CHECK(length(nome) BETWEEN 1 AND 120),
 saldo_inicial_centavos bigint NOT NULL DEFAULT 0,
 criada_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,id))`);
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_transferencias (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES jm_accounts(id),
 client_request_id uuid NOT NULL,
 origem_id uuid NOT NULL, destino_id uuid NOT NULL,
 valor_centavos bigint NOT NULL CHECK(valor_centavos>0),
 data date NOT NULL, criada_em timestamptz NOT NULL DEFAULT now(),
 CHECK(origem_id<>destino_id), UNIQUE(account_id,client_request_id),
 FOREIGN KEY(account_id,origem_id) REFERENCES jm_contas_financeiras(account_id,id),
 FOREIGN KEY(account_id,destino_id) REFERENCES jm_contas_financeiras(account_id,id))`);
}
export function criarContasFinanceiras(pool){
 return {
 async criar(accountId,{nome,saldo_inicial_centavos=0}={}){
  if(typeof nome!=='string'||!nome.trim()||nome.trim().length>120||!Number.isSafeInteger(saldo_inicial_centavos))throw Error('invalid_account');
  const client=await pool.connect();
  try{await client.query('BEGIN');await client.query('INSERT INTO jm_accounts(id) VALUES($1::uuid) ON CONFLICT DO NOTHING',[accountId]);
   const {rows}=await client.query('INSERT INTO jm_contas_financeiras(id,account_id,nome,saldo_inicial_centavos) VALUES($1::uuid,$2::uuid,$3,$4) RETURNING *',[randomUUID(),accountId,nome.trim(),saldo_inicial_centavos]);await client.query('COMMIT');return rows[0];
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 },
 async listar(accountId){
  const {rows}=await pool.query('SELECT id,nome,saldo_inicial_centavos FROM jm_contas_financeiras WHERE account_id=$1::uuid ORDER BY criada_em,id',[accountId]);return rows;
 },
 async transferir(accountId,input){
  if(!uuid.test(input?.client_request_id||'')||!uuid.test(input?.origem_id||'')||!uuid.test(input?.destino_id||'')||input.origem_id===input.destino_id||!Number.isSafeInteger(input.valor_centavos)||input.valor_centavos<=0||input.valor_centavos>100000000000||typeof input.data!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(input.data)||Number.isNaN(Date.parse(input.data+'T00:00:00Z')))throw Error('invalid_transfer');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const args=[randomUUID(),accountId,input.client_request_id,input.origem_id,input.destino_id,input.valor_centavos,input.data];
   const {rows}=await client.query(`INSERT INTO jm_transferencias(id,account_id,client_request_id,origem_id,destino_id,valor_centavos,data)
   VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7::date)
   ON CONFLICT(account_id,client_request_id) DO NOTHING RETURNING *`,args);
   let transfer=rows[0],created=!!transfer;
   if(!created){
    const old=await client.query('SELECT * FROM jm_transferencias WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[accountId,input.client_request_id]);transfer=old.rows[0];
    if(!transfer||transfer.origem_id!==input.origem_id||transfer.destino_id!==input.destino_id||BigInt(transfer.valor_centavos)!==BigInt(input.valor_centavos)||String(transfer.data).slice(0,10)!==input.data&&!(transfer.data instanceof Date&&transfer.data.toISOString().slice(0,10)===input.data))throw Error('idempotency_conflict');
   }
   await client.query('COMMIT');return {created,transferencia:transfer};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 },
 async listarTransferencias(accountId){
  const {rows}=await pool.query('SELECT * FROM jm_transferencias WHERE account_id=$1::uuid ORDER BY data DESC,criada_em DESC LIMIT 100',[accountId]);return rows;
 }
 };
}
