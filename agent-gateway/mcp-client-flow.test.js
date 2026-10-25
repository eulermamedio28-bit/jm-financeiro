import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomInt} from 'node:crypto';

test('fluxo MCP completo com cliente simulado e token exclusivamente fictício',async()=>{
 const port=randomInt(28000,39000);
 const token='teste-local-mcp-'.padEnd(64,'z');
 const child=spawn(process.execPath,['server.js'],{
  cwd:new URL('.',import.meta.url),
  env:{...process.env,PORT:String(port),JM_GATEWAY_READ_TOKEN:token},
  stdio:'ignore'
 });
 const base='http://127.0.0.1:'+port;
 const headers={authorization:'Bearer '+token,'content-type':'application/json',accept:'application/json, text/event-stream','mcp-protocol-version':'2025-03-26'};
 const rpc=async(method,params={},id=1)=>{
  const r=await fetch(base+'/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
  assert.equal(r.status,200,method);
  const body=await r.json();
  assert.equal(body.jsonrpc,'2.0');
  assert.equal(body.id,id);
  assert.ok(body.result,JSON.stringify(body.error));
  return body.result;
 };
 try{
  let ready=false;
  for(let i=0;i<50;i++){
   try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready,'Servidor de teste não iniciou');
  const denied=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
  assert.equal(denied.status,401);
  const init=await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'jm-test-client',version:'1.0'}});
  assert.equal(init.protocolVersion,'2025-03-26');
  assert.equal(init.capabilities.tools!==undefined,true);
  const notification=await fetch(base+'/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});
  assert.equal(notification.status,202);
  assert.equal(await notification.text(),'');
  const listed=await rpc('tools/list');
  const expected=['consultar_resumo_ficticio','consultar_mes_ficticio','consultar_categorias_ficticias','comparar_meses_ficticios'];
  assert.deepEqual(listed.tools.map(x=>x.name),expected);
  assert.ok(listed.tools.every(x=>x.inputSchema?.additionalProperties===false));
  const argumentsByName={
   consultar_resumo_ficticio:{},
   consultar_mes_ficticio:{mes:'2026-10'},
   consultar_categorias_ficticias:{mes:'2026-10'},
   comparar_meses_ficticios:{mes_inicial:'2026-09',mes_final:'2026-10'}
  };
  for(const name of expected){
   const result=await rpc('tools/call',{name,arguments:argumentsByName[name]});
   assert.equal(result.isError,false,name);
   assert.equal(result.content.length,1,name);
   assert.equal(result.content[0].type,'text',name);
   const data=JSON.parse(result.content[0].text);
   assert.equal(data.source,'fictional-demo',name);
   assert.match(data.notice,/fict[ií]ci/i,name);
  }
  const unknown=await fetch(base+'/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:9,method:'tools/call',params:{name:'registrar_pagamento',arguments:{}}})});
  assert.equal((await unknown.json()).error.code,-32601);
 }finally{child.kill();}
});
