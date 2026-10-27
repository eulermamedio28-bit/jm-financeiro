import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {hashPassword} from './auth-core.js';
import {createFinancialHttpServer} from './http-server.js';

test('HTTP with PostgreSQL: login, income, summary, logout',async t=>{
 if(!process.env.JM_TEST_DATABASE_URL) return t.skip('Temporary PostgreSQL not configured');
 const pool=new pg.Pool({connectionString:process.env.JM_TEST_DATABASE_URL,options:'-c search_path=http_integration_test'});
 const establishment='11111111-1111-4111-8111-111111111111';
 const account='22222222-2222-4222-8222-222222222222';
 const category='33333333-3333-4333-8333-333333333333';
 let server;
 try{
  await pool.query('CREATE SCHEMA IF NOT EXISTS http_integration_test');
  await pool.query(readFileSync(new URL('./migrations/001_initial.sql',import.meta.url),'utf8'));
  await pool.query(readFileSync(new URL('./migrations/002_auth.sql',import.meta.url),'utf8'));
  await pool.query('INSERT INTO auth_users(username,password_hash) VALUES($1,$2)',['euler',hashPassword('SenhaLongaHTTPTeste2026')]);
  await pool.query('INSERT INTO establishments(id,name) VALUES($1,$2)',[establishment,'JM teste']);
  await pool.query('INSERT INTO accounts(id,establishment_id,name,opening_cents) VALUES($1,$2,$3,$4)',[account,establishment,'Caixa',10000]);
  await pool.query('INSERT INTO categories(id,establishment_id,name) VALUES($1,$2,$3)',[category,establishment,'Vendas']);
  server=createFinancialHttpServer(pool);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'euler',password:'SenhaLongaHTTPTeste2026'})});
  assert.equal(login.status,200);
  const {token}=await login.json();
  const headers={'authorization':'Bearer '+token,'content-type':'application/json','idempotency-key':'http_integration_123456'};
  const operation={kind:'entry',input:{kind:'income',establishment_id:establishment,account_id:account,category_id:category,description:'Venda teste',amount_cents:2800}};
  const created=await fetch(base+'/api/operations',{method:'POST',headers,body:JSON.stringify(operation)});
  assert.equal(created.status,201);
  const establishments=await fetch(base+'/api/establishments',{headers});
  assert.equal(establishments.status,200);
  assert.equal((await establishments.json()).establishments[0].name,'JM teste');
  const catalog=await fetch(base+'/api/catalog?establishmentId='+establishment,{headers});
  assert.equal(catalog.status,200);
  const lists=await catalog.json();
  assert.equal(lists.accounts[0].name,'Caixa');
  assert.equal(lists.categories[0].name,'Vendas');
  const summary=await fetch(base+'/api/summary?establishmentId='+establishment,{headers});
  assert.equal(summary.status,200);
  const totals=await summary.json();
  assert.equal(totals.income_cents,'2800');
  assert.equal(totals.balance_cents,'12800');
  const logout=await fetch(base+'/api/logout',{method:'POST',headers});
  assert.equal(logout.status,200);
  const denied=await fetch(base+'/api/summary?establishmentId='+establishment,{headers});
  assert.equal(denied.status,401);
 }finally{
  if(server) await new Promise(resolve=>server.close(resolve));
  await pool.end();
 }
});
