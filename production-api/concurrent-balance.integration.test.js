import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {recordOperation} from './operations.js';

test('concurrent expenses cannot overdraw same account',async t=>{
 if(!process.env.JM_TEST_DATABASE_URL)return t.skip('PostgreSQL temporário não configurado');
 const pool=new pg.Pool({connectionString:process.env.JM_TEST_DATABASE_URL,options:'-c search_path=concurrent_balance_test',max:5});
 const establishment='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',account='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',category='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 try{
  await pool.query('CREATE SCHEMA IF NOT EXISTS concurrent_balance_test');
  await pool.query(readFileSync(new URL('./migrations/001_initial.sql',import.meta.url),'utf8'));
  await pool.query('INSERT INTO establishments(id,name) VALUES($1,$2)',[establishment,'Teste concorrência']);
  await pool.query('INSERT INTO accounts(id,establishment_id,name,opening_cents) VALUES($1,$2,$3,$4)',[account,establishment,'Caixa',1000]);
  await pool.query('INSERT INTO categories(id,establishment_id,name) VALUES($1,$2,$3)',[category,establishment,'Compras']);
  const run=n=>recordOperation(pool,{kind:'entry',actor:'euler',idempotencyKey:'concurrent_expense_'+n,input:{kind:'expense',amount_cents:700,description:'Despesa '+n,establishment_id:establishment,account_id:account,category_id:category}});
  const results=await Promise.allSettled([run(1),run(2)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected'&&/Saldo insuficiente/.test(r.reason.message)).length,1);
  const total=await pool.query("SELECT COALESCE(sum(amount_cents),0)::int AS spent FROM entries WHERE kind='expense'");
  assert.equal(total.rows[0].spent,700);
 }finally{await pool.end()}
});
