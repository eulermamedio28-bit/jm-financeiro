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
  for(const path of ['/summary','/accounts','/entries','/transfers','/auth/login','/pilot']){
   const r=await fetch('http://127.0.0.1:'+port+path);
   assert.equal(r.status,404,path+' não pode estar exposto');
  }
  const post=await fetch('http://127.0.0.1:'+port+'/entries',{method:'POST'});
  assert.equal(post.status,404);
 }finally{child.kill();}
});
