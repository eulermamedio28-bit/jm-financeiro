import test from 'node:test';
import assert from 'node:assert/strict';
import { validarSnapshot, resumoLocal } from './snapshot-readonly.mjs';
import { criarClientePonte } from './bridge-client.mjs';

const vazio = () => ({app:'JM Financeiro',versao:2,dados:{receitas:[],despesas:[],contas:[],movimentos:[],categorias:[]}});
test('valida o formato do backup original', () => {
  assert.equal(validarSnapshot(vazio()).receitas.length,0);
  assert.equal(resumoLocal(vazio()).quantidadeMovimentos,0);
  assert.throws(()=>validarSnapshot({}),/Formato/);
  assert.throws(()=>validarSnapshot({...vazio(),dados:{}}),/Campo/);
});
test('recusa endpoints inseguros e credencial ausente', async () => {
  assert.throws(()=>criarClientePonte({endpoint:'http://example.com',obterToken:()=>''}),/HTTPS/);
  const cliente=criarClientePonte({endpoint:'https://example.com',obterToken:()=>''});
  await assert.rejects(cliente.consultarStatus(),/Credencial/);
});
test('não transmite sem autorização explícita e usa bearer apenas em HTTPS', async () => {
  let chamadas=0;
  const cliente=criarClientePonte({
    endpoint:'https://example.com',
    obterToken:async()=> 'token-de-teste-com-mais-de-16-caracteres',
    fetchImpl:async (url,options)=>{
      chamadas++;
      assert.equal(url,'https://example.com/v1/sync/status');
      assert.equal(options.headers.Authorization,'Bearer token-de-teste-com-mais-de-16-caracteres');
      assert.equal(options.redirect,'error');
      return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({status:'ok'})};
    }
  });
  assert.equal(chamadas,0);
  assert.deepEqual(await cliente.consultarStatus(),{status:'ok'});
  assert.equal(chamadas,1);
});

test('bloqueia caminho inesperado, credencial com quebra de linha e backup excessivo', async () => {
  assert.throws(()=>criarClientePonte({endpoint:'https://example.com/outro',obterToken:()=> 'a'.repeat(32)}),/HTTPS/);
  let chamadas=0;
  const cliente=criarClientePonte({
    endpoint:'https://example.com',
    obterToken:()=> 'credencial-invalida' + String.fromCharCode(10) + 'com-mais-de-16',
    fetchImpl:async()=>{chamadas++;throw new Error('Não deveria conectar');}
  });
  await assert.rejects(cliente.consultarStatus(),/Credencial/);
  assert.equal(chamadas,0);
  const grande=vazio();
  grande.dados.receitas=[{desc:'x'.repeat(2_000_001)}];
  assert.throws(()=>cliente.enviarSnapshot(grande,0),/limite/);
  assert.equal(chamadas,0);
});


test('envio exige revisão e inclui expectedRevision no corpo',async()=>{
  const backup=vazio();
  let chamadas=0;
  const cliente=criarClientePonte({
    endpoint:'https://example.com',
    obterToken:()=> 'token-valido-de-teste-123456789',
    fetchImpl:async (url,options)=>{
      chamadas++;
      assert.equal(url,'https://example.com/v1/sync');
      assert.equal(options.method,'POST');
      const body=JSON.parse(options.body);
      assert.equal(body.expectedRevision,0);
      assert.equal(body.schemaVersion,2);
      assert.deepEqual(body.snapshot,backup);
      return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({revision:1})};
    }
  });
  assert.throws(()=>cliente.enviarSnapshot(backup),/Revisão/);
  assert.throws(()=>cliente.enviarSnapshot(backup,-1),/Revisão/);
  assert.equal(chamadas,0);
  assert.deepEqual(await cliente.enviarSnapshot(backup,0),{revision:1});
  assert.equal(chamadas,1);
});

test('limite de 2 MB considera bytes UTF-8 e não apenas caracteres',()=>{
  let chamadas=0;
  const cliente=criarClientePonte({
    endpoint:'https://example.com',
    obterToken:()=> 'credencial-valida-de-teste',
    fetchImpl:async()=>{chamadas++;throw new Error('Envio indevido');}
  });
  const comAcentos=vazio();
  comAcentos.dados.receitas=[{descricao:'á'.repeat(1_100_000)}];
  assert.throws(()=>cliente.enviarSnapshot(comAcentos,0),/limite/);
  assert.equal(chamadas,0);
});

test('consulta remota é explícita e não altera dados locais',async()=>{
  const local=vazio();
  let chamadas=0;
  const cliente=criarClientePonte({
    endpoint:'https://example.com',
    obterToken:()=> 'credencial-de-teste-comprida-12345',
    fetchImpl:async (url,options)=>{
      chamadas++;
      assert.equal(url,'https://example.com/v1/sync');
      assert.equal(options.method,'GET');
      assert.equal(options.body,undefined);
      return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({revision:1,payload:vazio()})};
    }
  });
  assert.equal(chamadas,0);
  assert.equal((await cliente.consultarSnapshot()).revision,1);
  assert.deepEqual(local,vazio());
  assert.equal(chamadas,1);
});
