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

// OAuth 2.1 (PKCE) para cliente MCP; ativado somente com segredo separado.
const base='https://jm-financeiro-agent-gateway-test.onrender.com';
const oauthSecret=process.env.JM_OAUTH_SIGNING_SECRET||'';
const loginSecret=process.env.JM_OAUTH_LOGIN_SECRET||'';
// Compatibilidade temporária com a variável cadastrada sem o prefixo JM_.
const alternateLoginSecret=process.env.OAUTH_LOGIN_SECRET||'';
const oauthReady=oauthSecret.length>=48&&(loginSecret.length>=24||alternateLoginSecret.length>=24);
// Stateless dynamic client registrations survive free-tier restarts.
const clients=new Map(); // temporary backward compatibility for already registered clients
const codes=new Map();
const registerClient=uris=>{
 const payload=b64(JSON.stringify({redirect_uris:uris,created:Date.now()}));
 return 'jm_'+payload+'.'+sign('client:'+payload);
};
const getClient=id=>{
 if(typeof id!=='string'||id.length>4096)return null;
 const legacy=clients.get(id);
 if(legacy)return legacy;
 if(!id.startsWith('jm_'))return null;
 const [payload,mac,...extra]=id.slice(3).split('.');
 if(!payload||!mac||extra.length||!secureEq(sign('client:'+payload),mac))return null;
 try{
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
  if(!Array.isArray(data.redirect_uris)||data.redirect_uris.length<1||data.redirect_uris.length>5||!data.redirect_uris.every(validRedirect)||!Number.isSafeInteger(data.created)||data.created>Date.now()+60000||data.created<Date.now()-30*86400000)return null;
  return data;
 }catch{return null;}
};
const b64=v=>Buffer.from(v).toString('base64url');
const sign=data=>crypto.createHmac('sha256',oauthSecret).update(data).digest('base64url');
const secureEq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);};
const html=(res,status,body)=>{res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'referrer-policy':'no-referrer'});res.end(body);};
const readForm=async req=>{let s='';for await(const c of req){s+=c;if(s.length>8192)throw Error('large');}return new URLSearchParams(s);};
const readJson=async req=>{let s='';for await(const c of req){s+=c;if(s.length>8192)throw Error('large');}return JSON.parse(s);};
const oauthToken=()=>{const payload=b64(JSON.stringify({aud:base+'/mcp',exp:Math.floor(Date.now()/1000)+3600,scope:'jm:demo:read'}));return payload+'.'+sign(payload);};
const validOAuth=req=>{
 if(!oauthReady)return false;
 const auth=req.headers.authorization||'';
 if(!auth.startsWith('Bearer '))return false;
 const [payload,mac,...rest]=auth.slice(7).split('.');
 if(!payload||!mac||rest.length||!secureEq(sign(payload),mac))return false;
 try{const d=JSON.parse(Buffer.from(payload,'base64url').toString());return d.aud===base+'/mcp'&&d.scope==='jm:demo:read'&&Number.isSafeInteger(d.exp)&&d.exp>Math.floor(Date.now()/1000);}catch{return false;}
};
const oauthMetadata={issuer:base,authorization_endpoint:base+'/oauth/authorize',token_endpoint:base+'/oauth/token',registration_endpoint:base+'/oauth/register',response_types_supported:['code'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none'],scopes_supported:['jm:demo:read']};
const resourceMetadata={resource:base+'/mcp',authorization_servers:[base],scopes_supported:['jm:demo:read'],bearer_methods_supported:['header']};
const validRedirect=u=>{try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password&&!x.hash&&x.hostname!=='localhost';}catch{return false;}};
async function oauth(req,res,path,url){
 if(!oauthReady)return json(res,503,{error:'OAuth não configurado'});
 if(req.method==='GET'&&(path==='/.well-known/oauth-authorization-server'||path==='/.well-known/openid-configuration'))return json(res,200,oauthMetadata);
 if(req.method==='GET'&&(path==='/.well-known/oauth-protected-resource'||path==='/.well-known/oauth-protected-resource/mcp'))return json(res,200,resourceMetadata);
 if(req.method==='POST'&&path==='/oauth/register'){
  try{const data=await readJson(req);if(!Array.isArray(data.redirect_uris)||data.redirect_uris.length<1||data.redirect_uris.length>5||!data.redirect_uris.every(validRedirect))return json(res,400,{error:'invalid_redirect_uri'});
   const client_id=registerClient(data.redirect_uris);return json(res,201,{client_id,redirect_uris:data.redirect_uris,token_endpoint_auth_method:'none',grant_types:['authorization_code'],response_types:['code']});
  }catch{return json(res,400,{error:'invalid_client_metadata'});}
 }
 if(path==='/oauth/authorize'&&(req.method==='GET'||req.method==='POST')){
  let p=url.searchParams;
  if(req.method==='POST'){try{p=await readForm(req);}catch{return json(res,400,{error:'invalid_request'});}}
  const client=getClient(p.get('client_id'));
  const redirect=p.get('redirect_uri');
  const challenge=p.get('code_challenge');
  const state=p.get('state')||'';
  if(!client||!client.redirect_uris.includes(redirect)||p.get('response_type')!=='code'||p.get('code_challenge_method')!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(challenge||'')||state.length>512||!['jm:demo:read',''].includes(p.get('scope')||''))return json(res,400,{error:'invalid_request'});
  if(req.method==='GET'){
   const fields=['client_id','redirect_uri','response_type','code_challenge','code_challenge_method','state','scope'].map(k=>'<input type="hidden" name="'+k+'" value="'+String(p.get(k)||'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')+'">').join('');
   return html(res,200,'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>JM Financeiro - Autorizar</title><body><h2>JM Financeiro - Testes</h2><p>Autorizar somente consultas fictícias, sem dados reais.</p><form method="post" action="/oauth/authorize">'+fields+'<label>Senha de autorização <input type="password" name="password" required autocomplete="off"></label><button type="submit">Autorizar</button></form></body></html>');
  }
  if(![loginSecret,alternateLoginSecret].some(secret=>secret.length>=24&&secureEq(p.get('password')||'',secret)))return html(res,403,'Autorização recusada. Verifique a senha configurada no Render e tente iniciar uma nova conexão.');
  const code=crypto.randomBytes(32).toString('base64url');codes.set(code,{client_id:p.get('client_id'),redirect,challenge,exp:Date.now()+120000});
  const dest=new URL(redirect);dest.searchParams.set('code',code);if(state)dest.searchParams.set('state',state);res.writeHead(302,{location:dest.toString(),'cache-control':'no-store'});return res.end();
 }
 if(req.method==='POST'&&path==='/oauth/token'){
  try{const p=await readForm(req);const code=p.get('code')||'';const record=codes.get(code);codes.delete(code);
   const verifier=p.get('code_verifier')||'';
   if(p.get('grant_type')!=='authorization_code'||!record||record.exp<Date.now()||record.client_id!==p.get('client_id')||record.redirect!==p.get('redirect_uri')||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)||!secureEq(b64(crypto.createHash('sha256').update(verifier).digest()),record.challenge))return json(res,400,{error:'invalid_grant'});
   return json(res,200,{access_token:oauthToken(),token_type:'Bearer',expires_in:3600,scope:'jm:demo:read'});
  }catch{return json(res,400,{error:'invalid_request'});}
 }
 return json(res,404,{error:'Rota OAuth indisponível'});
}

const summary=()=>({source:'fictional-demo',currency:'BRL',income_cents:285000,expense_cents:174000,balance_cents:111000,notice:'Dados fictícios. Nenhuma conexão com o aplicativo financeiro real.'});
const tool={name:'consultar_resumo_ficticio',description:'Consulta somente valores fictícios do JM Financeiro, sem acesso a dados reais.',inputSchema:{type:'object',properties:{},additionalProperties:false}};
const monthlyTool={name:'consultar_mes_ficticio',description:'Consulta demonstrativa de receitas, despesas e saldo de outubro de 2026, sem dados reais.',inputSchema:{type:'object',properties:{mes:{type:'string',enum:['2026-10']}},required:['mes'],additionalProperties:false}};
const monthly=()=>({source:'fictional-demo',month:'2026-10',currency:'BRL',income_cents:285000,expense_cents:174000,balance_cents:111000,notice:'Exemplo fictício. Não representa movimentações do JM.'});
const categoryTool={name:'consultar_categorias_ficticias',description:'Detalhamento exclusivamente fictício das receitas e despesas de outubro de 2026 por categoria, somente leitura.',inputSchema:{type:'object',properties:{mes:{type:'string',enum:['2026-10']}},required:['mes'],additionalProperties:false}};
const categories=()=>({source:'fictional-demo',month:'2026-10',currency:'BRL',income:[{category:'Marmitas',amount_cents:200000},{category:'Bebidas',amount_cents:55000},{category:'Sobremesas',amount_cents:30000}],expenses:[{category:'Ingredientes',amount_cents:100000},{category:'Embalagens',amount_cents:32000},{category:'Despesas operacionais',amount_cents:42000}],income_cents:285000,expense_cents:174000,balance_cents:111000,notice:'Categorias e valores inventados para demonstração. Não são dados do restaurante.'});
const comparisonTool={name:'comparar_meses_ficticios',description:'Compara setembro e outubro de 2026 com valores inventados, sem acesso a dados financeiros reais.',inputSchema:{type:'object',properties:{mes_inicial:{type:'string',enum:['2026-09']},mes_final:{type:'string',enum:['2026-10']}},required:['mes_inicial','mes_final'],additionalProperties:false}};
const comparison=()=>{
 const previous={month:'2026-09',income_cents:250000,expense_cents:160000,balance_cents:90000};
 const current={month:'2026-10',income_cents:285000,expense_cents:174000,balance_cents:111000};
 const percent=(a,b)=>Math.round((b-a)/a*10000)/100;
 return {source:'fictional-demo',currency:'BRL',previous,current,change_percent:{income:percent(previous.income_cents,current.income_cents),expenses:percent(previous.expense_cents,current.expense_cents),balance:percent(previous.balance_cents,current.balance_cents)},notice:'Comparativo integralmente fictício, sem conexão com contas ou lançamentos reais.'};
};
const rpcError=(res,id,code,message)=>json(res,200,{jsonrpc:'2.0',id,error:{code,message}});
async function mcp(req,res){
 if(!validOrigin(req))return json(res,403,{error:'Origem não permitida'});
 if(!configured)return json(res,503,{error:'MCP não configurado'});
 if(!authorized(req)&&!validOAuth(req)){res.writeHead(401,{...headers,'www-authenticate':'Bearer resource_metadata="'+base+'/.well-known/oauth-protected-resource"'});return res.end(JSON.stringify({error:'Não autorizado'}));}
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
   if(name===comparisonTool.name&&(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length!==2||args.mes_inicial!=='2026-09'||args.mes_final!=='2026-10'))
    return rpcError(res,msg.id??null,-32602,'Comparativo fictício disponível apenas de 2026-09 para 2026-10');
  }
  const result=msg.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'jm-financeiro-demo',version:'0.2.0'}}:
   msg.method==='tools/list'?{tools:[tool,monthlyTool,categoryTool,comparisonTool]}:
   msg.method==='tools/call'&&[tool.name,monthlyTool.name,categoryTool.name,comparisonTool.name].includes(msg.params?.name)?{content:[{type:'text',text:JSON.stringify(msg.params.name===tool.name?summary():msg.params.name===monthlyTool.name?monthly():msg.params.name===categoryTool.name?categories():comparison())}],isError:false}:null;
  if(msg.id===undefined)return accepted(res);
  return json(res,200,result?{jsonrpc:'2.0',id:msg.id,result}:{jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Método ou ferramenta não disponível'}});
 }catch{return json(res,400,{error:'Requisição inválida'});}
}
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&path==='/health')return json(res,200,{status:'ok',service:'jm-financeiro-agent-gateway',mode:'fictional-read-only',financialData:false,privateReadConfigured:configured,mcpEndpoint:'/mcp'});
 if(path.startsWith('/oauth/')||path.startsWith('/.well-known/oauth-'))return oauth(req,res,path,new URL(req.url,'http://localhost'));
 if(path==='/mcp')return mcp(req,res);
 if(req.method==='GET'&&path==='/agent/demo-summary'){
  if(!configured)return json(res,503,{error:'Consulta privada não configurada'});
  if(!authorized(req))return json(res,401,{error:'Não autorizado'});
  return json(res,200,summary());
 }
 return json(res,404,{error:'Rota não disponível'});
});
server.listen(port,'0.0.0.0',()=>console.log('Gateway MCP fictício iniciado na porta '+port));
