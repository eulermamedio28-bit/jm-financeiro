import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const html=readFileSync(join(import.meta.dirname,'index.html'),'utf8');
test('demo é independente e sinalizada como fictícia',()=>{
 assert.match(html,/DEMONSTRAÇÃO FICTÍCIA/);
 assert.match(html,/Nenhum dado real/);
 assert.match(html,/Reiniciar demonstração/);
 assert.doesNotMatch(html,/localStorage|sessionStorage|fetch\(|XMLHttpRequest/);
 assert.match(html,/name="viewport"/);
});
test('script embutido tem sintaxe válida',async()=>{
 const { Script }=await import('node:vm');
 const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code);
 assert.doesNotThrow(()=>new Script(code));
});

const login=readFileSync(join(import.meta.dirname,'login.html'),'utf8');
test('interface de login conecta somente ao servidor local',()=>{
 assert.match(login,/Protótipo de interface/);
 assert.match(login,/Ambiente local de testes/);
 assert.match(login,/type="password"[^>]*required/);
 assert.match(login,/Entrar no piloto/);
 assert.match(login,/fetch\('\/pilot\/login'/);
 assert.doesNotMatch(login,/XMLHttpRequest|localStorage|sessionStorage/);
 assert.match(login,/name="viewport"/);
});
test('script da prévia de login tem sintaxe válida',async()=>{
 const {Script}=await import('node:vm');
 const code=login.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code);
 assert.doesNotThrow(()=>new Script(code));
});
