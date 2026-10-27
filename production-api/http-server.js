import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {login,logout} from './auth-db.js';
import {createLoginLimiter} from './login-limiter.js';
import {authenticatedCatalog,authenticatedEstablishments} from './catalog.js';
import {authenticatedRecordOperation,authenticatedSummary} from './secure-operations.js';

// Development-only HTTP adapter. Never bind to a public interface.
// Production requires TLS reverse proxy, secrets management and hardened auth.
const json=(res,status,body)=>{
 const payload=JSON.stringify(body);
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY'});
 res.end(payload);
};
async function bodyJson(req){
 let size=0;const chunks=[];
 for await(const chunk of req){
  size+=chunk.length;
  if(size>16384) throw Error('Requisição muito grande');
  chunks.push(chunk);
 }
 const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(!body||Array.isArray(body)||typeof body!=='object') throw Error('JSON inválido');
 return body;
}
const bearer=req=>{
 const match=/^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization||'');
 if(!match) throw Error('Autenticação obrigatória');
 return match[1];
};
export function createFinancialHttpServer(pool){
 const loginLimiter=createLoginLimiter();
 return createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://localhost').pathname;
   if(req.method==='GET'&&['/pilot','/mobile-client.js'].includes(path)){
    const file=path==='/pilot'?'mobile.html':'mobile-client.js';
    const type=path==='/pilot'?'text/html; charset=utf-8':'text/javascript; charset=utf-8';
    res.writeHead(200,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    return res.end(readFileSync(new URL('./'+file,import.meta.url)));
   }
   if(req.method==='GET'&&path==='/health') return json(res,200,{status:'ok',mode:'development-only'});
   if(req.method==='POST'&&path==='/api/login'){
    if(!loginLimiter.allow(req.socket.remoteAddress))return json(res,429,{error:'Muitas tentativas. Aguarde antes de tentar novamente.'});
    const data=await bodyJson(req);
    return json(res,200,await login(pool,{username:data.username,password:data.password}));
   }
   if(req.method==='POST'&&path==='/api/logout'){
    const token=bearer(req);
    await logout(pool,token);
    return json(res,200,{ok:true});
   }
   if(req.method==='POST'&&path==='/api/operations'){
    const token=bearer(req),data=await bodyJson(req);
    const result=await authenticatedRecordOperation(pool,{token,kind:data.kind,input:data.input,idempotencyKey:req.headers['idempotency-key']});
    return json(res,201,result);
   }
   if(req.method==='GET'&&path==='/api/establishments'){
    const token=bearer(req);
    return json(res,200,await authenticatedEstablishments(pool,{token}));
   }
   if(req.method==='GET'&&path==='/api/catalog'){
    const token=bearer(req);
    const establishmentId=new URL(req.url,'http://localhost').searchParams.get('establishmentId');
    return json(res,200,await authenticatedCatalog(pool,{token,establishmentId}));
   }
   if(req.method==='GET'&&path==='/api/summary'){
    const token=bearer(req);
    const establishmentId=new URL(req.url,'http://localhost').searchParams.get('establishmentId');
    return json(res,200,await authenticatedSummary(pool,{token,establishmentId}));
   }
   return json(res,404,{error:'Rota inexistente'});
  }catch(e){
   const message=String(e.message||'');
   const unauthorized=/Autenticação|Token inválido|Sessão inválida|Credenciais|bloqueado|autorizado/i.test(message);
   const badRequest=/JSON|inválid|obrigatóri|grande|desconhecida|insuficiente|Chave/i.test(message);
   return json(res,unauthorized?401:badRequest?400:500,{error:unauthorized?'Acesso negado':badRequest?'Requisição inválida':'Erro interno'});
  }
 });
}
