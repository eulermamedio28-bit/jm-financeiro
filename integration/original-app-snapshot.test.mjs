import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectOriginalBackup } from './original-app-snapshot.mjs';
const backup = {app:'JM Financeiro',versao:2,dados:{receitas:[{id:1}],despesas:[],contas:[{}],movimentos:[],categorias:[]}};
test('identifica contrato de exportação do aplicativo original sem acessar dados privados',()=>{
  const result=inspectOriginalBackup(backup);
  assert.equal(result.recordCounts.receitas,1);
  assert.equal(result.remoteSynchronizationEnabled,false);
  assert.equal(result.verifiedByOriginalApp,false);
  assert.equal(JSON.stringify(result).includes('"id"'),false);
});
test('rejeita estrutura inválida',()=>{
  assert.throws(()=>inspectOriginalBackup({app:'JM Financeiro',versao:2,dados:{receitas:[]}}),/Campo obrigatório/);
  assert.throws(()=>inspectOriginalBackup({app:'Outro',versao:2,dados:{}}),/não reconhecido/);
});
