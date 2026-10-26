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
 const fingerprint = createHash('sha256').update(JSON.stringify({kind:'entry',data:input,actor:'euler'})).digest('hex');
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
