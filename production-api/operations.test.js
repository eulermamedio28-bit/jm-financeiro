import test from 'node:test';
import assert from 'node:assert/strict';
import { recordOperation } from './operations.js';

test('rejects unauthorized actor before opening connection', async () => {
  let connected = false;
  const pool = { connect: async () => { connected = true; } };
  await assert.rejects(recordOperation(pool, { actor: 'other', kind: 'entry', idempotencyKey: 'request_123456789', input: {} }), /autorizado/);
  assert.equal(connected, false);
});

test('writes entry and audit in one transaction', async () => {
 const calls = [];
 const pool = { connect: async () => ({
  query: async (sql) => {
   calls.push(sql);
   if (sql.startsWith('SELECT fingerprint')) return {rows: []};
   if (sql.startsWith('INSERT INTO entries')) return {rows: [{id: 'saved'}]};
   return {rows: []};
  },
  release: () => calls.push('released')
 })};
 const input = {
  kind: 'income', amount_cents: 1000, description: 'Venda',
  establishment_id: '11111111-1111-4111-8111-111111111111',
  account_id: '22222222-2222-4222-8222-222222222222',
  category_id: '33333333-3333-4333-8333-333333333333'
 };
 const result = await recordOperation(pool, {kind: 'entry', input, idempotencyKey: 'request_123456789', actor: 'euler'});
 assert.equal(result.id, 'saved');
 assert.ok(calls.includes('BEGIN'));
 assert.ok(calls.some(sql=>sql.includes('FROM accounts WHERE id=$1 AND establishment_id=$2 FOR UPDATE')));
 assert.ok(calls.includes('COMMIT'));
 assert.ok(calls.some(sql => sql.startsWith('INSERT INTO audit')));
 assert.ok(calls.some(sql => sql.startsWith('INSERT INTO request_log')));
 assert.ok(calls.includes('released'));
});

test('rolls back and releases connection when database fails', async () => {
 const calls = [];
 const pool = { connect: async () => ({
  query: async (sql) => {
   calls.push(sql);
   if (sql.startsWith('SELECT fingerprint')) return {rows: []};
   if (sql.includes('AS balance_cents')) return {rows:[{balance_cents:'1000'}]};
   if (sql.startsWith('INSERT INTO entries')) throw Error('database failure');
   return {rows: []};
  },
  release: () => calls.push('released')
 })};
 const input = {
  kind: 'expense', amount_cents: 500, description: 'Energia',
  establishment_id: '11111111-1111-4111-8111-111111111111',
  account_id: '22222222-2222-4222-8222-222222222222',
  category_id: '33333333-3333-4333-8333-333333333333'
 };
 await assert.rejects(recordOperation(pool, {kind: 'entry', input, idempotencyKey: 'request_123456789', actor: 'euler'}), /database failure/);
 assert.ok(calls.includes('ROLLBACK'));
 assert.ok(calls.includes('released'));
 assert.ok(!calls.includes('COMMIT'));
});

test('idempotent replay returns saved response without another insert', async () => {
 const {createHash} = await import('node:crypto');
 const input = {
  kind: 'income', amount_cents: 1200, description: 'Venda',
  establishment_id: '11111111-1111-4111-8111-111111111111',
  account_id: '22222222-2222-4222-8222-222222222222',
  category_id: '33333333-3333-4333-8333-333333333333'
 };
 const {validateEntry} = await import('./ledger.js');
 const fingerprint = createHash('sha256').update(JSON.stringify({kind:'entry',data:validateEntry(input),actor:'euler'})).digest('hex');
 const calls = [];
 const pool = {connect: async () => ({
  query: async (sql) => {
   calls.push(sql);
   if (sql.startsWith('SELECT fingerprint')) return {rows:[{fingerprint,response_json:{id:'existing'}}]};
   return {rows:[]};
  },
  release: () => calls.push('released')
 })};
 const result = await recordOperation(pool,{kind:'entry',input,idempotencyKey:'request_123456789',actor:'euler'});
 assert.equal(result.id,'existing');
 assert.ok(!calls.some(sql=>sql.startsWith('INSERT INTO entries')));
 assert.ok(calls.includes('COMMIT'));
 assert.ok(calls.includes('released'));
});

test('transfer checks source balance before inserting', async () => {
 const calls = [];
 const pool = {connect: async () => ({
  query: async (sql) => {
   calls.push(sql);
   if (sql.startsWith('SELECT fingerprint')) return {rows:[]};
   if (sql.includes('AS balance_cents')) return {rows:[{balance_cents:'1000'}]};
   if (sql.startsWith('SELECT id FROM accounts')) return {rows:[{id:'source'}]};
   return {rows:[]};
  },
  release: () => calls.push('released')
 })};
 const input = {
  amount_cents: 5000, description: 'Caixa para banco',
  establishment_id: '11111111-1111-4111-8111-111111111111',
  from_account_id: '22222222-2222-4222-8222-222222222222',
  to_account_id: '33333333-3333-4333-8333-333333333333'
 };
 await assert.rejects(recordOperation(pool,{kind:'transfer',input,idempotencyKey:'request_123456789',actor:'euler'}),/Saldo insuficiente/);
 assert.ok(!calls.some(sql=>sql.startsWith('INSERT INTO transfers')));
 assert.ok(calls.includes('ROLLBACK'));
});

test('expense exceeding available account balance rolls back without insert',async()=>{
 const calls=[];
 const pool={connect:async()=>({query:async sql=>{
  calls.push(sql);
  if(sql.startsWith('SELECT fingerprint'))return {rows:[]};
  if(sql.includes('AS balance_cents'))return {rows:[{balance_cents:'200'}]};
  return {rows:[]};
 },release:()=>{}})};
 const input={kind:'expense',amount_cents:500,description:'Compra',establishment_id:'11111111-1111-4111-8111-111111111111',account_id:'22222222-2222-4222-8222-222222222222',category_id:'33333333-3333-4333-8333-333333333333'};
 await assert.rejects(recordOperation(pool,{kind:'entry',input,idempotencyKey:'expense_balance_123',actor:'euler'}),/Saldo insuficiente/);
 assert.ok(calls.includes('ROLLBACK'));
 assert.ok(!calls.some(sql=>sql.startsWith('INSERT INTO entries')));
});
