import test from 'node:test';import assert from 'node:assert/strict';import {criarPortaoDeAcesso} from './login-gate.mjs';
test('não inicializa painel antes do login',async()=>{
 let loads=0;const gate=criarPortaoDeAcesso({autenticar:async()=>({userId:'u1'}),inicializarPainel:async()=>{loads++},encerrarPainel:async()=>{}});
 assert.equal(loads,0);assert.equal(gate.status,'locked');await gate.entrar('a','b');assert.equal(loads,1);assert.equal(gate.status,'unlocked');await gate.bloquear();assert.equal(gate.status,'locked');
});
test('falha de autenticação nunca inicializa painel',async()=>{
 let loads=0;const gate=criarPortaoDeAcesso({autenticar:async()=>{throw Error('denied')},inicializarPainel:async()=>{loads++},encerrarPainel:async()=>{}});
 await assert.rejects(gate.entrar('a','bad'));assert.equal(loads,0);assert.equal(gate.status,'locked');
});
test('logout durante login pendente não abre painel',async()=>{
 let resolve;let loads=0;const pending=new Promise(r=>resolve=r);
 const gate=criarPortaoDeAcesso({autenticar:async()=>pending,inicializarPainel:async()=>{loads++},encerrarPainel:async()=>{}});
 const attempt=gate.entrar('a','b');await gate.bloquear();resolve({userId:'u1'});assert.equal(await attempt,false);assert.equal(loads,0);
});
