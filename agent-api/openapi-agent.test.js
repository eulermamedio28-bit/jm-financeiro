import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const spec=readFileSync(new URL('./openapi-agent.yaml',import.meta.url),'utf8');
test('contrato de agente permanece local e experimental',()=>{
 assert.match(spec,/openapi: 3\.1\.0/);
 assert.match(spec,/http:\/\/127\.0\.0\.1:8787/);
 assert.match(spec,/NÃO conectar/);
 assert.doesNotMatch(spec,/https:\/\/[^\s]+/);
});
test('todas as operações de escrita exigem idempotência e confirmação',()=>{
 for(const op of ['criarConta','criarCategoria','registrarLancamento','transferirEntreContas']){
  const pos=spec.indexOf('operationId: '+op);
  assert.ok(pos>=0,op+' ausente');
  const block=spec.slice(pos,spec.indexOf('responses:',pos));
  assert.match(block,/EXIGE confirmação explícita/);
  assert.match(block,/IdempotencyKey/);
 }
});
test('consulta e autenticação estão descritas',()=>{
 for(const op of ['loginPiloto','identificarUsuario','encerrarSessao','listarContas','listarCategorias','consultarResumo','consultarSaldos','listarLancamentos','listarTransferencias','consultarAuditoria']){
  assert.ok(spec.includes('operationId: '+op),op+' ausente');
 }
});
