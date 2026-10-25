// Gateway público isolado: SOMENTE dados fictícios, sem acesso à API financeira.
// Acesso à consulta exige token configurado fora do repositório.
import http from 'node:http';
import crypto from 'node:crypto';

const port=Number(process.env.PORT||10000);
const token=process.env.JM_GATEWAY_READ_TOKEN||'';
const configured=token.length>=48;
const json=(res,status,data)=>{
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'",'referrer-policy':'no-referrer'});
 res.end(JSON.stringify(data));
};
const authorized=req=>{
 const header=req.headers.authorization||'';
 const expected='Bearer '+token;
 const a=Buffer.from(header),b=Buffer.from(expected);
 return configured && a.length===b.length && crypto.timingSafeEqual(a,b);
};
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&path==='/health')
   return json(res,200,{status:'ok',service:'jm-financeiro-agent-gateway',mode:'fictional-read-only',financialData:false,privateReadConfigured:configured});
 if(req.method==='GET'&&path==='/agent/demo-summary'){
   if(!configured)return json(res,503,{error:'Consulta privada não configurada'});
   if(!authorized(req))return json(res,401,{error:'Não autorizado'});
   return json(res,200,{source:'fictional-demo',currency:'BRL',income_cents:285000,expense_cents:174000,balance_cents:111000,notice:'Exemplo fictício. Nenhuma conexão com o aplicativo JM Financeiro.'});
 }
 return json(res,404,{error:'Rota não disponível'});
});
server.listen(port,'0.0.0.0',()=>console.log('Gateway fictício de leitura iniciado na porta '+port));
