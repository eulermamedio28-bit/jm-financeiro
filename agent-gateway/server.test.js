import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
test('gateway publica apenas diagnóstico, sem API financeira',async()=>{
 const port=19000+Math.floor(Math.random()*1000);
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<30;i++){
   try{const r=await fetch('http://127.0.0.1:'+port+'/health');if(r.ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready,'Gateway não iniciou');
  const h=await fetch('http://127.0.0.1:'+port+'/health');
  assert.equal((await h.json()).financialData,false);
  assert.equal((await fetch('http://127.0.0.1:'+port+'/agent/demo-summary')).status,503);
  for(const path of ['/summary','/accounts','/entries','/transfers','/auth/login','/pilot']){
   const r=await fetch('http://127.0.0.1:'+port+path);
   assert.equal(r.status,404,path+' não pode estar exposto');
  }
  const post=await fetch('http://127.0.0.1:'+port+'/entries',{method:'POST'});
  assert.equal(post.status,404);
 }finally{child.kill();}
});

test('consulta fictícia exige token válido e não expõe rotas de escrita',async()=>{
 const port=20000+Math.floor(Math.random()*1000);
 const token='token-ficticio-'.padEnd(64,'x');
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),JM_GATEWAY_READ_TOKEN:token},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<30;i++){
   try{const r=await fetch('http://127.0.0.1:'+port+'/health');if(r.ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready);
  const url='http://127.0.0.1:'+port+'/agent/demo-summary';
  assert.equal((await fetch(url)).status,401);
  assert.equal((await fetch('http://127.0.0.1:'+port+'/mcp',{method:'POST'})).status,401);
  assert.equal((await fetch(url,{headers:{authorization:'Bearer errado'}})).status,401);
  const r=await fetch(url,{headers:{authorization:'Bearer '+token}});
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.source,'fictional-demo');
  assert.equal(body.balance_cents,111000);
  assert.equal((await fetch(url,{method:'POST',headers:{authorization:'Bearer '+token}})).status,404);
  assert.equal((await fetch('http://127.0.0.1:'+port+'/entries',{method:'POST',headers:{authorization:'Bearer '+token}})).status,404);
 }finally{child.kill();}
});

test('MCP oferece somente consulta fictícia e rejeita ferramenta desconhecida',async()=>{
 const port=22000+Math.floor(Math.random()*1000);
 const token='token-mcp-ficticio-'.padEnd(64,'z');
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),JM_GATEWAY_READ_TOKEN:token},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<30;i++){
   try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready);
  const call=async(method,params)=>fetch('http://127.0.0.1:'+port+'/mcp',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  const list=await (await call('tools/list',{})).json();
  assert.deepEqual(list.result.tools.map(x=>x.name),['consultar_resumo_ficticio','consultar_mes_ficticio']);
  const month=await (await call('tools/call',{name:'consultar_mes_ficticio',arguments:{mes:'2026-10'}})).json();
  assert.equal(JSON.parse(month.result.content[0].text).balance_cents,111000);
  const invalidMonth=await (await call('tools/call',{name:'consultar_mes_ficticio',arguments:{mes:'2026-11'}})).json();
  assert.equal(invalidMonth.error.code,-32602);
  const missingMonth=await (await call('tools/call',{name:'consultar_mes_ficticio',arguments:{}})).json();
  assert.equal(missingMonth.error.code,-32602);
  const good=await (await call('tools/call',{name:'consultar_resumo_ficticio',arguments:{}})).json();
  assert.equal(JSON.parse(good.result.content[0].text).source,'fictional-demo');
  const extra=await (await call('tools/call',{name:'consultar_resumo_ficticio',arguments:{conta:'real'}})).json();
  assert.equal(extra.error.code,-32602);
  const wrongType=await (await call('tools/call',{name:'consultar_resumo_ficticio',arguments:['real']})).json();
  assert.equal(wrongType.error.code,-32602);
  const bad=await (await call('tools/call',{name:'registrar_despesa',arguments:{}})).json();
  assert.equal(bad.error.code,-32601);
 }finally{child.kill();}
});

test('MCP anuncia protocolo e não oferece operações financeiras',async()=>{
 const port=24000+Math.floor(Math.random()*1000);
 const token='token-protocolo-ficticio-'.padEnd(64,'q');
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),JM_GATEWAY_READ_TOKEN:token},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<30;i++){
   try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready);
  const url='http://127.0.0.1:'+port+'/mcp';
  const headers={authorization:'Bearer '+token,'content-type':'application/json'};
  const initialize=await fetch(url,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'test',version:'1'}}})});
  assert.equal(initialize.status,200);
  const response=await initialize.json();
  assert.equal(response.result.protocolVersion,'2025-03-26');
  assert.equal(response.result.serverInfo.name,'jm-financeiro-demo');
  assert.equal((await fetch(url,{headers})).status,405);
  assert.equal((await fetch(url,{method:'POST',headers,body:'{invalid'})).status,400);
 }finally{child.kill();}
});

test('MCP valida Origin, versão e notificação sem corpo',async()=>{
 const port=25000+Math.floor(Math.random()*1000);
 const token='token-compatibilidade-'.padEnd(64,'c');
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),JM_GATEWAY_READ_TOKEN:token},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<30;i++){
   try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready);
  const url='http://127.0.0.1:'+port+'/mcp';
  const headers={authorization:'Bearer '+token,'content-type':'application/json',accept:'application/json, text/event-stream'};
  const send=(method,extraHeaders={})=>fetch(url,{method:'POST',headers:{...headers,...extraHeaders},body:JSON.stringify({jsonrpc:'2.0',id:method==='notifications/initialized'?undefined:1,method,params:{}})});
  assert.equal((await send('tools/list',{origin:'https://example.invalid'})).status,403);
  assert.equal((await send('tools/list',{'mcp-protocol-version':'2099-01-01'})).status,400);
  const accepted=await send('notifications/initialized');
  assert.equal(accepted.status,202);
  assert.equal(await accepted.text(),'');
  const allowed=await send('tools/list',{'mcp-protocol-version':'2025-03-26'});
  assert.equal(allowed.status,200);
 }finally{child.kill();}
});
