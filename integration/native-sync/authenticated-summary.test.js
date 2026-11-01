import assert from 'node:assert/strict';
import {parseSummary, loadAuthenticatedSummary} from './authenticated-summary.js';
const a = parseSummary({receitas_centavos:0, despesas_centavos:30001, resultado_centavos:-30001});
assert.equal(a.resultadoCentavos,-30001);
assert.equal(a.saldoContasCentavos,null);
assert.throws(()=>parseSummary({receitas_centavos:0,despesas_centavos:30001,resultado_centavos:0}),/inconsistente/);
assert.equal(parseSummary({receitas_centavos:'0',despesas_centavos:'30001',resultado_centavos:'-30001'}).despesasCentavos,30001);
assert.throws(()=>parseSummary({receitas_centavos:0,despesas_centavos:'30,001',resultado_centavos:-30001}),/inválido/);
assert.throws(()=>parseSummary({receitas_centavos:0,despesas_centavos:'9007199254740993',resultado_centavos:-30001}),/inválido/);
(async()=>{
  await assert.rejects(loadAuthenticatedSummary(''),/Autenticação/);
  const data=await loadAuthenticatedSummary('fake-test-token',async (url,options)=>{
    assert.match(url,/\/v1\/resumo$/);
    assert.equal(options.headers.Authorization,'Bearer fake-test-token');
    return {ok:true,json:async()=>({receitas_centavos:0,despesas_centavos:30001,resultado_centavos:-30001})};
  });
  assert.equal(data.despesasCentavos,30001);
  console.log('Contrato do resumo autenticado validado sem rede nem dados reais.');
})().catch(e=>{console.error(e);process.exitCode=1});
