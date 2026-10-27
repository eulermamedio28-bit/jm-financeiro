import test from 'node:test';
import assert from 'node:assert/strict';
import {criarRepositorioSnapshots} from './postgres-repository.mjs';

const conta='123e4567-e89b-42d3-a456-426614174000';
const snapshot=()=>({app:'JM Financeiro',versao:2,dados:{receitas:[],despesas:[],contas:[],movimentos:[],categorias:[]}});
test('rejeita conta inválida antes de consultar banco', async()=>{
  let chamadas=0;
  const repo=criarRepositorioSnapshots({query:async()=>{chamadas++;return {rows:[]};}});
  await assert.rejects(repo.consultar('outra-conta'),/Conta/);
  await assert.rejects(repo.salvar('outra-conta',snapshot(),0),/Conta/);
  assert.equal(chamadas,0);
});
test('consulta isolada utiliza parâmetro e retorna ausência',async()=>{
  const chamadas=[];
  const repo=criarRepositorioSnapshots({query:async(...args)=>{chamadas.push(args);return {rows:[]};}});
  assert.equal(await repo.consultar(conta),null);
  assert.deepEqual(chamadas[0][1],[conta]);
});
test('gravação usa parâmetros e detecta conflito de revisão',async()=>{
  const chamadas=[];
  const repo=criarRepositorioSnapshots({query:async(...args)=>{chamadas.push(args);return {rows:[]};}});
  assert.deepEqual(await repo.salvar(conta,snapshot(),0),{conflict:true});
  assert.equal(chamadas.length,2);
  assert.match(chamadas[0][0],/INSERT INTO jm_accounts/);
  assert.deepEqual(chamadas[0][1],[conta]);
  assert.equal(chamadas[1][1][0],conta);
  assert.equal(chamadas[1][1][2],0);
  assert.equal(JSON.parse(chamadas[1][1][1]).app,'JM Financeiro');
});
test('rejeita revisão e backup excessivo antes de gravar',async()=>{
  let chamadas=0;
  const repo=criarRepositorioSnapshots({query:async()=>{chamadas++;return {rows:[]};}});
  await assert.rejects(repo.salvar(conta,snapshot(),-1),/Revisão/);
  const grande=snapshot();
  grande.dados.receitas=[{descricao:'x'.repeat(2_000_001)}];
  await assert.rejects(repo.salvar(conta,grande,0),/limite/);
  assert.equal(chamadas,0);
});
