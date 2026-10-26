import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {hashPassword} from './auth-core.js';
import {login,logout} from './auth-db.js';
import {authenticatedRecordOperation,authenticatedSummary} from './secure-operations.js';

test('authenticated financial API: deny unauthenticated, write as Euler, revoke access',async t=>{
 if(!process.env.JM_TEST_DATABASE_URL) return t.skip('Temporary PostgreSQL not configured');
 const pool=new pg.Pool({connectionString:process.env.JM_TEST_DATABASE_URL,options:'-c search_path=secure_operations_test'});
 const establishment='11111111-1111-4111-8111-111111111111';
 const account='22222222-2222-4222-8222-222222222222';
 const category='33333333-3333-4333-8333-333333333333';
 try{
  await pool.query('CREATE SCHEMA IF NOT EXISTS secure_operations_test');
  await pool.query(readFileSync(new URL('./migrations/001_initial.sql',import.meta.url),'utf8'));
  await pool.query(readFileSync(new URL('./migrations/002_auth.sql',import.meta.url),'utf8'));
  await pool.query('INSERT INTO auth_users(username,password_hash) VALUES($1,$2)',['euler',hashPassword('SenhaLongaDeTeste2026')]);
  await pool.query('INSERT INTO establishments(id,name) VALUES($1,$2)',[establishment,'JM teste']);
  await pool.query('INSERT INTO accounts(id,establishment_id,name,opening_cents) VALUES($1,$2,$3,$4)',[account,establishment,'Caixa',10000]);
  await pool.query('INSERT INTO categories(id,establishment_id,name) VALUES($1,$2,$3)',[category,establishment,'Vendas']);
  const request={kind:'entry',idempotencyKey:'secure_operation_123456',
   input:{kind:'income',establishment_id:establishment,account_id:account,category_id:category,description:'Venda teste',amount_cents:2800}};
  await assert.rejects(authenticatedRecordOperation(pool,{...request,token:'not-a-session'}),/Token inválido/);
  const session=await login(pool,{username:'euler',password:'SenhaLongaDeTeste2026'});
  const entry=await authenticatedRecordOperation(pool,{...request,token:session.token});
  assert.ok(entry.id);
  const summary=await authenticatedSummary(pool,{token:session.token,establishmentId:establishment});
  assert.equal(summary.income_cents,'2800');
  assert.equal(summary.balance_cents,'12800');
  await logout(pool,session.token);
  await assert.rejects(authenticatedRecordOperation(pool,{...request,token:session.token}),/Sessão inválida/);
 }finally{await pool.end()}
});
