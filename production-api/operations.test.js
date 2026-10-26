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
