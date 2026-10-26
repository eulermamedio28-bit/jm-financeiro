import {randomUUID,createHash} from 'node:crypto';
import {validateEntry,validateTransfer,validUuid} from './ledger.js';

// Adaptador transacional para pg.Client/pg.Pool. Não cria conexão, não expõe HTTP.
// actor é obtido exclusivamente da camada autenticada, nunca do JSON do usuário.
export async function recordOperation(pool,{kind,input,idempotencyKey,actor}) {
 if (!pool || typeof pool.connect !== 'function') throw new Error('Banco indisponível');
 if (typeof actor !== 'string' || actor !== 'euler') throw new Error('Usuário não autorizado');
 if (typeof idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{12,128}$/.test(idempotencyKey)) throw new Error('Chave de idempotência inválida');
 if (!['entry','transfer'].includes(kind)) throw new Error('Operação desconhecida');
 const data=kind==='entry'?validateEntry(input):validateTransfer(input);
 const fingerprint=createHash('sha256').update(JSON.stringify({kind,data,actor})).digest('hex');
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  // Advisory lock de transação impede corrida para a mesma chave antes do SELECT.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[idempotencyKey]);
  const previous=await client.query('SELECT fingerprint,response_json FROM request_log WHERE idempotency_key=$1',[idempotencyKey]);
  if(previous.rows.length) {
   if(previous.rows[0].fingerprint!==fingerprint) throw new Error('Chave já usada para outra operação');
   await client.query('COMMIT');
   return previous.rows[0].response_json;
  }
  const id=randomUUID();
  let result;
  if(kind==='entry'){
   const q=await client.query(`INSERT INTO entries(id,establishment_id,kind,account_id,category_id,description,amount_cents)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,establishment_id,kind,account_id,category_id,description,amount_cents,created_at`,
    [id,data.establishment_id,data.kind,data.account_id,data.category_id,data.description,data.amount_cents]);
   result=q.rows[0];
  }else{
   // Serializa movimentações concorrentes na mesma origem; não permite saldo negativo.
   await client.query('SELECT id FROM accounts WHERE id=$1 AND establishment_id=$2 FOR UPDATE',[data.from_account_id,data.establishment_id]);
   const balance=await client.query(`SELECT a.opening_cents
    + COALESCE((SELECT SUM(CASE WHEN e.kind='income' THEN e.amount_cents ELSE -e.amount_cents END) FROM entries e WHERE e.account_id=a.id),0)
    + COALESCE((SELECT SUM(t.amount_cents) FROM transfers t WHERE t.to_account_id=a.id),0)
    - COALESCE((SELECT SUM(t.amount_cents) FROM transfers t WHERE t.from_account_id=a.id),0) AS balance_cents
    FROM accounts a WHERE a.id=$1 AND a.establishment_id=$2`,[data.from_account_id,data.establishment_id]);
   if(!balance.rows.length || BigInt(balance.rows[0].balance_cents)<BigInt(data.amount_cents)) throw new Error('Saldo insuficiente ou conta inexistente');
   const q=await client.query(`INSERT INTO transfers(id,establishment_id,from_account_id,to_account_id,description,amount_cents)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,establishment_id,from_account_id,to_account_id,description,amount_cents,created_at`,
    [id,data.establishment_id,data.from_account_id,data.to_account_id,data.description,data.amount_cents]);
   result=q.rows[0];
  }
  await client.query('INSERT INTO audit(id,actor,action,record_id,establishment_id) VALUES($1,$2,$3,$4,$5)',
   [randomUUID(),actor,kind,result.id,data.establishment_id]);
  await client.query('INSERT INTO request_log(idempotency_key,fingerprint,response_json) VALUES($1,$2,$3::jsonb)',
   [idempotencyKey,fingerprint,JSON.stringify(result)]);
  await client.query('COMMIT');
  return result;
 }catch(error){
  try{await client.query('ROLLBACK');}catch{}
  throw error;
 }finally{client.release();}
}
