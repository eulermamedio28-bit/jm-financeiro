import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {recordOperation} from './operations.js';

test('expense and outgoing transfer compete for same balance safely',async t=>{
 if(!process.env.JM_TEST_DATABASE_URL)return t.skip('PostgreSQL temporário não configurado');
 const pool=new pg.Pool({connectionString:process.env.JM_TEST_DATABASE_URL,options:'-c search_path=expense_transfer_race_test',max:5});
 const establishment='dddddddd-dddd-4ddd-8ddd-dddddddddddd',source='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',destination='ffffffff-ffff-4fff-8fff-ffffffffffff',category='99999999-9999-4999-8999-999999999999';
 try{
  await pool.query('CREATE SCHEMA IF NOT EXISTS expense_transfer_race_test');
  await pool.query(readFileSync(new URL('./migrations/001_initial.sql',import.meta.url),'utf8'));
  await pool.query('INSERT INTO establishments(id,name) VALUES($1,$2)',[establishment,'Concorrência cruzada']);
  await pool.query('INSERT INTO accounts(id,establishment_id,name,opening_cents) VALUES($1,$2,$3,$4),($5,$2,$6,$7)',[source,establishment,'Origem',1000,destination,'Destino',0]);
  await pool.query('INSERT INTO categories(id,establishment_id,name) VALUES($1,$2,$3)',[category,establishment,'Despesa']);
  const expense=recordOperation(pool,{kind:'entry',actor:'euler',idempotencyKey:'race_expense_123456',input:{kind:'expense',amount_cents:700,description:'Compra',establishment_id:establishment,account_id:source,category_id:category}});
  const transfer=recordOperation(pool,{kind:'transfer',actor:'euler',idempotencyKey:'race_transfer_123456',input:{amount_cents:700,establishment_id:establishment,from_account_id:source,to_account_id:destination}});
  const results=await Promise.allSettled([expense,transfer]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected'&&/Saldo insuficiente/.test(r.reason.message)).length,1);
  const entries=await pool.query('SELECT COALESCE(sum(amount_cents),0)::int AS total FROM entries');
  const transfers=await pool.query('SELECT COALESCE(sum(amount_cents),0)::int AS total FROM transfers');
  assert.equal(entries.rows[0].total+transfers.rows[0].total,700);
  const audit=await pool.query('SELECT count(*)::int AS n FROM audit');
  assert.equal(audit.rows[0].n,1);
 }finally{await pool.end()}
});
