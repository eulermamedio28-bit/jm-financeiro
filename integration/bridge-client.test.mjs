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
