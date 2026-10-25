// Serviço público mínimo de diagnóstico, sem dados financeiros nem credenciais.
// NÃO hospeda a API experimental. Somente comprova deploy HTTPS e acesso à Render.
import http from 'node:http';
const port=Number(process.env.PORT||10000);
const host='0.0.0.0';
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'",'referrer-policy':'no-referrer'};
 if(req.method==='GET'&&path==='/health'){
   res.writeHead(200,headers);
   return res.end(JSON.stringify({status:'ok',service:'jm-financeiro-agent-gateway',mode:'public-health-only',financialData:false}));
 }
 res.writeHead(404,headers);
 res.end(JSON.stringify({error:'Rota não disponível'}));
});
server.listen(port,host,()=>console.log('Gateway de diagnóstico iniciado na porta '+port));
