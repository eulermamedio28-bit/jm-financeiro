import {authenticatedActor} from './auth-db.js';
import {validUuid} from './ledger.js';

// All lookup data is scoped to a single establishment, after Euler authentication.
export async function authenticatedCatalog(pool,{token,establishmentId}){
 await authenticatedActor(pool,token);
 if(!validUuid(establishmentId)) throw Error('Estabelecimento inválido');
 const [accounts,categories]=await Promise.all([
  pool.query('SELECT id,name FROM accounts WHERE establishment_id=$1 ORDER BY name,id',[establishmentId]),
  pool.query('SELECT id,name FROM categories WHERE establishment_id=$1 ORDER BY name,id',[establishmentId])
 ]);
 return {accounts:accounts.rows,categories:categories.rows};
}
