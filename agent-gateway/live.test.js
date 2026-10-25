// Testes de integração externa SEM credenciais; não consulta dados privados.
import test from 'node:test';
import assert from 'node:assert/strict';
const base='https://jm-financeiro-agent-gateway-test.onrender.com';
async function request(path,opts={}){
 const r=await fetch(base+path,{...opts,signal:AbortSignal.timeout(90000)});
 return {status:r.status,body:await r.json()};
}
test('HTTPS: saúde e modo fictício',async()=>{
 const r=await request('/health');
 assert.equal(r.status,200);
 assert.equal(r.body.status,'ok');
 assert.equal(r.body.mode,'fictional-read-only');
 assert.equal(r.body.financialData,false);
 assert.equal(r.body.privateReadConfigured,true);
 assert.equal(r.body.mcpEndpoint,'/mcp');
});
test('HTTPS: consulta privada exige autenticação',async()=>{
 const r=await request('/agent/demo-summary');
 assert.equal(r.status,401);
 assert.equal(r.body.error,'Não autorizado');
});
test('HTTPS: MCP rejeita requisições sem credencial',async()=>{
 const r=await request('/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})});
 assert.equal(r.status,401);
});
test('HTTPS: rotas financeiras reais indisponíveis',async()=>{
 for(const p of ['/accounts','/entries','/transfers','/summary']){
  const r=await request(p);
  assert.equal(r.status,404,p);
 }
});
