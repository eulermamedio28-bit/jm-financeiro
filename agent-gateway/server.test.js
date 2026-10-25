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
