// Gateway MCP de demonstração: sem dados reais e sem ferramentas de escrita.
import http from 'node:http';
import crypto from 'node:crypto';
const port=Number(process.env.PORT||10000);
const token=process.env.JM_GATEWAY_READ_TOKEN||'';
const configured=token.length>=48;
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'",'referrer-policy':'no-referrer'};
const json=(res,status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data));};
const accepted=res=>{res.writeHead(202,{'cache-control':'no-store'});res.end();};
const protocol='2025-03-26';
const validOrigin=req=>!req.headers.origin||req.headers.origin==='https://jm-financeiro-agent-gateway-test.onrender.com';
const authorized=req=>{
 const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+token);
 return configured&&a.length===b.length&&crypto.timingSafeEqual(a,b);
};
const summary=()=>({source:'fictional-demo',currency:'BRL',income_cents:285000,expense_cents:174000,balance_cents:111000,notice:'Dados fictícios. Nenhuma conexão com o aplicativo financeiro real.'});
const tool={name:'consultar_resumo_ficticio',description:'Consulta somente valores fictícios do JM Financeiro, sem acesso a dados reais.',inputSchema:{type:'object',properties:{},additionalProperties:false}};
const monthlyTool={name:'consultar_mes_ficticio',description:'Consulta demonstrativa de receitas, despesas e saldo de outubro de 2026, sem dados reais.',inputSchema:{type:'object',properties:{mes:{type:'string',enum:['2026-10']}},required:['mes'],additionalProperties:false}};
const monthly=()=>({source:'fictional-demo',month:'2026-10',currency:'BRL',income_cents:285000,expense_cents:174000,balance_cents:111000,notice:'Exemplo fictício. Não representa movimentações do JM.'});
const categoryTool={name:'consultar_categorias_ficticias',description:'Detalhamento exclusivamente fictício das receitas e despesas de outubro de 2026 por categoria, somente leitura.',inputSchema:{type:'object',properties:{mes:{type:'string',enum:['2026-10']}},required:['mes'],additionalProperties:false}};
const categories=()=>({source:'fictional-demo',month:'2026-10',currency:'BRL',income:[{category:'Marmitas',amount_cents:200000},{category:'Bebidas',amount_cents:55000},{category:'Sobremesas',amount_cents:30000}],expenses:[{category:'Ingredientes',amount_cents:100000},{category:'Embalagens',amount_cents:32000},{category:'Despesas operacionais',amount_cents:42000}],income_cents:285000,expense_cents:174000,balance_cents:111000,notice:'Categorias e valores inventados para demonstração. Não são dados do restaurante.'});
const rpcError=(res,id,code,message)=>json(res,200,{jsonrpc:'2.0',id,error:{code,message}});
async function mcp(req,res){
 if(!validOrigin(req))return json(res,403,{error:'Origem não permitida'});
 if(!configured)return json(res,503,{error:'MCP não configurado'});
 if(!authorized(req))return json(res,401,{error:'Não autorizado'});
 if(req.method!=='POST'){res.writeHead(405,{'allow':'POST','cache-control':'no-store'});return res.end();}
 const version=req.headers['mcp-protocol-version'];
 if(version&&version!==protocol)return json(res,400,{error:'Versão MCP não suportada',supported:[protocol]});
 let data='';
 try{
  for await(const chunk of req){data+=chunk;if(data.length>8192)return json(res,413,{error:'Requisição muito grande'});}
  const msg=JSON.parse(data);
  if(!msg||msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return json(res,400,{error:'JSON-RPC inválido'});
  if(msg.method==='notifications/initialized')return accepted(res);
  if(msg.method==='tools/call'){
   const name=msg.params?.name,args=msg.params?.arguments;
   if(name===tool.name&&args!==undefined&&(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length!==0))
    return rpcError(res,msg.id??null,-32602,'Argumentos inválidos para consulta fictícia');
   if([monthlyTool.name,categoryTool.name].includes(name)&&(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length!==1||args.mes!=='2026-10'))
    return rpcError(res,msg.id??null,-32602,'Mês inválido; demonstração disponível somente para 2026-10');
  }
  const result=msg.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'jm-financeiro-demo',version:'0.2.0'}}:
   msg.method==='tools/list'?{tools:[tool,monthlyTool,categoryTool]}:
   msg.method==='tools/call'&&[tool.name,monthlyTool.name,categoryTool.name].includes(msg.params?.name)?{content:[{type:'text',text:JSON.stringify(msg.params.name===tool.name?summary():msg.params.name===monthlyTool.name?monthly():categories())}],isError:false}:null;
  if(msg.id===undefined)return accepted(res);
  return json(res,200,result?{jsonrpc:'2.0',id:msg.id,result}:{jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Método ou ferramenta não disponível'}});
 }catch{return json(res,400,{error:'Requisição inválida'});}
}
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&path==='/health')return json(res,200,{status:'ok',service:'jm-financeiro-agent-gateway',mode:'fictional-read-only',financialData:false,privateReadConfigured:configured,mcpEndpoint:'/mcp'});
 if(path==='/mcp')return mcp(req,res);
 if(req.method==='GET'&&path==='/agent/demo-summary'){
  if(!configured)return json(res,503,{error:'Consulta privada não configurada'});
  if(!authorized(req))return json(res,401,{error:'Não autorizado'});
  return json(res,200,summary());
 }
 return json(res,404,{error:'Rota não disponível'});
});
server.listen(port,'0.0.0.0',()=>console.log('Gateway MCP fictício iniciado na porta '+port));
