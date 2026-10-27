import test from 'node:test';
import assert from 'node:assert/strict';
import {criarRotasFinanceiras} from './authenticated-routes.mjs';

const conta='123e4567-e89b-42d3-a456-426614174000';
const backup=()=>({app:'JM Financeiro',versao:2,dados:{receitas:[],despesas:[],contas:[],movimentos:[],categorias:[]}});
test('recusa credenciais ausentes ou inválidas',async()=>{
  let chamadas=0;
  const rotas=criarRotasFinanceiras({
    verifyAccessToken:async token=>{if(token!=='valido') throw new Error('invalid');return {accountId:conta};},
    repository:{consultar:async()=>{chamadas++;return null;},salvar:async()=>{chamadas++;return {conflict:false};}}
  });
  assert.equal((await rotas.executar({method:'GET',path:'/v1/sync'})).status,401);
  assert.equal((await rotas.executar({authorization:'Bearer errado',method:'GET',path:'/v1/sync'})).status,401);
  assert.equal(chamadas,0);
});
test('consulta usa conta do token e não do corpo enviado',async()=>{
  const contas=[];
  const rotas=criarRotasFinanceiras({
    verifyAccessToken:async()=>({accountId:conta}),
    repository:{consultar:async id=>{contas.push(id);return {revision:1,payload:backup()};},salvar:async()=>({conflict:false})}
  });
  const resposta=await rotas.executar({authorization:'Bearer valido',method:'GET',path:'/v1/sync',body:{accountId:'outro'}});
  assert.equal(resposta.status,200);
  assert.deepEqual(contas,[conta]);
});
test('conflito de revisão responde 409 e backup inválido responde 400',async()=>{
  let gravacoes=0;
  const rotas=criarRotasFinanceiras({
    verifyAccessToken:async()=>({accountId:conta}),
    repository:{consultar:async()=>null,salvar:async()=>{gravacoes++;return {conflict:true};}}
  });
  const base={authorization:'Bearer valido',method:'POST',path:'/v1/sync'};
  assert.equal((await rotas.executar({...base,body:{expectedRevision:0,snapshot:{}}})).status,400);
  assert.equal(gravacoes,0);
  assert.equal((await rotas.executar({...base,body:{expectedRevision:0,snapshot:backup()}})).status,409);
  assert.equal(gravacoes,1);
});
