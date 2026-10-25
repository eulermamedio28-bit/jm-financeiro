import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,createPilotAuth} from './pilot-auth.js';

test('senha forte e salt aleatório',()=>{
 assert.throws(()=>hashPassword('12345'),/Senha/);
 const a=hashPassword('senha-ficticia-muito-forte-123');
 const b=hashPassword('senha-ficticia-muito-forte-123');
 assert.notEqual(a,b);
 assert.match(a,/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
});

test('somente Euler recebe sessão, que expira e pode ser revogada',()=>{
 let now=1000;
 const auth=createPilotAuth({passwordHash:hashPassword('senha-ficticia-muito-forte-123'),clock:()=>now});
 assert.equal(auth.login('silvia','senha-ficticia-muito-forte-123'),null);
 assert.equal(auth.login('euler','senha-errada'),null);
 const session=auth.login('euler','senha-ficticia-muito-forte-123');
 assert.match(session.token,/^[a-f0-9]{64}$/);
 assert.deepEqual(auth.authenticate(session.token),{username:'euler'});
 assert.equal(auth.authenticate('token-errado'),null);
 auth.logout(session.token);
 assert.equal(auth.authenticate(session.token),null);
 const again=auth.login('euler','senha-ficticia-muito-forte-123');
 now+=30*60*1000+1;
 assert.equal(auth.authenticate(again.token),null);
});

test('bloqueio temporário após cinco tentativas erradas',()=>{
 let now=1000;
 const auth=createPilotAuth({passwordHash:hashPassword('senha-ficticia-muito-forte-123'),clock:()=>now});
 for(let i=0;i<5;i++) assert.equal(auth.login('euler','senha-errada'),null);
 assert.equal(auth.login('euler','senha-ficticia-muito-forte-123'),null);
 now+=5*60*1000+1;
 assert.ok(auth.login('euler','senha-ficticia-muito-forte-123'));
});
