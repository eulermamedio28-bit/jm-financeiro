import test from 'node:test';
import assert from 'node:assert/strict';
import { recordOperation } from './operations.js';

test('rejects unauthorized actor before opening connection', async () => {
  let connected = false;
  const pool = { connect: async () => { connected = true; } };
  await assert.rejects(recordOperation(pool, { actor: 'other', kind: 'entry', idempotencyKey: 'request_123456789', input: {} }), /autorizado/);
  assert.equal(connected, false);
});
