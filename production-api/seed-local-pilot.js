import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import pg from 'pg';
import {hashPassword} from './auth-core.js';
import {assertLocalPilotConfig} from './local-pilot.js';

// Seeds a disposable local database only. Never resets an existing ledger.
export async function seedLocalPilot({databaseUrl=process.env.JM_PILOT_DATABASE_URL,password=process.env.JM_PILOT_PASSWORD}={}){
 assertLocalPilotConfig({databaseUrl});
 if(typeof password!=='string'||password.length<12)throw Error('JM_PILOT_PASSWORD deve ter pelo menos 12 caracteres');
 const pool=new pg.Pool({connectionString:databaseUrl});
 try{
  const tables=await pool.query("SELECT to_regclass('public.establishments') AS establishments");
  if(tables.rows[0].establishments)throw Error('Banco já inicializado; use um banco descartável vazio');
  await pool.query(readFileSync(new URL('./migrations/001_initial.sql',import.meta.url),'utf8'));
  await pool.query(readFileSync(new URL('./migrations/002_auth.sql',import.meta.url),'utf8'));
  await pool.query('BEGIN');
  try{
   await pool.query('INSERT INTO auth_users(username,password_hash) VALUES($1,$2)',['euler',hashPassword(password)]);
   const establishments=[
    ['11111111-1111-4111-8111-111111111111','Restaurante JM — FICTÍCIO'],
    ['22222222-2222-4222-8222-222222222222','Açaí São Carlos — FICTÍCIO']
   ];
   for(const [id,name] of establishments){
    await pool.query('INSERT INTO establishments(id,name) VALUES($1,$2)',[id,name]);
    await pool.query('INSERT INTO accounts(id,establishment_id,name,opening_cents) VALUES(gen_random_uuid(),$1,$2,$3)',[id,'Caixa fictício',100000]);
    await pool.query('INSERT INTO accounts(id,establishment_id,name,opening_cents) VALUES(gen_random_uuid(),$1,$2,$3)',[id,'Banco fictício',50000]);
    await pool.query('INSERT INTO categories(id,establishment_id,name) VALUES(gen_random_uuid(),$1,$2)',[id,'Vendas fictícias']);
    await pool.query('INSERT INTO categories(id,establishment_id,name) VALUES(gen_random_uuid(),$1,$2)',[id,'Compras fictícias']);
   }
   await pool.query('COMMIT');
  }catch(error){await pool.query('ROLLBACK');throw error}
  return {establishments:2,accounts:4,categories:4,realFinancialData:false};
 }finally{await pool.end()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 seedLocalPilot().then(result=>console.log('Piloto fictício criado:',result)).catch(error=>{console.error(error.message);process.exitCode=1});
}
