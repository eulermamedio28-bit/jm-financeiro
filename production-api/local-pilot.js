import {pathToFileURL} from 'node:url';
import pg from 'pg';
import {createFinancialHttpServer} from './http-server.js';

// Explicitly local-only runner. Never use this entrypoint for production.
export function assertLocalPilotConfig({nodeEnv=process.env.NODE_ENV,host='127.0.0.1',databaseUrl=process.env.JM_PILOT_DATABASE_URL}={}){
 if(nodeEnv==='production')throw Error('Piloto local proibido em produção');
 if(!['127.0.0.1','::1','localhost'].includes(host))throw Error('Piloto deve escutar apenas no loopback');
 if(!databaseUrl||typeof databaseUrl!=='string')throw Error('JM_PILOT_DATABASE_URL obrigatório');
 const url=new URL(databaseUrl);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Banco deve ser PostgreSQL');
 if(!['127.0.0.1','localhost','::1'].includes(url.hostname))throw Error('Piloto exige PostgreSQL local');
 return {host,databaseUrl};
}

export async function startLocalPilot({host='127.0.0.1',port=8787,databaseUrl=process.env.JM_PILOT_DATABASE_URL}={}){
 const config=assertLocalPilotConfig({host,databaseUrl});
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Porta inválida');
 const pool=new pg.Pool({connectionString:config.databaseUrl});
 const server=createFinancialHttpServer(pool);
 try{
  await pool.query('SELECT 1');
  await new Promise((resolve,reject)=>{
   server.once('error',reject);
   server.listen(port,config.host,resolve);
  });
 }catch(error){await pool.end();throw error}
 server.on('close',()=>{void pool.end()});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 startLocalPilot().then(()=>console.log('JM Financeiro piloto local: http://127.0.0.1:8787/pilot')).catch(error=>{console.error(error.message);process.exitCode=1});
}
