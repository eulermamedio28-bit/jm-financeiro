// JM Financeiro: API authenticated by Supabase JWT, fail-closed by default.
// This is a staging service. Never expose financial routes without explicit configuration.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {criarRepositorioSnapshots} from './postgres-repository.mjs';
import {criarRotasFinanceiras} from './authenticated-routes.mjs';
const port=Number(process.env.PORT||10000);
const dbName='jm_financeiro_integracao_teste';
const supabaseUrl=process.env.SUPABASE_URL?.replace(/\/$/,'');
const allowedEmail=process.env.JM_ALLOWED_EMAIL?.trim().toLowerCase();
const enabled=process.env.JM_ENABLE_FINANCIAL_API==='true';
const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,max:3});
let routes=null,ready=false;
async function initialize(){
 if(!enabled){console.log('Financial API disabled');return;}
 if(!supabaseUrl||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl)||!allowedEmail||!process.env.DATABASE_URL)throw Error('Missing required configuration');
 const issuer=supabaseUrl+'/auth/v1';
 const jwks=createRemoteJWKSet(new URL(issuer+'/.well-known/jwks.json'));
 const identity=await pool.query('SELECT current_database() AS db');
 if(identity.rows[0]?.db!==dbName)throw Error('Wrong database refused');
 const schema=await readFile(new URL('./postgres-schema.sql',import.meta.url),'utf8');
 await pool.query(schema);
 const verifyAccessToken=async token=>{
  if(typeof token!=='string'||token.length<20||token.length>16384)throw Error('Invalid token');
  const {payload}=await jwtVerify(token,jwks,{issuer,audience:'authenticated',algorithms:['ES256','RS256'],clockTolerance:5});
  if(payload.role!=='authenticated'||payload.email?.toLowerCase()!==allowedEmail||!payload.sub||! /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(payload.sub))throw Error('Unauthorized identity');
  return {accountId:payload.sub};
 };
 routes=criarRotasFinanceiras({verifyAccessToken,repository:criarRepositorioSnapshots(pool),syncEnabled:true});
 ready=true;
 console.log('Staging financial API ready');
}
await initialize().catch(e=>{console.error('API initialization refused:',e.message);ready=false});
http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 const respond=(code,obj)=>{res.writeHead(code);res.end(JSON.stringify(obj));};
 if(req.method==='GET'&&req.url==='/health')return respond(200,{service:'jm-financeiro-staging',readyForFinancialData:ready});
 if(!ready||!routes)return respond(503,{error:'api_not_ready'});
 if(!['GET','POST'].includes(req.method)||!['/v1/sync','/v1/sync/status'].includes(req.url))return respond(404,{error:'not_found'});
 let body;
 if(req.method==='POST'){
  try{
   const chunks=[];let bytes=0;
   for await(const chunk of req){bytes+=chunk.length;if(bytes>2100000)return respond(413,{error:'payload_too_large'});chunks.push(chunk);}
   body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch{return respond(400,{error:'invalid_json'});}
 }
 try{const out=await routes.executar({authorization:req.headers.authorization,method:req.method,path:req.url,body});return respond(out.status,out.body);}
 catch(e){console.error('API request error:',e.code||'internal');return respond(500,{error:'internal_error'});}
}).listen(port,'0.0.0.0');
