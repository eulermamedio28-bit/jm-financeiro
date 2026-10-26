import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {recordOperation} from './operations.js';

test('PostgreSQL real: migração, lançamento e idempotência', async t => {
 if (!process.env.JM_TEST_DATABASE_URL) return t.skip('PostgreSQL temporário não configurado');
 const pool = new pg.Pool({connectionString:process.env.JM_TEST_DATABASE_URL});
 const establishment='11111111-1111-4111-8111-111111111111';
 const account='22222222-2222-4222-8222-222222222222';
 const category='33333333-3333-4333-8333-333333333333';
 try {
  await pool.query(readFileSync(new URL('./migrations/001_initial.sql',import.meta.url),'utf8'));
  await pool.query('INSERT INTO establishments(id,name) VALUES($1,$2)',[establishment,'Teste isolado']);
  await pool.query('INSERT INTO accounts(id,establishment_id,name,opening_cents) VALUES($1,$2,$3,$4)',[account,establishment,'Caixa',100000]);
  await pool.query('INSERT INTO categories(id,establishment_id,name) VALUES($1,$2,$3)',[category,establishment,'Vendas']);
  const operation={kind:'entry',actor:'euler',idempotencyKey:'integration_123456789',
   input:{establishment_id:establishment,account_id:account,category_id:category,kind:'income',description:'Venda de teste',amount_cents:28000}};
  const first=await recordOperation(pool,operation);
  const repeated=await recordOperation(pool,operation);
  assert.equal(first.id,repeated.id);
  const count=await pool.query('SELECT count(*)::int AS n FROM entries');
  assert.equal(count.rows[0].n,1);
  const audit=await pool.query('SELECT count(*)::int AS n FROM audit');
  assert.equal(audit.rows[0].n,1);
  const other='44444444-4444-4444-8444-444444444444';
  await pool.query('INSERT INTO establishments(id,name) VALUES($1,$2)',[other,'Outro estabelecimento']);
  await assert.rejects(pool.query('INSERT INTO entries(id,establishment_id,kind,account_id,category_id,description,amount_cents) VALUES($1,$2,$3,$4,$5,$6,$7)',
   ['55555555-5555-4555-8555-555555555555',other,'income',account,category,'Não permitido',100]),/foreign key/i);
 } finally {await pool.end();}
});
