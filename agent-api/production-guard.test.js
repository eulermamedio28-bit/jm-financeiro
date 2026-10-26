import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('API experimental nunca cria banco ou inicia em produção',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jm-production-guard-'));
 try{
  const database=join(dir,'must-not-exist.sqlite');
  const run=spawnSync(process.execPath,['server.js'],{
   cwd:new URL('.',import.meta.url).pathname,
   env:{...process.env,NODE_ENV:'production',JM_DB_PATH:database,JM_API_TOKEN:'x'.repeat(40),JM_PILOT_SESSION:'y'.repeat(40),JM_PILOT_PASSWORD_HASH:'scrypt:'+'0'.repeat(32)+':'+'0'.repeat(128)},
   encoding:'utf8',timeout:10000
  });
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/não pode iniciar em produção/);
  assert.equal(existsSync(database),false,'Produção não deve criar banco experimental');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('API não cria banco quando faltam segredos de autenticação',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jm-missing-secrets-'));
 try{
  const database=join(dir,'must-not-exist.sqlite');
  const env={...process.env,NODE_ENV:'development',JM_DB_PATH:database};
  delete env.JM_API_TOKEN;delete env.JM_PILOT_SESSION;delete env.JM_PILOT_PASSWORD_HASH;
  const run=spawnSync(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url).pathname,env,encoding:'utf8',timeout:10000});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/JM_API_TOKEN/);
  assert.equal(existsSync(database),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
