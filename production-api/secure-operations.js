import {authenticatedActor} from './auth-db.js';
import {recordOperation} from './operations.js';

// A identidade nunca vem do corpo da requisição. A camada HTTP deve fornecer
// apenas o bearer token, após impor TLS, limites de tamanho e rate limiting.
export async function authenticatedRecordOperation(pool,{token,kind,input,idempotencyKey}){
 const actor=await authenticatedActor(pool,token);
 return recordOperation(pool,{kind,input,idempotencyKey,actor});
}
export async function authenticatedSummary(pool,{token,establishmentId}){
 await authenticatedActor(pool,token);
 if(typeof establishmentId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(establishmentId)) throw Error('Estabelecimento inválido');
 const result=await pool.query(`SELECT
 COALESCE((SELECT sum(amount_cents) FROM entries WHERE establishment_id=$1 AND kind='income'),0)::text AS income_cents,
 COALESCE((SELECT sum(amount_cents) FROM entries WHERE establishment_id=$1 AND kind='expense'),0)::text AS expense_cents,
 (COALESCE((SELECT sum(opening_cents) FROM accounts WHERE establishment_id=$1),0)
 + COALESCE((SELECT sum(CASE WHEN kind='income' THEN amount_cents ELSE -amount_cents END) FROM entries WHERE establishment_id=$1),0))::text AS balance_cents`,[establishmentId]);
 return result.rows[0];
}
