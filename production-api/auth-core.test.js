import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,newSession,sessionDigest,sessionIsActive} from './auth-core.js';

test('password hash uses random salt and verifies securely',()=>{
 const first=hashPassword('SenhaDeTesteMuitoForte_2026');
 const second=hashPassword('SenhaDeTesteMuitoForte_2026');
 assert.notEqual(first,second);
 assert.equal(verifyPassword('SenhaDeTesteMuitoForte_2026',first),true);
 assert.equal(verifyPassword('SenhaErradaMuitoForte_2026',first),false);
 assert.equal(verifyPassword('x','bad-hash'),false);
});
test('rejects weak password and unauthorized user',()=>{
 assert.throws(()=>hashPassword('curta'),/inválida/);
 assert.throws(()=>newSession({username:'silvia'}),/autorizado/);
});
test('session stores digest, not raw token, and expires',()=>{
 const session=newSession({username:'euler',now:100000,ttlMs:1000});
 assert.match(session.token,/^[0-9a-f]{64}$/);
 assert.notEqual(session.token,session.digest);
 assert.equal(sessionDigest(session.token),session.digest);
 assert.equal(sessionIsActive({expiresAt:session.expiresAt},100500),true);
 assert.equal(sessionIsActive({expiresAt:session.expiresAt},101000),false);
 assert.equal(sessionIsActive({expiresAt:session.expiresAt,revokedAt:new Date().toISOString()},100500),false);
});
