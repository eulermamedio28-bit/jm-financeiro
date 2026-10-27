// JM Financeiro: API authenticated by Supabase JWT, fail-closed by default.
// This is a staging service. Never expose financial routes without explicit configuration.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {criarRepositorioSnapshots} from './postgres-repository.mjs';
import {criarRotasFinanceiras} from './authenticated-routes.mjs';
import {prepararLancamentos,criarLancamentos} from './ledger-staging.mjs';
import {executarMcp} from './mcp-financial.mjs';
import {prepararOAuth,criarOAuth,oauthMetadata,resourceMetadata} from './oauth-bridge.mjs';
const port=Number(process.env.PORT||10000);
const dbName='jm_financeiro_integracao_teste';
const supabaseUrl=process.env.SUPABASE_URL?.replace(/\/$/,'');
const allowedEmail=process.env.JM_ALLOWED_EMAIL?.trim().toLowerCase();
const enabled=process.env.JM_ENABLE_FINANCIAL_API==='true';
const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,max:3});
let routes=null,ledger=null,verifyToken=null,oauth=null,ready=false;
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
 await prepararLancamentos(pool);
 ledger=criarLancamentos(pool);verifyToken=verifyAccessToken;
 await prepararOAuth(pool);oauth=criarOAuth(pool,verifyAccessToken);
 ready=true;
 console.log('Staging financial API ready');
}
await initialize().catch(e=>{console.error('API initialization refused:',e.message);ready=false});
http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 const origin=req.headers.origin;
 if(origin==='https://jm-financeiro-ativacao-teste.onrender.com'){
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
 }
 if(req.method==='OPTIONS'){
  res.writeHead(origin==='https://jm-financeiro-ativacao-teste.onrender.com'?204:403);return res.end();
 }
 const respond=(code,obj)=>{res.writeHead(code);res.end(JSON.stringify(obj));};
 if(req.method==='GET'&&req.url==='/health')return respond(200,{service:'jm-financeiro-staging',readyForFinancialData:ready});
 if(!ready||!routes)return respond(503,{error:'api_not_ready'});
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&pathname==='/.well-known/oauth-authorization-server')return respond(200,oauthMetadata);
 if(req.method==='GET'&&pathname==='/.well-known/oauth-protected-resource')return respond(200,resourceMetadata);
 if(req.method==='GET'&&pathname==='/.well-known/oauth-protected-resource/mcp')return respond(200,resourceMetadata);
 if(req.method==='GET'&&pathname==='/oauth/public-config'){
  try{const cfg=await(await fetch('https://jm-financeiro-ativacao-teste.onrender.com/config.json')).json();return respond(200,{supabaseUrl:cfg.supabaseUrl,publishableKey:cfg.publishableKey});}
  catch{return respond(503,{error:'public_config_unavailable'});}
 }
 if(req.method==='GET'&&pathname==='/oauth/authorize'){
  const u=new URL(req.url,'http://localhost');
  if(u.searchParams.get('response_type')!=='code'||u.searchParams.get('code_challenge_method')!=='S256')return respond(400,{error:'unsupported_oauth_request'});
  try{const page=await readFile(new URL('./oauth-consent.html',import.meta.url),'utf8');res.setHeader('Content-Type','text/html; charset=utf-8');res.writeHead(200);return res.end(page);}
  catch{return respond(500,{error:'consent_unavailable'});}
 }
 if(req.method==='POST'&&['/oauth/consent','/oauth/token'].includes(pathname)){
  try{
   let data='';
   for await(const chunk of req){data+=chunk;if(data.length>10000)return respond(413,{error:'payload_too_large'});}
   const body=pathname==='/oauth/token'?Object.fromEntries(new URLSearchParams(data)):JSON.parse(data);
   const result=pathname==='/oauth/token'?await oauth.trocar(body):{code:await oauth.autorizar(body)};
   return respond(200,result);
  }catch{return respond(400,{error:'invalid_grant_or_request'});}
 }
 if(req.method==='GET'&&pathname==='/mcp'){
  res.setHeader('WWW-Authenticate','Bearer resource_metadata="https://jm-financeiro-db-private-test.onrender.com/.well-known/oauth-protected-resource"');
  return respond(401,{error:'unauthorized'});
 }
 if(!['GET','POST'].includes(req.method)||!['/v1/sync','/v1/sync/status','/v1/lancamentos','/mcp'].includes(req.url))return respond(404,{error:'not_found'});
 let body;
 if(req.method==='POST'){
  try{
   const chunks=[];let bytes=0;
   for await(const chunk of req){bytes+=chunk.length;if(bytes>2100000)return respond(413,{error:'payload_too_large'});chunks.push(chunk);}
   body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch{return respond(400,{error:'invalid_json'});}
 }
 try{
  if(req.url==='/mcp'){
   if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
   const result=await executarMcp({body,authorization:req.headers.authorization,verifyToken:oauth.verificarBearer,ledger});
   if(result.body===null){res.writeHead(result.status);return res.end();}
   return respond(result.status,result.body);
  }
  if(req.url==='/v1/lancamentos'){
   const auth=req.headers.authorization;
   if(typeof auth!=='string'||!auth.startsWith('Bearer '))return respond(401,{error:'unauthorized'});
   let identity;try{identity=await verifyToken(auth.slice(7));}catch{return respond(401,{error:'unauthorized'});}
   if(req.method==='GET')return respond(200,{lancamentos:await ledger.listar(identity.accountId)});
   if(req.method==='POST'){
    try{const result=await ledger.registrar(identity.accountId,body);return respond(result.created?201:200,result);}
    catch(e){return respond(e.message==='idempotency_conflict'?409:400,{error:e.message==='idempotency_conflict'?'idempotency_conflict':'invalid_entry'});}
   }
  }
  const out=await routes.executar({authorization:req.headers.authorization,method:req.method,path:req.url,body});return respond(out.status,out.body);
 }
 catch(e){console.error('API request error:',e.code||'internal');return respond(500,{error:'internal_error'});}
}).listen(port,'0.0.0.0');
